import { create } from 'zustand'
import { Conversation } from '@/types'

interface ConversationStore {
  conversations: Conversation[] | null
  activeConversation: Conversation | null
  setConversations: (conversations: Conversation[] | null) => void
  setActiveConversation: (conversation: Conversation | null) => void
}

export const useConversationStore = create<ConversationStore>((set) => ({
  conversations: null,
  activeConversation: null,
  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (conversation) => set({ activeConversation: conversation })
})) 