export type Provider = 'groq' | 'anthropic' | 'openai' | 'cohere' | 'mistral' | 'google' | 'xai' | 'togetherai' | 'perplexity';

export type Model = {
  id: string;
  name: string;
  description?: string;
  contextWindow: number;
  provider?: Provider;
  multimodal?: boolean;
};

export type AvailableModel = Readonly<Model>;

export interface ModelsByProvider {
  [key: string]: ReadonlyArray<AvailableModel>;
}


export interface ModelDisplayInfo {
  displayName: string;
  provider: Provider;
  description?: string;
  contextWindow?: number;
  multimodal?: boolean;
}
export type ProviderComponentProps = {
  searchQuery?: string;
  onSelect?: (item: object) => void;
  onAction?: (action: string, data: object) => void;
};