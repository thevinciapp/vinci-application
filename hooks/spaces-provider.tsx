import React, { createContext, useContext, useReducer, useMemo, ReactNode, useEffect } from 'react';
import { Space } from '@/types';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

interface SpacesState {
  spaces: Space[];
  activeSpace: Space | null;
  isInitialized: boolean;
}

const initialState: SpacesState = {
  spaces: [],
  activeSpace: null,
  isInitialized: false
};

enum SpacesActionType {
  SET_SPACES = 'SET_SPACES',
  SET_ACTIVE_SPACE = 'SET_ACTIVE_SPACE',
  SET_INITIALIZED = 'SET_INITIALIZED'
}

type SpacesAction =
  | { type: SpacesActionType.SET_SPACES; payload: Space[] }
  | { type: SpacesActionType.SET_ACTIVE_SPACE; payload: Space }
  | { type: SpacesActionType.SET_INITIALIZED; payload: boolean };

function spacesReducer(state: SpacesState, action: SpacesAction): SpacesState {
  switch (action.type) {
    case SpacesActionType.SET_SPACES:
      return { ...state, spaces: action.payload };
    case SpacesActionType.SET_ACTIVE_SPACE:
      return { ...state, activeSpace: action.payload };
    case SpacesActionType.SET_INITIALIZED:
      return { ...state, isInitialized: action.payload };
    default:
      return state;
  }
}

interface SpacesContextProps {
  state: SpacesState;
  dispatch: React.Dispatch<SpacesAction>;
}

const SpacesContext = createContext<SpacesContextProps | undefined>(undefined);

export function SpacesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(spacesReducer, initialState);

  // Initialize spaces when provider mounts
  useEffect(() => {
    const initializeSpaces = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const response = await fetch('/api/spaces');
        const data = await response.json();
        
        if (!data.error) {
          dispatch({ type: SpacesActionType.SET_SPACES, payload: data });
          
          if (data.length > 0) {
            // Find the active space or use the first one
            const activeSpace = data.find(space => space.isActive) || data[0];
            dispatch({ type: SpacesActionType.SET_ACTIVE_SPACE, payload: activeSpace });
          } else {
            // Create initial space if none exists
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
              dispatch({ type: SpacesActionType.SET_SPACES, payload: [spaceData] });
              dispatch({ type: SpacesActionType.SET_ACTIVE_SPACE, payload: spaceData });
            }
          }
        }
      } catch (error) {
        console.error('Error initializing spaces:', error);
      } finally {
        dispatch({ type: SpacesActionType.SET_INITIALIZED, payload: true });
      }
    };

    initializeSpaces();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        initializeSpaces();
      } else {
        // Reset state when user logs out
        dispatch({ type: SpacesActionType.SET_SPACES, payload: [] });
        dispatch({ type: SpacesActionType.SET_ACTIVE_SPACE, payload: null });
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

function useSpacesContext() {
  const context = useContext(SpacesContext);
  if (!context) {
    throw new Error('useSpacesContext must be used within a SpacesProvider');
  }
  return context;
}

export function useSpaces() {
  const { state, dispatch } = useSpacesContext();

  const loadSpaces = async (userId: string) => {
    try {
      const response = await fetch('/api/spaces');
      const data = await response.json();
      if (!data.error) {
        dispatch({ type: SpacesActionType.SET_SPACES, payload: data });
        // If there are spaces and no active space, set the first one as active
        if (data.length > 0 && !state.activeSpace) {
          dispatch({ type: SpacesActionType.SET_ACTIVE_SPACE, payload: data[0] });
        }
      }
    } catch (error) {
      console.error('Error loading spaces:', error);
    }
  };

  const setActiveSpace = (space: Space) => {
    dispatch({ type: SpacesActionType.SET_ACTIVE_SPACE, payload: space });
  };

  const setSpaces = (spaces: Space[]) => {
    dispatch({ type: SpacesActionType.SET_SPACES, payload: spaces });
  };

  return {
    state,
    spaces: state.spaces,
    activeSpace: state.activeSpace,
    setActiveSpace,
    setSpaces,
    loadSpaces,
  };
} 