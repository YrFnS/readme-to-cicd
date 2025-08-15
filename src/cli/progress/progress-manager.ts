/**
 * Progress Management Implementation
 * 
 * Provides terminal progress indicators, step-by-step logging, and execution summaries
 * using ora for spinners and chalk for colored output.
 * Implements requirements 3.1, 3.2, 3.3, 3.4, 3.5 from the CLI tool specification.
 */

import ora, { Ora } from 'ora';
import chalk from 'chalk';
import { ExecutionSummary, CLIError } from '../lib/types';

export interface ProgressStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  details?: string;
  error?: CLIError;
}

export interface ProgressOptions {
  verbose: boolean;
  debug: boolean;
  quiet: boolean;
  showTimestamps: boolean;
  showDuration: boolean;
}

export class ProgressManager {
  private spinner: Ora | null = null;
  private steps: Map<string, ProgressStep> = new Map();
  private currentStep: string | null = null;
  private options: ProgressOptions;
  private startTime: Date;
  private totalSteps: number = 0;
  private completedSteps: number = 0;

  constructor(options: Partial<ProgressOptions> = {}) {
    this.options = {
      verbose: false,
      debug: false,
      quiet: false,
      showTimestamps: true,
      showDuration: true,
      ...options
    };
    this.startTime = new Date();
  }

  /**
   * Initialize progress tracking with total steps
   * Implements requirement 3.1: Progress indicators for long-running operations
   */
  initialize(totalSteps: number, title: string = 'Processing'): void {
    this.totalSteps = totalSteps;
    this.completedSteps = 0;
    
    if (!this.options.quiet) {
      console.log(chalk.blue(`\n🚀 ${title}`));
      console.log(chalk.gray('─'.repeat(50)));
      
      if (this.options.verbose) {
        console.log(chalk.gray(`Total steps: ${totalSteps}`));
        console.log(chalk.gray(`Started at: ${this.formatTimestamp(this.startTime)}`));
      }
    }
  }

  /**
   * Start a new progress step with spinner
   * Implements requirement 3.2: Step-by-step progress logging with success/error states
   */
  startStep(id: string, name: string, description: string): void {
    // Complete previous step if exists
    if (this.currentStep) {
      this.completeStep(this.currentStep, 'success');
    }

    const step: ProgressStep = {
      id,
      name,
      description,
      status: 'running',
      startTime: new Date()
    };

    this.steps.set(id, step);
    this.currentStep = id;

    if (!this.options.quiet) {
      // Show step progress
      const progress = this.totalSteps > 0 ? `[${this.completedSteps + 1}/${this.totalSteps}]` : '';
      const timestamp = this.options.showTimestamps ? chalk.gray(`[${this.formatTimestamp(step.startTime!)}]`) : '';
      
      console.log(`${timestamp} ${progress} ${chalk.cyan('●')} ${name}`);
      
      if (this.options.verbose) {
        console.log(`   ${chalk.gray(description)}`);
      }

      // Start spinner for long-running operations
      this.spinner = ora({
        text: description,
        color: 'cyan',
        indent: 2
      }).start();
    }

    if (this.options.debug) {
      console.log(chalk.gray(`[DEBUG] Started step: ${id}`));
    }
  }

  /**
   * Update current step progress
   */
  updateStep(message: string, details?: string): void {
    if (!this.currentStep) return;

    const step = this.steps.get(this.currentStep);
    if (step) {
      if (details !== undefined) {
        step.details = details;
      }
      
      if (this.spinner && !this.options.quiet) {
        this.spinner.text = message;
      }
      
      if (this.options.verbose && details) {
        console.log(`   ${chalk.gray('→')} ${details}`);
      }
    }
  }

  /**
   * Complete current step with status
   * Implements requirement 3.2: Step-by-step progress logging with success/error states
   */
  completeStep(id: string, status: 'success' | 'error' | 'skipped', error?: CLIError): void {
    const step = this.steps.get(id);
    if (!step) return;

    step.status = status;
    step.endTime = new Date();
    step.duration = step.endTime.getTime() - (step.startTime?.getTime() || 0);
    
    if (error) {
      step.error = error;
    }

    // Stop spinner
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }

    if (!this.options.quiet) {
      const duration = this.options.showDuration ? chalk.gray(`(${this.formatDuration(step.duration)})`) : '';
      const timestamp = this.options.showTimestamps ? chalk.gray(`[${this.formatTimestamp(step.endTime)}]`) : '';
      
      switch (status) {
        case 'success':
          console.log(`${timestamp} ${chalk.green('✓')} ${step.name} ${duration}`);
          this.completedSteps++;
          break;
        case 'error':
          console.log(`${timestamp} ${chalk.red('✗')} ${step.name} ${duration}`);
          if (error && this.options.verbose) {
            console.log(`   ${chalk.red('Error:')} ${error.message}`);
            if (error.suggestions.length > 0) {
              console.log(`   ${chalk.yellow('Suggestions:')}`);
              error.suggestions.forEach(suggestion => {
                console.log(`   • ${suggestion}`);
              });
            }
          }
          break;
        case 'skipped':
          console.log(`${timestamp} ${chalk.yellow('○')} ${step.name} ${chalk.gray('(skipped)')} ${duration}`);
          break;
      }
    }

    if (this.options.debug) {
      console.log(chalk.gray(`[DEBUG] Completed step: ${id} (${status})`));
    }

    // Clear current step if it matches
    if (this.currentStep === id) {
      this.currentStep = null;
    }
  }

  /**
   * Log informational message
   * Implements requirement 3.3: Summary display with generated files and execution statistics
   */
  info(message: string, details?: string): void {
    if (this.options.quiet) return;

    const timestamp = this.options.showTimestamps ? chalk.gray(`[${this.formatTimestamp(new Date())}]`) : '';
    console.log(`${timestamp} ${chalk.blue('ℹ')} ${message}`);
    
    if (details && this.options.verbose) {
      console.log(`   ${chalk.gray(details)}`);
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, details?: string): void {
    if (this.options.quiet) return;

    const timestamp = this.options.showTimestamps ? chalk.gray(`[${this.formatTimestamp(new Date())}]`) : '';
    console.log(`${timestamp} ${chalk.yellow('⚠')} ${message}`);
    
    if (details && this.options.verbose) {
      console.log(`   ${chalk.gray(details)}`);
    }
  }

  /**
   * Log error message
   */
  error(message: string, error?: CLIError): void {
    const timestamp = this.options.showTimestamps ? chalk.gray(`[${this.formatTimestamp(new Date())}]`) : '';
    console.log(`${timestamp} ${chalk.red('✗')} ${message}`);
    
    if (error) {
      if (this.options.verbose) {
        console.log(`   ${chalk.red('Details:')} ${error.message}`);
        if (error.context) {
          console.log(`   ${chalk.gray('Context:')} ${JSON.stringify(error.context, null, 2)}`);
        }
      }
      
      if (error.suggestions.length > 0) {
        console.log(`   ${chalk.yellow('Suggestions:')}`);
        error.suggestions.forEach(suggestion => {
          console.log(`   • ${suggestion}`);
        });
      }
    }
  }

  /**
   * Log debug message
   * Implements requirement 3.4: Verbose and debug output modes with detailed information
   */
  debug(message: string, data?: any): void {
    if (!this.options.debug) return;

    const timestamp = this.formatTimestamp(new Date());
    console.log(chalk.gray(`[DEBUG ${timestamp}] ${message}`));
    
    if (data) {
      console.log(chalk.gray(JSON.stringify(data, null, 2)));
    }
  }

  /**
   * Display execution summary
   * Implements requirement 3.5: Summary display with generated files and execution statistics
   */
  displaySummary(summary: ExecutionSummary, generatedFiles: string[] = []): void {
    if (this.options.quiet) return;

    const endTime = new Date();
    const totalDuration = endTime.getTime() - this.startTime.getTime();
    
    console.log(chalk.blue('\n📊 Execution Summary'));
    console.log(chalk.gray('─'.repeat(50)));
    
    // Execution statistics
    console.log(`${chalk.green('✓')} Total time: ${chalk.bold(this.formatDuration(totalDuration))}`);
    console.log(`${chalk.green('✓')} Steps completed: ${chalk.bold(`${this.completedSteps}/${this.totalSteps}`)}`);
    
    if (summary.filesGenerated > 0) {
      console.log(`${chalk.green('✓')} Files generated: ${chalk.bold(summary.filesGenerated.toString())}`);
    }
    
    if (summary.workflowsCreated > 0) {
      console.log(`${chalk.green('✓')} Workflows created: ${chalk.bold(summary.workflowsCreated.toString())}`);
    }
    
    if (summary.frameworksDetected.length > 0) {
      console.log(`${chalk.green('✓')} Frameworks detected: ${chalk.bold(summary.frameworksDetected.join(', '))}`);
    }
    
    if (summary.optimizationsApplied > 0) {
      console.log(`${chalk.green('✓')} Optimizations applied: ${chalk.bold(summary.optimizationsApplied.toString())}`);
    }

    // Generated files
    if (generatedFiles.length > 0) {
      console.log(`\n${chalk.blue('📁 Generated Files:')}`);
      generatedFiles.forEach(file => {
        console.log(`   • ${chalk.cyan(file)}`);
      });
    }

    // Error summary
    const errorSteps = Array.from(this.steps.values()).filter(step => step.status === 'error');
    if (errorSteps.length > 0) {
      console.log(`\n${chalk.red('❌ Errors:')}`);
      errorSteps.forEach(step => {
        console.log(`   • ${step.name}: ${step.error?.message || 'Unknown error'}`);
      });
    }

    // Warning summary
    const skippedSteps = Array.from(this.steps.values()).filter(step => step.status === 'skipped');
    if (skippedSteps.length > 0) {
      console.log(`\n${chalk.yellow('⚠ Skipped Steps:')}`);
      skippedSteps.forEach(step => {
        console.log(`   • ${step.name}`);
      });
    }

    // Performance breakdown (verbose mode)
    if (this.options.verbose) {
      console.log(`\n${chalk.blue('⏱ Performance Breakdown:')}`);
      Array.from(this.steps.values())
        .filter(step => step.duration)
        .sort((a, b) => (b.duration || 0) - (a.duration || 0))
        .forEach(step => {
          const percentage = ((step.duration || 0) / totalDuration * 100).toFixed(1);
          console.log(`   • ${step.name}: ${this.formatDuration(step.duration!)} (${percentage}%)`);
        });
    }

    console.log(chalk.gray('─'.repeat(50)));
  }

  /**
   * Get current progress statistics
   */
  getProgress(): { completed: number; total: number; percentage: number } {
    const percentage = this.totalSteps > 0 ? (this.completedSteps / this.totalSteps) * 100 : 0;
    return {
      completed: this.completedSteps,
      total: this.totalSteps,
      percentage: Math.round(percentage)
    };
  }

  /**
   * Get all steps with their status
   */
  getSteps(): ProgressStep[] {
    return Array.from(this.steps.values());
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  /**
   * Format timestamp for display
   */
  private formatTimestamp(date: Date): string {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    }
    
    const seconds = Math.floor(milliseconds / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
}