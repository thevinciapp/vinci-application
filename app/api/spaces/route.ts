import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AVAILABLE_MODELS, CACHE_KEYS, CACHE_TTL, Provider, getModelById, DB_TABLES, COLUMNS, ERROR_MESSAGES, DEFAULTS } from '@/lib/constants';
import { Space } from '@/types';
import { Redis } from "@upstash/redis"

const redis = Redis.fromEnv()

/**
 * POST /api/spaces
 * Creates a new space.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json(); 
    const { name, description, model, provider, setActive } = body;

    if (!name || !provider || !model) {
      return NextResponse.json(ERROR_MESSAGES.MISSING_FIELDS, { status: ERROR_MESSAGES.MISSING_FIELDS.status });
    }

    if (!Object.keys(AVAILABLE_MODELS).includes(provider)) {
      return NextResponse.json(ERROR_MESSAGES.INVALID_PROVIDER, { status: ERROR_MESSAGES.INVALID_PROVIDER.status });
    }

    const selectedModel = getModelById(provider as Provider, model);
    if (!selectedModel) {
      return NextResponse.json(ERROR_MESSAGES.INVALID_MODEL, { status: ERROR_MESSAGES.INVALID_MODEL.status });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(ERROR_MESSAGES.UNAUTHORIZED, { status: ERROR_MESSAGES.UNAUTHORIZED.status });
    }

    // Prepare space data
    const spaceData: Partial<Space> = {
      [COLUMNS.NAME]: name,
      [COLUMNS.DESCRIPTION]: description,
      [COLUMNS.USER_ID]: user.id,
      [COLUMNS.MODEL]: selectedModel.id,
      [COLUMNS.PROVIDER]: selectedModel.provider,
      [COLUMNS.IS_DELETED]: false
    };

    // Create the space
    const { data: newSpace, error: spaceError } = await supabase
      .from(DB_TABLES.SPACES)
      .insert(spaceData)
      .select()
      .single();

    if (spaceError) {
      console.error('Error creating space:', spaceError);
      return NextResponse.json(ERROR_MESSAGES.SERVER_ERROR(spaceError.message), { status: 500 });
    }

    // Set as active space if requested
    if (setActive && newSpace) {
      const { error: activeError } = await supabase
        .from(DB_TABLES.ACTIVE_SPACES)
        .upsert({
          [COLUMNS.USER_ID]: user.id,
          [COLUMNS.SPACE_ID]: newSpace.id,
          [COLUMNS.UPDATED_AT]: new Date().toISOString()
        }, { onConflict: COLUMNS.USER_ID });

      if (activeError) {
        console.error('Error setting active space:', activeError);
        return NextResponse.json(ERROR_MESSAGES.SERVER_ERROR(activeError.message), { status: 500 });
      }
      // Cache the active space
      await redis.set(CACHE_KEYS.activeSpace(user.id), JSON.stringify({ ...newSpace, [COLUMNS.IS_ACTIVE]: true }), { ex: CACHE_TTL.ACTIVE_SPACE });
    }

    // Invalidate spaces cache
    await redis.del(CACHE_KEYS.spaces(user.id));

    // Create a default conversation
    const { data: defaultConversation, error: conversationError } = await supabase
      .from(DB_TABLES.CONVERSATIONS)
      .insert({ 
        [COLUMNS.SPACE_ID]: newSpace.id, 
        [COLUMNS.TITLE]: DEFAULTS.CONVERSATION_TITLE 
      })
      .select()
      .single();

    if (conversationError) {
      console.error("Failed to create a default conversation.", conversationError);
      return NextResponse.json(ERROR_MESSAGES.SERVER_ERROR(conversationError.message), { status: 500 });
    }

    // Cache the default conversation
    await redis.set(CACHE_KEYS.conversations(newSpace.id), JSON.stringify([defaultConversation]), { ex: CACHE_TTL.CONVERSATIONS });

    return NextResponse.json({ ...newSpace, [COLUMNS.IS_ACTIVE]: !!setActive, default_conversation: defaultConversation });

  } catch (err: any) {
    console.error('Error in space creation:', err);
    return NextResponse.json(ERROR_MESSAGES.SERVER_ERROR('Failed to create space'), { status: 500 });
  }
}

/**
 * GET /api/spaces
 * Fetches spaces for the current user.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(ERROR_MESSAGES.UNAUTHORIZED, { status: ERROR_MESSAGES.UNAUTHORIZED.status });
    }

    // Try to get spaces from cache
    const cachedSpaces = await redis.get(CACHE_KEYS.spaces(user.id));
    if (cachedSpaces) {
      return NextResponse.json(cachedSpaces);
    }

    const { data: spaces, error } = await supabase
      .from(DB_TABLES.SPACES)
      .select('*')
      .eq(COLUMNS.USER_ID, user.id)
      .eq(COLUMNS.IS_DELETED, false)
      .order(COLUMNS.UPDATED_AT, { ascending: false });

    if (error) {
      console.error('Error fetching spaces:', error);
      return NextResponse.json(ERROR_MESSAGES.SERVER_ERROR(error.message), { status: 500 });
    }

    // Check for an active space
    const { data: activeSpaceData, error: activeSpaceError } = await supabase
      .from(DB_TABLES.ACTIVE_SPACES)
      .select(COLUMNS.SPACE_ID)
      .eq(COLUMNS.USER_ID, user.id)
      .single();

    if (activeSpaceError) {
      console.error('Error fetching active space:', activeSpaceError);
      return NextResponse.json(ERROR_MESSAGES.SERVER_ERROR(activeSpaceError.message), { status: 500 });
    }

    const spacesWithActive = spaces.map(space => ({
      ...space,
      [COLUMNS.IS_ACTIVE]: space.id === activeSpaceData?.space_id
    }));

    // Cache the spaces
    await redis.set(CACHE_KEYS.spaces(user.id), JSON.stringify(spacesWithActive), { ex: CACHE_TTL.SPACES });
    
    // Also cache the active space if it exists
    if(activeSpaceData) {
      const activeSpace = spacesWithActive.find(space => space.id === activeSpaceData.space_id);
      if(activeSpace) {
        await redis.set(CACHE_KEYS.activeSpace(user.id), JSON.stringify(activeSpace), { ex: CACHE_TTL.ACTIVE_SPACE });
      }
    }
    
    return NextResponse.json(spacesWithActive);

  } catch (err: any) {
    console.error('Error in space fetch:', err);
    return NextResponse.json(ERROR_MESSAGES.SERVER_ERROR('Failed to fetch spaces'), { status: 500 });
  }
}