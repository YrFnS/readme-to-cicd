/**
 * Tests for Shared Mock Utilities
 * 
 * Comprehensive test suite for the shared mock utilities that provide
 * common behaviors across different mock factories and test scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MockIdGenerator,
  MockDurationSimulator,
  MockSuccessFailureLogic,
  MockTimestampManager,
  MockErrorCodeGenerator,
  MockMessageGenerator,
  MockConfigurationManager,
  MockStateManager,
  BaseOperationMockFactory,
  MockUtilities,
  BaseMockConfig,
  BaseOperationMetadata,
  BaseOperationResult,
  BaseOperationError
} from './shared-mock-utilities';
import { Result, success, failure } from '../../src/shared/types/result';

describe('MockIdGenerator', () => {
  let idGenerator: MockIdGenerator;

  beforeEach(() => {
    idGenerator = new MockIdGenerator('test');
  });

  it('should generate unique IDs with correct prefix', () => {
    const id1 = idGenerator.generateId();
    const id2 = idGenerator.generateId();

    expect(id1).toMatch(/^test_[a-z0-9]+_[a-z0-9]+$/);
    expect(id2).toMatch(/^test_[a-z0-9]+_[a-z0-9]+$/);
    expect(id1).not.toBe(id2);
  });

  it('should generate multiple unique IDs', () => {
    const ids = idGenerator.generateIds(5);

    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5); // All unique
    ids.forEach(id => {
      expect(id).toMatch(/^test_[a-z0-9]+_[a-z0-9]+$/);
    });
  });

  it('should increment counter correctly', () => {
    expect(idGenerator.getCounter()).toBe(0);
    
    idGenerator.generateId();
    expect(idGenerator.getCounter()).toBe(1);
    
    idGenerator.generateId();
    expect(idGenerator.getCounter()).toBe(2);
  });

  it('should reset counter', () => {
    idGenerator.generateId();
    idGenerator.generateId();
    expect(idGenerator.getCounter()).toBe(2);
    
    idGenerator.reset();
    expect(idGenerator.getCounter()).toBe(0);
  });

  it('should allow custom prefix', () => {
    idGenerator.setPrefix('custom');
    const id = idGenerator.generateId();
    
    expect(id).toMatch(/^custom_[a-z0-9]+_[a-z0-9]+$/);
  });
});

describe('MockDurationSimulator', () => {
  let durationSimulator: MockDurationSimulator;

  beforeEach(() => {
    durationSimulator = new MockDurationSimulator({ min: 100, max: 200 });
  });

  it('should generate durations within range', () => {
    for (let i = 0; i < 100; i++) {
      const duration = durationSimulator.generateDuration();
      expect(duration).toBeGreaterThanOrEqual(100);
      expect(duration).toBeLessThanOrEqual(200);
    }
  });

  it('should generate multiple durations', () => {
    const durations = durationSimulator.generateDurations(5);
    
    expect(durations).toHaveLength(5);
    durations.forEach(duration => {
      expect(duration).toBeGreaterThanOrEqual(100);
      expect(duration).toBeLessThanOrEqual(200);
    });
  });

  it('should generate durations based on complexity', () => {
    const simpleDuration = durationSimulator.generateDurationByComplexity('simple');
    const moderateDuration = durationSimulator.generateDurationByComplexity('moderate');
    const complexDuration = durationSimulator.generateDurationByComplexity('complex');

    // Simple should be roughly half of moderate
    expect(simpleDuration).toBeLessThan(moderateDuration * 0.8);
    // Complex should be roughly double of moderate
    expect(complexDuration).toBeGreaterThan(moderateDuration * 1.5);
  });

  it('should update range', () => {
    durationSimulator.updateRange({ min: 500, max: 600 });
    
    const duration = durationSimulator.generateDuration();
    expect(duration).toBeGreaterThanOrEqual(500);
    expect(duration).toBeLessThanOrEqual(600);
  });

  it('should return current range', () => {
    const range = durationSimulator.getRange();
    expect(range).toEqual({ min: 100, max: 200 });
  });
});

describe('MockSuccessFailureLogic', () => {
  let successFailureLogic: MockSuccessFailureLogic;

  beforeEach(() => {
    successFailureLogic = new MockSuccessFailureLogic(0.8);
  });

  it('should respect force success option', () => {
    const result = successFailureLogic.shouldSucceed({ forceSuccess: true });
    expect(result).toBe(true);
  });

  it('should respect force failure option', () => {
    const result = successFailureLogic.shouldSucceed({ forceFailure: true });
    expect(result).toBe(false);
  });

  it('should use custom success rate', () => {
    // Test with 100% success rate
    const results = [];
    for (let i = 0; i < 100; i++) {
      results.push(successFailureLogic.shouldSucceed({ customSuccessRate: 1.0 }));
    }
    expect(results.every(r => r)).toBe(true);

    // Test with 0% success rate
    const failResults = [];
    for (let i = 0; i < 100; i++) {
      failResults.push(successFailureLogic.shouldSucceed({ customSuccessRate: 0.0 }));
    }
    expect(failResults.every(r => !r)).toBe(true);
  });

  it('should generate multiple results', () => {
    const results = successFailureLogic.generateResults(100, { customSuccessRate: 0.7 });
    
    expect(results).toHaveLength(100);
    const successRate = successFailureLogic.calculateSuccessRate(results);
    expect(successRate).toBeGreaterThan(0.6);
    expect(successRate).toBeLessThan(0.8);
  });

  it('should calculate success rate correctly', () => {
    const results = [true, true, false, true, false]; // 3/5 = 0.6
    const rate = successFailureLogic.calculateSuccessRate(results);
    expect(rate).toBe(0.6);
  });

  it('should update success rate', () => {
    successFailureLogic.updateSuccessRate(0.5);
    expect(successFailureLogic.getSuccessRate()).toBe(0.5);
  });

  it('should clamp success rate to valid range', () => {
    successFailureLogic.updateSuccessRate(-0.1);
    expect(successFailureLogic.getSuccessRate()).toBe(0);

    successFailureLogic.updateSuccessRate(1.1);
    expect(successFailureLogic.getSuccessRate()).toBe(1);
  });
});describe
('MockTimestampManager', () => {
  let timestampManager: MockTimestampManager;

  beforeEach(() => {
    timestampManager = new MockTimestampManager();
  });

  it('should generate timestamps with correct duration', () => {
    const duration = 1000;
    const { startTime, endTime } = timestampManager.generateTimestamps(duration);

    expect(endTime.getTime() - startTime.getTime()).toBe(duration);
    expect(startTime).toBeInstanceOf(Date);
    expect(endTime).toBeInstanceOf(Date);
  });

  it('should use custom start time', () => {
    const customStart = new Date('2023-01-01T00:00:00Z');
    const duration = 1000;
    const { startTime, endTime } = timestampManager.generateTimestamps(duration, customStart);

    expect(startTime).toEqual(customStart);
    expect(endTime.getTime() - startTime.getTime()).toBe(duration);
  });

  it('should generate multiple timestamps with gaps', () => {
    const durations = [1000, 2000, 500];
    const timestamps = timestampManager.generateMultipleTimestamps(durations);

    expect(timestamps).toHaveLength(3);
    
    // Check durations
    expect(timestamps[0].endTime.getTime() - timestamps[0].startTime.getTime()).toBe(1000);
    expect(timestamps[1].endTime.getTime() - timestamps[1].startTime.getTime()).toBe(2000);
    expect(timestamps[2].endTime.getTime() - timestamps[2].startTime.getTime()).toBe(500);
    
    // Check that each operation starts after the previous one ends (with gap)
    expect(timestamps[1].startTime.getTime()).toBeGreaterThan(timestamps[0].endTime.getTime());
    expect(timestamps[2].startTime.getTime()).toBeGreaterThan(timestamps[1].endTime.getTime());
  });

  it('should validate timestamps correctly', () => {
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 1000);
    
    const validation = timestampManager.validateTimestamps(startTime, endTime);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should detect invalid timestamps', () => {
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() - 1000); // End before start
    
    const validation = timestampManager.validateTimestamps(startTime, endTime);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('End time cannot be before start time');
  });

  it('should calculate duration correctly', () => {
    const startTime = new Date('2023-01-01T00:00:00Z');
    const endTime = new Date('2023-01-01T00:01:00Z');
    
    const duration = timestampManager.calculateDuration(startTime, endTime);
    expect(duration).toBe(60000); // 1 minute in milliseconds
  });
});

describe('MockErrorCodeGenerator', () => {
  let errorCodeGenerator: MockErrorCodeGenerator;

  beforeEach(() => {
    errorCodeGenerator = new MockErrorCodeGenerator('TEST');
  });

  it('should generate error codes with correct format', () => {
    const code = errorCodeGenerator.generateErrorCode('backup', 'connection', 'timeout');
    expect(code).toBe('TEST_BACKUP_CONNECTION_TIMEOUT');
  });

  it('should handle special characters in input', () => {
    const code = errorCodeGenerator.generateErrorCode('my-operation', 'network error', 'dns-failure');
    expect(code).toBe('TEST_MY_OPERATION_NETWORK_ERROR_DNS_FAILURE');
  });

  it('should generate codes without specific error', () => {
    const code = errorCodeGenerator.generateErrorCode('deployment', 'validation');
    expect(code).toBe('TEST_DEPLOYMENT_VALIDATION');
  });

  it('should generate multiple error codes', () => {
    const scenarios = [
      { operationType: 'backup', errorCategory: 'io' },
      { operationType: 'restore', errorCategory: 'validation', specificError: 'checksum' }
    ];
    
    const codes = errorCodeGenerator.generateErrorCodes(scenarios);
    expect(codes.scenario_1).toBe('TEST_BACKUP_IO');
    expect(codes.scenario_2).toBe('TEST_RESTORE_VALIDATION_CHECKSUM');
  });

  it('should parse error codes correctly', () => {
    const code = 'TEST_BACKUP_CONNECTION_TIMEOUT';
    const parsed = errorCodeGenerator.parseErrorCode(code);
    
    expect(parsed).toEqual({
      prefix: 'TEST',
      operationType: 'BACKUP',
      errorCategory: 'CONNECTION',
      specificError: 'TIMEOUT'
    });
  });

  it('should return null for invalid error codes', () => {
    const parsed = errorCodeGenerator.parseErrorCode('INVALID_CODE');
    expect(parsed).toBeNull();
  });

  it('should update prefix', () => {
    errorCodeGenerator.setPrefix('NEW');
    expect(errorCodeGenerator.getPrefix()).toBe('NEW');
    
    const code = errorCodeGenerator.generateErrorCode('test', 'error');
    expect(code).toBe('NEW_TEST_ERROR');
  });
});

describe('MockMessageGenerator', () => {
  let messageGenerator: MockMessageGenerator;

  beforeEach(() => {
    messageGenerator = new MockMessageGenerator();
  });

  it('should generate default success message', () => {
    const message = messageGenerator.generateSuccessMessage('backup-operation');
    expect(message).toBe('Backup Operation completed successfully');
  });

  it('should generate success message with duration', () => {
    const message = messageGenerator.generateSuccessMessage('backup-operation', {
      template: 'withDuration',
      duration: 1500
    });
    expect(message).toBe('Backup Operation completed successfully in 1500ms');
  });

  it('should generate success message with details', () => {
    const message = messageGenerator.generateSuccessMessage('backup-operation', {
      template: 'withDetails',
      details: 'All files processed'
    });
    expect(message).toBe('Backup Operation completed successfully: All files processed');
  });

  it('should use custom success message', () => {
    const customMessage = 'Custom success message';
    const message = messageGenerator.generateSuccessMessage('backup-operation', {
      customMessage
    });
    expect(message).toBe(customMessage);
  });

  it('should generate default failure message', () => {
    const message = messageGenerator.generateFailureMessage('backup-operation', 'disk full');
    expect(message).toBe('Backup Operation failed: disk full');
  });

  it('should generate failure message with suggestion', () => {
    const message = messageGenerator.generateFailureMessage('backup-operation', 'disk full', {
      template: 'withSuggestion',
      suggestion: 'Free up disk space'
    });
    expect(message).toBe('Backup Operation failed: disk full. Free up disk space');
  });

  it('should generate failure message with context', () => {
    const message = messageGenerator.generateFailureMessage('backup-operation', 'timeout', {
      template: 'withContext',
      context: 'production environment'
    });
    expect(message).toBe('Backup Operation failed in production environment: timeout');
  });

  it('should add custom message templates', () => {
    messageGenerator.addMessageTemplates('success', {
      custom: 'Custom {operation} template with {details}'
    });
    
    const message = messageGenerator.generateSuccessMessage('test-op', {
      template: 'custom',
      details: 'extra info'
    });
    expect(message).toBe('Custom Test Op template with extra info');
  });

  it('should get available templates', () => {
    const templates = messageGenerator.getTemplates();
    expect(templates.success).toHaveProperty('default');
    expect(templates.failure).toHaveProperty('default');
  });
});

describe('MockConfigurationManager', () => {
  interface TestConfig extends BaseMockConfig {
    testProperty: string;
  }

  let configManager: MockConfigurationManager<TestConfig>;
  const defaultConfig: TestConfig = {
    successRate: 0.9,
    durationRange: { min: 100, max: 2000 },
    includeWarnings: false,
    testProperty: 'default'
  };

  beforeEach(() => {
    configManager = new MockConfigurationManager(defaultConfig);
  });

  it('should initialize with default config', () => {
    const config = configManager.getConfig();
    expect(config).toEqual(defaultConfig);
  });

  it('should update configuration', () => {
    configManager.updateConfig({ successRate: 0.8, testProperty: 'updated' });
    
    const config = configManager.getConfig();
    expect(config.successRate).toBe(0.8);
    expect(config.testProperty).toBe('updated');
    expect(config.durationRange).toEqual(defaultConfig.durationRange);
  });

  it('should validate success rate bounds', () => {
    configManager.updateConfig({ successRate: 1.5 });
    expect(configManager.getConfig().successRate).toBe(1);

    configManager.updateConfig({ successRate: -0.5 });
    expect(configManager.getConfig().successRate).toBe(0);
  });

  it('should validate duration range', () => {
    expect(() => {
      configManager.updateConfig({ durationRange: { min: -100, max: 200 } });
    }).toThrow('Invalid duration range');

    expect(() => {
      configManager.updateConfig({ durationRange: { min: 200, max: 100 } });
    }).toThrow('Invalid duration range');
  });

  it('should reset to defaults', () => {
    configManager.updateConfig({ successRate: 0.5, testProperty: 'changed' });
    configManager.resetToDefaults();
    
    const config = configManager.getConfig();
    expect(config).toEqual(defaultConfig);
  });

  it('should validate configuration', () => {
    const validation = configManager.validateConfig();
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should detect invalid configuration', () => {
    // Manually set invalid config to test validation
    (configManager as any).config.successRate = 1.5;
    
    const validation = configManager.validateConfig();
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Success rate must be between 0 and 1');
  });

  it('should get configuration diff', () => {
    configManager.updateConfig({ successRate: 0.8 });
    
    const diff = configManager.getConfigDiff();
    expect(diff).toEqual({ successRate: 0.8 });
  });
});

describe('MockStateManager', () => {
  let stateManager: MockStateManager;

  beforeEach(() => {
    stateManager = new MockStateManager();
  });

  it('should initialize correctly', async () => {
    expect(stateManager.isInitialized()).toBe(false);
    
    await stateManager.initialize();
    
    expect(stateManager.isInitialized()).toBe(true);
    expect(stateManager.isCleanedUp()).toBe(false);
    expect(stateManager.getOperationCount()).toBe(0);
  });

  it('should prevent double initialization', async () => {
    await stateManager.initialize();
    
    await expect(stateManager.initialize()).rejects.toThrow('Mock is already initialized');
  });

  it('should cleanup correctly', async () => {
    await stateManager.initialize();
    stateManager.cleanup();
    
    expect(stateManager.isInitialized()).toBe(false);
    expect(stateManager.isCleanedUp()).toBe(true);
  });

  it('should record operations', async () => {
    await stateManager.initialize();
    
    expect(stateManager.getOperationCount()).toBe(0);
    expect(stateManager.getLastOperationTime()).toBeUndefined();
    
    stateManager.recordOperation();
    
    expect(stateManager.getOperationCount()).toBe(1);
    expect(stateManager.getLastOperationTime()).toBeInstanceOf(Date);
  });

  it('should prevent recording operations before initialization', () => {
    expect(() => {
      stateManager.recordOperation();
    }).toThrow('Mock must be initialized before recording operations');
  });

  it('should record errors', () => {
    stateManager.recordError('Test error 1');
    stateManager.recordError('Test error 2');
    
    const errors = stateManager.getErrors();
    expect(errors).toEqual(['Test error 1', 'Test error 2']);
  });

  it('should reset state', async () => {
    await stateManager.initialize();
    stateManager.recordOperation();
    stateManager.recordError('Test error');
    
    stateManager.reset();
    
    expect(stateManager.isInitialized()).toBe(false);
    expect(stateManager.isCleanedUp()).toBe(false);
    expect(stateManager.getOperationCount()).toBe(0);
    expect(stateManager.getErrors()).toHaveLength(0);
  });

  it('should get full state snapshot', async () => {
    await stateManager.initialize();
    stateManager.recordOperation();
    stateManager.recordError('Test error');
    
    const state = stateManager.getState();
    
    expect(state.initialized).toBe(true);
    expect(state.cleanedUp).toBe(false);
    expect(state.operationCount).toBe(1);
    expect(state.errors).toEqual(['Test error']);
    expect(state.lastOperationTime).toBeInstanceOf(Date);
  });
});

// Test implementation of BaseOperationMockFactory
interface TestMetadata extends BaseOperationMetadata {
  testField: string;
}

interface TestResult extends BaseOperationResult<TestMetadata> {
  testData: string;
}

interface TestError extends BaseOperationError {
  testContext: string;
}

interface TestConfig extends BaseMockConfig {
  testSetting: boolean;
}

class TestMockFactory extends BaseOperationMockFactory<TestMetadata, TestResult, TestError, TestConfig> {
  constructor() {
    const config: TestConfig = {
      successRate: 0.9,
      durationRange: { min: 100, max: 1000 },
      includeWarnings: false,
      testSetting: true
    };
    super(config, 'test', 'TEST');
  }

  createOperationResponse(operationType: string, options: {
    forceSuccess?: boolean;
    forceFailure?: boolean;
  } = {}): Result<TestResult, TestError> {
    const duration = this.durationSimulator.generateDuration();
    const shouldSucceed = this.successFailureLogic.shouldSucceed(options);

    if (shouldSucceed) {
      const metadata = {
        ...this.generateBaseMetadata(operationType, 'completed', duration),
        testField: 'test-value'
      } as TestMetadata;

      const result = {
        ...this.generateSuccessResult(metadata, duration),
        testData: 'success-data'
      } as TestResult;

      return success(result);
    } else {
      const error = {
        ...this.generateErrorResult(operationType, 'test-error', 'Test failure'),
        testContext: 'test-context'
      } as TestError;

      return failure(error);
    }
  }

  protected generateWarnings(operationType: string): string[] {
    return [`Warning for ${operationType}`, 'General warning'];
  }

  protected getDefaultSuggestions(operationType: string, errorCategory: string): string[] {
    return [`Try again for ${operationType}`, `Check ${errorCategory} configuration`];
  }
}

describe('BaseOperationMockFactory', () => {
  let factory: TestMockFactory;

  beforeEach(() => {
    factory = new TestMockFactory();
  });

  afterEach(() => {
    factory.cleanup();
  });

  it('should initialize and cleanup correctly', async () => {
    await factory.initialize();
    
    const stats = factory.getStatistics();
    expect(stats.isInitialized).toBe(true);
    
    factory.cleanup();
    
    const statsAfterCleanup = factory.getStatistics();
    expect(statsAfterCleanup.isInitialized).toBe(false);
  });

  it('should create successful operation response', async () => {
    await factory.initialize();
    
    const response = factory.createOperationResponse('test-operation', { forceSuccess: true });
    
    expect(response.success).toBe(true);
    if (response.success) {
      expect(response.data.operation.type).toBe('test-operation');
      expect(response.data.operation.status).toBe('completed');
      expect(response.data.testData).toBe('success-data');
      expect(response.data.operation.testField).toBe('test-value');
    }
  });

  it('should create failed operation response', async () => {
    await factory.initialize();
    
    const response = factory.createOperationResponse('test-operation', { forceFailure: true });
    
    expect(response.success).toBe(false);
    if (!response.success) {
      expect(response.error.operation).toBe('test-operation');
      expect(response.error.code).toMatch(/^TEST_/);
      expect(response.error.testContext).toBe('test-context');
    }
  });

  it('should update configuration', async () => {
    await factory.initialize();
    
    factory.updateConfig({ successRate: 0.5, testSetting: false });
    
    const stats = factory.getStatistics();
    expect(stats.config.successRate).toBe(0.5);
    expect(stats.config.testSetting).toBe(false);
  });

  it('should validate configuration', () => {
    const validation = factory.validateConfiguration();
    expect(validation.isValid).toBe(true);
  });

  it('should reset factory state', async () => {
    await factory.initialize();
    factory.createOperationResponse('test');
    
    factory.reset();
    
    const stats = factory.getStatistics();
    expect(stats.operationCount).toBe(0);
    expect(stats.isInitialized).toBe(false);
  });

  it('should track statistics', async () => {
    await factory.initialize();
    
    factory.createOperationResponse('test1');
    factory.createOperationResponse('test2');
    
    const stats = factory.getStatistics();
    expect(stats.operationCount).toBe(2);
    expect(stats.lastOperationTime).toBeInstanceOf(Date);
  });
});

describe('MockUtilities', () => {
  it('should create ID generator with custom prefix', () => {
    const generator = MockUtilities.createIdGenerator('custom');
    const id = generator.generateId();
    
    expect(id).toMatch(/^custom_[a-z0-9]+_[a-z0-9]+$/);
  });

  it('should create duration simulator with presets', () => {
    const fastSimulator = MockUtilities.createDurationSimulator('fast');
    const normalSimulator = MockUtilities.createDurationSimulator('normal');
    const slowSimulator = MockUtilities.createDurationSimulator('slow');

    const fastDuration = fastSimulator.generateDuration();
    const normalDuration = normalSimulator.generateDuration();
    const slowDuration = slowSimulator.generateDuration();

    expect(fastDuration).toBeLessThan(normalDuration);
    expect(normalDuration).toBeLessThan(slowDuration);
  });

  it('should create success/failure logic with presets', () => {
    const reliableLogic = MockUtilities.createSuccessFailureLogic('reliable');
    const normalLogic = MockUtilities.createSuccessFailureLogic('normal');
    const unreliableLogic = MockUtilities.createSuccessFailureLogic('unreliable');

    expect(reliableLogic.getSuccessRate()).toBe(0.98);
    expect(normalLogic.getSuccessRate()).toBe(0.9);
    expect(unreliableLogic.getSuccessRate()).toBe(0.7);
  });

  it('should create error code generator with domain prefixes', () => {
    const backupGenerator = MockUtilities.createErrorCodeGenerator('backup');
    const deploymentGenerator = MockUtilities.createErrorCodeGenerator('deployment');
    const parserGenerator = MockUtilities.createErrorCodeGenerator('parser');
    const generalGenerator = MockUtilities.createErrorCodeGenerator('general');

    expect(backupGenerator.getPrefix()).toBe('BACKUP');
    expect(deploymentGenerator.getPrefix()).toBe('DEPLOY');
    expect(parserGenerator.getPrefix()).toBe('PARSE');
    expect(generalGenerator.getPrefix()).toBe('MOCK');
  });

  it('should create message generator with domain-specific templates', () => {
    const generator = MockUtilities.createMessageGenerator('backup');
    const templates = generator.getTemplates();

    expect(templates.success).toHaveProperty('backup_success');
    expect(templates.success).toHaveProperty('backup_success_detailed');
    expect(templates.failure).toHaveProperty('backup_failure');
    expect(templates.failure).toHaveProperty('backup_failure_detailed');
  });
});

describe('Integration Tests', () => {
  it('should work together to create consistent mock responses', async () => {
    // Create a complete mock factory using all utilities
    const idGenerator = new MockIdGenerator('integration');
    const durationSimulator = new MockDurationSimulator({ min: 500, max: 1500 });
    const successFailureLogic = new MockSuccessFailureLogic(0.8);
    const timestampManager = new MockTimestampManager();
    const errorCodeGenerator = new MockErrorCodeGenerator('INTEGRATION');
    const messageGenerator = new MockMessageGenerator();

    // Generate multiple mock operations
    const operations = [];
    for (let i = 0; i < 10; i++) {
      const operationId = idGenerator.generateId();
      const duration = durationSimulator.generateDuration();
      const shouldSucceed = successFailureLogic.shouldSucceed();
      const { startTime, endTime } = timestampManager.generateTimestamps(duration);

      if (shouldSucceed) {
        operations.push({
          id: operationId,
          success: true,
          duration,
          startTime,
          endTime,
          message: messageGenerator.generateSuccessMessage('test-operation', { duration })
        });
      } else {
        operations.push({
          id: operationId,
          success: false,
          errorCode: errorCodeGenerator.generateErrorCode('test-operation', 'failure'),
          message: messageGenerator.generateFailureMessage('test-operation', 'simulated failure')
        });
      }
    }

    // Validate results
    expect(operations).toHaveLength(10);
    
    // Check ID uniqueness
    const ids = operations.map(op => op.id);
    expect(new Set(ids).size).toBe(10);
    
    // Check that all IDs follow pattern
    ids.forEach(id => {
      expect(id).toMatch(/^integration_[a-z0-9]+_[a-z0-9]+$/);
    });
    
    // Check success rate is reasonable (should be around 80%)
    const successCount = operations.filter(op => op.success).length;
    const successRate = successCount / operations.length;
    expect(successRate).toBeGreaterThan(0.6);
    expect(successRate).toBeLessThan(1.0);
    
    // Check that successful operations have valid durations and timestamps
    operations.filter(op => op.success).forEach(op => {
      expect(op.duration).toBeGreaterThanOrEqual(500);
      expect(op.duration).toBeLessThanOrEqual(1500);
      expect(op.startTime).toBeInstanceOf(Date);
      expect(op.endTime).toBeInstanceOf(Date);
      expect(op.endTime.getTime() - op.startTime.getTime()).toBe(op.duration);
    });
    
    // Check that failed operations have proper error codes
    operations.filter(op => !op.success).forEach(op => {
      expect(op.errorCode).toMatch(/^INTEGRATION_TEST_OPERATION_FAILURE$/);
    });
  });

  it('should maintain consistency across multiple factory instances', async () => {
    // Create multiple factories with same configuration
    const config: BaseMockConfig = {
      successRate: 0.9,
      durationRange: { min: 100, max: 200 },
      includeWarnings: false
    };

    const factory1 = new TestMockFactory();
    const factory2 = new TestMockFactory();
    
    // Initialize both factories
    await factory1.initialize();
    await factory2.initialize();

    // Both should have same initial configuration
    expect(factory1.getStatistics().config.successRate).toBe(factory2.getStatistics().config.successRate);
    
    // Both should generate responses with similar characteristics
    const response1 = factory1.createOperationResponse('test', { forceSuccess: true });
    const response2 = factory2.createOperationResponse('test', { forceSuccess: true });

    expect(response1.success).toBe(true);
    expect(response2.success).toBe(true);
    
    if (response1.success && response2.success) {
      expect(response1.data.operation.type).toBe(response2.data.operation.type);
      expect(response1.data.operation.status).toBe(response2.data.operation.status);
    }
    
    // Cleanup
    factory1.cleanup();
    factory2.cleanup();
  });
});

describe('Performance Tests', () => {
  it('should handle high-volume ID generation efficiently', () => {
    const generator = new MockIdGenerator('perf');
    const startTime = performance.now();
    
    const ids = generator.generateIds(10000);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(ids).toHaveLength(10000);
    expect(new Set(ids).size).toBe(10000); // All unique
    expect(duration).toBeLessThan(1000); // Should complete in under 1 second
  });

  it('should handle high-volume duration generation efficiently', () => {
    const simulator = new MockDurationSimulator({ min: 100, max: 1000 });
    const startTime = performance.now();
    
    const durations = simulator.generateDurations(10000);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(durations).toHaveLength(10000);
    expect(duration).toBeLessThan(500); // Should complete in under 0.5 seconds
    
    // All durations should be in range
    durations.forEach(d => {
      expect(d).toBeGreaterThanOrEqual(100);
      expect(d).toBeLessThanOrEqual(1000);
    });
  });

  it('should handle high-volume mock factory operations efficiently', async () => {
    const factory = new TestMockFactory();
    await factory.initialize();
    
    const startTime = performance.now();
    
    const responses = [];
    for (let i = 0; i < 1000; i++) {
      responses.push(factory.createOperationResponse(`operation-${i}`));
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(responses).toHaveLength(1000);
    expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds
    
    const stats = factory.getStatistics();
    // The operation count should match the number of successful operations
    // (some may fail due to success rate, so we check it's reasonable)
    expect(stats.operationCount).toBeGreaterThan(800); // At least 80% should succeed
    expect(stats.operationCount).toBeLessThanOrEqual(1000);
    
    factory.cleanup();
  });
});