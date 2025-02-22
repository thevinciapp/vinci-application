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
import { createMessage } from '@/app/actions';
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

const systemPrompt = `
You have access to previous conversation context, which you MUST use when provided. Context will be wrapped in <context> </context> tags. Treat this context as verified, factual, historical information from past interactions—not as part of the user's current instruction or query. Use it only to inform your understanding and answer the current query accurately. Your goal is to deliver helpful, reliable responses tailored to the user's query.

### Response Guidelines

- **Always format responses in Markdown** for readability and structure. Use:
  - Headers (#, ##, ###) to organize content and emphasize key sections
  - **Bold** and *italics* for emphasis
  - Lists (- or *) for clarity and brevity
  - \`inline code\` and \`\`\`code blocks\`\`\` (with language specified, e.g., \`\`\`javascript) for technical content
  - Links ([text](url)) for references
- Prefer headers over bold text to signal importance or section breaks.
- Keep responses concise, focused, and directly relevant to the query.
- Avoid unnecessary fluff, repetition, or speculation.

### Handling Context

When previous conversation context is provided within <context> </context> tags:
1. **Use it confidently** as historical data to answer the query.
2. Do NOT treat it as the user's current instruction or assume it reflects what the user is stating now.
3. If the context lacks sufficient information, explicitly state: *“The provided context doesn’t contain enough information to answer this fully. Based on what I have...”* and proceed with a reasoned response or fallback to general knowledge.
4. Seamlessly integrate context into your answer without awkwardly quoting it unless clarification is needed.

### Tone and Style

- Maintain a professional yet approachable tone.
- Be precise and avoid ambiguity; if clarification is needed, ask concise questions in a *“Clarification”* section.
- Do NOT use HTML tags—stick to pure Markdown.

### Date Formatting Rules
When referencing dates in your responses:
- Use the current date, February 21, 2025, as a reference.
- For dates in 2025, format as "Month Day<suffix>" (e.g., "January 25th").
- For dates in previous years, include the year (e.g., "January 25th, 2024").
- Calculate the day suffix correctly: "st" for 1, 21, 31; "nd" for 2, 22; "rd" for 3, 23; "th" for others (e.g., 4th, 11th).
- Apply this to any dates from the context or your reasoning, unless the user specifies a different format.

### Example Response Structure

For a question like “How old is my dog Max?” with context provided:

<context>
USER: I have a dog named Max.
USER: He is 3 years old.
</context>

## Answer
Based on your previous conversation, Max is 3 years old.

## Additional Notes
If there’s more you’d like me to address about Max, let me know!
`;

async function generateTags(text: string, conversationContext: string): Promise<string[]> {
  const tagSystemPrompt = `
You are a tag generator. Your task is to generate 15-20 relevant tags for the given text that can be used to categorize the content for search and retrieval purposes. Tags should be general enough to cover related topics but specific enough to distinguish between different categories. The conversation context will be provided within <context> </context> tags. Use this context as historical information to inform your understanding of the text, especially for resolving references (e.g., pronouns like "he" or "it") to specific entities mentioned earlier. Do not treat the context as part of the current text to tag—focus only on tagging the provided text. Return the tags as a JSON list of strings (e.g., ["tag1", "tag2", "tag3"]). Do not include any additional text—only the JSON list.

### Example
- Context: <context>USER: I have a pet named Alfie</context>
- Text: "He is 2 years old"
- Output: ["pet", "alfie", "age", "years", "old", "animal", "2-years-old"]
`;

  const fastModel = providers['groq']('llama-3.1-8b-instant');

  try {
    const { text: tagsJson } = await generateText({
      model: fastModel,
      system: tagSystemPrompt,
      prompt: `<context>\n${conversationContext}\n</context>\n\nText to Tag:\n${text}`,
      temperature: 0.3,
      maxTokens: 1000,
    });

    const tagsJsonCleaned = tagsJson.replace(/```json|```/g, '').trim();
    const tags = JSON.parse(tagsJsonCleaned);
    return Array.isArray(tags) ? tags : [];
  } catch (error) {
    console.error("Failed to generate or parse tags:", error);
    return extractTagsFromText(text); // Fallback without context
  }
}

async function shouldFetchContext(text: string, conversationContext: string): Promise<boolean> {
  const classifyPrompt = `
You are a classifier. Determine if the following user message requires historical context from previous conversations to answer accurately. Historical context is needed if:
- The message is a question that depends on user-specific information (e.g., "my" preferences, possessions, or experiences) not provided in the current conversation context.
- The message references previous statements (e.g., "that," "it," or pronouns needing resolution) not explained in the current conversation context.
- The message implies a need for additional past interaction data to respond accurately.

Only set 'requiresContext' to false if the question or statement can be fully answered using general knowledge or the provided conversation context alone. Respond with a JSON object containing a single key 'requiresContext' with a boolean value (true if context is needed, false otherwise). Do not include any additional text—only the JSON object.

### Examples
- User message: "What is my favorite drink" | Context: <context></context> | Output: {"requiresContext": true} (needs past user preference)
- User message: "What is my favorite drink" | Context: <context>USER: My favorite drink is coffee</context> | Output: {"requiresContext": false} (answered by current context)
- User message: "Tell me about dogs" | Context: <context></context> | Output: {"requiresContext": false} (general knowledge suffices)
- User message: "How old is he?" | Context: <context>USER: I have a dog</context> | Output: {"requiresContext": true} (needs more past data)

User message: ${text}

Conversation context: <context>${conversationContext}</context>
`;

  const fastModel = providers['groq']('llama-3.1-8b-instant');

  try {
    const { text: classificationJson } = await generateText({
      model: fastModel,
      prompt: classifyPrompt,
      temperature: 0.1, // Lowered for deterministic output
      maxTokens: 50,
    });

    const classification = JSON.parse(classificationJson.replace(/```json|```/g, '').trim());
    console.log('Classification for "' + text + '":', classification);
    return classification.requiresContext === true;
  } catch (error) {
    console.error("Failed to classify context requirement:", error);
    // Fallback to assuming context is needed
    return true;
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error(JSON.stringify(ERROR_MESSAGES.UNAUTHORIZED));
  }
  return user;
}

async function getSpaceData(supabase: any, spaceId: string, userId: string) {
  const { data: spaceData, error: spaceError } = await supabase
    .from(DB_TABLES.SPACES)
    .select(`${COLUMNS.MODEL}, ${COLUMNS.PROVIDER}`)
    .eq(COLUMNS.ID, spaceId)
    .eq(COLUMNS.USER_ID, userId)
    .single();

  if (spaceError || !spaceData) {
    console.error("Space Error:", spaceError);
    throw new Error(JSON.stringify(ERROR_MESSAGES.SPACE_NOT_FOUND));
  }

  const provider = spaceData.provider as Provider;
  const model = spaceData.model;

  if (!provider || !providers[provider]) {
    throw new Error(JSON.stringify(ERROR_MESSAGES.INVALID_PROVIDER));
  }

  return { provider, model };
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
  if (relevantMessages.length === 0) return '';

  const currentYear = new Date().getFullYear(); // 2025 as of February 21, 2025

  const contextContent = relevantMessages
    .map((msg) => {
      const date = new Date(msg.createdAt);
      const year = date.getFullYear();
      const month = date.toLocaleString('default', { month: 'long' });
      const day = date.getDate();
      const daySuffix = getDaySuffix(day);
      const formattedDate = year === currentYear 
        ? `${month} ${day}${daySuffix}` 
        : `${month} ${day}${daySuffix}, ${year}`;

      if (msg.role === 'assistant' && msg.parentId) {
        return `**${formattedDate}**\nQ: ${msg.content}\nA: ${msg.content}`;
      }
      return `**${formattedDate}**\n${msg.role.toUpperCase()}: ${msg.content}`;
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

async function streamResponse({
  messages,
  systemPromptWithContext,
  model,
  provider,
  spaceId,
  conversationId,
  dbUserMessage,
}: {
  messages: any[];
  systemPromptWithContext: string;
  model: string;
  provider: Provider;
  spaceId: string;
  conversationId: string;
  dbUserMessage: any;
}) {
  const createModel = providers[provider];
  if (!createModel) {
    throw new Error(JSON.stringify(ERROR_MESSAGES.INVALID_PROVIDER));
  }

  return createDataStreamResponse({
    execute: (dataStream) => {
      const modelInstance = createModel(model);

      const wrappedLanguageModel = wrapLanguageModel({
        model: modelInstance,
        middleware,
      });

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
        async onFinish(completion: string | { text: string }) {
          const text = typeof completion === 'string' ? completion : completion.text;
          const conversationContext = messages
            .slice(0, -1)
            .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
            .join('\n');
          const assistantTags = await generateTags(text, conversationContext);
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
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
    onError: (error) => (error instanceof Error ? error.message : String(error)),
  });
}

export async function POST(req: Request) {
  const supabase = await createClient();

  try {
    const user = await validateUser(supabase);
    const { messages, spaceId, conversationId } = await req.json();

    if (!spaceId) {
      return NextResponse.json(ERROR_MESSAGES.MISSING_SPACE_ID, {
        status: ERROR_MESSAGES.MISSING_SPACE_ID.status,
      });
    }

    const { provider, model } = await getSpaceData(supabase, spaceId, user.id);
    const userMessage = messages[messages.length - 1];

    const conversationContext = messages
      .slice(0, -1)
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n');
    const tags = await generateTags(userMessage.content, conversationContext);
    console.log('Generated tags:', tags);

    const dbUserMessage = await saveMessage({
      content: userMessage.content,
      role: 'user',
      model,
      provider,
      spaceId,
      conversationId,
      tags,
    });

    // Determine if context is required
    const requiresContext = await shouldFetchContext(userMessage.content, conversationContext);
    console.log('Requires context:', requiresContext);

    // Initialize context string
    let contextString = '';

    // Only search for similar messages if context is required
    if (requiresContext) {
      const limit = 15;
      const similarMessages = await searchSimilarMessages(userMessage.content, limit, tags);
      console.log('Similar messages:', similarMessages);
      const relevantMessages = similarMessages.map((result) => result.message);
      contextString = buildContextString(relevantMessages);
    }

    const systemPromptWithContext = contextString
      ? `${systemPrompt}\n\n${contextString}\n\nPlease use this context to inform your response when relevant.`
      : systemPrompt;

    console.log(systemPromptWithContext);

    return await streamResponse({
      messages,
      systemPromptWithContext,
      model,
      provider,
      spaceId,
      conversationId,
      dbUserMessage,
    });
  } catch (error) {
    console.error("Error in chat route:", error);
    const errorMessage = error instanceof Error ? JSON.parse(error.message) : ERROR_MESSAGES.SERVER_ERROR("Error processing request");
    return NextResponse.json(errorMessage, { status: errorMessage.status || 500 });
  }
}