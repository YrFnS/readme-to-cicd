/**
 * Parser utilities - Main exports
 */

// File reading utilities
export { FileReader, FileReadError, FileReadResult } from './file-reader';

// Markdown parsing utilities  
export { MarkdownParser, MarkdownParseError, MarkdownParseResult, MarkdownParserOptions } from './markdown-parser';

// Confidence calculation utilities
export * from './confidence-calculator';

// Validation utilities (legacy and enhanced)
export * from './validation';
export { InputValidator, ValidationResult } from './input-validator';

// Error handling utilities
export { 
  ParseErrorImpl, 
  ErrorFactory, 
  ErrorRecovery, 
  ErrorAggregator,
  ErrorCategory,
  RecoveryStrategy,
  RecoveryContext,
  RecoveryResult,
  ErrorSummary
} from './parse-error';

// Logging utilities
export { 
  Logger, 
  LogLevel, 
  LogEntry, 
  PerformanceMetrics, 
  LoggerConfig, 
  LoggerStatistics,
  logger 
} from './logger';

// Result aggregation utilities
export { ResultAggregator } from './result-aggregator';

// Performance optimization utilities
export { ASTCache, globalASTCache, createASTCache } from './ast-cache';
export { PerformanceMonitor, globalPerformanceMonitor, createPerformanceMonitor, timed } from './performance-monitor';
export { StreamingFileReader } from './streaming-file-reader';
export { 
  OptimizedLanguagePatterns, 
  OptimizedTextMentions, 
  OptimizedFilePatterns, 
  OptimizedConfigPatterns,
  RegexUtils,
  PatternCache 
} from './regex-optimizer';