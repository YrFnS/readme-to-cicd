import * as vscode from 'vscode';
import { LoggingService } from './LoggingService';

export interface TelemetryEvent {
  name: string;
  properties?: Record<string, string | number | boolean>;
  measurements?: Record<string, number>;
  timestamp?: Date;
}

export interface TelemetryConfiguration {
  enabled: boolean;
  level: 'off' | 'error' | 'all';
  anonymizeData: boolean;
  collectUsageData: boolean;
  collectErrorData: boolean;
  collectPerformanceData: boolean;
}

export interface UsageMetrics {
  commandExecutions: Record<string, number>;
  workflowGenerations: number;
  frameworksDetected: Record<string, number>;
  errorsEncountered: number;
  sessionDuration: number;
  featuresUsed: string[];
}

export class TelemetryService {
  private static instance: TelemetryService;
  private readonly context: vscode.ExtensionContext;
  private readonly logger: LoggingService;
  private configuration: TelemetryConfiguration;
  private sessionStartTime: Date;
  private usageMetrics: UsageMetrics;
  private eventQueue: TelemetryEvent[] = [];
  private flushTimer?: NodeJS.Timeout;

  private constructor(context: vscode.ExtensionContext, logger: LoggingService) {
    this.context = context;
    this.logger = logger;
    this.sessionStartTime = new Date();
    this.configuration = this.loadConfiguration();
    this.usageMetrics = this.initializeUsageMetrics();
  }

  public static getInstance(context: vscode.ExtensionContext, logger: LoggingService): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService(context, logger);
    }
    return TelemetryService.instance;
  }

  /**
   * Initialize telemetry service
   */
  public async initialize(): Promise<void> {
    try {
      await this.requestUserConsent();
      this.startFlushTimer();
      this.trackSessionStart();
      
      this.logger.info('Telemetry service initialized', {
        enabled: this.configuration.enabled,
        level: this.configuration.level
      });
    } catch (error) {
      this.logger.error('Failed to initialize telemetry service', { error });
    }
  }

  /**
   * Track an event
   */
  public trackEvent(name: string, properties?: Record<string, any>, measurements?: Record<string, number>): void {
    if (!this.configuration.enabled || this.configuration.level === 'off') {
      return;
    }

    try {
      const event: TelemetryEvent = {
        name,
        properties: this.sanitizeProperties(properties),
        measurements,
        timestamp: new Date()
      };

      this.eventQueue.push(event);
      this.updateUsageMetrics(event);

      this.logger.debug('Event tracked', { event: name, properties });
    } catch (error) {
      this.logger.error('Failed to track event', { error, event: name });
    }
  }

  /**
   * Track command execution
   */
  public trackCommand(command: string, success: boolean, duration?: number, error?: Error): void {
    if (!this.configuration.enabled) return;

    const properties = {
      command,
      success: success.toString(),
      error: error ? this.anonymizeError(error.message) : undefined
    };

    const measurements = duration ? { duration } : undefined;

    this.trackEvent('command_executed', properties, measurements);
    
    // Update usage metrics
    this.usageMetrics.commandExecutions[command] = (this.usageMetrics.commandExecutions[command] || 0) + 1;
    
    if (error) {
      this.usageMetrics.errorsEncountered++;
    }
  }

  /**
   * Track workflow generation
   */
  public trackWorkflowGeneration(
    frameworksDetected: string[],
    workflowTypes: string[],
    success: boolean,
    duration: number,
    error?: Error
  ): void {
    if (!this.configuration.enabled) return;

    const properties = {
      frameworks: frameworksDetected.join(','),
      workflowTypes: workflowTypes.join(','),
      frameworkCount: frameworksDetected.length.toString(),
      workflowCount: workflowTypes.length.toString(),
      success: success.toString(),
      error: error ? this.anonymizeError(error.message) : undefined
    };

    const measurements = { duration, frameworkCount: frameworksDetected.length };

    this.trackEvent('workflow_generated', properties, measurements);

    // Update usage metrics
    if (success) {
      this.usageMetrics.workflowGenerations++;
    }
    
    frameworksDetected.forEach(framework => {
      this.usageMetrics.frameworksDetected[framework] = 
        (this.usageMetrics.frameworksDetected[framework] || 0) + 1;
    });
  }

  /**
   * Track error
   */
  public trackError(error: Error, context?: string, properties?: Record<string, any>): void {
    if (!this.configuration.enabled || !this.configuration.collectErrorData) return;

    const errorProperties = {
      message: this.anonymizeError(error.message),
      stack: this.configuration.anonymizeData ? '[REDACTED]' : error.stack?.substring(0, 500),
      context,
      ...this.sanitizeProperties(properties)
    };

    this.trackEvent('error_occurred', errorProperties);
    this.usageMetrics.errorsEncountered++;
  }

  /**
   * Track performance metric
   */
  public trackPerformance(operation: string, duration: number, properties?: Record<string, any>): void {
    if (!this.configuration.enabled || !this.configuration.collectPerformanceData) return;

    this.trackEvent('performance_metric', {
      operation,
      ...this.sanitizeProperties(properties)
    }, { duration });
  }

  /**
   * Track feature usage
   */
  public trackFeatureUsage(feature: string, properties?: Record<string, any>): void {
    if (!this.configuration.enabled) return;

    this.trackEvent('feature_used', {
      feature,
      ...this.sanitizeProperties(properties)
    });

    if (!this.usageMetrics.featuresUsed.includes(feature)) {
      this.usageMetrics.featuresUsed.push(feature);
    }
  }

  /**
   * Get usage statistics
   */
  public getUsageStatistics(): UsageMetrics & { sessionDuration: number } {
    const sessionDuration = Date.now() - this.sessionStartTime.getTime();
    
    return {
      ...this.usageMetrics,
      sessionDuration: Math.round(sessionDuration / 1000) // in seconds
    };
  }

  /**
   * Update telemetry configuration
   */
  public async updateConfiguration(config: Partial<TelemetryConfiguration>): Promise<void> {
    this.configuration = { ...this.configuration, ...config };
    await this.saveConfiguration();
    
    this.trackEvent('telemetry_config_updated', {
      enabled: this.configuration.enabled.toString(),
      level: this.configuration.level
    });
  }

  /**
   * Request user consent for telemetry
   */
  private async requestUserConsent(): Promise<void> {
    const hasConsent = this.context.globalState.get<boolean>('telemetryConsent');
    
    if (hasConsent === undefined) {
      const message = 'Help improve README to CI/CD by sharing anonymous usage data and error reports?';
      const options = ['Yes, help improve', 'No, keep private', 'Learn more'];
      
      const selection = await vscode.window.showInformationMessage(message, ...options);
      
      switch (selection) {
        case 'Yes, help improve':
          await this.context.globalState.update('telemetryConsent', true);
          this.configuration.enabled = true;
          break;
        case 'No, keep private':
          await this.context.globalState.update('telemetryConsent', false);
          this.configuration.enabled = false;
          break;
        case 'Learn more':
          await this.showTelemetryInfo();
          await this.requestUserConsent(); // Ask again after showing info
          return;
        default:
          // User dismissed, default to disabled
          await this.context.globalState.update('telemetryConsent', false);
          this.configuration.enabled = false;
      }
      
      await this.saveConfiguration();
    } else {
      this.configuration.enabled = hasConsent;
    }
  }

  /**
   * Show telemetry information
   */
  private async showTelemetryInfo(): Promise<void> {
    const content = `# Telemetry Information

README to CI/CD collects anonymous usage data to help improve the extension.

## What we collect:
- Command usage and feature adoption
- Framework detection results (anonymized)
- Error reports (with personal data removed)
- Performance metrics
- Extension version and VS Code version

## What we DON'T collect:
- File contents or code
- Personal information
- Project names or paths
- Sensitive configuration data

## Your privacy:
- All data is anonymized
- No personal information is transmitted
- You can opt out at any time in settings
- Data is used only for product improvement

You can change your preference anytime in VS Code settings under "readme-to-cicd.telemetry.enabled"`;

    const doc = await vscode.workspace.openTextDocument({
      content,
      language: 'markdown'
    });
    
    await vscode.window.showTextDocument(doc);
  }

  /**
   * Load telemetry configuration
   */
  private loadConfiguration(): TelemetryConfiguration {
    const config = vscode.workspace.getConfiguration('readme-to-cicd.telemetry');
    const globalConsent = this.context.globalState.get<boolean>('telemetryConsent', false);
    
    return {
      enabled: globalConsent && config.get('enabled', true),
      level: config.get('level', 'all'),
      anonymizeData: config.get('anonymizeData', true),
      collectUsageData: config.get('collectUsageData', true),
      collectErrorData: config.get('collectErrorData', true),
      collectPerformanceData: config.get('collectPerformanceData', true)
    };
  }

  /**
   * Save telemetry configuration
   */
  private async saveConfiguration(): Promise<void> {
    const config = vscode.workspace.getConfiguration('readme-to-cicd.telemetry');
    await config.update('enabled', this.configuration.enabled, vscode.ConfigurationTarget.Global);
  }

  /**
   * Initialize usage metrics
   */
  private initializeUsageMetrics(): UsageMetrics {
    return {
      commandExecutions: {},
      workflowGenerations: 0,
      frameworksDetected: {},
      errorsEncountered: 0,
      sessionDuration: 0,
      featuresUsed: []
    };
  }

  /**
   * Update usage metrics from event
   */
  private updateUsageMetrics(event: TelemetryEvent): void {
    // Update session duration
    this.usageMetrics.sessionDuration = Date.now() - this.sessionStartTime.getTime();
  }

  /**
   * Sanitize properties for privacy
   */
  private sanitizeProperties(properties?: Record<string, any>): Record<string, string | number | boolean> | undefined {
    if (!properties) return undefined;

    const sanitized: Record<string, string | number | boolean> = {};
    
    for (const [key, value] of Object.entries(properties)) {
      if (value === null || value === undefined) continue;
      
      if (this.configuration.anonymizeData && this.isSensitiveKey(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else {
        sanitized[key] = String(value);
      }
    }
    
    return sanitized;
  }

  /**
   * Check if key contains sensitive information
   */
  private isSensitiveKey(key: string): boolean {
    const sensitiveKeys = ['path', 'file', 'directory', 'user', 'name', 'email', 'token', 'key', 'secret'];
    return sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive));
  }

  /**
   * Anonymize error messages
   */
  private anonymizeError(message: string): string {
    if (!this.configuration.anonymizeData) return message;
    
    // Remove file paths
    let anonymized = message.replace(/[A-Za-z]:\\[^\\s]+/g, '[PATH]');
    anonymized = anonymized.replace(/\/[^\s]+/g, '[PATH]');
    
    // Remove potential user names
    anonymized = anonymized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');
    
    return anonymized;
  }

  /**
   * Track session start
   */
  private trackSessionStart(): void {
    this.trackEvent('session_started', {
      extensionVersion: this.getExtensionVersion(),
      vscodeVersion: vscode.version,
      platform: process.platform,
      nodeVersion: process.version
    });
  }

  /**
   * Track session end
   */
  private trackSessionEnd(): void {
    const sessionDuration = Date.now() - this.sessionStartTime.getTime();
    
    this.trackEvent('session_ended', {
      duration: Math.round(sessionDuration / 1000).toString(),
      commandsExecuted: Object.keys(this.usageMetrics.commandExecutions).length.toString(),
      workflowsGenerated: this.usageMetrics.workflowGenerations.toString(),
      errorsEncountered: this.usageMetrics.errorsEncountered.toString()
    }, {
      sessionDuration: Math.round(sessionDuration / 1000)
    });
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, 60000); // Flush every minute
  }

  /**
   * Flush events to storage/analytics
   */
  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    try {
      // In a real implementation, this would send events to an analytics service
      // For now, we'll just log them and store locally for debugging
      
      const events = [...this.eventQueue];
      this.eventQueue = [];
      
      // Store events locally for debugging (in development mode)
      if (process.env.NODE_ENV === 'development') {
        const existingEvents = this.context.globalState.get<TelemetryEvent[]>('telemetryEvents', []);
        const allEvents = [...existingEvents, ...events].slice(-1000); // Keep last 1000 events
        await this.context.globalState.update('telemetryEvents', allEvents);
      }
      
      this.logger.debug('Telemetry events flushed', { count: events.length });
    } catch (error) {
      this.logger.error('Failed to flush telemetry events', { error });
    }
  }

  /**
   * Get extension version
   */
  private getExtensionVersion(): string {
    try {
      const extension = vscode.extensions.getExtension('readme-to-cicd.readme-to-cicd');
      return extension?.packageJSON?.version || '0.0.0';
    } catch {
      return '0.0.0';
    }
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.trackSessionEnd();
    this.flushEvents();
    
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
  }
}