import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { Stats } from './Stats';

const stats = {
  period: { from: '2026-05-26', to: '2026-06-02' },
  feedings: { total: 21, by_type: {}, avg_interval_min: 120, total_duration_min: 0, total_ml: 480, ml_by_type: {}, last_feeding_at: null },
  sleep: { total_count: 14, total_duration_min: 1200, night_min: 800, nap_min: 400, avg_duration_min: 85 },
  diapers: { total: 30, by_type: {}, last_diaper_at: null },
  last_growth: { weight_kg: null, height_cm: null, head_circumference_cm: null, measured_at: null },
  pumping: { total: 0, total_amount_ml: 0, by_side: {}, avg_amount_ml: null },
  walks: { total: 0, total_duration_min: 0, avg_duration_min: null },
  milk_balance: { pumped_ml: 0, fed_ml: 0, remaining_ml: 0 },
  wake_window: { current_min: null, sleeping_min: null, sleeping_started_at: null, avg_min: 90, max_min: 120, recommended_max: 180, last_sleep_ended_at: null },
};

const server = setupServer(http.get('*/api/stats', () => HttpResponse.json(stats)));
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('Stats screen', () => {
  it('renders aggregated stats from the API', async () => {
    render(<Stats />, { wrapper });
    expect(screen.getByText('Статистика')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('21')).toBeTruthy());
    expect(screen.getByText('Кормление')).toBeTruthy();
  });
});
