import { getModelName, type Provider } from '@/config/models';
import { ProviderIcon } from './provider-icon';
import React from 'react';
import { Space } from '@/types';

interface ModelTabProps {
    activeSpace: Space | null;
}

export const ModelTab: React.FC<ModelTabProps> = ({activeSpace}) => {

  return (
    <div
      className="px-3 py-1 rounded-t-lg backdrop-blur-2xl bg-white/[0.03] border border-white/[0.05] text-white text-xs font-medium flex items-center gap-1.5 relative overflow-hidden cursor-pointer
        before:absolute before:inset-0 before:backdrop-blur-3xl before:bg-gradient-to-b before:from-white/[0.07] before:to-white/[0.03] before:-z-10
        hover:bg-white/[0.05] transition-colors"
    >
      {activeSpace?.provider && (
        <ProviderIcon provider={activeSpace.provider as Provider} size={14} className="opacity-75" />
      )}
      <span>{activeSpace?.model || 'Select Model'}</span>
      <span className="text-white/60 text-[10px] ml-1">⌘M</span>
    </div>
  );
};