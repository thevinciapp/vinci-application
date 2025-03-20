import { BaseTab } from 'vinci-ui';
import { Cpu } from 'lucide-react';
import { Space } from '@/types';

interface ModelTabProps {
  space: Space | null;
}

export function ModelTab({ space }: ModelTabProps) {
  return (
    <BaseTab
      icon={<Cpu className="w-3 h-3" />}
      label={space?.model || 'Select Model'}
      isActive={!!space?.model}
    />
  );
}
