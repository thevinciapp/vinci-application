import { useSpaces } from '@/hooks/spaces-provider';
import { useQuickActionsCommand } from '@/components/ui/quick-actions-command-provider';
import { getModelName, type Provider } from '@/config/models';
import { ProviderIcon } from './provider-icon';
import React from 'react';

export const ModelTab: React.FC = () => {
  const { activeSpace } = useSpaces();
  const { toggleQuickActionsCommand } = useQuickActionsCommand();

  const modelName = activeSpace?.model && activeSpace?.provider 
    ? getModelName(activeSpace.provider as Provider, activeSpace.model)
    : 'Select Model';

  return (
    <div
      onClick={() => toggleQuickActionsCommand(false, true)}
      className="px-3 py-1 rounded-t-lg backdrop-blur-2xl bg-white/[0.03] border border-white/[0.05] text-white text-xs font-medium flex items-center gap-1.5 relative overflow-hidden cursor-pointer
        before:absolute before:inset-0 before:backdrop-blur-3xl before:bg-gradient-to-b before:from-white/[0.07] before:to-white/[0.03] before:-z-10
        hover:bg-white/[0.05] transition-colors"
    >
      {activeSpace?.provider && (
        <ProviderIcon provider={activeSpace.provider as Provider} size={14} className="opacity-75" />
      )}
      <span>{modelName}</span>
      <span className="text-white/60 text-[10px] ml-1">⌘M</span>
    </div>
  );
};
