"use server";

import { createClient } from "@/utils/supabase/server";
import { COLUMNS, DB_TABLES, DEFAULTS } from "@/constants";
import { Space, Conversation } from "@/types";
import { redis, CACHE_KEYS, CACHE_TTL } from "@/app/lib/cache";
import { invalidateSpaceCache } from "./utils/caching";
import { ActionResponse, successResponse, errorResponse, handleActionError, notFoundResponse } from "./utils/responses";

export interface SpaceData {
    space: Space | null;
    conversations: Conversation[] | null;
    messages: any[] | null;
    activeConversation: Conversation | null;
}

/**
 * Get all spaces for the current user
 */
export async function getSpaces(): Promise<ActionResponse<Space[]>> {
    try {
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return errorResponse('User not authenticated');
        }

        // Try to get from cache first
        const cacheKey = CACHE_KEYS.SPACES(user.id);
        const cachedSpaces = await redis.get<Space[]>(cacheKey);
        if (cachedSpaces) {
            return successResponse(cachedSpaces);
        }

        // If not in cache, get from DB
        const { data, error } = await supabase
            .from(DB_TABLES.SPACES)
            .select("*")
            .eq(COLUMNS.USER_ID, user.id)
            .eq(COLUMNS.IS_DELETED, false)
            .order(COLUMNS.UPDATED_AT, { ascending: false });

        if (error) {
            console.error("Error fetching spaces:", error);
            return errorResponse(`Error fetching spaces: ${error.message}`);
        }

        // Cache the result
        if (data) {
            await redis.set(cacheKey, data, { ex: CACHE_TTL.SPACES });
        }

        return successResponse(data || []);
    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * Get a specific space by ID
 */
export async function getSpace(id: string): Promise<ActionResponse<Space>> {
    try {
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
      
        if (!user) {
            return errorResponse('User not authenticated');
        }

        // Try to get from cache first
        const cacheKey = CACHE_KEYS.SPACE(id);
        const cachedSpace = await redis.get<Space>(cacheKey);
        if (cachedSpace) {
            return successResponse(cachedSpace);
        }

        const { data, error } = await supabase
            .from(DB_TABLES.SPACES)
            .select("*")
            .eq(COLUMNS.ID, id)
            .eq(COLUMNS.USER_ID, user.id)
            .single();

        if (error) {
            console.error("Error fetching space:", error);
            return notFoundResponse('Space');
        }

        // Cache the result
        if (data) {
            await redis.set(cacheKey, data, { ex: CACHE_TTL.SPACE });
        }

        return successResponse(data);
    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * Create a new space
 */
export async function createSpace(
    name: string,
    description: string,
    model: string,
    provider: string,
    setActive: boolean,
    color?: string,
    chat_mode: string = 'ask',
    chat_mode_config?: any
): Promise<ActionResponse<Space>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return await errorResponse('User not authenticated');
        }

        const { data: space, error } = await supabase
            .from(DB_TABLES.SPACES)
            .insert([{
                [COLUMNS.NAME]: name || DEFAULTS.SPACE_NAME,
                [COLUMNS.DESCRIPTION]: description || '',
                [COLUMNS.USER_ID]: user.id,
                [COLUMNS.MODEL]: model,
                [COLUMNS.PROVIDER]: provider,
                [COLUMNS.COLOR]: color || '#3ecfff',
                chat_mode: chat_mode,
                chat_mode_config: chat_mode_config || { tools: [] }
            }])
            .select()
            .single();

        if (error) {
            console.error("Error creating space:", error);
            return await errorResponse(`Error creating space: ${error.message}`);
        }

        if (space) {
            // Invalidate spaces cache
            await redis.del(CACHE_KEYS.SPACES(user.id));
            
            if (setActive) {
                await setActiveSpace(space.id);
            }

            // Create a default conversation for the new space
            const timestamp = new Date().toISOString();
            const { data: conversation, error: convError } = await supabase
                .from(DB_TABLES.CONVERSATIONS)
                .insert([{
                    space_id: space.id,
                    title: "Welcome",
                    created_at: timestamp,
                    updated_at: timestamp,
                    is_deleted: false
                }])
                .select()
                .single();

            if (convError) {
                console.error("Error creating default conversation:", convError);
                // Don't return error here as the space was created successfully
            }

            // Invalidate relevant caches
            await invalidateSpaceCache(space.id);
            
            // Return success with redirect to the new conversation if one was created
            let redirectTo = `/protected/spaces/${space.id}/conversations`;
            if (conversation) {
                redirectTo = `${redirectTo}/${conversation.id}`;
            }
            
            return await successResponse(space, {
                title: 'Space Created',
                description: 'Your new workspace is ready',
                variant: 'success'
            }, redirectTo);
        }

        return await successResponse(space);
    } catch (error) {
        return await handleActionError(error);
    }
}

/**
 * Update an existing space
 */
export async function updateSpace(id: string, updates: Partial<Space>): Promise<ActionResponse<Space>> {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return errorResponse('User not authenticated');
        }

        const { data, error } = await supabase
            .from(DB_TABLES.SPACES)
            .update(updates)
            .eq(COLUMNS.ID, id)
            .eq(COLUMNS.USER_ID, user.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating space:', error);
            return errorResponse(`Error updating space: ${error.message}`);
        }

        if (data) {
            // Invalidate related caches
            await invalidateSpaceCache(id, user.id);
        }

        return successResponse(data);
    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * Set a space as the active space for the current user
 */
export async function setActiveSpace(spaceId: string): Promise<ActionResponse<void>> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return errorResponse('User not authenticated');
        }

        const { error: deleteError } = await supabase
            .from(DB_TABLES.ACTIVE_SPACES)
            .delete()
            .eq(COLUMNS.USER_ID, user.id);

        if (deleteError) {
            console.error("Error removing existing active space:", deleteError);
            return errorResponse(`Error removing existing active space: ${deleteError.message}`);
        }

        const { error: insertError } = await supabase
            .from(DB_TABLES.ACTIVE_SPACES)
            .insert({
                [COLUMNS.USER_ID]: user.id,
                [COLUMNS.SPACE_ID]: spaceId
            });

        if (insertError) {
            console.error("Error setting active space:", insertError);
            return errorResponse(`Error setting active space: ${insertError.message}`);
        }

        // Update cache
        const spaceResponse = await getSpace(spaceId);
        if (spaceResponse.data) {
            await redis.set(CACHE_KEYS.ACTIVE_SPACE(user.id), spaceResponse.data, { ex: CACHE_TTL.ACTIVE_SPACE });
        }

        return successResponse(undefined);
    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * Get the active space for the current user
 */
export async function getActiveSpace(): Promise<ActionResponse<Space>> {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return errorResponse('User not authenticated');
        }

        // Try to get from cache first
        const cacheKey = CACHE_KEYS.ACTIVE_SPACE(user.id);
        const cachedSpace = await redis.get<Space>(cacheKey);
        if (cachedSpace) {
            return successResponse(cachedSpace);
        }

        const { data: activeSpaceData, error: activeSpaceError } = await supabase
            .from(DB_TABLES.ACTIVE_SPACES)
            .select(COLUMNS.SPACE_ID)
            .eq(COLUMNS.USER_ID, user.id)
            .single();

        if (activeSpaceError || !activeSpaceData) {
            return notFoundResponse('Active space');
        }

        const { data: space, error: spaceError } = await supabase
            .from(DB_TABLES.SPACES)
            .select("*")
            .eq(COLUMNS.ID, activeSpaceData.space_id)
            .eq(COLUMNS.USER_ID, user.id)
            .single();

        if (spaceError) {
            console.error("Error fetching active space:", spaceError);
            return notFoundResponse('Active space');
        }

        // Cache the result
        if (space) {
            await redis.set(cacheKey, space, { ex: CACHE_TTL.ACTIVE_SPACE });
        }

        return successResponse(space);
    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * Get comprehensive data for a space including conversations and messages
 */
export async function getSpaceData(spaceId: string): Promise<ActionResponse<SpaceData>> {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return errorResponse('User not authenticated');
        }

        if (!spaceId) {
            return successResponse({ space: null, conversations: [], messages: null, activeConversation: null });
        }

        const cacheKey = CACHE_KEYS.SPACE_DATA(spaceId);
        const cachedData = await redis.get<SpaceData>(cacheKey);
        if (cachedData) {
            return successResponse(cachedData);
        }

        const [space, conversations] = await Promise.all([
            supabase
                .from(DB_TABLES.SPACES)
                .select("*")
                .eq(COLUMNS.ID, spaceId)
                .eq(COLUMNS.USER_ID, user.id)
                .single()
                .then(({ data, error }) => {
                    if (error) {
                        console.error("Error fetching space:", error);
                        return null;
                    }
                    return data;
                }),
            supabase
                .from(DB_TABLES.CONVERSATIONS)
                .select("*")
                .eq(COLUMNS.SPACE_ID, spaceId)
                .eq(COLUMNS.IS_DELETED, false)
                .order(COLUMNS.UPDATED_AT, { ascending: false })
                .then(({ data, error }) => {
                    if (error) {
                        console.error("Error fetching conversations:", error);
                        return [];
                    }
                    return data || [];
                })
        ]);

        // Get the most recently updated conversation as the active one
        const activeConversation = conversations && conversations.length > 0 ? conversations[0] : null;

        let messages = null;
        if (activeConversation) {
            const { data: messageData, error: messagesError } = await supabase
                .from(DB_TABLES.MESSAGES)
                .select("*")
                .eq('conversation_id', activeConversation.id)
                .eq(COLUMNS.IS_DELETED, false)
                .order(COLUMNS.CREATED_AT, { ascending: true });

            if (messagesError) {
                console.error("Error fetching messages:", messagesError);
            } else {
                messages = messageData;
            }
        }

        const spaceData = { space, conversations, messages, activeConversation };
        await redis.set(cacheKey, spaceData, { ex: CACHE_TTL.SPACE_DATA });

        return successResponse(spaceData);
    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * Delete a space
 */
export async function deleteSpace(spaceId: string): Promise<ActionResponse<void>> {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return await errorResponse('User not authenticated');
        }

        // Mark space as deleted
        const { error } = await supabase
            .from(DB_TABLES.SPACES)
            .update({ is_deleted: true })
            .eq(COLUMNS.ID, spaceId)
            .eq(COLUMNS.USER_ID, user.id);

        if (error) {
            console.error("Error deleting space:", error);
            return await errorResponse(`Error deleting space: ${error.message}`);
        }

        // Mark all conversations in the space as deleted
        const { error: conversationError } = await supabase
            .from(DB_TABLES.CONVERSATIONS)
            .update({ is_deleted: true })
            .eq(COLUMNS.SPACE_ID, spaceId);

        if (conversationError) {
            console.error("Error marking conversations as deleted:", conversationError);
            // Don't return error since the space was deleted successfully
        }

        // Invalidate caches
        await invalidateSpaceCache(spaceId, user.id);

        return await successResponse(undefined);
    } catch (error) {
        return await handleActionError(error);
    }
} 