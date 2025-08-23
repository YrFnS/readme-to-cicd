import {
  IntegrationConfig,
  NotificationProvider,
  NotificationMessage,
  SyncResult,
  IntegrationResult
} from '../types.js';
import { SlackProvider } from './slack-provider.js';
import { TeamsProvider } from './teams-provider.js';
import { EmailProvider } from './email-provider.js';
import { WebhookProvider } from './webhook-provider.js';

/**
 * Manager for notification integrations (Slack, Teams, Email, Webhooks)
 */
export class NotificationIntegrationManager {
  private providers = new Map<string, NotificationProvider>();
  private slackProvider: SlackProvider;
  private teamsProvider: TeamsProvider;
  private emailProvider: EmailProvider;
  private webhookProvider: WebhookProvider;

  constructor() {
    this.slackProvider = new SlackProvider();
    this.teamsProvider = new TeamsProvider();
    this.emailProvider = new EmailProvider();
    this.webhookProvider = new WebhookProvider();
  }

  /**
   * Validate notification integration configuration
   */
  async validateConfig(config: IntegrationConfig): Promise<void> {
    const notificationConfig = config.configuration as NotificationProvider;
    
    if (!notificationConfig.type) {
      throw new Error('Notification integration must specify type');
    }

    const validTypes = ['slack', 'teams', 'email', 'webhook'];
    if (!validTypes.includes(notificationConfig.type)) {
      throw new Error(`Invalid notification provider type: ${notificationConfig.type}`);
    }

    // Type-specific validation
    switch (notificationConfig.type) {
      case 'slack':
        await this.slackProvider.validateConfig(notificationConfig);
        break;
      case 'teams':
        await this.teamsProvider.validateConfig(notificationConfig);
        break;
      case 'email':
        await this.emailProvider.validateConfig(notificationConfig);
        break;
      case 'webhook':
        await this.webhookProvider.validateConfig(notificationConfig);
        break;
    }
  }

  /**
   * Initialize notification integration
   */
  async initialize(config: IntegrationConfig): Promise<void> {
    const notificationConfig = config.configuration as NotificationProvider;
    
    try {
      switch (notificationConfig.type) {
        case 'slack':
          await this.slackProvider.initialize(notificationConfig, config.credentials);
          break;
        case 'teams':
          await this.teamsProvider.initialize(notificationConfig, config.credentials);
          break;
        case 'email':
          await this.emailProvider.initialize(notificationConfig, config.credentials);
          break;
        case 'webhook':
          await this.webhookProvider.initialize(notificationConfig, config.credentials);
          break;
      }

      this.providers.set(config.id, notificationConfig);
      console.log(`Notification provider ${config.id} initialized successfully`);
    } catch (error) {
      throw new Error(`Failed to initialize notification provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }  /**
   * Cleanup notification integration
   */
  async cleanup(config: IntegrationConfig): Promise<void> {
    const notificationConfig = config.configuration as NotificationProvider;
    
    try {
      switch (notificationConfig.type) {
        case 'slack':
          await this.slackProvider.cleanup();
          break;
        case 'teams':
          await this.teamsProvider.cleanup();
          break;
        case 'email':
          await this.emailProvider.cleanup();
          break;
        case 'webhook':
          await this.webhookProvider.cleanup();
          break;
      }

      this.providers.delete(config.id);
      console.log(`Notification provider ${config.id} cleaned up successfully`);
    } catch (error) {
      console.error(`Error cleaning up notification provider ${config.id}:`, error);
    }
  }

  /**
   * Sync notification settings (not typically needed for notifications)
   */
  async sync(config: IntegrationConfig): Promise<SyncResult> {
    // Notifications don't typically sync data, but we can validate connectivity
    const startTime = Date.now();
    
    try {
      const isHealthy = await this.healthCheck(config);
      
      return {
        success: isHealthy,
        itemsSynced: 0,
        errors: isHealthy ? [] : ['Health check failed'],
        duration: Date.now() - startTime,
        lastSync: new Date()
      };
    } catch (error) {
      return {
        success: false,
        itemsSynced: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        duration: Date.now() - startTime,
        lastSync: new Date()
      };
    }
  }

  /**
   * Health check for notification provider
   */
  async healthCheck(config: IntegrationConfig): Promise<boolean> {
    const notificationConfig = this.providers.get(config.id);
    if (!notificationConfig) {
      return false;
    }

    try {
      switch (notificationConfig.type) {
        case 'slack':
          return await this.slackProvider.healthCheck();
        case 'teams':
          return await this.teamsProvider.healthCheck();
        case 'email':
          return await this.emailProvider.healthCheck();
        case 'webhook':
          return await this.webhookProvider.healthCheck();
        default:
          return false;
      }
    } catch (error) {
      console.error(`Health check failed for notification provider ${config.id}:`, error);
      return false;
    }
  }  /**
   * Send notification message
   */
  async sendNotification(providerId: string, message: NotificationMessage): Promise<IntegrationResult<void>> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return {
        success: false,
        error: `Notification provider ${providerId} not found`
      };
    }

    try {
      let success = false;

      switch (provider.type) {
        case 'slack':
          success = await this.slackProvider.sendMessage(message);
          break;
        case 'teams':
          success = await this.teamsProvider.sendMessage(message);
          break;
        case 'email':
          success = await this.emailProvider.sendMessage(message);
          break;
        case 'webhook':
          success = await this.webhookProvider.sendMessage(message);
          break;
      }

      if (success) {
        return { success: true };
      } else {
        return {
          success: false,
          error: 'Failed to send notification'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error sending notification'
      };
    }
  }

  /**
   * Send notification to multiple providers
   */
  async broadcastNotification(providerIds: string[], message: NotificationMessage): Promise<IntegrationResult<{ successful: string[], failed: string[] }>> {
    const successful: string[] = [];
    const failed: string[] = [];

    for (const providerId of providerIds) {
      const result = await this.sendNotification(providerId, message);
      if (result.success) {
        successful.push(providerId);
      } else {
        failed.push(providerId);
      }
    }

    return {
      success: failed.length === 0,
      data: { successful, failed },
      error: failed.length > 0 ? `Failed to send to: ${failed.join(', ')}` : undefined
    };
  }

  /**
   * Send notification with retry logic
   */
  async sendNotificationWithRetry(
    providerId: string, 
    message: NotificationMessage, 
    maxRetries: number = 3
  ): Promise<IntegrationResult<void>> {
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await this.sendNotification(providerId, message);
      
      if (result.success) {
        return result;
      }

      lastError = result.error;
      
      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return {
      success: false,
      error: `Failed after ${maxRetries} attempts. Last error: ${lastError}`
    };
  }

  /**
   * Get notification provider capabilities
   */
  getProviderCapabilities(providerId: string): { supportsRichText: boolean, supportsAttachments: boolean, supportsThreads: boolean } {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return { supportsRichText: false, supportsAttachments: false, supportsThreads: false };
    }

    switch (provider.type) {
      case 'slack':
        return { supportsRichText: true, supportsAttachments: true, supportsThreads: true };
      case 'teams':
        return { supportsRichText: true, supportsAttachments: true, supportsThreads: false };
      case 'email':
        return { supportsRichText: true, supportsAttachments: true, supportsThreads: false };
      case 'webhook':
        return { supportsRichText: false, supportsAttachments: false, supportsThreads: false };
      default:
        return { supportsRichText: false, supportsAttachments: false, supportsThreads: false };
    }
  }
}