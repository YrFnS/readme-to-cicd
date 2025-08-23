import { NotificationProvider, NotificationMessage, IntegrationCredentials } from '../types.js';

/**
 * Webhook notification provider for generic HTTP endpoints
 */
export class WebhookProvider {
  private config: NotificationProvider | null = null;
  private credentials: IntegrationCredentials | null = null;
  private client: any = null;

  /**
   * Validate Webhook configuration
   */
  async validateConfig(config: NotificationProvider): Promise<void> {
    if (!config.configuration.webhookUrl) {
      throw new Error('Webhook configuration must include webhookUrl');
    }

    // Validate URL format
    try {
      new URL(config.configuration.webhookUrl);
    } catch (error) {
      throw new Error('Invalid webhook URL format');
    }
  }

  /**
   * Initialize Webhook client
   */
  async initialize(config: NotificationProvider, credentials?: IntegrationCredentials): Promise<void> {
    this.config = config;
    this.credentials = credentials;

    try {
      this.client = {
        webhookUrl: config.configuration.webhookUrl,
        template: config.configuration.template,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Integration-Hub/1.0'
        },
        connected: true
      };

      // Add authentication headers if credentials provided
      if (credentials) {
        switch (credentials.type) {
          case 'api-key':
            this.client.headers['Authorization'] = `Bearer ${credentials.data.apiKey}`;
            break;
          case 'basic-auth':
            const auth = Buffer.from(`${credentials.data.username}:${credentials.data.password}`).toString('base64');
            this.client.headers['Authorization'] = `Basic ${auth}`;
            break;
        }
      }

      console.log(`Webhook client initialized for ${config.configuration.webhookUrl}`);
    } catch (error) {
      throw new Error(`Failed to initialize Webhook client: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cleanup Webhook client
   */
  async cleanup(): Promise<void> {
    if (this.client) {
      this.client.connected = false;
      this.client = null;
      console.log('Webhook client cleaned up');
    }
  }

  /**
   * Health check for Webhook connection
   */
  async healthCheck(): Promise<boolean> {
    if (!this.client || !this.client.connected) {
      return false;
    }

    try {
      // In a real implementation, this would send a test request to the webhook
      return true;
    } catch (error) {
      console.error('Webhook health check failed:', error);
      return false;
    }
  }  /**
   * Send message via webhook
   */
  async sendMessage(message: NotificationMessage): Promise<boolean> {
    if (!this.client || !this.config) {
      throw new Error('Webhook provider not initialized');
    }

    try {
      // Format message for webhook
      const webhookPayload = this.formatWebhookPayload(message);
      
      // In a real implementation, this would make HTTP POST request
      console.log(`Sending webhook message to ${this.client.webhookUrl}:`, webhookPayload);
      
      // Simulate successful send
      return true;
    } catch (error) {
      console.error('Failed to send webhook message:', error);
      return false;
    }
  }

  /**
   * Format message for webhook payload
   */
  private formatWebhookPayload(message: NotificationMessage): any {
    const payload = {
      timestamp: new Date().toISOString(),
      event_type: 'notification',
      priority: message.priority,
      title: message.title,
      content: message.content,
      recipients: message.recipients,
      metadata: message.metadata || {}
    };

    // Apply template if configured
    if (this.client.template) {
      return this.applyTemplate(payload);
    }

    return payload;
  }

  /**
   * Apply custom template to payload
   */
  private applyTemplate(payload: any): any {
    // In a real implementation, this would use a templating engine
    // For now, just return the payload with template wrapper
    return {
      template: this.client.template,
      data: payload
    };
  }

  /**
   * Send custom webhook payload
   */
  async sendCustomPayload(payload: any): Promise<boolean> {
    if (!this.client || !this.config) {
      throw new Error('Webhook provider not initialized');
    }

    try {
      console.log(`Sending custom webhook payload to ${this.client.webhookUrl}:`, payload);
      
      // In a real implementation, this would make HTTP POST request
      // const response = await fetch(this.client.webhookUrl, {
      //   method: 'POST',
      //   headers: this.client.headers,
      //   body: JSON.stringify(payload)
      // });
      // return response.ok;
      
      return true;
    } catch (error) {
      console.error('Failed to send custom webhook payload:', error);
      return false;
    }
  }

  /**
   * Send webhook with retry logic
   */
  async sendWithRetry(message: NotificationMessage, maxRetries: number = 3): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const success = await this.sendMessage(message);
        if (success) {
          return true;
        }
      } catch (error) {
        console.error(`Webhook attempt ${attempt} failed:`, error);
      }

      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return false;
  }

  /**
   * Send batch of messages
   */
  async sendBatch(messages: NotificationMessage[]): Promise<{ successful: number, failed: number }> {
    if (!this.client || !this.config) {
      throw new Error('Webhook provider not initialized');
    }

    let successful = 0;
    let failed = 0;

    const batchPayload = {
      timestamp: new Date().toISOString(),
      event_type: 'batch_notification',
      messages: messages.map(msg => this.formatWebhookPayload(msg))
    };

    try {
      console.log(`Sending batch webhook with ${messages.length} messages:`, batchPayload);
      
      // In a real implementation, this would send the batch
      successful = messages.length;
    } catch (error) {
      console.error('Failed to send webhook batch:', error);
      failed = messages.length;
    }

    return { successful, failed };
  }

  /**
   * Test webhook connectivity
   */
  async testConnection(): Promise<{ success: boolean, responseTime: number, error?: string }> {
    if (!this.client || !this.config) {
      return { success: false, responseTime: 0, error: 'Webhook provider not initialized' };
    }

    const startTime = Date.now();

    try {
      const testPayload = {
        timestamp: new Date().toISOString(),
        event_type: 'test',
        message: 'Integration Hub connectivity test'
      };

      console.log(`Testing webhook connectivity to ${this.client.webhookUrl}`);
      
      // In a real implementation, this would make actual HTTP request
      // const response = await fetch(this.client.webhookUrl, {
      //   method: 'POST',
      //   headers: this.client.headers,
      //   body: JSON.stringify(testPayload)
      // });

      const responseTime = Date.now() - startTime;
      return { success: true, responseTime };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}