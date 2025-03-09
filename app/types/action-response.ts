export interface ActionResponse<T> {
  status: 'success' | 'error';
  data?: T;
  error?: string;
  message?: string;
  redirectTo?: string;
  toast?: {
    title: string;
    description: string;
    variant: 'default' | 'success' | 'destructive';
  };
}
