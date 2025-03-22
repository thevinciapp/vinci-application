import { useState, useCallback, useEffect } from 'react';
import { CommandCenterEvents } from '@/core/ipc/constants';
import { CommandType, CommandCenterState, IpcResponse } from '@/types';

/**
 * Custom hook for managing command center state and IPC communication
 * Follows the component data flow patterns for state management and IPC events
 */
export function useCommandCenter() {
  const [state, setState] = useState<CommandCenterState>({
    isOpen: false,
    activeCommand: undefined,
    dialogType: undefined,
    dialogData: undefined
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleStateSync = (event: any, response: IpcResponse<Partial<CommandCenterState>>) => {
      if (response.success && response.data) {
        setState(prevState => ({
          ...prevState,
          ...response.data,
          isOpen: true
        }));
        console.log('[COMMAND] State synced:', response.data?.activeCommand);
      } else {
        setError(response.error || 'Failed to sync state');
      }
    };

    // Don't automatically toggle command center on hook mount
    // Let the shortcut keys control this instead
    const unsubscribe = window.electronAPI?.[CommandCenterEvents.SYNC_STATE]?.(handleStateSync);
    
    // Log the current command type for debugging
    console.log('[COMMAND] Hook initialized with command type:', state.activeCommand);
    
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [state.activeCommand]);

  const updateState = useCallback(async (newState: Partial<CommandCenterState>) => {
    try {
      setIsLoading(true);
      setError(null);

      // If changing command type, notify the main process
      if (newState.activeCommand && newState.activeCommand !== state.activeCommand) {
        await window.electronAPI?.openCommandType?.(newState.activeCommand);
      }

      setState(prevState => ({ ...prevState, ...newState }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [state.activeCommand]);

  const openDialog = async (dialogType: string, data: any) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await window.electronAPI?.openDialog?.(dialogType, data);
      if (response?.success) {
        setState(prevState => ({
          ...prevState,
          dialogType,
          dialogData: data
        }));
      } else {
        throw new Error(response?.error || 'Failed to open dialog');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const closeDialog = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await window.electronAPI?.closeDialog?.();
      if (response?.success) {
        setState(prevState => ({
          ...prevState,
          dialogType: undefined,
          dialogData: undefined
        }));
      } else {
        throw new Error(response?.error || 'Failed to close dialog');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const close = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await window.electronAPI?.closeCommandCenter?.(state.activeCommand);
      if (response?.success) {
        setState({
          isOpen: false,
          activeCommand: undefined,
          dialogType: undefined,
          dialogData: undefined
        });
      } else {
        throw new Error(response?.error || 'Failed to close command center');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  const refreshCommandCenter = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await window.electronAPI?.refreshCommandCenter?.(state.activeCommand);
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to refresh command center');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    state,
    isLoading,
    error,
    updateState,
    openDialog,
    closeDialog,
    close,
    refreshCommandCenter,
    currentProvider: state.activeCommand,
    currentDialog: state.dialogType ? { type: state.dialogType, data: state.dialogData } : null
  };
}
