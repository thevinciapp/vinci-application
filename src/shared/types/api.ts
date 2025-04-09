export interface ApiErrorResponse {
  error: {
    message: string;
    code?: number;
    details?: Record<string, unknown>;
  };
  toast?: ToastConfig;
}

export interface ApiSuccessResponse<T = unknown> {
  data: T;
  toast?: ToastConfig;
}

export interface ToastConfig {
  title: string;
  description?: string;
  variant: 'default' | 'success' | 'warning' | 'error';
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';