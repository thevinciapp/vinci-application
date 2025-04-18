import { 
  Anthropic, 
  OpenAI, 
  Cohere, 
  Mistral, 
  Google, 
  XAI, 
  Together, 
  DeepSeek, 
  Perplexity, 
  Groq
} from '@lobehub/icons';
import { Provider } from '@/entities/model/model/types';

interface ProviderIconProps {
  provider: Provider;
  size?: number;
  className?: string;
}

const PROVIDER_COMPONENTS = {
  groq: Groq,
  anthropic: Anthropic,
  openai: OpenAI,
  cohere: Cohere.Color,
  mistral: Mistral.Color,
  google: Google.Color,
  xai: XAI,
  togetherai: Together.Color,
  deepseek: DeepSeek.Color,
  cerebras: OpenAI,
  perplexity: Perplexity.Color
} as const;

export function ProviderIcon({ provider, size = 24, className = '' }: ProviderIconProps) {
  const IconComponent = PROVIDER_COMPONENTS[provider];
  if (!IconComponent) return null;
  
  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      <IconComponent size={size} />
    </div>
  );
} 