export interface Space {
  id: string;
  name: string;
  description?: string;
  model: string;
  provider: string;
  is_archived?: boolean;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
  user_id: string;
  isActive?: boolean;
}

export interface Conversation {
  id: string;
  space_id: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  model_used?: string;
  provider?: string;
  parent_message_id?: string;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
}

export function convertToAIMessage(message: Message) {
  // Only include the fields that the AI SDK needs
  return {
    id: message.id,
    role: message.role,
    content: message.content
  };
}

// Helper function to create a new message
export function createMessage(params: {
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  model_used?: string;
  parent_message_id?: string;
}): Message {
  return {
    id: crypto.randomUUID(),
    ...params,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_deleted: false
  };
} 