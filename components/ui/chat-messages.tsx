'use client';

import { useStickToBottom } from '@/hooks/use-stick-to-bottom';
import { FC, useEffect, useState } from 'react';
import { ChatMessage } from './chat-message';
import { Message } from '@/types';
import { useChatState } from '@/hooks/chat-state-provider';

interface ChatMessagesProps {
  messages: Message[];
}

export const ChatMessages: FC<ChatMessagesProps> = ({ messages }) => {
  const { containerRef,isStickToBottom } = useStickToBottom();
  const { state: chatState } = useChatState();
  const [isMessagesReady, setIsMessagesReady] = useState(false);

  // Wait for messages to be loaded before showing them
  useEffect(() => {
    if (messages.length > 0) {
      setIsMessagesReady(true);
    }
  }, [messages]);

  // Reset ready state when messages are cleared
  useEffect(() => {
    if (messages.length === 0) {
      setIsMessagesReady(false);
    }
  }, [messages.length]);

  return (
    <div className="relative flex-1 flex flex-col">
      <div 
        ref={isMessagesReady ? containerRef : null}
        className={`absolute inset-0 ${
          isMessagesReady ? 'overflow-y-auto' : 'overflow-hidden'
        } py-12 px-4 pb-52 transition-opacity duration-200 ${
          isMessagesReady ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="space-y-12 min-h-full">
            {isMessagesReady && messages.map((message, index) => (
              <div key={message.id}>
                <ChatMessage message={message} />
                {index < messages.length - 1 && messages[index].role !== messages[index + 1].role && (
                  <div className="w-full flex justify-center my-8">
                    <div className="w-1/3 h-px bg-white/[0.05]" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {isStickToBottom && isMessagesReady && messages.length > 0 && (
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
