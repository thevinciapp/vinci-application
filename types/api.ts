import type { Space, Conversation } from './index';

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  error?: string;
}

export interface AppState {
  spaces: Space[];
  activeSpace: Space | null;
  conversations: Conversation[];
  initialDataLoaded: boolean;
  lastFetched: number | null;
}

export interface AppStateResult extends AppState {
  error?: string;
}
