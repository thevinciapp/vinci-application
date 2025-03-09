import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { COLUMNS, DB_TABLES, DEFAULTS } from "@/constants";
import { redis, CACHE_KEYS, CACHE_TTL } from "@/app/lib/cache";
import { invalidateConversationCache } from "@/app/actions/utils/caching";
import type { Conversation } from "@/types";

/**
 * GET - Get all conversations for a space
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { spaceId: string } }
) {
  try {
    const { spaceId } = params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

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

    // Try to get from cache first
    const cacheKey = CACHE_KEYS.CONVERSATIONS(spaceId);
    const cachedConversations = await redis.get<Conversation[]>(cacheKey);
    if (cachedConversations) {
      return NextResponse.json({ status: 'success', data: cachedConversations });
    }

    // If not in cache, get from DB
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

    // Cache the result
    if (data) {
      await redis.set(cacheKey, data, { ex: CACHE_TTL.CONVERSATIONS });
    }

    return NextResponse.json({ status: 'success', data: data || [] });
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
  { params }: { params: { spaceId: string } }
) {
  try {
    const { spaceId } = params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

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

    const { title } = await request.json();
    const timestamp = new Date().toISOString();

    // Create the conversation
    const { data, error } = await supabase
      .from(DB_TABLES.CONVERSATIONS)
      .insert([{
        space_id: spaceId,
        title: title || DEFAULTS.CONVERSATION_TITLE,
        user_id: user.id,
        created_at: timestamp,
        updated_at: timestamp,
        is_deleted: false
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

    // Invalidate cache
    await invalidateConversationCache(spaceId);

    return NextResponse.json({
      status: 'success',
      data,
      toast: {
        title: 'Conversation Created',
        description: 'Start chatting now!',
        variant: 'success'
      },
      redirectTo: `/protected/spaces/${spaceId}/conversations/${data.id}`
    });
  } catch (error) {
    console.error('Server error in POST /api/spaces/[spaceId]/conversations:', error);
    return NextResponse.json(
      { status: 'error', error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}