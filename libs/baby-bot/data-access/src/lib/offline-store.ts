import { create } from 'zustand';
import { api } from './api-client.js';

interface QueuedCreate {
  id: string;
  payload: Record<string, unknown>;
}

interface OfflineState {
  online: boolean;
  queue: QueuedCreate[];
  setOnline: (online: boolean) => void;
  enqueueCreate: (payload: Record<string, unknown>) => void;
  flush: () => Promise<void>;
}

/** Client-only offline queue for event creations. Holds *pending requests*,
 * not server data — server state lives in TanStack Query. */
export const useOfflineStore = create<OfflineState>((set, get) => ({
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  queue: [],
  setOnline: (online) => {
    set({ online });
    if (online) void get().flush();
  },
  enqueueCreate: (payload) =>
    set((s) => ({ queue: [...s.queue, { id: `${Date.now()}-${s.queue.length}`, payload }] })),
  flush: async () => {
    const { queue } = get();
    if (!queue.length) return;
    const remaining: QueuedCreate[] = [];
    for (const item of queue) {
      try {
        await api.events.create(item.payload);
      } catch {
        remaining.push(item);
      }
    }
    set({ queue: remaining });
  },
}));
