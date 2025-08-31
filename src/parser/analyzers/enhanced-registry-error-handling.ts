/**
 * Error Handling Extensions for Enhanced Analyzer Registry
 * 
 * Provides comprehensive error handling, logging, and recovery mechanisms
 * for the analyzer registration system.
 */

import { 
  EnhancedAnalyzerRegistry,
  AnalyzerConfig,
  RegistrationResult,
  ValidationDetails,
  RegistrationFailure,
  RegistrationState,
  ValidationStatus
} from './enhanced-analyzer-registry';
import {
  AnalyzerRegistrationError,
  InterfaceValidationError,
  RegistrationStateError,
  isRegistrationError
} from './registration-errors';
import {
  RegistrationLogger,
  LogLevel,
  createRegistrationLogger
} from './registration-logger';

/**
 * Enhanced registry with comprehensive error handling and recovery
 */
export class ErrorHandlingAnalyzerRegistry extends EnhancedAnalyzerRegistry {
  private errorLogger: RegistrationLogger;

  constructor(options: any = {}) {
    super(options);
    this.errorLogger = createRegistrationLogger({
      enableConsoleOutput: options.enableLogging ?? true,
      logLevel: LogLevel.INFO
    });
  }

  /**
   * Register multiple analyzers with graceful partial failure handling
   */
  registerMultiple(analyzers: AnalyzerConfig[]): RegistrationResult[] {
    const results: RegistrationResult[] = [];
    const correlationId = this.generateCorrelationId();
    let successCount = 0;
    let failureCount = 0;

    this.errorLogger.logRegistrationStart(`batch-${analyzers.length}`, correlationId);
    
    // Sort by priority if specified
    const sortedAnalyzers = [...analyzers].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    for (const config of sortedAnalyzers) {
      if (config.enabled !== false) {
        try {
          const result = this.register(config.analyzer, config.name);
          results.push(result);
          
          if (result.success) {
            successCount++;
            this.errorLogger.logRegistrationSuccess(result, correlationId);
          } else {
            failureCount++;
            
            // Create appropriate error for logging
            const error = new AnalyzerRegistrationError(
              result.error || 'Registration failed',
              result.analyzerName,
              'registration'
            );
            this.errorLogger.logRegistrationFailure(result, error, correlationId);
            
            // Attempt recovery for failed registration
            if (this.shouldAttemptRecovery(result)) {
              const recoveryResult = this.attemptRecovery(config, correlationId);
              if (recoveryResult) {
                results[results.length - 1] = recoveryResult;
                if (recoveryResult.success) {
                  successCount++;
                  failureCount--;
                }
              }
            }
          }
        } catch (error) {
          failureCount++;
          const failureResult: RegistrationResult = {
            success: false,
            analyzerName: config.name,
            error: `Unexpected error during registration: ${error instanceof Error ? error.message : String(error)}`,
            registrationTimestamp: new Date()
          };
          results.push(failureResult);
          
          this.errorLogger.logRegistrationFailure(
            failureResult,
            error instanceof Error ? error : new Error(String(error)),
            correlationId
          );
        }
      }
    }

    return results;
  }

  /**
   * Get comprehensive error diagnostics
   */
  public getErrorDiagnostics(): RegistrationErrorDiagnostics {
    const diagnosticsReport = this.errorLogger.generateDiagnosticsReport();
    const state = this.getRegistrationState();
    
    return {
      totalFailures: state.failedRegistrations.length,
      failuresByAnalyzer: state.failedRegistrations.reduce((acc, failure) => {
        acc[failure.analyzerName] = failure;
        return acc;
      }, {} as Record<string, RegistrationFailure>),
      logDiagnostics: diagnosticsReport,
      recoveryRecommendations: this.generateRecoveryRecommendations()
    };
  }

  /**
   * Clear registry with comprehensive cleanup and logging
   */
  clearRegistry(): void {
    const previousState = this.getRegistrationState();
    const correlationId = this.generateCorrelationId();
    
    // Call parent clear method
    super.clearRegistry();
    
    // Log the state change
    const newState = this.getRegistrationState();
    this.errorLogger.logRegistryStateChange(previousState, newState, correlationId);
    
    // Clear logger entries related to this registry
    this.errorLogger.clearLogs();
  }





  /**
   * Generate recovery recommendations based on failure patterns
   */
  protected generateRecoveryRecommendations(): string[] {
    // Get failed analyzer names and create minimal failure objects for analysis
    const failedNames = this.getFailedAnalyzers();
    const failures: RegistrationFailure[] = failedNames.map(name => ({
      analyzerName: name,
      error: 'Registration failed',
      timestamp: new Date(),
      retryCount: 0
    }));
    const recommendations: string[] = [];

    if (failures.length === 0) {
      return ['No failures detected - system is healthy'];
    }

    // Analyze failure patterns
    const interfaceFailures = failures.filter(f => 
      f.validationDetails?.interfaceCompliance.isValid === false
    );
    
    const dependencyFailures = failures.filter(f => 
      f.validationDetails?.dependencyValidation.isValid === false
    );

    if (interfaceFailures.length > 0) {
      recommendations.push(
        `${interfaceFailures.length} analyzers failed interface validation. ` +
        'Review analyzer implementations for missing or invalid methods.'
      );
    }

    if (dependencyFailures.length > 0) {
      recommendations.push(
        `${dependencyFailures.length} analyzers have dependency issues. ` +
        'Ensure all required dependencies are registered first.'
      );
    }

    // High retry count indicates persistent issues
    const highRetryFailures = failures.filter(f => f.retryCount > 2);
    if (highRetryFailures.length > 0) {
      recommendations.push(
        `${highRetryFailures.length} analyzers have failed multiple times. ` +
        'Consider reviewing their implementation or removing them.'
      );
    }

    return recommendations;
  }

  /**
   * Generate a correlation ID for tracking related operations
   */
  private generateCorrelationId(): string {
    return `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Registration error diagnostics interface
 */
export interface RegistrationErrorDiagnostics {
  totalFailures: number;
  failuresByAnalyzer: Record<string, RegistrationFailure>;
  logDiagnostics: any; // RegistrationDiagnosticsReport from logger
  recoveryRecommendations: string[];
}

/**
 * Factory function to create an error-handling registry
 */
export function createErrorHandlingRegistry(options?: any): ErrorHandlingAnalyzerRegistry {
  return new ErrorHandlingAnalyzerRegistry(options);
}