import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import {  DB_TABLES, COLUMNS, ERROR_MESSAGES, MESSAGE_ROLES } from '@/lib/constants';
import { Message } from '@/types';

export async function GET(
  request: Request,
  props: { params: Promise<{ conversationId: string }> }
) {
  try {
    const params = await props.params;
    const { conversationId } = params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(ERROR_MESSAGES.UNAUTHORIZED, { status: ERROR_MESSAGES.UNAUTHORIZED.status });
    }

    const { data: messages, error } = await supabase
      .from(DB_TABLES.MESSAGES)
      .select('*')
      .eq(COLUMNS.CONVERSATION_ID, conversationId)
      .eq(COLUMNS.IS_DELETED, false)
      .order(COLUMNS.CREATED_AT, { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json(ERROR_MESSAGES.SERVER_ERROR(error.message), { status: 500 });
    }


    return NextResponse.json(messages);
  } catch (error: any) {
    console.error('Error in message fetch:', error);
    return NextResponse.json(ERROR_MESSAGES.SERVER_ERROR('Failed to fetch messages'), { status: 500 });
  }
}

export async function POST(
    request: Request,
    props: { params: Promise<{ conversationId: string }> }
) {
    try {
        const params = await props.params;
        const { conversationId } = params;

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json(ERROR_MESSAGES.UNAUTHORIZED, { status: ERROR_MESSAGES.UNAUTHORIZED.status });
        }

        const body = await request.json();
        const { content, role, model_used, provider, parent_message_id } = body;

        if (!content || !role) {
            return NextResponse.json(ERROR_MESSAGES.MISSING_FIELDS, { status: ERROR_MESSAGES.MISSING_FIELDS.status });
        }

        if (![MESSAGE_ROLES.USER, MESSAGE_ROLES.ASSISTANT].includes(role)) {
            return NextResponse.json(ERROR_MESSAGES.INVALID_ROLE, { status: ERROR_MESSAGES.INVALID_ROLE.status });
        }

        if(role === MESSAGE_ROLES.ASSISTANT && (!model_used || !provider)){
            return NextResponse.json(ERROR_MESSAGES.MISSING_ASSISTANT_FIELDS, {status: ERROR_MESSAGES.MISSING_ASSISTANT_FIELDS.status})
        }

        // Check if conversation exists and belongs to the user's space.
        const { data: conversation, error: conversationError } = await supabase
            .from(DB_TABLES.CONVERSATIONS)
            .select(`${COLUMNS.ID}, ${COLUMNS.SPACE_ID}`)
            .eq(COLUMNS.ID, conversationId)
            .single();


        if (conversationError || !conversation) {
            return NextResponse.json(ERROR_MESSAGES.CONVERSATION_NOT_FOUND, { status: ERROR_MESSAGES.CONVERSATION_NOT_FOUND.status });
        }

        // Check Space ownership.
        const { data: space, error: spaceError } = await supabase
            .from(DB_TABLES.SPACES)
            .select(COLUMNS.USER_ID)
            .eq(COLUMNS.ID, conversation.space_id)
            .single();

        if (spaceError || !space || space.user_id !== user.id) {
            return NextResponse.json(ERROR_MESSAGES.SPACE_NOT_FOUND, { status: ERROR_MESSAGES.SPACE_NOT_FOUND.status });
        }

        const messageData: Partial<Message> = {
            [COLUMNS.USER_ID]: user.id,
            [COLUMNS.ROLE]: role,
            [COLUMNS.CONTENT]: content,
            [COLUMNS.ANNOTATIONS]: {
                [COLUMNS.CONVERSATION_ID]: conversationId,
                [COLUMNS.MODEL_USED]: model_used,
                [COLUMNS.PROVIDER]: provider,
                [COLUMNS.PARENT_MESSAGE_ID]: parent_message_id
            },
            [COLUMNS.CREATED_AT]: new Date().toISOString(),
            [COLUMNS.UPDATED_AT]: new Date().toISOString()
        };

        const { data: message, error: insertError } = await supabase
            .from(DB_TABLES.MESSAGES)
            .insert(messageData)
            .select()
            .single();

        if (insertError) {
            console.error('Error creating message:', insertError);
            return NextResponse.json(ERROR_MESSAGES.SERVER_ERROR(insertError.message), { status: 500 });
        }

        return NextResponse.json(message);
    } catch (error: any) {
        console.error('Error in message creation:', error);
        return NextResponse.json(ERROR_MESSAGES.SERVER_ERROR('Failed to create message'), { status: 500 });
    }
}