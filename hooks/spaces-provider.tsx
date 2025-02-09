import React, { createContext, useContext, useReducer, useMemo, ReactNode, useEffect } from 'react';
import { Space } from '@/types';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

interface SpacesState {
  spaces: Space[];
  activeSpace: Space | null;
  isInitialized: boolean;
  error: string | null;
}

const initialState: SpacesState = {
  spaces: [],
  activeSpace: null,
  isInitialized: false,
  error: null
};

enum ActionType {
  SET_SPACES = 'SET_SPACES',
  SET_ACTIVE_SPACE = 'SET_ACTIVE_SPACE',
  SET_INITIALIZED = 'SET_INITIALIZED',
  SET_ERROR = 'SET_ERROR'
}

type Action =
  | { type: ActionType.SET_SPACES; payload: Space[] }
  | { type: ActionType.SET_ACTIVE_SPACE; payload: Space | null }
  | { type: ActionType.SET_INITIALIZED; payload: boolean }
  | { type: ActionType.SET_ERROR; payload: string | null }

function spacesReducer(state: SpacesState, action: Action): SpacesState {
  switch (action.type) {
    case ActionType.SET_SPACES:
      return { ...state, spaces: action.payload };
    case ActionType.SET_ACTIVE_SPACE:
      return { ...state, activeSpace: action.payload };
    case ActionType.SET_INITIALIZED:
      return { ...state, isInitialized: action.payload };
    case ActionType.SET_ERROR:
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

const SpacesContext = createContext<{
  state: SpacesState;
  dispatch: React.Dispatch<Action>;
} | undefined>(undefined);

export function SpacesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(spacesReducer, {
    ...initialState,
    isInitialized: true // Start with initialized true to prevent loading screen
  });

  useEffect(() => {
    const initializeSpaces = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const response = await fetch('/api/spaces');
        const data = await response.json();
        
        if (!data.error) {
          dispatch({ type: ActionType.SET_SPACES, payload: data });
          
          if (data.length > 0) {
            const activeSpace = data.find((s: Space) => s.isActive);
            if (activeSpace) {
              dispatch({ type: ActionType.SET_ACTIVE_SPACE, payload: activeSpace });
            } else {
              // If no active space, set the first one as active
              const spaceResponse = await fetch(`/api/spaces/${data[0].id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ setActive: true })
              });
              
              if (spaceResponse.ok) {
                const updatedSpace = await spaceResponse.json();
                dispatch({ type: ActionType.SET_ACTIVE_SPACE, payload: updatedSpace });
              }
            }
          } else {
            // Create initial space synchronously if none exists
            const spaceResponse = await fetch('/api/spaces', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: 'My Space',
                description: 'My first space',
                model: 'deepseek-r1-distill-llama-70b',
                provider: 'groq',
                setActive: true
              })
            });

            if (spaceResponse.ok) {
              const spaceData = await spaceResponse.json();
              dispatch({ type: ActionType.SET_SPACES, payload: [spaceData] });
              dispatch({ type: ActionType.SET_ACTIVE_SPACE, payload: spaceData });
            }
          }
        }
      } catch (error) {
        console.error('Error initializing spaces:', error);
      }
    };

    initializeSpaces();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        initializeSpaces();
      } else {
        // Reset state when user logs out
        dispatch({ type: ActionType.SET_SPACES, payload: [] });
        dispatch({ type: ActionType.SET_ACTIVE_SPACE, payload: null });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <SpacesContext.Provider value={value}>
      {children}
    </SpacesContext.Provider>
  );
}

export function useSpaces() {
  const context = useContext(SpacesContext);
  if (!context) {
    throw new Error('useSpaces must be used within a SpacesProvider');
  }

  const { state, dispatch } = context;

  const setSpaces = (spaces: Space[]) => {
    dispatch({ type: ActionType.SET_SPACES, payload: spaces });
  };

  const setActiveSpace = (space: Space) => {
    dispatch({ type: ActionType.SET_ACTIVE_SPACE, payload: space });
  };

  return {
    spaces: state.spaces,
    activeSpace: state.activeSpace,
    state,
    setSpaces,
    setActiveSpace
  };
} 