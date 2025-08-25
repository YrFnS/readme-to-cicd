#!/usr/bin/env node

/**
 * Final System Validation Runner
 * 
 * Command-line script to execute comprehensive system validation
 * and generate final readiness assessment.
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { 
  FinalSystemValidation, 
  createDefaultFinalValidationConfig,
  FinalValidationConfig,
  FinalValidationResult 
} from '../src/validation/final-system-validation.js';

const program = new Command();

program
  .name('run-final-validation')
  .description('Execute comprehensive final system validation and acceptance testing')
  .version('1.0.0');

program
  .option('-c, --config <path>', 'Path to validation configuration file')
  .option('-o, --output <path>', 'Output directory for validation reports', './validation-reports')
  .option('-e, --environment <env>', 'Target environment (development|staging|production)', 'production')
  .option('--no-archive', 'Disable result archival')
  .option('--no-docs', 'Skip documentation generation')
  .option('--format <formats>', 'Report formats (json,html,pdf)', 'json,html')
  .option('--stakeholders <list>', 'Comma-separated list of stakeholders to notify')
  .option('--timeout <seconds>', 'Overall validation timeout in seconds', '3600')
  .option('--parallel', 'Run validation suites in parallel (default: true)', true)
  .option('--verbose', 'Enable verbose logging')
  .option('--dry-run', 'Perform validation without saving results')
  .action(async (options) => {
    try {
      console.log('🚀 Starting Final System Validation and Acceptance Testing');
      console.log('=' .repeat(60));

      // Load configuration
      const config = await loadConfiguration(options);
      
      // Apply command line overrides
      applyCommandLineOptions(config, options);

      // Display configuration summary
      if (options.verbose) {
        displayConfigurationSummary(config, options);
      }

      // Create validation instance
      const finalValidation = new FinalSystemValidation(config);

      // Execute validation with timeout
      const validationPromise = finalValidation.executeFinalValidation();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Validation timeout')), parseInt(options.timeout) * 1000);
      });

      console.log(`⏱️  Validation timeout set to ${options.timeout} seconds`);
      console.log('🔄 Executing validation suites...\n');

      const result = await Promise.race([validationPromise, timeoutPromise]);

      // Display results
      displayValidationResults(result, options);

      // Generate summary report
      if (!options.dryRun) {
        await generateSummaryReport(result, options);
      }

      // Determine exit code
      const exitCode = determineExitCode(result);
      
      console.log('\n' + '='.repeat(60));
      console.log(`✅ Final validation completed with status: ${result.overallStatus.toUpperCase()}`);
      console.log(`📊 Overall Score: ${result.overallScore}/100`);
      
      if (exitCode === 0) {
        console.log('🎉 System is ready for production deployment!');
      } else {
        console.log('⚠️  System requires attention before production deployment');
      }

      process.exit(exitCode);

    } catch (error) {
      console.error('\n❌ Final validation failed:');
      console.error(error instanceof Error ? error.message : 'Unknown error');
      
      if (options.verbose && error instanceof Error) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
      
      process.exit(1);
    }
  });

program
  .command('summary')
  .description('Get quick validation summary without running full validation')
  .option('-c, --config <path>', 'Path to validation configuration file')
  .option('--format <format>', 'Output format (json|table)', 'table')
  .action(async (options) => {
    try {
      const config = await loadConfiguration(options);
      const finalValidation = new FinalSystemValidation(config);
      const summary = await finalValidation.getValidationSummary();

      if (options.format === 'json') {
        console.log(JSON.stringify(summary, null, 2));
      } else {
        displaySummaryTable(summary);
      }

    } catch (error) {
      console.error('❌ Failed to get validation summary:');
      console.error(error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Generate default validation configuration file')
  .option('-o, --output <path>', 'Output path for configuration file', './validation-config.json')
  .option('--environment <env>', 'Target environment', 'production')
  .action(async (options) => {
    try {
      const config = createDefaultFinalValidationConfig();
      config.systemValidation.environment = options.environment as any;

      await fs.promises.writeFile(
        options.output,
        JSON.stringify(config, null, 2),
        'utf-8'
      );

      console.log(`✅ Default validation configuration generated: ${options.output}`);
      console.log('📝 Edit the configuration file to customize validation settings');

    } catch (error) {
      console.error('❌ Failed to generate configuration:');
      console.error(error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

/**
 * Load validation configuration
 */
async function loadConfiguration(options: any): Promise<FinalValidationConfig> {
  if (options.config) {
    try {
      const configContent = await fs.promises.readFile(options.config, 'utf-8');
      const config = JSON.parse(configContent);
      console.log(`📋 Loaded configuration from: ${options.config}`);
      return config;
    } catch (error) {
      console.error(`❌ Failed to load configuration from ${options.config}:`);
      throw error;
    }
  } else {
    console.log('📋 Using default validation configuration');
    return createDefaultFinalValidationConfig();
  }
}

/**
 * Apply command line options to configuration
 */
function applyCommandLineOptions(config: FinalValidationConfig, options: any): void {
  // Apply output directory
  config.reporting.outputDirectory = options.output;

  // Apply environment
  config.systemValidation.environment = options.environment;

  // Apply archival setting
  config.reporting.archival.enabled = !options.noArchive;

  // Apply formats
  if (options.format) {
    config.reporting.formats = options.format.split(',').map((f: string) => f.trim());
  }

  // Apply stakeholders
  if (options.stakeholders) {
    config.reporting.stakeholders = options.stakeholders.split(',').map((s: string) => s.trim());
  }

  console.log(`🎯 Target Environment: ${config.systemValidation.environment}`);
  console.log(`📁 Output Directory: ${config.reporting.outputDirectory}`);
  console.log(`📄 Report Formats: ${config.reporting.formats.join(', ')}`);
}

/**
 * Display configuration summary
 */
function displayConfigurationSummary(config: FinalValidationConfig, options: any): void {
  console.log('\n📋 Configuration Summary:');
  console.log('-'.repeat(40));
  console.log(`Environment: ${config.systemValidation.environment}`);
  console.log(`Output Directory: ${config.reporting.outputDirectory}`);
  console.log(`Report Formats: ${config.reporting.formats.join(', ')}`);
  console.log(`Archival Enabled: ${config.reporting.archival.enabled}`);
  console.log(`Documentation Generation: ${!options.noDocs}`);
  console.log(`Parallel Execution: ${options.parallel}`);
  console.log(`Timeout: ${options.timeout} seconds`);
  console.log(`Dry Run: ${options.dryRun || false}`);
  console.log();
}

/**
 * Display validation results
 */
function displayValidationResults(result: FinalValidationResult, options: any): void {
  console.log('\n📊 Validation Results Summary:');
  console.log('='.repeat(50));
  
  // Overall status
  const statusEmoji = getStatusEmoji(result.overallStatus);
  console.log(`${statusEmoji} Overall Status: ${result.overallStatus.toUpperCase()}`);
  console.log(`📈 Overall Score: ${result.overallScore}/100`);
  console.log(`🕐 Completed: ${result.timestamp.toISOString()}`);
  console.log();

  // Readiness assessment
  console.log('🎯 Readiness Assessment:');
  console.log('-'.repeat(30));
  for (const [category, assessment] of Object.entries(result.readinessAssessment)) {
    const categoryEmoji = getStatusEmoji(assessment.status);
    console.log(`${categoryEmoji} ${category.padEnd(12)}: ${assessment.score}/100 (${assessment.status})`);
    
    if (assessment.criticalIssues > 0) {
      console.log(`   ⚠️  Critical Issues: ${assessment.criticalIssues}`);
    }
    
    if (assessment.blockers.length > 0) {
      console.log(`   🚫 Blockers: ${assessment.blockers.length}`);
    }
  }
  console.log();

  // Recommendations
  if (result.recommendations.length > 0) {
    console.log(`💡 Recommendations: ${result.recommendations.length}`);
    const criticalRecs = result.recommendations.filter(r => r.priority === 'critical').length;
    const highRecs = result.recommendations.filter(r => r.priority === 'high').length;
    
    if (criticalRecs > 0) console.log(`   🔴 Critical: ${criticalRecs}`);
    if (highRecs > 0) console.log(`   🟡 High: ${highRecs}`);
    console.log();
  }

  // Action items
  if (result.actionItems.length > 0) {
    console.log(`📋 Action Items: ${result.actionItems.length}`);
    const blockingItems = result.actionItems.filter(a => a.blockingProduction).length;
    const criticalItems = result.actionItems.filter(a => a.priority === 'critical').length;
    
    if (blockingItems > 0) console.log(`   🚫 Blocking Production: ${blockingItems}`);
    if (criticalItems > 0) console.log(`   🔴 Critical: ${criticalItems}`);
    console.log();
  }

  // Stakeholder approvals
  console.log('✅ Stakeholder Approvals:');
  console.log('-'.repeat(25));
  for (const approval of result.approvals) {
    const approvalEmoji = getApprovalEmoji(approval.status);
    console.log(`${approvalEmoji} ${approval.stakeholder}: ${approval.status.toUpperCase()}`);
    
    if (approval.conditions.length > 0) {
      console.log(`   📝 Conditions: ${approval.conditions.length}`);
    }
  }
  console.log();

  // Documentation status
  console.log('📚 Documentation Status:');
  console.log('-'.repeat(23));
  for (const [docType, doc] of Object.entries(result.documentation)) {
    const docEmoji = doc.generated ? '✅' : '❌';
    console.log(`${docEmoji} ${docType}: ${doc.generated ? 'Generated' : 'Missing'}`);
  }

  if (options.verbose) {
    console.log('\n🔍 Detailed Results:');
    console.log(JSON.stringify(result, null, 2));
  }
}

/**
 * Display summary table
 */
function displaySummaryTable(summary: any): void {
  console.log('\n📊 Validation Summary:');
  console.log('='.repeat(40));
  console.log(`Status: ${summary.status.toUpperCase()}`);
  console.log(`Score: ${summary.score}/100`);
  console.log(`Ready for Production: ${summary.readyForProduction ? 'YES' : 'NO'}`);
  console.log(`Critical Issues: ${summary.criticalIssues}`);
  console.log(`Blockers: ${summary.blockers.length}`);
  
  if (summary.nextSteps.length > 0) {
    console.log('\n📋 Next Steps:');
    summary.nextSteps.forEach((step: string, index: number) => {
      console.log(`${index + 1}. ${step}`);
    });
  }
}

/**
 * Generate summary report
 */
async function generateSummaryReport(result: FinalValidationResult, options: any): Promise<void> {
  const summaryPath = path.join(options.output, 'validation-summary.md');
  
  const summary = `# Final System Validation Summary

**Report ID:** ${result.reportId}  
**Generated:** ${result.timestamp.toISOString()}  
**Overall Status:** ${result.overallStatus.toUpperCase()}  
**Overall Score:** ${result.overallScore}/100  

## Readiness Assessment

| Category | Score | Status | Critical Issues | Blockers |
|----------|-------|--------|-----------------|----------|
${Object.entries(result.readinessAssessment).map(([category, assessment]) => 
  `| ${category} | ${assessment.score}/100 | ${assessment.status} | ${assessment.criticalIssues} | ${assessment.blockers.length} |`
).join('\n')}

## Stakeholder Approvals

| Stakeholder | Status | Conditions |
|-------------|--------|------------|
${result.approvals.map(approval => 
  `| ${approval.stakeholder} | ${approval.status} | ${approval.conditions.length} |`
).join('\n')}

## Action Items Summary

- **Total Action Items:** ${result.actionItems.length}
- **Critical:** ${result.actionItems.filter(a => a.priority === 'critical').length}
- **Blocking Production:** ${result.actionItems.filter(a => a.blockingProduction).length}

## Recommendations Summary

- **Total Recommendations:** ${result.recommendations.length}
- **Critical:** ${result.recommendations.filter(r => r.priority === 'critical').length}
- **High Priority:** ${result.recommendations.filter(r => r.priority === 'high').length}

## Production Readiness

${result.overallStatus === 'production-ready' 
  ? '✅ **System is READY for production deployment**' 
  : '⚠️ **System requires attention before production deployment**'
}

---
*Generated by Final System Validation Framework*
`;

  await fs.promises.mkdir(path.dirname(summaryPath), { recursive: true });
  await fs.promises.writeFile(summaryPath, summary, 'utf-8');
  
  console.log(`📄 Summary report generated: ${summaryPath}`);
}

/**
 * Determine exit code based on validation results
 */
function determineExitCode(result: FinalValidationResult): number {
  // Exit with 0 if production ready or ready
  if (result.overallStatus === 'production-ready' || result.overallStatus === 'ready') {
    return 0;
  }

  // Exit with 1 if partially ready (warnings)
  if (result.overallStatus === 'partially-ready') {
    return 1;
  }

  // Exit with 2 if not ready (errors)
  return 2;
}

/**
 * Get status emoji
 */
function getStatusEmoji(status: string): string {
  switch (status) {
    case 'production-ready':
    case 'ready':
    case 'approved':
      return '✅';
    case 'partially-ready':
    case 'conditional':
      return '⚠️';
    case 'not-ready':
    case 'rejected':
      return '❌';
    case 'pending':
      return '⏳';
    default:
      return '❓';
  }
}

/**
 * Get approval emoji
 */
function getApprovalEmoji(status: string): string {
  switch (status) {
    case 'approved':
      return '✅';
    case 'conditional':
      return '⚠️';
    case 'rejected':
      return '❌';
    case 'pending':
      return '⏳';
    default:
      return '❓';
  }
}

// Parse command line arguments
program.parse();