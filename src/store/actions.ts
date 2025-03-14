import { AppState } from '../../electron/types';

// Action Types
export const SET_APP_STATE = 'SET_APP_STATE';
export const UPDATE_SPACES = 'UPDATE_SPACES';
export const SET_ACTIVE_SPACE = 'SET_ACTIVE_SPACE';
export const UPDATE_CONVERSATIONS = 'UPDATE_CONVERSATIONS';
export const UPDATE_MESSAGES = 'UPDATE_MESSAGES';
export const SET_USER = 'SET_USER';
export const SET_ACCESS_TOKEN = 'SET_ACCESS_TOKEN';
export const SET_REFRESH_TOKEN = 'SET_REFRESH_TOKEN';

// Action Interfaces
interface SetAppStateAction {
  type: typeof SET_APP_STATE;
  payload: Partial<AppState>;
}

interface UpdateSpacesAction {
  type: typeof UPDATE_SPACES;
  payload: AppState['spaces'];
}

interface SetActiveSpaceAction {
  type: typeof SET_ACTIVE_SPACE;
  payload: AppState['activeSpace'];
}

interface UpdateConversationsAction {
  type: typeof UPDATE_CONVERSATIONS;
  payload: AppState['conversations'];
}

interface UpdateMessagesAction {
  type: typeof UPDATE_MESSAGES;
  payload: AppState['messages'];
}

interface SetUserAction {
  type: typeof SET_USER;
  payload: AppState['user'];
}

interface SetAccessTokenAction {
  type: typeof SET_ACCESS_TOKEN;
  payload: AppState['accessToken'];
}

interface SetRefreshTokenAction {
  type: typeof SET_REFRESH_TOKEN;
  payload: AppState['refreshToken'];
}

export type AppActionTypes = 
  | SetAppStateAction 
  | UpdateSpacesAction 
  | SetActiveSpaceAction 
  | UpdateConversationsAction 
  | UpdateMessagesAction 
  | SetUserAction
  | SetAccessTokenAction
  | SetRefreshTokenAction;

// Action Creators
export const setAppState = (state: Partial<AppState>): SetAppStateAction => ({
  type: SET_APP_STATE,
  payload: state
});

export const updateSpaces = (spaces: AppState['spaces']): UpdateSpacesAction => ({
  type: UPDATE_SPACES,
  payload: spaces
});

export const setActiveSpace = (space: AppState['activeSpace']): SetActiveSpaceAction => ({
  type: SET_ACTIVE_SPACE,
  payload: space
});

export const updateConversations = (conversations: AppState['conversations']): UpdateConversationsAction => ({
  type: UPDATE_CONVERSATIONS,
  payload: conversations
});

export const updateMessages = (messages: AppState['messages']): UpdateMessagesAction => ({
  type: UPDATE_MESSAGES,
  payload: messages
});

export const setUser = (user: AppState['user']): SetUserAction => ({
  type: SET_USER,
  payload: user
});

export const setAccessToken = (token: AppState['accessToken']): SetAccessTokenAction => ({
  type: SET_ACCESS_TOKEN,
  payload: token
});

export const setRefreshToken = (token: AppState['refreshToken']): SetRefreshTokenAction => ({
  type: SET_REFRESH_TOKEN,
  payload: token
});
