'use client';

import { BaseTab } from 'vinci-ui';
import { Sparkles } from 'lucide-react';
import { Space } from '@/src/types';

interface SpaceTabProps {
  activeSpace: Space | null;
}

export function SpaceTab({ activeSpace }: SpaceTabProps) {
  return (
    <BaseTab
      icon={<Sparkles className="w-3 h-3" />}
      label={activeSpace?.name || 'Select Space'}
      isActive={!!activeSpace}
    />
  );
}
