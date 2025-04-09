import { useCallback } from 'react';
import { CommandType } from '@/features/command-palette/model/types';
import { toast } from 'shared/hooks/use-toast';

export function useCommandWindow() {
  const handleCommandWindowToggle = useCallback(async (commandType: CommandType) => {
    try {
      await window.electron.invoke('command-center:toggle', commandType);
    } catch (error) {
      console.error('Failed to toggle command window:', error);
      toast({
        title: 'Error',
        description: 'Failed to open command window',
        variant: 'destructive',
      });
    }
  }, []);

  return {
    handleCommandWindowToggle
  };
} 