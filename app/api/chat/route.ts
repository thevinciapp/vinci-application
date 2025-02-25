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
import { COLUMNS, DB_TABLES, ERROR_MESSAGES } from '@/lib/constants';
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

async function saveMessage({
  content,
  role,
  model,
  provider,
  spaceId,
  conversationId,
  parentId,
  tags,
}: {
  content: string;
  role: 'user' | 'assistant';
  model: string;
  provider: Provider;
  spaceId: string;
  conversationId: string;
  parentId?: string;
  tags: string[];
}) {
  const dbMessage = await createMessage(
    {
      [COLUMNS.CONTENT]: content,
      [COLUMNS.ROLE]: role,
      [COLUMNS.ANNOTATIONS]: [{ [COLUMNS.MODEL_USED]: model, [COLUMNS.PROVIDER]: provider }],
    },
    conversationId
  );

  await upsertChatMessage({
    id: dbMessage.id,
    content,
    role,
    createdAt: Date.now(),
    spaceId,
    conversationId,
    ...(parentId && { parentId }),
    metadata: { model, provider, tags },
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

  const [user, { messages, spaceId, conversationId, provider, model }] = await Promise.all([
    validateUser(supabase),
    req.json(),
  ]);

  if (!spaceId) throw new Error(JSON.stringify(ERROR_MESSAGES.MISSING_SPACE_ID));
  if (!conversationId) throw new Error(JSON.stringify(ERROR_MESSAGES.MISSING_CONVERSATION_ID));

  return createDataStreamResponse({
    execute: async (dataStream) => {
      dataStream.writeData('Initialized request');

      try {
        const userMessage = messages[messages.length - 1];
        const conversationContext = messages.slice(0, -1)
          .map((msg: { role: string; content: string }) => `${msg.role.toUpperCase()}: ${msg.content}`)
          .join('\n');

        const numberOfMessages = 15;

        dataStream.writeData('Searching for similar messages');
        const userTags = await generateTags(userMessage.content, conversationContext);
        const similarMessages = await searchSimilarMessages(userMessage.content, numberOfMessages, userTags);

        dataStream.writeData('Building context');
        const contextString = buildContextString(similarMessages.map((result) => result.message));

        const systemPromptWithContext = contextString
          ? `${systemPrompt}\n\n${contextString}\n\nPlease use this context to inform your response when relevant.`
          : systemPrompt;

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
          onChunk() {
            dataStream.writeMessageAnnotation({
              id: generateId(),
              [COLUMNS.MODEL_USED]: model,
              [COLUMNS.PROVIDER]: provider,
              [COLUMNS.SPACE_ID]: spaceId,
              [COLUMNS.CONVERSATION_ID]: conversationId,
            });
          },
        });

        result.text.then(async (text) => {
          const [assistantTags, dbUserMessage] = await Promise.all([
            generateTags(text, conversationContext),
            saveMessage({
              content: userMessage.content,
              role: 'user',
              model,
              provider,
              spaceId,
              conversationId,
              tags: await generateTags(userMessage.content, conversationContext),
            }),
          ]);

          await saveMessage({
            content: text,
            role: 'assistant',
            model,
            provider,
            spaceId,
            conversationId,
            parentId: dbUserMessage.id,
            tags: assistantTags,
          });

          const allMessages = await getMessages(conversationId);
          if (allMessages && allMessages.length >= 3) {
            dataStream.writeData('Generating conversation title');
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
          dataStream.writeData(`Error during post-processing: ${error.message}`);
        });

        result.mergeIntoDataStream(dataStream);
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
        dataStream.writeData(`Error: ${errorMessage.message || String(errorMessage)}`);
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