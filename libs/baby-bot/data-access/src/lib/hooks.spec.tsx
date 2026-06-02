import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { useStats } from './hooks';

const validStats = {
  period: { from: '2026-06-02', to: '2026-06-02' },
  feedings: { total: 3, by_type: { breast: 3 }, avg_interval_min: 120, total_duration_min: 36, total_ml: 0, ml_by_type: {}, last_feeding_at: null },
  sleep: { total_count: 2, total_duration_min: 180, night_min: 120, nap_min: 60, avg_duration_min: 90 },
  diapers: { total: 5, by_type: { wet: 5 }, last_diaper_at: null },
  last_growth: { weight_kg: null, height_cm: null, head_circumference_cm: null, measured_at: null },
  pumping: { total: 0, total_amount_ml: 0, by_side: {}, avg_amount_ml: null },
  walks: { total: 0, total_duration_min: 0, avg_duration_min: null },
  milk_balance: { pumped_ml: 0, fed_ml: 0, remaining_ml: 0 },
  wake_window: { current_min: null, sleeping_min: null, sleeping_started_at: null, avg_min: null, max_min: null, recommended_max: 180, last_sleep_ended_at: null },
};

const server = setupServer(
  http.get('*/api/stats', () => HttpResponse.json(validStats)),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useStats', () => {
  it('fetches and Zod-validates the stats response', async () => {
    const { result } = renderHook(() => useStats('today'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.feedings.total).toBe(3);
    expect(result.current.data?.sleep.total_duration_min).toBe(180);
  });

  it('surfaces an error when the response violates the contract', async () => {
    server.use(http.get('*/api/stats', () => HttpResponse.json({ bogus: true })));
    const { result } = renderHook(() => useStats('week'), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
