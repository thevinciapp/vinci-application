import { contextBridge, ipcRenderer } from "electron";
import { authApi } from './preload/api/auth';
import { commandCenterApi } from './preload/api/command-center';
import { appStateApi } from './preload/api/app-state';
import { spaceApi } from './preload/api/space';
import { messageApi } from './preload/api/messages';
import { userApi } from './preload/api/user';
import { notificationApi } from './preload/api/notifications';
import { conversationApi } from './preload/api/conversations';
import { chatApi } from './preload/api/chat';
import { ipcUtils } from './preload/utils/ipc';

console.log('[ELECTRON PRELOAD] Initializing preload script');

const updatedAuthApi = {
  ...authApi,
  getAccessToken: () => ipcRenderer.invoke('get-access-token'),
  setAccessToken: (token: string) => ipcRenderer.invoke('set-access-token', token),
};

contextBridge.exposeInMainWorld("electron", {
  ...updatedAuthApi,
  ...commandCenterApi,
  ...ipcUtils,
  ...appStateApi,
  ...spaceApi,
  ...messageApi,
  ...userApi,
  ...notificationApi,
  ...conversationApi,
  ...chatApi,
});