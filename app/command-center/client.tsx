'use client';

import React, { useEffect, useState } from 'react';
// Add a type reference to ensure TypeScript can see the window.electronAPI interface
/// <reference path="../../electron/electron-api.d.ts" />

import { CommandCenter} from '@/components/CommandCenter';

// Define type for command objects to match what we're using
interface CommandOption {
  id: string;
  name: string;
  type: string;
  icon?: React.ReactNode;
  shortcut?: string;
  onSelect: () => void;
}

interface CommandCenterClientProps {
  initialDataLoaded?: boolean;
}

export default function CommandCenterClient({ initialDataLoaded = false }: CommandCenterClientProps) {
  const [isStandaloneWindow, setIsStandaloneWindow] = useState(false);

  return (
    <CommandCenter 
      standaloneMode={isStandaloneWindow}
    />
  );
}
