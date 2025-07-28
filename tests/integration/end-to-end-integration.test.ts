/**
 * Comprehensive end-to-end integration tests for README processing
 * Tests the complete data flow from README input to final aggregated output
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { ReadmeParserImpl } from '../../src/parser/readme-parser';
import { ResultAggregator } from '../../src/parser/utils/result-aggregator';
import { 
  loadFixtureCategory, 
  measurePerformance, 
  generatePerformanceReport,
  validateParseResult,
  generateTestSummary,
  batchValidate,
  createTestCase
} from '../utils/test-helpers';
import { 
  ProjectInfo, 
  ParseResult, 
  EnhancedAnalyzerResult,
  AggregatedResult,
  LanguageInfo,
  CommandInfo,
  DependencyInfo
} from '../../src/parser/types';

describe('End-to-End Integration Tests', () => {
  let parser: ReadmeParserImpl;
  let aggregator: ResultAggregator;
  let realWorldSamples: Map<string, string>;

  beforeAll(async () => {
    parser = new ReadmeParserImpl({
      enableCaching: true,
      enablePerformanceMonitoring: true
    });
    aggregator = new ResultAggregator();
    realWorldSamples = await loadFixtureCategory('real-world-samples');
  });

  beforeEach(() => {
    // Clear performance data between tests for accurate measurements
    parser.clearPerformanceData();
  });

  describe('Complete README Processing Pipeline', () => {
    it('should process README through complete pipeline with all components', async () => {
      const content = realWorldSamples.get('react-app.md');
      expect(content).toBeDefined();

      // Execute complete parsing pipeline
      const result = await parser.parseContent(content!);
      
      // Verify successful parsing
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      const data = result.data!;
      
      // Verify all components produced results
      expect(data.metadata).toBeDefined();
      expect(data.languages).toBeDefined();
      expect(data.dependencies).toBeDefined();
      expect(data.commands).toBeDefined();
      expect(data.testing).toBeDefined();
      expect(data.confidence).toBeDefined();
      
      // Verify data structure completeness
      expect(data.languages.length).toBeGreaterThan(0);
      expect(data.commands.build.length + data.commands.test.length + data.commands.run.length).toBeGreaterThan(0);
      expect(data.dependencies.packageFiles.length).toBeGreaterThan(0);
      
      // Verify confidence scores are reasonable
      expect(data.confidence.overall).toBeGreaterThan(0.3);
      expect(data.confidence.overall).toBeLessThanOrEqual(1.0);
      
      // Verify all confidence scores are valid
      expect(data.confidence.languages).toBeGreaterThanOrEqual(0);
      expect(data.confidence.dependencies).toBeGreaterThanOrEqual(0);
      expect(data.confidence.commands).toBeGreaterThanOrEqual(0);
      expect(data.confidence.testing).toBeGreaterThanOrEqual(0);
      expect(data.confidence.metadata).toBeGreaterThanOrEqual(0);
    });

    it('should maintain data consistency across all processing stages', async () => {
      const content = realWorldSamples.get('python-ml-project.md');
      expect(content).toBeDefined();

      const result = await parser.parseContent(content!);
      expect(result.success).toBe(true);
      
      const data = result.data!;
      
      // Verify language-dependency consistency
      const pythonDetected = data.languages.some(l => l.name.toLowerCase() === 'python');
      const pythonPackageFiles = data.dependencies.packageFiles.some(f => 
        f.name === 'requirements.txt' || f.name === 'pyproject.toml' || f.name === 'setup.py'
      );
      
      if (pythonDetected) {
        expect(pythonPackageFiles).toBe(true);
      }
      
      // Verify command-language consistency
      const hasCommands = data.commands.build.length + data.commands.test.length + data.commands.run.length > 0;
      if (hasCommands && data.languages.length > 0) {
        // Commands should be associated with detected languages
        expect(data.confidence.commands).toBeGreaterThan(0.2);
      }
      
      // Verify metadata-content consistency
      if (data.metadata.name) {
        expect(data.metadata.name.length).toBeGreaterThan(0);
        expect(data.confidence.metadata).toBeGreaterThan(0.3);
      }
    });

    it('should handle complex multi-language projects correctly', async () => {
      const content = realWorldSamples.get('go-microservice.md');
      expect(content).toBeDefined();

      const result = await parser.parseContent(content!);
      expect(result.success).toBe(true);
      
      const data = result.data!;
      
      // Should detect Go as primary language
      const goLang = data.languages.find(l => l.name.toLowerCase() === 'go');
      expect(goLang).toBeDefined();
      expect(goLang!.confidence).toBeGreaterThan(0.6);
      
      // Should detect appropriate package files
      const goModFile = data.dependencies.packageFiles.find(f => f.name === 'go.mod');
      expect(goModFile).toBeDefined();
      
      // Should extract Go-specific commands
      const buildCommands = data.commands.build.map(c => c.command);
      expect(buildCommands.some(cmd => cmd.includes('go '))).toBe(true);
      
      // Should handle Docker commands if present
      const dockerCommands = [...data.commands.build, ...data.commands.other]
        .filter(c => c.command.includes('docker'));
      if (dockerCommands.length > 0) {
        expect(dockerCommands.every(c => c.confidence > 0.5)).toBe(true);
      }
    });
  });

  describe('Data Flow Verification Between Components', () => {
    it('should verify proper data flow from LanguageDetector to CommandExtractor', async () => {
      const content = realWorldSamples.get('rust-cli-tool.md');
      expect(content).toBeDefined();

      // Parse with specific analyzers to test data flow
      const result = await parser.parseContentWithAnalyzers(content!, [
        'MetadataExtractor',
        'LanguageDetector', 
        'CommandExtractor'
      ]);
      
      expect(result.success).toBe(true);
      const data = result.data!;
      
      // Verify language detection provides context for command extraction
      const rustLang = data.languages.find(l => l.name.toLowerCase() === 'rust');
      expect(rustLang).toBeDefined();
      
      // Verify commands are extracted with appropriate confidence
      const cargoCommands = [...data.commands.build, ...data.commands.test]
        .filter(c => c.command.includes('cargo'));
      
      if (cargoCommands.length > 0) {
        // Commands should have reasonable confidence when language is detected
        expect(cargoCommands.every(c => c.confidence > 0.5)).toBe(true);
      }
      
      // Verify overall confidence reflects component integration
      expect(data.confidence.overall).toBeGreaterThan(0.4);
    });

    it('should verify data flow from DependencyExtractor to CommandExtractor', async () => {
      const content = realWorldSamples.get('react-app.md');
      expect(content).toBeDefined();

      const result = await parser.parseContentWithAnalyzers(content!, [
        'MetadataExtractor',
        'LanguageDetector',
        'DependencyExtractor',
        'CommandExtractor'
      ]);
      
      expect(result.success).toBe(true);
      const data = result.data!;
      
      // Verify dependency detection informs command extraction
      const npmPackageFile = data.dependencies.packageFiles.find(f => f.name === 'package.json');
      if (npmPackageFile) {
        // Should extract npm-related commands
        const npmCommands = [...data.commands.build, ...data.commands.test, ...data.commands.install]
          .filter(c => c.command.includes('npm'));
        
        expect(npmCommands.length).toBeGreaterThan(0);
        expect(npmCommands.every(c => c.confidence > 0.6)).toBe(true);
      }
    });

    it('should verify enhanced ResultAggregator integration with data flow validation', async () => {
      const content = realWorldSamples.get('python-ml-project.md');
      expect(content).toBeDefined();

      // Create mock enhanced analyzer results to test aggregation
      const mockResults: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'MetadataExtractor',
          data: { name: 'ML Classifier', description: 'A machine learning project' },
          confidence: 0.9,
          sources: ['text-mention'],
          metadata: { processingTime: 50, dataQuality: 0.9, completeness: 0.9 }
        },
        {
          analyzerName: 'LanguageDetector',
          data: [{ name: 'Python', confidence: 0.9, sources: ['code-block'], frameworks: ['PyTorch'] }],
          confidence: 0.9,
          sources: ['code-block'],
          metadata: { processingTime: 100, dataQuality: 0.9, completeness: 0.9 }
        },
        {
          analyzerName: 'DependencyExtractor',
          data: {
            packageFiles: [{ name: 'requirements.txt', type: 'pip', mentioned: true, confidence: 0.9 }],
            installCommands: [{ command: 'pip install -r requirements.txt', confidence: 0.9 }],
            packages: [{ name: 'torch', version: '1.9.0', manager: 'pip', confidence: 0.8 }],
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
            build: [{ command: 'python setup.py build', confidence: 0.8 }],
            test: [{ command: 'pytest', confidence: 0.9 }],
            run: [{ command: 'python main.py', confidence: 0.8 }],
            install: [{ command: 'pip install -r requirements.txt', confidence: 0.9 }],
            other: []
          },
          confidence: 0.85,
          sources: ['code-block'],
          metadata: { processingTime: 80, dataQuality: 0.85, completeness: 0.8 }
        }
      ];

      // Test enhanced aggregation with data flow validation
      const aggregatedResult = await aggregator.aggregateEnhanced(mockResults);
      
      // Verify aggregation succeeded
      expect(aggregatedResult).toBeDefined();
      expect(aggregatedResult.validationStatus.isValid).toBe(true);
      
      // Verify data flow validation was performed
      expect(aggregatedResult.integrationMetadata.dataFlowValidation).toBeDefined();
      expect(aggregatedResult.integrationMetadata.dataFlowValidation!.sequenceExecuted).toEqual([
        'MetadataExtractor',
        'LanguageDetector',
        'DependencyExtractor',
        'CommandExtractor'
      ]);
      
      // Verify data flow validations passed
      const dataFlowValidations = aggregator.getDataFlowValidations();
      expect(dataFlowValidations.length).toBeGreaterThan(0);
      
      const passedValidations = dataFlowValidations.filter(v => v.isValid);
      expect(passedValidations.length).toBeGreaterThan(dataFlowValidations.length * 0.8); // 80% should pass
      
      // Verify overall confidence reflects good data flow
      expect(aggregatedResult.confidence.overall).toBeGreaterThan(0.7);
    });

    it('should handle data flow issues gracefully', async () => {
      // Create mock results with data flow issues
      const problematicResults: EnhancedAnalyzerResult[] = [
        {
          analyzerName: 'LanguageDetector',
          data: [], // Empty data should cause validation issues
          confidence: 0.1,
          sources: [],
          metadata: { processingTime: 100, dataQuality: 0.2, completeness: 0.3 }
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

      const aggregatedResult = await aggregator.aggregateEnhanced(problematicResults);
      
      // Should still produce a result but with validation issues
      expect(aggregatedResult).toBeDefined();
      
      // Should detect data flow issues
      const dataFlowValidations = aggregator.getDataFlowValidations();
      const failedValidations = dataFlowValidations.filter(v => !v.isValid);
      expect(failedValidations.length).toBeGreaterThan(0);
      
      // Should have reduced overall confidence due to poor data flow
      expect(aggregatedResult.confidence.overall).toBeLessThan(0.6);
      
      // Should include validation issues
      expect(aggregatedResult.validationStatus.issues.length).toBeGreaterThan(0);
    });
  });

  describe('Real-World README Integration Tests', () => {
    const testCases = [
      {
        name: 'React Application',
        file: 'react-app.md',
        expected: {
          languages: [
            { name: 'JavaScript', confidence: 0.7, sources: ['code-block'], frameworks: ['React'] }
          ],
          commands: {
            build: [{ command: 'npm run build', confidence: 0.8 }],
            test: [{ command: 'npm test', confidence: 0.8 }]
          },
          dependencies: {
            packageFiles: [{ name: 'package.json', type: 'npm', mentioned: true, confidence: 0.9 }]
          }
        }
      },
      {
        name: 'Python ML Project',
        file: 'python-ml-project.md',
        expected: {
          languages: [
            { name: 'Python', confidence: 0.8, sources: ['code-block'], frameworks: ['PyTorch'] }
          ],
          dependencies: {
            packageFiles: [{ name: 'requirements.txt', type: 'pip', mentioned: true, confidence: 0.8 }]
          }
        }
      },
      {
        name: 'Go Microservice',
        file: 'go-microservice.md',
        expected: {
          languages: [
            { name: 'Go', confidence: 0.7, sources: ['code-block'], frameworks: ['Gin'] }
          ],
          dependencies: {
            packageFiles: [{ name: 'go.mod', type: 'go', mentioned: true, confidence: 0.8 }]
          }
        }
      },
      {
        name: 'Rust CLI Tool',
        file: 'rust-cli-tool.md',
        expected: {
          languages: [
            { name: 'Rust', confidence: 0.7, sources: ['code-block'] }
          ],
          dependencies: {
            packageFiles: [{ name: 'Cargo.toml', type: 'cargo', mentioned: true, confidence: 0.8 }]
          }
        }
      }
    ];

    it('should process all real-world samples with high success rate', async () => {
      const testCasesWithContent = testCases.map(tc => {
        const content = realWorldSamples.get(tc.file);
        expect(content).toBeDefined();
        return createTestCase(tc.name, content!, tc.expected);
      });

      const validationResults = await batchValidate(
        testCasesWithContent,
        (content) => parser.parseContent(content)
      );

      // Generate and log test summary
      const summary = generateTestSummary(validationResults);
      console.log(summary);

      // Verify high success rate
      const passedTests = Array.from(validationResults.values()).filter(r => r.passed).length;
      const totalTests = validationResults.size;
      const successRate = passedTests / totalTests;

      expect(successRate).toBeGreaterThan(0.75); // 75% success rate minimum
      
      // Verify average score is reasonable
      const avgScore = Array.from(validationResults.values())
        .reduce((sum, r) => sum + r.score, 0) / totalTests;
      expect(avgScore).toBeGreaterThan(0.6); // 60% average score minimum
    });

    it('should maintain consistent results across multiple runs', async () => {
      const content = realWorldSamples.get('react-app.md')!;
      
      // Run parsing multiple times
      const results: ParseResult[] = [];
      for (let i = 0; i < 3; i++) {
        const result = await parser.parseContent(content);
        results.push(result);
      }

      // All runs should succeed
      expect(results.every(r => r.success)).toBe(true);
      
      // Results should be consistent
      const firstResult = results[0].data!;
      for (let i = 1; i < results.length; i++) {
        const currentResult = results[i].data!;
        
        // Language detection should be consistent
        expect(currentResult.languages.length).toBe(firstResult.languages.length);
        
        // Command extraction should be consistent
        const firstCommands = firstResult.commands.build.length + firstResult.commands.test.length;
        const currentCommands = currentResult.commands.build.length + currentResult.commands.test.length;
        expect(Math.abs(currentCommands - firstCommands)).toBeLessThanOrEqual(1); // Allow minor variations
        
        // Confidence scores should be similar (within 10%)
        expect(Math.abs(currentResult.confidence.overall - firstResult.confidence.overall)).toBeLessThan(0.1);
      }
    });

    it('should handle edge cases in real-world samples gracefully', async () => {
      // Test with potentially problematic content
      const edgeCaseContent = `
# Project with Minimal Information

This is a very basic project.

Some text without much structure.
      `.trim();

      const result = await parser.parseContent(edgeCaseContent);
      
      // Should not crash
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      
      if (result.success) {
        // Should provide basic structure even with minimal content
        expect(result.data!.metadata).toBeDefined();
        expect(result.data!.languages).toBeDefined();
        expect(result.data!.commands).toBeDefined();
        expect(result.data!.dependencies).toBeDefined();
        expect(result.data!.confidence).toBeDefined();
        
        // Confidence should be low but valid
        expect(result.data!.confidence.overall).toBeGreaterThanOrEqual(0);
        expect(result.data!.confidence.overall).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Performance Validation for Integration Overhead', () => {
    it('should meet performance requirements for small README files', async () => {
      const content = realWorldSamples.get('react-app.md')!;
      
      const { result, metrics } = await measurePerformance(
        () => parser.parseContent(content),
        3
      );
      
      metrics.fileSize = Buffer.byteLength(content, 'utf8');
      metrics.linesCount = content.split('\n').length;
      
      // Verify parsing succeeded
      expect(result.success).toBe(true);
      
      // Performance requirements for small files
      expect(metrics.parseTime).toBeLessThan(200); // Under 200ms
      expect(metrics.memoryUsage).toBeLessThan(20 * 1024 * 1024); // Under 20MB
      
      console.log(generatePerformanceReport('Small README (React App)', metrics));
    });

    it('should handle medium-sized README files efficiently', async () => {
      const content = realWorldSamples.get('python-ml-project.md')!;
      
      const { result, metrics } = await measurePerformance(
        () => parser.parseContent(content),
        3
      );
      
      metrics.fileSize = Buffer.byteLength(content, 'utf8');
      metrics.linesCount = content.split('\n').length;
      
      expect(result.success).toBe(true);
      
      // Performance requirements for medium files
      expect(metrics.parseTime).toBeLessThan(400); // Under 400ms
      expect(metrics.memoryUsage).toBeLessThan(40 * 1024 * 1024); // Under 40MB
      
      console.log(generatePerformanceReport('Medium README (Python ML)', metrics));
    });

    it('should maintain reasonable throughput across all samples', async () => {
      const throughputs: number[] = [];
      
      for (const [filename, content] of realWorldSamples) {
        if (!filename.endsWith('.md') || filename === 'README.md') continue;
        
        const { result, metrics } = await measurePerformance(
          () => parser.parseContent(content),
          2
        );
        
        expect(result.success).toBe(true);
        
        const fileSize = Buffer.byteLength(content, 'utf8');
        const throughput = fileSize / 1024 / (metrics.parseTime / 1000); // KB/s
        throughputs.push(throughput);
        
        // Minimum throughput requirement
        expect(throughput).toBeGreaterThan(5); // At least 5 KB/s
      }
      
      const avgThroughput = throughputs.reduce((a, b) => a + b, 0) / throughputs.length;
      console.log(`Average throughput across ${throughputs.length} files: ${avgThroughput.toFixed(2)} KB/s`);
      
      // Average throughput should be reasonable
      expect(avgThroughput).toBeGreaterThan(20); // At least 20 KB/s average
    });

    it('should validate integration overhead is acceptable', async () => {
      const content = realWorldSamples.get('go-microservice.md')!;
      
      // Measure performance with all analyzers
      const { result: fullResult, metrics: fullMetrics } = await measurePerformance(
        () => parser.parseContent(content),
        3
      );
      
      // Measure performance with minimal analyzers
      const { result: minimalResult, metrics: minimalMetrics } = await measurePerformance(
        () => parser.parseContentWithAnalyzers(content, ['MetadataExtractor', 'LanguageDetector']),
        3
      );
      
      expect(fullResult.success).toBe(true);
      expect(minimalResult.success).toBe(true);
      
      // Integration overhead should be reasonable
      const timeOverhead = fullMetrics.parseTime / minimalMetrics.parseTime;
      const memoryOverhead = fullMetrics.memoryUsage / Math.max(minimalMetrics.memoryUsage, 1);
      
      // Should not be more than 3x slower or use more than 5x memory
      expect(timeOverhead).toBeLessThan(3);
      expect(memoryOverhead).toBeLessThan(5);
      
      console.log(`Integration overhead - Time: ${timeOverhead.toFixed(2)}x, Memory: ${memoryOverhead.toFixed(2)}x`);
    });

    it('should validate caching improves performance on repeated parsing', async () => {
      const content = realWorldSamples.get('rust-cli-tool.md')!;
      
      // First parse (cold cache)
      const { metrics: coldMetrics } = await measurePerformance(
        () => parser.parseContent(content),
        1
      );
      
      // Second parse (warm cache)
      const { metrics: warmMetrics } = await measurePerformance(
        () => parser.parseContent(content),
        1
      );
      
      // Warm cache should be faster
      expect(warmMetrics.parseTime).toBeLessThan(coldMetrics.parseTime);
      
      const speedup = coldMetrics.parseTime / warmMetrics.parseTime;
      console.log(`Cache speedup: ${speedup.toFixed(2)}x`);
      
      // Should see at least some improvement
      expect(speedup).toBeGreaterThan(1.1); // At least 10% improvement
    });

    it('should validate memory usage remains stable across multiple parses', async () => {
      const samples = Array.from(realWorldSamples.values()).slice(0, 3);
      const memoryUsages: number[] = [];
      
      for (let i = 0; i < samples.length; i++) {
        const { metrics } = await measurePerformance(
          () => parser.parseContent(samples[i]),
          1
        );
        memoryUsages.push(metrics.memoryUsage);
      }
      
      // Memory usage should not grow significantly
      const maxMemory = Math.max(...memoryUsages);
      const minMemory = Math.min(...memoryUsages);
      const memoryGrowth = (maxMemory - minMemory) / minMemory;
      
      // Memory growth should be reasonable (less than 50% increase)
      expect(memoryGrowth).toBeLessThan(0.5);
      
      console.log(`Memory usage range: ${(minMemory / 1024 / 1024).toFixed(2)}MB - ${(maxMemory / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Integration Error Handling and Recovery', () => {
    it('should handle analyzer failures gracefully in integration', async () => {
      // Create a parser with a failing analyzer (simulate by clearing analyzers and adding back selectively)
      const testParser = new ReadmeParserImpl();
      testParser.clearAnalyzers();
      
      // Register only some analyzers to simulate partial failure
      testParser.registerAnalyzer({
        name: 'FailingAnalyzer',
        analyze: async () => {
          throw new Error('Simulated analyzer failure');
        }
      });
      
      const content = realWorldSamples.get('react-app.md')!;
      const result = await testParser.parseContent(content);
      
      // Should handle failure gracefully
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      
      if (!result.success) {
        expect(result.errors).toBeDefined();
        expect(result.errors!.length).toBeGreaterThan(0);
      }
    });

    it('should provide meaningful error messages for integration failures', async () => {
      const invalidContent = null as any;
      
      const result = await parser.parseContent(invalidContent);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      
      const error = result.errors![0];
      expect(error.message).toContain('Content must be a string');
      expect(error.component).toBe('ReadmeParser');
    });

    it('should recover from partial analyzer failures', async () => {
      const content = realWorldSamples.get('python-ml-project.md')!;
      
      // Parse with all analyzers
      const result = await parser.parseContent(content);
      
      // Even if some analyzers fail, should still get partial results
      expect(result).toBeDefined();
      
      if (result.success) {
        // Should have at least some data
        const hasData = result.data!.languages.length > 0 ||
                       result.data!.commands.build.length > 0 ||
                       result.data!.dependencies.packageFiles.length > 0;
        expect(hasData).toBe(true);
      }
    });
  });
});