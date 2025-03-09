"use client";

import React from "react";
import { PencilLine, Trash } from "lucide-react";
import { useSpaceStore } from '@/stores/space-store';
import { ProviderComponentProps } from "../../types";

export const ConversationsProvider: React.FC<ProviderComponentProps> = ({ searchQuery, onSelect, onAction }) => {
  const { activeSpace, conversations } = useSpaceStore();
  const filteredConversations = (conversations ?? [])
    .filter(conv => conv.spaceId === activeSpace?.id)
    .filter(conv =>
      (conv.title || 'Untitled').toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="conversation-list">
      {filteredConversations.map(conv => (
        <div key={conv.id} className="conversation-item" onClick={() => onSelect?.(conv)}>
          <h4>{conv.title}</h4>
          <div className="conversation-actions">
            <button onClick={(e) => { e.stopPropagation(); onAction?.('edit', conv); }}>
              <PencilLine size={16} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onAction?.('delete', conv); }}>
              <Trash size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
