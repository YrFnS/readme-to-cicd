import { CompilationValidator } from '../src/validation/compilation-validator.js';

/**
 * Example usage of CompilationValidator for automated TypeScript error checking
 */
async function demonstrateCompilationValidator() {
  console.log('🔍 CompilationValidator Usage Example');
  console.log('=====================================\n');

  // Create validator instance
  const validator = new CompilationValidator();

  try {
    // 1. Run TypeScript compilation validation
    console.log('1. Running TypeScript compilation validation...');
    const validationResult = await validator.validateTypeScript();

    if (validationResult.success) {
      const result = validationResult.data;
      console.log(`   ✅ Validation completed`);
      console.log(`   📊 Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      console.log(`   🔢 Error Count: ${result.errorCount}`);
      console.log(`   ⚠️  Warning Count: ${result.warnings.length}`);
      console.log(`   🕐 Timestamp: ${result.timestamp}`);

      // Display first few errors if any
      if (result.errors.length > 0) {
        console.log('\n   📋 First 3 errors:');
        result.errors.slice(0, 3).forEach((error, index) => {
          console.log(`      ${index + 1}. ${error.file}(${error.line},${error.column}): ${error.code} - ${error.message}`);
        });
      }
    } else {
      console.log(`   ❌ Validation failed: ${validationResult.error.message}`);
    }

    // 2. Check error count
    console.log('\n2. Checking error count...');
    const errorCount = validator.checkErrorCount();
    console.log(`   🔢 Current error count: ${errorCount}`);

    // 3. Generate comprehensive report
    console.log('\n3. Generating compilation report...');
    const report = validator.generateReport();
    console.log(`   📄 Report generated successfully`);
    console.log(`   ✅ Requirements met:`);
    console.log(`      - Zero errors: ${report.requirements.requirement_3_1_zero_errors}`);
    console.log(`      - Successful compilation: ${report.requirements.requirement_3_2_successful_compilation}`);
    console.log(`      - Report generated: ${report.requirements.requirement_3_3_report_generated}`);
    console.log(`   🚀 Integration-deployment ready: ${report.integrationDeploymentReady}`);
    console.log(`   📝 Summary: ${report.summary}`);

    // 4. Validate fixes (comprehensive check)
    console.log('\n4. Running comprehensive fix validation...');
    const fixValidationResult = await validator.validateFixes();
    
    if (fixValidationResult.success) {
      console.log(`   ✅ All fixes validated successfully!`);
    } else {
      console.log(`   ❌ Fix validation failed`);
      console.log(`   🔢 Remaining errors: ${fixValidationResult.error?.length || 0}`);
    }

    // 5. Display current result
    console.log('\n5. Current validation state...');
    const currentResult = validator.getCurrentResult();
    if (currentResult) {
      console.log(`   📊 Last validation: ${currentResult.timestamp}`);
      console.log(`   🎯 Success: ${currentResult.success}`);
      console.log(`   📈 Exit code: ${currentResult.exitCode}`);
    } else {
      console.log(`   ℹ️  No validation result available`);
    }

    // 6. Reset validator (optional)
    console.log('\n6. Resetting validator state...');
    validator.reset();
    console.log(`   🔄 Validator reset complete`);
    console.log(`   🔢 Error count after reset: ${validator.checkErrorCount()}`);

  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

/**
 * Example of using CompilationValidator in a CI/CD pipeline
 */
async function cicdPipelineExample() {
  console.log('\n🚀 CI/CD Pipeline Integration Example');
  console.log('=====================================\n');

  const validator = new CompilationValidator();

  try {
    // Validate TypeScript compilation
    const result = await validator.validateTypeScript();
    
    if (!result.success) {
      console.error('❌ Compilation validation failed');
      process.exit(1);
    }

    const compilationResult = result.data;
    
    if (!compilationResult.success) {
      console.error(`❌ TypeScript compilation failed with ${compilationResult.errorCount} errors`);
      
      // Generate report for debugging
      const report = validator.generateReport();
      console.log('📄 Compilation report generated for debugging');
      
      // Exit with error code
      process.exit(compilationResult.exitCode);
    }

    console.log('✅ TypeScript compilation successful!');
    console.log('🚀 Ready for integration-deployment phase');
    
    // Generate success report
    const report = validator.generateReport();
    console.log(`📄 Success report: ${report.summary}`);
    
  } catch (error) {
    console.error('❌ CI/CD validation failed:', error);
    process.exit(1);
  }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Running CompilationValidator examples...\n');
  
  demonstrateCompilationValidator()
    .then(() => cicdPipelineExample())
    .then(() => {
      console.log('\n✅ All examples completed successfully!');
    })
    .catch((error) => {
      console.error('\n❌ Examples failed:', error);
      process.exit(1);
    });
}

export { demonstrateCompilationValidator, cicdPipelineExample };