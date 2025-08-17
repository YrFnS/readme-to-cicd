import * as path from 'path';
import * as Mocha from 'mocha';
import * as glob from 'glob';
import * as vscode from 'vscode';

export interface TestRunnerOptions {
  ui: string;
  color: boolean;
  timeout: number;
  grep?: string;
  reporter: string;
  reporterOptions?: any;
}

export interface TestResults {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  duration: number;
  failures: TestFailure[];
}

export interface TestFailure {
  title: string;
  fullTitle: string;
  error: string;
  stack?: string;
}

export class TestRunner {
  private mocha: Mocha;
  private options: TestRunnerOptions;

  constructor(options: Partial<TestRunnerOptions> = {}) {
    this.options = {
      ui: 'bdd',
      color: true,
      timeout: 10000,
      reporter: 'spec',
      ...options
    };

    this.mocha = new Mocha(this.options);
  }

  /**
   * Run all tests
   */
  public async runTests(testRoot: string): Promise<TestResults> {
    return new Promise((resolve, reject) => {
      try {
        // Find all test files
        const testFiles = glob.sync('**/*.test.js', { cwd: testRoot });
        
        if (testFiles.length === 0) {
          reject(new Error('No test files found'));
          return;
        }

        // Add test files to Mocha
        testFiles.forEach(file => {
          this.mocha.addFile(path.resolve(testRoot, file));
        });

        // Track test results
        const results: TestResults = {
          passed: 0,
          failed: 0,
          skipped: 0,
          total: 0,
          duration: 0,
          failures: []
        };

        const startTime = Date.now();

        // Set up event listeners
        this.mocha.suite.on('test end', (test: any) => {
          results.total++;
          if (test.state === 'passed') {
            results.passed++;
          } else if (test.state === 'failed') {
            results.failed++;
            results.failures.push({
              title: test.title,
              fullTitle: test.fullTitle(),
              error: test.err?.message || 'Unknown error',
              stack: test.err?.stack
            });
          } else if (test.pending) {
            results.skipped++;
          }
        });

        // Run tests
        this.mocha.run((failures) => {
          results.duration = Date.now() - startTime;
          
          if (failures > 0) {
            console.error(`${failures} test(s) failed`);
          }
          
          resolve(results);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Run specific test suite
   */
  public async runTestSuite(testRoot: string, suiteName: string): Promise<TestResults> {
    const originalGrep = this.options.grep;
    this.options.grep = suiteName;
    this.mocha = new Mocha(this.options);
    
    try {
      const results = await this.runTests(testRoot);
      return results;
    } finally {
      this.options.grep = originalGrep;
    }
  }

  /**
   * Run tests with coverage
   */
  public async runTestsWithCoverage(testRoot: string, coverageDir: string): Promise<TestResults> {
    // Set up NYC (Istanbul) for coverage
    const NYC = require('nyc');
    
    const nyc = new NYC({
      cwd: path.dirname(testRoot),
      reporter: ['text', 'html', 'lcov'],
      reportDir: coverageDir,
      include: ['out/src/**/*.js'],
      exclude: ['out/test/**', 'out/src/test/**'],
      all: true
    });

    await nyc.reset();
    await nyc.wrap();

    try {
      const results = await this.runTests(testRoot);
      await nyc.writeCoverageFile();
      await nyc.report();
      
      return results;
    } finally {
      await nyc.cleanup();
    }
  }

  /**
   * Generate test report
   */
  public generateReport(results: TestResults, format: 'json' | 'xml' | 'html' = 'json'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(results, null, 2);
      
      case 'xml':
        return this.generateXmlReport(results);
      
      case 'html':
        return this.generateHtmlReport(results);
      
      default:
        return JSON.stringify(results, null, 2);
    }
  }

  /**
   * Generate XML test report (JUnit format)
   */
  private generateXmlReport(results: TestResults): string {
    const escapeXml = (str: string) => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<testsuite name="README to CI/CD Extension Tests" `;
    xml += `tests="${results.total}" `;
    xml += `failures="${results.failed}" `;
    xml += `skipped="${results.skipped}" `;
    xml += `time="${results.duration / 1000}">\n`;

    results.failures.forEach(failure => {
      xml += `  <testcase name="${escapeXml(failure.title)}" classname="${escapeXml(failure.fullTitle)}">\n`;
      xml += `    <failure message="${escapeXml(failure.error)}">\n`;
      xml += `      ${escapeXml(failure.stack || failure.error)}\n`;
      xml += `    </failure>\n`;
      xml += `  </testcase>\n`;
    });

    xml += '</testsuite>\n';
    return xml;
  }

  /**
   * Generate HTML test report
   */
  private generateHtmlReport(results: TestResults): string {
    const successRate = results.total > 0 ? (results.passed / results.total * 100).toFixed(1) : '0';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>README to CI/CD Extension Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .failure { background: #f8d7da; padding: 10px; margin: 10px 0; border-radius: 3px; }
        .stack { font-family: monospace; font-size: 12px; white-space: pre-wrap; }
    </style>
</head>
<body>
    <h1>README to CI/CD Extension Test Report</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Total Tests:</strong> ${results.total}</p>
        <p><strong class="passed">Passed:</strong> ${results.passed}</p>
        <p><strong class="failed">Failed:</strong> ${results.failed}</p>
        <p><strong class="skipped">Skipped:</strong> ${results.skipped}</p>
        <p><strong>Success Rate:</strong> ${successRate}%</p>
        <p><strong>Duration:</strong> ${(results.duration / 1000).toFixed(2)}s</p>
    </div>

    ${results.failures.length > 0 ? `
    <div class="failures">
        <h2>Failures</h2>
        ${results.failures.map(failure => `
        <div class="failure">
            <h3>${failure.fullTitle}</h3>
            <p><strong>Error:</strong> ${failure.error}</p>
            ${failure.stack ? `<div class="stack">${failure.stack}</div>` : ''}
        </div>
        `).join('')}
    </div>
    ` : ''}
</body>
</html>`;
  }
}

/**
 * Main test runner entry point
 */
export async function run(): Promise<void> {
  const testRunner = new TestRunner({
    ui: 'bdd',
    color: true,
    timeout: 10000,
    reporter: 'spec'
  });

  const testRoot = path.resolve(__dirname, '..');
  
  try {
    const results = await testRunner.runTests(testRoot);
    
    console.log('\n=== Test Results ===');
    console.log(`Total: ${results.total}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Skipped: ${results.skipped}`);
    console.log(`Duration: ${(results.duration / 1000).toFixed(2)}s`);
    
    if (results.failed > 0) {
      console.log('\n=== Failures ===');
      results.failures.forEach(failure => {
        console.log(`❌ ${failure.fullTitle}`);
        console.log(`   ${failure.error}`);
      });
      
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed!');
    }
    
  } catch (error) {
    console.error('Test runner failed:', error);
    process.exit(1);
  }
}