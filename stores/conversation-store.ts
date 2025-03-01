import { create } from 'zustand';

export interface Conversation {
  id: string;
  space_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  [key: string]: any;
}

export interface ConversationStore {
  conversations: Conversation[] | null;
  activeConversation: Conversation | null;
  setConversations: (conversations: Conversation[] | null) => void;
  setActiveConversation: (conversation: Conversation | null) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  addConversation: (conversation: Conversation) => void;
  removeConversation: (id: string) => void;
}

export const useConversationStore = create<ConversationStore>((set) => ({
  conversations: null,
  activeConversation: null,
  
  setConversations: (conversations) => set({ conversations }),
  
  setActiveConversation: (conversation) => set({ activeConversation: conversation }),
  
  updateConversation: (id, updates) => set((state) => ({
    conversations: state.conversations?.map(conv => 
      conv.id === id ? { ...conv, ...updates } : conv
    ) || null,
    activeConversation: state.activeConversation?.id === id 
      ? { ...state.activeConversation, ...updates } 
      : state.activeConversation
  })),
  
  addConversation: (conversation) => set((state) => ({
    conversations: state.conversations 
      ? [conversation, ...state.conversations] 
      : [conversation]
  })),
  
  removeConversation: (id) => set((state) => ({
    conversations: state.conversations?.filter(conv => conv.id !== id) || null,
    activeConversation: state.activeConversation?.id === id 
      ? null 
      : state.activeConversation
  }))
}));

// Helper function to get current conversations
export const getCurrentConversations = () => useConversationStore.getState().conversations || []; 