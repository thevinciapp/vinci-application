"use client"

import React from 'react';
import { AllCommandProviders } from "@/components/CommandProviders";
import CommandCenter from "@/components/CommandCenter";
import CommandShortcuts from "@/components/CommandShortcuts";

export default function CommandRoot() {
  return (
    <AllCommandProviders>
      <CommandCenter />
      <CommandShortcuts />
    </AllCommandProviders>
  );
} 