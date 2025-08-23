import { NotificationProvider, NotificationMessage, IntegrationCredentials } from '../types.js';

/**
 * Email notification provider
 */
export class EmailProvider {
  private config: NotificationProvider | null = null;
  private credentials: IntegrationCredentials | null = null;
  private client: any = null;

  /**
   * Validate Email configuration
   */
  async validateConfig(config: NotificationProvider): Promise<void> {
    if (!config.configuration.smtpServer) {
      throw new Error('Email configuration must include smtpServer');
    }

    if (!config.configuration.fromAddress) {
      throw new Error('Email configuration must include fromAddress');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(config.configuration.fromAddress)) {
      throw new Error('Invalid fromAddress email format');
    }
  }

  /**
   * Initialize Email client
   */
  async initialize(config: NotificationProvider, credentials?: IntegrationCredentials): Promise<void> {
    this.config = config;
    this.credentials = credentials;

    try {
      // In a real implementation, this would use nodemailer or similar
      this.client = {
        smtpServer: config.configuration.smtpServer,
        fromAddress: config.configuration.fromAddress,
        template: config.configuration.template,
        port: 587, // Default SMTP port
        secure: false, // Use TLS
        connected: true
      };

      console.log(`Email client initialized with SMTP server ${config.configuration.smtpServer}`);
    } catch (error) {
      throw new Error(`Failed to initialize Email client: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cleanup Email client
   */
  async cleanup(): Promise<void> {
    if (this.client) {
      this.client.connected = false;
      this.client = null;
      console.log('Email client cleaned up');
    }
  }

  /**
   * Health check for Email connection
   */
  async healthCheck(): Promise<boolean> {
    if (!this.client || !this.client.connected) {
      return false;
    }

    try {
      // In a real implementation, this would test SMTP connection
      return true;
    } catch (error) {
      console.error('Email health check failed:', error);
      return false;
    }
  }  /**
   * Send email message
   */
  async sendMessage(message: NotificationMessage): Promise<boolean> {
    if (!this.client || !this.config) {
      throw new Error('Email provider not initialized');
    }

    try {
      // Format email message
      const emailMessage = this.formatEmailMessage(message);
      
      // In a real implementation, this would send via SMTP
      console.log(`Sending email message:`, emailMessage);
      
      // Simulate successful send
      return true;
    } catch (error) {
      console.error('Failed to send email message:', error);
      return false;
    }
  }

  /**
   * Format message for email
   */
  private formatEmailMessage(message: NotificationMessage): any {
    const priorityPrefix = this.getPriorityPrefix(message.priority);
    
    const emailMessage = {
      from: this.client.fromAddress,
      to: message.recipients.join(', '),
      subject: `${priorityPrefix}${message.title}`,
      html: this.generateHtmlContent(message),
      text: this.generateTextContent(message)
    };

    return emailMessage;
  }

  /**
   * Generate HTML content for email
   */
  private generateHtmlContent(message: NotificationMessage): string {
    const priorityColor = this.getPriorityColor(message.priority);
    
    let html = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="border-left: 4px solid ${priorityColor}; padding-left: 20px; margin-bottom: 20px;">
              <h2 style="color: ${priorityColor}; margin: 0 0 10px 0;">${message.title}</h2>
              <p style="margin: 0; color: #666; font-size: 14px;">Priority: ${message.priority.toUpperCase()}</p>
            </div>
            
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
              <p style="margin: 0; white-space: pre-wrap;">${message.content}</p>
            </div>
    `;

    // Add metadata table if present
    if (message.metadata && Object.keys(message.metadata).length > 0) {
      html += `
        <div style="margin-bottom: 20px;">
          <h3 style="color: #333; margin-bottom: 10px;">Additional Information</h3>
          <table style="width: 100%; border-collapse: collapse;">
      `;
      
      Object.entries(message.metadata).forEach(([key, value]) => {
        html += `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background-color: #f5f5f5; font-weight: bold;">${key}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${value}</td>
          </tr>
        `;
      });
      
      html += `
          </table>
        </div>
      `;
    }

    html += `
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
              <p>This message was sent by the Integration Hub notification system.</p>
              <p>Timestamp: ${new Date().toISOString()}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return html;
  }

  /**
   * Generate plain text content for email
   */
  private generateTextContent(message: NotificationMessage): string {
    let text = `${message.title}\n`;
    text += `Priority: ${message.priority.toUpperCase()}\n\n`;
    text += `${message.content}\n\n`;

    if (message.metadata && Object.keys(message.metadata).length > 0) {
      text += `Additional Information:\n`;
      Object.entries(message.metadata).forEach(([key, value]) => {
        text += `${key}: ${value}\n`;
      });
      text += `\n`;
    }

    text += `---\n`;
    text += `This message was sent by the Integration Hub notification system.\n`;
    text += `Timestamp: ${new Date().toISOString()}\n`;

    return text;
  }

  /**
   * Get priority prefix for subject line
   */
  private getPriorityPrefix(priority: string): string {
    switch (priority.toLowerCase()) {
      case 'critical':
        return '[CRITICAL] ';
      case 'high':
        return '[HIGH] ';
      case 'normal':
        return '';
      case 'low':
        return '[INFO] ';
      default:
        return '';
    }
  }

  /**
   * Get color for priority level
   */
  private getPriorityColor(priority: string): string {
    switch (priority.toLowerCase()) {
      case 'critical':
        return '#dc3545'; // Red
      case 'high':
        return '#fd7e14'; // Orange
      case 'normal':
        return '#007bff'; // Blue
      case 'low':
        return '#28a745'; // Green
      default:
        return '#007bff'; // Default Blue
    }
  }

  /**
   * Send email with attachments
   */
  async sendEmailWithAttachments(
    message: NotificationMessage,
    attachments: Array<{ filename: string, content: Buffer | string, contentType?: string }>
  ): Promise<boolean> {
    if (!this.client || !this.config) {
      throw new Error('Email provider not initialized');
    }

    try {
      const emailMessage = {
        ...this.formatEmailMessage(message),
        attachments: attachments.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType || 'application/octet-stream'
        }))
      };

      console.log(`Sending email with ${attachments.length} attachments:`, emailMessage);
      return true;
    } catch (error) {
      console.error('Failed to send email with attachments:', error);
      return false;
    }
  }
}