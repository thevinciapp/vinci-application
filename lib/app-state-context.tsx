'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import type { Space, Conversation } from '@/types';

export interface AppState {
  spaces: Space[] | null;
  activeSpace: Space | null;
  conversations: Conversation[] | null;
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
    isLoading: true,
    error: null,
    lastFetched: null,
  });

  const refreshAppState = async () => {
    try {
      setAppState(prev => ({ ...prev, isLoading: true, error: null }));
      const freshState = await window.electronAPI.refreshAppData();
      
      if (!freshState || freshState.error) {
        throw new Error(freshState?.error || 'Failed to refresh app state');
      }

      setAppState({
        spaces: freshState.spaces || null,
        activeSpace: freshState.activeSpace || null,
        conversations: freshState.conversations || null,
        isLoading: false,
        error: null,
        lastFetched: freshState.lastFetched || Date.now(),
      });
    } catch (error) {
      console.error('Error refreshing app state:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh data';
      setAppState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: errorMessage
      }));
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const updateAppState = (newState: Partial<AppState>) => {
    setAppState(prev => {
      const updated = { ...prev, ...newState, error: null };
      window.electronAPI.syncAppState(updated).catch((error: Error) => {
        console.error('Error syncing app state:', error);
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
    setAppState(prev => ({ ...prev, error: null }));
  };

  useEffect(() => {
    const syncAuthToken = async () => {
      try {
        const existingToken = await window.electronAPI.getAuthToken();
        if (existingToken) {
          const freshAppData = await window.electronAPI.refreshAppData();
          if (freshAppData && !freshAppData.error) {
            setAppState(prev => ({
              ...prev,
              spaces: freshAppData.spaces || prev.spaces,
              activeSpace: freshAppData.activeSpace || prev.activeSpace,
              conversations: freshAppData.conversations || prev.conversations,
              isLoading: false,
              error: null,
              lastFetched: freshAppData.lastFetched || Date.now()
            }));
            return;
          }
        }
          
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          const data = await response.json();
          if (data?.data?.session?.access_token) {
            const success = await window.electronAPI.setAuthToken(data.data.session.access_token);
            
            if (success) {
              await new Promise(resolve => setTimeout(resolve, 500));
              const freshAppData = await window.electronAPI.refreshAppData();
              if (freshAppData && !freshAppData.error) {
                setAppState(prev => ({
                  ...prev,
                  spaces: freshAppData.spaces || prev.spaces,
                  activeSpace: freshAppData.activeSpace || prev.activeSpace,
                  conversations: freshAppData.conversations || prev.conversations,
                  isLoading: false,
                  error: null,
                  lastFetched: freshAppData.lastFetched || Date.now()
                }));
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to sync auth token:', error);
      }
    };
    
    syncAuthToken();
  }, []);

  useEffect(() => {
    const getInitialState = async () => {
      try {
        const initialState = await window.electronAPI.getAppState();
        if (!initialState || initialState.error) {
          throw new Error(initialState?.error || 'Failed to get initial app state');
        }

        setAppState({
          spaces: initialState.spaces || null,
          activeSpace: initialState.activeSpace || null,
          conversations: initialState.conversations || null,
          isLoading: false,
          error: null,
          lastFetched: initialState.lastFetched || Date.now(),
        });
      } catch (error) {
        console.error('Error getting initial app state:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to get initial app state';
        setAppState(prev => ({ 
          ...prev, 
          isLoading: false,
          error: errorMessage
        }));
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
    const unsubscribe = window.electronAPI.onAppDataUpdated((event, updatedState) => {
      if (updatedState) {
        setAppState({
          spaces: updatedState.spaces || null,
          activeSpace: updatedState.activeSpace || null,
          conversations: updatedState.conversations || null,
          isLoading: false,
          error: null,
          lastFetched: updatedState.lastFetched || Date.now(),
        });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <AppStateContext.Provider value={{ appState, refreshAppState, setAppState: updateAppState, clearError }}>
      {children}
    </AppStateContext.Provider>
  );
};