import { FrameworkInfo } from './framework-info';
import { BuildToolInfo } from './framework-info';
import { CIStep } from './ci-pipeline';

/**
 * Interface for language-specific framework analyzers
 */
export interface LanguageAnalyzer {
  /** Analyzer name for identification */
  readonly name: string;
  
  /** Supported language/ecosystem */
  readonly ecosystem: string;
  
  /**
   * Check if this analyzer can analyze the given project
   * @param projectInfo - Project information from README parsing
   * @returns True if analyzer can process this project
   */
  canAnalyze(projectInfo: ProjectInfo): boolean;
  
  /**
   * Analyze project and detect frameworks
   * @param projectInfo - Project information from README parsing
   * @param projectPath - Optional path to project directory
   * @returns Promise resolving to language-specific detection results
   */
  analyze(projectInfo: ProjectInfo, projectPath?: string): Promise<LanguageDetectionResult>;
  
  /**
   * Generate CI/CD steps for detected frameworks
   * @param frameworks - Detected frameworks for this language
   * @returns Array of CI/CD steps
   */
  generateCISteps(frameworks: FrameworkInfo[]): CIStep[];
}

/**
 * Result from language-specific analysis
 */
export interface LanguageDetectionResult {
  /** Detected frameworks */
  frameworks: FrameworkInfo[];
  /** Detected build tools */
  buildTools: BuildToolInfo[];
  /** Overall confidence for this language */
  confidence: number;
  /** Recommendations for improvement */
  recommendations: string[];
  /** Analysis metadata */
  metadata: AnalysisMetadata;
}

/**
 * Analysis metadata and diagnostics
 */
export interface AnalysisMetadata {
  /** Analysis execution time in milliseconds */
  executionTime: number;
  /** Files analyzed */
  filesAnalyzed: string[];
  /** Patterns matched */
  patternsMatched: string[];
  /** Warnings during analysis */
  warnings: string[];
  /** Debug information */
  debug?: Record<string, any>;
}

/**
 * Project information interface (re-exported for convenience)
 */
export interface ProjectInfo {
  name: string;
  description?: string;
  languages: string[];
  dependencies: string[];
  buildCommands: string[];
  testCommands: string[];
  installationSteps: string[];
  usageExamples: string[];
  configFiles: string[];
  deploymentInfo?: string[];
  rawContent: string;
}