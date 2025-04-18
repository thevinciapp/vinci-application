import { ipcRenderer, IpcRendererEvent } from 'electron';
import { IpcEvent } from '@/core/ipc/constants';
import { IpcResponse } from '@/src/shared/types/ipc';

export type IpcEventType = IpcEvent;

export type EventCallback<T = unknown> = (event: IpcRendererEvent, response: IpcResponse<T>) => void;

export const ipcUtils = {
  on: <T = unknown>(channel: IpcEventType, callback: EventCallback<T>): () => void => {
    ipcRenderer.on(channel, callback);
    return () => ipcRenderer.removeListener(channel, callback);
  },

  off: <T = unknown>(channel: IpcEventType, callback: EventCallback<T>): void => {
    ipcRenderer.removeListener(channel, callback);
  },

  removeAllListeners: (channel: IpcEventType): void => {
    ipcRenderer.removeAllListeners(channel);
  },

  invoke: <T = unknown>(channel: IpcEventType, ...args: unknown[]): Promise<IpcResponse & { data?: T }> => {
    return ipcRenderer.invoke(channel, ...args);
  },

  send: (channel: IpcEventType, data: IpcResponse): void => {
    ipcRenderer.send(channel, data);
  },
};
