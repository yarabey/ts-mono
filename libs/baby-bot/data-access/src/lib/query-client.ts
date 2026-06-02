import { QueryClient } from '@tanstack/react-query';

/** One QueryClient per app with the AGENTS.md defaults (staleTime 30s,
 * gcTime 5min). The QueryClientProvider is mounted in the app shell. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, gcTime: 5 * 60_000, retry: 1 },
    },
  });
}
