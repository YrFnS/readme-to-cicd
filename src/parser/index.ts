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

// Utilities
export * from './utils/confidence-calculator';
export * from './utils/validation';

// Default parser instance factory
import { ReadmeParserImpl } from './readme-parser';

/**
 * Create a new README parser instance
 */
export function createReadmeParser(): ReadmeParserImpl {
  return new ReadmeParserImpl();
}