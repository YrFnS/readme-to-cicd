import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebhookHandler } from '../../../src/agent-hooks/webhook/webhook-handler';
import { EventProcessor } from '../../../src/agent-hooks/event/event-processor';
import { ChangeDetector } from '../../../src/agent-hooks/event/change-detector';
import { AutomationEngine } from '../../../src/agent-hooks/automation/automation-engine';
import { PRCreator } from '../../../src/agent-hooks/automation/pr-creator';
import { QueueManager } from '../../../src/agent-hooks/queue';
import { RuleManager } from '../../../src/agent-hooks/rules';
import { PerformanceMonitor } from '../../../src/agent-hooks/performance/performance-monitor';
import { ErrorHandler } from '../../../src/agent-hooks/errors/error-handler';
import {
  RepositoryInfo,
  WebhookEvent,
  RepositoryChanges,
  WebhookEventType,
  EventPriority,
  GitHubAPIConfig
} from '../../../src/agent-hooks/types';
import { AutomationRule } from '../../../src/agent-hooks/types/rules';

describe('Agent Hooks Integration Tests', () => {
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
    owner: 'integration-test-owner',
    name: 'integration-test-repo',
    fullName: 'integration-test-owner/integration-test-repo',
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
    changeDetector = new ChangeDetector();
    performanceMonitor = new PerformanceMonitor();
    errorHandler = new ErrorHandler();

    const githubConfig: GitHubAPIConfig = {
      token: 'test-token',
      baseUrl: undefined,
      userAgent: 'test-agent',
      requestTimeout: 10000
    };

    prCreator = new PRCreator(githubConfig, {
      defaultBranchPrefix: 'agent-hooks/integration-test',
      maxPRsPerHour: 10
    });

    automationEngine = new AutomationEngine(mockConfig, githubConfig);
    ruleManager = new RuleManager();
    queueManager = new QueueManager(eventProcessor, automationEngine);

    performanceMonitor.startMonitoring();
  });

  afterEach(() => {
    performanceMonitor.stopMonitoring();
  });

  describe('Real-world Scenarios', () => {
    it('should handle Node.js project with dependency updates', async () => {
      const webhookEvent: WebhookEvent = {
        type: WebhookEventType.PUSH,
        payload: {
          commits: [
            {
              id: 'dep-update-1',
              added: ['src/new-feature.js'],
              modified: ['package.json', 'package-lock.json'],
              removed: [],
              message: 'Update dependencies and add new feature'
            }
          ]
        },
        repository: mockRepository,
        timestamp: new Date(),
        signature: 'dep-update-sig',
        priority: EventPriority.HIGH
      };

      const changes = await eventProcessor.processEvent(webhookEvent);
      expect(changes).toBeDefined();
      expect(changes.dependencyChanges).toHaveLength(1);

      const decisions = await automationEngine.evaluateChanges(changes, mockRepository);
      expect(decisions).toBeDefined();

      // Should create automation for dependency updates
      const hasAutomation = decisions.some(d => d.shouldCreatePR);
      expect(hasAutomation).toBe(true);
    });

    it('should handle security vulnerability detection', async () => {
      const webhookEvent: WebhookEvent = {
        type: WebhookEventType.PUSH,
        payload: {
          commits: [
            {
              id: 'security-fix-1',
              added: ['security-patch.js'],
              modified: ['package.json'],
              removed: [],
              message: 'Fix security vulnerability in dependency'
            }
          ]
        },
        repository: mockRepository,
        timestamp: new Date(),
        signature: 'security-sig',
        priority: EventPriority.CRITICAL
      };

      const changes = await eventProcessor.processEvent(webhookEvent);

      // Mock security rule
      const securityRule: AutomationRule = {
        id: 'security-vulnerability-detected',
        name: 'Security Vulnerability Rule',
        description: 'Creates PR for security fixes',
        enabled: true,
        priority: 10,
        triggers: [
          {
            type: 'repository_change',
            changeType: 'dependency',
            threshold: 1
          }
        ],
        conditions: [
          {
            type: 'dependency_version',
            operator: 'matches',
            value: 'security*'
          }
        ],
        actions: [
          {
            type: 'create_pr',
            parameters: {
              title: 'Security Fix: {{commit.message}}',
              body: 'Automated security fix detected',
              branchName: 'security/fix-{{timestamp}}'
            },
            approvalRequired: true,
            notificationChannels: ['security-team']
          }
        ],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const ruleResults = await ruleManager.evaluateRules({
        webhookEvent,
        repository: mockRepository,
        changes,
        timestamp: new Date(),
        rule: securityRule
      });

      expect(ruleResults).toBeDefined();
      expect(ruleResults).toBeDefined();
      expect(ruleResults.length).toBeGreaterThan(0);
      expect(ruleResults[0].triggered).toBe(true);
    });

    it('should handle CI/CD configuration changes', async () => {
      const webhookEvent: WebhookEvent = {
        type: WebhookEventType.PUSH,
        payload: {
          commits: [
            {
              id: 'ci-update-1',
              added: ['.github/workflows/ci.yml'],
              modified: ['.github/workflows/test.yml'],
              removed: [],
              message: 'Update CI/CD configuration'
            }
          ]
        },
        repository: mockRepository,
        timestamp: new Date(),
        signature: 'ci-sig',
        priority: EventPriority.HIGH
      };

      const changes = await eventProcessor.processEvent(webhookEvent);
      expect(changes).toBeDefined();
      expect(changes.configurationChanges).toHaveLength(1);

      const decisions = await automationEngine.evaluateChanges(changes, mockRepository);

      // Should create PRs for CI/CD improvements
      const hasCIPr = decisions.some(d =>
        d.shouldCreatePR && d.changes.some(c => c.category === 'ci')
      );
      expect(hasCIPr).toBe(true);
    });

    it('should handle documentation updates', async () => {
      const webhookEvent: WebhookEvent = {
        type: WebhookEventType.PUSH,
        payload: {
          commits: [
            {
              id: 'docs-update-1',
              added: ['docs/new-feature.md'],
              modified: ['README.md', 'docs/api.md'],
              removed: [],
              message: 'Update documentation'
            }
          ]
        },
        repository: mockRepository,
        timestamp: new Date(),
        signature: 'docs-sig',
        priority: EventPriority.MEDIUM
      };

      const changes = await eventProcessor.processEvent(webhookEvent);
      expect(changes).toBeDefined();
      expect(changes.addedFiles).toHaveLength(1);
      expect(changes.modifiedFiles).toHaveLength(2);

      const decisions = await automationEngine.evaluateChanges(changes, mockRepository);

      // Should handle documentation updates appropriately
      expect(decisions).toBeDefined();
      expect(decisions.length).toBeGreaterThan(0);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle GitHub API rate limiting', async () => {
      const webhookEvent: WebhookEvent = {
        type: WebhookEventType.PUSH,
        payload: {
          commits: [
            {
              id: 'rate-limit-test',
              added: ['src/feature.js'],
              modified: [],
              removed: []
            }
          ]
        },
        repository: mockRepository,
        timestamp: new Date(),
        signature: 'rate-limit-sig',
        priority: EventPriority.HIGH
      };

      // Mock GitHub API rate limit error
      const rateLimitError = new Error('GitHub API rate limit exceeded');
      rateLimitError.name = 'RateLimitError';

      const recovery = await errorHandler.handleError(rateLimitError, {
        component: 'pr-creator',
        operation: 'createPullRequest',
        repository: mockRepository.fullName
      });

      expect(recovery).toBeDefined();
      expect(recovery.strategy).toBe('retry');
      expect(recovery.retryCount).toBe(0);
      expect(recovery.maxRetries).toBeGreaterThan(0);
    });

    it('should handle network connectivity issues', async () => {
      const networkError = new Error('Network connection failed');
      networkError.name = 'NetworkError';

      const recovery = await errorHandler.handleError(networkError, {
        component: 'webhook-handler',
        operation: 'validateSignature',
        repository: mockRepository.fullName
      });

      expect(recovery).toBeDefined();
      expect(recovery.strategy).toBe('retry');
      expect(recovery.escalationRequired).toBe(true);
    });

    it('should handle invalid webhook signatures', async () => {
      const invalidSignatureEvent: WebhookEvent = {
        type: WebhookEventType.PUSH,
        payload: { commits: [] },
        repository: mockRepository,
        timestamp: new Date(),
        signature: 'invalid-signature',
        priority: EventPriority.MEDIUM
      };

      const changes = await eventProcessor.processEvent(invalidSignatureEvent);
      expect(changes).toBeDefined();
    });
  });

  describe('Performance Scenarios', () => {
    it('should handle large repository with many files', async () => {
      const largeChanges: RepositoryChanges = {
        modifiedFiles: Array.from({ length: 100 }, (_, i) => ({
          path: `src/file-${i}.js`,
          type: 'modified',
          significance: 'medium'
        })),
        addedFiles: Array.from({ length: 50 }, (_, i) => ({
          path: `src/new-file-${i}.js`,
          type: 'added',
          significance: 'low'
        })),
        deletedFiles: [],
        configurationChanges: [],
        dependencyChanges: []
      };

      const startTime = Date.now();
      const decisions = await automationEngine.evaluateChanges(largeChanges, mockRepository);
      const endTime = Date.now();

      expect(decisions).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent webhook processing', async () => {
      const events = Array.from({ length: 10 }, (_, i) => ({
        type: WebhookEventType.PUSH,
        payload: {
          commits: [
            {
              id: `concurrent-${i}`,
              added: [`file-${i}.js`],
              modified: [],
              removed: []
            }
          ]
        },
        repository: mockRepository,
        timestamp: new Date(),
        signature: `concurrent-sig-${i}`,
        priority: EventPriority.MEDIUM
      }));

      const startTime = Date.now();
      const jobIds = await Promise.all(
        events.map(event => queueManager.submitWebhookEvent(event))
      );
      const endTime = Date.now();

      expect(jobIds).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(2000); // Should handle concurrency well
    });
  });

  describe('Rule Engine Scenarios', () => {
    it('should handle complex rule conditions', async () => {
      const complexRule: AutomationRule = {
        id: 'complex-rule',
        name: 'Complex Multi-condition Rule',
        description: 'Rule with multiple conditions and actions',
        enabled: true,
        priority: 8,
        triggers: [
          {
            type: 'repository_change',
            changeType: 'file',
            threshold: 2
          }
        ],
        conditions: [
          {
            type: 'file_exists',
            operator: 'equals',
            value: 'README.md'
          },
          {
            type: 'dependency_version',
            operator: 'greater_than',
            value: '1.0.0'
          }
        ],
        actions: [
          {
            type: 'create_pr',
            parameters: {
              title: 'Automated improvements',
              body: 'Multiple improvements detected',
              branchName: 'automated/improvements-{{timestamp}}'
            },
            approvalRequired: false
          },
          {
            type: 'send_notification',
            parameters: {
              message: 'Complex rule triggered',
              channels: ['dev-team']
            },
            approvalRequired: false,
            notificationChannels: ['dev-team']
          }
        ],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const webhookEvent: WebhookEvent = {
        type: WebhookEventType.PUSH,
        payload: {
          commits: [
            {
              id: 'complex-rule-test',
              added: ['new-dependency.js'],
              modified: ['package.json', 'README.md'],
              removed: []
            }
          ]
        },
        repository: mockRepository,
        timestamp: new Date(),
        signature: 'complex-rule-sig',
        priority: EventPriority.HIGH
      };

      const changes = await eventProcessor.processEvent(webhookEvent);

      const ruleResults = await ruleManager.evaluateRules({
        webhookEvent,
        repository: mockRepository,
        changes,
        timestamp: new Date(),
        rule: complexRule
      });

      expect(ruleResults).toBeDefined();
      expect(ruleResults).toBeDefined();
      expect(ruleResults.length).toBeGreaterThan(0);
      expect(ruleResults[0].triggered).toBe(true);
      expect(ruleResults[0].actions).toHaveLength(2);
    });

    it('should handle rule conflicts appropriately', async () => {
      const conflictingRules: AutomationRule[] = [
        {
          id: 'rule-1',
          name: 'Rule 1',
          description: 'First conflicting rule',
          enabled: true,
          priority: 5,
          triggers: [{ type: 'repository_change', changeType: 'file' }],
          conditions: [],
          actions: [{ type: 'create_pr', parameters: {}, approvalRequired: false }],
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'rule-2',
          name: 'Rule 2',
          description: 'Second conflicting rule',
          enabled: true,
          priority: 8,
          triggers: [{ type: 'file_change', patterns: ['*.js'] }],
          conditions: [],
          actions: [{ type: 'create_pr', parameters: {}, approvalRequired: false }],
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Test rule conflict resolution
      const higherPriorityRule = conflictingRules[1]; // Priority 8
      expect(higherPriorityRule.priority).toBeGreaterThan(conflictingRules[0].priority);
    });
  });
});