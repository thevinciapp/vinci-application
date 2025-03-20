import { useEffect } from 'react';
import ChatContentClient from '@/components/chat/chat-content-client';
import { toast } from 'vinci-ui';
import { useRendererStore } from '@/store/renderer';

export default function Protected() {
  const rendererStore = useRendererStore();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await rendererStore.fetchAppState();
        console.log('[Protected] App initialized');
        console.log('[Protected] Active space:', rendererStore.activeSpace?.name);
        console.log('[Protected] Spaces:', rendererStore.spaces.map(s => s.name));
        console.log('[Protected] Active conversation:', rendererStore.conversations[0]?.title);
        console.log('[Protected] Conversations:', rendererStore.conversations.map(c => c.title));
      } catch (error) {
        console.error('[Protected] Error initializing app:', error);
        toast({
          title: 'Error',
          description: 'Failed to load application data',
          variant: 'destructive'
        });
      }
    };
    
    initializeApp();
  }, []);

  return (
    <div className="flex flex-col w-full h-full">
      <ChatContentClient />
    </div>
  );
}