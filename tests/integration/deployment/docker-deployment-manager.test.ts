/**
 * Docker Deployment Manager Tests
 * Comprehensive tests for Docker deployment scenarios and rollback procedures
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DockerDeploymentManager } from '../../../src/integration/deployment/docker/docker-deployment-manager';
import { DeploymentConfig } from '../../../src/integration/deployment/types/deployment-types';

describe('DockerDeploymentManager', () => {
  let deploymentManager: DockerDeploymentManager;
  let mockDockerClient: any;

  beforeEach(() => {
    // Create mock Docker client
    mockDockerClient = {
      createContainer: vi.fn().mockResolvedValue({ id: 'mock-container-id' }),
      getContainer: vi.fn().mockReturnValue({
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined),
        inspect: vi.fn().mockResolvedValue({
          Id: 'mock-container-id',
          State: { Status: 'running', StartedAt: new Date().toISOString() },
          Config: { Image: 'test-image:latest' }
        }),
        logs: vi.fn().mockResolvedValue('mock logs'),
        stats: vi.fn().mockResolvedValue({
          cpu_stats: { cpu_usage: { total_usage: 1000000 }, system_cpu_usage: 10000000, online_cpus: 1 },
          memory_stats: { usage: 1024 * 1024 * 100, limit: 1024 * 1024 * 512 },
          networks: { eth0: { rx_bytes: 1000, tx_bytes: 2000 } },
          blkio_stats: { io_service_bytes_recursive: [] }
        })
      }),
      listContainers: vi.fn().mockResolvedValue([]),
      buildImage: vi.fn().mockResolvedValue('mock-image-id'),
      getImage: vi.fn().mockReturnValue({
        inspect: vi.fn().mockResolvedValue({ Id: 'mock-image-id' }),
        remove: vi.fn().mockResolvedValue(undefined)
      })
    };

    deploymentManager = new DockerDeploymentManager(mockDockerClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('deploy', () => {
    it('should successfully deploy a container', async () => {
      const config: DeploymentConfig = {
        id: 'test-deployment',
        name: 'test-app',
        image: 'nginx:latest',
        version: '1.0.0',
        environment: 'development',
        strategy: 'Recreate',
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
        scaling: { minReplicas: 1, maxReplicas: 1 }
      };

      const result = await deploymentManager.deploy(config);

      expect(result.success).toBe(true);
      expect(result.deploymentId).toBe('test-deployment');
      expect(result.message).toBe('Deployment completed successfully');
      expect(mockDockerClient.createContainer).toHaveBeenCalled();
      expect(mockDockerClient.getContainer).toHaveBeenCalled();
    });

    it('should handle deployment failure', async () => {
      mockDockerClient.createContainer.mockRejectedValue(new Error('Container creation failed'));

      const config: DeploymentConfig = {
        id: 'test-deployment',
        name: 'test-app',
        image: 'nginx:latest',
        version: '1.0.0',
        environment: 'development',
        strategy: 'Recreate',
        resources: {
          requests: { cpu: '100m', memory: '128Mi' },
          limits: { cpu: '500m', memory: '512Mi' }
        },
        networking: {
          ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
        },
        healthCheck: {},
        scaling: { minReplicas: 1, maxReplicas: 1 }
      };

      const result = await deploymentManager.deploy(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Deployment failed');
    });

    it('should build image when build configuration is provided', async () => {
      const config: DeploymentConfig = {
        id: 'test-deployment',
        name: 'test-app',
        image: 'test-app:latest',
        version: '1.0.0',
        environment: 'development',
        strategy: 'Recreate',
        resources: {
          requests: { cpu: '100m', memory: '128Mi' },
          limits: { cpu: '500m', memory: '512Mi' }
        },
        networking: {
          ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
        },
        healthCheck: {},
        scaling: { minReplicas: 1, maxReplicas: 1 }
      };

      // Add Docker-specific build configuration
      (config as any).docker = {
        build: {
          context: './app',
          dockerfile: 'Dockerfile',
          args: { NODE_ENV: 'production' }
        }
      };

      const result = await deploymentManager.deploy(config);

      expect(result.success).toBe(true);
      expect(mockDockerClient.buildImage).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    beforeEach(async () => {
      // Deploy initial container
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
        scaling: { minReplicas: 1, maxReplicas: 1 }
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
    });

    it('should handle rolling update strategy', async () => {
      const updateConfig = {
        image: 'nginx:2.0',
        version: '2.0.0'
      };

      const result = await deploymentManager.update('test-deployment', updateConfig);

      expect(result.success).toBe(true);
      // For Docker standalone, rolling update is essentially recreate
      expect(mockDockerClient.getContainer().stop).toHaveBeenCalled();
      expect(mockDockerClient.createContainer).toHaveBeenCalled();
    });

    it('should handle update failure', async () => {
      mockDockerClient.createContainer.mockRejectedValue(new Error('Update failed'));

      const updateConfig = {
        image: 'nginx:2.0',
        version: '2.0.0'
      };

      const result = await deploymentManager.update('test-deployment', updateConfig);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Update failed');
    });
  });

  describe('rollback', () => {
    beforeEach(async () => {
      // Deploy and update container to have rollback scenario
      const config: DeploymentConfig = {
        id: 'test-deployment',
        name: 'test-app',
        image: 'nginx:1.0',
        version: '1.0.0',
        environment: 'development',
        strategy: 'Recreate',
        resources: {
          requests: { cpu: '100m', memory: '128Mi' },
          limits: { cpu: '500m', memory: '512Mi' }
        },
        networking: {
          ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
        },
        healthCheck: {},
        scaling: { minReplicas: 1, maxReplicas: 1 }
      };

      await deploymentManager.deploy(config);
      await deploymentManager.update('test-deployment', { image: 'nginx:2.0', version: '2.0.0' });
    });

    it('should successfully rollback a deployment', async () => {
      const result = await deploymentManager.rollback('test-deployment');

      expect(result.success).toBe(true);
      expect(result.deploymentId).toBe('test-deployment');
      expect(result.rollbackInfo).toBeDefined();
      expect(result.rollbackInfo?.rollbackStrategy).toBe('immediate');
    });

    it('should rollback to specific version', async () => {
      const result = await deploymentManager.rollback('test-deployment', '1.0.0');

      expect(result.success).toBe(true);
      expect(result.rollbackInfo?.previousVersion).toBeDefined();
    });

    it('should handle rollback failure', async () => {
      mockDockerClient.getContainer().stop.mockRejectedValue(new Error('Rollback failed'));

      const result = await deploymentManager.rollback('test-deployment');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Rollback failed');
    });
  });

  describe('scale', () => {
    beforeEach(async () => {
      // Deploy initial container
      const config: DeploymentConfig = {
        id: 'test-deployment',
        name: 'test-app',
        image: 'nginx:latest',
        version: '1.0.0',
        environment: 'development',
        strategy: 'Recreate',
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

    it('should scale down to 0 replicas', async () => {
      const result = await deploymentManager.scale('test-deployment', 0);

      expect(result.success).toBe(true);
      expect(mockDockerClient.getContainer().stop).toHaveBeenCalled();
      expect(mockDockerClient.getContainer().remove).toHaveBeenCalled();
    });

    it('should scale up from 0 to 1 replica', async () => {
      // First scale down to 0
      await deploymentManager.scale('test-deployment', 0);
      
      // Then scale up to 1
      const result = await deploymentManager.scale('test-deployment', 1);

      expect(result.success).toBe(true);
      expect(mockDockerClient.createContainer).toHaveBeenCalled();
    });

    it('should reject scaling to multiple replicas for standalone Docker', async () => {
      const result = await deploymentManager.scale('test-deployment', 3);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Multiple replicas require Docker Swarm');
    });
  });

  describe('getStatus', () => {
    beforeEach(async () => {
      // Deploy initial container
      const config: DeploymentConfig = {
        id: 'test-deployment',
        name: 'test-app',
        image: 'nginx:latest',
        version: '1.0.0',
        environment: 'development',
        strategy: 'Recreate',
        resources: {
          requests: { cpu: '100m', memory: '128Mi' },
          limits: { cpu: '500m', memory: '512Mi' }
        },
        networking: {
          ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
        },
        healthCheck: {},
        scaling: { minReplicas: 1, maxReplicas: 1 }
      };

      await deploymentManager.deploy(config);
    });

    it('should return running status for healthy container', async () => {
      const status = await deploymentManager.getStatus('test-deployment');

      expect(status.phase).toBe('Running');
      expect(status.replicas.desired).toBe(1);
      expect(status.replicas.ready).toBe(1);
      expect(status.replicas.available).toBe(1);
    });

    it('should return unknown status for non-existent deployment', async () => {
      const status = await deploymentManager.getStatus('non-existent');

      expect(status.phase).toBe('Unknown');
      expect(status.replicas.desired).toBe(0);
    });
  });

  describe('getLogs', () => {
    beforeEach(async () => {
      // Deploy initial container
      const config: DeploymentConfig = {
        id: 'test-deployment',
        name: 'test-app',
        image: 'nginx:latest',
        version: '1.0.0',
        environment: 'development',
        strategy: 'Recreate',
        resources: {
          requests: { cpu: '100m', memory: '128Mi' },
          limits: { cpu: '500m', memory: '512Mi' }
        },
        networking: {
          ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
        },
        healthCheck: {},
        scaling: { minReplicas: 1, maxReplicas: 1 }
      };

      await deploymentManager.deploy(config);
    });

    it('should retrieve container logs', async () => {
      mockDockerClient.getContainer().logs.mockResolvedValue('line1\nline2\nline3');

      const logs = await deploymentManager.getLogs('test-deployment');

      expect(logs).toEqual(['line1', 'line2', 'line3']);
      expect(mockDockerClient.getContainer().logs).toHaveBeenCalled();
    });

    it('should handle log options', async () => {
      const options = {
        follow: true,
        timestamps: true,
        tailLines: 100
      };

      await deploymentManager.getLogs('test-deployment', options);

      expect(mockDockerClient.getContainer().logs).toHaveBeenCalledWith({
        follow: true,
        stdout: true,
        stderr: true,
        timestamps: true,
        tail: 100,
        since: 0
      });
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      // Deploy initial container
      const config: DeploymentConfig = {
        id: 'test-deployment',
        name: 'test-app',
        image: 'nginx:latest',
        version: '1.0.0',
        environment: 'development',
        strategy: 'Recreate',
        resources: {
          requests: { cpu: '100m', memory: '128Mi' },
          limits: { cpu: '500m', memory: '512Mi' }
        },
        networking: {
          ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
        },
        healthCheck: {},
        scaling: { minReplicas: 1, maxReplicas: 1 }
      };

      await deploymentManager.deploy(config);
    });

    it('should successfully delete a deployment', async () => {
      await deploymentManager.delete('test-deployment');

      expect(mockDockerClient.getContainer().stop).toHaveBeenCalled();
      expect(mockDockerClient.getContainer().remove).toHaveBeenCalled();
    });

    it('should handle deletion of non-existent deployment', async () => {
      // Should not throw error
      await expect(deploymentManager.delete('non-existent')).resolves.toBeUndefined();
    });
  });

  describe('getContainerStats', () => {
    beforeEach(async () => {
      // Deploy initial container
      const config: DeploymentConfig = {
        id: 'test-deployment',
        name: 'test-app',
        image: 'nginx:latest',
        version: '1.0.0',
        environment: 'development',
        strategy: 'Recreate',
        resources: {
          requests: { cpu: '100m', memory: '128Mi' },
          limits: { cpu: '500m', memory: '512Mi' }
        },
        networking: {
          ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
        },
        healthCheck: {},
        scaling: { minReplicas: 1, maxReplicas: 1 }
      };

      await deploymentManager.deploy(config);
    });

    it('should retrieve container statistics', async () => {
      const stats = await deploymentManager.getContainerStats('test-deployment');

      expect(stats).toBeDefined();
      expect(stats.containerId).toBe('mock-container-id');
      expect(stats.cpu).toBeDefined();
      expect(stats.memory).toBeDefined();
      expect(stats.network).toBeDefined();
      expect(stats.blockIO).toBeDefined();
    });
  });

  describe('deployWithCompose', () => {
    it('should deploy services using Docker Compose configuration', async () => {
      const composeConfig = {
        version: '3.8',
        services: {
          web: {
            image: 'nginx:latest',
            ports: ['80:80']
          },
          db: {
            image: 'postgres:13',
            environment: {
              POSTGRES_PASSWORD: 'password'
            }
          }
        }
      };

      const results = await deploymentManager.deployWithCompose(composeConfig, 'test-project');

      expect(results).toHaveLength(2);
      expect(results[0].deploymentId).toBe('test-project-web');
      expect(results[1].deploymentId).toBe('test-project-db');
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle Docker client errors gracefully', async () => {
      mockDockerClient.createContainer.mockRejectedValue(new Error('Docker daemon not running'));

      const config: DeploymentConfig = {
        id: 'test-deployment',
        name: 'test-app',
        image: 'nginx:latest',
        version: '1.0.0',
        environment: 'development',
        strategy: 'Recreate',
        resources: {
          requests: { cpu: '100m', memory: '128Mi' },
          limits: { cpu: '500m', memory: '512Mi' }
        },
        networking: {
          ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
        },
        healthCheck: {},
        scaling: { minReplicas: 1, maxReplicas: 1 }
      };

      const result = await deploymentManager.deploy(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Docker daemon not running');
    });

    it('should validate deployment configuration', async () => {
      const invalidConfig = {
        // Missing required fields
        name: 'test-app'
      } as DeploymentConfig;

      const result = await deploymentManager.deploy(invalidConfig);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Deployment ID is required');
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
        strategy: 'Recreate',
        resources: {
          requests: { cpu: '100m', memory: '128Mi' },
          limits: { cpu: '500m', memory: '512Mi' }
        },
        networking: {
          ports: [{ name: 'http', containerPort: 80, protocol: 'TCP' }]
        },
        healthCheck: {},
        scaling: { minReplicas: 1, maxReplicas: 1 }
      };

      await deploymentManager.deploy(config);

      expect(deploymentStartedSpy).toHaveBeenCalledWith({ deploymentId: 'test-deployment' });
      expect(deploymentCompletedSpy).toHaveBeenCalled();
    });
  });
});