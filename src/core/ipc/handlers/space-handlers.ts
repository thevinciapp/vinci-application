import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { Space } from '@/src/types';
import {
  updateSpace,
  updateSpaceModel,
  setActiveSpaceInAPI,
  createSpace,
  deleteSpace
} from '@/src/services/spaces/space-service';
import { fetchConversations } from '@/src/services/conversations/conversation-service';
import { fetchMessages } from '@/src/services/messages/message-service';
import { SpaceEvents } from '../constants';

interface SpaceResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Register space-related IPC handlers
 */
export function registerSpaceHandlers() {
  ipcMain.handle(SpaceEvents.GET_SPACE_CONVERSATIONS, async (_event: IpcMainInvokeEvent, spaceId: string): Promise<SpaceResponse> => {
    try {
      const conversations = await fetchConversations(spaceId);
      return { success: true, data: conversations };
    } catch (error) {
      console.error('[ELECTRON] Error in get-space-conversations handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(SpaceEvents.UPDATE_SPACE, async (_event: IpcMainInvokeEvent, spaceId: string, spaceData: Partial<Space>): Promise<SpaceResponse> => {
    try {
      const updatedSpace = await updateSpace(spaceId, spaceData);
      return { success: true, data: updatedSpace };
    } catch (error) {
      console.error('[ELECTRON] Error in update-space handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(SpaceEvents.UPDATE_SPACE_MODEL, async (_event: IpcMainInvokeEvent, spaceId: string, modelId: string, provider: string): Promise<SpaceResponse> => {
    try {
      await updateSpaceModel(spaceId, modelId, provider);
      return { success: true };
    } catch (error) {
      console.error('[ELECTRON] Error in update-space-model handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(SpaceEvents.SET_ACTIVE_SPACE, async (_event: IpcMainInvokeEvent, spaceId: string): Promise<SpaceResponse> => {
    try {
      // Log the raw input from renderer
      console.log('[ELECTRON] set-active-space handler received raw input:', spaceId);
      
      // Ensure spaceId is a string
      const spaceIdStr = String(spaceId || '').trim();
      
      // Additional validation to ensure spaceId is provided and valid
      if (!spaceIdStr) {
        console.error('[ELECTRON] Invalid space ID in set-active-space handler after conversion:', spaceIdStr);
        return { success: false, error: 'Space ID is required' };
      }
      
      console.log('[ELECTRON] set-active-space handler calling setActiveSpace with ID:', spaceIdStr);
      
      const result = await setActiveSpaceInAPI(spaceIdStr);
      console.log('[ELECTRON] setActiveSpace result:', result);
      return { success: true, data: result };
    } catch (error) {
      console.error('[ELECTRON] Error in set-active-space handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}
