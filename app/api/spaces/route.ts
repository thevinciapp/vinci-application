import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { COLUMNS, DB_TABLES } from "@/app/lib/db";
import { redis, CACHE_KEYS, CACHE_TTL } from "@/app/lib/cache";
import type { Space } from "@/types";

/**
 * GET - Get all spaces for current user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: 'error', error: 'User not authenticated' }, { status: 401 });
    }

    // Try to get from cache first
    const cacheKey = CACHE_KEYS.SPACES(user.id);
    const cachedSpaces = await redis.get<Space[]>(cacheKey);
    if (cachedSpaces) {
      return NextResponse.json({ status: 'success', data: cachedSpaces });
    }

    // If not in cache, get from DB
    const { data, error } = await supabase
      .from(DB_TABLES.SPACES)
      .select("*")
      .eq(COLUMNS.USER_ID, user.id)
      .eq(COLUMNS.IS_DELETED, false)
      .eq(COLUMNS.IS_ARCHIVED, false)
      .order(COLUMNS.UPDATED_AT, { ascending: false });

    if (error) {
      console.error("Error fetching spaces:", error);
      return NextResponse.json(
        { status: 'error', error: `Error fetching spaces: ${error.message}` }, 
        { status: 500 }
      );
    }

    // Cache the result
    if (data) {
      await redis.set(cacheKey, data, { ex: CACHE_TTL.SPACES });
    }

    return NextResponse.json({ 
      status: 'success', 
      data: data || [],
      lastFetched: Date.now()
    });
  } catch (error) {
    console.error('Server error in GET /api/spaces:', error);
    return NextResponse.json(
      { status: 'error', error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new space
 */
/**
 * PATCH - Update a space (archive or delete)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: 'error', error: 'User not authenticated' }, { status: 401 });
    }

    const { id, is_deleted, is_archived } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { status: 'error', error: 'Space ID is required' },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString();

    // Update the space
    const { data: updatedSpace, error: updateError } = await supabase
      .from(DB_TABLES.SPACES)
      .update({
        is_deleted: is_deleted || false,
        is_archived: is_archived || false,
        updated_at: timestamp
      })
      .eq('id', id)
      .eq(COLUMNS.USER_ID, user.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating space:", updateError);
      return NextResponse.json(
        { status: 'error', error: `Error updating space: ${updateError.message}` },
        { status: 500 }
      );
    }

    // If this was the active space and it's being deleted/archived, set a new active space
    if ((is_deleted || is_archived)) {
      const { data: activeSpace } = await supabase
        .from(DB_TABLES.ACTIVE_SPACES)
        .select('space_id')
        .eq(COLUMNS.USER_ID, user.id)
        .single();

      if (activeSpace && activeSpace.space_id === id) {
        // Find the next available space
        const { data: availableSpaces } = await supabase
          .from(DB_TABLES.SPACES)
          .select('id')
          .eq(COLUMNS.USER_ID, user.id)
          .eq(COLUMNS.IS_DELETED, false)
          .eq(COLUMNS.IS_ARCHIVED, false)
          .neq('id', id)
          .order(COLUMNS.UPDATED_AT, { ascending: false });

        if (availableSpaces && availableSpaces.length > 0) {
          // Set the first available space as active
          await supabase
            .from(DB_TABLES.ACTIVE_SPACES)
            .upsert({
              user_id: user.id,
              space_id: availableSpaces[0].id,
              updated_at: timestamp
            }, { onConflict: 'user_id' });
        } else {
          // No other spaces available, delete the active space entry
          await supabase
            .from(DB_TABLES.ACTIVE_SPACES)
            .delete()
            .eq(COLUMNS.USER_ID, user.id);
        }
      }
    }

    // Invalidate cache
    const cacheKey = CACHE_KEYS.SPACES(user.id);
    await redis.del(cacheKey);

    const action = is_deleted ? 'deleted' : (is_archived ? 'archived' : 'updated');

    return NextResponse.json({
      status: 'success',
      data: updatedSpace,
      toast: {
        title: `Space ${action}`,
        description: `Your space has been ${action}!`,
        variant: 'success'
      }
    });
  } catch (error) {
    console.error('Server error in PATCH /api/spaces:', error);
    return NextResponse.json(
      { status: 'error', error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new space
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: 'error', error: 'User not authenticated' }, { status: 401 });
    }

    const { name, description, model, provider, setActive, color, chat_mode, chat_mode_config } = await request.json();
    
    if (!name || !model || !provider) {
      return NextResponse.json(
        { status: 'error', error: 'Name, model, and provider are required' },
        { status: 400 }
      );
    }
    
    const timestamp = new Date().toISOString();
    
    // Create the space
    const { data: spaceData, error: spaceError } = await supabase
      .from(DB_TABLES.SPACES)
      .insert([{
        name,
        description,
        user_id: user.id,
        model,
        provider,
        color: color || '#3ecfff',
        chat_mode,
        chat_mode_config,
        created_at: timestamp,
        updated_at: timestamp,
        is_deleted: false,
        is_archived: false
      }])
      .select()
      .single();

    if (spaceError) {
      console.error("Error creating space:", spaceError);
      return NextResponse.json(
        { status: 'error', error: `Error creating space: ${spaceError.message}` },
        { status: 500 }
      );
    }

    // Set as active space if requested
    if (setActive && spaceData) {
      const { error: activeError } = await supabase
        .from(DB_TABLES.ACTIVE_SPACES)
        .upsert({
          user_id: user.id,
          space_id: spaceData.id,
          updated_at: timestamp
        }, { onConflict: 'user_id' });

      if (activeError) {
        console.error("Error setting active space:", activeError);
      }
    }

    // Invalidate cache
    const cacheKey = CACHE_KEYS.SPACES(user.id);
    await redis.del(cacheKey);

    // If this is the first space, set it as active
    if (!setActive) {
      const { data: existingSpaces } = await supabase
        .from(DB_TABLES.SPACES)
        .select('id')
        .eq(COLUMNS.USER_ID, user.id)
        .eq(COLUMNS.IS_DELETED, false)
        .eq(COLUMNS.IS_ARCHIVED, false);

      if (!existingSpaces || existingSpaces.length === 1) {
        const { error: activeError } = await supabase
          .from(DB_TABLES.ACTIVE_SPACES)
          .upsert({
            user_id: user.id,
            space_id: spaceData.id,
            updated_at: timestamp
          }, { onConflict: 'user_id' });

        if (activeError) {
          console.error("Error setting first space as active:", activeError);
        }
      }
    }

    return NextResponse.json({
      status: 'success',
      data: spaceData,
      toast: {
        title: 'Space Created',
        description: 'Your new space has been created!',
        variant: 'success'
      }
    });
  } catch (error) {
    console.error('Server error in POST /api/spaces:', error);
    return NextResponse.json(
      { status: 'error', error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}