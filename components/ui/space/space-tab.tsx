'use client'

import { useSpaceStore } from '@/stores/space-store';
import { BaseTab } from '../common/base-tab';
import PlanetIcon from './planet-icon';

export const SpaceTab = () => {
  const activeSpace = useSpaceStore((state) => state.activeSpace);

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
      />
    </div>
  );
};