'use client';

import { User } from 'lucide-react';
import { FC } from 'react';
import { Message } from '@/types';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const content = isUser 
    ? message.user_message || message.content 
    : message.assistant_message || message.content;

  // Ensure content is a string
  const displayContent = typeof content === 'string' ? content : '';

  return (
    <div className={`flex items-start gap-4 ${isUser ? 'justify-end' : ''} w-full max-w-7xl mx-auto group transition-opacity`}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-gradient-to-b from-white/[0.07] to-white/[0.03] border-white/[0.05] relative">
          <div className="absolute inset-0 rounded-md bg-blue-500/20 blur-sm" />
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent to-white/30" />
            <div className="absolute -inset-1 rounded-full bg-blue-500/20 blur-sm animate-pulse" />
          </div>
        </div>
      )}
      <div className={`flex-1 space-y-2 overflow-hidden ${isUser ? 'text-right' : ''} max-w-[85%]`}>
        <div className={`prose prose-invert max-w-none ${isUser ? 'ml-auto' : 'mr-auto'}`}>
          {!isUser && message.model_used && (
            <div className="inline-flex px-2 py-0.5 mb-2 rounded-md backdrop-blur-2xl bg-white/[0.03] border border-white/[0.05] text-white/60 text-[10px] font-medium items-center gap-1.5 relative overflow-hidden
              before:absolute before:inset-0 before:backdrop-blur-3xl before:bg-gradient-to-b before:from-white/[0.07] before:to-white/[0.03] before:-z-10">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500/70" />
              <span>{message.model_used}</span>
            </div>
          )}
          <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isUser 
              ? 'text-white shadow-[0_0_15px_-5px_rgba(255,255,255,0.3)]' 
              : 'text-white/90'
          }`}>{displayContent}</p>
        </div>
      </div>
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-white/[0.03] border-white/[0.1] relative overflow-hidden backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.1),transparent)]" />
          <div className="relative z-10 w-5 h-5 rounded-full bg-white/[0.1] flex items-center justify-center backdrop-blur-md">
            <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent to-white/20" />
            <User className="h-3 w-3 text-white relative z-10" />
            <div className="absolute -inset-1 rounded-full bg-white/10 blur-md" />
          </div>
          <div className="absolute inset-0 bg-white/5 shadow-[inset_0_0_15px_rgba(255,255,255,0.2)]" />
        </div>
      )}
    </div>
  );
};
