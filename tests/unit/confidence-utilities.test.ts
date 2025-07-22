/**
 * Tests for confidence calculation utilities
 */

import { describe, it, expect } from 'vitest';
import { 
  calculateOverallConfidence,
  normalizeConfidence,
  calculateSourceBasedConfidence,
  combineConfidenceScores
} from '../../src/parser/utils/confidence-calculator';

describe('Confidence Utilities', () => {
  describe('calculateOverallConfidence', () => {
    it('should calculate weighted average correctly', () => {
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

    it('should handle all zero scores', () => {
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

    it('should handle all maximum scores', () => {
      const scores = {
        languages: 1.0,
        dependencies: 1.0,
        commands: 1.0,
        testing: 1.0,
        metadata: 1.0
      };

      const result = calculateOverallConfidence(scores);
      expect(result).toBe(1.0);
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
      
      // Expected: (0.9 + 0.8 + 0.6) / 3 = 0.767
      expect(result).toBeCloseTo(0.767, 2);
    });

    it('should handle empty sources', () => {
      const result = calculateSourceBasedConfidence([]);
      expect(result).toBe(0);
    });

    it('should use custom weights when provided', () => {
      const sources = ['custom-source'];
      const weights = { 'custom-source': 0.95 };
      const result = calculateSourceBasedConfidence(sources, weights);
      
      expect(result).toBe(0.95);
    });

    it('should use default weight for unknown sources', () => {
      const sources = ['unknown-source'];
      const result = calculateSourceBasedConfidence(sources);
      
      expect(result).toBe(0.5); // default weight
    });
  });

  describe('combineConfidenceScores', () => {
    it('should combine scores with equal weights by default', () => {
      const scores = [0.8, 0.6, 0.4];
      const result = combineConfidenceScores(scores);
      
      // Expected: (0.8 + 0.6 + 0.4) / 3 = 0.6
      expect(result).toBeCloseTo(0.6, 2);
    });

    it('should combine scores with custom weights', () => {
      const scores = [0.8, 0.6];
      const weights = [0.7, 0.3];
      const result = combineConfidenceScores(scores, weights);
      
      // Expected: (0.8 * 0.7) + (0.6 * 0.3) = 0.56 + 0.18 = 0.74
      expect(result).toBeCloseTo(0.74, 2);
    });

    it('should handle empty scores array', () => {
      const result = combineConfidenceScores([]);
      expect(result).toBe(0);
    });

    it('should handle mismatched weights array', () => {
      const scores = [0.8, 0.6, 0.4];
      const weights = [0.5]; // Wrong length
      const result = combineConfidenceScores(scores, weights);
      
      // Should fall back to equal weights
      expect(result).toBeCloseTo(0.6, 2);
    });
  });
});