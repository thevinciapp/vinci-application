import { getModelName, type Provider } from '@/config/models'
import { ProviderIcon } from './provider-icon'
import React from 'react'
import { BaseTab } from 'vinci-ui'
import { useAppState } from '@/lib/app-state-context'

export function ServerDrivenModelTab() {
  const { appState } = useAppState();
  const activeSpace = appState.activeSpace;
  
  const hasModel = !!(activeSpace?.provider && activeSpace?.model)
  
  // Get model name safely, handling undefined values
  const modelName = hasModel && activeSpace?.model 
    ? getModelName(activeSpace.provider as Provider, activeSpace.model) 
    : 'No Model Selected';

  return (
    <BaseTab
      icon={hasModel ? (
        <ProviderIcon className='mt-1' provider={activeSpace?.provider as Provider} size={15} />
      ) : undefined}
      label={modelName}
      shortcut="M"
      commandType="models"
    />
  )
}