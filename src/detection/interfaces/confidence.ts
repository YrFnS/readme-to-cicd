/**
 * Overall confidence assessment for detection results
 */
export interface OverallConfidence {
  /** Overall confidence score (0-1) */
  score: number;
  /** Confidence level category */
  level: ConfidenceLevel;
  /** Confidence breakdown by component */
  breakdown: ConfidenceBreakdown;
  /** Factors affecting confidence */
  factors: ConfidenceFactor[];
  /** Recommendations for improving confidence */
  recommendations: string[];
}

/**
 * Confidence level categories
 */
export type ConfidenceLevel = 
  | 'high'     // 0.8-1.0 - Strong evidence, reliable detection
  | 'medium'   // 0.5-0.79 - Good evidence, likely correct
  | 'low'      // 0.2-0.49 - Weak evidence, needs verification
  | 'none';    // 0.0-0.19 - Insufficient evidence

/**
 * Confidence breakdown by detection component
 */
export interface ConfidenceBreakdown {
  /** Framework detection confidence */
  frameworks: ComponentConfidence;
  /** Build tool detection confidence */
  buildTools: ComponentConfidence;
  /** Container detection confidence */
  containers: ComponentConfidence;
  /** Language detection confidence */
  languages: ComponentConfidence;
}

/**
 * Confidence for a specific component
 */
export interface ComponentConfidence {
  /** Component confidence score (0-1) */
  score: number;
  /** Number of items detected */
  detectedCount: number;
  /** Evidence quality assessment */
  evidenceQuality: EvidenceQuality;
  /** Component-specific factors */
  factors: string[];
}

/**
 * Evidence quality assessment
 */
export interface EvidenceQuality {
  /** Strong evidence count (config files, dependencies) */
  strongEvidence: number;
  /** Medium evidence count (file patterns, commands) */
  mediumEvidence: number;
  /** Weak evidence count (text mentions) */
  weakEvidence: number;
  /** Evidence diversity score */
  diversityScore: number;
}

/**
 * Factor affecting confidence calculation
 */
export interface ConfidenceFactor {
  /** Factor type */
  type: FactorType;
  /** Factor description */
  description: string;
  /** Impact on confidence (-1 to 1) */
  impact: number;
  /** Affected components */
  affectedComponents: string[];
  /** Suggested resolution */
  resolution?: string;
}

/**
 * Types of factors affecting confidence
 */
export type FactorType = 
  | 'strong_evidence'      // Strong supporting evidence found
  | 'multiple_sources'     // Evidence from multiple sources
  | 'version_mismatch'     // Version conflicts detected
  | 'conflicting_evidence' // Contradictory evidence found
  | 'incomplete_info'      // Missing expected information
  | 'ambiguous_patterns'   // Patterns could match multiple frameworks
  | 'outdated_patterns'    // Patterns suggest outdated versions
  | 'minimal_evidence'     // Very little supporting evidence
  | 'file_access_error'    // Could not access expected files
  | 'parsing_error';       // Error parsing configuration files

/**
 * Confidence calculation utilities
 */
export interface ConfidenceCalculator {
  /**
   * Calculate overall confidence from evidence
   * @param evidence - Evidence array to analyze
   * @param detectionResults - Detection results to assess
   * @returns Overall confidence assessment
   */
  calculateOverallConfidence(evidence: Evidence[], detectionResults: any): OverallConfidence;
  
  /**
   * Calculate component-specific confidence
   * @param evidence - Evidence for this component
   * @param componentType - Type of component being assessed
   * @returns Component confidence assessment
   */
  calculateComponentConfidence(evidence: Evidence[], componentType: string): ComponentConfidence;
  
  /**
   * Assess evidence quality
   * @param evidence - Evidence to assess
   * @returns Evidence quality metrics
   */
  assessEvidenceQuality(evidence: Evidence[]): EvidenceQuality;
  
  /**
   * Identify confidence factors
   * @param evidence - Evidence to analyze
   * @param detectionResults - Detection results
   * @returns Array of confidence factors
   */
  identifyConfidenceFactors(evidence: Evidence[], detectionResults: any): ConfidenceFactor[];
}

/**
 * Evidence interface (re-exported for convenience)
 */
export interface Evidence {
  type: string;
  source: string;
  value: string;
  weight: number;
  location?: any;
  context?: Record<string, any>;
}