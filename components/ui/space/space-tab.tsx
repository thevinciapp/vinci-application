'use client'

import { BaseTab } from '@/components/ui/common/base-tab'
import { useCommandCenter } from '@/hooks/useCommandCenter'
import DotSphere from './planet-icon'

export function ServerDrivenSpaceTab({ 
  activeSpace,
  isLoading = false
}: { 
  spaces: any[],
  activeSpace: any,
  isLoading?: boolean
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
            dotCount={80} 
            dotSize={0.8} 
            expandFactor={1.15} 
            transitionSpeed={400}
            className={isLoading ? "animate-pulse" : ""}
            highPerformance={true}
          />
        </div>
      )}
      <BaseTab
        icon={<span style={{ color: spaceColor }}>●</span>}
        label={isLoading ? `Loading${activeSpace?.name ? ' ' + activeSpace.name : ''}...` : (activeSpace?.name || "No Space Selected")}
        shortcut="E"
        commandType="spaces"
        onClick={() => openCommandType("spaces")}
        rightElement={isLoading ? <span className="loading-dots text-[10px] text-cyan-400"></span> : undefined}
      />
    </div>
  )
}