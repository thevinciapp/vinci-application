import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type OperationResult = {
  redirectTo?: string;
  [key: string]: any;
};

/**
 * Hook for managing loading states during routing transitions
 * Ensures the UI stays in loading state until navigation completes
 */
export function useRouteTransition() {
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const navigateWhenReady = useCallback(async (
    operation: () => Promise<OperationResult>,
    fallbackPath?: string
  ) => {
    setIsTransitioning(true);
    
    try {
      const result = await operation();
      
      if (result?.redirectTo) {
        await router.push(result.redirectTo);
      } else if (fallbackPath) {
        await router.push(fallbackPath);
      }
      
      return result;
    } catch (error) {
      console.error('Navigation error:', error);
      return null;
    } finally {
      // Use a small delay to ensure the UI doesn't flash
      setTimeout(() => setIsTransitioning(false), 300);
    }
  }, [router]);
  
  return { 
    navigateWhenReady, 
    isTransitioning 
  };
} 