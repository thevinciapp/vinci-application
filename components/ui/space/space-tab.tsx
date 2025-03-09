'use client'

import { BaseTab } from 'vinci-ui'
import DotSphere from './planet-icon'

export function ServerDrivenSpaceTab({ 
  activeSpace,
  isLoading = false
}: { 
  activeSpace: any,
  isLoading?: boolean
}) {
  return (
    <div className="relative flex items-center">
      {activeSpace && (
        <div className="mr-1">
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
        label={isLoading ? `Loading${activeSpace?.name ? ' ' + activeSpace.name : ''}...` : (activeSpace?.name || "No Space Selected")}
        shortcut="E"
        commandType="spaces"
        rightElement={isLoading ? <span className="loading-dots text-[10px] text-cyan-400"></span> : undefined}
      />
    </div>
  )
}