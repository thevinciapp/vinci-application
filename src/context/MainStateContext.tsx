import React, { createContext, useState, useEffect, useContext, ReactNode, useMemo } from 'react';
import { MainProcessState } from '@/store/main'; // Assuming this path is correct
import { AppStateEvents } from '@/core/ipc/constants';

// Define the shape of the context value
interface MainStateContextType {
  state: Partial<MainProcessState>;
  isLoading: boolean;
  error: string | null;
}

// Create the context with a default value
const MainStateContext = createContext<MainStateContextType>({ 
  state: {}, 
  isLoading: true, 
  error: null 
});

interface MainStateProviderProps {
  children: ReactNode;
}

export const MainStateProvider: React.FC<MainStateProviderProps> = ({ children }) => {
  const [state, setState] = useState<Partial<MainProcessState>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // The single listener for state updates
    const handleStateUpdate = (
      _event: any,
      response: { success: boolean; data?: Partial<MainProcessState>; error?: string }
    ) => {
      if (!isMounted) return;

      if (response.success && response.data) {
        setState(response.data);
        setError(null); // Clear error on successful update
        // Only set loading to false after the first successful update
        if (isLoading) setIsLoading(false); 
      } else if (!response.success && response.error) {
        console.error('[MainStateProvider] Received state update error from main:', response.error);
        setError(response.error);
        // Decide if we should stop loading on error
        // setIsLoading(false); 
      }
    };

    console.log('[MainStateProvider] Setting up STATE_UPDATED listener.');
    const cleanup = window.electron.on(AppStateEvents.STATE_UPDATED, handleStateUpdate);

    // Request initial state when the provider mounts
    console.log('[MainStateProvider] Requesting initial state...');
    window.electron.invoke(AppStateEvents.GET_STATE)
      .then(response => {
        console.log('[MainStateProvider] Received initial state response.');
        if (isMounted) {
          handleStateUpdate(null, response); // Process initial state using the same handler
        } else {
            console.log('[MainStateProvider] Unmounted before initial state received.');
        }
      })
      .catch(err => {
        console.error('[MainStateProvider] Error requesting initial state:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to get initial state');
          setIsLoading(false); // Stop loading on initial fetch error
        }
      });

    // Cleanup function
    return () => {
        console.log('[MainStateProvider] Cleaning up STATE_UPDATED listener.');
        isMounted = false;
        if (cleanup) {
            cleanup(); // Call the cleanup function returned by window.electron.on
        }
    };
  }, []); // Empty dependency array ensures this runs only once

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    state,
    isLoading,
    error
  }), [state, isLoading, error]);

  return (
    <MainStateContext.Provider value={contextValue}>
      {children}
    </MainStateContext.Provider>
  );
};

// Custom hook to consume the context
export const useMainState = () => useContext(MainStateContext); 