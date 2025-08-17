/**
 * Progress Manager
 * 
 * Manages progress indicators, notifications, and user feedback
 * for long-running operations in the extension.
 */

import * as vscode from 'vscode';
import { ExtensionConfiguration } from './types';

export interface ProgressOptions {
  title: string;
  location: vscode.ProgressLocation;
  cancellable?: boolean;
  showInStatusBar?: boolean;
  showNotification?: boolean;
  estimatedDuration?: number;
}

export interface ProgressStep {
  message: string;
  increment?: number;
  totalSteps?: number;
  currentStep?: number;
}

export interface NotificationOptions {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  actions?: NotificationAction[];
  modal?: boolean;
  timeout?: number;
  showInStatusBar?: boolean;
}

export interface NotificationAction {
  title: string;
  command?: string;
  args?: any[];
  callback?: () => void | Promise<void>;
}

export interface OperationFeedback {
  operationId: string;
  success: boolean;
  duration: number;
  userSatisfaction?: number; // 1-5 scale
  feedback?: string;
  suggestions?: string[];
}

export class ProgressManager {
  private activeOperations: Map<string, ActiveOperation> = new Map();
  private statusBarItem: vscode.StatusBarItem;
  private notificationHistory: NotificationRecord[] = [];

  constructor(
    private context: vscode.ExtensionContext,
    private configuration: ExtensionConfiguration
  ) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      200
    );
  }

  /**
   * Start a progress operation
   */
  async withProgress<T>(
    options: ProgressOptions,
    task: (progress: vscode.Progress<ProgressStep>, token: vscode.CancellationToken) => Promise<T>
  ): Promise<T> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();

    // Create active operation record
    const operation: ActiveOperation = {
      id: operationId,
      title: options.title,
      startTime,
      estimatedDuration: options.estimatedDuration,
      cancelled: false,
      steps: []
    };

    this.activeOperations.set(operationId, operation);

    try {
      // Show status bar if requested
      if (options.showInStatusBar) {
        this.updateStatusBar(operation);
      }

      // Execute with VS Code progress API
      const result = await vscode.window.withProgress(
        {
          location: options.location,
          title: options.title,
          cancellable: options.cancellable || false
        },
        async (progress, token) => {
          // Wrap progress to track steps
          const wrappedProgress = {
            report: (step: ProgressStep) => {
              operation.steps.push({
                ...step,
                timestamp: Date.now()
              });

              // Calculate percentage if we have step information
              let percentage: number | undefined;
              if (step.currentStep && step.totalSteps) {
                percentage = (step.currentStep / step.totalSteps) * 100;
              } else if (step.increment) {
                percentage = step.increment;
              }

              progress.report({
                message: step.message,
                increment: percentage
              });

              // Update status bar
              if (options.showInStatusBar) {
                this.updateStatusBar(operation, step);
              }
            }
          };

          // Handle cancellation
          token.onCancellationRequested(() => {
            operation.cancelled = true;
          });

          return await task(wrappedProgress, token);
        }
      );

      // Mark operation as completed
      operation.completed = true;
      operation.endTime = Date.now();
      operation.duration = operation.endTime - operation.startTime;

      // Show completion notification if requested
      if (options.showNotification) {
        await this.showNotification({
          type: 'success',
          message: `${options.title} completed successfully`,
          timeout: 3000
        });
      }

      return result;

    } catch (error) {
      // Mark operation as failed
      operation.completed = true;
      operation.failed = true;
      operation.error = error instanceof Error ? error.message : String(error);
      operation.endTime = Date.now();
      operation.duration = operation.endTime - operation.startTime;

      // Show error notification
      await this.showNotification({
        type: 'error',
        message: `${options.title} failed: ${operation.error}`,
        actions: [
          {
            title: 'Retry',
            callback: async () => {
              // Retry logic would be handled by caller
            }
          },
          {
            title: 'Report Issue',
            command: 'readme-to-cicd.reportIssue',
            args: [{ operation: operationId, error: operation.error }]
          }
        ]
      });

      throw error;

    } finally {
      // Clean up
      this.activeOperations.delete(operationId);
      this.hideStatusBar();
    }
  }

  /**
   * Show notification to user
   */
  async showNotification(options: NotificationOptions): Promise<string | undefined> {
    // Record notification
    const record: NotificationRecord = {
      id: this.generateOperationId(),
      timestamp: Date.now(),
      type: options.type,
      message: options.message,
      actions: options.actions || [],
      dismissed: false
    };

    this.notificationHistory.push(record);

    // Show in status bar if requested
    if (options.showInStatusBar) {
      this.showStatusBarNotification(options);
    }

    // Prepare action titles
    const actionTitles = options.actions?.map(action => action.title) || [];

    let choice: string | undefined;

    // Show appropriate notification type
    switch (options.type) {
      case 'info':
        choice = await vscode.window.showInformationMessage(
          options.message,
          { modal: options.modal },
          ...actionTitles
        );
        break;

      case 'warning':
        choice = await vscode.window.showWarningMessage(
          options.message,
          { modal: options.modal },
          ...actionTitles
        );
        break;

      case 'error':
        choice = await vscode.window.showErrorMessage(
          options.message,
          { modal: options.modal },
          ...actionTitles
        );
        break;

      case 'success':
        choice = await vscode.window.showInformationMessage(
          `✅ ${options.message}`,
          { modal: options.modal },
          ...actionTitles
        );
        break;
    }

    // Handle action selection
    if (choice && options.actions) {
      const selectedAction = options.actions.find(action => action.title === choice);
      if (selectedAction) {
        if (selectedAction.command) {
          await vscode.commands.executeCommand(
            selectedAction.command,
            ...(selectedAction.args || [])
          );
        } else if (selectedAction.callback) {
          await selectedAction.callback();
        }
      }
    }

    // Mark as dismissed
    record.dismissed = true;

    // Auto-dismiss after timeout
    if (options.timeout) {
      setTimeout(() => {
        record.dismissed = true;
      }, options.timeout);
    }

    return choice;
  }

  /**
   * Show progress in status bar only
   */
  showStatusBarProgress(title: string, progress?: number): void {
    let text = `$(sync~spin) ${title}`;
    
    if (progress !== undefined) {
      text += ` (${Math.round(progress)}%)`;
    }

    this.statusBarItem.text = text;
    this.statusBarItem.tooltip = title;
    this.statusBarItem.show();
  }

  /**
   * Hide status bar progress
   */
  hideStatusBar(): void {
    this.statusBarItem.hide();
  }

  /**
   * Request user feedback for an operation
   */
  async requestFeedback(
    operationId: string,
    operationTitle: string,
    success: boolean,
    duration: number
  ): Promise<OperationFeedback | undefined> {
    // Only request feedback for significant operations
    if (duration < 5000) { // Less than 5 seconds
      return undefined;
    }

    const feedback: OperationFeedback = {
      operationId,
      success,
      duration
    };

    // Show feedback dialog
    const choice = await vscode.window.showInformationMessage(
      `How was your experience with "${operationTitle}"?`,
      'Great!',
      'Good',
      'Okay',
      'Poor',
      'Skip'
    );

    if (choice && choice !== 'Skip') {
      const satisfactionMap = {
        'Great!': 5,
        'Good': 4,
        'Okay': 3,
        'Poor': 1
      };

      feedback.userSatisfaction = satisfactionMap[choice as keyof typeof satisfactionMap];

      // Request additional feedback for poor ratings
      if (feedback.userSatisfaction <= 2) {
        const additionalFeedback = await vscode.window.showInputBox({
          prompt: 'What could we improve?',
          placeHolder: 'Optional feedback...'
        });

        if (additionalFeedback) {
          feedback.feedback = additionalFeedback;
        }
      }

      // Store feedback
      await this.storeFeedback(feedback);
    }

    return feedback;
  }

  /**
   * Show batch operation progress
   */
  async withBatchProgress<T>(
    title: string,
    items: T[],
    processor: (item: T, index: number, progress: (message: string) => void) => Promise<void>
  ): Promise<void> {
    await this.withProgress(
      {
        title,
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
        showInStatusBar: true
      },
      async (progress, token) => {
        for (let i = 0; i < items.length; i++) {
          if (token.isCancellationRequested) {
            throw new Error('Operation cancelled by user');
          }

          const item = items[i];
          const percentage = ((i + 1) / items.length) * 100;

          await processor(item, i, (message: string) => {
            progress.report({
              message: `${message} (${i + 1}/${items.length})`,
              increment: percentage,
              currentStep: i + 1,
              totalSteps: items.length
            });
          });
        }
      }
    );
  }

  /**
   * Get operation statistics
   */
  getOperationStatistics(): OperationStatistics {
    const completedOperations = Array.from(this.activeOperations.values())
      .filter(op => op.completed);

    const totalOperations = completedOperations.length;
    const successfulOperations = completedOperations.filter(op => !op.failed).length;
    const failedOperations = completedOperations.filter(op => op.failed).length;
    const cancelledOperations = completedOperations.filter(op => op.cancelled).length;

    const averageDuration = totalOperations > 0
      ? completedOperations.reduce((sum, op) => sum + (op.duration || 0), 0) / totalOperations
      : 0;

    return {
      totalOperations,
      successfulOperations,
      failedOperations,
      cancelledOperations,
      successRate: totalOperations > 0 ? (successfulOperations / totalOperations) * 100 : 0,
      averageDuration,
      notificationCount: this.notificationHistory.length,
      feedbackCount: this.notificationHistory.filter(n => n.type === 'success').length
    };
  }

  /**
   * Clear old notifications and operations
   */
  clearHistory(olderThanDays: number = 7): void {
    const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    
    this.notificationHistory = this.notificationHistory.filter(
      record => record.timestamp > cutoff
    );
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateStatusBar(operation: ActiveOperation, step?: ProgressStep): void {
    let text = `$(sync~spin) ${operation.title}`;
    
    if (step?.currentStep && step?.totalSteps) {
      const percentage = Math.round((step.currentStep / step.totalSteps) * 100);
      text += ` (${percentage}%)`;
    }

    if (step?.message) {
      text += ` - ${step.message}`;
    }

    this.statusBarItem.text = text;
    this.statusBarItem.tooltip = `${operation.title}\nStarted: ${new Date(operation.startTime).toLocaleTimeString()}`;
    this.statusBarItem.show();
  }

  private showStatusBarNotification(options: NotificationOptions): void {
    const icons = {
      info: '$(info)',
      warning: '$(warning)',
      error: '$(error)',
      success: '$(check)'
    };

    this.statusBarItem.text = `${icons[options.type]} ${options.message}`;
    this.statusBarItem.tooltip = options.message;
    this.statusBarItem.show();

    // Auto-hide after timeout
    if (options.timeout) {
      setTimeout(() => {
        this.hideStatusBar();
      }, options.timeout);
    }
  }

  private async storeFeedback(feedback: OperationFeedback): Promise<void> {
    // Store feedback in extension context
    const existingFeedback = this.context.globalState.get<OperationFeedback[]>('operationFeedback', []);
    existingFeedback.push(feedback);
    
    // Keep only last 100 feedback entries
    if (existingFeedback.length > 100) {
      existingFeedback.splice(0, existingFeedback.length - 100);
    }
    
    await this.context.globalState.update('operationFeedback', existingFeedback);
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.statusBarItem.dispose();
  }
}

// Additional interfaces
interface ActiveOperation {
  id: string;
  title: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  estimatedDuration?: number;
  completed?: boolean;
  failed?: boolean;
  cancelled?: boolean;
  error?: string;
  steps: Array<ProgressStep & { timestamp: number }>;
}

interface NotificationRecord {
  id: string;
  timestamp: number;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  actions: NotificationAction[];
  dismissed: boolean;
}

interface OperationStatistics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  cancelledOperations: number;
  successRate: number;
  averageDuration: number;
  notificationCount: number;
  feedbackCount: number;
}