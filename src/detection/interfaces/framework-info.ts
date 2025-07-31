import { Evidence } from './evidence';

/**
 * Information about a detected framework
 */
export interface FrameworkInfo {
  /** Framework name (e.g., 'React', 'Django', 'Express') */
  name: string;
  /** Framework type/category */
  type: FrameworkType;
  /** Detected version (if available) */
  version?: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Evidence supporting this detection */
  evidence: Evidence[];
  /** Programming language ecosystem */
  ecosystem: string; // 'nodejs', 'python', 'rust', 'go', 'java', 'frontend'
  /** Associated build tool */
  buildTool?: string;
  /** Associated test framework */
  testFramework?: string;
  /** Deployment targets */
  deploymentTarget?: string[];
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Framework type categories
 */
export type FrameworkType = 
  | 'web_framework'
  | 'frontend_framework' 
  | 'backend_framework'
  | 'fullstack_framework'
  | 'api_framework'
  | 'testing_framework'
  | 'build_tool'
  | 'static_site_generator'
  | 'mobile_framework'
  | 'desktop_framework'
  | 'microservice_framework'
  | 'orm'
  | 'database'
  | 'cache'
  | 'message_queue';

/**
 * Build tool information
 */
export interface BuildToolInfo {
  /** Build tool name (e.g., 'webpack', 'cargo', 'maven') */
  name: string;
  /** Configuration file path */
  configFile: string;
  /** Available build commands */
  commands: BuildCommand[];
  /** Tool version (if detected) */
  version?: string;
  /** Confidence in detection */
  confidence: number;
  /** Additional configuration */
  config?: Record<string, any>;
}

/**
 * Build command information
 */
export interface BuildCommand {
  /** Command name (e.g., 'build', 'test', 'start') */
  name: string;
  /** Full command to execute */
  command: string;
  /** Command description */
  description?: string;
  /** Whether this is the primary command for its type */
  isPrimary: boolean;
}

/**
 * Container and deployment information
 */
export interface ContainerInfo {
  /** Container type (docker, kubernetes, etc.) */
  type: 'docker' | 'kubernetes' | 'helm' | 'compose';
  /** Configuration files */
  configFiles: string[];
  /** Base images used */
  baseImages?: string[];
  /** Exposed ports */
  ports?: number[];
  /** Environment variables */
  environment?: Record<string, string>;
  /** Volume mounts */
  volumes?: string[];
  /** Deployment strategy */
  deploymentStrategy?: string;
}