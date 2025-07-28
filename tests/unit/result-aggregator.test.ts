/**
 * Tests for ResultAggregator class
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ResultAggregator } from '../../src/parser/utils/result-aggregator';
import { 
  AnalysisResult, 
  EnhancedAnalyzerResult,
  AggregatedResult,
  ProjectInfo, 
  ParseError,
  LanguageInfo,
  DependencyInfo,
  CommandInfo,
  TestingInfo,
  ProjectMetadata
} from '../../src/parser/types';

describe('ResultAggregator', () => {
  let aggregator: ResultAggregator;

  beforeEach(() => {
    aggregator = new ResultAggregator();
  });

  describe('aggregate', () => {
    it('should aggregate complete results from all analyzers', async () => {
      const results = new Map<string, AnalysisResult>([
        ['metadata', {
          data: {
            name: 'test-project',
            description: 'A test project',
            structure: ['src/', 'tests/'],
            environment: [{ name: 'NODE_ENV', required: true }]
          },
          confidence: 0.9,
          sources: ['text-mention']
        }],
        ['LanguageDetector', {
          data: {
            languages: [
              { name: 'TypeScript', confidence: 0.95, sources: ['code-block'], frameworks: ['Node.js'] },
              { name: 'JavaScript', confidence: 0.8, sources: ['file-reference'] }
            ]
          },
          confidence: 0.9,
          sources: ['code-block', 'file-reference']
        }],
        ['DependencyExtractor', {
          data: {
            packageFiles: [{ name: 'package.json', type: 'npm', mentioned: true, confidence: 0.9 }],
            installCommands: [{ command: 'npm install', confidence: 0.9 }],
            packages: [{ name: 'express', version: '^4.18.0', manager: 'npm', confidence: 0.8 }]
          },
          confidence: 0.85,
          sources: ['file-reference']
        }],
        ['CommandExtractor', {
          data: {
            build: [{ command: 'npm run build', confidence: 0.9 }],
            test: [{ command: 'npm test', confidence: 0.85 }],
            run: [{ command: 'npm start', confidence: 0.8 }],
            install: [{ command: 'npm install', confidence: 0.9 }],
            other: []
          },
          confidence: 0.88,
          sources: ['code-block']
        }],
        ['testing', {
          data: {
            frameworks: [{ name: 'Jest', language: 'JavaScript', confidence: 0.9 }],
            tools: [{ name: 'coverage', type: 'coverage', confidence: 0.7 }],
            configFiles: ['jest.config.js']
          },
          confidence: 0.8,
          sources: ['text-mention']
        }]
      ]);

      const result = await aggregator.aggregate(results);

      expect(result).toBeDefined();
      expect(result.metadata.name).toBe('test-project');
      expect(result.metadata.description).toBe('A test project');
      expect(result.languages).toHaveLength(2);
      expect(result.languages[0].name).toBe('TypeScript');
      expect(result.dependencies.packageFiles).toHaveLength(1);
      expect(result.commands.build).toHaveLength(1);
      expect(result.testing.frameworks).toHaveLength(1);
      expect(result.confidence.overall).toBeGreaterThan(0);
      expect(result.confidence.overall).toBeLessThanOrEqual(1);
    });

    it('should handle missing analyzer results gracefully', async () => {
      const results = new Map<string, AnalysisResult>([
        ['LanguageDetector', {
          data: {
            languages: [{ name: 'Python', confidence: 0.9, sources: ['code-block'] }]
          },
          confidence: 0.9,
          sources: ['code-block']
        }]
      ]);

      const result = await aggregator.aggregate(results);

      expect(result).toBeDefined();
      expect(result.metadata).toEqual({});
      expect(result.languages).toHaveLength(1);
      expect(result.dependencies.packageFiles).toHaveLength(0);
      expect(result.commands.build).toHaveLength(0);
      expect(result.testing.frameworks).toHaveLength(0);
      expect(result.confidence.languages).toBe(0.9);
      expect(result.confidence.dependencies).toBe(0);
    });

    it('should handle partial failures with errors', async () => {
      const results = new Map<string, AnalysisResult>([
        ['LanguageDetector', {
          data: {
            languages: [{ name: 'Java', confidence: 0.8, sources: ['pattern-match'] }]
          },
          confidence: 0.8,
          sources: ['pattern-match'],
          errors: [{
            code: 'PARSE_WARNING',
            message: 'Could not detect all languages',
            component: 'LanguageDetector',
            severity: 'warning'
          }]
        }],
        ['DependencyExtractor', {
          data: null,
          confidence: 0,
          sources: [],
          errors: [{
            code: 'DEPENDENCY_FAILED',
            message: 'Failed to parse dependencies',
            component: 'DependencyExtractor',
            severity: 'error'
          }]
        }]
      ]);

      const result = await aggregator.aggregate(results);
      const errors = aggregator.getErrors();
      const warnings = aggregator.getWarnings();

      expect(result).toBeDefined();
      expect(result.languages).toHaveLength(1);
      expect(result.dependencies.packageFiles).toHaveLength(0);
      expect(errors).toHaveLength(1);
      expect(warnings).toHaveLength(1);
      expect(errors[0].code).toBe('DEPENDENCY_FAILED');
      expect(warnings[0].code).toBe('PARSE_WARNING');
    });

    it('should normalize confidence scores to 0-1 range', async () => {
      const results = new Map<string, AnalysisResult>([
        ['LanguageDetector', {
          data: { languages: [{ name: 'C++', confidence: 1.5, sources: ['code-block'] }] },
          confidence: 1.2, // Over 1.0
          sources: ['code-block']
        }],
        ['dependency', {
          data: { packageFiles: [], installCommands: [], packages: [] },
          confidence: -0.1, // Below 0.0
          sources: []
        }]
      ]);

      const result = await aggregator.aggregate(results);

      expect(result.confidence.languages).toBe(1.0);
      expect(result.confidence.dependencies).toBe(0.0);
      expect(result.confidence.overall).toBeGreaterThanOrEqual(0);
      expect(result.confidence.overall).toBeLessThanOrEqual(1);
      expect(result.languages[0].confidence).toBe(1.0);
    });

    it('should handle empty results map', async () => {
      const results = new Map<string, AnalysisResult>();

      const result = await aggregator.aggregate(results);

      expect(result).toBeDefined();
      expect(result.metadata).toEqual({});
      expect(result.languages).toHaveLength(0);
      expect(result.dependencies.packageFiles).toHaveLength(0);
      expect(result.commands.build).toHaveLength(0);
      expect(result.testing.frameworks).toHaveLength(0);
      expect(result.confidence.overall).toBe(0);
      expect(result.confidence.languages).toBe(0);
      expect(result.confidence.dependencies).toBe(0);
    });

    it('should preserve analyzer error context', async () => {
      const results = new Map<string, AnalysisResult>([
        ['metadata', {
          data: null,
          confidence: 0,
          sources: [],
          errors: [{
            code: 'METADATA_PARSE_ERROR',
            message: 'Failed to extract project name',
            component: 'MetadataExtractor',
            severity: 'error',
            line: 5,
            details: { section: 'title' }
          }]
        }]
      ]);

      await aggregator.aggregate(results);
      const errors = aggregator.getErrors();

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('METADATA_PARSE_ERROR');
      expect(errors[0].line).toBe(5);
      expect(errors[0].details).toEqual({ section: 'title' });
      expect(errors[0].component).toBe('MetadataExtractor');
    });

    it('should handle malformed analyzer data gracefully', async () => {
      const results = new Map<string, AnalysisResult>([
        ['LanguageDetector', {
          data: {
            languages: [
              { name: 'Python' }, // Missing confidence and sources
              { confidence: 0.8 }, // Missing name
              null, // Invalid entry
              { name: 'JavaScript', confidence: 0.9, sources: ['code-block'] } // Valid entry
            ]
          },
          confidence: 0.7,
          sources: ['code-block']
        }]
      ]);

      const result = await aggregator.aggregate(results);

      expect(result.languages).toHaveLength(3); // null entry filtered out
      expect(result.languages[0].name).toBe('Python');
      expect(result.languages[0].confidence).toBe(0); // Default for missing confidence
      expect(result.languages[0].sources).toEqual([]); // Default for missing sources
      expect(result.languages[1].name).toBe('Unknown'); // Default for missing name
      expect(result.languages[2].name).toBe('JavaScript'); // Valid entry preserved
    });
  });

  describe('error and warning collection', () => {
    it('should collect errors from multiple analyzers', async () => {
      const results = new Map<string, AnalysisResult>([
        ['analyzer1', {
          data: {},
          confidence: 0.5,
          sources: [],
          errors: [
            { code: 'ERROR1', message: 'Error 1', component: 'analyzer1', severity: 'error' },
            { code: 'WARN1', message: 'Warning 1', component: 'analyzer1', severity: 'warning' }
          ]
        }],
        ['analyzer2', {
          data: {},
          confidence: 0.3,
          sources: [],
          errors: [
            { code: 'ERROR2', message: 'Error 2', component: 'analyzer2', severity: 'error' }
          ]
        }]
      ]);

      await aggregator.aggregate(results);
      const errors = aggregator.getErrors();
      const warnings = aggregator.getWarnings();

      expect(errors).toHaveLength(2);
      expect(warnings).toHaveLength(1);
      expect(errors.map(e => e.code)).toEqual(['ERROR1', 'ERROR2']);
      expect(warnings[0].code).toBe('WARN1');
    });

    it('should clear errors between aggregation calls', async () => {
      const results1 = new Map<string, AnalysisResult>([
        ['analyzer1', {
          data: {},
          confidence: 0.5,
          sources: [],
          errors: [{ code: 'ERROR1', message: 'Error 1', component: 'analyzer1', severity: 'error' }]
        }]
      ]);

      const results2 = new Map<string, AnalysisResult>([
        ['analyzer2', {
          data: {},
          confidence: 0.5,
          sources: [],
          errors: [{ code: 'ERROR2', message: 'Error 2', component: 'analyzer2', severity: 'error' }]
        }]
      ]);

      await aggregator.aggregate(results1);
      expect(aggregator.getErrors()).toHaveLength(1);

      await aggregator.aggregate(results2);
      const errors = aggregator.getErrors();
      
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('ERROR2');
    });
  });

  describe('confidence score calculation', () => {
    it('should calculate weighted overall confidence', async () => {
      const results = new Map<string, AnalysisResult>([
        ['LanguageDetector', { data: {}, confidence: 1.0, sources: [] }],
        ['DependencyExtractor', { data: {}, confidence: 0.8, sources: [] }],
        ['CommandExtractor', { data: {}, confidence: 0.6, sources: [] }],
        ['testing', { data: {}, confidence: 0.4, sources: [] }],
        ['metadata', { data: {}, confidence: 0.2, sources: [] }]
      ]);

      const result = await aggregator.aggregate(results);

      // Expected: (1.0 * 0.25) + (0.8 * 0.25) + (0.6 * 0.20) + (0.4 * 0.15) + (0.2 * 0.15) = 0.66
      expect(result.confidence.overall).toBeCloseTo(0.66, 2);
      expect(result.confidence.languages).toBe(1.0);
      expect(result.confidence.dependencies).toBe(0.8);
      expect(result.confidence.commands).toBe(0.6);
      expect(result.confidence.testing).toBe(0.4);
      expect(result.confidence.metadata).toBe(0.2);
    });
  });

  describe('enhanced confidence aggregation', () => {
    it('should aggregate confidence scores using weighted average algorithm', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [{ name: 'TypeScript', confidence: 0.9, sources: ['code-block'], frameworks: [] }],
          confidence: 0.9,
          sources: ['code-block'],
          metadata: { processingTime: 100, dataQuality: 0.95, completeness: 0.9 }
        },
        {
          analyzerName: 'DependencyExtractor',
          data: { packageFiles: [], installCommands: [], packages: [], dependencies: [], devDependencies: [] },
          confidence: 0.8,
          sources: ['file-reference'],
          metadata: { processingTime: 150, dataQuality: 0.85, completeness: 0.8 }
        },
        {
          analyzerName: 'CommandExtractor',
          data: { build: [], test: [], run: [], install: [], other: [] },
          confidence: 0.7,
          sources: ['code-block'],
          metadata: { processingTime: 80, dataQuality: 0.8, completeness: 0.75 }
        }
      ];

      const result = await aggregator.aggregateEnhanced(results);

      // Should use analyzer reliability weights and data quality boosts
      expect(result.confidence.overall).toBeGreaterThan(0.7);
      expect(result.confidence.overall).toBeLessThanOrEqual(1.0);
      expect(result.confidence.languages).toBeGreaterThan(0.9); // Should get data quality boost
      expect(result.confidence.dependencies).toBeGreaterThan(0.8);
      expect(result.confidence.commands).toBeGreaterThan(0.7);
    });

    it('should apply data quality boost to confidence scores', async () => {
      const highQualityResults: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [
            { name: 'TypeScript', confidence: 0.8, sources: ['code-block'], frameworks: [] },
            { name: 'JavaScript', confidence: 0.7, sources: ['file-reference'], frameworks: [] },
            { name: 'Python', confidence: 0.6, sources: ['pattern-match'], frameworks: [] }
          ],
          confidence: 0.8,
          sources: ['code-block', 'file-reference', 'pattern-match'],
          metadata: { processingTime: 100, dataQuality: 0.95, completeness: 0.9 }
        }
      ];

      const lowQualityResults: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [{ name: 'TypeScript', confidence: 0.8, sources: ['code-block'], frameworks: [] }],
          confidence: 0.8,
          sources: ['code-block'],
          metadata: { processingTime: 100, dataQuality: 0.5, completeness: 0.6 }
        }
      ];

      const highQualityResult = await aggregator.aggregateEnhanced(highQualityResults);
      const lowQualityResult = await aggregator.aggregateEnhanced(lowQualityResults);

      // High quality should have higher confidence due to data quality boost and more data
      expect(highQualityResult.confidence.languages).toBeGreaterThan(lowQualityResult.confidence.languages);
      expect(highQualityResult.confidence.overall).toBeGreaterThan(lowQualityResult.confidence.overall);
    });

    it('should handle analyzer reliability weights correctly', async () => {
      const highReliabilityResults: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector', // High reliability (0.95)
          data: [{ name: 'TypeScript', confidence: 0.8, sources: ['code-block'], frameworks: [] }],
          confidence: 0.8,
          sources: ['code-block'],
          metadata: { processingTime: 100, dataQuality: 0.8, completeness: 0.8 }
        },
        {
          analyzerName: 'DependencyExtractor', // High reliability (0.90)
          data: { packageFiles: [], installCommands: [], packages: [], dependencies: [], devDependencies: [] },
          confidence: 0.7,
          sources: ['file-reference'],
          metadata: { processingTime: 150, dataQuality: 0.8, completeness: 0.8 }
        }
      ];

      const lowReliabilityResults: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [{ name: 'TypeScript', confidence: 0.8, sources: ['code-block'], frameworks: [] }],
          confidence: 0.8,
          sources: ['code-block'],
          metadata: { processingTime: 100, dataQuality: 0.8, completeness: 0.8 }
        },
        {
          analyzerName: 'TestingDetector', // Lower reliability (0.80)
          data: { frameworks: [], tools: [], configFiles: [], testFiles: [], commands: [], coverage: { enabled: false, tools: [] } },
          confidence: 0.7,
          sources: ['text-mention'],
          metadata: { processingTime: 120, dataQuality: 0.8, completeness: 0.8 }
        }
      ];

      const highReliabilityResult = await aggregator.aggregateEnhanced(highReliabilityResults);
      const lowReliabilityResult = await aggregator.aggregateEnhanced(lowReliabilityResults);

      // High reliability analyzers should produce higher overall confidence
      expect(highReliabilityResult.confidence.overall).toBeGreaterThan(lowReliabilityResult.confidence.overall);
      expect(highReliabilityResult.languages).toHaveLength(1);
      expect(lowReliabilityResult.languages).toHaveLength(1);
      expect(highReliabilityResult.languages[0].name).toBe('TypeScript');
      expect(lowReliabilityResult.languages[0].name).toBe('TypeScript');
    });

    it('should detect and resolve confidence conflicts', async () => {
      const conflictingResults: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [{ name: 'Python', confidence: 0.9, sources: ['code-block'], frameworks: [] }],
          confidence: 0.9,
          sources: ['code-block'],
          metadata: { processingTime: 100, dataQuality: 0.9, completeness: 0.9 }
        },
        {
          analyzerName: 'DependencyExtractor',
          data: { packageFiles: [], installCommands: [], packages: [], dependencies: [], devDependencies: [] },
          confidence: 0.3, // Conflicting low confidence
          sources: [],
          metadata: { processingTime: 150, dataQuality: 0.3, completeness: 0.4 }
        }
      ];

      const result = await aggregator.aggregateEnhanced(conflictingResults);

      // Should apply conflict penalty to overall confidence
      expect(result.confidence.overall).toBeLessThan(0.8);
      expect(result.integrationMetadata.conflictsResolved).toHaveLength(1); // Confidence conflict detected
      
      // Should still maintain reasonable confidence for high-confidence categories
      expect(result.confidence.languages).toBeGreaterThan(0.8);
      expect(result.confidence.dependencies).toBeLessThan(0.5);
    });

    it('should calculate confidence aggregation statistics', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [{ name: 'TypeScript', confidence: 0.9, sources: ['code-block'], frameworks: [] }],
          confidence: 0.9,
          sources: ['code-block'],
          metadata: { processingTime: 100, dataQuality: 0.95, completeness: 0.9 }
        },
        {
          analyzerName: 'DependencyExtractor',
          data: { packageFiles: [], installCommands: [], packages: [], dependencies: [], devDependencies: [] },
          confidence: 0.7,
          sources: ['file-reference'],
          metadata: { processingTime: 150, dataQuality: 0.8, completeness: 0.85 }
        },
        {
          analyzerName: 'CommandExtractor',
          data: { build: [], test: [], run: [], install: [], other: [] },
          confidence: 0.6,
          sources: ['code-block'],
          metadata: { processingTime: 80, dataQuality: 0.75, completeness: 0.7 }
        }
      ];

      await aggregator.aggregateEnhanced(results);
      const stats = aggregator.getConfidenceAggregationStats(results);

      expect(stats.analyzerReliabilities).toBeDefined();
      expect(stats.analyzerReliabilities['LanguageDetector']).toBe(0.95);
      expect(stats.analyzerReliabilities['DependencyExtractor']).toBe(0.90);
      expect(stats.analyzerReliabilities['CommandExtractor']).toBe(0.85);

      expect(stats.confidenceDistribution.mean).toBeCloseTo(0.73, 2);
      expect(stats.confidenceDistribution.median).toBe(0.7);
      expect(stats.confidenceDistribution.range).toEqual([0.6, 0.9]);
      expect(stats.confidenceDistribution.standardDeviation).toBeGreaterThan(0);

      expect(stats.qualityMetrics.averageDataQuality).toBeCloseTo(0.83, 2);
      expect(stats.qualityMetrics.averageCompleteness).toBeCloseTo(0.82, 2);
      expect(stats.qualityMetrics.qualityVariance).toBeGreaterThan(0);

      expect(stats.conflictAnalysis.totalConflicts).toBeGreaterThanOrEqual(0);
      expect(stats.conflictAnalysis.conflictSeverity).toBeDefined();
    });

    it('should handle empty analyzer results gracefully', async () => {
      const emptyResults: EnhancedAnalyzerResult[] = [];

      const result = await aggregator.aggregateEnhanced(emptyResults);

      expect(result.confidence.overall).toBe(0);
      expect(result.confidence.languages).toBe(0);
      expect(result.confidence.dependencies).toBe(0);
      expect(result.confidence.commands).toBe(0);
      expect(result.confidence.testing).toBe(0);
      expect(result.confidence.metadata).toBe(0);
      expect(result.integrationMetadata.conflictsResolved).toHaveLength(0);
    });

    it('should normalize confidence scores to valid range', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [{ name: 'TypeScript', confidence: 1.5, sources: ['code-block'], frameworks: [] }], // Over 1.0
          confidence: 1.2, // Over 1.0
          sources: ['code-block'],
          metadata: { processingTime: 100, dataQuality: 1.1, completeness: 0.9 } // Over 1.0
        },
        {
          analyzerName: 'DependencyExtractor',
          data: { packageFiles: [], installCommands: [], packages: [], dependencies: [], devDependencies: [] },
          confidence: -0.1, // Below 0.0
          sources: [],
          metadata: { processingTime: 150, dataQuality: -0.1, completeness: 0.8 } // Below 0.0
        }
      ];

      const result = await aggregator.aggregateEnhanced(results);

      expect(result.confidence.overall).toBeGreaterThanOrEqual(0);
      expect(result.confidence.overall).toBeLessThanOrEqual(1);
      expect(result.confidence.languages).toBeGreaterThanOrEqual(0);
      expect(result.confidence.languages).toBeLessThanOrEqual(1);
      expect(result.confidence.dependencies).toBeGreaterThanOrEqual(0);
      expect(result.confidence.dependencies).toBeLessThanOrEqual(1);
    });

    it('should apply conflict penalties appropriately', async () => {
      const highConflictResults: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [{ name: 'Python', confidence: 0.9, sources: ['code-block'], frameworks: [] }],
          confidence: 0.9,
          sources: ['code-block'],
          metadata: { processingTime: 100, dataQuality: 0.9, completeness: 0.9 }
        },
        {
          analyzerName: 'AlternativeLanguageDetector',
          data: [{ name: 'Python', confidence: 0.2, sources: ['pattern-match'], frameworks: [] }], // High conflict
          confidence: 0.2,
          sources: ['pattern-match'],
          metadata: { processingTime: 120, dataQuality: 0.3, completeness: 0.4 }
        }
      ];

      const lowConflictResults: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [{ name: 'Python', confidence: 0.9, sources: ['code-block'], frameworks: [] }],
          confidence: 0.9,
          sources: ['code-block'],
          metadata: { processingTime: 100, dataQuality: 0.9, completeness: 0.9 }
        },
        {
          analyzerName: 'DependencyExtractor',
          data: { packageFiles: [], installCommands: [], packages: [], dependencies: [], devDependencies: [] },
          confidence: 0.85, // Low conflict
          sources: ['file-reference'],
          metadata: { processingTime: 150, dataQuality: 0.85, completeness: 0.8 }
        }
      ];

      const highConflictResult = await aggregator.aggregateEnhanced(highConflictResults);
      const lowConflictResult = await aggregator.aggregateEnhanced(lowConflictResults);

      // High conflict should result in lower overall confidence
      expect(highConflictResult.confidence.overall).toBeLessThan(lowConflictResult.confidence.overall);
    });
  });

  describe('aggregateEnhanced', () => {
    it('should aggregate enhanced analyzer results with conflict resolution', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [
            { name: 'TypeScript', confidence: 0.9, sources: ['code-block'], frameworks: [] },
            { name: 'JavaScript', confidence: 0.7, sources: ['file-reference'], frameworks: [] }
          ],
          confidence: 0.85,
          sources: ['code-block', 'file-reference'],
          metadata: { processingTime: 100, dataQuality: 0.9, completeness: 0.95 }
        },
        {
          analyzerName: 'DependencyExtractor',
          data: {
            packageFiles: [{ name: 'package.json', type: 'npm', mentioned: true, confidence: 0.9 }],
            installCommands: [{ command: 'npm install', confidence: 0.9 }],
            packages: [{ name: 'express', version: '^4.18.0', manager: 'npm', confidence: 0.8 }],
            dependencies: [],
            devDependencies: []
          },
          confidence: 0.8,
          sources: ['file-reference'],
          metadata: { processingTime: 150, dataQuality: 0.8, completeness: 0.9 }
        },
        {
          analyzerName: 'CommandExtractor',
          data: {
            build: [{ command: 'npm run build', confidence: 0.9 }],
            test: [{ command: 'npm test', confidence: 0.85 }],
            run: [{ command: 'npm start', confidence: 0.8 }],
            install: [{ command: 'npm install', confidence: 0.9 }],
            other: []
          },
          confidence: 0.88,
          sources: ['code-block'],
          metadata: { processingTime: 80, dataQuality: 0.85, completeness: 0.8 }
        }
      ];

      const result = await aggregator.aggregateEnhanced(results);

      expect(result).toBeDefined();
      expect(result.languages).toHaveLength(2);
      expect(result.languages[0].name).toBe('TypeScript');
      expect(result.dependencies.packageFiles).toHaveLength(1);
      expect(result.commands.build).toHaveLength(1);
      expect(result.integrationMetadata.analyzersUsed).toEqual(['LanguageDetector', 'DependencyExtractor', 'CommandExtractor']);
      expect(result.integrationMetadata.dataQuality).toBeGreaterThan(0.8);
      expect(result.integrationMetadata.completeness).toBeGreaterThan(0.7);
      expect(result.validationStatus.isValid).toBe(true);
    });

    it('should handle duplicate analyzer results by merging', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [{ name: 'Python', confidence: 0.8, sources: ['code-block'], frameworks: [] }],
          confidence: 0.8,
          sources: ['code-block'],
          metadata: { processingTime: 100, dataQuality: 0.8, completeness: 0.9 }
        },
        {
          analyzerName: 'LanguageDetector', // Duplicate
          data: [{ name: 'JavaScript', confidence: 0.9, sources: ['file-reference'], frameworks: [] }],
          confidence: 0.9,
          sources: ['file-reference'],
          metadata: { processingTime: 120, dataQuality: 0.9, completeness: 0.95 }
        }
      ];

      const result = await aggregator.aggregateEnhanced(results);

      expect(result.integrationMetadata.conflictsResolved).toHaveLength(1);
      expect(result.integrationMetadata.conflictsResolved[0].conflictType).toBe('duplicate_analyzer');
      expect(result.integrationMetadata.conflictsResolved[0].conflictingAnalyzers).toEqual(['LanguageDetector']);
      expect(result.languages).toHaveLength(2); // Both languages should be present after merge
    });

    it('should resolve language detection conflicts by confidence', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [{ name: 'Python', confidence: 0.7, sources: ['pattern-match'], frameworks: [] }],
          confidence: 0.7,
          sources: ['pattern-match'],
          metadata: { processingTime: 100, dataQuality: 0.7, completeness: 0.8 }
        },
        {
          analyzerName: 'AlternativeLanguageDetector',
          data: { languages: [{ name: 'Python', confidence: 0.9, sources: ['code-block'], frameworks: [] }] },
          confidence: 0.9,
          sources: ['code-block'],
          metadata: { processingTime: 80, dataQuality: 0.9, completeness: 0.95 }
        }
      ];

      const result = await aggregator.aggregateEnhanced(results);

      expect(result.integrationMetadata.conflictsResolved).toHaveLength(1);
      expect(result.integrationMetadata.conflictsResolved[0].conflictType).toBe('language_detection');
      expect(result.languages).toHaveLength(1);
      expect(result.languages[0].confidence).toBe(0.9); // Higher confidence should win
    });

    it('should calculate enhanced confidence scores with data quality boost', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [
            { name: 'TypeScript', confidence: 0.8, sources: ['code-block'], frameworks: [] },
            { name: 'JavaScript', confidence: 0.7, sources: ['file-reference'], frameworks: [] },
            { name: 'Python', confidence: 0.6, sources: ['pattern-match'], frameworks: [] }
          ],
          confidence: 0.8,
          sources: ['code-block', 'file-reference', 'pattern-match'],
          metadata: { processingTime: 100, dataQuality: 0.9, completeness: 0.95 }
        }
      ];

      const result = await aggregator.aggregateEnhanced(results);

      // Should get data quality boost for having multiple languages detected
      expect(result.confidence.languages).toBeGreaterThan(0.8);
      expect(result.confidence.languages).toBeLessThanOrEqual(1.0);
    });

    it('should validate integration results and identify issues', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [], // No languages detected
          confidence: 0.3, // Low confidence
          sources: [],
          metadata: { processingTime: 100, dataQuality: 0.3, completeness: 0.5 }
        }
      ];

      const result = await aggregator.aggregateEnhanced(results);

      expect(result.validationStatus.isValid).toBe(false); // Low overall confidence makes it invalid
      expect(result.validationStatus.issues).toHaveLength(5); // missing_data (2), low_confidence (2), incomplete (1)
      expect(result.validationStatus.issues.some(i => i.type === 'missing_data')).toBe(true);
      expect(result.validationStatus.issues.some(i => i.type === 'low_confidence')).toBe(true);
      expect(result.validationStatus.issues.some(i => i.type === 'incomplete')).toBe(true);
    });

    it('should handle errors and warnings from analyzers', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [{ name: 'Python', confidence: 0.8, sources: ['code-block'], frameworks: [] }],
          confidence: 0.8,
          sources: ['code-block'],
          errors: [{
            code: 'DETECTION_ERROR',
            message: 'Could not detect all languages',
            component: 'LanguageDetector',
            severity: 'error'
          }],
          warnings: [{
            code: 'DETECTION_WARNING',
            message: 'Low confidence in detection',
            component: 'LanguageDetector',
            severity: 'warning'
          }],
          metadata: { processingTime: 100, dataQuality: 0.8, completeness: 0.9 }
        }
      ];

      const result = await aggregator.aggregateEnhanced(results);
      const errors = aggregator.getErrors();
      const warnings = aggregator.getWarnings();

      expect(errors).toHaveLength(1);
      expect(warnings).toHaveLength(1);
      expect(errors[0].code).toBe('DETECTION_ERROR');
      expect(warnings[0].code).toBe('DETECTION_WARNING');
    });

    it('should calculate completeness based on expected analyzers', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [{ name: 'Python', confidence: 0.8, sources: ['code-block'], frameworks: [] }],
          confidence: 0.8,
          sources: ['code-block'],
          metadata: { processingTime: 100, dataQuality: 0.8, completeness: 1.0 }
        },
        {
          analyzerName: 'DependencyExtractor',
          data: { packageFiles: [], installCommands: [], packages: [], dependencies: [], devDependencies: [] },
          confidence: 0.7,
          sources: [],
          metadata: { processingTime: 80, dataQuality: 0.7, completeness: 0.8 }
        }
      ];

      const result = await aggregator.aggregateEnhanced(results);

      // 2 out of 5 expected analyzers = 0.4, plus average analyzer completeness 0.9 = (0.4 + 0.9) / 2 = 0.65
      expect(result.integrationMetadata.completeness).toBeCloseTo(0.65, 1);
    });
  });
});