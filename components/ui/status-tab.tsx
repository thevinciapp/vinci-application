import React, { useMemo } from 'react';

export const StatusTab: React.FC = React.memo(() => {

  const { statusText, statusColor } = useMemo(() => {
    const text = 'Ready';
    const color = 'bg-green-500';

    return { statusText: text, statusColor: color };
  }, []);

  return (
    <div
      className="px-3 py-1 rounded-t-lg backdrop-blur-2xl bg-white/[0.03] border border-white/[0.05] text-white text-xs font-medium flex items-center gap-1.5 relative overflow-hidden
        before:absolute before:inset-0 before:backdrop-blur-3xl before:bg-gradient-to-b before:from-white/[0.07] before:to-white/[0.03] before:-z-10"
    >
      <div className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
      <span>{statusText}</span>
    </div>
  );
});