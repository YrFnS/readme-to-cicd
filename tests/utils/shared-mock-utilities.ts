/**
 * Shared Mock Utilities for Common Behaviors
 * 
 * Provides reusable mock utilities and patterns that can be shared across
 * different types of mock factories and test scenarios. These utilities
 * abstract common behaviors like ID generation, duration simulation,
 * success/failure logic, and configuration management.
 * 
 * This module helps maintain consistency across mock implementations
 * and reduces code duplication in test utilities.
 */

import { Result, success, failure } from '../../src/shared/types/result';

/**
 * Configuration interface for mock operations
 */
export interface BaseMockConfig {
  /** Default success rate (0-1) for operations */
  successRate: number;
  
  /** Simulated operation duration range in milliseconds */
  durationRange: { min: number; max: number };
  
  /** Whether to include warnings in successful operations */
  includeWarnings: boolean;
  
  /** Custom error scenarios to simulate */
  errorScenarios?: Record<string, any>;
  
  /** Additional configuration options */
  [key: string]: any;
}

/**
 * Base metadata interface for mock operations
 */
export interface BaseOperationMetadata {
  /** Unique identifier for the operation */
  id: string;
  
  /** Type of operation */
  type: string;
  
  /** Current status of the operation */
  status: string;
  
  /** Timestamp when the operation was started */
  startTime: Date;
  
  /** Timestamp when the operation was completed (if applicable) */
  endTime?: Date;
  
  /** Additional metadata specific to the operation type */
  metadata?: Record<string, any>;
}

/**
 * Base result interface for mock operations
 */
export interface BaseOperationResult<T extends BaseOperationMetadata> {
  /** Operation metadata */
  operation: T;
  
  /** Success message or additional details */
  message: string;
  
  /** Duration of the operation in milliseconds */
  duration: number;
  
  /** Any warnings encountered during the operation */
  warnings?: string[];
}

/**
 * Base error interface for mock operations
 */
export interface BaseOperationError {
  /** Error code for programmatic handling */
  code: string;
  
  /** Human-readable error message */
  message: string;
  
  /** The operation that failed */
  operation: string;
  
  /** Additional error context */
  context?: Record<string, any>;
  
  /** Suggested recovery actions */
  suggestions?: string[];
}

/**
 * Mock ID Generator Utility
 * 
 * Generates unique operation IDs with configurable prefixes and formats
 */
export class MockIdGenerator {
  private counter = 0;
  private prefix: string;

  constructor(prefix: string = 'op') {
    this.prefix = prefix;
  }

  /**
   * Generate a unique operation ID
   */
  generateId(): string {
    this.counter++;
    const timestamp = Date.now().toString(36);
    const counter = this.counter.toString(36);
    return `${this.prefix}_${timestamp}_${counter}`;
  }

  /**
   * Generate multiple unique IDs
   */
  generateIds(count: number): string[] {
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      ids.push(this.generateId());
    }
    return ids;
  }

  /**
   * Reset the counter (useful for testing)
   */
  reset(): void {
    this.counter = 0;
  }

  /**
   * Get current counter value
   */
  getCounter(): number {
    return this.counter;
  }

  /**
   * Set custom prefix
   */
  setPrefix(prefix: string): void {
    this.prefix = prefix;
  }
}

/**
 * Mock Duration Simulator Utility
 * 
 * Simulates realistic operation durations with configurable ranges
 */
export class MockDurationSimulator {
  private durationRange: { min: number; max: number };

  constructor(durationRange: { min: number; max: number } = { min: 100, max: 2000 }) {
    this.durationRange = durationRange;
  }

  /**
   * Generate a realistic operation duration
   */
  generateDuration(): number {
    const { min, max } = this.durationRange;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate multiple durations
   */
  generateDurations(count: number): number[] {
    const durations: number[] = [];
    for (let i = 0; i < count; i++) {
      durations.push(this.generateDuration());
    }
    return durations;
  }

  /**
   * Generate duration based on operation complexity
   */
  generateDurationByComplexity(complexity: 'simple' | 'moderate' | 'complex'): number {
    const complexityMultipliers = {
      simple: 0.5,
      moderate: 1.0,
      complex: 2.0
    };

    const multiplier = complexityMultipliers[complexity];
    const baseDuration = this.generateDuration();
    return Math.floor(baseDuration * multiplier);
  }

  /**
   * Update duration range
   */
  updateRange(newRange: { min: number; max: number }): void {
    this.durationRange = newRange;
  }

  /**
   * Get current duration range
   */
  getRange(): { min: number; max: number } {
    return { ...this.durationRange };
  }
}

/**
 * Mock Success/Failure Logic Utility
 * 
 * Determines operation success or failure based on configurable rates
 */
export class MockSuccessFailureLogic {
  private successRate: number;

  constructor(successRate: number = 0.9) {
    this.successRate = Math.max(0, Math.min(1, successRate));
  }

  /**
   * Determine if an operation should succeed
   */
  shouldSucceed(options: {
    forceSuccess?: boolean;
    forceFailure?: boolean;
    customSuccessRate?: number;
  } = {}): boolean {
    if (options.forceSuccess) return true;
    if (options.forceFailure) return false;
    
    const rate = options.customSuccessRate ?? this.successRate;
    return Math.random() < rate;
  }

  /**
   * Generate success/failure results for multiple operations
   */
  generateResults(count: number, options: {
    customSuccessRate?: number;
  } = {}): boolean[] {
    const results: boolean[] = [];
    for (let i = 0; i < count; i++) {
      results.push(this.shouldSucceed(options));
    }
    return results;
  }

  /**
   * Calculate success rate from results
   */
  calculateSuccessRate(results: boolean[]): number {
    if (results.length === 0) return 0;
    const successCount = results.filter(r => r).length;
    return successCount / results.length;
  }

  /**
   * Update success rate
   */
  updateSuccessRate(newRate: number): void {
    this.successRate = Math.max(0, Math.min(1, newRate));
  }

  /**
   * Get current success rate
   */
  getSuccessRate(): number {
    return this.successRate;
  }
}

/**
 * Mock Timestamp Manager Utility
 * 
 * Manages operation timestamps with realistic timing patterns
 */
export class MockTimestampManager {
  /**
   * Generate operation timestamps
   */
  generateTimestamps(duration: number, startTime?: Date): {
    startTime: Date;
    endTime: Date;
  } {
    const start = startTime || new Date();
    const end = new Date(start.getTime() + duration);
    
    return { startTime: start, endTime: end };
  }

  /**
   * Generate multiple timestamp pairs
   */
  generateMultipleTimestamps(
    durations: number[],
    baseStartTime?: Date
  ): Array<{ startTime: Date; endTime: Date }> {
    const timestamps: Array<{ startTime: Date; endTime: Date }> = [];
    let currentTime = baseStartTime || new Date();
    
    for (const duration of durations) {
      const { startTime, endTime } = this.generateTimestamps(duration, currentTime);
      timestamps.push({ startTime, endTime });
      
      // Next operation starts after a small gap
      currentTime = new Date(endTime.getTime() + Math.random() * 1000);
    }
    
    return timestamps;
  }

  /**
   * Validate timestamp consistency
   */
  validateTimestamps(startTime: Date, endTime: Date): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (endTime < startTime) {
      errors.push('End time cannot be before start time');
    }
    
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    
    if (startTime > oneHourFromNow) {
      errors.push('Start time is too far in the future');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate duration from timestamps
   */
  calculateDuration(startTime: Date, endTime: Date): number {
    return Math.max(0, endTime.getTime() - startTime.getTime());
  }
}/**

 * Mock Error Code Generator Utility
 * 
 * Generates structured error codes with consistent patterns
 */
export class MockErrorCodeGenerator {
  private prefix: string;

  constructor(prefix: string = 'MOCK') {
    this.prefix = prefix.toUpperCase();
  }

  /**
   * Generate error code for operation type and error category
   */
  generateErrorCode(
    operationType: string,
    errorCategory: string,
    specificError?: string
  ): string {
    const parts = [
      this.prefix,
      operationType.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
      errorCategory.toUpperCase().replace(/[^A-Z0-9]/g, '_')
    ];

    if (specificError) {
      parts.push(specificError.toUpperCase().replace(/[^A-Z0-9]/g, '_'));
    }

    return parts.join('_');
  }

  /**
   * Generate multiple error codes for different scenarios
   */
  generateErrorCodes(scenarios: Array<{
    operationType: string;
    errorCategory: string;
    specificError?: string;
  }>): Record<string, string> {
    const codes: Record<string, string> = {};
    
    scenarios.forEach((scenario, index) => {
      const key = `scenario_${index + 1}`;
      codes[key] = this.generateErrorCode(
        scenario.operationType,
        scenario.errorCategory,
        scenario.specificError
      );
    });
    
    return codes;
  }

  /**
   * Parse error code components
   */
  parseErrorCode(errorCode: string): {
    prefix: string;
    operationType: string;
    errorCategory: string;
    specificError?: string;
  } | null {
    const parts = errorCode.split('_');
    
    if (parts.length < 3) {
      return null;
    }
    
    return {
      prefix: parts[0],
      operationType: parts[1],
      errorCategory: parts[2],
      specificError: parts.length > 3 ? parts.slice(3).join('_') : undefined
    };
  }

  /**
   * Update prefix
   */
  setPrefix(newPrefix: string): void {
    this.prefix = newPrefix.toUpperCase();
  }

  /**
   * Get current prefix
   */
  getPrefix(): string {
    return this.prefix;
  }
}

/**
 * Mock Message Generator Utility
 * 
 * Generates contextual success and failure messages
 */
export class MockMessageGenerator {
  private messageTemplates: {
    success: Record<string, string>;
    failure: Record<string, string>;
  };

  constructor() {
    this.messageTemplates = {
      success: {
        default: '{operation} completed successfully',
        withDuration: '{operation} completed successfully in {duration}ms',
        withDetails: '{operation} completed successfully: {details}'
      },
      failure: {
        default: '{operation} failed: {reason}',
        withSuggestion: '{operation} failed: {reason}. {suggestion}',
        withContext: '{operation} failed in {context}: {reason}'
      }
    };
  }

  /**
   * Generate success message
   */
  generateSuccessMessage(
    operationType: string,
    options: {
      template?: string;
      duration?: number;
      details?: string;
      customMessage?: string;
    } = {}
  ): string {
    if (options.customMessage) {
      return options.customMessage;
    }

    const template = options.template || 'default';
    const messageTemplate = this.messageTemplates.success[template] || 
                           this.messageTemplates.success.default;

    return this.interpolateMessage(messageTemplate, {
      operation: this.formatOperationType(operationType),
      duration: options.duration?.toString(),
      details: options.details
    });
  }

  /**
   * Generate failure message
   */
  generateFailureMessage(
    operationType: string,
    reason: string,
    options: {
      template?: string;
      suggestion?: string;
      context?: string;
      customMessage?: string;
    } = {}
  ): string {
    if (options.customMessage) {
      return options.customMessage;
    }

    const template = options.template || 'default';
    const messageTemplate = this.messageTemplates.failure[template] || 
                           this.messageTemplates.failure.default;

    return this.interpolateMessage(messageTemplate, {
      operation: this.formatOperationType(operationType),
      reason,
      suggestion: options.suggestion,
      context: options.context
    });
  }

  /**
   * Add custom message templates
   */
  addMessageTemplates(
    type: 'success' | 'failure',
    templates: Record<string, string>
  ): void {
    this.messageTemplates[type] = {
      ...this.messageTemplates[type],
      ...templates
    };
  }

  /**
   * Get available templates
   */
  getTemplates(): typeof this.messageTemplates {
    return JSON.parse(JSON.stringify(this.messageTemplates));
  }

  /**
   * Format operation type for display
   */
  private formatOperationType(operationType: string): string {
    return operationType
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Interpolate message template with values
   */
  private interpolateMessage(
    template: string,
    values: Record<string, string | undefined>
  ): string {
    let message = template;
    
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined) {
        message = message.replace(new RegExp(`{${key}}`, 'g'), value);
      }
    });
    
    // Remove any remaining placeholders
    message = message.replace(/{[^}]+}/g, '');
    
    // Clean up extra spaces and punctuation
    message = message.replace(/\s+/g, ' ').trim();
    message = message.replace(/:\s*$/, '');
    
    return message;
  }
}/**

 * Mock Configuration Manager Utility
 * 
 * Manages mock configuration with validation and defaults
 */
export class MockConfigurationManager<T extends BaseMockConfig> {
  private config: T;
  private defaultConfig: T;

  constructor(defaultConfig: T) {
    this.defaultConfig = { ...defaultConfig };
    this.config = { ...defaultConfig };
  }

  /**
   * Update configuration with validation
   */
  updateConfig(newConfig: Partial<T>): void {
    const updatedConfig = { ...this.config, ...newConfig };
    
    // Validate success rate
    if (updatedConfig.successRate !== undefined) {
      updatedConfig.successRate = Math.max(0, Math.min(1, updatedConfig.successRate));
    }
    
    // Validate duration range
    if (updatedConfig.durationRange) {
      const { min, max } = updatedConfig.durationRange;
      if (min < 0 || max < 0 || min > max) {
        throw new Error('Invalid duration range: min and max must be non-negative, and min <= max');
      }
    }
    
    this.config = updatedConfig;
  }

  /**
   * Get current configuration
   */
  getConfig(): T {
    return { ...this.config };
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults(): void {
    this.config = { ...this.defaultConfig };
  }

  /**
   * Validate configuration
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (this.config.successRate < 0 || this.config.successRate > 1) {
      errors.push('Success rate must be between 0 and 1');
    }
    
    if (this.config.durationRange) {
      const { min, max } = this.config.durationRange;
      if (min < 0 || max < 0) {
        errors.push('Duration range values must be non-negative');
      }
      if (min > max) {
        errors.push('Duration range min cannot be greater than max');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get configuration diff from defaults
   */
  getConfigDiff(): Partial<T> {
    const diff: Partial<T> = {};
    
    Object.keys(this.config).forEach(key => {
      const configKey = key as keyof T;
      if (JSON.stringify(this.config[configKey]) !== JSON.stringify(this.defaultConfig[configKey])) {
        diff[configKey] = this.config[configKey];
      }
    });
    
    return diff;
  }
}

/**
 * Mock State Manager Utility
 * 
 * Manages mock state including initialization, cleanup, and lifecycle
 */
export class MockStateManager {
  private state: {
    initialized: boolean;
    cleanedUp: boolean;
    operationCount: number;
    lastOperationTime?: Date;
    errors: string[];
  };

  constructor() {
    this.state = {
      initialized: false,
      cleanedUp: false,
      operationCount: 0,
      errors: []
    };
  }

  /**
   * Initialize the mock
   */
  async initialize(): Promise<void> {
    if (this.state.initialized) {
      throw new Error('Mock is already initialized');
    }
    
    this.state.initialized = true;
    this.state.cleanedUp = false;
    this.state.operationCount = 0;
    this.state.errors = [];
  }

  /**
   * Cleanup the mock
   */
  cleanup(): void {
    this.state.cleanedUp = true;
    this.state.initialized = false;
  }

  /**
   * Record an operation
   */
  recordOperation(): void {
    if (!this.state.initialized) {
      throw new Error('Mock must be initialized before recording operations');
    }
    
    this.state.operationCount++;
    this.state.lastOperationTime = new Date();
  }

  /**
   * Record an error
   */
  recordError(error: string): void {
    this.state.errors.push(error);
  }

  /**
   * Check if mock is initialized
   */
  isInitialized(): boolean {
    return this.state.initialized;
  }

  /**
   * Check if mock is cleaned up
   */
  isCleanedUp(): boolean {
    return this.state.cleanedUp;
  }

  /**
   * Get operation count
   */
  getOperationCount(): number {
    return this.state.operationCount;
  }

  /**
   * Get last operation time
   */
  getLastOperationTime(): Date | undefined {
    return this.state.lastOperationTime;
  }

  /**
   * Get recorded errors
   */
  getErrors(): string[] {
    return [...this.state.errors];
  }

  /**
   * Reset state
   */
  reset(): void {
    this.state = {
      initialized: false,
      cleanedUp: false,
      operationCount: 0,
      errors: []
    };
  }

  /**
   * Get full state snapshot
   */
  getState(): typeof this.state {
    return {
      ...this.state,
      errors: [...this.state.errors]
    };
  }
}/**

 * Base Operation Mock Factory
 * 
 * Abstract base class that provides common functionality for operation mock factories
 */
export abstract class BaseOperationMockFactory<
  TMetadata extends BaseOperationMetadata,
  TResult extends BaseOperationResult<TMetadata>,
  TError extends BaseOperationError,
  TConfig extends BaseMockConfig
> {
  protected idGenerator: MockIdGenerator;
  protected durationSimulator: MockDurationSimulator;
  protected successFailureLogic: MockSuccessFailureLogic;
  protected timestampManager: MockTimestampManager;
  protected errorCodeGenerator: MockErrorCodeGenerator;
  protected messageGenerator: MockMessageGenerator;
  protected configManager: MockConfigurationManager<TConfig>;
  protected stateManager: MockStateManager;

  constructor(
    config: TConfig,
    idPrefix: string = 'op',
    errorPrefix: string = 'MOCK'
  ) {
    this.idGenerator = new MockIdGenerator(idPrefix);
    this.durationSimulator = new MockDurationSimulator(config.durationRange);
    this.successFailureLogic = new MockSuccessFailureLogic(config.successRate);
    this.timestampManager = new MockTimestampManager();
    this.errorCodeGenerator = new MockErrorCodeGenerator(errorPrefix);
    this.messageGenerator = new MockMessageGenerator();
    this.configManager = new MockConfigurationManager(config);
    this.stateManager = new MockStateManager();
  }

  /**
   * Initialize the mock factory
   */
  async initialize(): Promise<void> {
    await this.stateManager.initialize();
  }

  /**
   * Cleanup the mock factory
   */
  cleanup(): void {
    this.stateManager.cleanup();
  }

  /**
   * Create a mock operation response
   */
  abstract createOperationResponse(
    operationType: string,
    options?: any
  ): Result<TResult, TError>;

  /**
   * Update factory configuration
   */
  updateConfig(newConfig: Partial<TConfig>): void {
    this.configManager.updateConfig(newConfig);
    
    // Update dependent utilities
    const config = this.configManager.getConfig();
    this.durationSimulator.updateRange(config.durationRange);
    this.successFailureLogic.updateSuccessRate(config.successRate);
  }

  /**
   * Reset factory state
   */
  reset(): void {
    this.idGenerator.reset();
    this.stateManager.reset();
    this.configManager.resetToDefaults();
  }

  /**
   * Get factory statistics
   */
  getStatistics(): {
    operationCount: number;
    lastOperationTime?: Date;
    errors: string[];
    isInitialized: boolean;
    config: TConfig;
  } {
    return {
      operationCount: this.stateManager.getOperationCount(),
      lastOperationTime: this.stateManager.getLastOperationTime(),
      errors: this.stateManager.getErrors(),
      isInitialized: this.stateManager.isInitialized(),
      config: this.configManager.getConfig()
    };
  }

  /**
   * Validate factory configuration
   */
  validateConfiguration(): { isValid: boolean; errors: string[] } {
    return this.configManager.validateConfig();
  }

  /**
   * Generate base operation metadata
   */
  protected generateBaseMetadata(
    operationType: string,
    status: string,
    duration: number,
    additionalMetadata?: Record<string, any>
  ): Omit<TMetadata, keyof BaseOperationMetadata> & BaseOperationMetadata {
    const operationId = this.idGenerator.generateId();
    const { startTime, endTime } = this.timestampManager.generateTimestamps(duration);
    
    this.stateManager.recordOperation();
    
    return {
      id: operationId,
      type: operationType,
      status,
      startTime,
      endTime,
      metadata: additionalMetadata
    } as Omit<TMetadata, keyof BaseOperationMetadata> & BaseOperationMetadata;
  }

  /**
   * Generate success result
   */
  protected generateSuccessResult(
    metadata: TMetadata,
    duration: number,
    options: {
      customMessage?: string;
      includeWarnings?: boolean;
      additionalData?: any;
    } = {}
  ): TResult {
    const message = options.customMessage || 
      this.messageGenerator.generateSuccessMessage(metadata.type, { duration });
    
    const warnings = options.includeWarnings ? 
      this.generateWarnings(metadata.type) : undefined;
    
    return {
      operation: metadata,
      message,
      duration,
      warnings,
      ...options.additionalData
    } as TResult;
  }

  /**
   * Generate error result
   */
  protected generateErrorResult(
    operationType: string,
    errorCategory: string,
    reason: string,
    options: {
      customErrorCode?: string;
      customMessage?: string;
      context?: Record<string, any>;
      suggestions?: string[];
    } = {}
  ): TError {
    const errorCode = options.customErrorCode || 
      this.errorCodeGenerator.generateErrorCode(operationType, errorCategory);
    
    const message = options.customMessage || 
      this.messageGenerator.generateFailureMessage(operationType, reason);
    
    this.stateManager.recordError(`${errorCode}: ${message}`);
    
    return {
      code: errorCode,
      message,
      operation: operationType,
      context: options.context,
      suggestions: options.suggestions || this.getDefaultSuggestions(operationType, errorCategory)
    } as TError;
  }

  /**
   * Generate warnings for successful operations
   */
  protected abstract generateWarnings(operationType: string): string[];

  /**
   * Get default suggestions for error recovery
   */
  protected abstract getDefaultSuggestions(operationType: string, errorCategory: string): string[];
}

/**
 * Utility functions for common mock operations
 */
export const MockUtilities = {
  /**
   * Create a simple mock ID generator
   */
  createIdGenerator: (prefix: string = 'mock') => new MockIdGenerator(prefix),

  /**
   * Create a duration simulator with preset ranges
   */
  createDurationSimulator: (preset: 'fast' | 'normal' | 'slow' = 'normal') => {
    const ranges = {
      fast: { min: 10, max: 100 },
      normal: { min: 100, max: 2000 },
      slow: { min: 1000, max: 10000 }
    };
    return new MockDurationSimulator(ranges[preset]);
  },

  /**
   * Create success/failure logic with preset rates
   */
  createSuccessFailureLogic: (preset: 'reliable' | 'normal' | 'unreliable' = 'normal') => {
    const rates = {
      reliable: 0.98,
      normal: 0.9,
      unreliable: 0.7
    };
    return new MockSuccessFailureLogic(rates[preset]);
  },

  /**
   * Create error code generator with common prefixes
   */
  createErrorCodeGenerator: (domain: 'backup' | 'deployment' | 'parser' | 'general' = 'general') => {
    const prefixes = {
      backup: 'BACKUP',
      deployment: 'DEPLOY',
      parser: 'PARSE',
      general: 'MOCK'
    };
    return new MockErrorCodeGenerator(prefixes[domain]);
  },

  /**
   * Create message generator with domain-specific templates
   */
  createMessageGenerator: (domain?: string) => {
    const generator = new MockMessageGenerator();
    
    if (domain) {
      // Add domain-specific templates
      generator.addMessageTemplates('success', {
        [`${domain}_success`]: `${domain} operation completed successfully`,
        [`${domain}_success_detailed`]: `${domain} {operation} completed successfully with {details}`
      });
      
      generator.addMessageTemplates('failure', {
        [`${domain}_failure`]: `${domain} operation failed: {reason}`,
        [`${domain}_failure_detailed`]: `${domain} {operation} failed in {context}: {reason}`
      });
    }
    
    return generator;
  }
};

/**
 * Default export with all utilities
 */
export default {
  MockIdGenerator,
  MockDurationSimulator,
  MockSuccessFailureLogic,
  MockTimestampManager,
  MockErrorCodeGenerator,
  MockMessageGenerator,
  MockConfigurationManager,
  MockStateManager,
  BaseOperationMockFactory,
  MockUtilities
};