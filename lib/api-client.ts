/**
 * Client-side API utilities for working with the API routes
 * This replaces the Zustand store with a more direct API-based approach
 */

import type { Space, Conversation, SpaceData } from '@/types';

// Base URL for API requests
const API_BASE_URL = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL !== undefined ? process.env.NEXT_PUBLIC_API_BASE_URL : 'http://localhost:3001';

// Helper to get full API URL
function getApiUrl(path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

// Default error handling and parsing for fetch responses
async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<{ 
  success: boolean; 
  data?: T; 
  error?: string; 
  status?: number; 
  toast?: { title: string; description: string; variant: 'default' | 'success' | 'destructive'; };
  redirectTo?: string;
}> {
  try {
    // Set default headers if not provided
    const headers = options.headers || {
      'Content-Type': 'application/json',
    };

    // Get full URL and make the request
    const fullUrl = getApiUrl(path);
    const response = await fetch(fullUrl, {
      ...options,
      headers,
      credentials: 'include', // Always include cookies for auth
    });

    // Parse the JSON response
    const data = await response.json();
    
    // Handle API response format
    if (data.status === 'success') {
      return {
        success: true,
        data: data.data,
        status: response.status,
        toast: data.toast,
        redirectTo: data.redirectTo
      };
    } else {
      return {
        success: false,
        error: data.error || 'An unexpected error occurred',
        status: response.status
      };
    }
  } catch (error) {
    console.error(`API request failed for ${path}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred',
      status: 500
    };
  }
}

// Spaces API
export const SpacesAPI = {
  // Get all spaces
  getSpaces: () => apiRequest<Space[]>('/api/spaces'),
  
  // Get a specific space
  getSpace: (spaceId: string) => apiRequest<Space>(`/api/spaces/${spaceId}`),
  
  // Create a new space
  createSpace: (spaceData: {
    name: string;
    description?: string;
    model: string;
    provider: string;
    setActive?: boolean;
    color?: string;
    chat_mode?: string;
    chat_mode_config?: any;
  }) => apiRequest<Space>('/api/spaces', {
    method: 'POST',
    body: JSON.stringify(spaceData),
  }),
  
  // Update a space
  updateSpace: (spaceId: string, updates: Partial<Space>) => apiRequest<Space>(`/api/spaces/${spaceId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  }),
  
  // Delete a space
  deleteSpace: (spaceId: string) => apiRequest<void>(`/api/spaces/${spaceId}`, {
    method: 'DELETE',
  }),
  
  // Get comprehensive data for a space
  getSpaceData: (spaceId: string) => apiRequest<SpaceData>(`/api/spaces/${spaceId}/data`),
};

// Active Space API
export const ActiveSpaceAPI = {
  // Get the active space
  getActiveSpace: () => apiRequest<{ activeSpace: Space | null }>('/api/active-space'),
  
  // Set the active space
  setActiveSpace: (spaceId: string) => apiRequest<{ activeSpace: Space }>('/api/active-space', {
    method: 'POST',
    body: JSON.stringify({ spaceId }),
  }),
};

// Conversations API
export const ConversationsAPI = {
  // Get all conversations for a space
  getConversations: (spaceId: string) => apiRequest<Conversation[]>(`/api/spaces/${spaceId}/conversations`),
  
  // Create a new conversation
  createConversation: (spaceId: string, title?: string) => apiRequest<Conversation>(`/api/spaces/${spaceId}/conversations`, {
    method: 'POST',
    body: JSON.stringify({ title }),
  }),
  
  // Get a specific conversation
  getConversation: (conversationId: string) => apiRequest<Conversation>(`/api/conversations/${conversationId}`),
  
  // Update a conversation
  updateConversation: (conversationId: string, title: string) => apiRequest<Conversation>(`/api/conversations/${conversationId}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  }),
  
  // Delete a conversation
  deleteConversation: (conversationId: string) => apiRequest<void>(`/api/conversations/${conversationId}`, {
    method: 'DELETE',
  }),
};

// Messages API
export const MessagesAPI = {
  // Get all messages for a conversation
  getMessages: (conversationId: string) => apiRequest<any[]>(`/api/conversations/${conversationId}/messages`),
  
  // Create a new message
  createMessage: (conversationId: string, messageData: {
    content: string;
    role: 'user' | 'assistant' | 'system';
    annotations?: any[];
    tags?: string[];
  }) => apiRequest<any>(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify(messageData),
  }),
};

// Search API
export const SearchAPI = {
  // Search for messages
  searchMessages: (params: {
    searchTerm: string;
    searchScope: 'conversation' | 'space' | 'all';
    searchMode?: string;
    conversationId?: string;
    spaceId?: string;
    limit?: number;
  }) => apiRequest<{ results: any[] }>('/api/search/messages', {
    method: 'POST',
    body: JSON.stringify(params),
  }),
};

// Auth API
export const AuthAPI = {
  // Sign in
  signIn: (credentials: { email: string; password: string }) => apiRequest<{ success: boolean }>('/api/auth/sign-in', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),

  // Sign up
  signUp: (credentials: { email: string; password: string }) => apiRequest<{ success: boolean }>('/api/auth/sign-up', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),

  // Reset password
  resetPassword: (email: string) => apiRequest<{ success: boolean }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),

  // Sign out
  signOut: () => apiRequest<{ success: boolean }>('/api/auth/signout', {
    method: 'POST',
  }),
};

// Notifications API
export const NotificationsAPI = {
  // Get all notifications
  getNotifications: () => apiRequest<any[]>('/api/notifications'),
  
  // Mark a notification as read
  markAsRead: (notificationId: string) => apiRequest<void>(`/api/notifications/${notificationId}/read`, {
    method: 'POST',
  }),
  
  // Mark all notifications as read
  markAllAsRead: () => apiRequest<void>('/api/notifications/read-all', {
    method: 'POST',
  }),
};

// Combined API for convenience
export const API = {
  spaces: SpacesAPI,
  activeSpace: ActiveSpaceAPI,
  conversations: ConversationsAPI,
  messages: MessagesAPI,
  search: SearchAPI,
  auth: AuthAPI,
  notifications: NotificationsAPI,
};