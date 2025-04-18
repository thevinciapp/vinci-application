import { DeleteSpaceDialog } from "@/widgets/dialogs/DeleteSpaceDialog";
import { EditSpaceDialog } from "@/widgets/dialogs/EditSpaceDialog";
import { CreateSpaceDialog } from "@/widgets/dialogs/CreateSpaceDialog";
import { EditConversationDialog } from "@/widgets/dialogs/EditConversationDialog";
import { DeleteConversationDialog } from "@/widgets/dialogs/DeleteConversationDialog";

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
