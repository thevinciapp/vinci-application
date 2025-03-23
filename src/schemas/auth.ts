import { z } from 'zod';

export const signInSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
});

export const signUpSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
  firstName: z.string().min(1, { message: 'First name is required' }),
  lastName: z.string().min(1, { message: 'Last name is required' }),
});

export const resetPasswordSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10, { message: 'Invalid refresh token' }),
});