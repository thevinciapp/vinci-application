import { streamText } from 'ai';
import { groq } from '@ai-sdk/groq';
import { createClient } from '@/utils/supabase/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export async function POST(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return new Response('Unauthorized', { status: 401 });

  const { messages, spaceId } = await req.json();
  
  if (!spaceId) return new Response('Space ID required', { status: 400 });

  const result = streamText({
    model: groq('deepseek-r1-distill-llama-70b'),
    messages,
  });

  return await result.toDataStreamResponse({})
}