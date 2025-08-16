/**
 * Comprehensive CLI Test Runner
 * 
 * Orchestrates the execution of all CLI comprehensive tests
 * and generates detailed reports for task 18 validation.
 */

import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

interface TestSuite {
  name: string;
  file: string;
  description: string;
  requirements: string[];
}

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: number;
}

interface ComprehensiveTestReport {
  timestamp: string;
  totalSuites: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  overallDuration: number;
  averageCoverage: number;
  suiteResults: TestResult[];
  requirements: {
    [requirement: string]: {
      covered: boolean;
      testCount: number;
      suites: string[];
    };
  };
}

const testSuites: TestSuite[] = [
  {
    name: 'Comprehensive CLI Test Suite',
    file: 'comprehensive-cli-test-suite.test.ts',
    description: 'End-to-end CLI workflows, integration tests, and performance testing',
    requirements: ['1.1', '1.2', '1.3', '1.4', '1.5']
  },
  {
    name: 'CLI User Experience Tests',
    file: 'cli-user-experience.test.ts',
    description: 'Interactive prompts, error handling, and user guidance',
    requirements: ['1.1', '1.2', '1.5']
  },
  {
    name: 'CLI Regression Suite',
    file: 'cli-regression-suite.test.ts',
    description: 'Regression testing to prevent behavior changes',
    requirements: ['1.1', '1.2', '1.3', '1.4', '1.5']
  },
  {
    name: 'CLI Cross-Platform Tests',
    file: 'cli-cross-platform.test.ts',
    description: 'Cross-platform compatibility and CI/CD integration',
    requirements: ['1.1', '1.2', '1.3', '1.4', '1.5']
  }
];

async function runTestSuite(suite: TestSuite): Promise<TestResult> {
  console.log(`\n🧪 Running ${suite.name}...`);
  console.log(`📝 ${suite.description}`);
  
  const startTime = Date.now();
  
  try {
    // Run the test suite with vitest
    const output = execSync(
      `npx vitest run tests/${suite.file} --reporter=json`,
      { 
        encoding: 'utf-8',
        stdio: 'pipe'
      }
    );
    
    const result = JSON.parse(output);
    const duration = Date.now() - startTime;
    
    const testResult: TestResult = {
      suite: suite.name,
      passed: result.numPassedTests || 0,
      failed: result.numFailedTests || 0,
      skipped: result.numPendingTests || 0,
      duration,
      coverage: result.coverageMap ? calculateCoverage(result.coverageMap) : undefined
    };
    
    console.log(`✅ ${testResult.passed} passed, ❌ ${testResult.failed} failed, ⏭️ ${testResult.skipped} skipped`);
    console.log(`⏱️ Duration: ${duration}ms`);
    
    return testResult;
    
  } catch (error) {
    console.error(`❌ Test suite failed: ${error.message}`);
    
    return {
      suite: suite.name,
      passed: 0,
      failed: 1,
      skipped: 0,
      duration: Date.now() - startTime
    };
  }
}

function calculateCoverage(coverageMap: any): number {
  if (!coverageMap) return 0;
  
  let totalLines = 0;
  let coveredLines = 0;
  
  Object.values(coverageMap).forEach((file: any) => {
    if (file.s) {
      Object.values(file.s).forEach((count: number) => {
        totalLines++;
        if (count > 0) coveredLines++;
      });
    }
  });
  
  return totalLines > 0 ? (coveredLines / totalLines) * 100 : 0;
}

function analyzeRequirementsCoverage(suites: TestSuite[], results: TestResult[]): ComprehensiveTestReport['requirements'] {
  const requirements: ComprehensiveTestReport['requirements'] = {};
  
  suites.forEach(suite => {
    const suiteResult = results.find(r => r.suite === suite.name);
    const suitePassed = suiteResult && suiteResult.failed === 0;
    
    suite.requirements.forEach(req => {
      if (!requirements[req]) {
        requirements[req] = {
          covered: false,
          testCount: 0,
          suites: []
        };
      }
      
      requirements[req].suites.push(suite.name);
      requirements[req].testCount += (suiteResult?.passed || 0) + (suiteResult?.failed || 0);
      
      if (suitePassed) {
        requirements[req].covered = true;
      }
    });
  });
  
  return requirements;
}

async function generateReport(results: TestResult[]): Promise<ComprehensiveTestReport> {
  const totalTests = results.reduce((sum, r) => sum + r.passed + r.failed + r.skipped, 0);
  const passedTests = results.reduce((sum, r) => sum + r.passed, 0);
  const failedTests = results.reduce((sum, r) => sum + r.failed, 0);
  const skippedTests = results.reduce((sum, r) => sum + r.skipped, 0);
  const overallDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  const coverageResults = results.filter(r => r.coverage !== undefined);
  const averageCoverage = coverageResults.length > 0
    ? coverageResults.reduce((sum, r) => sum + r.coverage!, 0) / coverageResults.length
    : 0;
  
  const requirements = analyzeRequirementsCoverage(testSuites, results);
  
  return {
    timestamp: new Date().toISOString(),
    totalSuites: results.length,
    totalTests,
    passedTests,
    failedTests,
    skippedTests,
    overallDuration,
    averageCoverage,
    suiteResults: results,
    requirements
  };
}

async function saveReport(report: ComprehensiveTestReport): Promise<void> {
  const reportDir = path.join(__dirname, '..', 'test-reports');
  await fs.mkdir(reportDir, { recursive: true });
  
  const reportPath = path.join(reportDir, `comprehensive-cli-test-report-${Date.now()}.json`);
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📊 Detailed report saved to: ${reportPath}`);
}

function printSummaryReport(report: ComprehensiveTestReport): void {
  console.log('\n' + '='.repeat(80));
  console.log('🎯 COMPREHENSIVE CLI TEST SUITE SUMMARY');
  console.log('='.repeat(80));
  
  console.log(`\n📈 Overall Results:`);
  console.log(`   Total Test Suites: ${report.totalSuites}`);
  console.log(`   Total Tests: ${report.totalTests}`);
  console.log(`   ✅ Passed: ${report.passedTests} (${((report.passedTests / report.totalTests) * 100).toFixed(1)}%)`);
  console.log(`   ❌ Failed: ${report.failedTests} (${((report.failedTests / report.totalTests) * 100).toFixed(1)}%)`);
  console.log(`   ⏭️ Skipped: ${report.skippedTests} (${((report.skippedTests / report.totalTests) * 100).toFixed(1)}%)`);
  console.log(`   ⏱️ Total Duration: ${(report.overallDuration / 1000).toFixed(2)}s`);
  console.log(`   📊 Average Coverage: ${report.averageCoverage.toFixed(1)}%`);
  
  console.log(`\n📋 Requirements Coverage:`);
  Object.entries(report.requirements).forEach(([req, data]) => {
    const status = data.covered ? '✅' : '❌';
    console.log(`   ${status} Requirement ${req}: ${data.testCount} tests across ${data.suites.length} suites`);
  });
  
  console.log(`\n🧪 Suite Details:`);
  report.suiteResults.forEach(result => {
    const successRate = result.passed / (result.passed + result.failed) * 100;
    const status = result.failed === 0 ? '✅' : '❌';
    console.log(`   ${status} ${result.suite}: ${successRate.toFixed(1)}% success (${result.duration}ms)`);
  });
  
  const overallSuccess = report.failedTests === 0;
  console.log(`\n🎉 Overall Status: ${overallSuccess ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (overallSuccess) {
    console.log('\n🚀 Task 18 - Comprehensive CLI Test Suite: COMPLETED SUCCESSFULLY');
    console.log('   ✅ End-to-end test scenarios covering all CLI workflows');
    console.log('   ✅ Integration tests with real project structures and configurations');
    console.log('   ✅ User experience testing with various input scenarios');
    console.log('   ✅ Performance and load testing for batch operations');
    console.log('   ✅ Regression tests to prevent CLI behavior changes');
    console.log('   ✅ Cross-platform testing (Windows, macOS, Linux, CI/CD)');
  }
  
  console.log('\n' + '='.repeat(80));
}

async function main(): Promise<void> {
  console.log('🚀 Starting Comprehensive CLI Test Suite Execution');
  console.log('📋 Task 18: Build comprehensive test suite and validation');
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  
  const results: TestResult[] = [];
  
  // Run each test suite
  for (const suite of testSuites) {
    const result = await runTestSuite(suite);
    results.push(result);
  }
  
  // Generate and save comprehensive report
  const report = await generateReport(results);
  await saveReport(report);
  
  // Print summary
  printSummaryReport(report);
  
  // Exit with appropriate code
  const hasFailures = results.some(r => r.failed > 0);
  process.exit(hasFailures ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

export { main as runComprehensiveCLITests, TestResult, ComprehensiveTestReport };