export interface IpcResponse<T = unknown> {
  success: boolean;
  status?: string;
  data?: T;
  error?: string;
}

export interface StateUpdate {
  type: string;
  payload: unknown;
}

export type AppStateResponse = IpcResponse;
export type CommandCenterResponse = IpcResponse;
export type UserResponse = IpcResponse;