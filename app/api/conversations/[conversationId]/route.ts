import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { COLUMNS, DB_TABLES } from "@/app/lib/db";
import { redis, CACHE_KEYS, CACHE_TTL } from "@/app/lib/cache";

import { deleteMessagesByConversationId } from "@/utils/pinecone";
import type { Conversation } from "@/types";

/**
 * GET - Get a specific conversation by ID
 */
export async function GET(
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json({ status: 'error', error: 'Authentication failed' }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ status: 'error', error: 'User not authenticated' }, { status: 401 });
    }

    const cacheKey = CACHE_KEYS.CONVERSATION(conversationId);
    const cachedConversation = await redis.get<Conversation>(cacheKey);
    if (cachedConversation) {
      return NextResponse.json({ status: 'success', data: cachedConversation });
    }

    // First check if the user has access to this conversation via space ownership
    const { data: conversation, error: convError } = await supabase
      .from(DB_TABLES.CONVERSATIONS)
      .select(`
        *, 
        ${DB_TABLES.SPACES}!inner(
          ${COLUMNS.ID},
          ${COLUMNS.USER_ID}
        )
      `)
      .eq(`${DB_TABLES.CONVERSATIONS}.${COLUMNS.ID}`, conversationId)
      .eq(`${DB_TABLES.CONVERSATIONS}.${COLUMNS.IS_DELETED}`, false)
      .eq(`${DB_TABLES.SPACES}.${COLUMNS.USER_ID}`, user.id)
      .single();

    if (convError) {
      console.error("Error fetching conversation:", convError);
      return NextResponse.json(
        { status: 'error', error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Extract just the conversation data without the joined space
    const conversationData = {
      ...conversation,
      [DB_TABLES.SPACES]: undefined
    };
    delete conversationData[DB_TABLES.SPACES];

    // Cache the result
    await redis.set(cacheKey, conversationData, { ex: CACHE_TTL.CONVERSATION });

    return NextResponse.json({ status: 'success', data: conversationData });
  } catch (error) {
    console.error('Server error in GET /api/conversations/[conversationId]:', error);
    return NextResponse.json(
      { status: 'error', error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update a conversation by ID
 */
export async function PATCH(
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json({ status: 'error', error: 'Authentication failed' }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ status: 'error', error: 'User not authenticated' }, { status: 401 });
    }

    let requestData;
    try {
      requestData = await request.json();
    } catch (error) {
      return NextResponse.json(
        { status: 'error', error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const { title } = requestData;
    
    if (!title) {
      return NextResponse.json(
        { status: 'error', error: 'Title is required' },
        { status: 400 }
      );
    }

    // First check if the user has access to this conversation via space ownership
    const { data: conversation, error: getError } = await supabase
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
      .eq(`${DB_TABLES.SPACES}.${COLUMNS.USER_ID}`, user.id)
      .single();

    if (getError) {
      console.error("Error getting conversation:", getError);
      return NextResponse.json(
        { status: 'error', error: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    // Update the conversation title
    const { data, error: updateError } = await supabase
      .from(DB_TABLES.CONVERSATIONS)
      .update({ title, updated_at: new Date().toISOString() })
      .eq(COLUMNS.ID, conversationId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating conversation title:", updateError);
      return NextResponse.json(
        { status: 'error', error: `Error updating conversation title: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Invalidate cache
    const cacheKey = CACHE_KEYS.CONVERSATION(conversationId);
    await redis.del(cacheKey);

    return NextResponse.json({
      status: 'success',
      data,
      toast: {
        title: 'Conversation Updated',
        description: 'Title has been updated successfully',
        variant: 'success'
      }
    });
  } catch (error) {
    console.error('Server error in PATCH /api/conversations/[conversationId]:', error);
    return NextResponse.json(
      { status: 'error', error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a conversation by ID (soft delete)
 */
export async function DELETE(
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json({ status: 'error', error: 'Authentication failed' }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ status: 'error', error: 'User not authenticated' }, { status: 401 });
    }

    // First check if the user has access to this conversation via space ownership
    const { data: conversation, error: getError } = await supabase
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
      .eq(`${DB_TABLES.SPACES}.${COLUMNS.USER_ID}`, user.id)
      .single();

    if (getError) {
      console.error("Error getting conversation:", getError);
      return NextResponse.json(
        { status: 'error', error: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    // Soft delete the conversation
    const { data, error: deleteError } = await supabase
      .from(DB_TABLES.CONVERSATIONS)
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString()
      })
      .eq(COLUMNS.ID, conversationId)
      .select();

    if (deleteError) {
      console.error("Error deleting conversation:", deleteError);
      return NextResponse.json(
        { status: 'error', error: `Failed to delete conversation: ${deleteError.message}` },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      console.error('No rows updated - RLS or data issue persists');
      return NextResponse.json(
        { status: 'error', error: 'No rows updated' },
        { status: 500 }
      );
    }

    // Delete the messages from Pinecone as well
    try {
      await deleteMessagesByConversationId(conversationId);
    } catch (pineconeError) {
      console.error('Error deleting messages from Pinecone:', pineconeError);
      // Not failing the operation if Pinecone deletion fails
    }

    // Invalidate cache
    const cacheKey = CACHE_KEYS.CONVERSATION(conversationId);
    await redis.del(cacheKey);

    return NextResponse.json({
      status: 'success',
      toast: {
        title: 'Conversation Deleted',
        description: 'The conversation has been deleted successfully',
        variant: 'success'
      }
    });
  } catch (error) {
    console.error('Server error in DELETE /api/conversations/[conversationId]:', error);
    return NextResponse.json(
      { status: 'error', error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}