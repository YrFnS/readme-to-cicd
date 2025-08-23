/**
 * Kubernetes Deployment Manager Tests
 * Comprehensive tests for Kubernetes deployment scenarios and rollback procedures
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { KubernetesDeploymentManager } from '../../../src/integration/deployment/kubernetes/kubernetes-deployment-manager';
import { DeploymentConfig } from '../../../src/integration/deployment/types/deployment-types';

describe('KubernetesDeploymentManager', () => {
  let deploymentManager: KubernetesDeploymentManager;
  let mockKubernetesClient: any;
  let mockHelmClient: any;

  beforeEach(() => {
    // Create mock Kubernetes client
    mockKubernetesClient = {
      apps: {
        v1: {
          createNamespacedDeployment: vi.fn().mockResolvedValue({
            metadata: { name: 'test-app', namespace: 'default' }
          }),
          readNamespacedDeployment: vi.fn().mockResolvedValue({
            metadata: { name: 'test-app', namespace: 'default' },
            status: {
              replicas: 1,
              readyReplicas: 1,
              availableReplicas: 1,
              conditions: [{
                type: 'Available',
                status: 'True',
                lastTransitionTime: new Date().toISOString(),
                lastUpdateTime: new Date().toISOString()
              }]
            }
          }),
          patchNamespacedDeployment: vi.fn().mockResolvedValue({
            metadata: { name: 'test-app' }
          }),
          deleteNamespacedDeployment: vi.fn().mockResolvedValue({}),
          listNamespacedDeployment: vi.fn().mockResolvedValue({ items: [] })
        }
      },
      core: {
        v1: {
          createNamespacedService: vi.fn().mockResolvedValue({
            metadata: { name: 'test-app' }
          }),
          createNamespacedConfigMap: vi.fn().mockResolvedValue({
            metadata: { name: 'test-app-config' }
          }),
          createNamespacedSecret: vi.fn().mockResolvedValue({
            metadata: { name: 'test-app-secret' }
          }),
          readNamespacedPodLog: vi.fn().mockResolvedValue('mock logs'),
          readNamespace: vi.fn().mockResolvedValue({
            metadata: { name: 'default' }
          }),
          createNamespace: vi.fn().mockResolvedValue({
            metadata: { name: 'test-namespace' }
          }),
          listNamespacedPod: vi.fn().mockResolvedValue({
            items: [{
              metadata: { name: 'test-app-pod-1' }
            }]
          }),
          deleteNamespacedService: vi.fn().mockResolvedValue({}),
          readNamespacedService: vi.fn().mockResolvedValue({
            metadata: { name: 'test-app' },
            status: {}
          }),
          listNamespacedEvent: vi.fn().mockResolvedValue({
            items: [{
              metadata: { name: 'event-1' },
              involvedObject: { name: 'test-app' },
              reason: 'Created',
              message: 'Deployment created',
              firstTimestamp: new Date().toISOString(),
              lastTimestamp: new Date().toISOString(),
              count: 1,
              type: 'Normal'
            }]
          })
        }
      },
      networking: {
        v1: {
          createNamespacedIngress: vi.fn().mockResolvedValue({
            metadata: { name: 'test-app-ingress' }
          }),
          deleteNamespacedIngress: vi.fn().mockResolvedValue({}),
          readNamespacedIngress: vi.fn().mockResolvedValue({
            metadata: { name: 'test-app-ingress' },
            status: {}
          })
        }
      },
      autoscaling: {
        v2: {
          createNamespacedHorizontalPodAutoscaler: vi.fn().mockResolvedValue({
            metadata: { name: 'test-app-hpa' }
          }),
          deleteNamespacedHorizontalPodAutoscaler: vi.fn().mockResolvedValue({})
        }
      }
    };

    // Create mock Helm client
    mockHelmClient = {
      install: vi.fn().mockResolvedValue({ name: 'test-release' }),
      upgrade: vi.fn().mockResolvedValue({ name: 'test-release' }),
      uninstall: vi.fn().mockResolvedValue({ name: 'test-release' }),
      status: vi.fn().mockResolvedValue({ status: 'deployed' }),
      list: vi.fn().mockResolvedValue([]),
      rollback: vi.fn().mockResolvedValue({ name: 'test-release' })
    };

    deploymentManager = new KubernetesDeploymentManager();
    // Inject mock clients
    (deploymentManager as any).kubernetesClient = mockKubernetesClient;
    (deploymentManager as any).helmClient = mockHelmClient;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('deploy', () => {
    it('should successfully deploy to Kubernetes', async () => {
      const config: DeploymentConfig = {
        id: 'test-deployment',
        name: 'test-app',
        image: 'nginx:latest',
        version: '1.0.0',
        environment: 'development',
        strategy: 'RollingUpdate',
        resources: {
          requests: { cpu: '100m', memory: '128Mi' },
          limits: { cpu: '500m', memory: '512Mi' }
        },
        networking: {
          ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
        },
        healthCheck: {
          livenessProbe: {
            type: 'http',
            httpGet: { path: '/health', port: 80 },
            initialDelaySeconds: 30,
            periodSeconds: 10,
            timeoutSeconds: 5,
            failureThreshold: 3,
            successThreshold: 1
          }
        },
        scaling: { minReplicas: 1, maxReplicas: 3 }
      };

      const result = await deploymentManager.deploy(config);

      expect(result.success).toBe(true);
      expect(result.deploymentId).toBe('test-deployment');
      expect(result.message).toBe('Kubernetes deployment completed successfully');
      expect(mockKubernetesClient.apps.v1.createNamespacedDeployment).toHaveBeenCalled();
      expect(mockKubernetesClient.core.v1.createNamespacedService).toHaveBeenCalled();
    });

    it('should deploy using Helm chart', async () => {
      const config: DeploymentConfig = {
        id: 'test-deployment',
        name: 'test-app',
        image: 'nginx:latest',
        version: '1.0.0',
        environment: 'development',
        strategy: 'RollingUpdate',
        resources: {
          requests: { cpu: '100m', memory: '128Mi' },
          limits: { cpu: '500m', memory: '512Mi' }
        },
        networking: {
          ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
        },
        healthCheck: {},
        scaling: { minReplicas: 1, maxReplicas: 3 }
      };

      // Add Helm chart configuration
      (config as any).helmChart = {
        name: 'nginx',
        repository: 'https://charts.bitnami.com/bitnami',
        version: '13.2.0',
        values: {
          image: {
            tag: '1.0.0'
          }
        },
        namespace: 'default',
        wait: true
      };

      const result = await deploymentManager.deploy(config);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Helm deployment completed successfully');
      expect(mockHelmClient.install).toHaveBeenCalled();
    });

    it('should handle deployment failure', async () => {
      mockKubernetesClient.apps.v1.createNamespacedDeployment.mockRejectedValue(
        new Error('Deployment creation failed')
      );

      const config: DeploymentConfig = {
        id: 'test-deployment',
        name: 'test-app',
        image: 'nginx:latest',
        version: '1.0.0',
        environment: 'development',
        strategy: 'RollingUpdate',
        resources: {
          requests: { cpu: '100m', memory: '128Mi' },
          limits: { cpu: '500m', memory: '512Mi' }
        },
        networking: {
          ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
        },
        healthCheck: {},
        scaling: { minReplicas: 1, maxReplicas: 3 }
      };

      const result = await deploymentManager.deploy(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Deployment failed');
    });

    it('should create namespace if it does not exist', async () => {
      mockKubernetesClient.core.v1.readNamespace.mockRejectedValue(
        new Error('Namespace not found')
      );

      const config: DeploymentConfig = {
        id: 'test-deployment',
        name: 'test-app',
        image: 'nginx:latest',
        version: '1.0.0',
        environment: 'production', // This should create 'production' namespace
        strategy: 'RollingUpdate',
        resources: {
          requests: { cpu: '100m', memory: '128Mi' },
          limits: { cpu: '500m', memory: '512Mi' }
        },
        networking: {
          ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
        },
        healthCheck: {},
        scaling: { minReplicas: 1, maxReplicas: 3 }
      };

      await deploymentManager.deploy(config);

      expect(mockKubernetesClient.core.v1.createNamespace).toHaveBeenCalledWith({
        metadata: { name: 'production' }
      });
    });
  });

  describe('update', () => {
    beforeEach(async () => {
      // Deploy initial deployment
      const config: DeploymentConfig = {
        id: 'test-deployment',
        name: 'test-app',
        image: 'nginx:1.0',
        version: '1.0.0',
        environment: 'development',
        strategy: 'RollingUpdate',
        resources: {
          requests: { cpu: '100m', memory: '128Mi' },
          limits: { cpu: '500m', memory: '512Mi' }
        },
        networking: {
          ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
        },
        healthCheck: {},
        scaling: { minReplicas: 1, maxReplicas: 3 }
      };

      await deploymentManager.deploy(config);
    });

    it('should successfully update a deployment', async () => {
      const updateConfig = {
        image: 'nginx:2.0',
        version: '2.0.0'
      };

      const result = await deploymentManager.update('test-deployment', updateConfig);

      expect(result.success).toBe(true);
      expect(result.deploymentId).toBe('test-deployment');
      expect(mockKubernetesClient.apps.v1.patchNamespacedDeployment).toHaveBeenCalled();
    });

    it('should handle update failure', async () => {
      mockKubernetesClient.apps.v1.patchNamespacedDeployment.mockRejectedValue(
        new Error('Update failed')
      );

      const updateConfig = {
        image: 'nginx:2.0',
        version: '2.0.0'
      };

      const result = await deploymentManager.update('test-deployment', updateConfig);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Update failed');
    });

    it('should update resource requirements', async () => {
      const updateConfig = {
        resources: {
          requests: { cpu: '200m', memory: '256Mi' },
          limits: { cpu: '1000m', memory: '1Gi' }
        }
      };

      const result = await deploymentManager.update('test-deployment', updateConfig);

      expect(result.success).toBe(true);
      expect(mockKubernetesClient.apps.v1.patchNamespacedDeployment).toHaveBeenCalledWith(
        'test-app',
        'default',
        expect.objectContaining({
          spec: expect.objectContaining({
            template: expect.objectContaining({
              spec: expect.objectContaining({
                containers: expect.arrayContaining([
                  expect.objectContaining({
                    resources: expect.objectContaining({
                      requests: { cpu: '200m', memory: '256Mi' },
                      limits: { cpu: '1000m', memory: '1Gi' }
                    })
                  })
                ])
              })
            })
          })
        }),
        undefined,
        undefined,
        undefined,
        undefined,
        { headers: { 'Content-Type': 'application/strategic-merge-patch+json' } }
      );
    });
  });

  describe('rollback', () => {
    beforeEach(async () => {
      // Deploy and update deployment to have rollback scenario
      const config: DeploymentConfig = {
        id: 'test-deployment',
        name: 'test-app',
        image: 'nginx:1.0',
        version: '1.0.0',
        environment: 'development',
        strategy: 'RollingUpdate',
        resources: {
          requests: { cpu: '100m', memory: '128Mi' },
          limits: { cpu: '500m', memory: '512Mi' }
        },
        networking: {
          ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
        },
        healthCheck: {},
        scaling: { minReplicas: 1, maxReplicas: 3 }
      };

      await deploymentManager.deploy(config);
      await deploymentManager.update('test-deployment', { image: 'nginx:2.0', version: '2.0.0' });
    });

    it('should successfully rollback a deployment', async () => {
      const result = await deploymentManager.rollback('test-deployment');

      expect(result.success).toBe(true);
      expect(result.deploymentId).toBe('test-deployment');
      expect(result.rollbackInfo).toBeDefined();
      expect(result.rollbackInfo?.rollbackStrategy).toBe('gradual');
      expect(mockKubernetesClient.apps.v1.patchNamespacedDeployment).toHaveBeenCalled();
    });

    it('should rollback using Helm for Helm deployments', async () => {
      // Add Helm chart to deployment
      const deployments = (deploymentManager as any).deployments;
      const config = deployments.get('test-deployment');
      config.helmChart = { name: 'test-chart' };
      deployments.set('test-deployment', config);

      const result = await deploymentManager.rollback('test-deployment', '1');

      expect(result.success).toBe(true);
      expect(mockHelmClient.rollback).toHaveBeenCalledWith('test-app', {
        revision: 1,
        namespace: 'default'
      });
    });

    it('should handle rollback failure', async () => {
      mockKubernetesClient.apps.v1.patchNamespacedDeployment.mockRejectedValue(
        new Error('Rollback failed')
      );

      const result = await deploymentManager.rollback('test-deployment');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Rollback failed');
    });
  });

  describe('scale', () => {
    beforeEach(async () => {
      // Deploy initial deployment
      const config: DeploymentConfig = {
        id: 'test-deployment',
        name: 'test-app',
        image: 'nginx:latest',
        version: '1.0.0',
        environment: 'development',
        strategy: 'RollingUpdate',
        resources: {
          requests: { cpu: '100m', memory: '128Mi' },
          limits: { cpu: '500m', memory: '512Mi' }
        },
        networking: {
          ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
        },
        healthCheck: {},
        scaling: { minReplicas: 1, maxReplicas: 5 }
      };

      await deploymentManager.deploy(config);
    });

    it('should scale deployment to specified replicas', async () => {
      const result = await deploymentManager.scale('test-deployment', 3);

      expect(result.success).toBe(true);
      expect(mockKubernetesClient.apps.v1.patchNamespacedDeployment).toHaveBeenCalledWith(
        'test-app',
        'default',
        { spec: { replicas: 3 } }
      );
    });

    it('should scale down to 0 replicas', async () => {
      const result = await deploymentManager.scale('test-deployment', 0);

      expect(result.success).toBe(true);
      expect(mockKubernetesClient.apps.v1.patchNamespacedDeployment).toHaveBeenCalledWith(
        'test-app',
        'default',
        { spec: { replicas: 0 } }
      );
    });

    it('should handle scaling failure', async () => {
      mockKubernetesClient.apps.v1.patchNamespacedDeployment.mockRejectedValue(
        new Error('Scaling failed')
      );

      const result = await deploymentManager.scale('test-deployment', 3);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Scaling failed');
    });
  });

  describe('getStatus', () => {
    beforeEach(async () => {
      // Deploy initial deployment
      const config: DeploymentConfig = {
        id: 'test-deployment',
        name: 'test-app',
        image: 'nginx:latest',
        version: '1.0.0',
        environment: 'development',
        strategy: 'RollingUpdate',
        resources: {
          requests: { cpu: '100m', memory: '128Mi' },
          limits: { cpu: '500m', memory: '512Mi' }
        },
        networking: {
          ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
        },
        healthCheck: {},
        scaling: { minReplicas: 1, maxReplicas: 3 }
      };

      await deploymentManager.deploy(config);
    });

    it('should return running status for healthy deployment', async () => {
      const status = await deploymentManager.getStatus('test-deployment');

      expect(status.phase).toBe('Running');
      expect(status.replicas.desired).toBe(1);
      expect(status.replicas.ready).toBe(1);
      expect(status.replicas.available).toBe(1);
      expect(status.conditions).toHaveLength(1);
      expect(status.conditions[0].type).toBe('Available');
      expect(status.conditions[0].status).toBe('True');
    });

    it('should return unknown status for non-existent deployment', async () => {
      const status = await deploymentManager.getStatus('non-existent');

      expect(status.phase).toBe('Unknown');
      expect(status.replicas.desired).toBe(0);
    });

    it('should handle status check failure', async () => {
      mockKubernetesClient.apps.v1.readNamespacedDeployment.mockRejectedValue(
        new Error('Status check failed')
      );

      const status = await deploymentManager.getStatus('test-deployment');

      expect(status.phase).toBe('Unknown');
      expect(status.conditions[0].type).toBe('Available');
      expect(status.conditions[0].status).toBe('False');
      expect(status.conditions[0].reason).toBe('StatusCheckFailed');
    });
  });

  describe('getLogs', () => {
    beforeEach(async () => {
      // Deploy initial deployment
      const config: DeploymentConfig = {
        id: 'test-deployment',
        name: 'test-app',
        image: 'nginx:latest',
        version: '1.0.0',
        environment: 'development',
        strategy: 'RollingUpdate',
        resources: {
          requests: { cpu: '100m', memory: '128Mi' },
          limits: { cpu: '500m', memory: '512Mi' }
        },
        networking: {
          ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
        },
        healthCheck: {},
        scaling: { minReplicas: 1, maxReplicas: 3 }
      };

      await deploymentManager.deploy(config);
    });

    it('should retrieve pod logs', async () => {
      mockKubernetesClient.core.v1.readNamespacedPodLog.mockResolvedValue('line1\nline2\nline3');

      const logs = await deploymentManager.getLogs('test-deployment');

      expect(logs).toEqual(['line1', 'line2', 'line3']);
      expect(mockKubernetesClient.core.v1.listNamespacedPod).toHaveBeenCalled();
      expect(mockKubernetesClient.core.v1.readNamespacedPodLog).toHaveBeenCalled();
    });

    it('should handle log options', async () => {
      const options = {
        follow: true,
        timestamps: true,
        tailLines: 100,
        container: 'nginx'
      };

      await deploymentManager.getLogs('test-deployment', options);

      expect(mockKubernetesClient.core.v1.readNamespacedPodLog).toHaveBeenCalledWith(
        'test-app-pod-1',
        'default',
        {
          container: 'nginx',
          follow: true,
          previous: false,
          sinceSeconds: undefined,
          sinceTime: undefined,
          timestamps: true,
          tailLines: 100,
          limitBytes: undefined
        }
      );
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      // Deploy initial deployment
      const config: DeploymentConfig = {
        id: 'test-deployment',
        name: 'test-app',
        image: 'nginx:latest',
        version: '1.0.0',
        environment: 'development',
        strategy: 'RollingUpdate',
        resources: {
          requests: { cpu: '100m', memory: '128Mi' },
          limits: { cpu: '500m', memory: '512Mi' }
        },
        networking: {
          ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
        },
        healthCheck: {},
        scaling: { minReplicas: 1, maxReplicas: 3 }
      };

      await deploymentManager.deploy(config);
    });

    it('should successfully delete a deployment', async () => {
      await deploymentManager.delete('test-deployment');

      expect(mockKubernetesClient.apps.v1.deleteNamespacedDeployment).toHaveBeenCalledWith(
        'test-app',
        'default'
      );
      expect(mockKubernetesClient.core.v1.deleteNamespacedService).toHaveBeenCalled();
    });

    it('should delete using Helm for Helm deployments', async () => {
      // Add Helm chart to deployment
      const deployments = (deploymentManager as any).deployments;
      const config = deployments.get('test-deployment');
      config.helmChart = { name: 'test-chart' };
      deployments.set('test-deployment', config);

      await deploymentManager.delete('test-deployment');

      expect(mockHelmClient.uninstall).toHaveBeenCalledWith('test-app', { namespace: 'default' });
    });

    it('should handle deletion of non-existent deployment', async () => {
      // Should not throw error
      await expect(deploymentManager.delete('non-existent')).resolves.toBeUndefined();
    });
  });

  describe('getEvents', () => {
    beforeEach(async () => {
      // Deploy initial deployment
      const config: DeploymentConfig = {
        id: 'test-deployment',
        name: 'test-app',
        image: 'nginx:latest',
        version: '1.0.0',
        environment: 'development',
        strategy: 'RollingUpdate',
        resources: {
          requests: { cpu: '100m', memory: '128Mi' },
          limits: { cpu: '500m', memory: '512Mi' }
        },
        networking: {
          ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
        },
        healthCheck: {},
        scaling: { minReplicas: 1, maxReplicas: 3 }
      };

      await deploymentManager.deploy(config);
    });

    it('should retrieve deployment events', async () => {
      const events = await deploymentManager.getEvents('test-deployment');

      expect(events).toHaveLength(1);
      expect(events[0].reason).toBe('Created');
      expect(events[0].message).toBe('Deployment created');
      expect(events[0].type).toBe('Normal');
      expect(mockKubernetesClient.core.v1.listNamespacedEvent).toHaveBeenCalledWith(
        'default',
        undefined,
        undefined,
        undefined,
        'involvedObject.name=test-app'
      );
    });
  });

  describe('getResourceStatus', () => {
    beforeEach(async () => {
      // Deploy initial deployment
      const config: DeploymentConfig = {
        id: 'test-deployment',
        name: 'test-app',
        image: 'nginx:latest',
        version: '1.0.0',
        environment: 'development',
        strategy: 'RollingUpdate',
        resources: {
          requests: { cpu: '100m', memory: '128Mi' },
          limits: { cpu: '500m', memory: '512Mi' }
        },
        networking: {
          ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
        },
        healthCheck: {},
        scaling: { minReplicas: 1, maxReplicas: 3 }
      };

      await deploymentManager.deploy(config);
    });

    it('should retrieve status of all related resources', async () => {
      const resources = await deploymentManager.getResourceStatus('test-deployment');

      expect(resources.length).toBeGreaterThan(0);
      expect(resources[0].kind).toBe('Deployment');
      expect(resources[0].apiVersion).toBe('apps/v1');
      expect(mockKubernetesClient.apps.v1.readNamespacedDeployment).toHaveBeenCalled();
      expect(mockKubernetesClient.core.v1.readNamespacedService).toHaveBeenCalled();
    });
  });

  describe('waitForRollout', () => {
    beforeEach(async () => {
      // Deploy initial deployment
      const config: DeploymentConfig = {
        id: 'test-deployment',
        name: 'test-app',
        image: 'nginx:latest',
        version: '1.0.0',
        environment: 'development',
        strategy: 'RollingUpdate',
        resources: {
          requests: { cpu: '100m', memory: '128Mi' },
          limits: { cpu: '500m', memory: '512Mi' }
        },
        networking: {
          ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
        },
        healthCheck: {},
        scaling: { minReplicas: 1, maxReplicas: 3 }
      };

      await deploymentManager.deploy(config);
    });

    it('should wait for successful rollout', async () => {
      // Mock successful rollout
      mockKubernetesClient.apps.v1.readNamespacedDeployment.mockResolvedValue({
        status: {
          replicas: 1,
          readyReplicas: 1,
          conditions: [{
            type: 'Progressing',
            status: 'True'
          }]
        }
      });

      // This is tested indirectly through update/deploy operations
      const result = await deploymentManager.update('test-deployment', { image: 'nginx:2.0' });
      expect(result.success).toBe(true);
    });

    it('should handle rollout timeout', async () => {
      // Mock deployment that never becomes ready
      mockKubernetesClient.apps.v1.readNamespacedDeployment.mockResolvedValue({
        status: {
          replicas: 1,
          readyReplicas: 0,
          conditions: [{
            type: 'Progressing',
            status: 'True'
          }]
        }
      });

      // Use a very short timeout for testing
      const waitForRollout = (deploymentManager as any).waitForRollout;
      await expect(waitForRollout('test-app', 'default', 0.1)).rejects.toThrow('Rollout timeout');
    });
  });

  describe('error handling', () => {
    it('should handle Kubernetes API errors gracefully', async () => {
      mockKubernetesClient.apps.v1.createNamespacedDeployment.mockRejectedValue(
        new Error('Kubernetes API server unavailable')
      );

      const config: DeploymentConfig = {
        id: 'test-deployment',
        name: 'test-app',
        image: 'nginx:latest',
        version: '1.0.0',
        environment: 'development',
        strategy: 'RollingUpdate',
        resources: {
          requests: { cpu: '100m', memory: '128Mi' },
          limits: { cpu: '500m', memory: '512Mi' }
        },
        networking: {
          ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
        },
        healthCheck: {},
        scaling: { minReplicas: 1, maxReplicas: 3 }
      };

      const result = await deploymentManager.deploy(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Kubernetes API server unavailable');
    });

    it('should handle Helm errors gracefully', async () => {
      mockHelmClient.install.mockRejectedValue(new Error('Helm chart not found'));

      const config: DeploymentConfig = {
        id: 'test-deployment',
        name: 'test-app',
        image: 'nginx:latest',
        version: '1.0.0',
        environment: 'development',
        strategy: 'RollingUpdate',
        resources: {
          requests: { cpu: '100m', memory: '128Mi' },
          limits: { cpu: '500m', memory: '512Mi' }
        },
        networking: {
          ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
        },
        healthCheck: {},
        scaling: { minReplicas: 1, maxReplicas: 3 }
      };

      // Add Helm chart configuration
      (config as any).helmChart = {
        name: 'non-existent-chart',
        repository: 'https://charts.example.com'
      };

      const result = await deploymentManager.deploy(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Helm chart not found');
    });
  });

  describe('event emission', () => {
    it('should emit deployment events', async () => {
      const deploymentStartedSpy = vi.fn();
      const deploymentCompletedSpy = vi.fn();

      deploymentManager.on('deploymentStarted', deploymentStartedSpy);
      deploymentManager.on('deploymentCompleted', deploymentCompletedSpy);

      const config: DeploymentConfig = {
        id: 'test-deployment',
        name: 'test-app',
        image: 'nginx:latest',
        version: '1.0.0',
        environment: 'development',
        strategy: 'RollingUpdate',
        resources: {
          requests: { cpu: '100m', memory: '128Mi' },
          limits: { cpu: '500m', memory: '512Mi' }
        },
        networking: {
          ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
        },
        healthCheck: {},
        scaling: { minReplicas: 1, maxReplicas: 3 }
      };

      await deploymentManager.deploy(config);

      expect(deploymentStartedSpy).toHaveBeenCalledWith({ deploymentId: 'test-deployment' });
      expect(deploymentCompletedSpy).toHaveBeenCalled();
    });
  });
});