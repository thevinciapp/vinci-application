// config/models.ts
export const AVAILABLE_MODELS = {
  groq: [
    { id: 'deepseek-r1-distill-llama-70b', name: 'Deepseek R1 70B' },
    { id: 'mixtral-8x7b-instruct', name: 'Mixtral 8x7B' },
    { id: 'deepseek-r1-distill-llama-70b-specdec', name: 'Deepseek R1 70B SpecDec' },
    { id: 'gemma2-9b-it', name: 'Gemma 2 9B' },
    { id: 'llama-3.3-70b-versatile', name: 'LLaMA 3.3 70B Versatile' },
  ],
  anthropic: [
    { id: 'claude-3-opus-latest', name: 'Claude 3 Opus' },
    { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'o1', name: 'O1' },
    { id: 'o3-mini', name: 'O3 Mini' },
  ],
  cohere: [
    { id: 'command', name: 'Command' },
    { id: 'command-light', name: 'Command Light' },
    { id: 'command-nightly', name: 'Command Nightly' },
    { id: 'command-light-nightly', name: 'Command Light Nightly' }
  ],
  mistral: [
    { id: 'mistral-large-latest', name: 'Mistral Large' },
    { id: 'codestral-latest', name: 'Codestral' },
    { id: 'pixtral-large-latest', name: 'Pixtral Large' },
    { id: 'ministral-3b-latest', name: 'Ministral 3B' },
    { id: 'ministral-8b-latest', name: 'Ministral 8B' },
    { id: 'mistral-small-latest', name: 'Mistral Small' },
  ],
  google: [
    { id: 'gemini-2.0-flash-001', name: 'Gemini 2.0 Flash' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  ],
  xai: [
    { id: 'grok-2-1212', name: 'Grok 2' },
    { id: 'grok-2-vision-1212', name: 'Grok 2 Vision' },
  ],
  togetherai: [
    { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1' },
    { id: 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free', name: 'DeepSeek R1 Distill Llama 70B' },
    { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3' },
    { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free', name: 'Llama 3.3 70B Instruct Turbo' },
    { id: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo', name: 'Llama 3.1 405B Instruct Turbo' },
  ],
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek V3' },
    { id: 'deepseek-reasoner', name: 'DeepSeek R1' }
  ],
  cerebras: [
    { id: 'llama3.1-8b', name: 'Llama 3.1 8B' },
    { id: 'llama-3.3-70b', name: 'Llama 3.3 70B' },
  ],
  perplexity: [
    { id: 'sonar-reasoning-pro', name: 'Sonar Reasoning Pro' },
    { id: 'sonar-reasoning', name: 'Sonar Reasoning' },
    { id: 'sonar-pro', name: 'Sonar Pro' },
    { id: 'sonar', name: 'Sonar' }
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
  deepseek: 'DeepSeek',
  cerebras: 'Cerebras',
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