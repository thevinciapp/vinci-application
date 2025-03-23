import { IpcResponse } from '@/types/ipc';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in seconds
  userId: string;
}

export interface AuthResponse extends IpcResponse {
  data?: any;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignInResponse {
  session: AuthSession | null;
}

export interface SignUpRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface SignUpResponse {
  session: AuthSession | null;
  userId: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  session: AuthSession | null;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}