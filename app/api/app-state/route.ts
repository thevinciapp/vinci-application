import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { COLUMNS, DB_TABLES } from "@/app/lib/db";
import { getCachedSpaces, cacheSpaces } from "@/app/lib/caching";

/**
 * GET - Get current app state including spaces, active space, and conversations
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: 'error', error: 'User not authenticated' }, { status: 401 });
    }

    // Try to get spaces from cache first
    let spaces = await getCachedSpaces(user.id);
    
    if (!spaces) {
      // If not in cache, get from DB
      const { data: spacesData, error: spacesError } = await supabase
        .from(DB_TABLES.SPACES)
        .select("*")
        .eq(COLUMNS.USER_ID, user.id)
        .eq(COLUMNS.IS_DELETED, false)
        .eq(COLUMNS.IS_ARCHIVED, false)
        .order(COLUMNS.UPDATED_AT, { ascending: false });

      if (spacesError) {
        console.error("Error fetching spaces:", spacesError);
        return NextResponse.json(
          { status: 'error', error: `Error fetching spaces: ${spacesError.message}` }, 
          { status: 500 }
        );
      }

      spaces = spacesData || [];
      
      // Cache the spaces
      if (spaces.length > 0) {
        await cacheSpaces(user.id, spaces);
      }
    }

    // Get active space
    const { data: activeSpaceData, error: activeSpaceError } = await supabase
      .from(DB_TABLES.ACTIVE_SPACES)
      .select("space_id")
      .eq(COLUMNS.USER_ID, user.id)
      .single();

    if (activeSpaceError && activeSpaceError.code !== 'PGRST116') { // Ignore "no rows returned" error
      console.error("Error fetching active space:", activeSpaceError);
      return NextResponse.json(
        { status: 'error', error: `Error fetching active space: ${activeSpaceError.message}` }, 
        { status: 500 }
      );
    }

    const activeSpace = activeSpaceData ? spaces.find(space => space.id === activeSpaceData.space_id) : null;

    // Get conversations for active space
    let conversations = [];
    if (activeSpace) {
      const { data: conversationsData, error: conversationsError } = await supabase
        .from(DB_TABLES.CONVERSATIONS)
        .select("*")
        .eq(COLUMNS.SPACE_ID, activeSpace.id)
        .eq(COLUMNS.IS_DELETED, false)
        .order(COLUMNS.UPDATED_AT, { ascending: false })
        .limit(10);

      if (conversationsError) {
        console.error("Error fetching conversations:", conversationsError);
        return NextResponse.json(
          { status: 'error', error: `Error fetching conversations: ${conversationsError.message}` }, 
          { status: 500 }
        );
      }

      conversations = conversationsData || [];
    }

    return NextResponse.json({
      status: 'success',
      data: {
        spaces,
        activeSpace,
        conversations,
        lastFetched: Date.now()
      }
    });
  } catch (error) {
    console.error('Server error in GET /api/app-state:', error);
    return NextResponse.json(
      { status: 'error', error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST - Update app state
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: 'error', error: 'User not authenticated' }, { status: 401 });
    }

    const { activeSpace } = await request.json();
    
    if (!activeSpace?.id) {
      return NextResponse.json(
        { status: 'error', error: 'Active space ID is required' },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString();

    // Update active space
    const { error: activeSpaceError } = await supabase
      .from(DB_TABLES.ACTIVE_SPACES)
      .upsert({
        user_id: user.id,
        space_id: activeSpace.id,
        updated_at: timestamp
      }, { onConflict: 'user_id' });

    if (activeSpaceError) {
      console.error("Error updating active space:", activeSpaceError);
      return NextResponse.json(
        { status: 'error', error: `Error updating active space: ${activeSpaceError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'success',
      data: { activeSpace }
    });
  } catch (error) {
    console.error('Server error in POST /api/app-state:', error);
    return NextResponse.json(
      { status: 'error', error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
