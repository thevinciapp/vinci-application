import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface MessageRequest {
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  model_used?: string;
  provider?: string;
  parent_message_id?: string;
}

/**
 * POST /api/message
 * Saves a chat message.
 * Expects JSON body: { conversation_id: string, user_id: string, role: 'user' | 'assistant', content: string, model_used?: string, provider?: string }
 */
export async function POST(request: Request) {
  try {
    const messageData = await request.json() as MessageRequest;

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
  
    if (!user) return new Response('Unauthorized', { status: 401 });

    const { data: insertedData, error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: messageData.conversation_id,
        user_id: user.id,
        role: messageData.role,
        content: messageData.content,
        model_used: messageData.model_used,
        provider: messageData.provider,
        parent_message_id: messageData.parent_message_id
      })
      .select()
      .single();      

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json(insertedData);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
