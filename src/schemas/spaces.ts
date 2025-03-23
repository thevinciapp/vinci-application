import { z } from 'zod';

export const createSpaceSchema = z.object({
  name: z.string().min(1, { message: 'Space name is required' }),
  description: z.string().optional(),
});

export const updateSpaceSchema = z.object({
  name: z.string().min(1, { message: 'Space name is required' }).optional(),
  description: z.string().optional(),
});