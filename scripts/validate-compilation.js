#!/usr/bin/env node

/**
 * Automated TypeScript Compilation Validation Script
 * 
 * This script validates TypeScript compilation and generates reports
 * for the error-resolution workflow.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class CompilationValidator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      success: false,
      errorCount: 0,
      warnings: [],
      errors: [],
      exitCode: null
    };
  }

  /**
   * Run TypeScript compilation validation
   */
  async validateTypeScript() {
    console.log('🔍 Running TypeScript compilation validation...');
    
    try {
      // Execute TypeScript compilation check
      const output = execSync('npx tsc --noEmit', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      this.results.success = true;
      this.results.exitCode = 0;
      this.results.errorCount = 0;
      
      console.log('✅ TypeScript compilation successful!');
      return this.results;
      
    } catch (error) {
      this.results.success = false;
      this.results.exitCode = error.status || 1;
      this.results.errorCount = this.parseErrorCount(error.stdout || error.stderr || '');
      this.results.errors = this.parseErrors(error.stdout || error.stderr || '');
      
      console.log(`❌ TypeScript compilation failed with ${this.results.errorCount} errors`);
      return this.results;
    }
  }

  /**
   * Parse error count from TypeScript output
   */
  parseErrorCount(output) {
    const errorMatches = output.match(/error TS\d+:/g);
    return errorMatches ? errorMatches.length : 0;
  }

  /**
   * Parse individual errors from TypeScript output
   */
  parseErrors(output) {
    const errors = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('error TS')) {
        errors.push(line.trim());
      }
    }
    
    return errors;
  }

  /**
   * Generate compilation report
   */
  generateReport() {
    const reportPath = path.join(process.cwd(), 'compilation-validation-report.json');
    
    const report = {
      ...this.results,
      requirements: {
        'requirement_3_1_zero_errors': this.results.errorCount === 0,
        'requirement_3_2_successful_compilation': this.results.success,
        'requirement_3_3_report_generated': true
      },
      integrationDeploymentReady: this.results.success && this.results.errorCount === 0
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Report generated: ${reportPath}`);
    
    return report;
  }

  /**
   * Check error count and return status
   */
  checkErrorCount() {
    return this.results.errorCount;
  }

  /**
   * Display validation summary
   */
  displaySummary() {
    console.log('\n📊 Compilation Validation Summary');
    console.log('================================');
    console.log(`Status: ${this.results.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Error Count: ${this.results.errorCount}`);
    console.log(`Exit Code: ${this.results.exitCode}`);
    
    if (this.results.errors.length > 0) {
      console.log('\nErrors:');
      this.results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    console.log(`\nIntegration-Deployment Ready: ${this.results.success ? '✅ YES' : '❌ NO'}`);
  }
}

// Main execution
async function main() {
  const validator = new CompilationValidator();
  
  try {
    await validator.validateTypeScript();
    const report = validator.generateReport();
    validator.displaySummary();
    
    // Exit with appropriate code
    process.exit(validator.results.success ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Validation script failed:', error.message);
    process.exit(1);
  }
}

// Export for testing
module.exports = { CompilationValidator };

// Run if called directly
if (require.main === module) {
  main();
}