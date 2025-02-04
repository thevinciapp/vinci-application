'use client';

import { Message } from 'ai';
import { useStickToBottom } from '@/hooks/use-stick-to-bottom';
import { FC } from 'react';
import { ChatMessage } from './chat-message';

interface ChatMessagesProps {
  messages: Message[];
}

export const ChatMessages: FC<ChatMessagesProps> = ({ messages }) => {
  const { containerRef, isStickToBottom } = useStickToBottom();

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto py-12 px-4 pb-52"
    >
      <div className="space-y-12">
        {messages.map((message, index) => (
          <div key={index} className="relative">
            <ChatMessage message={message} />
            {index < messages.length - 1 && messages[index].role !== messages[index + 1].role && (
              <div className="w-full flex justify-center my-8">
                <div className="w-1/3 h-px bg-white/[0.05]" />
              </div>
            )}
          </div>
        ))}
      </div>
      {!isStickToBottom && (
        <button
          onClick={() => containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' })}
          className="fixed top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg backdrop-blur-2xl bg-white/[0.03] border border-white/[0.05] text-white text-xs font-medium flex items-center gap-1.5 overflow-hidden
            before:absolute before:inset-0 before:backdrop-blur-3xl before:bg-gradient-to-b before:from-white/[0.07] before:to-white/[0.03] before:-z-10
            hover:bg-white/[0.05] transition-colors duration-200"
        >
          <span>Scroll to Bottom ↓</span>
        </button>
      )}
    </div>
  );
};
