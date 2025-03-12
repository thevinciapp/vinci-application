import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { COLUMNS, DB_TABLES } from "@/constants";
import type { Conversation } from "@/types";

/**
 * GET - Get all conversations for a space
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ spaceId: string }> }
) {
  try {
    // Ensure params is awaited and validate URL parameters
    const { spaceId } = (await context.params);
    
    // Validate spaceId format
    if (!spaceId || typeof spaceId !== 'string' || spaceId.length < 1) {
      return NextResponse.json(
        { status: 'error', error: 'Space ID is required' },
        { status: 400 }
      );
    }

    // Validate spaceId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(spaceId)) {
      return NextResponse.json(
        { status: 'error', error: 'Invalid space ID format - must be a UUID' },
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

    // Verify that the user has access to this space
    const { data: space, error: spaceError } = await supabase
      .from(DB_TABLES.SPACES)
      .select('id')
      .eq(COLUMNS.ID, spaceId)
      .eq(COLUMNS.USER_ID, user.id)
      .eq(COLUMNS.IS_DELETED, false)
      .single();

    if (spaceError || !space) {
      return NextResponse.json(
        { status: 'error', error: 'Space not found or access denied' }, 
        { status: 404 }
      );
    }

    // Get pagination parameters
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');
    
    // Validate pagination parameters
    if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { status: 'error', error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    let query = supabase
      .from(DB_TABLES.CONVERSATIONS)
      .select("*")
      .eq(COLUMNS.SPACE_ID, spaceId)
      .eq(COLUMNS.IS_DELETED, false)
      .order(COLUMNS.UPDATED_AT, { ascending: false });

    query = query.range((page - 1) * limit, page * limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching conversations:", error);
      return NextResponse.json(
        { status: 'error', error: `Error fetching conversations: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'success',
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        hasMore: count ? (page * limit) < count : false
      }
    });
  } catch (error) {
    console.error('Server error in GET /api/spaces/[spaceId]/conversations:', error);
    return NextResponse.json(
      { status: 'error', error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new conversation in a space
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ spaceId: string }> }
) {
  try {
    // Ensure params is awaited and validate URL parameters
    const { spaceId } = (await context.params);
    
    // Validate spaceId format
    if (!spaceId || typeof spaceId !== 'string' || spaceId.length < 1) {
      return NextResponse.json(
        { status: 'error', error: 'Space ID is required' },
        { status: 400 }
      );
    }

    // Validate spaceId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(spaceId)) {
      return NextResponse.json(
        { status: 'error', error: 'Invalid space ID format - must be a UUID' },
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

    // Verify that the user has access to this space
    const { data: space, error: spaceError } = await supabase
      .from(DB_TABLES.SPACES)
      .select('id')
      .eq(COLUMNS.ID, spaceId)
      .eq(COLUMNS.USER_ID, user.id)
      .eq(COLUMNS.IS_DELETED, false)
      .single();

    if (spaceError || !space) {
      return NextResponse.json(
        { status: 'error', error: 'Space not found or access denied' }, 
        { status: 404 }
      );
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
    const timestamp = new Date().toISOString();

    // Create the conversation
    const { data, error } = await supabase
      .from(DB_TABLES.CONVERSATIONS)
      .insert([{
        space_id: spaceId,
        title: title || 'New Conversation',
        user_id: user.id,
        created_at: timestamp,
        updated_at: timestamp,
        is_deleted: false,
        model: requestData.model || 'gpt-4-turbo',
        temperature: requestData.temperature || 0.7,
        system_prompt: requestData.system_prompt || '',
        max_tokens: requestData.max_tokens || 4096
      }])
      .select()
      .single();

    if (error) {
      console.error("Error creating conversation:", error);
      return NextResponse.json(
        { status: 'error', error: `Error creating conversation: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'success',
      data,
      toast: {
        title: 'Conversation Created',
        description: 'Your new conversation is ready',
        variant: 'success'
      }
    });
  } catch (error) {
    console.error('Server error in POST /api/spaces/[spaceId]/conversations:', error);
    return NextResponse.json(
      { status: 'error', error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}