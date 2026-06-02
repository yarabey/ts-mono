import { useQuery } from '@tanstack/react-query';
import { GreetingResponseSchema } from '@acme/sample-domain';

export const useGreeting = (name: string, locale = 'en') =>
  useQuery({
    queryKey: ['greeting', name, locale],
    queryFn: async () => {
      const response = await fetch(
        `/api/greeting?name=${encodeURIComponent(name)}&locale=${encodeURIComponent(locale)}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return GreetingResponseSchema.parse(data);
    },
    enabled: name.trim().length > 0,
  });
