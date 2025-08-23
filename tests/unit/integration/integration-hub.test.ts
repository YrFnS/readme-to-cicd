import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntegrationHub } from '../../../src/integration/hub/integration-hub.js';
import { IntegrationConfig, IntegrationType } from '../../../src/integration/types.js';

describe('IntegrationHub', () => {
  let integrationHub: IntegrationHub;

  beforeEach(() => {
    integrationHub = new IntegrationHub();
  });

  describe('registerIntegration', () => {
    it('should register a valid integration configuration', async () => {
      const config: IntegrationConfig = {
        id: 'test-integration',
        name: 'Test Integration',
        type: 'identity' as IntegrationType,
        enabled: true,
        configuration: {
          type: 'ldap',
          endpoint: 'ldap://localhost:389',
          configuration: {
            baseDN: 'dc=example,dc=com',
            searchFilter: '(uid={username})'
          }
        }
      };

      await expect(integrationHub.registerIntegration(config)).resolves.not.toThrow();
      
      const retrieved = await integrationHub.getIntegration('test-integration');
      expect(retrieved).toEqual(config);
    });

    it('should throw error for invalid configuration', async () => {
      const invalidConfig = {
        id: '',
        name: '',
        type: 'invalid' as IntegrationType,
        enabled: true,
        configuration: {}
      } as IntegrationConfig;

      await expect(integrationHub.registerIntegration(invalidConfig))
        .rejects.toThrow('Integration config must have id, name, and type');
    });

    it('should throw error for duplicate integration ID', async () => {
      const config: IntegrationConfig = {
        id: 'duplicate-test',
        name: 'Duplicate Test',
        type: 'identity' as IntegrationType,
        enabled: true,
        configuration: {
          type: 'ldap',
          endpoint: 'ldap://localhost:389',
          configuration: {
            baseDN: 'dc=example,dc=com'
          }
        }
      };

      await integrationHub.registerIntegration(config);
      
      await expect(integrationHub.registerIntegration(config))
        .rejects.toThrow('Integration with id duplicate-test already exists');
    });
  });

  describe('removeIntegration', () => {
    it('should remove an existing integration', async () => {
      const config: IntegrationConfig = {
        id: 'remove-test',
        name: 'Remove Test',
        type: 'notification' as IntegrationType,
        enabled: true,
        configuration: {
          type: 'slack',
          configuration: {
            webhookUrl: 'https://hooks.slack.com/test'
          }
        }
      };

      await integrationHub.registerIntegration(config);
      await integrationHub.removeIntegration('remove-test');
      
      const retrieved = await integrationHub.getIntegration('remove-test');
      expect(retrieved).toBeNull();
    });

    it('should throw error for non-existent integration', async () => {
      await expect(integrationHub.removeIntegration('non-existent'))
        .rejects.toThrow('Integration non-existent not found');
    });
  });

  describe('listIntegrations', () => {
    beforeEach(async () => {
      const configs: IntegrationConfig[] = [
        {
          id: 'identity-1',
          name: 'Identity 1',
          type: 'identity' as IntegrationType,
          enabled: true,
          configuration: { type: 'ldap', endpoint: 'ldap://test1', configuration: {} }
        },
        {
          id: 'notification-1',
          name: 'Notification 1',
          type: 'notification' as IntegrationType,
          enabled: true,
          configuration: { type: 'slack', configuration: {} }
        },
        {
          id: 'identity-2',
          name: 'Identity 2',
          type: 'identity' as IntegrationType,
          enabled: false,
          configuration: { type: 'sso', endpoint: 'https://sso.test', configuration: {} }
        }
      ];

      for (const config of configs) {
        await integrationHub.registerIntegration(config);
      }
    });

    it('should list all integrations when no type filter is provided', async () => {
      const integrations = await integrationHub.listIntegrations();
      expect(integrations).toHaveLength(3);
    });

    it('should filter integrations by type', async () => {
      const identityIntegrations = await integrationHub.listIntegrations('identity');
      expect(identityIntegrations).toHaveLength(2);
      expect(identityIntegrations.every(i => i.type === 'identity')).toBe(true);

      const notificationIntegrations = await integrationHub.listIntegrations('notification');
      expect(notificationIntegrations).toHaveLength(1);
      expect(notificationIntegrations[0].type).toBe('notification');
    });
  });

  describe('syncIntegration', () => {
    it('should sync an existing integration', async () => {
      const config: IntegrationConfig = {
        id: 'sync-test',
        name: 'Sync Test',
        type: 'workflow' as IntegrationType,
        enabled: true,
        configuration: {
          type: 'jira',
          baseUrl: 'https://test.atlassian.net',
          configuration: {
            projectKey: 'TEST'
          }
        }
      };

      await integrationHub.registerIntegration(config);
      const result = await integrationHub.syncIntegration('sync-test');
      
      expect(result.success).toBe(true);
      expect(result.lastSync).toBeInstanceOf(Date);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should throw error for non-existent integration', async () => {
      await expect(integrationHub.syncIntegration('non-existent'))
        .rejects.toThrow('Integration non-existent not found');
    });
  });

  describe('healthCheck', () => {
    beforeEach(async () => {
      const config: IntegrationConfig = {
        id: 'health-test',
        name: 'Health Test',
        type: 'cicd' as IntegrationType,
        enabled: true,
        configuration: {
          type: 'jenkins',
          baseUrl: 'http://jenkins.test:8080',
          configuration: {}
        }
      };

      await integrationHub.registerIntegration(config);
    });

    it('should perform health check on specific integration', async () => {
      const results = await integrationHub.healthCheck('health-test');
      expect(results).toHaveLength(1);
      expect(results[0].integrationId).toBe('health-test');
      expect(results[0].status).toMatch(/healthy|degraded|unhealthy/);
      expect(results[0].responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should perform health check on all integrations', async () => {
      const results = await integrationHub.healthCheck();
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.every(r => r.integrationId && r.status && typeof r.responseTime === 'number')).toBe(true);
    });
  });

  describe('event handling', () => {
    it('should emit and handle integration events', async () => {
      const eventHandler = vi.fn();
      integrationHub.addEventListener('configuration-changed', eventHandler);

      const config: IntegrationConfig = {
        id: 'event-test',
        name: 'Event Test',
        type: 'monitoring' as IntegrationType,
        enabled: true,
        configuration: {
          type: 'datadog',
          configuration: {
            apiKey: 'test-key',
            region: 'us1'
          }
        }
      };

      await integrationHub.registerIntegration(config);
      
      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'configuration-changed',
          integrationId: 'event-test',
          data: { action: 'registered' }
        })
      );
    });

    it('should remove event listeners', async () => {
      const eventHandler = vi.fn();
      integrationHub.addEventListener('sync-completed', eventHandler);
      integrationHub.removeEventListener('sync-completed', eventHandler);

      const config: IntegrationConfig = {
        id: 'remove-listener-test',
        name: 'Remove Listener Test',
        type: 'identity' as IntegrationType,
        enabled: true,
        configuration: {
          type: 'ldap',
          endpoint: 'ldap://test',
          configuration: { baseDN: 'dc=test,dc=com' }
        }
      };

      await integrationHub.registerIntegration(config);
      await integrationHub.syncIntegration('remove-listener-test');
      
      expect(eventHandler).not.toHaveBeenCalled();
    });
  });
});