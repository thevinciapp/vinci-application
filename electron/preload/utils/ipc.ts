import { ipcRenderer, IpcRendererEvent } from 'electron';
import { 
  IpcResponse,
  AuthEventType,
  AppStateEventType,
  CommandCenterEventType,
  SpaceEventType,
  MessageEventType,
  UserEventType,
  NotificationEventType,
  ConversationEventType
} from '../../../src/types';

export type IpcEventType = 
  | AuthEventType 
  | AppStateEventType 
  | CommandCenterEventType 
  | SpaceEventType 
  | MessageEventType
  | UserEventType
  | NotificationEventType
  | ConversationEventType;

export type EventCallback = (event: IpcRendererEvent, response: IpcResponse) => void;

export const ipcUtils = {
  on: (channel: IpcEventType, callback: EventCallback): () => void => {
    ipcRenderer.on(channel, callback);
    return () => ipcRenderer.removeListener(channel, callback);
  },

  off: (channel: IpcEventType, callback: EventCallback): void => {
    ipcRenderer.removeListener(channel, callback);
  },

  removeAllListeners: (channel: IpcEventType): void => {
    ipcRenderer.removeAllListeners(channel);
  },

  invoke: <T = any>(channel: IpcEventType, ...args: any[]): Promise<IpcResponse & { data?: T }> => {
    return ipcRenderer.invoke(channel, ...args);
  },

  send: (channel: IpcEventType, data: IpcResponse): void => {
    ipcRenderer.send(channel, data);
  },
};
