import { ipcMain, IpcMainInvokeEvent, webContents } from 'electron';
import { ChatEvents } from '../constants';
import { fetchWithAuth } from '../../../services/api/api-service';
import { API_BASE_URL } from '../../../config/api';
import { useStore } from '../../../store';

interface ChatBody {
  spaceId: string;
  conversationId: string | null;
  provider: string;
  model: string;
  searchMode: 'chat' | 'search' | 'semantic' | 'hybrid';
  chatMode: string;
  chatModeConfig: Record<string, any>;
  files: Record<string, any>;
  messages: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt?: Date;
  }[];
}

// Track active chat stream AbortControllers by chat ID
const chatAbortControllers: Record<string, AbortController> = {};

/**
 * Register chat-related IPC handlers
 */
export function registerChatHandlers() {
  // Handler to initiate a chat request with streaming response
  ipcMain.handle(ChatEvents.INITIATE_CHAT, async (event: IpcMainInvokeEvent, chatId: string, chatBody: ChatBody) => {
    try {
      // Cancel any existing stream for this chat ID
      if (chatAbortControllers[chatId]) {
        chatAbortControllers[chatId].abort();
        delete chatAbortControllers[chatId];
      }

      // Get user ID from the store
      const store = useStore.getState();
      const userId = store.user?.id;
      
      if (!userId) {
        event.sender.send(ChatEvents.CHAT_STREAM_ERROR, {
          chatId,
          error: "User not authenticated"
        });
        return { success: false, error: "User not authenticated" };
      }

      // Extract the most recent user message from the chat history
      const userMessages = chatBody.messages.filter(msg => msg.role === 'user');
      if (userMessages.length === 0) {
        event.sender.send(ChatEvents.CHAT_STREAM_ERROR, {
          chatId,
          error: "No user message found in chat history"
        });
        return { success: false, error: "No user message found in chat history" };
      }
      
      // Get the most recent user message
      const latestUserMessage = userMessages[userMessages.length - 1];

      // Create the API request body
      const apiRequestBody = {
        message: latestUserMessage.content,
        userId: userId,
        spaceId: chatBody.spaceId,
        conversationId: chatBody.conversationId,
        provider: chatBody.provider,
        model: chatBody.model,
        chatMode: chatBody.chatMode,
        chatModeConfig: chatBody.chatModeConfig
      };

      // Create a new abort controller
      const abortController = new AbortController();
      chatAbortControllers[chatId] = abortController;

      // Notify renderer that stream is starting
      event.sender.send(ChatEvents.CHAT_STREAM_START, { chatId });

      // Make API request with auth token
      const response = await fetchWithAuth(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiRequestBody),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        event.sender.send(ChatEvents.CHAT_STREAM_ERROR, {
          chatId,
          error: `Server error: ${response.status} - ${errorText}`
        });
        return { success: false, error: `Server error: ${response.status}` };
      }

      // Check if response is a stream
      if (!response.body) {
        event.sender.send(ChatEvents.CHAT_STREAM_ERROR, {
          chatId,
          error: "No response body received"
        });
        return { success: false, error: "No response body received" };
      }

      // Process the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      // Response type detection variables
      let isServerSentEvents = false;
      let buffer = '';
      let isFirstChunk = true;

      try {
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;

          if (done) {
            // Signal that streaming is complete
            event.sender.send(ChatEvents.CHAT_STREAM_FINISH, { chatId });
            break;
          }

          // Parse the chunk
          const chunk = decoder.decode(value, { stream: true });
          
          // Only for the first chunk, try to detect the response format
          if (isFirstChunk) {
            isFirstChunk = false;
            // Simple heuristic: SSE usually starts with "data:" or "event:"
            isServerSentEvents = chunk.trimStart().startsWith('data:') || chunk.trimStart().startsWith('event:');
          }

          if (isServerSentEvents) {
            // Handle Server-Sent Events format
            buffer += chunk;
            
            // Process complete SSE events in the buffer
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || ''; // Keep the incomplete event in the buffer
            
            for (const eventText of lines) {
              if (!eventText.trim()) continue;
              
              // Parse the SSE event
              const eventData = parseSSEEvent(eventText);
              
              if (eventData) {
                // Send the parsed event to the renderer
                event.sender.send(ChatEvents.CHAT_STREAM_CHUNK, {
                  chatId,
                  chunk: eventData
                });
              }
            }
          } else {
            // Handle direct JSON chunks
            try {
              const data = JSON.parse(chunk);
              event.sender.send(ChatEvents.CHAT_STREAM_CHUNK, {
                chatId,
                chunk: data
              });
            } catch (e) {
              // If not valid JSON, try to send as text
              event.sender.send(ChatEvents.CHAT_STREAM_CHUNK, {
                chatId,
                chunk: { text: chunk }
              });
            }
          }
        }
      } catch (error) {
        // Handle stream processing errors
        const errorMessage = error instanceof Error ? error.message : 'Unknown streaming error';
        if (!abortController.signal.aborted) {
          event.sender.send(ChatEvents.CHAT_STREAM_ERROR, {
            chatId,
            error: errorMessage
          });
        }
      } finally {
        // Clean up when done
        delete chatAbortControllers[chatId];
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      event.sender.send(ChatEvents.CHAT_STREAM_ERROR, {
        chatId,
        error: errorMessage
      });
      return { success: false, error: errorMessage };
    }
  });

  // Handler to cancel an active chat stream
  ipcMain.handle(ChatEvents.CANCEL_CHAT, async (event: IpcMainInvokeEvent, chatId: string) => {
    try {
      if (chatAbortControllers[chatId]) {
        chatAbortControllers[chatId].abort();
        delete chatAbortControllers[chatId];
        return { success: true };
      }
      return { success: false, error: 'No active chat stream found for this ID' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error canceling chat' };
    }
  });
}

/**
 * Parse an SSE event string into an object
 */
function parseSSEEvent(eventText: string): any {
  const lines = eventText.split('\n');
  let data = '';
  let event = '';
  
  for (const line of lines) {
    if (line.startsWith('data:')) {
      data += line.substring(5).trim() + '\n';
    } else if (line.startsWith('event:')) {
      event = line.substring(6).trim();
    }
  }
  
  if (data) {
    // Remove the trailing newline
    data = data.substring(0, data.length - 1);
    
    try {
      // Try to parse as JSON
      return JSON.parse(data);
    } catch (e) {
      // If not valid JSON, return as text
      return { text: data, event };
    }
  }
  
  return null;
}