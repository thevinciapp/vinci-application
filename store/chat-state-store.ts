import { create } from 'zustand';

type ChatStatus = 'idle' | 'generating' | 'error';

interface ChatState {
  status: ChatStatus;
  error?: string;
  setStatus: (status: ChatStatus, error?: string) => void;
}

export const useChatState = create<ChatState>((set) => ({
  status: 'idle',
  error: undefined,
  setStatus: (status, error) => set({ status, error }),
}));
