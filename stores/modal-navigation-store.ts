import { create } from 'zustand';

type ModalType = 'main' | 'spaces' | 'models' | 'conversations' | 'similarMessages' | 'spaceForm' | 'messagesSearch';

interface ModalNavigationState {
  // Track navigation history for modals
  navigationHistory: ModalType[];
  
  // Check if we're coming from the main modal (for back button logic)
  isNavigatedFromMain: boolean;
  
  // Reset the history when closing the modal
  resetHistory: () => void;
  
  // Add a modal to the navigation history
  addToHistory: (modal: ModalType) => void;
  
  // Remove the last item from history (back button was clicked)
  goBack: () => ModalType | null;
  
  // Record that a direct hotkey open happened (not from main)
  setDirectOpen: (modalType: ModalType) => void;
}

export const useModalNavigationStore = create<ModalNavigationState>((set, get) => ({
  navigationHistory: [],
  isNavigatedFromMain: false,
  
  resetHistory: () => {
    set({ navigationHistory: [], isNavigatedFromMain: false });
  },
  
  addToHistory: (modal) => {
    const { navigationHistory } = get();
    
    // Check if we're navigating from main to another modal
    const isFromMain = navigationHistory.length > 0 && 
                      navigationHistory[navigationHistory.length - 1] === 'main';
    
    set({ 
      navigationHistory: [...navigationHistory, modal],
      isNavigatedFromMain: isFromMain || get().isNavigatedFromMain
    });
  },
  
  goBack: () => {
    const { navigationHistory } = get();
    
    if (navigationHistory.length <= 1) {
      return null;
    }
    
    const newHistory = [...navigationHistory];
    newHistory.pop(); // Remove current modal
    const previousModal = newHistory[newHistory.length - 1];
    
    set({ navigationHistory: newHistory });
    
    return previousModal;
  },
  
  setDirectOpen: (modalType) => {
    set({ 
      navigationHistory: [modalType], 
      isNavigatedFromMain: false 
    });
  }
}));