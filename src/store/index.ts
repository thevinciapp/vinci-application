import { create } from 'zustand';
import { AppState } from '@/types';

const initialState: AppState = {
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

export const useStore = create<AppState & {
  setAppState: (state: Partial<AppState>) => void;
  updateSpaces: (spaces: AppState['spaces']) => void;
  setActiveSpace: (space: AppState['activeSpace']) => void;
  updateConversations: (conversations: AppState['conversations']) => void;
  updateMessages: (messages: AppState['messages']) => void;
  setUser: (user: AppState['user']) => void;
  setAccessToken: (token: AppState['accessToken']) => void;
  setRefreshToken: (token: AppState['refreshToken']) => void;
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

export const getStoreState = () => useStore.getState();

export const subscribeToStore = (callback: (state: AppState) => void) => {
  return useStore.subscribe(callback);
};
