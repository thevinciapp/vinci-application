import { API_BASE_URL } from '@/core/auth/auth-service';
import { fetchWithAuth } from './api-service';

/**
 * WorkspaceWithAuth provides methods for interacting with the workspace API
 * with authentication handled automatically.
 */
export const WorkspaceWithAuth = {
  /**
   * Send a chat request to the API with automatic authentication handling
   * @param payload The chat request payload
   * @returns API response with streaming body
   */
  chat: async (payload: any): Promise<Response> => {
    return fetchWithAuth(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  }
}; 