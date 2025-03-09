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
      if (typeof window !== 'undefined' && window.electronAPI) {
        setAppState(prev => ({ ...prev, isLoading: true, error: null }));
        try {
          const freshState = await window.electronAPI.refreshAppData();
          setAppState({
            spaces: freshState.spaces || null,
            activeSpace: freshState.activeSpace || null,
            conversations: freshState.conversations || null,
            isLoading: false,
            error: null,
            lastFetched: freshState.lastFetched || Date.now(),
          });
        } catch (electronError) {
          // Fallback to fetch API if Electron handler is not registered
          const response = await fetch('/api/app-state');
          if (!response.ok) {
            throw new Error('Failed to fetch app state');
          }
          const freshState = await response.json();
          setAppState({
            spaces: freshState.spaces || null,
            activeSpace: freshState.activeSpace || null,
            conversations: freshState.conversations || null,
            isLoading: false,
            error: null,
            lastFetched: Date.now(),
          });
        }
      } else {
        // In non-Electron environment, use fetch API
        const response = await fetch('/api/app-state');
        if (!response.ok) {
          throw new Error('Failed to fetch app state');
        }
        const freshState = await response.json();
        setAppState({
          spaces: freshState.spaces || null,
          activeSpace: freshState.activeSpace || null,
          conversations: freshState.conversations || null,
          isLoading: false,
          error: null,
          lastFetched: Date.now(),
        });
      }
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

  // Update the app state
  const updateAppState = (newState: Partial<AppState>) => {
    setAppState(prev => {
      const updated = { ...prev, ...newState, error: null };
      // Sync with Electron if available
      if (typeof window !== 'undefined' && window.electronAPI) {
        window.electronAPI.syncAppState(updated).catch(async (error: Error) => {
          console.error('Error syncing app state:', error);
          // Fallback to fetch API if Electron handler is not registered
          try {
            const response = await fetch('/api/app-state', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updated)
            });
            if (!response.ok) {
              throw new Error('Failed to sync app state');
            }
          } catch (fetchError) {
            console.error('Error syncing app state via fetch:', fetchError);
            toast({
              title: "Error",
              description: "Failed to sync app state",
              variant: "destructive"
            });
          }
        });
      } else {
        // In non-Electron environment, use fetch API
        fetch('/api/app-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated)
        }).catch(error => {
          console.error('Error syncing app state via fetch:', error);
          toast({
            title: "Error",
            description: "Failed to sync app state",
            variant: "destructive"
          });
        });
      }
      return updated;
    });
  };

  // Clear any error state
  const clearError = () => {
    setAppState(prev => ({ ...prev, error: null }));
  };

  // Sync auth token with Electron
  useEffect(() => {
    const syncAuthToken = async () => {
      if (typeof window !== 'undefined' && window.electronAPI) {
        try {
          // First check if we already have auth token in Electron
          const existingToken = await window.electronAPI.getAuthToken();
          if (existingToken) {
            console.log('Auth token already exists in Electron');
            // Refresh the data to verify the token is valid
            try {
              const freshAppData = await window.electronAPI.refreshAppData();
              if (freshAppData && !freshAppData.error) {
                console.log('Successfully refreshed app data with existing token');
                setAppState(prev => ({
                  ...prev,
                  spaces: freshAppData.spaces || prev.spaces,
                  activeSpace: freshAppData.activeSpace || prev.activeSpace,
                  conversations: freshAppData.conversations || prev.conversations,
                  isLoading: false,
                  error: null,
                  lastFetched: freshAppData.lastFetched || Date.now()
                }));
                return; // Exit early if we already have a valid token
              } else {
                console.log('Existing token may be invalid, attempting to refresh');
              }
            } catch (refreshError) {
              console.error('Failed to refresh with existing token:', refreshError);
            }
          }
          
          // Fetch the current session if needed
          const response = await fetch('/api/auth/session');
          if (response.ok) {
            const data = await response.json();
            if (data?.data?.session?.access_token) {
              // Pass the token to Electron - this will trigger the endpoint
              // that fetches and caches auth cookies
              const success = await window.electronAPI.setAuthToken(data.data.session.access_token);
              console.log('Auth token synced with Electron on initialization:', success ? 'success' : 'failed');
              
              if (success) {
                // Add a small delay to ensure cookies are properly processed
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Refresh the data now that we have auth credentials
                try {
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
                  } else {
                    console.error('Failed to get data after token refresh:', freshAppData?.error);
                  }
                } catch (refreshError) {
                  console.error('Failed to refresh app data after auth token sync:', refreshError);
                }
              }
            }
          }
        } catch (error) {
          console.error('Failed to sync auth token:', error);
        }
      }
    };
    
    syncAuthToken();
  }, []);

  // Initialize the app state
  useEffect(() => {
    const getInitialState = async () => {
      try {
        if (typeof window !== 'undefined' && window.electronAPI) {
          try {
            const initialState = await window.electronAPI.getAppState();
            if (initialState) {
              setAppState({
                spaces: initialState.spaces || null,
                activeSpace: initialState.activeSpace || null,
                conversations: initialState.conversations || null,
                isLoading: false,
                error: null,
                lastFetched: initialState.lastFetched || Date.now(),
              });
              return;
            }
          } catch (electronError) {
            console.log('Electron API not available, falling back to fetch');
          }
        }

        // Fallback to fetch API
        const response = await fetch('/api/app-state');
        if (!response.ok) {
          throw new Error('Failed to fetch initial app state');
        }
        const initialState = await response.json();
        setAppState({
          spaces: initialState.spaces || null,
          activeSpace: initialState.activeSpace || null,
          conversations: initialState.conversations || null,
          isLoading: false,
          error: null,
          lastFetched: Date.now(),
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
            error: null,
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
    <AppStateContext.Provider value={{ appState, refreshAppState, setAppState: updateAppState, clearError }}>
      {children}
    </AppStateContext.Provider>
  );
};