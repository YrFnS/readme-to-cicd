import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebhookHandler } from '../../../src/agent-hooks/webhook/webhook-handler';
import { EventProcessor } from '../../../src/agent-hooks/event/event-processor';
import { ChangeDetector } from '../../../src/agent-hooks/event/change-detector';
import { AutomationEngine } from '../../../src/agent-hooks/automation/automation-engine';
import { PRCreator } from '../../../src/agent-hooks/automation/pr-creator';
import { AnalysisQueue, QueueManager } from '../../../src/agent-hooks/queue';
import { RuleEngine, RuleManager } from '../../../src/agent-hooks/rules';
import { PerformanceMonitor } from '../../../src/agent-hooks/performance/performance-monitor';
import { ErrorHandler } from '../../../src/agent-hooks/errors/error-handler';
import {
  RepositoryInfo,
  WebhookEvent,
  RepositoryChanges,
  AutomationDecision,
  WebhookEventType,
  EventPriority,
  GitHubAPIConfig
} from '../../../src/agent-hooks/types';
import { AutomationRule } from '../../../src/agent-hooks/types/rules';

describe('Agent Hooks End-to-End Integration', () => {
  let webhookHandler: WebhookHandler;
  let eventProcessor: EventProcessor;
  let changeDetector: ChangeDetector;
  let automationEngine: AutomationEngine;
  let prCreator: PRCreator;
  let queueManager: QueueManager;
  let ruleManager: RuleManager;
  let performanceMonitor: PerformanceMonitor;
  let errorHandler: ErrorHandler;

  const mockRepository: RepositoryInfo = {
    owner: 'test-owner',
    name: 'test-repo',
    fullName: 'test-owner/test-repo',
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
    // Initialize all components
    eventProcessor = new EventProcessor();
    changeDetector = new ChangeDetector();
    performanceMonitor = new PerformanceMonitor();
    errorHandler = new ErrorHandler();

    // Initialize with GitHub config
    const githubConfig: GitHubAPIConfig = {
      token: 'test-token',
      baseUrl: undefined,
      userAgent: 'test-agent',
      requestTimeout: 10000
    };

    prCreator = new PRCreator(githubConfig, {
      defaultBranchPrefix: 'agent-hooks/test',
      maxPRsPerHour: 10
    });

    automationEngine = new AutomationEngine(mockConfig, githubConfig);
    ruleManager = new RuleManager();
    queueManager = new QueueManager(eventProcessor, automationEngine);

    // Start monitoring
    performanceMonitor.startMonitoring();
  });

  afterEach(() => {
    performanceMonitor.stopMonitoring();
  });

  describe('Complete Automation Workflow', () => {
    it('should process webhook event through entire pipeline', async () => {
      // Mock webhook event
      const webhookEvent: WebhookEvent = {
        type: WebhookEventType.PUSH,
        payload: {
          commits: [
            {
              id: 'abc123',
              added: ['src/new-feature.js'],
              modified: ['README.md'],
              removed: [],
              message: 'Add new feature and update documentation'
            }
          ]
        },
        repository: mockRepository,
        timestamp: new Date(),
        signature: 'test-signature',
        priority: EventPriority.MEDIUM
      };

      // Step 1: Process webhook event
      const changes = await eventProcessor.processEvent(webhookEvent);
      expect(changes).toBeDefined();
      expect(changes.addedFiles).toHaveLength(1);
      expect(changes.modifiedFiles).toHaveLength(1);

      // Step 2: Evaluate automation decisions
      const decisions = await automationEngine.evaluateChanges(changes, mockRepository);
      expect(decisions).toBeDefined();
      expect(decisions.length).toBeGreaterThan(0);

      // Step 3: Create PRs for decisions
      const prResults = await automationEngine.createPRsForDecisions(decisions, mockRepository);
      expect(prResults).toBeDefined();

      // Step 4: Process through rules engine
      const mockRule: AutomationRule = {
        id: 'test-rule',
        name: 'Test Rule',
        description: 'Test automation rule',
        enabled: true,
        priority: 1,
        triggers: [],
        conditions: [],
        actions: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const ruleResults = await ruleManager.evaluateRules({
        webhookEvent,
        repository: mockRepository,
        changes,
        timestamp: new Date(),
        rule: mockRule
      });
      expect(ruleResults).toBeDefined();

      // Step 5: Monitor performance
      const metricId = performanceMonitor.recordWebhookProcessing(
        webhookEvent,
        150,
        50,
        true
      );
      expect(metricId).toBeDefined();

      const metrics = performanceMonitor.getMetrics(metricId);
      expect(metrics).toBeDefined();
      expect(metrics?.webhookProcessing.success).toBe(true);
    });

    it('should handle error scenarios gracefully', async () => {
      // Create a scenario that will cause an error
      const invalidEvent: WebhookEvent = {
        type: WebhookEventType.PUSH,
        payload: {},
        repository: mockRepository,
        timestamp: new Date(),
        signature: 'test-signature',
        priority: EventPriority.MEDIUM
      };

      // Process with error handling
      const recovery = await errorHandler.handleError(
        new Error('Test processing error'),
        {
          component: 'event-processor',
          operation: 'processEvent',
          repository: mockRepository.fullName
        }
      );

      expect(recovery).toBeDefined();
      expect(recovery.strategy).toBeDefined();
      expect(recovery.retryCount).toBe(0);
    });

    it('should handle high-volume webhook processing', async () => {
      const events: WebhookEvent[] = [];

      // Create multiple webhook events
      for (let i = 0; i < 5; i++) {
        events.push({
          type: WebhookEventType.PUSH,
          payload: {
            commits: [
              {
                id: `commit-${i}`,
                added: [`file-${i}.js`],
                modified: [],
                removed: []
              }
            ]
          },
          repository: mockRepository,
          timestamp: new Date(),
          signature: `signature-${i}`,
          priority: EventPriority.MEDIUM
        });
      }

      // Process all events through queue manager
      const jobIds = await Promise.all(
        events.map(event => queueManager.submitWebhookEvent(event))
      );

      expect(jobIds).toHaveLength(5);
      expect(jobIds.every(id => id.length > 0)).toBe(true);

      // Check queue status
      const queueStats = queueManager.getQueueStats();
      expect(queueStats.pendingJobs).toBe(5);
    });

    it('should integrate all components successfully', async () => {
      // Test complete integration
      const webhookEvent: WebhookEvent = {
        type: WebhookEventType.PUSH,
        payload: {
          commits: [
            {
              id: 'integration-test',
              added: ['src/app.js'],
              modified: ['package.json'],
              removed: []
            }
          ]
        },
        repository: mockRepository,
        timestamp: new Date(),
        signature: 'integration-test-signature',
        priority: EventPriority.MEDIUM
      };

      // Process through event processor
      const changes = await eventProcessor.processEvent(webhookEvent);

      // Evaluate with automation engine
      const decisions = await automationEngine.evaluateChanges(changes, mockRepository);

      // Check if any decisions should create PRs
      const prDecisions = decisions.filter(d => d.shouldCreatePR);

      if (prDecisions.length > 0) {
        // Create PRs
        const prResults = await automationEngine.createPRsForDecisions(prDecisions, mockRepository);
        expect(prResults).toBeDefined();

        // Monitor PR creation performance
        prResults.forEach(result => {
          const metricId = performanceMonitor.recordPRCreation(
            'test-session',
            2000,
            result.success ? 1 : 0,
            0,
            1,
            result.success
          );
          expect(metricId).toBeDefined();
        });
      }

      // Verify system is still operational
      const metrics = performanceMonitor.getMetrics('test-session');
      expect(metrics).toBeDefined();
    });
  });

  describe('Error Recovery Integration', () => {
    it('should handle and recover from processing errors', async () => {
      // Simulate an error in the system
      const testError = new Error('Simulated processing failure');

      const recovery = await errorHandler.handleError(testError, {
        component: 'test-component',
        operation: 'test-operation',
        repository: mockRepository.fullName
      });

      expect(recovery).toBeDefined();
      expect(recovery.strategy).toBe('retry');
      expect(recovery.maxRetries).toBeGreaterThan(0);
    });

    it('should escalate critical errors appropriately', async () => {
      // Simulate a critical security error
      const criticalError = new Error('Security vulnerability detected');

      const recovery = await errorHandler.handleError(criticalError, {
        component: 'security-scanner',
        operation: 'scan',
        repository: mockRepository.fullName
      });

      expect(recovery).toBeDefined();
      expect(recovery.escalationRequired).toBe(true);
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should monitor complete workflow performance', async () => {
      const startTime = Date.now();

      // Simulate a complete workflow
      const webhookEvent: WebhookEvent = {
        type: WebhookEventType.PUSH,
        payload: { commits: [] },
        repository: mockRepository,
        timestamp: new Date(),
        signature: 'perf-test',
        priority: EventPriority.MEDIUM
      };

      // Record webhook processing
      const webhookMetricId = performanceMonitor.recordWebhookProcessing(
        webhookEvent,
        100,
        20,
        true
      );

      // Record analysis processing
      performanceMonitor.recordAnalysisProcessing(
        webhookMetricId,
        'readme-analysis',
        500,
        50,
        0,
        true
      );

      // Record automation processing
      const mockDecisions: AutomationDecision[] = [
        {
          shouldCreatePR: true,
          changes: [],
          priority: 'medium',
          rationale: 'Test automation',
          performanceImpact: {
            estimatedTimeSavings: 5,
            costReduction: 2.5,
            confidence: 0.8,
            rationale: 'Test impact'
          }
        }
      ];

      performanceMonitor.recordAutomationProcessing(
        webhookMetricId,
        200,
        mockDecisions,
        5,
        true
      );

      // Record PR creation
      performanceMonitor.recordPRCreation(
        webhookMetricId,
        1500,
        1,
        1,
        2,
        true
      );

      // Verify metrics
      const metrics = performanceMonitor.getMetrics(webhookMetricId);
      expect(metrics).toBeDefined();
      expect(metrics?.overall.performanceScore).toBeGreaterThan(0);
      expect(metrics?.overall.success).toBe(true);
    });

    it('should detect performance bottlenecks', async () => {
      const metricId = performanceMonitor.recordWebhookProcessing(
        {
          type: WebhookEventType.PUSH,
          payload: {},
          repository: mockRepository,
          timestamp: new Date(),
          signature: 'slow-test',
          priority: EventPriority.MEDIUM
        },
        8000, // Very slow processing
        50,
        true
      );

      const metrics = performanceMonitor.getMetrics(metricId);
      expect(metrics?.overall.bottlenecks).toContain('Webhook processing is slow');
    });
  });

  describe('Rules Engine Integration', () => {
    it('should process events through rules engine', async () => {
      const webhookEvent: WebhookEvent = {
        type: WebhookEventType.PUSH,
        payload: {
          commits: [
            {
              id: 'rule-test',
              added: ['security.md'],
              modified: [],
              removed: []
            }
          ]
        },
        repository: mockRepository,
        timestamp: new Date(),
        signature: 'rule-test',
        priority: EventPriority.MEDIUM
      };

      const mockRule: AutomationRule = {
        id: 'security-rule',
        name: 'Security Rule',
        description: 'Test security rule',
        enabled: true,
        priority: 1,
        triggers: [],
        conditions: [],
        actions: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const context = {
        webhookEvent,
        repository: mockRepository,
        timestamp: new Date(),
        rule: mockRule
      };

      const results = await ruleManager.evaluateRules(context);
      expect(results).toBeDefined();

      // Verify rule execution was tracked
      const metrics = ruleManager.getRuleMetrics('security-vulnerability-detected');
      expect(metrics).toBeDefined();
    });
  });

  describe('Queue System Integration', () => {
    it('should handle job processing through queue manager', async () => {
      const webhookEvent: WebhookEvent = {
        type: WebhookEventType.PUSH,
        payload: { commits: [] },
        repository: mockRepository,
        timestamp: new Date(),
        signature: 'queue-test',
        priority: EventPriority.MEDIUM
      };

      // Submit job
      const jobId = await queueManager.submitWebhookEvent(webhookEvent);
      expect(jobId).toBeDefined();

      // Check queue status
      const stats = queueManager.getQueueStats();
      expect(stats.pendingJobs).toBe(1);

      // Process jobs
      await queueManager.processPendingJobs();

      // Verify job was processed
      const finalStats = queueManager.getQueueStats();
      expect(finalStats.pendingJobs).toBe(0);
    });
  });
});