import { useModalHotkey, useCommandCenter } from "@/hooks/useCommandCenter";
import { useHotkeys } from "react-hotkeys-hook";
import { useEffect } from "react";

/**
 * Component that registers keyboard shortcuts for specific command types
 * This can be placed anywhere in your component tree, typically near the root
 */
export function CommandShortcuts() {
  const { toggleCommandCenter } = useCommandCenter();

  // Register regular in-app shortcut
  useHotkeys('meta+k', (event) => {
    event.preventDefault();
    toggleCommandCenter();
  }, {
    enableOnFormTags: true,
    enableOnContentEditable: true
  }); 
  
  // Listen for system-wide shortcut events from Electron
  useEffect(() => {
    // Check if running in Electron
    if (typeof window !== 'undefined' && window.electronAPI) {
      const removeListener = window.electronAPI.onOpenCommandCenter(() => {
        toggleCommandCenter();
      });
      
      // Clean up listener on unmount
      return () => {
        if (removeListener) removeListener();
      };
    }
  }, [toggleCommandCenter]);

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