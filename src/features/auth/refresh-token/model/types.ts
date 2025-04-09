import { AuthSession } from '@/features/auth/model/types';

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  session: AuthSession | null;
}