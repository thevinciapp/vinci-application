import { contextBridge, ipcRenderer } from "electron";
import { authApi } from './preload/api/auth';
import { commandCenterApi } from './preload/api/command-center';
import { appStateApi } from './preload/api/app-state';
import { spaceApi } from './preload/api/space';
import { messageApi } from './preload/api/messages';
import { userApi } from './preload/api/user';
import { notificationApi } from './preload/api/notifications';
import { conversationApi } from './preload/api/conversations';
import { ipcUtils } from './preload/utils/ipc';

const updatedAuthApi = {
  ...authApi,
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
});
