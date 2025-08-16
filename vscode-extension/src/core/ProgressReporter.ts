/**
 * Progress Reporter
 * 
 * Handles progress reporting for CLI operations in the VS Code extension.
 * Provides visual feedback through progress bars, status bar, and notifications.
 */

import * as vscode from 'vscode';
import { CLIProgressReport } from './types';

export interface ProgressReporterOptions {
  showInStatusBar?: boolean;
  showNotifications?: boolean;
  enableDetailedLogging?: boolean;
  progressLocation?: vscode.ProgressLocation;
}

export class ProgressReporter {
  private readonly logger: vscode.LogOutputChannel;
  private readonly options: ProgressReporterOptions;
  private statusBarItem?: vscode.StatusBarItem;
  private currentProgress?: vscode.Progress<{ message?: string; increment?: number }>;
  private progressResolve?: (value: void) => void;

  constructor(options: ProgressReporterOptions = {}) {
    this.options = {
      showInStatusBar: true,
      showNotifications: true,
      enableDetailedLogging: true,
      progressLocation: vscode.ProgressLocation.Notification,
      ...options
    };

    this.logger = vscode.window.createOutputChannel('README to CI/CD - Progress Reporter', { log: true });

    if (this.options.showInStatusBar) {
      this.initializeStatusBar();
    }
  }

  /**
   * Start progress reporting for a CLI operation
   */
  async startProgress(
    title: string,
    cancellable: boolean = true
  ): Promise<(progress: CLIProgressReport) => void> {
    this.logger.info(`Starting progress reporting: ${title}`);

    return new Promise((resolve) => {
      vscode.window.withProgress(
        {
          location: this.options.progressLocation!,
          title,
          cancellable
        },
        async (progress, token) => {
          this.currentProgress = progress;

          // Create progress callback
          const progressCallback = (report: CLIProgressReport) => {
            this.handleProgressUpdate(report, progress);
          };

          // Resolve with the callback
          resolve(progressCallback);

          // Wait for completion
          return new Promise<void>((progressResolve) => {
            this.progressResolve = progressResolve;

            // Handle cancellation
            if (cancellable) {
              token.onCancellationRequested(() => {
                this.logger.info('Progress cancelled by user');
                this.completeProgress();
              });
            }
          });
        }
      );
    });
  }

  /**
   * Handle progress update
   */
  private handleProgressUpdate(
    report: CLIProgressReport,
    progress: vscode.Progress<{ message?: string; increment?: number }>
  ): void {
    this.logger.debug('Progress update received', {
      stage: report.stage,
      progress: report.progress,
      message: report.message
    });

    // Update VS Code progress
    progress.report({
      message: this.formatProgressMessage(report),
      increment: this.calculateIncrement(report)
    });

    // Update status bar
    if (this.statusBarItem) {
      this.updateStatusBar(report);
    }

    // Show notifications for important stages
    if (this.options.showNotifications) {
      this.showStageNotification(report);
    }

    // Complete progress if finished
    if (report.stage === 'complete' || report.stage === 'error') {
      setTimeout(() => this.completeProgress(), 1000); // Small delay to show completion
    }
  }

  /**
   * Format progress message for display
   */
  private formatProgressMessage(report: CLIProgressReport): string {
    const stageEmojis = {
      parsing: '📖',
      detection: '🔍',
      generation: '⚙️',
      output: '📝',
      complete: '✅',
      error: '❌'
    };

    const emoji = stageEmojis[report.stage] || '⏳';
    const percentage = Math.round(report.progress);
    
    return `${emoji} ${report.message} (${percentage}%)`;
  }

  /**
   * Calculate increment for VS Code progress
   */
  private calculateIncrement(report: CLIProgressReport): number {
    // VS Code progress is incremental, so we need to calculate the difference
    // For simplicity, we'll use stage-based increments
    const stageIncrements = {
      parsing: 25,
      detection: 25,
      generation: 25,
      output: 20,
      complete: 5,
      error: 0
    };

    return stageIncrements[report.stage] || 0;
  }

  /**
   * Update status bar with progress
   */
  private updateStatusBar(report: CLIProgressReport): void {
    if (!this.statusBarItem) return;

    const stageNames = {
      parsing: 'Parsing',
      detection: 'Detecting',
      generation: 'Generating',
      output: 'Writing',
      complete: 'Complete',
      error: 'Error'
    };

    const stageName = stageNames[report.stage] || 'Processing';
    const percentage = Math.round(report.progress);

    this.statusBarItem.text = `$(sync~spin) README to CI/CD: ${stageName} ${percentage}%`;
    this.statusBarItem.tooltip = report.details || report.message;
    this.statusBarItem.show();

    // Hide status bar after completion
    if (report.stage === 'complete' || report.stage === 'error') {
      setTimeout(() => {
        if (this.statusBarItem) {
          this.statusBarItem.hide();
        }
      }, 3000);
    }
  }

  /**
   * Show notification for important stages
   */
  private showStageNotification(report: CLIProgressReport): void {
    // Only show notifications for completion and errors
    if (report.stage === 'complete') {
      vscode.window.showInformationMessage(
        '✅ Workflow generation completed successfully!',
        'Open Workflows'
      ).then(selection => {
        if (selection === 'Open Workflows') {
          // Command to open workflows folder
          vscode.commands.executeCommand('readme-to-cicd.openWorkflowsFolder');
        }
      });
    } else if (report.stage === 'error') {
      vscode.window.showErrorMessage(
        `❌ Workflow generation failed: ${report.message}`,
        'View Details',
        'Retry'
      ).then(selection => {
        if (selection === 'View Details') {
          // Show error details
          this.showErrorDetails(report);
        } else if (selection === 'Retry') {
          // Command to retry generation
          vscode.commands.executeCommand('readme-to-cicd.generateWorkflow');
        }
      });
    }
  }

  /**
   * Show detailed error information
   */
  private showErrorDetails(report: CLIProgressReport): void {
    const errorMessage = report.details || report.message;
    
    vscode.window.showErrorMessage(
      errorMessage,
      { modal: true },
      'Copy Error',
      'Open Logs'
    ).then(selection => {
      if (selection === 'Copy Error') {
        vscode.env.clipboard.writeText(errorMessage);
        vscode.window.showInformationMessage('Error copied to clipboard');
      } else if (selection === 'Open Logs') {
        this.logger.show();
      }
    });
  }

  /**
   * Initialize status bar item
   */
  private initializeStatusBar(): void {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    
    this.statusBarItem.command = 'readme-to-cicd.showProgress';
    this.statusBarItem.tooltip = 'README to CI/CD Progress';
  }

  /**
   * Complete progress reporting
   */
  completeProgress(): void {
    if (this.progressResolve) {
      this.progressResolve();
      this.progressResolve = undefined;
    }

    this.currentProgress = undefined;
  }

  /**
   * Report simple progress without full progress UI
   */
  reportSimpleProgress(message: string, stage: CLIProgressReport['stage'] = 'parsing'): void {
    this.logger.info(`Progress: ${message}`);

    if (this.statusBarItem) {
      this.statusBarItem.text = `$(sync~spin) ${message}`;
      this.statusBarItem.show();

      // Auto-hide after 3 seconds
      setTimeout(() => {
        if (this.statusBarItem) {
          this.statusBarItem.hide();
        }
      }, 3000);
    }
  }

  /**
   * Show success message
   */
  showSuccess(message: string, actions?: string[]): Thenable<string | undefined> {
    this.logger.info(`Success: ${message}`);
    
    return vscode.window.showInformationMessage(
      `✅ ${message}`,
      ...(actions || [])
    );
  }

  /**
   * Show error message
   */
  showError(message: string, actions?: string[]): Thenable<string | undefined> {
    this.logger.error(`Error: ${message}`);
    
    return vscode.window.showErrorMessage(
      `❌ ${message}`,
      ...(actions || [])
    );
  }

  /**
   * Show warning message
   */
  showWarning(message: string, actions?: string[]): Thenable<string | undefined> {
    this.logger.warn(`Warning: ${message}`);
    
    return vscode.window.showWarningMessage(
      `⚠️ ${message}`,
      ...(actions || [])
    );
  }

  /**
   * Create progress callback for external use
   */
  createProgressCallback(): (report: CLIProgressReport) => void {
    return (report: CLIProgressReport) => {
      this.logger.debug('External progress update', {
        stage: report.stage,
        progress: report.progress,
        message: report.message
      });

      // Update status bar if available
      if (this.statusBarItem) {
        this.updateStatusBar(report);
      }

      // Show notifications for important stages
      if (this.options.showNotifications) {
        this.showStageNotification(report);
      }
    };
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.statusBarItem) {
      this.statusBarItem.dispose();
    }
    
    this.completeProgress();
    this.logger.dispose();
  }
}