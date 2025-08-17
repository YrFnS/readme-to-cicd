/**
 * Notification Service
 * 
 * Centralized service for managing all types of notifications,
 * including success, warning, error states, and user feedback.
 */

import * as vscode from 'vscode';
import { ExtensionConfiguration } from './types';

export interface NotificationOptions {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  actions?: NotificationAction[];
  modal?: boolean;
  timeout?: number;
  showInStatusBar?: boolean;
  persistent?: boolean;
  category?: string;
}

export interface NotificationAction {
  title: string;
  command?: string;
  args?: any[];
  callback?: () => void | Promise<void>;
  primary?: boolean;
}

export interface NotificationHistory {
  id: string;
  timestamp: Date;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  category?: string;
  dismissed: boolean;
  actionTaken?: string;
  userFeedback?: string;
}

export class NotificationService {
  private notificationHistory: NotificationHistory[] = [];
  private statusBarItem: vscode.StatusBarItem;
  private persistentNotifications: Map<string, vscode.StatusBarItem> = new Map();

  constructor(
    private context: vscode.ExtensionContext,
    private configuration: ExtensionConfiguration
  ) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      150
    );
    
    this.loadNotificationHistory();
  }

  /**
   * Show success notification
   */
  async showSuccess(
    message: string,
    actions?: NotificationAction[],
    options?: Partial<NotificationOptions>
  ): Promise<string | undefined> {
    return this.showNotification({
      type: 'success',
      message,
      actions,
      ...options
    });
  }

  /**
   * Show error notification
   */
  async showError(
    message: string,
    actions?: NotificationAction[],
    options?: Partial<NotificationOptions>
  ): Promise<string | undefined> {
    return this.showNotification({
      type: 'error',
      message,
      actions,
      ...options
    });
  }

  /**
   * Show warning notification
   */
  async showWarning(
    message: string,
    actions?: NotificationAction[],
    options?: Partial<NotificationOptions>
  ): Promise<string | undefined> {
    return this.showNotification({
      type: 'warning',
      message,
      actions,
      ...options
    });
  }

  /**
   * Show info notification
   */
  async showInfo(
    message: string,
    actions?: NotificationAction[],
    options?: Partial<NotificationOptions>
  ): Promise<string | undefined> {
    return this.showNotification({
      type: 'info',
      message,
      actions,
      ...options
    });
  }

  /**
   * Show notification with full options
   */
  async showNotification(options: NotificationOptions): Promise<string | undefined> {
    // Check notification level settings
    if (!this.shouldShowNotification(options.type)) {
      return undefined;
    }

    // Create notification record
    const record: NotificationHistory = {
      id: this.generateNotificationId(),
      timestamp: new Date(),
      type: options.type,
      message: options.message,
      category: options.category,
      dismissed: false
    };

    this.notificationHistory.push(record);

    // Show in status bar if requested
    if (options.showInStatusBar) {
      this.showStatusBarNotification(options, record.id);
    }

    // Create persistent notification if requested
    if (options.persistent) {
      this.createPersistentNotification(options, record.id);
    }

    // Prepare action titles
    const actionTitles = options.actions?.map(action => action.title) || [];

    let choice: string | undefined;

    try {
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
          record.actionTaken = choice;
          
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

    } catch (error) {
      console.error('Error showing notification:', error);
    } finally {
      // Mark as dismissed
      record.dismissed = true;

      // Auto-dismiss after timeout
      if (options.timeout) {
        setTimeout(() => {
          this.dismissNotification(record.id);
        }, options.timeout);
      }

      // Save notification history
      await this.saveNotificationHistory();
    }

    return choice;
  }

  /**
   * Show workflow generation success with detailed feedback
   */
  async showWorkflowGenerationSuccess(
    workflowCount: number,
    duration: number,
    outputPath: string
  ): Promise<void> {
    const message = `Successfully generated ${workflowCount} workflow${workflowCount > 1 ? 's' : ''} in ${Math.round(duration / 1000)}s`;
    
    await this.showSuccess(message, [
      {
        title: 'Open Workflows',
        command: 'vscode.openFolder',
        args: [vscode.Uri.file(outputPath)],
        primary: true
      },
      {
        title: 'View Details',
        callback: async () => {
          await this.showWorkflowGenerationDetails(workflowCount, duration, outputPath);
        }
      }
    ], {
      showInStatusBar: true,
      timeout: 5000,
      category: 'workflow-generation'
    });
  }

  /**
   * Show validation error with recovery options
   */
  async showValidationError(
    errors: string[],
    filePath: string,
    recoveryActions?: NotificationAction[]
  ): Promise<void> {
    const errorCount = errors.length;
    const message = `Found ${errorCount} validation error${errorCount > 1 ? 's' : ''} in ${filePath}`;
    
    const defaultActions: NotificationAction[] = [
      {
        title: 'Show Problems',
        command: 'workbench.actions.view.problems',
        primary: true
      },
      {
        title: 'Open File',
        command: 'vscode.open',
        args: [vscode.Uri.file(filePath)]
      }
    ];

    await this.showError(message, [
      ...defaultActions,
      ...(recoveryActions || [])
    ], {
      modal: true,
      category: 'validation'
    });
  }

  /**
   * Show progress completion notification
   */
  async showProgressCompletion(
    operationTitle: string,
    success: boolean,
    duration: number,
    details?: string
  ): Promise<void> {
    if (success) {
      await this.showSuccess(
        `${operationTitle} completed successfully`,
        details ? [
          {
            title: 'View Details',
            callback: async () => {
              await vscode.window.showInformationMessage(details);
            }
          }
        ] : undefined,
        {
          showInStatusBar: true,
          timeout: 3000,
          category: 'operation-completion'
        }
      );
    } else {
      await this.showError(
        `${operationTitle} failed`,
        [
          {
            title: 'Retry',
            command: 'readme-to-cicd.retryLastOperation'
          },
          {
            title: 'Report Issue',
            command: 'readme-to-cicd.reportIssue',
            args: [{ operation: operationTitle, duration, details }]
          }
        ],
        {
          category: 'operation-failure'
        }
      );
    }
  }

  /**
   * Request user feedback for operation
   */
  async requestOperationFeedback(
    operationTitle: string,
    success: boolean,
    duration: number
  ): Promise<void> {
    // Only request feedback for significant operations
    if (duration < 5000 || !this.configuration.enableFeedbackRequests) {
      return;
    }

    const message = success 
      ? `How was your experience with "${operationTitle}"?`
      : `We're sorry "${operationTitle}" didn't work as expected. How can we improve?`;

    const choice = await vscode.window.showInformationMessage(
      message,
      'Excellent',
      'Good',
      'Okay',
      'Poor',
      'Skip'
    );

    if (choice && choice !== 'Skip') {
      // Record feedback
      const record = this.notificationHistory.find(r => 
        r.message.includes(operationTitle) && 
        r.timestamp.getTime() > Date.now() - 60000 // Within last minute
      );

      if (record) {
        record.userFeedback = choice;
      }

      // Request additional feedback for poor ratings
      if (choice === 'Poor') {
        const additionalFeedback = await vscode.window.showInputBox({
          prompt: 'What could we improve?',
          placeHolder: 'Optional feedback...'
        });

        if (additionalFeedback && record) {
          record.userFeedback += `: ${additionalFeedback}`;
        }
      }

      await this.saveNotificationHistory();
    }
  }

  /**
   * Show notification summary
   */
  async showNotificationSummary(): Promise<void> {
    const stats = this.getNotificationStatistics();
    
    const summary = `
Notification Summary (Last 24 Hours):
• Total: ${stats.total}
• Errors: ${stats.errors}
• Warnings: ${stats.warnings}
• Success: ${stats.success}
• User Actions: ${stats.actionsPerformed}
    `.trim();

    await vscode.window.showInformationMessage(summary, 'View Details', 'Clear History');
  }

  /**
   * Get notification statistics
   */
  getNotificationStatistics(): NotificationStatistics {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentNotifications = this.notificationHistory.filter(
      n => n.timestamp > last24Hours
    );

    return {
      total: recentNotifications.length,
      errors: recentNotifications.filter(n => n.type === 'error').length,
      warnings: recentNotifications.filter(n => n.type === 'warning').length,
      success: recentNotifications.filter(n => n.type === 'success').length,
      info: recentNotifications.filter(n => n.type === 'info').length,
      actionsPerformed: recentNotifications.filter(n => n.actionTaken).length,
      feedbackProvided: recentNotifications.filter(n => n.userFeedback).length,
      byCategory: this.groupByCategory(recentNotifications)
    };
  }

  /**
   * Clear notification history
   */
  async clearNotificationHistory(olderThanDays: number = 7): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const initialCount = this.notificationHistory.length;
    
    this.notificationHistory = this.notificationHistory.filter(
      n => n.timestamp > cutoff
    );

    await this.saveNotificationHistory();
    
    return initialCount - this.notificationHistory.length;
  }

  /**
   * Export notification history
   */
  async exportNotificationHistory(): Promise<string> {
    const exportData = {
      timestamp: new Date().toISOString(),
      version: this.context.extension.packageJSON.version,
      statistics: this.getNotificationStatistics(),
      notifications: this.notificationHistory
    };

    return JSON.stringify(exportData, null, 2);
  }

  private shouldShowNotification(type: string): boolean {
    const level = this.configuration.notificationLevel || 'all';
    
    switch (level) {
      case 'none':
        return false;
      case 'errors':
        return type === 'error';
      case 'warnings':
        return type === 'error' || type === 'warning';
      case 'all':
      default:
        return true;
    }
  }

  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private showStatusBarNotification(options: NotificationOptions, id: string): void {
    const icons = {
      info: '$(info)',
      warning: '$(warning)',
      error: '$(error)',
      success: '$(check)'
    };

    this.statusBarItem.text = `${icons[options.type]} ${options.message}`;
    this.statusBarItem.tooltip = options.message;
    this.statusBarItem.command = 'readme-to-cicd.showNotificationDetails';
    this.statusBarItem.show();

    // Auto-hide after timeout
    if (options.timeout) {
      setTimeout(() => {
        this.statusBarItem.hide();
      }, options.timeout);
    }
  }

  private createPersistentNotification(options: NotificationOptions, id: string): void {
    const statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );

    const icons = {
      info: '$(info)',
      warning: '$(warning)',
      error: '$(error)',
      success: '$(check)'
    };

    statusBarItem.text = `${icons[options.type]} ${options.message}`;
    statusBarItem.tooltip = `${options.message}\nClick to dismiss`;
    statusBarItem.command = {
      command: 'readme-to-cicd.dismissNotification',
      arguments: [id],
      title: 'Dismiss'
    };
    statusBarItem.show();

    this.persistentNotifications.set(id, statusBarItem);
  }

  private dismissNotification(id: string): void {
    const statusBarItem = this.persistentNotifications.get(id);
    if (statusBarItem) {
      statusBarItem.dispose();
      this.persistentNotifications.delete(id);
    }

    // Mark as dismissed in history
    const record = this.notificationHistory.find(n => n.id === id);
    if (record) {
      record.dismissed = true;
    }
  }

  private async showWorkflowGenerationDetails(
    workflowCount: number,
    duration: number,
    outputPath: string
  ): Promise<void> {
    const details = `
Workflow Generation Complete:
• Generated: ${workflowCount} workflow${workflowCount > 1 ? 's' : ''}
• Duration: ${Math.round(duration / 1000)}s
• Output: ${outputPath}
• Status: Success ✅
    `.trim();

    await vscode.window.showInformationMessage(details, 'Open Folder');
  }

  private groupByCategory(notifications: NotificationHistory[]): Record<string, number> {
    const groups: Record<string, number> = {};
    
    for (const notification of notifications) {
      const category = notification.category || 'general';
      groups[category] = (groups[category] || 0) + 1;
    }
    
    return groups;
  }

  private async loadNotificationHistory(): Promise<void> {
    const history = this.context.globalState.get<NotificationHistory[]>('notificationHistory', []);
    this.notificationHistory = history.map(h => ({
      ...h,
      timestamp: new Date(h.timestamp)
    }));
  }

  private async saveNotificationHistory(): Promise<void> {
    // Keep only last 1000 notifications
    if (this.notificationHistory.length > 1000) {
      this.notificationHistory = this.notificationHistory.slice(-1000);
    }

    await this.context.globalState.update('notificationHistory', this.notificationHistory);
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.statusBarItem.dispose();
    
    for (const statusBarItem of this.persistentNotifications.values()) {
      statusBarItem.dispose();
    }
    
    this.persistentNotifications.clear();
  }
}

// Additional interfaces
interface NotificationStatistics {
  total: number;
  errors: number;
  warnings: number;
  success: number;
  info: number;
  actionsPerformed: number;
  feedbackProvided: number;
  byCategory: Record<string, number>;
}