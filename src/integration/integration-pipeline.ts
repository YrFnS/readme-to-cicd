/**
 * Integration Pipeline
 * 
 * Simple integration pipeline that orchestrates the core components
 * with support for API management and webhook notifications.
 */

import { ComponentOrchestrator } from '../cli/lib/component-orchestrator';
import { Logger } from '../cli/lib/logger';
import { ErrorHandler } from '../cli/lib/error-handler';
import { WebhookManager } from './webhooks/webhook-manager';
import type { WebhookConfig, WebhookEvent } from './webhooks/types';

/**
 * Integration pipeline that orchestrates the core components
 * 
 * This is a wrapper around ComponentOrchestrator with additional
 * integration features like webhook notifications.
 */
export class IntegrationPipeline {
  private orchestrator: ComponentOrchestrator;
  private webhookManager?: WebhookManager;
  private logger: Logger;

  constructor(webhookConfig?: WebhookConfig) {
    this.logger = new Logger('info');
    const errorHandler = new ErrorHandler(this.logger);
    
    this.orchestrator = new ComponentOrchestrator(this.logger, errorHandler, {
      enableRecovery: true,
      maxRetries: 2,
      timeoutMs: 30000,
      validateInputs: true,
      enablePerformanceTracking: false // Disable for simple integration
    });

    if (webhookConfig) {
      this.webhookManager = new WebhookManager(webhookConfig);
    }
  }

  /**
   * Execute the complete README-to-CICD pipeline
   * 
   * @param readmePath Path to README file
   * @param outputDir Output directory for generated workflows
   * @param options Additional options
   */
  async execute(
    readmePath: string,
    outputDir?: string,
    options: {
      workflowType?: ('ci' | 'cd' | 'release' | 'security' | 'performance' | 'maintenance')[];
      dryRun?: boolean;
      interactive?: boolean;
      emitEvents?: boolean;
    } = {}
  ) {
    const startTime = Date.now();

    try {
      // Emit pipeline started event
      if (options.emitEvents && this.webhookManager) {
        await this.emitEvent('pipeline.started', {
          readmePath,
          outputDir,
          options,
          timestamp: new Date()
        });
      }

      const cliOptions: import('../cli/lib/types').CLIOptions = {
        command: 'generate' as const,
        readmePath,
        ...(outputDir && { outputDir }),
        ...(options.workflowType && { workflowType: options.workflowType }),
        dryRun: options.dryRun || false,
        interactive: options.interactive || false,
        verbose: false,
        debug: false,
        quiet: false
      };

      const result = await this.orchestrator.executeWorkflow(cliOptions);
      const duration = Date.now() - startTime;

      // Emit pipeline completed event
      if (options.emitEvents && this.webhookManager) {
        await this.emitEvent('pipeline.completed', {
          readmePath,
          result,
          duration,
          timestamp: new Date()
        });
      }

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;

      // Emit pipeline failed event
      if (options.emitEvents && this.webhookManager) {
        await this.emitEvent('pipeline.failed', {
          readmePath,
          error: error.message,
          duration,
          timestamp: new Date()
        });
      }

      throw error;
    }
  }

  /**
   * Get the webhook manager instance
   */
  getWebhookManager(): WebhookManager | undefined {
    return this.webhookManager;
  }

  /**
   * Emit a webhook event
   */
  private async emitEvent(type: string, data: any): Promise<void> {
    if (!this.webhookManager) {
      return;
    }

    const event: WebhookEvent = {
      id: this.generateEventId(),
      type,
      data,
      timestamp: new Date(),
      source: 'integration-pipeline',
      version: '1.0.0'
    };

    await this.webhookManager.emitEvent(event);
  }

  /**
   * Generate a unique event ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Create a new integration pipeline instance
 */
export function createIntegrationPipeline(webhookConfig?: WebhookConfig): IntegrationPipeline {
  return new IntegrationPipeline(webhookConfig);
}