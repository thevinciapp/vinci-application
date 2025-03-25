import { useCallback } from 'react';
import { CommandType } from '@/types/command';
import { toast } from '@/hooks/use-toast';

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