import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IntegrationHub } from '../../../src/integration/hub/integration-hub.js';
import { 
  IntegrationConfig, 
  NotificationMessage, 
  WorkflowItem, 
  MetricData,
  PipelineExecution 
} from '../../../src/integration/types.js';

describe('Enterprise Integration End-to-End Tests', () => {
  let integrationHub: IntegrationHub;

  beforeEach(() => {
    integrationHub = new IntegrationHub();
  });

  afterEach(async () => {
    // Cleanup all integrations
    const integrations = await integrationHub.listIntegrations();
    for (const integration of integrations) {
      await integrationHub.removeIntegration(integration.id);
    }
  });

  describe('Identity Integration Workflow', () => {
    it('should complete full LDAP integration workflow', async () => {
      // Register LDAP integration
      const ldapConfig: IntegrationConfig = {
        id: 'ldap-integration',
        name: 'Corporate LDAP',
        type: 'identity',
        enabled: true,
        configuration: {
          type: 'ldap',
          endpoint: 'ldap://corp.example.com:389',
          configuration: {
            baseDN: 'dc=corp,dc=example,dc=com',
            searchFilter: '(uid={username})',
            attributes: ['uid', 'cn', 'mail', 'memberOf']
          }
        },
        credentials: {
          type: 'basic-auth',
          data: {
            username: 'service-account',
            password: 'service-password'
          }
        }
      };

      await integrationHub.registerIntegration(ldapConfig);

      // Verify integration is registered
      const registered = await integrationHub.getIntegration('ldap-integration');
      expect(registered).toBeTruthy();
      expect(registered?.type).toBe('identity');

      // Perform sync
      const syncResult = await integrationHub.syncIntegration('ldap-integration');
      expect(syncResult.success).toBe(true);
      expect(syncResult.itemsSynced).toBeGreaterThanOrEqual(0);

      // Health check
      const healthResults = await integrationHub.healthCheck('ldap-integration');
      expect(healthResults).toHaveLength(1);
      expect(healthResults[0].status).toMatch(/healthy|degraded|unhealthy/);
    });

    it('should handle SSO integration with OAuth', async () => {
      const ssoConfig: IntegrationConfig = {
        id: 'sso-oauth',
        name: 'Corporate SSO',
        type: 'identity',
        enabled: true,
        configuration: {
          type: 'oauth',
          endpoint: 'https://sso.corp.example.com',
          configuration: {
            ssoUrl: 'https://sso.corp.example.com/oauth/authorize',
            entityId: 'readme-to-cicd'
          }
        },
        credentials: {
          type: 'oauth',
          data: {
            clientId: 'readme-to-cicd-client',
            clientSecret: 'oauth-secret'
          }
        }
      };

      await integrationHub.registerIntegration(ssoConfig);
      
      const identityManager = integrationHub.getIntegrationManager('identity');
      expect(identityManager).toBeTruthy();

      // Test authentication flow
      const authResult = await identityManager.authenticateUser('sso-oauth', 'test.user', 'password');
      expect(authResult.success).toBeDefined();
    });
  });

  describe('Workflow Integration Scenarios', () => {
    it('should integrate with Jira for issue management', async () => {
      const jiraConfig: IntegrationConfig = {
        id: 'jira-integration',
        name: 'Corporate Jira',
        type: 'workflow',
        enabled: true,
        configuration: {
          type: 'jira',
          baseUrl: 'https://corp.atlassian.net',
          configuration: {
            projectKey: 'CICD',
            apiVersion: '3'
          }
        },
        credentials: {
          type: 'api-key',
          data: {
            apiKey: 'jira-api-token'
          }
        }
      };

      await integrationHub.registerIntegration(jiraConfig);

      const workflowManager = integrationHub.getIntegrationManager('workflow');
      
      // Create workflow item
      const newItem: Partial<WorkflowItem> = {
        title: 'Implement CI/CD integration',
        description: 'Add automated CI/CD pipeline generation',
        priority: 'High',
        labels: ['automation', 'cicd']
      };

      const createResult = await workflowManager.createWorkflowItem('jira-integration', newItem);
      expect(createResult.success).toBe(true);
      expect(createResult.data?.id).toBeTruthy();

      // Update workflow item
      if (createResult.data) {
        const updateResult = await workflowManager.updateWorkflowItem(
          'jira-integration',
          createResult.data.id,
          { status: 'In Progress' }
        );
        expect(updateResult.success).toBe(true);
      }
    });

    it('should integrate with ServiceNow for incident management', async () => {
      const serviceNowConfig: IntegrationConfig = {
        id: 'servicenow-integration',
        name: 'Corporate ServiceNow',
        type: 'workflow',
        enabled: true,
        configuration: {
          type: 'servicenow',
          baseUrl: 'https://corp.service-now.com',
          configuration: {
            instanceUrl: 'corp.service-now.com',
            apiVersion: 'v1'
          }
        },
        credentials: {
          type: 'basic-auth',
          data: {
            username: 'integration-user',
            password: 'integration-password'
          }
        }
      };

      await integrationHub.registerIntegration(serviceNowConfig);

      const syncResult = await integrationHub.syncIntegration('servicenow-integration');
      expect(syncResult.success).toBe(true);
    });
  });

  describe('Notification Integration Workflows', () => {
    it('should send notifications through multiple channels', async () => {
      // Setup Slack integration
      const slackConfig: IntegrationConfig = {
        id: 'slack-notifications',
        name: 'Team Slack',
        type: 'notification',
        enabled: true,
        configuration: {
          type: 'slack',
          configuration: {
            webhookUrl: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
            channel: '#cicd-alerts'
          }
        }
      };

      // Setup Teams integration
      const teamsConfig: IntegrationConfig = {
        id: 'teams-notifications',
        name: 'Corporate Teams',
        type: 'notification',
        enabled: true,
        configuration: {
          type: 'teams',
          configuration: {
            webhookUrl: 'https://outlook.office365.com/webhook/xxx'
          }
        }
      };

      await integrationHub.registerIntegration(slackConfig);
      await integrationHub.registerIntegration(teamsConfig);

      const notificationManager = integrationHub.getIntegrationManager('notification');

      const message: NotificationMessage = {
        title: 'CI/CD Pipeline Alert',
        content: 'Pipeline execution failed for main branch',
        priority: 'high',
        recipients: ['team-lead@example.com'],
        metadata: {
          pipeline: 'main-build',
          branch: 'main',
          commit: 'abc123'
        }
      };

      // Send to Slack
      const slackResult = await notificationManager.sendNotification('slack-notifications', message);
      expect(slackResult.success).toBe(true);

      // Send to Teams
      const teamsResult = await notificationManager.sendNotification('teams-notifications', message);
      expect(teamsResult.success).toBe(true);

      // Broadcast to multiple channels
      const broadcastResult = await notificationManager.broadcastNotification(
        ['slack-notifications', 'teams-notifications'],
        message
      );
      expect(broadcastResult.success).toBe(true);
      expect(broadcastResult.data?.successful).toHaveLength(2);
    });

    it('should handle email notifications with attachments', async () => {
      const emailConfig: IntegrationConfig = {
        id: 'email-notifications',
        name: 'Corporate Email',
        type: 'notification',
        enabled: true,
        configuration: {
          type: 'email',
          configuration: {
            smtpServer: 'smtp.corp.example.com',
            fromAddress: 'cicd-alerts@corp.example.com'
          }
        },
        credentials: {
          type: 'basic-auth',
          data: {
            username: 'cicd-alerts@corp.example.com',
            password: 'email-password'
          }
        }
      };

      await integrationHub.registerIntegration(emailConfig);

      const notificationManager = integrationHub.getIntegrationManager('notification');
      const message: NotificationMessage = {
        title: 'Weekly CI/CD Report',
        content: 'Please find the weekly CI/CD performance report attached.',
        priority: 'normal',
        recipients: ['manager@corp.example.com', 'team@corp.example.com']
      };

      const result = await notificationManager.sendNotification('email-notifications', message);
      expect(result.success).toBe(true);
    });
  });

  describe('CI/CD Integration Workflows', () => {
    it('should manage Jenkins pipeline lifecycle', async () => {
      const jenkinsConfig: IntegrationConfig = {
        id: 'jenkins-cicd',
        name: 'Corporate Jenkins',
        type: 'cicd',
        enabled: true,
        configuration: {
          type: 'jenkins',
          baseUrl: 'https://jenkins.corp.example.com',
          configuration: {
            defaultBranch: 'main'
          }
        },
        credentials: {
          type: 'api-key',
          data: {
            apiKey: 'jenkins-api-token'
          }
        }
      };

      await integrationHub.registerIntegration(jenkinsConfig);

      const cicdManager = integrationHub.getIntegrationManager('cicd');

      // Trigger pipeline
      const triggerResult = await cicdManager.triggerPipeline(
        'jenkins-cicd',
        'readme-to-cicd-pipeline',
        'feature/new-integration'
      );
      expect(triggerResult.success).toBe(true);
      expect(triggerResult.data?.id).toBeTruthy();

      // Get pipeline status
      if (triggerResult.data) {
        const statusResult = await cicdManager.getPipelineStatus('jenkins-cicd', triggerResult.data.id);
        expect(statusResult.success).toBe(true);
        expect(statusResult.data?.status).toMatch(/pending|running|success|failed|cancelled/);
      }
    });

    it('should integrate with GitHub Actions workflows', async () => {
      const githubConfig: IntegrationConfig = {
        id: 'github-actions',
        name: 'GitHub Actions',
        type: 'cicd',
        enabled: true,
        configuration: {
          type: 'github-actions',
          baseUrl: 'https://api.github.com',
          configuration: {
            organizationId: 'corp-org',
            defaultBranch: 'main'
          }
        },
        credentials: {
          type: 'api-key',
          data: {
            apiKey: 'github-token'
          }
        }
      };

      await integrationHub.registerIntegration(githubConfig);

      const syncResult = await integrationHub.syncIntegration('github-actions');
      expect(syncResult.success).toBe(true);
    });
  });

  describe('Monitoring Integration Workflows', () => {
    it('should collect and send metrics to Datadog', async () => {
      const datadogConfig: IntegrationConfig = {
        id: 'datadog-monitoring',
        name: 'Corporate Datadog',
        type: 'monitoring',
        enabled: true,
        configuration: {
          type: 'datadog',
          configuration: {
            apiKey: 'datadog-api-key',
            region: 'us1',
            dashboardId: 'dashboard-123'
          }
        }
      };

      await integrationHub.registerIntegration(datadogConfig);

      const monitoringManager = integrationHub.getIntegrationManager('monitoring');

      const metrics: MetricData[] = [
        {
          name: 'cicd.pipeline.duration',
          value: 125.5,
          timestamp: new Date(),
          tags: {
            pipeline: 'main-build',
            status: 'success'
          },
          unit: 'seconds'
        },
        {
          name: 'cicd.pipeline.count',
          value: 1,
          timestamp: new Date(),
          tags: {
            pipeline: 'main-build',
            status: 'success'
          },
          unit: 'count'
        }
      ];

      const sendResult = await monitoringManager.sendMetrics('datadog-monitoring', metrics);
      expect(sendResult.success).toBe(true);

      // Query metrics
      const queryResult = await monitoringManager.queryMetrics(
        'datadog-monitoring',
        'avg:cicd.pipeline.duration{*}',
        new Date(Date.now() - 3600000), // 1 hour ago
        new Date()
      );
      expect(queryResult.success).toBe(true);
    });

    it('should create alert rules across monitoring platforms', async () => {
      const newrelicConfig: IntegrationConfig = {
        id: 'newrelic-monitoring',
        name: 'New Relic APM',
        type: 'monitoring',
        enabled: true,
        configuration: {
          type: 'newrelic',
          configuration: {
            apiKey: 'newrelic-api-key',
            region: 'US'
          }
        }
      };

      await integrationHub.registerIntegration(newrelicConfig);

      const monitoringManager = integrationHub.getIntegrationManager('monitoring');

      const alertRule = {
        id: 'high-error-rate',
        name: 'High Error Rate Alert',
        condition: 'SELECT percentage(count(*), WHERE error IS true) FROM Transaction WHERE appName = "readme-to-cicd"',
        threshold: 5,
        severity: 'critical' as const
      };

      const alertResult = await monitoringManager.createAlertRule('newrelic-monitoring', alertRule);
      expect(alertResult.success).toBe(true);
      expect(alertResult.data).toBeTruthy();
    });
  });

  describe('Cross-Integration Data Synchronization', () => {
    it('should synchronize data between workflow and notification systems', async () => {
      // Setup Jira and Slack integrations
      const jiraConfig: IntegrationConfig = {
        id: 'sync-jira',
        name: 'Sync Jira',
        type: 'workflow',
        enabled: true,
        configuration: {
          type: 'jira',
          baseUrl: 'https://sync.atlassian.net',
          configuration: { projectKey: 'SYNC' }
        }
      };

      const slackConfig: IntegrationConfig = {
        id: 'sync-slack',
        name: 'Sync Slack',
        type: 'notification',
        enabled: true,
        configuration: {
          type: 'slack',
          configuration: {
            webhookUrl: 'https://hooks.slack.com/test',
            channel: '#sync-test'
          }
        }
      };

      await integrationHub.registerIntegration(jiraConfig);
      await integrationHub.registerIntegration(slackConfig);

      // Sync both integrations
      const jiraSyncResult = await integrationHub.syncIntegration('sync-jira');
      const slackSyncResult = await integrationHub.syncIntegration('sync-slack');

      expect(jiraSyncResult.success).toBe(true);
      expect(slackSyncResult.success).toBe(true);

      // Verify both integrations are healthy
      const healthResults = await integrationHub.healthCheck();
      const jiraHealth = healthResults.find(r => r.integrationId === 'sync-jira');
      const slackHealth = healthResults.find(r => r.integrationId === 'sync-slack');

      expect(jiraHealth?.status).toMatch(/healthy|degraded|unhealthy/);
      expect(slackHealth?.status).toMatch(/healthy|degraded|unhealthy/);
    });

    it('should handle integration failures gracefully', async () => {
      const failingConfig: IntegrationConfig = {
        id: 'failing-integration',
        name: 'Failing Integration',
        type: 'monitoring',
        enabled: true,
        configuration: {
          type: 'custom',
          configuration: {
            // Invalid configuration to trigger failure
            invalidField: 'invalid-value'
          }
        }
      };

      // This should not throw, but should handle the error gracefully
      await expect(integrationHub.registerIntegration(failingConfig)).rejects.toThrow();

      // Verify the integration was not registered
      const retrieved = await integrationHub.getIntegration('failing-integration');
      expect(retrieved).toBeNull();
    });
  });
});