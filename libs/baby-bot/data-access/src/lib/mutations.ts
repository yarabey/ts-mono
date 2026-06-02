import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreateEventPayload,
  EventSchema,
  UpdateEventPayload,
} from '@acme/baby-bot-domain';
import { api } from './api-client.js';

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
    mutationFn: (file: File) => api.import.upload(file),
    onSuccess: invalidate,
  });
}
