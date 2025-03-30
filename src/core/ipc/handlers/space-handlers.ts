import { ipcMain, IpcMainInvokeEvent } from 'electron';
import {
  updateSpace,
  updateSpaceModel,
  setActiveSpaceInAPI,
  createSpace,
  deleteSpace,
  fetchActiveSpace,
  fetchSpaces
} from '@/services/spaces/space-service';
import { fetchConversations } from '@/services/conversations/conversation-service';
import { SpaceEvents } from '@/core/ipc/constants';
import { SpaceResponse } from '@/types/space';
import { Space } from '@/types/space';
import { fetchMessages } from '@/services/messages/message-service';
import { Message } from '@/types/message';
import { Conversation } from '@/types/conversation';

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
      const spaceIdStr = String(spaceId || '').trim();
      
      if (!spaceIdStr) {
        return { success: false, error: 'Space ID is required' };
      }
      
      await setActiveSpaceInAPI(spaceIdStr);
      const activeSpace = await fetchActiveSpace();
      
      if (!activeSpace) {
        return { success: false, error: 'Failed to fetch active space' };
      }

      const conversations = await fetchConversations(spaceIdStr);
      let firstConversationMessages: Message[] = [];
      
      if (conversations && conversations.length > 0) {
        firstConversationMessages = await fetchMessages(conversations[0].id);
      }

      const responseData = {
        space: activeSpace,
        conversations: conversations || [],
        messages: firstConversationMessages || []
      };

      ipcMain.emit(SpaceEvents.SPACE_UPDATED, null, responseData);
      
      return { 
        success: true, 
        data: responseData
      };
    } catch (error) {
      console.error('[ELECTRON] Error in set-active-space handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
  
  ipcMain.handle(SpaceEvents.CREATE_SPACE, async (_event: IpcMainInvokeEvent, spaceData: Partial<Space>): Promise<{
    success: boolean;
    data: {
      spaces: Space[];
      activeSpace: Space;
      conversations: Conversation[];
      messages: Message[];
    }   
  }> => {
    try {
      const spaceResponse = await createSpace(spaceData);
      return { success: true, data: spaceResponse };
    } catch (error) {
      console.error('[ELECTRON] Error in create-space handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
  
  ipcMain.handle(SpaceEvents.DELETE_SPACE, async (_event: IpcMainInvokeEvent, spaceId: string): Promise<{
    success: boolean;
    data: {
      spaces: Space[];
      activeSpace: Space | null;
      conversations: Conversation[];
      messages: Message[];
    }
  }> => {
    try {
      const response = await deleteSpace(spaceId);
      return { success: true, data: response };
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
