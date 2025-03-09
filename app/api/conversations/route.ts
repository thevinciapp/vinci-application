import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { COLUMNS, DB_TABLES } from "@/app/lib/db";
import type { Conversation } from "@/types";

/**
 * GET - Get conversations for a space
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: 'error', error: 'User not authenticated' }, { status: 401 });
    }

    const url = new URL(request.url);
    const spaceId = url.searchParams.get('spaceId');
    if (!spaceId) {
      return NextResponse.json({ status: 'error', error: 'Space ID is required' }, { status: 400 });
    }

    // Get conversations from DB
    const { data, error } = await supabase
      .from(DB_TABLES.CONVERSATIONS)
      .select("*")
      .eq(COLUMNS.SPACE_ID, spaceId)
      .eq(COLUMNS.IS_DELETED, false)
      .order(COLUMNS.UPDATED_AT, { ascending: false });

    if (error) {
      console.error("Error fetching conversations:", error);
      return NextResponse.json(
        { status: 'error', error: `Error fetching conversations: ${error.message}` }, 
        { status: 500 }
      );
    }

    return NextResponse.json({ status: 'success', data: data || [] });
  } catch (error) {
    console.error('Server error in GET /api/conversations:', error);
    return NextResponse.json(
      { status: 'error', error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new conversation
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: 'error', error: 'User not authenticated' }, { status: 401 });
    }

    const { title, spaceId } = await request.json();
    
    if (!spaceId) {
      return NextResponse.json(
        { status: 'error', error: 'Space ID is required' },
        { status: 400 }
      );
    }
    
    const timestamp = new Date().toISOString();
    
    // Create the conversation
    const { data: conversationData, error: conversationError } = await supabase
      .from(DB_TABLES.CONVERSATIONS)
      .insert([{
        title: title || 'New Conversation',
        space_id: spaceId,
        created_at: timestamp,
        updated_at: timestamp,
        is_deleted: false
      }])
      .select()
      .single();

    if (conversationError) {
      console.error("Error creating conversation:", conversationError);
      return NextResponse.json(
        { status: 'error', error: `Error creating conversation: ${conversationError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'success',
      data: conversationData
    });
  } catch (error) {
    console.error('Server error in POST /api/conversations:', error);
    return NextResponse.json(
      { status: 'error', error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update a conversation
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: 'error', error: 'User not authenticated' }, { status: 401 });
    }

    const { id, title } = await request.json();
    
    if (!id || !title) {
      return NextResponse.json(
        { status: 'error', error: 'Conversation ID and title are required' },
        { status: 400 }
      );
    }
    
    const timestamp = new Date().toISOString();
    
    // Update the conversation
    const { data: conversationData, error: conversationError } = await supabase
      .from(DB_TABLES.CONVERSATIONS)
      .update({
        title,
        updated_at: timestamp
      })
      .eq('id', id)
      .select()
      .single();

    if (conversationError) {
      console.error("Error updating conversation:", conversationError);
      return NextResponse.json(
        { status: 'error', error: `Error updating conversation: ${conversationError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'success',
      data: conversationData
    });
  } catch (error) {
    console.error('Server error in PATCH /api/conversations:', error);
    return NextResponse.json(
      { status: 'error', error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a conversation (soft delete)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: 'error', error: 'User not authenticated' }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ status: 'error', error: 'Conversation ID is required' }, { status: 400 });
    }
    
    const timestamp = new Date().toISOString();
    
    // Soft delete the conversation
    const { error: conversationError } = await supabase
      .from(DB_TABLES.CONVERSATIONS)
      .update({
        is_deleted: true,
        updated_at: timestamp
      })
      .eq('id', id);

    if (conversationError) {
      console.error("Error deleting conversation:", conversationError);
      return NextResponse.json(
        { status: 'error', error: `Error deleting conversation: ${conversationError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'success',
      data: { id }
    });
  } catch (error) {
    console.error('Server error in DELETE /api/conversations:', error);
    return NextResponse.json(
      { status: 'error', error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
