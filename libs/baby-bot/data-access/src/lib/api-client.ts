/** Fetch wrapper + JWT token management for the baby-bot mini-app.
 * Responses are returned untyped; callers (query hooks) validate them against
 * the shared Zod contracts at the fetch boundary. */

const TOKEN_KEY = 'baby-bot-token';
const ACCESS_CODE_KEY = 'baby-bot-access-code';

let onUnauthorized: (() => void) | null = null;

/** Register a handler invoked on any 401 (used by the app to re-auth/logout). */
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export function getStoredAccessCode(): string | null {
  return typeof window === 'undefined' ? null : localStorage.getItem(ACCESS_CODE_KEY);
}

export function setStoredAccessCode(code: string): void {
  localStorage.setItem(ACCESS_CODE_KEY, code);
}

async function request(path: string, options: RequestInit = {}): Promise<unknown> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });
  if (res.status === 204) return undefined;
  if (res.status === 401) {
    clearToken();
    onUnauthorized?.();
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: res.statusText }))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

function qs(params?: Record<string, string | number | undefined>): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  if (!entries.length) return '';
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
}

export const api = {
  auth: {
    verify: (initData: string) => request('/api/auth/verify', { method: 'POST', body: JSON.stringify({ initData }) }),
    code: (code: string) => request('/api/auth/code', { method: 'POST', body: JSON.stringify({ code }) }),
  },
  events: {
    list: (params?: Record<string, string | number | undefined>) => request(`/api/events${qs(params)}`),
    get: (id: number) => request(`/api/events/${id}`),
    create: (payload: unknown) => request('/api/events', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id: number, payload: unknown) => request(`/api/events/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    remove: (id: number) => request(`/api/events/${id}`, { method: 'DELETE' }),
    quickFeeding: (data: unknown) => request('/api/events/quick/feeding', { method: 'POST', body: JSON.stringify(data) }),
    quickDiaper: (data: unknown) => request('/api/events/quick/diaper', { method: 'POST', body: JSON.stringify(data) }),
    active: () => request('/api/events/active'),
    close: (id: number) => request(`/api/events/${id}/close`, { method: 'POST' }),
    clear: () => request('/api/events', { method: 'DELETE' }),
  },
  children: {
    list: () => request('/api/children'),
    update: (id: number, payload: unknown) =>
      request(`/api/children/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  },
  stats: {
    get: (period: string, childId = 1) => request(`/api/stats${qs({ period, child_id: childId })}`),
    pattern: (date: string | undefined, childId = 1) => request(`/api/stats/pattern${qs({ date, child_id: childId })}`),
    growthChart: (childId = 1) => request(`/api/stats/growth-chart${qs({ child_id: childId })}`),
  },
  photos: {
    upload: async (file: File): Promise<{ id: number; url: string }> => {
      const form = new FormData();
      form.append('file', file);
      const token = getToken();
      const res = await fetch('/api/photos/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({ error: res.statusText }))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      return res.json() as Promise<{ id: number; url: string }>;
    },
    link: (eventId: number, photoId: number) =>
      request(`/api/events/${eventId}/photo`, { method: 'POST', body: JSON.stringify({ photo_id: photoId }) }),
  },
  export: {
    csv: async (params?: Record<string, string | number | undefined>): Promise<Blob> => {
      const token = getToken();
      const res = await fetch(`/api/export/csv${qs(params)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.blob();
    },
  },
  timers: {
    start: (eventType: string, details?: Record<string, unknown>) =>
      request('/api/timers/start', { method: 'POST', body: JSON.stringify({ event_type: eventType, details }) }),
    stop: (timerId: string) => request(`/api/timers/${timerId}/stop`, { method: 'POST' }),
    active: () => request('/api/timers/active'),
  },
  rawEntries: {
    list: (params?: Record<string, string | number | undefined>) => request(`/api/raw-entries${qs(params)}`),
    retry: (id: number) => request(`/api/raw-entries/${id}/retry`, { method: 'POST' }),
  },
  settings: {
    get: (key: string) => request(`/api/settings/${key}`),
    update: (key: string, value: string) => request(`/api/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value }) }),
  },
  import: {
    upload: async (file: File, timeZone?: string): Promise<unknown> => {
      const form = new FormData();
      // Append the zone before the file so the backend (which streams the file
      // last) has the field parsed by the time it reads the upload.
      if (timeZone) form.append('timeZone', timeZone);
      form.append('file', file);
      const token = getToken();
      const res = await fetch('/api/import/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({ error: res.statusText }))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
  },
};
