/**
 * Validation Types
 * 
 * Common types used across validation components
 */

/**
 * Validation result
 */
export interface ValidationResult {
  testId: string;
  passed: boolean;
  score: number;
  duration: number;
  metrics: ValidationMetrics;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  evidence: ValidationEvidence[];
  recommendations: string[];
}

/**
 * Validation metrics
 */
export interface ValidationMetrics {
  performance: PerformanceMetrics;
  security: SecurityMetrics;
  reliability: ReliabilityMetrics;
  usability: UsabilityMetrics;
  compliance: ComplianceMetrics;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  resourceUsage: ResourceUsage;
  scalability: ScalabilityMetrics;
  loadCapacity: LoadCapacityMetrics;
}

/**
 * Resource usage metrics
 */
export interface ResourceUsage {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

/**
 * Scalability metrics
 */
export interface ScalabilityMetrics {
  horizontalScaling: number;
  verticalScaling: number;
  elasticity: number;
  degradationPoint: number;
}

/**
 * Load capacity metrics
 */
export interface LoadCapacityMetrics {
  maxConcurrentUsers: number;
  maxRequestsPerSecond: number;
  breakingPoint: number;
  recoveryTime: number;
}

/**
 * Security metrics
 */
export interface SecurityMetrics {
  vulnerabilityScore: number;
  complianceScore: number;
  authenticationStrength: number;
  dataProtectionLevel: number;
  auditCoverage: number;
}

/**
 * Reliability metrics
 */
export interface ReliabilityMetrics {
  availability: number;
  mtbf: number; // Mean Time Between Failures
  mttr: number; // Mean Time To Recovery
  errorRate: number;
  resilience: number;
}

/**
 * Usability metrics
 */
export interface UsabilityMetrics {
  userSatisfaction: number;
  taskCompletionRate: number;
  errorRecovery: number;
  learnability: number;
  accessibility: number;
}

/**
 * Compliance metrics
 */
export interface ComplianceMetrics {
  regulatoryCompliance: number;
  policyCompliance: number;
  auditReadiness: number;
  documentationCoverage: number;
}

/**
 * Validation error
 */
export interface ValidationError {
  code: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  location?: string;
  suggestion?: string;
  impact: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  code: string;
  message: string;
  category: string;
  suggestion?: string;
  impact: string;
}

/**
 * Validation evidence
 */
export interface ValidationEvidence {
  type: 'screenshot' | 'log' | 'metric' | 'report' | 'artifact';
  name: string;
  path: string;
  description: string;
  timestamp: Date;
}