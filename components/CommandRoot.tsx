"use client"

import React from 'react';
import { CommandProvider } from "@/hooks/useCommandCenter";
import { AllCommandProviders } from "@/components/CommandProviders";
import CommandCenter from "@/components/CommandCenter";
import CommandShortcuts from "@/components/CommandShortcuts";

export default function CommandRoot() {
  return (
    <CommandProvider>
      <AllCommandProviders>
        <CommandCenter />
        <CommandShortcuts />
      </AllCommandProviders>
    </CommandProvider>
  );
} 