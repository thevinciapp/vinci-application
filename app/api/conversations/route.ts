import { NextResponse } from 'next/server';
import { createClient } from "@/utils/supabase/server";
import { CACHE_TTL, CACHE_KEYS, DB_TABLES, COLUMNS, ERROR_MESSAGES, DEFAULTS } from '@/lib/constants';
import { Redis } from "@upstash/redis"

const redis = Redis.fromEnv()

/**
 * GET /api/conversation
 * Retrieves conversations for a space.
 * Expects query parameter: spaceId
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(ERROR_MESSAGES.UNAUTHORIZED, { status: ERROR_MESSAGES.UNAUTHORIZED.status });
    }

    const { searchParams } = new URL(request.url);
    const spaceId = searchParams.get('spaceId');

    if (!spaceId) {
      return NextResponse.json(ERROR_MESSAGES.MISSING_SPACE_ID);
    }

    const cachedConversations = await redis.get(CACHE_KEYS.conversations(spaceId))
    if (cachedConversations) {
      return NextResponse.json(cachedConversations);
    }

    // If not in cache, fetch from database
    const { data: conversations, error } = await supabase
      .from(DB_TABLES.CONVERSATIONS)
      .select('*')
      .eq(COLUMNS.SPACE_ID, spaceId)
      .eq(COLUMNS.IS_DELETED, false)
      .order(COLUMNS.CREATED_AT, { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return NextResponse.json(ERROR_MESSAGES.SERVER_ERROR(error.message));
    }

    await redis.set(
      CACHE_KEYS.conversations(spaceId),
      JSON.stringify(conversations),
      { ex: CACHE_TTL.CONVERSATIONS }
    );

    return NextResponse.json(conversations);
  } catch (err: any) {
    console.error('Error in conversation fetch:', err);
    return NextResponse.json(ERROR_MESSAGES.SERVER_ERROR(err.message));
  }
}

/**
 * POST /api/conversation
 * Creates a new conversation within a space.
 * Expects JSON body: { space_id: string, title?: string }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(ERROR_MESSAGES.UNAUTHORIZED);
    }

    const body = await request.json();
    const { spaceId, name } = body;

    if (!spaceId) {
      return NextResponse.json(ERROR_MESSAGES.MISSING_SPACE_ID);
    }

    const { data: conversation, error } = await supabase
      .from(DB_TABLES.CONVERSATIONS)
      .insert([
        {
          [COLUMNS.SPACE_ID]: spaceId,
          [COLUMNS.TITLE]: name || DEFAULTS.CONVERSATION_TITLE,
          [COLUMNS.USER_ID]: user.id
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return NextResponse.json(ERROR_MESSAGES.SERVER_ERROR(error.message));
    }

    // Invalidate conversations cache for this space
    await redis.del(CACHE_KEYS.conversations(spaceId));

    return NextResponse.json(conversation);
  } catch (err: any) {
    console.error('Error in conversation creation:', err);
    return NextResponse.json(ERROR_MESSAGES.SERVER_ERROR(err.message));
  }
}
