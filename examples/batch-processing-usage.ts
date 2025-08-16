/**
 * Batch Processing Usage Example
 * 
 * Demonstrates how to use the BatchProcessor for processing multiple projects
 */

import { BatchProcessor } from '../src/cli/lib/batch-processor';
import { ComponentOrchestrator } from '../src/cli/lib/component-orchestrator';
import { Logger } from '../src/cli/lib/logger';
import { ErrorHandler } from '../src/cli/lib/error-handler';
import { BatchProcessingOptions, CLIOptions } from '../src/cli/lib/types';

// Example usage of BatchProcessor
async function demonstrateBatchProcessing() {
  // Create dependencies
  const logger = new Logger();
  const errorHandler = new ErrorHandler();
  const orchestrator = new ComponentOrchestrator(logger, errorHandler);
  
  // Create batch processor
  const batchProcessor = new BatchProcessor(
    orchestrator,
    logger,
    errorHandler,
    {
      maxConcurrency: 4,
      projectDetectionTimeout: 30000,
      processingTimeout: 120000,
      enableProgressReporting: true,
      enableDetailedLogging: true
    }
  );

  // Configure batch processing options
  const batchOptions: BatchProcessingOptions = {
    directories: ['./projects', './examples'],
    recursive: true,
    parallel: true,
    maxConcurrency: 2,
    continueOnError: true,
    projectDetectionPattern: undefined, // Process all projects
    excludePatterns: ['node_modules', 'test*', '.git']
  };

  // Configure CLI options for individual project processing
  const cliOptions: CLIOptions = {
    command: 'generate',
    workflowType: ['ci', 'cd'],
    dryRun: false,
    interactive: false,
    verbose: true,
    debug: false,
    quiet: false
  };

  // Progress callback to track processing
  const progressCallback = (progress: any) => {
    console.log(`Progress: ${progress.processedProjects}/${progress.totalProjects} projects (${progress.phase})`);
    if (progress.currentProject) {
      console.log(`  Currently processing: ${progress.currentProject}`);
    }
  };

  try {
    console.log('Starting batch processing...');
    
    // Execute batch processing
    const result = await batchProcessor.processBatch(
      batchOptions,
      cliOptions,
      progressCallback
    );

    // Display results
    console.log('\nBatch Processing Results:');
    console.log(`Success: ${result.success}`);
    console.log(`Total Projects: ${result.totalProjects}`);
    console.log(`Successful: ${result.successfulProjects}`);
    console.log(`Failed: ${result.failedProjects}`);
    console.log(`Skipped: ${result.skippedProjects}`);
    console.log(`Total Execution Time: ${result.totalExecutionTime}ms`);

    // Display summary statistics
    console.log('\nSummary Statistics:');
    console.log(`Files Generated: ${result.summary.totalFilesGenerated}`);
    console.log(`Workflows Created: ${result.summary.totalWorkflowsCreated}`);
    console.log(`Average Execution Time: ${result.summary.averageExecutionTime}ms`);
    
    // Display detected frameworks
    console.log('\nFrameworks Detected:');
    Object.entries(result.summary.frameworksDetected).forEach(([framework, count]) => {
      console.log(`  ${framework}: ${count} projects`);
    });

    // Display errors by category
    if (Object.keys(result.summary.errorsByCategory).length > 0) {
      console.log('\nErrors by Category:');
      Object.entries(result.summary.errorsByCategory).forEach(([category, count]) => {
        console.log(`  ${category}: ${count} errors`);
      });
    }

    // Display individual project results
    console.log('\nIndividual Project Results:');
    result.projectResults.forEach((projectResult, index) => {
      console.log(`${index + 1}. ${projectResult.project.name} (${projectResult.project.path})`);
      console.log(`   Success: ${projectResult.success}`);
      console.log(`   Execution Time: ${projectResult.executionTime}ms`);
      console.log(`   Complexity: ${projectResult.project.estimatedComplexity}`);
      
      if (projectResult.success && projectResult.result) {
        console.log(`   Files Generated: ${projectResult.result.generatedFiles.length}`);
        console.log(`   Workflows Created: ${projectResult.result.summary.workflowsCreated}`);
      }
      
      if (projectResult.error) {
        console.log(`   Error: ${projectResult.error.message}`);
      }
      
      if (projectResult.skipped) {
        console.log(`   Skipped: ${projectResult.skipReason}`);
      }
      
      console.log('');
    });

  } catch (error) {
    console.error('Batch processing failed:', error);
  }
}

// Sequential processing example
async function demonstrateSequentialProcessing() {
  console.log('\n=== Sequential Processing Example ===');
  
  const logger = new Logger();
  const errorHandler = new ErrorHandler();
  const orchestrator = new ComponentOrchestrator(logger, errorHandler);
  const batchProcessor = new BatchProcessor(orchestrator, logger, errorHandler);

  const batchOptions: BatchProcessingOptions = {
    directories: ['./examples'],
    recursive: false,
    parallel: false, // Sequential processing
    continueOnError: true
  };

  const cliOptions: CLIOptions = {
    command: 'generate',
    workflowType: ['ci'],
    dryRun: true, // Dry run to avoid creating files
    interactive: false,
    verbose: false,
    debug: false,
    quiet: false
  };

  const result = await batchProcessor.processBatch(batchOptions, cliOptions);
  console.log(`Sequential processing completed: ${result.successfulProjects}/${result.totalProjects} successful`);
}

// Parallel processing example
async function demonstrateParallelProcessing() {
  console.log('\n=== Parallel Processing Example ===');
  
  const logger = new Logger();
  const errorHandler = new ErrorHandler();
  const orchestrator = new ComponentOrchestrator(logger, errorHandler);
  const batchProcessor = new BatchProcessor(orchestrator, logger, errorHandler);

  const batchOptions: BatchProcessingOptions = {
    directories: ['./examples', './src'],
    recursive: true,
    parallel: true, // Parallel processing
    maxConcurrency: 3,
    continueOnError: true,
    excludePatterns: ['node_modules', '.git', 'test*']
  };

  const cliOptions: CLIOptions = {
    command: 'generate',
    workflowType: ['ci', 'cd'],
    dryRun: true,
    interactive: false,
    verbose: false,
    debug: false,
    quiet: false
  };

  const startTime = Date.now();
  const result = await batchProcessor.processBatch(batchOptions, cliOptions);
  const endTime = Date.now();
  
  console.log(`Parallel processing completed in ${endTime - startTime}ms`);
  console.log(`Results: ${result.successfulProjects}/${result.totalProjects} successful`);
}

// Error handling example
async function demonstrateErrorHandling() {
  console.log('\n=== Error Handling Example ===');
  
  const logger = new Logger();
  const errorHandler = new ErrorHandler();
  const orchestrator = new ComponentOrchestrator(logger, errorHandler);
  const batchProcessor = new BatchProcessor(orchestrator, logger, errorHandler);

  // Try to process non-existent directories
  const batchOptions: BatchProcessingOptions = {
    directories: ['./nonexistent1', './nonexistent2'],
    recursive: false,
    parallel: false,
    continueOnError: true
  };

  const cliOptions: CLIOptions = {
    command: 'generate',
    dryRun: true,
    interactive: false,
    verbose: false,
    debug: false,
    quiet: false
  };

  const result = await batchProcessor.processBatch(batchOptions, cliOptions);
  console.log(`Error handling test: ${result.success ? 'Handled gracefully' : 'Failed'}`);
  console.log(`Warnings: ${result.warnings.length}`);
  console.log(`Errors: ${result.errors.length}`);
}

// Run examples
async function runExamples() {
  console.log('Batch Processing Examples\n');
  
  try {
    await demonstrateBatchProcessing();
    await demonstrateSequentialProcessing();
    await demonstrateParallelProcessing();
    await demonstrateErrorHandling();
    
    console.log('\nAll examples completed successfully!');
  } catch (error) {
    console.error('Example execution failed:', error);
  }
}

// Export for use in other files
export {
  demonstrateBatchProcessing,
  demonstrateSequentialProcessing,
  demonstrateParallelProcessing,
  demonstrateErrorHandling
};

// Run if called directly
if (require.main === module) {
  runExamples();
}