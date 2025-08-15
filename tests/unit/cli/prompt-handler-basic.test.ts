import { describe, it, expect, beforeEach } from 'vitest';
import { PromptHandler } from '../../../src/cli/prompts/prompt-handler';

describe('PromptHandler Basic', () => {
  let promptHandler: PromptHandler;

  beforeEach(() => {
    promptHandler = new PromptHandler();
  });

  it('should create PromptHandler instance', () => {
    expect(promptHandler).toBeInstanceOf(PromptHandler);
  });

  it('should have confirmFrameworks method', () => {
    expect(typeof promptHandler.confirmFrameworks).toBe('function');
  });

  it('should have selectWorkflowTypes method', () => {
    expect(typeof promptHandler.selectWorkflowTypes).toBe('function');
  });

  it('should have configureDeployment method', () => {
    expect(typeof promptHandler.configureDeployment).toBe('function');
  });
});