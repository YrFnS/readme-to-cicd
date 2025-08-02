import { DetectionError, DetectionFailureError, ValidationError } from './detection-errors';

/**
 * Result type for operations that can fail
 */
export type Result<T, E = DetectionError> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 100,
  maxDelay: 2000,
  backoffMultiplier: 2,
  retryableErrors: ['FILESYSTEM_ERROR', 'PARSE_ERROR', 'DETECTION_FAILURE']
};

/**
 * Error recovery utilities
 */
export class ErrorRecovery {
  /**
   * Execute operation with retry logic
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<Result<T, DetectionError>> {
    const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: DetectionError | null = null;

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        const result = await operation();
        return { success: true, data: result };
      } catch (error) {
        const detectionError = error instanceof DetectionError 
          ? error 
          : new DetectionFailureError(
              error instanceof Error ? error.message : 'Unknown error',
              'unknown'
            );

        lastError = detectionError;

        // Don't retry if error is not recoverable or not in retryable list
        if (!detectionError.recoverable || 
            !finalConfig.retryableErrors.includes(detectionError.code)) {
          break;
        }

        // Don't retry on last attempt
        if (attempt === finalConfig.maxAttempts) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt - 1),
          finalConfig.maxDelay
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return { 
      success: false, 
      error: lastError || new DetectionFailureError('Operation failed', 'unknown')
    };
  }

  /**
   * Execute operation with graceful degradation
   */
  static async withFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    fallbackCondition?: (error: DetectionError) => boolean
  ): Promise<Result<T, DetectionError>> {
    try {
      const result = await primaryOperation();
      return { success: true, data: result };
    } catch (error) {
      const detectionError = error instanceof DetectionError 
        ? error 
        : new DetectionFailureError(
            error instanceof Error ? error.message : 'Unknown error',
            'unknown'
          );

      // Use fallback if condition is met or no condition provided
      if (!fallbackCondition || fallbackCondition(detectionError)) {
        try {
          const fallbackResult = await fallbackOperation();
          return { success: true, data: fallbackResult };
        } catch (fallbackError) {
          const fallbackDetectionError = fallbackError instanceof DetectionError 
            ? fallbackError 
            : new DetectionFailureError(
                fallbackError instanceof Error ? fallbackError.message : 'Unknown fallback error',
                'unknown'
              );
          
          return { success: false, error: fallbackDetectionError };
        }
      }

      return { success: false, error: detectionError };
    }
  }

  /**
   * Safely execute operation with error containment
   */
  static async safely<T>(
    operation: () => Promise<T>,
    defaultValue: T,
    onError?: (error: DetectionError) => void
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const detectionError = error instanceof DetectionError 
        ? error 
        : new DetectionFailureError(
            error instanceof Error ? error.message : 'Unknown error',
            'unknown'
          );

      if (onError) {
        onError(detectionError);
      }

      return defaultValue;
    }
  }

  /**
   * Validate input and return result
   */
  static validate<T>(
    value: T,
    validator: (value: T) => boolean,
    errorMessage: string,
    errorCode: string = 'VALIDATION_ERROR'
  ): Result<T, DetectionError> {
    if (validator(value)) {
      return { success: true, data: value };
    }

    return {
      success: false,
      error: new ValidationError(errorMessage, 'input-validation')
    };
  }
}