import { useState, useEffect } from 'react';
import { Bell, Lightbulb, ExternalLink, Check, Star, Code, BookOpen, PenTool, Search } from 'lucide-react';
import { BaseTab } from '@/components/ui/base-tab';
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { DropdownList, DropdownSection, DropdownItem, DropdownFooterAction } from '@/components/shared/dropdown-list';

export interface Suggestion {
  id: string;
  type: 'code' | 'learning' | 'feature';
  title: string;
  description: string;
  preview: string;
  context?: string; // Conversation context that triggered this suggestion
}

export interface SuggestionsTabProps {
  onClick?: () => void;
  currentConversationId?: string;
  messages?: Array<{
    id: string;
    content: string;
    role: 'user' | 'assistant';
    timestamp: Date;
  }>;
  isGeneratingSuggestions?: boolean;
}

export function SuggestionsTab({ 
  onClick, 
  currentConversationId, 
  messages = [],
  isGeneratingSuggestions = false
}: SuggestionsTabProps) {
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch suggestions when conversation changes
  useEffect(() => {
    if (currentConversationId && messages.length > 0) {
      setIsLoading(true);
      
      // Simulate fetching suggestions based on conversation
      // In a real implementation, this would call an API endpoint
      setTimeout(() => {
        // Generate suggestions based on latest messages
        const newSuggestions = generateSuggestionsFromMessages(messages);
        setSuggestions(newSuggestions);
        setIsLoading(false);
      }, 600);
    }
  }, [currentConversationId, messages]);

  // Example function to generate suggestions from messages
  const generateSuggestionsFromMessages = (messages: Array<{id: string; content: string; role: string; timestamp: Date}>) => {
    // This is a placeholder. In a real implementation, this would analyze message
    // content and generate relevant suggestions, possibly calling an API
    
    const lastMessages = messages.slice(-3); // Consider last 3 messages
    const lastContent = lastMessages.map(m => m.content).join(' ').toLowerCase();
    
    const suggestionsToShow: Suggestion[] = [];
    
    // Example rules - in reality this would be much more sophisticated
    if (lastContent.includes('performance') || lastContent.includes('slow')) {
      suggestionsToShow.push({
        id: 'suggestion-perf-1',
        type: 'code',
        title: 'Optimize Query Performance',
        description: 'Refactor database queries for better performance',
        preview: 'Add index to frequently queried columns',
        context: 'Based on discussion about performance issues'
      });
    }
    
    if (lastContent.includes('type') || lastContent.includes('error')) {
      suggestionsToShow.push({
        id: 'suggestion-type-1',
        type: 'code',
        title: 'Fix Type Errors',
        description: 'Address TypeScript errors in current file',
        preview: 'Use proper interface for component props',
        context: 'Based on discussion about type errors'
      });
    }
    
    if (lastContent.includes('learn') || lastContent.includes('documentation')) {
      suggestionsToShow.push({
        id: 'suggestion-learn-1',
        type: 'learning',
        title: 'Advanced TypeScript Features',
        description: 'Learn about utility types and type manipulation',
        preview: 'Check out TypeScript documentation',
        context: 'Based on learning questions in conversation'
      });
    }
    
    if (lastContent.includes('dark') || lastContent.includes('theme') || lastContent.includes('mode')) {
      suggestionsToShow.push({
        id: 'suggestion-feature-1',
        type: 'feature',
        title: 'Implement Dark Mode Toggle',
        description: 'Add user preference for display theme',
        preview: 'Use CSS variables for theme colors',
        context: 'Based on discussion about UI themes'
      });
    }
    
    // If no specific suggestions match, return some general ones
    if (suggestionsToShow.length === 0) {
      suggestionsToShow.push({
        id: 'suggestion-general-1',
        type: 'code',
        title: 'Improve Code Organization',
        description: 'Refactor for better maintainability',
        preview: 'Extract common logic into hooks',
        context: 'General improvement suggestion'
      });
      
      if (lastMessages.length > 2) {
        suggestionsToShow.push({
          id: 'suggestion-general-2',
          type: 'learning',
          title: 'React Optimization Techniques',
          description: 'Learn about memoization and performance',
          preview: 'Explore React.memo and useMemo',
          context: 'Ongoing conversation might benefit from optimization knowledge'
        });
      }
    }
    
    return suggestionsToShow;
  };

  const handleSuggestionSelect = async (suggestionId: string) => {
    // Find the suggestion
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;
    
    try {
      // In a real implementation, this would apply the suggestion
      // (e.g., insert code, open documentation, etc.)
      setIsLoading(true);
      
      // Simulate applying a suggestion
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast({
        title: 'Suggestion Applied',
        description: `Applied: ${suggestion.title}`,
        variant: 'default',
      });
      
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      toast({
        title: 'Error',
        description: 'Failed to apply suggestion',
        variant: 'destructive',
      });
    }
  };

  // Get icon based on suggestion type
  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'code':
        return <Code className="w-4 h-4 text-blue-400" />;
      case 'learning':
        return <BookOpen className="w-4 h-4 text-purple-400" />;
      case 'feature':
        return <PenTool className="w-4 h-4 text-green-400" />;
      default:
        return <Lightbulb className="w-4 h-4 text-yellow-500" />;
    }
  };

  // Filter suggestions based on search query
  const filterSuggestions = () => {
    let filtered = [...suggestions];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(s => 
        s.title.toLowerCase().includes(query) || 
        s.description.toLowerCase().includes(query) ||
        s.preview.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };
  
  // Group filtered suggestions by type
  const filteredSuggestions = filterSuggestions();
  const codeSuggestions = filteredSuggestions.filter(s => s.type === 'code');
  const learningSuggestions = filteredSuggestions.filter(s => s.type === 'learning');
  const featureSuggestions = filteredSuggestions.filter(s => s.type === 'feature');

  // Build sections for dropdown
  const suggestionSections: DropdownSection[] = [];
  
  if (codeSuggestions.length > 0) {
    suggestionSections.push({
      title: `Code Improvements (${codeSuggestions.length})`,
      items: codeSuggestions.map((suggestion): DropdownItem => ({
        id: suggestion.id,
        isActive: selectedSuggestionId === suggestion.id,
        onSelect: () => setSelectedSuggestionId(suggestion.id),
        content: (
          <div className="flex w-full">
            <div className="flex-shrink-0 mr-2.5 mt-0.5">
              {getSuggestionIcon(suggestion.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium text-white/90 truncate">{suggestion.title}</span>
              </div>
              <span className="text-xs text-white/60 line-clamp-1 w-full">
                {suggestion.description}
              </span>
              <div className="mt-1.5 p-1.5 text-xs rounded bg-white/[0.03] border border-white/[0.06] text-white/80">
                {suggestion.preview}
              </div>
              {suggestion.context && (
                <div className="mt-1 text-xs italic text-white/40">
                  {suggestion.context}
                </div>
              )}
            </div>
          </div>
        )
      }))
    });
  }
  
  if (learningSuggestions.length > 0) {
    suggestionSections.push({
      title: `Learning Resources (${learningSuggestions.length})`,
      items: learningSuggestions.map((suggestion): DropdownItem => ({
        id: suggestion.id,
        isActive: selectedSuggestionId === suggestion.id,
        onSelect: () => setSelectedSuggestionId(suggestion.id),
        content: (
          <div className="flex w-full">
            <div className="flex-shrink-0 mr-2.5 mt-0.5">
              {getSuggestionIcon(suggestion.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium text-white/90 truncate">{suggestion.title}</span>
              </div>
              <span className="text-xs text-white/60 line-clamp-1 w-full">
                {suggestion.description}
              </span>
              <div className="mt-1.5 p-1.5 text-xs rounded bg-white/[0.03] border border-white/[0.06] text-white/80">
                {suggestion.preview}
              </div>
              {suggestion.context && (
                <div className="mt-1 text-xs italic text-white/40">
                  {suggestion.context}
                </div>
              )}
            </div>
          </div>
        )
      }))
    });
  }
  
  if (featureSuggestions.length > 0) {
    suggestionSections.push({
      title: `Feature Ideas (${featureSuggestions.length})`,
      items: featureSuggestions.map((suggestion): DropdownItem => ({
        id: suggestion.id,
        isActive: selectedSuggestionId === suggestion.id,
        onSelect: () => setSelectedSuggestionId(suggestion.id),
        content: (
          <div className="flex w-full">
            <div className="flex-shrink-0 mr-2.5 mt-0.5">
              {getSuggestionIcon(suggestion.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium text-white/90 truncate">{suggestion.title}</span>
              </div>
              <span className="text-xs text-white/60 line-clamp-1 w-full">
                {suggestion.description}
              </span>
              <div className="mt-1.5 p-1.5 text-xs rounded bg-white/[0.03] border border-white/[0.06] text-white/80">
                {suggestion.preview}
              </div>
              {suggestion.context && (
                <div className="mt-1 text-xs italic text-white/40">
                  {suggestion.context}
                </div>
              )}
            </div>
          </div>
        )
      }))
    });
  }

  // Get footer actions based on selected suggestion
  const getFooterActions = (): DropdownFooterAction[] => {
    if (selectedSuggestionId && !isLoading) {
      const selectedSuggestion = suggestions.find(s => s.id === selectedSuggestionId);
      if (selectedSuggestion) {
        if (selectedSuggestion.type === 'code') {
          return [
            {
              icon: <Check className="w-3.5 h-3.5" />,
              label: "Apply suggestion",
              onClick: () => handleSuggestionSelect(selectedSuggestionId)
            },
            {
              icon: <ExternalLink className="w-3.5 h-3.5" />,
              label: "Learn more",
              onClick: () => {
                window.open('https://docs.example.com', '_blank');
              }
            }
          ];
        } else if (selectedSuggestion.type === 'learning') {
          return [
            {
              icon: <ExternalLink className="w-3.5 h-3.5" />,
              label: "View resource",
              onClick: () => {
                window.open('https://docs.example.com', '_blank');
              }
            },
            {
              icon: <Star className="w-3.5 h-3.5" />,
              label: "Save for later",
              onClick: () => {
                toast({
                  title: "Saved",
                  description: "Learning resource saved for later",
                  variant: "default",
                });
              }
            }
          ];
        } else {
          return [
            {
              icon: <Check className="w-3.5 h-3.5" />,
              label: "Implement feature",
              onClick: () => handleSuggestionSelect(selectedSuggestionId)
            }
          ];
        }
      }
    }
    
    // Default actions when no suggestion is selected or loading
    return [
      {
        icon: <Lightbulb className="w-3.5 h-3.5" />,
        label: isGeneratingSuggestions ? "Generating..." : "Generate more suggestions",
        onClick: () => {
          if (!isGeneratingSuggestions) {
            onClick?.();
            toast({
              title: "Generating Suggestions",
              description: "New suggestions will appear shortly",
              variant: "default",
            });
          }
        },
        isDisabled: isGeneratingSuggestions
      }
    ];
  };

  const footerActions = getFooterActions();
  
  // Count for notification badge
  const newSuggestionsCount = suggestions.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="p-0 h-auto hover:bg-white/[0.05] rounded-sm transition-all duration-200 group relative w-full"
          aria-label="AI suggestions"
        >
          <BaseTab
            icon={
              <div className="flex items-center justify-center w-5 h-5 group-hover:scale-110 transition-transform duration-300">
                <Lightbulb className="w-3 h-3 text-yellow-400" />
              </div>
            }
            label="Suggestions"
            shortcut="S"
            className="w-full"
          />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownList 
        headerContent={
          <div className="px-2 pt-1.5 pb-2">
            {/* Search input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-white/40" />
              </div>
              <input
                type="text"
                placeholder="Search suggestions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.05] rounded-md py-1.5 pl-8 pr-3 text-sm text-white/80 placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/20 focus:bg-white/[0.07]"
                aria-label="Search suggestions"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-2 flex items-center text-white/40 hover:text-white/60"
                >
                  <span className="sr-only">Clear search</span>
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            {/* Search feedback */}
            {searchQuery && (
              <div className="flex justify-between items-center text-xs text-white/50 mt-1.5 px-1">
                <span>
                  {filteredSuggestions.length === 0 
                    ? 'No matches found' 
                    : `Found ${filteredSuggestions.length} match${filteredSuggestions.length === 1 ? '' : 'es'}`}
                </span>
                <button 
                  className="hover:text-white/70 transition-colors text-xs"
                  onClick={() => setSearchQuery('')}
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        }
        sections={suggestionSections}
        footerActions={footerActions}
        emptyState={
          <div className="text-sm text-white/50 flex flex-col items-center py-4">
            {isLoading ? (
              <>
                <div className="w-8 h-8 mb-3 rounded-full border-2 border-white/10 border-t-white/40 animate-spin" />
                <p>Analyzing conversation...</p>
              </>
            ) : (
              <>
                <Lightbulb className="w-8 h-8 text-white/20 mb-2" />
                {searchQuery ? (
                  <>
                    <p>No suggestions match your search</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3 text-xs" 
                      onClick={() => setSearchQuery('')}
                    >
                      Clear search
                    </Button>
                  </>
                ) : currentConversationId ? (
                  <>
                    <p>No suggestions available</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3 text-xs" 
                      onClick={onClick}
                      disabled={isGeneratingSuggestions}
                    >
                      {isGeneratingSuggestions ? "Generating..." : "Generate suggestions"}
                    </Button>
                  </>
                ) : (
                  <p>Start a conversation to get suggestions</p>
                )}
              </>
            )}
          </div>
        }
      />
    </DropdownMenu>
  );
} 