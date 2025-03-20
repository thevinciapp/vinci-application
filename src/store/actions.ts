import { AppState } from '../../electron/types';

export interface StoreActions {
  setAppState: (state: Partial<AppState>) => void;
  updateSpaces: (spaces: AppState['spaces']) => void;
  setActiveSpace: (space: AppState['activeSpace']) => void;
  updateConversations: (conversations: AppState['conversations']) => void;
  updateMessages: (messages: AppState['messages']) => void;
  setUser: (user: AppState['user']) => void;
  setAccessToken: (token: AppState['accessToken']) => void;
  setRefreshToken: (token: AppState['refreshToken']) => void;
  setTokenExpiryTime: (time: AppState['tokenExpiryTime']) => void;
}

export type Store = AppState & StoreActions;
