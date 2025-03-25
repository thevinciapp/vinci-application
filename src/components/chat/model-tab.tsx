

import { getModelName, type Provider } from '@/config/models';
import { ProviderIcon } from './provider-icon';
import { BaseTab } from '@/components/ui/base-tab';
import { useSpaces } from '@/hooks/use-spaces';
import { Cpu } from 'lucide-react';

export function ModelTab() {
  const { activeSpace } = useSpaces();
  
  const hasModel = !!(activeSpace?.provider && activeSpace?.model);
  
  const modelName = hasModel && activeSpace?.model 
    ? getModelName(activeSpace.provider as Provider, activeSpace.model) 
    : 'No Model Selected';

  return (
    <BaseTab
      icon={hasModel ? (
        <ProviderIcon className='mt-1' provider={activeSpace?.provider as Provider} size={15} />
      ) : (
        <Cpu className="w-3 h-3" />
      )}
      label={modelName}
      shortcut="M"
      commandType="models"
      isActive={hasModel}
    />
  );
}