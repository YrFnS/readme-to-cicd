/**
 * Core types and interfaces for the README Parser
 */

import { Token } from 'marked';

// Main parser interface
export interface ReadmeParser {
  parseFile(filePath: string): Promise<ParseResult>;
  parseContent(content: string): Promise<ParseResult>;
}

// Parse result with success/error handling
export interface ParseResult {
  success: boolean;
  data?: ProjectInfo;
  errors?: ParseError[];
  warnings?: string[];
}

// Main project information schema
export interface ProjectInfo {
  metadata: ProjectMetadata;
  languages: LanguageInfo[];
  dependencies: DependencyInfo;
  commands: CommandInfo;
  testing: TestingInfo;
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
}

export interface TestingFramework {
  name: string;
  language: string;
  confidence: number;
  configFiles?: string[];
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
  line?: number;
  column?: number;
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

// Markdown AST type alias for clarity
export type MarkdownAST = Token[];

// Result pattern for error handling
export type Result<T, E = ParseError> = 
  | { success: true; data: T }
  | { success: false; error: E };