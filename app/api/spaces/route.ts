import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { COLUMNS, DB_TABLES } from "@/app/lib/db";
import { getCachedSpaces, cacheSpaces, invalidateSpaceCache } from "@/app/lib/caching";
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
    const cachedSpaces = await getCachedSpaces(user.id);
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
      await cacheSpaces(user.id, data);
    }

    return NextResponse.json({ status: 'success', data: data || [] });
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
    await invalidateSpaceCache(user.id);

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