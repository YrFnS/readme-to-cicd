import { describe, it, expect } from 'vitest';

describe('Types Test', () => {
  it('should import types', async () => {
    const types = await import('../../../src/cli/lib/types');
    expect(types).toBeDefined();
  });
});