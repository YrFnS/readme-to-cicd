/**
 * Utilities for calculating confidence scores
 */

import { ConfidenceScores } from '../types';

/**
 * Calculate overall confidence score from individual component scores
 */
export function calculateOverallConfidence(scores: Omit<ConfidenceScores, 'overall'>): number {
  const weights = {
    languages: 0.25,
    dependencies: 0.25,
    commands: 0.20,
    testing: 0.15,
    metadata: 0.15
  };

  const weightedSum = 
    scores.languages * weights.languages +
    scores.dependencies * weights.dependencies +
    scores.commands * weights.commands +
    scores.testing * weights.testing +
    scores.metadata * weights.metadata;

  return Math.max(0, Math.min(1, weightedSum));
}

/**
 * Normalize confidence score to 0-1 range
 */
export function normalizeConfidence(score: number): number {
  return Math.max(0, Math.min(1, score));
}

/**
 * Calculate confidence based on number of sources and their reliability
 */
export function calculateSourceBasedConfidence(
  sources: string[], 
  sourceWeights: Record<string, number> = {}
): number {
  if (sources.length === 0) return 0;

  const defaultWeights: Record<string, number> = {
    'code-block': 0.9,
    'file-reference': 0.8,
    'pattern-match': 0.7,
    'text-mention': 0.6,
    'default': 0.5
  };

  const weights = { ...defaultWeights, ...sourceWeights };
  
  const totalWeight = sources.reduce((sum, source) => {
    const sourceWeight = weights[source];
    const defaultWeight = weights['default'];
    return sum + (sourceWeight ?? defaultWeight ?? 0.5);
  }, 0);

  return normalizeConfidence(totalWeight / sources.length);
}

/**
 * Combine multiple confidence scores using weighted average
 */
export function combineConfidenceScores(
  scores: number[], 
  weights?: number[]
): number {
  if (scores.length === 0) return 0;
  
  if (!weights || weights.length !== scores.length) {
    // Equal weights if not provided
    weights = new Array(scores.length).fill(1 / scores.length);
  }

  const weightedSum = scores.reduce((sum, score, index) => {
    const weight = weights?.[index] ?? 0;
    return sum + (score * weight);
  }, 0);

  return normalizeConfidence(weightedSum);
}

/**
 * Analyzer reliability weights based on historical performance and data quality
 */
export const ANALYZER_RELIABILITY_WEIGHTS: Record<string, number> = {
  'LanguageDetector': 0.95,
  'DependencyExtractor': 0.90,
  'CommandExtractor': 0.85,
  'TestingDetector': 0.80,
  'MetadataExtractor': 0.75,
  'AlternativeLanguageDetector': 0.70,
  'default': 0.60
};

/**
 * Calculate weighted confidence based on analyzer reliability
 */
export function calculateAnalyzerWeightedConfidence(
  analyzerConfidences: Map<string, number>,
  reliabilityWeights: Record<string, number> = ANALYZER_RELIABILITY_WEIGHTS
): number {
  if (analyzerConfidences.size === 0) return 0;

  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const [analyzerName, confidence] of analyzerConfidences) {
    const reliability = reliabilityWeights[analyzerName] ?? reliabilityWeights['default'] ?? 0.6;
    const weight = reliability;
    
    totalWeightedScore += confidence * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? normalizeConfidence(totalWeightedScore / totalWeight) : 0;
}

/**
 * Aggregate confidence scores from multiple analyzers with advanced algorithms
 */
export function aggregateAnalyzerConfidences(
  analyzerResults: Array<{
    analyzerName: string;
    confidence: number;
    dataQuality?: number;
    completeness?: number;
  }>,
  options: {
    algorithm?: 'weighted_average' | 'harmonic_mean' | 'geometric_mean' | 'consensus';
    reliabilityWeights?: Record<string, number>;
    qualityBoost?: boolean;
    consensusThreshold?: number;
  } = {}
): number {
  if (analyzerResults.length === 0) return 0;

  const {
    algorithm = 'weighted_average',
    reliabilityWeights = ANALYZER_RELIABILITY_WEIGHTS,
    qualityBoost = true,
    consensusThreshold = 0.7
  } = options;

  // Extract confidence scores and apply quality boost if enabled
  const confidences = analyzerResults.map(result => {
    let confidence = result.confidence;
    
    if (qualityBoost && result.dataQuality) {
      // Boost confidence based on data quality (up to 15% boost)
      const qualityBoostFactor = Math.min(0.15, (result.dataQuality - 0.5) * 0.3);
      confidence = Math.min(1.0, confidence + qualityBoostFactor);
    }
    
    return confidence;
  });

  const weights = analyzerResults.map(result => 
    reliabilityWeights[result.analyzerName] ?? reliabilityWeights['default'] ?? 0.6
  );

  switch (algorithm) {
    case 'weighted_average':
      return calculateWeightedAverage(confidences, weights);
    
    case 'harmonic_mean':
      return calculateHarmonicMean(confidences, weights);
    
    case 'geometric_mean':
      return calculateGeometricMean(confidences, weights);
    
    case 'consensus':
      return calculateConsensusConfidence(confidences, weights, consensusThreshold);
    
    default:
      return calculateWeightedAverage(confidences, weights);
  }
}

/**
 * Calculate weighted average confidence
 */
function calculateWeightedAverage(confidences: number[], weights: number[]): number {
  if (confidences.length === 0) return 0;
  
  const totalWeightedScore = confidences.reduce((sum, confidence, index) => {
    const weight = weights[index] ?? 0;
    return sum + (confidence * weight);
  }, 0);
  
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  
  return totalWeight > 0 ? normalizeConfidence(totalWeightedScore / totalWeight) : 0;
}

/**
 * Calculate harmonic mean confidence (more conservative, penalizes low scores)
 */
function calculateHarmonicMean(confidences: number[], weights: number[]): number {
  if (confidences.length === 0) return 0;
  
  // Filter out zero confidences to avoid division by zero
  const nonZeroConfidences = confidences.filter(c => c > 0);
  const nonZeroWeights = weights.filter((_, index) => (confidences[index] ?? 0) > 0);
  
  if (nonZeroConfidences.length === 0) return 0;
  
  const weightedReciprocalSum = nonZeroConfidences.reduce((sum, confidence, index) => {
    const weight = nonZeroWeights[index] ?? 0;
    return sum + (weight / confidence);
  }, 0);
  
  const totalWeight = nonZeroWeights.reduce((sum, weight) => sum + weight, 0);
  
  return totalWeight > 0 ? normalizeConfidence(totalWeight / weightedReciprocalSum) : 0;
}

/**
 * Calculate geometric mean confidence (balanced approach)
 */
function calculateGeometricMean(confidences: number[], weights: number[]): number {
  if (confidences.length === 0) return 0;
  
  // Filter out zero confidences
  const nonZeroConfidences = confidences.filter(c => c > 0);
  const nonZeroWeights = weights.filter((_, index) => (confidences[index] ?? 0) > 0);
  
  if (nonZeroConfidences.length === 0) return 0;
  
  const totalWeight = nonZeroWeights.reduce((sum, weight) => sum + weight, 0);
  
  const weightedProduct = nonZeroConfidences.reduce((product, confidence, index) => {
    const weight = nonZeroWeights[index] ?? 0;
    const normalizedWeight = weight / totalWeight;
    return product * Math.pow(confidence, normalizedWeight);
  }, 1);
  
  return normalizeConfidence(weightedProduct);
}

/**
 * Calculate consensus-based confidence (requires agreement above threshold)
 */
function calculateConsensusConfidence(
  confidences: number[], 
  weights: number[], 
  threshold: number
): number {
  if (confidences.length === 0) return 0;
  
  // Calculate weighted average first
  const weightedAverage = calculateWeightedAverage(confidences, weights);
  
  // Check how many analyzers agree within threshold
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let consensusWeight = 0;
  
  confidences.forEach((confidence, index) => {
    if (Math.abs(confidence - weightedAverage) <= (1 - threshold)) {
      const weight = weights[index] ?? 0;
      consensusWeight += weight;
    }
  });
  
  const consensusRatio = totalWeight > 0 ? consensusWeight / totalWeight : 0;
  
  // Apply consensus penalty if agreement is low
  const consensusPenalty = consensusRatio < threshold ? 0.8 : 1.0;
  
  return normalizeConfidence(weightedAverage * consensusPenalty);
}

/**
 * Calculate confidence aggregation with conflict detection and resolution
 */
export function aggregateWithConflictResolution(
  analyzerResults: Array<{
    analyzerName: string;
    confidence: number;
    dataQuality?: number;
    completeness?: number;
  }>,
  conflictThreshold: number = 0.3
): {
  aggregatedConfidence: number;
  conflicts: Array<{
    analyzers: string[];
    confidenceRange: [number, number];
    severity: 'low' | 'medium' | 'high';
  }>;
} {
  if (analyzerResults.length === 0) {
    return { aggregatedConfidence: 0, conflicts: [] };
  }

  // Detect conflicts
  const conflicts = detectConfidenceConflicts(analyzerResults, conflictThreshold);
  
  // Calculate base confidence
  let baseConfidence = aggregateAnalyzerConfidences(analyzerResults);
  
  // Apply conflict penalty
  const conflictPenalty = calculateConflictPenalty(conflicts);
  const finalConfidence = normalizeConfidence(baseConfidence * conflictPenalty);
  
  return {
    aggregatedConfidence: finalConfidence,
    conflicts
  };
}

/**
 * Detect conflicts between analyzer confidence scores
 */
function detectConfidenceConflicts(
  analyzerResults: Array<{
    analyzerName: string;
    confidence: number;
  }>,
  threshold: number
): Array<{
  analyzers: string[];
  confidenceRange: [number, number];
  severity: 'low' | 'medium' | 'high';
}> {
  const conflicts: Array<{
    analyzers: string[];
    confidenceRange: [number, number];
    severity: 'low' | 'medium' | 'high';
  }> = [];

  // Compare each pair of analyzers
  for (let i = 0; i < analyzerResults.length; i++) {
    for (let j = i + 1; j < analyzerResults.length; j++) {
      const result1 = analyzerResults[i];
      const result2 = analyzerResults[j];
      
      if (!result1 || !result2) continue;
      
      const confidenceDiff = Math.abs(result1.confidence - result2.confidence);
      
      if (confidenceDiff > threshold) {
        const minConfidence = Math.min(result1.confidence, result2.confidence);
        const maxConfidence = Math.max(result1.confidence, result2.confidence);
        
        let severity: 'low' | 'medium' | 'high';
        if (confidenceDiff > 0.6) severity = 'high';
        else if (confidenceDiff > 0.4) severity = 'medium';
        else severity = 'low';
        
        conflicts.push({
          analyzers: [result1.analyzerName, result2.analyzerName],
          confidenceRange: [minConfidence, maxConfidence],
          severity
        });
      }
    }
  }

  return conflicts;
}

/**
 * Calculate penalty factor based on detected conflicts
 */
function calculateConflictPenalty(conflicts: Array<{ severity: 'low' | 'medium' | 'high' }>): number {
  if (conflicts.length === 0) return 1.0;
  
  const severityWeights = { low: 0.05, medium: 0.1, high: 0.2 };
  
  const totalPenalty = conflicts.reduce((penalty, conflict) => {
    return penalty + severityWeights[conflict.severity];
  }, 0);
  
  // Cap penalty at 50%
  return Math.max(0.5, 1.0 - Math.min(0.5, totalPenalty));
}