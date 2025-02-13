import { useSpaceStore } from '@/lib/stores/space-store';
import { BaseTab } from './base-tab';
import { useQuickActionsCommand } from './quick-actions-command-provider';

export const SpaceTab = () => {
  const activeSpace = useSpaceStore((state) => state.activeSpace);
  const { toggleQuickActionsCommand } = useQuickActionsCommand();

  return (
    <BaseTab
      icon={<div className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shrink-0" />}
      label={activeSpace ? activeSpace.name : 'No Active Space'}
      shortcut="S"
      isActive={!!activeSpace}
      minWidth="space"
      roundedBottom
      onClick={() => toggleQuickActionsCommand({ withSpaces: true })}
    />
  );
};