import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { COLUMNS, DB_TABLES } from "@/app/lib/db";
import type { Message } from "@/types";

/**
 * GET - Get messages for a conversation
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: 'error', error: 'User not authenticated' }, { status: 401 });
    }

    const url = new URL(request.url);
    const conversationId = url.searchParams.get('conversationId');
    if (!conversationId) {
      return NextResponse.json({ status: 'error', error: 'Conversation ID is required' }, { status: 400 });
    }

    // Get messages from DB
    const { data, error } = await supabase
      .from(DB_TABLES.MESSAGES)
      .select("*")
      .eq(COLUMNS.CONVERSATION_ID, conversationId)
      .order(COLUMNS.CREATED_AT, { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return NextResponse.json(
        { status: 'error', error: `Error fetching messages: ${error.message}` }, 
        { status: 500 }
      );
    }

    return NextResponse.json({ status: 'success', data: data || [] });
  } catch (error) {
    console.error('Server error in GET /api/messages:', error);
    return NextResponse.json(
      { status: 'error', error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new message
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: 'error', error: 'User not authenticated' }, { status: 401 });
    }

    const { content, role, annotations, conversationId } = await request.json();
    
    if (!content || !role || !conversationId) {
      return NextResponse.json(
        { status: 'error', error: 'Content, role, and conversationId are required' },
        { status: 400 }
      );
    }
    
    const timestamp = new Date().toISOString();
    
    // Create the message
    const { data: messageData, error: messageError } = await supabase
      .from(DB_TABLES.MESSAGES)
      .insert([{
        content,
        role,
        conversation_id: conversationId,
        annotations: annotations || [],
        created_at: timestamp,
        updated_at: timestamp
      }])
      .select()
      .single();

    if (messageError) {
      console.error("Error creating message:", messageError);
      return NextResponse.json(
        { status: 'error', error: `Error creating message: ${messageError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'success',
      data: messageData
    });
  } catch (error) {
    console.error('Server error in POST /api/messages:', error);
    return NextResponse.json(
      { status: 'error', error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
