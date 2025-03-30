import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { AppStateEvents } from '@/core/ipc/constants';
import { UserProfile } from '@/services/user/user-service';
import { Conversation } from '@/types/conversation';
import { Message } from '@/types/message';
import { Space } from '@/types/space';

export interface RendererProcessState {
  spaces: Space[];
  activeSpace: Space | null;
  conversations: Conversation[];
  messages: Message[];
  activeConversation: Conversation | null;
  initialDataLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  lastSynced: number | null;
  user: User | null;
  profile: UserProfile | null;
}

const initialState: RendererProcessState = {
  spaces: [],
  activeSpace: null,
  conversations: [],
  messages: [],
  activeConversation: null,
  initialDataLoaded: false,
  isLoading: false,
  error: null,
  lastSynced: null,
  user: null,
  profile: null
};

export const useRendererStore = create<RendererProcessState & {
  setAppState: (state: Partial<RendererProcessState>) => void;
  setSpaces: (spaces: Space[]) => void;
  addSpace: (space: Space) => void;
  removeSpace: (spaceId: string) => void;
  setActiveSpace: (space: Space | null) => void;
  setConversations: (conversations: Conversation[]) => void;
  setMessages: (messages: Message[]) => void;
  setActiveConversation: (conversation: Conversation | null) => void;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  
  fetchAppState: () => Promise<boolean>;
  syncWithMainProcess: () => Promise<boolean>;
}>((set, get) => ({
  ...initialState,
  
  setAppState: (newState) => set((state) => ({ 
    ...state, 
    ...newState,
    initialDataLoaded: true,
    lastSynced: Date.now()
  })),
  
  setSpaces: (spaces) => set((state) => ({ ...state, spaces })),
  addSpace: (space: Space) => set((state) => ({ ...state, spaces: [space, ...state.spaces] })),
  removeSpace: (spaceId: string) => set((state) => ({ ...state, spaces: state.spaces.filter(s => s.id !== spaceId) })),
  setActiveSpace: (activeSpace) => set((state) => ({ ...state, activeSpace })),
  setConversations: (conversations) => set((state) => ({ ...state, conversations })),
  setMessages: (messages) => set((state) => ({ ...state, messages })),
  setActiveConversation: (activeConversation) => set((state) => ({ ...state, activeConversation })),
  setUser: (user) => set((state) => ({ ...state, user })),
  setProfile: (profile) => set((state) => ({ ...state, profile })),
  setLoading: (isLoading) => set((state) => ({ ...state, isLoading })),
  setError: (error) => set((state) => ({ ...state, error })),
  
  fetchAppState: async () => {
    try {
      const response = await window.electron.invoke(AppStateEvents.GET_STATE);
      if (response.success && response.data) {
        const {
          spaces = [],
          activeSpace = null,
          conversations = [],
          messages = [],
          user = null,
          profile = null,
          initialDataLoaded = false
        } = response.data;

        set((state) => ({
          ...state,
          isLoading: false,
          error: null,
          spaces,
          activeSpace,
          conversations,
          messages,
          user,
          profile,
          initialDataLoaded: true,
          lastSynced: Date.now()
        }));
        return true;
      } else {
        console.error('[RENDERER] Failed to fetch app state:', response.error);
        set((state) => ({ 
          ...state,
          isLoading: false,
          error: response.error || 'Failed to fetch app state'
        }));
        return false;
      }
    } catch (error) {
      console.error('[RENDERER] Error fetching app state:', error);
      set((state) => ({ 
        ...state,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }));
      return false;
    }
  },
  
  syncWithMainProcess: async () => {
    try {
      const currentState = get();
      const response = await window.electron.invoke(AppStateEvents.SYNC_STATE, {
        spaces: currentState.spaces,
        activeSpace: currentState.activeSpace,
        conversations: currentState.conversations,
        messages: currentState.messages,
        user: currentState.user,
        profile: currentState.profile
      });
      
      if (response.success) {
        set((state) => ({ ...state, lastSynced: Date.now() }));
        return true;
      }
      
      set((state) => ({ ...state, error: response.error || 'Failed to sync with main process' }));
      return false;
    } catch (error) {
      set((state) => ({ ...state, error: error instanceof Error ? error.message : 'Unknown error occurred' }));
      return false;
    }
  }
}));

export const getRendererStoreState = () => useRendererStore.getState();
