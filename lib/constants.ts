export interface AIModel {
  id: string;
  name: string;
  contextLength: number;
  provider: string;
}

export interface AIProvider {
  id: string;
  name: string;
  models: AIModel[];
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    models: [
      {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus',
        contextLength: 200000,
        provider: 'anthropic'
      },
      {
        id: 'claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        contextLength: 200000,
        provider: 'anthropic'
      }
    ]
  },
  {
    id: 'groq',
    name: 'Groq',
    models: [
      {
        id: 'llama3-70b-8192',
        name: 'LLaMA 3 70B',
        contextLength: 8192,
        provider: 'groq'
      },
      {
        id: 'mixtral-8x7b-32768',
        name: 'Mixtral 8x7B',
        contextLength: 32768,
        provider: 'groq'
      }
    ]
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    models: [
      {
        id: 'deepseek-r1-distill-llama-70b',
        name: 'DeepSeek LLaMA 70B',
        contextLength: 4096,
        provider: 'deepseek'
      }
    ]
  }
];
