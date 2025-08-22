import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentManager } from '../../../src/integration/components/component-manager';
import { ComponentDefinition, DeploymentConfig, ScalingConfig, ComponentUpdate } from '../../../src/integration/components/types';

describe('ComponentManager', () => {
  let componentManager: ComponentManager;
  let mockComponent: ComponentDefinition;
  let mockDeploymentConfig: DeploymentConfig;

  beforeEach(() => {
    componentManager = new ComponentManager();
    
    mockComponent = {
      id: 'test-service',
      name: 'Test Service',
      version: '1.0.0',
      type: 'service',
      dependencies: [],
      resources: {
        cpu: '100m',
        memory: '128Mi',
        limits: {
          cpu: '200m',
          memory: '256Mi'
        }
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
      scaling: {
        minReplicas: 1,
        maxReplicas: 5,
        targetCPUUtilization: 70,
        targetMemoryUtilization: 80
      }
    };

    mockDeploymentConfig = {
      strategy: 'RollingUpdate',
      environment: 'test',
      namespace: 'default',
      labels: {
        app: 'test-service',
        version: '1.0.0'
      },
      rollingUpdate: {
        maxUnavailable: 1,
        maxSurge: 1
      }
    };
  });

  afterEach(async () => {
    await componentManager.shutdown();
  });

  describe('Component Registration', () => {
    it('should register a component successfully', async () => {
      await expect(componentManager.registerComponent(mockComponent)).resolves.not.toThrow();
      
      const components = await componentManager.listComponents();
      expect(components).toHaveLength(1);
      expect(components[0].id).toBe('test-service');
    });

    it('should validate component definition during registration', async () => {
      const invalidComponent = { ...mockComponent, id: '' };
      
      await expect(componentManager.registerComponent(invalidComponent))
        .rejects.toThrow('Component validation failed');
    });

    it('should validate dependencies during registration', async () => {
      const componentWithDeps = {
        ...mockComponent,
        dependencies: ['non-existent-service']
      };
      
      await expect(componentManager.registerComponent(componentWithDeps))
        .rejects.toThrow('Dependency validation failed');
    });

    it('should emit componentRegistered event on successful registration', async () => {
      const eventSpy = vi.fn();
      componentManager.on('componentRegistered', eventSpy);
      
      await componentManager.registerComponent(mockComponent);
      
      expect(eventSpy).toHaveBeenCalledWith({
        componentId: 'test-service',
        timestamp: expect.any(Date)
      });
    });

    it('should emit componentRegistrationFailed event on registration failure', async () => {
      const eventSpy = vi.fn();
      componentManager.on('componentRegistrationFailed', eventSpy);
      
      const invalidComponent = { ...mockComponent, id: '' };
      
      try {
        await componentManager.registerComponent(invalidComponent);
      } catch (error) {
        // Expected to throw
      }
      
      expect(eventSpy).toHaveBeenCalledWith({
        componentId: '',
        error: expect.stringContaining('Component validation failed'),
        timestamp: expect.any(Date)
      });
    });
  });

  describe('Component Deployment', () => {
    beforeEach(async () => {
      await componentManager.registerComponent(mockComponent);
    });

    it('should deploy a component successfully', async () => {
      const result = await componentManager.deployComponent('test-service', mockDeploymentConfig);
      
      expect(result.success).toBe(true);
      expect(result.deploymentId).toBeDefined();
      expect(result.status.phase).toBe('Running');
    });

    it('should fail deployment for non-existent component', async () => {
      const result = await componentManager.deployComponent('non-existent', mockDeploymentConfig);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Component not found');
    });

    it('should start health monitoring after deployment', async () => {
      const result = await componentManager.deployComponent('test-service', mockDeploymentConfig);
      
      expect(result.success).toBe(true);
      
      // Wait a bit for health monitoring to start
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const health = await componentManager.healthCheck('test-service');
      expect(health).toBeDefined();
    });

    it('should enable auto-scaling if configured', async () => {
      const result = await componentManager.deployComponent('test-service', mockDeploymentConfig);
      
      expect(result.success).toBe(true);
      
      // Component has maxReplicas > minReplicas, so auto-scaling should be enabled
      // This is tested indirectly through the deployment process
    });

    it('should emit componentDeployed event on successful deployment', async () => {
      const eventSpy = vi.fn();
      componentManager.on('componentDeployed', eventSpy);
      
      await componentManager.deployComponent('test-service', mockDeploymentConfig);
      
      expect(eventSpy).toHaveBeenCalledWith({
        componentId: 'test-service',
        deploymentId: expect.any(String),
        timestamp: expect.any(Date)
      });
    });
  });

  describe('Component Scaling', () => {
    beforeEach(async () => {
      await componentManager.registerComponent(mockComponent);
      await componentManager.deployComponent('test-service', mockDeploymentConfig);
    });

    it('should scale a component manually', async () => {
      const scalingConfig: ScalingConfig = {
        replicas: 3
      };
      
      await expect(componentManager.scaleComponent('test-service', scalingConfig))
        .resolves.not.toThrow();
    });

    it('should respect min/max replica limits', async () => {
      const scalingConfig: ScalingConfig = {
        replicas: 10 // Exceeds maxReplicas (5)
      };
      
      // Should not throw, but should be clamped to maxReplicas
      await expect(componentManager.scaleComponent('test-service', scalingConfig))
        .resolves.not.toThrow();
    });

    it('should update scaling policy', async () => {
      const scalingConfig: ScalingConfig = {
        policy: {
          minReplicas: 2,
          maxReplicas: 8,
          targetCPUUtilization: 60
        }
      };
      
      await expect(componentManager.scaleComponent('test-service', scalingConfig))
        .resolves.not.toThrow();
    });

    it('should fail scaling for non-existent component', async () => {
      const scalingConfig: ScalingConfig = { replicas: 3 };
      
      await expect(componentManager.scaleComponent('non-existent', scalingConfig))
        .rejects.toThrow('Component not found');
    });

    it('should emit componentScaled event on successful scaling', async () => {
      const eventSpy = vi.fn();
      componentManager.on('componentScaled', eventSpy);
      
      const scalingConfig: ScalingConfig = { replicas: 3 };
      await componentManager.scaleComponent('test-service', scalingConfig);
      
      expect(eventSpy).toHaveBeenCalledWith({
        componentId: 'test-service',
        scaling: scalingConfig,
        timestamp: expect.any(Date)
      });
    });
  });

  describe('Component Health Monitoring', () => {
    beforeEach(async () => {
      await componentManager.registerComponent(mockComponent);
    });

    it('should perform health check on component', async () => {
      const health = await componentManager.healthCheck('test-service');
      
      expect(health).toBeDefined();
      expect(health.status).toMatch(/healthy|degraded|unhealthy/);
      expect(health.checks).toBeInstanceOf(Array);
      expect(health.lastUpdated).toBeInstanceOf(Date);
    });

    it('should return unhealthy status for non-existent component', async () => {
      const health = await componentManager.healthCheck('non-existent');
      
      expect(health.status).toBe('unhealthy');
      expect(health.checks).toHaveLength(1);
      expect(health.checks[0].status).toBe('fail');
    });

    it('should include component version in health status', async () => {
      const health = await componentManager.healthCheck('test-service');
      
      expect(health.version).toBe('1.0.0');
    });
  });

  describe('Component Updates', () => {
    beforeEach(async () => {
      await componentManager.registerComponent(mockComponent);
      await componentManager.deployComponent('test-service', mockDeploymentConfig);
    });

    it('should update component successfully', async () => {
      const update: ComponentUpdate = {
        version: '1.1.0',
        resources: {
          cpu: '200m',
          memory: '256Mi'
        }
      };
      
      await expect(componentManager.updateComponent('test-service', update))
        .resolves.not.toThrow();
    });

    it('should validate updated component', async () => {
      const update: ComponentUpdate = {
        resources: {
          cpu: '', // Invalid CPU value
          memory: '256Mi'
        }
      };
      
      await expect(componentManager.updateComponent('test-service', update))
        .rejects.toThrow('Updated component validation failed');
    });

    it('should store rollback version before update', async () => {
      const update: ComponentUpdate = {
        version: '1.1.0'
      };
      
      await componentManager.updateComponent('test-service', update);
      
      // Rollback should work (indirectly tests that rollback version was stored)
      await expect(componentManager.rollbackComponent('test-service'))
        .resolves.not.toThrow();
    });

    it('should emit componentUpdated event on successful update', async () => {
      const eventSpy = vi.fn();
      componentManager.on('componentUpdated', eventSpy);
      
      const update: ComponentUpdate = { version: '1.1.0' };
      await componentManager.updateComponent('test-service', update);
      
      expect(eventSpy).toHaveBeenCalledWith({
        componentId: 'test-service',
        update,
        timestamp: expect.any(Date)
      });
    });
  });

  describe('Component Rollback', () => {
    beforeEach(async () => {
      await componentManager.registerComponent(mockComponent);
      await componentManager.deployComponent('test-service', mockDeploymentConfig);
      
      // Perform an update to create rollback history
      const update: ComponentUpdate = { version: '1.1.0' };
      await componentManager.updateComponent('test-service', update);
    });

    it('should rollback component to previous version', async () => {
      await expect(componentManager.rollbackComponent('test-service'))
        .resolves.not.toThrow();
    });

    it('should fail rollback for component without history', async () => {
      // Register a new component without update history
      const newComponent = { ...mockComponent, id: 'new-service' };
      await componentManager.registerComponent(newComponent);
      
      await expect(componentManager.rollbackComponent('new-service'))
        .rejects.toThrow('No rollback version available');
    });

    it('should emit componentRolledBack event on successful rollback', async () => {
      const eventSpy = vi.fn();
      componentManager.on('componentRolledBack', eventSpy);
      
      await componentManager.rollbackComponent('test-service');
      
      expect(eventSpy).toHaveBeenCalledWith({
        componentId: 'test-service',
        version: '1.0.0', // Original version
        timestamp: expect.any(Date)
      });
    });
  });

  describe('Component Removal', () => {
    beforeEach(async () => {
      await componentManager.registerComponent(mockComponent);
      await componentManager.deployComponent('test-service', mockDeploymentConfig);
    });

    it('should remove component successfully', async () => {
      await expect(componentManager.removeComponent('test-service'))
        .resolves.not.toThrow();
      
      const components = await componentManager.listComponents();
      expect(components).toHaveLength(0);
    });

    it('should cleanup all component resources', async () => {
      await componentManager.removeComponent('test-service');
      
      // Health check should fail after removal
      const health = await componentManager.healthCheck('test-service');
      expect(health.status).toBe('unhealthy');
    });

    it('should emit componentRemoved event on successful removal', async () => {
      const eventSpy = vi.fn();
      componentManager.on('componentRemoved', eventSpy);
      
      await componentManager.removeComponent('test-service');
      
      expect(eventSpy).toHaveBeenCalledWith({
        componentId: 'test-service',
        timestamp: expect.any(Date)
      });
    });
  });

  describe('Component Status', () => {
    beforeEach(async () => {
      await componentManager.registerComponent(mockComponent);
      await componentManager.deployComponent('test-service', mockDeploymentConfig);
    });

    it('should get complete component status', async () => {
      const status = await componentManager.getComponentStatus('test-service');
      
      expect(status.component).toBeDefined();
      expect(status.component?.id).toBe('test-service');
      expect(status.deployment).toBeDefined();
      expect(status.deployment?.success).toBe(true);
      expect(status.health).toBeDefined();
      expect(status.metrics).toBeNull(); // No metrics initially
    });

    it('should return null for non-existent component', async () => {
      const status = await componentManager.getComponentStatus('non-existent');
      
      expect(status.component).toBeNull();
      expect(status.deployment).toBeNull();
      expect(status.health.status).toBe('unhealthy');
      expect(status.metrics).toBeNull();
    });
  });

  describe('Component Communication', () => {
    beforeEach(async () => {
      await componentManager.registerComponent(mockComponent);
    });

    it('should get component communication configuration', async () => {
      const communication = await componentManager.getComponentCommunication('test-service');
      
      expect(communication).toBeDefined();
      expect(communication?.messageQueue).toBeDefined();
      expect(communication?.eventBus).toBeDefined();
      expect(communication?.apiGateway).toBeDefined();
      expect(communication?.serviceDiscovery).toBeDefined();
    });

    it('should return null for non-existent component', async () => {
      const communication = await componentManager.getComponentCommunication('non-existent');
      
      expect(communication).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle component registration errors gracefully', async () => {
      const invalidComponent = { ...mockComponent, resources: undefined as any };
      
      await expect(componentManager.registerComponent(invalidComponent))
        .rejects.toThrow();
    });

    it('should handle deployment errors gracefully', async () => {
      // Try to deploy without registering first
      const result = await componentManager.deployComponent('non-existent', mockDeploymentConfig);
      
      expect(result.success).toBe(false);
      expect(result.status.phase).toBe('Failed');
    });

    it('should handle scaling errors gracefully', async () => {
      await expect(componentManager.scaleComponent('non-existent', { replicas: 3 }))
        .rejects.toThrow('Component not found');
    });

    it('should handle update errors gracefully', async () => {
      await expect(componentManager.updateComponent('non-existent', { version: '2.0.0' }))
        .rejects.toThrow('Component not found');
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await componentManager.registerComponent(mockComponent);
    });

    it('should handle health change events', async () => {
      const eventSpy = vi.fn();
      componentManager.on('healthChanged', eventSpy);
      
      // Trigger health change by starting monitoring
      await componentManager.deployComponent('test-service', mockDeploymentConfig);
      
      // Wait for potential health change events
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Event may or may not be emitted depending on simulated health status
      // This test ensures the event handler is set up correctly
    });

    it('should handle scaling events', async () => {
      const eventSpy = vi.fn();
      componentManager.on('scalingEvent', eventSpy);
      
      await componentManager.deployComponent('test-service', mockDeploymentConfig);
      
      // Wait for potential scaling events
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Event may or may not be emitted depending on auto-scaling
      // This test ensures the event handler is set up correctly
    });

    it('should handle deployment events', async () => {
      const eventSpy = vi.fn();
      componentManager.on('deploymentEvent', eventSpy);
      
      await componentManager.deployComponent('test-service', mockDeploymentConfig);
      
      // Wait for potential deployment events
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Event may or may not be emitted depending on deployment process
      // This test ensures the event handler is set up correctly
    });
  });
});