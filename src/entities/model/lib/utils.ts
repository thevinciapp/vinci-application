import { AVAILABLE_MODELS } from "@/entities";
import { Provider, ModelDisplayInfo } from "@/entities/model/model/types";

export function getModelDisplayInfo(modelId: string): ModelDisplayInfo | null {
  for (const [provider, models] of Object.entries(AVAILABLE_MODELS)) {
    const model = models.find(m => m.id === modelId);
    if (model) {
      return {
        displayName: model.name,
        provider: provider as Provider,
        description: model.description,
        contextWindow: model.contextWindow,
        multimodal: model.multimodal
      };
    }
  }
  return null;
}

export function getFormattedModelLabel(modelId: string | undefined | null): string {
  if (!modelId) return 'Select Model';
  const modelInfo = getModelDisplayInfo(modelId);
  return modelInfo ? modelInfo.displayName : 'Select Model';
}