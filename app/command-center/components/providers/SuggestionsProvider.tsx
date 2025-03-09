"use client";

import React, { useState, useEffect } from 'react';
import { Lightbulb, Check, X } from 'lucide-react';
import { toast } from 'sonner';
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
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

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
        onSelect?.(suggestion);
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

  // Render empty state if no suggestions
  if (!filteredSuggestions.length) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center text-sm text-gray-500">
        <Lightbulb className="h-8 w-8 mb-2 text-gray-400" />
        <p>No suggestions available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      {filteredSuggestions.map(suggestion => (
        <div
          key={suggestion.id}
          className={cn(
            "flex items-center justify-between p-3 rounded-lg",
            "bg-white/[0.03] hover:bg-white/[0.06]",
            "border border-white/[0.05]",
            "transition-all duration-200 ease-in-out",
            "cursor-pointer"
          )}
          onClick={() => acceptSuggestion(suggestion.id)}
        >
          <div className="flex items-center gap-3">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            <div className="flex flex-col">
              <span className="text-sm">{suggestion.description}</span>
              <span className="text-xs text-gray-500">{suggestion.source}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="px-1.5 py-0.5 text-xs font-medium rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {Math.round(suggestion.confidence * 100)}% confidence
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => { 
                  e.stopPropagation();
                  e.preventDefault();
                  acceptSuggestion(suggestion.id);
                }}
                className={cn(
                  "flex items-center h-7 w-7 justify-center rounded-md p-1.5",
                  "transition-all duration-200 ease-in-out",
                  "bg-white/[0.03] hover:bg-green-400/20 border border-white/[0.05]",
                  "text-green-400 hover:text-green-200",
                  "cursor-pointer"
                )}
                title="Accept Suggestion"
              >
                <Check className="text-green-400" size={11} strokeWidth={1.5} />
              </button>
              <button
                onClick={(e) => { 
                  e.stopPropagation();
                  e.preventDefault();
                  rejectSuggestion(suggestion.id);
                }}
                className={cn(
                  "flex items-center h-7 w-7 justify-center rounded-md p-1.5",
                  "transition-all duration-200 ease-in-out",
                  "bg-white/[0.03] hover:bg-red-400/20 border border-white/[0.05]",
                  "text-red-400 hover:text-red-200",
                  "cursor-pointer"
                )}
                title="Dismiss"
              >
                <X className="text-red-400" size={11} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
