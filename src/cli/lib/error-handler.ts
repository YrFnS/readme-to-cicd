import chalk from 'chalk';
import { CLIError, CLIResult, ErrorCategory } from './types';
import { Logger } from './logger';

/**
 * Comprehensive Error Handler for CLI Tool
 * 
 * Implements categorized error handling with user-friendly messages
 * and actionable suggestions as specified in the design document.
 */
export class ErrorHandler {
  constructor(private readonly logger: Logger) {}

  /**
   * Handle CLI execution errors and return appropriate result
   */
  handleCLIError(error: Error): CLIResult {
    const cliError = this.categorizeError(error);
    this.logger.error('CLI error occurred', { error: cliError });

    // Display user-friendly error message
    this.displayError(cliError);

    return {
      success: false,
      generatedFiles: [],
      errors: [cliError],
      warnings: [],
      summary: {
        totalTime: 0,
        filesGenerated: 0,
        workflowsCreated: 0,
        frameworksDetected: [],
        optimizationsApplied: 0,
        executionTime: 0,
        filesProcessed: 0,
        workflowsGenerated: 0
      }
    };
  }

  /**
   * Handle fatal errors that should terminate the application
   */
  handleFatalError(error: Error): void {
    const cliError = this.categorizeError(error);
    this.logger.error('Fatal error occurred', { error: cliError });
    
    console.error(chalk.red.bold('✗ Fatal Error:'), cliError.message);
    
    if (cliError.suggestions.length > 0) {
      console.error(chalk.yellow('\nSuggestions:'));
      cliError.suggestions.forEach(suggestion => {
        console.error(chalk.yellow(`  • ${suggestion}`));
      });
    }
  }

  /**
   * Categorize errors into appropriate types with suggestions
   */
  private categorizeError(error: Error): CLIError {
    // Default error categorization - will be expanded in later tasks
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      category: 'processing',
      severity: 'error',
      suggestions: [
        'Try running with --debug flag for more information',
        'Check that all required dependencies are installed',
        'Verify your README file is accessible and properly formatted'
      ],
      context: {
        stack: error.stack,
        name: error.name
      }
    };
  }

  /**
   * Display user-friendly error messages with styling
   */
  private displayError(error: CLIError): void {
    console.error(chalk.red.bold('✗ Error:'), error.message);
    
    if (error.suggestions.length > 0) {
      console.error(chalk.yellow('\nSuggestions:'));
      error.suggestions.forEach(suggestion => {
        console.error(chalk.yellow(`  • ${suggestion}`));
      });
    }

    if (error.context && process.env.DEBUG) {
      console.error(chalk.gray('\nDebug Information:'));
      console.error(chalk.gray(JSON.stringify(error.context, null, 2)));
    }
  }
}