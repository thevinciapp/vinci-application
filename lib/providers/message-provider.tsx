import { ContentProvider, MentionContent, MentionItem } from '@/types/mention';
import { MessageSquare } from 'lucide-react';
import { searchMessages } from '@/app/actions/conversations';

// Implementation that uses Supabase to search real messages
export const MessageProvider: ContentProvider = {
  id: 'message',
  name: 'Messages',
  icon: <MessageSquare className="h-4 w-4" />,
  description: 'Access previous messages from conversations',
  isEnabled: true,
  requiresAuth: true,
  isAuthenticated: true,
  supportedTypes: ['message', 'conversation'],
  
  // Search for messages
  search: async (query: string, options?: any): Promise<MentionItem[]> => {
    try {
      if (!query || query.length < 2) {
        return [];
      }
      
      // Default to search across all spaces if not specified
      const searchScope = options?.searchScope || 'all';
      const searchMode = options?.searchMode || 'text';
      const limit = options?.limit || 10;
      
      // Use the server action to search messages
      const response = await searchMessages(
        query, 
        searchScope, 
        searchMode,
        options?.conversationId,
        options?.spaceId,
        limit
      );
      
      if (!response.data?.results || !Array.isArray(response.data.results)) {
        return [];
      }
      
      // Format the search results as mention items
      return response.data.results.map(message => {
        // Truncate content for display
        const displayName = message.content.substring(0, 60) + (message.content.length > 60 ? '...' : '');
        
        return {
          id: `message-${message.id}`,
          type: 'message',
          name: displayName,
          description: `From: ${message.conversationTitle}`,
          icon: <MessageSquare className={`h-4 w-4 ${message.role === 'assistant' ? 'text-cyan-400' : 'text-white/70'}`} />,
          providerData: {
            messageId: message.id,
            conversationId: message.conversation_id,
            timestamp: message.created_at,
            fullContent: message.content,
            role: message.role,
            conversationTitle: message.conversationTitle
          }
        };
      });
    } catch (error) {
      console.error("Error searching messages:", error);
      return [];
    }
  },
  
  // Get content for a message
  getContent: async (item: MentionItem): Promise<MentionContent> => {
    try {
      // We already have the full message content from the search
      return {
        content: item.providerData?.fullContent || item.name,
        type: 'text',
        metadata: {
          conversationId: item.providerData?.conversationId,
          messageId: item.providerData?.messageId,
          timestamp: item.providerData?.timestamp,
          role: item.providerData?.role,
          conversationTitle: item.providerData?.conversationTitle
        }
      };
    } catch (error) {
      console.error("Error fetching message:", error);
      throw error;
    }
  }
};