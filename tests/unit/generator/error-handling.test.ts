/**
 * Comprehensive tests for error handling and recovery mechanisms
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  GenerationError,
  TemplateLoadError,
  TemplateCompilationError,
  FrameworkDataError,
  StepGenerationError,
  OptimizationError,
  RenderingError,
  WorkflowValidationError,
  OutputError,
  PartialGenerationError,
  AggregateGenerationError
} from '../../../src/generator/errors/generation-errors';
import {
  GenerationErrorRecovery,
  GenerationResult,
  DEFAULT_GENERATION_RETRY_CONFIG,
  DEFAULT_FALLBACK_CONFIG
} from '../../../src/generator/errors/error-recovery';

describe('GenerationError Classes', () => {
  describe('GenerationError Base Class', () => {
    it('should create error with all properties', () => {
      const error = new TemplateLoadError('test-template', '/path/to/template');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(GenerationError);
      expect(error.name).toBe('TemplateLoadError');
      expect(error.code).toBe('TEMPLATE_LOAD_ERROR');
      expect(error.component).toBe('template-manager');
      expect(error.stage).toBe('template-loading');
      expect(error.recoverable).toBe(true);
      expect(error.context.templateName).toBe('test-template');
      expect(error.context.templatePath).toBe('/path/to/template');
    });

    it('should convert to structured log format', () => {
      const error = new TemplateLoadError('test-template', '/path/to/template');
      const logFormat = error.toLogFormat();
      
      expect(logFormat).toHaveProperty('error', 'TemplateLoadError');
      expect(logFormat).toHaveProperty('message');
      expect(logFormat).toHaveProperty('code', 'TEMPLATE_LOAD_ERROR');
      expect(logFormat).toHaveProperty('component', 'template-manager');
      expect(logFormat).toHaveProperty('stage', 'template-loading');
      expect(logFormat).toHaveProperty('recoverable', true);
      expect(logFormat).toHaveProperty('context');
      expect(logFormat).toHaveProperty('timestamp');
    });

    it('should provide user-friendly messages', () => {
      const error = new TemplateLoadError('test-template', '/path/to/template');
      const userMessage = error.getUserMessage();
      
      expect(userMessage).toContain('test-template');
      expect(userMessage).toContain('could not be loaded');
    });

    it('should provide recovery actions', () => {
      const error = new TemplateLoadError('test-template', '/path/to/template');
      const recoveryActions = error.getRecoveryActions();
      
      expect(recoveryActions).toBeInstanceOf(Array);
      expect(recoveryActions.length).toBeGreaterThan(0);
      expect(recoveryActions[0]).toContain('template file exists');
    });
  });

  describe('TemplateLoadError', () => {
    it('should create error with template details', () => {
      const cause = new Error('File not found');
      const error = new TemplateLoadError('nodejs-template', '/templates/nodejs.yaml', cause);
      
      expect(error.message).toContain('nodejs-template');
      expect(error.message).toContain('/templates/nodejs.yaml');
      expect(error.message).toContain('File not found');
      expect(error.context.cause).toBe('File not found');
    });

    it('should provide specific recovery actions', () => {
      const error = new TemplateLoadError('missing-template', '/path/to/missing');
      const actions = error.getRecoveryActions();
      
      expect(actions).toContain('Check if the template file exists at the specified path');
      expect(actions).toContain('Use a fallback template if available');
    });
  });

  describe('TemplateCompilationError', () => {
    it('should create error with compilation details', () => {
      const error = new TemplateCompilationError('invalid-template', 'Syntax error at line 5');
      
      expect(error.message).toContain('invalid-template');
      expect(error.message).toContain('Syntax error at line 5');
      expect(error.context.compilationError).toBe('Syntax error at line 5');
    });
  });

  describe('FrameworkDataError', () => {
    it('should create error with validation details', () => {
      const validationErrors = ['Missing name field', 'Invalid version format'];
      const error = new FrameworkDataError(
        'Invalid framework data',
        'nodejs',
        validationErrors
      );
      
      expect(error.context.frameworkName).toBe('nodejs');
      expect(error.context.validationErrors).toEqual(validationErrors);
    });
  });

  describe('AggregateGenerationError', () => {
    it('should aggregate multiple errors', () => {
      const errors = [
        new TemplateLoadError('template1', '/path1'),
        new StepGenerationError('build', 'nodejs'),
        new OptimizationError('caching', 'Missing cache key')
      ];
      
      const aggregateError = new AggregateGenerationError(errors);
      
      expect(aggregateError.errors).toHaveLength(3);
      expect(aggregateError.message).toContain('Multiple generation errors');
      expect(aggregateError.context.errorCount).toBe(3);
    });

    it('should categorize errors by stage', () => {
      const errors = [
        new TemplateLoadError('template1', '/path1'),
        new TemplateLoadError('template2', '/path2'),
        new StepGenerationError('build', 'nodejs')
      ];
      
      const aggregateError = new AggregateGenerationError(errors);
      const errorsByStage = aggregateError.getErrorsByStage();
      
      expect(errorsByStage['template-loading']).toHaveLength(2);
      expect(errorsByStage['step-generation']).toHaveLength(1);
    });

    it('should separate recoverable and critical errors', () => {
      const errors = [
        new TemplateLoadError('template1', '/path1'), // recoverable
        new RenderingError('yaml-output'), // not recoverable
        new OptimizationError('caching', 'Missing key') // recoverable
      ];
      
      const aggregateError = new AggregateGenerationError(errors);
      
      expect(aggregateError.getRecoverableErrors()).toHaveLength(2);
      expect(aggregateError.getCriticalErrors()).toHaveLength(1);
    });
  });
});

describe('GenerationErrorRecovery', () => {
  let errorRecovery: GenerationErrorRecovery;

  beforeEach(() => {
    errorRecovery = new GenerationErrorRecovery();
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await errorRecovery.withRetry(operation, 'template-loading');
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on recoverable error', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new TemplateLoadError('template', '/path'))
        .mockResolvedValue('success');
      
      const result = await errorRecovery.withRetry(operation, 'template-loading');
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.warnings).toContain('Operation succeeded after 2 attempts');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-recoverable error', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new RenderingError('yaml-output'));
      
      const result = await errorRecovery.withRetry(operation, 'rendering');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(RenderingError);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should not retry error from non-retryable stage', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new TemplateLoadError('template', '/path'));
      
      const result = await errorRecovery.withRetry(operation, 'output');
      
      expect(result.success).toBe(false);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should respect maximum retry attempts', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new TemplateLoadError('template', '/path'));
      
      const result = await errorRecovery.withRetry(operation, 'template-loading');
      
      expect(result.success).toBe(false);
      expect(operation).toHaveBeenCalledTimes(DEFAULT_GENERATION_RETRY_CONFIG.maxAttempts);
    });

    it('should apply exponential backoff', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new TemplateLoadError('template', '/path'));
      
      const startTime = Date.now();
      await errorRecovery.withRetry(operation, 'template-loading');
      const endTime = Date.now();
      
      // Should have taken at least the base delay time
      expect(endTime - startTime).toBeGreaterThan(DEFAULT_GENERATION_RETRY_CONFIG.baseDelay);
    });
  });

  describe('withTemplateFallback', () => {
    it('should succeed with primary template', async () => {
      const operation = vi.fn().mockResolvedValue('primary-result');
      const hierarchy = ['primary', 'fallback1', 'fallback2'];
      
      const result = await errorRecovery.withTemplateFallback(
        operation,
        hierarchy,
        'template-loading'
      );
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('primary-result');
      expect(operation).toHaveBeenCalledWith('primary');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should fallback to secondary template', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new TemplateLoadError('primary', '/path'))
        .mockResolvedValue('fallback-result');
      const hierarchy = ['primary', 'fallback1', 'fallback2'];
      
      const result = await errorRecovery.withTemplateFallback(
        operation,
        hierarchy,
        'template-loading'
      );
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('fallback-result');
      expect(result.warnings).toContain("Used fallback template 'fallback1' instead of 'primary'");
      expect(operation).toHaveBeenCalledWith('primary');
      expect(operation).toHaveBeenCalledWith('fallback1');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should fail when all templates fail', async () => {
      const operation = vi.fn()
        .mockRejectedValue(new TemplateLoadError('template', '/path'));
      const hierarchy = ['primary', 'fallback1', 'fallback2'];
      
      const result = await errorRecovery.withTemplateFallback(
        operation,
        hierarchy,
        'template-loading'
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(GenerationError);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should be disabled when fallback is disabled', async () => {
      const disabledRecovery = new GenerationErrorRecovery(
        {},
        { enableTemplateFallback: false }
      );
      
      const operation = vi.fn()
        .mockRejectedValue(new TemplateLoadError('template', '/path'));
      const hierarchy = ['primary', 'fallback1'];
      
      const result = await disabledRecovery.withTemplateFallback(
        operation,
        hierarchy,
        'template-loading'
      );
      
      expect(result.success).toBe(false);
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('withGracefulDegradation', () => {
    it('should succeed with primary operation', async () => {
      const primaryOp = vi.fn().mockResolvedValue('primary-result');
      const fallbackOp = vi.fn().mockResolvedValue('fallback-result');
      
      const result = await errorRecovery.withGracefulDegradation(
        primaryOp,
        fallbackOp,
        'step-generation'
      );
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('primary-result');
      expect(primaryOp).toHaveBeenCalledTimes(1);
      expect(fallbackOp).not.toHaveBeenCalled();
    });

    it('should use fallback when primary fails', async () => {
      const primaryOp = vi.fn()
        .mockRejectedValue(new StepGenerationError('build', 'nodejs'));
      const fallbackOp = vi.fn().mockResolvedValue('fallback-result');
      
      const result = await errorRecovery.withGracefulDegradation(
        primaryOp,
        fallbackOp,
        'step-generation'
      );
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('fallback-result');
      expect(result.warnings?.[0]).toContain('Used fallback operation due to');
      expect(primaryOp).toHaveBeenCalledTimes(1);
      expect(fallbackOp).toHaveBeenCalledTimes(1);
    });

    it('should respect fallback condition', async () => {
      const primaryOp = vi.fn()
        .mockRejectedValue(new StepGenerationError('build', 'nodejs'));
      const fallbackOp = vi.fn().mockResolvedValue('fallback-result');
      const condition = vi.fn().mockReturnValue(false);
      
      const result = await errorRecovery.withGracefulDegradation(
        primaryOp,
        fallbackOp,
        'step-generation',
        condition
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(StepGenerationError);
      expect(fallbackOp).not.toHaveBeenCalled();
      expect(condition).toHaveBeenCalledWith(expect.any(StepGenerationError));
    });
  });

  describe('attemptPartialGeneration', () => {
    it('should complete all stages successfully', async () => {
      const stages = [
        { name: 'initialization' as const, operation: vi.fn().mockResolvedValue('init'), required: true },
        { name: 'template-loading' as const, operation: vi.fn().mockResolvedValue('template'), required: true },
        { name: 'step-generation' as const, operation: vi.fn().mockResolvedValue('steps'), required: false }
      ];
      
      const result = await errorRecovery.attemptPartialGeneration(stages);
      
      expect(result.success).toBe(true);
      expect(result.data?.completedStages).toHaveLength(3);
      expect(result.data?.errors).toHaveLength(0);
      expect(result.data?.isUsable).toBe(true);
    });

    it('should continue after optional stage failure', async () => {
      const stages = [
        { name: 'initialization' as const, operation: vi.fn().mockResolvedValue('init'), required: true },
        { name: 'optimization' as const, operation: vi.fn().mockRejectedValue(new OptimizationError('cache', 'failed')), required: false },
        { name: 'rendering' as const, operation: vi.fn().mockResolvedValue('yaml'), required: true }
      ];
      
      const result = await errorRecovery.attemptPartialGeneration(stages);
      
      expect(result.success).toBe(true);
      expect(result.data?.completedStages).toEqual(['initialization', 'rendering']);
      expect(result.data?.errors).toHaveLength(1);
      expect(result.data?.warnings.some(w => w.includes("Optional stage 'optimization' failed"))).toBe(true);
    });

    it('should stop at required stage failure', async () => {
      const stages = [
        { name: 'initialization' as const, operation: vi.fn().mockResolvedValue('init'), required: true },
        { name: 'template-loading' as const, operation: vi.fn().mockRejectedValue(new TemplateLoadError('template', '/path')), required: true },
        { name: 'step-generation' as const, operation: vi.fn().mockResolvedValue('steps'), required: false }
      ];
      
      const result = await errorRecovery.attemptPartialGeneration(stages);
      
      expect(result.success).toBe(false);
      expect(result.partialData?.completedStages).toEqual(['initialization']);
      expect(result.partialData?.failedStage).toBe('template-loading');
      expect(result.partialData?.warnings.some(w => w.includes("Required stage 'template-loading' failed"))).toBe(true);
    });

    it('should be disabled when partial generation is disabled', async () => {
      const disabledRecovery = new GenerationErrorRecovery(
        {},
        { enablePartialGeneration: false }
      );
      
      const stages = [
        { name: 'initialization' as const, operation: vi.fn().mockResolvedValue('init'), required: true }
      ];
      
      const result = await disabledRecovery.attemptPartialGeneration(stages);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(AggregateGenerationError);
    });
  });

  describe('safely', () => {
    it('should return operation result on success', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const defaultValue = 'default';
      
      const result = await errorRecovery.safely(operation, defaultValue, 'template-loading');
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should return default value on error', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('failed'));
      const defaultValue = 'default';
      
      const result = await errorRecovery.safely(operation, defaultValue, 'template-loading');
      
      expect(result).toBe('default');
    });

    it('should call error handler on error', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('failed'));
      const defaultValue = 'default';
      const errorHandler = vi.fn();
      
      await errorRecovery.safely(operation, defaultValue, 'template-loading', errorHandler);
      
      expect(errorHandler).toHaveBeenCalledWith(expect.any(GenerationError));
    });
  });

  describe('validateInput', () => {
    it('should return success for valid input', () => {
      const validator = (value: string) => value.length > 0;
      
      const result = errorRecovery.validateInput('valid', validator, 'Input is empty', 'validation');
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('valid');
    });

    it('should return error for invalid input', () => {
      const validator = (value: string) => value.length > 0;
      
      const result = errorRecovery.validateInput('', validator, 'Input is empty', 'validation');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(GenerationError);
      expect(result.error?.message).toBe('Input is empty');
    });
  });

  describe('Configuration Management', () => {
    it('should update retry configuration', () => {
      const newConfig = { maxAttempts: 5, baseDelay: 500 };
      
      errorRecovery.updateRetryConfig(newConfig);
      const config = errorRecovery.getConfiguration();
      
      expect(config.retry.maxAttempts).toBe(5);
      expect(config.retry.baseDelay).toBe(500);
      expect(config.retry.backoffMultiplier).toBe(DEFAULT_GENERATION_RETRY_CONFIG.backoffMultiplier);
    });

    it('should update fallback configuration', () => {
      const newConfig = { enableTemplateFallback: false, enablePartialGeneration: false };
      
      errorRecovery.updateFallbackConfig(newConfig);
      const config = errorRecovery.getConfiguration();
      
      expect(config.fallback.enableTemplateFallback).toBe(false);
      expect(config.fallback.enablePartialGeneration).toBe(false);
      expect(config.fallback.enableGenericTemplates).toBe(DEFAULT_FALLBACK_CONFIG.enableGenericTemplates);
    });
  });
});

describe('Error Recovery Integration', () => {
  it('should handle complex error scenarios with multiple recovery strategies', async () => {
    const errorRecovery = new GenerationErrorRecovery();
    
    // Simulate a complex operation that uses multiple recovery strategies
    const complexOperation = async () => {
      // First try template fallback
      const templateResult = await errorRecovery.withTemplateFallback(
        async (templateName: string) => {
          if (templateName === 'primary') {
            throw new TemplateLoadError('primary', '/path');
          }
          return `template-${templateName}`;
        },
        ['primary', 'fallback', 'generic'],
        'template-loading'
      );
      
      if (!templateResult.success) {
        throw templateResult.error;
      }
      
      // Then try with retry
      const retryResult = await errorRecovery.withRetry(
        async () => {
          // Simulate intermittent failure
          if (Math.random() > 0.7) {
            throw new StepGenerationError('build', 'nodejs');
          }
          return 'steps-generated';
        },
        'step-generation'
      );
      
      return {
        template: templateResult.data,
        steps: retryResult.success ? retryResult.data : 'default-steps'
      };
    };
    
    const result = await complexOperation();
    
    expect(result.template).toBe('template-fallback');
    expect(result.steps).toMatch(/steps-generated|default-steps/);
  });
});