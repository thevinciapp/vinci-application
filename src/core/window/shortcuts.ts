import { globalShortcut, app, BrowserWindow } from 'electron';
import { ShortcutKey } from '../../../electron/types';
import { CommandType } from '../../types';
import { 
  createCommandCenterWindow, 
  getCommandCenterWindow,
  getContextCommandWindow,
  getAllVisibleCommandWindows,
  getWindowState  // Import this to access the window state
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

  // Track state globally for proper command handling across all shortcuts
  // This is crucial for the Raycast-style behavior
  let activeCommandType: CommandType | null = null;
  let lastUsedShortcut: string | null = null;
  let lastUsedTime = 0;
  const SHORTCUT_TOGGLE_TIMEOUT = 1500;
  
  // Log the initial state for debugging
  console.log('[ELECTRON] Initializing shortcuts, active command:', activeCommandType);

  Object.entries(commandTypeShortcuts).forEach(([shortcut, commandType]) => {
    globalShortcut.register(shortcut as ShortcutKey, async () => {
      try {
        const now = Date.now();
        const isSameShortcut = shortcut === lastUsedShortcut;
        const isWithinToggleTime = (now - lastUsedTime) < SHORTCUT_TOGGLE_TIMEOUT;
        
        // Get current window for this command if it exists
        const window = getContextCommandWindow(commandType);
        const isWindowVisible = window?.isVisible() || false;
        
        console.log(`[ELECTRON] Shortcut ${shortcut} pressed for ${commandType} window`);
        console.log(`[ELECTRON] Active command: ${activeCommandType}, Current visible: ${isWindowVisible}`);

        // CASE 1: Same shortcut was pressed twice quickly and window is visible - close it
        if (isSameShortcut && isWithinToggleTime && isWindowVisible) {
          console.log(`[ELECTRON] Closing ${commandType} window - same shortcut pressed twice`);
          window?.hide();
          activeCommandType = null;
          lastUsedShortcut = null;
          return;
        }
        
        // CASE 2: Same command as active command - close it
        // This is the primary case for when we press the same shortcut again to close
        if (commandType === activeCommandType) {
          console.log(`[ELECTRON] Closing ${commandType} window - active command pressed again`);
          window?.hide();
          activeCommandType = null;
          lastUsedShortcut = null;
          return;
        }
        
        // CASE 3: Different command than active one - switch to it
        // Hide any other visible command windows first
        const visibleWindows = getAllVisibleCommandWindows();
        visibleWindows.forEach(([type, win]) => {
          if (type !== commandType) {
            console.log(`[ELECTRON] Hiding window for ${type} before showing ${commandType}`);
            win.hide();
          }
        });
        
        // Show or create window for this command
        if (window && !window.isDestroyed()) {
          // If window exists but is hidden, show it
          console.log(`[ELECTRON] Showing existing window for ${commandType}`);
          
          // IMPORTANT: First HIDE all other windows to ensure no focus conflicts
          const windowState = getWindowState();
          for (const [type, win] of windowState.commandWindows.entries()) {
            if (win && !win.isDestroyed() && win.isVisible() && type !== commandType) {
              console.log(`[ELECTRON] Hiding another window: ${type}`);
              win.hide();
            }
          }
          
          // Then show our window - doing this in sequence prevents race conditions
          try {
            // Focus window BEFORE showing it to prevent focus-related issues
            window.focus();
            
            // Force window to be shown and stay open
            window.showInactive();
            setTimeout(() => {
              if (window && !window.isDestroyed()) {
                // Refocus after a small delay to ensure it gets focus
                window.focus();
                console.log(`[ELECTRON] Window ${commandType} focused after delay`);
              }
            }, 50);
          } catch (err) {
            console.error(`[ELECTRON] Error showing window for ${commandType}:`, err);
          }
        } else {
          // Create new window
          console.log(`[ELECTRON] Creating new window for ${commandType}`);
          try {
            const newWindow = await createCommandCenterWindow(commandType);
            if (newWindow) {
              // IMPORTANT: First HIDE all other windows to ensure no focus conflicts
              const windowState = getWindowState();
              for (const [type, win] of windowState.commandWindows.entries()) {
                if (win && !win.isDestroyed() && win.isVisible() && type !== commandType) {
                  console.log(`[ELECTRON] Hiding another window: ${type}`);
                  win.hide();
                }
              }
              
              // Focus window BEFORE showing it
              newWindow.focus();
              
              // Show window with delay to ensure it stays visible
              newWindow.showInactive();
              setTimeout(() => {
                if (newWindow && !newWindow.isDestroyed()) {
                  newWindow.focus();
                  console.log(`[ELECTRON] Window ${commandType} focused after creation`);
                }
              }, 50);
            }
          } catch (err) {
            console.error(`[ELECTRON] Error creating/showing window for ${commandType}:`, err);
          }
        }
        
        // Update active command and last used shortcut
        activeCommandType = commandType;
        lastUsedShortcut = shortcut;
        lastUsedTime = now;
      } catch (error) {
        console.error(`[ELECTRON] Error handling shortcut for ${commandType}:`, error);
      }
    });
  });

  app.on("will-quit", () => globalShortcut.unregisterAll());
}