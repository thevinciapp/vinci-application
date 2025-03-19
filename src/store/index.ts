/**
 * Root store index file that provides exports for both main and renderer stores
 * 
 * Main Process Store: Used in the Electron main process, holds the source of truth
 * Renderer Store: Used in the React UI, syncs with the main process store
 */

// For backward compatibility, re-export the main store as useStore
import { 
  useMainStore, 
  getMainStoreState, 
  subscribeToMainStore, 
  MainProcessState 
} from './main';

export { 
  useRendererStore, 
  getRendererStoreState
} from './renderer';
export type { RendererProcessState } from './renderer';

// Re-export main store with legacy names for backward compatibility
export const useStore = useMainStore;
export const getStoreState = getMainStoreState;
export const subscribeToStore = subscribeToMainStore;
export type { MainProcessState as AppState };
