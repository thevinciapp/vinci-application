import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { Space } from '../../../types';
import {
  updateSpace,
  updateSpaceModel,
  setActiveSpaceInAPI,
  createSpace,
  deleteSpace,
  fetchActiveSpace,
  fetchSpaces
} from '../../../services/spaces/space-service';
import { fetchConversations } from '../../../services/conversations/conversation-service';
import { fetchMessages } from '../../../services/messages/message-service';
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

  ipcMain.handle(SpaceEvents.GET_ACTIVE_SPACE, async (_event: IpcMainInvokeEvent): Promise<Space | null> => {
    try {
      const activeSpace = await fetchActiveSpace();
      return activeSpace;
    } catch (error) {
      console.error('[ELECTRON] Error in get-active-space handler:', error);
      throw error;
    }
  });

  ipcMain.handle(SpaceEvents.UPDATE_SPACE, async (_event: IpcMainInvokeEvent, spaceId: string, spaceData: Partial<Space>): Promise<SpaceResponse> => {
    try {
      const updatedSpace = await updateSpace(spaceId, spaceData);
      
      // Emit an event to notify renderers that space has been updated
      ipcMain.emit(SpaceEvents.SPACE_UPDATED, null, { space: updatedSpace });
      
      return { success: true, data: updatedSpace };
    } catch (error) {
      console.error('[ELECTRON] Error in update-space handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle(SpaceEvents.UPDATE_SPACE_MODEL, async (_event: IpcMainInvokeEvent, spaceId: string, modelId: string, provider: string): Promise<SpaceResponse> => {
    try {
      await updateSpaceModel(spaceId, modelId, provider);
      
      // Fetch the updated space to emit the update event
      const updatedSpace = await fetchActiveSpace();
      if (updatedSpace) {
        ipcMain.emit(SpaceEvents.SPACE_UPDATED, null, { space: updatedSpace });
      }
      
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
      
      // Fetch the newly activated space to emit the update event
      const activeSpace = await fetchActiveSpace();
      if (activeSpace) {
        ipcMain.emit(SpaceEvents.SPACE_UPDATED, null, { space: activeSpace });
      }
      
      return { success: true, data: result };
    } catch (error) {
      console.error('[ELECTRON] Error in set-active-space handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
  
  ipcMain.handle(SpaceEvents.CREATE_SPACE, async (_event: IpcMainInvokeEvent, spaceData: Partial<Space>): Promise<SpaceResponse> => {
    try {
      const newSpace = await createSpace(spaceData);
      
      // Emit an event to notify renderers that spaces have been updated
      const allSpaces = await fetchSpaces();
      
      // If this is the first space, set it as active automatically
      if (allSpaces.length === 1) {
        await setActiveSpaceInAPI(newSpace.id);
        ipcMain.emit(SpaceEvents.SPACE_UPDATED, null, { space: newSpace });
      }
      
      return { success: true, data: newSpace };
    } catch (error) {
      console.error('[ELECTRON] Error in create-space handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
  
  ipcMain.handle(SpaceEvents.DELETE_SPACE, async (_event: IpcMainInvokeEvent, spaceId: string): Promise<SpaceResponse> => {
    try {
      await deleteSpace(spaceId);
      
      // Get the updated list of spaces
      const allSpaces = await fetchSpaces();
      
      // Get the new active space after deletion
      const activeSpace = await fetchActiveSpace();
      ipcMain.emit(SpaceEvents.SPACE_UPDATED, null, { space: activeSpace });
      
      return { success: true };
    } catch (error) {
      console.error('[ELECTRON] Error in delete-space handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
  
  ipcMain.handle(SpaceEvents.GET_SPACES, async (_event: IpcMainInvokeEvent): Promise<SpaceResponse> => {
    try {
      const spaces = await fetchSpaces();
      return { success: true, data: spaces };
    } catch (error) {
      console.error('[ELECTRON] Error in get-spaces handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}
