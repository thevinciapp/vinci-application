'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from '@/src/components/ui/use-toast';
import type { Space, Conversation, Message } from '@/src/types';

declare global {
  interface Window {
    electron: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      on: (channel: string, callback: (event: any, ...args: any[]) => void) => void;
      removeListener: (channel: string, callback: (event: any, ...args: any[]) => void) => void;
    };
  }
}

export interface AppState {
  spaces: Space[] | null;
  activeSpace: Space | null;
  conversations: Conversation[] | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const AppStateContext = createContext<{
  appState: AppState;
  refreshAppState: () => Promise<void>;
  setAppState: (newState: Partial<AppState>) => void;
  clearError: () => void;
}>({
  appState: {
    spaces: null,
    activeSpace: null,
    conversations: null,
    messages: [],
    isLoading: false,
    error: null,
    lastFetched: null,
  },
  refreshAppState: async () => {},
  setAppState: () => {},
  clearError: () => {},
});

export const useAppState = () => useContext(AppStateContext);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appState, setAppState] = useState<AppState>({
    spaces: null,
    activeSpace: null,
    conversations: null,
    messages: [],
    isLoading: true,
    error: null,
    lastFetched: null,
  });

  console.log('[AppStateProvider] Initial render');

  const refreshAppState = async () => {
    console.log('[AppStateProvider] refreshAppState called');
    try {
      setAppState(prev => {
        console.log('[AppStateProvider] Setting loading state');
        return { ...prev, isLoading: true, error: null, messages: prev.messages };
      });
      
      console.log('[AppStateProvider] Calling refreshAppData API');
      const freshState = await window.electron.invoke('refresh-app-data');
      console.log('[AppStateProvider] refreshAppData returned:', JSON.stringify(freshState, null, 2));
      
      if (!freshState || freshState.error) {
        throw new Error(freshState?.error || 'Failed to refresh app state');
      }

      // Create new object references for all nested objects
      console.log('[AppStateProvider] Updating state with fresh data');
      setAppState(prev => {
        const newState = {
          spaces: freshState.spaces ? [...freshState.spaces] : null,
          activeSpace: freshState.activeSpace ? { ...freshState.activeSpace } : null,
          conversations: freshState.conversations ? [...freshState.conversations] : null,
          messages: freshState.messages || [],
          isLoading: false,
          error: null,
          lastFetched: freshState.lastFetched || Date.now(),
        };
        console.log('[AppStateProvider] Previous activeSpace:', JSON.stringify(prev.activeSpace, null, 2));
        console.log('[AppStateProvider] New activeSpace:', JSON.stringify(newState.activeSpace, null, 2));
        return newState;
      });
      console.log('[AppStateProvider] State updated successfully');
    } catch (error) {
      console.error('[AppStateProvider] Error refreshing app state:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh data';
      setAppState(prev => { 
        console.log('[AppStateProvider] Setting error state');
        return {
          ...prev, 
          isLoading: false,
          error: errorMessage,
          messages: prev.messages
        };
      });
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const updateAppState = (newState: Partial<AppState>) => {
    console.log('[AppStateProvider] updateAppState called with:', JSON.stringify(newState, null, 2));
    setAppState(prev => {
      // Create a new state object with deep copies of nested objects
      const updated = { 
        ...prev,
        ...newState,
        // Ensure we create new references for these objects if they exist in newState
        spaces: newState.spaces ? [...newState.spaces] : prev.spaces,
        activeSpace: newState.activeSpace ? { ...newState.activeSpace } : prev.activeSpace,
        conversations: newState.conversations ? [...newState.conversations] : prev.conversations,
        error: null
      };
      
      console.log('[AppStateProvider] Previous state:', JSON.stringify(prev, null, 2));
      console.log('[AppStateProvider] Updated state:', JSON.stringify(updated, null, 2));
      
      window.electron.invoke('sync-app-state', updated).catch((error: Error) => {
        console.error('[AppStateProvider] Error syncing app state:', error);
        toast({
          title: "Error",
          description: "Failed to sync app state",
          variant: "destructive"
        });
      });
      
      return updated;
    });
  };

  const clearError = () => {
    console.log('[AppStateProvider] clearError called');
    setAppState(prev => ({ ...prev, error: null }));
  };

  useEffect(() => {
    console.log('[AppStateProvider] Setting up modelUpdated event listener');
    const handleModelUpdated = (event: CustomEvent) => {
      console.log('[AppStateProvider] modelUpdated event received:', event.detail);
      // Force a refresh of the app state
      refreshAppState();
    };

    window.addEventListener('modelUpdated', handleModelUpdated as EventListener);
    
    return () => {
      window.removeEventListener('modelUpdated', handleModelUpdated as EventListener);
    };
  }, []);

  useEffect(() => {
    console.log('[AppStateProvider] Setting up auth token sync');
    const syncAuthToken = async () => {
      try {
        const existingToken = await window.electron.invoke('get-auth-token');
        console.log('[AppStateProvider] Existing token found:', !!existingToken);
        if (existingToken) {
          const freshAppData = await window.electronAPI.refreshAppData();
          console.log('[AppStateProvider] Fresh app data with existing token:', !!freshAppData);
          if (freshAppData && !freshAppData.error) {
            setAppState(prev => {
              console.log('[AppStateProvider] Updating state with fresh data from existing token');
              return {
                ...prev,
                spaces: freshAppData.spaces || prev.spaces,
                activeSpace: freshAppData.activeSpace || prev.activeSpace,
                conversations: freshAppData.conversations || prev.conversations,
                messages: freshAppData.messages || prev.messages,
                isLoading: false,
                error: null,
                lastFetched: freshAppData.lastFetched || Date.now()
              };
            });
            return;
          }
        }
          
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          const data = await response.json();
          console.log('[AppStateProvider] Session API response:', !!data?.data?.session?.access_token);
          if (data?.data?.session?.access_token) {
            const success = await window.electron.invoke('set-auth-token', data.data.session.access_token);
            console.log('[AppStateProvider] Set auth token result:', success);
            
            if (success) {
              await new Promise(resolve => setTimeout(resolve, 500));
              const freshAppData = await window.electronAPI.refreshAppData();
              console.log('[AppStateProvider] Fresh app data after setting token:', !!freshAppData);
              if (freshAppData && !freshAppData.error) {
                setAppState(prev => {
                  console.log('[AppStateProvider] Updating state with fresh data after setting token');
                  return {
                    ...prev,
                    spaces: freshAppData.spaces || prev.spaces,
                    activeSpace: freshAppData.activeSpace || prev.activeSpace,
                    conversations: freshAppData.conversations || prev.conversations,
                    isLoading: false,
                    error: null,
                    lastFetched: freshAppData.lastFetched || Date.now()
                  };
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('[AppStateProvider] Failed to sync auth token:', error);
      }
    };
    
    syncAuthToken();
  }, []);

  useEffect(() => {
    console.log('[AppStateProvider] Setting up initial state fetch');
    const getInitialState = async () => {
      try {
        console.log('[AppStateProvider] Fetching initial app state');
        const initialState = await window.electronAPI.getAppState();
        console.log('[AppStateProvider] Initial state received:', !!initialState);
        
        if (!initialState || initialState.error) {
          throw new Error(initialState?.error || 'Failed to get initial app state');
        }

        setAppState(prev => {
          console.log('[AppStateProvider] Setting initial state');
          return {
            spaces: initialState.spaces || null,
            activeSpace: initialState.activeSpace || null,
            conversations: initialState.conversations || null,
            isLoading: false,
            error: null,
            lastFetched: initialState.lastFetched || Date.now(),
          };
        });
      } catch (error) {
        console.error('[AppStateProvider] Error getting initial app state:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to get initial app state';
        setAppState(prev => { 
          console.log('[AppStateProvider] Setting error state for initial fetch');
          return {
            ...prev, 
            isLoading: false,
            error: errorMessage
          };
        });
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
    };

    getInitialState();
  }, []);

  useEffect(() => {
    console.log('[AppStateProvider] Setting up app data update listener');
    const unsubscribe = window.electronAPI.onAppDataUpdated((event, updatedState) => {
      console.log('[AppStateProvider] App data updated event received:', !!updatedState);
      if (updatedState) {
        setAppState(prev => {
          console.log('[AppStateProvider] Previous activeSpace:', JSON.stringify(prev.activeSpace, null, 2));
          console.log('[AppStateProvider] New activeSpace:', JSON.stringify(updatedState.activeSpace, null, 2));
          return {
            spaces: updatedState.spaces || null,
            activeSpace: updatedState.activeSpace || null,
            conversations: updatedState.conversations || null,
            isLoading: false,
            error: null,
            lastFetched: updatedState.lastFetched || Date.now(),
          };
        });
      }
    });

    return () => {
      console.log('[AppStateProvider] Cleaning up app data update listener');
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <AppStateContext.Provider value={{ appState, refreshAppState, setAppState: updateAppState, clearError }}>
      {children}
    </AppStateContext.Provider>
  );
};