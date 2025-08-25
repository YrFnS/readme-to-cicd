#!/usr/bin/env node

/**
 * Comprehensive Spec Test Runner
 * Runs all spec-based tests and generates coverage report
 */

import { execSync } from 'child_process';
import { join } from 'path';
import { writeFileSync } from 'fs';

interface TestSuite {
  name: string;
  path: string;
  requirements: number;
  expectedTests: number;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
}

const testSuites: TestSuite[] = [
  {
    name: 'README Parser',
    path: 'core-components/readme-parser-spec.test.ts',
    requirements: 8,
    expectedTests: 120,
    priority: 'P1'
  },
  {
    name: 'Framework Detection',
    path: 'core-components/framework-detection-spec.test.ts',
    requirements: 6,
    expectedTests: 90,
    priority: 'P1'
  },
  {
    name: 'YAML Generator',
    path: 'core-components/yaml-generator-spec.test.ts',
    requirements: 5,
    expectedTests: 75,
    priority: 'P1'
  },
  {
    name: 'CLI Tool',
    path: 'user-interfaces/cli-tool-spec.test.ts',
    requirements: 4,
    expectedTests: 60,
    priority: 'P1'
  },
  {
    name: 'VSCode Extension',
    path: 'user-interfaces/vscode-extension-spec.test.ts',
    requirements: 4,
    expectedTests: 60,
    priority: 'P2'
  },
  {
    name: 'Agent Hooks',
    path: 'advanced-features/agent-hooks-spec.test.ts',
    requirements: 3,
    expectedTests: 45,
    priority: 'P2'
  },
  {
    name: 'Integration Deployment',
    path: 'advanced-features/integration-deployment-spec.test.ts',
    requirements: 3,
    expectedTests: 45,
    priority: 'P2'
  },
  {
    name: 'Analytics System',
    path: 'advanced-features/analytics-system-spec.test.ts',
    requirements: 0, // Implementation-based
    expectedTests: 60,
    priority: 'P3'
  },
  {
    name: 'Compliance Framework',
    path: 'advanced-features/compliance-framework-spec.test.ts',
    requirements: 0, // Implementation-based
    expectedTests: 75,
    priority: 'P3'
  },
  {
    name: 'Disaster Recovery',
    path: 'advanced-features/disaster-recovery-spec.test.ts',
    requirements: 0, // Implementation-based
    expectedTests: 60,
    priority: 'P3'
  }
];

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  total: number;
  duration: number;
  coverage?: number;
}

async function runSpecTests(): Promise<void> {
  console.log('🚀 Starting Comprehensive Spec Test Suite');
  console.log('==========================================\n');

  const results: TestResult[] = [];
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let totalDuration = 0;

  // Run tests by priority
  const priorities = ['P1', 'P2', 'P3', 'P4'];
  
  for (const priority of priorities) {
    const suitesForPriority = testSuites.filter(s => s.priority === priority);
    
    if (suitesForPriority.length === 0) continue;
    
    console.log(`\n📋 Running ${priority} Tests (${suitesForPriority.length} suites)`);
    console.log('─'.repeat(50));
    
    for (const suite of suitesForPriority) {
      console.log(`\n🧪 Testing: ${suite.name}`);
      console.log(`   Requirements: ${suite.requirements}`);
      console.log(`   Expected Tests: ${suite.expectedTests}`);
      
      try {
        const startTime = Date.now();
        const testPath = join(__dirname, suite.path);
        
        // Run the test suite
        const command = `npx vitest run "${testPath}" --reporter=json`;
        const output = execSync(command, { 
          encoding: 'utf-8',
          cwd: join(__dirname, '../../..')
        });
        
        const duration = Date.now() - startTime;
        
        // Parse test results
        const testResult = parseTestOutput(output);
        const result: TestResult = {
          suite: suite.name,
          passed: testResult.passed,
          failed: testResult.failed,
          total: testResult.total,
          duration
        };
        
        results.push(result);
        totalTests += result.total;
        totalPassed += result.passed;
        totalFailed += result.failed;
        totalDuration += duration;
        
        // Display results
        const successRate = result.total > 0 ? (result.passed / result.total * 100).toFixed(1) : '0';
        const status = result.failed === 0 ? '✅' : '❌';
        
        console.log(`   ${status} ${result.passed}/${result.total} tests passed (${successRate}%)`);
        console.log(`   ⏱️  Duration: ${duration}ms`);
        
        if (result.failed > 0) {
          console.log(`   ⚠️  ${result.failed} tests failed`);
        }
        
      } catch (error: any) {
        console.log(`   ❌ Test suite failed to run`);
        console.log(`   Error: ${error.message}`);
        
        results.push({
          suite: suite.name,
          passed: 0,
          failed: suite.expectedTests,
          total: suite.expectedTests,
          duration: 0
        });
        
        totalTests += suite.expectedTests;
        totalFailed += suite.expectedTests;
      }
    }
  }

  // Generate summary report
  console.log('\n📊 Test Summary Report');
  console.log('======================');
  
  const overallSuccessRate = totalTests > 0 ? (totalPassed / totalTests * 100).toFixed(1) : '0';
  const status = totalFailed === 0 ? '✅ ALL TESTS PASSED' : `❌ ${totalFailed} TESTS FAILED`;
  
  console.log(`\n${status}`);
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Success Rate: ${overallSuccessRate}%`);
  console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);

  // Generate detailed report
  generateDetailedReport(results, {
    totalTests,
    totalPassed,
    totalFailed,
    overallSuccessRate: parseFloat(overallSuccessRate),
    totalDuration
  });

  // Exit with appropriate code
  process.exit(totalFailed === 0 ? 0 : 1);
}

function parseTestOutput(output: string): { passed: number; failed: number; total: number } {
  try {
    const jsonOutput = JSON.parse(output);
    
    if (jsonOutput.testResults) {
      let passed = 0;
      let failed = 0;
      
      for (const result of jsonOutput.testResults) {
        passed += result.assertionResults?.filter((a: any) => a.status === 'passed').length || 0;
        failed += result.assertionResults?.filter((a: any) => a.status === 'failed').length || 0;
      }
      
      return { passed, failed, total: passed + failed };
    }
    
    // Fallback parsing
    return { passed: 0, failed: 0, total: 0 };
    
  } catch (error) {
    // Parse text output as fallback
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    
    const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
    
    return { passed, failed, total: passed + failed };
  }
}

function generateDetailedReport(
  results: TestResult[], 
  summary: {
    totalTests: number;
    totalPassed: number;
    totalFailed: number;
    overallSuccessRate: number;
    totalDuration: number;
  }
): void {
  const report = {
    timestamp: new Date().toISOString(),
    summary,
    results,
    specCoverage: {
      totalRequirements: testSuites.reduce((sum, s) => sum + s.requirements, 0),
      totalExpectedTests: testSuites.reduce((sum, s) => sum + s.expectedTests, 0),
      actualTests: summary.totalTests,
      coveragePercentage: summary.totalTests > 0 ? 
        (summary.totalTests / testSuites.reduce((sum, s) => sum + s.expectedTests, 0) * 100).toFixed(1) : '0'
    },
    recommendations: generateRecommendations(results, summary)
  };

  const reportPath = join(__dirname, '../../../spec-test-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
}

function generateRecommendations(
  results: TestResult[], 
  summary: any
): string[] {
  const recommendations: string[] = [];
  
  if (summary.overallSuccessRate < 95) {
    recommendations.push('Focus on fixing failing tests to achieve >95% success rate');
  }
  
  if (summary.totalFailed > 0) {
    const failedSuites = results.filter(r => r.failed > 0);
    recommendations.push(`Priority: Fix failing tests in ${failedSuites.map(s => s.suite).join(', ')}`);
  }
  
  const slowSuites = results.filter(r => r.duration > 5000);
  if (slowSuites.length > 0) {
    recommendations.push(`Optimize performance for slow test suites: ${slowSuites.map(s => s.suite).join(', ')}`);
  }
  
  if (summary.overallSuccessRate >= 95) {
    recommendations.push('Excellent test coverage! Consider adding more edge case tests');
  }
  
  return recommendations;
}

// Run the tests
if (require.main === module) {
  runSpecTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

export { runSpecTests, testSuites };