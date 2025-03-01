import { useState, useCallback } from 'react';

interface OperationCallbacks<T> {
  onSuccess?: (result: T) => void | Promise<void>;
  onError?: (error: any) => void | Promise<void>;
}

/**
 * Hook for managing loading states during async operations
 * Ensures loading state persists until the entire operation completes
 */
export function useLoadingOperation<T>(
  operationFn: (...args: any[]) => Promise<T>,
  callbacks: OperationCallbacks<T> = {}
) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<any>(null);
  
  const execute = useCallback(async (...args: any[]) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const operationResult = await operationFn(...args);
      setResult(operationResult);
      
      if (callbacks.onSuccess) {
        await callbacks.onSuccess(operationResult);
      }
      
      return operationResult;
    } catch (err) {
      setError(err);
      
      if (callbacks.onError) {
        await callbacks.onError(err);
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [operationFn, callbacks]);
  
  return { 
    execute, 
    isLoading, 
    result, 
    error,
    reset: useCallback(() => {
      setResult(null);
      setError(null);
    }, [])
  };
} 