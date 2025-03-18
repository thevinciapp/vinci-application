

import { BaseTab } from 'vinci-ui';
import { Cpu } from 'lucide-react';
import { useSpaces } from '@/hooks/use-spaces';

export function ModelTab() {
  const { activeSpace } = useSpaces();

  return (
    <BaseTab
      icon={<Cpu className="w-3 h-3" />}
      label={activeSpace?.model || 'Select Model'}
      isActive={!!activeSpace?.model}
    />
  );
}
