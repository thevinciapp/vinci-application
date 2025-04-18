import { useState, useMemo } from 'react';
import { Brain, Check, Clock, Calendar, Info, Search, XCircle, FileText, Code, Globe, MessageSquare, Lightbulb, ShoppingCart } from 'lucide-react';
import { BaseTab } from '@/shared/components/base-tab';
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from '@/shared/components/dropdown-menu';
import { Button } from '@/shared/components/button';
import { toast } from '@/shared/hooks/use-toast';
import { DropdownList, DropdownSection, DropdownItem, DropdownFooterAction } from '@/shared/components/dropdown-list';

export interface SuggestionsTabProps {
  onClick?: () => void;
}

type SuggestionType =
  | 'calendar'
  | 'research'
  | 'tasks'
  | 'development'
  | 'meeting'
  | 'travel'
  | 'document'
  | 'shopping'
  | 'communication'
  | 'learning';


export function SuggestionsTab() {
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleSuggestionAction = async (suggestionId: string, action: 'accept' | 'dismiss') => {
    try {
      const suggestion = suggestions.find(s => s.id === suggestionId);
      if (!suggestion) return;

      switch (action) {
        case 'accept':
          toast({
            title: 'Suggestion Accepted',
            description: `"${suggestion.title}" accepted`,
            variant: 'default',
          });
          break;
        case 'dismiss':
          toast({
            title: 'Suggestion Dismissed',
            description: `"${suggestion.title}" dismissed`,
            variant: 'default',
          });
          break;
      }
    } catch {
      toast({
        title: 'Operation Failed',
        description: `Failed to ${action} suggestion. Please try again.`,
        variant: 'destructive',
      });
    }
  };

  const suggestions: Suggestion[] = [
    {
      id: 'suggestion-1',
      title: 'Schedule 1-on-1 with Dallen',
      description: 'Based on your conversation, would you like to schedule a 1-on-1 meeting with Dallen for 2:30pm today?',
      type: 'calendar',
      timestamp: new Date(Date.now() - 300000).toISOString()
    },
    {
      id: 'suggestion-2',
      title: 'Research Tesla Models',
      description: 'I noticed you mentioned buying a Tesla. Would you like me to research current models and pricing?',
      type: 'research',
      timestamp: new Date(Date.now() - 600000).toISOString()
    },
    {
      id: 'suggestion-3',
      title: 'Set Up Project Reminders',
      description: 'You mentioned deadlines for the frontend tasks. Should I create reminders for these deadlines?',
      type: 'tasks',
      timestamp: new Date(Date.now() - 900000).toISOString()
    },
    {
      id: 'suggestion-4',
      title: 'Create API Integration',
      description: 'Would you like me to generate boilerplate code for integrating with the payment API you discussed?',
      type: 'development',
      timestamp: new Date(Date.now() - 1200000).toISOString()
    },
    {
      id: 'suggestion-5',
      title: 'Book Team Meeting Room',
      description: 'Should I reserve a conference room for your team standup mentioned in the conversation?',
      type: 'meeting',
      timestamp: new Date(Date.now() - 1500000).toISOString()
    },
    {
      id: 'suggestion-6',
      title: 'Check Flight Prices',
      description: 'I noticed you mentioned traveling to San Francisco. Would you like me to check flight options?',
      type: 'travel',
      timestamp: new Date(Date.now() - 1800000).toISOString()
    },
    {
      id: 'suggestion-7',
      title: 'Draft Project Proposal',
      description: 'Based on your ideas, would you like me to create a draft proposal document for your client?',
      type: 'document',
      timestamp: new Date(Date.now() - 2100000).toISOString()
    },
    {
      id: 'suggestion-8',
      title: 'Compare Laptop Models',
      description: 'You mentioned needing a new laptop. Would you like me to research and compare options?',
      type: 'shopping',
      timestamp: new Date(Date.now() - 2400000).toISOString()
    },
    {
      id: 'suggestion-9',
      title: 'Draft Email Response',
      description: 'Would you like me to help draft a response to the client email you mentioned?',
      type: 'communication',
      timestamp: new Date(Date.now() - 2700000).toISOString()
    },
    {
      id: 'suggestion-10',
      title: 'Find TypeScript Tutorials',
      description: 'I noticed you had questions about TypeScript. Would you like me to find relevant learning resources?',
      type: 'learning',
      timestamp: new Date(Date.now() - 3000000).toISOString()
    }
  ];

  const filterSuggestions = () => {
    if (!searchQuery.trim()) {
      return [...suggestions];
    }

    const query = searchQuery.toLowerCase().trim();
    return suggestions.filter(suggestion =>
      suggestion.title.toLowerCase().includes(query) ||
      suggestion.description.toLowerCase().includes(query)
    );
  };

  const filteredSuggestions = filterSuggestions();

  // Group suggestions by type
  const groupedSuggestions = useMemo(() => {
    const groups: Record<string, Suggestion[]> = {};

    filteredSuggestions.forEach(suggestion => {
      if (!groups[suggestion.type]) {
        groups[suggestion.type] = [];
      }
      groups[suggestion.type].push(suggestion);
    });

    return groups;
  }, [filteredSuggestions]);

  // Get appropriate icon for each suggestion type
  const getTypeIcon = (type: SuggestionType) => {
    switch (type) {
      case 'calendar':
        return <Calendar className="w-4 h-4 text-blue-400" />;
      case 'research':
        return <Info className="w-4 h-4 text-purple-400" />;
      case 'tasks':
        return <Check className="w-4 h-4 text-green-400" />;
      case 'development':
        return <Code className="w-4 h-4 text-cyan-400" />;
      case 'meeting':
        return <MessageSquare className="w-4 h-4 text-yellow-400" />;
      case 'travel':
        return <Globe className="w-4 h-4 text-blue-500" />;
      case 'document':
        return <FileText className="w-4 h-4 text-orange-400" />;
      case 'shopping':
        return <ShoppingCart className="w-4 h-4 text-pink-400" />;
      case 'communication':
        return <MessageSquare className="w-4 h-4 text-indigo-400" />;
      case 'learning':
        return <Lightbulb className="w-4 h-4 text-yellow-400" />;
      default:
        return <Brain className="w-4 h-4 text-gray-400" />;
    }
  };

  // Get appropriate label for each type (capitalize first letter)
  const getTypeLabel = (type: SuggestionType) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getSuggestionSections = (): DropdownSection[] => {
    return Object.entries(groupedSuggestions).map(([type, suggestions]) => ({
      title: `${getTypeLabel(type as SuggestionType)} (${suggestions.length})`,
      items: suggestions.map((suggestion): DropdownItem => ({
        id: suggestion.id,
        onSelect: () => { },
        content: (
          <div className="flex w-full">
            <div className="flex-shrink-0 mr-2.5 mt-0.5">
              {getTypeIcon(suggestion.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="mb-0.5">
                <span className="text-sm font-medium text-white/90 block">{suggestion.title}</span>
              </div>
              <p className="text-xs text-white/70 leading-relaxed">{suggestion.description}</p>
              <div className="flex mt-1.5">
                <span className="text-xs text-white/50">
                  <Clock className="w-3 h-3 inline mr-1 align-text-bottom" />
                  {new Date(suggestion.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        )
      }))
    }));
  };

  const getFooterActions = (): DropdownFooterAction[] => {
    return [
      {
        icon: <Check className="w-3.5 h-3.5" />,
        label: "Execute this",
        onClick: (suggestionId: string) => {
          handleSuggestionAction(suggestionId, 'accept');
        },
        variant: 'default'
      },
      {
        icon: <XCircle className="w-3.5 h-3.5" />,
        label: "Dismiss",
        onClick: (suggestionId: string) => {
          handleSuggestionAction(suggestionId, 'dismiss');
        },
        variant: 'destructive'
      }
    ];
  };

  const suggestionSections = getSuggestionSections();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="p-0 h-auto hover:bg-white/[0.05] rounded-sm transition-all duration-200 group w-full"
          aria-label="Suggestions menu"
        >
          <BaseTab
            icon={
              <div className="flex items-center justify-center w-5 h-5 group-hover:scale-110 transition-transform duration-300">
                <Brain className="w-3 h-3 text-purple-400" />
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
                  <XCircle className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {searchQuery && (
              <div className="flex justify-between items-center text-xs text-white/50 mt-2 px-1">
                <div className="flex items-center">
                  <Search className="w-3 h-3 mr-1" />
                  <span>Searching: &quot;{searchQuery}&quot;</span>
                </div>
                <span className="ml-auto">
                  {filteredSuggestions.length === 0
                    ? 'No matches'
                    : `${filteredSuggestions.length} match${filteredSuggestions.length === 1 ? '' : 'es'}`}
                </span>
              </div>
            )}
          </div>  
        }
        sections={suggestionSections}
        footerActions={getFooterActions()}
        emptyState={
          <div className="text-sm text-white/50 flex flex-col items-center py-4">
            {searchQuery ? (
              <>
                <Search className="w-8 h-8 text-white/20 mb-2" />
                <p>No suggestions match your search</p>
                <div className="flex space-x-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear search
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Brain className="w-8 h-8 text-white/20 mb-2" />
                <p>No suggestions available</p>
              </>
            )}
          </div>
        }
      />
    </DropdownMenu>
  );
} 