import { getModelName, type Provider } from '@/src/config/models'
import { ProviderIcon } from './provider-icon'
import React from 'react'
import { BaseTab } from 'vinci-ui'
import { useAppState } from '@/src/types/app-state-context'

export function ServerDrivenModelTab() {
  const { appState } = useAppState();
  
  const activeSpace = appState.activeSpace;
  const hasModel = !!(activeSpace?.provider && activeSpace?.model)
  
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