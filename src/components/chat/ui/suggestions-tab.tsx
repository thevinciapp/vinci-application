import { Bell, Lightbulb, ExternalLink } from 'lucide-react';
import { BaseTab } from 'vinci-ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Button
} from 'vinci-ui';
import { toast } from '@/components/chat/ui/toast';

export interface SuggestionsTabProps {
  onClick?: () => void;
}

export function SuggestionsTab({ onClick }: SuggestionsTabProps) {
  const handleSuggestionSelect = async (suggestion: string) => {
    try {
      toast({
        title: 'Suggestion Applied',
        description: `Applied: ${suggestion}`,
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to apply suggestion',
        variant: 'destructive',
      });
    }
  };

  const suggestions = [
    {
      id: 'suggestion-1',
      type: 'code',
      title: 'Optimize Query Performance',
      description: 'Refactor database queries for better performance',
      preview: 'Add index to frequently queried columns'
    },
    {
      id: 'suggestion-2',
      type: 'learning',
      title: 'Advanced TypeScript Features',
      description: 'Learn about utility types and type manipulation',
      preview: 'Check out TypeScript documentation'
    },
    {
      id: 'suggestion-3',
      type: 'feature',
      title: 'Implement Dark Mode Toggle',
      description: 'Add user preference for display theme',
      preview: 'Use CSS variables for theme colors'
    }
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
          <BaseTab
            icon={<Bell className="w-3 h-3" />}
            label="Suggestions"
            shortcut="S"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-[280px] max-h-[400px] mb-1.5 overflow-y-auto">
        <DropdownMenuLabel>AI Suggestions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {suggestions.length === 0 ? (
          <div className="py-3 px-2 text-sm text-center text-muted-foreground">
            No suggestions available
          </div>
        ) : (
          suggestions.map((suggestion) => (
            <DropdownMenuItem
              key={suggestion.id}
              className="flex items-start gap-2 px-2 py-2"
              onSelect={() => handleSuggestionSelect(suggestion.title)}
            >
              <div className="mt-0.5">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-sm font-medium">{suggestion.title}</span>
                <span className="text-xs text-muted-foreground">{suggestion.description}</span>
                <div className="mt-1 p-1.5 text-xs rounded bg-white/[0.03] border border-white/[0.06]">
                  {suggestion.preview}
                </div>
                <div className="flex justify-end mt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1 text-xs flex items-center gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open('https://docs.example.com', '_blank');
                    }}
                  >
                    <ExternalLink className="w-3 h-3" />
                    Learn More
                  </Button>
                </div>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 