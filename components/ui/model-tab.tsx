import { getModelName, type Provider } from '@/config/models';
import { ProviderIcon } from './provider-icon';
import React from 'react';
import { Space } from '@/types';

interface ModelTabProps {
  activeSpace: Space | null;
  isLoading?: boolean;
}

export const ModelTab: React.FC<ModelTabProps> = ({ activeSpace, isLoading }) => {
  const hasModel = !!(activeSpace?.provider && activeSpace?.model);
  
  return (
    <div
      className={`px-3 py-1 rounded-t-lg backdrop-blur-2xl border text-white text-xs font-medium flex items-center gap-1.5 relative overflow-hidden cursor-pointer min-w-[120px]
        before:absolute before:inset-0 before:backdrop-blur-3xl before:bg-gradient-to-b before:from-white/[0.07] before:to-white/[0.03] before:-z-10
        hover:bg-white/[0.05] transition-colors
        ${hasModel ? 'bg-white/[0.05] border-white/10 shadow-[0_0_1px_rgba(255,255,255,0.1)]' : 'bg-white/[0.03] border-white/[0.05]'}`}
    >
      {isLoading ? (
        <>
          <div className="w-3.5 h-3.5 rounded-full bg-gray-500/50 animate-pulse shrink-0" />
          <div className="w-[72px] h-3 bg-gray-500/50 rounded animate-pulse" />
        </>
      ) : hasModel ? (
        <>
          <ProviderIcon 
            provider={activeSpace.provider as Provider} 
            size={14} 
            className="opacity-100 shrink-0" 
          />
          <span className="text-white truncate">
            {getModelName(activeSpace.provider as Provider, activeSpace.model)}
          </span>
        </>
      ) : (
        <>
          <div className="w-3.5 h-3.5 rounded-full bg-gray-500/50 shrink-0" />
          <span className="text-white/75"></span>
        </>
      )}
      <span className="text-white/60 text-[10px] ml-auto shrink-0">⌘M</span>
    </div>
  );
};