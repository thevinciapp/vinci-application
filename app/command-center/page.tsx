'use client';

import { useEffect } from 'react';
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, 
  CommandItem, CommandList, CommandSeparator, CommandShortcut } from 'vinci-ui';

/**
 * Lightweight command center page
 * This is loaded in a separate window when triggered by global shortcut
 */
export default function CommandCenterPage() {
  // Close command center function
  const closeCommandCenter = () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.closeCommandCenter();
    }
  };

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeCommandCenter();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-focus when loaded
  useEffect(() => {
    const input = document.querySelector('input');
    if (input) {
      input.focus();
    }
  }, []);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-transparent">
      {/* Transparent overlay that closes on click */}
      <div 
        className="absolute inset-0 z-0" 
        onClick={closeCommandCenter}
      />
      
      {/* Command dialog */}
      <div className="relative z-10 w-[640px] max-h-[70vh] rounded-xl overflow-hidden bg-black/20 border border-white/[0.08] backdrop-filter backdrop-blur-xl shadow-lg">
        <Command className="rounded-t-xl overflow-hidden">
          <CommandInput placeholder="Type a command or search..." autoFocus />
          <CommandList className="max-h-[400px] overflow-y-auto">
            <CommandEmpty>No results found.</CommandEmpty>
            
            <CommandGroup heading="Suggestions">
              <CommandItem>
                <span>Create new chat</span>
                <CommandShortcut>⌘N</CommandShortcut>
              </CommandItem>
              <CommandItem>
                <span>Show files</span>
                <CommandShortcut>⌘F</CommandShortcut>
              </CommandItem>
              <CommandItem>
                <span>Settings</span>
                <CommandShortcut>⌘,</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            
            <CommandSeparator />
            
            <CommandGroup heading="Spaces">
              <CommandItem>
                <span>My Workspace</span>
              </CommandItem>
              <CommandItem>
                <span>Projects</span>
              </CommandItem>
              <CommandItem>
                <span>Research</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </div>
    </div>
  );
}