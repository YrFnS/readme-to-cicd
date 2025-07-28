/**
 * Tests for confidence calculation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  calculateOverallConfidence,
  normalizeConfidence,
  calculateSourceBasedConfidence,
  combineConfidenceScores,
  aggregateAnalyzerConfidences,
  aggregateWithConflictResolution,
  ANALYZER_RELIABILITY_WEIGHTS
} from '../../src/parser/utils/confidence-calculator';

describe('ConfidenceCalculator', () => {
  describe('calculateOverallConfidence', () => {
    it('should calculate weighted overall confidence correctly', () => {
      const scores = {
        languages: 1.0,
        dependencies: 0.8,
        commands: 0.6,
        testing: 0.4,
        metadata: 0.2
      };

      const result = calculateOverallConfidence(scores);

      // Expected: (1.0 * 0.25) + (0.8 * 0.25) + (0.6 * 0.20) + (0.4 * 0.15) + (0.2 * 0.15) = 0.66
      expect(result).toBeCloseTo(0.66, 2);
    });

    it('should handle zero scores', () => {
      const scores = {
        languages: 0,
        dependencies: 0,
        commands: 0,
        testing: 0,
        metadata: 0
      };

      const result = calculateOverallConfidence(scores);
      expect(result).toBe(0);
    });

    it('should normalize result to 0-1 range', () => {
      const scores = {
        languages: 1.5, // Over 1.0
        dependencies: 1.2,
        commands: 1.1,
        testing: 1.0,
        metadata: 0.9
      };

      const result = calculateOverallConfidence(scores);
      expect(result).toBeLessThanOrEqual(1.0);
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('normalizeConfidence', () => {
    it('should clamp values to 0-1 range', () => {
      expect(normalizeConfidence(-0.5)).toBe(0);
      expect(normalizeConfidence(0)).toBe(0);
      expect(normalizeConfidence(0.5)).toBe(0.5);
      expect(normalizeConfidence(1.0)).toBe(1.0);
      expect(normalizeConfidence(1.5)).toBe(1.0);
    });
  });

  describe('calculateSourceBasedConfidence', () => {
    it('should calculate confidence based on source types', () => {
      const sources = ['code-block', 'file-reference', 'text-mention'];
      const result = calculateSourceBasedConfidence(sources);

      // Expected: (0.9 + 0.8 + 0.6) / 3 = 0.77
      expect(result).toBeCloseTo(0.77, 2);
    });

    it('should handle empty sources', () => {
      const result = calculateSourceBasedConfidence([]);
      expect(result).toBe(0);
    });

    it('should use custom source weights', () => {
      const sources = ['custom-source'];
      const customWeights = { 'custom-source': 0.95 };
      
      const result = calculateSourceBasedConfidence(sources, customWeights);
      expect(result).toBe(0.95);
    });

    it('should use default weight for unknown sources', () => {
      const sources = ['unknown-source'];
      const result = calculateSourceBasedConfidence(sources);
      expect(result).toBe(0.5); // default weight
    });
  });

  describe('combineConfidenceScores', () => {
    it('should calculate weighted average with provided weights', () => {
      const scores = [0.8, 0.6, 0.4];
      const weights = [0.5, 0.3, 0.2];
      
      const result = combineConfidenceScores(scores, weights);
      
      // Expected: (0.8 * 0.5) + (0.6 * 0.3) + (0.4 * 0.2) = 0.66
      expect(result).toBeCloseTo(0.66, 2);
    });

    it('should use equal weights when not provided', () => {
      const scores = [0.6, 0.9, 0.3];
      const result = combineConfidenceScores(scores);
      
      // Expected: (0.6 + 0.9 + 0.3) / 3 = 0.6
      expect(result).toBeCloseTo(0.6, 2);
    });

    it('should handle empty scores', () => {
      const result = combineConfidenceScores([]);
      expect(result).toBe(0);
    });

    it('should handle mismatched weights length', () => {
      const scores = [0.8, 0.6, 0.4];
      const weights = [0.7, 0.3]; // Shorter than scores
      
      const result = combineConfidenceScores(scores, weights);
      
      // Should fall back to equal weights
      expect(result).toBeCloseTo(0.6, 2);
    });
  });

  describe('aggregateAnalyzerConfidences', () => {
    it('should aggregate using weighted average algorithm', () => {
      const analyzerResults = [
        { analyzerName: 'LanguageDetector', confidence: 0.9, dataQuality: 0.95 },
        { analyzerName: 'DependencyExtractor', confidence: 0.8, dataQuality: 0.85 },
        { analyzerName: 'CommandExtractor', confidence: 0.7, dataQuality: 0.75 }
      ];

      const result = aggregateAnalyzerConfidences(analyzerResults, {
        algorithm: 'weighted_average'
      });

      expect(result).toBeGreaterThan(0.7);
      expect(result).toBeLessThanOrEqual(1.0);
    });

    it('should apply quality boost when enabled', () => {
      const highQualityResults = [
        { analyzerName: 'LanguageDetector', confidence: 0.8, dataQuality: 0.95 }
      ];

      const lowQualityResults = [
        { analyzerName: 'LanguageDetector', confidence: 0.8, dataQuality: 0.5 }
      ];

      const highQualityResult = aggregateAnalyzerConfidences(highQualityResults, {
        qualityBoost: true
      });

      const lowQualityResult = aggregateAnalyzerConfidences(lowQualityResults, {
        qualityBoost: true
      });

      expect(highQualityResult).toBeGreaterThan(lowQualityResult);
    });

    it('should use harmonic mean algorithm', () => {
      const analyzerResults = [
        { analyzerName: 'LanguageDetector', confidence: 0.9 },
        { analyzerName: 'DependencyExtractor', confidence: 0.6 }
      ];

      const harmonicResult = aggregateAnalyzerConfidences(analyzerResults, {
        algorithm: 'harmonic_mean'
      });

      const weightedResult = aggregateAnalyzerConfidences(analyzerResults, {
        algorithm: 'weighted_average'
      });

      // Harmonic mean should be more conservative (lower) than weighted average
      expect(harmonicResult).toBeLessThan(weightedResult);
    });

    it('should use geometric mean algorithm', () => {
      const analyzerResults = [
        { analyzerName: 'LanguageDetector', confidence: 0.9 },
        { analyzerName: 'DependencyExtractor', confidence: 0.8 }
      ];

      const result = aggregateAnalyzerConfidences(analyzerResults, {
        algorithm: 'geometric_mean'
      });

      // Geometric mean of 0.9 and 0.8 with equal weights ≈ 0.849
      expect(result).toBeCloseTo(0.849, 2);
    });

    it('should use consensus algorithm with threshold', () => {
      const consensusResults = [
        { analyzerName: 'LanguageDetector', confidence: 0.85 },
        { analyzerName: 'DependencyExtractor', confidence: 0.87 },
        { analyzerName: 'CommandExtractor', confidence: 0.83 }
      ];

      const conflictResults = [
        { analyzerName: 'LanguageDetector', confidence: 0.9 },
        { analyzerName: 'DependencyExtractor', confidence: 0.3 },
        { analyzerName: 'CommandExtractor', confidence: 0.8 }
      ];

      const consensusResult = aggregateAnalyzerConfidences(consensusResults, {
        algorithm: 'consensus',
        consensusThreshold: 0.8
      });

      const conflictResult = aggregateAnalyzerConfidences(conflictResults, {
        algorithm: 'consensus',
        consensusThreshold: 0.8
      });

      // Consensus should be higher when analyzers agree
      expect(consensusResult).toBeGreaterThan(conflictResult);
    });

    it('should handle empty analyzer results', () => {
      const result = aggregateAnalyzerConfidences([]);
      expect(result).toBe(0);
    });

    it('should use custom reliability weights', () => {
      const analyzerResults = [
        { analyzerName: 'CustomAnalyzer', confidence: 0.8 }
      ];

      const customWeights = { 'CustomAnalyzer': 0.95 };

      const result = aggregateAnalyzerConfidences(analyzerResults, {
        reliabilityWeights: customWeights
      });

      expect(result).toBe(0.8); // Should use the confidence as-is with high reliability
    });
  });

  describe('aggregateWithConflictResolution', () => {
    it('should detect conflicts between analyzers', () => {
      const conflictingResults = [
        { analyzerName: 'LanguageDetector', confidence: 0.9 },
        { analyzerName: 'AlternativeDetector', confidence: 0.3 } // High conflict
      ];

      const { aggregatedConfidence, conflicts } = aggregateWithConflictResolution(
        conflictingResults,
        0.3 // conflict threshold
      );

      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].severity).toBe('high');
      expect(conflicts[0].analyzers).toEqual(['LanguageDetector', 'AlternativeDetector']);
      expect(conflicts[0].confidenceRange).toEqual([0.3, 0.9]);
      
      // Should apply conflict penalty
      expect(aggregatedConfidence).toBeLessThan(0.8);
    });

    it('should not detect conflicts when differences are below threshold', () => {
      const similarResults = [
        { analyzerName: 'LanguageDetector', confidence: 0.85 },
        { analyzerName: 'AlternativeDetector', confidence: 0.87 } // Low difference
      ];

      const { conflicts } = aggregateWithConflictResolution(
        similarResults,
        0.3 // conflict threshold
      );

      expect(conflicts.length).toBe(0);
    });

    it('should classify conflict severity correctly', () => {
      const highConflictResults = [
        { analyzerName: 'Analyzer1', confidence: 0.9 },
        { analyzerName: 'Analyzer2', confidence: 0.2 } // 0.7 difference = high
      ];

      const mediumConflictResults = [
        { analyzerName: 'Analyzer1', confidence: 0.8 },
        { analyzerName: 'Analyzer2', confidence: 0.3 } // 0.5 difference = medium
      ];

      const lowConflictResults = [
        { analyzerName: 'Analyzer1', confidence: 0.7 },
        { analyzerName: 'Analyzer2', confidence: 0.35 } // 0.35 difference = low
      ];

      const highResult = aggregateWithConflictResolution(highConflictResults, 0.3);
      const mediumResult = aggregateWithConflictResolution(mediumConflictResults, 0.3);
      const lowResult = aggregateWithConflictResolution(lowConflictResults, 0.3);

      expect(highResult.conflicts[0].severity).toBe('high');
      expect(mediumResult.conflicts[0].severity).toBe('medium');
      expect(lowResult.conflicts[0].severity).toBe('low');
    });

    it('should apply appropriate conflict penalties', () => {
      const noConflictResults = [
        { analyzerName: 'LanguageDetector', confidence: 0.85 },
        { analyzerName: 'DependencyExtractor', confidence: 0.87 }
      ];

      const highConflictResults = [
        { analyzerName: 'LanguageDetector', confidence: 0.9 },
        { analyzerName: 'AlternativeDetector', confidence: 0.1 }
      ];

      const noConflictResult = aggregateWithConflictResolution(noConflictResults, 0.3);
      const highConflictResult = aggregateWithConflictResolution(highConflictResults, 0.3);

      expect(noConflictResult.aggregatedConfidence).toBeGreaterThan(
        highConflictResult.aggregatedConfidence
      );
    });

    it('should handle empty results', () => {
      const { aggregatedConfidence, conflicts } = aggregateWithConflictResolution([]);
      
      expect(aggregatedConfidence).toBe(0);
      expect(conflicts).toHaveLength(0);
    });

    it('should handle single analyzer result', () => {
      const singleResult = [
        { analyzerName: 'LanguageDetector', confidence: 0.8 }
      ];

      const { aggregatedConfidence, conflicts } = aggregateWithConflictResolution(singleResult);
      
      expect(aggregatedConfidence).toBe(0.8);
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('ANALYZER_RELIABILITY_WEIGHTS', () => {
    it('should have expected reliability weights', () => {
      expect(ANALYZER_RELIABILITY_WEIGHTS['LanguageDetector']).toBe(0.95);
      expect(ANALYZER_RELIABILITY_WEIGHTS['DependencyExtractor']).toBe(0.90);
      expect(ANALYZER_RELIABILITY_WEIGHTS['CommandExtractor']).toBe(0.85);
      expect(ANALYZER_RELIABILITY_WEIGHTS['TestingDetector']).toBe(0.80);
      expect(ANALYZER_RELIABILITY_WEIGHTS['MetadataExtractor']).toBe(0.75);
      expect(ANALYZER_RELIABILITY_WEIGHTS['AlternativeLanguageDetector']).toBe(0.70);
      expect(ANALYZER_RELIABILITY_WEIGHTS['default']).toBe(0.60);
    });

    it('should provide default weight for unknown analyzers', () => {
      const analyzerResults = [
        { analyzerName: 'UnknownAnalyzer', confidence: 0.8 }
      ];

      const result = aggregateAnalyzerConfidences(analyzerResults);
      
      // Should use default reliability weight
      expect(result).toBe(0.8);
    });
  });
});