import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { COLUMNS, DB_TABLES } from "@/app/lib/db";
import { redis, CACHE_KEYS, CACHE_TTL } from "@/app/lib/cache";
import { upsertChatMessage } from "@/utils/pinecone";

/**
 * GET - Get all messages for a conversation
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ conversationId: string }> }
) {
  const params = await props.params;
  try {
    const conversationId = await Promise.resolve(params.conversationId);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: 'error', error: 'User not authenticated' }, { status: 401 });
    }

    const cacheKey = CACHE_KEYS.MESSAGES(conversationId);
    const cachedMessages = await redis.get(cacheKey);
    if (cachedMessages) {
      return NextResponse.json({ status: 'success', data: cachedMessages });
    }

    const { data: conversation, error: convError } = await supabase
      .from(DB_TABLES.CONVERSATIONS)
      .select(`
        ${COLUMNS.ID}, 
        ${COLUMNS.SPACE_ID},
        ${DB_TABLES.SPACES}!inner(
          ${COLUMNS.ID},
          ${COLUMNS.USER_ID}
        )
      `)
      .eq(`${DB_TABLES.CONVERSATIONS}.${COLUMNS.ID}`, conversationId)
      .eq(`${DB_TABLES.CONVERSATIONS}.${COLUMNS.IS_DELETED}`, false)
      .eq(`${DB_TABLES.SPACES}.${COLUMNS.USER_ID}`, user.id)
      .single();

    if (convError || !conversation) {
      console.error("Error fetching conversation:", convError?.message || 'Conversation not found');
      return NextResponse.json(
        { status: 'error', error: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    // Get messages
    const { data, error } = await supabase
      .from(DB_TABLES.MESSAGES)
      .select(`
        id, 
        conversation_id, 
        content, 
        role, 
        created_at, 
        updated_at, 
        is_deleted,
        annotations
      `)
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error.message);
      return NextResponse.json(
        { status: 'error', error: error.message },
        { status: 500 }
      );
    }

    // Cache the messages
    if (data) {
      await redis.set(cacheKey, data, { ex: CACHE_TTL.MESSAGES });
    }

    return NextResponse.json({ status: 'success', data: data || [] });
  } catch (error) {
    console.error('Server error in GET /api/conversations/[conversationId]/messages:', error);
    return NextResponse.json(
      { status: 'error', error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new message in a conversation
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ conversationId: string }> }
) {
  const params = await props.params;
  try {
    // Get conversationId from params
    const conversationId = params.conversationId;
    
    // Validate conversationId exists
    if (!conversationId) {
      return NextResponse.json(
        { status: 'error', error: 'Conversation ID is required' },
        { status: 400 }
      );
    }
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: 'error', error: 'User not authenticated' }, { status: 401 });
    }

    let messageData;
    try {
      messageData = await request.json();
    } catch (error) {
      return NextResponse.json(
        { status: 'error', error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    if (!messageData.content || !messageData.role) {
      return NextResponse.json(
        { status: 'error', error: 'Content and role are required' },
        { status: 400 }
      );
    }

    // First check if the user has access to this conversation via space ownership
    const { data: conversation, error: convError } = await supabase
      .from(DB_TABLES.CONVERSATIONS)
      .select(`
        ${COLUMNS.ID}, 
        ${COLUMNS.SPACE_ID},
        ${DB_TABLES.SPACES}!inner(
          ${COLUMNS.ID},
          ${COLUMNS.USER_ID}
        )
      `)
      .eq(`${DB_TABLES.CONVERSATIONS}.${COLUMNS.ID}`, conversationId)
      .eq(`${DB_TABLES.CONVERSATIONS}.${COLUMNS.IS_DELETED}`, false)
      .eq(`${DB_TABLES.SPACES}.${COLUMNS.USER_ID}`, user.id)
      .single();

    if (convError || !conversation) {
      console.error("Error accessing conversation:", convError?.message || 'Conversation not found');
      return NextResponse.json(
        { status: 'error', error: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    // Create the message
    const { data, error } = await supabase
      .from(DB_TABLES.MESSAGES)
      .insert({
        conversation_id: conversationId,
        content: messageData.content,
        role: messageData.role,
        user_id: user.id,
        annotations: messageData.annotations || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_deleted: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating message:', error.message);
      return NextResponse.json(
        { status: 'error', error: error.message },
        { status: 500 }
      );
    }

    // Also update the conversation's updated_at timestamp
    await supabase
      .from(DB_TABLES.CONVERSATIONS)
      .update({ updated_at: new Date().toISOString() })
      .eq(COLUMNS.ID, conversationId);

    // Store message in Pinecone for vector search
    if (data) {
      try {
        await upsertChatMessage({
          id: data.id,
          content: data.content,
          role: data.role,
          createdAt: Date.now(),
          spaceId: conversation.space_id,
          conversationId,
          metadata: {
            model: messageData.annotations?.[0]?.[COLUMNS.MODEL_USED],
            provider: messageData.annotations?.[0]?.[COLUMNS.PROVIDER],
            tags: messageData.tags || []
          }
        });
      } catch (pineconeError) {
        console.error('Error storing message in Pinecone:', pineconeError);
        // Don't fail the operation because of Pinecone indexing issues
      }
    }

    // Invalidate cache
    const messagesCacheKey = CACHE_KEYS.MESSAGES(conversationId);
    await redis.del(messagesCacheKey);

    return NextResponse.json({ status: 'success', data });
  } catch (error) {
    console.error('Server error in POST /api/conversations/[conversationId]/messages:', error);
    return NextResponse.json(
      { status: 'error', error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}