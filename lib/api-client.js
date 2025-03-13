"use strict";
/**
 * Client-side API utilities for working with the API routes
 * This replaces the Zustand store with a more direct API-based approach
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.API = exports.NotificationsAPI = exports.AuthAPI = exports.SearchAPI = exports.MessagesAPI = exports.ConversationsAPI = exports.ActiveSpaceAPI = exports.SpacesAPI = void 0;
// Base URL for API requests
const API_BASE_URL = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL ? process.env.NEXT_PUBLIC_API_BASE_URL : 'http://localhost:3001';
// Helper to get full API URL
function getApiUrl(path) {
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${normalizedPath}`;
}
// Default error handling and parsing for fetch responses
async function apiRequest(path, options = {}) {
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
        }
        else {
            return {
                success: false,
                error: data.error || 'An unexpected error occurred',
                status: response.status
            };
        }
    }
    catch (error) {
        console.error(`API request failed for ${path}:`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Network error occurred',
            status: 500
        };
    }
}
// Spaces API
exports.SpacesAPI = {
    // Get all spaces
    getSpaces: () => apiRequest('/api/spaces'),
    // Get a specific space
    getSpace: (spaceId) => apiRequest(`/api/spaces/${spaceId}`),
    // Create a new space
    createSpace: (spaceData) => apiRequest('/api/spaces', {
        method: 'POST',
        body: JSON.stringify(spaceData),
    }),
    // Update a space
    updateSpace: (spaceId, updates) => apiRequest(`/api/spaces/${spaceId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
    }),
    // Delete a space
    deleteSpace: (spaceId) => apiRequest(`/api/spaces/${spaceId}`, {
        method: 'DELETE',
    }),
    // Get comprehensive data for a space
    getSpaceData: (spaceId) => apiRequest(`/api/spaces/${spaceId}/data`),
};
// Active Space API
exports.ActiveSpaceAPI = {
    // Get the active space
    getActiveSpace: () => apiRequest('/api/active-space'),
    // Set the active space
    setActiveSpace: (spaceId) => apiRequest('/api/active-space', {
        method: 'POST',
        body: JSON.stringify({ spaceId }),
    }),
};
// Conversations API
exports.ConversationsAPI = {
    // Get all conversations for a space
    getConversations: (spaceId) => apiRequest(`/api/spaces/${spaceId}/conversations`),
    // Create a new conversation
    createConversation: (spaceId, title) => apiRequest(`/api/spaces/${spaceId}/conversations`, {
        method: 'POST',
        body: JSON.stringify({ title }),
    }),
    // Get a specific conversation
    getConversation: (conversationId) => apiRequest(`/api/conversations/${conversationId}`),
    // Update a conversation
    updateConversation: (conversationId, title) => apiRequest(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ title }),
    }),
    // Delete a conversation
    deleteConversation: (conversationId) => apiRequest(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
    }),
};
// Messages API
exports.MessagesAPI = {
    // Get all messages for a conversation
    getMessages: (conversationId) => apiRequest(`/api/conversations/${conversationId}/messages`),
    // Create a new message
    createMessage: (conversationId, messageData) => apiRequest(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify(messageData),
    }),
};
// Search API
exports.SearchAPI = {
    // Search for messages
    searchMessages: (params) => apiRequest('/api/search/messages', {
        method: 'POST',
        body: JSON.stringify(params),
    }),
};
// Auth API
exports.AuthAPI = {
    // Get current session
    getSession: () => apiRequest('/api/auth/session', {
        method: 'GET',
        credentials: 'include'
    }),
    // Sign in
    signIn: (credentials) => apiRequest('/api/auth/sign-in', {
        method: 'POST',
        body: JSON.stringify(credentials),
    }),
    // Sign up
    signUp: (credentials) => apiRequest('/api/auth/sign-up', {
        method: 'POST',
        body: JSON.stringify(credentials),
    }),
    // Reset password
    resetPassword: (email) => apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
    }),
    // Sign out
    signOut: () => apiRequest('/api/auth/signout', {
        method: 'POST',
    }),
};
// Notifications API
exports.NotificationsAPI = {
    // Get all notifications
    getNotifications: () => apiRequest('/api/notifications'),
    // Mark a notification as read
    markAsRead: (notificationId) => apiRequest(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
    }),
    // Mark all notifications as read
    markAllAsRead: () => apiRequest('/api/notifications/read-all', {
        method: 'POST',
    }),
};
// Combined API for convenience
exports.API = {
    spaces: exports.SpacesAPI,
    activeSpace: exports.ActiveSpaceAPI,
    conversations: exports.ConversationsAPI,
    messages: exports.MessagesAPI,
    search: exports.SearchAPI,
    auth: exports.AuthAPI,
    notifications: exports.NotificationsAPI,
};
