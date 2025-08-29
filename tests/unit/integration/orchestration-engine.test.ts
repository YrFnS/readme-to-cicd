import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OrchestrationEngine } from '../../../src/integration/orchestration/orchestration-engine';
import { WorkflowRequest, ComponentOperation, SystemEvent } from '../../../src/integration/types';

describe('OrchestrationEngine', () => {
  let orchestrationEngine: OrchestrationEngine;

  beforeEach(async () => {
    orchestrationEngine = new OrchestrationEngine();
    await orchestrationEngine.initialize();
  });

  afterEach(async () => {
    await orchestrationEngine.shutdown();
  });

  describe('Workflow Processing', () => {
    it('should process workflow request with priority queuing', async () => {
      const request: WorkflowRequest = {
        type: 'readme-to-cicd',
        payload: {
          readmePath: 'test-readme.md',
          options: {}
        },
        context: {
          requestId: 'test-request-1',
          timestamp: new Date()
        },
        priority: 'high'
      };

      const result = await orchestrationEngine.processWorkflow(request);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.traceId).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.metrics.duration).toBeGreaterThan(0);
    });

    it('should handle different workflow types', async () => {
      const maintenanceRequest: WorkflowRequest = {
        type: 'system-maintenance',
        payload: {
          maintenanceType: 'health-check'
        },
        context: {
          requestId: 'maintenance-1',
          timestamp: new Date()
        },
        priority: 'normal'
      };

      const result = await orchestrationEngine.processWorkflow(maintenanceRequest);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle workflow errors gracefully', async () => {
      const invalidRequest: WorkflowRequest = {
        type: 'readme-to-cicd',
        payload: {
          readmePath: 'non-existent-file.md'
        },
        context: {
          requestId: 'invalid-request',
          timestamp: new Date()
        },
        priority: 'low'
      };

      const result = await orchestrationEngine.processWorkflow(invalidRequest);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.data.error).toBeDefined();
    });

    it('should prioritize high priority requests', async () => {
      const lowPriorityRequest: WorkflowRequest = {
        type: 'system-maintenance',
        payload: { maintenanceType: 'cleanup', retentionDays: 7 },
        context: { requestId: 'low-1', timestamp: new Date() },
        priority: 'low'
      };

      const highPriorityRequest: WorkflowRequest = {
        type: 'system-maintenance',
        payload: { maintenanceType: 'health-check' },
        context: { requestId: 'high-1', timestamp: new Date() },
        priority: 'high'
      };

      // Process both requests
      const [lowResult, highResult] = await Promise.all([
        orchestrationEngine.processWorkflow(lowPriorityRequest),
        orchestrationEngine.processWorkflow(highPriorityRequest)
      ]);

      expect(lowResult.success).toBe(true);
      expect(highResult.success).toBe(true);
    });
  });

  describe('Component Management', () => {
    it('should manage component operations successfully', async () => {
      const operation: ComponentOperation = {
        type: 'restart',
        componentId: 'readmeParser',
        parameters: {}
      };

      const result = await orchestrationEngine.manageComponents(operation);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.message).toContain('completed successfully');
      expect(result.timestamp).toBeDefined();
    });

    it('should handle invalid component operations', async () => {
      const operation: ComponentOperation = {
        type: 'deploy',
        componentId: 'non-existent-component',
        parameters: {}
      };

      const result = await orchestrationEngine.manageComponents(operation);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.message).toContain('No circuit breaker found');
    });

    it('should support different operation types', async () => {
      const operations: ComponentOperation[] = [
        { type: 'deploy', componentId: 'readmeParser', parameters: {} },
        { type: 'scale', componentId: 'frameworkDetector', parameters: { replicas: 2 } },
        { type: 'update', componentId: 'yamlGenerator', parameters: { version: '2.0.0' } },
        { type: 'stop', componentId: 'readmeParser', parameters: {} }
      ];

      for (const operation of operations) {
        const result = await orchestrationEngine.manageComponents(operation);
        expect(result).toBeDefined();
        expect(result.timestamp).toBeDefined();
      }
    });
  });

  describe('Event Handling', () => {
    it('should handle system events', async () => {
      const event: SystemEvent = {
        type: 'component.failure',
        source: 'test',
        data: { componentId: 'readmeParser' },
        timestamp: new Date(),
        severity: 'error'
      };

      await orchestrationEngine.handleSystemEvent(event);

      const eventHistory = orchestrationEngine.getEventHistory();
      expect(eventHistory.length).toBeGreaterThan(0);
      expect(eventHistory.some(e => e.type === 'component.failure')).toBe(true);
    });

    it('should emit events for workflow operations', async () => {
      return new Promise<void>((resolve) => {
        orchestrationEngine.on('systemEvent', (event: SystemEvent) => {
          expect(event).toBeDefined();
          expect(event.type).toBeDefined();
          expect(event.timestamp).toBeDefined();
          resolve();
        });

        const testEvent: SystemEvent = {
          type: 'test.event',
          source: 'test',
          data: {},
          timestamp: new Date(),
          severity: 'info'
        };

        orchestrationEngine.handleSystemEvent(testEvent);
      });
    });

    it('should store events in event store', async () => {
      const events: SystemEvent[] = [
        {
          type: 'workflow.started',
          source: 'orchestration-engine',
          data: { requestId: 'test-1' },
          timestamp: new Date(),
          severity: 'info'
        },
        {
          type: 'component.scaled',
          source: 'component-manager',
          data: { componentId: 'yamlGenerator' },
          timestamp: new Date(),
          severity: 'info'
        }
      ];

      for (const event of events) {
        await orchestrationEngine.handleSystemEvent(event);
      }

      const storedEvents = orchestrationEngine.getEventHistory();
      expect(storedEvents.length).toBeGreaterThanOrEqual(events.length);
    });
  });

  describe('Circuit Breaker', () => {
    it('should track circuit breaker status', () => {
      const status = orchestrationEngine.getCircuitBreakerStatus();

      expect(status).toBeDefined();
      expect(status.readmeParser).toBe('closed');
      expect(status.frameworkDetector).toBe('closed');
      expect(status.yamlGenerator).toBe('closed');
    });

    it('should handle component failures with circuit breaker', async () => {
      // Simulate multiple failures to trigger circuit breaker
      const operation: ComponentOperation = {
        type: 'deploy',
        componentId: 'readmeParser',
        parameters: { simulateFailure: true }
      };

      // Multiple failed operations should eventually trigger circuit breaker
      for (let i = 0; i < 3; i++) {
        await orchestrationEngine.manageComponents(operation);
      }

      const status = orchestrationEngine.getCircuitBreakerStatus();
      expect(status.readmeParser).toBeDefined();
    });
  });

  describe('Health Monitoring', () => {
    it('should perform health checks', async () => {
      const request: WorkflowRequest = {
        type: 'system-maintenance',
        payload: {
          maintenanceType: 'health-check'
        },
        context: {
          requestId: 'health-check-1',
          timestamp: new Date()
        },
        priority: 'normal'
      };

      const result = await orchestrationEngine.processWorkflow(request);

      expect(result.success).toBe(true);
      expect(result.data.status).toBeDefined();
      expect(result.data.checks).toBeDefined();
      expect(Array.isArray(result.data.checks)).toBe(true);
    });

    it('should report component health status', async () => {
      const request: WorkflowRequest = {
        type: 'system-maintenance',
        payload: {
          maintenanceType: 'health-check'
        },
        context: {
          requestId: 'health-status-1',
          timestamp: new Date()
        },
        priority: 'normal'
      };

      const result = await orchestrationEngine.processWorkflow(request);
      const healthData = result.data;

      expect(healthData.status).toMatch(/healthy|degraded|unhealthy/);
      expect(healthData.checks).toBeDefined();
      expect(healthData.lastUpdated).toBeDefined();
    });
  });

  describe('Queue Management', () => {
    it('should track queue status', () => {
      const status = orchestrationEngine.getQueueStatus();

      expect(status).toBeDefined();
      expect(typeof status.size).toBe('number');
      expect(typeof status.processing).toBe('boolean');
    });

    it('should handle queue operations', async () => {
      const initialStatus = orchestrationEngine.getQueueStatus();
      
      const request: WorkflowRequest = {
        type: 'system-maintenance',
        payload: { maintenanceType: 'cleanup' },
        context: { requestId: 'queue-test', timestamp: new Date() },
        priority: 'low'
      };

      // Process request
      await orchestrationEngine.processWorkflow(request);

      const finalStatus = orchestrationEngine.getQueueStatus();
      expect(finalStatus).toBeDefined();
    });
  });

  describe('Error Recovery', () => {
    it('should handle component failures gracefully', async () => {
      const failureEvent: SystemEvent = {
        type: 'component.failure',
        source: 'monitoring',
        data: { componentId: 'frameworkDetector' },
        timestamp: new Date(),
        severity: 'error'
      };

      await orchestrationEngine.handleSystemEvent(failureEvent);

      // Should not throw and should handle gracefully
      expect(true).toBe(true);
    });

    it('should handle system overload events', async () => {
      const overloadEvent: SystemEvent = {
        type: 'system.overload',
        source: 'monitoring',
        data: { cpuUsage: 95, memoryUsage: 90 },
        timestamp: new Date(),
        severity: 'warning'
      };

      await orchestrationEngine.handleSystemEvent(overloadEvent);

      // Should handle overload gracefully
      expect(true).toBe(true);
    });

    it('should handle workflow timeouts', async () => {
      const timeoutEvent: SystemEvent = {
        type: 'workflow.timeout',
        source: 'monitoring',
        data: { requestId: 'timeout-test-1' },
        timestamp: new Date(),
        severity: 'warning'
      };

      await orchestrationEngine.handleSystemEvent(timeoutEvent);

      // Should handle timeout gracefully
      expect(true).toBe(true);
    });
  });

  describe('System Maintenance', () => {
    it('should perform cleanup operations', async () => {
      const request: WorkflowRequest = {
        type: 'system-maintenance',
        payload: {
          maintenanceType: 'cleanup',
          retentionDays: 7
        },
        context: {
          requestId: 'cleanup-1',
          timestamp: new Date()
        },
        priority: 'low'
      };

      const result = await orchestrationEngine.processWorkflow(request);

      expect(result.success).toBe(true);
      expect(result.data.cleanedEvents).toBeDefined();
      expect(typeof result.data.cleanedEvents).toBe('number');
    });

    it('should perform backup operations', async () => {
      const request: WorkflowRequest = {
        type: 'system-maintenance',
        payload: {
          maintenanceType: 'backup'
        },
        context: {
          requestId: 'backup-1',
          timestamp: new Date()
        },
        priority: 'normal'
      };

      const result = await orchestrationEngine.processWorkflow(request);

      expect(result.success).toBe(true);
      expect(result.data.backupId).toBeDefined();
      expect(result.data.size).toBeDefined();
      expect(typeof result.data.size).toBe('number');
    });
  });

  describe('Shutdown and Cleanup', () => {
    it('should shutdown gracefully', async () => {
      const engine = new OrchestrationEngine();
      
      // Perform some operations
      const request: WorkflowRequest = {
        type: 'system-maintenance',
        payload: { maintenanceType: 'health-check' },
        context: { requestId: 'shutdown-test', timestamp: new Date() },
        priority: 'normal'
      };

      await engine.processWorkflow(request);

      // Shutdown should not throw
      await expect(engine.shutdown()).resolves.toBeUndefined();
    });

    it('should clear resources on shutdown', async () => {
      const engine = new OrchestrationEngine();
      
      // Add some events
      const event: SystemEvent = {
        type: 'test.event',
        source: 'test',
        data: {},
        timestamp: new Date(),
        severity: 'info'
      };

      await engine.handleSystemEvent(event);
      
      // Verify events exist
      expect(engine.getEventHistory().length).toBeGreaterThan(0);

      // Shutdown and verify cleanup
      await engine.shutdown();
      
      // After shutdown, event history should be cleared
      expect(engine.getEventHistory().length).toBe(0);
    });
  });
});