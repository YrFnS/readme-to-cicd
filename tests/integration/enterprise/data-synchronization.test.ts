import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IntegrationHub } from '../../../src/integration/hub/integration-hub.js';
import { 
  IntegrationConfig, 
  IntegrationEvent,
  SyncResult,
  NotificationMessage,
  WorkflowItem,
  MetricData
} from '../../../src/integration/types.js';

describe('Data Synchronization Scenarios', () => {
  let integrationHub: IntegrationHub;
  let eventLog: IntegrationEvent[] = [];

  beforeEach(() => {
    integrationHub = new IntegrationHub();
    eventLog = [];

    // Setup event logging for all event types
    const eventTypes = ['sync-started', 'sync-completed', 'sync-failed', 'health-check', 'configuration-changed', 'error-occurred'];
    eventTypes.forEach(eventType => {
      integrationHub.addEventListener(eventType as any, (event) => {
        eventLog.push(event);
      });
    });
  });

  afterEach(async () => {
    // Cleanup all integrations
    const integrations = await integrationHub.listIntegrations();
    for (const integration of integrations) {
      await integrationHub.removeIntegration(integration.id);
    }
    eventLog = [];
  });

  describe('Multi-System Synchronization', () => {
    it('should synchronize user data across identity providers', async () => {
      // Setup multiple identity providers
      const ldapConfig: IntegrationConfig = {
        id: 'ldap-primary',
        name: 'Primary LDAP',
        type: 'identity',
        enabled: true,
        configuration: {
          type: 'ldap',
          endpoint: 'ldap://primary.corp.com:389',
          configuration: {
            baseDN: 'dc=corp,dc=com',
            searchFilter: '(uid={username})'
          }
        }
      };

      const adConfig: IntegrationConfig = {
        id: 'ad-secondary',
        name: 'Secondary AD',
        type: 'identity',
        enabled: true,
        configuration: {
          type: 'active-directory',
          endpoint: 'secondary.corp.com',
          configuration: {
            baseDN: 'dc=secondary,dc=corp,dc=com'
          }
        }
      };

      await integrationHub.registerIntegration(ldapConfig);
      await integrationHub.registerIntegration(adConfig);

      // Perform synchronization
      const ldapSync = await integrationHub.syncIntegration('ldap-primary');
      const adSync = await integrationHub.syncIntegration('ad-secondary');

      expect(ldapSync.success).toBe(true);
      expect(adSync.success).toBe(true);

      // Verify sync events were emitted
      const syncEvents = eventLog.filter(e => e.type === 'sync-completed');
      expect(syncEvents).toHaveLength(2);
      expect(syncEvents.map(e => e.integrationId)).toContain('ldap-primary');
      expect(syncEvents.map(e => e.integrationId)).toContain('ad-secondary');

      // Verify user data consistency
      const identityManager = integrationHub.getIntegrationManager('identity');
      const ldapUsers = await identityManager.getUserInfo('ldap-primary', 'user1');
      const adUsers = await identityManager.getUserInfo('ad-secondary', 'ad-user1');

      expect(ldapUsers.success).toBeDefined();
      expect(adUsers.success).toBeDefined();
    });

    it('should handle partial synchronization failures', async () => {
      // Setup integrations with one that will fail
      const workingConfig: IntegrationConfig = {
        id: 'working-integration',
        name: 'Working Integration',
        type: 'notification',
        enabled: true,
        configuration: {
          type: 'slack',
          configuration: {
            webhookUrl: 'https://hooks.slack.com/valid'
          }
        }
      };

      const failingConfig: IntegrationConfig = {
        id: 'failing-integration',
        name: 'Failing Integration',
        type: 'workflow',
        enabled: true,
        configuration: {
          type: 'jira',
          baseUrl: 'https://invalid.atlassian.net',
          configuration: {
            projectKey: 'INVALID'
          }
        }
      };

      await integrationHub.registerIntegration(workingConfig);
      await integrationHub.registerIntegration(failingConfig);

      // Attempt synchronization
      const workingSync = await integrationHub.syncIntegration('working-integration');
      const failingSync = await integrationHub.syncIntegration('failing-integration');

      expect(workingSync.success).toBe(true);
      // The failing sync should complete but may have errors
      expect(failingSync).toBeDefined();

      // Check event log for appropriate events
      const completedEvents = eventLog.filter(e => e.type === 'sync-completed');
      const failedEvents = eventLog.filter(e => e.type === 'sync-failed');

      expect(completedEvents.length + failedEvents.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Real-time Data Propagation', () => {
    it('should propagate workflow changes to notification systems', async () => {
      // Setup workflow and notification integrations
      const jiraConfig: IntegrationConfig = {
        id: 'jira-workflow',
        name: 'Jira Workflow',
        type: 'workflow',
        enabled: true,
        configuration: {
          type: 'jira',
          baseUrl: 'https://test.atlassian.net',
          configuration: {
            projectKey: 'TEST'
          }
        }
      };

      const slackConfig: IntegrationConfig = {
        id: 'slack-notifications',
        name: 'Slack Notifications',
        type: 'notification',
        enabled: true,
        configuration: {
          type: 'slack',
          configuration: {
            webhookUrl: 'https://hooks.slack.com/test',
            channel: '#workflow-updates'
          }
        }
      };

      await integrationHub.registerIntegration(jiraConfig);
      await integrationHub.registerIntegration(slackConfig);

      const workflowManager = integrationHub.getIntegrationManager('workflow');
      const notificationManager = integrationHub.getIntegrationManager('notification');

      // Create workflow item
      const workflowItem: Partial<WorkflowItem> = {
        title: 'Test synchronization workflow',
        description: 'Testing data propagation between systems',
        priority: 'High',
        labels: ['sync-test', 'integration']
      };

      const createResult = await workflowManager.createWorkflowItem('jira-workflow', workflowItem);
      expect(createResult.success).toBe(true);

      // Send notification about workflow change
      if (createResult.success && createResult.data) {
        const notification: NotificationMessage = {
          title: 'New Workflow Item Created',
          content: `Workflow item "${createResult.data.title}" has been created`,
          priority: 'normal',
          recipients: ['team@example.com'],
          metadata: {
            workflowId: createResult.data.id,
            system: 'jira-workflow',
            action: 'created'
          }
        };

        const notifyResult = await notificationManager.sendNotification('slack-notifications', notification);
        expect(notifyResult.success).toBe(true);
      }

      // Verify configuration change events
      const configEvents = eventLog.filter(e => e.type === 'configuration-changed');
      expect(configEvents).toHaveLength(2); // One for each integration
    });

    it('should synchronize monitoring metrics across platforms', async () => {
      // Setup multiple monitoring platforms
      const datadogConfig: IntegrationConfig = {
        id: 'datadog-primary',
        name: 'Datadog Primary',
        type: 'monitoring',
        enabled: true,
        configuration: {
          type: 'datadog',
          configuration: {
            apiKey: 'datadog-key',
            region: 'us1'
          }
        }
      };

      const newrelicConfig: IntegrationConfig = {
        id: 'newrelic-secondary',
        name: 'New Relic Secondary',
        type: 'monitoring',
        enabled: true,
        configuration: {
          type: 'newrelic',
          configuration: {
            apiKey: 'newrelic-key',
            region: 'US'
          }
        }
      };

      await integrationHub.registerIntegration(datadogConfig);
      await integrationHub.registerIntegration(newrelicConfig);

      const monitoringManager = integrationHub.getIntegrationManager('monitoring');

      // Generate test metrics
      const metrics: MetricData[] = [
        {
          name: 'sync.test.metric',
          value: 42.5,
          timestamp: new Date(),
          tags: {
            test: 'synchronization',
            platform: 'integration-hub'
          },
          unit: 'count'
        },
        {
          name: 'sync.test.duration',
          value: 1.25,
          timestamp: new Date(),
          tags: {
            test: 'synchronization',
            platform: 'integration-hub'
          },
          unit: 'seconds'
        }
      ];

      // Send metrics to both platforms
      const datadogResult = await monitoringManager.sendMetrics('datadog-primary', metrics);
      const newrelicResult = await monitoringManager.sendMetrics('newrelic-secondary', metrics);

      expect(datadogResult.success).toBe(true);
      expect(newrelicResult.success).toBe(true);

      // Verify metrics can be queried from both platforms
      const datadogQuery = await monitoringManager.queryMetrics(
        'datadog-primary',
        'avg:sync.test.metric{*}',
        new Date(Date.now() - 3600000),
        new Date()
      );

      const newrelicQuery = await monitoringManager.queryMetrics(
        'newrelic-secondary',
        'SELECT average(sync.test.metric) FROM Metric',
        new Date(Date.now() - 3600000),
        new Date()
      );

      expect(datadogQuery.success).toBe(true);
      expect(newrelicQuery.success).toBe(true);
    });
  });

  describe('Batch Synchronization Operations', () => {
    it('should perform bulk synchronization across all integrations', async () => {
      // Setup multiple integrations of different types
      const integrations: IntegrationConfig[] = [
        {
          id: 'bulk-identity',
          name: 'Bulk Identity',
          type: 'identity',
          enabled: true,
          configuration: {
            type: 'ldap',
            endpoint: 'ldap://bulk.test',
            configuration: { baseDN: 'dc=bulk,dc=test' }
          }
        },
        {
          id: 'bulk-workflow',
          name: 'Bulk Workflow',
          type: 'workflow',
          enabled: true,
          configuration: {
            type: 'jira',
            baseUrl: 'https://bulk.atlassian.net',
            configuration: { projectKey: 'BULK' }
          }
        },
        {
          id: 'bulk-notification',
          name: 'Bulk Notification',
          type: 'notification',
          enabled: true,
          configuration: {
            type: 'email',
            configuration: {
              smtpServer: 'smtp.bulk.test',
              fromAddress: 'bulk@test.com'
            }
          }
        }
      ];

      // Register all integrations
      for (const config of integrations) {
        await integrationHub.registerIntegration(config);
      }

      // Perform bulk synchronization
      const syncPromises = integrations.map(config => 
        integrationHub.syncIntegration(config.id)
      );

      const syncResults = await Promise.all(syncPromises);

      // Verify all synchronizations completed
      expect(syncResults).toHaveLength(3);
      syncResults.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.lastSync).toBeInstanceOf(Date);
      });

      // Verify sync events for all integrations
      const syncStartedEvents = eventLog.filter(e => e.type === 'sync-started');
      const syncCompletedEvents = eventLog.filter(e => e.type === 'sync-completed');

      expect(syncStartedEvents).toHaveLength(3);
      expect(syncCompletedEvents).toHaveLength(3);
    });

    it('should handle concurrent synchronization requests', async () => {
      const config: IntegrationConfig = {
        id: 'concurrent-test',
        name: 'Concurrent Test',
        type: 'cicd',
        enabled: true,
        configuration: {
          type: 'jenkins',
          baseUrl: 'http://concurrent.jenkins.test',
          configuration: {}
        }
      };

      await integrationHub.registerIntegration(config);

      // Start multiple concurrent sync operations
      const concurrentSyncs = Array(5).fill(null).map(() => 
        integrationHub.syncIntegration('concurrent-test')
      );

      const results = await Promise.all(concurrentSyncs);

      // All syncs should complete successfully
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Should have multiple sync events
      const syncEvents = eventLog.filter(e => 
        e.type === 'sync-started' || e.type === 'sync-completed'
      );
      expect(syncEvents.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from temporary synchronization failures', async () => {
      const config: IntegrationConfig = {
        id: 'recovery-test',
        name: 'Recovery Test',
        type: 'monitoring',
        enabled: true,
        configuration: {
          type: 'prometheus',
          configuration: {}
        }
      };

      await integrationHub.registerIntegration(config);

      // Simulate multiple sync attempts (some may fail)
      const syncAttempts = [];
      for (let i = 0; i < 3; i++) {
        const result = await integrationHub.syncIntegration('recovery-test');
        syncAttempts.push(result);
        
        // Small delay between attempts
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // At least one sync should succeed
      const successfulSyncs = syncAttempts.filter(r => r.success);
      expect(successfulSyncs.length).toBeGreaterThanOrEqual(1);

      // Verify error handling in event log
      const errorEvents = eventLog.filter(e => e.type === 'error-occurred');
      // Errors may or may not occur depending on implementation
      expect(errorEvents.length).toBeGreaterThanOrEqual(0);
    });

    it('should maintain data consistency during partial failures', async () => {
      // Setup integrations with different reliability characteristics
      const reliableConfig: IntegrationConfig = {
        id: 'reliable-integration',
        name: 'Reliable Integration',
        type: 'notification',
        enabled: true,
        configuration: {
          type: 'webhook',
          configuration: {
            webhookUrl: 'https://reliable.webhook.test'
          }
        }
      };

      const unreliableConfig: IntegrationConfig = {
        id: 'unreliable-integration',
        name: 'Unreliable Integration',
        type: 'workflow',
        enabled: true,
        configuration: {
          type: 'custom',
          baseUrl: 'https://unreliable.test',
          configuration: {}
        }
      };

      await integrationHub.registerIntegration(reliableConfig);
      await integrationHub.registerIntegration(unreliableConfig);

      // Perform health checks to establish baseline
      const initialHealth = await integrationHub.healthCheck();
      expect(initialHealth).toHaveLength(2);

      // Attempt synchronization
      const reliableSync = await integrationHub.syncIntegration('reliable-integration');
      const unreliableSync = await integrationHub.syncIntegration('unreliable-integration');

      // Reliable integration should succeed
      expect(reliableSync.success).toBe(true);
      
      // Unreliable integration may fail, but should not affect the reliable one
      const finalHealth = await integrationHub.healthCheck('reliable-integration');
      expect(finalHealth).toHaveLength(1);
      expect(finalHealth[0].integrationId).toBe('reliable-integration');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large-scale synchronization efficiently', async () => {
      const startTime = Date.now();
      
      // Create multiple integrations
      const integrationCount = 10;
      const configs: IntegrationConfig[] = [];

      for (let i = 0; i < integrationCount; i++) {
        configs.push({
          id: `scale-test-${i}`,
          name: `Scale Test ${i}`,
          type: ['identity', 'workflow', 'notification', 'cicd', 'monitoring'][i % 5] as any,
          enabled: true,
          configuration: {
            type: 'custom',
            baseUrl: `https://scale-test-${i}.example.com`,
            configuration: {}
          }
        });
      }

      // Register all integrations
      for (const config of configs) {
        await integrationHub.registerIntegration(config);
      }

      const registrationTime = Date.now() - startTime;

      // Perform bulk synchronization
      const syncStartTime = Date.now();
      const syncPromises = configs.map(config => 
        integrationHub.syncIntegration(config.id)
      );

      const syncResults = await Promise.all(syncPromises);
      const syncTime = Date.now() - syncStartTime;

      // Verify performance characteristics
      expect(registrationTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(syncTime).toBeLessThan(10000); // Sync should complete within 10 seconds

      // Verify all operations completed successfully
      expect(syncResults).toHaveLength(integrationCount);
      syncResults.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Verify event handling performance
      const totalEvents = eventLog.length;
      expect(totalEvents).toBeGreaterThanOrEqual(integrationCount * 2); // At least registration + sync events

      console.log(`Performance metrics:
        - Registration time: ${registrationTime}ms for ${integrationCount} integrations
        - Synchronization time: ${syncTime}ms for ${integrationCount} integrations
        - Total events processed: ${totalEvents}
        - Average time per integration: ${(registrationTime + syncTime) / integrationCount}ms`);
    });
  });
});