/**
 * README Parser - Main exports
 */

// Core types and interfaces
export * from './types';

// Main parser implementation
export { ReadmeParserImpl } from './readme-parser';

// Analyzers and utilities
export { LanguageDetector } from './analyzers/language-detector';
export { CommandExtractor } from './analyzers/command-extractor';
export { MarkdownParser } from './utils/markdown-parser';

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

// Import IntegrationPipeline for factory functions
import { IntegrationPipeline } from '../integration/integration-pipeline';

/**
 * Create a new README parser instance
 */
export function createReadmeParser(integrationPipeline?: IntegrationPipeline): ReadmeParserImpl {
  return new ReadmeParserImpl(integrationPipeline);
}

/**
 * Create a new README parser instance with enhanced error handling
 */
export function createReadmeParserWithErrorHandling(
  integrationPipeline?: IntegrationPipeline,
  logLevel?: import('./utils/logger').LogLevel
): ReadmeParserImpl {
  // Configure logger if log level is provided
  if (logLevel !== undefined) {
    const { logger } = require('./utils/logger');
    logger.updateConfig({ level: logLevel });
  }
  
  return new ReadmeParserImpl(integrationPipeline);
}

/**
 * Create a new README parser instance with IntegrationPipeline
 */
export function createReadmeParserWithPipeline(): ReadmeParserImpl {
  const pipeline = new IntegrationPipeline();
  return new ReadmeParserImpl(pipeline);
}