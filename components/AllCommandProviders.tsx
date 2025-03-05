'use client';

import React, { useEffect } from 'react';
import { 
  ApplicationCommandProvider, 
  SpacesCommandProvider, 
  ConversationsCommandProvider, 
  ModelsCommandProvider, 
  ActionsCommandProvider, 
  MessageSearchProvider,
  ChatModesCommandProvider,
  BackgroundTasksCommandProvider,
  SuggestionsCommandProvider
} from './CommandProviders';
import { SimilarMessagesCommandProvider } from './SimilarMessagesCommandProvider';
import { useSpaceStore } from '@/stores/space-store';

interface AllCommandProvidersProps {
  children: React.ReactNode;
  spaces?: any[];
  activeSpace?: any;
  conversations?: any[];
  activeConversation?: any;
  user?: any;
  messages?: any[];
}

export function AllCommandProviders({ 
  children,
  spaces = [],
  activeSpace = null,
  conversations = [],
  activeConversation = null,
  user = null,
  messages = [],
}: AllCommandProvidersProps) {
  const { initializeState } = useSpaceStore();
  
  useEffect(() => {
    initializeState({
      spaces,
      activeSpace,
      conversations,
      activeConversation,
      messages,
      isLoading: false,
      loadingType: null
    });
  }, [initializeState, spaces, activeSpace, conversations, activeConversation, messages]);
  
  return (
    <ApplicationCommandProvider>
      <SpacesCommandProvider>
        <ConversationsCommandProvider>
          <ModelsCommandProvider>
            <ChatModesCommandProvider>
              <MessageSearchProvider>
                <SimilarMessagesCommandProvider>
                  <BackgroundTasksCommandProvider>
                    <SuggestionsCommandProvider>
                      <ActionsCommandProvider>{children}</ActionsCommandProvider>
                    </SuggestionsCommandProvider>
                  </BackgroundTasksCommandProvider>
                </SimilarMessagesCommandProvider>
              </MessageSearchProvider>
            </ChatModesCommandProvider>
          </ModelsCommandProvider>
        </ConversationsCommandProvider>
      </SpacesCommandProvider>
    </ApplicationCommandProvider>
  );
}