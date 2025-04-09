import { IpcResponse } from '@/shared/types/ipc';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in seconds
  userId: string;
}

export interface AuthResponse extends IpcResponse {
  data?: unknown;
}