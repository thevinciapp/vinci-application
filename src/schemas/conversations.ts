import { z } from 'zod';

export const createConversationSchema = z.object({
  title: z.string().min(1, { message: 'Conversation title is required' }),
  spaceId: z.string().uuid({ message: 'Valid space ID is required' }),
});

export const updateConversationSchema = z.object({
  title: z.string().min(1, { message: 'Conversation title is required' }).optional(),
});

export const createMessageSchema = z.object({
  content: z.string().min(1, { message: 'Message content is required' }),
  role: z.enum(['user', 'assistant', 'system'], { 
    required_error: 'Message role is required', 
    invalid_type_error: 'Message role must be user, assistant, or system'
  }),
  conversationId: z.string().uuid({ message: 'Valid conversation ID is required' }),
});

export const updateMessageSchema = z.object({
  content: z.string().min(1, { message: 'Message content is required' }).optional(),
});