/**
 * Alert manager tests
 * Tests alert evaluation, routing, escalation, and notification delivery
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  IntelligentAlertManager,
  AlertDefinition,
  AlertContext,
  Notification,
  AlertingConfig
} from '../../../src/integration/monitoring/index.js'

describe('IntelligentAlertManager', () => {
  let alertManager: IntelligentAlertManager
  let config: AlertingConfig

  beforeEach(async () => {
    config = {
      evaluationInterval: 30000,
      notificationChannels: [
        {
          type: 'email',
          name: 'test-email',
          config: {
            smtp: {
              host: 'localhost',
              port: 587,
              auth: {
                user: 'test@example.com',
                pass: 'password'
              }
            }
          },
          enabled: true
        },
        {
          type: 'slack',
          name: 'test-slack',
          config: {
            webhook: 'https://hooks.slack.com/test',
            channel: '#alerts'
          },
          enabled: true
        }
      ],
      escalationPolicies: [
        {
          name: 'default-escalation',
          levels: [
            {
              delay: 300, // 5 minutes
              channels: ['test-email']
            },
            {
              delay: 900, // 15 minutes
              channels: ['test-slack']
            }
          ]
        }
      ]
    }

    alertManager = new IntelligentAlertManager(config)
  })

  afterEach(async () => {
    if (alertManager) {
      await alertManager.shutdown?.()
    }
  })

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(alertManager.initialize()).resolves.not.toThrow()
    })

    it('should initialize notification channels', async () => {
      await alertManager.initialize()
      const health = await alertManager.healthCheck()
      
      expect(health.checks.length).toBeGreaterThan(0)
      expect(health.checks.some(check => 
        check.name.includes('notification-channel')
      )).toBe(true)
    })
  })

  describe('Alert Creation', () => {
    beforeEach(async () => {
      await alertManager.initialize()
    })

    it('should create alert successfully', async () => {
      const alert: AlertDefinition = {
        name: 'High CPU Usage',
        description: 'CPU usage is above 80%',
        condition: {
          metric: 'system_cpu_usage',
          operator: 'gt',
          threshold: 80,
          duration: 300,
          evaluationInterval: 60
        },
        severity: 'high',
        routing: {
          channels: [{
            type: 'email',
            config: { recipients: ['admin@example.com'] },
            enabled: true
          }]
        },
        escalation: {
          levels: [{
            level: 1,
            delay: 300,
            channels: [{
              type: 'slack',
              config: { channel: '#critical' },
              enabled: true
            }]
          }],
          timeout: 3600
        },
        enabled: true
      }

      const alertId = await alertManager.createAlert(alert)
      expect(typeof alertId).toBe('string')
      expect(alertId.length).toBeGreaterThan(0)
    })

    it('should generate unique alert IDs', async () => {
      const alert1: AlertDefinition = {
        name: 'Alert 1',
        description: 'First alert',
        condition: {
          metric: 'test_metric',
          operator: 'gt',
          threshold: 10,
          duration: 60,
          evaluationInterval: 30
        },
        severity: 'medium',
        routing: { channels: [] },
        escalation: { levels: [], timeout: 3600 },
        enabled: true
      }

      const alert2: AlertDefinition = {
        name: 'Alert 2',
        description: 'Second alert',
        condition: {
          metric: 'test_metric',
          operator: 'lt',
          threshold: 5,
          duration: 60,
          evaluationInterval: 30
        },
        severity: 'low',
        routing: { channels: [] },
        escalation: { levels: [], timeout: 3600 },
        enabled: true
      }

      const id1 = await alertManager.createAlert(alert1)
      const id2 = await alertManager.createAlert(alert2)
      
      expect(id1).not.toBe(id2)
    })
  })

  describe('Alert Triggering', () => {
    beforeEach(async () => {
      await alertManager.initialize()
    })

    it('should trigger alert successfully', async () => {
      const alert: AlertDefinition = {
        id: 'test-alert-1',
        name: 'Test Alert',
        description: 'Test alert for triggering',
        condition: {
          metric: 'test_metric',
          operator: 'gt',
          threshold: 50,
          duration: 60,
          evaluationInterval: 30
        },
        severity: 'high',
        routing: {
          channels: [{
            type: 'email',
            config: { recipients: ['test@example.com'] },
            enabled: true
          }]
        },
        escalation: {
          levels: [],
          timeout: 3600
        },
        enabled: true
      }

      const context: AlertContext = {
        metric: 'test_metric',
        value: 75,
        threshold: 50,
        timestamp: new Date(),
        metadata: { source: 'test' }
      }

      await expect(alertManager.triggerAlert(alert, context))
        .resolves.not.toThrow()

      const activeAlerts = await alertManager.getActiveAlerts()
      expect(activeAlerts.length).toBe(1)
      expect(activeAlerts[0].definition.name).toBe('Test Alert')
      expect(activeAlerts[0].status).toBe('active')
    })

    it('should handle multiple active alerts', async () => {
      const alerts = [
        {
          id: 'alert-1',
          name: 'Alert 1',
          description: 'First alert',
          condition: {
            metric: 'metric_1',
            operator: 'gt' as const,
            threshold: 10,
            duration: 60,
            evaluationInterval: 30
          },
          severity: 'high' as const,
          routing: { channels: [] },
          escalation: { levels: [], timeout: 3600 },
          enabled: true
        },
        {
          id: 'alert-2',
          name: 'Alert 2',
          description: 'Second alert',
          condition: {
            metric: 'metric_2',
            operator: 'lt' as const,
            threshold: 5,
            duration: 60,
            evaluationInterval: 30
          },
          severity: 'medium' as const,
          routing: { channels: [] },
          escalation: { levels: [], timeout: 3600 },
          enabled: true
        }
      ]

      for (const alert of alerts) {
        const context: AlertContext = {
          metric: alert.condition.metric,
          value: alert.condition.operator === 'gt' ? 15 : 3,
          threshold: alert.condition.threshold,
          timestamp: new Date(),
          metadata: {}
        }

        await alertManager.triggerAlert(alert, context)
      }

      const activeAlerts = await alertManager.getActiveAlerts()
      expect(activeAlerts.length).toBe(2)
    })
  })

  describe('Alert Resolution', () => {
    beforeEach(async () => {
      await alertManager.initialize()
    })

    it('should resolve alert successfully', async () => {
      const alert: AlertDefinition = {
        id: 'resolvable-alert',
        name: 'Resolvable Alert',
        description: 'Alert that can be resolved',
        condition: {
          metric: 'test_metric',
          operator: 'gt',
          threshold: 50,
          duration: 60,
          evaluationInterval: 30
        },
        severity: 'medium',
        routing: {
          channels: [{
            type: 'email',
            config: { recipients: ['test@example.com'] },
            enabled: true
          }]
        },
        escalation: {
          levels: [],
          timeout: 3600
        },
        enabled: true
      }

      const context: AlertContext = {
        metric: 'test_metric',
        value: 75,
        threshold: 50,
        timestamp: new Date(),
        metadata: {}
      }

      // Trigger alert
      await alertManager.triggerAlert(alert, context)
      
      let activeAlerts = await alertManager.getActiveAlerts()
      expect(activeAlerts.length).toBe(1)

      // Resolve alert
      await alertManager.resolveAlert('resolvable-alert')
      
      activeAlerts = await alertManager.getActiveAlerts()
      expect(activeAlerts.length).toBe(0)
    })

    it('should handle resolving non-existent alert', async () => {
      await expect(alertManager.resolveAlert('non-existent-alert'))
        .resolves.not.toThrow()
    })
  })

  describe('Alert Escalation', () => {
    beforeEach(async () => {
      await alertManager.initialize()
    })

    it('should escalate alert after delay', async () => {
      const alert: AlertDefinition = {
        id: 'escalatable-alert',
        name: 'Escalatable Alert',
        description: 'Alert that can be escalated',
        condition: {
          metric: 'test_metric',
          operator: 'gt',
          threshold: 50,
          duration: 60,
          evaluationInterval: 30
        },
        severity: 'critical',
        routing: {
          channels: [{
            type: 'email',
            config: { recipients: ['oncall@example.com'] },
            enabled: true
          }]
        },
        escalation: {
          levels: [
            {
              level: 1,
              delay: 100, // Short delay for testing
              channels: [{
                type: 'slack',
                config: { channel: '#critical' },
                enabled: true
              }]
            },
            {
              level: 2,
              delay: 200,
              channels: [{
                type: 'email',
                config: { recipients: ['manager@example.com'] },
                enabled: true
              }]
            }
          ],
          timeout: 3600
        },
        enabled: true
      }

      const context: AlertContext = {
        metric: 'test_metric',
        value: 75,
        threshold: 50,
        timestamp: new Date(),
        metadata: {}
      }

      // Trigger alert
      await alertManager.triggerAlert(alert, context)
      
      // Manually escalate (in real scenario, this would happen automatically)
      await alertManager.escalateAlert('escalatable-alert')
      
      const activeAlerts = await alertManager.getActiveAlerts()
      expect(activeAlerts.length).toBe(1)
      expect(activeAlerts[0].escalationLevel).toBe(1)
      expect(activeAlerts[0].status).toBe('escalated')
    })

    it('should not escalate beyond maximum level', async () => {
      const alert: AlertDefinition = {
        id: 'max-escalation-alert',
        name: 'Max Escalation Alert',
        description: 'Alert with single escalation level',
        condition: {
          metric: 'test_metric',
          operator: 'gt',
          threshold: 50,
          duration: 60,
          evaluationInterval: 30
        },
        severity: 'high',
        routing: { channels: [] },
        escalation: {
          levels: [{
            level: 1,
            delay: 100,
            channels: [{
              type: 'email',
              config: { recipients: ['admin@example.com'] },
              enabled: true
            }]
          }],
          timeout: 3600
        },
        enabled: true
      }

      const context: AlertContext = {
        metric: 'test_metric',
        value: 75,
        threshold: 50,
        timestamp: new Date(),
        metadata: {}
      }

      await alertManager.triggerAlert(alert, context)
      
      // First escalation
      await alertManager.escalateAlert('max-escalation-alert')
      
      let activeAlerts = await alertManager.getActiveAlerts()
      expect(activeAlerts[0].escalationLevel).toBe(1)
      
      // Second escalation should not increase level
      await alertManager.escalateAlert('max-escalation-alert')
      
      activeAlerts = await alertManager.getActiveAlerts()
      expect(activeAlerts[0].escalationLevel).toBe(1) // Should remain at 1
    })
  })

  describe('Notification Delivery', () => {
    beforeEach(async () => {
      await alertManager.initialize()
    })

    it('should send notification to all enabled channels', async () => {
      const notification: Notification = {
        type: 'alert',
        severity: 'high',
        title: 'Test Notification',
        message: 'This is a test notification',
        metadata: { test: true },
        channels: [
          {
            type: 'email',
            config: { recipients: ['test1@example.com'] },
            enabled: true
          },
          {
            type: 'slack',
            config: { channel: '#alerts' },
            enabled: true
          },
          {
            type: 'email',
            config: { recipients: ['test2@example.com'] },
            enabled: false // This should be skipped
          }
        ],
        timestamp: new Date()
      }

      await expect(alertManager.sendNotification(notification))
        .resolves.not.toThrow()
    })

    it('should handle notification delivery failures gracefully', async () => {
      const notification: Notification = {
        type: 'alert',
        severity: 'critical',
        title: 'Critical Alert',
        message: 'System is down',
        metadata: {},
        channels: [{
          type: 'webhook',
          config: { url: 'http://invalid-url' },
          enabled: true
        }],
        timestamp: new Date()
      }

      // Should not throw even if delivery fails
      await expect(alertManager.sendNotification(notification))
        .resolves.not.toThrow()
    })
  })

  describe('Alert Acknowledgment', () => {
    beforeEach(async () => {
      await alertManager.initialize()
    })

    it('should acknowledge alert successfully', async () => {
      const alert: AlertDefinition = {
        id: 'acknowledgeable-alert',
        name: 'Acknowledgeable Alert',
        description: 'Alert that can be acknowledged',
        condition: {
          metric: 'test_metric',
          operator: 'gt',
          threshold: 50,
          duration: 60,
          evaluationInterval: 30
        },
        severity: 'medium',
        routing: { channels: [] },
        escalation: { levels: [], timeout: 3600 },
        enabled: true
      }

      const context: AlertContext = {
        metric: 'test_metric',
        value: 75,
        threshold: 50,
        timestamp: new Date(),
        metadata: {}
      }

      // Trigger alert
      await alertManager.triggerAlert(alert, context)
      
      // Acknowledge alert
      await alertManager.acknowledgeAlert('acknowledgeable-alert', 'john.doe')
      
      const activeAlerts = await alertManager.getActiveAlerts()
      expect(activeAlerts.length).toBe(1)
      expect(activeAlerts[0].status).toBe('acknowledged')
      expect(activeAlerts[0].context.metadata.acknowledgedBy).toBe('john.doe')
    })

    it('should handle acknowledging non-existent alert', async () => {
      await expect(alertManager.acknowledgeAlert('non-existent', 'user'))
        .rejects.toThrow('Alert not found')
    })
  })

  describe('Health Monitoring', () => {
    beforeEach(async () => {
      await alertManager.initialize()
    })

    it('should return health status', async () => {
      const health = await alertManager.healthCheck()
      
      expect(health).toBeDefined()
      expect(health.status).toMatch(/^(healthy|degraded|unhealthy)$/)
      expect(Array.isArray(health.checks)).toBe(true)
      expect(health.lastUpdated).toBeInstanceOf(Date)
    })

    it('should include notification channel health checks', async () => {
      const health = await alertManager.healthCheck()
      
      const channelChecks = health.checks.filter(check => 
        check.name.includes('notification-channel')
      )
      
      expect(channelChecks.length).toBeGreaterThan(0)
    })
  })

  describe('Alert Evaluation', () => {
    beforeEach(async () => {
      await alertManager.initialize()
    })

    it('should evaluate alerts periodically', async () => {
      const alert: AlertDefinition = {
        name: 'Periodic Alert',
        description: 'Alert for periodic evaluation',
        condition: {
          metric: 'periodic_metric',
          operator: 'gt',
          threshold: 50,
          duration: 60,
          evaluationInterval: 30
        },
        severity: 'medium',
        routing: { channels: [] },
        escalation: { levels: [], timeout: 3600 },
        enabled: true
      }

      await alertManager.createAlert(alert)
      
      // Trigger evaluation
      await expect(alertManager.evaluateAlerts()).resolves.not.toThrow()
    })

    it('should skip disabled alerts during evaluation', async () => {
      const alert: AlertDefinition = {
        name: 'Disabled Alert',
        description: 'Alert that is disabled',
        condition: {
          metric: 'disabled_metric',
          operator: 'gt',
          threshold: 50,
          duration: 60,
          evaluationInterval: 30
        },
        severity: 'low',
        routing: { channels: [] },
        escalation: { levels: [], timeout: 3600 },
        enabled: false // Disabled
      }

      await alertManager.createAlert(alert)
      
      // Should not trigger any alerts since it's disabled
      await alertManager.evaluateAlerts()
      
      const activeAlerts = await alertManager.getActiveAlerts()
      expect(activeAlerts.length).toBe(0)
    })
  })
})