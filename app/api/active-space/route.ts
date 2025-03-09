import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { COLUMNS, DB_TABLES } from "@/constants";
import { redis, CACHE_KEYS, CACHE_TTL } from "@/app/lib/cache";
import type { Space } from "@/types";

/**
 * GET - Get the active space for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: 'error', error: 'User not authenticated' }, { status: 401 });
    }

    // Try to get from cache first
    const cacheKey = CACHE_KEYS.ACTIVE_SPACE(user.id);
    const cachedActiveSpace = await redis.get<Space>(cacheKey);
    if (cachedActiveSpace) {
      return NextResponse.json({ status: 'success', data: { activeSpace: cachedActiveSpace } });
    }

    // If not in cache, get the active space ID from DB
    const { data: activeSpaceEntry, error: activeSpaceError } = await supabase
      .from(DB_TABLES.ACTIVE_SPACES)
      .select('space_id')
      .eq(COLUMNS.USER_ID, user.id)
      .single();

    if (activeSpaceError) {
      if (activeSpaceError.code === 'PGRST116') { // No rows returned
        // No active space set yet
        return NextResponse.json({ status: 'success', data: { activeSpace: null } });
      }
      console.error("Error fetching active space:", activeSpaceError);
      return NextResponse.json(
        { status: 'error', error: `Error fetching active space: ${activeSpaceError.message}` },
        { status: 500 }
      );
    }

    if (!activeSpaceEntry || !activeSpaceEntry.space_id) {
      return NextResponse.json({ status: 'success', data: { activeSpace: null } });
    }

    // Now get the space data for the active space
    const { data: activeSpace, error: spaceError } = await supabase
      .from(DB_TABLES.SPACES)
      .select("*")
      .eq(COLUMNS.ID, activeSpaceEntry.space_id)
      .eq(COLUMNS.USER_ID, user.id)
      .eq(COLUMNS.IS_DELETED, false)
      .single();

    if (spaceError) {
      console.error("Error fetching space:", spaceError);
      return NextResponse.json(
        { status: 'error', error: `Error fetching space: ${spaceError.message}` },
        { status: 500 }
      );
    }

    // Cache the result
    if (activeSpace) {
      await redis.set(cacheKey, activeSpace, { ex: CACHE_TTL.ACTIVE_SPACE });
    }

    return NextResponse.json({ status: 'success', data: { activeSpace } });
  } catch (error) {
    console.error('Server error in GET /api/active-space:', error);
    return NextResponse.json(
      { status: 'error', error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST - Set a space as the active space
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: 'error', error: 'User not authenticated' }, { status: 401 });
    }

    const { spaceId } = await request.json();
    if (!spaceId) {
      return NextResponse.json(
        { status: 'error', error: 'Space ID is required' },
        { status: 400 }
      );
    }

    // Verify that the space exists and belongs to the user
    const { data: space, error: spaceError } = await supabase
      .from(DB_TABLES.SPACES)
      .select("*")
      .eq(COLUMNS.ID, spaceId)
      .eq(COLUMNS.USER_ID, user.id)
      .eq(COLUMNS.IS_DELETED, false)
      .single();

    if (spaceError) {
      console.error("Error fetching space:", spaceError);
      return NextResponse.json(
        { status: 'error', error: 'Space not found or access denied' },
        { status: 404 }
      );
    }

    // Update the active space
    const timestamp = new Date().toISOString();
    const { error: upsertError } = await supabase
      .from(DB_TABLES.ACTIVE_SPACES)
      .upsert({
        user_id: user.id,
        space_id: spaceId,
        updated_at: timestamp
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error("Error setting active space:", upsertError);
      return NextResponse.json(
        { status: 'error', error: `Error setting active space: ${upsertError.message}` },
        { status: 500 }
      );
    }

    // Update cache
    const cacheKey = CACHE_KEYS.ACTIVE_SPACE(user.id);
    await redis.set(cacheKey, space, { ex: CACHE_TTL.ACTIVE_SPACE });

    // Also update the space's updated_at timestamp
    const { error: updateError } = await supabase
      .from(DB_TABLES.SPACES)
      .update({ updated_at: timestamp })
      .eq(COLUMNS.ID, spaceId)
      .eq(COLUMNS.USER_ID, user.id);

    if (updateError) {
      console.error("Error updating space timestamp:", updateError);
      // Not failing the operation because of this secondary update
    }

    return NextResponse.json({
      status: 'success',
      data: { activeSpace: space },
      toast: {
        title: 'Space Activated',
        description: `You're now working in "${space.name}"`,
        variant: 'success'
      }
    });
  } catch (error) {
    console.error('Server error in POST /api/active-space:', error);
    return NextResponse.json(
      { status: 'error', error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}