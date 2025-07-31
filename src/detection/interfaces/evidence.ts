/**
 * Evidence supporting framework detection
 */
export interface Evidence {
  /** Evidence type */
  type: EvidenceType;
  /** Evidence source (file, command, text, etc.) */
  source: string;
  /** Evidence value or content */
  value: string;
  /** Confidence weight (0-1) */
  weight: number;
  /** Location information */
  location?: EvidenceLocation;
  /** Additional context */
  context?: Record<string, any>;
}

/**
 * Types of evidence for framework detection
 */
export type EvidenceType = 
  | 'config_file'      // Configuration file exists
  | 'dependency'       // Package dependency found
  | 'file_pattern'     // File pattern matched
  | 'command_pattern'  // Command pattern found
  | 'text_mention'     // Framework mentioned in text
  | 'version_info'     // Version information found
  | 'script_command'   // Script command detected
  | 'import_statement' // Import/require statement
  | 'annotation'       // Code annotation or decorator
  | 'directory_structure'; // Directory structure pattern

/**
 * Location information for evidence
 */
export interface EvidenceLocation {
  /** File path where evidence was found */
  filePath?: string;
  /** Line number (for text-based evidence) */
  lineNumber?: number;
  /** Column number */
  columnNumber?: number;
  /** JSON path (for structured data) */
  jsonPath?: string;
  /** Section or context within file */
  section?: string;
}

/**
 * Evidence collection and analysis utilities
 */
export interface EvidenceCollector {
  /**
   * Collect evidence from project information
   * @param projectInfo - Project information to analyze
   * @param projectPath - Optional project directory path
   * @returns Promise resolving to collected evidence
   */
  collectEvidence(projectInfo: ProjectInfo, projectPath?: string): Promise<Evidence[]>;
  
  /**
   * Weight evidence based on type and context
   * @param evidence - Evidence to weight
   * @returns Weighted evidence score
   */
  weightEvidence(evidence: Evidence): number;
  
  /**
   * Filter evidence by type or criteria
   * @param evidence - Evidence array to filter
   * @param criteria - Filter criteria
   * @returns Filtered evidence array
   */
  filterEvidence(evidence: Evidence[], criteria: EvidenceFilter): Evidence[];
}

/**
 * Evidence filtering criteria
 */
export interface EvidenceFilter {
  /** Evidence types to include */
  types?: EvidenceType[];
  /** Minimum weight threshold */
  minimumWeight?: number;
  /** Source patterns to match */
  sourcePatterns?: string[];
  /** Maximum number of results */
  limit?: number;
}

/**
 * Evidence aggregation result
 */
export interface EvidenceAggregation {
  /** Total evidence count */
  totalCount: number;
  /** Evidence by type */
  byType: Record<EvidenceType, Evidence[]>;
  /** Total weighted score */
  totalWeight: number;
  /** Average confidence */
  averageConfidence: number;
  /** Strongest evidence */
  strongestEvidence: Evidence[];
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