import { BrowserWindow } from 'electron';
import { CommandType } from '../../../electron/types';
import { useStore } from '../../store';
import { CommandCenterEvents } from '../ipc/constants';
import { join } from 'path';

let commandCenterWindow: BrowserWindow | null = null;
let isDialogOpen = false;

/**
 * Get the command center window instance
 */
export function getCommandCenterWindow(): BrowserWindow | null {
  return commandCenterWindow;
}

/**
 * Create a new command center window
 */
export async function createCommandCenterWindow(): Promise<BrowserWindow> {
  if (commandCenterWindow && !commandCenterWindow.isDestroyed()) {
    return commandCenterWindow;
  }

  const preloadPath = join(__dirname, 'preload.js');
  commandCenterWindow = new BrowserWindow({
    width: 680,
    height: 600,
    show: false,
    frame: false,
    transparent: true,
    resizable: true,
    fullscreenable: false,
    alwaysOnTop: true,
    hasShadow: false,
    titleBarStyle: 'customButtonsOnHover',
    titleBarOverlay: false,
    trafficLightPosition: { x: -100, y: -100 },
    vibrancy: 'under-window',
    visualEffectState: 'active',
    skipTaskbar: true,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  await commandCenterWindow.loadURL(`${process.env.APP_BASE_URL}/command-center`);

  commandCenterWindow.webContents.once('did-finish-load', () => {
    if (!commandCenterWindow || commandCenterWindow.isDestroyed()) return;
    const state = useStore.getState();
    commandCenterWindow.webContents.send(CommandCenterEvents.SYNC_STATE, { success: true, data: state });
  });
  return commandCenterWindow;
}

/**
 * Toggle the command center window visibility
 */
export function toggleCommandCenterWindow(): void {
  if (!commandCenterWindow || commandCenterWindow.isDestroyed()) {
    createCommandCenterWindow().then(window => {
      window.show();
      window.focus();
    });
    return;
  }

  if (commandCenterWindow.isVisible()) {
    commandCenterWindow.hide();
  } else {
    commandCenterWindow.show();
    commandCenterWindow.focus();
  }
}

/**
 * Set the dialog state
 */
export function setDialogState(isOpen: boolean): void {
  isDialogOpen = isOpen;
}

/**
 * Get the dialog state
 */
export function getDialogState(): boolean {
  return isDialogOpen;
}

/**
 * Set the command type
 */
export function setCommandType(type: CommandType): void {
  if (!commandCenterWindow || commandCenterWindow.isDestroyed()) return;
  commandCenterWindow.webContents.send(CommandCenterEvents.SET_TYPE, { success: true, data: { type } });
  commandCenterWindow.focus();
}
