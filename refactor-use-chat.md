Okay, let's create a plan to refactor the `useChat` hook implementation within `src/components/chat/chat-content-client.tsx` [cite: 11137] to utilize Electron's IPC mechanism instead of making direct API calls from the renderer process.

**Goal:** Move the responsibility of calling the `/api/chat` endpoint [cite: 11159] from the renderer process to the main process, using IPC for communication. This centralizes API interaction and authentication handling.

**Current State:**

* `chat-content-client.tsx` uses the `useChat` hook from `@ai-sdk/react`[cite: 11137, 11161].
* This hook is configured with an `api` endpoint (`${API_BASE_URL}/api/chat`)[cite: 11159].
* A `customFetch` function [cite: 11153] is provided to `useChat` which uses `window.electron.invoke(AuthEvents.GET_AUTH_TOKEN)` [cite: 11148] to get the auth token before making the actual `Workspace` request.
* Messages are sourced from `useRendererStore` [cite: 11138] (Note: Assuming the previous request to consolidate stores is followed, this should ideally change to use the main store state later).
* File references are managed by `useFileReferences` [cite: 11145] and included in the `useChat` body[cite: 11160].

**Refactoring Plan:**

1.  **Define New IPC Events for Chat:**
    * Open `src/core/ipc/constants.ts`[cite: 12611].
    * Ensure `ChatEvents` exist, or add them if they don't. We need events for initiating the chat and receiving stream data/status back from the main process. Example:
        ```typescript
        export const ChatEvents = {
          INITIATE_CHAT_STREAM: 'chat:initiate-stream', // Renderer -> Main
          CHAT_STREAM_CHUNK: 'chat:stream-chunk',       // Main -> Renderer
          CHAT_STREAM_FINISH: 'chat:stream-finish',     // Main -> Renderer
          CHAT_STREAM_ERROR: 'chat:stream-error',       // Main -> Renderer
          // Add other chat-related events if needed
        } as const;
        ```
    * Update the `IpcEventType` union in `electron/preload/utils/ipc.ts` [cite: 10558] to include `ChatEventType`.

2.  **Update Preload API:**
    * Open `electron/preload/api/messages.ts` [cite: 10509] or create a new `electron/preload/api/chat.ts`.
    * **Add `initiateChatStream` Function:**
        * This function will be called by the refactored renderer hook.
        * It should take the chat payload (messages, config like `spaceId`, `conversationId`, `provider`, `model`, `files`, etc.) as an argument.
        * It will use `ipcRenderer.invoke(ChatEvents.INITIATE_CHAT_STREAM, payload)`[cite: 10564].
    * **Add Listeners for Stream Events:**
        * Expose functions using `ipcUtils.on` [cite: 10562] for `CHAT_STREAM_CHUNK`, `CHAT_STREAM_FINISH`, and `CHAT_STREAM_ERROR`. These will allow the renderer hook to subscribe to updates sent from the main process. Example:
          ```typescript
          // In preload/api/chat.ts or messages.ts
          import { ipcRenderer } from 'electron';
          import { ChatEvents } from '@/core/ipc/constants';
          import { ipcUtils } from '../utils/ipc';

          export const chatApi = {
            initiateChatStream: (payload: any) =>
              ipcRenderer.invoke(ChatEvents.INITIATE_CHAT_STREAM, payload),

            onChatStreamChunk: (callback: (chunk: any) => void) =>
              ipcUtils.on(ChatEvents.CHAT_STREAM_CHUNK, (_event, response) => {
                if (response.success && response.data) {
                  callback(response.data);
                }
              }),
              
            onChatStreamFinish: (callback: () => void) =>
              ipcUtils.on(ChatEvents.CHAT_STREAM_FINISH, (_event, response) => {
                 if (response.success) callback();
              }),

            onChatStreamError: (callback: (error: string) => void) =>
              ipcUtils.on(ChatEvents.CHAT_STREAM_ERROR, (_event, response) => {
                 if (!response.success) callback(response.error || 'Unknown stream error');
              }),
            
            // Make sure to expose off/removeAllListeners equivalents via ipcUtils
            offChatStreamChunk: (callback: Function) => ipcUtils.off(ChatEvents.CHAT_STREAM_CHUNK, callback as any),
            offChatStreamFinish: (callback: Function) => ipcUtils.off(ChatEvents.CHAT_STREAM_FINISH, callback as any),
            offChatStreamError: (callback: Function) => ipcUtils.off(ChatEvents.CHAT_STREAM_ERROR, callback as any),
          };
          ```
    * Update `electron/preload.ts` [cite: 10589] to expose the new `chatApi`.

3.  **Create Main Process Chat Handlers:**
    * Create a new file like `src/core/ipc/handlers/chat-handlers.ts`.
    * Implement a handler for `ChatEvents.INITIATE_CHAT_STREAM`:
        * This handler will receive the payload sent from the renderer (messages, config).
        * It should use `WorkspaceWithAuth` [cite: 9602] (or similar main-process function) to call the backend chat API (`${API_BASE_URL}/api/chat`). Pass the necessary body parameters received from the renderer.
        * Process the streaming response from the API.
        * For each data chunk received:
            * Use `event.sender.send(ChatEvents.CHAT_STREAM_CHUNK, { success: true, data: chunk })`.
        * On stream completion:
            * Send `event.sender.send(ChatEvents.CHAT_STREAM_FINISH, { success: true })`.
            * **(Crucial for State Sync):** Update the main Zustand store (`useMainStore` [cite: 9878]) with the *complete* assistant message received. This should trigger the `broadcastStateUpdate` [cite: 9112, 9139, 9168] mechanism to update all renderers.
        * On error:
            * Send `event.sender.send(ChatEvents.CHAT_STREAM_ERROR, { success: false, error: errorMessage })`.
    * Register these handlers in `src/core/ipc/ipc-handlers.ts`[cite: 9211].

4.  **Refactor `src/components/chat/chat-content-client.tsx`:**
    * **Remove `useChat`:** Delete the import and usage of the `@ai-sdk/react`'s `useChat` hook.
    * **Remove `customFetch`:** This logic now resides in the main process handler via `WorkspaceWithAuth`.
    * **Create Custom Hook/Logic:** Implement local state management for the chat interaction within the component or a new custom hook (e.g., `useIpcChat`).
        * **State:**
            * `messages`: Source this primarily from the global state (`useMainState` or `useRendererStore` depending on the chosen state architecture).
            * `input`: Use `useState` for the input field value.
            * `status`: Use `useState` to track the chat status ('idle', 'loading', 'error').
            * `streamingMessage`: Use `useState` to hold the assistant message being built from stream chunks.
    * **Modify `handleSubmit`:**
        * Prevent submission if `status` is 'loading'.
        * Set `status` to 'loading'.
        * Append the user's message (from `input`) optimistically to the local display *and/or* send an IPC request to update the main store immediately.
        * Get current messages from the store/state.
        * Construct the payload including messages, `activeSpace`, `activeConversation`, `fileReferencesMap`[cite: 11160], `searchMode`, `chatMode`, etc.
        * Call `window.electron.initiateChatStream(payload)`.
        * Clear the `input` state.
        * Clear `fileReferences`[cite: 11145, 11160].
    * **Handle Stream Events:**
        * Use `useEffect` to subscribe to `onChatStreamChunk`, `onChatStreamFinish`, `onChatStreamError` using the preload APIs.
        * `onChatStreamChunk`: Append received `chunk.data` to the `streamingMessage` state.
        * `onChatStreamFinish`:
            * Signal the end of streaming. The *final* message state should arrive via the main store update (`AppStateEvents.STATE_UPDATED`) triggered by the main process handler after it updates the store.
            * Clear `streamingMessage` state.
            * Set `status` to 'idle'.
        * `onChatStreamError`: Set `status` to 'error', display the error message (e.g., using `toast` [cite: 11139]).
    * **Cleanup:** Return a cleanup function from `useEffect` to unsubscribe from all stream event listeners (`offChatStreamChunk`, etc.).
    * **Display Messages:** Modify `ChatMessages` [cite: 11242] or the rendering logic:
        * Render messages from the main store/state.
        * If `status` is 'loading', append the `streamingMessage` content as a temporary assistant message, possibly using the `<StreamStatus>` component[cite: 11430].

5.  **State Management Considerations:**
    * **Messages:** The *source of truth* for the message list should be the main process store (`useMainStore`). The renderer (`ChatMessages`) should primarily react to updates pushed via `AppStateEvents.STATE_UPDATED`. The local `streamingMessage` state is only for displaying the in-progress response.
    * **Main Store Update:** Ensure the `ChatEvents.CHAT_STREAM_FINISH` handler in the *main process* correctly updates the `messages` array in the `useMainStore` state before broadcasting the update.

This refactoring moves the core API interaction logic to the main process, centralizes authentication handling, and relies on IPC for communication, aligning better with Electron's architecture. Remember to adapt the state management parts based on whether you have fully implemented the single main process store architecture.