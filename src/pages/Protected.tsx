import { useEffect, useState } from 'react';
import ChatContentClient from '@/components/chat/chat-content-client';
import { toast } from 'vinci-ui';
import { useRendererStore } from '@/store/renderer';
import { useNavigate } from 'react-router-dom';

export default function Protected() {
  const rendererStore = useRendererStore();
  const navigate = useNavigate();
  const [isInitializing, setIsInitializing] = useState(!rendererStore.initialDataLoaded);

  useEffect(() => {
    const initializeApp = async () => {
      // If data is already loaded (from sign-in flow), we don't need to fetch again
      if (rendererStore.initialDataLoaded) {
        setIsInitializing(false);
        return;
      }

      try {
        setIsInitializing(true);
        const success = await rendererStore.fetchAppState();
        
        if (!success) {
          console.error('[Protected] Failed to load application data');
          toast({
            title: 'Error',
            description: 'Failed to load application data. Please sign in again.',
            variant: 'destructive'
          });
          // Redirect to sign-in if we couldn't load the data
          navigate('/sign-in');
          return;
        }
        
        console.log('[Protected] App initialized');
        console.log('[Protected] Active space:', rendererStore.activeSpace?.name);
        console.log('[Protected] Spaces:', rendererStore.spaces.map(s => s.name));
        console.log('[Protected] Active conversation:', rendererStore.conversations[0]?.title);
        console.log('[Protected] Conversations:', rendererStore.conversations.map(c => c.title));
      } catch (error) {
        console.error('[Protected] Error initializing app:', error);
        toast({
          title: 'Error',
          description: 'Failed to load application data. Please sign in again.',
          variant: 'destructive'
        });
        // Redirect to sign-in on error
        navigate('/sign-in');
      } finally {
        setIsInitializing(false);
      }
    };
    
    initializeApp();
  }, [rendererStore, navigate]);

  // Show a loading state while initializing
  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full">
        <div className="text-white/80 text-lg">Loading your data...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full">
      <ChatContentClient />
    </div>
  );
}