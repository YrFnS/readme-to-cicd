#!/usr/bin/env node

/**
 * System Validation Script
 * 
 * Runs comprehensive system validation and generates a detailed report.
 * This script demonstrates the validation system capabilities.
 */

import { runValidation, checkSystemHealth } from '../src/validation/validation-runner';
import { logger } from '../src/shared/logging/central-logger';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'full';

  try {
    switch (command) {
      case 'health':
        console.log('🏥 Running system health check...\n');
        const healthResult = await checkSystemHealth();
        console.log(`\n✅ Health check completed:`);
        console.log(`   Healthy: ${healthResult.healthy ? 'YES' : 'NO'}`);
        console.log(`   Score: ${healthResult.score.toFixed(1)}/100`);
        process.exit(healthResult.healthy ? 0 : 1);
        break;

      case 'full':
        console.log('🚀 Running comprehensive system validation...\n');
        const result = await runValidation({
          healthMonitoring: true,
          endToEndTesting: true,
          performanceBenchmarks: true,
          outputFormat: 'both',
          outputFile: 'validation-report.json'
        });

        console.log(`\n🎯 Validation completed:`);
        console.log(`   Overall Score: ${result.overallScore.toFixed(1)}/100`);
        console.log(`   Readiness Level: ${result.readinessLevel.toUpperCase()}`);
        console.log(`   System Ready: ${result.systemReadiness.ready ? 'YES' : 'NO'}`);
        
        if (result.systemReadiness.blockers.length > 0) {
          console.log(`   Blockers: ${result.systemReadiness.blockers.length}`);
        }
        
        if (result.recommendations.length > 0) {
          console.log(`   Recommendations: ${result.recommendations.length}`);
        }

        // Exit with appropriate code
        const exitCode = result.systemReadiness.ready && result.overallScore >= 80 ? 0 : 1;
        process.exit(exitCode);
        break;

      case 'help':
        console.log('System Validation Script');
        console.log('');
        console.log('Usage:');
        console.log('  npm run validate              # Run full validation');
        console.log('  npm run validate health       # Run health check only');
        console.log('  npm run validate help         # Show this help');
        console.log('');
        console.log('Exit codes:');
        console.log('  0 - System is healthy and ready');
        console.log('  1 - System has issues or is not ready');
        process.exit(0);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.log('Run "npm run validate help" for usage information.');
        process.exit(1);
    }

  } catch (error) {
    logger.error('Validation script failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    console.error(`\n❌ Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', { reason, promise });
  console.error('❌ Unhandled promise rejection:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  console.error('❌ Uncaught exception:', error.message);
  process.exit(1);
});

// Run the main function
main();