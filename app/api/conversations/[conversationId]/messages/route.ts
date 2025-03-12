import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { COLUMNS, DB_TABLES } from "@/app/lib/db";
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

    // Get conversation - RLS will handle access control
    const { data: conversation, error: convError } = await supabase
      .from(DB_TABLES.CONVERSATIONS)
      .select()
      .eq(COLUMNS.ID, conversationId)
      .eq(COLUMNS.IS_DELETED, false)
      .single();

    if (convError || !conversation) {
      console.error("Error fetching conversation:", convError?.message || 'Conversation not found');
      return NextResponse.json(
        { status: 'error', error: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    // Get messages - RLS will ensure we only get messages from conversations in spaces owned by the user
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

    // Get conversation - RLS will handle access control
    const { data: conversation, error: convError } = await supabase
      .from(DB_TABLES.CONVERSATIONS)
      .select()
      .eq(COLUMNS.ID, conversationId)
      .eq(COLUMNS.IS_DELETED, false)
      .single();

    if (convError || !conversation) {
      console.error("Error fetching conversation:", convError?.message || 'Conversation not found');
      return NextResponse.json(
        { status: 'error', error: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    // Create message - RLS will ensure we can only create messages in conversations in spaces owned by the user
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
          spaceId: conversation[COLUMNS.SPACE_ID],
          conversationId,
          metadata: {
            userId: user.id,
            messageId: data.id,
            conversationId
          }
        });
      } catch (pineconeError) {
        console.warn('Non-critical error upserting message to vector DB:', pineconeError);
        // Not failing the API call if Pinecone indexing fails
      }
    }

    return NextResponse.json({ status: 'success', data });
  } catch (error) {
    console.error('Server error in POST /api/conversations/[conversationId]/messages:', error);
    return NextResponse.json(
      { status: 'error', error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}