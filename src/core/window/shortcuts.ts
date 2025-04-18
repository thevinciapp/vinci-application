import { globalShortcut, app, BrowserWindow } from 'electron';
import { CommandType, ShortcutKey } from '@/features/command-palette/model/types';
import { 
  createCommandCenterWindow, 
  getContextCommandWindow,
  getAllVisibleCommandWindows,    
  getWindowState
} from './window-service';

interface ShortcutState {
  activeCommandType: CommandType | null;
  lastUsedShortcut: string | null;
  lastUsedTime: number;
}

const SHORTCUT_CONFIG = {
  TOGGLE_TIMEOUT: 1500,
  FOCUS_DELAY: 50
} as const;

const COMMAND_SHORTCUTS: Record<ShortcutKey, CommandType> = {
  "CommandOrControl+Option+S": "spaces",
  "CommandOrControl+Option+C": "conversations",
  "CommandOrControl+Option+M": "models",
  "CommandOrControl+Option+T": "backgroundTasks",
  "CommandOrControl+Option+G": "suggestions",
  "CommandOrControl+Option+H": "actions",
  "CommandOrControl+Option+Q": "chatModes",
  "CommandOrControl+Option+W": "messageSearch",
  "CommandOrControl+Option+E": "similarMessages",
  "CommandOrControl+Option+A": "actions",
} as const;

function hideAllWindowsExcept(commandType: CommandType) {
  Array.from(getWindowState().commandWindows.entries()).forEach(([type, win]) => {
    if (win && !win.isDestroyed() && win.isVisible() && type !== commandType) {
      win.hide();
    }
  });
}

function focusWindowWithDelay(window: BrowserWindow) {
  window.focus();
  window.showInactive();
  
  setTimeout(() => {
    if (!window.isDestroyed()) {
      window.focus();
    }
  }, SHORTCUT_CONFIG.FOCUS_DELAY);
}

async function showExistingWindow(window: BrowserWindow, commandType: CommandType) {
  hideAllWindowsExcept(commandType);
  focusWindowWithDelay(window);
}

async function createAndShowNewWindow(commandType: CommandType) {
  const newWindow = await createCommandCenterWindow(commandType);
  if (newWindow) {
    hideAllWindowsExcept(commandType);
    focusWindowWithDelay(newWindow);
  }
  return newWindow;
}

function shouldCloseWindow(
  shortcut: string, 
  commandType: CommandType, 
  state: ShortcutState, 
  isWindowVisible: boolean
): boolean {
  const now = Date.now();
  const isSameShortcut = shortcut === state.lastUsedShortcut;
  const isWithinToggleTime = (now - state.lastUsedTime) < SHORTCUT_CONFIG.TOGGLE_TIMEOUT;
  
  return (isSameShortcut && isWithinToggleTime && isWindowVisible) || 
         (commandType === state.activeCommandType);
}

async function handleShortcutPress(
  shortcut: ShortcutKey, 
  commandType: CommandType, 
  state: ShortcutState
) {
  const window = getContextCommandWindow(commandType);
  const isWindowVisible = window?.isVisible() || false;

  if (shouldCloseWindow(shortcut, commandType, state, isWindowVisible)) {
    window?.hide();
    state.activeCommandType = null;
    state.lastUsedShortcut = null;
    return;
  }

  getAllVisibleCommandWindows().forEach(([type, win]) => {
    if (type !== commandType) win.hide();
  });

  if (window && !window.isDestroyed()) {
    await showExistingWindow(window, commandType);
  } else {
    await createAndShowNewWindow(commandType);
  }

  state.activeCommandType = commandType;
  state.lastUsedShortcut = shortcut;
  state.lastUsedTime = Date.now();
}

export function registerGlobalShortcuts() {
  const shortcutState: ShortcutState = {
    activeCommandType: null,
    lastUsedShortcut: null,
    lastUsedTime: 0
  };

  Object.entries(COMMAND_SHORTCUTS).forEach(([shortcut, commandType]) => {
    globalShortcut.register(shortcut as ShortcutKey, async () => {
      try {
        await handleShortcutPress(shortcut as ShortcutKey, commandType, shortcutState);
      } catch (error) {
        console.error(`[ELECTRON] Error handling shortcut for ${commandType}:`, error);
      }
    });
  });

  app.on("will-quit", () => globalShortcut.unregisterAll());
}