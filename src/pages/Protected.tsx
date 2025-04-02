import React from 'react';
import { useUser } from '@/hooks/use-user';
import ChatContentClient from '@/components/chat/chat-content-client';

export const ProtectedPage: React.FC = () => {
  const { profile, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex flex-col w-full h-full">
        <ChatContentClient />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full">
      <ChatContentClient />
    </div>
  );
}