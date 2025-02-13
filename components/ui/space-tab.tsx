'use client'

import { useSpaceStore } from '@/lib/stores/space-store';
import { BaseTab } from './base-tab';
import { useQuickActionsCommand } from './quick-actions-command-provider';

export const SpaceTab = () => {
  const activeSpace = useSpaceStore((state) => state.activeSpace);
  const { toggleQuickActionsCommand } = useQuickActionsCommand();

  const spaceColor = activeSpace?.color || '#3ecfff';

  return (
    <div className="relative">
      <BaseTab
        color={spaceColor}
        label={activeSpace ? activeSpace.name : 'No Active Space'}
        shortcut="S"
        isActive={!!activeSpace}
        minWidth="space"
        onClick={() => toggleQuickActionsCommand({ withSpaces: true })}
      />
    </div>
  );
};