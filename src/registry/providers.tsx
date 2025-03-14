"use client";

import { ProviderRegistry } from "@/src/types";
import { SpacesProvider } from "@/src/components/providers/SpacesProvider";
import { ConversationsProvider } from "@/src/components/providers/ConversationsProvider";
import { ModelsProvider } from "@/src/components/providers/ModelsProvider";
import { BackgroundTasksProvider } from "@/src/components/providers/BackgroundTasksProvider";
import { SuggestionsProvider } from "@/src/components/providers/SuggestionsProvider";
import { ChatModesProvider } from "@/src/components/providers/ChatModesProvider";
import { MessageSearchProvider } from "@/src/components/providers/MessageSearchProvider";
import { SimilarMessagesProvider } from "@/src/components/providers/SimilarMessagesProvider";
import { ActionsProvider } from "@/src/components/providers/ActionsProvider";

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
