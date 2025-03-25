import { create } from 'zustand';
import { getAllChatModes } from '@/config/chat-modes';

interface MainStore {
  spaces: any[];
  conversations: any[];
  messages: any[];
  models: any[];
  chatModes: any[];
  activeSpace: any;
  user: any;
  isLoading: boolean;
  error: string | null;
  setSpaces: (spaces: any[]) => void;
  setConversations: (conversations: any[]) => void;
  setMessages: (messages: any[]) => void;
  setModels: (models: any[]) => void;
  setChatModes: (modes: any[]) => void;
  setActiveSpace: (space: any) => void;
  setUser: (user: any) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setAppState: (state: any) => void;
}

export const useMainStore = create<MainStore>((set) => ({
  spaces: [],
  conversations: [],
  messages: [],
  models: [],
  chatModes: getAllChatModes(),
  activeSpace: null,
  user: null,
  isLoading: false,
  error: null,
  setSpaces: (spaces) => set({ spaces }),
  setConversations: (conversations) => set({ conversations }),
  setMessages: (messages) => set({ messages }),
  setModels: (models) => set({ models }),
  setChatModes: (modes) => set({ chatModes: modes }),
  setActiveSpace: (space) => set({ activeSpace: space }),
  setUser: (user) => set({ user }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setAppState: (state) => set({
    spaces: state.spaces || [],
    conversations: state.conversations || [],
    messages: state.messages || [],
    models: state.models || [],
    chatModes: getAllChatModes(),
    activeSpace: state.activeSpace || null,
    user: state.user || null,
    isLoading: false,
    error: null
  })
})); 