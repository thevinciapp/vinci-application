import { ContentProvider, MentionContent, MentionItem } from '@/types/mention';
import { Clock } from 'lucide-react';

// Mock message provider implementation - in a real implementation, this would fetch from your API
export const MessageProvider: ContentProvider = {
  id: 'message',
  name: 'Messages',
  icon: <Clock className="h-4 w-4" />,
  description: 'Access previous messages from conversations',
  isEnabled: true,
  requiresAuth: false,
  isAuthenticated: true,
  supportedTypes: ['message', 'conversation'],
  
  // Search for messages
  search: async (query: string, options?: any): Promise<MentionItem[]> => {
    try {
      // This would typically be an API call to your backend
      // For now we'll use mock data
      const mockMessages = [
        { 
          id: 'message-123', 
          content: 'Here is how to implement that feature...', 
          timestamp: '2023-01-15T12:30:00Z',
          conversationId: 'conv-1',
          conversationName: 'Feature Implementation'
        },
        { 
          id: 'message-456', 
          content: 'The error occurs because of incorrect config...', 
          timestamp: '2023-01-14T15:45:00Z',
          conversationId: 'conv-2',
          conversationName: 'Bug Fixing Session'
        },
        { 
          id: 'message-789', 
          content: 'For testing, you should use Jest with the following setup...', 
          timestamp: '2023-01-13T09:15:00Z',
          conversationId: 'conv-3',
          conversationName: 'Testing Strategy'
        }
      ];
      
      return mockMessages
        .filter(msg => 
          msg.content.toLowerCase().includes(query.toLowerCase()) ||
          msg.conversationName.toLowerCase().includes(query.toLowerCase())
        )
        .map(msg => ({
          id: `message-${msg.id}`,
          type: 'message',
          name: msg.content.substring(0, 30) + (msg.content.length > 30 ? '...' : ''),
          description: `From: ${msg.conversationName}`,
          icon: <Clock className="h-4 w-4" />,
          providerData: {
            messageId: msg.id,
            conversationId: msg.conversationId,
            timestamp: msg.timestamp,
            fullContent: msg.content
          }
        }));
    } catch (error) {
      console.error("Error searching messages:", error);
      return [];
    }
  },
  
  // Get content for a message
  getContent: async (item: MentionItem): Promise<MentionContent> => {
    try {
      // In a real implementation, this would fetch the full message from your backend
      // For now we'll just return the info we already have
      return {
        content: item.providerData?.fullContent || item.name,
        type: 'text',
        metadata: {
          conversationId: item.providerData?.conversationId,
          messageId: item.providerData?.messageId,
          timestamp: item.providerData?.timestamp
        }
      };
    } catch (error) {
      console.error("Error fetching message:", error);
      throw error;
    }
  }
};