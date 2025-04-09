export interface ResetPasswordRequest {
  email: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}