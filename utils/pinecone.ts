import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecordMetadata } from '@pinecone-database/pinecone';

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
  [key: string]: any;
}

export async function upsertChatMessage(message: ChatMessage) {
  try {
    if (!message.id) {
      throw new Error('Message ID is required for Pinecone upsert');
    }

    const vector = await embeddings.embedQuery(message.content);

    const metadata: PineconeMetadata = {
      content: message.content,
      role: message.role,
      createdAt: message.createdAt,
      spaceId: message.spaceId,
      conversationId: message.conversationId,
      ...(message.parentId && { parentId: message.parentId }),
      ...(message.childId && { childId: message.childId }),
      ...(message.metadata || {}),
    };

    await index.upsert([
      {
        id: message.id,
        values: vector,
        metadata,
      },
    ]);

    if (message.role === 'assistant' && message.parentId) {
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
    }
  } catch (error) {
    console.error('Error upserting chat message to Pinecone:', error);
    throw error;
  }
}

export async function searchSimilarMessages(query: string, limit = 5, tags: string[] = []) {
  try {
    const queryEmbedding = await embeddings.embedQuery(query);

    const filter: any = {};
    if (tags.length > 0) {
      filter.tags = { $in: tags };
    }

    const results = await index.query({
      vector: queryEmbedding,
      topK: limit,
      includeMetadata: true,
      ...(tags.length > 0 && { filter }),
    });

    return results.matches.map((match) => ({
      score: match.score,
      message: reconstructChatMessage(match.metadata as PineconeMetadata, match.id),
    }));
  } catch (error) {
    console.error('Error searching similar messages in Pinecone:', error);
    throw error;
  }
}

function reconstructChatMessage(metadata: PineconeMetadata, id: string): ChatMessage {
  const { content, role, createdAt, spaceId, conversationId, parentId, childId, ...rest } = metadata;
  return {
    id,
    content,
    role,
    createdAt,
    spaceId,
    conversationId,
    ...(parentId && { parentId }),
    ...(childId && { childId }),
    metadata: rest,
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