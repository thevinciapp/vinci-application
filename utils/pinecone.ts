import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecordMetadata } from '@pinecone-database/pinecone';
import { createClient } from './supabase/server';

if (!process.env.PINECONE_API_KEY) {
  throw new Error('Missing PINECONE_API_KEY environment variable');
}

if (!process.env.PINECONE_ENVIRONMENT) {
  throw new Error('Missing PINECONE_ENVIRONMENT environment variable');
}

if (!process.env.PINECONE_INDEX) {
  throw new Error('Missing PINECONE_INDEX environment variable');
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

const pinecone = new Pinecone();

const index = pinecone.Index(process.env.PINECONE_INDEX!);

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'text-embedding-3-large',
});

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: number;
  spaceId: string;
  conversationId: string;
  parentId?: string;
  childId?: string;
  metadata?: Record<string, any>;
}

interface PineconeMetadata extends RecordMetadata {
  content: string;
  role: 'user' | 'assistant';
  createdAt: number;
  spaceId: string;
  conversationId: string;
  parentId?: string;
  childId?: string;
  tags?: string[];
  similarMessagesStr?: string;
  similarMessagesCount?: number;
  [key: string]: any;
}

export async function upsertChatMessage(message: ChatMessage) {
  try {
    if (!message.id) {
      throw new Error('Message ID is required for Pinecone upsert');
    }

    console.log('[PINECONE] Upserting chat message:', { messageId: message.id, conversationId: message.conversationId });
    const vector = await embeddings.embedQuery(message.content);

    // Extract metadata for Pinecone
    const metadata: PineconeMetadata = {
      content: message.content,
      role: message.role,
      createdAt: message.createdAt,
      spaceId: message.spaceId,
      conversationId: message.conversationId,
      ...(message.parentId && { parentId: message.parentId }),
      ...(message.childId && { childId: message.childId }),
    };
    
    if (message.metadata) {
      Object.entries(message.metadata).forEach(([key, value]) => {
        if (key === 'similarMessages' && value) {
          metadata.similarMessagesStr = JSON.stringify(value);
          metadata.similarMessagesCount = Array.isArray(value) ? value.length : 0;
        } else if (key === 'tags' && Array.isArray(value)) {
          metadata.tags = value;
        } else if (
          typeof value === 'string' || 
          typeof value === 'number' || 
          typeof value === 'boolean' ||
          (Array.isArray(value) && value.every(item => typeof item === 'string'))
        ) {
          metadata[key] = value;
        }
      });
    }
    
    // Add tags for filtering if not set from metadata
    if (!metadata.tags) {
      const tags = [
        `conversation-${message.conversationId}`,
        `space-${message.spaceId}`,
        `role-${message.role}`,
      ];
      metadata.tags = tags;
    }

    // Use the correct format for the Pinecone SDK version
    await index.upsert([
      {
        id: message.id,
        values: vector,
        metadata,
      },
    ]);
    
    // Update parent message if this is an assistant message
    if (message.role === 'assistant' && message.parentId) {
      try {
        const parentVector = await index.fetch([message.parentId]);
        const parentRecord = parentVector.records[message.parentId];
        if (parentRecord && parentRecord.metadata) {
          const parentMetadata = parentRecord.metadata as PineconeMetadata;
          await index.upsert([
            {
              id: message.parentId,
              values: parentRecord.values,
              metadata: {
                ...parentMetadata,
                childId: message.id,
              },
            },
          ]);
        }
      } catch (innerError) {
        console.error('[PINECONE] Error updating parent message:', innerError);
        // Continue execution even if parent update fails
      }
    }
    
    console.log('[PINECONE] Successfully upserted message:', { messageId: message.id });
    return true;
  } catch (error) {
    console.error('[PINECONE] Error upserting chat message to Pinecone:', error);
    throw error;
  }
}

export async function searchSimilarMessages(query: string, limit = 5, tags: string[] = []) {
  try {
    console.log('[PINECONE] Searching similar messages:', { query, limit, tags });
    const queryEmbedding = await embeddings.embedQuery(query);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('[PINECONE] Search failed: User not authenticated');
      throw new Error('Unauthorized');
    }
    
    const filter: any = {};
    
    // Add tag filter if tags are provided
    if (tags.length > 0) {
      console.log('[PINECONE] Adding tag filters:', tags);
      filter.tags = { $in: tags };
    }
    
    // Get deleted conversations and spaces to exclude them from results
    console.log('[PINECONE] Getting deleted conversations and spaces');
    const [conversationsResult, spacesResult] = await Promise.all([
      supabase
        .from('conversations')
        .select('id')
        .eq('is_deleted', true),
      supabase
        .from('spaces')
        .select('id')
        .eq('is_deleted', true)
    ]);
    
    const deletedConversationIds = conversationsResult.data?.map(c => c.id) || [];
    const deletedSpaceIds = spacesResult.data?.map(s => s.id) || [];
    
    console.log('[PINECONE] Exclusions:', { 
      deletedConversations: deletedConversationIds.length, 
      deletedSpaces: deletedSpaceIds.length 
    });

    // Build filter for Pinecone query
    // Use $and only if we have multiple conditions
    if ((deletedConversationIds.length > 0 || deletedSpaceIds.length > 0) || tags.length > 0) {
      // Initialize $and array if we need it
      filter.$and = [];
      
      // Add tag filter to $and if tags are provided
      if (tags.length > 0) {
        filter.$and.push({ tags: { $in: tags } });
        // Remove the top-level tags filter since we're using it in $and
        delete filter.tags;
      }
      
      // Add filters to exclude deleted conversations and spaces
      if (deletedConversationIds.length > 0) {
        filter.$and.push({ conversationId: { $nin: deletedConversationIds } });
      }
      
      if (deletedSpaceIds.length > 0) {
        filter.$and.push({ spaceId: { $nin: deletedSpaceIds } });
      }
      
      // If $and has only one condition, simplify the filter
      if (filter.$and.length === 1) {
        const condition = filter.$and[0];
        delete filter.$and;
        Object.assign(filter, condition);
      } else if (filter.$and.length === 0) {
        delete filter.$and;
      }
    }

    const results = await index.query({
      vector: queryEmbedding,
      topK: limit,
      includeMetadata: true,
      ...(Object.keys(filter).length > 0 ? { filter } : {}),
    });

    console.log('[PINECONE] Search complete, results:', results.matches.length);
    return results.matches.map((match) => ({
      score: match.score,
      message: reconstructChatMessage(match.metadata as PineconeMetadata, match.id),
    }));
  } catch (error) {
    console.error('[PINECONE] Error searching similar messages in Pinecone:', error);
    throw error;
  }
}

function reconstructChatMessage(metadata: PineconeMetadata, id: string): ChatMessage {
  const { 
    content, 
    role, 
    createdAt, 
    spaceId, 
    conversationId, 
    parentId, 
    childId, 
    similarMessagesStr, 
    similarMessagesCount,
    ...rest 
  } = metadata;
  
  // Prepare the message metadata
  const messageMetadata: Record<string, any> = { 
    ...rest
    // Don't duplicate conversationId in metadata since it's already at the top level
  };
  
  // Parse the stringified similarMessages back to an object if it exists
  if (similarMessagesStr) {
    try {
      const parsedMessages = JSON.parse(similarMessagesStr);
      // Make sure each similar message has conversationId as a direct property
      messageMetadata.similarMessages = parsedMessages.map((msg: any) => ({
        ...msg,
        // Put conversationId directly on the message object
        conversationId: msg.conversationId || msg.metadata?.conversationId
      }));
    } catch (error) {
      console.error('Error parsing similarMessages from Pinecone:', error);
      // If parsing fails, provide an empty array as fallback
      messageMetadata.similarMessages = [];
    }
  }

  return {
    id,
    content,
    role,
    createdAt,
    spaceId,
    conversationId, // This stays at the top level where it belongs
    ...(parentId && { parentId }),
    ...(childId && { childId }),
    metadata: messageMetadata,
  };
}

export async function getMessageThread(messageId: string): Promise<ChatMessage[]> {
  try {
    if (!messageId) {
      throw new Error('Message ID is required to get message thread');
    }

    const messages: ChatMessage[] = [];
    let currentId: string | undefined = messageId;

    while (currentId) {
      const result = await index.fetch([currentId]);
      const record = result.records[currentId];
      if (!record || !record.metadata) break;

      const metadata = record.metadata as PineconeMetadata;
      messages.unshift(reconstructChatMessage(metadata, currentId));
      currentId = metadata.parentId;
    }

    currentId = messageId;
    while (currentId) {
      const result = await index.fetch([currentId]);
      const record = result.records[currentId];
      if (!record || !record.metadata) break;

      const metadata = record.metadata as PineconeMetadata;
      if (!metadata.childId) break;

      const childResult = await index.fetch([metadata.childId]);
      const childRecord = childResult.records[metadata.childId];
      if (!childRecord || !childRecord.metadata) break;

      const childMetadata = childRecord.metadata as PineconeMetadata;
      messages.push(reconstructChatMessage(childMetadata, metadata.childId));
      currentId = metadata.childId;
    }

    return messages;
  } catch (error) {
    console.error('Error getting message thread:', error);
    throw error;
  }
}

export async function deleteMessagesByConversationId(conversationId: string): Promise<void> {
  try {
    if (!conversationId) {
      throw new Error('Conversation ID is required to delete messages');
    }

    console.log(`Deleting messages for conversation: ${conversationId}`);

    // Use query to find all vectors by conversationId
    const queryEmbedding = await embeddings.embedQuery(''); // Empty query to match all vectors
    const queryResponse = await index.query({
      vector: queryEmbedding,
      filter: {
        conversationId: conversationId
      },
      topK: 10000, // Set a high limit to get all messages
      includeMetadata: true,
    });

    // If we found messages to delete
    if (queryResponse.matches && queryResponse.matches.length > 0) {
      console.log(`Found ${queryResponse.matches.length} messages to delete`);
      
      // Extract the IDs from the response
      const messageIds = queryResponse.matches.map(match => match.id);
      
      if (messageIds.length > 0) {
        console.log(`Deleting ${messageIds.length} message records from Pinecone`);
        
        // Delete the vectors by their IDs
        await index.deleteMany(messageIds);
        console.log(`Successfully deleted ${messageIds.length} messages from Pinecone`);
      }
    } else {
      console.log(`No messages found for conversation ${conversationId}`);
    }
  } catch (error) {
    console.error('Error deleting messages by conversation ID:', error);
    throw error;
  }
}

export async function deleteMessagesBySpaceId(spaceId: string): Promise<void> {
  try {
    if (!spaceId) {
      throw new Error('Space ID is required to delete messages');
    }

    console.log(`Deleting messages for space: ${spaceId}`);

    // Use query to find all vectors by spaceId
    const queryEmbedding = await embeddings.embedQuery(''); // Empty query to match all vectors
    const queryResponse = await index.query({
      vector: queryEmbedding,
      filter: {
        spaceId: spaceId
      },
      topK: 10000, // Set a high limit to get all messages
      includeMetadata: true,
    });

    // If we found messages to delete
    if (queryResponse.matches && queryResponse.matches.length > 0) {
      console.log(`Found ${queryResponse.matches.length} messages to delete`);
      
      // Extract the IDs from the response
      const messageIds = queryResponse.matches.map(match => match.id);
      
      if (messageIds.length > 0) {
        console.log(`Deleting ${messageIds.length} message records from Pinecone`);
        
        // Delete the vectors by their IDs
        await index.deleteMany(messageIds);
        console.log(`Successfully deleted ${messageIds.length} messages from Pinecone`);
      }
    } else {
      console.log(`No messages found for space ${spaceId}`);
    }
  } catch (error) {
    console.error('Error deleting messages by space ID:', error);
    throw error;
  }
}