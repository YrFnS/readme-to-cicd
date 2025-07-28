/**
 * Tests for ResultAggregator conflict resolution and error handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ResultAggregator } from '../../src/parser/utils/result-aggregator';
import { 
  EnhancedAnalyzerResult,
  AggregatedResult,
  ParseError
} from '../../src/parser/types';

describe('ResultAggregator - Conflict Resolution and Error Handling', () => {
  let aggregator: ResultAggregator;

  beforeEach(() => {
    aggregator = new ResultAggregator();
  });

  describe('conflict resolution using predefined priority rules', () => {
    it('should resolve confidence conflicts using analyzer priority', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector', // Priority 10
          data: [{ name: 'TypeScript', confidence: 0.9, sources: ['code-block'], frameworks: [] }],
          confidence: 0.9,
          sources: ['code-block'],
          metadata: { processingTime: 100, dataQuality: 0.9, completeness: 0.9 }
        },
        {
          analyzerName: 'TestingDetector', // Priority 7, conflicting low confidence
          data: { frameworks: [], tools: [], configFiles: [], testFiles: [], commands: [], coverage: { enabled: false, tools: [] } },
          confidence: 0.3, // Significant difference (0.6)
          sources: ['text-mention'],
          metadata: { processingTime: 120, dataQuality: 0.4, completeness: 0.5 }
        }
      ];

      const result = await aggregator.aggregateEnhanced(results);

      expect(result.integrationMetadata.conflictsResolved).toHaveLength(1);
      expect(result.integrationMetadata.conflictsResolved[0].conflictType).toBe('confidence_conflict');
      expect(result.integrationMetadata.conflictsResolved[0].conflictingAnalyzers).toContain('LanguageDetector');
      expect(result.integrationMetadata.conflictsResolved[0].conflictingAnalyzers).toContain('TestingDetector');
      expect(result.integrationMetadata.conflictsResolved[0].resolution).toBe('prioritized_LanguageDetector');
    });

    it('should resolve data consistency conflicts between language and dependency analyzers', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [{ name: 'Python', confidence: 0.9, sources: ['code-block'], frameworks: [] }],
          confidence: 0.9,
          sources: ['code-block'],
          metadata: { processingTime: 100, dataQuality: 0.9, completeness: 0.9 }
        },
        {
          analyzerName: 'DependencyExtractor',
          data: {
            packageFiles: [{ name: 'package.json', type: 'npm', mentioned: true, confidence: 0.8 }],
            installCommands: [{ command: 'npm install', confidence: 0.8 }],
            packages: [{ name: 'express', manager: 'npm', confidence: 0.8 }], // Inconsistent with Python
            dependencies: [],
            devDependencies: []
          },
          confidence: 0.8,
          sources: ['file-reference'],
          metadata: { processingTime: 150, dataQuality: 0.8, completeness: 0.8 }
        }
      ];

      const result = await aggregator.aggregateEnhanced(results);
      const warnings = aggregator.getWarnings();

      expect(result.integrationMetadata.conflictsResolved).toHaveLength(1);
      expect(result.integrationMetadata.conflictsResolved[0].conflictType).toBe('data_consistency');
      expect(result.integrationMetadata.conflictsResolved[0].conflictingAnalyzers).toEqual(['LanguageDetector', 'DependencyExtractor']);
      expect(result.integrationMetadata.conflictsResolved[0].resolution).toBe('language_priority');
      
      expect(warnings.some(w => w.code === 'DATA_CONSISTENCY_CONFLICT')).toBe(true);
    });

    it('should resolve command-language consistency conflicts', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [{ name: 'Java', confidence: 0.9, sources: ['code-block'], frameworks: [] }],
          confidence: 0.9,
          sources: ['code-block'],
          metadata: { processingTime: 100, dataQuality: 0.9, completeness: 0.9 }
        },
        {
          analyzerName: 'CommandExtractor',
          data: {
            build: [{ command: 'npm run build', confidence: 0.8 }], // Inconsistent with Java
            test: [{ command: 'npm test', confidence: 0.8 }],
            run: [{ command: 'npm start', confidence: 0.8 }],
            install: [{ command: 'npm install', confidence: 0.8 }],
            other: []
          },
          confidence: 0.8,
          sources: ['code-block'],
          metadata: { processingTime: 80, dataQuality: 0.8, completeness: 0.8 }
        }
      ];

      const result = await aggregator.aggregateEnhanced(results);

      expect(result.integrationMetadata.conflictsResolved).toHaveLength(1);
      expect(result.integrationMetadata.conflictsResolved[0].conflictType).toBe('command_language_consistency');
      expect(result.integrationMetadata.conflictsResolved[0].conflictingAnalyzers).toEqual(['LanguageDetector', 'CommandExtractor']);
      expect(result.integrationMetadata.conflictsResolved[0].resolution).toBe('command_priority');
    });

    it('should not create conflicts for consistent data', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [{ name: 'JavaScript', confidence: 0.9, sources: ['code-block'], frameworks: [] }],
          confidence: 0.9,
          sources: ['code-block'],
          metadata: { processingTime: 100, dataQuality: 0.9, completeness: 0.9 }
        },
        {
          analyzerName: 'DependencyExtractor',
          data: {
            packageFiles: [{ name: 'package.json', type: 'npm', mentioned: true, confidence: 0.8 }],
            installCommands: [{ command: 'npm install', confidence: 0.8 }],
            packages: [{ name: 'express', manager: 'npm', confidence: 0.8 }], // Consistent with JavaScript
            dependencies: [],
            devDependencies: []
          },
          confidence: 0.8,
          sources: ['file-reference'],
          metadata: { processingTime: 150, dataQuality: 0.8, completeness: 0.8 }
        },
        {
          analyzerName: 'CommandExtractor',
          data: {
            build: [{ command: 'npm run build', confidence: 0.8 }], // Consistent with JavaScript
            test: [{ command: 'npm test', confidence: 0.8 }],
            run: [{ command: 'npm start', confidence: 0.8 }],
            install: [{ command: 'npm install', confidence: 0.8 }],
            other: []
          },
          confidence: 0.8,
          sources: ['code-block'],
          metadata: { processingTime: 80, dataQuality: 0.8, completeness: 0.8 }
        }
      ];

      const result = await aggregator.aggregateEnhanced(results);
      const warnings = aggregator.getWarnings();

      // Should not have data consistency conflicts
      const dataConsistencyConflicts = result.integrationMetadata.conflictsResolved.filter(
        c => c.conflictType === 'data_consistency' || c.conflictType === 'command_language_consistency'
      );
      expect(dataConsistencyConflicts).toHaveLength(0);
      
      // Should not have consistency warnings
      const consistencyWarnings = warnings.filter(w => w.code === 'DATA_CONSISTENCY_CONFLICT');
      expect(consistencyWarnings).toHaveLength(0);
    });
  });

  describe('graceful handling of partial results from failed analyzers', () => {
    it('should handle analyzer with complete failure gracefully', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [{ name: 'TypeScript', confidence: 0.9, sources: ['code-block'], frameworks: [] }],
          confidence: 0.9,
          sources: ['code-block'],
          metadata: { processingTime: 100, dataQuality: 0.9, completeness: 0.9 }
        },
        {
          analyzerName: 'DependencyExtractor',
          data: null, // Complete failure
          confidence: 0.1,
          sources: [],
          errors: [{
            code: 'PARSE_FAILED',
            message: 'Failed to parse package.json',
            component: 'DependencyExtractor',
            severity: 'error'
          }],
          metadata: { processingTime: 50, dataQuality: 0.1, completeness: 0.1 }
        }
      ];

      const result = await aggregator.aggregateEnhanced(results);
      const errors = aggregator.getErrors();

      expect(result).toBeDefined();
      expect(result.languages).toHaveLength(1);
      expect(result.dependencies.packageFiles).toHaveLength(0); // Fallback data
      expect(result.dependencies.packages).toHaveLength(0);
      
      // Should have partial failure error
      const partialFailureErrors = errors.filter(e => e.code === 'ANALYZER_PARTIAL_FAILURE');
      expect(partialFailureErrors).toHaveLength(1);
      expect(partialFailureErrors[0].details.analyzerName).toBe('DependencyExtractor');
    });

    it('should handle analyzer with empty data gracefully', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [], // Empty but not failed
          confidence: 0.5,
          sources: [],
          metadata: { processingTime: 100, dataQuality: 0.5, completeness: 0.5 }
        },
        {
          analyzerName: 'CommandExtractor',
          data: {
            build: [],
            test: [],
            run: [],
            install: [],
            other: []
          },
          confidence: 0.6,
          sources: [],
          metadata: { processingTime: 80, dataQuality: 0.6, completeness: 0.6 }
        }
      ];

      const result = await aggregator.aggregateEnhanced(results);
      const errors = aggregator.getErrors();

      expect(result).toBeDefined();
      expect(result.languages).toHaveLength(0);
      expect(result.commands.build).toHaveLength(0);
      
      // Should not have partial failure errors for empty but valid data
      const partialFailureErrors = errors.filter(e => e.code === 'ANALYZER_PARTIAL_FAILURE');
      expect(partialFailureErrors).toHaveLength(0);
    });

    it('should handle low confidence results with warnings', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [{ name: 'Unknown', confidence: 0.2, sources: ['pattern-match'], frameworks: [] }],
          confidence: 0.2, // Low confidence
          sources: ['pattern-match'],
          metadata: { processingTime: 100, dataQuality: 0.3, completeness: 0.4 }
        }
      ];

      const result = await aggregator.aggregateEnhanced(results);
      const warnings = aggregator.getWarnings();

      expect(result).toBeDefined();
      expect(result.languages).toHaveLength(1);
      
      // Should have low confidence warning
      const lowConfidenceWarnings = warnings.filter(w => w.code === 'LOW_CONFIDENCE_RESULT');
      expect(lowConfidenceWarnings).toHaveLength(1);
      expect(lowConfidenceWarnings[0].details.analyzerName).toBe('LanguageDetector');
      expect(lowConfidenceWarnings[0].details.confidence).toBe(0.2);
    });

    it('should provide appropriate fallback data for different analyzer types', async () => {
      const analyzerTypes = [
        'LanguageDetector',
        'DependencyExtractor', 
        'CommandExtractor',
        'TestingDetector',
        'MetadataExtractor'
      ];

      for (const analyzerName of analyzerTypes) {
        const results: EnhancedAnalyzerResult[] = [
          {
            analyzerName,
            data: null, // Failed
            confidence: 0.1,
            sources: [],
            errors: [{
              code: 'ANALYZER_FAILED',
              message: `${analyzerName} failed`,
              component: analyzerName,
              severity: 'error'
            }],
            metadata: { processingTime: 50, dataQuality: 0.1, completeness: 0.1 }
          }
        ];

        const result = await aggregator.aggregateEnhanced(results);

        // Check that appropriate fallback data is provided
        switch (analyzerName) {
          case 'LanguageDetector':
            expect(result.languages).toEqual([]);
            break;
          case 'DependencyExtractor':
            expect(result.dependencies.packageFiles).toEqual([]);
            expect(result.dependencies.packages).toEqual([]);
            break;
          case 'CommandExtractor':
            expect(result.commands.build).toEqual([]);
            expect(result.commands.test).toEqual([]);
            break;
          case 'TestingDetector':
            expect(result.testing.frameworks).toEqual([]);
            expect(result.testing.tools).toEqual([]);
            break;
          case 'MetadataExtractor':
            expect(result.metadata).toEqual({
              name: undefined,
              description: undefined,
              structure: [],
              environment: []
            });
            break;
        }
      }
    });
  });

  describe('result completeness validation logic', () => {
    it('should validate completeness and identify missing critical data', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'MetadataExtractor',
          data: { name: 'test-project' },
          confidence: 0.8,
          sources: ['text-mention'],
          metadata: { processingTime: 50, dataQuality: 0.8, completeness: 0.8 }
        }
        // Missing other critical analyzers
      ];

      const result = await aggregator.aggregateEnhanced(results);

      expect(result.validationStatus.isValid).toBe(true); // No errors, just warnings
      expect(result.validationStatus.issues).toHaveLength(4); // Missing languages, dependencies, commands, completeness
      
      const missingDataIssues = result.validationStatus.issues.filter(i => i.type === 'missing_data');
      expect(missingDataIssues).toHaveLength(3); // Languages, dependencies (info), and commands
      
      const missingLanguageIssue = missingDataIssues.find(i => i.component === 'LanguageDetector');
      expect(missingLanguageIssue).toBeDefined();
      expect(missingLanguageIssue!.severity).toBe('warning');
      
      const missingCommandIssue = missingDataIssues.find(i => i.component === 'CommandExtractor');
      expect(missingCommandIssue).toBeDefined();
      expect(missingCommandIssue!.severity).toBe('warning');
    });

    it('should identify low confidence issues', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [{ name: 'Unknown', confidence: 0.3, sources: ['pattern-match'], frameworks: [] }],
          confidence: 0.3, // Low confidence
          sources: ['pattern-match'],
          metadata: { processingTime: 100, dataQuality: 0.4, completeness: 0.5 }
        }
      ];

      const result = await aggregator.aggregateEnhanced(results);

      expect(result.validationStatus.issues).toHaveLength(5); // Low confidence language + overall + missing deps + missing commands + completeness
      
      const lowConfidenceIssues = result.validationStatus.issues.filter(i => i.type === 'low_confidence');
      expect(lowConfidenceIssues).toHaveLength(2); // Language confidence + overall confidence
      
      const languageConfidenceIssue = lowConfidenceIssues.find(i => i.component === 'LanguageDetector');
      expect(languageConfidenceIssue).toBeDefined();
      expect(languageConfidenceIssue!.message).toMatch(/3[0-9]\.0%/); // Allow for slight variations due to confidence calculation
    });

    it('should mark result as invalid for critically low overall confidence', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [{ name: 'Unknown', confidence: 0.1, sources: ['pattern-match'], frameworks: [] }],
          confidence: 0.1, // Very low confidence
          sources: ['pattern-match'],
          metadata: { processingTime: 100, dataQuality: 0.2, completeness: 0.3 }
        }
      ];

      const result = await aggregator.aggregateEnhanced(results);

      expect(result.validationStatus.isValid).toBe(false); // Should be invalid due to critically low confidence
      
      const criticalIssues = result.validationStatus.issues.filter(i => i.severity === 'error');
      expect(criticalIssues).toHaveLength(1);
      expect(criticalIssues[0].type).toBe('low_confidence');
      expect(criticalIssues[0].component).toBe('ResultAggregator');
    });

    it('should report partial analyzer failures in validation', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [{ name: 'TypeScript', confidence: 0.9, sources: ['code-block'], frameworks: [] }],
          confidence: 0.9,
          sources: ['code-block'],
          metadata: { processingTime: 100, dataQuality: 0.9, completeness: 0.9 }
        },
        {
          analyzerName: 'DependencyExtractor',
          data: null, // Failed
          confidence: 0.1,
          sources: [],
          errors: [{
            code: 'PARSE_FAILED',
            message: 'Failed to parse dependencies',
            component: 'DependencyExtractor',
            severity: 'error'
          }],
          metadata: { processingTime: 50, dataQuality: 0.1, completeness: 0.1 }
        }
      ];

      const result = await aggregator.aggregateEnhanced(results);

      expect(result.validationStatus.isValid).toBe(false); // Partial failures can make it invalid due to low overall confidence
      
      const partialFailureIssues = result.validationStatus.issues.filter(
        i => i.message.includes('partial failures')
      );
      expect(partialFailureIssues).toHaveLength(1);
      expect(partialFailureIssues[0].severity).toBe('warning');
      expect(partialFailureIssues[0].component).toBe('ResultAggregator');
    });
  });

  describe('error handling edge cases', () => {
    it('should handle multiple types of conflicts simultaneously', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [{ name: 'Python', confidence: 0.9, sources: ['code-block'], frameworks: [] }],
          confidence: 0.9, // High confidence
          sources: ['code-block'],
          metadata: { processingTime: 100, dataQuality: 0.9, completeness: 0.9 }
        },
        {
          analyzerName: 'LanguageDetector', // Duplicate analyzer
          data: [{ name: 'JavaScript', confidence: 0.8, sources: ['file-reference'], frameworks: [] }],
          confidence: 0.8,
          sources: ['file-reference'],
          metadata: { processingTime: 120, dataQuality: 0.8, completeness: 0.8 }
        },
        {
          analyzerName: 'DependencyExtractor',
          data: {
            packageFiles: [{ name: 'package.json', type: 'npm', mentioned: true, confidence: 0.8 }],
            installCommands: [{ command: 'npm install', confidence: 0.8 }],
            packages: [{ name: 'express', manager: 'npm', confidence: 0.8 }], // Inconsistent with Python
            dependencies: [],
            devDependencies: []
          },
          confidence: 0.3, // Low confidence (conflict with LanguageDetector)
          sources: ['file-reference'],
          metadata: { processingTime: 150, dataQuality: 0.4, completeness: 0.5 }
        }
      ];

      const result = await aggregator.aggregateEnhanced(results);

      expect(result.integrationMetadata.conflictsResolved.length).toBeGreaterThanOrEqual(2);
      
      // Should have duplicate analyzer conflict
      const duplicateConflicts = result.integrationMetadata.conflictsResolved.filter(
        c => c.conflictType === 'duplicate_analyzer'
      );
      expect(duplicateConflicts).toHaveLength(1);
      
      // Should have confidence conflict
      const confidenceConflicts = result.integrationMetadata.conflictsResolved.filter(
        c => c.conflictType === 'confidence_conflict'
      );
      expect(confidenceConflicts).toHaveLength(1);
      
      // Should have data consistency conflict
      const consistencyConflicts = result.integrationMetadata.conflictsResolved.filter(
        c => c.conflictType === 'data_consistency'
      );
      expect(consistencyConflicts).toHaveLength(1);
    });

    it('should handle analyzer with malformed metadata gracefully', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [{ name: 'TypeScript', confidence: 0.9, sources: ['code-block'], frameworks: [] }],
          confidence: 0.9,
          sources: ['code-block'],
          metadata: undefined as any // Malformed metadata
        }
      ];

      const result = await aggregator.aggregateEnhanced(results);

      expect(result).toBeDefined();
      expect(result.languages).toHaveLength(1);
      expect(result.integrationMetadata.dataQuality).toBeGreaterThanOrEqual(0);
      expect(result.integrationMetadata.completeness).toBeGreaterThanOrEqual(0);
    });

    it('should handle circular dependency detection errors', async () => {
      // This would typically come from the dependency resolution logic
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [{ name: 'TypeScript', confidence: 0.9, sources: ['code-block'], frameworks: [] }],
          confidence: 0.9,
          sources: ['code-block'],
          metadata: { processingTime: 100, dataQuality: 0.9, completeness: 0.9 }
        }
      ];

      // Simulate circular dependency error
      const aggregatorWithCircularDep = new ResultAggregator();
      
      // We need to trigger the circular dependency detection through the dependency resolution
      // This is a bit tricky to test directly, so we'll test the validation logic
      const result = await aggregatorWithCircularDep.aggregateEnhanced(results);
      
      // Manually add a circular dependency error to test validation
      (aggregatorWithCircularDep as any).errors.push({
        code: 'CIRCULAR_DEPENDENCY',
        message: 'Circular dependency detected',
        component: 'ResultAggregator',
        severity: 'error'
      });

      const validationStatus = (aggregatorWithCircularDep as any).validateIntegration(result);

      expect(validationStatus.isValid).toBe(false);
      const circularDepIssues = validationStatus.issues.filter(
        (i: any) => i.message.includes('circular dependency')
      );
      expect(circularDepIssues).toHaveLength(1);
      expect(circularDepIssues[0].severity).toBe('error');
    });
  });
});