import { globalShortcut, app } from 'electron';
import { CommandType, ShortcutKey } from '../../../electron/types';
import { 
  createCommandCenterWindow, 
  getCommandCenterWindow,
  setCommandType
} from './window-service';
import { useStore } from '@/src/store';
import { CommandCenterEvents } from '../ipc/constants';

/**
 * Register global shortcuts
 */
export function registerGlobalShortcuts() {
  const commandTypeShortcuts: Record<ShortcutKey, CommandType | null> = {
    "CommandOrControl+Option+A": null,
    "CommandOrControl+Option+S": "spaces",
    "CommandOrControl+Option+C": "conversations",
    "CommandOrControl+Option+M": "models",
    "CommandOrControl+Option+T": "backgroundTasks",
    "CommandOrControl+Option+G": "suggestions",
    "CommandOrControl+Option+H": "actions",
    "CommandOrControl+Option+Q": "chatModes",
    "CommandOrControl+Option+W": "messageSearch",
    "CommandOrControl+Option+E": "similarMessages",
  };

  // Track last shortcut and time for toggle behavior
  let lastUsedShortcut: string | null = null;
  let lastUsedTime = 0;
  const SHORTCUT_TOGGLE_TIMEOUT = 1500; // 1.5 seconds timeout for toggling with same shortcut

  Object.entries(commandTypeShortcuts).forEach(([shortcut, commandType]) => {
    globalShortcut.register(shortcut as ShortcutKey, () => {
      const now = Date.now();
      const isSameShortcut = shortcut === lastUsedShortcut;
      const isWithinToggleTime = (now - lastUsedTime) < SHORTCUT_TOGGLE_TIMEOUT;
      const shouldToggleOff = isSameShortcut && isWithinToggleTime;
      
      // Update tracking
      lastUsedShortcut = shortcut;
      lastUsedTime = now;

      console.log(`${shortcut} pressed - ${commandType || "general toggle"} (${shouldToggleOff ? 'toggle' : 'open/switch'})`);
      
      if (shouldToggleOff && getCommandCenterWindow()?.isVisible()) {
        // Toggle off when same shortcut is pressed within timeout window
        console.log(`[ELECTRON] Closing command center (toggle with same shortcut: ${shortcut})`);
        getCommandCenterWindow()?.hide();
        // State is automatically synchronized with electron-redux
        return;
      }
      
      if (getCommandCenterWindow()?.isVisible()) {
        getCommandCenterWindow()?.webContents.executeJavaScript('window.currentCommandType').then((currentType: string | null) => {
          if (commandType && commandType !== currentType) {
            console.log(`[ELECTRON] Switching command type from ${currentType} to ${commandType}`);
            const window = getCommandCenterWindow();
            if (window && !window.isDestroyed()) {
              window.webContents.send(CommandCenterEvents.SET_TYPE, { success: true, data: { type: commandType } });
            }
          } else {
            console.log(`[ELECTRON] Closing command center (same type: ${commandType})`);
            getCommandCenterWindow()?.hide();
          }
        }).catch((error) => {
          console.error('[ELECTRON] Error getting current command type:', error);
          if (commandType) {
            console.log(`[ELECTRON] Setting command type to ${commandType} after error`);
            setCommandType(commandType);
          } else {
            console.log('[ELECTRON] Closing command center after error');
            getCommandCenterWindow()?.hide();
            // State is automatically synchronized with electron-redux
          }
        });
      } else {
        createCommandCenterWindow().then((window) => {
          if (window && !window.isDestroyed()) {
            console.log(`[ELECTRON] Opening command center with type: ${commandType || 'default'}`);
            if (commandType) {
              window.webContents.send(CommandCenterEvents.SET_TYPE, { success: true, data: { type: commandType } });
            }
            window.show();
            window.focus();
            const state = useStore.getState();
            window.webContents.send(CommandCenterEvents.SYNC_STATE, { success: true, data: state });
          }
        });
      }
    });
  });

  app.on("will-quit", () => globalShortcut.unregisterAll());
}