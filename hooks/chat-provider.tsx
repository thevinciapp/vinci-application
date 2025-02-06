import React, {
    createContext,
    useContext,
    useReducer,
    useMemo,
    ReactNode,
    useState,
    useEffect,
    useCallback
  } from 'react';
import { Space, Conversation, Message } from '@/types';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
  
  /*----------------------------------------------------------------------------
    Define Your State Shape and Initial Values
  ----------------------------------------------------------------------------*/
  const supabase = createClient();
  
  interface ChatState {
    spaces: Space[];
    activeSpace: Space | null;
    conversations: { [spaceId: string]: Conversation[] };
    activeConversation: Conversation | null;
    messages: { [conversationId: string]: Message[] };
    user: User | null;
    isInitializing: boolean;
    isLoading: boolean;
    error: string | null;
  }
  
  const initialState: ChatState = {
    spaces: [],
    activeSpace: null,
    conversations: {},
    activeConversation: null,
    messages: {},
    user: null,
    isInitializing: true,
    isLoading: false,
    error: null
  };
  
  /*----------------------------------------------------------------------------
    Define Actions and Reducer
  ----------------------------------------------------------------------------*/
  export enum ActionType {
    SET_SPACES = 'SET_SPACES',
    SET_ACTIVE_SPACE = 'SET_ACTIVE_SPACE',
    SET_CONVERSATIONS = 'SET_CONVERSATIONS',
    SET_ACTIVE_CONVERSATION = 'SET_ACTIVE_CONVERSATION',
    SET_MESSAGES = 'SET_MESSAGES',
    ADD_MESSAGE = 'ADD_MESSAGE',
    SET_USER = 'SET_USER',
    SET_INITIALIZING = 'SET_INITIALIZING',
    SET_LOADING = 'SET_LOADING',
    SET_ERROR = 'SET_ERROR'
  }
  
  type Action =
    | { type: ActionType.SET_SPACES; payload: Space[] }
    | { type: ActionType.SET_ACTIVE_SPACE; payload: Space }
    | {
        type: ActionType.SET_CONVERSATIONS;
        payload: { spaceId: string; conversations: Conversation[] };
      }
    | { type: ActionType.SET_ACTIVE_CONVERSATION; payload: Conversation }
    | {
        type: ActionType.SET_MESSAGES;
        payload: { conversationId: string; messages: Message[] };
      }
    | {
        type: ActionType.ADD_MESSAGE;
        payload: { conversationId: string; message: Message };
      }
    | { type: ActionType.SET_USER; payload: User | null }
    | { type: ActionType.SET_INITIALIZING; payload: boolean }
    | { type: ActionType.SET_LOADING; payload: boolean }
    | { type: ActionType.SET_ERROR; payload: string | null };
  
  function chatReducer(state: ChatState, action: Action): ChatState {
    switch (action.type) {
      case ActionType.SET_SPACES:
        return { ...state, spaces: action.payload };
      case ActionType.SET_ACTIVE_SPACE:
        return { ...state, activeSpace: action.payload, activeConversation: null };
      case ActionType.SET_CONVERSATIONS:
        return {
          ...state,
          conversations: {
            ...state.conversations,
            [action.payload.spaceId]: action.payload.conversations,
          },
        };
      case ActionType.SET_ACTIVE_CONVERSATION:
        return { ...state, activeConversation: action.payload };
      case ActionType.SET_MESSAGES:
        return {
          ...state,
          messages: {
            ...state.messages,
            [action.payload.conversationId]: action.payload.messages,
          },
        };
      case ActionType.ADD_MESSAGE:
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
      case ActionType.SET_USER:
        return { ...state, user: action.payload };
      case ActionType.SET_INITIALIZING:
        return { ...state, isInitializing: action.payload };
      case ActionType.SET_LOADING:
        return { ...state, isLoading: action.payload };
      case ActionType.SET_ERROR:
        return { ...state, error: action.payload };
      default:
        return state;
    }
  }
  
  /*----------------------------------------------------------------------------
    Create Chat Context & Provider
  ----------------------------------------------------------------------------*/
  interface ChatContextProps {
    state: ChatState;
    dispatch: React.Dispatch<Action>;
  }
  
  const ChatContext = createContext<ChatContextProps | undefined>(undefined);
  
  export const ChatProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useReducer(chatReducer, initialState);
  
    // Initialize auth
    useEffect(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        dispatch({ type: ActionType.SET_USER, payload: session?.user ?? null });
        dispatch({ type: ActionType.SET_INITIALIZING, payload: false });
      });
  
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        dispatch({ type: ActionType.SET_USER, payload: session?.user ?? null });
      });
  
      return () => subscription.unsubscribe();
    }, []);
  
    // Initialize user data when auth changes
    useEffect(() => {
      const initializeUserData = async () => {
        if (!state.user) return;
  
        dispatch({ type: ActionType.SET_INITIALIZING, payload: true });
        try {
          // Load spaces
          const response = await fetch('/api/spaces');
          const spaces = await response.json();
          
          if (!spaces.error) {
            dispatch({ type: ActionType.SET_SPACES, payload: spaces });
            
            // If no spaces exist, create initial space
            if (spaces.length === 0) {
              const spaceResponse = await fetch('/api/spaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: 'My Space',
                  description: 'My default space',
                  model: 'deepseek-r1-distill-llama-70b',
                  provider: 'groq'
                })
              });
  
              const spaceData = await spaceResponse.json();
              if (!spaceData.error) {
                dispatch({ type: ActionType.SET_SPACES, payload: [spaceData] });
                dispatch({ type: ActionType.SET_ACTIVE_SPACE, payload: spaceData });
  
                // Create initial conversation
                const convResponse = await fetch('/api/conversations', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    space_id: spaceData.id,
                    title: 'Getting Started'
                  })
                });
  
                const convData = await convResponse.json();
                if (!convData.error) {
                  dispatch({
                    type: ActionType.SET_CONVERSATIONS,
                    payload: { spaceId: spaceData.id, conversations: [convData] }
                  });
                  dispatch({ type: ActionType.SET_ACTIVE_CONVERSATION, payload: convData });
  
                  // Create and load welcome message
                  const welcomeResponse = await fetch('/api/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      conversation_id: convData.id,
                      user_id: state.user.id,
                      role: 'assistant',
                      content: 'Welcome to Spatial! I\'m here to help you explore and create. What would you like to do?',
                      model_used: spaceData.model
                    })
                  });
  
                  const welcomeMessage = await welcomeResponse.json();
                  if (!welcomeMessage.error) {
                    dispatch({
                      type: ActionType.SET_MESSAGES,
                      payload: { 
                        conversationId: convData.id, 
                        messages: [welcomeMessage] 
                      }
                    });
                  }
                }
              }
            } else {
              // Set first space as active and load its conversations
              const firstSpace = spaces[0];
              dispatch({ type: ActionType.SET_ACTIVE_SPACE, payload: firstSpace });
              
              const conversationsResponse = await fetch(`/api/conversations/${firstSpace.id}`);
              const conversations = await conversationsResponse.json();
              
              if (!conversations.error) {
                dispatch({
                  type: ActionType.SET_CONVERSATIONS,
                  payload: { spaceId: firstSpace.id, conversations }
                });
                
                if (conversations.length > 0) {
                  const firstConversation = conversations[0];
                  dispatch({ type: ActionType.SET_ACTIVE_CONVERSATION, payload: firstConversation });
                  
                  // Load messages for the first conversation
                  const messagesResponse = await fetch(`/api/messages/${firstConversation.id}`);
                  const messages = await messagesResponse.json();
                  if (!messages.error) {
                    dispatch({
                      type: ActionType.SET_MESSAGES,
                      payload: { 
                        conversationId: firstConversation.id, 
                        messages 
                      }
                    });
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('Error initializing user data:', error);
        } finally {
          dispatch({ type: ActionType.SET_INITIALIZING, payload: false });
        }
      };
  
      initializeUserData();
    }, [state.user]);
  
    // Memoize the context value to avoid unnecessary re-renders
    const value = useMemo(() => ({ state, dispatch }), [state]);
  
    return (
      <ChatContext.Provider value={value}>
        {children}
      </ChatContext.Provider>
    );
  };
  
  export function useChatContext() {
    const context = useContext(ChatContext);
    if (!context) {
      throw new Error('useChatContext must be used within a ChatProvider');
    }
    return context;
  }
  
  /*----------------------------------------------------------------------------
    Custom Hook: useActiveSpace
  ----------------------------------------------------------------------------*/
  export const useActiveSpace = () => {
    const { state, dispatch } = useChatContext();
  
    const loadSpaces = async () => {
      try {
        const response = await fetch('/api/spaces');
        const data = await response.json();
        if (!data.error) {
          dispatch({ type: ActionType.SET_SPACES, payload: data });
          // If there are spaces and no active space, set the first one as active
          if (data.length > 0 && !state.activeSpace) {
            dispatch({ type: ActionType.SET_ACTIVE_SPACE, payload: data[0] });
          }
        }
      } catch (error) {
        console.error('Error loading spaces:', error);
      }
    };
  
    const setActiveSpace = (space: Space) => {
      dispatch({ type: ActionType.SET_ACTIVE_SPACE, payload: space });
    };
  
    const setSpaces = (spaces: Space[]) => {
      dispatch({ type: ActionType.SET_SPACES, payload: spaces });
    };
  
    return {
      activeSpace: state.activeSpace,
      spaces: state.spaces,
      setActiveSpace,
      setSpaces,
      loadSpaces,
    };
  };
  
  /*----------------------------------------------------------------------------
    Custom Hook: useConversations
  ----------------------------------------------------------------------------*/
  export const useConversations = () => {
    const { state, dispatch } = useChatContext();
    const activeSpaceId = state.activeSpace?.id;
  
    const loadConversations = async (spaceId: string) => {
      try {
        const response = await fetch(`/api/conversations/${spaceId}`);
        const data = await response.json();
        
        if (!data.error) {
          dispatch({
            type: ActionType.SET_CONVERSATIONS,
            payload: { spaceId, conversations: data },
          });
          
          // If there are conversations and no active conversation, set the first one
          if (data.length > 0 && !state.activeConversation) {
            const firstConversation = data[0];
            dispatch({ type: ActionType.SET_ACTIVE_CONVERSATION, payload: firstConversation });
            
            // Load messages for the first conversation
            const messagesResponse = await fetch(`/api/messages/${firstConversation.id}`);
            const messages = await messagesResponse.json();
            if (!messages.error) {
              dispatch({
                type: ActionType.SET_MESSAGES,
                payload: { conversationId: firstConversation.id, messages },
              });
            }
          }
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
      }
    };
  
    const setConversations = (conversations: Conversation[]) => {
      if (activeSpaceId) {
        dispatch({
          type: ActionType.SET_CONVERSATIONS,
          payload: { spaceId: activeSpaceId, conversations },
        });
      }
    };
  
    const setActiveConversation = async (conversation: Conversation) => {
      dispatch({ type: ActionType.SET_ACTIVE_CONVERSATION, payload: conversation });
      try {
        const messagesResponse = await fetch(`/api/messages/${conversation.id}`);
        const messages = await messagesResponse.json();
        if (!messages.error) {
          dispatch({
            type: ActionType.SET_MESSAGES,
            payload: { conversationId: conversation.id, messages },
          });
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };
  
    const conversationsForActiveSpace = activeSpaceId
      ? state.conversations[activeSpaceId] || []
      : [];
  
    return {
      conversations: conversationsForActiveSpace,
      activeConversation: state.activeConversation,
      setConversations,
      setActiveConversation,
      loadConversations,
    };
  };
  
  /*----------------------------------------------------------------------------
    Custom Hook: useMessages
  ----------------------------------------------------------------------------*/
  export const useMessages = () => {
    const { state, dispatch } = useChatContext();
    const conversationId = state.activeConversation?.id;
  
    const loadMessages = async (conversationId: string) => {
      if (!conversationId) return;
      
      try {
        const response = await fetch(`/api/messages/${conversationId}`);
        const data = await response.json();
        
        if (!data.error) {
          dispatch({
            type: ActionType.SET_MESSAGES,
            payload: { conversationId, messages: data },
          });
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };
  
    // Add useEffect to load messages when conversation changes
    useEffect(() => {
      if (conversationId) {
        loadMessages(conversationId);
      }
    }, [conversationId]);
  
    const setMessages = (messages: Message[]) => {
      if (conversationId) {
        dispatch({
          type: ActionType.SET_MESSAGES,
          payload: { conversationId, messages },
        });
      }
    };
  
    const addMessage = (message: Message) => {
      if (conversationId) {
        dispatch({
          type: ActionType.ADD_MESSAGE,
          payload: { conversationId, message },
        });
      }
    };
  
    const messagesForActiveConversation = conversationId
      ? state.messages[conversationId] || []
      : [];
  
    return {
      messages: messagesForActiveConversation,
      setMessages,
      addMessage,
      loadMessages,
    };
  };
  