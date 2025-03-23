import { useState, useCallback, useEffect } from 'react';
import { CommandCenterEvents } from '@/core/ipc/constants';
import { CommandType, CommandCenterStateData as CommandCenterState, IpcResponse } from '@/types';

interface CommandCenterDialog {
  type: string;
  data: unknown;
}

interface CommandCenterHookState {
  isOpen: boolean;
  activeCommand?: CommandType;
  dialogType?: string;
  dialogData?: unknown;
  isDataLoaded: boolean;
}

interface CommandCenterHookReturn {
  state: CommandCenterHookState;
  isLoading: boolean;
  error: string | null;
  updateState: (newState: Partial<CommandCenterHookState>) => Promise<void>;
  openDialog: (dialogType: string, data: unknown) => Promise<void>;
  closeDialog: () => Promise<void>;
  close: () => Promise<void>;
  refreshCommandCenter: () => Promise<void>;
  preloadData: () => Promise<void>;
  currentProvider?: CommandType;
  currentDialog: CommandCenterDialog | null;
}

const initialState: CommandCenterHookState = {
  isOpen: false,
  activeCommand: undefined,
  dialogType: undefined,
  dialogData: undefined,
  isDataLoaded: false
};

type ElectronAPIKey = 'open-command-type' | 'open-dialog' | 'close-dialog' | 'close-command-center' | 'refresh-command-center';

async function handleIpcRequest<T>(
  request: () => Promise<IpcResponse<T>>,
  setLoading: (loading: boolean) => void,
  setError: (error: string | null) => void
): Promise<T | null> {
  try {
    setLoading(true);
    setError(null);
    const response = await request();
    
    if (!response?.success) {
      throw new Error(response?.error || 'Operation failed');
    }
    
    return response.data || null;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An error occurred';
    setError(errorMessage);
    return null;
  } finally {
    setLoading(false);
  }
}

async function callElectronAPI<T>(
  key: ElectronAPIKey,
  args?: unknown[]
): Promise<IpcResponse<T>> {
  const api = window.electronAPI?.[key];
  if (!api) {
    return { success: false, error: `API ${key} not found` };
  }
  try {
    return await api(...(args || []));
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export function useCommandCenter(): CommandCenterHookReturn {
  const [state, setState] = useState<CommandCenterHookState>(initialState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const preloadData = useCallback(async () => {
    if (state.isDataLoaded) return;

    await handleIpcRequest(
      () => callElectronAPI('refresh-command-center'),
      setIsLoading,
      setError
    );

    setState(prev => ({ ...prev, isDataLoaded: true }));
  }, [state.isDataLoaded]);

  useEffect(() => {
    if (isInitialized) return;

    const handleStateSync = (event: unknown, action: string, data: IpcResponse<Partial<CommandCenterState>>) => {
      if (data.success && data.data) {
        setState(prevState => ({
          ...prevState,
          ...data.data,
          isOpen: true,
          isDataLoaded: true
        }));
      } else {
        setError(data.error || 'Failed to sync state');
      }
    };

    const unsubscribe = window.electronAPI?.[CommandCenterEvents.SYNC_STATE]?.(handleStateSync);
    setIsInitialized(true);

    // Preload data when the hook is first initialized
    preloadData().catch(err => {
      console.error('Failed to preload command center data:', err);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [isInitialized, preloadData]);

  const updateState = useCallback(async (newState: Partial<CommandCenterHookState>) => {
    if (newState.activeCommand && newState.activeCommand !== state.activeCommand) {
      await handleIpcRequest(
        () => callElectronAPI('open-command-type', [newState.activeCommand]),
        setIsLoading,
        setError
      );
    }
    setState(prevState => ({ ...prevState, ...newState }));
  }, [state.activeCommand]);

  const openDialog = useCallback(async (dialogType: string, data: unknown) => {
    const response = await handleIpcRequest(
      () => callElectronAPI('open-dialog', [dialogType, data]),
      setIsLoading,
      setError
    );
    
    if (response) {
      setState(prevState => ({
        ...prevState,
        dialogType,
        dialogData: data
      }));
    }
  }, []);

  const closeDialog = useCallback(async () => {
    const response = await handleIpcRequest(
      () => callElectronAPI('close-dialog'),
      setIsLoading,
      setError
    );
    
    if (response) {
      setState(prevState => ({
        ...prevState,
        dialogType: undefined,
        dialogData: undefined
      }));
    }
  }, []);

  const close = useCallback(async () => {
    const response = await handleIpcRequest(
      () => callElectronAPI('close-command-center'),
      setIsLoading,
      setError
    );
    
    if (response) {
      setState(prev => ({ ...prev, isOpen: false, activeCommand: undefined, dialogType: undefined, dialogData: undefined }));
    }
  }, []);

  const refreshCommandCenter = useCallback(async () => {
    await handleIpcRequest(
      () => callElectronAPI('refresh-command-center'),
      setIsLoading,
      setError
    );
  }, []);

  return {
    state,
    isLoading,
    error,
    updateState,
    openDialog,
    closeDialog,
    close,
    refreshCommandCenter,
    preloadData,
    currentProvider: state.activeCommand,
    currentDialog: state.dialogType ? { type: state.dialogType, data: state.dialogData } : null
  };
}
