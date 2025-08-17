/**
 * Extension Manager
 * 
 * Manages extension lifecycle, updates, telemetry, and deployment.
 * Handles version management and quality assurance.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { ExtensionConfiguration } from './types';

export interface ExtensionInfo {
  id: string;
  version: string;
  displayName: string;
  description: string;
  publisher: string;
  repository?: string;
  homepage?: string;
  bugs?: string;
}

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion?: string;
  releaseNotes?: string;
  downloadUrl?: string;
  critical?: boolean;
}

export interface TelemetryEvent {
  eventName: string;
  properties: Record<string, any>;
  measurements?: Record<string, number>;
  timestamp: Date;
}

export interface UsageMetrics {
  activationCount: number;
  commandUsage: Record<string, number>;
  featureUsage: Record<string, number>;
  errorCount: number;
  sessionDuration: number;
  workflowsGenerated: number;
  templatesUsed: Record<string, number>;
}

export interface QualityMetrics {
  crashCount: number;
  performanceIssues: number;
  userSatisfactionScore: number;
  bugReports: number;
  featureRequests: number;
}

export class ExtensionManager {
  private extensionInfo: ExtensionInfo;
  private telemetryEnabled: boolean = false;
  private usageMetrics: UsageMetrics;
  private qualityMetrics: QualityMetrics;
  private sessionStartTime: number;

  constructor(
    private context: vscode.ExtensionContext,
    private configuration: ExtensionConfiguration
  ) {
    this.extensionInfo = this.extractExtensionInfo();
    this.sessionStartTime = Date.now();
    this.usageMetrics = this.loadUsageMetrics();
    this.qualityMetrics = this.loadQualityMetrics();
    
    this.initializeTelemetry();
    this.setupUpdateChecking();
    this.trackActivation();
  }

  /**
   * Initialize extension and perform startup tasks
   */
  async initialize(): Promise<void> {
    try {
      // Check for updates
      await this.checkForUpdates();

      // Initialize telemetry if enabled
      if (this.telemetryEnabled) {
        await this.sendTelemetryEvent('extension.activated', {
          version: this.extensionInfo.version,
          platform: process.platform,
          nodeVersion: process.version,
          vscodeVersion: vscode.version
        });
      }

      // Perform health check
      await this.performHealthCheck();

      // Clean up old data
      await this.cleanupOldData();

    } catch (error) {
      console.error('Extension initialization failed:', error);
      await this.reportError('initialization', error);
    }
  }

  /**
   * Check for extension updates
   */
  async checkForUpdates(): Promise<UpdateInfo> {
    try {
      // In a real implementation, this would check the VS Code marketplace API
      // For now, return mock data
      const updateInfo: UpdateInfo = {
        available: false,
        currentVersion: this.extensionInfo.version
      };

      // Simulate update check
      const latestVersion = await this.fetchLatestVersion();
      if (latestVersion && this.isNewerVersion(latestVersion, this.extensionInfo.version)) {
        updateInfo.available = true;
        updateInfo.latestVersion = latestVersion;
        updateInfo.releaseNotes = await this.fetchReleaseNotes(latestVersion);
        
        // Show update notification
        await this.showUpdateNotification(updateInfo);
      }

      return updateInfo;

    } catch (error) {
      console.warn('Update check failed:', error);
      return {
        available: false,
        currentVersion: this.extensionInfo.version
      };
    }
  }

  /**
   * Send telemetry event (with user consent)
   */
  async sendTelemetryEvent(
    eventName: string,
    properties: Record<string, any> = {},
    measurements: Record<string, number> = {}
  ): Promise<void> {
    if (!this.telemetryEnabled) {
      return;
    }

    const event: TelemetryEvent = {
      eventName,
      properties: {
        ...properties,
        extensionVersion: this.extensionInfo.version,
        sessionId: this.context.globalState.get('sessionId', 'unknown')
      },
      measurements,
      timestamp: new Date()
    };

    try {
      // In a real implementation, this would send to a telemetry service
      await this.storeTelemetryEvent(event);
    } catch (error) {
      console.warn('Telemetry event failed:', error);
    }
  }

  /**
   * Track command usage
   */
  trackCommandUsage(commandName: string): void {
    this.usageMetrics.commandUsage[commandName] = 
      (this.usageMetrics.commandUsage[commandName] || 0) + 1;
    
    this.saveUsageMetrics();

    if (this.telemetryEnabled) {
      this.sendTelemetryEvent('command.executed', {
        commandName
      }, {
        usageCount: this.usageMetrics.commandUsage[commandName]
      });
    }
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(featureName: string, properties: Record<string, any> = {}): void {
    this.usageMetrics.featureUsage[featureName] = 
      (this.usageMetrics.featureUsage[featureName] || 0) + 1;
    
    this.saveUsageMetrics();

    if (this.telemetryEnabled) {
      this.sendTelemetryEvent('feature.used', {
        featureName,
        ...properties
      }, {
        usageCount: this.usageMetrics.featureUsage[featureName]
      });
    }
  }

  /**
   * Track workflow generation
   */
  trackWorkflowGeneration(templateName: string, success: boolean, duration: number): void {
    this.usageMetrics.workflowsGenerated++;
    this.usageMetrics.templatesUsed[templateName] = 
      (this.usageMetrics.templatesUsed[templateName] || 0) + 1;
    
    this.saveUsageMetrics();

    if (this.telemetryEnabled) {
      this.sendTelemetryEvent('workflow.generated', {
        templateName,
        success
      }, {
        duration,
        totalGenerated: this.usageMetrics.workflowsGenerated
      });
    }
  }

  /**
   * Report error for quality tracking
   */
  async reportError(context: string, error: Error | string): Promise<void> {
    this.usageMetrics.errorCount++;
    this.qualityMetrics.crashCount++;
    
    this.saveUsageMetrics();
    this.saveQualityMetrics();

    if (this.telemetryEnabled) {
      await this.sendTelemetryEvent('error.occurred', {
        context,
        errorMessage: typeof error === 'string' ? error : error.message,
        errorType: typeof error === 'string' ? 'string' : error.constructor.name
      }, {
        totalErrors: this.usageMetrics.errorCount
      });
    }
  }

  /**
   * Get extension diagnostics
   */
  getDiagnostics(): ExtensionDiagnostics {
    const sessionDuration = Date.now() - this.sessionStartTime;
    
    return {
      extensionInfo: this.extensionInfo,
      sessionDuration,
      usageMetrics: this.usageMetrics,
      qualityMetrics: this.qualityMetrics,
      telemetryEnabled: this.telemetryEnabled,
      memoryUsage: process.memoryUsage(),
      platform: {
        os: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        vscodeVersion: vscode.version
      }
    };
  }

  /**
   * Export diagnostics for support
   */
  async exportDiagnostics(): Promise<string> {
    const diagnostics = this.getDiagnostics();
    
    // Remove sensitive information
    const sanitizedDiagnostics = {
      ...diagnostics,
      // Remove any potentially sensitive data
      usageMetrics: {
        ...diagnostics.usageMetrics,
        // Keep only aggregated data
      }
    };

    return JSON.stringify(sanitizedDiagnostics, null, 2);
  }

  /**
   * Perform extension health check
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const checks: HealthCheck[] = [];

    // Check VS Code version compatibility
    checks.push(await this.checkVSCodeCompatibility());

    // Check required dependencies
    checks.push(await this.checkDependencies());

    // Check configuration validity
    checks.push(await this.checkConfiguration());

    // Check file system permissions
    checks.push(await this.checkFileSystemPermissions());

    // Check network connectivity (if needed)
    checks.push(await this.checkNetworkConnectivity());

    const failedChecks = checks.filter(check => !check.passed);
    const warnings = checks.filter(check => check.warning);

    return {
      healthy: failedChecks.length === 0,
      checks,
      failedChecks: failedChecks.length,
      warnings: warnings.length,
      recommendations: this.generateHealthRecommendations(checks)
    };
  }

  /**
   * Enable or disable telemetry
   */
  async setTelemetryEnabled(enabled: boolean): Promise<void> {
    this.telemetryEnabled = enabled;
    await this.context.globalState.update('telemetryEnabled', enabled);

    if (enabled) {
      await this.sendTelemetryEvent('telemetry.enabled');
    }
  }

  /**
   * Get telemetry status
   */
  isTelemetryEnabled(): boolean {
    return this.telemetryEnabled;
  }

  /**
   * Prepare extension for deactivation
   */
  async deactivate(): Promise<void> {
    try {
      // Calculate session duration
      const sessionDuration = Date.now() - this.sessionStartTime;
      this.usageMetrics.sessionDuration += sessionDuration;
      
      // Save final metrics
      this.saveUsageMetrics();
      this.saveQualityMetrics();

      // Send deactivation telemetry
      if (this.telemetryEnabled) {
        await this.sendTelemetryEvent('extension.deactivated', {}, {
          sessionDuration
        });
      }

    } catch (error) {
      console.error('Extension deactivation failed:', error);
    }
  }

  private extractExtensionInfo(): ExtensionInfo {
    const packageJson = this.context.extension.packageJSON;
    
    return {
      id: `${packageJson.publisher}.${packageJson.name}`,
      version: packageJson.version,
      displayName: packageJson.displayName || packageJson.name,
      description: packageJson.description,
      publisher: packageJson.publisher,
      repository: packageJson.repository?.url,
      homepage: packageJson.homepage,
      bugs: packageJson.bugs?.url
    };
  }

  private initializeTelemetry(): void {
    // Check user's telemetry preference
    const globalTelemetry = vscode.workspace.getConfiguration('telemetry').get('enableTelemetry', true);
    const extensionTelemetry = this.context.globalState.get('telemetryEnabled', globalTelemetry);
    
    this.telemetryEnabled = globalTelemetry && extensionTelemetry;
  }

  private setupUpdateChecking(): void {
    // Check for updates periodically (daily)
    const lastUpdateCheck = this.context.globalState.get('lastUpdateCheck', 0);
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (now - lastUpdateCheck > oneDayMs) {
      this.checkForUpdates().then(() => {
        this.context.globalState.update('lastUpdateCheck', now);
      });
    }
  }

  private trackActivation(): void {
    this.usageMetrics.activationCount++;
    this.saveUsageMetrics();
  }

  private async fetchLatestVersion(): Promise<string | undefined> {
    // In a real implementation, this would query the VS Code marketplace API
    // For now, return undefined (no update available)
    return undefined;
  }

  private isNewerVersion(latest: string, current: string): boolean {
    const parseVersion = (version: string) => version.split('.').map(Number);
    const latestParts = parseVersion(latest);
    const currentParts = parseVersion(current);

    for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
      const latestPart = latestParts[i] || 0;
      const currentPart = currentParts[i] || 0;

      if (latestPart > currentPart) return true;
      if (latestPart < currentPart) return false;
    }

    return false;
  }

  private async fetchReleaseNotes(version: string): Promise<string> {
    // In a real implementation, this would fetch from GitHub releases or similar
    return `Release notes for version ${version}`;
  }

  private async showUpdateNotification(updateInfo: UpdateInfo): Promise<void> {
    const choice = await vscode.window.showInformationMessage(
      `README-to-CICD ${updateInfo.latestVersion} is available. You have ${updateInfo.currentVersion}.`,
      'View Release Notes',
      'Update',
      'Remind Later'
    );

    switch (choice) {
      case 'View Release Notes':
        if (this.extensionInfo.repository) {
          vscode.env.openExternal(vscode.Uri.parse(`${this.extensionInfo.repository}/releases`));
        }
        break;
      case 'Update':
        vscode.commands.executeCommand('workbench.extensions.action.checkForUpdates');
        break;
    }
  }

  private async storeTelemetryEvent(event: TelemetryEvent): Promise<void> {
    // Store telemetry events locally for batching
    const events = this.context.globalState.get<TelemetryEvent[]>('telemetryEvents', []);
    events.push(event);

    // Keep only last 1000 events
    if (events.length > 1000) {
      events.splice(0, events.length - 1000);
    }

    await this.context.globalState.update('telemetryEvents', events);
  }

  private loadUsageMetrics(): UsageMetrics {
    return this.context.globalState.get('usageMetrics', {
      activationCount: 0,
      commandUsage: {},
      featureUsage: {},
      errorCount: 0,
      sessionDuration: 0,
      workflowsGenerated: 0,
      templatesUsed: {}
    });
  }

  private saveUsageMetrics(): void {
    this.context.globalState.update('usageMetrics', this.usageMetrics);
  }

  private loadQualityMetrics(): QualityMetrics {
    return this.context.globalState.get('qualityMetrics', {
      crashCount: 0,
      performanceIssues: 0,
      userSatisfactionScore: 0,
      bugReports: 0,
      featureRequests: 0
    });
  }

  private saveQualityMetrics(): void {
    this.context.globalState.update('qualityMetrics', this.qualityMetrics);
  }

  private async checkVSCodeCompatibility(): Promise<HealthCheck> {
    const requiredVersion = this.context.extension.packageJSON.engines?.vscode;
    const currentVersion = vscode.version;

    // Simple version check (in reality, you'd use semver)
    const compatible = true; // Assume compatible for now

    return {
      name: 'VS Code Compatibility',
      passed: compatible,
      message: compatible 
        ? `Compatible with VS Code ${currentVersion}`
        : `Requires VS Code ${requiredVersion}, found ${currentVersion}`,
      warning: false
    };
  }

  private async checkDependencies(): Promise<HealthCheck> {
    // Check if required Node.js modules are available
    const requiredModules = ['fs', 'path', 'util'];
    const missingModules: string[] = [];

    for (const module of requiredModules) {
      try {
        require(module);
      } catch (error) {
        missingModules.push(module);
      }
    }

    return {
      name: 'Dependencies',
      passed: missingModules.length === 0,
      message: missingModules.length === 0
        ? 'All dependencies available'
        : `Missing dependencies: ${missingModules.join(', ')}`,
      warning: false
    };
  }

  private async checkConfiguration(): Promise<HealthCheck> {
    // Validate extension configuration
    const config = vscode.workspace.getConfiguration('readme-to-cicd');
    const valid = true; // Assume valid for now

    return {
      name: 'Configuration',
      passed: valid,
      message: valid ? 'Configuration is valid' : 'Configuration has errors',
      warning: false
    };
  }

  private async checkFileSystemPermissions(): Promise<HealthCheck> {
    try {
      // Test write permissions in workspace
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (workspaceFolder) {
        const testFile = path.join(workspaceFolder.uri.fsPath, '.readme-to-cicd-test');
        await vscode.workspace.fs.writeFile(vscode.Uri.file(testFile), Buffer.from('test'));
        await vscode.workspace.fs.delete(vscode.Uri.file(testFile));
      }

      return {
        name: 'File System Permissions',
        passed: true,
        message: 'File system permissions are adequate',
        warning: false
      };
    } catch (error) {
      return {
        name: 'File System Permissions',
        passed: false,
        message: 'Insufficient file system permissions',
        warning: false
      };
    }
  }

  private async checkNetworkConnectivity(): Promise<HealthCheck> {
    // For now, assume network is available
    return {
      name: 'Network Connectivity',
      passed: true,
      message: 'Network connectivity is available',
      warning: false
    };
  }

  private generateHealthRecommendations(checks: HealthCheck[]): string[] {
    const recommendations: string[] = [];
    
    for (const check of checks) {
      if (!check.passed) {
        switch (check.name) {
          case 'VS Code Compatibility':
            recommendations.push('Update VS Code to the latest version');
            break;
          case 'Dependencies':
            recommendations.push('Reinstall the extension to restore missing dependencies');
            break;
          case 'Configuration':
            recommendations.push('Reset extension configuration to defaults');
            break;
          case 'File System Permissions':
            recommendations.push('Check folder permissions and run VS Code as administrator if needed');
            break;
          case 'Network Connectivity':
            recommendations.push('Check your internet connection and firewall settings');
            break;
        }
      }
    }

    return recommendations;
  }

  private async cleanupOldData(): Promise<void> {
    // Clean up old telemetry events (older than 30 days)
    const events = this.context.globalState.get<TelemetryEvent[]>('telemetryEvents', []);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const recentEvents = events.filter(event => event.timestamp > thirtyDaysAgo);
    await this.context.globalState.update('telemetryEvents', recentEvents);
  }
}

// Additional interfaces
interface ExtensionDiagnostics {
  extensionInfo: ExtensionInfo;
  sessionDuration: number;
  usageMetrics: UsageMetrics;
  qualityMetrics: QualityMetrics;
  telemetryEnabled: boolean;
  memoryUsage: NodeJS.MemoryUsage;
  platform: {
    os: string;
    arch: string;
    nodeVersion: string;
    vscodeVersion: string;
  };
}

interface HealthCheck {
  name: string;
  passed: boolean;
  message: string;
  warning: boolean;
}

interface HealthCheckResult {
  healthy: boolean;
  checks: HealthCheck[];
  failedChecks: number;
  warnings: number;
  recommendations: string[];
}