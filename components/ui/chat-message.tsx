'use client';

import { User } from 'lucide-react';
import { FC } from 'react';
import { Message } from '@/types';
import { getModelName, type Provider } from '@/config/models';
import { ProviderIcon } from './provider-icon';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const content = isUser 
    ? message.content 
    : message.content;

  // Get model name and provider display
  const modelName = message.model_used && message.provider
    ? getModelName(message.provider as Provider, message.model_used)
    : message.model_used || 'AI';
  const providerName = message.provider 
    ? message.provider.charAt(0).toUpperCase() + message.provider.slice(1)
    : '';

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
          {message.role === 'assistant' && (
            <div className="flex items-center gap-1.5 mb-2.5">
              {message.provider && (
                <div className="px-2 py-0.5 rounded backdrop-blur-2xl bg-white/[0.03] border border-white/[0.05] text-white/80 text-[10px] font-medium flex items-center gap-1.5 relative overflow-hidden w-fit
                  before:absolute before:inset-0 before:backdrop-blur-3xl before:bg-gradient-to-b before:from-white/[0.07] before:to-white/[0.03] before:-z-10">
                  <ProviderIcon provider={message.provider as Provider} size={14} />
                </div>
              )}
              <div className="px-2.5 py-0.5 rounded backdrop-blur-2xl bg-white/[0.03] border border-white/[0.05] text-white/80 text-[10px] font-medium flex items-center gap-1.5 relative overflow-hidden w-fit
                before:absolute before:inset-0 before:backdrop-blur-3xl before:bg-gradient-to-b before:from-white/[0.07] before:to-white/[0.03] before:-z-10">
                <span className="text-white">{modelName}</span>
              </div>
            </div>
          )}
          <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isUser 
              ? 'text-white shadow-[0_0_15px_-5px_rgba(255,255,255,0.3)]' 
              : 'text-white/90'
          }`}>
            {content || (
              <span className="flex gap-1">
                <span className="inline-block w-12 h-4 bg-white/[0.07] rounded animate-pulse" />
                <span className="inline-block w-16 h-4 bg-white/[0.07] rounded animate-pulse" />
                <span className="inline-block w-8 h-4 bg-white/[0.07] rounded animate-pulse" />
              </span>
            )}
          </p>
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
