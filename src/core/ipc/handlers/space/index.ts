import { ipcMain, IpcMainInvokeEvent, BrowserWindow } from 'electron';
import {
  updateSpace,
  updateSpaceModel,
  setActiveSpaceInAPI,
  createSpace,
  deleteSpace,
  fetchActiveSpace,
  fetchSpaces
} from '@/services/spaces/space-service';
import { fetchConversations } from 'features/chat/conversation-service';
import { SpaceEvents, AppStateEvents } from '@/core/ipc/constants';
import { IpcResponse } from '@/shared/types/ipc';
import { Space } from '@/entities/space/model/types';
import { fetchMessages } from 'features/chat/message-service';
import { Message } from '@/entities/message/model/types';
import { Conversation } from '@/entities/conversation/model/types';
import { useMainStore, getMainStoreState } from '@/store/main';
import { sanitizeStateForIPC } from '@/core/utils/state-utils';
import { Provider } from '@/entities/model/model/types';

function broadcastStateUpdate() {
  const state = getMainStoreState();
  const serializableState = sanitizeStateForIPC(state);
  BrowserWindow.getAllWindows().forEach((window: BrowserWindow) => {
    if (window && window.webContents && !window.webContents.isDestroyed()) {
      window.webContents.send(AppStateEvents.STATE_UPDATED, { success: true, data: serializableState });
    }
  });
}

export function registerSpaceHandlers() {
  ipcMain.handle(SpaceEvents.GET_SPACE_CONVERSATIONS, async (_event: IpcMainInvokeEvent, spaceId: string): Promise<IpcResponse<{ conversations: Conversation[] }>> => {
    try {
      const store = useMainStore.getState();
      if (store.activeSpace?.id === spaceId && store.conversations.length > 0) {
        return { success: true, data: { conversations: store.conversations } };
      }
      const conversations = await fetchConversations(spaceId);
      return { success: true, data: { conversations: conversations || [] } };
    } catch (error) {
      console.error('[ELECTRON] Error in get-space-conversations handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(SpaceEvents.GET_ACTIVE_SPACE, async (_event: IpcMainInvokeEvent): Promise<IpcResponse<{ space: Space | null }>> => {
    try {
      const store = useMainStore.getState();
      if (store.activeSpace) {
        return { success: true, data: { space: store.activeSpace } };
      }
      const activeSpace = await fetchActiveSpace();
      if (activeSpace) {
        useMainStore.setState({ activeSpace });
        return { success: true, data: { space: activeSpace } };
      } else {
        return { success: true, data: { space: null } };
      }
    } catch (error) {
      console.error('[ELECTRON] Error in get-active-space handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error fetching active space' };
    }
  });

  ipcMain.handle(SpaceEvents.UPDATE_SPACE, async (_event: IpcMainInvokeEvent, spaceId: string, spaceData: Partial<Space>): Promise<IpcResponse<null>> => {
    try {
      const updatedSpace = await updateSpace(spaceId, spaceData);
      
      useMainStore.setState(state => ({
        spaces: state.spaces.map(s => s.id === spaceId ? updatedSpace : s),
        activeSpace: state.activeSpace?.id === spaceId ? updatedSpace : state.activeSpace
      }));
      
      broadcastStateUpdate();
      
      return { success: true };
    } catch (error) {
      console.error('[ELECTRON] Error in update-space handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(SpaceEvents.UPDATE_SPACE_MODEL, async (_event: IpcMainInvokeEvent, spaceId: string, modelId: string, provider: string): Promise<IpcResponse<null>> => {
    try {
      await updateSpaceModel(spaceId, modelId, provider);

      useMainStore.setState(state => {
        const currentSpaces = state.spaces || [];
        const currentActiveSpace = state.activeSpace || null;
        const providerAsType = provider as Provider;

        const spaceIndex = currentSpaces.findIndex(s => s.id === spaceId);

        if (spaceIndex === -1) {
          console.warn(`[ELECTRON] UPDATE_SPACE_MODEL: Space with ID ${spaceId} not found in store.`);
          return state;
        }

        const updatedSpaceData = { 
          ...currentSpaces[spaceIndex], 
          model: modelId, 
          provider: providerAsType 
        };

        const newSpaces = [
          ...currentSpaces.slice(0, spaceIndex),
          updatedSpaceData,
          ...currentSpaces.slice(spaceIndex + 1),
        ];

        const newActiveSpace = currentActiveSpace?.id === spaceId
          ? { ...currentActiveSpace, model: modelId, provider: providerAsType }
          : currentActiveSpace;

        return {
          ...state,
          spaces: newSpaces,
          activeSpace: newActiveSpace
        };
      });

      broadcastStateUpdate();

      return { success: true };
    } catch (error) {
      console.error('[ELECTRON] Error in update-space-model handler:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error updating space model';
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle(SpaceEvents.SET_ACTIVE_SPACE, async (_event: IpcMainInvokeEvent, spaceId: string): Promise<IpcResponse<null>> => {
    try {
      const spaceIdStr = String(spaceId || '').trim();
      
      if (!spaceIdStr) {
        return { success: false, error: 'Space ID is required' };
      }
      
      await setActiveSpaceInAPI(spaceIdStr);
      const activeSpace = await fetchActiveSpace();
      
      if (!activeSpace) {
        console.warn(`[ELECTRON] Could not fetch space ${spaceIdStr} after setting it active.`);
        const allSpaces = await fetchSpaces();
        useMainStore.setState({ activeSpace: null, spaces: allSpaces || [], conversations: [], messages: [], activeConversation: null });
        broadcastStateUpdate();
        return { success: false, error: `Failed to activate space ${spaceIdStr}` };
      }

      const conversations = await fetchConversations(activeSpace.id);
      let messages: Message[] = [];
      let activeConversation: Conversation | null = null;
      if (conversations && conversations.length > 0) {
        activeConversation = conversations[0];
        messages = await fetchMessages(activeConversation.id);
      }

      useMainStore.setState({
        activeSpace,
        conversations: conversations || [],
        messages: messages || [],
        activeConversation
      });

      broadcastStateUpdate();
      return { success: true };
    } catch (error) {
      console.error('[ELECTRON] Error in set-active-space handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
  
  ipcMain.handle(SpaceEvents.CREATE_SPACE, async (_event: IpcMainInvokeEvent, spaceData: Partial<Space>): Promise<IpcResponse<{ id: string }>> => {
    try {
      const response = await createSpace(spaceData);

      useMainStore.setState({
        spaces: response.spaces,
        activeSpace: response.activeSpace,
        conversations: response.conversations || [],
        messages: response.messages || [],
        activeConversation: response.conversations?.[0] || null
      });

      broadcastStateUpdate();
      return { success: true, data: { id: response.activeSpace.id } };
    } catch (error) {
      console.error('[ELECTRON] Error in create-space handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
  
  ipcMain.handle(SpaceEvents.DELETE_SPACE, async (_event: IpcMainInvokeEvent, spaceId: string): Promise<IpcResponse<null>> => {
    try {
      const response = await deleteSpace(spaceId);

      useMainStore.setState({
        spaces: response.spaces,
        activeSpace: response.activeSpace,
        conversations: response.conversations || [],
        messages: response.messages || [],
        activeConversation: response.activeSpace ? (response.conversations?.[0] || null) : null
      });

      broadcastStateUpdate();
      return { success: true };
    } catch (error) {
      console.error('[ELECTRON] Error in delete-space handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
  
  ipcMain.handle(SpaceEvents.GET_SPACES, async (_event: IpcMainInvokeEvent): Promise<IpcResponse<{ spaces: Space[] }>> => {
    try {
      const store = useMainStore.getState();
      if (store.spaces.length > 0 && store.initialDataLoaded) {
        return { success: true, data: { spaces: store.spaces } };
      }
      const spaces = await fetchSpaces();
      useMainStore.setState({ spaces });
      return { success: true, data: { spaces: spaces || [] } };
    } catch (error) {
      console.error('[ELECTRON] Error in get-spaces handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error fetching spaces' };
    }
  });
}
