import { DeleteSpaceDialog } from "shared/components/dialogs/DeleteSpaceDialog";
import { EditSpaceDialog } from "shared/components/dialogs/EditSpaceDialog";
import { CreateSpaceDialog } from "shared/components/dialogs/CreateSpaceDialog";
import { EditConversationDialog } from "shared/components/dialogs/EditConversationDialog";
import { DeleteConversationDialog } from "shared/components/dialogs/DeleteConversationDialog";

type DialogRegistry = {
  deleteSpace: React.ComponentType<{ onClose: () => void }>;
  editSpace: React.ComponentType<{ onClose: () => void }>;
  createSpace: React.ComponentType<{ onClose: () => void }>;
  editConversation: React.ComponentType<{ onClose: () => void }>;
  deleteConversation: React.ComponentType<{ onClose: () => void }>;
};

export const dialogs: DialogRegistry = {
  deleteSpace: DeleteSpaceDialog,
  editSpace: EditSpaceDialog,
  createSpace: CreateSpaceDialog,
  editConversation: EditConversationDialog,
  deleteConversation: DeleteConversationDialog,
};
