import { describe, it, expect } from 'vitest';

describe('Import Test', () => {
  it('should import PromptHandler', async () => {
    const { PromptHandler } = await import('../../../src/cli/prompts/prompt-handler');
    expect(PromptHandler).toBeDefined();
    
    const handler = new PromptHandler();
    expect(handler).toBeInstanceOf(PromptHandler);
  });
});