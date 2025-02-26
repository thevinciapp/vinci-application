import { create } from 'zustand';

interface QuickActionsCommandState {
  commandSearchValue: string;
  setCommandSearchValue: (value: string) => void;
}

export const useQuickActionsCommandStore = create<QuickActionsCommandState>((set) => ({
  commandSearchValue: '',
  setCommandSearchValue: (value: string) => set({ commandSearchValue: value }),
}));
