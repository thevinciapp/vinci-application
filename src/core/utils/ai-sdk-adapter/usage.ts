// Copied and adapted from ai/packages/ui-utils/src/duplicated/usage.ts

export type LanguageModelUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type EmbeddingModelUsage = {
  tokens: number;
};

export function calculateLanguageModelUsage({
  promptTokens,
  completionTokens,
}: {
  promptTokens: number;
  completionTokens: number;
}): LanguageModelUsage {
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };
} 