// lib/constants.ts
export interface AIModel {
  id: string;
  name: string;
  contextLength: number;
  provider: string; // Use a type for this!
}

export type Provider = 'groq' | 'anthropic' | 'openai' | 'cohere' | 'mistral' | 'google' | 'xai' | 'togetherai' | 'deepseek' | 'cerebras' | 'perplexity';

export interface AIProvider {
  id: Provider; // Use the type here
  name: string;
  models: AIModel[];
}

export const AVAILABLE_MODELS: Record<Provider, AIModel[]> = { // Use Record for type safety
  groq: [
      { id: 'deepseek-r1-distill-llama-70b', name: 'Deepseek R1 70B', contextLength: 4096, provider: 'groq' },
      { id: 'mixtral-8x7b-instruct', name: 'Mixtral 8x7B', contextLength: 32768, provider: 'groq' },
      { id: 'deepseek-r1-distill-llama-70b-specdec', name: 'Deepseek R1 70B SpecDec', contextLength: 4096, provider: 'groq' },
      { id: 'gemma2-9b-it', name: 'Gemma 2 9B', contextLength: 8192, provider: 'groq' }, //update with real contextLength
      { id: 'llama-3.3-70b-versatile', name: 'LLaMA 3.3 70B Versatile', contextLength: 8192, provider: 'groq' }, //update with real contextLength
  ],
  anthropic: [
      { id: 'claude-3-opus-latest', name: 'Claude 3 Opus', contextLength: 200000, provider: 'anthropic' },
      { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet', contextLength: 200000, provider: 'anthropic' },
      { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku', contextLength: 200000, provider: 'anthropic' },
  ],
  openai: [
      { id: 'gpt-4o', name: 'GPT-4o', contextLength: 128000, provider: 'openai' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextLength: 128000, provider: 'openai' }, // Hypothetical, adjust if real
      { id: 'o1', name: 'O1', contextLength: 8192, provider: 'openai' }, // Hypothetical, adjust if real
      { id: 'o3-mini', name: 'O3 Mini', contextLength: 8192, provider: 'openai' } // Hypothetical, adjust if real
  ],
  cohere: [
      { id: 'command', name: 'Command', contextLength: 4096, provider: 'cohere' }, // Correct context length?
      { id: 'command-light', name: 'Command Light', contextLength: 4096, provider: 'cohere' }, // Correct context length?
      { id: 'command-nightly', name: 'Command Nightly', contextLength: 4096, provider: 'cohere' },// Correct context length?
      { id: 'command-light-nightly', name: 'Command Light Nightly', contextLength: 4096, provider: 'cohere' } // Correct context length?
  ],
  mistral: [
      { id: 'mistral-large-latest', name: 'Mistral Large', contextLength: 32768, provider: 'mistral' },
      { id: 'codestral-latest', name: 'Codestral', contextLength: 32768, provider: 'mistral' },
      { id: 'pixtral-large-latest', name: 'Pixtral Large', contextLength: 32768, provider: 'mistral' },
      { id: 'ministral-3b-latest', name: 'Ministral 3B', contextLength: 8192, provider: 'mistral' }, //update with real context length
      { id: 'ministral-8b-latest', name: 'Ministral 8B', contextLength: 8192, provider: 'mistral' }, //update with real context length
      { id: 'mistral-small-latest', name: 'Mistral Small', contextLength: 32768, provider: 'mistral' },
  ],
  google: [
      { id: 'gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', contextLength: 8192, provider: 'google' }, // Verify context length
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', contextLength: 1048576, provider: 'google' },
  ],
  xai: [
      { id: 'grok-2-1212', name: 'Grok 2', contextLength: 8192, provider: 'xai' }, // Verify context length
      { id: 'grok-2-vision-1212', name: 'Grok 2 Vision', contextLength: 8192, provider: 'xai' } // Verify context length
  ],
  togetherai: [
      { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1', contextLength: 16384, provider: 'togetherai' },
      { id: 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free', name: 'DeepSeek R1 Distill Llama 70B', contextLength: 4096, provider: 'togetherai' },
      { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3', contextLength: 16384, provider: 'togetherai' },
      { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free', name: 'Llama 3.3 70B Instruct Turbo', contextLength: 8192, provider: 'togetherai' },
      { id: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo', name: 'Llama 3.1 405B Instruct Turbo', contextLength: 8192, provider: 'togetherai' }
  ],
  deepseek: [
      { id: 'deepseek-chat', name: 'DeepSeek V3', contextLength: 16384, provider: 'deepseek' },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1', contextLength: 16384, provider: 'deepseek' }
  ],
  cerebras: [
      { id: 'llama3.1-8b', name: 'Llama 3.1 8B', contextLength: 8192, provider: 'cerebras' },
      { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', contextLength: 8192, provider: 'cerebras' },
  ],
  perplexity: [
      { id: 'sonar-reasoning-pro', name: 'Sonar Reasoning Pro', contextLength: 8192, provider: 'perplexity' }, // Verify context length
      { id: 'sonar-reasoning', name: 'Sonar Reasoning', contextLength: 8192, provider: 'perplexity' }, // Verify context length
      { id: 'sonar-pro', name: 'Sonar Pro', contextLength: 8192, provider: 'perplexity' },
      { id: 'sonar', name: 'Sonar', contextLength: 8192, provider: 'perplexity' } // Verify context length
  ]
};

export const PROVIDER_NAMES: Record<Provider, string> = {
  groq: 'Groq',
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  cohere: 'Cohere',
  mistral: 'Mistral',
  google: 'Google',
  xai: 'xAI',
  togetherai: 'Together AI',
  deepseek: 'DeepSeek',
  cerebras: 'Cerebras',
  perplexity: 'Perplexity'
};

export const getModelById = (provider: Provider, modelId: string): AIModel | undefined => {
  return AVAILABLE_MODELS[provider]?.find(m => m.id === modelId);
};
export const getAllProviders = (): AIProvider[] => {
  return Object.entries(AVAILABLE_MODELS).map(([providerId, models]) => ({
    id: providerId as Provider,
    name: PROVIDER_NAMES[providerId as Provider],
    models: models,
  }));
};


export const API_ROUTES = {
  CHAT: '/api/chat',
  CONVERSATIONS: (spaceId: string) => `/api/conversations/${spaceId}`,
  MESSAGES: (conversationId: string) => `/api/messages/${conversationId}`,
  SPACES: '/api/spaces',
  SPACE: (id: string) => `/api/spaces/${id}`,
};

export const CACHE_KEYS = {
  spaces: (userId: string) => `spaces-${userId}`,
  activeSpace: (userId: string) => `active-space-${userId}`,
  conversations: (spaceId: string) => `conversations-${spaceId}`,
  messages: (conversationId: string) => `messages-${conversationId}`,
};

export const CACHE_TTL = {
  SPACES: 300, // 5 minutes
  ACTIVE_SPACE: 300,
  CONVERSATIONS: 300,
  MESSAGES: 300,
};

// Database Tables
export const DB_TABLES = {
  SPACES: 'spaces',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  ACTIVE_SPACES: 'active_spaces'
} as const

// Common Table Columns
export const COLUMNS = {
  // Common columns
  ID: 'id',
  USER_ID: 'user_id',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
  IS_DELETED: 'is_deleted',
  
  // Space columns
  NAME: 'name',
  DESCRIPTION: 'description',
  MODEL: 'model',
  PROVIDER: 'provider',
  IS_ACTIVE: 'isActive',
  
  // Conversation columns
  SPACE_ID: 'space_id',
  TITLE: 'title',
  
  // Message columns
  CONVERSATION_ID: 'conversation_id',
  ROLE: 'role',
  CONTENT: 'content',
  MODEL_USED: 'model_used',
  PARENT_MESSAGE_ID: 'parent_message_id'
} as const

// Message Roles
export const MESSAGE_ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant'
} as const

// Common Error Messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: { error: 'Unauthorized', status: 401 },
  MISSING_FIELDS: { error: 'Missing required fields', status: 400 },
  INVALID_PROVIDER: { error: 'Invalid provider', status: 400 },
  INVALID_MODEL: { error: 'Invalid model for the selected provider', status: 400 },
  MISSING_SPACE_ID: { error: 'Space ID is required', status: 400 },
  MISSING_CONVERSATION_ID: { error: 'Conversation ID is required', status: 400 },
  INVALID_ROLE: { error: 'Invalid role: must be either "user" or "assistant"', status: 400 },
  MISSING_ASSISTANT_FIELDS: { error: 'Assistant messages require model_used and provider fields', status: 400 },
  SPACE_NOT_FOUND: { error: 'Space not found or access denied', status: 404 },
  CONVERSATION_NOT_FOUND: { error: 'Conversation not found', status: 404 },
  SERVER_ERROR: (message: string) => ({ error: message, status: 500 })
} as const

// Default Values
export const DEFAULTS = {
  CONVERSATION_TITLE: 'New Conversation',
  SPACE_NAME: 'My Space',
  SPACE_DESCRIPTION: 'My first space',
  WELCOME_MESSAGE: 'Welcome to Spatial! I\'m here to help you explore and create. What would you like to do?'
} as const