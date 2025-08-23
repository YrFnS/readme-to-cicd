/**
 * Configuration Notifier Implementation
 * 
 * Provides real-time notifications for configuration changes with support for
 * multiple notification channels and filtering capabilities.
 */

import { EventEmitter } from 'events';
import {
  ConfigurationChange,
  ConfigurationNotification,
  NotificationChannel,
  NotificationFilter
} from '../types/configuration-types.js';

export interface WebhookNotificationSettings {
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers: Record<string, string>;
  timeout: number;
  retries: number;
}

export interface EmailNotificationSettings {
  smtpHost: string;
  smtpPort: number;
  username: string;
  password: string;
  from: string;
  to: string[];
  subject: string;
}

export interface SlackNotificationSettings {
  webhookUrl: string;
  channel: string;
  username: string;
  iconEmoji: string;
}

export interface TeamsNotificationSettings {
  webhookUrl: string;
  title: string;
  themeColor: string;
}

export class ConfigurationNotifier extends EventEmitter {
  private channels: Map<string, NotificationChannel>;
  private notificationQueue: ConfigurationNotification[];
  private processing: boolean;
  private retryAttempts: Map<string, number>;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;

  constructor() {
    super();
    this.channels = new Map();
    this.notificationQueue = [];
    this.processing = false;
    this.retryAttempts = new Map();

    // Start processing queue
    this.startQueueProcessor();
  }

  /**
   * Add notification channel
   */
  async addChannel(channel: NotificationChannel): Promise<void> {
    // Validate channel configuration
    await this.validateChannelConfig(channel);
    
    this.channels.set(channel.id, channel);
    this.emit('channelAdded', channel);
  }

  /**
   * Remove notification channel
   */
  async removeChannel(channelId: string): Promise<void> {
    const channel = this.channels.get(channelId);
    if (channel) {
      this.channels.delete(channelId);
      this.emit('channelRemoved', channel);
    }
  }

  /**
   * Update notification channel
   */
  async updateChannel(channelId: string, updates: Partial<NotificationChannel>): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Notification channel '${channelId}' not found`);
    }

    const updatedChannel = { ...channel, ...updates };
    await this.validateChannelConfig(updatedChannel);
    
    this.channels.set(channelId, updatedChannel);
    this.emit('channelUpdated', updatedChannel);
  }

  /**
   * Get all notification channels
   */
  getChannels(): NotificationChannel[] {
    return Array.from(this.channels.values());
  }

  /**
   * Get notification channel by ID
   */
  getChannel(channelId: string): NotificationChannel | undefined {
    return this.channels.get(channelId);
  }

  /**
   * Notify configuration change
   */
  async notifyChange(change: ConfigurationChange): Promise<void> {
    const notification: ConfigurationNotification = {
      type: 'change',
      key: change.key,
      environment: change.environment,
      message: `Configuration '${change.key}' changed from '${JSON.stringify(change.oldValue)}' to '${JSON.stringify(change.newValue)}'`,
      timestamp: change.timestamp,
      metadata: {
        oldValue: change.oldValue,
        newValue: change.newValue,
        source: change.source
      }
    };

    await this.notify(notification);
  }

  /**
   * Send notification to all matching channels
   */
  async notify(notification: ConfigurationNotification): Promise<void> {
    // Add to queue for processing
    this.notificationQueue.push(notification);
    
    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Send test notification to a specific channel
   */
  async testChannel(channelId: string): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Notification channel '${channelId}' not found`);
    }

    const testNotification: ConfigurationNotification = {
      type: 'change',
      key: 'test',
      environment: 'test',
      message: 'This is a test notification from the configuration management system',
      timestamp: new Date(),
      metadata: { test: true }
    };

    await this.sendToChannel(channel, testNotification);
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.notificationQueue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      while (this.notificationQueue.length > 0) {
        const notification = this.notificationQueue.shift()!;
        await this.processNotification(notification);
      }
    } catch (error) {
      console.error('Error processing notification queue:', error);
    } finally {
      this.processing = false;
    }
  }

  private async processNotification(notification: ConfigurationNotification): Promise<void> {
    const matchingChannels = this.getMatchingChannels(notification);
    
    const promises = matchingChannels.map(channel => 
      this.sendToChannelWithRetry(channel, notification)
    );

    await Promise.allSettled(promises);
  }

  private getMatchingChannels(notification: ConfigurationNotification): NotificationChannel[] {
    return Array.from(this.channels.values()).filter(channel => 
      this.shouldNotifyChannel(channel, notification)
    );
  }

  private shouldNotifyChannel(channel: NotificationChannel, notification: ConfigurationNotification): boolean {
    // Check filters
    for (const filter of channel.filters) {
      if (!this.matchesFilter(filter, notification)) {
        return false;
      }
    }
    return true;
  }

  private matchesFilter(filter: NotificationFilter, notification: ConfigurationNotification): boolean {
    switch (filter.type) {
      case 'key-pattern':
        const keyMatches = new RegExp(filter.pattern).test(notification.key);
        return filter.include ? keyMatches : !keyMatches;
      
      case 'environment':
        const envMatches = notification.environment === filter.pattern;
        return filter.include ? envMatches : !envMatches;
      
      case 'severity':
        const severityMatches = notification.type === filter.pattern;
        return filter.include ? severityMatches : !severityMatches;
      
      default:
        return true;
    }
  }

  private async sendToChannelWithRetry(channel: NotificationChannel, notification: ConfigurationNotification): Promise<void> {
    const retryKey = `${channel.id}-${notification.timestamp.getTime()}`;
    let attempts = this.retryAttempts.get(retryKey) || 0;

    try {
      await this.sendToChannel(channel, notification);
      this.retryAttempts.delete(retryKey);
    } catch (error) {
      attempts++;
      this.retryAttempts.set(retryKey, attempts);

      if (attempts < this.maxRetries) {
        // Schedule retry
        setTimeout(() => {
          this.sendToChannelWithRetry(channel, notification);
        }, this.retryDelay * attempts);
      } else {
        // Max retries reached
        console.error(`Failed to send notification to channel '${channel.id}' after ${this.maxRetries} attempts:`, error);
        this.retryAttempts.delete(retryKey);
        this.emit('notificationFailed', { channel, notification, error });
      }
    }
  }

  private async sendToChannel(channel: NotificationChannel, notification: ConfigurationNotification): Promise<void> {
    switch (channel.type) {
      case 'webhook':
        await this.sendWebhookNotification(channel, notification);
        break;
      case 'email':
        await this.sendEmailNotification(channel, notification);
        break;
      case 'slack':
        await this.sendSlackNotification(channel, notification);
        break;
      case 'teams':
        await this.sendTeamsNotification(channel, notification);
        break;
      default:
        throw new Error(`Unsupported notification channel type: ${channel.type}`);
    }

    this.emit('notificationSent', { channel, notification });
  }

  private async sendWebhookNotification(channel: NotificationChannel, notification: ConfigurationNotification): Promise<void> {
    const settings = channel.settings as WebhookNotificationSettings;
    
    const payload = {
      type: notification.type,
      key: notification.key,
      environment: notification.environment,
      message: notification.message,
      timestamp: notification.timestamp.toISOString(),
      metadata: notification.metadata
    };

    const response = await fetch(settings.url, {
      method: settings.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...settings.headers
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(settings.timeout || 5000)
    });

    if (!response.ok) {
      throw new Error(`Webhook notification failed: ${response.status} ${response.statusText}`);
    }
  }

  private async sendEmailNotification(channel: NotificationChannel, notification: ConfigurationNotification): Promise<void> {
    const settings = channel.settings as EmailNotificationSettings;
    
    // This is a simplified implementation - in practice, you'd use a proper email library
    const emailContent = this.formatEmailContent(notification);
    
    // Placeholder for actual email sending logic
    console.log(`Sending email notification to ${settings.to.join(', ')}: ${emailContent}`);
    
    // In a real implementation, you would use nodemailer or similar:
    // const transporter = nodemailer.createTransporter({ ... });
    // await transporter.sendMail({ ... });
  }

  private async sendSlackNotification(channel: NotificationChannel, notification: ConfigurationNotification): Promise<void> {
    const settings = channel.settings as SlackNotificationSettings;
    
    const payload = {
      channel: settings.channel,
      username: settings.username || 'Configuration Manager',
      icon_emoji: settings.iconEmoji || ':gear:',
      text: notification.message,
      attachments: [
        {
          color: this.getSlackColor(notification.type),
          fields: [
            { title: 'Key', value: notification.key, short: true },
            { title: 'Environment', value: notification.environment, short: true },
            { title: 'Timestamp', value: notification.timestamp.toISOString(), short: true },
            { title: 'Type', value: notification.type, short: true }
          ]
        }
      ]
    };

    const response = await fetch(settings.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Slack notification failed: ${response.status} ${response.statusText}`);
    }
  }

  private async sendTeamsNotification(channel: NotificationChannel, notification: ConfigurationNotification): Promise<void> {
    const settings = channel.settings as TeamsNotificationSettings;
    
    const payload = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: settings.themeColor || '0076D7',
      summary: notification.message,
      sections: [
        {
          activityTitle: settings.title || 'Configuration Change',
          activitySubtitle: notification.message,
          facts: [
            { name: 'Key', value: notification.key },
            { name: 'Environment', value: notification.environment },
            { name: 'Type', value: notification.type },
            { name: 'Timestamp', value: notification.timestamp.toISOString() }
          ]
        }
      ]
    };

    const response = await fetch(settings.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Teams notification failed: ${response.status} ${response.statusText}`);
    }
  }

  private async validateChannelConfig(channel: NotificationChannel): Promise<void> {
    switch (channel.type) {
      case 'webhook':
        this.validateWebhookConfig(channel.settings as WebhookNotificationSettings);
        break;
      case 'email':
        this.validateEmailConfig(channel.settings as EmailNotificationSettings);
        break;
      case 'slack':
        this.validateSlackConfig(channel.settings as SlackNotificationSettings);
        break;
      case 'teams':
        this.validateTeamsConfig(channel.settings as TeamsNotificationSettings);
        break;
      default:
        throw new Error(`Unsupported notification channel type: ${channel.type}`);
    }
  }

  private validateWebhookConfig(settings: WebhookNotificationSettings): void {
    if (!settings.url) {
      throw new Error('Webhook URL is required');
    }
    
    try {
      new URL(settings.url);
    } catch {
      throw new Error('Invalid webhook URL format');
    }
  }

  private validateEmailConfig(settings: EmailNotificationSettings): void {
    if (!settings.smtpHost) {
      throw new Error('SMTP host is required');
    }
    if (!settings.from) {
      throw new Error('From email address is required');
    }
    if (!settings.to || settings.to.length === 0) {
      throw new Error('At least one recipient email address is required');
    }
  }

  private validateSlackConfig(settings: SlackNotificationSettings): void {
    if (!settings.webhookUrl) {
      throw new Error('Slack webhook URL is required');
    }
    
    try {
      new URL(settings.webhookUrl);
    } catch {
      throw new Error('Invalid Slack webhook URL format');
    }
  }

  private validateTeamsConfig(settings: TeamsNotificationSettings): void {
    if (!settings.webhookUrl) {
      throw new Error('Teams webhook URL is required');
    }
    
    try {
      new URL(settings.webhookUrl);
    } catch {
      throw new Error('Invalid Teams webhook URL format');
    }
  }

  private formatEmailContent(notification: ConfigurationNotification): string {
    return `
Configuration Change Notification

Key: ${notification.key}
Environment: ${notification.environment}
Type: ${notification.type}
Message: ${notification.message}
Timestamp: ${notification.timestamp.toISOString()}

Metadata:
${JSON.stringify(notification.metadata, null, 2)}
    `.trim();
  }

  private getSlackColor(type: string): string {
    switch (type) {
      case 'change': return 'good';
      case 'validation-error': return 'danger';
      case 'rollback': return 'warning';
      default: return '#439FE0';
    }
  }

  private startQueueProcessor(): void {
    // Process queue every 100ms
    setInterval(() => {
      if (!this.processing && this.notificationQueue.length > 0) {
        this.processQueue();
      }
    }, 100);
  }
}