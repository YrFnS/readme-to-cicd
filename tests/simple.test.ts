import { describe, it, expect } from 'vitest';

describe('Simple Test Suite', () => {
  it('should run a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle strings', () => {
    expect('hello').toBe('hello');
  });

  it('should handle objects', () => {
    expect({ a: 1 }).toEqual({ a: 1 });
  });
});
