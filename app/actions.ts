"use server";

import { createClient } from "@/utils/supabase/server";
import {
  COLUMNS,
  DB_TABLES,
  DEFAULTS,
} from "@/lib/constants";
import { Conversation, Space } from "@/types";
import { Message } from "ai";
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { encodedRedirect } from "@/utils/utils";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const CACHE_KEYS = {
  SPACES: (userId: string) => `spaces:${userId}`,
  SPACE: (spaceId: string) => `space:${spaceId}`,
  ACTIVE_SPACE: (userId: string) => `active_space:${userId}`,
  ACTIVE_CONVERSATION: (userId: string) => `active_conversation:${userId}`,
  CONVERSATIONS: (spaceId: string) => `conversations:${spaceId}`,
  MESSAGES: (conversationId: string) => `messages:${conversationId}`,
  SPACE_DATA: (spaceId: string) => `space_data:${spaceId}`,
};

const CACHE_TTL = {
  SPACES: 60 * 5, // 5 minutes
  SPACE: 60 * 5, // 5 minutes
  ACTIVE_SPACE: 60 * 60, // 1 hour
  ACTIVE_CONVERSATION: 60 * 60, // 1 hour
  CONVERSATIONS: 60 * 5, // 5 minutes
  MESSAGES: 60 * 5, // 5 minutes
  SPACE_DATA: 60 * 5, // 5 minutes
};

export async function getSpaces(): Promise<Space[] | null> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        console.error("User not found");
        return null;
    }

    // Try to get from cache first
    const cacheKey = CACHE_KEYS.SPACES(user.id);
    const cachedSpaces = await redis.get<Space[]>(cacheKey);
    if (cachedSpaces) {
        return cachedSpaces;
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
        return null;
    }

    // Cache the result
    if (data) {
        await redis.set(cacheKey, data, { ex: CACHE_TTL.SPACES });
    }

    return data;
}

export async function getSpace(id: string): Promise<Space | null> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
  
    if (!user) {
        console.error("User not found");
        return null;
    }

    // Try to get from cache first
    const cacheKey = CACHE_KEYS.SPACE(id);
    const cachedSpace = await redis.get<Space>(cacheKey);
    if (cachedSpace) {
        return cachedSpace;
    }

    const { data, error } = await supabase
        .from(DB_TABLES.SPACES)
        .select("*")
        .eq(COLUMNS.ID, id)
        .eq(COLUMNS.USER_ID, user.id)
        .single();

    if (error) {
        console.error("Error fetching space:", error);
        return null;
    }

    // Cache the result
    if (data) {
        await redis.set(cacheKey, data, { ex: CACHE_TTL.SPACE });
    }

    return data;
}

export async function createSpace(
    name: string,
    description: string,
    model: string,
    provider: string,
    setActive: boolean,
    color?: string
): Promise<Space | null> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        console.error("User not found");
        return null;
    }

    const { data, error } = await supabase
        .from(DB_TABLES.SPACES)
        .insert([
            {
                [COLUMNS.NAME]: name || DEFAULTS.SPACE_NAME,
                [COLUMNS.DESCRIPTION]: description || '',
                [COLUMNS.USER_ID]: user.id,
                [COLUMNS.MODEL]: model,
                [COLUMNS.PROVIDER]: provider,
                [COLUMNS.COLOR]: color || '#3ecfff',
            },
        ])
        .select()
        .single();

    if (error) {
        console.error("Error creating space:", error);
        return null;
    }

    if (data) {
        // Invalidate spaces cache
        await redis.del(CACHE_KEYS.SPACES(user.id));
        
        if (setActive) {
            await setActiveSpace(data.id);
        }
    }

    return data;
}

export async function updateSpace(id: string, updates: Partial<Space>): Promise<Space | null> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        console.error("User not found");
        return null;
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
        return null;
    }

    if (data) {
        // Invalidate related caches
        await Promise.all([
            redis.del(CACHE_KEYS.SPACES(user.id)),
            redis.del(CACHE_KEYS.SPACE(id)),
            redis.del(CACHE_KEYS.ACTIVE_SPACE(user.id)),
            redis.del(CACHE_KEYS.SPACE_DATA(id))
        ]);
    }

    return data;
}

export async function setActiveSpace(spaceId: string): Promise<void> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.error("User not found");
        return;
    }

    const { error: deleteError } = await supabase
        .from(DB_TABLES.ACTIVE_SPACES)
        .delete()
        .eq(COLUMNS.USER_ID, user.id);

    if (deleteError) {
        console.error("Error removing existing active space:", deleteError);
    }

    const { error: insertError } = await supabase
        .from(DB_TABLES.ACTIVE_SPACES)
        .insert({
            [COLUMNS.USER_ID]: user.id,
            [COLUMNS.SPACE_ID]: spaceId
        });

    if (insertError) {
        console.error("Error setting active space:", insertError);
    } else {
        // Update cache
        const space = await getSpace(spaceId);
        if (space) {
            await redis.set(CACHE_KEYS.ACTIVE_SPACE(user.id), space, { ex: CACHE_TTL.ACTIVE_SPACE });
        }
    }
}

export async function getActiveSpace(): Promise<Space | null> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        console.error("User not found");
        return null;
    }

    // Try to get from cache first
    const cacheKey = CACHE_KEYS.ACTIVE_SPACE(user.id);
    const cachedSpace = await redis.get<Space>(cacheKey);
    if (cachedSpace) {
        return cachedSpace;
    }

    const { data: activeSpaceData, error: activeSpaceError } = await supabase
        .from(DB_TABLES.ACTIVE_SPACES)
        .select(COLUMNS.SPACE_ID)
        .eq(COLUMNS.USER_ID, user.id)
        .single();

    if (activeSpaceError || !activeSpaceData) {
        return null;
    }

    const { data: space, error: spaceError } = await supabase
        .from(DB_TABLES.SPACES)
        .select("*")
        .eq(COLUMNS.ID, activeSpaceData.space_id)
        .eq(COLUMNS.USER_ID, user.id)
        .single();

    if (spaceError) {
        console.error("Error fetching active space:", spaceError);
        return null;
    }

    // Cache the result
    if (space) {
        await redis.set(cacheKey, space, { ex: CACHE_TTL.ACTIVE_SPACE });
    }

    return space;
}

export interface SpaceData {
    space: Space | null;
    conversations: Conversation[] | null;
    messages: Message[] | null;
}

export async function getSpaceData(spaceId: string): Promise<SpaceData | null> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        console.error("User not found");
        return null;
    }

    if (!spaceId) {
        return { space: null, conversations: [], messages: null };
    }

    // Try to get from cache first
    const cacheKey = CACHE_KEYS.SPACE_DATA(spaceId);
    const cachedData = await redis.get<SpaceData>(cacheKey);
    if (cachedData) {
        return cachedData;
    }

    // Fetch space and conversations in parallel
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
            .order(COLUMNS.UPDATED_AT, { ascending: false })
            .then(({ data, error }) => {
                if (error) {
                    console.error("Error fetching conversations:", error);
                    return [];
                }
                return data || [];
            })
    ]);

    // If we have conversations, get messages for the most recent one
    let messages = null;
    if (conversations.length > 0) {
        const { data, error } = await supabase
            .from(DB_TABLES.MESSAGES)
            .select("*")
            .eq('conversation_id', conversations[0].id)
            .eq(COLUMNS.IS_DELETED, false)
            .order(COLUMNS.CREATED_AT, { ascending: true });

        if (error) {
            console.error("Error fetching messages:", error);
        } else {
            messages = data;
        }
    }

    const spaceData = { space, conversations, messages };
    await redis.set(cacheKey, spaceData, { ex: CACHE_TTL.SPACE_DATA });
    return spaceData;
}

export async function getConversations(spaceId: string): Promise<Conversation[] | null> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        console.error("User not found");
        return null;
    }

    if (!spaceId) {
        return [];
    }

    const cacheKey = CACHE_KEYS.CONVERSATIONS(spaceId);
    const cachedConversations = await redis.get<Conversation[]>(cacheKey);
    if (cachedConversations) {
        return cachedConversations;
    }

    const { data, error } = await supabase
        .from(DB_TABLES.CONVERSATIONS)
        .select("*")
        .eq(COLUMNS.SPACE_ID, spaceId)
        .order(COLUMNS.UPDATED_AT, { ascending: false });

    if (error) {
        console.error("Error fetching conversations:", error);
        return null;
    }

    if (data) {
        await redis.set(cacheKey, data, { ex: CACHE_TTL.CONVERSATIONS });
    }

    return data;
}

export async function createConversation(spaceId: string, title?: string): Promise<Conversation | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !spaceId) {
        console.error("Missing required data for conversation creation");
        return null;
    }

    const timestamp = new Date().toISOString();
    const { data, error } = await supabase
        .from(DB_TABLES.CONVERSATIONS)
        .insert([{
            space_id: spaceId,
            title: title || DEFAULTS.CONVERSATION_TITLE,
            created_at: timestamp,
            updated_at: timestamp
        }])
        .select()
        .single();

    if (error) {
        console.error("Error creating conversation:", error);
        return null;
    }

    await redis.del(CACHE_KEYS.SPACE_DATA(spaceId));

    return data;
}

export async function setActiveConversation(conversationId: string): Promise<void> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.error("User not found");
        return;
    }

    const { error: deleteError } = await supabase
        .from(DB_TABLES.ACTIVE_CONVERSATIONS)
        .delete()
        .eq(COLUMNS.USER_ID, user.id);

    if (deleteError) {
        console.error("Error removing existing active conversation:", deleteError);
    }

    const { error: insertError } = await supabase
        .from(DB_TABLES.ACTIVE_CONVERSATIONS)
        .insert({
            [COLUMNS.USER_ID]: user.id,
            conversation_id: conversationId
        });

    if (insertError) {
        console.error("Error setting active conversation:", insertError);
    } else {
        // Update cache
        const conversation = await getConversation(conversationId);
        if (conversation) {
            await redis.set(CACHE_KEYS.ACTIVE_CONVERSATION(user.id), conversation, { ex: CACHE_TTL.ACTIVE_CONVERSATION });
        }
    }
}

export async function getActiveConversation(): Promise<Conversation | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.error("User not found");
        return null;
    }

    // Try to get from cache first
    const cacheKey = CACHE_KEYS.ACTIVE_CONVERSATION(user.id);
    const cachedConversation = await redis.get<Conversation>(cacheKey);
    if (cachedConversation) {
        return cachedConversation;
    }

    const { data: activeConversationData, error: activeConversationError } = await supabase
        .from(DB_TABLES.ACTIVE_CONVERSATIONS)
        .select('conversation_id')
        .eq(COLUMNS.USER_ID, user.id)
        .single();

    if (activeConversationError || !activeConversationData) {
        return null;
    }

    const { data: conversation, error: conversationError } = await supabase
        .from(DB_TABLES.CONVERSATIONS)
        .select("*")
        .eq(COLUMNS.ID, activeConversationData.conversation_id)
        .single();

    if (conversationError) {
        console.error("Error fetching active conversation:", conversationError);
        return null;
    }

    // Cache the result
    if (conversation) {
        await redis.set(cacheKey, conversation, { ex: CACHE_TTL.CONVERSATIONS });
    }

    return conversation;
}

export async function getConversation(id: string): Promise<Conversation | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.error("User not found");
        return null;
    }

    const { data, error } = await supabase
        .from(DB_TABLES.CONVERSATIONS)
        .select("*")
        .eq(COLUMNS.ID, id)
        .single();

    if (error) {
        console.error("Error fetching conversation:", error);
        return null;
    }

    return data;
}

export async function getMessages(conversationId: string): Promise<Message[] | null> {
    if (!conversationId) {
        console.error("Invalid conversation ID: Cannot fetch messages without a valid conversation ID");
        return null;
    }

    const cacheKey = CACHE_KEYS.MESSAGES(conversationId);
    const cachedMessages = await redis.get<Message[]>(cacheKey);
    if (cachedMessages) {
        return cachedMessages;
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
        return null;
    }

    // Cache the result
    if (data) {
        await redis.set(cacheKey, data, { ex: CACHE_TTL.MESSAGES });
    }

    return data;
}

export async function updateConversationTitle(conversationId: string, title: string): Promise<void> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.error("User not found");
        return;
    }

    // Get the conversation to find its space_id
    const { data: conversation, error: getError } = await supabase
        .from(DB_TABLES.CONVERSATIONS)
        .select('space_id')
        .eq(COLUMNS.ID, conversationId)
        .single();

    if (getError) {
        console.error("Error getting conversation:", getError);
        return;
    }

    // Update the conversation title in the database
    const { error: updateError } = await supabase
        .from(DB_TABLES.CONVERSATIONS)
        .update({ title })
        .eq(COLUMNS.ID, conversationId);

    if (updateError) {
        console.error("Error updating conversation title:", updateError);
        return;
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

        // Update active conversation cache if this is the active one
        const activeCacheKey = CACHE_KEYS.ACTIVE_CONVERSATION(user.id);
        const cachedActive = await redis.get<Conversation>(activeCacheKey);
        if (cachedActive && cachedActive.id === conversationId) {
            await redis.set(activeCacheKey, { ...cachedActive, title }, { ex: CACHE_TTL.ACTIVE_CONVERSATION });
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
    }
}

export async function createMessage(messageData: Partial<Message>, conversationId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !messageData.content || !messageData.role || !conversationId) {
        console.error("Missing required data for message creation");
        return null;
    }

    const timestamp = new Date().toISOString();

    const { data: conversation } = await supabase
        .from(DB_TABLES.CONVERSATIONS)
        .select("space_id")
        .eq(COLUMNS.ID, conversationId)
        .single();

    if (!conversation) {
        console.error("Conversation not found");
        return null;
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
        return null;
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

    return messageResult.data;
}

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  if (!email || !password) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Email and password are required",
    );
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error(error.code + " " + error.message);
    return encodedRedirect("error", "/sign-up", error.message);
  } else {
    return encodedRedirect(
      "success",
      "/sign-up",
      "Thanks for signing up! Please check your email for a verification link.",
    );
  }
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  return redirect("/protected");
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
  });

  if (error) {
    console.error(error.message);
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password",
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password.",
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password and confirm password are required",
    );
  }

  if (password !== confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Passwords do not match",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password update failed",
    );
  }

  encodedRedirect("success", "/protected/reset-password", "Password updated");
};

export const signOutAction = async () => {
  const supabase = await createClient();
  
  try {
    // Clear all redis cache for the user
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await Promise.all([
        redis.del(CACHE_KEYS.SPACES(user.id)),
        redis.del(CACHE_KEYS.ACTIVE_SPACE(user.id))
      ]);
    }

    // Sign out from Supabase
    await supabase.auth.signOut();

    // No need to return redirect since we handle navigation client-side
    return { success: true };
  } catch (error) {
    console.error('Error during sign out:', error);
    return { success: false, error };
  }
};