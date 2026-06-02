import { create } from 'zustand';

export type SheetId = 'quick-feeding' | 'quick-diaper' | null;

export interface Toast {
  id: number;
  message: string;
  kind: 'success' | 'error' | 'info';
}

interface UiState {
  activeSheet: SheetId;
  toasts: Toast[];
  expandedTimerId: string | null;
  openSheet: (sheet: Exclude<SheetId, null>) => void;
  closeSheet: () => void;
  addToast: (message: string, kind?: Toast['kind']) => void;
  removeToast: (id: number) => void;
  setExpandedTimer: (id: string | null) => void;
}

let toastSeq = 0;

/** Ephemeral client/UI state only — never mirrors server data. */
export const useUiStore = create<UiState>((set) => ({
  activeSheet: null,
  toasts: [],
  expandedTimerId: null,
  openSheet: (sheet) => set({ activeSheet: sheet }),
  closeSheet: () => set({ activeSheet: null }),
  addToast: (message, kind = 'info') =>
    set((s) => ({ toasts: [...s.toasts, { id: ++toastSeq, message, kind }] })),
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setExpandedTimer: (id) => set({ expandedTimerId: id }),
}));
