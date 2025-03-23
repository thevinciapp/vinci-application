import { useState, useEffect } from 'react';
import { useRendererStore } from '@/store/renderer';

export function useAppState() {
  const rendererStore = useRendererStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchState = async () => {
      try {
        setIsLoading(true);
        await rendererStore.fetchAppState();
      } catch (error) {
        if (mounted) {
          console.error('[useAppState] Error fetching app state:', error);
          setError(error instanceof Error ? error : new Error('Failed to fetch app state'));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchState();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    isLoading,
    error,
    refetch: async () => {
      setIsLoading(true);
      try {
        await rendererStore.fetchAppState();
      } catch (error) {
        setError(error instanceof Error ? error : new Error('Failed to fetch app state'));
      } finally {
        setIsLoading(false);
      }
    }
  };
} 