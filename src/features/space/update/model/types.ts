import { Provider } from '@/entities/model/model/types';
import { Space } from '@/entities/space/model/types';

export interface UpdateSpaceRequest {
  name?: string;
  description?: string;
  model?: string;
  provider?: Provider;
  is_archived?: boolean;
  chat_mode?: string;
}

export interface UpdateSpaceResponse {
  space: Space;
}