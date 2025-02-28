"use client"

import React from 'react';
import CommandCenter from "@/components/CommandCenter";
import CommandShortcuts from "@/components/CommandShortcuts";

export default function CommandRoot() {
  return (
    <>
      <CommandCenter />
      <CommandShortcuts />
    </>
  );
} 