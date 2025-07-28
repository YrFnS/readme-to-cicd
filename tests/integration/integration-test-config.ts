/**
 * Configuration and utilities for integration tests
 * Provides shared setup and configuration for all integration test suites
 */

import { beforeAll, afterAll } from 'vitest';
import { ReadmeParserImpl } from '../../src/parser/readme-parser';

/**
 * Global test configuration
 */
export const INTEGRATION_TEST_CONFIG = {
  // Performance thresholds
  performance: {
    maxParseTime: 500, // milliseconds
    maxMemoryUsage: 50 * 1024 * 1024, // 50MB
    minThroughput: 10, // KB/s
    maxIntegrationOverhead: 4, // times slower than baseline
  },
  
  // Accuracy requirements
  accuracy: {
    minSuccessRate: 0.75, // 75%
    minAverageScore: 0.6, // 60%
    minConfidenceScore: 0.3, // 30%
  },
  
  // Test data configuration
  testData: {
    realWorldSamples: [
      'react-app.md',
      'python-ml-project.md',
      'go-microservice.md',
      'rust-cli-tool.md'
    ],
    maxFileSize: 1024 * 1024, // 1MB
    maxTestDuration: 30000, // 30 seconds
  },
  
  // Integration test settings
  integration: {
    enableCaching: true,
    enablePerformanceMonitoring: true,
    parallelAnalyzers: true,
    maxConcurrentRequests: 10,
  }
};

/**
 * Expected results for validation testing
 */
export const EXPECTED_RESULTS = {
  'react-app.md': {
    languages: [
      { name: 'JavaScript', confidence: 0.7, sources: ['code-block'], frameworks: ['React'] },
      { name: 'TypeScript', confidence: 0.6, sources: ['code-block'] }
    ],
    commands: {
      build: [{ command: 'npm run build', confidence: 0.8 }],
      test: [{ command: 'npm test', confidence: 0.8 }],
      install: [{ command: 'npm install', confidence: 0.8 }]
    },
    dependencies: {
      packageFiles: [{ name: 'package.json', type: 'npm', mentioned: true, confidence: 0.9 }]
    },
    metadata: {
      name: 'React Todo App'
    }
  },
  
  'python-ml-project.md': {
    languages: [
      { name: 'Python', confidence: 0.8, sources: ['code-block'], frameworks: ['PyTorch', 'FastAPI'] }
    ],
    commands: {
      test: [{ command: 'pytest', confidence: 0.8 }],
      build: [{ command: 'docker build -t ml-classifier .', confidence: 0.7 }]
    },
    dependencies: {
      packageFiles: [{ name: 'requirements.txt', type: 'pip', mentioned: true, confidence: 0.8 }]
    },
    metadata: {
      name: 'ML Classifier'
    }
  },
  
  'go-microservice.md': {
    languages: [
      { name: 'Go', confidence: 0.7, sources: ['code-block'], frameworks: ['Gin'] }
    ],
    commands: {
      build: [
        { command: 'go run cmd/server/main.go', confidence: 0.8 },
        { command: 'make build', confidence: 0.7 }
      ],
      test: [{ command: 'go test ./...', confidence: 0.8 }]
    },
    dependencies: {
      packageFiles: [{ name: 'go.mod', type: 'go', mentioned: true, confidence: 0.8 }]
    }
  },
  
  'rust-cli-tool.md': {
    languages: [
      { name: 'Rust', confidence: 0.7, sources: ['code-block'] }
    ],
    commands: {
      build: [{ command: 'cargo build --release', confidence: 0.8 }],
      test: [{ command: 'cargo test', confidence: 0.8 }]
    },
    dependencies: {
      packageFiles: [{ name: 'Cargo.toml', type: 'cargo', mentioned: true, confidence: 0.8 }],
      installCommands: [{ command: 'cargo install file-processor', confidence: 0.7 }]
    }
  }
};

/**
 * Performance benchmarks for regression testing
 */
export const PERFORMANCE_BENCHMARKS = {
  'react-app.md': {
    maxParseTime: 200, // ms
    maxMemoryUsage: 20 * 1024 * 1024, // 20MB
    minThroughput: 25 // KB/s
  },
  
  'python-ml-project.md': {
    maxParseTime: 300, // ms
    maxMemoryUsage: 30 * 1024 * 1024, // 30MB
    minThroughput: 20 // KB/s
  },
  
  'go-microservice.md': {
    maxParseTime: 250, // ms
    maxMemoryUsage: 25 * 1024 * 1024, // 25MB
    minThroughput: 22 // KB/s
  },
  
  'rust-cli-tool.md': {
    maxParseTime: 180, // ms
    maxMemoryUsage: 18 * 1024 * 1024, // 18MB
    minThroughput: 28 // KB/s
  }
};

/**
 * Test utilities and helpers
 */
export class IntegrationTestHelper {
  private static parser: ReadmeParserImpl;
  
  static getParser(): ReadmeParserImpl {
    if (!this.parser) {
      this.parser = new ReadmeParserImpl(INTEGRATION_TEST_CONFIG.integration);
    }
    return this.parser;
  }
  
  static resetParser(): void {
    this.parser = new ReadmeParserImpl(INTEGRATION_TEST_CONFIG.integration);
  }
  
  static validatePerformance(metrics: any, filename: string): void {
    const benchmark = PERFORMANCE_BENCHMARKS[filename as keyof typeof PERFORMANCE_BENCHMARKS];
    if (benchmark) {
      if (metrics.parseTime > benchmark.maxParseTime) {
        console.warn(`⚠️  Performance regression detected for ${filename}: ${metrics.parseTime}ms > ${benchmark.maxParseTime}ms`);
      }
      if (metrics.memoryUsage > benchmark.maxMemoryUsage) {
        console.warn(`⚠️  Memory usage regression detected for ${filename}: ${(metrics.memoryUsage/1024/1024).toFixed(1)}MB > ${(benchmark.maxMemoryUsage/1024/1024).toFixed(1)}MB`);
      }
    }
  }
  
  static logTestResults(testName: string, results: any): void {
    console.log(`\n📋 ${testName} Results:`);
    console.log(`${'='.repeat(50)}`);
    
    if (results.success !== undefined) {
      console.log(`✅ Success: ${results.success}`);
    }
    
    if (results.accuracy !== undefined) {
      console.log(`🎯 Accuracy: ${(results.accuracy * 100).toFixed(1)}%`);
    }
    
    if (results.performance !== undefined) {
      console.log(`⚡ Performance: ${results.performance.toFixed(1)}ms`);
    }
    
    if (results.coverage !== undefined) {
      console.log(`📊 Coverage: ${(results.coverage * 100).toFixed(1)}%`);
    }
  }
}

/**
 * Global test setup and teardown
 */
let globalTestStartTime: number;

beforeAll(() => {
  globalTestStartTime = Date.now();
  console.log('\n🚀 Starting Integration Test Suite');
  console.log(`Configuration: ${JSON.stringify(INTEGRATION_TEST_CONFIG, null, 2)}`);
});

afterAll(() => {
  const totalTestTime = Date.now() - globalTestStartTime;
  console.log(`\n✅ Integration Test Suite Completed in ${totalTestTime}ms`);
  
  // Log final statistics
  const parser = IntegrationTestHelper.getParser();
  const performanceStats = parser.getPerformanceStats();
  const cacheStats = parser.getCacheStats();
  
  console.log('\n📊 Final Statistics:');
  console.log(`Performance Operations: ${performanceStats.totalOperations || 0}`);
  console.log(`Cache Hits: ${cacheStats.hits || 0}`);
  console.log(`Cache Misses: ${cacheStats.misses || 0}`);
  console.log(`Memory Usage: ${parser.getMemoryUsage()}`);
});

/**
 * Test data validation utilities
 */
export function validateTestData(data: any, expectedStructure: any): boolean {
  try {
    // Basic structure validation
    if (!data || typeof data !== 'object') return false;
    
    // Check required fields
    const requiredFields = ['metadata', 'languages', 'dependencies', 'commands', 'confidence'];
    for (const field of requiredFields) {
      if (!(field in data)) return false;
    }
    
    // Validate arrays
    if (!Array.isArray(data.languages)) return false;
    if (!Array.isArray(data.dependencies.packageFiles)) return false;
    if (!Array.isArray(data.commands.build)) return false;
    
    // Validate confidence scores
    if (typeof data.confidence.overall !== 'number') return false;
    if (data.confidence.overall < 0 || data.confidence.overall > 1) return false;
    
    return true;
  } catch (error) {
    console.error('Test data validation error:', error);
    return false;
  }
}

/**
 * Performance assertion helpers
 */
export function assertPerformanceRequirements(metrics: any, requirements: any): void {
  if (requirements.maxParseTime && metrics.parseTime > requirements.maxParseTime) {
    throw new Error(`Parse time ${metrics.parseTime}ms exceeds maximum ${requirements.maxParseTime}ms`);
  }
  
  if (requirements.maxMemoryUsage && metrics.memoryUsage > requirements.maxMemoryUsage) {
    throw new Error(`Memory usage ${(metrics.memoryUsage/1024/1024).toFixed(1)}MB exceeds maximum ${(requirements.maxMemoryUsage/1024/1024).toFixed(1)}MB`);
  }
  
  if (requirements.minThroughput && metrics.fileSize) {
    const throughput = metrics.fileSize / 1024 / (metrics.parseTime / 1000);
    if (throughput < requirements.minThroughput) {
      throw new Error(`Throughput ${throughput.toFixed(1)} KB/s below minimum ${requirements.minThroughput} KB/s`);
    }
  }
}

/**
 * Integration test result aggregation
 */
export class TestResultAggregator {
  private results: Map<string, any> = new Map();
  
  addResult(testName: string, result: any): void {
    this.results.set(testName, {
      ...result,
      timestamp: new Date().toISOString()
    });
  }
  
  getResults(): Map<string, any> {
    return new Map(this.results);
  }
  
  generateSummary(): any {
    const results = Array.from(this.results.values());
    
    return {
      totalTests: results.length,
      passedTests: results.filter(r => r.success === true).length,
      failedTests: results.filter(r => r.success === false).length,
      averageAccuracy: results.reduce((sum, r) => sum + (r.accuracy || 0), 0) / results.length,
      averagePerformance: results.reduce((sum, r) => sum + (r.performance || 0), 0) / results.length,
      totalDuration: results.reduce((sum, r) => sum + (r.duration || 0), 0)
    };
  }
  
  logSummary(): void {
    const summary = this.generateSummary();
    
    console.log('\n📈 Integration Test Summary:');
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`Passed: ${summary.passedTests} (${((summary.passedTests / summary.totalTests) * 100).toFixed(1)}%)`);
    console.log(`Failed: ${summary.failedTests} (${((summary.failedTests / summary.totalTests) * 100).toFixed(1)}%)`);
    console.log(`Average Accuracy: ${(summary.averageAccuracy * 100).toFixed(1)}%`);
    console.log(`Average Performance: ${summary.averagePerformance.toFixed(1)}ms`);
    console.log(`Total Duration: ${summary.totalDuration.toFixed(1)}ms`);
  }
}

export default INTEGRATION_TEST_CONFIG;