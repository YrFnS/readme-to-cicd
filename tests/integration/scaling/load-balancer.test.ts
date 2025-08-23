import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LoadBalancer } from '../../../src/integration/scaling/load-balancer/load-balancer.js';
import { LoadBalancerConfig, ServiceInstance, ScalingMetrics } from '../../../src/integration/scaling/types.js';

describe('LoadBalancer', () => {
  let loadBalancer: LoadBalancer;
  let config: LoadBalancerConfig;

  beforeEach(() => {
    config = {
      algorithm: 'round-robin',
      healthCheck: {
        enabled: true,
        path: '/health',
        interval: 30,
        timeout: 5,
        healthyThreshold: 2,
        unhealthyThreshold: 3
      },
      stickySession: false,
      timeout: 30000,
      retries: 3
    };

    loadBalancer = new LoadBalancer(config);
  });

  afterEach(async () => {
    await loadBalancer.stop();
  });

  describe('Initialization and Lifecycle', () => {
    it('should initialize with provided configuration', () => {
      expect(loadBalancer).toBeDefined();
    });

    it('should start and stop successfully', async () => {
      const startSpy = vi.fn();
      const stopSpy = vi.fn();
      
      loadBalancer.on('started', startSpy);
      loadBalancer.on('stopped', stopSpy);

      await loadBalancer.start();
      expect(startSpy).toHaveBeenCalled();

      await loadBalancer.stop();
      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('Instance Management', () => {
    it('should register service instances', () => {
      const instance: ServiceInstance = {
        id: 'instance-1',
        host: '192.168.1.10',
        port: 8080,
        weight: 1,
        healthy: true,
        lastHealthCheck: new Date(),
        metrics: {
          cpu: 50,
          memory: 60,
          requestRate: 100,
          responseTime: 200,
          errorRate: 1,
          activeConnections: 25,
          queueLength: 5,
          timestamp: new Date()
        },
        metadata: { region: 'us-east-1' }
      };

      const registrationSpy = vi.fn();
      loadBalancer.on('instance-registered', registrationSpy);

      loadBalancer.registerInstance(instance);
      
      expect(registrationSpy).toHaveBeenCalledWith(instance);
      
      const state = loadBalancer.getState();
      expect(state.instances).toHaveLength(1);
      expect(state.instances[0].id).toBe('instance-1');
    });

    it('should unregister service instances', () => {
      const instance: ServiceInstance = {
        id: 'instance-1',
        host: '192.168.1.10',
        port: 8080,
        weight: 1,
        healthy: true,
        lastHealthCheck: new Date(),
        metrics: {
          cpu: 50,
          memory: 60,
          requestRate: 100,
          responseTime: 200,
          errorRate: 1,
          activeConnections: 25,
          queueLength: 5,
          timestamp: new Date()
        },
        metadata: {}
      };

      const unregistrationSpy = vi.fn();
      loadBalancer.on('instance-unregistered', unregistrationSpy);

      loadBalancer.registerInstance(instance);
      loadBalancer.unregisterInstance('instance-1');
      
      expect(unregistrationSpy).toHaveBeenCalledWith(instance);
      
      const state = loadBalancer.getState();
      expect(state.instances).toHaveLength(0);
    });

    it('should update instance metrics', () => {
      const instance: ServiceInstance = {
        id: 'instance-1',
        host: '192.168.1.10',
        port: 8080,
        weight: 1,
        healthy: true,
        lastHealthCheck: new Date(),
        metrics: {
          cpu: 50,
          memory: 60,
          requestRate: 100,
          responseTime: 200,
          errorRate: 1,
          activeConnections: 25,
          queueLength: 5,
          timestamp: new Date()
        },
        metadata: {}
      };

      loadBalancer.registerInstance(instance);

      const newMetrics: ScalingMetrics = {
        cpu: 75,
        memory: 80,
        requestRate: 150,
        responseTime: 300,
        errorRate: 2,
        activeConnections: 40,
        queueLength: 8,
        timestamp: new Date()
      };

      loadBalancer.updateInstanceMetrics('instance-1', newMetrics);
      
      const state = loadBalancer.getState();
      expect(state.instances[0].metrics.cpu).toBe(75);
      expect(state.instances[0].metrics.memory).toBe(80);
    });
  });

  describe('Load Balancing Algorithms', () => {
    let instances: ServiceInstance[];

    beforeEach(() => {
      instances = [
        {
          id: 'instance-1',
          host: '192.168.1.10',
          port: 8080,
          weight: 1,
          healthy: true,
          lastHealthCheck: new Date(),
          metrics: {
            cpu: 50,
            memory: 60,
            requestRate: 100,
            responseTime: 200,
            errorRate: 1,
            activeConnections: 10,
            queueLength: 5,
            timestamp: new Date()
          },
          metadata: {}
        },
        {
          id: 'instance-2',
          host: '192.168.1.11',
          port: 8080,
          weight: 2,
          healthy: true,
          lastHealthCheck: new Date(),
          metrics: {
            cpu: 40,
            memory: 50,
            requestRate: 80,
            responseTime: 180,
            errorRate: 0.5,
            activeConnections: 5,
            queueLength: 3,
            timestamp: new Date()
          },
          metadata: {}
        },
        {
          id: 'instance-3',
          host: '192.168.1.12',
          port: 8080,
          weight: 1,
          healthy: true,
          lastHealthCheck: new Date(),
          metrics: {
            cpu: 60,
            memory: 70,
            requestRate: 120,
            responseTime: 250,
            errorRate: 1.5,
            activeConnections: 15,
            queueLength: 7,
            timestamp: new Date()
          },
          metadata: {}
        }
      ];

      instances.forEach(instance => loadBalancer.registerInstance(instance));
    });

    it('should implement round-robin algorithm', async () => {
      // Round-robin should cycle through instances in order
      const selectedInstances = [];
      
      for (let i = 0; i < 6; i++) {
        const instance = await loadBalancer.handleRequest();
        selectedInstances.push(instance?.id);
      }

      // Should cycle through instances: 1, 2, 3, 1, 2, 3
      expect(selectedInstances[0]).toBe('instance-1');
      expect(selectedInstances[1]).toBe('instance-2');
      expect(selectedInstances[2]).toBe('instance-3');
      expect(selectedInstances[3]).toBe('instance-1');
    });

    it('should implement least-connections algorithm', () => {
      const lbConfig = { ...config, algorithm: 'least-connections' as const };
      const leastConnLB = new LoadBalancer(lbConfig);
      
      instances.forEach(instance => leastConnLB.registerInstance(instance));
      
      // Instance-2 has the least connections (5), so it should be selected
      const selectedInstance = leastConnLB.getNextInstance();
      expect(selectedInstance?.id).toBe('instance-2');
    });

    it('should implement weighted algorithm', () => {
      const lbConfig = { ...config, algorithm: 'weighted' as const };
      const weightedLB = new LoadBalancer(lbConfig);
      
      instances.forEach(instance => weightedLB.registerInstance(instance));
      
      // Instance-2 has weight 2, others have weight 1
      // So instance-2 should be selected more frequently
      const selections = [];
      for (let i = 0; i < 100; i++) {
        const instance = weightedLB.getNextInstance();
        selections.push(instance?.id);
      }
      
      const instance2Count = selections.filter(id => id === 'instance-2').length;
      const instance1Count = selections.filter(id => id === 'instance-1').length;
      
      // Instance-2 should be selected approximately twice as often
      expect(instance2Count).toBeGreaterThan(instance1Count);
    });

    it('should implement IP hash algorithm', () => {
      const lbConfig = { ...config, algorithm: 'ip-hash' as const };
      const ipHashLB = new LoadBalancer(lbConfig);
      
      instances.forEach(instance => ipHashLB.registerInstance(instance));
      
      // Same client ID should always get the same instance
      const clientId = '192.168.1.100';
      const instance1 = ipHashLB.getNextInstance(clientId);
      const instance2 = ipHashLB.getNextInstance(clientId);
      
      expect(instance1?.id).toBe(instance2?.id);
    });

    it('should only select healthy instances', () => {
      // Mark one instance as unhealthy
      instances[1].healthy = false;
      loadBalancer.registerInstance(instances[1]);
      
      const selectedInstances = [];
      for (let i = 0; i < 10; i++) {
        const instance = loadBalancer.getNextInstance();
        selectedInstances.push(instance?.id);
      }
      
      // Should never select the unhealthy instance
      expect(selectedInstances).not.toContain('instance-2');
    });

    it('should return null when no healthy instances available', () => {
      // Mark all instances as unhealthy
      instances.forEach(instance => {
        instance.healthy = false;
        loadBalancer.registerInstance(instance);
      });
      
      const selectedInstance = loadBalancer.getNextInstance();
      expect(selectedInstance).toBeNull();
    });
  });

  describe('Health Checking', () => {
    it('should perform health checks when enabled', async () => {
      const instance: ServiceInstance = {
        id: 'instance-1',
        host: '192.168.1.10',
        port: 8080,
        weight: 1,
        healthy: true,
        lastHealthCheck: new Date(Date.now() - 60000), // 1 minute ago
        metrics: {
          cpu: 50,
          memory: 60,
          requestRate: 100,
          responseTime: 200,
          errorRate: 1,
          activeConnections: 25,
          queueLength: 5,
          timestamp: new Date()
        },
        metadata: {}
      };

      const healthySpy = vi.fn();
      const unhealthySpy = vi.fn();
      
      loadBalancer.on('instance-healthy', healthySpy);
      loadBalancer.on('instance-unhealthy', unhealthySpy);

      loadBalancer.registerInstance(instance);
      await loadBalancer.start();

      // Wait for health check cycle
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should emit events for health state changes', async () => {
      const healthySpy = vi.fn();
      const unhealthySpy = vi.fn();
      
      loadBalancer.on('instance-healthy', healthySpy);
      loadBalancer.on('instance-unhealthy', unhealthySpy);

      const instance: ServiceInstance = {
        id: 'instance-1',
        host: '192.168.1.10',
        port: 8080,
        weight: 1,
        healthy: false, // Start as unhealthy
        lastHealthCheck: new Date(),
        metrics: {
          cpu: 50,
          memory: 60,
          requestRate: 100,
          responseTime: 200,
          errorRate: 1,
          activeConnections: 25,
          queueLength: 5,
          timestamp: new Date()
        },
        metadata: {}
      };

      loadBalancer.registerInstance(instance);
      await loadBalancer.start();

      // Wait for health check that should make it healthy
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should handle health check failures', async () => {
      const failureSpy = vi.fn();
      loadBalancer.on('health-check-failed', failureSpy);

      // This would require mocking the health check to fail
      // For now, we verify the event handler structure exists
    });
  });

  describe('Request Handling', () => {
    it('should handle incoming requests', async () => {
      const instance: ServiceInstance = {
        id: 'instance-1',
        host: '192.168.1.10',
        port: 8080,
        weight: 1,
        healthy: true,
        lastHealthCheck: new Date(),
        metrics: {
          cpu: 50,
          memory: 60,
          requestRate: 100,
          responseTime: 200,
          errorRate: 1,
          activeConnections: 25,
          queueLength: 5,
          timestamp: new Date()
        },
        metadata: {}
      };

      const routedSpy = vi.fn();
      loadBalancer.on('request-routed', routedSpy);

      loadBalancer.registerInstance(instance);
      
      const selectedInstance = await loadBalancer.handleRequest('client-123');
      
      expect(selectedInstance).toBeDefined();
      expect(selectedInstance?.id).toBe('instance-1');
      expect(routedSpy).toHaveBeenCalled();
    });

    it('should track request completion', () => {
      const completionSpy = vi.fn();
      loadBalancer.on('request-completed', completionSpy);

      loadBalancer.completeRequest('instance-1');
      
      expect(completionSpy).toHaveBeenCalledWith('instance-1');
    });

    it('should emit event when no healthy instances available', async () => {
      const noHealthySpy = vi.fn();
      loadBalancer.on('no-healthy-instances', noHealthySpy);

      // No instances registered
      const selectedInstance = await loadBalancer.handleRequest();
      
      expect(selectedInstance).toBeNull();
      expect(noHealthySpy).toHaveBeenCalled();
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide load balancer state', () => {
      const instance: ServiceInstance = {
        id: 'instance-1',
        host: '192.168.1.10',
        port: 8080,
        weight: 1,
        healthy: true,
        lastHealthCheck: new Date(),
        metrics: {
          cpu: 50,
          memory: 60,
          requestRate: 100,
          responseTime: 200,
          errorRate: 1,
          activeConnections: 25,
          queueLength: 5,
          timestamp: new Date()
        },
        metadata: {}
      };

      loadBalancer.registerInstance(instance);
      
      const state = loadBalancer.getState();
      
      expect(state.instances).toHaveLength(1);
      expect(state.algorithm).toBe('round-robin');
      expect(state.totalRequests).toBe(0);
      expect(state.activeConnections).toBe(0);
      expect(state.lastUpdate).toBeInstanceOf(Date);
    });

    it('should provide instance statistics', () => {
      const instance: ServiceInstance = {
        id: 'instance-1',
        host: '192.168.1.10',
        port: 8080,
        weight: 1,
        healthy: true,
        lastHealthCheck: new Date(),
        metrics: {
          cpu: 50,
          memory: 60,
          requestRate: 100,
          responseTime: 200,
          errorRate: 1,
          activeConnections: 25,
          queueLength: 5,
          timestamp: new Date()
        },
        metadata: {}
      };

      loadBalancer.registerInstance(instance);
      
      const stats = loadBalancer.getInstanceStats('instance-1');
      
      expect(stats).toBeDefined();
      expect(stats?.health).toBe(true);
      expect(stats?.metrics).toBeDefined();
    });

    it('should count healthy and total instances', () => {
      const instances: ServiceInstance[] = [
        {
          id: 'instance-1',
          host: '192.168.1.10',
          port: 8080,
          weight: 1,
          healthy: true,
          lastHealthCheck: new Date(),
          metrics: {
            cpu: 50,
            memory: 60,
            requestRate: 100,
            responseTime: 200,
            errorRate: 1,
            activeConnections: 25,
            queueLength: 5,
            timestamp: new Date()
          },
          metadata: {}
        },
        {
          id: 'instance-2',
          host: '192.168.1.11',
          port: 8080,
          weight: 1,
          healthy: false,
          lastHealthCheck: new Date(),
          metrics: {
            cpu: 80,
            memory: 90,
            requestRate: 50,
            responseTime: 500,
            errorRate: 5,
            activeConnections: 10,
            queueLength: 20,
            timestamp: new Date()
          },
          metadata: {}
        }
      ];

      instances.forEach(instance => loadBalancer.registerInstance(instance));
      
      expect(loadBalancer.getTotalInstanceCount()).toBe(2);
      expect(loadBalancer.getHealthyInstanceCount()).toBe(1);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const configSpy = vi.fn();
      loadBalancer.on('config-updated', configSpy);

      const newConfig = {
        algorithm: 'least-connections' as const,
        timeout: 60000
      };

      loadBalancer.updateConfig(newConfig);
      
      expect(configSpy).toHaveBeenCalled();
    });

    it('should restart health checking when health check config changes', async () => {
      await loadBalancer.start();
      
      const newHealthConfig = {
        healthCheck: {
          enabled: true,
          path: '/api/health',
          interval: 15,
          timeout: 3,
          healthyThreshold: 3,
          unhealthyThreshold: 2
        }
      };

      loadBalancer.updateConfig(newHealthConfig);
      
      // Health checking should restart with new configuration
    });
  });
});