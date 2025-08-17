/**
 * Error Handler
 * 
 * Centralized error handling system with user-friendly messages,
 * recovery suggestions, and comprehensive logging.
 */

import * as vscode from 'vscode';
import { ExtensionConfiguration } from './types';

export interface ErrorContext {
  component: string;
  operation: string;
  userAction?: string;
  workflowPath?: string;
  additionalData?: Record<string, any>;
}

export interface ErrorRecovery {
  suggestion: string;
  action?: ErrorRecoveryAction;
  automatic: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface ErrorRecoveryAction {
  type: 'command' | 'setting' | 'file-operation' | 'retry';
  command?: string;
  args?: any[];
  setting?: string;
  value?: any;
  filePath?: string;
  content?: string;
}

export interface ErrorReport {
  id: string;
  timestamp: Date;
  level: 'error' | 'warning' | 'info';
  message: string;
  userMessage: string;
  context: ErrorContext;
  originalError?: Error;
  recoveryOptions: ErrorRecovery[];
  resolved: boolean;
  userFeedback?: string;
}

export interface ErrorPattern {
  pattern: RegExp;
  category: string;
  userMessage: string;
  recoveryOptions: ErrorRecovery[];
  documentation?: string;
}

export class ErrorHandler {
  private errorReports: Map<string, ErrorReport> = new Map();
  private errorPatterns: ErrorPattern[] = [];
  private outputChannel: vscode.OutputChannel;
  private statusBarItem: vscode.StatusBarItem;

  constructor(
    private context: vscode.ExtensionContext,
    private configuration: ExtensionConfiguration
  ) {
    this.outputChannel = vscode.window.createOutputChannel('README-to-CICD');
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    
    this.initializeErrorPatterns();
    this.setupErrorReporting();
  }

  /**
   * Handle error with context and provide recovery options
   */
  async handleError(
    error: Error | string,
    context: ErrorContext,
    showToUser: boolean = true
  ): Promise<ErrorReport> {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const originalError = typeof error === 'string' ? undefined : error;

    // Generate unique error ID
    const errorId = this.generateErrorId(errorMessage, context);

    // Check if this is a known error pattern
    const pattern = this.matchErrorPattern(errorMessage);
    
    // Create error report
    const report: ErrorReport = {
      id: errorId,
      timestamp: new Date(),
      level: this.determineErrorLevel(errorMessage, context),
      message: errorMessage,
      userMessage: pattern?.userMessage || this.generateUserFriendlyMessage(errorMessage, context),
      context,
      originalError,
      recoveryOptions: pattern?.recoveryOptions || this.generateRecoveryOptions(errorMessage, context),
      resolved: false
    };

    // Store error report
    this.errorReports.set(errorId, report);

    // Log error
    this.logError(report);

    // Show to user if requested
    if (showToUser) {
      await this.showErrorToUser(report);
    }

    // Update status bar
    this.updateStatusBar();

    return report;
  }

  /**
   * Handle warning with context
   */
  async handleWarning(
    message: string,
    context: ErrorContext,
    showToUser: boolean = true
  ): Promise<ErrorReport> {
    const report: ErrorReport = {
      id: this.generateErrorId(message, context),
      timestamp: new Date(),
      level: 'warning',
      message,
      userMessage: this.generateUserFriendlyMessage(message, context),
      context,
      recoveryOptions: this.generateRecoveryOptions(message, context),
      resolved: false
    };

    this.errorReports.set(report.id, report);
    this.logWarning(report);

    if (showToUser) {
      await this.showWarningToUser(report);
    }

    this.updateStatusBar();
    return report;
  }

  /**
   * Handle info message with context
   */
  async handleInfo(
    message: string,
    context: ErrorContext,
    showToUser: boolean = false
  ): Promise<ErrorReport> {
    const report: ErrorReport = {
      id: this.generateErrorId(message, context),
      timestamp: new Date(),
      level: 'info',
      message,
      userMessage: message,
      context,
      recoveryOptions: [],
      resolved: true
    };

    this.errorReports.set(report.id, report);
    this.logInfo(report);

    if (showToUser) {
      vscode.window.showInformationMessage(message);
    }

    return report;
  }

  /**
   * Attempt automatic error recovery
   */
  async attemptRecovery(errorId: string, recoveryIndex: number = 0): Promise<boolean> {
    const report = this.errorReports.get(errorId);
    if (!report || recoveryIndex >= report.recoveryOptions.length) {
      return false;
    }

    const recovery = report.recoveryOptions[recoveryIndex];
    if (!recovery.automatic || !recovery.action) {
      return false;
    }

    try {
      const success = await this.executeRecoveryAction(recovery.action);
      
      if (success) {
        report.resolved = true;
        this.logInfo({
          ...report,
          message: `Automatic recovery successful: ${recovery.suggestion}`,
          level: 'info'
        });
        
        vscode.window.showInformationMessage(
          `✅ Automatically resolved: ${recovery.suggestion}`
        );
        
        this.updateStatusBar();
        return true;
      }
    } catch (recoveryError) {
      this.logError({
        ...report,
        message: `Recovery failed: ${recoveryError.message}`,
        level: 'error'
      });
    }

    return false;
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): ErrorStatistics {
    const reports = Array.from(this.errorReports.values());
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return {
      total: reports.length,
      resolved: reports.filter(r => r.resolved).length,
      unresolved: reports.filter(r => !r.resolved).length,
      last24Hours: reports.filter(r => r.timestamp > last24Hours).length,
      byLevel: {
        error: reports.filter(r => r.level === 'error').length,
        warning: reports.filter(r => r.level === 'warning').length,
        info: reports.filter(r => r.level === 'info').length
      },
      byComponent: this.groupByComponent(reports),
      commonErrors: this.getCommonErrors(reports)
    };
  }

  /**
   * Export error reports for debugging
   */
  async exportErrorReports(): Promise<string> {
    const reports = Array.from(this.errorReports.values());
    const exportData = {
      timestamp: new Date().toISOString(),
      version: this.context.extension.packageJSON.version,
      statistics: this.getErrorStatistics(),
      reports: reports.map(report => ({
        ...report,
        originalError: report.originalError ? {
          name: report.originalError.name,
          message: report.originalError.message,
          stack: report.originalError.stack
        } : undefined
      }))
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Clear resolved errors older than specified days
   */
  clearOldErrors(days: number = 7): number {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    let cleared = 0;

    for (const [id, report] of this.errorReports.entries()) {
      if (report.resolved && report.timestamp < cutoff) {
        this.errorReports.delete(id);
        cleared++;
      }
    }

    this.updateStatusBar();
    return cleared;
  }

  /**
   * Show error details panel
   */
  async showErrorDetails(errorId?: string): Promise<void> {
    const reports = errorId 
      ? [this.errorReports.get(errorId)].filter(Boolean)
      : Array.from(this.errorReports.values()).filter(r => !r.resolved);

    if (reports.length === 0) {
      vscode.window.showInformationMessage('No errors to display');
      return;
    }

    // Create and show webview with error details
    const panel = vscode.window.createWebviewPanel(
      'errorDetails',
      'Error Details',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    panel.webview.html = this.generateErrorDetailsHTML(reports);
    
    // Handle messages from webview
    panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'retry':
          await this.attemptRecovery(message.errorId);
          break;
        case 'resolve':
          await this.markErrorResolved(message.errorId, message.feedback);
          break;
        case 'export':
          await this.exportAndSaveErrorReports();
          break;
      }
    });
  }

  private initializeErrorPatterns(): void {
    this.errorPatterns = [
      {
        pattern: /ENOENT.*package\.json/i,
        category: 'file-not-found',
        userMessage: 'Package.json file not found. This might not be a Node.js project.',
        recoveryOptions: [
          {
            suggestion: 'Create a package.json file',
            action: {
              type: 'command',
              command: 'workbench.action.terminal.new'
            },
            automatic: false,
            priority: 'high'
          },
          {
            suggestion: 'Select a different project folder',
            action: {
              type: 'command',
              command: 'vscode.openFolder'
            },
            automatic: false,
            priority: 'medium'
          }
        ],
        documentation: 'https://docs.npmjs.com/creating-a-package-json-file'
      },
      {
        pattern: /Failed to parse.*YAML/i,
        category: 'yaml-syntax',
        userMessage: 'Invalid YAML syntax in workflow file.',
        recoveryOptions: [
          {
            suggestion: 'Validate YAML syntax',
            action: {
              type: 'command',
              command: 'yaml.validate'
            },
            automatic: true,
            priority: 'high'
          },
          {
            suggestion: 'Format YAML file',
            action: {
              type: 'command',
              command: 'editor.action.formatDocument'
            },
            automatic: false,
            priority: 'medium'
          }
        ],
        documentation: 'https://docs.github.com/en/actions/learn-github-actions/workflow-syntax-for-github-actions'
      },
      {
        pattern: /Permission denied|EACCES/i,
        category: 'permissions',
        userMessage: 'Permission denied. Check file and folder permissions.',
        recoveryOptions: [
          {
            suggestion: 'Run VS Code as administrator',
            automatic: false,
            priority: 'high'
          },
          {
            suggestion: 'Check file permissions',
            automatic: false,
            priority: 'medium'
          }
        ]
      },
      {
        pattern: /Network.*timeout|ETIMEDOUT/i,
        category: 'network',
        userMessage: 'Network timeout. Check your internet connection.',
        recoveryOptions: [
          {
            suggestion: 'Retry the operation',
            action: {
              type: 'retry'
            },
            automatic: true,
            priority: 'high'
          },
          {
            suggestion: 'Check network connection',
            automatic: false,
            priority: 'medium'
          }
        ]
      },
      {
        pattern: /Template.*not found/i,
        category: 'template',
        userMessage: 'Workflow template not found.',
        recoveryOptions: [
          {
            suggestion: 'Use default template',
            automatic: true,
            priority: 'high'
          },
          {
            suggestion: 'Browse available templates',
            action: {
              type: 'command',
              command: 'readme-to-cicd.showTemplates'
            },
            automatic: false,
            priority: 'medium'
          }
        ]
      }
    ];
  }

  private setupErrorReporting(): void {
    // Set up global error handlers
    process.on('uncaughtException', (error) => {
      this.handleError(error, {
        component: 'global',
        operation: 'uncaught-exception'
      }, false);
    });

    process.on('unhandledRejection', (reason) => {
      this.handleError(
        reason instanceof Error ? reason : new Error(String(reason)),
        {
          component: 'global',
          operation: 'unhandled-rejection'
        },
        false
      );
    });
  }

  private generateErrorId(message: string, context: ErrorContext): string {
    const hash = this.simpleHash(message + context.component + context.operation);
    return `err_${hash}_${Date.now()}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private matchErrorPattern(message: string): ErrorPattern | undefined {
    return this.errorPatterns.find(pattern => pattern.pattern.test(message));
  }

  private determineErrorLevel(message: string, context: ErrorContext): 'error' | 'warning' | 'info' {
    if (message.toLowerCase().includes('warning')) return 'warning';
    if (message.toLowerCase().includes('info')) return 'info';
    if (context.operation === 'validation' && !message.toLowerCase().includes('failed')) return 'warning';
    return 'error';
  }

  private generateUserFriendlyMessage(message: string, context: ErrorContext): string {
    // Convert technical error messages to user-friendly ones
    const friendlyMessages: Record<string, string> = {
      'ENOENT': 'File or folder not found',
      'EACCES': 'Permission denied',
      'ETIMEDOUT': 'Operation timed out',
      'ECONNREFUSED': 'Connection refused',
      'ENOTFOUND': 'Resource not found'
    };

    for (const [technical, friendly] of Object.entries(friendlyMessages)) {
      if (message.includes(technical)) {
        return `${friendly} while ${context.operation} in ${context.component}`;
      }
    }

    // Clean up technical stack traces and paths
    let cleanMessage = message
      .replace(/at\s+.*\(.*\)/g, '') // Remove stack trace lines
      .replace(/\/.*\/node_modules\/.*$/gm, '') // Remove node_modules paths
      .replace(/Error:\s*/g, '') // Remove "Error:" prefix
      .trim();

    // Capitalize first letter
    cleanMessage = cleanMessage.charAt(0).toUpperCase() + cleanMessage.slice(1);

    return cleanMessage;
  }

  private generateRecoveryOptions(message: string, context: ErrorContext): ErrorRecovery[] {
    const options: ErrorRecovery[] = [];

    // Generic recovery options based on context
    if (context.operation === 'file-read' || context.operation === 'file-write') {
      options.push({
        suggestion: 'Check if the file exists and you have permission to access it',
        automatic: false,
        priority: 'high'
      });
    }

    if (context.operation === 'network-request') {
      options.push({
        suggestion: 'Retry the operation',
        action: { type: 'retry' },
        automatic: true,
        priority: 'high'
      });
    }

    if (context.operation === 'yaml-generation') {
      options.push({
        suggestion: 'Try with a different template',
        automatic: false,
        priority: 'medium'
      });
    }

    // Always offer to report the issue
    options.push({
      suggestion: 'Report this issue to the extension developers',
      automatic: false,
      priority: 'low'
    });

    return options;
  }

  private async showErrorToUser(report: ErrorReport): Promise<void> {
    const actions = report.recoveryOptions
      .filter(option => !option.automatic)
      .slice(0, 3) // Limit to 3 actions
      .map(option => option.suggestion);

    actions.push('Show Details');

    const choice = await vscode.window.showErrorMessage(
      report.userMessage,
      ...actions
    );

    if (choice === 'Show Details') {
      await this.showErrorDetails(report.id);
    } else if (choice) {
      const recoveryIndex = report.recoveryOptions.findIndex(
        option => option.suggestion === choice
      );
      
      if (recoveryIndex >= 0) {
        const recovery = report.recoveryOptions[recoveryIndex];
        if (recovery.action) {
          await this.executeRecoveryAction(recovery.action);
        }
      }
    }
  }

  private async showWarningToUser(report: ErrorReport): Promise<void> {
    const actions = report.recoveryOptions
      .filter(option => !option.automatic)
      .slice(0, 2)
      .map(option => option.suggestion);

    const choice = await vscode.window.showWarningMessage(
      report.userMessage,
      ...actions
    );

    if (choice) {
      const recoveryIndex = report.recoveryOptions.findIndex(
        option => option.suggestion === choice
      );
      
      if (recoveryIndex >= 0) {
        const recovery = report.recoveryOptions[recoveryIndex];
        if (recovery.action) {
          await this.executeRecoveryAction(recovery.action);
        }
      }
    }
  }

  private async executeRecoveryAction(action: ErrorRecoveryAction): Promise<boolean> {
    try {
      switch (action.type) {
        case 'command':
          if (action.command) {
            await vscode.commands.executeCommand(action.command, ...(action.args || []));
            return true;
          }
          break;

        case 'setting':
          if (action.setting && action.value !== undefined) {
            const config = vscode.workspace.getConfiguration();
            await config.update(action.setting, action.value, vscode.ConfigurationTarget.Workspace);
            return true;
          }
          break;

        case 'file-operation':
          if (action.filePath && action.content) {
            await vscode.workspace.fs.writeFile(
              vscode.Uri.file(action.filePath),
              Buffer.from(action.content)
            );
            return true;
          }
          break;

        case 'retry':
          // Retry logic would be handled by the calling component
          return true;
      }
    } catch (error) {
      return false;
    }

    return false;
  }

  private logError(report: ErrorReport): void {
    const logMessage = this.formatLogMessage(report);
    this.outputChannel.appendLine(logMessage);
    
    if (this.configuration.debugMode) {
      console.error(logMessage, report.originalError);
    }
  }

  private logWarning(report: ErrorReport): void {
    const logMessage = this.formatLogMessage(report);
    this.outputChannel.appendLine(logMessage);
    
    if (this.configuration.debugMode) {
      console.warn(logMessage);
    }
  }

  private logInfo(report: ErrorReport): void {
    const logMessage = this.formatLogMessage(report);
    this.outputChannel.appendLine(logMessage);
    
    if (this.configuration.debugMode) {
      console.info(logMessage);
    }
  }

  private formatLogMessage(report: ErrorReport): string {
    const timestamp = report.timestamp.toISOString();
    const level = report.level.toUpperCase();
    const component = report.context.component;
    const operation = report.context.operation;
    
    return `[${timestamp}] ${level} [${component}:${operation}] ${report.message}`;
  }

  private updateStatusBar(): void {
    const unresolvedErrors = Array.from(this.errorReports.values())
      .filter(r => !r.resolved && r.level === 'error').length;

    if (unresolvedErrors > 0) {
      this.statusBarItem.text = `$(error) ${unresolvedErrors} error${unresolvedErrors > 1 ? 's' : ''}`;
      this.statusBarItem.tooltip = `${unresolvedErrors} unresolved error${unresolvedErrors > 1 ? 's' : ''}. Click to view details.`;
      this.statusBarItem.command = 'readme-to-cicd.showErrorDetails';
      this.statusBarItem.show();
    } else {
      this.statusBarItem.hide();
    }
  }

  private groupByComponent(reports: ErrorReport[]): Record<string, number> {
    const groups: Record<string, number> = {};
    
    for (const report of reports) {
      const component = report.context.component;
      groups[component] = (groups[component] || 0) + 1;
    }
    
    return groups;
  }

  private getCommonErrors(reports: ErrorReport[]): Array<{ message: string; count: number }> {
    const errorCounts: Record<string, number> = {};
    
    for (const report of reports) {
      const key = report.message.substring(0, 100); // First 100 chars
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    }
    
    return Object.entries(errorCounts)
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private async markErrorResolved(errorId: string, feedback?: string): Promise<void> {
    const report = this.errorReports.get(errorId);
    if (report) {
      report.resolved = true;
      report.userFeedback = feedback;
      this.updateStatusBar();
    }
  }

  private async exportAndSaveErrorReports(): Promise<void> {
    const content = await this.exportErrorReports();
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file('error-reports.json'),
      filters: { 'JSON Files': ['json'] }
    });

    if (uri) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(content));
      vscode.window.showInformationMessage(`Error reports exported to ${uri.fsPath}`);
    }
  }

  private generateErrorDetailsHTML(reports: ErrorReport[]): string {
    const reportsHTML = reports.map(report => `
      <div class="error-card">
        <div class="error-header">
          <span class="error-level ${report.level}">${report.level.toUpperCase()}</span>
          <span class="error-time">${report.timestamp.toLocaleString()}</span>
        </div>
        <div class="error-message">${report.userMessage}</div>
        <div class="error-context">
          <strong>Component:</strong> ${report.context.component}<br>
          <strong>Operation:</strong> ${report.context.operation}
        </div>
        <div class="error-actions">
          ${report.recoveryOptions.map((option, index) => `
            <button onclick="handleRecovery('${report.id}', ${index})">${option.suggestion}</button>
          `).join('')}
          <button onclick="markResolved('${report.id}')">Mark Resolved</button>
        </div>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: var(--vscode-font-family); padding: 20px; }
          .error-card { border: 1px solid var(--vscode-panel-border); margin-bottom: 20px; padding: 15px; border-radius: 4px; }
          .error-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .error-level { padding: 2px 8px; border-radius: 3px; font-size: 12px; }
          .error-level.error { background-color: #f44336; color: white; }
          .error-level.warning { background-color: #ff9800; color: white; }
          .error-level.info { background-color: #2196f3; color: white; }
          .error-message { font-weight: bold; margin-bottom: 10px; }
          .error-context { margin-bottom: 15px; font-size: 13px; color: var(--vscode-descriptionForeground); }
          .error-actions button { margin-right: 10px; margin-bottom: 5px; padding: 5px 10px; }
        </style>
      </head>
      <body>
        <h2>Error Details</h2>
        ${reportsHTML}
        <script>
          const vscode = acquireVsCodeApi();
          function handleRecovery(errorId, recoveryIndex) {
            vscode.postMessage({ command: 'retry', errorId, recoveryIndex });
          }
          function markResolved(errorId) {
            const feedback = prompt('Optional feedback:');
            vscode.postMessage({ command: 'resolve', errorId, feedback });
          }
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.outputChannel.dispose();
    this.statusBarItem.dispose();
  }
}

// Additional interfaces
interface ErrorStatistics {
  total: number;
  resolved: number;
  unresolved: number;
  last24Hours: number;
  byLevel: {
    error: number;
    warning: number;
    info: number;
  };
  byComponent: Record<string, number>;
  commonErrors: Array<{ message: string; count: number }>;
}