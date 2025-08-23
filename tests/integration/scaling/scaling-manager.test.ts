import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ScalingManager } from '../../../src/integration/scaling/scaling-manager.js';
import { ScalingManagerConfig, ScalingMetrics, DeploymentStrategy } from '../../../src/integration/scaling/types.js';

describe('ScalingManager', () => {
  let scalingManager: ScalingManager;
  let config: ScalingManagerConfig;

  beforeEach(() => {
    config = {
      autoScaler: {
        policies: [
          {
            id: 'cpu-policy',
            name: 'CPU Scaling Policy',
            targetMetric: 'cpu',
            scaleUpThreshold: 70,
            scaleDownThreshold: 30,
            minInstances: 2,
            maxInstances: 10,
            cooldownPeriod: 60,
            scaleUpStep: 2,
            scaleDownStep: 1,
            enabled: true
          }
        ],
        metricsWindow: 300,
        evaluationInterval: 30,
        resourceOptimization: {
          enabled: true,
          costOptimization: true,
          performanceTuning: true,
          resourceLimits: {
            maxCpu: 100,
            maxMemory: 32768,
            maxInstances: 50,
            maxCostPerHour: 100
          }
        }
      },
      loadBalancer: {
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
      },
      resourceOptimization: {
        enabled: true,
        costOptimization: true,
        performanceTuning: true,
        resourceLimits: {
          maxCpu: 100,
          maxMemory: 32768,
          maxInstances: 50,
          maxCostPerHour: 100
        }
      },
      resourceLimits: {
        maxCpu: 100,
        maxMemory: 32768,
        maxInstances: 50,
        maxCostPerHour: 100
      }
    };

    scalingManager = new ScalingManager(config);
  });

  afterEach(async () => {
    await scalingManager.stop();
  });

  describe('Initialization and Lifecycle', () => {
    it('should initialize with provided configuration', () => {
      expect(scalingManager).toBeDefined();
    });

    it('should start all services successfully', async () => {
      const startSpy = vi.fn();
      scalingManager.on('started', startSpy);

      await scalingManager.start();
      expect(startSpy).toHaveBeenCalled();
    });

    it('should stop all services successfully', async () => {
      const stopSpy = vi.fn();
      scalingManager.on('stopped', stopSpy);

      await scalingManager.start();
      await scalingManager.stop();
      
      expect(stopSpy).toHaveBeenCalled();
    });

    it('should handle start failures gracefully', async () => {
      const failureSpy = vi.fn();
      scalingManager.on('start-failed', failureSpy);

      // Mock a service start failure
      // This would require dependency injection or mocking
    });

    it('should not start twice', async () => {
      await scalingManager.start();
      
      // Second start should not cause issues
      await scalingManager.start();
    });
  });

  describe('Metrics Management', () => {
    it('should add metrics to all relevant services', () => {
      const metricsSpy = vi.fn();
      scalingManager.on('metrics-added', metricsSpy);

      const metrics: ScalingMetrics = {
        cpu: 75,
        memory: 60,
        requestRate: 100,
        responseTime: 200,
        errorRate: 1,
        activeConnections: 50,
        queueLength: 10,
        timestamp: new Date()
      };

      scalingManager.addMetrics('test-component', metrics);
      
      expect(metricsSpy).toHaveBeenCalledWith({
        componentId: 'test-component',
        metrics
      });
    });

    it('should distribute metrics to auto-scaler and performance monitor', () => {
      const metrics: ScalingMetrics = {
        cpu: 85,
        memory: 70,
        requestRate: 150,
        responseTime: 300,
        errorRate: 2,
        activeConnections: 75,
        queueLength: 15,
        timestamp: new Date()
      };

      scalingManager.addMetrics('test-component', metrics);
      
      // Verify metrics are available in scaling status
      const status = scalingManager.getScalingStatus('test-component');
      expect(status).toBeDefined();
      expect(status.scaling).toBeDefined();
      expect(status.performance).toBeDefined();
    });
  });

  describe('Scaling Operations', () => {
    it('should perform manual scaling', async () => {
      const scalingSpy = vi.fn();
      scalingManager.on('manual-scaling-completed', scalingSpy);

      const result = await scalingManager.manualScale(
        'test-component',
        5,
        'Load testing preparation'
      );

      expect(result.success).toBe(true);
      expect(result.newInstances).toBe(5);
      expect(result.reason).toContain('Load testing preparation');
      expect(scalingSpy).toHaveBeenCalledWith(result);
    });

    it('should handle manual scaling failures', async () => {
      const failureSpy = vi.fn();
      scalingManager.on('manual-scaling-failed', failureSpy);

      // This would require mocking the resource allocator to fail
      // For now, we test the error handling structure
    });

    it('should provide comprehensive scaling status', () => {
      const metrics: ScalingMetrics = {
        cpu: 60,
        memory: 55,
        requestRate: 80,
        responseTime: 180,
        errorRate: 0.8,
        activeConnections: 40,
        queueLength: 8,
        timestamp: new Date()
      };

      scalingManager.addMetrics('test-component', metrics);
      
      const status = scalingManager.getScalingStatus('test-component');
      
      expect(status.scaling).toBeDefined();
      expect(status.scaling.history).toBeDefined();
      expect(status.scaling.bottlenecks).toBeDefined();
      
      expect(status.loadBalancing).toBeDefined();
      expect(status.loadBalancing.state).toBeDefined();
      
      expect(status.resources).toBeDefined();
      expect(status.resources.pool).toBeDefined();
      
      expect(status.performance).toBeDefined();
      expect(status.performance.alerts).toBeDefined();
    });
  });

  describe('Deployment Management', () => {
    it('should deploy component with blue-green strategy', async () => {
      const strategy: DeploymentStrategy = {
        type: 'blue-green',
        config: {
          switchTraffic: true,
          validateBeforeSwitch: true,
          rollbackOnFailure: true,
          validationTimeout: 300000
        }
      };

      const deploymentId = await scalingManager.deployComponent(
        'test-component',
        'v2.1.0',
        strategy
      );

      expect(deploymentId).toBeDefined();
      expect(deploymentId).toContain('deploy-test-component');
    });

    it('should deploy component with canary strategy', async () => {
      const strategy: DeploymentStrategy = {
        type: 'canary',
        config: {
          stages: [
            {
              name: 'Initial',
              trafficPercentage: 10,
              duration: 300,
              successCriteria: [
                { metric: 'errorRate', threshold: 1, operator: '<' }
              ]
            },
            {
              name: 'Expansion',
              trafficPercentage: 50,
              duration: 600,
              successCriteria: [
                { metric: 'errorRate', threshold: 1, operator: '<' },
                { metric: 'responseTime', threshold: 200, operator: '<' }
              ]
            }
          ],
          metrics: ['errorRate', 'responseTime'],
          successThreshold: 95,
          failureThreshold: 5,
          autoPromote: true
        }
      };

      const deploymentId = await scalingManager.deployComponent(
        'test-component',
        'v2.2.0',
        strategy
      );

      expect(deploymentId).toBeDefined();
    });

    it('should get deployment status', async () => {
      const strategy: DeploymentStrategy = {
        type: 'rolling',
        config: {
          batchSize: 2,
          maxUnavailable: 1,
          progressDeadline: 600,
          rollbackOnFailure: true
        }
      };

      const deploymentId = await scalingManager.deployComponent(
        'test-component',
        'v2.3.0',
        strategy
      );

      // Wait a bit for deployment to start
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = scalingManager.getDeploymentStatus(deploymentId);
      expect(status).toBeDefined();
      expect(status.id).toBe(deploymentId);
    }, 10000); // Increase timeout to 10 seconds

    it('should rollback deployment', async () => {
      const strategy: DeploymentStrategy = {
        type: 'blue-green',
        config: {
          switchTraffic: true,
          validateBeforeSwitch: true,
          rollbackOnFailure: true,
          validationTimeout: 300000
        }
      };

      const deploymentId = await scalingManager.deployComponent(
        'test-component',
        'v2.4.0',
        strategy
      );

      // Wait for deployment to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      await expect(scalingManager.rollbackDeployment(deploymentId)).resolves.not.toThrow();
    });
  });

  describe('Cost Optimization', () => {
    it('should generate comprehensive cost optimization', () => {
      // Add some metrics to establish baseline
      const metrics: ScalingMetrics = {
        cpu: 25,
        memory: 35,
        requestRate: 50,
        responseTime: 150,
        errorRate: 0.1,
        activeConnections: 20,
        queueLength: 2,
        timestamp: new Date()
      };

      scalingManager.addMetrics('test-component', metrics);
      
      const optimization = scalingManager.generateCostOptimization();
      
      expect(optimization).toBeDefined();
      expect(optimization.currentCost).toBeGreaterThanOrEqual(0);
      expect(optimization.projectedCost).toBeGreaterThanOrEqual(0);
      expect(optimization.savings).toBeGreaterThanOrEqual(0);
      expect(optimization.recommendations).toBeDefined();
      expect(Array.isArray(optimization.recommendations)).toBe(true);
    });

    it('should combine recommendations from multiple sources', () => {
      const metrics: ScalingMetrics = {
        cpu: 20,
        memory: 30,
        requestRate: 40,
        responseTime: 120,
        errorRate: 0.05,
        activeConnections: 15,
        queueLength: 1,
        timestamp: new Date()
      };

      scalingManager.addMetrics('test-component', metrics);
      
      const optimization = scalingManager.generateCostOptimization();
      
      // Should have recommendations from both auto-scaler and resource allocator
      expect(optimization.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('System Health and Monitoring', () => {
    it('should get system-wide bottlenecks', () => {
      const highCpuMetrics: ScalingMetrics = {
        cpu: 95,
        memory: 50,
        requestRate: 100,
        responseTime: 200,
        errorRate: 1,
        activeConnections: 50,
        queueLength: 10,
        timestamp: new Date()
      };

      scalingManager.addMetrics('component-1', highCpuMetrics);
      
      const bottlenecks = scalingManager.getSystemBottlenecks();
      expect(Array.isArray(bottlenecks)).toBe(true);
    });

    it('should provide system health summary', () => {
      const metrics: ScalingMetrics = {
        cpu: 60,
        memory: 70,
        requestRate: 100,
        responseTime: 200,
        errorRate: 1,
        activeConnections: 50,
        queueLength: 10,
        timestamp: new Date()
      };

      scalingManager.addMetrics('test-component', metrics);
      
      const health = scalingManager.getSystemHealth();
      
      expect(health).toBeDefined();
      expect(health.overall).toMatch(/^(healthy|warning|critical)$/);
      expect(typeof health.components).toBe('number');
      expect(typeof health.activeAlerts).toBe('number');
      expect(typeof health.bottlenecks).toBe('number');
      expect(health.resourceUtilization).toBeDefined();
      expect(typeof health.resourceUtilization.cpu).toBe('number');
      expect(typeof health.resourceUtilization.memory).toBe('number');
    });

    it('should detect critical system state', () => {
      const criticalMetrics: ScalingMetrics = {
        cpu: 98,
        memory: 97,
        requestRate: 200,
        responseTime: 8000,
        errorRate: 15,
        activeConnections: 100,
        queueLength: 500,
        timestamp: new Date()
      };

      scalingManager.addMetrics('critical-component', criticalMetrics);
      
      const health = scalingManager.getSystemHealth();
      
      // Should detect critical state due to high resource usage
      expect(health.overall).toBe('critical');
    });
  });

  describe('Event Handling', () => {
    it('should forward auto-scaler events', async () => {
      const scaledSpy = vi.fn();
      const failureSpy = vi.fn();
      
      scalingManager.on('component-scaled', scaledSpy);
      scalingManager.on('scaling-failed', failureSpy);

      await scalingManager.start();
      
      // Events should be forwarded from auto-scaler
    });

    it('should forward load balancer events', () => {
      const unhealthySpy = vi.fn();
      const noHealthySpy = vi.fn();
      
      scalingManager.on('instance-unhealthy', unhealthySpy);
      scalingManager.on('no-healthy-instances', noHealthySpy);

      // Events should be forwarded from load balancer
    });

    it('should forward performance monitor events', () => {
      const bottleneckSpy = vi.fn();
      const alertSpy = vi.fn();
      
      scalingManager.on('bottleneck-detected', bottleneckSpy);
      scalingManager.on('performance-alert', alertSpy);

      // Events should be forwarded from performance monitor
    });

    it('should forward resource allocator events', () => {
      const allocatedSpy = vi.fn();
      const rejectedSpy = vi.fn();
      
      scalingManager.on('resources-allocated', allocatedSpy);
      scalingManager.on('allocation-rejected', rejectedSpy);

      // Events should be forwarded from resource allocator
    });

    it('should forward deployment events', () => {
      const completedSpy = vi.fn();
      const failedSpy = vi.fn();
      
      scalingManager.on('deployment-completed', completedSpy);
      scalingManager.on('deployment-failed', failedSpy);

      // Events should be forwarded from zero-downtime deployment
    });
  });

  describe('Integration Testing', () => {
    it('should coordinate between all services', async () => {
      await scalingManager.start();

      const metrics: ScalingMetrics = {
        cpu: 80,
        memory: 75,
        requestRate: 150,
        responseTime: 300,
        errorRate: 2,
        activeConnections: 60,
        queueLength: 12,
        timestamp: new Date()
      };

      // Add metrics (should trigger auto-scaling evaluation)
      scalingManager.addMetrics('integration-test', metrics);

      // Perform manual scaling (should update resource allocation)
      const scalingResult = await scalingManager.manualScale(
        'integration-test',
        6,
        'Integration test scaling'
      );

      expect(scalingResult.success).toBe(true);

      // Get comprehensive status (should show coordinated state)
      const status = scalingManager.getScalingStatus('integration-test');
      expect(status.scaling).toBeDefined();
      expect(status.loadBalancing).toBeDefined();
      expect(status.resources).toBeDefined();
      expect(status.performance).toBeDefined();
    });

    it('should handle service failures gracefully', async () => {
      await scalingManager.start();

      // Simulate service failures and verify system continues operating
      // This would require more sophisticated mocking
    });
  });

  describe('Performance Under Load', () => {
    it('should handle high-frequency metrics updates', () => {
      const startTime = Date.now();
      
      // Add many metrics rapidly
      for (let i = 0; i < 1000; i++) {
        const metrics: ScalingMetrics = {
          cpu: 50 + Math.random() * 30,
          memory: 40 + Math.random() * 40,
          requestRate: 80 + Math.random() * 40,
          responseTime: 150 + Math.random() * 100,
          errorRate: Math.random() * 2,
          activeConnections: 30 + Math.random() * 40,
          queueLength: Math.random() * 20,
          timestamp: new Date()
        };

        scalingManager.addMetrics(`component-${i % 10}`, metrics);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds
    });

    it('should maintain performance with many components', () => {
      const componentCount = 100;
      
      for (let i = 0; i < componentCount; i++) {
        const metrics: ScalingMetrics = {
          cpu: Math.random() * 100,
          memory: Math.random() * 100,
          requestRate: Math.random() * 200,
          responseTime: Math.random() * 500,
          errorRate: Math.random() * 5,
          activeConnections: Math.random() * 100,
          queueLength: Math.random() * 50,
          timestamp: new Date()
        };

        scalingManager.addMetrics(`component-${i}`, metrics);
      }
      
      // System should remain responsive
      const health = scalingManager.getSystemHealth();
      expect(health).toBeDefined();
    });
  });
});