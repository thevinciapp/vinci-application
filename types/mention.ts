/**
 * Types related to the content mention system
 */

// Types of items that can be mentioned
export type MentionItemType = 
  | 'file'      // Local files
  | 'folder'    // Local folders 
  | 'message'   // Individual messages
  | 'conversation'; // Entire conversations

// Generic interface for mention items with common properties
export interface MentionItem {
  id: string;                // Unique identifier
  type: MentionItemType;     // Type of the mention item
  name: string;              // Display name
  description?: string;      // Optional description
  icon: React.ReactNode;     // Icon to display
  
  // Provider-specific properties
  providerData?: any;        // Generic container for provider-specific data
  
  // Common optional properties
  path?: string;             // Path or location (files, folders, etc.)
  contentType?: string;      // MIME type or format
  size?: number;             // Size in bytes if applicable
  created?: Date | string;   // Creation time
  modified?: Date | string;  // Last modified time
  author?: string;           // Author or creator
  url?: string;              // URL if applicable
}

// Mention content interface - what's returned when fetching content
export interface MentionContent {
  content: string;
  type: 'text' | 'binary' | 'json';
  extension?: string;
  metadata?: Record<string, any>;
}

// Generic content provider interface
export interface ContentProvider {
  id: string;                // Unique provider ID
  name: string;              // Display name
  icon: React.ReactNode;     // Icon for this provider
  description: string;       // Description of the provider
  isEnabled: boolean;        // Whether this provider is currently enabled
  requiresAuth: boolean;     // Whether authentication is required
  isAuthenticated: boolean;  // Authentication status
  supportedTypes: MentionItemType[]; // Types this provider can handle
  
  // Search method - returns promise of MentionItems
  search: (query: string, options?: any) => Promise<MentionItem[]>;
  
  // Get content method - returns promise with content
  getContent: (item: MentionItem) => Promise<MentionContent>;
  
  // Optional methods
  authenticate?: () => Promise<boolean>;
  refresh?: () => Promise<void>;
  configure?: (config: any) => Promise<void>;
}

// Extract mention interface - used for parsing mentions in text
export interface ExtractedMention {
  id: string;
  name: string;
  index: number;
  length: number;
  text: string;
  type: MentionItemType;
}

// Interface for the selected mention items
export interface SelectedMentionItem {
  path?: string;
  content: string;
  type: string;
  metadata?: Record<string, any>;
}