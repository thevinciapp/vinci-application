import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { COLUMNS, DB_TABLES } from "@/app/lib/db";

// Define an interface for the search results from the RPC functions
interface SearchResult {
  id: string;
  conversation_id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  created_at: string;
  ts_rank: number;
}

/**
 * POST - Search for messages across different scopes
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: 'error', error: 'User not authenticated' }, { status: 401 });
    }

    const { searchTerm, searchScope, searchMode, conversationId, spaceId, limit = 50 } = await request.json();

    if (!searchTerm || searchTerm.length < 2) {
      return NextResponse.json({ status: 'success', data: { results: [] } });
    }

    // Trim and sanitize search term
    const sanitizedSearchTerm = searchTerm.trim();

    if (searchScope === 'conversation' && !conversationId) {
      return NextResponse.json(
        { status: 'error', error: "Conversation ID is required for conversation scope" },
        { status: 400 }
      );
    }

    if (searchScope === 'space' && !spaceId) {
      return NextResponse.json(
        { status: 'error', error: "Space ID is required for space scope" },
        { status: 400 }
      );
    }

    let searchResults: SearchResult[] = [];

    // Use the appropriate full-text search function based on search scope
    if (searchScope === 'conversation' && conversationId) {
      // First verify user has access to this conversation
      const { data: conversation, error: convAccessError } = await supabase
        .from(DB_TABLES.CONVERSATIONS)
        .select(`
          ${COLUMNS.ID}, 
          ${DB_TABLES.SPACES}!inner(
            ${COLUMNS.ID},
            ${COLUMNS.USER_ID}
          )
        `)
        .eq(`${DB_TABLES.CONVERSATIONS}.${COLUMNS.ID}`, conversationId)
        .eq(`${DB_TABLES.SPACES}.${COLUMNS.USER_ID}`, user.id)
        .single();

      if (convAccessError || !conversation) {
        return NextResponse.json(
          { status: 'error', error: 'Conversation not found or access denied' },
          { status: 404 }
        );
      }

      // Search within a specific conversation
      const { data, error } = await supabase
        .rpc('search_conversation_messages', { 
          conversation_uuid: conversationId,
          search_query: sanitizedSearchTerm,
          result_limit: limit
        });
      
      if (error) {
        console.error('Error searching conversation messages:', error);
        return NextResponse.json(
          { status: 'error', error: `Error searching messages: ${error.message}` },
          { status: 500 }
        );
      }
      
      searchResults = data as SearchResult[] || [];
    } 
    else if (searchScope === 'space' && spaceId) {
      // First verify user has access to this space
      const { data: space, error: spaceAccessError } = await supabase
        .from(DB_TABLES.SPACES)
        .select('id')
        .eq(COLUMNS.ID, spaceId)
        .eq(COLUMNS.USER_ID, user.id)
        .single();

      if (spaceAccessError || !space) {
        return NextResponse.json(
          { status: 'error', error: 'Space not found or access denied' },
          { status: 404 }
        );
      }

      // Search within a specific space
      const { data, error } = await supabase
        .rpc('search_space_messages', { 
          space_uuid: spaceId,
          search_query: sanitizedSearchTerm,
          result_limit: limit
        });
      
      if (error) {
        console.error('Error searching space messages:', error);
        return NextResponse.json(
          { status: 'error', error: `Error searching messages: ${error.message}` },
          { status: 500 }
        );
      }
      
      searchResults = data as SearchResult[] || [];
    } 
    else {
      // Search across all user spaces
      const { data, error } = await supabase
        .rpc('search_all_user_messages', { 
          search_query: sanitizedSearchTerm,
          result_limit: limit
        });
      
      if (error) {
        console.error('Error searching all messages:', error);
        return NextResponse.json(
          { status: 'error', error: `Error searching messages: ${error.message}` },
          { status: 500 }
        );
      }
      
      searchResults = data as SearchResult[] || [];
    }

    // If we got this far but have no results, return empty array
    if (!searchResults || searchResults.length === 0) {
      return NextResponse.json({ status: 'success', data: { results: [] } });
    }

    // Get conversation info for titles
    const conversationIds = Array.from(new Set(searchResults.map(result => result.conversation_id)));
    
    const { data: conversations, error: convError } = await supabase
      .from(DB_TABLES.CONVERSATIONS)
      .select(`${COLUMNS.ID}, ${COLUMNS.TITLE}`)
      .in(COLUMNS.ID, conversationIds);
      
    if (convError) {
      console.error('Error fetching conversations:', convError);
      return NextResponse.json(
        { status: 'error', error: `Error fetching conversation details: ${convError.message}` },
        { status: 500 }
      );
    }
    
    // Create a mapping of conversation ID to title
    const conversationTitleMap = new Map<string, string>();
    conversations?.forEach(conv => {
      conversationTitleMap.set(conv.id, conv.title || 'Untitled Conversation');
    });

    // Process the results to add conversation titles and format for UI consumption
    const processedResults = searchResults.map((result: SearchResult) => {
      return {
        id: result.id,
        content: result.content,
        role: result.role,
        conversation_id: result.conversation_id,
        created_at: result.created_at,
        conversationTitle: conversationTitleMap.get(result.conversation_id) || 'Untitled Conversation',
        searchRank: result.ts_rank
      };
    });

    return NextResponse.json({ status: 'success', data: { results: processedResults } });
  } catch (error) {
    console.error('Server error in POST /api/search/messages:', error);
    return NextResponse.json(
      { status: 'error', error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}