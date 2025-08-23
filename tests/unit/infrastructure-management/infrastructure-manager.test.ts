/**
 * Infrastructure Manager Unit Tests
 * 
 * Tests for the main infrastructure manager functionality including
 * deployment, validation, monitoring, and multi-cloud orchestration.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InfrastructureManagerImpl } from '../../../src/integration/infrastructure-management/infrastructure-manager.js';
import type { InfrastructureConfig, DeploymentResult, InfrastructureMetrics } from '../../../src/integration/infrastructure-management/interfaces.js';

describe('InfrastructureManager', () => {
  let manager: InfrastructureManagerImpl;
  let mockConfig: InfrastructureConfig;

  beforeEach(() => {
    manager = new InfrastructureManagerImpl();
    
    mockConfig = {
      id: 'test-infrastructure',
      name: 'Test Infrastructure',
      environment: 'development',
      provider: 'aws',
      region: ['us-east-1'],
      terraform: {
        version: '1.0.0',
        backend: {
          type: 's3',
          bucket: 'test-terraform-state',
          key: 'test.tfstate',
          region: 'us-east-1'
        },
        providers: [{
          name: 'aws',
          version: '~> 4.0',
          configuration: {
            region: 'us-east-1'
          }
        }],
        modules: []
      },
      networking: {
        subnets: ['subnet-12345'],
        securityGroups: ['sg-abcdef'],
        loadBalancer: {
          type: 'application',
          scheme: 'internet-facing',
          listeners: [{
            port: 80,
            protocol: 'HTTP',
            targetGroup: 'test-targets'
          }],
          healthCheck: {
            path: '/health',
            port: 80,
            protocol: 'HTTP',
            interval: 30,
            timeout: 5,
            healthyThreshold: 2,
            unhealthyThreshold: 3
          }
        }
      },
      security: {
        encryption: {
          atRest: true,
          inTransit: true,
          keyManagement: {
            provider: 'aws-kms',
            rotationEnabled: true,
            rotationInterval: 90
          }
        },
        authentication: {
          provider: 'oauth2'
        },
        authorization: {
          rbac: true,
          policies: []
        },
        compliance: {
          frameworks: ['SOC2'],
          scanning: true,
          reporting: true,
          remediation: true
        },
        audit: {
          enabled: true,
          retention: 365,
          storage: 's3://test-audit-logs',
          encryption: true
        }
      },
      monitoring: {
        metrics: {
          provider: 'prometheus',
          retention: 30,
          scrapeInterval: 15
        },
        logging: {
          provider: 'elasticsearch',
          retention: 90,
          structured: true
        },
        alerting: {
          provider: 'alertmanager',
          channels: [{
            type: 'email',
            endpoint: 'test@example.com',
            severity: 'critical'
          }]
        },
        tracing: {
          provider: 'jaeger',
          samplingRate: 0.1,
          retention: 7
        }
      },
      resources: [{
        type: 'EKS',
        name: 'test-cluster',
        properties: {
          version: '1.24'
        },
        dependencies: [],
        tags: {
          Environment: 'development',
          Project: 'test'
        }
      }],
      tags: {
        Environment: 'development',
        Project: 'test'
      }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Infrastructure Deployment', () => {
    it('should create infrastructure successfully', async () => {
      const result = await manager.createInfrastructure(mockConfig);

      expect(result.success).toBe(true);
      expect(result.deploymentId).toBeDefined();
      expect(result.resources).toHaveLength(1);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should validate configuration before deployment', async () => {
      const invalidConfig = { ...mockConfig, id: '' };

      await expect(manager.createInfrastructure(invalidConfig))
        .rejects.toThrow('Configuration validation failed');
    });

    it('should handle deployment failures gracefully', async () => {
      // Mock a failure in the deployment process
      const failingConfig = { ...mockConfig, provider: 'invalid' as any };

      await expect(manager.createInfrastructure(failingConfig))
        .rejects.toThrow();
    });

    it('should support multi-region deployment', async () => {
      const multiRegionConfig = {
        ...mockConfig,
        region: ['us-east-1', 'us-west-2']
      };

      const result = await manager.createInfrastructure(multiRegionConfig);

      expect(result.success).toBe(true);
      expect(result.outputs.primaryProvider).toBeDefined();
      expect(result.outputs.secondaryProviders).toBeDefined();
    });
  });

  describe('Infrastructure Updates', () => {
    it('should update existing infrastructure', async () => {
      // First create infrastructure
      const createResult = await manager.createInfrastructure(mockConfig);
      expect(createResult.success).toBe(true);

      // Then update it
      const updateConfig = {
        resources: [{
          type: 'EKS',
          name: 'test-cluster-updated',
          properties: {
            version: '1.25'
          },
          dependencies: [],
          tags: {
            Environment: 'development',
            Project: 'test'
          }
        }]
      };

      const updateResult = await manager.updateInfrastructure(
        createResult.deploymentId,
        updateConfig
      );

      expect(updateResult.success).toBe(true);
      expect(updateResult.deploymentId).toBe(createResult.deploymentId);
    });

    it('should fail to update non-existent infrastructure', async () => {
      await expect(manager.updateInfrastructure('non-existent', {}))
        .rejects.toThrow('Infrastructure deployment not found');
    });
  });

  describe('Infrastructure Deletion', () => {
    it('should delete existing infrastructure', async () => {
      // First create infrastructure
      const createResult = await manager.createInfrastructure(mockConfig);
      expect(createResult.success).toBe(true);

      // Then delete it
      await expect(manager.deleteInfrastructure(createResult.deploymentId))
        .resolves.not.toThrow();
    });

    it('should fail to delete non-existent infrastructure', async () => {
      await expect(manager.deleteInfrastructure('non-existent'))
        .rejects.toThrow('Infrastructure deployment not found');
    });
  });

  describe('Infrastructure Status', () => {
    it('should get infrastructure status', async () => {
      const createResult = await manager.createInfrastructure(mockConfig);
      expect(createResult.success).toBe(true);

      const status = await manager.getInfrastructureStatus(createResult.deploymentId);
      expect(status).toBe('active');
    });

    it('should fail to get status for non-existent infrastructure', async () => {
      await expect(manager.getInfrastructureStatus('non-existent'))
        .rejects.toThrow('Infrastructure deployment not found');
    });
  });

  describe('Multi-Cloud Orchestration', () => {
    it('should orchestrate multi-cloud deployment', async () => {
      const multiCloudConfig = {
        primary: {
          provider: 'aws' as const,
          regions: ['us-east-1'],
          credentials: { type: 'access-key' as const },
          infrastructure: mockConfig,
          services: []
        },
        secondary: [{
          provider: 'azure' as const,
          regions: ['eastus'],
          credentials: { type: 'managed-identity' as const },
          infrastructure: mockConfig,
          services: []
        }],
        failover: {
          enabled: true,
          strategy: 'automatic' as const,
          healthCheck: {
            path: '/health',
            port: 80,
            protocol: 'HTTP' as const,
            interval: 30,
            timeout: 5,
            healthyThreshold: 2,
            unhealthyThreshold: 3
          },
          thresholds: {
            errorRate: 0.05,
            responseTime: 1000,
            availability: 0.99,
            consecutiveFailures: 3
          },
          recovery: {
            automatic: true,
            timeout: 300,
            retries: 3,
            backoff: 'exponential' as const
          }
        },
        dataReplication: {
          enabled: true,
          strategy: 'async' as const,
          regions: ['us-east-1', 'eastus'],
          consistency: 'eventual' as const,
          conflictResolution: 'last-write-wins' as const
        },
        networkConnectivity: {
          vpn: [],
          directConnect: [],
          peering: []
        },
        loadBalancing: {
          strategy: 'latency-based' as const,
          healthCheck: {
            path: '/health',
            port: 80,
            protocol: 'HTTP' as const,
            interval: 30,
            timeout: 5,
            healthyThreshold: 2,
            unhealthyThreshold: 3
          },
          failover: {
            enabled: true,
            strategy: 'automatic' as const,
            healthCheck: {
              path: '/health',
              port: 80,
              protocol: 'HTTP' as const,
              interval: 30,
              timeout: 5,
              healthyThreshold: 2,
              unhealthyThreshold: 3
            },
            thresholds: {
              errorRate: 0.05,
              responseTime: 1000,
              availability: 0.99,
              consecutiveFailures: 3
            },
            recovery: {
              automatic: true,
              timeout: 300,
              retries: 3,
              backoff: 'exponential' as const
            }
          },
          weights: {
            aws: 0.7,
            azure: 0.3,
            gcp: 0,
            kubernetes: 0,
            hybrid: 0
          }
        }
      };

      const result = await manager.orchestrateMultiCloud(multiCloudConfig);

      expect(result.success).toBe(true);
      expect(result.deploymentId).toBeDefined();
      expect(result.outputs.primaryProvider).toBe('aws');
      expect(result.outputs.secondaryProviders).toContain('azure');
    });
  });

  describe('Metrics and Monitoring', () => {
    it('should get infrastructure metrics', async () => {
      const createResult = await manager.createInfrastructure(mockConfig);
      expect(createResult.success).toBe(true);

      const metrics = await manager.getMetrics(createResult.deploymentId);

      expect(metrics).toBeDefined();
      expect(metrics.resourceUtilization).toBeDefined();
      expect(metrics.performance).toBeDefined();
      expect(metrics.cost).toBeDefined();
      expect(metrics.availability).toBeDefined();
    });

    it('should fail to get metrics for non-existent infrastructure', async () => {
      await expect(manager.getMetrics('non-existent'))
        .rejects.toThrow('Infrastructure deployment not found');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate valid configuration', async () => {
      const result = await manager.validateConfiguration(mockConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect configuration errors', async () => {
      const invalidConfig = { ...mockConfig, id: '', provider: 'invalid' as any };

      const result = await manager.validateConfiguration(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should provide configuration warnings', async () => {
      const warningConfig = {
        ...mockConfig,
        security: {
          ...mockConfig.security,
          audit: {
            ...mockConfig.security.audit,
            enabled: false
          }
        }
      };

      const result = await manager.validateConfiguration(warningConfig);

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Event Handling', () => {
    it('should subscribe to infrastructure events', async () => {
      const events: any[] = [];
      const eventHandler = (event: any) => events.push(event);

      manager.subscribeToEvents(eventHandler);

      // Create infrastructure to trigger events
      await manager.createInfrastructure(mockConfig);

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe('created');
    });

    it('should unsubscribe from infrastructure events', async () => {
      const events: any[] = [];
      const eventHandler = (event: any) => events.push(event);

      manager.subscribeToEvents(eventHandler);
      manager.unsubscribeFromEvents(eventHandler);

      // Create infrastructure - should not trigger events
      await manager.createInfrastructure(mockConfig);

      expect(events).toHaveLength(0);
    });
  });

  describe('Provider Management', () => {
    it('should get AWS provider manager', () => {
      const awsProvider = manager.getProvider('aws');
      expect(awsProvider).toBeDefined();
      expect(awsProvider?.getProviderType()).toBe('aws');
    });

    it('should get Azure provider manager', () => {
      const azureProvider = manager.getProvider('azure');
      expect(azureProvider).toBeDefined();
      expect(azureProvider?.getProviderType()).toBe('azure');
    });

    it('should get GCP provider manager', () => {
      const gcpProvider = manager.getProvider('gcp');
      expect(gcpProvider).toBeDefined();
      expect(gcpProvider?.getProviderType()).toBe('gcp');
    });

    it('should return undefined for unsupported provider', () => {
      const unsupportedProvider = manager.getProvider('unsupported' as any);
      expect(unsupportedProvider).toBeUndefined();
    });
  });

  describe('Component Access', () => {
    it('should get Terraform manager', () => {
      const terraformManager = manager.getTerraformManager();
      expect(terraformManager).toBeDefined();
    });

    it('should get multi-cloud orchestrator', () => {
      const orchestrator = manager.getMultiCloudOrchestrator();
      expect(orchestrator).toBeDefined();
    });

    it('should get infrastructure validator', () => {
      const validator = manager.getValidator();
      expect(validator).toBeDefined();
    });

    it('should get infrastructure monitor', () => {
      const monitor = manager.getMonitor();
      expect(monitor).toBeDefined();
    });
  });

  describe('Deployment Management', () => {
    it('should track deployments', async () => {
      const createResult = await manager.createInfrastructure(mockConfig);
      expect(createResult.success).toBe(true);

      const deployments = manager.getDeployments();
      expect(deployments.size).toBe(1);
      expect(deployments.has(createResult.deploymentId)).toBe(true);
    });

    it('should get specific deployment', async () => {
      const createResult = await manager.createInfrastructure(mockConfig);
      expect(createResult.success).toBe(true);

      const deployment = manager.getDeployment(createResult.deploymentId);
      expect(deployment).toBeDefined();
      expect(deployment?.id).toBe(createResult.deploymentId);
      expect(deployment?.config).toEqual(mockConfig);
    });

    it('should return undefined for non-existent deployment', () => {
      const deployment = manager.getDeployment('non-existent');
      expect(deployment).toBeUndefined();
    });
  });
});