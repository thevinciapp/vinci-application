import { useSpaces } from '@/hooks/spaces-provider';
import { useChatState } from '@/hooks/chat-state-provider';
import React, { useState, useCallback } from 'react';
import { Plus, Settings } from 'lucide-react';

export const SpaceTab: React.FC = () => {
  const { activeSpace, spaces, setActiveSpace } = useSpaces();
  const { batchUpdate } = useChatState();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSpaceSelect = useCallback(async (spaceId: string) => {
    setIsDropdownOpen(false);
    batchUpdate({ isLoading: true });
    
    try {
      const space = spaces.find(s => s.id === spaceId);
      if (space) {
        setActiveSpace(space);
      }
    } catch (error) {
      console.error('Error switching space:', error);
      batchUpdate({ error: 'Failed to switch space' });
    } finally {
      batchUpdate({ isLoading: false });
    }
  }, [spaces, setActiveSpace, batchUpdate]);

  const handleCreateSpace = useCallback(async () => {
    setIsDropdownOpen(false);
    batchUpdate({ isLoading: true });

    try {
      const response = await fetch('/api/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Space ${spaces.length + 1}`,
          description: 'New space',
          model: 'deepseek-r1-distill-llama-70b',
          provider: 'groq'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create space');
      }

      const newSpace = await response.json();
      setActiveSpace(newSpace);
    } catch (error) {
      console.error('Error creating space:', error);
      batchUpdate({ error: 'Failed to create space' });
    } finally {
      batchUpdate({ isLoading: false });
    }
  }, [spaces.length, setActiveSpace, batchUpdate]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="px-3 py-1 rounded-t-lg backdrop-blur-2xl bg-white/[0.03] border border-white/[0.05] text-white text-xs font-medium flex items-center gap-1.5 relative overflow-hidden
          before:absolute before:inset-0 before:backdrop-blur-3xl before:bg-gradient-to-b before:from-white/[0.07] before:to-white/[0.03] before:-z-10"
      >
        <div className="w-2 h-2 rounded-full bg-blue-500" />
        <span>{activeSpace?.name || 'Select Space'}</span>
        <span className="text-white/60 text-[10px] ml-1">⌘S</span>
      </button>

      {isDropdownOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-black/90 backdrop-blur-xl border border-white/[0.05] rounded-lg shadow-lg overflow-hidden z-50">
          <div className="p-2 space-y-1">
            {spaces.map((space) => (
              <button
                key={space.id}
                onClick={() => handleSpaceSelect(space.id)}
                className="w-full px-3 py-2 rounded-md text-left text-sm text-white hover:bg-white/[0.05] transition-colors
                  flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${space.id === activeSpace?.id ? 'bg-blue-500' : 'bg-white/20'}`} />
                  <span>{space.name}</span>
                </div>
                <Settings className="w-4 h-4 text-white/40 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
          
          <div className="border-t border-white/[0.05] p-2">
            <button
              onClick={handleCreateSpace}
              className="w-full px-3 py-2 rounded-md text-left text-sm text-white hover:bg-white/[0.05] transition-colors
                flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Space</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
