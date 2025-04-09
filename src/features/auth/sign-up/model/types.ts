import { AuthSession } from '@/features/auth/model/types';

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