'use client'

import { useSpaceStore } from '@/lib/stores/space-store';
import { BaseTab } from './base-tab';
import { useQuickActionsCommand } from './quick-actions-command-provider';
import PlanetIcon from './planet-icon';

export const SpaceTab = () => {
  const activeSpace = useSpaceStore((state) => state.activeSpace);
  const { toggleQuickActionsCommand } = useQuickActionsCommand();

  const spaceColor = activeSpace?.color || '#3ecfff';

  return (
    <div className="relative flex items-center">
      {activeSpace && <PlanetIcon size={20} seed={activeSpace.id} className="mr-2" />}
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