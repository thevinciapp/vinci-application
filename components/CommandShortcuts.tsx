import { useModalHotkey, useCommandCenter } from "@/hooks/useCommandCenter";
import { useHotkeys } from "react-hotkeys-hook";

/**
 * Component that registers keyboard shortcuts for specific command types
 * This can be placed anywhere in your component tree, typically near the root
 */
export function CommandShortcuts() {
  const { toggleCommandCenter } = useCommandCenter();

  useHotkeys('meta+k', (event) => {
    event.preventDefault();
    toggleCommandCenter();
  }, {
    enableOnFormTags: true,
    enableOnContentEditable: true
  }); 

  useModalHotkey("spaces", "meta+s");
  useModalHotkey("conversations", "meta+b");
  useModalHotkey("models", "meta+m");
  useModalHotkey("actions", "meta+a");
  useModalHotkey("messages", "meta+e");

  return null;
}

export default CommandShortcuts; 