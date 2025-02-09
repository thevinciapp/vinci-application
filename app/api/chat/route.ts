import { streamText } from 'ai';
import { groq } from '@ai-sdk/groq';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { cohere } from '@ai-sdk/cohere';
import { mistral } from '@ai-sdk/mistral';
import { google } from '@ai-sdk/google';
import { xai } from '@ai-sdk/xai';
import { togetherai } from '@ai-sdk/togetherai';
import { deepseek } from '@ai-sdk/deepseek';
import { cerebras } from '@ai-sdk/cerebras';
import { perplexity } from '@ai-sdk/perplexity';
import { createClient } from '@/utils/supabase/server';
import { COLUMNS, DB_TABLES, Provider, ERROR_MESSAGES } from '@/lib/constants'; 
import { NextResponse } from 'next/server';


export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const runtime = 'edge';


const providers: Record<Provider, (model: string, messages: any[]) => any> = { 
  groq: (model, messages) => streamText({ model: groq(model), messages }),
  anthropic: (model, messages) => streamText({ model: anthropic(model), messages }),
  openai: (model, messages) => streamText({ model: openai(model), messages }),
  cohere: (model, messages) => streamText({ model: cohere(model), messages }),
  mistral: (model, messages) => streamText({ model: mistral(model), messages }),
  google: (model, messages) => streamText({ model: google(model), messages }),
  xai: (model, messages) => streamText({ model: xai(model), messages }),
  togetherai: (model, messages) => streamText({ model: togetherai(model), messages }),
  deepseek: (model, messages) => streamText({ model: deepseek(model), messages }),
  cerebras: (model, messages) => streamText({ model: cerebras(model), messages }),
  perplexity: (model, messages) => streamText({ model: perplexity(model), messages }),
};


export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(ERROR_MESSAGES.UNAUTHORIZED, { status: ERROR_MESSAGES.UNAUTHORIZED.status });
  }

  const { messages, spaceId } = await req.json();

  if (!spaceId) {
    return NextResponse.json(ERROR_MESSAGES.MISSING_SPACE_ID, { status: ERROR_MESSAGES.MISSING_SPACE_ID.status });
  }


  const { data: spaceData, error: spaceError } = await supabase
      .from(DB_TABLES.SPACES)
      .select(`${COLUMNS.MODEL}, ${COLUMNS.PROVIDER}`)
      .eq(COLUMNS.ID, spaceId)
      .eq(COLUMNS.USER_ID, user.id)
      .single();

    if (spaceError || !spaceData) {
      console.error("Space Error:", spaceError)
      return NextResponse.json(ERROR_MESSAGES.SPACE_NOT_FOUND, { status: ERROR_MESSAGES.SPACE_NOT_FOUND.status });
    }

    const provider = spaceData.provider as Provider;
    const model = spaceData.model;


  if (!provider || !providers[provider]) {
    return NextResponse.json(ERROR_MESSAGES.INVALID_PROVIDER, { status: ERROR_MESSAGES.INVALID_PROVIDER.status });
  }

  try {
    const result = providers[provider](model, messages);
    return await result.toDataStreamResponse({});
  } catch (error) {
    console.error('Error in chat route:', error);
    return NextResponse.json(ERROR_MESSAGES.SERVER_ERROR('Error processing request'), { status: 500 });
  }
}