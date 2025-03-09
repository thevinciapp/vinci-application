import { useModalHotkey, useCommandCenter, CommandType } from "@/hooks/useCommandCenter";
import { useHotkeys } from "react-hotkeys-hook";
import { useEffect } from "react";

/**
 * Component that registers keyboard shortcuts for specific command types
 * This can be placed anywhere in your component tree, typically near the root
 */
export function CommandShortcuts() {
  const { toggleCommandCenter, openCommandType } = useCommandCenter();

  // Register regular in-app shortcut
  useHotkeys('meta+k', (event) => {
    event.preventDefault();
    toggleCommandCenter();
  }, {
    enableOnFormTags: true,
    enableOnContentEditable: true
  }); 
  
  // Listen for toggle command center events from Electron
  useEffect(() => {
    // Check if running in Electron
    if (typeof window !== 'undefined' && window.electronAPI) {
      // Main command center toggle listener
      const removeToggleListener = window.electronAPI.onToggleCommandCenter(() => {
        toggleCommandCenter();
      });
      
      // Command type selection listener
      const removeSetCommandTypeListener = window.electronAPI.onSetCommandType((_, commandType) => {
        openCommandType(commandType as CommandType);
      });
      
      // Register ability to open specific modals from Electron
      const openSpecificModal = (commandType: CommandType) => {
        if (typeof window.electronAPI !== 'undefined') {
          window.electronAPI.openCommandType(commandType);
        }
      };
      
      // Create global helper for modal opening that can be accessed from DevTools
      // This is helpful for debugging/testing
      if (typeof window !== 'undefined') {
        (window as any).__openModal = openSpecificModal;
      }
      
      // Clean up listeners on unmount
      return () => {
        if (removeToggleListener) removeToggleListener();
        if (removeSetCommandTypeListener) removeSetCommandTypeListener();
        if (typeof window !== 'undefined') {
          delete (window as any).__openModal;
        }
      };
    }
  }, [toggleCommandCenter, openCommandType]);

  // Register in-app shortcuts for specific command types
  // These shortcuts only work when the app is already in focus
  useModalHotkey("spaces", "meta+s");
  useModalHotkey("conversations", "meta+b");
  useModalHotkey("models", "meta+m");
  useModalHotkey("actions", "meta+a");
  useModalHotkey("messages", "meta+e");
  useModalHotkey("background-tasks", "meta+t");
  useModalHotkey("suggestions", "meta+g");

  return null;
}

export default CommandShortcuts; 