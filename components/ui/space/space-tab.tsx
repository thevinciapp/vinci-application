'use client'

import { BaseTab } from '@/components/ui/common/base-tab'
import { useCommandCenter } from '@/hooks/useCommandCenter'
import PlanetIcon from './planet-icon'
import { useSpaceActions } from '@/hooks/useSpaceActions'

export function SpaceTab() {
  const { activeSpace } = useSpaceActions()
  const { openCommandType } = useCommandCenter()

  const spaceColor = activeSpace?.color || '#3ecfff'

  return (
    <div className="relative flex items-center">
      {activeSpace && (
        <div className="mr-2">
          <PlanetIcon size={20} seed={activeSpace.id} />
        </div>
      )}
      <BaseTab
        color={spaceColor}
        label={activeSpace ? activeSpace.name : 'No Active Space'}
        shortcut="S"
        isActive={!!activeSpace}
        minWidth="space"
        commandType="spaces"
        onClick={() => openCommandType('spaces')}
      />
    </div>
  )
}