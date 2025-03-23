import { app, safeStorage, BrowserWindow } from 'electron';
import { join } from 'path';
import { isMac } from '@utils/env-utils';
import { registerIpcHandlers } from '@core/ipc/ipc-handlers';
import { registerGlobalShortcuts } from '@core/window/shortcuts';
import { loadAuthData, refreshTokens } from '@core/auth/auth-service';
import { createMainWindow, preloadCommandWindows } from '@core/window/window-service';
import { fetchInitialAppData } from '@services/app-data/app-data-service';
import { useStore } from '@/store';

const ROUTES = {
  SIGN_IN: '/sign-in',
  PROTECTED: '/protected'
} as const;

const APP_CONFIG = {
  DEV_SERVER: 'http://localhost:5173',
  IS_DEV: process.env.NODE_ENV === 'development'
} as const;

if (isMac()) app.dock.show();

function getAppUrl(route: string): string {
  const baseUrl = APP_CONFIG.IS_DEV 
    ? APP_CONFIG.DEV_SERVER 
    : `file://${join(__dirname, '../renderer/index.html')}`;
  return `${baseUrl}#${route}`;
}

async function handleAuth(): Promise<boolean> {
  const store = useStore.getState();
  const { accessToken, refreshToken, tokenExpiryTime } = await loadAuthData(safeStorage);
  
  if (tokenExpiryTime) store.setTokenExpiryTime(tokenExpiryTime);
  if (!accessToken && !refreshToken) return false;
  if (!accessToken && refreshToken) return await refreshTokens(safeStorage);
  
  return true;
}

async function handleAppData(): Promise<boolean> {
  try {
    const data = await fetchInitialAppData();
    if (data.error) return false;
    
    useStore.getState().setAppState(data);
    return true;
  } catch {
    return false;
  }
}

async function startApp() {
  registerIpcHandlers();
  registerGlobalShortcuts();

  const isAuthenticated = await handleAuth();
  if (!isAuthenticated) {
    const mainWindow = await createMainWindow();
    if (!mainWindow) {
      console.error('Failed to create main window');
      app.quit();
      return;
    }
    mainWindow.webContents.on('did-fail-load', console.error);
    if (APP_CONFIG.IS_DEV) mainWindow.webContents.openDevTools();
    mainWindow.loadURL(getAppUrl(ROUTES.SIGN_IN));
    return;
  }

  const hasData = await handleAppData();
  if (!hasData) {
    const mainWindow = await createMainWindow();
    if (!mainWindow) {
      console.error('Failed to create main window');
      app.quit();
      return;
    }
    mainWindow.webContents.on('did-fail-load', console.error);
    if (APP_CONFIG.IS_DEV) mainWindow.webContents.openDevTools();
    mainWindow.loadURL(getAppUrl(ROUTES.SIGN_IN));
    return;
  }

  const [mainWindow] = await Promise.all([
    createMainWindow(),
    preloadCommandWindows()
  ]);

  if (!mainWindow) {
    console.error('Failed to create main window');
    app.quit();
    return;
  }
  mainWindow.webContents.on('did-fail-load', console.error);
  if (APP_CONFIG.IS_DEV) {
    mainWindow.webContents.openDevTools();
  }
  mainWindow.loadURL(getAppUrl(ROUTES.PROTECTED));
}

function shutdown() {
  BrowserWindow.getAllWindows()
    .filter(window => window && !window.isDestroyed())
    .forEach(window => window?.destroy());
  app.quit();
}

app.whenReady().then(startApp);
app.on('window-all-closed', () => !isMac() && shutdown());
app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createMainWindow());
app.on('before-quit', shutdown);
if (isMac()) app.on('quit', shutdown);
