import { AVAILABLE_MODELS, PROVIDER_NAMES, type Provider } from '@/config/models';

interface SpaceFormProps {
  spaceForm: {
    name: string;
    description: string;
    provider: Provider;
    model: string;
  };
  onSpaceFormChange: (form: {
    name: string;
    description: string;
    provider: Provider;
    model: string;
  }) => void;
  onSubmit: () => Promise<void>; // onSubmit is now async
}

export function SpaceForm({ spaceForm, onSpaceFormChange, onSubmit }: SpaceFormProps) {
  return (
    <div className="flex flex-col">
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">Name</label>
          <input
            type="text"
            value={spaceForm.name}
            onChange={(e) => onSpaceFormChange({ ...spaceForm, name: e.target.value })}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white/90 text-sm
              focus:outline-none focus:ring-2 focus:ring-[#5E6AD2]/50"
            placeholder="Enter space name"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">Description (Optional)</label>
          <input
            type="text"
            value={spaceForm.description}
            onChange={(e) => onSpaceFormChange({ ...spaceForm, description: e.target.value })}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white/90 text-sm
              focus:outline-none focus:ring-2 focus:ring-[#5E6AD2]/50"
            placeholder="Enter space description"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">Provider</label>
          <select
            value={spaceForm.provider}
            onChange={(e) => {
              const provider = e.target.value as Provider;
              onSpaceFormChange({
                ...spaceForm,
                provider,
                model: AVAILABLE_MODELS[provider][0]?.id || ''
              });
            }}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white/90 text-sm
              focus:outline-none focus:ring-2 focus:ring-[#5E6AD2]/50"
          >
            {Object.entries(PROVIDER_NAMES).map(([provider, name]) => (
              <option key={provider} value={provider}>{name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">Model</label>
          <select
            value={spaceForm.model}
            onChange={(e) => onSpaceFormChange({ ...spaceForm, model: e.target.value })}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white/90 text-sm
              focus:outline-none focus:ring-2 focus:ring-[#5E6AD2]/50"
          >
            {AVAILABLE_MODELS[spaceForm.provider].map((model) => (
              <option key={model.id} value={model.id}>{model.name}</option>
            ))}
          </select>
        </div>
          <div className="flex justify-center">
              <button
              onClick={async () => {
                await onSubmit();
                }}
              disabled={!spaceForm.name}
              className="px-8 py-1.5 bg-[#5E6AD2] text-white/90 rounded-md text-xs font-medium
                  hover:bg-[#4F5ABF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                  border border-white/10"
              >
              Create Space
              </button>
          </div>
      </div>
    </div>
  );
}