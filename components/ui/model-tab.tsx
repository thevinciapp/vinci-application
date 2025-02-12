import { getModelName, type Provider } from '@/config/models'
import { ProviderIcon } from './provider-icon'
import React from 'react'
import { useSpaceStore } from '@/lib/stores/space-store'
import { BaseTab } from './base-tab'

export const ModelTab = () => {
  const activeSpace = useSpaceStore((state) => state.activeSpace)
  const hasModel = !!(activeSpace?.provider && activeSpace?.model)

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
      label={hasModel ? getModelName(activeSpace.provider as Provider, activeSpace.model) : 'No Model Selected'}
      shortcut="M"
      isActive={hasModel}
      minWidth="model"
    />
  )
}