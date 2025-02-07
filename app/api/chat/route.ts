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
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createClient } from '@/utils/supabase/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic'
export const runtime = 'edge'

type Provider = keyof typeof providers;

const providers = {
  groq: (model: string, messages: any[]) => {
    return streamText({
      model: groq(model),
      messages,
    });
  },
  anthropic: (model: string, messages: any[]) => {
    return streamText({
      model: anthropic(model),
      messages,
    });
  },
  openai: (model: string, messages: any[]) => {
    return streamText({
      model: openai(model),
      messages,
    });
  },
  cohere: (model: string, messages: any[]) => {
    return streamText({
      model: cohere(model),
      messages,
    });
  },
  mistral: (model: string, messages: any[]) => {
    return streamText({
      model: mistral(model),
      messages,
    });
  },
  google: (model: string, messages: any[]) => {
    return streamText({
      model: google(model),
      messages,
    });
  },
  xai: (model: string, messages: any[]) => {
    return streamText({
      model: xai(model),
      messages,
    });
  },
  togetherai: (model: string, messages: any[]) => {
    return streamText({
      model: togetherai(model),
      messages,
    });
  },
  deepseek: (model: string, messages: any[]) => {
    return streamText({
      model: deepseek(model),
      messages,
    });
  },
  cerebras: (model: string, messages: any[]) => {
    return streamText({
      model: cerebras(model),
      messages,
    });
  },
  perplexity: (model: string, messages: any[]) => {
    return streamText({
      model: perplexity(model),
      messages,
    });
  }
};

export async function POST(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return new Response('Unauthorized', { status: 401 });

  const { messages, spaceId } = await req.json();
  
  if (!spaceId) return new Response('Space ID required', { status: 400 });
  
  const { data: spaceData } = await supabase
    .from('spaces')
    .select('model, provider')
    .eq('id', spaceId)
    .single();

  if (!spaceData?.provider || !providers[spaceData.provider as Provider]) {
    return new Response('Invalid provider', { status: 400 });
  }

  try {
    const result = providers[spaceData.provider as Provider](spaceData?.model, messages);
    return await result.toDataStreamResponse({});
  } catch (error) {
    console.error('Error in chat route:', error);
    return new Response('Error processing request', { status: 500 });
  }
}