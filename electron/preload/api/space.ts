import { ipcRenderer } from 'electron';
import { SpaceEvents } from '@/src/core/ipc/constants';
import { IpcResponse } from '@/src/types';

export const spaceApi = {
  getSpaces: async () => {
    try {
      const response = await ipcRenderer.invoke(SpaceEvents.GET_SPACES);
      return response.success ? response.data : null;
    } catch (error) {
      console.error('[ELECTRON PRELOAD] getSpaces error:', error);
      return null;
    }
  },

  getSpaceConversations: async (spaceId: string) => {
    const response = await ipcRenderer.invoke(SpaceEvents.GET_SPACE_CONVERSATIONS, { spaceId });
    return response.success ? response.data : null;
  },

  updateSpace: async (spaceId: string, spaceData: any) => {
    const response = await ipcRenderer.invoke(SpaceEvents.UPDATE_SPACE, { spaceId, ...spaceData });
    return response.success ? response.data : null;
  },

  updateSpaceModel: async (spaceId: string, model: string, provider: string) => {
    console.log('[ELECTRON PRELOAD] Calling updateSpaceModel:', spaceId, model, provider);
    try {
      const response = await ipcRenderer.invoke(SpaceEvents.UPDATE_SPACE_MODEL, { spaceId, model, provider });
      console.log('[ELECTRON PRELOAD] updateSpaceModel result:', response);
      return response.success ? response.data : null;
    } catch (error) {
      console.error('[ELECTRON PRELOAD] updateSpaceModel error:', error);
      throw error;
    }
  },

  setActiveSpace: async (spaceId: string) => {
    try {
      console.log('[ELECTRON PRELOAD] setActiveSpace called with:', spaceId);
      const response = await ipcRenderer.invoke(SpaceEvents.SET_ACTIVE_SPACE, { spaceId });
      console.log('[ELECTRON PRELOAD] setActiveSpace result:', response);
      return response;
    } catch (error) {
      console.error('[ELECTRON PRELOAD] setActiveSpace error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  getActiveSpace: async () => {
    try {
      return await ipcRenderer.invoke(SpaceEvents.GET_ACTIVE_SPACE);
    } catch (error) {
      console.error('[ELECTRON PRELOAD] getActiveSpace error:', error);
      throw error;
    }
  },

  createSpace: async (spaceData: any) => {
    try {
      const response = await ipcRenderer.invoke(SpaceEvents.CREATE_SPACE, spaceData);
      return response;
    } catch (error) {
      console.error('[ELECTRON PRELOAD] createSpace error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  deleteSpace: async (spaceId: string) => {
    try {
      const response = await ipcRenderer.invoke(SpaceEvents.DELETE_SPACE, spaceId);
      return response;
    } catch (error) {
      console.error('[ELECTRON PRELOAD] deleteSpace error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
};
