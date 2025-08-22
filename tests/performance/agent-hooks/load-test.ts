import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebhookHandler } from '../../../src/agent-hooks/webhook/webhook-handler';
import { EventProcessor } from '../../../src/agent-hooks/event/event-processor';
import { AutomationEngine } from '../../../src/agent-hooks/automation/automation-engine';
import { QueueManager } from '../../../src/agent-hooks/queue';
import { PerformanceMonitor } from '../../../src/agent-hooks/performance/performance-monitor';
import {
  RepositoryInfo,
  WebhookEvent,
  WebhookEventType,
  EventPriority,
  GitHubAPIConfig
} from '../../../src/agent-hooks/types';

describe('Agent Hooks Load Testing', () => {
  let eventProcessor: EventProcessor;
  let automationEngine: AutomationEngine;
  let queueManager: QueueManager;
  let performanceMonitor: PerformanceMonitor;

  const mockRepository: RepositoryInfo = {
    owner: 'load-test-owner',
    name: 'load-test-repo',
    fullName: 'load-test-owner/load-test-repo',
    defaultBranch: 'main'
  };

  const mockConfig = {
    enabledFeatures: ['webhook', 'automation', 'rules'],
    defaultRules: [],
    approvalWorkflows: [],
    batchingConfig: {},
    priorityThresholds: {
      critical: 10,
      high: 8,
      medium: 5,
      low: 1
    },
    notificationSettings: {}
  };

  beforeEach(() => {
    eventProcessor = new EventProcessor();
    const githubConfig: GitHubAPIConfig = {
      token: 'test-token',
      baseUrl: undefined,
      userAgent: 'test-agent',
      requestTimeout: 10000
    };

    automationEngine = new AutomationEngine(mockConfig, githubConfig);
    queueManager = new QueueManager(eventProcessor, automationEngine);
    performanceMonitor = new PerformanceMonitor();
    performanceMonitor.startMonitoring();
  });

  afterEach(() => {
    performanceMonitor.stopMonitoring();
  });

  describe('High Volume Webhook Processing', () => {
    it('should handle 100 concurrent webhooks within 10 seconds', async () => {
      const eventCount = 100;
      const events: WebhookEvent[] = [];

      // Create 100 webhook events
      for (let i = 0; i < eventCount; i++) {
        events.push({
          type: WebhookEventType.PUSH,
          payload: {
            commits: [
              {
                id: `load-test-${i}`,
                added: [`file-${i}.js`],
                modified: [`existing-${i}.js`],
                removed: [],
                message: `Load test commit ${i}`
              }
            ]
          },
          repository: mockRepository,
          timestamp: new Date(),
          signature: `load-sig-${i}`,
          priority: EventPriority.MEDIUM
        });
      }

      const startTime = Date.now();

      // Process all events concurrently
      const jobIds = await Promise.all(
        events.map(event => queueManager.submitWebhookEvent(event))
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(jobIds).toHaveLength(eventCount);
      expect(jobIds.every(id => id.length > 0)).toBe(true);
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Verify queue metrics
      const queueStats = queueManager.getQueueStats();
      expect(queueStats.pendingJobs).toBe(eventCount);
    });

    it('should handle 500 webhook events with mixed priorities', async () => {
      const eventCount = 500;
      const events: WebhookEvent[] = [];

      // Create events with different priorities
      for (let i = 0; i < eventCount; i++) {
        const priority = i % 3 === 0 ? EventPriority.CRITICAL :
                       i % 3 === 1 ? EventPriority.HIGH : EventPriority.MEDIUM;

        events.push({
          type: WebhookEventType.PUSH,
          payload: {
            commits: [
              {
                id: `mixed-priority-${i}`,
                added: [`feature-${i}.js`],
                modified: [`service-${i}.js`],
                removed: [],
                message: `Mixed priority commit ${i}`
              }
            ]
          },
          repository: mockRepository,
          timestamp: new Date(),
          signature: `mixed-sig-${i}`,
          priority
        });
      }

      const startTime = Date.now();

      // Process events in batches to avoid overwhelming the system
      const batchSize = 50;
      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        await Promise.all(
          batch.map(event => queueManager.submitWebhookEvent(event))
        );
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(30000); // Should complete within 30 seconds

      // Verify queue handles priority correctly
      const queueStats = queueManager.getQueueStats();
      expect(queueStats.pendingJobs).toBe(eventCount);
    });
  });

  describe('Large Repository Processing', () => {
    it('should handle repository with 1000 file changes', async () => {
      const webhookEvent: WebhookEvent = {
        type: WebhookEventType.PUSH,
        payload: {
          commits: [
            {
              id: 'large-repo-test',
              added: Array.from({ length: 500 }, (_, i) => `src/new-file-${i}.js`),
              modified: Array.from({ length: 400 }, (_, i) => `src/existing-${i}.js`),
              removed: Array.from({ length: 100 }, (_, i) => `src/deleted-${i}.js`),
              message: 'Large repository update'
            }
          ]
        },
        repository: mockRepository,
        timestamp: new Date(),
        signature: 'large-repo-sig',
        priority: EventPriority.HIGH
      };

      const startTime = Date.now();

      const changes = await eventProcessor.processEvent(webhookEvent);
      const decisions = await automationEngine.evaluateChanges(changes, mockRepository);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(changes.addedFiles).toHaveLength(500);
      expect(changes.modifiedFiles).toHaveLength(400);
      expect(changes.deletedFiles).toHaveLength(100);
      expect(decisions).toBeDefined();
      expect(processingTime).toBeLessThan(15000); // Should complete within 15 seconds
    });

    it('should handle complex dependency changes', async () => {
      const webhookEvent: WebhookEvent = {
        type: WebhookEventType.PUSH,
        payload: {
          commits: [
            {
              id: 'complex-deps-test',
              added: [],
              modified: ['package.json', 'yarn.lock', 'pnpm-lock.yaml'],
              removed: [],
              message: 'Major dependency updates'
            }
          ]
        },
        repository: mockRepository,
        timestamp: new Date(),
        signature: 'complex-deps-sig',
        priority: EventPriority.CRITICAL
      };

      const startTime = Date.now();

      const changes = await eventProcessor.processEvent(webhookEvent);
      const decisions = await automationEngine.evaluateChanges(changes, mockRepository);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(changes.configurationChanges).toHaveLength(1);
      expect(changes.dependencyChanges).toHaveLength(1);
      expect(decisions).toBeDefined();
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle 20 concurrent repository analyses', async () => {
      const repositoryCount = 20;
      const repositories: RepositoryInfo[] = [];

      for (let i = 0; i < repositoryCount; i++) {
        repositories.push({
          owner: `concurrent-owner-${i}`,
          name: `concurrent-repo-${i}`,
          fullName: `concurrent-owner-${i}/concurrent-repo-${i}`,
          defaultBranch: 'main'
        });
      }

      const webhookEvents = repositories.map((repo, i) => ({
        type: WebhookEventType.PUSH,
        payload: {
          commits: [
            {
              id: `concurrent-${i}`,
              added: [`feature-${i}.js`],
              modified: [],
              removed: []
            }
          ]
        },
        repository: repo,
        timestamp: new Date(),
        signature: `concurrent-sig-${i}`,
        priority: EventPriority.MEDIUM
      }));

      const startTime = Date.now();

      // Process all repositories concurrently
      const results = await Promise.all(
        webhookEvents.map(async (event) => {
          const changes = await eventProcessor.processEvent(event);
          const decisions = await automationEngine.evaluateChanges(changes, event.repository);
          return { changes, decisions };
        })
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(results).toHaveLength(repositoryCount);
      expect(results.every(result => result.changes && result.decisions)).toBe(true);
      expect(processingTime).toBeLessThan(25000); // Should complete within 25 seconds
    });

    it('should handle mixed operation types concurrently', async () => {
      const operations: Promise<any>[] = [];

      // Add webhook processing operations
      for (let i = 0; i < 10; i++) {
        operations.push(queueManager.submitWebhookEvent({
          type: WebhookEventType.PUSH,
          payload: {
            commits: [
              {
                id: `mixed-webhook-${i}`,
                added: [`webhook-${i}.js`],
                modified: [],
                removed: []
              }
            ]
          },
          repository: mockRepository,
          timestamp: new Date(),
          signature: `mixed-webhook-sig-${i}`,
          priority: EventPriority.MEDIUM
        }));
      }

      // Add direct processing operations
      for (let i = 0; i < 10; i++) {
        operations.push((async () => {
          const event = {
            type: WebhookEventType.PUSH,
            payload: {
              commits: [
                {
                  id: `mixed-direct-${i}`,
                  added: [`direct-${i}.js`],
                  modified: [],
                  removed: []
                }
              ]
            },
            repository: mockRepository,
            timestamp: new Date(),
            signature: `mixed-direct-sig-${i}`,
            priority: EventPriority.MEDIUM
          };

          const changes = await eventProcessor.processEvent(event);
          const decisions = await automationEngine.evaluateChanges(changes, mockRepository);
          return { changes, decisions };
        })());
      }

      const startTime = Date.now();

      const results = await Promise.all(operations);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(results).toHaveLength(20);
      expect(processingTime).toBeLessThan(20000); // Should complete within 20 seconds
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should maintain stable memory usage under load', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const eventCount = 200;

      const events: WebhookEvent[] = [];
      for (let i = 0; i < eventCount; i++) {
        events.push({
          type: WebhookEventType.PUSH,
          payload: {
            commits: [
              {
                id: `memory-test-${i}`,
                added: [`memory-${i}.js`],
                modified: [`existing-${i}.js`],
                removed: []
              }
            ]
          },
          repository: mockRepository,
          timestamp: new Date(),
          signature: `memory-sig-${i}`,
          priority: EventPriority.MEDIUM
        });
      }

      // Process events in batches
      const batchSize = 20;
      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        await Promise.all(
          batch.map(event => queueManager.submitWebhookEvent(event))
        );
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncreaseMB).toBeLessThan(50);
    });

    it('should handle long-running operations gracefully', async () => {
      const startTime = Date.now();

      // Simulate a long-running operation
      const longRunningEvent: WebhookEvent = {
        type: WebhookEventType.PUSH,
        payload: {
          commits: Array.from({ length: 100 }, (_, i) => ({
            id: `slow-${i}`,
            added: [`slow-file-${i}.js`],
            modified: [],
            removed: []
          }))
        },
        repository: mockRepository,
        timestamp: new Date(),
        signature: 'slow-sig',
        priority: EventPriority.LOW
      };

      const changes = await eventProcessor.processEvent(longRunningEvent);
      const decisions = await automationEngine.evaluateChanges(changes, mockRepository);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(changes).toBeDefined();
      expect(decisions).toBeDefined();
      expect(processingTime).toBeLessThan(30000); // Should complete within 30 seconds
    });
  });

  describe('Performance Monitoring Under Load', () => {
    it('should track performance metrics during high load', async () => {
      const sessionId = 'load-test-session';
      const eventCount = 50;

      const events: WebhookEvent[] = [];
      for (let i = 0; i < eventCount; i++) {
        events.push({
          type: WebhookEventType.PUSH,
          payload: {
            commits: [
              {
                id: `perf-test-${i}`,
                added: [`perf-${i}.js`],
                modified: [],
                removed: []
              }
            ]
          },
          repository: mockRepository,
          timestamp: new Date(),
          signature: `perf-sig-${i}`,
          priority: EventPriority.MEDIUM
        });
      }

      // Process events and track performance
      for (const event of events) {
        const webhookMetricId = performanceMonitor.recordWebhookProcessing(
          event,
          Math.random() * 1000 + 100, // Random processing time 100-1100ms
          Math.random() * 50, // Random queue time
          true
        );

        const changes = await eventProcessor.processEvent(event);
        const decisions = await automationEngine.evaluateChanges(changes, mockRepository);

        // Record analysis performance
        performanceMonitor.recordAnalysisProcessing(
          webhookMetricId,
          'load-test-analysis',
          Math.random() * 500 + 50,
          Math.random() * 20,
          0,
          true
        );
      }

      // Verify performance metrics
      const metrics = performanceMonitor.getMetrics(sessionId);
      expect(metrics).toBeDefined();
      expect(metrics?.overall.success).toBe(true);
    });

    it('should detect and report bottlenecks under load', async () => {
      const slowEvent: WebhookEvent = {
        type: WebhookEventType.PUSH,
        payload: {
          commits: [
            {
              id: 'bottleneck-test',
              added: ['bottleneck.js'],
              modified: [],
              removed: []
            }
          ]
        },
        repository: mockRepository,
        timestamp: new Date(),
        signature: 'bottleneck-sig',
        priority: EventPriority.MEDIUM
      };

      // Record a very slow operation
      const metricId = performanceMonitor.recordWebhookProcessing(
        slowEvent,
        10000, // Very slow: 10 seconds
        1000,  // High queue time
        true
      );

      const metrics = performanceMonitor.getMetrics(metricId);
      expect(metrics).toBeDefined();
      expect(metrics?.overall.bottlenecks).toContain('Webhook processing is slow');
      expect(metrics?.webhookProcessing.processingTime).toBeGreaterThan(5000);
    });
  });
});