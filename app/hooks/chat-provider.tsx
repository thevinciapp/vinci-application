import { User } from "@supabase/supabase-js";

export type ActionType = 
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_INITIALIZING'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }; 

interface ChatState {
  user: User | null;
  isInitializing: boolean;
  isLoading: boolean;
}

const initialState: ChatState = {
  user: null,
  isInitializing: true,
  isLoading: false
};

function reducer(state: ChatState, action: ActionType): ChatState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_INITIALIZING':
      return { ...state, isInitializing: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
} 