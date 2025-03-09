"use client";

import { ProviderRegistry } from "../types";
import { SpacesProvider } from "../components/providers/SpacesProvider";
import { ConversationsProvider } from "../components/providers/ConversationsProvider";
import { ModelsProvider } from "../components/providers/ModelsProvider";
import { BackgroundTasksProvider } from "../components/providers/BackgroundTasksProvider";
import { SuggestionsProvider } from "../components/providers/SuggestionsProvider";
import { ChatModesProvider } from "../components/providers/ChatModesProvider";
import { MessageSearchProvider } from "../components/providers/MessageSearchProvider";
import { SimilarMessagesProvider } from "../components/providers/SimilarMessagesProvider";
import { ActionsProvider } from "../components/providers/ActionsProvider";

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
