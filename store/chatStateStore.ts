import { DatabaseMessage } from '@/app/protected/page';
import { Message } from 'ai';
import { create } from 'zustand';

type ChatStatus = 'idle' | 'generating' | 'error';

interface ChatState {
  status: ChatStatus;
  error?: string;
  setStatus: (status: ChatStatus, error?: string) => void;
  conversationId?: string;
  messages: DatabaseMessage[];
  setConversationId: (id: string | undefined) => void;
  setMessages: (messages: DatabaseMessage[]) => void;
}

export const useChatState = create<ChatState>((set) => ({
  status: 'idle',
  error: undefined,
  conversationId: undefined,
  messages: [],
  setStatus: (status, error) => set({ status, error }),
  setConversationId: (id) => set({ conversationId: id }),
  setMessages: (messages) => set({ messages })
}));
