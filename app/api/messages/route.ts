import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface MessageRequest {
  conversation_id: string;
  user_message: string;
  assistant_message: string;
  parent_message_id?: string | null;
}

/**
 * POST /api/message
 * Saves a chat message pair (user message and assistant response).
 * Expects JSON body: { conversation_id: string, user_message: string, assistant_message: string, parent_message_id?: string | null }
 */
export async function POST(request: Request) {
  try {
    const { conversation_id, user_message, assistant_message, parent_message_id } = await request.json() as MessageRequest;

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
  
    if (!user) return new Response('Unauthorized', { status: 401 });

    // Insert the new message record with both user and assistant messages
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        user_id: user.id,
        user_message,
        assistant_message,
        parent_message_id: parent_message_id || null,
      })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
