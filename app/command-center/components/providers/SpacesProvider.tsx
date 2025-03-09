"use client";

import React from "react";
import { PencilLine, Trash } from "lucide-react";
import { useSpaceStore } from '@/stores/space-store';
import { ProviderComponentProps } from "../../types";

export const SpacesProvider: React.FC<ProviderComponentProps> = ({ searchQuery, onSelect, onAction }) => {
  const { spaces } = useSpaceStore();
  const filteredSpaces = (spaces ?? []).filter(space => 
    space.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    space.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-grid">
      {filteredSpaces.map(space => (
        <div key={space.id} className="space-item" onClick={() => onSelect?.(space)}>
          <h3>{space.name}</h3>
          <p>{space.description}</p>
          <div className="space-actions">
            <button onClick={(e) => { e.stopPropagation(); onAction?.('edit', space); }}>
              <PencilLine size={16} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onAction?.('delete', space); }}>
              <Trash size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
