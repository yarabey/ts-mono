import { create } from 'zustand';

interface UiState {
  name: string;
  locale: string;
  setName: (name: string) => void;
  setLocale: (locale: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  name: 'World',
  locale: 'en',
  setName: (name) => set({ name }),
  setLocale: (locale) => set({ locale }),
}));
