import { Space } from '@/types';

interface SpaceTabProps {
    spaces: Space[] | null;
    activeSpaceId: string;
}

export const SpaceTab: React.FC<SpaceTabProps> = ({spaces, activeSpaceId}) => {
  return (
    <div
      className="px-3 py-1 rounded-t-lg backdrop-blur-2xl bg-white/[0.03] border border-white/[0.05] text-white text-xs font-medium flex items-center gap-1.5 relative overflow-hidden cursor-pointer
        before:absolute before:inset-0 before:backdrop-blur-3xl before:bg-gradient-to-b before:from-white/[0.07] before:to-white/[0.03] before:-z-10
        hover:bg-white/[0.05] transition-colors"
    >
      <div className="w-2 h-2 rounded-full bg-blue-500" />
      <span>{spaces?.find(space => space.id === activeSpaceId)?.name || 'Select Space'}</span>
      <span className="text-white/60 text-[10px] ml-1">⌘S</span>
    </div>
  );
};