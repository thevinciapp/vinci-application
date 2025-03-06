import React from 'react';
import { MentionItemType } from '@/types/mention';
import { FileText, Folder, Hash, Clock, Code, X } from 'lucide-react';

interface ContentTagProps {
  item: {
    name: string;
    id: string;
    type: MentionItemType;
  };
  onRemove: (id: string) => void;
}

// Component for displaying selected content tags with remove button
export const ContentTag: React.FC<ContentTagProps> = ({ item, onRemove }) => {
  // Get the appropriate icon based on content type
  const getIconForType = (type: MentionItemType): React.ReactNode => {
    switch (type) {
      case 'file':
        return <FileText className="h-3 w-3 text-cyan-400" />;
      case 'folder':
        return <Folder className="h-3 w-3 text-cyan-400" />;
      case 'message':
        return <Clock className="h-3 w-3 text-amber-400" />;
      case 'conversation':
        return <Clock className="h-3 w-3 text-green-400" />;
      default:
        return <FileText className="h-3 w-3 text-white/70" />;
    }
  };
  
  return (
    <span 
      className="inline-flex items-center gap-1 px-2 py-1 mr-1 rounded bg-white/10 hover:bg-white/20 transition-colors text-xs text-white/90 group"
      title={item.name}
    >
      {getIconForType(item.type)}
      <span className="truncate max-w-[150px]">{item.name}</span>
      <button 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove(item.id);
        }}
        className="ml-1 text-white/40 hover:text-white/90 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label="Remove item"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
};