'use client';

import { Message } from 'ai';
import { User } from 'lucide-react';
import { FC } from 'react';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-4 ${isUser ? 'justify-end' : ''} w-full max-w-7xl mx-auto group transition-opacity`}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-gradient-to-b from-white/[0.07] to-white/[0.03] border-white/[0.05]">
          <div className="text-sm font-semibold text-white">AI</div>
        </div>
      )}
      <div className={`flex-1 space-y-2 overflow-hidden ${isUser ? 'text-right' : ''} max-w-[85%]`}>
        <div className={`prose prose-invert max-w-none ${isUser ? 'ml-auto' : 'mr-auto'}`}>
          <p className="text-sm leading-relaxed text-white/90 whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-white/[0.07] border-white/[0.05]">
          <User className="h-4 w-4 text-white" />
        </div>
      )}
    </div>
  );
};
