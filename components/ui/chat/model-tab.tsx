import { getModelName, type Provider } from '@/config/models'
import { ProviderIcon } from './provider-icon'
import React from 'react'
import { BaseTab } from '@/components/ui/common/base-tab'
import { useCommandCenter } from '@/hooks/useCommandCenter'
import { useSpaceActions } from '@/hooks/useSpaceActions'

export function ModelTab() {
  const { activeSpace } = useSpaceActions()
  const { openCommandType } = useCommandCenter()
  const hasModel = !!(activeSpace?.provider && activeSpace?.model)
  
  // Get model name safely, handling undefined values
  const modelName = hasModel && activeSpace?.model 
    ? getModelName(activeSpace.provider as Provider, activeSpace.model) 
    : 'No Model Selected';

  return (
    <BaseTab
      icon={hasModel ? (
        <ProviderIcon
          provider={activeSpace.provider as Provider}
          size={14}
          className='opacity-100 shrink-0'
        />
      ) : (
        <div className='w-3.5 h-3.5 rounded-full bg-gray-500/50 shrink-0' />
      )}
      label={modelName}
      shortcut="M"
      isActive={hasModel}
      minWidth="model"
      commandType="models"
      onClick={() => openCommandType("models")}
    />
  )
}