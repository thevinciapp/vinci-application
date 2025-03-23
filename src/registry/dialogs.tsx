import { DeleteSpaceDialog } from "@/components/dialogs/DeleteSpaceDialog";
import { EditSpaceDialog } from "@/components/dialogs/EditSpaceDialog";
import { CreateSpaceDialog } from "@/components/dialogs/CreateSpaceDialog";
import { EditConversationDialog } from "@/components/dialogs/EditConversationDialog";
import { DeleteConversationDialog } from "@/components/dialogs/DeleteConversationDialog";

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
