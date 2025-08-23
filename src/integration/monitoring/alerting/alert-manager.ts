/**
 * Intelligent alert manager implementation
 * Handles alert evaluation, routing, escalation, and notification delivery
 */

import {
  AlertManager,
  AlertDefinition,
  AlertContext,
  ActiveAlert,
  AlertStatus,
  Notification,
  NotificationChannel,
  EscalationPolicy,
  EscalationLevel,
  AlertSeverity,
  HealthStatus
} from '../types.js'
import { AlertingConfig } from '../monitoring-system.js'

export class IntelligentAlertManager implements AlertManager {
  private config: AlertingConfig
  private isInitialized = false
  private alertDefinitions = new Map<string, AlertDefinition>()
  private activeAlerts = new Map<string, ActiveAlert>()
  private notificationChannels = new Map<string, NotificationChannelHandler>()
  private evaluationInterval: NodeJS.Timeout | null = null
  private escalationInterval: NodeJS.Timeout | null = null

  constructor(config: AlertingConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      // Initialize notification channels
      await this.initializeNotificationChannels()
      
      // Start alert evaluation loop
      this.startAlertEvaluation()
      
      // Start escalation monitoring
      this.startEscalationMonitoring()
      
      this.isInitialized = true
    } catch (error) {
      throw new AlertManagerError('Failed to initialize alert manager', { cause: error })
    }
  }

  async createAlert(alert: AlertDefinition): Promise<string> {
    if (!this.isInitialized) {
      throw new AlertManagerError('Alert manager not initialized')
    }

    const alertId = alert.id || this.generateAlertId()
    alert.id = alertId

    this.alertDefinitions.set(alertId, alert)

    return alertId
  }

  async evaluateAlerts(): Promise<void> {
    if (!this.isInitialized) {
      return
    }

    try {
      for (const [alertId, alertDef] of this.alertDefinitions) {
        if (!alertDef.enabled) {
          continue
        }

        const shouldTrigger = await this.evaluateAlertCondition(alertDef)
        const existingAlert = this.activeAlerts.get(alertId)

        if (shouldTrigger && !existingAlert) {
          // Trigger new alert
          await this.triggerAlert(alertDef, {
            metric: alertDef.condition.metric,
            value: 0, // This would be the actual metric value
            threshold: alertDef.condition.threshold,
            timestamp: new Date(),
            metadata: {}
          })
        } else if (!shouldTrigger && existingAlert) {
          // Resolve existing alert
          await this.resolveAlert(alertId)
        }
      }
    } catch (error) {
      console.error('Error evaluating alerts:', error)
    }
  }

  async triggerAlert(alert: AlertDefinition, context: AlertContext): Promise<void> {
    if (!alert.id) {
      throw new AlertManagerError('Alert definition must have an ID')
    }

    try {
      const activeAlert: ActiveAlert = {
        id: this.generateActiveAlertId(),
        definition: alert,
        context,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        escalationLevel: 0
      }

      this.activeAlerts.set(alert.id, activeAlert)

      // Send initial notifications
      await this.sendAlertNotifications(activeAlert)

      // Log alert trigger
      console.info(`Alert triggered: ${alert.name}`, {
        alertId: alert.id,
        severity: alert.severity,
        metric: context.metric,
        value: context.value,
        threshold: context.threshold
      })
    } catch (error) {
      throw new AlertManagerError(`Failed to trigger alert ${alert.name}`, { cause: error })
    }
  }

  async resolveAlert(alertId: string): Promise<void> {
    const activeAlert = this.activeAlerts.get(alertId)
    if (!activeAlert) {
      return
    }

    try {
      activeAlert.status = 'resolved'
      activeAlert.updatedAt = new Date()

      // Send resolution notification
      const notification: Notification = {
        type: 'recovery',
        severity: activeAlert.definition.severity,
        title: `RESOLVED: ${activeAlert.definition.name}`,
        message: `Alert ${activeAlert.definition.name} has been resolved`,
        metadata: {
          alertId: activeAlert.id,
          resolvedAt: new Date(),
          duration: activeAlert.updatedAt.getTime() - activeAlert.createdAt.getTime()
        },
        channels: activeAlert.definition.routing.channels,
        timestamp: new Date()
      }

      await this.sendNotification(notification)

      // Remove from active alerts
      this.activeAlerts.delete(alertId)

      console.info(`Alert resolved: ${activeAlert.definition.name}`, {
        alertId,
        duration: notification.metadata.duration
      })
    } catch (error) {
      throw new AlertManagerError(`Failed to resolve alert ${alertId}`, { cause: error })
    }
  }

  async escalateAlert(alertId: string): Promise<void> {
    const activeAlert = this.activeAlerts.get(alertId)
    if (!activeAlert) {
      return
    }

    try {
      const escalationPolicy = activeAlert.definition.escalation
      const nextLevel = activeAlert.escalationLevel + 1

      if (nextLevel >= escalationPolicy.levels.length) {
        // No more escalation levels
        return
      }

      const escalationLevel = escalationPolicy.levels[nextLevel]
      
      // Check escalation conditions
      if (this.shouldEscalate(activeAlert, escalationLevel)) {
        activeAlert.escalationLevel = nextLevel
        activeAlert.status = 'escalated'
        activeAlert.updatedAt = new Date()

        // Send escalation notifications
        await this.sendEscalationNotifications(activeAlert, escalationLevel)

        console.warn(`Alert escalated: ${activeAlert.definition.name}`, {
          alertId,
          escalationLevel: nextLevel,
          channels: escalationLevel.channels.map(c => c.type)
        })
      }
    } catch (error) {
      throw new AlertManagerError(`Failed to escalate alert ${alertId}`, { cause: error })
    }
  }

  async sendNotification(notification: Notification): Promise<void> {
    if (!this.isInitialized) {
      throw new AlertManagerError('Alert manager not initialized')
    }

    try {
      const deliveryPromises = notification.channels.map(async (channel) => {
        if (!channel.enabled) {
          return
        }

        const handler = this.notificationChannels.get(channel.type)
        if (!handler) {
          console.warn(`No handler found for notification channel: ${channel.type}`)
          return
        }

        try {
          await handler.send(notification, channel.config)
        } catch (error) {
          console.error(`Failed to send notification via ${channel.type}:`, error)
        }
      })

      await Promise.allSettled(deliveryPromises)
    } catch (error) {
      throw new AlertManagerError('Failed to send notification', { cause: error })
    }
  }

  async getActiveAlerts(): Promise<ActiveAlert[]> {
    return Array.from(this.activeAlerts.values())
  }

  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    const activeAlert = this.activeAlerts.get(alertId)
    if (!activeAlert) {
      throw new AlertManagerError(`Alert not found: ${alertId}`)
    }

    activeAlert.status = 'acknowledged'
    activeAlert.updatedAt = new Date()
    activeAlert.context.metadata.acknowledgedBy = acknowledgedBy
    activeAlert.context.metadata.acknowledgedAt = new Date()

    console.info(`Alert acknowledged: ${activeAlert.definition.name}`, {
      alertId,
      acknowledgedBy
    })
  }

  async healthCheck(): Promise<HealthStatus> {
    try {
      const checks = await Promise.allSettled(
        Array.from(this.notificationChannels.entries()).map(async ([type, handler]) => {
          try {
            await handler.healthCheck()
            return {
              name: `notification-channel-${type}`,
              status: 'pass' as const,
              duration: 0
            }
          } catch (error) {
            return {
              name: `notification-channel-${type}`,
              status: 'fail' as const,
              message: error instanceof Error ? error.message : 'Unknown error',
              duration: 0
            }
          }
        })
      )

      const healthChecks = checks.map(result => 
        result.status === 'fulfilled' ? result.value : {
          name: 'unknown-channel',
          status: 'fail' as const,
          message: 'Health check failed',
          duration: 0
        }
      )

      const overallStatus = healthChecks.every(check => check.status === 'pass') 
        ? 'healthy' 
        : healthChecks.some(check => check.status === 'pass')
          ? 'degraded'
          : 'unhealthy'

      return {
        status: overallStatus,
        checks: healthChecks,
        lastUpdated: new Date()
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        checks: [{
          name: 'alert-manager',
          status: 'fail',
          message: error instanceof Error ? error.message : 'Unknown error',
          duration: 0
        }],
        lastUpdated: new Date()
      }
    }
  }

  private async initializeNotificationChannels(): Promise<void> {
    for (const channelConfig of this.config.notificationChannels) {
      if (!channelConfig.enabled) {
        continue
      }

      const handler = this.createNotificationHandler(channelConfig.type, channelConfig.config)
      this.notificationChannels.set(channelConfig.type, handler)
    }
  }

  private createNotificationHandler(type: string, config: any): NotificationChannelHandler {
    switch (type) {
      case 'email':
        return new EmailNotificationHandler(config)
      case 'slack':
        return new SlackNotificationHandler(config)
      case 'webhook':
        return new WebhookNotificationHandler(config)
      case 'sms':
        return new SMSNotificationHandler(config)
      case 'pagerduty':
        return new PagerDutyNotificationHandler(config)
      default:
        throw new AlertManagerError(`Unsupported notification channel type: ${type}`)
    }
  }

  private startAlertEvaluation(): void {
    this.evaluationInterval = setInterval(async () => {
      await this.evaluateAlerts()
    }, this.config.evaluationInterval)
  }

  private startEscalationMonitoring(): void {
    this.escalationInterval = setInterval(async () => {
      await this.checkEscalations()
    }, 60000) // Check every minute
  }

  private async checkEscalations(): Promise<void> {
    for (const [alertId, activeAlert] of this.activeAlerts) {
      if (activeAlert.status === 'resolved' || activeAlert.status === 'acknowledged') {
        continue
      }

      const timeSinceCreated = Date.now() - activeAlert.createdAt.getTime()
      const escalationPolicy = activeAlert.definition.escalation
      const currentLevel = escalationPolicy.levels[activeAlert.escalationLevel]

      if (currentLevel && timeSinceCreated >= currentLevel.delay) {
        await this.escalateAlert(alertId)
      }
    }
  }

  private async evaluateAlertCondition(alert: AlertDefinition): Promise<boolean> {
    // In a real implementation, this would query the metrics system
    // to evaluate the alert condition
    
    // Simulate condition evaluation
    const currentValue = Math.random() * 100
    const threshold = alert.condition.threshold
    
    switch (alert.condition.operator) {
      case 'gt':
        return currentValue > threshold
      case 'gte':
        return currentValue >= threshold
      case 'lt':
        return currentValue < threshold
      case 'lte':
        return currentValue <= threshold
      case 'eq':
        return currentValue === threshold
      case 'ne':
        return currentValue !== threshold
      default:
        return false
    }
  }

  private shouldEscalate(activeAlert: ActiveAlert, escalationLevel: EscalationLevel): boolean {
    // Check escalation conditions
    if (!escalationLevel.conditions || escalationLevel.conditions.length === 0) {
      return true
    }

    return escalationLevel.conditions.every(condition => {
      const value = activeAlert.context.metadata[condition.field]
      switch (condition.operator) {
        case 'gt':
          return value > condition.value
        case 'gte':
          return value >= condition.value
        case 'lt':
          return value < condition.value
        case 'lte':
          return value <= condition.value
        case 'eq':
          return value === condition.value
        case 'ne':
          return value !== condition.value
        default:
          return false
      }
    })
  }

  private async sendAlertNotifications(activeAlert: ActiveAlert): Promise<void> {
    const notification: Notification = {
      type: 'alert',
      severity: activeAlert.definition.severity,
      title: `ALERT: ${activeAlert.definition.name}`,
      message: activeAlert.definition.description,
      metadata: {
        alertId: activeAlert.id,
        metric: activeAlert.context.metric,
        value: activeAlert.context.value,
        threshold: activeAlert.context.threshold,
        timestamp: activeAlert.context.timestamp
      },
      channels: activeAlert.definition.routing.channels,
      timestamp: new Date()
    }

    await this.sendNotification(notification)
  }

  private async sendEscalationNotifications(activeAlert: ActiveAlert, escalationLevel: EscalationLevel): Promise<void> {
    const notification: Notification = {
      type: 'alert',
      severity: activeAlert.definition.severity,
      title: `ESCALATED: ${activeAlert.definition.name}`,
      message: `Alert has been escalated to level ${activeAlert.escalationLevel + 1}`,
      metadata: {
        alertId: activeAlert.id,
        escalationLevel: activeAlert.escalationLevel,
        originalAlert: activeAlert.definition.name
      },
      channels: escalationLevel.channels,
      timestamp: new Date()
    }

    await this.sendNotification(notification)
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateActiveAlertId(): string {
    return `active_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  async shutdown(): Promise<void> {
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval)
      this.evaluationInterval = null
    }

    if (this.escalationInterval) {
      clearInterval(this.escalationInterval)
      this.escalationInterval = null
    }

    // Close notification channels
    for (const handler of this.notificationChannels.values()) {
      await handler.close()
    }

    this.isInitialized = false
  }
}

// Notification channel handlers
abstract class NotificationChannelHandler {
  constructor(protected config: any) {}

  abstract send(notification: Notification, channelConfig: any): Promise<void>
  abstract healthCheck(): Promise<void>
  abstract close(): Promise<void>
}

class EmailNotificationHandler extends NotificationChannelHandler {
  async send(notification: Notification, channelConfig: any): Promise<void> {
    // In a real implementation, this would send email via SMTP
    console.log(`Sending email notification: ${notification.title}`)
  }

  async healthCheck(): Promise<void> {
    // Check SMTP connection
  }

  async close(): Promise<void> {
    // Close SMTP connection
  }
}

class SlackNotificationHandler extends NotificationChannelHandler {
  async send(notification: Notification, channelConfig: any): Promise<void> {
    // In a real implementation, this would send to Slack webhook
    console.log(`Sending Slack notification: ${notification.title}`)
  }

  async healthCheck(): Promise<void> {
    // Check Slack webhook
  }

  async close(): Promise<void> {
    // No persistent connection to close
  }
}

class WebhookNotificationHandler extends NotificationChannelHandler {
  async send(notification: Notification, channelConfig: any): Promise<void> {
    // In a real implementation, this would POST to webhook URL
    console.log(`Sending webhook notification: ${notification.title}`)
  }

  async healthCheck(): Promise<void> {
    // Check webhook endpoint
  }

  async close(): Promise<void> {
    // No persistent connection to close
  }
}

class SMSNotificationHandler extends NotificationChannelHandler {
  async send(notification: Notification, channelConfig: any): Promise<void> {
    // In a real implementation, this would send SMS via provider API
    console.log(`Sending SMS notification: ${notification.title}`)
  }

  async healthCheck(): Promise<void> {
    // Check SMS provider API
  }

  async close(): Promise<void> {
    // No persistent connection to close
  }
}

class PagerDutyNotificationHandler extends NotificationChannelHandler {
  async send(notification: Notification, channelConfig: any): Promise<void> {
    // In a real implementation, this would send to PagerDuty API
    console.log(`Sending PagerDuty notification: ${notification.title}`)
  }

  async healthCheck(): Promise<void> {
    // Check PagerDuty API
  }

  async close(): Promise<void> {
    // No persistent connection to close
  }
}

export class AlertManagerError extends Error {
  constructor(message: string, options?: { cause?: Error }) {
    super(message)
    this.name = 'AlertManagerError'
    if (options?.cause) {
      this.cause = options.cause
    }
  }
}