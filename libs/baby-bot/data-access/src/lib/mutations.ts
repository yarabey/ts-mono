import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChildSchema,
  CreateEventPayload,
  EventSchema,
  type QuickButtonsConfig,
  UpdateChildPayload,
  UpdateEventPayload,
} from '@acme/baby-bot-domain';
import { api } from './api-client.js';
import { QUICK_BUTTONS_SETTING_KEY } from './query-keys.js';

/** Invalidate everything affected by an event mutation. */
function useInvalidateEvents() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['events'] });
    void qc.invalidateQueries({ queryKey: ['event'] });
    void qc.invalidateQueries({ queryKey: ['stats'] });
    void qc.invalidateQueries({ queryKey: ['pattern'] });
    void qc.invalidateQueries({ queryKey: ['growth-chart'] });
    void qc.invalidateQueries({ queryKey: ['timers'] });
  };
}

export function useCreateEvent() {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: async (payload: CreateEventPayload) => EventSchema.parse(await api.events.create(payload)),
    onSuccess: invalidate,
  });
}

export function useUpdateEvent() {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: async (vars: { id: number; payload: UpdateEventPayload }) =>
      EventSchema.parse(await api.events.update(vars.id, vars.payload)),
    onSuccess: invalidate,
  });
}

export function useDeleteEvent() {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: (id: number) => api.events.remove(id),
    onSuccess: invalidate,
  });
}

export function useCloseEvent() {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: async (id: number) => EventSchema.parse(await api.events.close(id)),
    onSuccess: invalidate,
  });
}

export function useClearAllEvents() {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: () => api.events.clear(),
    onSuccess: invalidate,
  });
}

export function useQuickFeeding() {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => EventSchema.parse(await api.events.quickFeeding(data)),
    onSuccess: invalidate,
  });
}

export function useQuickDiaper() {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => EventSchema.parse(await api.events.quickDiaper(data)),
    onSuccess: invalidate,
  });
}

export function useStartTimer() {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: (vars: { eventType: string; details?: Record<string, unknown> }) =>
      api.timers.start(vars.eventType, vars.details),
    onSuccess: invalidate,
  });
}

export function useStopTimer() {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: (timerId: string) => api.timers.stop(timerId),
    onSuccess: invalidate,
  });
}

export function useRetryRawEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.rawEntries.retry(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['raw-entries'] }),
  });
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { key: string; value: string }) => api.settings.update(vars.key, vars.value),
    onSuccess: (_data, vars) => void qc.invalidateQueries({ queryKey: ['setting', vars.key] }),
  });
}

export function useImportUpload() {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: (vars: { file: File; timeZone?: string }) => api.import.upload(vars.file, vars.timeZone),
    onSuccess: invalidate,
  });
}

export function useUpdateChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: number; payload: UpdateChildPayload }) =>
      ChildSchema.parse(await api.children.update(vars.id, vars.payload)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['children'] });
      void qc.invalidateQueries({ queryKey: ['growth-chart'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

/** Upload a photo (multipart); returns its `{ id, url }` for attaching. */
export function usePhotoUpload() {
  return useMutation({
    mutationFn: (file: File) => api.photos.upload(file),
  });
}

/** Attach an already-uploaded photo to an existing event. */
export function useLinkPhoto() {
  const invalidate = useInvalidateEvents();
  return useMutation({
    mutationFn: (vars: { eventId: number; photoId: number }) =>
      api.photos.link(vars.eventId, vars.photoId),
    onSuccess: invalidate,
  });
}

export function useUpdateQuickButtons() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (config: QuickButtonsConfig) =>
      api.settings.update(QUICK_BUTTONS_SETTING_KEY, JSON.stringify(config)),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ['setting', QUICK_BUTTONS_SETTING_KEY] }),
  });
}

/**
 * Trigger a browser download of the CSV export. Returns the blob too, so
 * callers can also inspect/size it. Safe to call from a click handler.
 */
export async function downloadCsvExport(
  params?: Record<string, string | number | undefined>,
  filename = 'baby-bot-export.csv',
): Promise<Blob> {
  const blob = await api.export.csv(params);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return blob;
}
