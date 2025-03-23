import { useEffect } from 'react';
import ChatContentClient from '@/components/chat/chat-content-client';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/hooks/use-app-state';
import { toast } from 'vinci-ui';

export default function Protected() {
  const navigate = useNavigate();
  const { error } = useAppState();

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load application data. Please sign in again.',
        variant: 'destructive'
      });
      navigate('/sign-in');
    }
  }, [error, navigate]);

  if (error) return null;

  return (
    <div className="flex flex-col w-full h-full">
      <ChatContentClient />
    </div>
  );
}