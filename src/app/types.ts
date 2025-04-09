import { Space } from '@/entities/space/model/types';
import { Conversation } from '@/entities/conversation/model/types';
import { Message } from '@/entities/message/model/types';
import { User } from '@/entities/user/model/types';

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