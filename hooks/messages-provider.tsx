import React, { createContext, useContext, useReducer, useMemo, ReactNode, useEffect } from 'react';
import { Message } from '@/types';
import { useConversations } from './conversations-provider';

interface MessagesState {
  messages: { [conversationId: string]: Message[] };
  isInitialized: boolean;
}

const initialState: MessagesState = {
  messages: {},
  isInitialized: false
};

enum MessagesActionType {
  SET_MESSAGES = 'SET_MESSAGES',
  ADD_MESSAGE = 'ADD_MESSAGE',
  SET_INITIALIZED = 'SET_INITIALIZED'
}

type MessagesAction =
  | { type: MessagesActionType.SET_MESSAGES; payload: { conversationId: string; messages: Message[] } }
  | { type: MessagesActionType.ADD_MESSAGE; payload: { conversationId: string; message: Message } }
  | { type: MessagesActionType.SET_INITIALIZED; payload: boolean };

function messagesReducer(state: MessagesState, action: MessagesAction): MessagesState {
  switch (action.type) {
    case MessagesActionType.SET_MESSAGES:
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: action.payload.messages,
        },
      };
    case MessagesActionType.ADD_MESSAGE:
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: [
            ...(state.messages[action.payload.conversationId] || []),
            action.payload.message,
          ],
        },
      };
    case MessagesActionType.SET_INITIALIZED:
      return { ...state, isInitialized: action.payload };
    default:
      return state;
  }
}

interface MessagesContextProps {
  state: MessagesState;
  dispatch: React.Dispatch<MessagesAction>;
}

const MessagesContext = createContext<MessagesContextProps | undefined>(undefined);

export function MessagesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(messagesReducer, initialState);
  const { activeConversation } = useConversations();

  // Load messages when active conversation changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!activeConversation?.id) return;

      try {
        const response = await fetch(`/api/messages/${activeConversation.id}`);
        const data = await response.json();
        
        if (!data.error) {
          dispatch({
            type: MessagesActionType.SET_MESSAGES,
            payload: { conversationId: activeConversation.id, messages: data }
          });
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        dispatch({ type: MessagesActionType.SET_INITIALIZED, payload: true });
      }
    };

    // Clear messages when conversation changes
    dispatch({
      type: MessagesActionType.SET_MESSAGES,
      payload: { conversationId: activeConversation?.id || '', messages: [] }
    });

    // Only load if there's an active conversation
    if (activeConversation?.id) {
      loadMessages();
    }
  }, [activeConversation?.id]);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <MessagesContext.Provider value={value}>
      {children}
    </MessagesContext.Provider>
  );
}

function useMessagesContext() {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error('useMessagesContext must be used within a MessagesProvider');
  }
  return context;
}

export function useMessages() {
  const { state, dispatch } = useMessagesContext();
  const { activeConversation } = useConversations();
  const conversationId = activeConversation?.id;

  const loadMessages = async (conversationId: string) => {
    if (!conversationId) return;
    
    try {
      dispatch({ type: MessagesActionType.SET_INITIALIZED, payload: false });
      const response = await fetch(`/api/messages/${conversationId}`);
      const data = await response.json();
      
      if (!data.error) {
        dispatch({
          type: MessagesActionType.SET_MESSAGES,
          payload: { conversationId, messages: data },
        });
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      dispatch({ type: MessagesActionType.SET_INITIALIZED, payload: true });
    }
  };

  return {
    state,
    messages: conversationId ? state.messages[conversationId] || [] : [],
    setMessages: (messages: Message[]) => {
      if (conversationId) {
        dispatch({
          type: MessagesActionType.SET_MESSAGES,
          payload: { conversationId, messages },
        });
      }
    },
    addMessage: (message: Message) => {
      if (conversationId) {
        dispatch({
          type: MessagesActionType.ADD_MESSAGE,
          payload: { conversationId, message },
        });
      }
    },
    loadMessages,
  };
} 