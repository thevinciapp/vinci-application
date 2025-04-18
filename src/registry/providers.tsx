import { SpacesProvider } from "@/app/providers/SpacesProvider";
import { ModelsProvider } from "@/app/providers/ModelsProvider";
import { BackgroundTasksProvider } from "@/app/providers/BackgroundTasksProvider";
import { SuggestionsProvider } from "@/app/providers/SuggestionsProvider";
import { ChatModesProvider } from "@/app/providers/ChatModesProvider";
import { MessageSearchProvider } from "@/app/providers/MessageSearchProvider";
import { SimilarMessagesProvider } from "@/app/providers/SimilarMessagesProvider";
import { ActionsProvider } from "@/app/providers/ActionsProvider";

type ProviderRegistry = {
  spaces: typeof SpacesProvider;
  models: typeof ModelsProvider;
  actions: typeof ActionsProvider;
  chatModes: typeof ChatModesProvider;
  messageSearch: typeof MessageSearchProvider;
  similarMessages: typeof SimilarMessagesProvider;
  backgroundTasks: typeof BackgroundTasksProvider;
  suggestions: typeof SuggestionsProvider;
};

export const providers: ProviderRegistry = {
  spaces: SpacesProvider,
  models: ModelsProvider,
  actions: ActionsProvider,
  chatModes: ChatModesProvider,
  messageSearch: MessageSearchProvider,
  similarMessages: SimilarMessagesProvider,
  backgroundTasks: BackgroundTasksProvider,
  suggestions: SuggestionsProvider,
};
