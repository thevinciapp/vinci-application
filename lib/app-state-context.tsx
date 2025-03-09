'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Space, Conversation } from '@/types';

export interface AppState {
  spaces: Space[] | null;
  activeSpace: Space | null;
  conversations: Conversation[] | null;
  isLoading: boolean;
  lastFetched: number | null;
}

const AppStateContext = createContext<{
  appState: AppState;
  refreshAppState: () => Promise<void>;
  setAppState: (newState: Partial<AppState>) => void;
}>({
  appState: {
    spaces: null,
    activeSpace: null,
    conversations: null,
    isLoading: false,
    lastFetched: null,
  },
  refreshAppState: async () => {},
  setAppState: () => {},
});

export const useAppState = () => useContext(AppStateContext);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appState, setAppState] = useState<AppState>({
    spaces: null,
    activeSpace: null,
    conversations: null,
    isLoading: true,
    lastFetched: null,
  });

  const refreshAppState = async () => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        setAppState(prev => ({ ...prev, isLoading: true }));
        const freshState = await window.electronAPI.refreshAppData();
        setAppState({
          spaces: freshState.spaces || null,
          activeSpace: freshState.activeSpace || null,
          conversations: freshState.conversations || null,
          isLoading: false,
          lastFetched: freshState.lastFetched || Date.now(),
        });
      }
    } catch (error) {
      console.error('Error refreshing app state:', error);
      setAppState(prev => ({ ...prev, isLoading: false }));
      toast.error('Failed to refresh data');
    }
  };

  // Update the app state
  const updateAppState = (newState: Partial<AppState>) => {
    setAppState(prev => {
      const updated = { ...prev, ...newState };
      // Sync with Electron if available
      if (typeof window !== 'undefined' && window.electronAPI) {
        window.electronAPI.syncAppState(updated);
      }
      return updated;
    });
  };

  // Initialize the app state from Electron
  useEffect(() => {
    const getInitialState = async () => {
      try {
        if (typeof window !== 'undefined' && window.electronAPI) {
          const initialState = await window.electronAPI.getAppState();
          if (initialState) {
            setAppState({
              spaces: initialState.spaces || null,
              activeSpace: initialState.activeSpace || null,
              conversations: initialState.conversations || null,
              isLoading: false,
              lastFetched: initialState.lastFetched || Date.now(),
            });
          } else {
            // If we couldn't get the state, trigger a refresh
            await refreshAppState();
          }
        } else {
          // Not in Electron, mark as not loading
          setAppState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Error getting initial app state:', error);
        setAppState(prev => ({ ...prev, isLoading: false }));
      }
    };

    getInitialState();
  }, []);

  // Listen for app state updates from Electron
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const unsubscribe = window.electronAPI.onAppDataUpdated((event, updatedState) => {
        if (updatedState) {
          setAppState({
            spaces: updatedState.spaces || null,
            activeSpace: updatedState.activeSpace || null,
            conversations: updatedState.conversations || null,
            isLoading: false,
            lastFetched: updatedState.lastFetched || Date.now(),
          });
        }
      });

      // Clean up listener on unmount
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, []);

  return (
    <AppStateContext.Provider value={{ appState, refreshAppState, setAppState: updateAppState }}>
      {children}
    </AppStateContext.Provider>
  );
};