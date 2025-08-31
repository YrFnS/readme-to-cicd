/**
 * Enhanced Analyzer Registry System
 * 
 * Provides robust analyzer registration with validation, error handling,
 * and comprehensive reporting for both built-in and custom analyzers.
 */

import { MarkdownAST } from '../../shared/markdown-parser';
import { AnalyzerResult, ParseError } from '../types';
import { AnalysisContext } from '../../shared/types/analysis-context';
import { 
  AnalyzerRegistrationError,
  InterfaceValidationError,
  RegistrationStateError,
  DependencyResolutionError,
  RegistrationTimeoutError,
  createRegistrationError,
  isRegistrationError
} from './registration-errors';
import { 
  RegistrationLogger,
  registrationLogger,
  LogLevel 
} from './registration-logger';
import { RegistrationErrorDiagnostics } from './enhanced-registry-error-handling';

/**
 * Core analyzer interface that all analyzers must implement
 */
export interface AnalyzerInterface<T = any> {
  readonly name: string;
  analyze(ast: MarkdownAST, content: string, context?: AnalysisContext): Promise<AnalyzerResult<T>>;
  getCapabilities(): AnalyzerCapabilities;
  validateInterface(): boolean;
}

/**
 * Analyzer capabilities definition
 */
export interface AnalyzerCapabilities {
  supportedContentTypes: string[];
  requiresContext: boolean;
  canProcessLargeFiles: boolean;
  estimatedProcessingTime: number;
  dependencies: string[];
}

/**
 * Configuration for registering an analyzer
 */
export interface AnalyzerConfig {
  name: string;
  analyzer: AnalyzerInterface;
  dependencies?: string[];
  priority?: number;
  enabled?: boolean;
  metadata?: AnalyzerMetadata;
}

/**
 * Additional metadata for analyzers
 */
export interface AnalyzerMetadata {
  version?: string;
  author?: string;
  description?: string;
  tags?: string[];
  isCustom?: boolean;
}

/**
 * Result of analyzer registration operation
 */
export interface RegistrationResult {
  success: boolean;
  analyzerName: string;
  error?: string;
  validationDetails?: ValidationDetails;
  registrationTimestamp?: Date;
  warnings?: string[];
}

/**
 * Detailed validation information
 */
export interface ValidationDetails {
  interfaceCompliance: InterfaceValidationResult;
  dependencyValidation: DependencyValidationResult;
  capabilityValidation: CapabilityValidationResult;
}

/**
 * Interface validation result
 */
export interface InterfaceValidationResult {
  isValid: boolean;
  missingMethods: string[];
  invalidMethods: string[];
  complianceScore: number;
  details: string[];
}

/**
 * Dependency validation result
 */
export interface DependencyValidationResult {
  isValid: boolean;
  missingDependencies: string[];
  circularDependencies: string[];
  resolutionOrder: string[];
}

/**
 * Capability validation result
 */
export interface CapabilityValidationResult {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
}

/**
 * Registration options for controlling registry behavior
 */
export interface RegistrationOptions {
  validateInterfaces: boolean;
  allowDuplicates: boolean;
  failOnError: boolean;
  registrationTimeout: number;
  enableLogging: boolean;
}

/**
 * Registry state information
 */
export interface RegistrationState {
  registeredAnalyzers: Map<string, AnalyzerInterface>;
  registrationOrder: string[];
  failedRegistrations: RegistrationFailure[];
  registrationTimestamp: Date;
  validationStatus: ValidationStatus;
  options: RegistrationOptions;
}

/**
 * Information about failed registrations
 */
export interface RegistrationFailure {
  analyzerName: string;
  error: string;
  timestamp: Date;
  retryCount: number;
  validationDetails?: ValidationDetails;
}

/**
 * Overall validation status
 */
export enum ValidationStatus {
  PENDING = 'pending',
  VALID = 'valid',
  INVALID = 'invalid',
  PARTIAL = 'partial'
}

/**
 * Analyzer status information
 */
export interface AnalyzerStatus {
  name: string;
  isRegistered: boolean;
  registrationTimestamp?: Date;
  registrationOrder?: number;
  dependencies: string[];
  dependents: string[];
  status: 'registered' | 'failed' | 'pending';
  lastError?: string;
  retryCount: number;
}

/**
 * Registration statistics
 */
export interface RegistrationStatistics {
  totalAnalyzers: number;
  registeredAnalyzers: number;
  failedAnalyzers: number;
  pendingAnalyzers: number;
  successRate: number;
  averageRegistrationTime: number;
  dependencyChainLength: number;
}

/**
 * Enhanced Analyzer Registry Interface
 */
export interface AnalyzerRegistry {
  register(analyzer: AnalyzerInterface, name: string): RegistrationResult;
  registerMultiple(analyzers: AnalyzerConfig[]): RegistrationResult[];
  getRegisteredAnalyzers(): string[];
  getAnalyzer(name: string): AnalyzerInterface | null;
  validateRegistration(): ValidationResult;
  clearRegistry(): void;
  getRegistrationState(): RegistrationState;
  setRegistrationOptions(options: Partial<RegistrationOptions>): void;
  
  // State management methods
  isAnalyzerRegistered(name: string): boolean;
  getAnalyzerStatus(name: string): AnalyzerStatus | null;
  getRegistrationOrder(): string[];
  getDependencyOrder(): string[];
  getAvailableAnalyzers(): string[];
  getFailedAnalyzers(): string[];
  getRegistrationStatistics(): RegistrationStatistics;
  resolveDependencies(analyzers: AnalyzerConfig[]): string[];
}

/**
 * Validation result for the entire registry
 */
export interface ValidationResult {
  isValid: boolean;
  totalAnalyzers: number;
  validAnalyzers: number;
  invalidAnalyzers: number;
  issues: ValidationIssue[];
  recommendations: string[];
}

/**
 * Individual validation issue
 */
export interface ValidationIssue {
  analyzerName: string;
  type: 'interface' | 'dependency' | 'capability' | 'configuration';
  severity: 'error' | 'warning' | 'info';
  message: string;
  details?: any;
}
/**

 * Default registration options
 */
const DEFAULT_REGISTRATION_OPTIONS: RegistrationOptions = {
  validateInterfaces: true,
  allowDuplicates: false,
  failOnError: false,
  registrationTimeout: 5000,
  enableLogging: true
};

/**
 * Enhanced Analyzer Registry Implementation
 */
export class EnhancedAnalyzerRegistry implements AnalyzerRegistry {
  private state: RegistrationState;
  private validator: RegistrationValidator;
  private logger: RegistrationLogger;

  constructor(options: Partial<RegistrationOptions> = {}) {
    this.state = {
      registeredAnalyzers: new Map(),
      registrationOrder: [],
      failedRegistrations: [],
      registrationTimestamp: new Date(),
      validationStatus: ValidationStatus.PENDING,
      options: { ...DEFAULT_REGISTRATION_OPTIONS, ...options }
    };
    this.validator = new RegistrationValidator();
    this.logger = registrationLogger;
  }

  /**
   * Register a single analyzer with comprehensive error handling and recovery
   */
  register(analyzer: AnalyzerInterface, name?: string): RegistrationResult {
    const analyzerName = name || analyzer.name;
    const timestamp = new Date();
    const correlationId = this.logger.logRegistrationStart(analyzerName);
    const previousState = { ...this.state };

    try {
      // Validate analyzer is not null/undefined
      if (!analyzer) {
        const error = new AnalyzerRegistrationError(
          'Analyzer cannot be null or undefined',
          analyzerName,
          'pre-validation'
        );
        this.handleRegistrationError(error, correlationId);
        return this.createFailureResult(analyzerName, error, timestamp);
      }

      // Check for duplicates
      if (!this.state.options.allowDuplicates && this.state.registeredAnalyzers.has(analyzerName)) {
        const error = new AnalyzerRegistrationError(
          `Analyzer '${analyzerName}' is already registered`,
          analyzerName,
          'duplicate-check'
        );
        this.handleRegistrationError(error, correlationId);
        return this.createFailureResult(analyzerName, error, timestamp);
      }

      // Validate interface if enabled
      let validationDetails: ValidationDetails | undefined;
      if (this.state.options.validateInterfaces) {
        this.logger.logValidationStart(analyzerName, correlationId);
        
        try {
          validationDetails = this.validator.validateAnalyzer(analyzer);
          
          if (!validationDetails.interfaceCompliance.isValid) {
            const error = new InterfaceValidationError(
              `Interface validation failed: ${validationDetails.interfaceCompliance.details.join(', ')}`,
              analyzerName,
              validationDetails.interfaceCompliance.missingMethods,
              validationDetails.interfaceCompliance.invalidMethods,
              validationDetails
            );

            this.logger.logInterfaceValidationFailure(
              analyzerName,
              validationDetails.interfaceCompliance.missingMethods,
              validationDetails.interfaceCompliance.invalidMethods,
              correlationId
            );

            this.recordFailedRegistration(analyzerName, error.message, validationDetails);
            
            if (this.state.options.failOnError) {
              this.handleRegistrationError(error, correlationId);
              return this.createFailureResult(analyzerName, error, timestamp, validationDetails);
            } else {
              // Graceful handling: log warning but continue
              this.logger.logRecoveryAttempt(
                analyzerName, 
                'continue-with-invalid-interface', 
                correlationId
              );
            }
          }

          // Check dependency validation
          if (!validationDetails.dependencyValidation.isValid) {
            const depError = new DependencyResolutionError(
              'Dependency validation failed',
              analyzerName,
              validationDetails.dependencyValidation.missingDependencies,
              validationDetails.dependencyValidation.circularDependencies
            );

            this.logger.logDependencyResolutionFailure(
              analyzerName,
              validationDetails.dependencyValidation.missingDependencies,
              validationDetails.dependencyValidation.circularDependencies,
              correlationId
            );

            if (this.state.options.failOnError) {
              this.handleRegistrationError(depError, correlationId);
              return this.createFailureResult(analyzerName, depError, timestamp, validationDetails);
            }
          }

        } catch (validationError) {
          const error = new AnalyzerRegistrationError(
            `Validation process failed: ${validationError instanceof Error ? validationError.message : String(validationError)}`,
            analyzerName,
            'validation',
            validationError instanceof Error ? validationError : undefined
          );
          this.handleRegistrationError(error, correlationId);
          return this.createFailureResult(analyzerName, error, timestamp);
        }
      }

      // Attempt registration with timeout
      const registrationPromise = this.performRegistration(analyzer, analyzerName);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new RegistrationTimeoutError(
            `Registration timeout after ${this.state.options.registrationTimeout}ms`,
            analyzerName,
            this.state.options.registrationTimeout,
            this.state.options.registrationTimeout
          ));
        }, this.state.options.registrationTimeout);
      });

      // Wait for registration or timeout
      Promise.race([registrationPromise, timeoutPromise])
        .catch(error => {
          if (error instanceof RegistrationTimeoutError) {
            this.handleRegistrationError(error, correlationId);
          }
        });

      // Register the analyzer (synchronous for now)
      // Even if validation fails, we register with warnings when failOnError is false
      this.state.registeredAnalyzers.set(analyzerName, analyzer);
      this.state.registrationOrder.push(analyzerName);

      // Log state change
      this.logger.logRegistryStateChange(previousState, this.state, correlationId);

      const result: RegistrationResult = {
        success: true,
        analyzerName,
        validationDetails,
        registrationTimestamp: timestamp,
        warnings: validationDetails?.interfaceCompliance.isValid === false ? 
          ['Interface validation failed but registration continued'] : undefined
      };

      this.logger.logRegistrationSuccess(result, correlationId);
      return result;

    } catch (error) {
      const registrationError = error instanceof Error ? 
        new AnalyzerRegistrationError(error.message, analyzerName, 'registration', error) :
        new AnalyzerRegistrationError(String(error), analyzerName, 'registration');

      this.handleRegistrationError(registrationError, correlationId);
      return this.createFailureResult(analyzerName, registrationError, timestamp);
    }
  }

  /**
   * Register multiple analyzers with graceful partial failure handling
   */
  registerMultiple(analyzers: AnalyzerConfig[]): RegistrationResult[] {
    const results: RegistrationResult[] = [];
    const correlationId = this.logger.generateCorrelationId();
    let successCount = 0;
    let failureCount = 0;

    this.logger.log(LogLevel.INFO, 'batch_registration_started', {
      message: `Starting batch registration of ${analyzers.length} analyzers`,
      correlationId,
      data: { 
        totalAnalyzers: analyzers.length,
        analyzerNames: analyzers.map(a => a.name)
      }
    });
    
    // Sort by priority if specified
    const sortedAnalyzers = [...analyzers].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    for (const config of sortedAnalyzers) {
      if (config.enabled !== false) {
        try {
          const result = this.register(config.analyzer, config.name);
          results.push(result);
          
          if (result.success) {
            successCount++;
          } else {
            failureCount++;
            
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
          
          this.logger.logRegistrationFailure(
            failureResult,
            error instanceof Error ? error : new Error(String(error)),
            correlationId
          );
        }
      } else {
        // Log skipped analyzer
        this.logger.log(LogLevel.DEBUG, 'analyzer_skipped', {
          message: `Skipping disabled analyzer: ${config.name}`,
          correlationId,
          data: { analyzerName: config.name }
        });
      }
    }

    // Log batch registration summary
    this.logger.log(LogLevel.INFO, 'batch_registration_completed', {
      message: `Batch registration completed: ${successCount} successful, ${failureCount} failed`,
      correlationId,
      data: {
        totalAnalyzers: analyzers.length,
        successCount,
        failureCount,
        successRate: analyzers.length > 0 ? successCount / analyzers.length : 0
      }
    });
    
    return results;
  }

  /**
   * Get list of registered analyzer names
   */
  getRegisteredAnalyzers(): string[] {
    return Array.from(this.state.registeredAnalyzers.keys());
  }

  /**
   * Get analyzer instance by name
   */
  getAnalyzer(name: string): AnalyzerInterface | null {
    return this.state.registeredAnalyzers.get(name) || null;
  }

  /**
   * Validate the entire registry
   */
  validateRegistration(): ValidationResult {
    const issues: ValidationIssue[] = [];
    const recommendations: string[] = [];
    let validAnalyzers = 0;

    for (const [name, analyzer] of this.state.registeredAnalyzers) {
      try {
        const validationDetails = this.validator.validateAnalyzer(analyzer);
        
        if (validationDetails.interfaceCompliance.isValid) {
          validAnalyzers++;
        } else {
          issues.push({
            analyzerName: name,
            type: 'interface',
            severity: 'error',
            message: `Interface validation failed: ${validationDetails.interfaceCompliance.details.join(', ')}`,
            details: validationDetails.interfaceCompliance
          });
        }

        // Check dependencies
        if (!validationDetails.dependencyValidation.isValid) {
          issues.push({
            analyzerName: name,
            type: 'dependency',
            severity: 'warning',
            message: `Dependency issues: ${validationDetails.dependencyValidation.missingDependencies.join(', ')}`,
            details: validationDetails.dependencyValidation
          });
        }

      } catch (error) {
        issues.push({
          analyzerName: name,
          type: 'configuration',
          severity: 'error',
          message: `Validation error: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }

    // Generate recommendations
    if (this.state.registeredAnalyzers.size === 0) {
      recommendations.push('No analyzers registered');
    }
    
    if (this.state.failedRegistrations.length > 0) {
      recommendations.push(`${this.state.failedRegistrations.length} failed registrations. Check logs for details.`);
    }

    const totalAnalyzers = this.state.registeredAnalyzers.size;
    const isValid = issues.filter(i => i.severity === 'error').length === 0;

    // Update validation status
    this.state.validationStatus = isValid ? ValidationStatus.VALID : 
      (validAnalyzers > 0 ? ValidationStatus.PARTIAL : ValidationStatus.INVALID);

    return {
      isValid,
      totalAnalyzers,
      validAnalyzers,
      invalidAnalyzers: totalAnalyzers - validAnalyzers,
      issues,
      recommendations
    };
  }

  /**
   * Clear all registered analyzers
   */
  clearRegistry(): void {
    this.state.registeredAnalyzers.clear();
    this.state.registrationOrder = [];
    this.state.failedRegistrations = [];
    this.state.validationStatus = ValidationStatus.PENDING;
    
    if (this.state.options.enableLogging) {
      console.log('Registry cleared');
    }
  }

  /**
   * Get current registration state
   */
  getRegistrationState(): RegistrationState {
    return { ...this.state };
  }

  /**
   * Update registration options
   */
  setRegistrationOptions(options: Partial<RegistrationOptions>): void {
    this.state.options = { ...this.state.options, ...options };
  }

  /**
   * Record a failed registration
   */
  private recordFailedRegistration(
    analyzerName: string, 
    error: string, 
    validationDetails?: ValidationDetails
  ): void {
    const existingFailure = this.state.failedRegistrations.find(f => f.analyzerName === analyzerName);
    
    if (existingFailure) {
      existingFailure.retryCount++;
      existingFailure.error = error;
      existingFailure.timestamp = new Date();
      existingFailure.validationDetails = validationDetails;
    } else {
      this.state.failedRegistrations.push({
        analyzerName,
        error,
        timestamp: new Date(),
        retryCount: 0,
        validationDetails
      });
    }

    // Log the failure with structured data
    this.logger.log(LogLevel.ERROR, 'registration_failure_recorded', {
      message: `Recorded registration failure for analyzer: ${analyzerName}`,
      correlationId: this.logger.generateCorrelationId(),
      data: {
        analyzerName,
        error,
        retryCount: existingFailure?.retryCount || 0,
        validationDetails
      }
    });
  }

  /**
   * Handle registration errors with comprehensive logging and recovery
   */
  private handleRegistrationError(error: Error, correlationId: string): void {
    if (isRegistrationError(error)) {
      // Log structured error information
      this.logger.log(LogLevel.ERROR, 'registration_error_detailed', {
        message: error.message,
        correlationId,
        error: error.getStructuredData()
      });

      // Log recovery suggestions
      const suggestions = error.getRecoverySuggestions();
      if (suggestions.length > 0) {
        this.logger.log(LogLevel.INFO, 'recovery_suggestions', {
          message: `Recovery suggestions for ${error.analyzerName}`,
          correlationId,
          data: { 
            analyzerName: error.analyzerName,
            suggestions 
          }
        });
      }
    } else {
      // Log generic error
      this.logger.log(LogLevel.ERROR, 'registration_error_generic', {
        message: error.message,
        correlationId,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      });
    }
  }

  /**
   * Create a standardized failure result
   */
  private createFailureResult(
    analyzerName: string,
    error: Error,
    timestamp: Date,
    validationDetails?: ValidationDetails
  ): RegistrationResult {
    return {
      success: false,
      analyzerName,
      error: error.message,
      validationDetails,
      registrationTimestamp: timestamp
    };
  }

  /**
   * Perform the actual registration (can be made async in the future)
   */
  private async performRegistration(analyzer: AnalyzerInterface, name: string): Promise<void> {
    // This is where we could add async registration logic
    // For now, it's synchronous but structured for future async support
    return Promise.resolve();
  }

  /**
   * Determine if recovery should be attempted for a failed registration
   */
  protected shouldAttemptRecovery(result: RegistrationResult): boolean {
    // Don't attempt recovery for certain types of errors
    if (result.error?.includes('already registered') || 
        result.error?.includes('null or undefined')) {
      return false;
    }

    // Attempt recovery for interface validation failures
    if (result.validationDetails?.interfaceCompliance.isValid === false) {
      return true;
    }

    // Attempt recovery for dependency issues
    if (result.validationDetails?.dependencyValidation.isValid === false) {
      return true;
    }

    return false;
  }

  /**
   * Attempt to recover from registration failure
   */
  protected attemptRecovery(config: AnalyzerConfig, correlationId: string): RegistrationResult | null {
    this.logger.logRecoveryAttempt(config.name, 'interface-fix-attempt', correlationId);

    try {
      // Strategy 1: Try with relaxed validation
      const originalValidateInterfaces = this.state.options.validateInterfaces;
      this.state.options.validateInterfaces = false;

      const recoveryResult = this.register(config.analyzer, config.name);

      // Restore original validation setting
      this.state.options.validateInterfaces = originalValidateInterfaces;

      if (recoveryResult.success) {
        this.logger.logRecoverySuccess(config.name, 'relaxed-validation', correlationId);
        return {
          ...recoveryResult,
          warnings: [
            ...(recoveryResult.warnings || []),
            'Registered with relaxed validation due to interface issues'
          ]
        };
      }

    } catch (recoveryError) {
      this.logger.logRecoveryFailure(
        config.name,
        'relaxed-validation',
        recoveryError instanceof Error ? recoveryError : new Error(String(recoveryError)),
        correlationId
      );
    }

    return null;
  }

  /**
   * Get comprehensive error diagnostics
   */
  public getErrorDiagnostics(): RegistrationErrorDiagnostics {
    const diagnosticsReport = this.logger.generateDiagnosticsReport();
    
    return {
      totalFailures: this.state.failedRegistrations.length,
      failuresByAnalyzer: this.state.failedRegistrations.reduce((acc, failure) => {
        acc[failure.analyzerName] = failure;
        return acc;
      }, {} as Record<string, RegistrationFailure>),
      logDiagnostics: diagnosticsReport,
      recoveryRecommendations: this.generateRecoveryRecommendations()
    };
  }

  /**
   * Generate recovery recommendations based on failure patterns
   */
  protected generateRecoveryRecommendations(): string[] {
    const recommendations: string[] = [];
    const failures = this.state.failedRegistrations;

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
   * Check if an analyzer is registered
   */
  isAnalyzerRegistered(name: string): boolean {
    return this.state.registeredAnalyzers.has(name);
  }

  /**
   * Get detailed status information for an analyzer
   */
  getAnalyzerStatus(name: string): AnalyzerStatus | null {
    const isRegistered = this.state.registeredAnalyzers.has(name);
    const failure = this.state.failedRegistrations.find(f => f.analyzerName === name);
    const registrationIndex = this.state.registrationOrder.indexOf(name);

    if (!isRegistered && !failure) {
      return null; // Analyzer not known to the system
    }

    // Get dependencies and dependents
    const analyzer = this.state.registeredAnalyzers.get(name);
    const dependencies = analyzer?.getCapabilities?.()?.dependencies || [];
    const dependents = this.findDependents(name);

    return {
      name,
      isRegistered,
      registrationTimestamp: isRegistered ? this.state.registrationTimestamp : failure?.timestamp,
      registrationOrder: registrationIndex >= 0 ? registrationIndex : undefined,
      dependencies,
      dependents,
      status: isRegistered ? 'registered' : (failure ? 'failed' : 'pending'),
      lastError: failure?.error,
      retryCount: failure?.retryCount || 0
    };
  }

  /**
   * Get the registration order of all analyzers
   */
  getRegistrationOrder(): string[] {
    return [...this.state.registrationOrder];
  }

  /**
   * Get analyzers ordered by their dependencies (topological sort)
   */
  getDependencyOrder(): string[] {
    const analyzers = Array.from(this.state.registeredAnalyzers.entries());
    return this.resolveDependencies(
      analyzers.map(([name, analyzer]) => ({
        name,
        analyzer,
        dependencies: analyzer.getCapabilities?.()?.dependencies || []
      }))
    );
  }

  /**
   * Get list of available (successfully registered) analyzers
   */
  getAvailableAnalyzers(): string[] {
    return Array.from(this.state.registeredAnalyzers.keys());
  }

  /**
   * Get list of failed analyzer registrations
   */
  getFailedAnalyzers(): string[] {
    return this.state.failedRegistrations.map(f => f.analyzerName);
  }

  /**
   * Get comprehensive registration statistics
   */
  getRegistrationStatistics(): RegistrationStatistics {
    const totalAnalyzers = this.state.registeredAnalyzers.size + this.state.failedRegistrations.length;
    const registeredAnalyzers = this.state.registeredAnalyzers.size;
    const failedAnalyzers = this.state.failedRegistrations.length;
    const pendingAnalyzers = 0; // Currently no pending state, but could be added
    
    const successRate = totalAnalyzers > 0 ? registeredAnalyzers / totalAnalyzers : 0;
    
    // Calculate average registration time (simplified - would need timing data)
    const averageRegistrationTime = 0; // Would need to track registration times
    
    // Calculate dependency chain length
    const dependencyChainLength = this.calculateMaxDependencyChainLength();

    return {
      totalAnalyzers,
      registeredAnalyzers,
      failedAnalyzers,
      pendingAnalyzers,
      successRate,
      averageRegistrationTime,
      dependencyChainLength
    };
  }

  /**
   * Resolve dependencies and return analyzers in dependency order
   */
  resolveDependencies(analyzers: AnalyzerConfig[]): string[] {
    const dependencyGraph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    
    // Build dependency graph
    for (const config of analyzers) {
      const dependencies = config.dependencies || [];
      dependencyGraph.set(config.name, dependencies);
      inDegree.set(config.name, dependencies.length);
      
      // Ensure all dependencies are in the graph
      for (const dep of dependencies) {
        if (!inDegree.has(dep)) {
          inDegree.set(dep, 0);
        }
      }
    }

    // Topological sort using Kahn's algorithm
    const result: string[] = [];
    const queue: string[] = [];
    
    // Find nodes with no incoming edges
    for (const [name, degree] of inDegree) {
      if (degree === 0) {
        queue.push(name);
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      // Process all analyzers that depend on current
      for (const [name, dependencies] of dependencyGraph) {
        if (dependencies.includes(current)) {
          const newDegree = inDegree.get(name)! - 1;
          inDegree.set(name, newDegree);
          
          if (newDegree === 0) {
            queue.push(name);
          }
        }
      }
    }

    // Check for circular dependencies
    if (result.length !== analyzers.length) {
      this.logger.log(LogLevel.WARN, 'circular_dependency_detected', {
        message: 'Circular dependency detected in analyzer configuration',
        correlationId: this.logger.generateCorrelationId(),
        data: {
          expectedCount: analyzers.length,
          resolvedCount: result.length,
          unresolvedAnalyzers: analyzers
            .map(a => a.name)
            .filter(name => !result.includes(name))
        }
      });
    }

    return result;
  }

  /**
   * Find analyzers that depend on the given analyzer
   */
  private findDependents(analyzerName: string): string[] {
    const dependents: string[] = [];
    
    for (const [name, analyzer] of this.state.registeredAnalyzers) {
      const dependencies = analyzer.getCapabilities?.()?.dependencies || [];
      if (dependencies.includes(analyzerName)) {
        dependents.push(name);
      }
    }
    
    return dependents;
  }

  /**
   * Calculate the maximum dependency chain length
   */
  private calculateMaxDependencyChainLength(): number {
    let maxLength = 0;
    
    for (const [name] of this.state.registeredAnalyzers) {
      const chainLength = this.calculateDependencyChainLength(name, new Set());
      maxLength = Math.max(maxLength, chainLength);
    }
    
    return maxLength;
  }

  /**
   * Calculate dependency chain length for a specific analyzer
   */
  private calculateDependencyChainLength(analyzerName: string, visited: Set<string>): number {
    if (visited.has(analyzerName)) {
      return 0; // Circular dependency, return 0 to avoid infinite recursion
    }
    
    visited.add(analyzerName);
    
    const analyzer = this.state.registeredAnalyzers.get(analyzerName);
    if (!analyzer) {
      return 0;
    }
    
    const dependencies = analyzer.getCapabilities?.()?.dependencies || [];
    if (dependencies.length === 0) {
      return 1;
    }
    
    let maxDepth = 0;
    for (const dep of dependencies) {
      const depthFromDep = this.calculateDependencyChainLength(dep, new Set(visited));
      maxDepth = Math.max(maxDepth, depthFromDep);
    }
    
    return maxDepth + 1;
  }
}/**
 *
 Registration Validator for analyzer interface compliance
 */
export class RegistrationValidator {
  
  /**
   * Validate an analyzer's interface compliance
   */
  validateAnalyzer(analyzer: any): ValidationDetails {
    const interfaceValidation = this.validateAnalyzerInterface(analyzer);
    const dependencyValidation = this.validateDependencies(analyzer);
    const capabilityValidation = this.validateCapabilities(analyzer);

    return {
      interfaceCompliance: interfaceValidation,
      dependencyValidation,
      capabilityValidation
    };
  }

  /**
   * Validate analyzer interface implementation
   */
  validateAnalyzerInterface(analyzer: any): InterfaceValidationResult {
    const requiredMethods = ['analyze', 'getCapabilities', 'validateInterface'];
    const requiredProperties = ['name'];
    
    const missingMethods: string[] = [];
    const invalidMethods: string[] = [];
    const details: string[] = [];

    // Handle null/undefined analyzers
    if (analyzer === null || analyzer === undefined) {
      details.push(`Analyzer is ${analyzer === null ? 'null' : 'undefined'}`);
      return {
        isValid: false,
        missingMethods: [...requiredMethods],
        invalidMethods: [],
        complianceScore: 0,
        details
      };
    }

    // Check required properties
    for (const prop of requiredProperties) {
      if (!(prop in analyzer)) {
        details.push(`Missing required property: ${prop}`);
      } else if (prop === 'name' && typeof analyzer[prop] !== 'string') {
        details.push(`Property '${prop}' must be a string`);
      }
    }

    // Check required methods
    for (const method of requiredMethods) {
      if (!(method in analyzer)) {
        missingMethods.push(method);
        details.push(`Missing required method: ${method}`);
      } else if (typeof analyzer[method] !== 'function') {
        invalidMethods.push(method);
        details.push(`Property '${method}' must be a function`);
      }
    }

    // Check method signatures
    if (typeof analyzer.analyze === 'function') {
      try {
        // Check if analyze method has correct signature (3 parameters)
        if (analyzer.analyze.length < 2) {
          invalidMethods.push('analyze');
          details.push('analyze method must accept at least 2 parameters (ast, content)');
        }
      } catch (error) {
        details.push(`Error checking analyze method: ${error}`);
      }
    }

    // Test validateInterface method if it exists
    if (typeof analyzer.validateInterface === 'function') {
      try {
        const selfValidation = analyzer.validateInterface();
        if (typeof selfValidation !== 'boolean') {
          invalidMethods.push('validateInterface');
          details.push('validateInterface method must return a boolean');
        } else if (!selfValidation) {
          details.push('Analyzer self-validation failed');
        }
      } catch (error) {
        details.push(`Error calling validateInterface: ${error}`);
      }
    }

    const totalChecks = requiredMethods.length + requiredProperties.length;
    const passedChecks = totalChecks - missingMethods.length - invalidMethods.length;
    const complianceScore = totalChecks > 0 ? passedChecks / totalChecks : 0;

    const isValid = missingMethods.length === 0 && invalidMethods.length === 0 && 
      !details.some(d => d.includes('self-validation failed') || d.includes('Error calling validateInterface') || 
                         d.includes('Missing required property') || d.includes('must be a string'));

    return {
      isValid,
      missingMethods,
      invalidMethods,
      complianceScore,
      details
    };
  }

  /**
   * Validate analyzer dependencies
   */
  validateDependencies(analyzer: any): DependencyValidationResult {
    const missingDependencies: string[] = [];
    const circularDependencies: string[] = [];
    const resolutionOrder: string[] = [];

    // For now, we'll implement basic dependency validation
    // This can be enhanced later with actual dependency resolution
    
    try {
      if (analyzer.getCapabilities && typeof analyzer.getCapabilities === 'function') {
        const capabilities = analyzer.getCapabilities();
        if (capabilities && capabilities.dependencies) {
          // Check if dependencies are available (simplified check)
          for (const dep of capabilities.dependencies) {
            // This is a placeholder - in a real implementation, we'd check
            // if the dependency is actually available in the system
            resolutionOrder.push(dep);
          }
        }
      }
    } catch (error) {
      // If we can't get capabilities, we can't validate dependencies
      // but this shouldn't fail the validation entirely
    }

    return {
      isValid: missingDependencies.length === 0 && circularDependencies.length === 0,
      missingDependencies,
      circularDependencies,
      resolutionOrder
    };
  }

  /**
   * Validate analyzer capabilities
   */
  validateCapabilities(analyzer: any): CapabilityValidationResult {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      if (analyzer.getCapabilities && typeof analyzer.getCapabilities === 'function') {
        const capabilities = analyzer.getCapabilities();
        
        if (!capabilities) {
          issues.push('getCapabilities method returned null or undefined');
        } else {
          // Validate capability structure
          if (!Array.isArray(capabilities.supportedContentTypes)) {
            issues.push('supportedContentTypes must be an array');
          }
          
          if (typeof capabilities.requiresContext !== 'boolean') {
            issues.push('requiresContext must be a boolean');
          }
          
          if (typeof capabilities.canProcessLargeFiles !== 'boolean') {
            issues.push('canProcessLargeFiles must be a boolean');
          }
          
          if (typeof capabilities.estimatedProcessingTime !== 'number') {
            issues.push('estimatedProcessingTime must be a number');
          } else if (capabilities.estimatedProcessingTime < 0) {
            issues.push('estimatedProcessingTime must be non-negative');
          }

          // Recommendations
          if (capabilities.estimatedProcessingTime > 5000) {
            recommendations.push('Consider optimizing analyzer for better performance (>5s processing time)');
          }
          
          if (capabilities.supportedContentTypes.length === 0) {
            recommendations.push('Consider specifying supported content types for better optimization');
          }
        }
      } else {
        issues.push('getCapabilities method is not implemented');
      }
    } catch (error) {
      issues.push(`Error validating capabilities: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }
}

/**
 * Default enhanced registry instance
 */
export const enhancedRegistry = new EnhancedAnalyzerRegistry();

/**
 * Factory function to create a new registry with custom options
 */
export function createAnalyzerRegistry(options?: Partial<RegistrationOptions>): EnhancedAnalyzerRegistry {
  return new EnhancedAnalyzerRegistry(options);
}

/**
 * Utility function to create analyzer configuration
 */
export function createAnalyzerConfig(
  analyzer: AnalyzerInterface,
  options: Partial<Omit<AnalyzerConfig, 'analyzer'>> = {}
): AnalyzerConfig {
  return {
    name: analyzer.name,
    analyzer,
    priority: 0,
    enabled: true,
    ...options
  };
}
