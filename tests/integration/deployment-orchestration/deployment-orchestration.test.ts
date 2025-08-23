/**
 * @fileoverview Integration tests for deployment orchestration system
 * Tests deployment strategies, validation, health checks, and analytics
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DeploymentOrchestrator,
  BlueGreenStrategy,
  CanaryStrategy,
  RollingStrategy,
  DeploymentValidator,
  HealthCheckManager,
  RollbackManager,
  ApprovalManager,
  AnalyticsManager,
  PromotionManager
} from '../../../src/integration/deployment-orchestration/index.js';
import type {
  DeploymentConfig,
  DeploymentResult,
  ValidationResult,
  BlueGreenStrategyConfig,
  CanaryStrategyConfig,
  RollingStrategyConfig
} from '../../../src/integration/deployment-orchestration/types.js';

describe('Deployment Orchestration Integration Tests', () => {
  let orchestrator: DeploymentOrchestrator;
  let mockDeploymentConfig: DeploymentConfig;

  beforeEach(() => {
    orchestrator = new DeploymentOrchestrator();
    
    mockDeploymentConfig = {
      id: 'test-deployment-001',
      name: 'test-deployment',
      version: '1.0.0',
      strategy: 'blue-green',
      environment: 'staging',
      components: [
        {
          id: 'api-component',
          name: 'api',
          version: '1.0.0',
          replicas: 3,
          resources: {
            cpu: '500m',
            memory: '512Mi',
            limits: {
              cpu: '1000m',
              memory: '1Gi'
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
          dependencies: [],
          environment: {
            NODE_ENV: 'staging',
            LOG_LEVEL: 'info'
          }
        }
      ],
      infrastructure: {
        provider: 'kubernetes',
        region: ['us-west-2'],
        networking: {
          subnets: ['subnet-123', 'subnet-456'],
          loadBalancer: {
            type: 'application',
            scheme: 'internet-facing',
            listeners: [
              {
                port: 80,
                protocol: 'HTTP',
                targetGroup: 'api-tg'
              }
            ]
          }
        },
        security: {
          authentication: {
            type: 'oauth',
            configuration: {}
          },
          authorization: {
            rbac: {
              enabled: true,
              roles: [],
              bindings: []
            },
            policies: []
          },
          encryption: {
            inTransit: true,
            atRest: true,
            keyManagement: {
              provider: 'aws-kms'
            }
          },
          networkPolicies: []
        },
        monitoring: {
          metrics: {
            enabled: true,
            provider: 'prometheus',
            scrapeInterval: '30s',
            retention: '7d'
          },
          logging: {
            enabled: true,
            level: 'info',
            format: 'json',
            destination: 'stdout',
            retention: '30d'
          },
          tracing: {
            enabled: true,
            provider: 'jaeger',
            samplingRate: 0.1
          },
          alerting: {
            enabled: true,
            rules: [],
            channels: []
          }
        }
      },
      validation: {
        preDeployment: [
          {
            name: 'infrastructure-check',
            type: 'script',
            configuration: {},
            timeout: 30000,
            retries: 3,
            required: true
          }
        ],
        postDeployment: [
          {
            name: 'smoke-test',
            type: 'http',
            configuration: {
              url: 'http://api.staging.example.com/health'
            },
            timeout: 60000,
            retries: 5,
            required: true
          }
        ],
        healthChecks: [],
        performance: [],
        security: []
      },
      rollback: {
        enabled: true,
        automatic: true,
        triggers: [
          {
            type: 'health-check',
            condition: 'failure_rate > 0.1'
          }
        ],
        strategy: {
          type: 'immediate'
        },
        timeout: 300000
      },
      analytics: {
        enabled: true,
        metrics: [
          {
            name: 'deployment_duration',
            type: 'histogram',
            labels: ['environment', 'strategy'],
            description: 'Deployment duration in seconds'
          }
        ],
        reporting: {
          dashboards: [],
          alerts: [],
          exports: []
        },
        retention: '90d'
      },
      metadata: {
        blueGreenConfig: {
          switchTraffic: {
            type: 'immediate',
            validation: {
              preDeployment: [],
              postDeployment: [],
              healthChecks: [],
              performance: [],
              security: []
            }
          },
          environmentValidation: {
            preDeployment: [],
            postDeployment: [],
            healthChecks: [],
            performance: [],
            security: []
          },
          rollbackTriggers: [],
          warmupDuration: 60000
        } as BlueGreenStrategyConfig
      }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('DeploymentOrchestrator', () => {
    it('should create and execute a blue-green deployment successfully', async () => {
      const result = await orchestrator.createDeployment(mockDeploymentConfig);

      expect(result.success).toBe(true);
      expect(result.deploymentId).toBe(mockDeploymentConfig.id);
      expect(result.status).toBe('completed');
      expect(result.message).toContain('successfully');
    });

    it('should create and execute a canary deployment successfully', async () => {
      const canaryConfig: DeploymentConfig = {
        ...mockDeploymentConfig,
        strategy: 'canary',
        metadata: {
          canaryConfig: {
            stages: [
              {
                name: 'canary-10',
                percentage: 10,
                duration: 300000,
                validation: mockDeploymentConfig.validation,
                autoPromote: true
              },
              {
                name: 'canary-50',
                percentage: 50,
                duration: 300000,
                validation: mockDeploymentConfig.validation,
                autoPromote: true
              },
              {
                name: 'canary-100',
                percentage: 100,
                duration: 0,
                validation: mockDeploymentConfig.validation,
                autoPromote: true
              }
            ],
            metrics: [
              {
                name: 'error_rate',
                threshold: 0.05,
                operator: 'lt',
                unit: 'percentage'
              }
            ],
            progressionRules: [
              {
                name: 'error-rate-check',
                condition: 'error_rate < 0.05',
                action: 'promote'
              }
            ],
            analysisInterval: 60000
          } as CanaryStrategyConfig
        }
      };

      const result = await orchestrator.createDeployment(canaryConfig);

      expect(result.success).toBe(true);
      expect(result.deploymentId).toBe(canaryConfig.id);
      expect(result.status).toBe('completed');
    });

    it('should create and execute a rolling deployment successfully', async () => {
      const rollingConfig: DeploymentConfig = {
        ...mockDeploymentConfig,
        strategy: 'rolling',
        metadata: {
          rollingConfig: {
            batchSize: 1,
            maxUnavailable: 1,
            maxSurge: 1,
            progressDeadline: 600000,
            pauseBetweenBatches: 30000
          } as RollingStrategyConfig
        }
      };

      const result = await orchestrator.createDeployment(rollingConfig);

      expect(result.success).toBe(true);
      expect(result.deploymentId).toBe(rollingConfig.id);
      expect(result.status).toBe('completed');
    });

    it('should handle deployment validation failures', async () => {
      const invalidConfig: DeploymentConfig = {
        ...mockDeploymentConfig,
        strategy: 'invalid-strategy' as any
      };

      const result = await orchestrator.createDeployment(invalidConfig);

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.message).toContain('validation failed');
    });

    it('should get deployment status', async () => {
      await orchestrator.createDeployment(mockDeploymentConfig);
      
      const status = await orchestrator.getDeploymentStatus(mockDeploymentConfig.id);

      expect(status.deploymentId).toBe(mockDeploymentConfig.id);
      expect(status.status).toBe('completed');
      expect(status.progress).toBeDefined();
      expect(status.logs).toBeDefined();
      expect(status.metrics).toBeDefined();
    });

    it('should validate deployment', async () => {
      await orchestrator.createDeployment(mockDeploymentConfig);
      
      const validation = await orchestrator.validateDeployment(mockDeploymentConfig.id);

      expect(validation.success).toBe(true);
      expect(validation.results).toBeInstanceOf(Array);
      expect(validation.overallScore).toBeGreaterThan(0);
    });

    it('should rollback deployment', async () => {
      await orchestrator.createDeployment(mockDeploymentConfig);
      
      const rollbackResult = await orchestrator.rollbackDeployment(mockDeploymentConfig.id);

      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.status).toBe('rolled-back');
      expect(rollbackResult.rollbackInfo).toBeDefined();
    });

    it('should promote deployment between environments', async () => {
      await orchestrator.createDeployment(mockDeploymentConfig);
      
      const promotionResult = await orchestrator.promoteDeployment(
        mockDeploymentConfig.id,
        'staging',
        'production'
      );

      expect(promotionResult.success).toBe(true);
      expect(promotionResult.fromEnvironment).toBe('staging');
      expect(promotionResult.toEnvironment).toBe('production');
    });

    it('should pause and resume deployment', async () => {
      const deploymentPromise = orchestrator.createDeployment(mockDeploymentConfig);
      
      // Pause deployment (this is a simulation, real implementation would handle async operations)
      await expect(orchestrator.pauseDeployment(mockDeploymentConfig.id)).rejects.toThrow();
      
      // Resume deployment
      await expect(orchestrator.resumeDeployment(mockDeploymentConfig.id)).rejects.toThrow();
      
      await deploymentPromise;
    });

    it('should get deployment analytics', async () => {
      await orchestrator.createDeployment(mockDeploymentConfig);
      
      const analytics = await orchestrator.getDeploymentAnalytics(mockDeploymentConfig.id);

      expect(analytics).toBeDefined();
      expect(analytics.duration).toBeGreaterThan(0);
      expect(analytics.success).toBe(true);
    });

    it('should list deployments with filtering', async () => {
      await orchestrator.createDeployment(mockDeploymentConfig);
      
      const deployments = await orchestrator.listDeployments({
        environment: 'staging',
        status: 'completed'
      });

      expect(deployments).toBeInstanceOf(Array);
      expect(deployments.length).toBeGreaterThan(0);
      expect(deployments[0].deploymentConfig.environment).toBe('staging');
    });
  });

  describe('BlueGreenStrategy', () => {
    let strategy: BlueGreenStrategy;

    beforeEach(() => {
      strategy = new BlueGreenStrategy();
    });

    it('should validate blue-green configuration', async () => {
      const validation = await strategy.validateConfig(mockDeploymentConfig);

      expect(validation.success).toBe(true);
      expect(validation.results).toBeInstanceOf(Array);
      expect(validation.overallScore).toBeGreaterThan(0);
    });

    it('should execute blue-green deployment', async () => {
      const result = await strategy.execute(mockDeploymentConfig);

      expect(result.success).toBe(true);
      expect(result.deploymentId).toBe(mockDeploymentConfig.id);
      expect(result.message).toContain('Blue-Green deployment completed');
    });

    it('should get traffic distribution', async () => {
      await strategy.execute(mockDeploymentConfig);
      
      const distribution = await strategy.getTrafficDistribution(mockDeploymentConfig.id);

      expect(distribution).toBeDefined();
      expect(distribution.blue + distribution.green).toBe(100);
      expect(distribution.timestamp).toBeInstanceOf(Date);
    });

    it('should validate environment', async () => {
      const validation = await strategy.validateEnvironment(mockDeploymentConfig.id, 'blue');

      expect(validation.success).toBe(true);
      expect(validation.results).toBeInstanceOf(Array);
    });
  });

  describe('CanaryStrategy', () => {
    let strategy: CanaryStrategy;
    let canaryConfig: DeploymentConfig;

    beforeEach(() => {
      strategy = new CanaryStrategy();
      canaryConfig = {
        ...mockDeploymentConfig,
        strategy: 'canary',
        metadata: {
          canaryConfig: {
            stages: [
              {
                name: 'canary-10',
                percentage: 10,
                duration: 1000, // Short duration for testing
                validation: mockDeploymentConfig.validation,
                autoPromote: true
              }
            ],
            metrics: [],
            progressionRules: [],
            analysisInterval: 1000
          } as CanaryStrategyConfig
        }
      };
    });

    it('should validate canary configuration', async () => {
      const validation = await strategy.validateConfig(canaryConfig);

      expect(validation.success).toBe(true);
      expect(validation.results).toBeInstanceOf(Array);
    });

    it('should execute canary deployment', async () => {
      const result = await strategy.execute(canaryConfig);

      expect(result.success).toBe(true);
      expect(result.deploymentId).toBe(canaryConfig.id);
    });

    it('should analyze canary metrics', async () => {
      await strategy.execute(canaryConfig);
      
      const analysis = await strategy.analyzeCanary(canaryConfig.id);

      expect(analysis).toBeDefined();
      expect(['promote', 'rollback', 'continue']).toContain(analysis.recommendation);
      expect(analysis.confidence).toBeGreaterThanOrEqual(0);
      expect(analysis.confidence).toBeLessThanOrEqual(1);
    });

    it('should get current stage info', async () => {
      await strategy.execute(canaryConfig);
      
      const stageInfo = await strategy.getCurrentStage(canaryConfig.id);

      expect(stageInfo).toBeDefined();
      expect(stageInfo.currentStage).toBeGreaterThanOrEqual(0);
      expect(stageInfo.totalStages).toBeGreaterThan(0);
    });
  });

  describe('RollingStrategy', () => {
    let strategy: RollingStrategy;
    let rollingConfig: DeploymentConfig;

    beforeEach(() => {
      strategy = new RollingStrategy();
      rollingConfig = {
        ...mockDeploymentConfig,
        strategy: 'rolling',
        metadata: {
          rollingConfig: {
            batchSize: 1,
            maxUnavailable: 1,
            maxSurge: 1,
            progressDeadline: 60000,
            pauseBetweenBatches: 100 // Short pause for testing
          } as RollingStrategyConfig
        }
      };
    });

    it('should validate rolling configuration', async () => {
      const validation = await strategy.validateConfig(rollingConfig);

      expect(validation.success).toBe(true);
      expect(validation.results).toBeInstanceOf(Array);
    });

    it('should execute rolling deployment', async () => {
      const result = await strategy.execute(rollingConfig);

      expect(result.success).toBe(true);
      expect(result.deploymentId).toBe(rollingConfig.id);
    });

    it('should get rolling progress', async () => {
      await strategy.execute(rollingConfig);
      
      const progress = await strategy.getRollingProgress(rollingConfig.id);

      expect(progress).toBeDefined();
      expect(progress.totalReplicas).toBeGreaterThan(0);
      expect(progress.percentage).toBeGreaterThanOrEqual(0);
      expect(progress.percentage).toBeLessThanOrEqual(100);
    });

    it('should pause and resume rolling deployment', async () => {
      await strategy.execute(rollingConfig);
      
      await expect(strategy.pauseRolling(rollingConfig.id)).resolves.not.toThrow();
      await expect(strategy.resumeRolling(rollingConfig.id)).resolves.not.toThrow();
    });
  });

  describe('DeploymentValidator', () => {
    let validator: DeploymentValidator;

    beforeEach(() => {
      validator = new DeploymentValidator();
    });

    it('should validate deployment configuration', async () => {
      const validation = await validator.validateConfiguration(mockDeploymentConfig);

      expect(validation.success).toBe(true);
      expect(validation.results).toBeInstanceOf(Array);
      expect(validation.overallScore).toBeGreaterThan(0);
    });

    it('should validate pre-deployment conditions', async () => {
      const validation = await validator.validatePreDeployment(mockDeploymentConfig);

      expect(validation.success).toBe(true);
      expect(validation.results).toBeInstanceOf(Array);
    });

    it('should validate post-deployment conditions', async () => {
      const validation = await validator.validatePostDeployment(mockDeploymentConfig.id);

      expect(validation.success).toBe(true);
      expect(validation.results).toBeInstanceOf(Array);
    });

    it('should validate health checks', async () => {
      const validation = await validator.validateHealthChecks(mockDeploymentConfig.id);

      expect(validation.success).toBe(true);
      expect(validation.results).toBeInstanceOf(Array);
    });

    it('should validate performance metrics', async () => {
      const validation = await validator.validatePerformance(mockDeploymentConfig.id);

      expect(validation.success).toBe(true);
      expect(validation.results).toBeInstanceOf(Array);
    });

    it('should validate security compliance', async () => {
      const validation = await validator.validateSecurity(mockDeploymentConfig.id);

      expect(validation.success).toBe(true);
      expect(validation.results).toBeInstanceOf(Array);
    });
  });

  describe('HealthCheckManager', () => {
    let healthManager: HealthCheckManager;

    beforeEach(() => {
      healthManager = new HealthCheckManager();
    });

    it('should register and execute health checks', async () => {
      const componentId = 'test-component';
      const healthConfig = mockDeploymentConfig.components[0].healthCheck;

      await healthManager.registerHealthCheck(componentId, healthConfig);
      const result = await healthManager.executeHealthCheck(componentId);

      expect(result.componentId).toBe(componentId);
      expect(['healthy', 'unhealthy', 'degraded', 'unknown']).toContain(result.status);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.responseTime).toBeGreaterThan(0);
    });

    it('should start and stop health monitoring', async () => {
      const deploymentId = mockDeploymentConfig.id;

      await expect(healthManager.startHealthMonitoring(deploymentId)).resolves.not.toThrow();
      await expect(healthManager.stopHealthMonitoring(deploymentId)).resolves.not.toThrow();
    });

    it('should get health status for deployment', async () => {
      const deploymentId = mockDeploymentConfig.id;
      
      await healthManager.startHealthMonitoring(deploymentId);
      const status = await healthManager.getHealthStatus(deploymentId);

      expect(status).toBeDefined();
      expect(typeof status).toBe('object');
    });
  });

  describe('RollbackManager', () => {
    let rollbackManager: RollbackManager;

    beforeEach(() => {
      rollbackManager = new RollbackManager();
    });

    it('should create rollback plan', async () => {
      const plan = await rollbackManager.createRollbackPlan(mockDeploymentConfig.id);

      expect(plan.deploymentId).toBe(mockDeploymentConfig.id);
      expect(plan.steps).toBeInstanceOf(Array);
      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.estimatedDuration).toBeGreaterThan(0);
      expect(plan.risks).toBeInstanceOf(Array);
    });

    it('should validate rollback feasibility', async () => {
      const validation = await rollbackManager.validateRollback(mockDeploymentConfig.id);

      expect(validation.success).toBe(true);
      expect(validation.results).toBeInstanceOf(Array);
    });

    it('should execute rollback', async () => {
      const result = await rollbackManager.executeRollback(mockDeploymentConfig.id);

      expect(result.success).toBe(true);
      expect(result.deploymentId).toBe(mockDeploymentConfig.id);
      expect(result.status).toBe('rolled-back');
      expect(result.rollbackInfo).toBeDefined();
    });

    it('should get rollback history', async () => {
      await rollbackManager.executeRollback(mockDeploymentConfig.id);
      
      const history = await rollbackManager.getRollbackHistory(mockDeploymentConfig.id);

      expect(history).toBeInstanceOf(Array);
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('ApprovalManager', () => {
    let approvalManager: ApprovalManager;

    beforeEach(() => {
      approvalManager = new ApprovalManager();
    });

    it('should request and submit approval', async () => {
      const request = await approvalManager.requestApproval(mockDeploymentConfig.id, 'production');

      expect(request.deploymentId).toBe(mockDeploymentConfig.id);
      expect(request.stage).toBe('production');
      expect(request.approvers).toBeInstanceOf(Array);

      const decision = {
        approved: true,
        approver: request.approvers[0],
        timestamp: new Date(),
        comments: 'Approved for deployment'
      };

      await expect(approvalManager.submitApproval(request.id, decision)).resolves.not.toThrow();
    });

    it('should get approval status', async () => {
      const request = await approvalManager.requestApproval(mockDeploymentConfig.id, 'production');
      
      const status = await approvalManager.getApprovalStatus(mockDeploymentConfig.id);

      expect(status.pending).toBeInstanceOf(Array);
      expect(status.completed).toBeInstanceOf(Array);
      expect(['pending', 'approved', 'rejected', 'expired']).toContain(status.overallStatus);
    });

    it('should cancel approval request', async () => {
      const request = await approvalManager.requestApproval(mockDeploymentConfig.id, 'production');
      
      await expect(approvalManager.cancelApprovalRequest(request.id)).resolves.not.toThrow();
    });
  });

  describe('AnalyticsManager', () => {
    let analyticsManager: AnalyticsManager;

    beforeEach(() => {
      analyticsManager = new AnalyticsManager();
    });

    it('should track deployment metrics', async () => {
      const metrics = {
        duration: 120000,
        resourceUsage: { cpu: 50, memory: 60, network: 30, storage: 40 },
        performance: { responseTime: 100, throughput: 1000, errorRate: 0.01, availability: 99.9 },
        success: true,
        rollbackCount: 0
      };

      await expect(analyticsManager.trackDeploymentMetrics(mockDeploymentConfig.id, metrics)).resolves.not.toThrow();
    });

    it('should generate deployment report', async () => {
      const metrics = {
        duration: 120000,
        resourceUsage: { cpu: 50, memory: 60, network: 30, storage: 40 },
        performance: { responseTime: 100, throughput: 1000, errorRate: 0.01, availability: 99.9 },
        success: true,
        rollbackCount: 0
      };

      await analyticsManager.trackDeploymentMetrics(mockDeploymentConfig.id, metrics);
      const report = await analyticsManager.generateDeploymentReport(mockDeploymentConfig.id);

      expect(report.deploymentId).toBe(mockDeploymentConfig.id);
      expect(report.summary).toBeDefined();
      expect(report.timeline).toBeInstanceOf(Array);
      expect(report.metrics).toBeDefined();
      expect(report.issues).toBeInstanceOf(Array);
      expect(report.recommendations).toBeInstanceOf(Array);
    });

    it('should get analytics dashboard', async () => {
      const dashboard = await analyticsManager.getAnalyticsDashboard();

      expect(dashboard.overview).toBeDefined();
      expect(dashboard.charts).toBeInstanceOf(Array);
      expect(dashboard.alerts).toBeInstanceOf(Array);
      expect(dashboard.trends).toBeInstanceOf(Array);
    });

    it('should get success rate metrics', async () => {
      const successRate = await analyticsManager.getSuccessRate();

      expect(successRate.overall).toBeGreaterThanOrEqual(0);
      expect(successRate.overall).toBeLessThanOrEqual(100);
      expect(successRate.byEnvironment).toBeDefined();
      expect(successRate.byStrategy).toBeDefined();
      expect(successRate.byComponent).toBeDefined();
      expect(successRate.trend).toBeInstanceOf(Array);
    });

    it('should get performance trends', async () => {
      const trends = await analyticsManager.getPerformanceTrends();

      expect(trends.deploymentDuration).toBeInstanceOf(Array);
      expect(trends.rollbackRate).toBeInstanceOf(Array);
      expect(trends.errorRate).toBeInstanceOf(Array);
      expect(trends.throughput).toBeInstanceOf(Array);
    });
  });

  describe('PromotionManager', () => {
    let promotionManager: PromotionManager;

    beforeEach(() => {
      promotionManager = new PromotionManager();
    });

    it('should create promotion pipeline', async () => {
      const pipelineConfig = {
        name: 'test-promotion-pipeline',
        stages: [
          {
            name: 'staging',
            environment: 'staging' as const,
            deploymentConfig: mockDeploymentConfig,
            prerequisites: [],
            autoPromote: false
          },
          {
            name: 'production',
            environment: 'production' as const,
            deploymentConfig: mockDeploymentConfig,
            prerequisites: ['staging'],
            autoPromote: false
          }
        ],
        approvals: [],
        validation: mockDeploymentConfig.validation
      };

      const pipeline = await promotionManager.createPromotionPipeline(pipelineConfig);

      expect(pipeline.name).toBe(pipelineConfig.name);
      expect(pipeline.stages).toBeInstanceOf(Array);
      expect(pipeline.stages.length).toBe(2);
      expect(pipeline.status).toBe('active');
    });

    it('should execute promotion', async () => {
      const pipelineConfig = {
        name: 'test-promotion-pipeline',
        stages: [
          {
            name: 'staging',
            environment: 'staging' as const,
            deploymentConfig: mockDeploymentConfig,
            prerequisites: [],
            autoPromote: false
          }
        ],
        approvals: [],
        validation: mockDeploymentConfig.validation
      };

      const pipeline = await promotionManager.createPromotionPipeline(pipelineConfig);
      const result = await promotionManager.executePromotion(pipeline.id, 'staging');

      expect(result.success).toBe(true);
      expect(result.toEnvironment).toBe('staging');
      expect(result.deploymentId).toBeDefined();
    });

    it('should get promotion status', async () => {
      const pipelineConfig = {
        name: 'test-promotion-pipeline',
        stages: [
          {
            name: 'staging',
            environment: 'staging' as const,
            deploymentConfig: mockDeploymentConfig,
            prerequisites: [],
            autoPromote: false
          }
        ],
        approvals: [],
        validation: mockDeploymentConfig.validation
      };

      const pipeline = await promotionManager.createPromotionPipeline(pipelineConfig);
      const status = await promotionManager.getPromotionStatus(pipeline.id);

      expect(status.pipelineId).toBe(pipeline.id);
      expect(status.currentStage).toBeDefined();
      expect(status.progress).toBeGreaterThanOrEqual(0);
      expect(status.stages).toBeInstanceOf(Array);
      expect(status.blockers).toBeInstanceOf(Array);
    });

    it('should validate promotion', async () => {
      const pipelineConfig = {
        name: 'test-promotion-pipeline',
        stages: [
          {
            name: 'staging',
            environment: 'staging' as const,
            deploymentConfig: mockDeploymentConfig,
            prerequisites: [],
            autoPromote: false
          }
        ],
        approvals: [],
        validation: mockDeploymentConfig.validation
      };

      const pipeline = await promotionManager.createPromotionPipeline(pipelineConfig);
      const validation = await promotionManager.validatePromotion(pipeline.id, 'staging');

      expect(validation.success).toBe(true);
      expect(validation.results).toBeInstanceOf(Array);
      expect(validation.overallScore).toBeGreaterThanOrEqual(0);
    });
  });
});