import React, { createContext, useState, useEffect, useContext, ReactNode, useMemo } from 'react';
import { MainProcessState } from '@/stores/main';
import { AppStateEvents } from '@/core/ipc/constants';

interface MainStateContextType {
  state: Partial<MainProcessState>;
  isLoading: boolean;
  error: string | null;
}

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

    const handleStateUpdate = (
      _event: Electron.IpcRendererEvent,
      response: { success: boolean; data?: Partial<MainProcessState>; error?: string }
    ) => {
      if (!isMounted) return;

      if (response.success && response.data) {
        console.log('[MainStateProvider] Received state update:', response.data);
        setState(response.data);
        setError(null);
        if (isLoading) setIsLoading(false); 
      } else if (!response.success && response.error) {
        console.error('[MainStateProvider] Received state update error from main:', response.error);
        setError(response.error);
        setIsLoading(false); 
      }
    };

    const cleanup = window.electron.on(AppStateEvents.STATE_UPDATED, (event: unknown, ...args: unknown[]) => {
  handleStateUpdate(
    event as Electron.IpcRendererEvent,
    args[0] as { success: boolean; data?: Partial<MainProcessState>; error?: string }
  );
});

    window.electron.invoke(AppStateEvents.GET_STATE)
      .then(response => {
        if (isMounted) {
          handleStateUpdate({} as Electron.IpcRendererEvent, response as { success: boolean; data?: Partial<MainProcessState>; error?: string }); // Process initial state using the same handler
        } else {
            console.log('[MainStateProvider] Unmounted before initial state received.');
        }
      })
      .catch(err => {
        console.error('[MainStateProvider] Error requesting initial state:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to get initial state');
          setIsLoading(false); 
        }
      });

    return () => {
        console.log('[MainStateProvider] Cleaning up STATE_UPDATED listener.');
        isMounted = false;
        if (cleanup) {
            cleanup();
        }
    };
  }, []); 

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