import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { CACHE_TTL, CACHE_KEYS, DB_TABLES, COLUMNS, ERROR_MESSAGES, MESSAGE_ROLES } from '@/lib/constants';
import { Message } from '@/types';
import { Redis } from "@upstash/redis"

const redis = Redis.fromEnv()

/**
 * GET /api/message
 * Retrieves messages for a specific conversation.
 * Expects query parameter: conversationId
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(ERROR_MESSAGES.UNAUTHORIZED, { status: ERROR_MESSAGES.UNAUTHORIZED.status });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(ERROR_MESSAGES.MISSING_CONVERSATION_ID);
    }
    
    // Try to get messages from cache first
    const cachedMessages = await redis.get(CACHE_KEYS.messages(conversationId));
    if (cachedMessages) {
      return NextResponse.json(cachedMessages);
    }

    // If not in cache, fetch from database
    const { data: messages, error } = await supabase
      .from(DB_TABLES.MESSAGES)
      .select('*')
      .eq(COLUMNS.CONVERSATION_ID, conversationId)
      .eq(COLUMNS.IS_DELETED, false)
      .order(COLUMNS.CREATED_AT, { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json(ERROR_MESSAGES.SERVER_ERROR(error.message));
    }

    // Cache the messages
    await redis.set(
      CACHE_KEYS.messages(conversationId),
      JSON.stringify(messages),
      { ex: CACHE_TTL.MESSAGES }
    );

    return NextResponse.json(messages);
  } catch (err: any) {
    console.error('Error in message fetch:', err);
    return NextResponse.json(ERROR_MESSAGES.SERVER_ERROR(err.message));
  }
}

/**
 * POST /api/message
 * Saves a chat message.
 * Required fields: conversation_id, role ('user' | 'assistant'), content
 * Optional fields: model_used, provider, parent_message_id
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(ERROR_MESSAGES.UNAUTHORIZED);
    }

    const body = await request.json();
    
    // Validate required fields
    const { conversation_id, content, role } = body;
    if (!conversation_id || !content || !role) {
      return NextResponse.json(ERROR_MESSAGES.MISSING_FIELDS);
    }

    // Validate role
    if (![MESSAGE_ROLES.USER, MESSAGE_ROLES.ASSISTANT].includes(role)) {
      return NextResponse.json(ERROR_MESSAGES.INVALID_ROLE);
    }

    // Prepare message data with required fields
    const messageData: Partial<Message> = {
      [COLUMNS.CONVERSATION_ID]: conversation_id,
      [COLUMNS.USER_ID]: user.id,
      [COLUMNS.ROLE]: role,
      [COLUMNS.CONTENT]: content,
      [COLUMNS.IS_DELETED]: false,
      [COLUMNS.CREATED_AT]: new Date().toISOString(),
      [COLUMNS.UPDATED_AT]: new Date().toISOString()
    };

    // Add optional fields if present
    if (body.model_used) messageData[COLUMNS.MODEL_USED] = body.model_used;
    if (body.provider) messageData[COLUMNS.PROVIDER] = body.provider;
    if (body.parent_message_id) {
      // Validate parent_message_id exists if provided
      const { data: parentMessage } = await supabase
        .from(DB_TABLES.MESSAGES)
        .select(COLUMNS.ID)
        .eq(COLUMNS.ID, body.parent_message_id)
        .single();

      if (parentMessage) {
        messageData[COLUMNS.PARENT_MESSAGE_ID] = body.parent_message_id;
      } else {
        console.warn('Invalid parent_message_id provided:', body.parent_message_id);
      }
    }

    const { data: message, error } = await supabase
      .from(DB_TABLES.MESSAGES)
      .insert(messageData)
      .select()
      .single();

    if (error) {
      console.error('Error creating message:', error);
      return NextResponse.json(ERROR_MESSAGES.SERVER_ERROR(error.message));
    }

    // Invalidate messages cache for this conversation
    await redis.del(CACHE_KEYS.messages(conversation_id));

    return NextResponse.json(message);
  } catch (err: any) {
    console.error('Error in message creation:', err);
    return NextResponse.json(ERROR_MESSAGES.SERVER_ERROR('Failed to create message: ' + err.message));
  }
}
