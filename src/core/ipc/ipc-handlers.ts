import { ipcMain, BrowserWindow } from 'electron';
import { store } from '../../store';
import { CommandType, DialogData, Space, AppState } from '../../../electron/types';
import { 
  updateSpaces, 
  setActiveSpace, 
  updateConversations, 
  updateMessages, 
  setUser 
} from '../../store/actions';
import { 
  setCommandType, 
  toggleCommandCenterWindow, 
  createCommandCenterWindow, 
  getCommandCenterWindow,
  setDialogState
} from '../window/window-service';
import { 
  fetchConversations,
  updateConversation,
  createConversation,
  deleteConversation
} from '../../services/conversations/conversation-service';

import {
  fetchMessages,
  sendChatMessage,
  deleteMessage,
  updateMessage
} from '../../services/messages/message-service';

import {
  updateSpace,
  updateSpaceModel,
  setActiveSpaceInAPI,
  createSpace,
  deleteSpace
} from '../../services/spaces/space-service';

import {
  searchAllMessages
} from '../../services/search/search-service';

import {
  signUp,
  resetPassword
} from '../../services/user/user-service';
import {
  redirectToSignIn,
  refreshTokens,
  saveAuthData,
  API_BASE_URL
} from '../auth/auth-service';

import {
  fetchInitialAppData,
  refreshAppData
} from '../../services/app-data/app-data-service';

/**
 * Register all IPC handlers for the application
 */
export function registerIpcHandlers() {
  // Register IPC handler for Redux actions from renderer processes
  ipcMain.on('redux-action', (event, action) => {
    console.log('[ELECTRON] Received Redux action from renderer:', action);
    store.dispatch(action);
  });

  // App State
  ipcMain.handle('get-app-state', async () => {
    try {
      const state = store.getState();
      if (!state.initialDataLoaded) {
        const freshData = await fetchInitialAppData();
        if (!freshData.error) {
          store.dispatch({ type: 'SET_APP_STATE', payload: { ...freshData, initialDataLoaded: true } });
          return { success: true, data: store.getState() };
        }
        return { success: false, error: freshData.error };
      }
      return { success: true, data: state };
    } catch (error) {
      console.error('[ELECTRON] Error getting app state:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Auth Routes
  ipcMain.handle('get-session', async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/session`, {
        headers: {
          'Authorization': `Bearer ${store.getState().accessToken}`
        }
      });
      return await response.json();
    } catch (error) {
      console.error('Error getting session:', error);
      return { error: 'Failed to get session' };
    }
  });

  ipcMain.handle('sign-up', async (_, email: string, password: string) => {
    try {
      return await signUp(email, password);
    } catch (error) {
      console.error('Error signing up:', error);
      return { error: 'Failed to sign up' };
    }
  });

  ipcMain.handle('reset-password', async (_, email: string) => {
    try {
      return await resetPassword(email);
    } catch (error) {
      console.error('Error resetting password:', error);
      return { error: 'Failed to reset password' };
    }
  });

  // Search Routes
  ipcMain.handle('search-messages', async (_, query: string) => {
    try {
      const messages = await searchAllMessages(query);
      return { status: 'success', data: messages };
    } catch (error) {
      console.error('Error searching messages:', error);
      return { status: 'error', error: 'Failed to search messages' };
    }
  });

  // Message Routes
  ipcMain.handle('send-chat-message', async (_, conversationId: string, message: string) => {
    try {
      const result = await sendChatMessage(conversationId, message);
      return { status: 'success', data: result };
    } catch (error) {
      console.error('Error sending chat message:', error);
      return { status: 'error', error: 'Failed to send message' };
    }
  });

  ipcMain.handle('delete-message', async (_, conversationId: string, messageId: string) => {
    try {
      const success = await deleteMessage(conversationId, messageId);
      return { status: 'success', data: { deleted: success } };
    } catch (error) {
      console.error('Error deleting message:', error);
      return { status: 'error', error: 'Failed to delete message' };
    }
  });

  ipcMain.handle('update-message', async (_, conversationId: string, messageId: string, content: string) => {
    try {
      const updatedMessage = await updateMessage(conversationId, messageId, content);
      return { status: 'success', data: updatedMessage };
    } catch (error) {
      console.error('Error updating message:', error);
      return { status: 'error', error: 'Failed to update message' };
    }
  });

  ipcMain.handle('refresh-app-data', async () => {
    return await refreshAppData();
  });

  ipcMain.handle('set-auth-tokens', async (event, newAccessToken, newRefreshToken) => {
    if (!newAccessToken || !newRefreshToken) {
      console.error('[ELECTRON] Empty tokens received');
      return false;
    }
    
    console.log('[ELECTRON] Auth tokens received');
    
    try {
      // First, save the auth data to secure storage
      await saveAuthData(newAccessToken, newRefreshToken);
      console.log('[ELECTRON] Auth tokens saved to secure storage');
      
      // Validate the tokens by making a test API call
      try {
        const validationResponse = await fetch(`${API_BASE_URL}/api/auth/session`, {
          headers: {
            'Authorization': `Bearer ${newAccessToken}`
          }
        });
        
        if (!validationResponse.ok) {
          console.error('[ELECTRON] Token validation failed with status:', validationResponse.status);
          return false;
        }
        
        const validationData = await validationResponse.json();
        if (validationData.status !== 'success') {
          console.error('[ELECTRON] Token validation returned error status:', validationData);
          return false;
        }
        
        console.log('[ELECTRON] Tokens validated successfully');
        
        // Update Redux store with user info if available
        if (validationData.data?.session?.user) {
          store.dispatch(setUser(validationData.data.session.user));
        }
      } catch (validationError) {
        console.error('[ELECTRON] Error validating tokens:', validationError);
        // Don't return false yet, still try to load app data
      }
      
      // Fetch initial app data with the new tokens
      try {
        console.log('[ELECTRON] Fetching initial app data with new tokens...');
        const freshData = await fetchInitialAppData();
        if (!freshData.error) {
          store.dispatch({ type: 'SET_APP_STATE', payload: freshData });
          console.log('[ELECTRON] Data refreshed after receiving auth tokens');
        } else {
          console.warn('[ELECTRON] Received error when fetching initial app data:', freshData.error);
        }
      } catch (dataError) {
        console.error('[ELECTRON] Failed to refresh data after receiving auth tokens:', dataError);
        // Continue despite this error, authentication itself succeeded
      }
      
      return true;
    } catch (error) {
      console.error('[ELECTRON] Error during auth setup:', error);
      return false;
    }
  });

  ipcMain.handle('get-auth-token', async () => {
    const state = store.getState();
    return state.accessToken || null;
  });

  ipcMain.handle('refresh-auth-tokens', async () => {
    const refreshed = await refreshTokens();
    if (refreshed) {
      return { 
        success: true, 
        accessToken: store.getState().accessToken,
        expiresAt: Date.now() + (60 * 60 * 1000) // 1 hour
      };
    }
    
    return { success: false, error: 'Failed to refresh tokens' };
  });

  ipcMain.handle('sign-out', async () => {
    try {
      await redirectToSignIn();
      console.log('[ELECTRON] User signed out successfully');
      return true;
    } catch (error) {
      console.error('[ELECTRON] Sign out failed:', error);
      return false;
    }
  });

  ipcMain.handle('get-space-conversations', async (event, spaceId: string) => {
    try {
      const conversations = await fetchConversations(spaceId);
      return { success: true, data: conversations };
    } catch (error) {
      console.error('[ELECTRON] Error in get-space-conversations handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('get-conversation-messages', async (event, conversationId: string) => {
    try {
      const messages = await fetchMessages(conversationId);
      return { success: true, data: messages };
    } catch (error) {
      console.error('[ELECTRON] Error in get-conversation-messages handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('update-space', async (event, spaceId: string, spaceData: Partial<Space>) => {
    try {
      const updatedSpace = await updateSpace(spaceId, spaceData);
      return { success: true, data: updatedSpace };
    } catch (error) {
      console.error('[ELECTRON] Error in update-space handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('update-space-model', async (event, spaceId: string, modelId: string, provider: string) => {
    try {
      await updateSpaceModel(spaceId, modelId, provider);
      return { success: true };
    } catch (error) {
      console.error('[ELECTRON] Error in update-space-model handler:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('set-active-space', async (event, spaceId) => {
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

  // 'sync-app-state' handler is no longer needed as electron-redux handles state synchronization

  ipcMain.on("open-dialog", (event, dialogType: string, data: DialogData) => {
    const commandCenterWindow = getCommandCenterWindow();
    if (commandCenterWindow?.isVisible()) {
      commandCenterWindow.webContents.send("open-dialog", dialogType, data);
    } else {
      createCommandCenterWindow().then(() => {
        const window = getCommandCenterWindow();
        window?.webContents.send("open-dialog", dialogType, data);
      });
    }
  });

  ipcMain.on("dialog-opened", () => { 
    setDialogState(true);
  });
  
  ipcMain.on("dialog-closed", () => { 
    setDialogState(false);
    const commandCenterWindow = getCommandCenterWindow();
    if (!commandCenterWindow?.isFocused()) {
      commandCenterWindow?.hide();
      // State is automatically synchronized with electron-redux
    }
  });

  ipcMain.on("toggle-command-center", () => {
    toggleCommandCenterWindow();
  });

  ipcMain.on("show-command-center", async () => {
    const window = await createCommandCenterWindow();
    window.show();
    window.focus();
  });

  ipcMain.on("close-command-center", () => {
    const commandCenterWindow = getCommandCenterWindow();
    if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
      commandCenterWindow.hide();
      // State is automatically synchronized with electron-redux
    }
  });

  ipcMain.on("set-command-type", (event, commandType: CommandType) => {
    setCommandType(commandType);
  });

  ipcMain.on("sync-command-center-state", (event, action: string, data?: any) => {
    BrowserWindow.getAllWindows().forEach((window) => {
      const commandCenterWindow = getCommandCenterWindow();
      if (!window.isDestroyed() && window !== commandCenterWindow) {
        window.webContents.send("sync-command-center-state", action, data);
      }
    });
  });

  ipcMain.on("refresh-command-center", () => {
    fetchInitialAppData().then((freshData) => {
      if (!freshData.error) {
        store.dispatch({ type: 'SET_APP_STATE', payload: freshData });
      }
      
      const commandCenterWindow = getCommandCenterWindow();
      if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
        commandCenterWindow.webContents.send("refresh-command-center");
      }
    });
  });

  ipcMain.on("command-type-check", (event, commandType: CommandType) => {
    const commandCenterWindow = getCommandCenterWindow();
    if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
      commandCenterWindow.webContents.send("check-command-type", commandType);
    }
  });
}