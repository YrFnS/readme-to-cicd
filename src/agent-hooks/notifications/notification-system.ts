import {
  NotificationChannel,
  NotificationPriority,
  NotificationType,
  NotificationMessage,
  NotificationDelivery,
  DeliveryStatus,
  NotificationConfig,
  NotificationTemplate,
  NotificationMetrics,
  SlackNotification,
  EmailNotification,
  WebhookNotification,
  NotificationRecipient,
  NotificationQueue,
  ExternalIntegration,
  IntegrationResult,
  NotificationRule
} from '../types/notifications';
import { RepositoryInfo } from '../types';
import { ErrorHandler } from '../errors/error-handler';
import { PerformanceMonitor } from '../performance/performance-monitor';

export class NotificationSystem {
  private config: NotificationConfig;
  private errorHandler: ErrorHandler;
  private performanceMonitor: PerformanceMonitor;
  private templates: Map<string, NotificationTemplate>;
  private integrations: Map<string, ExternalIntegration>;
  private rules: Map<string, NotificationRule>;
  private queue: Map<string, NotificationQueue>;
  private deliveryHistory: Map<string, NotificationDelivery[]>;

  constructor(
    config: NotificationConfig,
    errorHandler: ErrorHandler,
    performanceMonitor: PerformanceMonitor
  ) {
    this.config = config;
    this.errorHandler = errorHandler;
    this.performanceMonitor = performanceMonitor;
    this.templates = new Map();
    this.integrations = new Map();
    this.rules = new Map();
    this.queue = new Map();
    this.deliveryHistory = new Map();

    this.initializeTemplates();
    this.initializeIntegrations();
  }

  async sendNotification(
    type: NotificationType,
    priority: NotificationPriority,
    subject: string,
    body: string,
    recipients: NotificationRecipient[],
    repository?: RepositoryInfo,
    data?: Record<string, any>,
    template?: string
  ): Promise<string[]> {
    const startTime = Date.now();

    try {
      // Create notification message
      const message: NotificationMessage = {
        id: this.generateId('msg'),
        type,
        priority,
        subject,
        body,
        recipients,
        repository: repository!,
        data: data || {},
        timestamp: new Date(),
        template: template || 'default'
      };

      // Apply notification rules
      const shouldSend = await this.evaluateRules(message);
      if (!shouldSend) {
        return [];
      }

      // Process template if specified
      if (template) {
        message.subject = this.processTemplate(message.subject, message);
        message.body = this.processTemplate(message.body, message);
      }

      // Send to all channels
      const deliveryIds: string[] = [];
      for (const recipient of message.recipients) {
        try {
          const deliveryId = await this.deliverToChannel(message, recipient);
          deliveryIds.push(deliveryId);
        } catch (error) {
          await this.errorHandler.handleError(error as Error, {
            component: 'notification-system',
            operation: 'send_notification'
          });
        }
      }

      // Record performance metrics
      const duration = Date.now() - startTime;
      // Note: Using automation processing method as notification-specific method doesn't exist
      this.performanceMonitor.recordAutomationProcessing(
        message.id,
        duration,
        [],
        deliveryIds.length,
        true
      );

      return deliveryIds;

    } catch (error) {
      await this.errorHandler.handleError(error as Error, {
        component: 'notification-system',
        operation: 'send_notification'
      });
      throw error;
    }
  }

  async sendSecurityAlert(
    alert: any,
    repository: RepositoryInfo,
    priority: NotificationPriority = NotificationPriority.HIGH
  ): Promise<string[]> {
    const template = this.templates.get('security-alert');
    if (!template) {
      throw new Error('Security alert template not found');
    }

    const subject = `Security Alert: ${alert.title}`;
    const body = `Security vulnerability detected in ${repository.fullName}:\n\n${alert.description}`;

    const recipients = this.getChannelRecipients(NotificationChannel.SLACK);

    return this.sendNotification(
      NotificationType.SECURITY_ALERT,
      priority,
      subject,
      body,
      recipients,
      repository,
      { alert },
      'security-alert'
    );
  }

  async sendAutomationResult(
    result: any,
    repository: RepositoryInfo,
    success: boolean
  ): Promise<string[]> {
    const type = success ? NotificationType.AUTOMATION_COMPLETED : NotificationType.AUTOMATION_FAILED;
    const priority = success ? NotificationPriority.MEDIUM : NotificationPriority.HIGH;

    const template = success ? 'automation-success' : 'automation-failure';
    const subject = success
      ? `Automation Completed: ${repository.fullName}`
      : `Automation Failed: ${repository.fullName}`;

    let body = success
      ? `Automation completed successfully for ${repository.fullName}`
      : `Automation failed for ${repository.fullName}`;

    if (result.error) {
      body += `\n\nError: ${result.error}`;
    }

    const recipients = this.getChannelRecipients(NotificationChannel.SLACK);

    return this.sendNotification(
      type,
      priority,
      subject,
      body,
      recipients,
      repository,
      { result },
      template
    );
  }

  async sendPRNotification(
    prData: any,
    repository: RepositoryInfo,
    type: NotificationType = NotificationType.PR_CREATED
  ): Promise<string[]> {
    const template = 'pr-notification';
    const priority = NotificationPriority.MEDIUM;

    const subject = `PR ${type === NotificationType.PR_CREATED ? 'Created' : 'Updated'}: ${prData.title}`;
    const body = `Pull request ${prData.number} ${type === NotificationType.PR_CREATED ? 'created' : 'updated'} for ${repository.fullName}\n\n${prData.body}`;

    const recipients = this.getChannelRecipients(NotificationChannel.SLACK);

    return this.sendNotification(
      type,
      priority,
      subject,
      body,
      recipients,
      repository,
      { pr: prData },
      template
    );
  }

  private async deliverToChannel(
    message: NotificationMessage,
    recipient: NotificationRecipient
  ): Promise<string> {
    const deliveryId = this.generateId('delivery');

    const delivery: NotificationDelivery = {
      id: deliveryId,
      messageId: message.id,
      channel: recipient.channel,
      recipient: recipient.address,
      status: DeliveryStatus.PENDING,
      attempts: 0
    };

    this.deliveryHistory.set(message.id, [...(this.deliveryHistory.get(message.id) || []), delivery]);

    try {
      await this.attemptDelivery(delivery, message, recipient);
      return deliveryId;
    } catch (error) {
      delivery.status = DeliveryStatus.FAILED;
      delivery.error = (error as Error).message;
      throw error;
    }
  }

  private async attemptDelivery(
    delivery: NotificationDelivery,
    message: NotificationMessage,
    recipient: NotificationRecipient
  ): Promise<void> {
    delivery.attempts++;
    delivery.lastAttempt = new Date();

    switch (recipient.channel) {
      case NotificationChannel.SLACK:
        await this.sendSlackNotification(message, recipient);
        break;
      case NotificationChannel.EMAIL:
        await this.sendEmailNotification(message, recipient);
        break;
      case NotificationChannel.WEBHOOK:
        await this.sendWebhookNotification(message, recipient);
        break;
      case NotificationChannel.TEAMS:
        await this.sendTeamsNotification(message, recipient);
        break;
      case NotificationChannel.DISCORD:
        await this.sendDiscordNotification(message, recipient);
        break;
      default:
        throw new Error(`Unsupported notification channel: ${recipient.channel}`);
    }

    delivery.status = DeliveryStatus.DELIVERED;
    delivery.deliveredAt = new Date();
  }

  private async sendSlackNotification(
    message: NotificationMessage,
    recipient: NotificationRecipient
  ): Promise<void> {
    const slackConfig = this.config.channelConfigs[NotificationChannel.SLACK];
    if (!slackConfig?.webhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    const slackMessage: SlackNotification = {
      channel: recipient.address,
      text: message.body,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${message.subject}*\n\n${message.body}`
          }
        }
      ],
      username: 'Agent Hooks',
      icon_emoji: ':robot_face:'
    };

    // In a real implementation, this would make an HTTP request to Slack
    // For now, we'll simulate the delivery
    console.log('Sending Slack notification:', slackMessage);
  }

  private async sendEmailNotification(
    message: NotificationMessage,
    recipient: NotificationRecipient
  ): Promise<void> {
    const emailConfig = this.config.channelConfigs[NotificationChannel.EMAIL];
    if (!emailConfig?.smtpConfig) {
      throw new Error('Email SMTP configuration not found');
    }

    const emailMessage: EmailNotification = {
      to: recipient.address,
      subject: message.subject,
      html: `<h2>${message.subject}</h2><p>${message.body}</p>`,
      text: message.body
    };

    // In a real implementation, this would use nodemailer or similar
    console.log('Sending email notification:', emailMessage);
  }

  private async sendWebhookNotification(
    message: NotificationMessage,
    recipient: NotificationRecipient
  ): Promise<void> {
    const webhookConfig = this.config.channelConfigs[NotificationChannel.WEBHOOK];
    if (!recipient.metadata?.url) {
      throw new Error('Webhook URL not provided');
    }

    const webhookMessage: WebhookNotification = {
      url: recipient.metadata.url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Agent-Hooks-Notification'
      },
      body: {
        id: message.id,
        type: message.type,
        subject: message.subject,
        body: message.body,
        repository: message.repository,
        data: message.data,
        timestamp: message.timestamp
      },
      timeout: webhookConfig?.timeout || 10000
    };

    // In a real implementation, this would make an HTTP request
    console.log('Sending webhook notification:', webhookMessage);
  }

  private async sendTeamsNotification(
    message: NotificationMessage,
    recipient: NotificationRecipient
  ): Promise<void> {
    // Microsoft Teams notification implementation
    // This would use the Teams webhook API
    console.log('Sending Teams notification:', message);
  }

  private async sendDiscordNotification(
    message: NotificationMessage,
    recipient: NotificationRecipient
  ): Promise<void> {
    // Discord notification implementation
    // This would use the Discord webhook API
    console.log('Sending Discord notification:', message);
  }

  private async evaluateRules(message: NotificationMessage): Promise<boolean> {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      try {
        if (await this.evaluateRule(rule, message)) {
          // Execute rule actions
          await this.executeRuleActions(rule, message);
        }
      } catch (error) {
        await this.errorHandler.handleError(error as Error, {
          component: 'notification-system',
          operation: 'evaluate_rules',
          ruleId: rule.id
        });
      }
    }

    return true; // Default to allowing notifications
  }

  private async evaluateRule(rule: NotificationRule, message: NotificationMessage): Promise<boolean> {
    // Simple rule evaluation - in a real implementation, this would be more sophisticated
    if (rule.trigger.type === 'event' && rule.trigger.eventType === message.type) {
      return true;
    }
    return false;
  }

  private async executeRuleActions(rule: NotificationRule, message: NotificationMessage): Promise<void> {
    for (const action of rule.actions) {
      try {
        switch (action.type) {
          case 'send_notification':
            // Action already handled by main notification flow
            break;
          case 'create_ticket':
            await this.createExternalTicket(message, action.config);
            break;
          case 'webhook':
            await this.sendExternalWebhook(message, action.config);
            break;
          case 'log':
            console.log('Rule action log:', action.config);
            break;
        }
      } catch (error) {
        await this.errorHandler.handleError(error as Error, {
          component: 'notification-system',
          operation: 'execute_rule_action'
        });
      }
    }
  }

  private async createExternalTicket(message: NotificationMessage, config: Record<string, any>): Promise<void> {
    const integration = this.integrations.get(config.integrationId);
    if (!integration) {
      throw new Error(`Integration not found: ${config.integrationId}`);
    }

    // Implementation would use the integration to create tickets in external systems
    console.log('Creating external ticket:', { message, config });
  }

  private async sendExternalWebhook(message: NotificationMessage, config: Record<string, any>): Promise<void> {
    // Implementation would send webhooks to external systems
    console.log('Sending external webhook:', { message, config });
  }

  private getChannelRecipients(channel: NotificationChannel): NotificationRecipient[] {
    const config = this.config.channelConfigs[channel];
    if (!config?.enabled) return [];

    const defaultRecipient = config.defaultRecipient;
    if (!defaultRecipient) return [];

    return [{
      channel,
      address: defaultRecipient
    }];
  }

  private processTemplate(template: string, message: NotificationMessage): string {
    // Simple template processing - replace variables
    let result = template;
    result = result.replace(/{{subject}}/g, message.subject);
    result = result.replace(/{{body}}/g, message.body);
    result = result.replace(/{{type}}/g, message.type);
    result = result.replace(/{{priority}}/g, message.priority);
    result = result.replace(/{{repository}}/g, message.repository?.fullName || 'Unknown');
    result = result.replace(/{{timestamp}}/g, message.timestamp.toISOString());

    if (message.data) {
      for (const [key, value] of Object.entries(message.data)) {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      }
    }

    return result;
  }

  private initializeTemplates(): void {
    // Initialize default notification templates
    const templates: NotificationTemplate[] = [
      {
        id: 'security-alert',
        name: 'Security Alert',
        type: NotificationType.SECURITY_ALERT,
        subject: 'Security Alert: {{title}}',
        body: 'Security vulnerability detected in {{repository}}:\n\n{{description}}\n\nSeverity: {{severity}}\n\nPlease review and address this issue.',
        variables: ['title', 'description', 'severity', 'repository'],
        channels: [NotificationChannel.SLACK, NotificationChannel.EMAIL],
        enabled: true
      },
      {
        id: 'automation-success',
        name: 'Automation Success',
        type: NotificationType.AUTOMATION_COMPLETED,
        subject: 'Automation Completed: {{repository}}',
        body: 'Automation completed successfully for {{repository}}.',
        variables: ['repository'],
        channels: [NotificationChannel.SLACK],
        enabled: true
      },
      {
        id: 'automation-failure',
        name: 'Automation Failure',
        type: NotificationType.AUTOMATION_FAILED,
        subject: 'Automation Failed: {{repository}}',
        body: 'Automation failed for {{repository}}.\n\nError: {{error}}',
        variables: ['repository', 'error'],
        channels: [NotificationChannel.SLACK, NotificationChannel.EMAIL],
        enabled: true
      },
      {
        id: 'pr-notification',
        name: 'PR Notification',
        type: NotificationType.PR_CREATED,
        subject: 'PR {{action}}: {{title}}',
        body: 'Pull request {{number}} has been {{action}} for {{repository}}.\n\n{{body}}',
        variables: ['action', 'title', 'number', 'repository', 'body'],
        channels: [NotificationChannel.SLACK],
        enabled: true
      }
    ];

    templates.forEach(template => this.templates.set(template.id, template));
  }

  private initializeIntegrations(): void {
    // Initialize default integrations
    // These would be configured by the user in a real implementation
    const integrations: ExternalIntegration[] = [
      {
        id: 'jira-default',
        name: 'Default Jira',
        type: 'jira' as any,
        enabled: false,
        config: {},
        auth: { type: 'api_key', credentials: {} },
        endpoints: []
      },
      {
        id: 'linear-default',
        name: 'Default Linear',
        type: 'linear' as any,
        enabled: false,
        config: {},
        auth: { type: 'api_key', credentials: {} },
        endpoints: []
      }
    ];

    integrations.forEach(integration => this.integrations.set(integration.id, integration));
  }

  async getNotificationMetrics(): Promise<NotificationMetrics> {
    const allDeliveries = Array.from(this.deliveryHistory.values()).flat();
    const totalSent = allDeliveries.filter(d => d.status === DeliveryStatus.DELIVERED).length;
    const totalFailed = allDeliveries.filter(d => d.status === DeliveryStatus.FAILED).length;
    const totalPending = allDeliveries.filter(d => d.status === DeliveryStatus.PENDING).length;

    const deliveredDeliveries = allDeliveries.filter(d => d.deliveredAt && d.lastAttempt);
    const averageDeliveryTime = deliveredDeliveries.length > 0
      ? deliveredDeliveries.reduce((sum, d) => sum + (d.deliveredAt!.getTime() - d.lastAttempt!.getTime()), 0) / deliveredDeliveries.length
      : 0;

    const deliverySuccessRate = totalSent + totalFailed > 0 ? (totalSent / (totalSent + totalFailed)) * 100 : 100;

    // Calculate channel metrics
    const channelMetrics: Record<NotificationChannel, any> = {} as any;
    Object.values(NotificationChannel).forEach(channel => {
      const channelDeliveries = allDeliveries.filter(d => d.channel === channel);
      const sent = channelDeliveries.filter(d => d.status === DeliveryStatus.DELIVERED).length;
      const failed = channelDeliveries.filter(d => d.status === DeliveryStatus.FAILED).length;
      const pending = channelDeliveries.filter(d => d.status === DeliveryStatus.PENDING).length;

      channelMetrics[channel] = {
        sent,
        failed,
        pending,
        average_delivery_time: 0, // Would calculate from delivery times
        success_rate: sent + failed > 0 ? (sent / (sent + failed)) * 100 : 100,
        last_used: channelDeliveries.length > 0 ? new Date() : undefined
      };
    });

    return {
      total_sent: totalSent,
      total_failed: totalFailed,
      total_pending: totalPending,
      average_delivery_time: averageDeliveryTime,
      delivery_success_rate: deliverySuccessRate,
      channel_metrics: channelMetrics,
      recent_activity: [] // Would populate from recent deliveries
    };
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Configuration management
  updateConfig(config: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): NotificationConfig {
    return { ...this.config };
  }

  addTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
  }

  removeTemplate(templateId: string): void {
    this.templates.delete(templateId);
  }

  addIntegration(integration: ExternalIntegration): void {
    this.integrations.set(integration.id, integration);
  }

  removeIntegration(integrationId: string): void {
    this.integrations.delete(integrationId);
  }

  addRule(rule: NotificationRule): void {
    this.rules.set(rule.id, rule);
  }

  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }
}