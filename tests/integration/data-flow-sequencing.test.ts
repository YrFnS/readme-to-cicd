/**
 * Integration tests for data flow sequencing and dependency resolution
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ResultAggregator, AnalyzerDependency } from '../../src/parser/utils/result-aggregator';
import { EnhancedAnalyzerResult } from '../../src/parser/types';

describe('Data Flow Sequencing Integration Tests', () => {
  let aggregator: ResultAggregator;

  beforeEach(() => {
    aggregator = new ResultAggregator();
  });

  describe('analyzer dependency resolution', () => {
    it('should resolve dependencies and create correct execution sequence', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'CommandExtractor',
          data: { build: [], test: [], run: [], install: [], other: [] },
          confidence: 0.8,
          sources: ['code-block'],
          metadata: { processingTime: 80, dataQuality: 0.8, completeness: 0.8 }
        },
        {
          analyzerName: 'LanguageDetector',
          data: [{ name: 'TypeScript', confidence: 0.9, sources: ['code-block'], frameworks: [] }],
          confidence: 0.9,
          sources: ['code-block'],
          metadata: { processingTime: 100, dataQuality: 0.9, completeness: 0.9 }
        },
        {
          analyzerName: 'DependencyExtractor',
          data: { packageFiles: [], installCommands: [], packages: [], dependencies: [], devDependencies: [] },
          confidence: 0.7,
          sources: ['file-reference'],
          metadata: { processingTime: 150, dataQuality: 0.7, completeness: 0.8 }
        },
        {
          analyzerName: 'MetadataExtractor',
          data: { name: 'test-project', description: 'A test project' },
          confidence: 0.8,
          sources: ['text-mention'],
          metadata: { processingTime: 50, dataQuality: 0.8, completeness: 0.9 }
        }
      ];

      const executionSequence = aggregator.getExecutionSequence(results);

      // Should execute in dependency order: MetadataExtractor -> LanguageDetector -> DependencyExtractor -> CommandExtractor
      expect(executionSequence.sequence).toEqual([
        'MetadataExtractor',
        'LanguageDetector', 
        'DependencyExtractor',
        'CommandExtractor'
      ]);

      expect(executionSequence.executionMetadata.totalStages).toBe(4);
      expect(executionSequence.executionMetadata.dependenciesResolved).toBe(4); // Total dependencies across all analyzers
      expect(executionSequence.dependencyGraph.get('CommandExtractor')).toEqual(['LanguageDetector', 'DependencyExtractor']);
      expect(executionSequence.dependencyGraph.get('DependencyExtractor')).toEqual(['LanguageDetector']);
      expect(executionSequence.dependencyGraph.get('LanguageDetector')).toEqual(['MetadataExtractor']);
    });

    it('should handle missing dependencies gracefully', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'CommandExtractor',
          data: { build: [], test: [], run: [], install: [], other: [] },
          confidence: 0.8,
          sources: ['code-block'],
          metadata: { processingTime: 80, dataQuality: 0.8, completeness: 0.8 }
        }
        // Missing LanguageDetector and DependencyExtractor dependencies
      ];

      const executionSequence = aggregator.getExecutionSequence(results);
      const errors = aggregator.getErrors();

      expect(executionSequence.sequence).toContain('CommandExtractor');
      expect(errors.some(e => e.code === 'MISSING_DEPENDENCY')).toBe(true);
      expect(errors.some(e => e.message.includes('LanguageDetector'))).toBe(true);
      expect(errors.some(e => e.message.includes('DependencyExtractor'))).toBe(true);
    });

    it('should detect circular dependencies', async () => {
      const circularDependencies: AnalyzerDependency[] = [
        {
          analyzerName: 'AnalyzerA',
          dependencies: ['AnalyzerB'],
          priority: 1,
          optional: false
        },
        {
          analyzerName: 'AnalyzerB',
          dependencies: ['AnalyzerC'],
          priority: 2,
          optional: false
        },
        {
          analyzerName: 'AnalyzerC',
          dependencies: ['AnalyzerA'], // Creates circular dependency
          priority: 3,
          optional: false
        }
      ];

      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'AnalyzerA',
          data: {},
          confidence: 0.8,
          sources: [],
          metadata: { processingTime: 50, dataQuality: 0.8, completeness: 0.8 }
        },
        {
          analyzerName: 'AnalyzerB',
          data: {},
          confidence: 0.8,
          sources: [],
          metadata: { processingTime: 50, dataQuality: 0.8, completeness: 0.8 }
        },
        {
          analyzerName: 'AnalyzerC',
          data: {},
          confidence: 0.8,
          sources: [],
          metadata: { processingTime: 50, dataQuality: 0.8, completeness: 0.8 }
        }
      ];

      const executionSequence = aggregator.getExecutionSequence(results, circularDependencies);
      const errors = aggregator.getErrors();

      expect(errors.some(e => e.code === 'CIRCULAR_DEPENDENCY')).toBe(true);
      expect(executionSequence.sequence.length).toBe(3); // Should still include all analyzers
    });

    it('should handle optional dependencies correctly', async () => {
      const customDependencies: AnalyzerDependency[] = [
        {
          analyzerName: 'CoreAnalyzer',
          dependencies: ['OptionalAnalyzer'],
          priority: 1,
          optional: true // Optional dependency
        }
      ];

      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'CoreAnalyzer',
          data: {},
          confidence: 0.8,
          sources: [],
          metadata: { processingTime: 50, dataQuality: 0.8, completeness: 0.8 }
        }
        // OptionalAnalyzer is missing but should not cause error
      ];

      const executionSequence = aggregator.getExecutionSequence(results, customDependencies);
      const errors = aggregator.getErrors();

      expect(executionSequence.sequence).toContain('CoreAnalyzer');
      expect(errors.filter(e => e.code === 'MISSING_DEPENDENCY')).toHaveLength(0);
    });
  });

  describe('data flow validation', () => {
    it('should validate data flow between analyzer stages', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'MetadataExtractor',
          data: { name: 'test-project', description: 'A test project' },
          confidence: 0.9,
          sources: ['text-mention'],
          metadata: { processingTime: 50, dataQuality: 0.9, completeness: 0.9 }
        },
        {
          analyzerName: 'LanguageDetector',
          data: [
            { name: 'TypeScript', confidence: 0.9, sources: ['code-block'], frameworks: [] },
            { name: 'JavaScript', confidence: 0.7, sources: ['file-reference'], frameworks: [] }
          ],
          confidence: 0.85,
          sources: ['code-block', 'file-reference'],
          metadata: { processingTime: 100, dataQuality: 0.9, completeness: 0.9 }
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
      const dataFlowValidations = aggregator.getDataFlowValidations();

      expect(result.integrationMetadata.dataFlowValidation).toBeDefined();
      expect(result.integrationMetadata.dataFlowValidation!.sequenceExecuted).toEqual([
        'MetadataExtractor',
        'LanguageDetector',
        'DependencyExtractor', 
        'CommandExtractor'
      ]);
      expect(result.integrationMetadata.dataFlowValidation!.dependenciesResolved).toBe(4);
      expect(result.integrationMetadata.dataFlowValidation!.validationsPassed).toBeGreaterThan(0);
      expect(result.integrationMetadata.dataFlowValidation!.averageDataIntegrity).toBeGreaterThan(0.8);

      // Should have validations for each dependency relationship and stage integrity
      expect(dataFlowValidations.length).toBeGreaterThan(4);
      expect(dataFlowValidations.every(v => v.dataIntegrity >= 0 && v.dataIntegrity <= 1)).toBe(true);
    });

    it('should detect data flow issues between analyzers', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [], // Empty data should cause validation issues
          confidence: 0.1, // Low confidence
          sources: [],
          metadata: { processingTime: 100, dataQuality: 0.3, completeness: 0.4 }
        },
        {
          analyzerName: 'CommandExtractor',
          data: {
            build: [{ command: 'npm run build', confidence: 0.9 }],
            test: [], run: [], install: [], other: []
          },
          confidence: 0.9, // High confidence despite poor dependency
          sources: ['code-block'],
          metadata: { processingTime: 80, dataQuality: 0.9, completeness: 0.9 }
        }
      ];

      const result = await aggregator.aggregateEnhanced(results);
      const dataFlowValidations = aggregator.getDataFlowValidations();

      // Should detect data flow issues
      const failedValidations = dataFlowValidations.filter(v => !v.isValid);
      expect(failedValidations.length).toBeGreaterThan(0);

      // Should have low average data integrity
      expect(result.integrationMetadata.dataFlowValidation!.averageDataIntegrity).toBeLessThan(0.8);

      // Should include validation issues in the validation status
      expect(result.validationStatus.issues.some(issue => 
        issue.message.includes('data flow validations failed')
      )).toBe(true);
    });

    it('should validate analyzer-specific data structures', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [
            { name: 'TypeScript', confidence: 0.9, sources: ['code-block'], frameworks: [] }, // Valid
            { confidence: 0.8 }, // Missing name
            { name: 'Python' } // Missing confidence and sources
          ],
          confidence: 0.8,
          sources: ['code-block'],
          metadata: { processingTime: 100, dataQuality: 0.8, completeness: 0.8 }
        },
        {
          analyzerName: 'DependencyExtractor',
          data: {
            packageFiles: [{ name: 'package.json', type: 'npm', mentioned: true, confidence: 0.9 }],
            // Missing required fields: installCommands, packages, dependencies, devDependencies
          },
          confidence: 0.7,
          sources: ['file-reference'],
          metadata: { processingTime: 150, dataQuality: 0.7, completeness: 0.7 }
        }
      ];

      await aggregator.aggregateEnhanced(results);
      const dataFlowValidations = aggregator.getDataFlowValidations();

      // Should detect structure validation issues
      const structureValidations = dataFlowValidations.filter(v => 
        v.validationErrors.some(error => 
          error.includes('Invalid language entry structure') ||
          error.includes('missing or invalid field')
        )
      );
      expect(structureValidations.length).toBeGreaterThan(0);

      // Should have reduced data integrity for invalid structures
      const languageValidation = dataFlowValidations.find(v => 
        v.sourceAnalyzer === 'LanguageDetector' && v.targetAnalyzer === 'LanguageDetector'
      );
      expect(languageValidation?.dataIntegrity).toBeLessThan(1.0);
    });

    it('should check data consistency between analyzers', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [{ name: 'Python', confidence: 0.9, sources: ['code-block'], frameworks: [] }],
          confidence: 0.9,
          sources: ['code-block'], // Different sources
          metadata: { processingTime: 100, dataQuality: 0.9, completeness: 0.9 }
        },
        {
          analyzerName: 'DependencyExtractor',
          data: {
            packageFiles: [{ name: 'requirements.txt', type: 'pip', mentioned: true, confidence: 0.8 }],
            installCommands: [], packages: [], dependencies: [], devDependencies: []
          },
          confidence: 0.3, // Large confidence difference
          sources: ['file-reference'], // No source overlap
          metadata: { processingTime: 150, dataQuality: 0.3, completeness: 0.5 }
        }
      ];

      await aggregator.aggregateEnhanced(results);
      const dataFlowValidations = aggregator.getDataFlowValidations();

      // Should detect consistency issues
      const consistencyValidations = dataFlowValidations.filter(v => 
        v.validationErrors.some(error => 
          error.includes('No source overlap') ||
          error.includes('Large confidence difference')
        )
      );
      expect(consistencyValidations.length).toBeGreaterThan(0);
    });

    it('should validate specific data flow patterns', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [], // Empty language data
          confidence: 0.5,
          sources: [],
          metadata: { processingTime: 100, dataQuality: 0.5, completeness: 0.5 }
        },
        {
          analyzerName: 'CommandExtractor',
          data: {
            build: [{ command: 'npm run build', confidence: 0.9 }],
            test: [], run: [], install: [], other: []
          },
          confidence: 0.8,
          sources: ['code-block'],
          metadata: { processingTime: 80, dataQuality: 0.8, completeness: 0.8 }
        }
      ];

      await aggregator.aggregateEnhanced(results);
      const dataFlowValidations = aggregator.getDataFlowValidations();

      // Should detect specific flow pattern issues
      const flowValidations = dataFlowValidations.filter(v => 
        v.validationErrors.some(error => 
          error.includes('LanguageDetector must provide language data for CommandExtractor')
        )
      );
      expect(flowValidations.length).toBeGreaterThan(0);
    });
  });

  describe('integration with enhanced aggregation', () => {
    it('should integrate data flow validation with confidence calculation', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'MetadataExtractor',
          data: { name: 'test-project', description: 'A test project' },
          confidence: 0.9,
          sources: ['text-mention'],
          metadata: { processingTime: 50, dataQuality: 0.9, completeness: 0.9 }
        },
        {
          analyzerName: 'LanguageDetector',
          data: [{ name: 'TypeScript', confidence: 0.9, sources: ['code-block'], frameworks: [] }],
          confidence: 0.9,
          sources: ['code-block'],
          metadata: { processingTime: 100, dataQuality: 0.9, completeness: 0.9 }
        },
        {
          analyzerName: 'DependencyExtractor',
          data: {
            packageFiles: [{ name: 'package.json', type: 'npm', mentioned: true, confidence: 0.9 }],
            installCommands: [{ command: 'npm install', confidence: 0.9 }],
            packages: [{ name: 'express', version: '^4.18.0', manager: 'npm', confidence: 0.8 }],
            dependencies: [], devDependencies: []
          },
          confidence: 0.8,
          sources: ['file-reference'],
          metadata: { processingTime: 150, dataQuality: 0.8, completeness: 0.9 }
        }
      ];

      const result = await aggregator.aggregateEnhanced(results);

      // Should have reasonable overall confidence with good data flow
      expect(result.confidence.overall).toBeGreaterThan(0.7);
      expect(result.integrationMetadata.dataFlowValidation!.averageDataIntegrity).toBeGreaterThan(0.8);
      expect(result.validationStatus.isValid).toBe(true);
      expect(result.validationStatus.issues.filter(i => i.severity === 'error')).toHaveLength(0);
    });

    it('should penalize overall confidence for poor data flow', async () => {
      const poorFlowResults: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [], // Poor data
          confidence: 0.2,
          sources: [],
          metadata: { processingTime: 100, dataQuality: 0.2, completeness: 0.3 }
        },
        {
          analyzerName: 'CommandExtractor',
          data: { build: [], test: [], run: [], install: [], other: [] },
          confidence: 0.9, // High confidence despite poor dependency
          sources: ['code-block'],
          metadata: { processingTime: 80, dataQuality: 0.9, completeness: 0.9 }
        }
      ];

      const goodFlowResults: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [{ name: 'TypeScript', confidence: 0.9, sources: ['code-block'], frameworks: [] }],
          confidence: 0.9,
          sources: ['code-block'],
          metadata: { processingTime: 100, dataQuality: 0.9, completeness: 0.9 }
        },
        {
          analyzerName: 'CommandExtractor',
          data: {
            build: [{ command: 'npm run build', confidence: 0.9 }],
            test: [], run: [], install: [], other: []
          },
          confidence: 0.9,
          sources: ['code-block'],
          metadata: { processingTime: 80, dataQuality: 0.9, completeness: 0.9 }
        }
      ];

      const poorResult = await aggregator.aggregateEnhanced(poorFlowResults);
      const goodResult = await aggregator.aggregateEnhanced(goodFlowResults);

      // Poor data flow should result in lower overall confidence
      expect(poorResult.confidence.overall).toBeLessThan(goodResult.confidence.overall);
      expect(poorResult.integrationMetadata.dataFlowValidation!.averageDataIntegrity)
        .toBeLessThan(goodResult.integrationMetadata.dataFlowValidation!.averageDataIntegrity);
    });
  });

  describe('error handling and recovery', () => {
    it('should handle invalid confidence scores gracefully', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [{ name: 'TypeScript', confidence: 0.9, sources: ['code-block'], frameworks: [] }],
          confidence: 1.5, // Invalid confidence > 1
          sources: ['code-block'],
          metadata: { processingTime: 100, dataQuality: 0.9, completeness: 0.9 }
        },
        {
          analyzerName: 'DependencyExtractor',
          data: { packageFiles: [], installCommands: [], packages: [], dependencies: [], devDependencies: [] },
          confidence: -0.2, // Invalid confidence < 0
          sources: [],
          metadata: { processingTime: 150, dataQuality: 0.5, completeness: 0.5 }
        }
      ];

      await aggregator.aggregateEnhanced(results);
      const dataFlowValidations = aggregator.getDataFlowValidations();

      // Should detect invalid confidence scores
      const confidenceValidations = dataFlowValidations.filter(v => 
        v.validationErrors.some(error => error.includes('Invalid confidence score'))
      );
      expect(confidenceValidations.length).toBeGreaterThan(0);
    });

    it('should handle missing metadata gracefully', async () => {
      const results: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [{ name: 'TypeScript', confidence: 0.9, sources: ['code-block'], frameworks: [] }],
          confidence: 0.9,
          sources: ['code-block']
          // Missing metadata
        },
        {
          analyzerName: 'DependencyExtractor',
          data: { packageFiles: [], installCommands: [], packages: [], dependencies: [], devDependencies: [] },
          confidence: 0.8,
          sources: ['file-reference'],
          metadata: {} // Empty metadata
        }
      ];

      const result = await aggregator.aggregateEnhanced(results);
      const dataFlowValidations = aggregator.getDataFlowValidations();

      // Should handle missing metadata gracefully
      expect(result).toBeDefined();
      expect(dataFlowValidations.some(v => 
        v.validationErrors.some(error => error.includes('Missing or incomplete metadata'))
      )).toBe(true);
    });
  });
});