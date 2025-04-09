import React from 'react';
import { useUser } from '@/features/user/use-user';
import ChatContentClient from 'shared/components/chat/chat-content-client';

export const ProtectedPage: React.FC = () => {
  const { isLoading } = useUser();

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