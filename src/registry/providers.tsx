import { SpacesProvider } from "shared/components/providers/SpacesProvider";
import { ConversationsProvider } from "shared/components/providers/ConversationsProvider";
import { ModelsProvider } from "shared/components/providers/ModelsProvider";
import { BackgroundTasksProvider } from "shared/components/providers/BackgroundTasksProvider";
import { SuggestionsProvider } from "shared/components/providers/SuggestionsProvider";
import { ChatModesProvider } from "shared/components/providers/ChatModesProvider";
import { MessageSearchProvider } from "shared/components/providers/MessageSearchProvider";
import { SimilarMessagesProvider } from "shared/components/providers/SimilarMessagesProvider";
import { ActionsProvider } from "shared/components/providers/ActionsProvider";

type ProviderRegistry = {
  spaces: typeof SpacesProvider;
  conversations: typeof ConversationsProvider;
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
  conversations: ConversationsProvider,
  models: ModelsProvider,
  actions: ActionsProvider,
  chatModes: ChatModesProvider,
  messageSearch: MessageSearchProvider,
  similarMessages: SimilarMessagesProvider,
  backgroundTasks: BackgroundTasksProvider,
  suggestions: SuggestionsProvider,
};
