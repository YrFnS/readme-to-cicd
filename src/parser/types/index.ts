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

export type TestingToolType = 'runner' | 'coverage' | 'reporter' | 'assertion' | 'mock' | 'other';

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
  analyze(ast: Token[], rawContent: string): Promise<AnalysisResult>;
}

export interface AnalysisResult {
  data: any;
  confidence: number;
  sources: string[];
  errors?: ParseError[];
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