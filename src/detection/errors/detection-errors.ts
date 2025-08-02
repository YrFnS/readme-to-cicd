/**
 * Custom error classes for framework detection
 */

/**
 * Base error class for all detection-related errors
 */
export abstract class DetectionError extends Error {
  public readonly code: string;
  public readonly component: string;
  public readonly recoverable: boolean;
  public readonly context: Record<string, any>;

  constructor(
    message: string,
    code: string,
    component: string,
    recoverable: boolean = false,
    context: Record<string, any> = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.component = component;
    this.recoverable = recoverable;
    this.context = context;
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to structured log format
   */
  toLogFormat(): Record<string, any> {
    return {
      error: this.name,
      message: this.message,
      code: this.code,
      component: this.component,
      recoverable: this.recoverable,
      context: this.context,
      stack: this.stack
    };
  }
}

/**
 * Error thrown when file parsing fails
 */
export class ParseError extends DetectionError {
  constructor(
    message: string,
    filePath: string,
    line?: number,
    context: Record<string, any> = {}
  ) {
    const fullMessage = `Parse failed in ${filePath}${line ? ` at line ${line}` : ''}: ${message}`;
    super(fullMessage, 'PARSE_ERROR', 'parser', true, {
      filePath,
      line,
      ...context
    });
  }
}

/**
 * Error thrown when framework detection fails
 */
export class DetectionFailureError extends DetectionError {
  constructor(
    message: string,
    analyzer: string,
    context: Record<string, any> = {}
  ) {
    super(message, 'DETECTION_FAILURE', analyzer, true, context);
  }
}

/**
 * Error thrown when configuration is invalid
 */
export class ConfigurationError extends DetectionError {
  constructor(
    message: string,
    configFile: string,
    context: Record<string, any> = {}
  ) {
    super(message, 'CONFIGURATION_ERROR', 'configuration', false, {
      configFile,
      ...context
    });
  }
}

/**
 * Error thrown when file system operations fail
 */
export class FileSystemError extends DetectionError {
  constructor(
    message: string,
    operation: string,
    filePath: string,
    context: Record<string, any> = {}
  ) {
    super(message, 'FILESYSTEM_ERROR', 'filesystem', true, {
      operation,
      filePath,
      ...context
    });
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends DetectionError {
  constructor(
    message: string,
    validationType: string,
    context: Record<string, any> = {}
  ) {
    super(message, 'VALIDATION_ERROR', 'validation', false, {
      validationType,
      ...context
    });
  }
}

/**
 * Error thrown when integration between components fails
 */
export class IntegrationError extends DetectionError {
  constructor(
    message: string,
    sourceComponent: string,
    targetComponent: string,
    context: Record<string, any> = {}
  ) {
    super(message, 'INTEGRATION_ERROR', 'integration', true, {
      sourceComponent,
      targetComponent,
      ...context
    });
  }
}

/**
 * Error thrown when system resources are exhausted
 */
export class ResourceError extends DetectionError {
  constructor(
    message: string,
    resourceType: string,
    context: Record<string, any> = {}
  ) {
    super(message, 'RESOURCE_ERROR', 'system', false, {
      resourceType,
      ...context
    });
  }
}