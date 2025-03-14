import { contextBridge } from "electron";
import { authApi } from './preload/api/auth';
import { commandCenterApi } from './preload/api/command-center';
import { appStateApi } from './preload/api/app-state';
import { spaceApi } from './preload/api/space';
import { messageApi } from './preload/api/messages';
import { ipcUtils } from './preload/utils/ipc';

console.log('[ELECTRON PRELOAD] Initializing preload script');

contextBridge.exposeInMainWorld("electron", {
  ...authApi,
  ...commandCenterApi,
  ...ipcUtils,
  ...appStateApi,
  ...spaceApi,
  ...messageApi,
});
