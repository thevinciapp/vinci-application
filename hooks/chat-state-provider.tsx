import React, { createContext, useContext, useReducer, useMemo, ReactNode, useEffect, useCallback } from 'react';

interface ChatState {
  isInitializing: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  isInitializing: true,
  isLoading: false,
  error: null
};

export enum ChatStateActionType {
  SET_INITIALIZING = 'SET_INITIALIZING',
  SET_LOADING = 'SET_LOADING',
  SET_ERROR = 'SET_ERROR',
  BATCH_UPDATE = 'BATCH_UPDATE'
}

type ChatStateAction =
  | { type: ChatStateActionType.SET_INITIALIZING; payload: boolean }
  | { type: ChatStateActionType.SET_LOADING; payload: boolean }
  | { type: ChatStateActionType.SET_ERROR; payload: string | null }
  | { type: ChatStateActionType.BATCH_UPDATE; payload: Partial<ChatState> };

function chatStateReducer(state: ChatState, action: ChatStateAction): ChatState {
  switch (action.type) {
    case ChatStateActionType.SET_INITIALIZING:
      return { ...state, isInitializing: action.payload };
    case ChatStateActionType.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case ChatStateActionType.SET_ERROR:
      return { ...state, error: action.payload };
    case ChatStateActionType.BATCH_UPDATE:
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

interface ChatStateContextProps {
  state: ChatState;
  dispatch: React.Dispatch<ChatStateAction>;
  batchUpdate: (updates: Partial<ChatState>) => void;
}

const ChatStateContext = createContext<ChatStateContextProps | undefined>(undefined);

export function ChatStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatStateReducer, initialState);

  const batchUpdate = useCallback((updates: Partial<ChatState>) => {
    dispatch({ type: ChatStateActionType.BATCH_UPDATE, payload: updates });
  }, []);

  // Initialize chat state when provider mounts
  useEffect(() => {
    dispatch({ type: ChatStateActionType.SET_INITIALIZING, payload: false });
  }, []);

  const value = useMemo(() => ({ 
    state, 
    dispatch,
    batchUpdate 
  }), [state, batchUpdate]);

  return (
    <ChatStateContext.Provider value={value}>
      {children}
    </ChatStateContext.Provider>
  );
}

export function useChatState() {
  const context = useContext(ChatStateContext);
  if (!context) {
    throw new Error('useChatState must be used within a ChatStateProvider');
  }
  return context;
} 