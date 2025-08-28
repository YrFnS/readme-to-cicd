/**
 * Validation Runner
 * 
 * Command-line interface for running comprehensive system validation
 * including health monitoring, end-to-end testing, and performance benchmarks.
 */

import { logger } from '../shared/logging/central-logger';
import { 
  ComprehensiveSystemValidator, 
  defaultComprehensiveValidationConfig,
  ComprehensiveValidationResult 
} from './comprehensive-system-validator';

/**
 * Validation runner options
 */
export interface ValidationRunnerOptions {
  healthMonitoring?: boolean;
  endToEndTesting?: boolean;
  performanceBenchmarks?: boolean;
  continuous?: boolean;
  outputFormat?: 'json' | 'console' | 'both';
  outputFile?: string;
}

/**
 * Validation Runner
 */
export class ValidationRunner {
  private validator: ComprehensiveSystemValidator;
  private options: ValidationRunnerOptions;

  constructor(options: ValidationRunnerOptions = {}) {
    this.options = {
      healthMonitoring: true,
      endToEndTesting: true,
      performanceBenchmarks: true,
      continuous: false,
      outputFormat: 'both',
      ...options
    };

    // Configure validation based on options
    const config = {
      ...defaultComprehensiveValidationConfig,
      healthMonitoring: {
        ...defaultComprehensiveValidationConfig.healthMonitoring,
        enabled: this.options.healthMonitoring ?? true,
        continuous: this.options.continuous ?? false
      },
      endToEndTesting: {
        ...defaultComprehensiveValidationConfig.endToEndTesting,
        enabled: this.options.endToEndTesting ?? true
      },
      performanceBenchmarks: {
        ...defaultComprehensiveValidationConfig.performanceBenchmarks,
        enabled: this.options.performanceBenchmarks ?? true
      }
    };

    this.validator = new ComprehensiveSystemValidator(config);
  }

  /**
   * Run comprehensive validation
   */
  public async run(): Promise<ComprehensiveValidationResult> {
    logger.info('Starting validation runner', this.options);

    try {
      const result = await this.validator.executeComprehensiveValidation();
      
      // Output results
      await this.outputResults(result);
      
      // Log summary
      this.logSummary(result);
      
      return result;

    } catch (error) {
      logger.error('Validation runner failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      // Cleanup
      this.validator.stopMonitoring();
    }
  }

  /**
   * Check system health only
   */
  public async checkHealth(): Promise<{ healthy: boolean; score: number }> {
    logger.info('Checking system health');
    
    try {
      const healthStatus = await this.validator.getSystemHealthStatus();
      
      logger.info('System health check completed', healthStatus);
      
      return healthStatus;

    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return { healthy: false, score: 0 };
    }
  }

  /**
   * Output validation results
   */
  private async outputResults(result: ComprehensiveValidationResult): Promise<void> {
    if (this.options.outputFormat === 'console' || this.options.outputFormat === 'both') {
      this.outputToConsole(result);
    }

    if (this.options.outputFormat === 'json' || this.options.outputFormat === 'both') {
      await this.outputToJson(result);
    }
  }

  /**
   * Output results to console
   */
  private outputToConsole(result: ComprehensiveValidationResult): void {
    console.log('\n' + '='.repeat(80));
    console.log('COMPREHENSIVE SYSTEM VALIDATION REPORT');
    console.log('='.repeat(80));
    
    console.log(`\nTimestamp: ${result.timestamp.toISOString()}`);
    console.log(`Overall Score: ${result.overallScore.toFixed(1)}/100`);
    console.log(`Readiness Level: ${result.readinessLevel.toUpperCase()}`);
    
    // Health Report Summary
    console.log('\n' + '-'.repeat(40));
    console.log('SYSTEM HEALTH');
    console.log('-'.repeat(40));
    console.log(`Health Score: ${result.healthReport.overallScore.toFixed(1)}/100`);
    console.log(`Health Status: ${result.healthReport.status.toUpperCase()}`);
    console.log(`Components Monitored: ${result.healthReport.components.length}`);
    console.log(`Critical Issues: ${result.healthReport.criticalIssues.length}`);
    
    // Component Health Details
    for (const component of result.healthScoreBreakdown.componentScores) {
      const statusIcon = component.status === 'excellent' ? '🟢' :
                        component.status === 'good' ? '✅' :
                        component.status === 'fair' ? '🟡' :
                        component.status === 'poor' ? '🟠' : '🔴';
      console.log(`  ${statusIcon} ${component.component}: ${component.score.toFixed(1)}/100 (${component.status})`);
    }

    // Health Score Breakdown
    if (result.healthScoreBreakdown.categoryScores.length > 0) {
      console.log('\nHealth Categories:');
      for (const category of result.healthScoreBreakdown.categoryScores) {
        console.log(`  • ${category.category}: ${category.score.toFixed(1)}/100 (weight: ${(category.weight * 100).toFixed(0)}%)`);
      }
    }

    // Penalties and Bonuses
    if (result.healthScoreBreakdown.penalties.length > 0) {
      console.log('\nPenalties Applied:');
      for (const penalty of result.healthScoreBreakdown.penalties.slice(0, 3)) { // Show top 3
        console.log(`  🔴 -${penalty.penalty} points: ${penalty.reason}`);
      }
    }

    if (result.healthScoreBreakdown.bonuses.length > 0) {
      console.log('\nBonuses Applied:');
      for (const bonus of result.healthScoreBreakdown.bonuses) {
        console.log(`  🟢 +${bonus.bonus} points: ${bonus.reason}`);
      }
    }

    // End-to-End Test Results
    if (result.endToEndResults.length > 0) {
      console.log('\n' + '-'.repeat(40));
      console.log('END-TO-END TESTS');
      console.log('-'.repeat(40));
      
      const passedTests = result.endToEndResults.filter(r => r.passed).length;
      console.log(`Tests Passed: ${passedTests}/${result.endToEndResults.length}`);
      console.log(`Average Score: ${(result.endToEndResults.reduce((sum, r) => sum + r.score, 0) / result.endToEndResults.length).toFixed(1)}/100`);
      
      for (const test of result.endToEndResults) {
        const statusIcon = test.passed ? '✅' : '❌';
        console.log(`  ${statusIcon} ${test.testId}: ${test.score.toFixed(1)}/100 (${test.duration}ms)`);
      }
    }

    // Performance Benchmarks
    if (result.performanceBenchmarks.length > 0) {
      console.log('\n' + '-'.repeat(40));
      console.log('PERFORMANCE BENCHMARKS');
      console.log('-'.repeat(40));
      
      const passedBenchmarks = result.performanceBenchmarks.filter(b => b.passed).length;
      console.log(`Benchmarks Passed: ${passedBenchmarks}/${result.performanceBenchmarks.length}`);
      
      for (const benchmark of result.performanceBenchmarks) {
        const statusIcon = benchmark.passed ? '✅' : '❌';
        const unit = benchmark.metric === 'responseTime' ? 'ms' : 
                    benchmark.metric === 'memoryUsage' ? 'MB' : '';
        console.log(`  ${statusIcon} ${benchmark.component}.${benchmark.metric}: ${benchmark.value.toFixed(1)}${unit} (threshold: ${benchmark.threshold}${unit})`);
      }
    }

    // System Readiness
    console.log('\n' + '-'.repeat(40));
    console.log('SYSTEM READINESS');
    console.log('-'.repeat(40));
    console.log(`Ready: ${result.systemReadiness.ready ? 'YES' : 'NO'}`);
    console.log(`Readiness Score: ${result.systemReadiness.score.toFixed(1)}/100`);
    
    if (result.systemReadiness.blockers.length > 0) {
      console.log('\nBlockers:');
      for (const blocker of result.systemReadiness.blockers) {
        console.log(`  ❌ ${blocker}`);
      }
    }
    
    if (result.systemReadiness.missingRequirements.length > 0) {
      console.log('\nMissing Requirements:');
      for (const requirement of result.systemReadiness.missingRequirements) {
        console.log(`  ⚠️  ${requirement}`);
      }
    }

    // Recommendations
    if (result.recommendations.length > 0) {
      console.log('\n' + '-'.repeat(40));
      console.log('RECOMMENDATIONS');
      console.log('-'.repeat(40));
      
      for (const rec of result.recommendations) {
        const priorityIcon = rec.priority === 'critical' ? '🔴' :
                           rec.priority === 'high' ? '🟠' :
                           rec.priority === 'medium' ? '🟡' : '🟢';
        console.log(`  ${priorityIcon} [${rec.priority.toUpperCase()}] ${rec.title}`);
        console.log(`     ${rec.description}`);
        console.log(`     Impact: ${rec.impact}`);
        console.log(`     Effort: ${rec.effort}, Timeline: ${rec.timeline}`);
        console.log('');
      }
    }

    // Action Items
    if (result.actionItems.length > 0) {
      console.log('\n' + '-'.repeat(40));
      console.log('ACTION ITEMS');
      console.log('-'.repeat(40));
      
      for (const item of result.actionItems) {
        const priorityIcon = item.priority === 'critical' ? '🔴' :
                           item.priority === 'high' ? '🟠' :
                           item.priority === 'medium' ? '🟡' : '🟢';
        console.log(`  ${priorityIcon} [${item.priority.toUpperCase()}] ${item.title}`);
        console.log(`     ${item.description}`);
        console.log(`     Category: ${item.category}, Effort: ${item.estimatedEffort}`);
        if (item.dueDate) {
          console.log(`     Due: ${item.dueDate.toLocaleDateString()}`);
        }
        console.log('');
      }
    }

    console.log('='.repeat(80));
  }

  /**
   * Output results to JSON file
   */
  private async outputToJson(result: ComprehensiveValidationResult): Promise<void> {
    const fs = await import('fs');
    const path = await import('path');
    
    const outputFile = this.options.outputFile || 
      `validation-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    
    const outputPath = path.resolve(outputFile);
    
    try {
      await fs.promises.writeFile(outputPath, JSON.stringify(result, null, 2), 'utf8');
      logger.info('Validation report saved to file', { outputPath });
    } catch (error) {
      logger.error('Failed to save validation report', {
        outputPath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Log validation summary
   */
  private logSummary(result: ComprehensiveValidationResult): void {
    const summary = {
      overallScore: result.overallScore,
      readinessLevel: result.readinessLevel,
      systemReady: result.systemReadiness.ready,
      healthScore: result.healthReport.overallScore,
      healthyComponents: result.healthReport.components.filter(c => c.status === 'healthy').length,
      totalComponents: result.healthReport.components.length,
      criticalIssues: result.healthReport.criticalIssues.length,
      endToEndTestsPassed: result.endToEndResults.filter(r => r.passed).length,
      endToEndTestsTotal: result.endToEndResults.length,
      performanceBenchmarksPassed: result.performanceBenchmarks.filter(b => b.passed).length,
      performanceBenchmarksTotal: result.performanceBenchmarks.length,
      recommendations: result.recommendations.length,
      actionItems: result.actionItems.length,
      blockers: result.systemReadiness.blockers.length
    };

    logger.info('Validation summary', summary);
  }
}

/**
 * CLI entry point for validation runner
 */
export async function runValidation(options: ValidationRunnerOptions = {}): Promise<ComprehensiveValidationResult> {
  const runner = new ValidationRunner(options);
  return await runner.run();
}

/**
 * CLI entry point for health check
 */
export async function checkSystemHealth(): Promise<{ healthy: boolean; score: number }> {
  const runner = new ValidationRunner({ 
    healthMonitoring: true, 
    endToEndTesting: false, 
    performanceBenchmarks: false 
  });
  return await runner.checkHealth();
}