"use server";

/**
 * Standardized response types for consistent error handling
 */
export interface ActionResponse<T> {
  status: 'success' | 'error';
  data?: T;
  error?: string;
  redirectTo?: string; // Add optional redirect URL
  toast?: {
    title: string;
    description: string;
    variant: 'default' | 'success' | 'destructive';
  };
}

/**
 * Create a successful response
 */
export async function successResponse<T>(data: T, toast?: ActionResponse<T>['toast'], redirectTo?: string): Promise<ActionResponse<T>> {
  return {
    status: 'success',
    data,
    toast,
    redirectTo
  };
}

/**
 * Create an error response
 */
export async function errorResponse<T>(error: string, toast?: ActionResponse<T>['toast']): Promise<ActionResponse<T>> {
  return {
    status: 'error',
    error,
    toast: toast || {
      title: 'Error',
      description: error,
      variant: 'destructive'
    }
  };
}

/**
 * Create a not found response
 */
export async function notFoundResponse<T>(resource = 'Resource'): Promise<ActionResponse<T>> {
  return await errorResponse<T>(`${resource} not found`, 404);
}

/**
 * Create an unauthorized response
 */
export async function unauthorizedResponse<T>(): Promise<ActionResponse<T>> {
  return await errorResponse<T>('Unauthorized', 401);
}

/**
 * Handle errors consistently across server actions
 */
export async function handleActionError<T>(error: any): Promise<ActionResponse<T>> {
  console.error('Server action error:', error);
  
  let errorMessage = 'An unexpected error occurred';
  
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  }
  
  return errorResponse(errorMessage, {
    title: 'Action Failed',
    description: errorMessage,
    variant: 'destructive'
  });
} 