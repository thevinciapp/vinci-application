"use client";

import { DialogRegistry } from "@/src/types";
import { DeleteSpaceDialog } from "@/src/components/dialogs/DeleteSpaceDialog";
import { EditSpaceDialog } from "@/src/components/dialogs/EditSpaceDialog";
import { CreateSpaceDialog } from "@/src/components/dialogs/CreateSpaceDialog";
import { EditConversationDialog } from "@/src/components/dialogs/EditConversationDialog";
import { DeleteConversationDialog } from "@/src/components/dialogs/DeleteConversationDialog";

export const dialogs: DialogRegistry = {
  deleteSpace: DeleteSpaceDialog,
  editSpace: EditSpaceDialog,
  createSpace: CreateSpaceDialog,
  editConversation: EditConversationDialog,
  deleteConversation: DeleteConversationDialog,
};
