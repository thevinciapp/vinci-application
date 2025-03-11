"use client";

import React, { useState, useEffect } from 'react';
import { Lightbulb, Check, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { CommandGroup, CommandItem, CommandList, CommandSeparator, Button } from "vinci-ui";
import { cn } from '@/lib/utils';
import { ProviderComponentProps } from '../../types';

interface Suggestion {
  id: string;
  description: string;
  source: string;
  confidence: number;
  createdAt: number;
  accepted?: boolean;
}

export function SuggestionsProvider({ searchQuery, onSelect, onAction }: ProviderComponentProps) {
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

  // Example function to add a new suggestion
  const addSuggestion = (description: string, source: string, confidence: number = 0.8) => {
    const newSuggestion: Suggestion = {
      id: `suggestion-${Date.now()}`,
      description,
      source,
      confidence,
      createdAt: Date.now(),
    };
    
    setSuggestions(prevSuggestions => [...prevSuggestions, newSuggestion]);
    return newSuggestion.id;
  };

  // Example function to accept a suggestion
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

  // Example function to reject a suggestion
  const rejectSuggestion = (suggestionId: string) => {
    setSuggestions(prevSuggestions => prevSuggestions.filter(s => s.id !== suggestionId));
    toast.info('Suggestion Dismissed');
  };

  const handleSelect = (suggestion: Suggestion) => {
    // Accept the suggestion and close the command center
    acceptSuggestion(suggestion.id);
    // The closeOnSelect property is added to the suggestion in acceptSuggestion
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

  // Attach methods to window for global access
  useEffect(() => {
    const api = {
      addSuggestion,
      acceptSuggestion,
      rejectSuggestion
    };
    (window as any).suggestions = api;
    return () => {
      delete (window as any).suggestions;
    };
  }, []);

  // Filter suggestions based on search query
  const filteredSuggestions = suggestions.filter(suggestion => 
    suggestion.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    suggestion.source.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <CommandList>
      <CommandGroup heading="Suggestions">
        {filteredSuggestions.length === 0 ? (
          <p className="p-2 text-sm text-muted-foreground">No suggestions available</p>
        ) : (
          filteredSuggestions.map(suggestion => (
            <CommandItem
              key={suggestion.id}
              value={suggestion.description}
              onSelect={() => handleSelect(suggestion)}
              className="flex flex-col items-start py-3"
            >
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <div className="flex flex-col">
                    <p className="font-medium">{suggestion.description}</p>
                    <p className="text-xs text-muted-foreground">{suggestion.source}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                    {Math.round(suggestion.confidence * 100)}% confidence
                  </span>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-green-500 hover:text-green-400 hover:bg-green-500/20"
                      onClick={(e) => handleAccept(e, suggestion.id)}
                    >
                      <Check size={14} />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive/80 hover:bg-destructive/20"
                      onClick={(e) => handleReject(e, suggestion.id)}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            </CommandItem>
          ))
        )}
      </CommandGroup>
      <CommandSeparator />
      <CommandGroup>
        <CommandItem 
          onSelect={handleCreate}
          className="text-primary"
        >
          <Plus size={16} className="mr-2" />
          Create new suggestion
        </CommandItem>
      </CommandGroup>
    </CommandList>
  );
}
