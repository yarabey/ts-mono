import { z } from 'zod';

export const GreetingResponseSchema = z.object({
  message: z.string(),
});

export type GreetingResponse = z.infer<typeof GreetingResponseSchema>;

export const formatGreeting = (template: string, name: string): string =>
  template.replace('{name}', name);

export const validateName = (name: string): boolean => name.trim().length > 0;
