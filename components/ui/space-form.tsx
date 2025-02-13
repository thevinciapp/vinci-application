import { Command } from 'cmdk'
import { AVAILABLE_MODELS, PROVIDER_NAMES, type Provider } from '@/config/models'
import { ProviderIcon } from './provider-icon'
import { Palette } from 'lucide-react'
import { useState } from 'react'
import { HexColorPicker } from 'react-colorful'

interface SpaceFormProps {
  spaceForm: {
    name: string
    description: string
    provider: Provider
    model: string
    color?: string
  }
  onSpaceFormChange: (form: any) => void
  onSubmit: () => void
}

export function SpaceForm({ spaceForm, onSpaceFormChange, onSubmit }: SpaceFormProps) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [tempColor, setTempColor] = useState(spaceForm.color || '#3ecfff')

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <input
          placeholder="Space name"
          value={spaceForm.name}
          onChange={(e) => onSpaceFormChange({ ...spaceForm, name: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white/90 placeholder:text-white/40"
        />
        <textarea
          placeholder="Description (optional)"
          value={spaceForm.description}
          onChange={(e) => onSpaceFormChange({ ...spaceForm, description: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white/90 placeholder:text-white/40 min-h-[80px] resize-none"
        />
      </div>

      <div className="space-y-2">
        <div className="relative">
          <button
            onClick={() => {
              setTempColor(spaceForm.color || '#3ecfff')
              setShowColorPicker(true)
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-200"
          >
            <div className="w-4 h-4 rounded-full" style={{ background: spaceForm.color || '#3ecfff' }} />
            <span className="text-sm text-white">Space Color</span>
          </button>

          {showColorPicker && (
            <>
              {/* Backdrop with dynamic color overlay */}
              <div 
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-colors duration-500"
                onClick={() => setShowColorPicker(false)}
                style={{
                  backgroundColor: `${tempColor}05`
                }}
              />
              
              {/* Modal */}
              <div 
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-6 bg-black/90 border border-white/10 rounded-xl backdrop-blur-xl shadow-2xl z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-white/90">Choose Space Color</h3>
                  <div 
                    className="w-6 h-6 rounded-full border border-white/10"
                    style={{ background: tempColor }}
                  />
                </div>
                <HexColorPicker
                  color={tempColor}
                  onChange={setTempColor}
                />
                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => setShowColorPicker(false)}
                    className="flex-1 px-3 py-1.5 rounded-md text-sm text-white/70 border border-white/10 hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onSpaceFormChange({ ...spaceForm, color: tempColor })
                      setShowColorPicker(false)
                    }}
                    className="flex-1 px-3 py-1.5 rounded-md text-sm font-medium bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    Select
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-white/40">Provider</label>
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
                  ? 'bg-white/10 border-white/20'
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
        <label className="text-xs text-white/40">Model</label>
        <div className="space-y-1.5">
          {AVAILABLE_MODELS[spaceForm.provider].map((model) => (
            <button
              key={model.id}
              onClick={() => onSpaceFormChange({ ...spaceForm, model: model.id })}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md border transition-colors ${
                spaceForm.model === model.id
                  ? 'bg-white/10 border-white/20'
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
        className={`w-full px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          spaceForm.name
            ? 'bg-[#3ecfff] hover:bg-[#3ecfff]/90 text-black'
            : 'bg-white/5 text-white/40 cursor-not-allowed'
        }`}
      >
        Create Space
      </button>
    </div>
  )
}