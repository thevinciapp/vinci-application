export interface IpcResponse<T = any> {
  success: boolean;
  status?: string;
  data?: T;
  error?: string;
}

export interface StateUpdate {
  type: string;
  payload: any;
}

export type AppStateResponse = IpcResponse;
export type CommandCenterResponse = IpcResponse;
export type UserResponse = IpcResponse; 