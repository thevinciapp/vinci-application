import React from 'react';
import { useChatState } from '@/store/chat-state-store';

interface StatusTabProps {
}

export const StatusTab: React.FC<StatusTabProps> = () => {
  const { status, error } = useChatState();

  const getStatusText = () => {
    switch (status) {
      case 'generating':
        return 'Generating...';
      case 'error':
        return error || 'Error';
      case 'idle':
      default:
        return 'Ready';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'generating':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      case 'idle':
      default:
        return 'bg-green-500';
    }
  };

  return (
    <div
      className="px-3 py-1 rounded-t-lg backdrop-blur-2xl bg-white/[0.03] border border-white/[0.05] text-white text-xs font-medium flex items-center gap-1.5 relative overflow-hidden
        before:absolute before:inset-0 before:backdrop-blur-3xl before:bg-gradient-to-b before:from-white/[0.07] before:to-white/[0.03] before:-z-10"
    >
      <div
        className={`w-1.5 h-1.5 rounded-full ${getStatusColor()}`}
      />
      <span>{getStatusText()}</span>
    </div>
  );
};
