import { describe, it, expect, beforeEach } from 'vitest';
import { ResultAggregator } from '../../../src/detection/utils/result-aggregator';
import { LanguageDetectionResult } from '../../../src/detection/interfaces/language-analyzer';
import { FrameworkInfo } from '../../../src/detection/interfaces/framework-info';

describe('ResultAggregator', () => {
  let aggregator: ResultAggregator;

  beforeEach(() => {
    aggregator = new ResultAggregator();
  });

  describe('analyzer result merging', () => {
    it('should merge results from multiple analyzers', () => {
      const nodeResult: LanguageDetectionResult = {
        frameworks: [
          {
            name: 'React',
            type: 'frontend_framework',
            version: '18.0.0',
            confidence: 0.9,
            evidence: [],
            ecosystem: 'nodejs'
          },
          {
            name: 'Express',
            type: 'web_framework',
            version: '4.18.0',
            confidence: 0.8,
            evidence: [],
            ecosystem: 'nodejs'
          }
        ],
        buildTools: [
          {
            name: 'webpack',
            configFile: 'webpack.config.js',
            commands: [],
            confidence: 0.7
          }
        ],
        confidence: 0.85,
        recommendations: ['Add TypeScript for better type safety'],
        metadata: {
          executionTime: 100,
          filesAnalyzed: ['package.json'],
          patternsMatched: ['react', 'express'],
          warnings: ['Missing test configuration']
        }
      };

      const pythonResult: LanguageDetectionResult = {
        frameworks: [
          {
            name: 'Django',
            type: 'web_framework',
            version: '4.2.0',
            confidence: 0.85,
            evidence: [],
            ecosystem: 'python'
          }
        ],
        buildTools: [
          {
            name: 'pip',
            configFile: 'requirements.txt',
            commands: [],
            confidence: 0.9
          }
        ],
        confidence: 0.85,
        recommendations: ['Add pytest for testing'],
        metadata: {
          executionTime: 80,
          filesAnalyzed: ['requirements.txt'],
          patternsMatched: ['django'],
          warnings: ['No virtual environment detected']
        }
      };

      const merged = aggregator.mergeAnalyzerResults([nodeResult, pythonResult]);

      expect(merged.frameworks).toHaveLength(3);
      expect(merged.buildTools).toHaveLength(2);
      expect(merged.warnings).toHaveLength(0); // No warnings expected from clean merge

      const frameworkNames = merged.frameworks!.map(f => f.name);
      expect(frameworkNames).toContain('React');
      expect(frameworkNames).toContain('Express');
      expect(frameworkNames).toContain('Django');
    });

    it('should handle empty results array', () => {
      const merged = aggregator.mergeAnalyzerResults([]);

      expect(merged.frameworks).toHaveLength(0);
      expect(merged.buildTools).toHaveLength(0);
      expect(merged.warnings).toHaveLength(0);
    });

    it('should handle single analyzer result', () => {
      const singleResult: LanguageDetectionResult = {
        frameworks: [
          {
            name: 'Vue',
            type: 'frontend_framework',
            version: '3.0.0',
            confidence: 0.8,
            evidence: [],
            ecosystem: 'nodejs'
          }
        ],
        buildTools: [],
        confidence: 0.8,
        recommendations: [],
        metadata: {
          executionTime: 50,
          filesAnalyzed: ['package.json'],
          patternsMatched: ['vue'],
          warnings: []
        }
      };

      const merged = aggregator.mergeAnalyzerResults([singleResult]);

      expect(merged.frameworks).toHaveLength(1);
      expect(merged.frameworks![0].name).toBe('Vue');
    });
  });

  describe('framework deduplication', () => {
    it('should remove duplicate frameworks and keep highest confidence', () => {
      const result1: LanguageDetectionResult = {
        frameworks: [
          {
            name: 'React',
            type: 'frontend_framework',
            version: '17.0.0',
            confidence: 0.7,
            evidence: [],
            ecosystem: 'nodejs'
          }
        ],
        buildTools: [],
        confidence: 0.7,
        recommendations: [],
        metadata: {
          executionTime: 50,
          filesAnalyzed: [],
          patternsMatched: [],
          warnings: []
        }
      };

      const result2: LanguageDetectionResult = {
        frameworks: [
          {
            name: 'React',
            type: 'frontend_framework',
            version: '18.0.0',
            confidence: 0.9,
            evidence: [],
            ecosystem: 'nodejs'
          }
        ],
        buildTools: [],
        confidence: 0.9,
        recommendations: [],
        metadata: {
          executionTime: 60,
          filesAnalyzed: [],
          patternsMatched: [],
          warnings: []
        }
      };

      const merged = aggregator.mergeAnalyzerResults([result1, result2]);

      expect(merged.frameworks).toHaveLength(1);
      expect(merged.frameworks![0].confidence).toBe(0.9);
      expect(merged.frameworks![0].version).toBe('18.0.0');
    });

    it('should keep frameworks with different ecosystems separate', () => {
      const result1: LanguageDetectionResult = {
        frameworks: [
          {
            name: 'Express',
            type: 'web_framework',
            confidence: 0.8,
            evidence: [],
            ecosystem: 'nodejs'
          }
        ],
        buildTools: [],
        confidence: 0.8,
        recommendations: [],
        metadata: {
          executionTime: 50,
          filesAnalyzed: [],
          patternsMatched: [],
          warnings: []
        }
      };

      const result2: LanguageDetectionResult = {
        frameworks: [
          {
            name: 'Express',
            type: 'web_framework',
            confidence: 0.7,
            evidence: [],
            ecosystem: 'python' // Different ecosystem
          }
        ],
        buildTools: [],
        confidence: 0.7,
        recommendations: [],
        metadata: {
          executionTime: 60,
          filesAnalyzed: [],
          patternsMatched: [],
          warnings: []
        }
      };

      const merged = aggregator.mergeAnalyzerResults([result1, result2]);

      expect(merged.frameworks).toHaveLength(2);
      expect(merged.frameworks!.find(f => f.ecosystem === 'nodejs')).toBeDefined();
      expect(merged.frameworks!.find(f => f.ecosystem === 'python')).toBeDefined();
    });
  });

  describe('build tool deduplication', () => {
    it('should remove duplicate build tools and keep highest confidence', () => {
      const result1: LanguageDetectionResult = {
        frameworks: [],
        buildTools: [
          {
            name: 'webpack',
            configFile: 'webpack.config.js',
            commands: [],
            confidence: 0.6
          }
        ],
        confidence: 0.6,
        recommendations: [],
        metadata: {
          executionTime: 50,
          filesAnalyzed: [],
          patternsMatched: [],
          warnings: []
        }
      };

      const result2: LanguageDetectionResult = {
        frameworks: [],
        buildTools: [
          {
            name: 'webpack',
            configFile: 'webpack.config.js',
            commands: [],
            confidence: 0.8
          }
        ],
        confidence: 0.8,
        recommendations: [],
        metadata: {
          executionTime: 60,
          filesAnalyzed: [],
          patternsMatched: [],
          warnings: []
        }
      };

      const merged = aggregator.mergeAnalyzerResults([result1, result2]);

      expect(merged.buildTools).toHaveLength(1);
      expect(merged.buildTools![0].confidence).toBe(0.8);
    });
  });

  describe('conflict detection and warnings', () => {
    it('should create warnings for framework conflicts', () => {
      const result1: LanguageDetectionResult = {
        frameworks: [
          {
            name: 'React',
            type: 'frontend_framework',
            confidence: 0.7,
            evidence: [],
            ecosystem: 'nodejs'
          },
          {
            name: 'Vue',
            type: 'frontend_framework',
            confidence: 0.6,
            evidence: [],
            ecosystem: 'nodejs'
          }
        ],
        buildTools: [],
        confidence: 0.65,
        recommendations: [],
        metadata: {
          executionTime: 50,
          filesAnalyzed: [],
          patternsMatched: [],
          warnings: []
        }
      };

      const result2: LanguageDetectionResult = {
        frameworks: [
          {
            name: 'React',
            type: 'frontend_framework',
            confidence: 0.8,
            evidence: [],
            ecosystem: 'nodejs'
          }
        ],
        buildTools: [],
        confidence: 0.8,
        recommendations: [],
        metadata: {
          executionTime: 60,
          filesAnalyzed: [],
          patternsMatched: [],
          warnings: []
        }
      };

      const merged = aggregator.mergeAnalyzerResults([result1, result2]);

      expect(merged.warnings).toHaveLength(1);
      expect(merged.warnings![0].type).toBe('conflict');
      expect(merged.warnings![0].message).toContain('framework conflicts resolved');
    });

    it('should not create warnings when no conflicts exist', () => {
      const result1: LanguageDetectionResult = {
        frameworks: [
          {
            name: 'React',
            type: 'frontend_framework',
            confidence: 0.8,
            evidence: [],
            ecosystem: 'nodejs'
          }
        ],
        buildTools: [],
        confidence: 0.8,
        recommendations: [],
        metadata: {
          executionTime: 50,
          filesAnalyzed: [],
          patternsMatched: [],
          warnings: []
        }
      };

      const result2: LanguageDetectionResult = {
        frameworks: [
          {
            name: 'Django',
            type: 'web_framework',
            confidence: 0.85,
            evidence: [],
            ecosystem: 'python'
          }
        ],
        buildTools: [],
        confidence: 0.85,
        recommendations: [],
        metadata: {
          executionTime: 60,
          filesAnalyzed: [],
          patternsMatched: [],
          warnings: []
        }
      };

      const merged = aggregator.mergeAnalyzerResults([result1, result2]);

      expect(merged.warnings).toHaveLength(0);
    });
  });

  describe('confidence calculation', () => {
    it('should calculate aggregated confidence correctly', () => {
      const results: LanguageDetectionResult[] = [
        {
          frameworks: [],
          buildTools: [],
          confidence: 0.8,
          recommendations: [],
          metadata: {
            executionTime: 50,
            filesAnalyzed: [],
            patternsMatched: [],
            warnings: []
          }
        },
        {
          frameworks: [],
          buildTools: [],
          confidence: 0.6,
          recommendations: [],
          metadata: {
            executionTime: 60,
            filesAnalyzed: [],
            patternsMatched: [],
            warnings: []
          }
        },
        {
          frameworks: [],
          buildTools: [],
          confidence: 0.9,
          recommendations: [],
          metadata: {
            executionTime: 40,
            filesAnalyzed: [],
            patternsMatched: [],
            warnings: []
          }
        }
      ];

      const aggregatedConfidence = aggregator.calculateAggregatedConfidence(results);

      expect(aggregatedConfidence).toBeCloseTo(0.767, 2); // (0.8 + 0.6 + 0.9) / 3
    });

    it('should return 0 for empty results', () => {
      const aggregatedConfidence = aggregator.calculateAggregatedConfidence([]);
      expect(aggregatedConfidence).toBe(0);
    });
  });

  describe('recommendation combination', () => {
    it('should combine recommendations from multiple analyzers', () => {
      const results: LanguageDetectionResult[] = [
        {
          frameworks: [],
          buildTools: [],
          confidence: 0.8,
          recommendations: ['Add TypeScript', 'Use ESLint'],
          metadata: {
            executionTime: 50,
            filesAnalyzed: [],
            patternsMatched: [],
            warnings: []
          }
        },
        {
          frameworks: [],
          buildTools: [],
          confidence: 0.7,
          recommendations: ['Add pytest', 'Use virtual environment'],
          metadata: {
            executionTime: 60,
            filesAnalyzed: [],
            patternsMatched: [],
            warnings: []
          }
        }
      ];

      const combinedRecommendations = aggregator.combineRecommendations(results);

      expect(combinedRecommendations).toHaveLength(4);
      expect(combinedRecommendations).toContain('Add TypeScript');
      expect(combinedRecommendations).toContain('Use ESLint');
      expect(combinedRecommendations).toContain('Add pytest');
      expect(combinedRecommendations).toContain('Use virtual environment');
    });

    it('should remove duplicate recommendations', () => {
      const results: LanguageDetectionResult[] = [
        {
          frameworks: [],
          buildTools: [],
          confidence: 0.8,
          recommendations: ['Add tests', 'Use linting'],
          metadata: {
            executionTime: 50,
            filesAnalyzed: [],
            patternsMatched: [],
            warnings: []
          }
        },
        {
          frameworks: [],
          buildTools: [],
          confidence: 0.7,
          recommendations: ['Add tests', 'Use CI/CD'], // 'Add tests' is duplicate
          metadata: {
            executionTime: 60,
            filesAnalyzed: [],
            patternsMatched: [],
            warnings: []
          }
        }
      ];

      const combinedRecommendations = aggregator.combineRecommendations(results);

      expect(combinedRecommendations).toHaveLength(3);
      expect(combinedRecommendations).toContain('Add tests');
      expect(combinedRecommendations).toContain('Use linting');
      expect(combinedRecommendations).toContain('Use CI/CD');
    });

    it('should handle empty recommendations', () => {
      const results: LanguageDetectionResult[] = [
        {
          frameworks: [],
          buildTools: [],
          confidence: 0.8,
          recommendations: [],
          metadata: {
            executionTime: 50,
            filesAnalyzed: [],
            patternsMatched: [],
            warnings: []
          }
        }
      ];

      const combinedRecommendations = aggregator.combineRecommendations(results);
      expect(combinedRecommendations).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle results with missing properties gracefully', () => {
      const incompleteResult: Partial<LanguageDetectionResult> = {
        frameworks: [
          {
            name: 'React',
            type: 'frontend_framework',
            confidence: 0.8,
            evidence: [],
            ecosystem: 'nodejs'
          }
        ],
        confidence: 0.8
        // Missing buildTools, recommendations, metadata
      };

      // This should not throw an error
      expect(() => {
        aggregator.mergeAnalyzerResults([incompleteResult as LanguageDetectionResult]);
      }).not.toThrow();
    });

    it('should handle frameworks with missing properties', () => {
      const resultWithIncompleteFramework: LanguageDetectionResult = {
        frameworks: [
          {
            name: 'React',
            type: 'frontend_framework',
            confidence: 0.8,
            evidence: [],
            ecosystem: 'nodejs'
            // Missing optional properties like version, buildTool, etc.
          }
        ],
        buildTools: [],
        confidence: 0.8,
        recommendations: [],
        metadata: {
          executionTime: 50,
          filesAnalyzed: [],
          patternsMatched: [],
          warnings: []
        }
      };

      const merged = aggregator.mergeAnalyzerResults([resultWithIncompleteFramework]);

      expect(merged.frameworks).toHaveLength(1);
      expect(merged.frameworks![0].name).toBe('React');
    });
  });
});