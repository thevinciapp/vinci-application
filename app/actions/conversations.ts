"use server";

import { createClient } from "@/utils/supabase/server";
import { COLUMNS, DB_TABLES, DEFAULTS } from "@/constants";
import { Conversation } from "@/types";
import { SpaceData } from "./spaces";
import { redis, CACHE_KEYS, CACHE_TTL } from "@/app/lib/cache";
import { invalidateConversationCache } from "./utils/caching";
import { ActionResponse, successResponse, errorResponse, handleActionError, notFoundResponse } from "./utils/responses";

// Define the Message type here
export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  metadata?: Record<string, any>;
  annotations?: any[];
}

/**
 * Get the most recently updated conversation for a space
 * @param spaceId - The ID of the space to search within
 * @returns The most recently updated conversation, or an error response
 */
export async function getMostRecentConversation(spaceId: string): Promise<ActionResponse<Conversation>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return errorResponse('User not authenticated');
        }

        if (!spaceId) {
            return errorResponse('Space ID is required');
        }

        const cacheKey = CACHE_KEYS.MOST_RECENT_CONVERSATION(spaceId);
        const cachedConversation = await redis.get<Conversation>(cacheKey);
        if (cachedConversation) {
            return successResponse(cachedConversation);
        }

        const { data, error } = await supabase
            .from(DB_TABLES.CONVERSATIONS)
            .select("*")
            .eq(COLUMNS.SPACE_ID, spaceId)
            .eq(COLUMNS.IS_DELETED, false)
            .order(COLUMNS.UPDATED_AT, { ascending: false })
            .limit(1)
            .single();

        if (error) {
            console.error("Error fetching most recent conversation:", error);
            if (error.code === 'PGRST116') { // No rows returned
                return notFoundResponse('Conversation');
            }
            return errorResponse(`Error fetching most recent conversation: ${error.message}`);
        }

        if (!data) {
            return notFoundResponse('Conversation');
        }

        // Cache the result
        await redis.set(cacheKey, data, { ex: CACHE_TTL.CONVERSATIONS });

        return successResponse(data);
    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * Get all conversations for a space
 */
export async function getConversations(spaceId: string): Promise<ActionResponse<Conversation[]>> {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return errorResponse('User not authenticated');
        }

        if (!spaceId) {
            return successResponse([]);
        }

        const cacheKey = CACHE_KEYS.CONVERSATIONS(spaceId);
        const cachedConversations = await redis.get<Conversation[]>(cacheKey);
        if (cachedConversations) {
            return successResponse(cachedConversations);
        }

        const { data, error } = await supabase
            .from(DB_TABLES.CONVERSATIONS)
            .select("*")
            .eq(COLUMNS.SPACE_ID, spaceId)
            .eq(COLUMNS.IS_DELETED, false)
            .order(COLUMNS.UPDATED_AT, { ascending: false });

        if (error) {
            console.error("Error fetching conversations:", error);
            return errorResponse(`Error fetching conversations: ${error.message}`);
        }

        if (data) {
            await redis.set(cacheKey, data, { ex: CACHE_TTL.CONVERSATIONS });
        }

        return successResponse(data || []);
    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * Create a new conversation
 */
export async function createConversation(spaceId: string, title?: string): Promise<ActionResponse<Conversation>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return await errorResponse('User not authenticated');
        }

        if (!spaceId) {
            return await errorResponse('Space ID is required');
        }

        const timestamp = new Date().toISOString();
        const { data, error } = await supabase
            .from(DB_TABLES.CONVERSATIONS)
            .insert([{
                space_id: spaceId,
                title: title || DEFAULTS.CONVERSATION_TITLE,
                created_at: timestamp,
                updated_at: timestamp,
                is_deleted: false
            }])
            .select()
            .single();

        if (error) {
            console.error("Error creating conversation:", error);
            return await errorResponse(`Error creating conversation: ${error.message}`);
        }

        // Invalidate relevant caches
        await redis.del(CACHE_KEYS.SPACE_DATA(spaceId));
        await redis.del(CACHE_KEYS.CONVERSATIONS(spaceId));

        return await successResponse(data, {
            title: 'Conversation Created',
            description: 'Start chatting now!',
            variant: 'success'
        }, `/protected/spaces/${spaceId}/conversations/${data.id}`);
    } catch (error) {
        return await handleActionError(error);
    }
}

/**
 * Get a specific conversation by ID
 */
export async function getConversation(id: string): Promise<ActionResponse<Conversation>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return errorResponse('User not authenticated');
        }

        const { data, error } = await supabase
            .from(DB_TABLES.CONVERSATIONS)
            .select("*")
            .eq(COLUMNS.ID, id)
            .eq(COLUMNS.IS_DELETED, false) // Don't return deleted conversations
            .single();

        if (error) {
            console.error("Error fetching conversation:", error);
            return notFoundResponse('Conversation');
        }

        return successResponse(data);
    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * Get all messages for a conversation
 */
export async function getMessages(conversationId: string): Promise<ActionResponse<Message[]>> {
    try {
        if (!conversationId) {
            return errorResponse('Conversation ID is required');
        }

        const cacheKey = CACHE_KEYS.MESSAGES(conversationId);
        const cachedMessages = await redis.get<Message[]>(cacheKey);
        if (cachedMessages) {
            return successResponse(cachedMessages);
        }

        const supabase = await createClient();
        const { data, error } = await supabase
            .from(DB_TABLES.MESSAGES)
            .select("*")
            .eq('conversation_id', conversationId)
            .eq(COLUMNS.IS_DELETED, false)
            .order(COLUMNS.CREATED_AT, { ascending: true });

        if (error) {
            console.error("Error fetching messages:", error);
            return errorResponse(`Error fetching messages: ${error.message}`);
        }

        if (data) {
            await redis.set(cacheKey, data, { ex: CACHE_TTL.MESSAGES });
        }

        return successResponse(data || []);
    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * Update the title of a conversation
 */
export async function updateConversationTitle(conversationId: string, title: string): Promise<ActionResponse<void>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return errorResponse('User not authenticated');
        }

        if (!conversationId) {
            return errorResponse('Conversation ID is required');
        }

        if (!title) {
            return errorResponse('Title is required');
        }

        // Get the conversation to find its space_id
        const { data: conversation, error: getError } = await supabase
            .from(DB_TABLES.CONVERSATIONS)
            .select('space_id')
            .eq(COLUMNS.ID, conversationId)
            .single();

        if (getError) {
            console.error("Error getting conversation:", getError);
            return notFoundResponse('Conversation');
        }

        // Update the conversation title in the database
        const { error: updateError } = await supabase
            .from(DB_TABLES.CONVERSATIONS)
            .update({ title })
            .eq(COLUMNS.ID, conversationId);

        if (updateError) {
            console.error("Error updating conversation title:", updateError);
            return errorResponse(`Error updating conversation title: ${updateError.message}`);
        }

        // Update all relevant caches
        try {
            // Update conversations cache
            const conversationsCacheKey = CACHE_KEYS.CONVERSATIONS(conversation.space_id);
            const cachedConversations = await redis.get<Conversation[]>(conversationsCacheKey);
            if (cachedConversations) {
                const updatedConversations = cachedConversations.map(conv =>
                    conv.id === conversationId ? { ...conv, title } : conv
                );
                await redis.set(conversationsCacheKey, updatedConversations, { ex: CACHE_TTL.CONVERSATIONS });
            }

            // Update space data cache
            const spaceDataCacheKey = CACHE_KEYS.SPACE_DATA(conversation.space_id);
            const cachedSpaceData = await redis.get<SpaceData>(spaceDataCacheKey);
            if (cachedSpaceData?.conversations) {
                const updatedSpaceData = {
                    ...cachedSpaceData,
                    conversations: cachedSpaceData.conversations.map(conv =>
                        conv.id === conversationId ? { ...conv, title } : conv
                    )
                };
                await redis.set(spaceDataCacheKey, updatedSpaceData, { ex: CACHE_TTL.SPACE_DATA });
            }
        } catch (error) {
            console.error("Error updating caches:", error);
            // Don't fail the operation because of cache issues
        }

        return successResponse(undefined);
    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * Create a new message in a conversation
 */
export async function createMessage(messageData: Partial<Message>, conversationId: string): Promise<ActionResponse<Message>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return errorResponse('User not authenticated');
        }

        if (!messageData.content || !messageData.role || !conversationId) {
            return errorResponse('Missing required data for message creation');
        }

        const timestamp = new Date().toISOString();

        const { data: conversation } = await supabase
            .from(DB_TABLES.CONVERSATIONS)
            .select("space_id")
            .eq(COLUMNS.ID, conversationId)
            .single();

        if (!conversation) {
            return notFoundResponse('Conversation');
        }

        const [messageResult, updateResult] = await Promise.all([
            supabase
                .from(DB_TABLES.MESSAGES)
                .insert([{
                    content: messageData.content,
                    role: messageData.role,
                    annotations: messageData.annotations,
                    user_id: user.id,
                    is_deleted: false,
                    created_at: timestamp,
                    updated_at: timestamp,
                    conversation_id: conversationId
                }])
                .select()
                .single(),
            supabase
                .from(DB_TABLES.CONVERSATIONS)
                .update({ updated_at: timestamp })
                .eq(COLUMNS.ID, conversationId)
        ]);

        if (messageResult.error) {
            console.error("Error creating message:", messageResult.error);
            return errorResponse(`Error creating message: ${messageResult.error.message}`);
        }

        // Update messages cache
        const messagesCacheKey = CACHE_KEYS.MESSAGES(conversationId);
        const cachedMessages = await redis.get<Message[]>(messagesCacheKey) || [];
        await redis.set(messagesCacheKey, [...cachedMessages, messageResult.data], { ex: CACHE_TTL.MESSAGES });

        // Update space data cache
        const spaceDataCacheKey = CACHE_KEYS.SPACE_DATA(conversation.space_id);
        const cachedSpaceData = await redis.get<SpaceData>(spaceDataCacheKey);
        if (cachedSpaceData?.messages) {
            cachedSpaceData.messages = [...cachedSpaceData.messages, messageResult.data];
            await redis.set(spaceDataCacheKey, cachedSpaceData, { ex: CACHE_TTL.SPACE_DATA });
        }

        return successResponse(messageResult.data);
    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * Send a message and get AI response
 */
export async function sendMessage({ 
    content, 
    spaceId, 
    conversationId, 
    searchMode 
}: { 
    content: string, 
    spaceId: string, 
    conversationId: string, 
    searchMode: string 
}): Promise<ActionResponse<{ success: boolean }>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return errorResponse('User not authenticated');
        }
        
        if (!content || !conversationId) {
            return errorResponse('Content and conversation ID are required');
        }
        
        // Create the user message
        const userMessageResponse = await createMessage({
            role: 'user',
            content,
        }, conversationId);
        
        if (!userMessageResponse.data) {
            return errorResponse('Failed to create user message');
        }
        
        // Here you would typically process the message with AI and create an assistant response
        // For now, we'll just create a placeholder response
        const assistantMessageResponse = await createMessage({
            role: 'assistant',
            content: `You said: ${content}. This is a placeholder response. In a real implementation, this would be a response from the AI model.`,
        }, conversationId);
        
        if (!assistantMessageResponse.data) {
            return errorResponse('Failed to create assistant message');
        }
        
        // Invalidate the messages cache
        await redis.del(CACHE_KEYS.MESSAGES(conversationId));
        
        return successResponse({ success: true });
    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * Switch to a specific conversation
 */
export async function switchConversation(conversationId: string): Promise<ActionResponse<void>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return errorResponse('User not authenticated');
        }
        
        if (!conversationId) {
            return errorResponse('Conversation ID is required');
        }
        
        // Get the conversation
        const conversationResponse = await getConversation(conversationId);
        
        if (!conversationResponse.data) {
            return notFoundResponse('Conversation');
        }
        
        return successResponse(undefined);
    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * Delete a conversation (soft delete)
 */
export async function deleteConversation(conversationId: string): Promise<ActionResponse<void>> {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return errorResponse('User not authenticated');
        }

        console.log(`Attempting to delete conversation with ID: ${conversationId} for user: ${user.id}`);

        // Step 1: Fetch conversation to verify it exists and get space_id
        const { data: conversation, error: fetchError } = await supabase
            .from(DB_TABLES.CONVERSATIONS)
            .select(`${COLUMNS.ID}, ${COLUMNS.SPACE_ID}, ${COLUMNS.IS_DELETED}`)
            .eq(COLUMNS.ID, conversationId)
            .single();

        if (fetchError || !conversation) {
            console.error('Fetch error:', fetchError?.message || 'Conversation not found');
            return notFoundResponse('Conversation');
        }

        console.log(`Found conversation: ID=${conversation[COLUMNS.ID]}, space_id=${conversation[COLUMNS.SPACE_ID]}, is_deleted=${conversation[COLUMNS.IS_DELETED]}`);

        if (conversation[COLUMNS.IS_DELETED]) {
            console.log('Conversation is already deleted, no update needed');
            return successResponse(undefined);
        }

        // Step 2: Verify space ownership (redundant with RLS, but kept for safety)
        const spaceId = conversation[COLUMNS.SPACE_ID];
        const { data: space, error: spaceError } = await supabase
            .from(DB_TABLES.SPACES)
            .select('id')
            .eq(COLUMNS.ID, spaceId)
            .eq(COLUMNS.USER_ID, user.id)
            .single();

        if (spaceError || !space) {
            console.error('Space verification error:', spaceError?.message || 'Space not found or not owned by user');
            return errorResponse('Unauthorized: Space does not belong to user');
        }

        console.log(`Verified space ownership for space_id: ${spaceId}`);

        // Step 3: Perform the soft delete
        const { data: updateData, error: deleteError } = await supabase
            .from(DB_TABLES.CONVERSATIONS)
            .update({ 
                [COLUMNS.IS_DELETED]: true, 
                [COLUMNS.UPDATED_AT]: new Date().toISOString() 
            })
            .eq(COLUMNS.ID, conversationId)
            .select();

        if (deleteError) {
            console.error('Delete error:', deleteError.message);
            return errorResponse(`Failed to delete conversation: ${deleteError.message}`);
        }

        if (!updateData || updateData.length === 0) {
            console.error('No rows updated - RLS or data issue persists');
            return errorResponse('No rows updated');
        }

        console.log('Conversation successfully deleted:', updateData);

        // Step 4: Delete the messages from Pinecone as well
        try {
            // Import deleteMessagesByConversationId from the Pinecone utils
            const { deleteMessagesByConversationId } = await import('@/utils/pinecone');
            await deleteMessagesByConversationId(conversationId);
            console.log(`Successfully deleted messages from Pinecone for conversation: ${conversationId}`);
        } catch (pineconeError) {
            console.error('Error deleting messages from Pinecone:', pineconeError);
            // We don't want to fail the whole operation if Pinecone deletion fails
            // Just log the error and continue
        }

        await invalidateConversationCache(conversationId, spaceId);
        console.log('Cleared conversation caches');

        return successResponse(undefined);
    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * Search for messages
 */
export async function searchMessages(
    searchTerm: string, 
    searchScope: string, 
    searchMode: string, 
    conversationId?: string, 
    spaceId?: string, 
    limit = 50
): Promise<ActionResponse<any>> {
    try {
        if (!searchTerm || searchTerm.length < 2) {
            return successResponse({ results: [] });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return errorResponse('User not authenticated');
        }

        // Validate scope
        if (searchScope === 'conversation' && !conversationId) {
            return errorResponse("Conversation ID is required for conversation scope");
        }

        if (searchScope === 'space' && !spaceId) {
            return errorResponse("Space ID is required for space scope");
        }

        let query = supabase
            .from(DB_TABLES.MESSAGES)
            .select(`
                *,
                conversations:${DB_TABLES.CONVERSATIONS}(
                    ${COLUMNS.ID},
                    ${COLUMNS.TITLE},
                    ${COLUMNS.SPACE_ID}
                )
            `)
            .eq(`${DB_TABLES.MESSAGES}.${COLUMNS.IS_DELETED}`, false)
            .eq(`${DB_TABLES.CONVERSATIONS}.${COLUMNS.IS_DELETED}`, false)
            .limit(limit);

        if (searchScope === 'conversation') {
            query = query.eq(`${DB_TABLES.MESSAGES}.${COLUMNS.CONVERSATION_ID}`, conversationId);
        } else if (searchScope === 'space') {
            query = query.eq(`${DB_TABLES.CONVERSATIONS}.${COLUMNS.SPACE_ID}`, spaceId);
        }

        // Text search
        if (searchMode === 'exact') {
            query = query.ilike(`${DB_TABLES.MESSAGES}.${COLUMNS.CONTENT}`, `%${searchTerm}%`);
        } else {
            // For "semantic" search, we would typically use a vector search like Pinecone
            // But for now, we'll just use text search as a fallback
            query = query.ilike(`${DB_TABLES.MESSAGES}.${COLUMNS.CONTENT}`, `%${searchTerm}%`);
        }

        const { data, error } = await query.order(`${DB_TABLES.MESSAGES}.${COLUMNS.CREATED_AT}`, { ascending: false });

        if (error) {
            console.error('Error searching messages:', error);
            return errorResponse(`Error searching messages: ${error.message}`);
        }

        return successResponse({ results: data || [] });
    } catch (error) {
        return handleActionError(error);
    }
} 