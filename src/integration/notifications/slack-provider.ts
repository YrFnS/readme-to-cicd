import { NotificationProvider, NotificationMessage, IntegrationCredentials } from '../types.js';

/**
 * Slack notification provider
 */
export class SlackProvider {
  private config: NotificationProvider | null = null;
  private credentials: IntegrationCredentials | null = null;
  private client: any = null;

  /**
   * Validate Slack configuration
   */
  async validateConfig(config: NotificationProvider): Promise<void> {
    if (!config.configuration.webhookUrl && !config.configuration.channel) {
      throw new Error('Slack configuration must include either webhookUrl or channel');
    }

    if (config.configuration.webhookUrl && !config.configuration.webhookUrl.includes('hooks.slack.com')) {
      throw new Error('Invalid Slack webhook URL format');
    }
  }

  /**
   * Initialize Slack client
   */
  async initialize(config: NotificationProvider, credentials?: IntegrationCredentials): Promise<void> {
    this.config = config;
    this.credentials = credentials;

    try {
      // In a real implementation, this would use @slack/web-api or similar
      this.client = {
        webhookUrl: config.configuration.webhookUrl,
        channel: config.configuration.channel || '#general',
        template: config.configuration.template,
        connected: true
      };

      console.log(`Slack client initialized for channel ${this.client.channel}`);
    } catch (error) {
      throw new Error(`Failed to initialize Slack client: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cleanup Slack client
   */
  async cleanup(): Promise<void> {
    if (this.client) {
      this.client.connected = false;
      this.client = null;
      console.log('Slack client cleaned up');
    }
  }

  /**
   * Health check for Slack connection
   */
  async healthCheck(): Promise<boolean> {
    if (!this.client || !this.client.connected) {
      return false;
    }

    try {
      // In a real implementation, this would test the webhook or API connection
      return true;
    } catch (error) {
      console.error('Slack health check failed:', error);
      return false;
    }
  }  /**
   * Send message to Slack
   */
  async sendMessage(message: NotificationMessage): Promise<boolean> {
    if (!this.client || !this.config) {
      throw new Error('Slack provider not initialized');
    }

    try {
      // Format message for Slack
      const slackMessage = this.formatSlackMessage(message);
      
      // In a real implementation, this would send via webhook or Slack API
      console.log(`Sending Slack message to ${this.client.channel}:`, slackMessage);
      
      // Simulate successful send
      return true;
    } catch (error) {
      console.error('Failed to send Slack message:', error);
      return false;
    }
  }

  /**
   * Format message for Slack
   */
  private formatSlackMessage(message: NotificationMessage): any {
    const priorityEmoji = this.getPriorityEmoji(message.priority);
    
    const slackMessage = {
      channel: this.client.channel,
      text: `${priorityEmoji} ${message.title}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${priorityEmoji} ${message.title}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: message.content
          }
        }
      ]
    };

    // Add metadata as fields if present
    if (message.metadata && Object.keys(message.metadata).length > 0) {
      const fields = Object.entries(message.metadata).map(([key, value]) => ({
        type: 'mrkdwn',
        text: `*${key}:* ${value}`
      }));

      slackMessage.blocks.push({
        type: 'section',
        fields: fields.slice(0, 10) // Slack limits fields
      });
    }

    // Add recipients as context if specified
    if (message.recipients.length > 0) {
      slackMessage.blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Recipients: ${message.recipients.join(', ')}`
          }
        ]
      });
    }

    return slackMessage;
  }

  /**
   * Get emoji for priority level
   */
  private getPriorityEmoji(priority: string): string {
    switch (priority.toLowerCase()) {
      case 'critical':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'normal':
        return 'ℹ️';
      case 'low':
        return '📝';
      default:
        return 'ℹ️';
    }
  }

  /**
   * Send rich message with attachments
   */
  async sendRichMessage(
    title: string,
    content: string,
    color: string = 'good',
    fields?: Array<{ title: string, value: string, short?: boolean }>
  ): Promise<boolean> {
    if (!this.client || !this.config) {
      throw new Error('Slack provider not initialized');
    }

    try {
      const richMessage = {
        channel: this.client.channel,
        text: title,
        attachments: [
          {
            color: color,
            title: title,
            text: content,
            fields: fields || [],
            footer: 'Integration Hub',
            ts: Math.floor(Date.now() / 1000)
          }
        ]
      };

      console.log(`Sending rich Slack message:`, richMessage);
      return true;
    } catch (error) {
      console.error('Failed to send rich Slack message:', error);
      return false;
    }
  }

  /**
   * Send message to thread
   */
  async sendThreadMessage(threadTs: string, message: NotificationMessage): Promise<boolean> {
    if (!this.client || !this.config) {
      throw new Error('Slack provider not initialized');
    }

    try {
      const threadMessage = {
        channel: this.client.channel,
        thread_ts: threadTs,
        text: message.content
      };

      console.log(`Sending Slack thread message:`, threadMessage);
      return true;
    } catch (error) {
      console.error('Failed to send Slack thread message:', error);
      return false;
    }
  }
}