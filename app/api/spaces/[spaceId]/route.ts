import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { COLUMNS, DB_TABLES } from "@/constants";
import { redis, CACHE_KEYS, CACHE_TTL } from "@/app/lib/cache";
import { invalidateSpaceCache } from "@/app/actions/utils/caching";
import type { Space } from "@/types";

/**
 * GET - Get a specific space by ID
 */
export async function GET(request: NextRequest, props: { params: Promise<{ spaceId: string }> }) {
  const params = await props.params;
  try {
    const { spaceId } = params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: 'error', error: 'User not authenticated' }, { status: 401 });
    }

    // Try to get from cache first
    const cacheKey = CACHE_KEYS.SPACE(spaceId);
    const cachedSpace = await redis.get<Space>(cacheKey);
    if (cachedSpace) {
      return NextResponse.json({ status: 'success', data: cachedSpace });
    }

    // If not in cache, get from DB
    const { data, error } = await supabase
      .from(DB_TABLES.SPACES)
      .select("*")
      .eq(COLUMNS.ID, spaceId)
      .eq(COLUMNS.USER_ID, user.id)
      .eq(COLUMNS.IS_DELETED, false)
      .single();

    if (error) {
      console.error("Error fetching space:", error);
      if (error.code === 'PGRST116') { // No rows returned
        return NextResponse.json(
          { status: 'error', error: 'Space not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { status: 'error', error: `Error fetching space: ${error.message}` },
        { status: 500 }
      );
    }

    // Cache the result
    if (data) {
      await redis.set(cacheKey, data, { ex: CACHE_TTL.SPACE });
    }

    return NextResponse.json({ status: 'success', data });
  } catch (error) {
    console.error('Server error in GET /api/spaces/[spaceId]:', error);
    return NextResponse.json(
      { status: 'error', error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update a space by ID
 */
export async function PATCH(request: NextRequest, props: { params: Promise<{ spaceId: string }> }) {
  const params = await props.params;
  try {
    const { spaceId } = params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: 'error', error: 'User not authenticated' }, { status: 401 });
    }

    const updates = await request.json();
    const timestamp = new Date().toISOString();

    // Remove any fields that shouldn't be updated directly
    const safeUpdates = { ...updates };
    delete safeUpdates.id;
    delete safeUpdates.user_id;
    delete safeUpdates.created_at;
    delete safeUpdates.is_deleted;

    // Make sure updated_at is set
    safeUpdates.updated_at = timestamp;

    // Update the space
    const { data, error } = await supabase
      .from(DB_TABLES.SPACES)
      .update(safeUpdates)
      .eq(COLUMNS.ID, spaceId)
      .eq(COLUMNS.USER_ID, user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating space:", error);
      return NextResponse.json(
        { status: 'error', error: `Error updating space: ${error.message}` },
        { status: 500 }
      );
    }

    // Invalidate cache
    await invalidateSpaceCache(user.id, spaceId);

    return NextResponse.json({
      status: 'success',
      data,
      toast: {
        title: 'Space Updated',
        description: 'Your space has been updated successfully',
        variant: 'success'
      }
    });
  } catch (error) {
    console.error('Server error in PATCH /api/spaces/[spaceId]:', error);
    return NextResponse.json(
      { status: 'error', error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a space by ID (soft delete)
 */
export async function DELETE(request: NextRequest, props: { params: Promise<{ spaceId: string }> }) {
  const params = await props.params;
  try {
    const { spaceId } = params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: 'error', error: 'User not authenticated' }, { status: 401 });
    }

    const timestamp = new Date().toISOString();

    // Soft delete the space
    const { data, error } = await supabase
      .from(DB_TABLES.SPACES)
      .update({
        is_deleted: true,
        updated_at: timestamp
      })
      .eq(COLUMNS.ID, spaceId)
      .eq(COLUMNS.USER_ID, user.id)
      .select()
      .single();

    if (error) {
      console.error("Error deleting space:", error);
      return NextResponse.json(
        { status: 'error', error: `Error deleting space: ${error.message}` },
        { status: 500 }
      );
    }

    // Check if this was the active space and set another space as active if it was
    const { data: activeSpace, error: activeSpaceError } = await supabase
      .from(DB_TABLES.ACTIVE_SPACES)
      .select('space_id')
      .eq(COLUMNS.USER_ID, user.id)
      .single();

    if (!activeSpaceError && activeSpace?.space_id === spaceId) {
      // Find another space to set as active
      const { data: otherSpaces, error: otherSpacesError } = await supabase
        .from(DB_TABLES.SPACES)
        .select('id')
        .eq(COLUMNS.USER_ID, user.id)
        .eq(COLUMNS.IS_DELETED, false)
        .order(COLUMNS.UPDATED_AT, { ascending: false })
        .limit(1);

      if (!otherSpacesError && otherSpaces?.length > 0) {
        // Set the next most recently updated space as active
        const { error: updateActiveError } = await supabase
          .from(DB_TABLES.ACTIVE_SPACES)
          .upsert({
            user_id: user.id,
            space_id: otherSpaces[0].id,
            updated_at: timestamp
          }, { onConflict: 'user_id' });

        if (updateActiveError) {
          console.error("Error updating active space:", updateActiveError);
        }
      } else {
        // Delete the active space record if there are no other spaces
        const { error: deleteActiveError } = await supabase
          .from(DB_TABLES.ACTIVE_SPACES)
          .delete()
          .eq(COLUMNS.USER_ID, user.id);

        if (deleteActiveError) {
          console.error("Error deleting active space record:", deleteActiveError);
        }
      }
    }

    // Invalidate caches
    await invalidateSpaceCache(user.id, spaceId);

    return NextResponse.json({
      status: 'success',
      toast: {
        title: 'Space Deleted',
        description: 'Your space has been deleted successfully',
        variant: 'success'
      }
    });
  } catch (error) {
    console.error('Server error in DELETE /api/spaces/[spaceId]:', error);
    return NextResponse.json(
      { status: 'error', error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}