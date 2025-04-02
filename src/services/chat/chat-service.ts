import { fetchWithAuth } from '../api/api-service';
import { API_BASE_URL } from '@/core/auth/auth-service';
import { Message } from '@/types/message';

// Define the expected structure of the payload for the chat API
interface ChatApiPayload {
  messages: Message[];
  spaceId: string;
  conversationId?: string;
  provider?: string;
  model?: string;
  files?: any;
  stream: boolean; // Ensure stream is explicitly part of the payload type
  searchMode?: string;
  chatMode?: string;
  // Include any other fields expected by the /api/chat endpoint
}

/**
 * Initiates a streaming chat request to the backend API.
 * 
 * @param payload The data payload for the chat request.
 * @returns A Promise resolving to the raw Response object from the fetch call.
 */
export async function initiateChatApiStream(payload: ChatApiPayload): Promise<Response> {
  const url = `${API_BASE_URL}/api/chat`;
  
  const requestPayload = { ...payload, stream: true };

  return fetchWithAuth(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestPayload),
  });
} 