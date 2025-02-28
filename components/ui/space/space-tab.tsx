'use client'

import { BaseTab } from '@/components/ui/common/base-tab'
import { useCommandCenter } from '@/hooks/useCommandCenter'
import PlanetIcon from './planet-icon'
import { useSpaceActions } from '@/hooks/useSpaceActions'

// Original implementation that's used throughout the app
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
        icon={<span style={{ color: spaceColor }}>●</span>}
        label={activeSpace?.name || "No Space Selected"}
        shortcut="E"
        commandType="spaces"
        onClick={() => openCommandType("spaces")}
      />
    </div>
  )
}

// New implementation that accepts props directly
export function ServerDrivenSpaceTab({ 
  spaces,
  activeSpace 
}: { 
  spaces: any[],
  activeSpace: any 
}) {
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
        icon={<span style={{ color: spaceColor }}>●</span>}
        label={activeSpace?.name || "No Space Selected"}
        shortcut="E"
        commandType="spaces"
        onClick={() => openCommandType("spaces")}
      />
    </div>
  )
}