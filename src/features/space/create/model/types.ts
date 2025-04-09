import { Provider } from '@/entities/model/model/types';
import { Space } from '@/entities/space/model/types';

export interface CreateSpaceRequest {
  name: string;
  description?: string;
  model?: string;
  provider?: Provider;
  chat_mode?: string;
}

export interface CreateSpaceResponse {
  space: Space;
}