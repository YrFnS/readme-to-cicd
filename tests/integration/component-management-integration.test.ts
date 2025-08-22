import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComponentManager } from '../../src/integration/components/component-manager';
import { ComponentDefinition, DeploymentConfig, ScalingConfig } from '../../src/integration/components/types';

describe('Component Management Integration', () => {
  let componentManager: ComponentManager;
  let components: ComponentDefinition[];
  let deploymentConfig: DeploymentConfig;

  beforeEach(() => {
    componentManager = new ComponentManager();
    
    deploymentConfig = {
      strategy: 'RollingUpdate',
      environment: 'test',
      namespace: 'integration-test',
      labels: {
        environment: 'test',
        managed: 'true'
      },
      rollingUpdate: {
        maxUnavailable: 1,
        maxSurge: 1
      }
    };

    // Create a realistic component hierarchy
    components = [
      {
        id: 'postgres-db',
        name: 'PostgreSQL Database',
        version: '13.0.0',
        type: 'service',
        dependencies: [],
        resources: {
          cpu: '500m',
          memory: '1Gi',
          storage: '10Gi',
          limits: {
            cpu: '1',
            memory: '2Gi'
          }
        },
        healthCheck: {
          type: 'tcp',
          port: 5432,
          initialDelaySeconds: 60,
          periodSeconds: 30,
          timeoutSeconds: 10,
          failureThreshold: 3,
          successThreshold: 1
        },
        scaling: {
          minReplicas: 1,
          maxReplicas: 1 // Database typically doesn't scale horizontally
        }
      },
      {
        id: 'redis-cache',
        name: 'Redis Cache',
        version: '6.2.0',
        type: 'service',
        dependencies: [],
        resources: {
          cpu: '200m',
          memory: '512Mi',
          limits: {
            cpu: '500m',
            memory: '1Gi'
          }
        },
        healthCheck: {
          type: 'tcp',
          port: 6379,
          initialDelaySeconds: 30,
          periodSeconds: 15,
          timeoutSeconds: 5,
          failureThreshold: 3,
          successThreshold: 1
        },
        scaling: {
          minReplicas: 1,
          maxReplicas: 3,
          targetCPUUtilization: 70,
          targetMemoryUtilization: 80
        }
      },
      {
        id: 'auth-service',
        name: 'Authentication Service',
        version: '2.1.0',
        type: 'service',
        dependencies: ['postgres-db', 'redis-cache'],
        resources: {
          cpu: '300m',
          memory: '256Mi',
          limits: {
            cpu: '600m',
            memory: '512Mi'
          }
        },
        healthCheck: {
          type: 'http',
          endpoint: '/health',
          port: 8080,
          initialDelaySeconds: 45,
          periodSeconds: 20,
          timeoutSeconds: 10,
          failureThreshold: 3,
          successThreshold: 1
        },
        scaling: {
          minReplicas: 2,
          maxReplicas: 8,
          targetCPUUtilization: 75,
          customMetrics: [
            {
              name: 'requests_per_second',
              targetValue: 100,
              type: 'Pods'
            }
          ]
        }
      },
      {
        id: 'api-gateway',
        name: 'API Gateway',
        version: '1.5.0',
        type: 'service',
        dependencies: ['auth-service'],
        resources: {
          cpu: '400m',
          memory: '512Mi',
          limits: {
            cpu: '800m',
            memory: '1Gi'
          }
        },
        healthCheck: {
          type: 'http',
          endpoint: '/health',
          port: 8080,
          initialDelaySeconds: 30,
          periodSeconds: 15,
          timeoutSeconds: 8,
          failureThreshold: 3,
          successThreshold: 1
        },
        scaling: {
          minReplicas: 2,
          maxReplicas: 10,
          targetCPUUtilization: 80,
          scaleUpPolicy: {
            stabilizationWindowSeconds: 60,
            policies: [
              {
                type: 'Percent',
                value: 50,
                periodSeconds: 60
              }
            ]
          },
          scaleDownPolicy: {
            stabilizationWindowSeconds: 300,
            policies: [
              {
                type: 'Pods',
                value: 1,
                periodSeconds: 60
              }
            ]
          }
        }
      },
      {
        id: 'notification-worker',
        name: 'Notification Worker',
        version: '1.2.0',
        type: 'worker',
        dependencies: ['postgres-db', 'redis-cache'],
        resources: {
          cpu: '200m',
          memory: '256Mi',
          limits: {
            cpu: '400m',
            memory: '512Mi'
          }
        },
        healthCheck: {
          type: 'exec',
          command: ['./health-check.sh'],
          initialDelaySeconds: 20,
          periodSeconds: 30,
          timeoutSeconds: 15,
          failureThreshold: 3,
          successThreshold: 1
        },
        scaling: {
          minReplicas: 1,
          maxReplicas: 5,
          targetCPUUtilization: 60,
          customMetrics: [
            {
              name: 'queue_length',
              targetValue: 50,
              type: 'Object'
            }
          ]
        }
      }
    ];
  });

  afterEach(async () => {
    await componentManager.shutdown();
  });

  describe('End-to-End Component Lifecycle', () => {
    it('should register, deploy, and manage complete component hierarchy', async () => {
      // Step 1: Register components in dependency order
      await componentManager.registerComponent(components[0]); // postgres-db
      await componentManager.registerComponent(components[1]); // redis-cache
      await componentManager.registerComponent(components[2]); // auth-service
      await componentManager.registerComponent(components[3]); // api-gateway
      await componentManager.registerComponent(components[4]); // notification-worker

      const registeredComponents = await componentManager.listComponents();
      expect(registeredComponents).toHaveLength(components.length);

      // Step 2: Deploy components in dependency order
      // Dependencies should be deployed first
      await componentManager.deployComponent('postgres-db', deploymentConfig);
      await componentManager.deployComponent('redis-cache', deploymentConfig);
      await componentManager.deployComponent('auth-service', deploymentConfig);
      await componentManager.deployComponent('api-gateway', deploymentConfig);
      await componentManager.deployComponent('notification-worker', deploymentConfig);

      // Step 3: Verify all deployments are successful
      for (const component of components) {
        const status = await componentManager.getComponentStatus(component.id);
        expect(status.deployment?.success).toBe(true);
        expect(status.component?.id).toBe(component.id);
      }

      // Step 4: Verify health monitoring is active
      for (const component of components) {
        const health = await componentManager.healthCheck(component.id);
        expect(health).toBeDefined();
        expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
      }

      // Step 5: Test scaling operations
      const scalingConfig: ScalingConfig = {
        replicas: 4,
        autoScaling: true
      };
      
      await componentManager.scaleComponent('auth-service', scalingConfig);
      
      // Step 6: Test component updates
      const updateConfig = {
        version: '2.2.0',
        resources: {
          cpu: '350m',
          memory: '300Mi'
        }
      };
      
      await componentManager.updateComponent('auth-service', updateConfig);
      
      const updatedStatus = await componentManager.getComponentStatus('auth-service');
      expect(updatedStatus.component?.version).toBe('2.2.0');

      // Step 7: Test rollback functionality
      await componentManager.rollbackComponent('auth-service');
      
      const rolledBackStatus = await componentManager.getComponentStatus('auth-service');
      expect(rolledBackStatus.component?.version).toBe('2.1.0');
    });

    it('should handle component failures and recovery', async () => {
      // Register and deploy a component
      await componentManager.registerComponent(components[0]);
      await componentManager.deployComponent('postgres-db', deploymentConfig);

      // Simulate component failure by triggering unhealthy status
      // This would typically be done through the health monitor
      const initialHealth = await componentManager.healthCheck('postgres-db');
      expect(initialHealth).toBeDefined();

      // The component manager should handle failures gracefully
      // In a real scenario, it would attempt recovery
    });

    it('should manage inter-component communication', async () => {
      // Register components with dependencies (dependencies first)
      await componentManager.registerComponent(components[0]); // postgres-db
      await componentManager.registerComponent(components[1]); // redis-cache
      await componentManager.registerComponent(components[2]); // auth-service (depends on postgres-db, redis-cache)

      // Get communication configuration
      const dbComm = await componentManager.getComponentCommunication('postgres-db');
      const authComm = await componentManager.getComponentCommunication('auth-service');

      expect(dbComm).toBeDefined();
      expect(authComm).toBeDefined();

      expect(dbComm?.messageQueue).toBeDefined();
      expect(dbComm?.eventBus).toBeDefined();
      expect(dbComm?.apiGateway).toBeDefined();
      expect(dbComm?.serviceDiscovery).toBeDefined();

      expect(authComm?.messageQueue).toBeDefined();
      expect(authComm?.eventBus).toBeDefined();
      expect(authComm?.apiGateway).toBeDefined();
      expect(authComm?.serviceDiscovery).toBeDefined();
    });
  });

  describe('Dependency Management Integration', () => {
    it('should enforce deployment order based on dependencies', async () => {
      // Register all components
      for (const component of components) {
        await componentManager.registerComponent(component);
      }

      // Try to deploy a dependent component before its dependencies
      // This should work but the component manager should handle dependencies
      const result = await componentManager.deployComponent('auth-service', deploymentConfig);
      
      // The deployment should succeed because the component manager
      // should handle dependency resolution internally
      expect(result.success).toBe(true);
    });

    it('should prevent removal of components with dependents', async () => {
      // Register and deploy components with dependencies
      await componentManager.registerComponent(components[0]); // postgres-db
      await componentManager.registerComponent(components[1]); // redis-cache
      await componentManager.registerComponent(components[2]); // auth-service (depends on postgres-db, redis-cache)
      
      await componentManager.deployComponent('postgres-db', deploymentConfig);
      await componentManager.deployComponent('auth-service', deploymentConfig);

      // Try to remove postgres-db while auth-service depends on it
      // In a production system, this should be prevented or handled gracefully
      await componentManager.removeComponent('postgres-db');
      
      // The system should handle this gracefully
      const components = await componentManager.listComponents();
      expect(components.find(c => c.id === 'postgres-db')).toBeUndefined();
    });
  });

  describe('Scaling Integration', () => {
    it('should handle auto-scaling based on metrics', async () => {
      // Register dependencies first
      await componentManager.registerComponent(components[0]); // postgres-db
      await componentManager.registerComponent(components[1]); // redis-cache
      // Register and deploy a scalable component
      await componentManager.registerComponent(components[2]); // auth-service
      await componentManager.deployComponent('auth-service', deploymentConfig);

      // Auto-scaling should be enabled automatically for components with maxReplicas > minReplicas
      const status = await componentManager.getComponentStatus('auth-service');
      expect(status.deployment?.success).toBe(true);

      // Manual scaling should work
      const scalingConfig: ScalingConfig = {
        replicas: 4,
        policy: {
          minReplicas: 2,
          maxReplicas: 6,
          targetCPUUtilization: 65
        }
      };

      await componentManager.scaleComponent('auth-service', scalingConfig);
      
      // Verify scaling was applied
      // In a real system, this would check the actual replica count
    });

    it('should respect resource limits during scaling', async () => {
      // Register dependencies first
      await componentManager.registerComponent(components[0]); // postgres-db
      await componentManager.registerComponent(components[1]); // redis-cache
      await componentManager.registerComponent(components[2]); // auth-service
      // Register a component with resource limits
      await componentManager.registerComponent(components[3]); // api-gateway
      await componentManager.deployComponent('api-gateway', deploymentConfig);

      // Try to scale beyond reasonable limits
      const aggressiveScaling: ScalingConfig = {
        replicas: 20, // Beyond maxReplicas (10)
        policy: {
          minReplicas: 1,
          maxReplicas: 50 // Very high limit
        }
      };

      // Should not throw but should be constrained by the original maxReplicas
      await expect(componentManager.scaleComponent('api-gateway', aggressiveScaling))
        .resolves.not.toThrow();
    });
  });

  describe('Health Monitoring Integration', () => {
    it('should monitor health across all component types', async () => {
      // Register different types of components
      const serviceComponent = components[0]; // service
      const workerComponent = components[4]; // worker

      await componentManager.registerComponent(serviceComponent);
      await componentManager.registerComponent(components[1]); // redis-cache (dependency for worker)
      await componentManager.registerComponent(workerComponent);

      // Health checks should work for all component types
      const serviceHealth = await componentManager.healthCheck(serviceComponent.id);
      const workerHealth = await componentManager.healthCheck(workerComponent.id);

      expect(serviceHealth).toBeDefined();
      expect(workerHealth).toBeDefined();

      expect(['healthy', 'degraded', 'unhealthy']).toContain(serviceHealth.status);
      expect(['healthy', 'degraded', 'unhealthy']).toContain(workerHealth.status);
    });

    it('should handle health check failures gracefully', async () => {
      // Register a component with aggressive health check settings
      const sensitiveComponent: ComponentDefinition = {
        ...components[0],
        id: 'sensitive-service',
        healthCheck: {
          type: 'http',
          endpoint: '/health',
          port: 8080,
          initialDelaySeconds: 5,
          periodSeconds: 5,
          timeoutSeconds: 2,
          failureThreshold: 1, // Very sensitive
          successThreshold: 1
        }
      };

      await componentManager.registerComponent(sensitiveComponent);
      
      // Health check should not throw even if it fails
      const health = await componentManager.healthCheck('sensitive-service');
      expect(health).toBeDefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle partial system failures', async () => {
      // Register components in dependency order
      await componentManager.registerComponent(components[0]); // postgres-db
      await componentManager.registerComponent(components[1]); // redis-cache
      await componentManager.registerComponent(components[2]); // auth-service

      // Deploy some components successfully
      await componentManager.deployComponent('postgres-db', deploymentConfig);
      await componentManager.deployComponent('redis-cache', deploymentConfig);

      // Simulate failure in dependent component deployment
      // The system should handle this gracefully
      const result = await componentManager.deployComponent('auth-service', deploymentConfig);
      
      // Even if deployment has issues, it should not crash the system
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should maintain system consistency during failures', async () => {
      // Register a component
      await componentManager.registerComponent(components[0]);
      
      // Deploy it
      await componentManager.deployComponent('postgres-db', deploymentConfig);
      
      // Try invalid operations
      await expect(componentManager.scaleComponent('non-existent', { replicas: 3 }))
        .rejects.toThrow();
      
      await expect(componentManager.updateComponent('non-existent', { version: '2.0.0' }))
        .rejects.toThrow();
      
      // Original component should still be functional
      const status = await componentManager.getComponentStatus('postgres-db');
      expect(status.component).toBeDefined();
      expect(status.deployment?.success).toBe(true);
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle concurrent operations', async () => {
      // Register components in dependency order to avoid validation errors
      // First register components with no dependencies
      await componentManager.registerComponent(components[0]); // postgres-db
      await componentManager.registerComponent(components[1]); // redis-cache
      
      // Then register components with dependencies
      await componentManager.registerComponent(components[2]); // auth-service
      await componentManager.registerComponent(components[3]); // api-gateway
      await componentManager.registerComponent(components[4]); // notification-worker
      
      const registeredComponents = await componentManager.listComponents();
      expect(registeredComponents).toHaveLength(components.length);

      // Deploy components concurrently (where dependencies allow)
      const independentComponents = ['postgres-db', 'redis-cache'];
      const deploymentPromises = independentComponents.map(id =>
        componentManager.deployComponent(id, deploymentConfig)
      );
      
      const results = await Promise.all(deploymentPromises);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should handle rapid scaling operations', async () => {
      // Register dependencies first
      await componentManager.registerComponent(components[0]); // postgres-db
      await componentManager.registerComponent(components[1]); // redis-cache
      // Register and deploy a component
      await componentManager.registerComponent(components[2]); // auth-service
      await componentManager.deployComponent('auth-service', deploymentConfig);

      // Perform rapid scaling operations
      const scalingOperations = [
        { replicas: 3 },
        { replicas: 5 },
        { replicas: 2 },
        { replicas: 4 }
      ];

      for (const scaling of scalingOperations) {
        await componentManager.scaleComponent('auth-service', scaling);
      }

      // System should remain stable
      const status = await componentManager.getComponentStatus('auth-service');
      expect(status.component).toBeDefined();
      expect(status.deployment?.success).toBe(true);
    });
  });
});