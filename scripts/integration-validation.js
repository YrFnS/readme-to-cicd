#!/usr/bin/env node

/**
 * Integration Validation Script
 * 
 * This script validates the integration between all components in the README parser system.
 * It runs as part of the build process to ensure all components work together correctly.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Logger utility for colored console output
 */
class Logger {
  static info(message) {
    console.log(`${colors.blue}[INFO]${colors.reset} ${message}`);
  }

  static success(message) {
    console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`);
  }

  static warning(message) {
    console.log(`${colors.yellow}[WARNING]${colors.reset} ${message}`);
  }

  static error(message) {
    console.log(`${colors.red}[ERROR]${colors.reset} ${message}`);
  }

  static step(message) {
    console.log(`${colors.cyan}[STEP]${colors.reset} ${message}`);
  }
}

/**
 * Integration validation results
 */
class ValidationResults {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  addResult(step, success, message, details = null) {
    this.results.push({
      step,
      success,
      message,
      details,
      timestamp: new Date().toISOString()
    });
  }

  getSuccessCount() {
    return this.results.filter(r => r.success).length;
  }

  getFailureCount() {
    return this.results.filter(r => !r.success).length;
  }

  getTotalTime() {
    return Date.now() - this.startTime;
  }

  generateReport() {
    const report = {
      summary: {
        totalSteps: this.results.length,
        successful: this.getSuccessCount(),
        failed: this.getFailureCount(),
        executionTime: this.getTotalTime(),
        timestamp: new Date().toISOString()
      },
      results: this.results
    };

    return report;
  }
}

/**
 * Main integration validator class
 */
class IntegrationValidator {
  constructor() {
    this.results = new ValidationResults();
    this.projectRoot = process.cwd();
  }

  /**
   * Run all integration validation steps
   */
  async run() {
    Logger.info('Starting integration validation...');
    
    // Set overall timeout for validation (2 minutes)
    const validationTimeout = setTimeout(() => {
      Logger.error('Integration validation timed out after 2 minutes');
      process.exit(1);
    }, 120000);
    
    try {
      // Check if running in fast mode
      const fastMode = process.argv.includes('--fast') || process.env.FAST_VALIDATION === 'true';
      
      if (fastMode) {
        Logger.info('Running in fast mode - essential validations only');
      }
      
      // Step 1: TypeScript compilation validation
      await this.validateTypeScriptCompilation();
      
      // Step 2: Component interface validation
      await this.validateComponentInterfaces();
      
      if (!fastMode) {
        // Step 3: Integration test execution (skip in fast mode)
        await this.executeIntegrationTests();
        
        // Step 4: End-to-end pipeline validation
        await this.validateEndToEndPipeline();
        
        // Step 5: Performance validation
        await this.validatePerformance();
        
        // Step 6: Memory leak validation
        await this.validateMemoryUsage();
      } else {
        // Fast mode: only essential pipeline validation
        await this.validateEndToEndPipeline();
      }
      
      // Clear timeout
      clearTimeout(validationTimeout);
      
      // Generate final report
      const report = this.results.generateReport();
      await this.generateValidationReport(report);
      
      // Exit with appropriate code
      if (report.summary.failed > 0) {
        Logger.error(`Integration validation failed: ${report.summary.failed} failures out of ${report.summary.totalSteps} steps`);
        process.exit(1);
      } else {
        Logger.success(`Integration validation passed: ${report.summary.successful}/${report.summary.totalSteps} steps completed successfully`);
        process.exit(0);
      }
      
    } catch (error) {
      clearTimeout(validationTimeout);
      Logger.error(`Integration validation crashed: ${error.message}`);
      this.results.addResult('validation-crash', false, error.message, { stack: error.stack });
      process.exit(1);
    }
  }

  /**
   * Validate TypeScript compilation
   */
  async validateTypeScriptCompilation() {
    Logger.step('Validating TypeScript compilation...');
    
    try {
      // Run TypeScript compiler
      execSync('npx tsc --noEmit', { 
        stdio: 'pipe',
        cwd: this.projectRoot 
      });
      
      this.results.addResult(
        'typescript-compilation',
        true,
        'TypeScript compilation successful'
      );
      Logger.success('TypeScript compilation validation passed');
      
    } catch (error) {
      const errorOutput = error.stdout ? error.stdout.toString() : error.message;
      this.results.addResult(
        'typescript-compilation',
        false,
        'TypeScript compilation failed',
        { error: errorOutput }
      );
      Logger.error('TypeScript compilation validation failed');
    }
  }

  /**
   * Validate component interfaces
   */
  async validateComponentInterfaces() {
    Logger.step('Validating component interfaces...');
    
    try {
      // Import and validate key interfaces
      const { ComponentFactory } = require('../dist/parser/component-factory');
      const { IntegrationPipeline } = require('../dist/parser/integration-pipeline');
      
      // Test component factory
      const factory = ComponentFactory.getInstance();
      factory.initialize();
      const dependencies = factory.getDependencies();
      
      // Validate required dependencies exist
      const requiredDependencies = [
        'languageDetector',
        'commandExtractor',
        'dependencyExtractor',
        'testingDetector',
        'metadataExtractor',
        'resultAggregator',
        'confidenceCalculator',
        'sourceTracker',
        'contextCollection'
      ];
      
      for (const dep of requiredDependencies) {
        if (!dependencies[dep]) {
          throw new Error(`Missing required dependency: ${dep}`);
        }
      }
      
      // Test integration pipeline
      const pipeline = new IntegrationPipeline();
      if (typeof pipeline.execute !== 'function') {
        throw new Error('IntegrationPipeline missing execute method');
      }
      
      this.results.addResult(
        'component-interfaces',
        true,
        'Component interfaces validation successful',
        { dependenciesValidated: requiredDependencies.length }
      );
      Logger.success('Component interfaces validation passed');
      
    } catch (error) {
      this.results.addResult(
        'component-interfaces',
        false,
        'Component interfaces validation failed',
        { error: error.message }
      );
      Logger.error(`Component interfaces validation failed: ${error.message}`);
    }
  }

  /**
   * Execute integration tests (lightweight validation)
   */
  async executeIntegrationTests() {
    Logger.step('Executing core integration tests...');
    
    try {
      // Run only the component initialization test for faster validation
      const testOutput = execSync('npm test -- tests/integration/component-initialization.test.ts --run', { 
        stdio: 'pipe',
        cwd: this.projectRoot,
        timeout: 30000 // 30 second timeout
      });
      
      const output = testOutput.toString();
      
      // Parse test results (basic parsing)
      const passedMatch = output.match(/(\d+) passed/);
      const failedMatch = output.match(/(\d+) failed/);
      
      const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
      const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
      
      if (failed > 0) {
        throw new Error(`${failed} core integration tests failed`);
      }
      
      this.results.addResult(
        'integration-tests',
        true,
        'Core integration tests execution successful',
        { passed, failed, testFile: 'component-initialization.test.ts' }
      );
      Logger.success(`Core integration tests validation passed: ${passed} tests passed`);
      
    } catch (error) {
      const errorOutput = error.stdout ? error.stdout.toString() : error.message;
      this.results.addResult(
        'integration-tests',
        false,
        'Core integration tests execution failed',
        { error: errorOutput }
      );
      Logger.error('Core integration tests validation failed');
    }
  }

  /**
   * Validate end-to-end pipeline
   */
  async validateEndToEndPipeline() {
    Logger.step('Validating end-to-end pipeline...');
    
    try {
      const { executeIntegrationPipeline } = require('../dist/parser/integration-pipeline');
      
      // Test with sample content
      const testContent = `
# Test Project

A sample project for validation.

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`bash
npm start
npm test
\`\`\`
      `;
      
      const result = await executeIntegrationPipeline(testContent);
      
      if (!result.success) {
        throw new Error(`Pipeline execution failed: ${result.errors?.[0]?.message || 'Unknown error'}`);
      }
      
      // Validate result structure
      if (!result.data) {
        throw new Error('Pipeline result missing data');
      }
      
      if (!result.pipelineMetadata) {
        throw new Error('Pipeline result missing metadata');
      }
      
      this.results.addResult(
        'end-to-end-pipeline',
        true,
        'End-to-end pipeline validation successful',
        { 
          executionTime: result.pipelineMetadata.executionTime,
          stagesCompleted: result.pipelineMetadata.completedStages?.length || 0
        }
      );
      Logger.success('End-to-end pipeline validation passed');
      
    } catch (error) {
      this.results.addResult(
        'end-to-end-pipeline',
        false,
        'End-to-end pipeline validation failed',
        { error: error.message }
      );
      Logger.error(`End-to-end pipeline validation failed: ${error.message}`);
    }
  }

  /**
   * Validate performance characteristics (quick check)
   */
  async validatePerformance() {
    Logger.step('Validating performance characteristics...');
    
    try {
      const { createIntegrationPipeline } = require('../dist/parser/integration-pipeline');
      
      const pipeline = createIntegrationPipeline({
        enablePerformanceMonitoring: true
      });
      
      const testContent = `# Performance Test\n\n\`\`\`bash\nnpm install\n\`\`\``;
      
      const startTime = Date.now();
      const result = await pipeline.execute(testContent);
      const executionTime = Date.now() - startTime;
      
      // More lenient performance threshold for build validation (10 seconds)
      const MAX_EXECUTION_TIME = 10000; // 10 seconds
      
      if (executionTime > MAX_EXECUTION_TIME) {
        Logger.warning(`Execution time ${executionTime}ms exceeds threshold ${MAX_EXECUTION_TIME}ms`);
      }
      
      if (!result.success) {
        throw new Error('Performance test pipeline execution failed');
      }
      
      this.results.addResult(
        'performance-validation',
        executionTime <= MAX_EXECUTION_TIME,
        executionTime <= MAX_EXECUTION_TIME ? 'Performance validation successful' : 'Performance validation completed with warnings',
        { 
          executionTime,
          threshold: MAX_EXECUTION_TIME,
          note: 'Quick performance check for build validation'
        }
      );
      
      if (executionTime <= MAX_EXECUTION_TIME) {
        Logger.success(`Performance validation passed: ${executionTime}ms execution time`);
      } else {
        Logger.warning(`Performance validation completed: ${executionTime}ms execution time (above threshold)`);
      }
      
    } catch (error) {
      this.results.addResult(
        'performance-validation',
        false,
        'Performance validation failed',
        { error: error.message }
      );
      Logger.error(`Performance validation failed: ${error.message}`);
    }
  }

  /**
   * Validate memory usage (lightweight check)
   */
  async validateMemoryUsage() {
    Logger.step('Validating memory usage...');
    
    try {
      const { createIntegrationPipeline } = require('../dist/parser/integration-pipeline');
      
      // Measure initial memory
      const initialMemory = process.memoryUsage();
      
      // Run single pipeline execution for quick validation
      const pipeline = createIntegrationPipeline();
      const testContent = `# Memory Test\n\n\`\`\`bash\nnpm install\n\`\`\``;
      
      await pipeline.execute(testContent);
      
      // Measure final memory
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // More lenient memory threshold for build validation (50MB)
      const MEMORY_LEAK_THRESHOLD = 50 * 1024 * 1024;
      
      this.results.addResult(
        'memory-validation',
        memoryIncrease <= MEMORY_LEAK_THRESHOLD,
        'Memory validation completed (lightweight check)',
        { 
          initialMemory: Math.round(initialMemory.heapUsed / 1024 / 1024),
          finalMemory: Math.round(finalMemory.heapUsed / 1024 / 1024),
          increase: Math.round(memoryIncrease / 1024 / 1024),
          threshold: Math.round(MEMORY_LEAK_THRESHOLD / 1024 / 1024),
          note: 'Lightweight validation - single execution only'
        }
      );
      
      Logger.success('Memory validation completed');
      
    } catch (error) {
      this.results.addResult(
        'memory-validation',
        false,
        'Memory validation failed',
        { error: error.message }
      );
      Logger.error(`Memory validation failed: ${error.message}`);
    }
  }

  /**
   * Generate validation report
   */
  async generateValidationReport(report) {
    Logger.step('Generating validation report...');
    
    try {
      const reportPath = path.join(this.projectRoot, 'integration-validation-report.json');
      
      // Add system information
      report.system = {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cwd: process.cwd()
      };
      
      // Write report to file
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      
      // Generate summary
      const summary = this.generateSummary(report);
      console.log('\n' + summary);
      
      Logger.success(`Validation report generated: ${reportPath}`);
      
    } catch (error) {
      Logger.error(`Failed to generate validation report: ${error.message}`);
    }
  }

  /**
   * Generate human-readable summary
   */
  generateSummary(report) {
    const { summary, results } = report;
    
    let output = `${colors.bright}Integration Validation Summary${colors.reset}\n`;
    output += `${'='.repeat(50)}\n\n`;
    
    // Overall status
    const status = summary.failed === 0 ? 'PASSED' : 'FAILED';
    const statusColor = summary.failed === 0 ? colors.green : colors.red;
    output += `Status: ${statusColor}${status}${colors.reset}\n`;
    output += `Total Steps: ${summary.totalSteps}\n`;
    output += `Successful: ${colors.green}${summary.successful}${colors.reset}\n`;
    output += `Failed: ${colors.red}${summary.failed}${colors.reset}\n`;
    output += `Execution Time: ${summary.executionTime}ms\n\n`;
    
    // Step details
    output += `${colors.bright}Step Details:${colors.reset}\n`;
    output += `${'-'.repeat(30)}\n`;
    
    for (const result of results) {
      const statusIcon = result.success ? '✓' : '✗';
      const statusColor = result.success ? colors.green : colors.red;
      output += `${statusColor}${statusIcon}${colors.reset} ${result.step}: ${result.message}\n`;
      
      if (!result.success && result.details?.error) {
        output += `  ${colors.red}Error: ${result.details.error}${colors.reset}\n`;
      }
    }
    
    return output;
  }
}

// Main execution
if (require.main === module) {
  const validator = new IntegrationValidator();
  validator.run().catch(error => {
    console.error('Validation script crashed:', error);
    process.exit(1);
  });
}

module.exports = { IntegrationValidator, ValidationResults };