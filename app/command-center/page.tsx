// Split into server and client components
// This is the server component that pre-fetches data

import { CommandProvider } from '@/hooks/useCommandCenter';
import { AllCommandProviders } from '@/components/AllCommandProviders';
import { getSpaces, getActiveSpace, getSpaceData } from '@/app/actions';
import type { Space, Conversation } from '@/types';
import { Message } from 'ai';
import { Suspense } from 'react';

// Import the client component
// This will be created with 'use client' directive
// @ts-ignore - will be resolved when client file is properly created
import CommandCenterClient from './client';

/**
 * Server-side rendered command center page
 * This can be loaded both within the main app or in a separate window
 * Data is pre-fetched server-side for instant loading
 */
export default async function CommandCenterPage() {
  // Pre-fetch all data on the server
  const spaces = await getSpaces() || [];
  const activeSpace = await getActiveSpace() || null;
  
  // Default values in case of data fetch failure
  let conversations: Conversation[] = [];
  let messages: Message[] = [];
  let activeConversation = null;
  let user = null;
  
  // Load space data if active space exists
  if (activeSpace) {
    try {
      const spaceData = await getSpaceData(activeSpace.id);
      if (spaceData) {
        conversations = spaceData.conversations || [];
        messages = spaceData.messages || [];
        activeConversation = spaceData.activeConversation;
      }
    } catch (error) {
      console.error('Error loading space data:', error);
    }
  }
  
  return (
    <CommandProvider>
      <AllCommandProviders
        spaces={spaces}
        activeSpace={activeSpace}
        conversations={conversations}
        activeConversation={activeConversation}
        user={user}
        messages={messages}
      >
        <CommandCenterClient
          initialDataLoaded={true}
        />
      </AllCommandProviders>
    </CommandProvider>
  );
}