'use client'

import { BaseTab } from '@/components/ui/common/base-tab'
import { useCommandCenter } from '@/hooks/useCommandCenter'
import DotSphere from './planet-icon'
import { useSpaceActions } from '@/hooks/useSpaceActions'
import { useEffect, useState } from 'react'
import { getActiveSpace } from '@/app/actions'

// Original implementation that's used throughout the app
export function SpaceTab() {
  const { loadingSpaceId, isLoadingSpace } = useSpaceActions()
  const { openCommandType } = useCommandCenter()
  const [activeSpace, setActiveSpace] = useState<any>(null)
  
  // Fetch the active space on component mount and when loading state changes
  useEffect(() => {
    const fetchActiveSpace = async () => {
      const space = await getActiveSpace()
      setActiveSpace(space)
    }
    
    fetchActiveSpace()
  }, [loadingSpaceId]) // Refetch when loadingSpaceId changes (space selection completes)

  const spaceColor = activeSpace?.color || '#3ecfff'
  const isLoading = isLoadingSpace(activeSpace?.id)

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

// New implementation that accepts props directly
export function ServerDrivenSpaceTab({ 
  spaces,
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