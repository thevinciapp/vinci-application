import { ContentProvider, MentionItem, MentionItemType } from '@/types/mention';
import { FileSystemProvider } from './file-system-provider';
import { MessageProvider } from './message-provider';

// Registry of all available content providers
const providers: ContentProvider[] = [
  FileSystemProvider,
  MessageProvider,
  // Add more providers here as they are implemented
];

// Provider registry with helper methods
class ProviderRegistry {
  private providers: ContentProvider[];
  
  constructor(initialProviders: ContentProvider[]) {
    this.providers = initialProviders;
  }
  
  // Gets all registered providers
  getAllProviders(): ContentProvider[] {
    return this.providers;
  }
  
  // Gets enabled providers
  getEnabledProviders(): ContentProvider[] {
    return this.providers.filter(provider => provider.isEnabled);
  }
  
  // Gets a provider by ID
  getProviderById(id: string): ContentProvider | undefined {
    return this.providers.find(provider => provider.id === id);
  }
  
  // Gets providers that support a specific type
  getProvidersByType(type: MentionItemType): ContentProvider[] {
    return this.providers.filter(provider => 
      provider.isEnabled && provider.supportedTypes.includes(type)
    );
  }
  
  // Get the appropriate provider for a mention item
  getProviderForItem(item: MentionItem): ContentProvider | undefined {
    // Try to find provider by ID prefix first
    if (item.id.startsWith('file-') || item.id.startsWith('folder-')) {
      return this.getProviderById('filesystem');
    }
    
    if (item.id.startsWith('message-') || item.id.startsWith('conversation-')) {
      return this.getProviderById('message');
    }
    
    // Fallback to type-based lookup
    const typeProviders = this.getProvidersByType(item.type);
    return typeProviders.length > 0 ? typeProviders[0] : undefined;
  }
  
  // Register a new provider
  registerProvider(provider: ContentProvider): void {
    // Prevent duplicate registrations
    if (!this.providers.find(p => p.id === provider.id)) {
      this.providers.push(provider);
    }
  }
  
  // Execute a search across all enabled providers
  async searchAllProviders(query: string, options?: any): Promise<MentionItem[]> {
    if (!query || query.length < 2) return [];
    
    try {
      // Get all enabled providers
      const enabledProviders = this.getEnabledProviders();
      
      // Execute search on all providers in parallel
      const results = await Promise.all(
        enabledProviders.map(async provider => {
          try {
            return await provider.search(query, options);
          } catch (error) {
            console.error(`Error with provider ${provider.id}:`, error);
            return [];
          }
        })
      );
      
      // Flatten and return all results
      return results.flat();
    } catch (error) {
      console.error("Error searching providers:", error);
      return [];
    }
  }
}

// Export a singleton instance
export const providerRegistry = new ProviderRegistry(providers);