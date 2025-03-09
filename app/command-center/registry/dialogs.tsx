"use client";

import { DialogRegistry } from "../types";
import { DeleteSpaceDialog } from "../components/dialogs/DeleteSpaceDialog";
import { EditSpaceDialog } from "../components/dialogs/EditSpaceDialog";
import { CreateSpaceDialog } from "../components/dialogs/CreateSpaceDialog";
import { EditConversationDialog } from "../components/dialogs/EditConversationDialog";
import { DeleteConversationDialog } from "../components/dialogs/DeleteConversationDialog";

export const dialogs: DialogRegistry = {
  deleteSpace: DeleteSpaceDialog,
  editSpace: EditSpaceDialog,
  createSpace: CreateSpaceDialog,
  editConversation: EditConversationDialog,
  deleteConversation: DeleteConversationDialog,
};
