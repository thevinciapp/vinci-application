import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { CACHE_KEYS, CACHE_TTL, DB_TABLES, COLUMNS, ERROR_MESSAGES, DEFAULTS } from '@/lib/constants';
import { Redis } from "@upstash/redis"

const redis = Redis.fromEnv()

export async function GET(request: Request, props: { params: Promise<{ spaceId: string }> }) {
    const params = await props.params;

    try {
      const supabase = await createClient();
      
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
          return NextResponse.json(ERROR_MESSAGES.UNAUTHORIZED, { status: ERROR_MESSAGES.UNAUTHORIZED.status });
      }

      const { spaceId } = params

        const cachedConversations = await redis.get(CACHE_KEYS.conversations(spaceId))
        if (cachedConversations) {
            return NextResponse.json(cachedConversations);
        }

        const { data: conversations, error } = await supabase
            .from(DB_TABLES.CONVERSATIONS)
            .select('*')
            .eq(COLUMNS.SPACE_ID, spaceId)
            .order(COLUMNS.CREATED_AT, { ascending: false });

        if (error) {
            console.error('Error fetching conversations:', error);
            return NextResponse.json(ERROR_MESSAGES.SERVER_ERROR(error.message), { status: 500 });
        }

        await redis.set(CACHE_KEYS.conversations(spaceId), JSON.stringify(conversations), { ex: CACHE_TTL.CONVERSATIONS });

        return NextResponse.json(conversations);
    } catch (error: any) {
        console.error('Error in conversations fetch:', error);
        return NextResponse.json(ERROR_MESSAGES.SERVER_ERROR('Failed to fetch conversations'), { status: 500 });
    }
}

export async function POST(
    request: Request,
    props: { params: Promise<{ spaceId: string }> }
) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
  
      if (!user) {
        return NextResponse.json(ERROR_MESSAGES.UNAUTHORIZED, { status: ERROR_MESSAGES.UNAUTHORIZED.status });
      }

      const params = await props.params;
      const { spaceId } = params;
      
      const body = await request.json();
      const { title = DEFAULTS.CONVERSATION_TITLE } = body;

        if (!spaceId) {
            return NextResponse.json(ERROR_MESSAGES.MISSING_SPACE_ID, { status: ERROR_MESSAGES.MISSING_SPACE_ID.status });
        }

        // Check if the space exists and belongs to the user.
        const { data: space, error: spaceError } = await supabase
            .from(DB_TABLES.SPACES)
            .select(COLUMNS.ID)
            .eq(COLUMNS.ID, spaceId)
            .eq(COLUMNS.USER_ID, user.id)
            .single();

        if (spaceError || !space) {
            console.error('Space not found or access denied:', spaceError);
            return NextResponse.json(ERROR_MESSAGES.SPACE_NOT_FOUND, { status: ERROR_MESSAGES.SPACE_NOT_FOUND.status });
        }

        const { data: conversation, error } = await supabase
            .from(DB_TABLES.CONVERSATIONS)
            .insert({
                [COLUMNS.SPACE_ID]: spaceId,
                [COLUMNS.TITLE]: title,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating conversation:', error);
            return NextResponse.json(ERROR_MESSAGES.SERVER_ERROR(error.message), { status: 500 });
        }

        // Invalidate conversations cache for this space
        await redis.del(CACHE_KEYS.conversations(spaceId));

        return NextResponse.json(conversation);
    } catch (error: any) {
        console.error('Error in conversation creation:', error);
        return NextResponse.json(ERROR_MESSAGES.SERVER_ERROR('Failed to create conversation'), { status: 500 });
    }
}