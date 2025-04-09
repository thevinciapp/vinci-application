import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { Conversation } from '@/entities/conversation/model/types';
import { VinciUIMessage } from '@/entities/message/model/types';
import { Space } from '@/entities/space/model/types';
import { CommandType } from '@/features/command-palette/model/types';

export interface MainProcessState {
  spaces: Space[];
  activeSpace: Space | null;
  conversations: Conversation[];
  messages: VinciUIMessage[];
  activeConversation: Conversation | null;
  initialDataLoaded: boolean;
  lastFetched: number | null;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiryTime: number | null;
  isCommandCenterOpen: boolean;
  activeCommand?: CommandType;
  dialogType?: string;
  dialogData?: unknown;
}

const initialState: MainProcessState = {
  spaces: [],
  activeSpace: null,
  conversations: [],
  activeConversation: null,
  messages: [],
  initialDataLoaded: false,
  lastFetched: null,
  user: null,
  accessToken: null,
  refreshToken: null,
  tokenExpiryTime: null,
  isCommandCenterOpen: false,
  activeCommand: undefined,
  dialogType: undefined,
  dialogData: undefined,
};

export const useMainStore = create<MainProcessState & {
  setAppState: (state: Partial<MainProcessState>) => void;
  updateSpaces: (spaces: MainProcessState['spaces']) => void;
  setActiveSpace: (space: MainProcessState['activeSpace']) => void;
  updateConversations: (conversations: MainProcessState['conversations']) => void;
  updateActiveConversation: (conversation: MainProcessState['activeConversation']) => void;
  updateMessages: (messages: MainProcessState['messages']) => void;
  setUser: (user: MainProcessState['user']) => void;
  setAccessToken: (token: MainProcessState['accessToken']) => void;
  setRefreshToken: (token: MainProcessState['refreshToken']) => void;
  setTokenExpiryTime: (time: MainProcessState['tokenExpiryTime']) => void;
  setCommandCenterOpen: (isOpen: boolean) => void;
  setActiveCommand: (command?: CommandType) => void;
  setDialogState: (type?: string, data?: unknown) => void;
}>((set) => ({
  ...initialState,
  setAppState: (newState) => set((state) => ({ ...state, ...newState, initialDataLoaded: true })),
  updateSpaces: (spaces) => set({ spaces }),
  setActiveSpace: (activeSpace) => set({ activeSpace }),
  updateConversations: (conversations) => set({ conversations }),
  updateActiveConversation: (activeConversation) => set({ activeConversation }),
  updateMessages: (messages) => set({ messages }),
  setUser: (user) => set({ user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setRefreshToken: (refreshToken) => set({ refreshToken }),
  setTokenExpiryTime: (tokenExpiryTime) => set({ tokenExpiryTime }),
  setCommandCenterOpen: (isOpen: boolean) => set({ isCommandCenterOpen: isOpen }),
  setActiveCommand: (command?: CommandType) => set({ activeCommand: command }),
  setDialogState: (type?: string, data?: unknown) => set({ dialogType: type, dialogData: data }),
}));

export const getMainStoreState = () => useMainStore.getState();

export const subscribeToMainStore = (callback: (state: MainProcessState) => void) => {
  return useMainStore.subscribe(callback);
};
