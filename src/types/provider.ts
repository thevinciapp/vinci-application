export type Provider = 'groq' | 'anthropic' | 'openai' | 'cohere' | 'mistral' | 'google' | 'xai' | 'togetherai' | 'perplexity';

export interface Model {
  id: string;
  name: string;
  description?: string;
  contextWindow: number;
  provider?: Provider;
  multimodal?: boolean;
}

export interface ModelsByProvider {
  [key: string]: Model[];
}

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

export type ProviderComponentProps = {
  searchQuery?: string;
  onSelect?: (item: any) => void;
  onAction?: (action: string, data: any) => void;
}; 