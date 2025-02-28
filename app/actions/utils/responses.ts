"use server";

/**
 * Standardized response types for consistent error handling
 */
export type ActionResponse<T> = {
  data: T | null;
  error: string | null;
  status: number;
};

/**
 * Create a successful response
 */
export async function successResponse<T>(data: T): Promise<ActionResponse<T>> {
  return {
    data,
    error: null,
    status: 200,
  };
}

/**
 * Create an error response
 */
export async function errorResponse<T>(message: string, status = 400): Promise<ActionResponse<T>> {
  return {
    data: null,
    error: message,
    status,
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
 * Handle errors in a consistent way
 */
export async function handleActionError<T>(error: any): Promise<ActionResponse<T>> {
  console.error('Action error:', error);
  
  // Check if it's an Error object
  if (error instanceof Error) {
    return await errorResponse<T>(error.message);
  }
  
  // Handle other error types
  return await errorResponse<T>('An unexpected error occurred');
} 