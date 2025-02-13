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
    await createMessage({
      [COLUMNS.CONTENT]: messages[messages.length - 1].content,
      [COLUMNS.ROLE]: 'user',
      [COLUMNS.ANNOTATIONS]: [
        {
          [COLUMNS.MODEL_USED]: model,
          [COLUMNS.PROVIDER]: provider
        }
      ]
    }, conversationId);

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
          messages,
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
            await createMessage({
              [COLUMNS.CONTENT]: text,
              [COLUMNS.ROLE]: 'assistant',
              [COLUMNS.ANNOTATIONS]: [
                {
                  [COLUMNS.MODEL_USED]: model,
                  [COLUMNS.PROVIDER]: provider
                }
              ]
            }, conversationId);
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