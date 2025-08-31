/**
 * Custom Error Classes for Analyzer Registration
 * 
 * Provides specific error types for different registration failure scenarios
 * with detailed context and recovery information.
 */

import { ValidationDetails, RegistrationState } from './enhanced-analyzer-registry';

/**
 * Base class for all analyzer registration errors
 */
export abstract class AnalyzerRegistrationBaseError extends Error {
  public readonly timestamp: Date;
  public readonly correlationId: string;
  
  constructor(
    message: string,
    public readonly analyzerName: string,
    public readonly registrationPhase: string
  ) {
    super(`Analyzer registration failed for '${analyzerName}' during ${registrationPhase}: ${message}`);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.correlationId = this.generateCorrelationId();
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Generate a unique correlation ID for tracking
   */
  private generateCorrelationId(): string {
    return `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get structured error data for logging
   */
  public getStructuredData(): Record<string, any> {
    return {
      errorType: this.name,
      analyzerName: this.analyzerName,
      registrationPhase: this.registrationPhase,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      correlationId: this.correlationId
    };
  }

  /**
   * Get recovery suggestions for this error type
   */
  public abstract getRecoverySuggestions(): string[];
}

/**
 * Error thrown when analyzer registration fails due to system issues
 */
export class AnalyzerRegistrationError extends AnalyzerRegistrationBaseError {
  constructor(
    message: string,
    analyzerName: string,
    registrationPhase: string,
    public readonly cause?: Error
  ) {
    super(message, analyzerName, registrationPhase);
    
    if (cause) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }

  public getRecoverySuggestions(): string[] {
    return [
      'Verify the analyzer implementation is correct',
      'Check if all required dependencies are available',
      'Ensure the analyzer name is unique',
      'Validate the analyzer configuration',
      'Try registering the analyzer again after fixing issues'
    ];
  }

  public getStructuredData(): Record<string, any> {
    const baseData = super.getStructuredData();
    return {
      ...baseData,
      cause: this.cause ? {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack
      } : null
    };
  }
}

/**
 * Error thrown when analyzer interface validation fails
 */
export class InterfaceValidationError extends AnalyzerRegistrationBaseError {
  constructor(
    message: string,
    analyzerName: string,
    public readonly missingMethods: string[],
    public readonly invalidMethods: string[],
    public readonly validationDetails?: ValidationDetails
  ) {
    super(message, analyzerName, 'interface-validation');
  }

  public getRecoverySuggestions(): string[] {
    const suggestions = [
      'Ensure the analyzer implements the AnalyzerInterface correctly'
    ];

    if (this.missingMethods.length > 0) {
      suggestions.push(`Implement missing methods: ${this.missingMethods.join(', ')}`);
    }

    if (this.invalidMethods.length > 0) {
      suggestions.push(`Fix invalid method implementations: ${this.invalidMethods.join(', ')}`);
    }

    suggestions.push(
      'Verify method signatures match the interface requirements',
      'Check that all methods return the expected types',
      'Ensure the analyzer name property is a non-empty string'
    );

    return suggestions;
  }

  public getStructuredData(): Record<string, any> {
    const baseData = super.getStructuredData();
    return {
      ...baseData,
      missingMethods: this.missingMethods,
      invalidMethods: this.invalidMethods,
      validationDetails: this.validationDetails ? {
        interfaceCompliance: this.validationDetails.interfaceCompliance,
        dependencyValidation: this.validationDetails.dependencyValidation,
        capabilityValidation: this.validationDetails.capabilityValidation
      } : null
    };
  }
}

/**
 * Error thrown when registration state becomes inconsistent
 */
export class RegistrationStateError extends AnalyzerRegistrationBaseError {
  constructor(
    message: string,
    public readonly currentState: RegistrationState,
    public readonly expectedState?: Partial<RegistrationState>
  ) {
    super(message, 'registry', 'state-management');
  }

  public getRecoverySuggestions(): string[] {
    return [
      'Clear the registry and re-register all analyzers',
      'Validate the current registration state',
      'Check for concurrent registration operations',
      'Ensure proper synchronization in multi-threaded environments',
      'Review recent registration operations for conflicts'
    ];
  }

  public getStructuredData(): Record<string, any> {
    const baseData = super.getStructuredData();
    return {
      ...baseData,
      currentState: {
        registeredAnalyzersCount: this.currentState.registeredAnalyzers.size,
        registrationOrder: this.currentState.registrationOrder,
        failedRegistrationsCount: this.currentState.failedRegistrations.length,
        validationStatus: this.currentState.validationStatus,
        registrationTimestamp: this.currentState.registrationTimestamp.toISOString()
      },
      expectedState: this.expectedState
    };
  }
}

/**
 * Error thrown when analyzer dependency resolution fails
 */
export class DependencyResolutionError extends AnalyzerRegistrationBaseError {
  constructor(
    message: string,
    analyzerName: string,
    public readonly missingDependencies: string[],
    public readonly circularDependencies: string[]
  ) {
    super(message, analyzerName, 'dependency-resolution');
  }

  public getRecoverySuggestions(): string[] {
    const suggestions = [];

    if (this.missingDependencies.length > 0) {
      suggestions.push(`Register missing dependencies first: ${this.missingDependencies.join(', ')}`);
    }

    if (this.circularDependencies.length > 0) {
      suggestions.push(`Resolve circular dependencies: ${this.circularDependencies.join(' -> ')}`);
    }

    suggestions.push(
      'Review analyzer dependency declarations',
      'Consider breaking circular dependencies by refactoring',
      'Register analyzers in dependency order'
    );

    return suggestions;
  }

  public getStructuredData(): Record<string, any> {
    const baseData = super.getStructuredData();
    return {
      ...baseData,
      missingDependencies: this.missingDependencies,
      circularDependencies: this.circularDependencies
    };
  }
}

/**
 * Error thrown when registration timeout occurs
 */
export class RegistrationTimeoutError extends AnalyzerRegistrationBaseError {
  constructor(
    message: string,
    analyzerName: string,
    public readonly timeoutMs: number,
    public readonly elapsedMs: number
  ) {
    super(message, analyzerName, 'timeout');
  }

  public getRecoverySuggestions(): string[] {
    return [
      'Increase the registration timeout value',
      'Optimize analyzer initialization code',
      'Check for blocking operations in analyzer constructor',
      'Verify system resources are available',
      'Consider registering analyzers asynchronously'
    ];
  }

  public getStructuredData(): Record<string, any> {
    const baseData = super.getStructuredData();
    return {
      ...baseData,
      timeoutMs: this.timeoutMs,
      elapsedMs: this.elapsedMs,
      timeoutRatio: this.elapsedMs / this.timeoutMs
    };
  }
}

/**
 * Utility function to create appropriate error based on failure type
 */
export function createRegistrationError(
  errorType: 'registration' | 'interface' | 'state' | 'dependency' | 'timeout',
  message: string,
  context: any
): AnalyzerRegistrationBaseError {
  switch (errorType) {
    case 'registration':
      return new AnalyzerRegistrationError(
        message,
        context.analyzerName || 'unknown',
        context.phase || 'unknown',
        context.cause
      );

    case 'interface':
      return new InterfaceValidationError(
        message,
        context.analyzerName || 'unknown',
        context.missingMethods || [],
        context.invalidMethods || [],
        context.validationDetails
      );

    case 'state':
      return new RegistrationStateError(
        message,
        context.currentState,
        context.expectedState
      );

    case 'dependency':
      return new DependencyResolutionError(
        message,
        context.analyzerName || 'unknown',
        context.missingDependencies || [],
        context.circularDependencies || []
      );

    case 'timeout':
      return new RegistrationTimeoutError(
        message,
        context.analyzerName || 'unknown',
        context.timeoutMs || 0,
        context.elapsedMs || 0
      );

    default:
      return new AnalyzerRegistrationError(
        message,
        context.analyzerName || 'unknown',
        'unknown'
      );
  }
}

/**
 * Type guard to check if an error is a registration error
 */
export function isRegistrationError(error: any): error is AnalyzerRegistrationBaseError {
  return error instanceof AnalyzerRegistrationBaseError;
}

/**
 * Extract error information for logging
 */
export function extractErrorInfo(error: any): Record<string, any> {
  if (isRegistrationError(error)) {
    return error.getStructuredData();
  }

  if (error instanceof Error) {
    return {
      errorType: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
  }

  return {
    errorType: 'UnknownError',
    message: String(error),
    timestamp: new Date().toISOString()
  };
}