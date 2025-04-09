import { AuthSession } from '@/features/auth/model/types';

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignInResponse {
  session: AuthSession | null;
}