export interface IpcResponse {
  success: boolean;
  status?: string;
  data?: any;
  error?: string;
}

export interface StateUpdate {
  type: string;
  payload: any;
}

export type AppStateResponse = IpcResponse;
export type CommandCenterResponse = IpcResponse;
export type UserResponse = IpcResponse; 