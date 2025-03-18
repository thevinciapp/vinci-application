import { ipcRenderer } from 'electron';
import { AuthEvents } from '@/core/ipc/constants';

export const authApi = {
  setAuthTokens: (accessToken: string, refreshToken: string) => 
    ipcRenderer.invoke(AuthEvents.SET_AUTH_TOKENS, accessToken, refreshToken),
  
  getAuthToken: () => 
    ipcRenderer.invoke(AuthEvents.GET_AUTH_TOKEN),
  
  refreshAuthTokens: () => 
    ipcRenderer.invoke(AuthEvents.REFRESH_AUTH_TOKENS),
  
  signOut: () => 
    ipcRenderer.invoke(AuthEvents.SIGN_OUT),
  
  resetPassword: (email: string) =>
    ipcRenderer.invoke(AuthEvents.RESET_PASSWORD, email),
  
  signUp: (email: string, password: string) =>
    ipcRenderer.invoke(AuthEvents.SIGN_UP, email, password),
  
  getSession: () =>
    ipcRenderer.invoke(AuthEvents.GET_SESSION),
};
