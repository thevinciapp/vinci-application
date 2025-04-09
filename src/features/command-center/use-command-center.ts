import { useState, useCallback, useMemo } from 'react';
import { CommandType } from '@/features/command-palette/model/types';
import { IpcResponse } from '@/shared/types/ipc';
import { CommandCenterEvents } from '@/core/ipc/constants';
import { useMainState } from '@/context/MainStateContext';

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
  currentProvider?: CommandType;
  currentDialog: CommandCenterDialog | null;
}

async function handleIpcRequest<T>(
  eventName: string,
  args: unknown[],
  setLoading: (loading: boolean) => void,
  setError: (error: string | null) => void
): Promise<T | null> {
  try {
    setLoading(true);
    setError(null);
    const response: IpcResponse<T> = await window.electron.invoke(eventName, ...args);
    
    if (!response?.success) {
      throw new Error(response?.error || 'Operation failed');
    }
    
    return response.data === undefined ? null : response.data;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An error occurred';
    setError(errorMessage);
    return null;
  } finally {
    setLoading(false);
  }
}

export function useCommandCenter(): CommandCenterHookReturn {
  const { state: globalState, isLoading: isGlobalLoading, error: globalError } = useMainState();

  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const derivedState = useMemo(() => ({
    isOpen: globalState.isCommandCenterOpen || false,
    activeCommand: globalState.activeCommand,
    dialogType: globalState.dialogType,
    dialogData: globalState.dialogData,
    isDataLoaded: !isGlobalLoading
  }), [
    isGlobalLoading,
    globalState.isCommandCenterOpen,
    globalState.activeCommand,
    globalState.dialogType,
    globalState.dialogData
  ]);

  const updateState = useCallback(async (newState: Partial<CommandCenterHookState>) => {
    if (newState.activeCommand && newState.activeCommand !== derivedState.activeCommand) {
      await handleIpcRequest(
        CommandCenterEvents.SET_TYPE,
        [newState.activeCommand],
        setIsActionLoading,
        setActionError
      );
    }
  }, [derivedState.activeCommand]);

  const openDialog = useCallback(async (dialogType: string, data: unknown) => {
    await handleIpcRequest(
      CommandCenterEvents.OPEN_DIALOG,
      [dialogType, data],
      setIsActionLoading,
      setActionError
    );
  }, []);

  const closeDialog = useCallback(async () => {
    await handleIpcRequest(
      CommandCenterEvents.DIALOG_CLOSED,
      [],
      setIsActionLoading,
      setActionError
    );
  }, []);

  const close = useCallback(async () => {
    await handleIpcRequest(
      CommandCenterEvents.CLOSE,
      [],
      setIsActionLoading,
      setActionError
    );
  }, []);

  const refreshCommandCenter = useCallback(async () => {
    await handleIpcRequest(
      CommandCenterEvents.REFRESH,
      [],
      setIsActionLoading,
      setActionError
    );
  }, []);

  return {
    state: derivedState,
    isLoading: isGlobalLoading || isActionLoading,
    error: actionError || globalError,
    updateState,
    openDialog,
    closeDialog,
    close,
    refreshCommandCenter,
    currentProvider: derivedState.activeCommand,
    currentDialog: derivedState.dialogType ? { type: derivedState.dialogType, data: derivedState.dialogData } : null
  };
}
