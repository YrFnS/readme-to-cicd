import { NotificationProvider, NotificationMessage, IntegrationCredentials } from '../types.js';

/**
 * Microsoft Teams notification provider
 */
export class TeamsProvider {
  private config: NotificationProvider | null = null;
  private credentials: IntegrationCredentials | null = null;
  private client: any = null;

  /**
   * Validate Teams configuration
   */
  async validateConfig(config: NotificationProvider): Promise<void> {
    if (!config.configuration.webhookUrl) {
      throw new Error('Teams configuration must include webhookUrl');
    }

    if (!config.configuration.webhookUrl.includes('office.com') && 
        !config.configuration.webhookUrl.includes('outlook.office365.com')) {
      throw new Error('Invalid Teams webhook URL format');
    }
  }

  /**
   * Initialize Teams client
   */
  async initialize(config: NotificationProvider, credentials?: IntegrationCredentials): Promise<void> {
    this.config = config;
    this.credentials = credentials;

    try {
      this.client = {
        webhookUrl: config.configuration.webhookUrl,
        template: config.configuration.template,
        connected: true
      };

      console.log(`Teams client initialized with webhook`);
    } catch (error) {
      throw new Error(`Failed to initialize Teams client: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cleanup Teams client
   */
  async cleanup(): Promise<void> {
    if (this.client) {
      this.client.connected = false;
      this.client = null;
      console.log('Teams client cleaned up');
    }
  }

  /**
   * Health check for Teams connection
   */
  async healthCheck(): Promise<boolean> {
    if (!this.client || !this.client.connected) {
      return false;
    }

    try {
      // In a real implementation, this would test the webhook connection
      return true;
    } catch (error) {
      console.error('Teams health check failed:', error);
      return false;
    }
  }  /**
   * Send message to Teams
   */
  async sendMessage(message: NotificationMessage): Promise<boolean> {
    if (!this.client || !this.config) {
      throw new Error('Teams provider not initialized');
    }

    try {
      // Format message for Teams using Adaptive Cards
      const teamsMessage = this.formatTeamsMessage(message);
      
      // In a real implementation, this would send via Teams webhook
      console.log(`Sending Teams message:`, teamsMessage);
      
      // Simulate successful send
      return true;
    } catch (error) {
      console.error('Failed to send Teams message:', error);
      return false;
    }
  }

  /**
   * Format message for Teams using Adaptive Cards
   */
  private formatTeamsMessage(message: NotificationMessage): any {
    const themeColor = this.getPriorityColor(message.priority);
    
    const teamsMessage = {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: message.title,
      themeColor: themeColor,
      sections: [
        {
          activityTitle: message.title,
          activitySubtitle: `Priority: ${message.priority}`,
          text: message.content,
          markdown: true
        }
      ]
    };

    // Add metadata as facts if present
    if (message.metadata && Object.keys(message.metadata).length > 0) {
      const facts = Object.entries(message.metadata).map(([key, value]) => ({
        name: key,
        value: String(value)
      }));

      teamsMessage.sections[0].facts = facts;
    }

    // Add recipients information
    if (message.recipients.length > 0) {
      teamsMessage.sections.push({
        activityTitle: 'Recipients',
        text: message.recipients.join(', ')
      });
    }

    return teamsMessage;
  }

  /**
   * Get color for priority level
   */
  private getPriorityColor(priority: string): string {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'FF0000'; // Red
      case 'high':
        return 'FF8C00'; // Orange
      case 'normal':
        return '0078D4'; // Blue
      case 'low':
        return '00BCF2'; // Light Blue
      default:
        return '0078D4'; // Default Blue
    }
  }

  /**
   * Send rich message with actions
   */
  async sendRichMessage(
    title: string,
    content: string,
    actions?: Array<{ name: string, url: string }>
  ): Promise<boolean> {
    if (!this.client || !this.config) {
      throw new Error('Teams provider not initialized');
    }

    try {
      const richMessage = {
        '@type': 'MessageCard',
        '@context': 'https://schema.org/extensions',
        summary: title,
        themeColor: '0078D4',
        sections: [
          {
            activityTitle: title,
            text: content,
            markdown: true
          }
        ],
        potentialAction: actions?.map(action => ({
          '@type': 'OpenUri',
          name: action.name,
          targets: [
            {
              os: 'default',
              uri: action.url
            }
          ]
        })) || []
      };

      console.log(`Sending rich Teams message:`, richMessage);
      return true;
    } catch (error) {
      console.error('Failed to send rich Teams message:', error);
      return false;
    }
  }

  /**
   * Send message with hero card
   */
  async sendHeroCard(
    title: string,
    subtitle: string,
    text: string,
    imageUrl?: string,
    actions?: Array<{ title: string, value: string }>
  ): Promise<boolean> {
    if (!this.client || !this.config) {
      throw new Error('Teams provider not initialized');
    }

    try {
      const heroCard = {
        '@type': 'MessageCard',
        '@context': 'https://schema.org/extensions',
        summary: title,
        sections: [
          {
            heroImage: imageUrl ? { image: imageUrl } : undefined,
            activityTitle: title,
            activitySubtitle: subtitle,
            text: text,
            markdown: true
          }
        ],
        potentialAction: actions?.map(action => ({
          '@type': 'HttpPOST',
          name: action.title,
          body: JSON.stringify({ action: action.value })
        })) || []
      };

      console.log(`Sending Teams hero card:`, heroCard);
      return true;
    } catch (error) {
      console.error('Failed to send Teams hero card:', error);
      return false;
    }
  }
}