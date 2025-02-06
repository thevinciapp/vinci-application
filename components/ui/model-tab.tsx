import { useSpaces } from '@/hooks/spaces-provider';
import React, { useState } from 'react';

const AVAILABLE_MODELS = [
  { id: 'deepseek-r1-distill-llama-70b', name: 'Deepseek R1 70B', provider: 'groq' },
  { id: 'mixtral-8x7b-instruct', name: 'Mixtral 8x7B', provider: 'groq' },
  { id: 'gemma-7b-it', name: 'Gemma 7B', provider: 'groq' }
];

export const ModelTab: React.FC = () => {
  const { activeSpace, setActiveSpace } = useSpaces();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleModelSelect = async (modelId: string, provider: string) => {
    if (!activeSpace) return;

    try {
      const response = await fetch(`/api/spaces/${activeSpace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelId,
          provider: provider
        })
      });

      const updatedSpace = await response.json();
      if (!updatedSpace.error) {
        setActiveSpace(updatedSpace);
      }
    } catch (error) {
      console.error('Error updating model:', error);
    } finally {
      setIsDropdownOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="px-3 py-1 rounded-t-lg backdrop-blur-2xl bg-white/[0.03] border border-white/[0.05] text-white text-xs font-medium flex items-center gap-1.5 relative overflow-hidden
          before:absolute before:inset-0 before:backdrop-blur-3xl before:bg-gradient-to-b before:from-white/[0.07] before:to-white/[0.03] before:-z-10"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500/70" />
        <span>{AVAILABLE_MODELS.find(m => m.id === activeSpace?.model)?.name || 'Select Model'}</span>
        <span className="text-white/60 text-[10px] ml-1">⌘M</span>
      </button>

      {isDropdownOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-black/90 backdrop-blur-xl border border-white/[0.05] rounded-lg shadow-lg overflow-hidden z-50">
          {AVAILABLE_MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => handleModelSelect(model.id, model.provider)}
              className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/[0.05] transition-colors
                flex items-center gap-2"
            >
              <div className={`w-1.5 h-1.5 rounded-full ${model.id === activeSpace?.model ? 'bg-blue-500' : 'bg-white/20'}`} />
              {model.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
