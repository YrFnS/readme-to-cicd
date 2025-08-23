/**
 * @fileoverview Unit tests for deployment orchestrator
 * Tests core orchestration functionality and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeploymentOrchestrator } from '../../../src/integration/deployment-orchestration/deployment-orchestrator.js';
import type { DeploymentConfig } from '../../../src/integration/deployment-orchestration/types.js';

describe('DeploymentOrchestrator Unit Tests', () => {
  let orchestrator: DeploymentOrchestrator;
  let mockConfig: DeploymentConfig;

  beforeEach(() => {
    orchestrator = new DeploymentOrchestrator();
    
    mockConfig = {
      id: 'test-deployment',
      name: 'test-app',
      version: '1.0.0',
      strategy: 'blue-green',
      environment: 'staging',
      components: [
        {
          id: 'api',
          name: 'api',
          version: '1.0.0',
          replicas: 2,
          resources: {
            cpu: '500m',
            memory: '512Mi'
          },
          healthCheck: {
            type: 'http',
            endpoint: '/health',
            port: 8080,
            initialDelaySeconds: 30,
            periodSeconds: 10,
            timeoutSeconds: 5,
            failureThreshold: 3,
            successThreshold: 1
          },
          dependencies: [],
          environment: {}
        }
      ],
      infrastructure: {
        provider: 'kubernetes',
        region: ['us-west-2'],
        networking: {
          subnets: ['subnet-123']
        },
        security: {
          authentication: { type: 'oauth', configuration: {} },
          authorization: { rbac: { enabled: true, roles: [], bindings: [] }, policies: [] },
          encryption: { inTransit: true, atRest: true, keyManagement: { provider: 'aws-kms' } },
          networkPolicies: []
        },
        monitoring: {
          metrics: { enabled: true, provider: 'prometheus', scrapeInterval: '30s', retention: '7d' },
          logging: { enabled: true, level: 'info', format: 'json', destination: 'stdout', retention: '30d' },
          tracing: { enabled: true, provider: 'jaeger', samplingRate: 0.1 },
          alerting: { enabled: true, rules: [], channels: [] }
        }
      },
      validation: {
        preDeployment: [],
        postDeployment: [],
        healthChecks: [],
        performance: [],
        security: []
      },
      rollback: {
        enabled: true,
        automatic: false,
        triggers: [],
        strategy: { type: 'immediate' },
        timeout: 300000
      },
      analytics: {
        enabled: true,
        metrics: [],
        reporting: { dashboards: [], alerts: [], exports: [] },
        retention: '30d'
      }
    };
  });

  describe('createDeployment', () => {
    it('should create deployment with valid configuration', async () => {
      const result = await orchestrator.createDeployment(mockConfig);

      expect(result.success).toBe(true);
      expect(result.deploymentId).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.message).toContain('successfully');
    });

    it('should fail with invalid strategy', async () => {
      const invalidConfig = {
        ...mockConfig,
        strategy: 'invalid-strategy' as any
      };

      const result = await orchestrator.createDeployment(invalidConfig);

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.message).toContain('validation failed');
    });

    it('should fail with missing required fields', async () => {
      const invalidConfig = {
        ...mockConfig,
        id: '',
        name: ''
      };

      const result = await orchestrator.createDeployment(invalidConfig);

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
    });

    it('should handle deployment execution errors', async () => {
      // Mock strategy to throw error
      const errorConfig = {
        ...mockConfig,
        strategy: 'blue-green',
        metadata: {
          blueGreenConfig: null // This will cause validation to fail
        }
      };

      const result = await orchestrator.createDeployment(errorConfig);

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
    });
  });

  describe('getDeploymentStatus', () => {
    it('should return deployment status for existing deployment', async () => {
      await orchestrator.createDeployment(mockConfig);
      
      const status = await orchestrator.getDeploymentStatus(mockConfig.id);

      expect(status.deploymentId).toBe(mockConfig.id);
      expect(status.status).toBeDefined();
      expect(status.progress).toBeDefined();
      expect(status.logs).toBeInstanceOf(Array);
      expect(status.metrics).toBeDefined();
    });

    it('should throw error for non-existent deployment', async () => {
      await expect(orchestrator.getDeploymentStatus('non-existent')).rejects.toThrow('Deployment not found');
    });
  });

  describe('validateDeployment', () => {
    it('should validate existing deployment', async () => {
      await orchestrator.createDeployment(mockConfig);
      
      const validation = await orchestrator.validateDeployment(mockConfig.id);

      expect(validation.success).toBe(true);
      expect(validation.results).toBeInstanceOf(Array);
      expect(validation.overallScore).toBeGreaterThan(0);
      expect(validation.recommendations).toBeInstanceOf(Array);
    });

    it('should throw error for non-existent deployment', async () => {
      await expect(orchestrator.validateDeployment('non-existent')).rejects.toThrow('Deployment not found');
    });
  });

  describe('rollbackDeployment', () => {
    it('should rollback existing deployment', async () => {
      await orchestrator.createDeployment(mockConfig);
      
      const rollbackResult = await orchestrator.rollbackDeployment(mockConfig.id);

      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.deploymentId).toBe(mockConfig.id);
      expect(rollbackResult.status).toBe('rolled-back');
      expect(rollbackResult.rollbackInfo).toBeDefined();
    });

    it('should throw error for non-existent deployment', async () => {
      const result = await orchestrator.rollbackDeployment('non-existent');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Deployment not found');
    });
  });

  describe('promoteDeployment', () => {
    it('should promote deployment between environments', async () => {
      await orchestrator.createDeployment(mockConfig);
      
      const promotionResult = await orchestrator.promoteDeployment(
        mockConfig.id,
        'staging',
        'production'
      );

      expect(promotionResult.success).toBe(true);
      expect(promotionResult.fromEnvironment).toBe('staging');
      expect(promotionResult.toEnvironment).toBe('production');
      expect(promotionResult.deploymentId).toBeDefined();
    });

    it('should handle promotion errors', async () => {
      await expect(orchestrator.promoteDeployment(
        'non-existent',
        'staging',
        'production'
      )).rejects.toThrow('Deployment not found');
    });
  });

  describe('pauseDeployment', () => {
    it('should throw error for non-existent deployment', async () => {
      await expect(orchestrator.pauseDeployment('non-existent')).rejects.toThrow('Deployment not found');
    });

    it('should throw error for completed deployment', async () => {
      await orchestrator.createDeployment(mockConfig);
      
      await expect(orchestrator.pauseDeployment(mockConfig.id)).rejects.toThrow('Cannot pause deployment');
    });
  });

  describe('resumeDeployment', () => {
    it('should throw error for non-existent deployment', async () => {
      await expect(orchestrator.resumeDeployment('non-existent')).rejects.toThrow('Deployment not found');
    });

    it('should throw error for non-paused deployment', async () => {
      await orchestrator.createDeployment(mockConfig);
      
      await expect(orchestrator.resumeDeployment(mockConfig.id)).rejects.toThrow('Cannot resume deployment');
    });
  });

  describe('cancelDeployment', () => {
    it('should throw error for non-existent deployment', async () => {
      await expect(orchestrator.cancelDeployment('non-existent')).rejects.toThrow('Deployment not found');
    });

    it('should throw error for completed deployment', async () => {
      await orchestrator.createDeployment(mockConfig);
      
      await expect(orchestrator.cancelDeployment(mockConfig.id)).rejects.toThrow('Cannot cancel deployment');
    });
  });

  describe('getDeploymentAnalytics', () => {
    it('should return analytics for existing deployment', async () => {
      await orchestrator.createDeployment(mockConfig);
      
      const analytics = await orchestrator.getDeploymentAnalytics(mockConfig.id);

      expect(analytics).toBeDefined();
      expect(analytics.duration).toBeGreaterThanOrEqual(0);
      expect(analytics.resourceUsage).toBeDefined();
      expect(analytics.performance).toBeDefined();
      expect(analytics.success).toBe(true);
      expect(analytics.rollbackCount).toBeGreaterThanOrEqual(0);
    });

    it('should throw error for non-existent deployment', async () => {
      await expect(orchestrator.getDeploymentAnalytics('non-existent')).rejects.toThrow('Deployment not found');
    });
  });

  describe('listDeployments', () => {
    it('should return empty list when no deployments exist', async () => {
      const deployments = await orchestrator.listDeployments();

      expect(deployments).toBeInstanceOf(Array);
      expect(deployments.length).toBe(0);
    });

    it('should return deployments list', async () => {
      await orchestrator.createDeployment(mockConfig);
      
      const deployments = await orchestrator.listDeployments();

      expect(deployments).toBeInstanceOf(Array);
      expect(deployments.length).toBe(1);
      expect(deployments[0].deploymentId).toBe(mockConfig.id);
    });

    it('should filter deployments by environment', async () => {
      await orchestrator.createDeployment(mockConfig);
      
      const stagingDeployments = await orchestrator.listDeployments({
        environment: 'staging'
      });
      
      const productionDeployments = await orchestrator.listDeployments({
        environment: 'production'
      });

      expect(stagingDeployments.length).toBe(1);
      expect(productionDeployments.length).toBe(0);
    });

    it('should filter deployments by status', async () => {
      await orchestrator.createDeployment(mockConfig);
      
      const completedDeployments = await orchestrator.listDeployments({
        status: 'completed'
      });
      
      const failedDeployments = await orchestrator.listDeployments({
        status: 'failed'
      });

      expect(completedDeployments.length).toBe(1);
      expect(failedDeployments.length).toBe(0);
    });

    it('should apply limit and offset', async () => {
      await orchestrator.createDeployment(mockConfig);
      await orchestrator.createDeployment({
        ...mockConfig,
        id: 'test-deployment-2'
      });
      
      const limitedDeployments = await orchestrator.listDeployments({
        limit: 1
      });
      
      const offsetDeployments = await orchestrator.listDeployments({
        offset: 1
      });

      expect(limitedDeployments.length).toBe(1);
      expect(offsetDeployments.length).toBe(1);
    });
  });
});