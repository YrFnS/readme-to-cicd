import { CIStep } from './ci-pipeline';

/**
 * Framework detection rule definition
 */
export interface FrameworkRule {
  /** Framework name */
  name: string;
  /** Programming language ecosystem */
  ecosystem: string;
  /** Detection criteria */
  detectionCriteria: DetectionCriteria;
  /** CI/CD template for this framework */
  ciTemplate: CITemplate;
  /** Rule priority (higher = more important) */
  priority: number;
  /** Rule metadata */
  metadata: RuleMetadata;
}

/**
 * Criteria for detecting a framework
 */
export interface DetectionCriteria {
  /** Package/dependency file patterns */
  packageFiles?: PackageFilePattern[];
  /** Dependency patterns to match */
  dependencies?: DependencyPattern[];
  /** File system patterns */
  filePatterns?: FilePattern[];
  /** Command patterns in scripts */
  commandPatterns?: CommandPattern[];
  /** Text patterns in README content */
  textPatterns?: TextPattern[];
  /** Minimum confidence threshold */
  minimumConfidence?: number;
}

/**
 * Package file pattern for detection
 */
export interface PackageFilePattern {
  /** File name pattern */
  fileName: string;
  /** Required fields in the file */
  requiredFields?: string[];
  /** JSON path patterns to match */
  jsonPaths?: string[];
  /** Weight for confidence calculation */
  weight: number;
}

/**
 * Dependency pattern for detection
 */
export interface DependencyPattern {
  /** Package name pattern (supports regex) */
  packageName: string;
  /** Version constraint (optional) */
  versionConstraint?: string;
  /** Dependency type (dependencies, devDependencies, etc.) */
  dependencyType?: string;
  /** Weight for confidence calculation */
  weight: number;
}

/**
 * File system pattern for detection
 */
export interface FilePattern {
  /** File path pattern (supports glob) */
  path: string;
  /** File content patterns (optional) */
  contentPatterns?: string[];
  /** Whether file must exist */
  required: boolean;
  /** Weight for confidence calculation */
  weight: number;
}

/**
 * Command pattern for detection
 */
export interface CommandPattern {
  /** Command pattern (supports regex) */
  command: string;
  /** Script context (npm scripts, Makefile, etc.) */
  context?: string;
  /** Weight for confidence calculation */
  weight: number;
}

/**
 * Text pattern for README content analysis
 */
export interface TextPattern {
  /** Text pattern (supports regex) */
  pattern: string;
  /** Context where pattern should appear */
  context?: 'title' | 'description' | 'installation' | 'usage' | 'any';
  /** Case sensitive matching */
  caseSensitive?: boolean;
  /** Weight for confidence calculation */
  weight: number;
}

/**
 * CI/CD template for framework
 */
export interface CITemplate {
  /** Setup steps */
  setup: CIStepTemplate[];
  /** Build steps */
  build: CIStepTemplate[];
  /** Test steps */
  test: CIStepTemplate[];
  /** Deploy steps (optional) */
  deploy?: CIStepTemplate[];
  /** Environment variables */
  environment?: EnvironmentVariable[];
  /** Template metadata */
  metadata: TemplateMetadata;
}

/**
 * CI step template with variable substitution
 */
export interface CIStepTemplate {
  /** Template identifier */
  id: string;
  /** Step name (supports variables) */
  name: string;
  /** Command template (supports variables) */
  command?: string;
  /** GitHub Action to use */
  uses?: string;
  /** Parameters (supports variables) */
  with?: Record<string, string>;
  /** Environment variables */
  env?: Record<string, string>;
  /** Conditions for inclusion */
  condition?: string;
  /** Template variables used */
  variables?: string[];
}

/**
 * Environment variable definition
 */
export interface EnvironmentVariable {
  /** Variable name */
  name: string;
  /** Variable value (supports templates) */
  value: string;
  /** Whether variable is required */
  required: boolean;
  /** Variable description */
  description?: string;
}

/**
 * Rule metadata
 */
export interface RuleMetadata {
  /** Rule version */
  version: string;
  /** Rule author */
  author?: string;
  /** Rule description */
  description: string;
  /** Documentation URL */
  documentation?: string;
  /** Last updated timestamp */
  lastUpdated: Date;
  /** Tags for categorization */
  tags: string[];
}

/**
 * Template metadata
 */
export interface TemplateMetadata {
  /** Template version */
  version: string;
  /** Compatible framework versions */
  compatibleVersions?: string[];
  /** Template description */
  description: string;
  /** Required secrets */
  requiredSecrets?: string[];
  /** Estimated execution time */
  estimatedDuration?: number;
}