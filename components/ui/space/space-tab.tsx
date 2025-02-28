'use client'

import { BaseTab } from '@/components/ui/common/base-tab'
import { useCommandCenter } from '@/hooks/useCommandCenter'
import DotSphere from './planet-icon'
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
          <DotSphere 
            size={24} 
            seed={activeSpace.id} 
            dotCount={100} 
            dotSize={0.8} 
            expandFactor={1.15} 
            transitionSpeed={400}
          />
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
          <DotSphere 
            size={24} 
            seed={activeSpace.id} 
            dotCount={100} 
            dotSize={0.8} 
            expandFactor={1.15} 
            transitionSpeed={400}
          />
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