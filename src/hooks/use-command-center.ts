import { useState, useCallback } from 'react';
import { CommandCenterEvents } from '@/core/ipc/constants';
import { CommandCenterState } from '@/types/electron';

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

  /**
   * Setup command center state listener
   */
  const setupCommandCenterListener = useCallback(() => {
    // Set up listener for state synchronization
    const handler = (event: any, action: string, data: any) => {
      setState(prevState => ({
        ...prevState,
        isOpen: action === 'open',
        activeCommand: action === 'open' ? data : undefined,
        dialogType: undefined,
        dialogData: undefined
      }));
    };

    const cleanup = window.electronAPI?.[CommandCenterEvents.SYNC_STATE]?.(handler);

    // Return cleanup function
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const updateState = async (newState: Partial<CommandCenterState>) => {
    try {
      setIsLoading(true);
      setError(null);
      setState(prevState => ({ ...prevState, ...newState }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const openDialog = async (dialogType: string, data: any) => {
    try {
      setIsLoading(true);
      setError(null);
      await window.electronAPI?.[CommandCenterEvents.OPEN_DIALOG]?.(dialogType, data);
      setState(prevState => ({
        ...prevState,
        dialogType,
        dialogData: data
      }));
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
      await window.electronAPI?.[CommandCenterEvents.DIALOG_CLOSED]?.();
      setState(prevState => ({
        ...prevState,
        dialogType: undefined,
        dialogData: undefined
      }));
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
      await window.electronAPI?.[CommandCenterEvents.CLOSE]?.();
      setState({
        isOpen: false,
        activeCommand: undefined,
        dialogType: undefined,
        dialogData: undefined
      });
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
      await window.electronAPI?.[CommandCenterEvents.REFRESH]?.();
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
    setupCommandCenterListener,
    updateState,
    openDialog,
    closeDialog,
    close,
    refreshCommandCenter,
    currentProvider: state.activeCommand,
    currentDialog: state.dialogType ? { type: state.dialogType, data: state.dialogData } : null
  };
}
