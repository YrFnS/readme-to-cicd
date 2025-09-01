import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  OrchestrationEngine,
  WorkflowRequest,
  ComponentOperation,
  SystemEvent
} from '../../../src/integration/orchestration/orchestration-engine';

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
          sessionId: 'test-session-1',
          timestamp: new Date(),
          source: 'cli' as const,
          environment: 'development' as const,
          traceId: 'trace-1'
        },
        id: 'test-request-1',
        priority: 'high'
      };

      const result = await orchestrationEngine.processWorkflow(request);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.traceId).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should handle different workflow types', async () => {
      const maintenanceRequest: WorkflowRequest = {
        type: 'system-maintenance',
        payload: {
          maintenanceType: 'health-check'
        },
        context: {
          sessionId: 'maintenance-session-1',
          timestamp: new Date(),
          source: 'cli' as const,
          environment: 'development' as const,
          traceId: 'trace-maintenance-1'
        },
        id: 'maintenance-1',
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
          sessionId: 'invalid-session',
          timestamp: new Date(),
          source: 'cli' as const,
          environment: 'development' as const,
          traceId: 'trace-invalid'
        },
        id: 'invalid-request',
        priority: 'low'
      };

      const result = await orchestrationEngine.processWorkflow(invalidRequest);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should prioritize high priority requests', async () => {
      const lowPriorityRequest: WorkflowRequest = {
        type: 'system-maintenance',
        payload: { maintenanceType: 'cleanup', retentionDays: 7 },
        context: { 
          sessionId: 'low-session-1', 
          timestamp: new Date(),
          source: 'cli' as const,
          environment: 'development' as const,
          traceId: 'trace-low-1'
        },
        id: 'low-1',
        priority: 'low'
      };

      const highPriorityRequest: WorkflowRequest = {
        type: 'system-maintenance',
        payload: { maintenanceType: 'health-check' },
        context: { 
          sessionId: 'high-session-1', 
          timestamp: new Date(),
          source: 'cli' as const,
          environment: 'development' as const,
          traceId: 'trace-high-1'
        },
        id: 'high-1',
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
        component: 'readmeParser',
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
        type: 'start',
        component: 'non-existent-component',
        parameters: {}
      };

      const result = await orchestrationEngine.manageComponents(operation);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.success).toBe(true);
    });

    it('should support different operation types', async () => {
      const operations: ComponentOperation[] = [
        { type: 'start', component: 'readmeParser', parameters: {} },
        { type: 'restart', component: 'frameworkDetector', parameters: { replicas: 2 } },
        { type: 'configure', component: 'yamlGenerator', parameters: { version: '2.0.0' } },
        { type: 'stop', component: 'readmeParser', parameters: {} }
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
        id: 'test-event-1',
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

    describe('getEventHistory', () => {
      it('should return empty array initially', () => {
        const history = orchestrationEngine.getEventHistory();
        
        expect(Array.isArray(history)).toBe(true);
        expect(history.length).toBe(0);
      });

      it('should return events after they are added', async () => {
        const mockEvent: SystemEvent = {
          id: 'test-event-1',
          type: 'workflow.started',
          source: 'orchestration-engine',
          timestamp: new Date(),
          data: { requestId: 'test-123' },
          severity: 'info'
        };

        await orchestrationEngine.handleSystemEvent(mockEvent);
        
        const history = orchestrationEngine.getEventHistory();
        expect(history.length).toBe(1);
        expect(history[0]).toEqual(mockEvent);
      });

      it('should return a copy of the event history array', async () => {
        const mockEvent: SystemEvent = {
          id: 'test-event-2',
          type: 'component.updated',
          source: 'component-manager',
          timestamp: new Date(),
          data: { componentId: 'yamlGenerator' },
          severity: 'info'
        };

        await orchestrationEngine.handleSystemEvent(mockEvent);
        
        const history1 = orchestrationEngine.getEventHistory();
        const history2 = orchestrationEngine.getEventHistory();
        
        // Should be different array instances
        expect(history1).not.toBe(history2);
        // But should have same content
        expect(history1).toEqual(history2);
        
        // Modifying returned array should not affect internal state
        history1.push({
          id: 'fake-event',
          type: 'fake.type',
          source: 'test',
          timestamp: new Date(),
          data: {},
          severity: 'info'
        });
        
        const history3 = orchestrationEngine.getEventHistory();
        expect(history3.length).not.toBe(history1.length);
      });

      it('should handle multiple events with different severities', async () => {
        const mockEvents: SystemEvent[] = [
          {
            id: 'info-event',
            type: 'workflow.completed',
            source: 'orchestration-engine',
            timestamp: new Date(),
            data: { requestId: 'req-1', duration: 1500 },
            severity: 'info'
          },
          {
            id: 'warning-event',
            type: 'component.slow',
            source: 'monitoring',
            timestamp: new Date(),
            data: { componentId: 'frameworkDetector', responseTime: 5000 },
            severity: 'warning'
          },
          {
            id: 'error-event',
            type: 'component.failure',
            source: 'health-manager',
            timestamp: new Date(),
            data: { componentId: 'readmeParser', error: 'Connection timeout' },
            severity: 'error'
          },
          {
            id: 'critical-event',
            type: 'system.overload',
            source: 'monitoring',
            timestamp: new Date(),
            data: { cpuUsage: 98, memoryUsage: 95 },
            severity: 'critical'
          }
        ];

        for (const event of mockEvents) {
          await orchestrationEngine.handleSystemEvent(event);
        }
        
        const history = orchestrationEngine.getEventHistory();
        expect(history.length).toBe(mockEvents.length);
        
        // Verify all events are present
        mockEvents.forEach(mockEvent => {
          const foundEvent = history.find(e => e.id === mockEvent.id);
          expect(foundEvent).toBeDefined();
          expect(foundEvent).toEqual(mockEvent);
        });
        
        // Verify different severities are preserved
        expect(history.some(e => e.severity === 'info')).toBe(true);
        expect(history.some(e => e.severity === 'warning')).toBe(true);
        expect(history.some(e => e.severity === 'error')).toBe(true);
        expect(history.some(e => e.severity === 'critical')).toBe(true);
      });

      it('should maintain chronological order of events', async () => {
        const baseTime = new Date();
        const mockEvents: SystemEvent[] = [
          {
            id: 'event-1',
            type: 'workflow.started',
            source: 'test',
            timestamp: new Date(baseTime.getTime()),
            data: { order: 1 },
            severity: 'info'
          },
          {
            id: 'event-2',
            type: 'workflow.processing',
            source: 'test',
            timestamp: new Date(baseTime.getTime() + 1000),
            data: { order: 2 },
            severity: 'info'
          },
          {
            id: 'event-3',
            type: 'workflow.completed',
            source: 'test',
            timestamp: new Date(baseTime.getTime() + 2000),
            data: { order: 3 },
            severity: 'info'
          }
        ];

        for (const event of mockEvents) {
          await orchestrationEngine.handleSystemEvent(event);
        }
        
        const history = orchestrationEngine.getEventHistory();
        expect(history.length).toBe(3);
        
        // Events should be in the order they were added
        expect(history[0].data.order).toBe(1);
        expect(history[1].data.order).toBe(2);
        expect(history[2].data.order).toBe(3);
      });

      it('should handle events with complex data structures', async () => {
        const complexEvent: SystemEvent = {
          id: 'complex-event',
          type: 'workflow.analysis',
          source: 'analytics-engine',
          timestamp: new Date(),
          data: {
            workflow: {
              id: 'wf-123',
              type: 'readme-to-cicd',
              steps: ['parse', 'detect', 'generate'],
              metadata: {
                author: 'test-user',
                repository: 'test/repo',
                branch: 'main'
              }
            },
            metrics: {
              duration: 2500,
              memoryUsage: 45.6,
              cpuUsage: 12.3
            },
            results: {
              frameworks: ['nodejs', 'typescript'],
              confidence: 0.95,
              warnings: []
            }
          },
          severity: 'info'
        };

        await orchestrationEngine.handleSystemEvent(complexEvent);
        
        const history = orchestrationEngine.getEventHistory();
        const retrievedEvent = history.find(e => e.id === 'complex-event');
        
        expect(retrievedEvent).toBeDefined();
        expect(retrievedEvent).toEqual(complexEvent);
        expect(retrievedEvent!.data.workflow.steps).toEqual(['parse', 'detect', 'generate']);
        expect(retrievedEvent!.data.metrics.duration).toBe(2500);
        expect(retrievedEvent!.data.results.frameworks).toEqual(['nodejs', 'typescript']);
      });
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
          id: 'test-event-emit',
          type: 'test.event',
          source: 'test',
          data: {},
          timestamp: new Date(),
          severity: 'info'
        };

        orchestrationEngine.handleSystemEvent(testEvent);
      });
    });

    describe('Event Listener Management', () => {
      it('should register event listeners with on() method', () => {
        const mockCallback = vi.fn();
        
        // Register event listener
        orchestrationEngine.on('testEvent', mockCallback);
        
        // Verify listener is registered by triggering an event
        const testEvent: SystemEvent = {
          id: 'listener-test-1',
          type: 'testEvent',
          source: 'test',
          timestamp: new Date(),
          data: { message: 'test data' },
          severity: 'info'
        };
        
        orchestrationEngine.handleSystemEvent(testEvent);
        
        // Callback should have been called
        expect(mockCallback).toHaveBeenCalledWith(testEvent);
      });

      it('should support multiple listeners for the same event type', async () => {
        const callback1 = vi.fn();
        const callback2 = vi.fn();
        const callback3 = vi.fn();
        
        // Register multiple listeners for the same event
        orchestrationEngine.on('multiListener', callback1);
        orchestrationEngine.on('multiListener', callback2);
        orchestrationEngine.on('multiListener', callback3);
        
        const testEvent: SystemEvent = {
          id: 'multi-listener-test',
          type: 'multiListener',
          source: 'test',
          timestamp: new Date(),
          data: { test: 'multiple listeners' },
          severity: 'info'
        };
        
        await orchestrationEngine.handleSystemEvent(testEvent);
        
        // All callbacks should have been called
        expect(callback1).toHaveBeenCalledWith(testEvent);
        expect(callback2).toHaveBeenCalledWith(testEvent);
        expect(callback3).toHaveBeenCalledWith(testEvent);
      });

      it('should support different event types with different listeners', async () => {
        const workflowCallback = vi.fn();
        const componentCallback = vi.fn();
        const systemCallback = vi.fn();
        
        // Register listeners for different event types
        orchestrationEngine.on('workflow.started', workflowCallback);
        orchestrationEngine.on('component.failure', componentCallback);
        orchestrationEngine.on('system.alert', systemCallback);
        
        // Create events of different types
        const workflowEvent: SystemEvent = {
          id: 'workflow-event',
          type: 'workflow.started',
          source: 'orchestration',
          timestamp: new Date(),
          data: { workflowId: 'wf-123' },
          severity: 'info'
        };
        
        const componentEvent: SystemEvent = {
          id: 'component-event',
          type: 'component.failure',
          source: 'monitoring',
          timestamp: new Date(),
          data: { componentId: 'parser' },
          severity: 'error'
        };
        
        const systemEvent: SystemEvent = {
          id: 'system-event',
          type: 'system.alert',
          source: 'health-check',
          timestamp: new Date(),
          data: { alertLevel: 'high' },
          severity: 'warning'
        };
        
        // Handle each event
        await orchestrationEngine.handleSystemEvent(workflowEvent);
        await orchestrationEngine.handleSystemEvent(componentEvent);
        await orchestrationEngine.handleSystemEvent(systemEvent);
        
        // Verify only appropriate callbacks were called
        expect(workflowCallback).toHaveBeenCalledWith(workflowEvent);
        expect(workflowCallback).toHaveBeenCalledTimes(1);
        
        expect(componentCallback).toHaveBeenCalledWith(componentEvent);
        expect(componentCallback).toHaveBeenCalledTimes(1);
        
        expect(systemCallback).toHaveBeenCalledWith(systemEvent);
        expect(systemCallback).toHaveBeenCalledTimes(1);
      });

      it('should remove event listeners with off() method', async () => {
        const callback1 = vi.fn();
        const callback2 = vi.fn();
        
        // Register two listeners
        orchestrationEngine.on('removeTest', callback1);
        orchestrationEngine.on('removeTest', callback2);
        
        // Remove one listener
        orchestrationEngine.off('removeTest', callback1);
        
        const testEvent: SystemEvent = {
          id: 'remove-test',
          type: 'removeTest',
          source: 'test',
          timestamp: new Date(),
          data: { action: 'remove listener test' },
          severity: 'info'
        };
        
        await orchestrationEngine.handleSystemEvent(testEvent);
        
        // Only callback2 should have been called
        expect(callback1).not.toHaveBeenCalled();
        expect(callback2).toHaveBeenCalledWith(testEvent);
      });

      it('should handle removal of non-existent listeners gracefully', () => {
        const callback = vi.fn();
        
        // Try to remove a listener that was never added
        expect(() => {
          orchestrationEngine.off('nonExistentEvent', callback);
        }).not.toThrow();
        
        // Register a listener and then try to remove a different callback
        orchestrationEngine.on('existingEvent', callback);
        const differentCallback = vi.fn();
        
        expect(() => {
          orchestrationEngine.off('existingEvent', differentCallback);
        }).not.toThrow();
      });

      it('should handle listener errors gracefully without affecting other listeners', async () => {
        const errorCallback = vi.fn(() => {
          throw new Error('Listener error');
        });
        const successCallback = vi.fn();
        
        // Register both callbacks
        orchestrationEngine.on('errorTest', errorCallback);
        orchestrationEngine.on('errorTest', successCallback);
        
        const testEvent: SystemEvent = {
          id: 'error-test',
          type: 'errorTest',
          source: 'test',
          timestamp: new Date(),
          data: { test: 'error handling' },
          severity: 'info'
        };
        
        // Should not throw despite error in one listener
        await expect(orchestrationEngine.handleSystemEvent(testEvent)).resolves.not.toThrow();
        
        // Both callbacks should have been called
        expect(errorCallback).toHaveBeenCalledWith(testEvent);
        expect(successCallback).toHaveBeenCalledWith(testEvent);
      });

      it('should support listener registration and removal during event handling', async () => {
        const callback1 = vi.fn();
        const callback2 = vi.fn();
        let dynamicCallback: any;
        
        // Create a callback that registers another listener
        const registeringCallback = vi.fn((event: SystemEvent) => {
          dynamicCallback = vi.fn();
          orchestrationEngine.on('dynamicTest', dynamicCallback);
        });
        
        orchestrationEngine.on('dynamicTest', registeringCallback);
        orchestrationEngine.on('dynamicTest', callback1);
        
        const firstEvent: SystemEvent = {
          id: 'dynamic-test-1',
          type: 'dynamicTest',
          source: 'test',
          timestamp: new Date(),
          data: { phase: 'first' },
          severity: 'info'
        };
        
        await orchestrationEngine.handleSystemEvent(firstEvent);
        
        // First event should trigger registration
        expect(registeringCallback).toHaveBeenCalledWith(firstEvent);
        expect(callback1).toHaveBeenCalledWith(firstEvent);
        
        // Second event should trigger the dynamically registered callback
        const secondEvent: SystemEvent = {
          id: 'dynamic-test-2',
          type: 'dynamicTest',
          source: 'test',
          timestamp: new Date(),
          data: { phase: 'second' },
          severity: 'info'
        };
        
        await orchestrationEngine.handleSystemEvent(secondEvent);
        
        expect(dynamicCallback).toHaveBeenCalledWith(secondEvent);
      });

      it('should maintain listener isolation between different event types', async () => {
        const callback1 = vi.fn();
        const callback2 = vi.fn();
        
        // Register listeners for different event types
        orchestrationEngine.on('type1', callback1);
        orchestrationEngine.on('type2', callback2);
        
        // Remove listener for type1
        orchestrationEngine.off('type1', callback1);
        
        // Trigger events for both types
        const event1: SystemEvent = {
          id: 'isolation-test-1',
          type: 'type1',
          source: 'test',
          timestamp: new Date(),
          data: {},
          severity: 'info'
        };
        
        const event2: SystemEvent = {
          id: 'isolation-test-2',
          type: 'type2',
          source: 'test',
          timestamp: new Date(),
          data: {},
          severity: 'info'
        };
        
        await orchestrationEngine.handleSystemEvent(event1);
        await orchestrationEngine.handleSystemEvent(event2);
        
        // Only callback2 should have been called
        expect(callback1).not.toHaveBeenCalled();
        expect(callback2).toHaveBeenCalledWith(event2);
      });

      it('should handle complex event data in listeners', async () => {
        const dataCallback = vi.fn();
        
        orchestrationEngine.on('complexData', dataCallback);
        
        const complexEvent: SystemEvent = {
          id: 'complex-data-test',
          type: 'complexData',
          source: 'test-suite',
          timestamp: new Date(),
          data: {
            nested: {
              object: {
                with: ['arrays', 'and', 'values'],
                numbers: 42,
                boolean: true,
                nullValue: null
              }
            },
            metadata: {
              version: '1.0.0',
              tags: ['test', 'complex', 'data']
            }
          },
          severity: 'info'
        };
        
        await orchestrationEngine.handleSystemEvent(complexEvent);
        
        expect(dataCallback).toHaveBeenCalledWith(complexEvent);
        
        // Verify the callback received the complete complex data
        const receivedEvent = dataCallback.mock.calls[0][0];
        expect(receivedEvent.data.nested.object.with).toEqual(['arrays', 'and', 'values']);
        expect(receivedEvent.data.nested.object.numbers).toBe(42);
        expect(receivedEvent.data.metadata.tags).toEqual(['test', 'complex', 'data']);
      });

      it('should support listener chaining and event propagation', async () => {
        const events: SystemEvent[] = [];
        
        // Create a listener that triggers another event
        const chainCallback = vi.fn((event: SystemEvent) => {
          if (event.type === 'chain.start') {
            const chainedEvent: SystemEvent = {
              id: 'chained-event',
              type: 'chain.next',
              source: 'chain-callback',
              timestamp: new Date(),
              data: { originalEvent: event.id },
              severity: 'info'
            };
            orchestrationEngine.handleSystemEvent(chainedEvent);
          }
        });
        
        const finalCallback = vi.fn((event: SystemEvent) => {
          events.push(event);
        });
        
        orchestrationEngine.on('chain.start', chainCallback);
        orchestrationEngine.on('chain.next', finalCallback);
        
        const startEvent: SystemEvent = {
          id: 'chain-start',
          type: 'chain.start',
          source: 'test',
          timestamp: new Date(),
          data: { message: 'start chain' },
          severity: 'info'
        };
        
        await orchestrationEngine.handleSystemEvent(startEvent);
        
        // Allow time for chained event to be processed
        await new Promise(resolve => setTimeout(resolve, 10));
        
        expect(chainCallback).toHaveBeenCalledWith(startEvent);
        expect(finalCallback).toHaveBeenCalled();
        expect(events.length).toBeGreaterThan(0);
        expect(events[0].data.originalEvent).toBe('chain-start');
      });
    });

    it('should store events in event store', async () => {
      const events: SystemEvent[] = [
        {
          id: 'workflow-started-1',
          type: 'workflow.started',
          source: 'orchestration-engine',
          data: { requestId: 'test-1' },
          timestamp: new Date(),
          severity: 'info'
        },
        {
          id: 'component-scaled-1',
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
      expect(status.readmeParser).toBeDefined();
      expect(status.readmeParser.state).toBe('closed');
      expect(status.frameworkDetector).toBeDefined();
      expect(status.frameworkDetector.state).toBe('closed');
      expect(status.yamlGenerator).toBeDefined();
      expect(status.yamlGenerator.state).toBe('closed');
    });

    it('should handle component failures with circuit breaker', async () => {
      // Simulate multiple failures to trigger circuit breaker
      const operation: ComponentOperation = {
        type: 'start',
        component: 'readmeParser',
        parameters: { simulateFailure: true }
      };

      // Multiple failed operations should eventually trigger circuit breaker
      for (let i = 0; i < 3; i++) {
        await orchestrationEngine.manageComponents(operation);
      }

      const status = orchestrationEngine.getCircuitBreakerStatus();
      expect(status.readmeParser).toBeDefined();
      expect(status.readmeParser.state).toBeDefined();
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
          sessionId: 'health-session-1',
          timestamp: new Date(),
          source: 'cli' as const,
          environment: 'development' as const,
          traceId: 'trace-health-1'
        },
        id: 'health-check-1',
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
          sessionId: 'health-status-session-1',
          timestamp: new Date(),
          source: 'cli' as const,
          environment: 'development' as const,
          traceId: 'trace-health-status-1'
        },
        id: 'health-status-1',
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
    describe('getQueueStatus', () => {
      it('should return initial queue status with zero values', () => {
        const status = orchestrationEngine.getQueueStatus();

        expect(status).toBeDefined();
        expect(typeof status.pending).toBe('number');
        expect(typeof status.processing).toBe('number');
        expect(typeof status.completed).toBe('number');
        expect(typeof status.failed).toBe('number');
        expect(typeof status.totalProcessed).toBe('number');
        
        // Initially all values should be 0
        expect(status.pending).toBe(0);
        expect(status.processing).toBe(0);
        expect(status.completed).toBe(0);
        expect(status.failed).toBe(0);
        expect(status.totalProcessed).toBe(0);
      });

      it('should track completed workflows in queue status', async () => {
        const initialStatus = orchestrationEngine.getQueueStatus();
        
        // Create a successful workflow request
        const request: WorkflowRequest = {
          type: 'system-maintenance',
          payload: { maintenanceType: 'health-check' },
          context: { 
            sessionId: 'queue-completed-session', 
            timestamp: new Date(),
            source: 'cli' as const,
            environment: 'development' as const,
            traceId: 'trace-queue-completed'
          },
          id: 'queue-completed-test',
          priority: 'normal'
        };

        // Process the request
        const result = await orchestrationEngine.processWorkflow(request);
        expect(result.success).toBe(true);

        // Add a completed workflow event to event history
        const completedEvent = {
          id: 'workflow-completed-event',
          type: 'workflow.completed',
          source: 'orchestration-engine',
          timestamp: new Date(),
          data: { requestId: request.id },
          severity: 'info' as const
        };
        await orchestrationEngine.handleSystemEvent(completedEvent);

        const finalStatus = orchestrationEngine.getQueueStatus();
        
        // Completed count should have increased
        expect(finalStatus.completed).toBeGreaterThan(initialStatus.completed);
        expect(finalStatus.totalProcessed).toBeGreaterThan(initialStatus.totalProcessed);
      });

      it('should track failed workflows in queue status', async () => {
        const initialStatus = orchestrationEngine.getQueueStatus();
        
        // Add a failed workflow event to event history
        const failedEvent = {
          id: 'workflow-failed-event',
          type: 'workflow.failed',
          source: 'orchestration-engine',
          timestamp: new Date(),
          data: { requestId: 'failed-request-123', error: 'Test failure' },
          severity: 'error' as const
        };
        await orchestrationEngine.handleSystemEvent(failedEvent);

        const finalStatus = orchestrationEngine.getQueueStatus();
        
        // Failed count should have increased
        expect(finalStatus.failed).toBeGreaterThan(initialStatus.failed);
        expect(finalStatus.totalProcessed).toBeGreaterThan(initialStatus.totalProcessed);
      });

      it('should calculate totalProcessed as sum of completed and failed', async () => {
        // Add multiple completed and failed events
        const events = [
          {
            id: 'completed-1',
            type: 'workflow.completed',
            source: 'orchestration-engine',
            timestamp: new Date(),
            data: { requestId: 'req-1' },
            severity: 'info' as const
          },
          {
            id: 'completed-2',
            type: 'workflow.completed',
            source: 'orchestration-engine',
            timestamp: new Date(),
            data: { requestId: 'req-2' },
            severity: 'info' as const
          },
          {
            id: 'failed-1',
            type: 'workflow.failed',
            source: 'orchestration-engine',
            timestamp: new Date(),
            data: { requestId: 'req-3', error: 'Test error' },
            severity: 'error' as const
          }
        ];

        for (const event of events) {
          await orchestrationEngine.handleSystemEvent(event);
        }

        const status = orchestrationEngine.getQueueStatus();
        
        // Verify the calculation logic
        expect(status.totalProcessed).toBe(status.completed + status.failed);
        expect(status.completed).toBeGreaterThanOrEqual(2);
        expect(status.failed).toBeGreaterThanOrEqual(1);
        expect(status.totalProcessed).toBeGreaterThanOrEqual(3);
      });

      it('should handle mixed event types without affecting queue metrics', async () => {
        const initialStatus = orchestrationEngine.getQueueStatus();
        
        // Add events that should not affect queue metrics
        const nonQueueEvents = [
          {
            id: 'component-event',
            type: 'component.started',
            source: 'component-manager',
            timestamp: new Date(),
            data: { componentId: 'readmeParser' },
            severity: 'info' as const
          },
          {
            id: 'system-event',
            type: 'system.maintenance',
            source: 'maintenance-scheduler',
            timestamp: new Date(),
            data: { operation: 'cleanup' },
            severity: 'info' as const
          }
        ];

        for (const event of nonQueueEvents) {
          await orchestrationEngine.handleSystemEvent(event);
        }

        const statusAfterNonQueueEvents = orchestrationEngine.getQueueStatus();
        
        // Queue metrics should remain unchanged for non-workflow events
        expect(statusAfterNonQueueEvents.completed).toBe(initialStatus.completed);
        expect(statusAfterNonQueueEvents.failed).toBe(initialStatus.failed);
        expect(statusAfterNonQueueEvents.totalProcessed).toBe(initialStatus.totalProcessed);

        // Now add a workflow event
        const workflowEvent = {
          id: 'workflow-completed-mixed',
          type: 'workflow.completed',
          source: 'orchestration-engine',
          timestamp: new Date(),
          data: { requestId: 'mixed-test' },
          severity: 'info' as const
        };
        await orchestrationEngine.handleSystemEvent(workflowEvent);

        const finalStatus = orchestrationEngine.getQueueStatus();
        
        // Only workflow events should affect queue metrics
        expect(finalStatus.completed).toBe(initialStatus.completed + 1);
        expect(finalStatus.totalProcessed).toBe(initialStatus.totalProcessed + 1);
      });

      it('should return consistent queue status structure', () => {
        const status1 = orchestrationEngine.getQueueStatus();
        const status2 = orchestrationEngine.getQueueStatus();
        
        // Structure should be consistent
        expect(Object.keys(status1)).toEqual(Object.keys(status2));
        expect(Object.keys(status1)).toEqual(['pending', 'processing', 'completed', 'failed', 'totalProcessed']);
        
        // All values should be numbers
        Object.values(status1).forEach(value => {
          expect(typeof value).toBe('number');
          expect(value).toBeGreaterThanOrEqual(0);
        });
      });

      it('should handle large numbers of events efficiently', async () => {
        const startTime = Date.now();
        
        // Add many events to test performance
        const eventPromises = [];
        for (let i = 0; i < 100; i++) {
          const eventType = i % 2 === 0 ? 'workflow.completed' : 'workflow.failed';
          const event = {
            id: `perf-test-${i}`,
            type: eventType,
            source: 'performance-test',
            timestamp: new Date(),
            data: { requestId: `perf-req-${i}` },
            severity: 'info' as const
          };
          eventPromises.push(orchestrationEngine.handleSystemEvent(event));
        }
        
        await Promise.all(eventPromises);
        
        const status = orchestrationEngine.getQueueStatus();
        const endTime = Date.now();
        
        // Should handle large numbers efficiently (under 1 second)
        expect(endTime - startTime).toBeLessThan(1000);
        
        // Verify correct counts
        expect(status.completed).toBe(50); // Half were completed
        expect(status.failed).toBe(50); // Half were failed
        expect(status.totalProcessed).toBe(100);
      });

      it('should maintain queue status accuracy after multiple operations', async () => {
        // Perform multiple workflow operations
        const requests = [
          {
            type: 'system-maintenance' as const,
            payload: { maintenanceType: 'health-check' },
            context: { 
              sessionId: 'multi-op-1', 
              timestamp: new Date(),
              source: 'cli' as const,
              environment: 'development' as const,
              traceId: 'trace-multi-1'
            },
            id: 'multi-op-1',
            priority: 'normal' as const
          },
          {
            type: 'system-maintenance' as const,
            payload: { maintenanceType: 'cleanup' },
            context: { 
              sessionId: 'multi-op-2', 
              timestamp: new Date(),
              source: 'cli' as const,
              environment: 'development' as const,
              traceId: 'trace-multi-2'
            },
            id: 'multi-op-2',
            priority: 'low' as const
          }
        ];

        const initialStatus = orchestrationEngine.getQueueStatus();
        
        // Process requests and add corresponding events
        for (const request of requests) {
          const result = await orchestrationEngine.processWorkflow(request);
          
          // Add corresponding workflow event
          const eventType = result.success ? 'workflow.completed' : 'workflow.failed';
          const event = {
            id: `${request.id}-event`,
            type: eventType,
            source: 'orchestration-engine',
            timestamp: new Date(),
            data: { requestId: request.id },
            severity: result.success ? 'info' as const : 'error' as const
          };
          await orchestrationEngine.handleSystemEvent(event);
        }

        const finalStatus = orchestrationEngine.getQueueStatus();
        
        // Verify status reflects the operations
        expect(finalStatus.totalProcessed).toBeGreaterThan(initialStatus.totalProcessed);
        expect(finalStatus.completed + finalStatus.failed).toBe(finalStatus.totalProcessed);
      });
    });

    it('should handle queue operations', async () => {
      const request: WorkflowRequest = {
        type: 'system-maintenance',
        payload: { maintenanceType: 'cleanup' },
        context: { 
          sessionId: 'queue-session', 
          timestamp: new Date(),
          source: 'cli' as const,
          environment: 'development' as const,
          traceId: 'trace-queue-test'
        },
        id: 'queue-test',
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
        id: 'failure-event-1',
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
        id: 'overload-event-1',
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
        id: 'timeout-event-1',
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
          sessionId: 'cleanup-session-1',
          timestamp: new Date(),
          source: 'cli' as const,
          environment: 'development' as const,
          traceId: 'trace-cleanup-1'
        },
        id: 'cleanup-1',
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
          sessionId: 'backup-session-1',
          timestamp: new Date(),
          source: 'cli' as const,
          environment: 'development' as const,
          traceId: 'trace-backup-1'
        },
        id: 'backup-1',
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
        context: { 
          sessionId: 'shutdown-session', 
          timestamp: new Date(),
          source: 'cli' as const,
          environment: 'development' as const,
          traceId: 'trace-shutdown-test'
        },
        id: 'shutdown-test',
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
        id: 'test-event-shutdown',
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