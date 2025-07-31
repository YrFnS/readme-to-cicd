import { describe, it, expect, beforeEach } from 'vitest';
import { ConfidenceCalculator } from '../../../src/detection/utils/confidence-calculator';
import { Evidence } from '../../../src/detection/interfaces/evidence';
import { FrameworkInfo } from '../../../src/detection/interfaces/framework-info';

describe('ConfidenceCalculator', () => {
  let calculator: ConfidenceCalculator;

  beforeEach(() => {
    calculator = new ConfidenceCalculator();
  });

  describe('overall confidence calculation', () => {
    it('should calculate high confidence with strong evidence', () => {
      const evidence: Evidence[] = [
        {
          type: 'config_file',
          source: 'package.json',
          value: 'package.json',
          weight: 0.8
        },
        {
          type: 'dependency',
          source: 'package.json',
          value: 'react',
          weight: 0.7
        },
        {
          type: 'command_pattern',
          source: 'scripts',
          value: 'npm run build',
          weight: 0.5
        }
      ];

      const detectionResults = {
        frameworks: [
          {
            name: 'React',
            confidence: 0.9,
            ecosystem: 'nodejs'
          }
        ],
        buildTools: [],
        analyzerResults: []
      };

      const confidence = calculator.calculateOverallConfidence(evidence, detectionResults);

      expect(confidence.score).toBeGreaterThan(0.5);
      expect(confidence.level).toBe('medium');
      expect(confidence.breakdown.frameworks.score).toBeGreaterThan(0.6);
    });

    it('should calculate low confidence with weak evidence', () => {
      const evidence: Evidence[] = [
        {
          type: 'text_mention',
          source: 'readme',
          value: 'react',
          weight: 0.2
        }
      ];

      const detectionResults = {
        frameworks: [],
        buildTools: [],
        analyzerResults: []
      };

      const confidence = calculator.calculateOverallConfidence(evidence, detectionResults);

      expect(confidence.score).toBeLessThan(0.3);
      expect(confidence.level).toBe('none');
    });

    it('should calculate medium confidence with mixed evidence', () => {
      const evidence: Evidence[] = [
        {
          type: 'dependency',
          source: 'package.json',
          value: 'express',
          weight: 0.7
        },
        {
          type: 'text_mention',
          source: 'readme',
          value: 'express',
          weight: 0.2
        },
        {
          type: 'file_pattern',
          source: 'app.js',
          value: 'app.js',
          weight: 0.4
        }
      ];

      const detectionResults = {
        frameworks: [
          {
            name: 'Express',
            confidence: 0.6,
            ecosystem: 'nodejs'
          }
        ],
        buildTools: [],
        analyzerResults: []
      };

      const confidence = calculator.calculateOverallConfidence(evidence, detectionResults);

      expect(confidence.score).toBeGreaterThan(0.3);
      expect(confidence.score).toBeLessThan(0.7);
      expect(confidence.level).toBe('low');
    });

    it('should return none confidence with no evidence', () => {
      const evidence: Evidence[] = [];
      const detectionResults = {
        frameworks: [],
        buildTools: [],
        analyzerResults: []
      };

      const confidence = calculator.calculateOverallConfidence(evidence, detectionResults);

      expect(confidence.score).toBe(0);
      expect(confidence.level).toBe('none');
    });
  });

  describe('component confidence calculation', () => {
    it('should calculate framework confidence correctly', () => {
      const evidence: Evidence[] = [
        {
          type: 'dependency',
          source: 'package.json',
          value: 'react',
          weight: 0.8
        },
        {
          type: 'config_file',
          source: 'webpack.config.js',
          value: 'webpack.config.js',
          weight: 0.7
        }
      ];

      const frameworks: FrameworkInfo[] = [
        {
          name: 'React',
          type: 'frontend_framework',
          confidence: 0.9,
          evidence: [],
          ecosystem: 'nodejs'
        }
      ];

      const componentConfidence = calculator.calculateComponentConfidence(
        evidence,
        'frameworks',
        frameworks
      );

      expect(componentConfidence.score).toBeGreaterThan(0.6);
      expect(componentConfidence.detectedCount).toBe(1);
      expect(componentConfidence.evidenceQuality.strongEvidence).toBe(2);
    });

    it('should handle empty evidence gracefully', () => {
      const evidence: Evidence[] = [];
      const frameworks: FrameworkInfo[] = [];

      const componentConfidence = calculator.calculateComponentConfidence(
        evidence,
        'frameworks',
        frameworks
      );

      expect(componentConfidence.score).toBe(0);
      expect(componentConfidence.detectedCount).toBe(0);
      expect(componentConfidence.evidenceQuality.strongEvidence).toBe(0);
    });

    it('should boost score for multiple detected items', () => {
      const evidence: Evidence[] = [
        {
          type: 'dependency',
          source: 'package.json',
          value: 'react',
          weight: 0.5
        }
      ];

      const multipleFrameworks: FrameworkInfo[] = [
        {
          name: 'React',
          type: 'frontend_framework',
          confidence: 0.8,
          evidence: [],
          ecosystem: 'nodejs'
        },
        {
          name: 'Express',
          type: 'web_framework',
          confidence: 0.7,
          evidence: [],
          ecosystem: 'nodejs'
        }
      ];

      const componentConfidence = calculator.calculateComponentConfidence(
        evidence,
        'frameworks',
        multipleFrameworks
      );

      expect(componentConfidence.score).toBeGreaterThan(0.5);
      expect(componentConfidence.detectedCount).toBe(2);
    });
  });

  describe('evidence quality assessment', () => {
    it('should correctly categorize evidence by strength', () => {
      const evidence: Evidence[] = [
        { type: 'config_file', source: 'package.json', value: 'package.json', weight: 0.8 }, // Strong
        { type: 'dependency', source: 'package.json', value: 'react', weight: 0.7 }, // Strong
        { type: 'command_pattern', source: 'scripts', value: 'npm build', weight: 0.5 }, // Medium
        { type: 'file_pattern', source: 'src/', value: 'src/', weight: 0.4 }, // Medium
        { type: 'text_mention', source: 'readme', value: 'react', weight: 0.2 }, // Weak
        { type: 'text_mention', source: 'readme', value: 'frontend', weight: 0.1 } // Weak
      ];

      const quality = calculator.assessEvidenceQuality(evidence);

      expect(quality.strongEvidence).toBe(2);
      expect(quality.mediumEvidence).toBe(2);
      expect(quality.weakEvidence).toBe(2);
      expect(quality.diversityScore).toBeGreaterThan(0);
    });

    it('should calculate diversity score correctly', () => {
      const diverseEvidence: Evidence[] = [
        { type: 'config_file', source: 'package.json', value: 'package.json', weight: 0.8 },
        { type: 'dependency', source: 'package.json', value: 'react', weight: 0.7 },
        { type: 'command_pattern', source: 'scripts', value: 'npm build', weight: 0.5 },
        { type: 'file_pattern', source: 'src/', value: 'src/', weight: 0.4 },
        { type: 'text_mention', source: 'readme', value: 'react', weight: 0.2 }
      ];

      const limitedEvidence: Evidence[] = [
        { type: 'text_mention', source: 'readme', value: 'react', weight: 0.2 },
        { type: 'text_mention', source: 'readme', value: 'frontend', weight: 0.1 }
      ];

      const diverseQuality = calculator.assessEvidenceQuality(diverseEvidence);
      const limitedQuality = calculator.assessEvidenceQuality(limitedEvidence);

      expect(diverseQuality.diversityScore).toBeGreaterThan(limitedQuality.diversityScore);
    });
  });

  describe('confidence factors identification', () => {
    it('should identify strong evidence factor', () => {
      const evidence: Evidence[] = [
        {
          type: 'config_file',
          source: 'package.json',
          value: 'package.json',
          weight: 0.9
        },
        {
          type: 'dependency',
          source: 'package.json',
          value: 'react',
          weight: 0.8
        }
      ];

      const detectionResults = {
        frameworks: [{ name: 'React', confidence: 0.9 }],
        buildTools: []
      };

      const factors = calculator.identifyConfidenceFactors(evidence, detectionResults);

      const strongEvidenceFactor = factors.find(f => f.type === 'strong_evidence');
      expect(strongEvidenceFactor).toBeDefined();
      expect(strongEvidenceFactor?.impact).toBeGreaterThan(0);
    });

    it('should identify multiple sources factor', () => {
      const evidence: Evidence[] = [
        {
          type: 'dependency',
          source: 'package.json',
          value: 'react',
          weight: 0.7
        },
        {
          type: 'text_mention',
          source: 'readme.md',
          value: 'react',
          weight: 0.3
        },
        {
          type: 'command_pattern',
          source: 'scripts',
          value: 'npm start',
          weight: 0.5
        }
      ];

      const detectionResults = {
        frameworks: [{ name: 'React', confidence: 0.8 }],
        buildTools: []
      };

      const factors = calculator.identifyConfidenceFactors(evidence, detectionResults);

      const multipleSourcesFactor = factors.find(f => f.type === 'multiple_sources');
      expect(multipleSourcesFactor).toBeDefined();
      expect(multipleSourcesFactor?.impact).toBeGreaterThan(0);
    });

    it('should identify minimal evidence factor', () => {
      const evidence: Evidence[] = [
        {
          type: 'text_mention',
          source: 'readme',
          value: 'react',
          weight: 0.2
        }
      ];

      const detectionResults = {
        frameworks: [],
        buildTools: []
      };

      const factors = calculator.identifyConfidenceFactors(evidence, detectionResults);

      const minimalEvidenceFactor = factors.find(f => f.type === 'minimal_evidence');
      expect(minimalEvidenceFactor).toBeDefined();
      expect(minimalEvidenceFactor?.impact).toBeLessThan(0);
      expect(minimalEvidenceFactor?.resolution).toBeDefined();
    });
  });

  describe('confidence level mapping', () => {
    it('should map scores to correct confidence levels', () => {
      const highConfidence = calculator.calculateOverallConfidence(
        [
          { type: 'config_file', source: 'package.json', value: 'package.json', weight: 0.9 },
          { type: 'dependency', source: 'package.json', value: 'react', weight: 0.8 }
        ],
        { frameworks: [{ name: 'React', confidence: 0.9 }], buildTools: [], analyzerResults: [] }
      );

      const mediumConfidence = calculator.calculateOverallConfidence(
        [
          { type: 'dependency', source: 'package.json', value: 'express', weight: 0.6 },
          { type: 'text_mention', source: 'readme', value: 'express', weight: 0.3 }
        ],
        { frameworks: [{ name: 'Express', confidence: 0.6 }], buildTools: [], analyzerResults: [] }
      );

      const lowConfidence = calculator.calculateOverallConfidence(
        [
          { type: 'text_mention', source: 'readme', value: 'maybe react', weight: 0.1 }
        ],
        { frameworks: [], buildTools: [], analyzerResults: [] }
      );

      const noConfidence = calculator.calculateOverallConfidence(
        [],
        { frameworks: [], buildTools: [], analyzerResults: [] }
      );

      expect(highConfidence.level).toBe('medium');
      expect(mediumConfidence.level).toBe('low');
      expect(lowConfidence.level).toBe('none');
      expect(noConfidence.level).toBe('none');
    });
  });

  describe('recommendations generation', () => {
    it('should generate appropriate recommendations for low confidence', () => {
      const evidence: Evidence[] = [
        {
          type: 'text_mention',
          source: 'readme',
          value: 'react',
          weight: 0.2
        }
      ];

      const detectionResults = {
        frameworks: [],
        buildTools: [],
        analyzerResults: []
      };

      const confidence = calculator.calculateOverallConfidence(evidence, detectionResults);

      expect(confidence.recommendations).toContain('Consider adding more specific configuration files');
      expect(confidence.recommendations).toContain('Include framework versions in documentation');
    });

    it('should include factor-specific recommendations', () => {
      const evidence: Evidence[] = [
        {
          type: 'text_mention',
          source: 'readme',
          value: 'react',
          weight: 0.1
        }
      ];

      const detectionResults = {
        frameworks: [],
        buildTools: [],
        analyzerResults: []
      };

      const confidence = calculator.calculateOverallConfidence(evidence, detectionResults);

      expect(confidence.recommendations.some(r => r.includes('configuration files'))).toBe(true);
    });

    it('should not duplicate recommendations', () => {
      const evidence: Evidence[] = [
        {
          type: 'text_mention',
          source: 'readme',
          value: 'react',
          weight: 0.1
        }
      ];

      const detectionResults = {
        frameworks: [],
        buildTools: [],
        analyzerResults: []
      };

      const confidence = calculator.calculateOverallConfidence(evidence, detectionResults);

      const uniqueRecommendations = new Set(confidence.recommendations);
      expect(confidence.recommendations.length).toBe(uniqueRecommendations.size);
    });
  });
});