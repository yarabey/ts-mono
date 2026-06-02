import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useGreeting } from './use-greeting';

const server = setupServer(
  http.get('/api/greeting', ({ request }) => {
    const url = new URL(request.url);
    const name = url.searchParams.get('name');
    return HttpResponse.json({ message: `Hello, ${name}!` });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useGreeting', () => {
  it('fetches and returns a greeting', async () => {
    const { result } = renderHook(() => useGreeting('World'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ message: 'Hello, World!' });
  });

  it('returns an error when the backend fails', async () => {
    server.use(
      http.get('/api/greeting', () =>
        new HttpResponse(null, { status: 500 })
      )
    );

    const { result } = renderHook(() => useGreeting('World'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });

  it('is disabled when name is empty', () => {
    const { result } = renderHook(() => useGreeting(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});
