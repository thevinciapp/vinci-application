import { CommandModal } from '@/components/ui/command-modal';
import { Sparkles, Image, Link, FileText, Share2, Bookmark } from 'lucide-react';
import { useQuickActionsCommand } from '@/components/ui/quick-actions-command-provider';

interface QuickActionsCommandProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickActionsCommand = ({ isOpen, onClose }: QuickActionsCommandProps) => {
  const { isExecuting, handleGlobalCommand } = useQuickActionsCommand();

  const quickActions = [
    { key: 'generate', label: 'Generate Content', icon: <Sparkles className="w-4 h-4" />, onSelect: () => handleGlobalCommand(() => console.log('Generate')) },
    { key: 'image', label: 'Create Image', icon: <Image className="w-4 h-4" />, onSelect: () => handleGlobalCommand(() => console.log('Image')) },
    { key: 'link', label: 'Add Link', icon: <Link className="w-4 h-4" />, onSelect: () => handleGlobalCommand(() => console.log('Link')) },
    { key: 'document', label: 'New Document', icon: <FileText className="w-4 h-4" />, onSelect: () => handleGlobalCommand(() => console.log('Doc')) },
    { key: 'share', label: 'Share', icon: <Share2 className="w-4 h-4" />, onSelect: () => handleGlobalCommand(() => console.log('Share')) },
    { key: 'bookmark', label: 'Bookmark', icon: <Bookmark className="w-4 h-4" />, onSelect: () => handleGlobalCommand(() => console.log('Bookmark')) },
  ];

  return (
    <CommandModal
      isOpen={isOpen}
      onClose={onClose}
      position="top"
      items={quickActions.map(item => ({
        ...item,
        className: `flex items-center gap-3 px-4 py-2 text-sm ${
          isExecuting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5 cursor-pointer'
        }`
      }))}
      searchPlaceholder="Search quick actions..."
    />
  );
};
