/**
 * Tests for ResultAggregator class
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ResultAggregator } from '../../src/parser/utils/result-aggregator';
import { 
  AnalysisResult, 
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
});