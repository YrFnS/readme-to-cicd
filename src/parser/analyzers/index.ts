/**
 * Analyzer exports
 */

// Enhanced Registry System
export {
  EnhancedAnalyzerRegistry,
  RegistrationValidator,
  enhancedRegistry,
  createAnalyzerRegistry,
  createAnalyzerConfig
} from './enhanced-analyzer-registry';

export type {
  AnalyzerInterface,
  AnalyzerCapabilities,
  AnalyzerConfig,
  AnalyzerMetadata,
  RegistrationResult,
  ValidationDetails,
  InterfaceValidationResult,
  DependencyValidationResult,
  CapabilityValidationResult,
  RegistrationOptions,
  RegistrationState,
  RegistrationFailure,
  ValidationStatus,
  AnalyzerRegistry,
  ValidationResult,
  ValidationIssue
} from './enhanced-analyzer-registry';

// Legacy Registry (for backward compatibility)
export { AnalyzerRegistry as LegacyAnalyzerRegistry } from './analyzer-registry';
export { AnalyzerRegistry as SimpleAnalyzerRegistry, defaultRegistry } from './registry';

// Base Analyzer
export { BaseAnalyzer } from './base-analyzer';

// Existing Analyzers
export { CommandExtractor } from './command-extractor';
export { DependencyExtractor } from './dependency-extractor';
export { LanguageDetector } from './language-detector';
export { MetadataExtractor } from './metadata-extractor';
export { TestingDetector } from './testing-detector';

// Mock Analyzer for Testing
export { 
  MockAnalyzer,
  createMockAnalyzer,
  createFailingMockAnalyzer,
  createSuccessfulMockAnalyzer
} from './mock-analyzer';

export type {
  MethodCall,
  MockAnalysisResult
} from './mock-analyzer';