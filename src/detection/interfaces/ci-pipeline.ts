/**
 * Complete CI/CD pipeline configuration
 */
export interface CIPipeline {
  /** Environment setup steps */
  setup: CIStep[];
  /** Build process steps */
  build: CIStep[];
  /** Testing steps */
  test: CIStep[];
  /** Security scanning steps */
  security: CIStep[];
  /** Deployment steps */
  deploy: CIStep[];
  /** Caching strategies */
  cache: CacheStrategy[];
  /** Pipeline metadata */
  metadata: PipelineMetadata;
}

/**
 * Individual CI/CD step configuration
 */
export interface CIStep {
  /** Step identifier */
  id: string;
  /** Human-readable step name */
  name: string;
  /** Step description */
  description?: string;
  /** Command to execute or action to use */
  command?: string;
  /** GitHub Action to use */
  uses?: string;
  /** Step parameters/inputs */
  with?: Record<string, any>;
  /** Environment variables for this step */
  env?: Record<string, string>;
  /** Working directory */
  workingDirectory?: string;
  /** Condition for step execution */
  condition?: string;
  /** Whether step can fail without failing the job */
  continueOnError?: boolean;
  /** Timeout in minutes */
  timeoutMinutes?: number;
  /** Step dependencies */
  dependsOn?: string[];
  /** Step category for organization */
  category: StepCategory;
}

/**
 * Step categories for organization
 */
export type StepCategory = 
  | 'setup'
  | 'dependencies'
  | 'build'
  | 'test'
  | 'lint'
  | 'security'
  | 'deploy'
  | 'cleanup'
  | 'notification';

/**
 * Caching strategy configuration
 */
export interface CacheStrategy {
  /** Cache identifier */
  id: string;
  /** Cache name/description */
  name: string;
  /** Paths to cache */
  paths: string[];
  /** Cache key pattern */
  key: string;
  /** Restore keys for cache fallback */
  restoreKeys?: string[];
  /** When to save cache */
  saveCondition?: string;
  /** Cache scope */
  scope: 'global' | 'branch' | 'pr';
}

/**
 * Pipeline metadata and configuration
 */
export interface PipelineMetadata {
  /** Pipeline name */
  name: string;
  /** Pipeline description */
  description?: string;
  /** Trigger conditions */
  triggers: PipelineTrigger[];
  /** Target environments */
  environments: string[];
  /** Required secrets */
  secrets: string[];
  /** Pipeline variables */
  variables: Record<string, string>;
  /** Estimated execution time in minutes */
  estimatedDuration?: number;
  /** Resource requirements */
  resources?: ResourceRequirements;
}

/**
 * Pipeline trigger configuration
 */
export interface PipelineTrigger {
  /** Trigger type */
  type: 'push' | 'pull_request' | 'schedule' | 'workflow_dispatch' | 'release';
  /** Trigger conditions */
  conditions?: Record<string, any>;
  /** Branches to include/exclude */
  branches?: string[];
  /** Paths to include/exclude */
  paths?: string[];
}

/**
 * Resource requirements for pipeline execution
 */
export interface ResourceRequirements {
  /** Runner type (ubuntu-latest, windows-latest, etc.) */
  runner: string;
  /** Memory requirements in GB */
  memory?: number;
  /** CPU requirements */
  cpu?: number;
  /** Disk space requirements in GB */
  disk?: number;
  /** Special requirements */
  special?: string[];
}