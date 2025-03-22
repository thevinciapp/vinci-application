import { useEffect } from 'react';
import ChatContentClient from '@/components/chat/chat-content-client';
import { toast } from 'vinci-ui';
import { useRendererStore } from '@/store/renderer';
import { useNavigate } from 'react-router-dom';

export default function Protected() {
  const rendererStore = useRendererStore();
  const navigate = useNavigate();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await rendererStore.fetchAppState();
      } catch (error) {
        console.error('[Protected] Error initializing app:', error);
        toast({
          title: 'Error',
          description: 'Failed to load application data. Please sign in again.',
          variant: 'destructive'
        });
        navigate('/sign-in');
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