import React, { useState } from 'react';
import { Lightbulb, Check, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Command } from 'cmdk';
import { Button } from "@/shared/components/button";
import { ProviderComponentProps } from '@/entities/model/model/types';

interface Suggestion {
  id: string;
  description: string;
  source: string;
  confidence: number;
  createdAt: number;
  accepted?: boolean;
}

export function SuggestionsProvider({ searchQuery = '', onSelect, onAction }: ProviderComponentProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([
    {
      id: 'suggestion-1',
      description: 'Open settings to configure application preferences',
      source: 'User activity analysis',
      confidence: 0.85,
      createdAt: Date.now() - 3600000,
    },
    {
      id: 'suggestion-2',
      description: 'Create a new conversation in Project Space',
      source: 'Recent workspace activity',
      confidence: 0.75,
      createdAt: Date.now() - 7200000,
    }
  ]);

  const acceptSuggestion = (suggestionId: string) => {
    setSuggestions(prevSuggestions => {
      const suggestion = prevSuggestions.find(s => s.id === suggestionId);
      
      if (suggestion) {
        toast.success('Suggestion Accepted', {
          description: `Now executing: ${suggestion.description}`
        });
        if (onSelect) onSelect({...suggestion, closeOnSelect: true});
      }
      
      return prevSuggestions.map(suggestion => 
        suggestion.id === suggestionId 
          ? { ...suggestion, accepted: true } 
          : suggestion
      );
    });
  };

  const rejectSuggestion = (suggestionId: string) => {
    setSuggestions(prevSuggestions => prevSuggestions.filter(s => s.id !== suggestionId));
    toast.info('Suggestion Dismissed');
  };

  const handleSelect = (suggestion: Suggestion) => {
    acceptSuggestion(suggestion.id);
  };

  const handleAccept = (e: React.MouseEvent, suggestionId: string) => {
    e.stopPropagation();
    e.preventDefault();
    acceptSuggestion(suggestionId);
  };

  const handleReject = (e: React.MouseEvent, suggestionId: string) => {
    e.stopPropagation();
    e.preventDefault();
    rejectSuggestion(suggestionId);
  };

  const handleCreate = () => {
    if (onAction) onAction('create', {});
  };

  const filteredSuggestions = suggestions.filter(suggestion => 
    suggestion.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    suggestion.source.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Command.List>
      <Command.Group heading="Suggestions">
        {filteredSuggestions.length === 0 ? (
          <Command.Empty>No suggestions available</Command.Empty>
        ) : (
          filteredSuggestions.map(suggestion => (
            <Command.Item
              key={suggestion.id}
              value={suggestion.description}
              onSelect={() => handleSelect(suggestion)}
            >
              <Lightbulb size={16} className="text-amber-500" />
              <div>
                {suggestion.description}
                <span className="cmdk-meta">{suggestion.source}</span>
              </div>
              <div className="cmdk-actions">
                <span className="text-amber-500">
                  {Math.round(suggestion.confidence * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleAccept(e, suggestion.id)}
                >
                  <Check size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleReject(e, suggestion.id)}
                >
                  <X size={14} />
                </Button>
              </div>
            </Command.Item>
          ))
        )}
      </Command.Group>
      <Command.Separator />
      <Command.Group>
        <Command.Item onSelect={handleCreate}>
          <Plus size={16} />
          Create new suggestion
        </Command.Item>
      </Command.Group>
    </Command.List>
  );
}
