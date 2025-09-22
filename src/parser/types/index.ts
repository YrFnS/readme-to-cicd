/**
 * Core types and interfaces for the README Parser
 */

import { Token } from 'marked';

/**
 * Main parser interface for analyzing README files and extracting structured project information.
 */
export interface ReadmeParser {
  /**
   * Parse a README file from the filesystem
   * @param filePath - Path to the README file
   * @returns Promise resolving to ParseResult with extracted information
   */
  parseFile(filePath: string): Promise<ParseResult>;
  
  /**
   * Parse README content directly from a string
   * @param content - Raw README content
   * @returns Promise resolving to ParseResult with extracted information
   */
  parseContent(content: string): Promise<ParseResult>;
}

/**
 * Result of parsing a README file, containing either extracted data or error information.
 */
export interface ParseResult {
  /** Whether the parsing operation succeeded */
  success: boolean;
  /** Extracted project information (only present if success is true) */
  data?: ProjectInfo;
  /** Array of errors encountered during parsing */
  errors?: ParseError[];
  /** Array of warning messages */
  warnings?: string[];
}

/**
 * Comprehensive project information extracted from a README file.
 * Contains all analyzed aspects of the project including metadata, languages, dependencies, etc.
 */
export interface ProjectInfo {
  /** Project metadata (name, description, structure, environment variables) */
  metadata: ProjectMetadata;
  /** Detected programming languages with confidence scores */
  languages: LanguageInfo[];
  /** Dependency information (package files, install commands, packages) */
  dependencies: DependencyInfo;
  /** Extracted commands (build, test, run, install) */
  commands: CommandInfo;
  /** Testing framework and tool information */
  testing: TestingInfo;
  /** CI/CD information */
  cicd?: CICDInfo;
  /** Confidence scores for each analysis category */
  confidence: ConfidenceScores;
}

// Project metadata information
export interface ProjectMetadata {
  name?: string;
  description?: string;
  structure?: string[];
  environment?: EnvironmentVariable[];
}

// Language detection information
export interface LanguageInfo {
  name: string;
  confidence: number;
  sources: LanguageSource[];
  frameworks?: string[];
}

export type LanguageSource = 'code-block' | 'text-mention' | 'file-reference' | 'pattern-match';

// Dependency information
export interface DependencyInfo {
  packageFiles: PackageFile[];
  installCommands: Command[];
  packages: Package[];
  dependencies: Dependency[];
  devDependencies: Dependency[];
}

export interface Dependency {
  name: string;
  version?: string | undefined;
  type: 'production' | 'development' | 'runtime';
  manager: PackageManagerType;
  confidence: number;
  source?: string | undefined;
}

export interface PackageFile {
  name: string;
  type: PackageManagerType;
  mentioned: boolean;
  confidence: number;
}

export type PackageManagerType = 
  | 'npm' 
  | 'yarn' 
  | 'pip' 
  | 'cargo' 
  | 'go' 
  | 'maven' 
  | 'gradle' 
  | 'composer' 
  | 'gem' 
  | 'bundler'
  | 'other';

export interface Package {
  name: string;
  version?: string;
  manager: PackageManagerType;
  confidence: number;
}// Command information
export interface CommandInfo {
  build: Command[];
  test: Command[];
  run: Command[];
  install: Command[];
  other: Command[];
  deploy?: Command[];
}

export interface Command {
  command: string;
  description?: string;
  language?: string;
  confidence: number;
  context?: string;
}

/**
 * Command associated with language context for context-aware extraction
 */
export interface AssociatedCommand extends Command {
  /** Language context associated with this command */
  languageContext: import('../../shared/types/language-context').LanguageContext;
  /** Confidence score for the context association */
  contextConfidence: number;
}

/**
 * Result of context-aware command extraction
 */
export interface CommandExtractionResult {
  /** Commands with their associated language contexts */
  commands: AssociatedCommand[];
  /** Mappings between contexts and command locations */
  contextMappings: ContextMapping[];
  /** Metadata about the extraction process */
  extractionMetadata: ExtractionMetadata;
}

/**
 * Mapping between language context and command locations
 */
export interface ContextMapping {
  /** The language context */
  context: import('../../shared/types/language-context').LanguageContext;
  /** Commands found in this context */
  commands: Command[];
  /** Source range where this context applies */
  sourceRange: import('../../shared/types/language-context').SourceRange;
}

/**
 * Metadata about the command extraction process
 */
export interface ExtractionMetadata {
  /** Total number of commands extracted */
  totalCommands: number;
  /** Number of different languages detected */
  languagesDetected: number;
  /** Number of context boundaries detected */
  contextBoundaries: number;
  /** Timestamp when extraction was performed */
  extractionTimestamp: Date;
}

// Testing framework information
export interface TestingInfo {
  frameworks: TestingFramework[];
  tools: TestingTool[];
  configFiles: string[];
  confidence: number;
  testFiles: string[];
  commands: Command[];
  coverage: CoverageInfo;
}

export interface CoverageInfo {
  enabled: boolean;
  threshold?: number;
  tools: string[];
}

export interface TestingFramework {
  name: string;
  language: string;
  confidence: number;
  configFiles?: string[];
  testPatterns?: string[];
}

export interface TestingTool {
  name: string;
  type: TestingToolType;
  confidence: number;
}

export type TestingToolType = 'runner' | 'coverage' | 'reporter' | 'assertion' | 'mocking' | 'other';

// CI/CD information
export interface CICDInfo {
  tools: Array<{ name: string; confidence: number; evidence: string[] }>;
  configurations: Array<{ tool: string; file: string | null; mentions: number }>;
  confidence: number;
}

// Environment variables
export interface EnvironmentVariable {
  name: string;
  description?: string;
  required: boolean;
  defaultValue?: string;
}

// Confidence scoring
export interface ConfidenceScores {
  overall: number;
  languages: number;
  dependencies: number;
  commands: number;
  testing: number;
  metadata: number;
  cicd: number;
}

// Error handling
export interface ParseError {
  code: string;
  message: string;
  component: string;
  severity: ErrorSeverity;
  details?: any;
  line?: number | undefined;
  column?: number | undefined;
  category?: string;
  isRecoverable?: boolean;
}

export type ErrorSeverity = 'error' | 'warning' | 'info';

// Analyzer interface for modular analysis
export interface ContentAnalyzer {
  readonly name: string;
  analyze(ast: Token[], rawContent: string, context?: import('../../shared/types/analysis-context').AnalysisContext): Promise<AnalysisResult>;
}

export interface AnalysisResult {
  data: any;
  confidence: number;
  sources: string[];
  errors?: ParseError[];
}

// Enhanced analyzer result interface for integration
export interface EnhancedAnalyzerResult {
  analyzerName: string;
  data: any;
  confidence: number;
  sources: string[];
  errors?: ParseError[];
  warnings?: ParseError[];
  metadata?: {
    processingTime?: number;
    dataQuality?: number;
    completeness?: number;
  };
}

// Generic analyzer result type
export type AnalyzerResult<T = any> = 
  | { success: true; data: T; confidence: number; sources?: string[]; }
  | { success: false; confidence: number; errors?: ParseError[]; sources?: string[]; };

// Markdown AST type alias for clarity
export type MarkdownAST = Token[];

// Result pattern for error handling
export type Result<T, E = ParseError> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Integration-specific types for enhanced ResultAggregator
export interface AggregatedResult {
  languages: LanguageInfo[];
  commands: CommandInfo;
  dependencies: DependencyInfo;
  testing: TestingInfo;
  metadata: ProjectMetadata;
  confidence: ConfidenceScores;
  integrationMetadata: IntegrationMetadata;
  validationStatus: ValidationStatus;
}

export interface IntegrationMetadata {
  analyzersUsed: string[];
  processingTime: number;
  dataQuality: number;
  completeness: number;
  conflictsResolved: ConflictResolution[];
  dataFlowValidation?: {
    sequenceExecuted: string[];
    dependenciesResolved: number;
    validationsPassed: number;
    totalValidations: number;
    averageDataIntegrity: number;
  };
}

export interface ValidationStatus {
  isValid: boolean;
  completeness: number;
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  type: 'missing_data' | 'low_confidence' | 'conflict' | 'incomplete';
  severity: 'error' | 'warning' | 'info';
  message: string;
  component: string;
}

export interface ConflictResolution {
  conflictType: string;
  conflictingAnalyzers: string[];
  resolution: string;
  confidence: number;
}