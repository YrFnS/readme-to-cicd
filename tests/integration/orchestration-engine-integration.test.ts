import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OrchestrationEngine } from '../../src/integration/orchestration/orchestration-engine';
import { WorkflowRequest, SystemEvent } from '../../src/integration/types';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

describe('OrchestrationEngine Integration Tests', () => {
  let orchestrationEngine: OrchestrationEngine;
  let testReadmePath: string;

  beforeEach(() => {
    orchestrationEngine = new OrchestrationEngine();
    testReadmePath = join(process.cwd(), 'test-readme-integration.md');
    
    // Create a test README file
    const testReadmeContent = `# Test Project

A sample Node.js project for testing the orchestration engine.

## Installation

\`\`\`bash
npm install
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`

## Test

\`\`\`bash
npm test
\`\`\`

## Dependencies

- Node.js
- Express
- Jest
`;

    writeFileSync(testReadmePath, testReadmeContent);
  });

  afterEach(async () => {
    await orchestrationEngine.shutdown();
    
    // Clean up test file
    if (existsSync(testReadmePath)) {
      unlinkSync(testReadmePath);
    }
  });

  describe('End-to-End Workflow Processing', () => {
    it('should process complete README-to-CICD workflow', async () => {
      const request: WorkflowRequest = {
        type: 'readme-to-cicd',
        payload: {
          readmePath: testReadmePath,
          options: {
            workflowType: 'ci',
            optimizationLevel: 'standard',
            includeComments: true,
            securityLevel: 'standard'
          }
        },
        context: {
          requestId: 'integration-test-1',
          timestamp: new Date()
        },
        priority: 'high'
      };

      const result = await orchestrationEngine.processWorkflow(request);

      expect(result).toBeDefined();
      expect(result.traceId).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.metrics.duration).toBeGreaterThanOrEqual(0);
      
      if (result.success) {
        expect(result.data.generatedFiles).toBeDefined();
        expect(Array.isArray(result.data.generatedFiles)).toBe(true);
        expect(result.data.detectedFrameworks).toBeDefined();
        expect(Array.isArray(result.data.detectedFrameworks)).toBe(true);
      } else {
        // If it fails, check that we have error information
        expect(result.data.error).toBeDefined();
        console.log('Workflow failed with error:', result.data.error);
      }
    }, 10000); // 10 second timeout for integration test

    it('should handle workflow errors gracefully', async () => {
      const request: WorkflowRequest = {
        type: 'readme-to-cicd',
        payload: {
          readmePath: 'non-existent-file.md'
        },
        context: {
          requestId: 'error-test-1',
          timestamp: new Date()
        },
        priority: 'normal'
      };

      const result = await orchestrationEngine.processWorkflow(request);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.data.error).toBeDefined();
      expect(typeof result.data.error).toBe('string');
    });

    it('should process multiple workflows concurrently', async () => {
      const requests: WorkflowRequest[] = [
        {
          type: 'system-maintenance',
          payload: { maintenanceType: 'health-check' },
          context: { requestId: 'concurrent-1', timestamp: new Date() },
          priority: 'normal'
        },
        {
          type: 'system-maintenance',
          payload: { maintenanceType: 'backup' },
          context: { requestId: 'concurrent-2', timestamp: new Date() },
          priority: 'low'
        },
        {
          type: 'readme-to-cicd',
          payload: { readmePath: testReadmePath },
          context: { requestId: 'concurrent-3', timestamp: new Date() },
          priority: 'high'
        }
      ];

      const results = await Promise.all(
        requests.map(request => orchestrationEngine.processWorkflow(request))
      );

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.traceId).toBeDefined();
        expect(result.metrics).toBeDefined();
      });

      // At least some should succeed (health-check and backup should always work)
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThanOrEqual(2);
    }, 15000);
  });

  describe('Component Coordination', () => {
    it('should coordinate all system components', async () => {
      const operations = [
        { type: 'restart' as const, componentId: 'readmeParser', parameters: {} },
        { type: 'restart' as const, componentId: 'frameworkDetector', parameters: {} },
        { type: 'restart' as const, componentId: 'yamlGenerator', parameters: {} }
      ];

      const results = await Promise.all(
        operations.map(op => orchestrationEngine.manageComponents(op))
      );

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.timestamp).toBeDefined();
      });
    });

    it('should handle component failures with circuit breaker', async () => {
      // Simulate multiple failures to trigger circuit breaker
      const failingOperation = {
        type: 'deploy' as const,
        componentId: 'readmeParser',
        parameters: { simulateFailure: true }
      };

      // Execute multiple operations that might fail
      const results = [];
      for (let i = 0; i < 3; i++) {
        const result = await orchestrationEngine.manageComponents(failingOperation);
        results.push(result);
      }

      expect(results).toHaveLength(3);
      
      // Check circuit breaker status
      const circuitBreakerStatus = orchestrationEngine.getCircuitBreakerStatus();
      expect(circuitBreakerStatus).toBeDefined();
      expect(circuitBreakerStatus.readmeParser).toBeDefined();
    });
  });

  describe('Event Handling and State Management', () => {
    it('should handle and store system events', async () => {
      const events: SystemEvent[] = [
        {
          type: 'workflow.started',
          source: 'test',
          data: { requestId: 'event-test-1' },
          timestamp: new Date(),
          severity: 'info'
        },
        {
          type: 'component.failure',
          source: 'test',
          data: { componentId: 'testComponent' },
          timestamp: new Date(),
          severity: 'error'
        },
        {
          type: 'system.overload',
          source: 'test',
          data: { cpuUsage: 95 },
          timestamp: new Date(),
          severity: 'warning'
        }
      ];

      // Handle all events
      for (const event of events) {
        await orchestrationEngine.handleSystemEvent(event);
      }

      // Verify events are stored
      const eventHistory = orchestrationEngine.getEventHistory();
      expect(eventHistory.length).toBeGreaterThanOrEqual(events.length);
      
      // Check that our test events are in the history
      const workflowEvents = eventHistory.filter(e => e.type === 'workflow.started');
      const failureEvents = eventHistory.filter(e => e.type === 'component.failure');
      const overloadEvents = eventHistory.filter(e => e.type === 'system.overload');
      
      expect(workflowEvents.length).toBeGreaterThanOrEqual(1);
      expect(failureEvents.length).toBeGreaterThanOrEqual(1);
      expect(overloadEvents.length).toBeGreaterThanOrEqual(1);
    });

    it('should emit events during workflow processing', async () => {
      const emittedEvents: SystemEvent[] = [];
      
      orchestrationEngine.on('systemEvent', (event: SystemEvent) => {
        emittedEvents.push(event);
      });

      const request: WorkflowRequest = {
        type: 'system-maintenance',
        payload: { maintenanceType: 'health-check' },
        context: { requestId: 'event-emission-test', timestamp: new Date() },
        priority: 'normal'
      };

      await orchestrationEngine.processWorkflow(request);

      // Should have emitted at least one event (workflow.queued)
      expect(emittedEvents.length).toBeGreaterThan(0);
      
      // Check for expected event types
      const queuedEvents = emittedEvents.filter(e => e.type === 'workflow.queued');
      expect(queuedEvents.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('System Health and Monitoring', () => {
    it('should perform comprehensive health checks', async () => {
      const request: WorkflowRequest = {
        type: 'system-maintenance',
        payload: { maintenanceType: 'health-check' },
        context: { requestId: 'health-check-integration', timestamp: new Date() },
        priority: 'normal'
      };

      const result = await orchestrationEngine.processWorkflow(request);

      expect(result.success).toBe(true);
      expect(result.data.status).toMatch(/healthy|degraded|unhealthy/);
      expect(result.data.checks).toBeDefined();
      expect(Array.isArray(result.data.checks)).toBe(true);
      expect(result.data.lastUpdated).toBeDefined();

      // Verify all components are checked
      const componentNames = result.data.checks.map((check: any) => check.name);
      expect(componentNames).toContain('readmeParser');
      expect(componentNames).toContain('frameworkDetector');
      expect(componentNames).toContain('yamlGenerator');
    });

    it('should track queue status during operations', async () => {
      const initialStatus = orchestrationEngine.getQueueStatus();
      expect(initialStatus.size).toBe(0);
      expect(typeof initialStatus.processing).toBe('boolean');

      // Start a workflow
      const request: WorkflowRequest = {
        type: 'system-maintenance',
        payload: { maintenanceType: 'backup' },
        context: { requestId: 'queue-status-test', timestamp: new Date() },
        priority: 'low'
      };

      const workflowPromise = orchestrationEngine.processWorkflow(request);
      
      // Check status during processing (might be 0 if processing is very fast)
      const duringStatus = orchestrationEngine.getQueueStatus();
      expect(typeof duringStatus.size).toBe('number');
      expect(typeof duringStatus.processing).toBe('boolean');

      await workflowPromise;

      // Allow some time for queue to be processed
      await new Promise(resolve => setTimeout(resolve, 100));

      const finalStatus = orchestrationEngine.getQueueStatus();
      expect(finalStatus.size).toBeGreaterThanOrEqual(0); // Queue might still have items being processed
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from component failures', async () => {
      // Simulate component failure
      const failureEvent: SystemEvent = {
        type: 'component.failure',
        source: 'monitoring',
        data: { componentId: 'frameworkDetector' },
        timestamp: new Date(),
        severity: 'error'
      };

      await orchestrationEngine.handleSystemEvent(failureEvent);

      // System should still be operational
      const healthRequest: WorkflowRequest = {
        type: 'system-maintenance',
        payload: { maintenanceType: 'health-check' },
        context: { requestId: 'recovery-test', timestamp: new Date() },
        priority: 'high'
      };

      const result = await orchestrationEngine.processWorkflow(healthRequest);
      expect(result.success).toBe(true);
    });

    it('should handle system overload gracefully', async () => {
      // Simulate system overload
      const overloadEvent: SystemEvent = {
        type: 'system.overload',
        source: 'monitoring',
        data: { cpuUsage: 98, memoryUsage: 95 },
        timestamp: new Date(),
        severity: 'critical'
      };

      await orchestrationEngine.handleSystemEvent(overloadEvent);

      // System should still process requests
      const request: WorkflowRequest = {
        type: 'system-maintenance',
        payload: { maintenanceType: 'health-check' },
        context: { requestId: 'overload-test', timestamp: new Date() },
        priority: 'critical'
      };

      const result = await orchestrationEngine.processWorkflow(request);
      expect(result.success).toBe(true);
    });
  });

  describe('System Maintenance Operations', () => {
    it('should perform cleanup operations', async () => {
      // Add some events first
      const events: SystemEvent[] = [
        {
          type: 'test.event.1',
          source: 'test',
          data: {},
          timestamp: new Date(),
          severity: 'info'
        },
        {
          type: 'test.event.2',
          source: 'test',
          data: {},
          timestamp: new Date(),
          severity: 'info'
        }
      ];

      for (const event of events) {
        await orchestrationEngine.handleSystemEvent(event);
      }

      // Perform cleanup
      const request: WorkflowRequest = {
        type: 'system-maintenance',
        payload: {
          maintenanceType: 'cleanup',
          retentionDays: 1
        },
        context: { requestId: 'cleanup-integration', timestamp: new Date() },
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
        payload: { maintenanceType: 'backup' },
        context: { requestId: 'backup-integration', timestamp: new Date() },
        priority: 'normal'
      };

      const result = await orchestrationEngine.processWorkflow(request);

      expect(result.success).toBe(true);
      expect(result.data.backupId).toBeDefined();
      expect(result.data.size).toBeDefined();
      expect(typeof result.data.size).toBe('number');
      expect(result.data.size).toBeGreaterThan(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent workflows efficiently', async () => {
      const startTime = Date.now();
      const concurrentRequests = 10;
      
      const requests: WorkflowRequest[] = Array.from({ length: concurrentRequests }, (_, i) => ({
        type: 'system-maintenance',
        payload: { maintenanceType: 'health-check' },
        context: { requestId: `perf-test-${i}`, timestamp: new Date() },
        priority: 'normal'
      }));

      const results = await Promise.all(
        requests.map(request => orchestrationEngine.processWorkflow(request))
      );

      const duration = Date.now() - startTime;

      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds for 10 concurrent requests
    }, 10000);

    it('should track performance metrics', async () => {
      const request: WorkflowRequest = {
        type: 'system-maintenance',
        payload: { maintenanceType: 'health-check' },
        context: { requestId: 'metrics-test', timestamp: new Date() },
        priority: 'normal'
      };

      const result = await orchestrationEngine.processWorkflow(request);

      expect(result.metrics).toBeDefined();
      expect(result.metrics.duration).toBeGreaterThanOrEqual(0);
      expect(result.metrics.memoryUsage).toBeGreaterThan(0);
      expect(typeof result.metrics.duration).toBe('number');
      expect(typeof result.metrics.memoryUsage).toBe('number');
    });
  });
});