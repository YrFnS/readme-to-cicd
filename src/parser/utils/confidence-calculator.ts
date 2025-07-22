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