import { DetectionResult } from './detection-result';
import { CIPipeline } from './ci-pipeline';

/**
 * Main interface for framework detection functionality
 */
export interface FrameworkDetector {
  /**
   * Detect frameworks and build tools from project information
   * @param projectInfo - Parsed project information from README
   * @param projectPath - Optional path to project directory for file system analysis
   * @returns Promise resolving to detection results with confidence scores
   */
  detectFrameworks(projectInfo: ProjectInfo, projectPath?: string): Promise<DetectionResult>;

  /**
   * Generate CI/CD pipeline steps based on detection results
   * @param detectionResult - Results from framework detection
   * @returns Promise resolving to complete CI/CD pipeline configuration
   */
  suggestCISteps(detectionResult: DetectionResult): Promise<CIPipeline>;
}

/**
 * Project information extracted from README parsing
 */
export interface ProjectInfo {
  /** Project name */
  name: string;
  /** Project description */
  description?: string;
  /** Detected programming languages */
  languages: string[];
  /** Dependencies mentioned in README */
  dependencies: string[];
  /** Build commands found in README */
  buildCommands: string[];
  /** Test commands found in README */
  testCommands: string[];
  /** Installation instructions */
  installationSteps: string[];
  /** Usage examples */
  usageExamples: string[];
  /** Configuration files mentioned */
  configFiles: string[];
  /** Deployment information */
  deploymentInfo?: string[];
  /** Raw README content for text analysis */
  rawContent: string;
}