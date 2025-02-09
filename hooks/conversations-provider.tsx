import React, { createContext, useContext, useReducer, useMemo, ReactNode, useEffect } from 'react';
import { Conversation } from '@/types';
import { useSpaces } from './spaces-provider';

interface ConversationsState {
  conversations: { [spaceId: string]: Conversation[] };
  activeConversation: Conversation | null;
  isInitialized: boolean;
}

const initialState: ConversationsState = {
  conversations: {},
  activeConversation: null,
  isInitialized: false
};

enum ConversationsActionType {
  SET_CONVERSATIONS = 'SET_CONVERSATIONS',
  SET_ACTIVE_CONVERSATION = 'SET_ACTIVE_CONVERSATION',
  SET_INITIALIZED = 'SET_INITIALIZED'
}

type ConversationsAction =
  | { type: ConversationsActionType.SET_CONVERSATIONS; payload: { spaceId: string; conversations: Conversation[] } }
  | { type: ConversationsActionType.SET_ACTIVE_CONVERSATION; payload: Conversation }
  | { type: ConversationsActionType.SET_INITIALIZED; payload: boolean };

function conversationsReducer(state: ConversationsState, action: ConversationsAction): ConversationsState {
  switch (action.type) {
    case ConversationsActionType.SET_CONVERSATIONS:
      return {
        ...state,
        conversations: {
          ...state.conversations,
          [action.payload.spaceId]: action.payload.conversations,
        },
      };
    case ConversationsActionType.SET_ACTIVE_CONVERSATION:
      return { ...state, activeConversation: action.payload };
    case ConversationsActionType.SET_INITIALIZED:
      return { ...state, isInitialized: action.payload };
    default:
      return state;
  }
}

interface ConversationsContextProps {
  state: ConversationsState;
  dispatch: React.Dispatch<ConversationsAction>;
}

const ConversationsContext = createContext<ConversationsContextProps | undefined>(undefined);

export function ConversationsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(conversationsReducer, initialState);
  const { activeSpace, state: spacesState } = useSpaces();

  // Load conversations when active space changes
  useEffect(() => {
    const loadConversations = async () => {
      if (!activeSpace?.id || !spacesState.isInitialized) return;

      try {
        console.log('Loading conversations for space:', activeSpace.id);
        const response = await fetch(`/api/conversations/${activeSpace.id}`);
        const data = await response.json();
        
        if (!data.error) {
          dispatch({
            type: ConversationsActionType.SET_CONVERSATIONS,
            payload: { spaceId: activeSpace.id, conversations: data },
          });
          
          if (data.length > 0) {
            dispatch({ type: ConversationsActionType.SET_ACTIVE_CONVERSATION, payload: data[0] });
          } else {
            // Create initial conversation if none exists
            const convResponse = await fetch('/api/conversations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                space_id: activeSpace.id,
                title: 'New Chat'
              })
            });

            const convData = await convResponse.json();
            if (!convData.error) {
              dispatch({
                type: ConversationsActionType.SET_CONVERSATIONS,
                payload: { spaceId: activeSpace.id, conversations: [convData] }
              });
              dispatch({ type: ConversationsActionType.SET_ACTIVE_CONVERSATION, payload: convData });
            }
          }
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
      } finally {
        dispatch({ type: ConversationsActionType.SET_INITIALIZED, payload: true });
      }
    };

    // Only load if not initialized or if space changes
    if (!state.isInitialized || activeSpace?.id) {
      loadConversations();
    }
  }, [activeSpace?.id, spacesState.isInitialized]);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <ConversationsContext.Provider value={value}>
      {children}
    </ConversationsContext.Provider>
  );
}

function useConversationsContext() {
  const context = useContext(ConversationsContext);
  if (!context) {
    throw new Error('useConversationsContext must be used within a ConversationsProvider');
  }
  return context;
}

export function useConversations() {
  const { state, dispatch } = useConversationsContext();
  const { activeSpace } = useSpaces();
  const activeSpaceId = activeSpace?.id;

  const loadConversations = async (spaceId: string) => {
    try {
      dispatch({ type: ConversationsActionType.SET_INITIALIZED, payload: false });
      console.log('Loading conversations for space:', spaceId);
      const response = await fetch(`/api/conversations/${spaceId}`);
      const data = await response.json();
      
      if (!data.error) {
        dispatch({
          type: ConversationsActionType.SET_CONVERSATIONS,
          payload: { spaceId, conversations: data },
        });
        
        if (data.length > 0 && !state.activeConversation) {
          dispatch({ type: ConversationsActionType.SET_ACTIVE_CONVERSATION, payload: data[0] });
        }
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      dispatch({ type: ConversationsActionType.SET_INITIALIZED, payload: true });
    }
  };

  return {
    state,
    conversations: activeSpaceId ? state.conversations[activeSpaceId] || [] : [],
    activeConversation: state.activeConversation,
    setConversations: (conversations: Conversation[]) => {
      if (activeSpaceId) {
        dispatch({
          type: ConversationsActionType.SET_CONVERSATIONS,
          payload: { spaceId: activeSpaceId, conversations },
        });
      }
    },
    setActiveConversation: (conversation: Conversation) => {
      dispatch({ type: ConversationsActionType.SET_ACTIVE_CONVERSATION, payload: conversation });
    },
    loadConversations,
  };
} 