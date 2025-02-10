import { Space } from '@/types';
import { useQuickActionsCommand } from './quick-actions-command-provider';

interface SpaceTabProps {
  activeSpace: Space | null;
  isLoading?: boolean;
}

export const SpaceTab: React.FC<SpaceTabProps> = ({ activeSpace, isLoading }) => {

  return (
    <div
      className={`px-3 py-1 rounded-t-lg backdrop-blur-2xl border text-white text-xs font-medium flex items-center gap-1.5 relative overflow-hidden cursor-pointer min-w-[100px]
        before:absolute before:inset-0 before:backdrop-blur-3xl before:bg-gradient-to-b before:from-white/[0.07] before:to-white/[0.03] before:-z-10
        hover:bg-white/[0.05] transition-colors
        ${activeSpace ? 'bg-white/[0.05] border-white/10 shadow-[0_0_1px_rgba(255,255,255,0.1)]' : 'bg-white/[0.03] border-white/[0.05]'}`}
    >
      {isLoading ? (
        <>
          <div className="w-2 h-2 rounded-full bg-gray-500/50 animate-pulse shrink-0" />
          <div className="w-[60px] h-3 bg-gray-500/50 rounded animate-pulse" />
        </>
      ) : (
        <>
          <div className={`w-2 h-2 rounded-full shrink-0 ${activeSpace ? 'bg-blue-500' : 'bg-gray-500/50'}`} />
          <span className={`${activeSpace ? 'text-white' : 'text-white/75'} truncate`}>
            {activeSpace?.name || ''}
          </span>
        </>
      )}
      <span className="text-white/60 text-[10px] ml-auto shrink-0">⌘S</span>
    </div>
  );
};