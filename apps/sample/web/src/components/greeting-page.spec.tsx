import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { GreetingPage } from './greeting-page';

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

describe('GreetingPage', () => {
  it('renders the local greeting', () => {
    render(<GreetingPage />, { wrapper: createWrapper() });
    expect(screen.getByText(/Hello from browser/)).toBeInTheDocument();
  });

  it('renders the greeting from the mocked backend', async () => {
    render(<GreetingPage />, { wrapper: createWrapper() });
    expect(await screen.findByTestId('backend-greeting')).toHaveTextContent(
      'Hello, World!'
    );
  });

  it('shows an error state when the backend fails', async () => {
    server.use(
      http.get('/api/greeting', () => new HttpResponse(null, { status: 500 }))
    );

    render(<GreetingPage />, { wrapper: createWrapper() });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /something went wrong/i
    );
  });
});
