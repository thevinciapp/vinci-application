import { Command } from 'cmdk'
import { AVAILABLE_MODELS, PROVIDER_NAMES, type Provider } from '@/config/models'
import { ProviderIcon } from './provider-icon'
import { useState } from 'react'

interface SpaceFormProps {
  spaceForm: {
    name: string
    description: string
    provider: Provider
    model: string
  }
  onSpaceFormChange: (form: any) => void
  onSubmit: () => void
}

export function SpaceForm({ spaceForm, onSpaceFormChange, onSubmit }: SpaceFormProps) {
  return (
    <div className="p-4 space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-white/40">Name</label>
          <input
            placeholder="Enter space name"
            value={spaceForm.name}
            onChange={(e) => onSpaceFormChange({ ...spaceForm, name: e.target.value })}
            onKeyDown={(e) => e.stopPropagation()}
            className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white/90 placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-[#3ecfff]/50 focus:border-[#3ecfff]/50 transition-all"
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-white/40">Description</label>
          <textarea
            placeholder="Enter space description (optional)"
            value={spaceForm.description}
            onChange={(e) => onSpaceFormChange({ ...spaceForm, description: e.target.value })}
            onKeyDown={(e) => e.stopPropagation()}
            className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white/90 placeholder:text-white/40 min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-[#3ecfff]/50 focus:border-[#3ecfff]/50 transition-all"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-white/40">Provider</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(PROVIDER_NAMES).map(([provider, name]) => (
            <button
              key={provider}
              onClick={() => {
                const newProvider = provider as Provider
                onSpaceFormChange({
                  ...spaceForm,
                  provider: newProvider,
                  model: AVAILABLE_MODELS[newProvider][0]?.id || ''
                })
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-colors ${
                spaceForm.provider === provider
                  ? 'bg-white/10 border-white/20 shadow-sm shadow-white/5'
                  : 'bg-white/5 border-white/10 hover:bg-white/[0.07]'
              }`}
            >
              <ProviderIcon
                provider={provider as Provider}
                size={16}
                className={spaceForm.provider === provider ? 'text-[#3ecfff]' : 'text-white/60'}
              />
              <span className="text-sm text-white/90">{name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-white/40">Model</label>
        <div className="space-y-1.5">
          {AVAILABLE_MODELS[spaceForm.provider].map((model) => (
            <button
              key={model.id}
              onClick={() => onSpaceFormChange({ ...spaceForm, model: model.id })}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md border transition-all duration-200 ${
                spaceForm.model === model.id
                  ? 'bg-white/10 border-white/20 shadow-sm shadow-white/5'
                  : 'bg-white/5 border-white/10 hover:bg-white/[0.07]'
              }`}
            >
              <ProviderIcon
                provider={spaceForm.provider}
                size={16}
                className={spaceForm.model === model.id ? 'text-[#3ecfff]' : 'text-white/60'}
              />
              <span className="text-sm text-white/90">{model.name}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onSubmit}
        disabled={!spaceForm.name}
        className={`w-full px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
          spaceForm.name
            ? 'bg-[#3ecfff] hover:bg-[#3ecfff]/90 text-black shadow-lg shadow-[#3ecfff]/20'
            : 'bg-white/5 text-white/40 cursor-not-allowed border border-white/10'
        }`}
      >
        Create Space
      </button>
    </div>
  )
}