/**
 * Template-specific type definitions
 */

import { WorkflowTemplate, JobTemplate, StepTemplate, CacheConfig } from '../types';

/**
 * Framework template registry
 */
export interface FrameworkTemplateRegistry {
  nodejs: NodeJSTemplates;
  python: PythonTemplates;
  rust: RustTemplates;
  go: GoTemplates;
  java: JavaTemplates;
  docker: DockerTemplates;
  frontend: FrontendTemplates;
}

/**
 * Node.js framework templates
 */
export interface NodeJSTemplates {
  setup: StepTemplate[];
  build: StepTemplate[];
  test: StepTemplate[];
  deploy: StepTemplate[];
  cache: CacheConfig[];
  performance: PerformanceTestTemplate[];
  security: SecurityScanTemplate[];
}

/**
 * Python framework templates
 */
export interface PythonTemplates {
  setup: StepTemplate[];
  build: StepTemplate[];
  test: StepTemplate[];
  deploy: StepTemplate[];
  cache: CacheConfig[];
  performance: PerformanceTestTemplate[];
  security: SecurityScanTemplate[];
}

/**
 * Rust framework templates
 */
export interface RustTemplates {
  setup: StepTemplate[];
  build: StepTemplate[];
  test: StepTemplate[];
  deploy: StepTemplate[];
  cache: CacheConfig[];
  performance: PerformanceTestTemplate[];
  security: SecurityScanTemplate[];
}

/**
 * Go framework templates
 */
export interface GoTemplates {
  setup: StepTemplate[];
  build: StepTemplate[];
  test: StepTemplate[];
  deploy: StepTemplate[];
  cache: CacheConfig[];
  performance: PerformanceTestTemplate[];
  security: SecurityScanTemplate[];
}

/**
 * Java framework templates
 */
export interface JavaTemplates {
  setup: StepTemplate[];
  build: StepTemplate[];
  test: StepTemplate[];
  deploy: StepTemplate[];
  cache: CacheConfig[];
  performance: PerformanceTestTemplate[];
  security: SecurityScanTemplate[];
}

/**
 * Docker templates
 */
export interface DockerTemplates {
  build: StepTemplate[];
  push: StepTemplate[];
  security: StepTemplate[];
  cache: CacheConfig[];
}

/**
 * Frontend framework templates
 */
export interface FrontendTemplates {
  build: StepTemplate[];
  test: StepTemplate[];
  deploy: StepTemplate[];
  cache: CacheConfig[];
}

/**
 * Performance test template
 */
export interface PerformanceTestTemplate {
  benchmarks: StepTemplate[];
  loadTests: StepTemplate[];
  metricsCollection: StepTemplate[];
  regressionDetection: StepTemplate[];
}

/**
 * Security scan template
 */
export interface SecurityScanTemplate {
  sast: StepTemplate[];
  dast: StepTemplate[];
  dependencyScanning: StepTemplate[];
  containerScanning: StepTemplate[];
  complianceChecks: StepTemplate[];
  licenseScanning: StepTemplate[];
}

/**
 * Template loading configuration
 */
export interface TemplateLoadConfig {
  baseTemplatesPath: string;
  customTemplatesPath?: string;
  cacheEnabled: boolean;
  reloadOnChange: boolean;
}

/**
 * Template compilation result
 */
export interface TemplateCompilationResult {
  template: WorkflowTemplate;
  errors: string[];
  warnings: string[];
  metadata: TemplateMetadata;
}

/**
 * Template metadata
 */
export interface TemplateMetadata {
  name: string;
  version: string;
  author: string;
  description: string;
  tags: string[];
  lastModified: Date;
  dependencies: string[];
}