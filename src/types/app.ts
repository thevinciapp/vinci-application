import { Space } from '@/types/space';
import { Conversation } from '@/types/conversation';
import { Message } from '@/types/message';
import { User } from '@/types/user';

export interface AppState {
  spaces: Space[];
  activeSpace: Space | null;
  conversations: Conversation[];
  messages: Message[];
  initialDataLoaded: boolean;
  lastFetched: number | null;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiryTime: number | null;
} 