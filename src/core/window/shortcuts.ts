import { globalShortcut, app } from 'electron';
import { ShortcutKey } from '../../../electron/types';
import { CommandType } from '../../types';
import { 
  createCommandCenterWindow, 
  getCommandCenterWindow,
  getContextCommandWindow,
  toggleCommandCenterWindow
} from './window-service';
import { useStore } from '../../store';
import { CommandCenterEvents } from '../ipc/constants';
import { sanitizeStateForIPC } from '../utils/state-utils';

/**
 * Register global shortcuts
 */
export function registerGlobalShortcuts() {
  const commandTypeShortcuts: Record<ShortcutKey, CommandType> = {
    "CommandOrControl+Option+A": "unified",
    "CommandOrControl+Option+S": "spaces",
    "CommandOrControl+Option+C": "conversations",
    "CommandOrControl+Option+M": "models",
    "CommandOrControl+Option+T": "backgroundTasks",
    "CommandOrControl+Option+G": "suggestions",
    "CommandOrControl+Option+H": "actions",
    "CommandOrControl+Option+Q": "chatModes",
    "CommandOrControl+Option+W": "messageSearch",
    "CommandOrControl+Option+E": "similarMessages",
  } as const;

  let lastUsedShortcut: string | null = null;
  let lastUsedTime = 0;
  const SHORTCUT_TOGGLE_TIMEOUT = 1500;

  Object.entries(commandTypeShortcuts).forEach(([shortcut, commandType]) => {
    globalShortcut.register(shortcut as ShortcutKey, async () => {
      try {
        const now = Date.now();
        const isSameShortcut = shortcut === lastUsedShortcut;
        const isWithinToggleTime = (now - lastUsedTime) < SHORTCUT_TOGGLE_TIMEOUT;
        const shouldToggleOff = isSameShortcut && isWithinToggleTime;
      
        lastUsedShortcut = shortcut;
        lastUsedTime = now;

        console.log(`[ELECTRON] Shortcut ${shortcut} pressed for ${commandType} window`);
        
        // Get existing window for specific command type if it exists
        const window = getContextCommandWindow(commandType);

        // Handle toggle-off case (pressing same shortcut twice quickly)
        if (shouldToggleOff && window?.isVisible()) {
          console.log(`[ELECTRON] Hiding ${commandType} window (toggle)`);
          window.hide();
          return;
        }

        // Handle focus case (window exists but maybe not focused)
        if (window?.isVisible()) {
          console.log(`[ELECTRON] Focusing existing ${commandType} window`);
          window.focus();
          return;
        }

        // Create or show the window for this specific command type
        console.log(`[ELECTRON] Creating/showing ${commandType} window`);
        
        // Create a new window specifically for this command type
        const newWindow = await createCommandCenterWindow(commandType);
        
        if (!newWindow) {
          console.error(`[ELECTRON] Failed to create/show ${commandType} window`);
          return;
        }

        // Show and focus the window
        newWindow.show();
        newWindow.focus();
      } catch (error) {
        console.error(`[ELECTRON] Error handling shortcut for ${commandType}:`, error);
      }
    });
  });

  app.on("will-quit", () => globalShortcut.unregisterAll());
}