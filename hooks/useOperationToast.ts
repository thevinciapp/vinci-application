import { useCallback } from 'react';
import { useToast } from './use-toast';
import { ActionResponse } from '@/app/actions/utils/responses';

/**
 * Hook for handling toast notifications from operation results
 * Provides a consistent way to show toast messages when operations complete
 */
export function useOperationToast() {
  const { toast } = useToast();
  
  const showToastFromResult = useCallback(<T>(result: ActionResponse<T>) => {
    if (result.toast) {
      const { title, description, variant } = result.toast;
      toast({
        title, 
        description,
        variant,
        // Use a longer duration to ensure user sees it
        duration: 3000
      });
    } else if (result.status === 'error' && result.error) {
      // Show error toast if we have an error but no toast defined
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
        duration: 3000
      });
    }
  }, [toast]);
  
  // Helper for showing custom toast
  const showCustomToast = useCallback((
    title: string,
    description: string,
    variant: 'default' | 'success' | 'destructive' = 'default'
  ) => {
    toast({ 
      title, 
      description, 
      variant, 
      duration: 3000 
    });
  }, [toast]);
  
  return { 
    showToastFromResult,
    showCustomToast
  };
} 