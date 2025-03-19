import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { Space, Conversation, Message } from 'vinci-common';

// Define the main process state interface
export interface MainProcessState {
  spaces: Space[];
  activeSpace: Space | null;
  conversations: Conversation[];
  messages: Message[];
  initialDataLoaded: boolean;
  lastFetched: number | null;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
}

// Initial state values
const initialState: MainProcessState = {
  spaces: [],
  activeSpace: null,
  conversations: [],
  messages: [],
  initialDataLoaded: false,
  lastFetched: null,
  user: null,
  accessToken: null,
  refreshToken: null
};

// Create the main process store
export const useMainStore = create<MainProcessState & {
  setAppState: (state: Partial<MainProcessState>) => void;
  updateSpaces: (spaces: MainProcessState['spaces']) => void;
  setActiveSpace: (space: MainProcessState['activeSpace']) => void;
  updateConversations: (conversations: MainProcessState['conversations']) => void;
  updateMessages: (messages: MainProcessState['messages']) => void;
  setUser: (user: MainProcessState['user']) => void;
  setAccessToken: (token: MainProcessState['accessToken']) => void;
  setRefreshToken: (token: MainProcessState['refreshToken']) => void;
}>((set) => ({
  ...initialState,
  setAppState: (newState) => set((state) => ({ ...state, ...newState, initialDataLoaded: true })),
  updateSpaces: (spaces) => set({ spaces }),
  setActiveSpace: (activeSpace) => set({ activeSpace }),
  updateConversations: (conversations) => set({ conversations }),
  updateMessages: (messages) => set({ messages }),
  setUser: (user) => set({ user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setRefreshToken: (refreshToken) => set({ refreshToken })
}));

// Helper functions to access the store externally
export const getMainStoreState = () => useMainStore.getState();

export const subscribeToMainStore = (callback: (state: MainProcessState) => void) => {
  return useMainStore.subscribe(callback);
};
