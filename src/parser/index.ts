/**
 * README Parser - Main exports
 */

// Core types and interfaces
export * from './types';

// Main parser implementation
export { ReadmeParserImpl } from './readme-parser';

// Base analyzer classes
export { BaseAnalyzer } from './analyzers/base-analyzer';
export { AnalyzerRegistry } from './analyzers/analyzer-registry';

// Utilities (including enhanced error handling)
export * from './utils/confidence-calculator';
export * from './utils/validation';
export { InputValidator, ValidationResult } from './utils/input-validator';
export { 
  ParseErrorImpl, 
  ErrorFactory, 
  ErrorRecovery, 
  ErrorAggregator,
  ErrorCategory,
  RecoveryStrategy 
} from './utils/parse-error';
export { Logger, LogLevel, logger } from './utils/logger';
export { ResultAggregator } from './utils/result-aggregator';

// Default parser instance factory
import { ReadmeParserImpl } from './readme-parser';

/**
 * Create a new README parser instance
 */
export function createReadmeParser(): ReadmeParserImpl {
  return new ReadmeParserImpl();
}

/**
 * Create a new README parser instance with enhanced error handling
 */
export function createReadmeParserWithErrorHandling(logLevel?: import('./utils/logger').LogLevel): ReadmeParserImpl {
  // Configure logger if log level is provided
  if (logLevel !== undefined) {
    const { logger } = require('./utils/logger');
    logger.updateConfig({ level: logLevel });
  }
  
  return new ReadmeParserImpl();
}