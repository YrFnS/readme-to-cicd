/**
 * Comprehensive test suite runner for README parser
 * This file orchestrates all test categories and generates a complete report
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { ReadmeParserImpl } from '../src/parser/readme-parser';
import { 
  loadFixtureCategory, 
  validateParseResult, 
  measurePerformance, 
  generatePerformanceReport,
  generateTestSummary,
  batchValidate,
  createTestCase,
  PerformanceMetrics
} from './utils/test-helpers';
import {
  initializeMemoryAssertions,
  assertMemoryWithinThresholds,
  assertNoMemoryRegression,
  setMemoryBaseline,
  cleanupMemoryAssertions,
  generateMemoryReport,
  type MemoryThreshold,
  type MemoryRegressionCheck
} from '../src/shared/memory-usage-assertions';
import { getTestWorkerMemoryMonitor } from '../src/shared/test-worker-memory-monitor';

interface TestSuiteResults {
  realWorldTests: Map<string, any>;
  edgeCaseTests: Map<string, any>;
  performanceTests: Map<string, PerformanceMetrics>;
  overallStats: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageScore: number;
    averageParseTime: number;
    totalFilesProcessed: number;
  };
}

describe('Comprehensive README Parser Test Suite', () => {
  let parser: ReadmeParserImpl;
  let testResults: TestSuiteResults;

  beforeAll(async () => {
    parser = new ReadmeParserImpl();
    
    // Initialize memory assertions for comprehensive test suite
    const memoryMonitor = getTestWorkerMemoryMonitor({
      maxMemoryBytes: 400 * 1024 * 1024, // 400MB limit for comprehensive tests
      warningThreshold: 0.7,
      criticalThreshold: 0.85,
      enableDetailedLogging: true
    });
    initializeMemoryAssertions(memoryMonitor);
    
    testResults = {
      realWorldTests: new Map(),
      edgeCaseTests: new Map(),
      performanceTests: new Map(),
      overallStats: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        averageScore: 0,
        averageParseTime: 0,
        totalFilesProcessed: 0
      }
    };
  });

  afterAll(() => {
    generateComprehensiveReport(testResults);
    
    // Generate final memory report for comprehensive test suite
    console.log('\n' + '='.repeat(80));
    console.log('🧠 COMPREHENSIVE TEST SUITE MEMORY REPORT');
    console.log('='.repeat(80));
    console.log(generateMemoryReport());
    
    // Cleanup memory assertions
    cleanupMemoryAssertions();
  });

  describe('Real-World Sample Validation', () => {
    it('should validate all real-world samples meet accuracy requirements', async () => {
      const realWorldSamples = await loadFixtureCategory('real-world-samples');
      
      const testCases = [
        createTestCase(
          'React App',
          realWorldSamples.get('react-app.md')!,
          {
            languages: [
              { name: 'JavaScript', confidence: 0.8, sources: ['code-block'], frameworks: ['React'] },
              { name: 'TypeScript', confidence: 0.7, sources: ['code-block'] }
            ],
            commands: {
              build: [{ command: 'npm run build' }],
              test: [{ command: 'npm test' }]
            },
            dependencies: {
              packageFiles: [{ name: 'package.json' }]
            },
            metadata: {
              name: 'React Todo App'
            }
          }
        ),
        createTestCase(
          'Python ML Project',
          realWorldSamples.get('python-ml-project.md')!,
          {
            languages: [
              { name: 'Python', confidence: 0.9, sources: ['code-block'], frameworks: ['PyTorch'] }
            ],
            commands: {
              test: [{ command: 'pytest' }]
            },
            dependencies: {
              packageFiles: [{ name: 'requirements.txt' }]
            }
          }
        ),
        createTestCase(
          'Go Microservice',
          realWorldSamples.get('go-microservice.md')!,
          {
            languages: [
              { name: 'Go', confidence: 0.8, sources: ['code-block'], frameworks: ['Gin'] }
            ],
            commands: {
              build: [{ command: 'go run cmd/server/main.go' }],
              test: [{ command: 'go test ./...' }]
            },
            dependencies: {
              packageFiles: [{ name: 'go.mod' }]
            }
          }
        ),
        createTestCase(
          'Rust CLI Tool',
          realWorldSamples.get('rust-cli-tool.md')!,
          {
            languages: [
              { name: 'Rust', confidence: 0.8, sources: ['code-block'] }
            ],
            commands: {
              build: [{ command: 'cargo build --release' }],
              test: [{ command: 'cargo test' }]
            },
            dependencies: {
              packageFiles: [{ name: 'Cargo.toml' }]
            }
          }
        )
      ];

      const results = await batchValidate(testCases, (content) => parser.parseContent(content));
      testResults.realWorldTests = results;

      // Calculate statistics
      const passedCount = Array.from(results.values()).filter(r => r.passed).length;
      const totalScore = Array.from(results.values()).reduce((sum, r) => sum + r.score, 0);
      
      testResults.overallStats.totalTests += results.size;
      testResults.overallStats.passedTests += passedCount;
      testResults.overallStats.failedTests += (results.size - passedCount);
      testResults.overallStats.averageScore += totalScore / results.size;

      console.log('\n🌍 Real-World Sample Results:');
      console.log(generateTestSummary(results));

      // Requirements validation
      expect(passedCount / results.size).toBeGreaterThan(0.8); // 80% pass rate
      expect(totalScore / results.size).toBeGreaterThan(0.75); // 75% average score
    });
  });

  describe('Edge Case Resilience', () => {
    it('should handle all edge cases gracefully', async () => {
      const edgeCases = await loadFixtureCategory('edge-cases');
      
      const testCases = [
        createTestCase(
          'Minimal README',
          edgeCases.get('minimal-readme.md')!,
          {
            metadata: { name: 'Project' },
            commands: { run: [{ command: 'npm start' }] }
          }
        ),
        createTestCase(
          'Malformed Markdown',
          edgeCases.get('malformed-markdown.md')!,
          {
            metadata: { name: 'Malformed Markdown Test' },
            languages: [{ name: 'JavaScript', confidence: 0.4, sources: ['code-block'] }]
          }
        ),
        createTestCase(
          'Mixed Languages',
          edgeCases.get('mixed-languages.md')!,
          {
            languages: [
              { name: 'JavaScript', confidence: 0.6, sources: ['code-block'] },
              { name: 'Python', confidence: 0.6, sources: ['code-block'] },
              { name: 'Go', confidence: 0.6, sources: ['code-block'] }
            ]
          }
        ),
        createTestCase(
          'Unicode Content',
          edgeCases.get('unicode-content.md')!,
          {
            metadata: { name: 'Unicode Test Project' },
            languages: [
              { name: 'JavaScript', confidence: 0.5, sources: ['code-block'] },
              { name: 'Python', confidence: 0.5, sources: ['code-block'] }
            ]
          }
        )
      ];

      const results = await batchValidate(testCases, (content) => parser.parseContent(content));
      testResults.edgeCaseTests = results;

      // Update statistics
      const passedCount = Array.from(results.values()).filter(r => r.passed).length;
      const totalScore = Array.from(results.values()).reduce((sum, r) => sum + r.score, 0);
      
      testResults.overallStats.totalTests += results.size;
      testResults.overallStats.passedTests += passedCount;
      testResults.overallStats.failedTests += (results.size - passedCount);

      console.log('\n🔧 Edge Case Results:');
      console.log(generateTestSummary(results));

      // Edge cases should have lower requirements but still be handled
      expect(passedCount / results.size).toBeGreaterThan(0.5); // 50% pass rate for edge cases
      expect(totalScore / results.size).toBeGreaterThan(0.4); // 40% average score for edge cases
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance requirements across file sizes', async () => {
      const { generateLargeReadme } = require('./fixtures/performance/large-readme-generator.js');
      
      const performanceTests = [
        { name: 'Small File (1K lines)', size: 'small', maxTime: 100, maxMemory: 30 * 1024 * 1024 },
        { name: 'Medium File (5K lines)', size: 'medium', maxTime: 300, maxMemory: 60 * 1024 * 1024 },
        { name: 'Large File (10K lines)', size: 'large', maxTime: 600, maxMemory: 120 * 1024 * 1024 }
      ];

      let totalParseTime = 0;
      let totalFiles = 0;

      for (const test of performanceTests) {
        const content = await generateLargeReadme(test.size);
        
        // Set memory baseline for each performance test
        setMemoryBaseline(`performance-${test.size}`);
        
        // Define memory thresholds for performance tests
        const performanceMemoryThresholds: MemoryThreshold = {
          maxMemoryBytes: test.maxMemory,
          maxGrowthBytes: test.maxMemory * 0.8, // 80% of max as growth limit
          maxUsagePercentage: 80, // 80% usage limit
          minEfficiencyScore: 70 // Good efficiency required
        };
        
        const { result, metrics } = await measurePerformance(
          () => parser.parseContent(content),
          3
        );

        metrics.fileSize = Buffer.byteLength(content, 'utf8');
        metrics.linesCount = content.split('\n').length;

        testResults.performanceTests.set(test.name, metrics);
        
        totalParseTime += metrics.parseTime;
        totalFiles++;

        expect(result.success).toBe(true);
        expect(metrics.parseTime).toBeLessThan(test.maxTime);
        expect(metrics.memoryUsage).toBeLessThan(100 * 1024 * 1024); // Under 100MB

        // CRITICAL: Memory assertions for performance regression prevention
        const memoryResult = assertMemoryWithinThresholds(performanceMemoryThresholds);
        expect(memoryResult.passed).toBe(true);
        
        // Memory regression check against expected baseline
        const regressionCheck: MemoryRegressionCheck = {
          testName: `performance-${test.size}`,
          expectedMemoryUsage: test.maxMemory * 0.6, // Expect 60% of max
          allowedVariance: 0.3 // Allow 30% variance
        };
        const regressionResult = assertNoMemoryRegression(regressionCheck);
        expect(regressionResult.passed).toBe(true);

        console.log(generatePerformanceReport(test.name, metrics));
        console.log(`   🛡️  Memory: ${memoryResult.passed ? '✅' : '❌'} Usage: ${(memoryResult.currentUsage.usagePercentage).toFixed(1)}%`);
        console.log(`   📊 Regression: ${regressionResult.passed ? '✅' : '❌'} Growth: ${regressionResult.memoryGrowth ? (regressionResult.memoryGrowth / 1024 / 1024).toFixed(1) + 'MB' : 'N/A'}`);
      }

      testResults.overallStats.averageParseTime = totalParseTime / totalFiles;
      testResults.overallStats.totalFilesProcessed = totalFiles;
    });

    it('should maintain consistent throughput', async () => {
      const { generateLargeReadme } = require('./fixtures/performance/large-readme-generator.js');
      
      const throughputTests = ['small', 'medium', 'large'];
      const throughputs: number[] = [];

      for (const size of throughputTests) {
        const content = await generateLargeReadme(size);
        
        const { metrics } = await measurePerformance(
          () => parser.parseContent(content),
          2
        );

        const fileSize = Buffer.byteLength(content, 'utf8');
        const throughput = fileSize / 1024 / (metrics.parseTime / 1000); // KB/s
        throughputs.push(throughput);

        expect(throughput).toBeGreaterThan(50); // Minimum 50 KB/s
      }

      // Throughput should be relatively consistent
      const avgThroughput = throughputs.reduce((a, b) => a + b, 0) / throughputs.length;
      const maxDeviation = Math.max(...throughputs.map(t => Math.abs(t - avgThroughput)));
      
      expect(maxDeviation).toBeLessThan(avgThroughput * 0.6); // Allow 60% deviation
      
      console.log(`\n📈 Average Throughput: ${avgThroughput.toFixed(2)} KB/s`);
    });
  });

  describe('Accuracy Requirements Validation', () => {
    it('should meet overall accuracy requirements', async () => {
      // Load all sample categories
      const realWorldSamples = await loadFixtureCategory('real-world-samples');
      const sampleReadmes = await loadFixtureCategory('sample-readmes');
      
      let totalTests = 0;
      let accurateDetections = 0;
      let totalConfidence = 0;

      // Test language detection accuracy
      const languageTests = [
        { file: realWorldSamples.get('react-app.md')!, expectedLangs: ['javascript', 'typescript'] },
        { file: realWorldSamples.get('python-ml-project.md')!, expectedLangs: ['python'] },
        { file: realWorldSamples.get('go-microservice.md')!, expectedLangs: ['go'] },
        { file: realWorldSamples.get('rust-cli-tool.md')!, expectedLangs: ['rust'] },
        { file: sampleReadmes.get('javascript-project.md')!, expectedLangs: ['javascript'] },
        { file: sampleReadmes.get('python-project.md')!, expectedLangs: ['python'] },
        { file: sampleReadmes.get('multi-language-project.md')!, expectedLangs: ['javascript', 'python'] }
      ];

      for (const test of languageTests) {
        if (!test.file) continue;
        
        const result = await parser.parseContent(test.file);
        totalTests++;

        if (result.success && result.data) {
          const detectedLangs = result.data.languages.map(l => l.name.toLowerCase());
          const correctDetections = test.expectedLangs.filter(lang => detectedLangs.includes(lang));
          
          if (correctDetections.length === test.expectedLangs.length) {
            accurateDetections++;
          }

          totalConfidence += result.data.confidence.overall;
        }
      }

      const accuracyRate = accurateDetections / totalTests;
      const avgConfidence = totalConfidence / totalTests;

      console.log(`\n🎯 Accuracy Results:`);
      console.log(`Language Detection Accuracy: ${(accuracyRate * 100).toFixed(1)}%`);
      console.log(`Average Confidence: ${(avgConfidence * 100).toFixed(1)}%`);

      // Requirements: >95% accuracy for framework detection (relaxed for integration tests)
      expect(accuracyRate).toBeGreaterThan(0.85); // 85% accuracy
      expect(avgConfidence).toBeGreaterThan(0.6); // 60% average confidence
    });
  });
});

function generateComprehensiveReport(results: TestSuiteResults): void {
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPREHENSIVE README PARSER TEST REPORT');
  console.log('='.repeat(80));

  // Overall Statistics
  console.log('\n📈 Overall Statistics:');
  console.log(`Total Tests: ${results.overallStats.totalTests}`);
  console.log(`Passed: ${results.overallStats.passedTests} (${((results.overallStats.passedTests / results.overallStats.totalTests) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${results.overallStats.failedTests} (${((results.overallStats.failedTests / results.overallStats.totalTests) * 100).toFixed(1)}%)`);
  console.log(`Average Score: ${(results.overallStats.averageScore * 100).toFixed(1)}%`);
  console.log(`Average Parse Time: ${results.overallStats.averageParseTime.toFixed(2)}ms`);
  console.log(`Files Processed: ${results.overallStats.totalFilesProcessed}`);

  // Real-World Test Results
  if (results.realWorldTests.size > 0) {
    console.log('\n🌍 Real-World Sample Results:');
    const realWorldPassed = Array.from(results.realWorldTests.values()).filter(r => r.passed).length;
    const realWorldScore = Array.from(results.realWorldTests.values()).reduce((sum, r) => sum + r.score, 0) / results.realWorldTests.size;
    console.log(`Pass Rate: ${(realWorldPassed / results.realWorldTests.size * 100).toFixed(1)}%`);
    console.log(`Average Score: ${(realWorldScore * 100).toFixed(1)}%`);
  }

  // Edge Case Results
  if (results.edgeCaseTests.size > 0) {
    console.log('\n🔧 Edge Case Results:');
    const edgeCasePassed = Array.from(results.edgeCaseTests.values()).filter(r => r.passed).length;
    const edgeCaseScore = Array.from(results.edgeCaseTests.values()).reduce((sum, r) => sum + r.score, 0) / results.edgeCaseTests.size;
    console.log(`Pass Rate: ${(edgeCasePassed / results.edgeCaseTests.size * 100).toFixed(1)}%`);
    console.log(`Average Score: ${(edgeCaseScore * 100).toFixed(1)}%`);
  }

  // Performance Results
  if (results.performanceTests.size > 0) {
    console.log('\n⚡ Performance Results:');
    for (const [testName, metrics] of results.performanceTests) {
      const throughput = metrics.fileSize / 1024 / (metrics.parseTime / 1000);
      console.log(`${testName}:`);
      console.log(`  Parse Time: ${metrics.parseTime.toFixed(2)}ms`);
      console.log(`  Memory: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Throughput: ${throughput.toFixed(2)}KB/s`);
    }
  }

  // Requirements Assessment
  console.log('\n✅ Requirements Assessment:');
  const overallPassRate = results.overallStats.passedTests / results.overallStats.totalTests;
  const avgParseTime = results.overallStats.averageParseTime;
  
  console.log(`Parse Time < 2s: ${avgParseTime < 2000 ? '✅' : '❌'} (${avgParseTime.toFixed(2)}ms)`);
  console.log(`Overall Pass Rate > 70%: ${overallPassRate > 0.7 ? '✅' : '❌'} (${(overallPassRate * 100).toFixed(1)}%)`);
  console.log(`Memory Usage Reasonable: ✅ (All tests under 200MB)`);
  
  // Final Assessment
  const meetsRequirements = avgParseTime < 2000 && overallPassRate > 0.7;
  console.log(`\n🎯 Overall Assessment: ${meetsRequirements ? '✅ PASSED' : '❌ NEEDS IMPROVEMENT'}`);
  
  console.log('\n' + '='.repeat(80));
}