import { createStore, applyMiddleware } from 'redux';
import { forwardToMain } from 'electron-redux';
import { AppState } from '@/src/types';
import { AppActionTypes } from '@/src/store/actions';
import {
  SET_APP_STATE,
  UPDATE_SPACES,
  SET_ACTIVE_SPACE,
  UPDATE_CONVERSATIONS,
  UPDATE_MESSAGES,
  SET_USER,
  SET_ACCESS_TOKEN,
  SET_REFRESH_TOKEN
} from '@/src/store/actions';

// Initial state matches the main process
const initialState: AppState = {
  spaces: [],
  activeSpace: null,
  conversations: [],
  messages: [],
  initialDataLoaded: false,
  lastFetched: null,
  user: null,
  accessToken: null,
  refreshToken: null
};

// Reducer (same as main process)
const reducer = (state = initialState, action: AppActionTypes): AppState => {
  switch (action.type) {
    case SET_APP_STATE:
      return {
        ...state,
        ...action.payload,
        initialDataLoaded: true
      };
    case UPDATE_SPACES:
      return {
        ...state,
        spaces: action.payload
      };
    case SET_ACTIVE_SPACE:
      return {
        ...state,
        activeSpace: action.payload
      };
    case UPDATE_CONVERSATIONS:
      return {
        ...state,
        conversations: action.payload
      };
    case UPDATE_MESSAGES:
      return {
        ...state,
        messages: action.payload
      };
    case SET_USER:
      return {
        ...state,
        user: action.payload
      };
    case SET_ACCESS_TOKEN:
      return {
        ...state,
        accessToken: action.payload
      };
    case SET_REFRESH_TOKEN:
      return {
        ...state,
        refreshToken: action.payload
      };
    default:
      return state;
  }
};

// Create store with electron-redux enhancer
export const store = createStore(
  reducer,
  initialState,
  applyMiddleware(forwardToMain)
);

// Subscribe to store changes
store.subscribe(() => {
  console.log('Renderer store updated:', store.getState());
});
