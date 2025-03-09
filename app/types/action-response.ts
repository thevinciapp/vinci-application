export interface ActionResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
