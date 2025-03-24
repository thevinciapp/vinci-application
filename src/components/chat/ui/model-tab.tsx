import { BaseTab } from 'vinci-ui';
import { Cpu } from 'lucide-react';
import { Space } from '@/types/space';
import { getFormattedModelLabel, getModelDisplayInfo } from '@/utils/model-utils';
import { ProviderIcon } from '@/components/chat/provider-icon';

interface ModelTabProps {
  space: Space | null;
}

export function ModelTab({ space }: ModelTabProps) {
  const modelInfo = space?.model ? getModelDisplayInfo(space.model) : null;
  const hasModel = !!modelInfo;

  return (
    <BaseTab
      icon={hasModel ? (
        <ProviderIcon provider={modelInfo.provider} size={15} className="mt-1" />
      ) : (
        <Cpu className="w-3 h-3" />
      )}
      label={getFormattedModelLabel(space?.model)}
      isActive={hasModel}
    />
  );
}
