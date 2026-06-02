import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { createQueryClient } from './query-client.js';

/** Wraps the app in a single QueryClientProvider (AGENTS.md defaults).
 * Keeps the QueryClient instance/type internal to the data-access lib. */
export function BabyBotQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
