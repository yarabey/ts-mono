import { describe, it, expect } from 'vitest';
import {
  formatGreeting,
  validateName,
  GreetingResponseSchema,
} from './index';

describe('formatGreeting', () => {
  it('replaces {name} placeholder with the given name', () => {
    expect(formatGreeting('Hello, {name}!', 'World')).toBe('Hello, World!');
  });

  it('handles missing placeholder gracefully', () => {
    expect(formatGreeting('Hello!', 'World')).toBe('Hello!');
  });

  it('handles empty name', () => {
    expect(formatGreeting('Hello, {name}!', '')).toBe('Hello, !');
  });

  it('replaces only the first occurrence of {name}', () => {
    expect(formatGreeting('{name} says hi to {name}', 'Alice')).toBe(
      'Alice says hi to {name}'
    );
  });
});

describe('validateName', () => {
  it('returns true for a non-empty name', () => {
    expect(validateName('Alice')).toBe(true);
  });

  it('returns false for an empty string', () => {
    expect(validateName('')).toBe(false);
  });

  it('returns false for whitespace-only string', () => {
    expect(validateName('   ')).toBe(false);
  });

  it('returns true for a name with surrounding whitespace', () => {
    expect(validateName('  Bob  ')).toBe(true);
  });
});

describe('GreetingResponseSchema', () => {
  it('parses a valid response', () => {
    const result = GreetingResponseSchema.parse({ message: 'Hello!' });
    expect(result).toEqual({ message: 'Hello!' });
  });

  it('rejects a response without message', () => {
    expect(() => GreetingResponseSchema.parse({})).toThrow();
  });

  it('rejects a response with wrong type', () => {
    expect(() => GreetingResponseSchema.parse({ message: 123 })).toThrow();
  });
});
