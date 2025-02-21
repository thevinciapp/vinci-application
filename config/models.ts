export const PROVIDER_DESCRIPTIONS: Record<Provider, string> = {
  groq: 'Ultra-fast inference optimized for real-time applications',
  anthropic: 'Advanced language models with strong reasoning capabilities',
  openai: 'State-of-the-art models with broad capabilities',
  cohere: 'Specialized models for enterprise and business use cases',
  mistral: 'Open-source foundation models with various specializations',
  google: 'Cutting-edge multimodal models from Google DeepMind',
  xai: 'Advanced models focused on reasoning and transparency',
  togetherai: 'Curated collection of top open-source models',
  perplexity: 'Research-focused models optimized for reasoning tasks'
};

export const AVAILABLE_MODELS = {
  groq: [
    { id: 'deepseek-r1-distill-llama-70b', name: 'Deepseek R1 70B', description: 'Powerful general-purpose model with fast inference', contextWindow: 32768 },
    { id: 'mixtral-8x7b-instruct', name: 'Mixtral 8x7B', description: 'Efficient model balancing speed and capability', contextWindow: 32768 },
    { id: 'deepseek-r1-distill-llama-70b-specdec', name: 'Deepseek R1 70B SpecDec', description: 'Specialized for technical documentation', contextWindow: 32768 },
    { id: 'gemma2-9b-it', name: 'Gemma 2 9B', description: 'Compact model optimized for quick responses', contextWindow: 8192 },
    { id: 'llama-3.3-70b-versatile', name: 'LLaMA 3.3 70B Versatile', description: 'Latest LLaMA optimized for versatility', contextWindow: 128000 },
  ],
  anthropic: [
    { id: 'claude-3-opus-latest', name: 'Claude 3 Opus', description: 'Most capable model for complex tasks', contextWindow: 128000 },
    { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet', description: 'Balanced performance and speed', contextWindow: 128000 },
    { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku', description: 'Fast, efficient for simple tasks', contextWindow: 128000 },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Most powerful model for complex reasoning', contextWindow: 128000, multimodal: true },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Efficient version of GPT-4', contextWindow: 128000, multimodal: true },
    { id: 'o1', name: 'O1', description: 'Fast, general-purpose assistant', contextWindow: 128000 },
    { id: 'o3-mini', name: 'O3 Mini', description: 'Quick responses for simple tasks', contextWindow: 128000 },
  ],
  cohere: [
    { id: 'command', name: 'Command', description: 'Enterprise-grade general model', contextWindow: 128000 },
    { id: 'command-light', name: 'Command Light', description: 'Faster, lighter version of Command', contextWindow: 32768 },
    { id: 'command-nightly', name: 'Command Nightly', description: 'Latest experimental features', contextWindow: 128000 },
    { id: 'command-light-nightly', name: 'Command Light Nightly', description: 'Fast experimental version', contextWindow: 32768 }
  ],
  mistral: [
    { id: 'mistral-large-latest', name: 'Mistral Large', description: 'Most capable open model', contextWindow: 32000 },
    { id: 'codestral-latest', name: 'Codestral', description: 'Specialized for code generation', contextWindow: 32000 },
    { id: 'pixtral-large-latest', name: 'Pixtral Large', description: 'Vision and image understanding', contextWindow: 128000, multimodal: true },
    { id: 'ministral-3b-latest', name: 'Ministral 3B', description: 'Ultra-compact, fast responses', contextWindow: 4096 },
    { id: 'ministral-8b-latest', name: 'Ministral 8B', description: 'Balanced size and capability', contextWindow: 8192 },
    { id: 'mistral-small-latest', name: 'Mistral Small', description: 'Efficient for simple tasks', contextWindow: 4096 },
  ],
  google: [
    { id: 'gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', description: 'Ultra-fast responses, latest version', contextWindow: 1000000, multimodal: true },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Balanced performance model', contextWindow: 1000000, multimodal: true },
  ],
  xai: [
    { id: 'grok-2-1212', name: 'Grok 2', description: 'Advanced reasoning capabilities', contextWindow: 128000 },
    { id: 'grok-2-vision-1212', name: 'Grok 2 Vision', description: 'Multimodal understanding', contextWindow: 128000, multimodal: true },
  ],
  togetherai: [
    { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1', description: 'General purpose reasoning', contextWindow: 128000 },
    { id: 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free', name: 'DeepSeek R1 Distill Llama 70B', description: 'Efficient large model', contextWindow: 32768 },
    { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3', description: 'Latest architecture improvements', contextWindow: 128000 },
    { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free', name: 'Llama 3.3 70B Instruct Turbo', description: 'Fast instruction following', contextWindow: 128000 },
    { id: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo', name: 'Llama 3.1 405B Instruct Turbo', description: 'Massive model, best quality', contextWindow: 128000 },
  ],
  perplexity: [
    { id: 'sonar-reasoning-pro', name: 'Sonar Reasoning Pro', description: 'Advanced reasoning capabilities', contextWindow: 200000 },
    { id: 'sonar-reasoning', name: 'Sonar Reasoning', description: 'Efficient reasoning model', contextWindow: 200000 },
    { id: 'sonar-pro', name: 'Sonar Pro', description: 'Professional general use', contextWindow: 200000 },
    { id: 'sonar', name: 'Sonar', description: 'Fast, reliable model', contextWindow: 200000 }
  ]
} as const;

export type Provider = keyof typeof AVAILABLE_MODELS;
export type ModelsByProvider = {
  [P in Provider]: typeof AVAILABLE_MODELS[P][number]['id'];
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
  perplexity: 'Perplexity'
};

export function isValidModelForProvider(provider: Provider, model: string): boolean {
  return AVAILABLE_MODELS[provider].some(m => m.id === model);
}

export function getModelName(provider: Provider | undefined, modelId: string): string {
  if (!provider || !modelId) return 'Select Model';
  
  const models = AVAILABLE_MODELS[provider];
  if (!models) return modelId;

  const model = models.find(m => m.id === modelId);
  return model?.name || modelId;
}