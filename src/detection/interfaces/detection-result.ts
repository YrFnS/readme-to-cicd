import { FrameworkInfo } from './framework-info';
import { BuildToolInfo } from './framework-info';
import { ContainerInfo } from './framework-info';
import { OverallConfidence } from './confidence';

/**
 * Complete result of framework detection analysis
 */
export interface DetectionResult {
  /** Detected frameworks with confidence scores */
  frameworks: FrameworkInfo[];
  /** Detected build tools and their configurations */
  buildTools: BuildToolInfo[];
  /** Container and deployment information */
  containers: ContainerInfo[];
  /** Overall confidence in detection results */
  confidence: OverallConfidence;
  /** Alternative framework suggestions when confidence is low */
  alternatives: AlternativeFramework[];
  /** Warnings about conflicts or issues */
  warnings: DetectionWarning[];
  /** Timestamp of detection */
  detectedAt: Date;
  /** Detection execution time in milliseconds */
  executionTime: number;
}

/**
 * Alternative framework suggestion when primary detection has low confidence
 */
export interface AlternativeFramework {
  /** Framework name */
  name: string;
  /** Reason for suggestion */
  reason: string;
  /** Confidence score for this alternative */
  confidence: number;
  /** Evidence supporting this alternative */
  evidence: string[];
}

/**
 * Warning about detection conflicts or issues
 */
export interface DetectionWarning {
  /** Warning type */
  type: 'conflict' | 'incomplete' | 'version_mismatch' | 'deprecated';
  /** Warning message */
  message: string;
  /** Affected frameworks or components */
  affected: string[];
  /** Suggested resolution */
  resolution?: string;
}