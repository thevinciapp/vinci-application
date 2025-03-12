import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { COLUMNS, DB_TABLES } from "@/constants";
import type { Space, Conversation } from "@/types";

/**
 * GET - Get comprehensive data for a space
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

    // Get space data
    const { data: space, error: spaceError } = await supabase
      .from(DB_TABLES.SPACES)
      .select("*")
      .eq(COLUMNS.ID, spaceId)
      .eq(COLUMNS.USER_ID, user.id)
      .eq(COLUMNS.IS_DELETED, false)
      .single();

    if (spaceError) {
      if (spaceError.code === 'PGRST116') { // No rows returned
        return NextResponse.json(
          { status: 'error', error: 'Space not found' },
          { status: 404 }
        );
      }
      console.error("Error fetching space:", spaceError);
      return NextResponse.json(
        { status: 'error', error: `Error fetching space: ${spaceError.message}` },
        { status: 500 }
      );
    }

    // Get conversations for the space
    const { data: conversations, error: conversationsError } = await supabase
      .from(DB_TABLES.CONVERSATIONS)
      .select("*")
      .eq(COLUMNS.SPACE_ID, spaceId)
      .eq(COLUMNS.IS_DELETED, false)
      .order(COLUMNS.UPDATED_AT, { ascending: false });

    if (conversationsError) {
      console.error("Error fetching conversations:", conversationsError);
      return NextResponse.json(
        { status: 'error', error: `Error fetching conversations: ${conversationsError.message}` },
        { status: 500 }
      );
    }

    // Get the active conversation (if any)
    const { data: activeConversation, error: activeConvError } = await supabase
      .from(DB_TABLES.ACTIVE_CONVERSATIONS)
      .select(`
        conversation_id,
        ${DB_TABLES.CONVERSATIONS}(*)
      `)
      .eq(COLUMNS.USER_ID, user.id)
      .eq(COLUMNS.SPACE_ID, spaceId)
      .single();

    // Prepare result - this structure matches the SpaceData interface
    const spaceData = {
      space,
      conversations: conversations || [],
      messages: [], // Messages will be loaded separately when needed
      activeConversation: activeConversation?.conversations || null
    };

    return NextResponse.json({ status: 'success', data: spaceData });
  } catch (error) {
    console.error('Server error in GET /api/spaces/[spaceId]/data:', error);
    return NextResponse.json(
      { status: 'error', error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}