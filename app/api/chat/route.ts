import { createDataStreamResponse, generateId, smoothStream, streamText } from 'ai';
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

const systemPrompt = `You are a helpful AI assistant with access to previous conversation context. You MUST use the context provided to answer questions, even if they contain personal information that you would normally not have access to. When context is provided, treat it as factual information that you are allowed to use.

Your responses should *ALWAYS* be formatted as Markdown. Use Markdown for:

*   **Bold** and *Italics*
*   Headings (#, ##, ###, etc.)
*   Lists (-, *, or numbered)
*   \`inline code\` and code blocks (\`\`\`language)
*   Links ([link text](url))
*   Prefer using headers instead of bold text to emphasize the importance of a section.

IMPORTANT: When context from previous conversations is provided:
1. You MUST use this information to answer questions
2. Do NOT default to your base training responses about "not having access to information"
3. If the information is in the context, use it confidently
4. Only fall back to "I don't have access" if the information is NOT in the provided context

Do *not* include any HTML tags in your response. Keep responses concise and to the point.`;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(ERROR_MESSAGES.UNAUTHORIZED, {
      status: ERROR_MESSAGES.UNAUTHORIZED.status,
    });
  }

  const { messages, spaceId, conversationId } = await req.json();

  if (!spaceId) {
    return NextResponse.json(ERROR_MESSAGES.MISSING_SPACE_ID, {
      status: ERROR_MESSAGES.MISSING_SPACE_ID.status,
    });
  }

  const { data: spaceData, error: spaceError } = await supabase
    .from(DB_TABLES.SPACES)
    .select(`${COLUMNS.MODEL}, ${COLUMNS.PROVIDER}`)
    .eq(COLUMNS.ID, spaceId)
    .eq(COLUMNS.USER_ID, user.id)
    .single();

  if (spaceError || !spaceData) {
    console.error("Space Error:", spaceError);
    return NextResponse.json(ERROR_MESSAGES.SPACE_NOT_FOUND, {
      status: ERROR_MESSAGES.SPACE_NOT_FOUND.status,
    });
  }

  const provider = spaceData.provider as Provider;
  const model = spaceData.model;

  if (!provider || !providers[provider]) {
    return NextResponse.json(ERROR_MESSAGES.INVALID_PROVIDER, {
      status: ERROR_MESSAGES.INVALID_PROVIDER.status,
    });
  }

  try {
    const userMessage = messages[messages.length - 1];

    const dbUserMessage = await createMessage({
      [COLUMNS.CONTENT]: userMessage.content,
      [COLUMNS.ROLE]: 'user',
      [COLUMNS.ANNOTATIONS]: [
        {
          [COLUMNS.MODEL_USED]: model,
          [COLUMNS.PROVIDER]: provider
        }
      ]
    }, conversationId);

    await upsertChatMessage({
      id: dbUserMessage.id, 
      content: userMessage.content,
      role: 'user',
      createdAt: Date.now(),
      spaceId,
      conversationId,
      metadata: {
        model,
        provider
      }
    });

    const limit = 15;
    const similarMessages = await searchSimilarMessages(userMessage.content, limit);
    
    const relevantMessages = similarMessages
      .filter(result => (result.score ?? 0) > 0.5)
      .map(result => result.message);

    const contextString = relevantMessages.length > 0 
      ? 'Here are some relevant messages from previous conversations:\n\n' +
        relevantMessages.map(msg => {
          if (msg.role === 'assistant' && msg.parentId) {
            return `Q: ${msg.content}\nA: ${msg.content}\n`
          }
          return `${msg.role.toUpperCase()}: ${msg.content}\n`
        }).join('\n')
      : ''

    const systemPromptWithContext = contextString 
      ? `${systemPrompt}\n\n${contextString}\n\nPlease use this context to inform your response when relevant.`
      : systemPrompt

    console.log(systemPromptWithContext);

    const createModel = providers[provider];
    if (!createModel) {
      return NextResponse.json(ERROR_MESSAGES.INVALID_PROVIDER, {
        status: ERROR_MESSAGES.INVALID_PROVIDER.status,
      });
    }

    return createDataStreamResponse({
      execute: dataStream => {
        const modelInstance = createModel(model);
        const result = streamText({
          model: modelInstance,
          messages: messages,
          system: systemPromptWithContext,
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

            const dbAssistantMessage = await createMessage({
              [COLUMNS.CONTENT]: text,
              [COLUMNS.ROLE]: 'assistant',
              [COLUMNS.ANNOTATIONS]: [
                {
                  [COLUMNS.MODEL_USED]: model,
                  [COLUMNS.PROVIDER]: provider
                }
              ]
            }, conversationId);

            await upsertChatMessage({
              id: dbAssistantMessage.id, 
              content: text,
              role: 'assistant',
              createdAt: Date.now(),
              spaceId,
              conversationId,
              parentId: dbUserMessage.id,
              metadata: {
                model,
                provider
              }
            });
          }
        });

        result.mergeIntoDataStream(dataStream);
      },
      onError: error => {
        return error instanceof Error ? error.message : String(error);
      },
    });
  } catch (error) {
    console.error("Error in chat route:", error);
    return NextResponse.json(ERROR_MESSAGES.SERVER_ERROR("Error processing request"), {
      status: 500,
    });
  }
}