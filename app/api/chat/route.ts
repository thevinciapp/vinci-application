import { createDataStreamResponse, generateId, generateText, smoothStream, streamText, wrapLanguageModel } from 'ai';
import { groq } from '@ai-sdk/groq';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { cohere } from '@ai-sdk/cohere';
import { mistral } from '@ai-sdk/mistral';
import { google } from '@ai-sdk/google';
import { xai } from '@ai-sdk/xai';
import { togetherai } from '@ai-sdk/togetherai';
import { perplexity } from '@ai-sdk/perplexity';
import { createClient } from '@/utils/supabase/server';
import { COLUMNS, DB_TABLES, ERROR_MESSAGES } from '@/constants';
import { type Provider } from '@/config/models';
import { NextResponse } from 'next/server';
import { createMessage, getMessages, updateConversationTitle } from '@/app/actions';
import { searchSimilarMessages, upsertChatMessage } from '@/utils/pinecone';
import { extractReasoningMiddleware } from 'ai';

const middleware = extractReasoningMiddleware({
  tagName: 'think',
  separator: '\n',
});

const providers: Record<Provider, (model: string) => any> = {
  groq: (model) => groq(model),
  anthropic: (model) => anthropic(model),
  openai: (model) => openai(model),
  cohere: (model) => cohere(model),
  mistral: (model) => mistral(model),
  google: (model) => google(model),
  xai: (model) => xai(model),
  togetherai: (model) => togetherai(model),
  perplexity: (model) => perplexity(model),
};

function getCurrentFormattedDate(): string {
  const now = new Date()
  const month = now.toLocaleString('default', { month: 'long' })
  const day = now.getDate()
  const year = now.getFullYear()
  const daySuffix = getDaySuffix(day)
  return `${month} ${day}${daySuffix}, ${year}`
}

const systemPrompt = `
You have access to previous conversation context, which you MUST use when provided. Context will be wrapped in <context> </context> tags. Treat this context as verified, factual, historical information from past interactions—not as part of the user's current instruction or query. Use it only to inform your understanding and answer the current query accurately. Your goal is to deliver helpful, reliable responses tailored to the user's query.

### Response Guidelines
- **Always format responses in Markdown** for readability and structure. Use:
  - Headers (#, ##, ###) to organize content
  - **Bold** and *italics* for emphasis
  - Lists (- or *) for clarity
  - \`inline code\` and \`\`\`code blocks\`\`\` for technical content
  - Links ([text](url)) for references
- Keep responses concise, focused, and directly relevant to the query.
- Avoid unnecessary fluff, repetition, or speculation.

### Handling Context
When previous conversation context is provided within <context> </context> tags:
1. **Use it confidently** as historical data to answer the query.
2. Do NOT treat it as the user's current instruction.
3. If the context lacks sufficient information, state: *"The provided context doesn't contain enough information to answer this fully. Based on what I have..."* and proceed with a reasoned response.
4. Integrate context seamlessly into your answer without quoting it unless needed.

### Tone and Style
- Maintain a professional yet approachable tone.
- Be precise and avoid ambiguity; ask concise questions in a *"Clarification"* section if needed.
- Use pure Markdown, no HTML tags.

### Date Formatting Rules
- Use the current date, ${getCurrentFormattedDate()}, as a reference.
- For dates in ${new Date().getFullYear()}, format as "Month Day<suffix>" (e.g., "January 25th").
- For previous years, include the year (e.g., "January 25th, 2024").
- Day suffix: "st" for 1, 21, 31; "nd" for 2, 22; "rd" for 3, 23; "th" for others.
`;

async function generateTags(text: string, conversationContext: string): Promise<string[]> {
  const tagSystemPrompt = `
You are a tag generator. Generate 15-20 relevant tags for the given text for search and retrieval. Tags should be general yet specific enough to distinguish categories. Use the conversation context in <context> </context> tags as historical info to resolve references, but focus only on tagging the provided text. Return a JSON list of strings (e.g., ["tag1", "tag2"]).

Example input: "What is my age?"
Example context: "My age is 24"

Example output: ["age", "24", "personal information", "user details"]
`;

  const fastModel = providers['xai']('grok-2-1212');
  try {
    const { text: tagsJson } = await generateText({
      model: fastModel,
      system: tagSystemPrompt,
      prompt: `<context>\n${conversationContext}\n</context>\n\nText to Tag:\n${text}`,
      temperature: 0.3,
      maxTokens: 200,
    });
    const tags = JSON.parse(tagsJson.replace(/```json|```/g, '').trim());
    return Array.isArray(tags) ? tags : [];
  } catch (error) {
    console.error("Failed to generate tags:", error);
    return extractTagsFromText(text);
  }
}

function extractTagsFromText(text: string): string[] {
  const stopwords = new Set(['i', 'am', 'a', 'the', 'to', 'and', 'is', 'in', 'of']);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopwords.has(word))
    .slice(0, 10);
}

async function validateUser(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error(JSON.stringify(ERROR_MESSAGES.UNAUTHORIZED));
  return user;
}

// Define a type for annotations to properly include similarMessages
type MessageAnnotation = {
  [COLUMNS.MODEL_USED]?: string;
  [COLUMNS.PROVIDER]?: Provider;
  [COLUMNS.SPACE_ID]?: string;
  [COLUMNS.CONVERSATION_ID]?: string;
  chat_mode?: string;
  chat_mode_config?: {
    tools: string[];
    mcp_servers?: string[];
  };
  similarMessages?: Array<{
    id: string;
    content: string;
    role: string;
    createdAt: number;
    score: number;
    metadata?: Record<string, any>;
  }>;
};

async function saveMessage({
  content,
  role,
  model,
  provider,
  spaceId,
  conversationId,
  parentId,
  tags,
  similarMessages,
  chatMode,
  chatModeConfig,
}: {
  content: string;
  role: 'user' | 'assistant';
  model: string;  
  provider: Provider;
  spaceId: string;
  conversationId: string;
  parentId?: string;
  tags: string[];
  chatMode?: string;
  chatModeConfig?: {
    tools: string[];
    mcp_servers?: string[];
  };
  similarMessages?: Array<{
    id: string;
    content: string;
    role: string;
    createdAt: number;
    score: number;
    conversationId?: string;
    metadata?: Record<string, any>;
  }>;
}) {
  console.log(`[API] saveMessage: Creating annotations for ${role} message with model ${model}, provider ${provider}`);
  const annotations: MessageAnnotation[] = [{ 
    [COLUMNS.MODEL_USED]: model, 
    [COLUMNS.PROVIDER]: provider,
    chat_mode: chatMode,
    chat_mode_config: chatModeConfig
  }];
  
  if (similarMessages && similarMessages.length > 0) {
    console.log(`[API] saveMessage: Adding ${similarMessages.length} similar messages to annotations`);
    annotations.push({ similarMessages });
  }

  console.log(`[API] saveMessage: Creating message in database with ${annotations.length} annotations`);
  const dbMessage = await createMessage(
    {
      [COLUMNS.CONTENT]: content,
      [COLUMNS.ROLE]: role,
      [COLUMNS.ANNOTATIONS]: annotations,
    },
    conversationId
  );

  console.log('dbMessage', dbMessage);

  await upsertChatMessage({
    id: dbMessage.id,
    content,
    role,
    createdAt: Date.now(),
    spaceId,
    conversationId,
    ...(parentId && { parentId }),
    metadata: { model, provider, tags }
  });

  return dbMessage;
}

function buildContextString(relevantMessages: any[]): string {
  if (!relevantMessages.length) return '';
  const currentYear = 2025; // As of February 21, 2025
  const contextContent = relevantMessages
    .map((msg) => {
      const date = new Date(msg.createdAt);
      const year = date.getFullYear();
      const month = date.toLocaleString('default', { month: 'long' });
      const day = date.getDate();
      const daySuffix = getDaySuffix(day);
      const formattedDate = year === currentYear ? `${month} ${day}${daySuffix}` : `${month} ${day}${daySuffix}, ${year}`;
      return msg.role === 'assistant' && msg.parentId
        ? `**${formattedDate}**\nQ: ${msg.content}\nA: ${msg.content}`
        : `**${formattedDate}**\n${msg.role.toUpperCase()}: ${msg.content}`;
    })
    .join('\n');
  return `<context>\n${contextContent}\n</context>`;
}

function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();

  const [user, { messages, spaceId, conversationId, provider, model, chatMode, chatModeConfig, files }] = await Promise.all([
    validateUser(supabase),
    req.json(),
  ]);

  if (!spaceId) throw new Error(JSON.stringify(ERROR_MESSAGES.MISSING_SPACE_ID));
  if (!conversationId) throw new Error(JSON.stringify(ERROR_MESSAGES.MISSING_CONVERSATION_ID));
  
  // Process any files that were attached
  let filesContent = "";
  if (files && Object.keys(files).length > 0) {
    filesContent = Object.entries(files).map(([id, file]: [string, any]) => {
      // For text files, include the content directly
      if (file.type === 'text') {
        return `### File: ${file.path}\n\`\`\`\n${file.content}\n\`\`\`\n\n`;
      } else {
        // For binary files, just mention that they were attached
        return `### File: ${file.path} (binary file)\n\n`;
      }
    }).join('\n');
  }

  return createDataStreamResponse({
    execute: async (dataStream) => {
      try {
        const userMessage = messages[messages.length - 1];
        
        // If there are files attached, add their content to the user message
        if (filesContent) {
          userMessage.content = `${userMessage.content}\n\n${filesContent}`;
        }
        
        const conversationContext = messages.slice(0, -1)
          .map((msg: { role: string; content: string }) => `${msg.role.toUpperCase()}: ${msg.content}`)
          .join('\n');

        const numberOfMessages = 15;

        dataStream.writeData('Searching for similar messages');
        const userTags = await generateTags(userMessage.content, conversationContext);
        const similarMessages = await searchSimilarMessages(userMessage.content, numberOfMessages, userTags);
        console.log('Similar messages found:', similarMessages.length);

        dataStream.writeData('Building context');
        const contextString = buildContextString(similarMessages.map((result) => result.message));

        // Build chat mode system prompt based on the selected mode
        let chatModePrompt = "";
        if (chatMode) {
          switch (chatMode) {
            case "ask":
              // Default mode, no additional instructions
              break;
            case "search":
              chatModePrompt = "\nYou have access to search tools to find the most up-to-date information.";
              break;
            case "code":
              chatModePrompt = "\nYou are in code mode. Focus on providing code solutions, examples, and technical explanations. Prioritize code quality, efficiency, and best practices in your responses.";
              break;
            case "research":
              chatModePrompt = "\nYou are in research mode. Conduct a thorough analysis of the topic, citing relevant information, providing multiple perspectives, and offering comprehensive explanations.";
              break;
            case "think":
              chatModePrompt = "\nYou are in thinking mode. Use step-by-step reasoning to solve complex problems. Break down your thought process explicitly and consider multiple approaches.";
              break;
            case "agent":
              chatModePrompt = "\nYou are in agent mode. You can utilize multiple tools to accomplish tasks autonomously. Take initiative in solving problems and executing plans to achieve the user's goals.";
              break;
            default:
              // For custom mode, check if there are custom instructions in the chat_mode_config
              if (chatModeConfig?.custom_instructions) {
                chatModePrompt = `\n${chatModeConfig.custom_instructions}`;
              }
              break;
          }
        }

        // List available tools based on chatModeConfig
        let toolsPrompt = "";
        if (chatModeConfig?.tools && chatModeConfig.tools.length > 0) {
          toolsPrompt = "\n\nYou have access to the following tools:\n";
          chatModeConfig.tools.forEach((toolId: string) => {
            switch (toolId) {
              case "web_search":
                toolsPrompt += "- Web Search: You can search the web for current information\n";
                break;
              case "code_interpreter":
                toolsPrompt += "- Code Interpreter: You can execute code to help solve problems\n";
                break;
              case "retrieval":
                toolsPrompt += "- Knowledge Retrieval: You can access user-provided documents\n";
                break;
              case "reasoning":
                toolsPrompt += "- Advanced Reasoning: You can use step-by-step reasoning for complex problems\n";
                break;
              case "research":
                toolsPrompt += "- Deep Research: You can conduct detailed research on topics\n";
                break;
              case "agent":
                toolsPrompt += "- Autonomous Agent: You can act autonomously to accomplish goals\n";
                break;
            }
          });
        }

        const systemPromptWithContext = contextString
          ? `${systemPrompt}${chatModePrompt}${toolsPrompt}\n\n${contextString}\n\nPlease use this context to inform your response when relevant.`
          : `${systemPrompt}${chatModePrompt}${toolsPrompt}`;

        const createModel = providers[provider as Provider];
        if (!createModel) throw new Error(JSON.stringify(ERROR_MESSAGES.INVALID_PROVIDER));
        const modelInstance = createModel(model);
        const wrappedLanguageModel = wrapLanguageModel({ model: modelInstance, middleware });

        dataStream.writeData('Generating response');
        
        const result = streamText({
          model: wrappedLanguageModel,
          messages,
          system: systemPromptWithContext,
          experimental_transform: smoothStream(),
          onChunk: (() => {
            let isFirstChunk = true;
            return () => {
              if (isFirstChunk) {
                dataStream.writeMessageAnnotation({
                  id: generateId(),
                  [COLUMNS.MODEL_USED]: model,
                  [COLUMNS.PROVIDER]: provider,
                  [COLUMNS.SPACE_ID]: spaceId,
                  [COLUMNS.CONVERSATION_ID]: conversationId,
                  chat_mode: chatMode,
                  chat_mode_config: chatModeConfig,
                  similarMessages: similarMessages.map(result => ({
                    id: result.message.id,
                    content: result.message.content,
                    role: result.message.role,
                    createdAt: result.message.createdAt,
                    score: result.score ?? 0,
                    conversationId: result.message.conversationId,
                    metadata: result.message.metadata || {}
                  }))
                });
                isFirstChunk = false;
              }
            };
          })(),
        });

        result.mergeIntoDataStream(dataStream);
        
        result.text.then(async (text) => {
          console.log('[API] Processing response text and saving messages');
          const userTags = await generateTags(userMessage.content, conversationContext);
          const assistantTags = await generateTags(text, conversationContext);
          
          console.log('[API] Saving user message with content:', userMessage.content.substring(0, 50) + '...');
          const dbUserMessage = await saveMessage({
            content: userMessage.content,
            role: 'user',
            model,
            provider,
            spaceId,
            conversationId,
            tags: userTags,
            chatMode,
            chatModeConfig,
            similarMessages: similarMessages.map(result => ({
              id: result.message.id,
              content: result.message.content,
              role: result.message.role,
              createdAt: result.message.createdAt,
              score: result.score ?? 0,
              conversationId: result.message.conversationId,
              metadata: result.message.metadata || {}
            }))
          });
          console.log('[API] User message saved with ID:', dbUserMessage.id);

          console.log('[API] Saving assistant message with content:', text.substring(0, 50) + '...');
          await saveMessage({
            content: text,
            role: 'assistant',
            model,
            provider,
            spaceId,
            conversationId,
            parentId: dbUserMessage.id,
            tags: assistantTags,
            chatMode,
            chatModeConfig,
            similarMessages: similarMessages.map(result => ({
              id: result.message.id,
              content: result.message.content,
              role: result.message.role,
              createdAt: result.message.createdAt,
              score: result.score ?? 0,
              conversationId: result.message.conversationId, 
              metadata: result.message.metadata || {}
            })),
          });

          const allMessages = await getMessages(conversationId);
          if (allMessages && allMessages.length >= 3) {
            const titleSystemPrompt = `
              You are a title generator. Generate a concise title (2-4 words) capturing the conversation's main topic. Return only the title.
              Example: Python Learning Path
            `;
            const fastModel = providers['groq']('llama-3.1-8b-instant');
            const messageTexts = allMessages.map((m) => m.content).join('\n');
            const { text: newTitle } = await generateText({
              model: fastModel,
              system: titleSystemPrompt,
              prompt: messageTexts,
              temperature: 0.3,
              maxTokens: 20,
            });
            await updateConversationTitle(conversationId, newTitle);
          }
          
        }).catch((error) => {
        });
      } catch (error) {
        let errorMessage;
        if (error instanceof Error) {
          try {
            errorMessage = JSON.parse(error.message);
          } catch {
            errorMessage = ERROR_MESSAGES.SERVER_ERROR(error.message);
          }
        } else {
          errorMessage = ERROR_MESSAGES.SERVER_ERROR("Error processing request");
        }
      }
    },
    onError: (error) => {
      let errorMessage;
      if (error instanceof Error) {
        try {
          errorMessage = JSON.parse(error.message);
        } catch {
          errorMessage = ERROR_MESSAGES.SERVER_ERROR(error.message);
        }
      } else {
        errorMessage = ERROR_MESSAGES.SERVER_ERROR("Error processing request");
      }
      return errorMessage.message || String(errorMessage);
    },
  });
}