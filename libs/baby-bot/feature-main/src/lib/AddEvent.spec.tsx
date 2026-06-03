import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { AddEvent } from './AddEvent';

const ongoingSleep = {
  id: 1,
  child_id: 1,
  event_type: 'sleep',
  occurred_at: '2026-06-02T10:00:00.000Z',
  source: 'miniapp',
  author: null,
  note: null,
  raw_entry_id: null,
  raw_entry_emoji: null,
  // Wire shape: empty optional columns arrive as null.
  details: { sleep_type: null, started_at: '2026-06-02T10:00:00.000Z', ended_at: null, duration_min: null, quality: null },
  photo: null,
};

const server = setupServer(http.get('*/api/events/1', () => HttpResponse.json(ongoingSleep)));
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/event/1']}>
        <Routes>
          <Route path="/event/:id" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('AddEvent editing an ongoing event', () => {
  it('marks "Продолжается" as selected and hides the Конец field', async () => {
    render(<AddEvent />, { wrapper });
    // The "Создано:" stamp only renders once the event has loaded.
    await waitFor(() => expect(screen.getByText(/Создано:/)).toBeTruthy());

    const toggle = screen.getByText(/Продолжается/).closest('button');
    expect(toggle?.textContent).toContain('✓');
    // While ongoing, there is no end time to edit.
    expect(screen.queryByText('Конец')).toBeNull();
  });
});
