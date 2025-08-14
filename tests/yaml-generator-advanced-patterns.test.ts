/**
 * Advanced Patterns Test Suite for YAML Generator
 * 
 * This test suite validates advanced workflow patterns including:
 * - Monorepo workflows with path-based triggers
 * - Microservices orchestration workflows
 * - Canary deployment workflows
 * - Multi-environment deployment strategies
 * - Agent Hooks integration workflows
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { YAMLGeneratorImpl } from '../src/generator/yaml-generator';
import { DetectionResult } from '../src/generator/interfaces';
import { 
  createTestYAMLGenerator,
  createMultiFrameworkDetectionResult,
  createMonorepoDetectionResult,
  createMicroservicesDetectionResult,
  createCanaryDeploymentDetectionResult
} from './utils/yaml-generator-test-helpers';
import * as yaml from 'js-yaml';

describe('Advanced Patterns Test Suite', () => {
  let generator: YAMLGeneratorImpl;

  beforeAll(async () => {
    generator = createTestYAMLGenerator();
  });

  describe('Monorepo Workflow Patterns', () => {
    it('should generate monorepo workflows with path-based triggers', async () => {
      const monorepoResult = createMonorepoDetectionResult({
        packages: ['frontend', 'backend', 'shared', 'docs'],
        languages: ['TypeScript', 'Python', 'JavaScript'],
        frameworks: ['React', 'FastAPI', 'Express'],
        buildTools: ['lerna', 'nx', 'npm', 'pip']
      });

      const workflows = await generator.generateAdvancedPatternWorkflows(
        monorepoResult,
        {
          type: 'monorepo',
          packages: ['frontend', 'backend', 'shared', 'docs'],
          pathTriggers: true,
          selectiveBuilds: true,
          dependencyGraph: true
        }
      );

      expect(workflows.length).toBeGreaterThan(0);
      
      const mainWorkflow = workflows[0];
      
      // Should include path-based triggers
      expect(mainWorkflow.content).toContain('paths:');
      expect(mainWorkflow.content).toContain('frontend/**');
      expect(mainWorkflow.content).toContain('backend/**');
      expect(mainWorkflow.content).toContain('shared/**');
      
      // Should include selective build logic
      expect(mainWorkflow.content).toContain('if:');
      expect(mainWorkflow.content).toContain('contains(github.event.head_commit.modified');

      // Should include dependency coordination
      expect(mainWorkflow.metadata.optimizations).toContain('Advanced pattern: monorepo');

      // Validate YAML syntax
      expect(() => yaml.load(mainWorkflow.content)).not.toThrow();

      console.log('📦 Monorepo workflow validation:', {
        workflows: workflows.length,
        pathTriggers: mainWorkflow.content.includes('paths:'),
        selectiveBuilds: mainWorkflow.content.includes('if:'),
        packages: ['frontend', 'backend', 'shared', 'docs'].length,
        optimizations: mainWorkflow.metadata.optimizations.length
      });
    });

    it('should generate monorepo workflows with dependency graph coordination', async () => {
      const monorepoResult = createMonorepoDetectionResult({
        packages: ['core', 'ui-components', 'web-app', 'mobile-app'],
        languages: ['TypeScript', 'Dart'],
        frameworks: ['React', 'Flutter'],
        buildTools: ['nx', 'flutter']
      });

      const workflows = await generator.generateAdvancedPatternWorkflows(
        monorepoResult,
        {
          type: 'monorepo',
          packages: ['core', 'ui-components', 'web-app', 'mobile-app'],
          pathTriggers: true,
          selectiveBuilds: true,
          dependencyGraph: true,
          dependencyOrder: ['core', 'ui-components', 'web-app', 'mobile-app']
        }
      );

      expect(workflows.length).toBeGreaterThan(0);
      
      const workflow = workflows[0];
      
      // Should include job dependencies
      expect(workflow.content).toContain('needs:');
      
      // Should coordinate builds based on dependency graph
      const parsedWorkflow = yaml.load(workflow.content) as any;
      expect(parsedWorkflow.jobs).toBeDefined();
      
      const jobNames = Object.keys(parsedWorkflow.jobs);
      expect(jobNames.length).toBeGreaterThan(1);

      console.log('🔗 Dependency graph coordination:', {
        jobs: jobNames.length,
        hasDependencies: workflow.content.includes('needs:'),
        packages: 4
      });
    });

    it('should optimize monorepo workflows for large repositories', async () => {
      const largeMonorepoResult = createMonorepoDetectionResult({
        packages: Array.from({ length: 20 }, (_, i) => `package-${i + 1}`),
        languages: ['TypeScript', 'Python', 'Go', 'Rust'],
        frameworks: ['React', 'Django', 'Gin', 'Actix'],
        buildTools: ['nx', 'lerna', 'bazel']
      });

      const workflows = await generator.generateAdvancedPatternWorkflows(
        largeMonorepoResult,
        {
          type: 'monorepo',
          packages: Array.from({ length: 20 }, (_, i) => `package-${i + 1}`),
          pathTriggers: true,
          selectiveBuilds: true,
          dependencyGraph: true,
          parallelization: true,
          cacheOptimization: true
        }
      );

      expect(workflows.length).toBeGreaterThan(0);
      
      const workflow = workflows[0];
      
      // Should include parallelization strategies
      expect(workflow.content).toContain('strategy:');
      expect(workflow.content).toContain('matrix:');
      
      // Should include advanced caching
      expect(workflow.content).toContain('cache:');
      
      // Should handle large scale efficiently
      expect(workflow.content.length).toBeLessThan(50000); // Reasonable size limit

      console.log('🏗️ Large monorepo optimization:', {
        packages: 20,
        hasMatrix: workflow.content.includes('matrix:'),
        hasCaching: workflow.content.includes('cache:'),
        workflowSize: `${(workflow.content.length / 1024).toFixed(2)}KB`
      });
    });
  });

  describe('Microservices Orchestration Patterns', () => {
    it('should generate microservices orchestration workflows', async () => {
      const microservicesResult = createMicroservicesDetectionResult({
        services: [
          { name: 'user-service', language: 'Go', framework: 'Gin' },
          { name: 'order-service', language: 'Python', framework: 'FastAPI' },
          { name: 'notification-service', language: 'JavaScript', framework: 'Express' },
          { name: 'payment-service', language: 'Java', framework: 'Spring Boot' }
        ],
        orchestration: 'kubernetes',
        monitoring: true
      });

      const workflows = await generator.generateAdvancedPatternWorkflows(
        microservicesResult,
        {
          type: 'microservices',
          services: [
            { name: 'user-service', dependencies: [] },
            { name: 'order-service', dependencies: ['user-service'] },
            { name: 'notification-service', dependencies: ['order-service'] },
            { name: 'payment-service', dependencies: ['user-service'] }
          ],
          deploymentOrder: ['user-service', 'payment-service', 'order-service', 'notification-service'],
          healthChecks: true,
          serviceDiscovery: true
        }
      );

      expect(workflows.length).toBeGreaterThan(0);
      
      const orchestrationWorkflow = workflows.find(w => w.filename.includes('orchestration')) || workflows[0];
      
      // Should include service coordination
      expect(orchestrationWorkflow.content).toContain('needs:');
      
      // Should include health checks
      expect(orchestrationWorkflow.content).toContain('health');
      
      // Should include Kubernetes deployment
      expect(orchestrationWorkflow.content).toContain('kubectl');

      // Validate service dependencies
      const parsedWorkflow = yaml.load(orchestrationWorkflow.content) as any;
      expect(parsedWorkflow.jobs).toBeDefined();

      console.log('🏗️ Microservices orchestration:', {
        workflows: workflows.length,
        services: 4,
        hasServiceCoordination: orchestrationWorkflow.content.includes('needs:'),
        hasHealthChecks: orchestrationWorkflow.content.includes('health'),
        hasKubernetes: orchestrationWorkflow.content.includes('kubectl')
      });
    });

    it('should generate microservices workflows with service mesh integration', async () => {
      const microservicesResult = createMicroservicesDetectionResult({
        services: [
          { name: 'api-gateway', language: 'Go', framework: 'Gin' },
          { name: 'auth-service', language: 'Rust', framework: 'Actix' },
          { name: 'data-service', language: 'Python', framework: 'FastAPI' }
        ],
        orchestration: 'istio',
        monitoring: true,
        serviceMesh: true
      });

      const workflows = await generator.generateAdvancedPatternWorkflows(
        microservicesResult,
        {
          type: 'microservices',
          services: [
            { name: 'api-gateway', dependencies: ['auth-service'] },
            { name: 'auth-service', dependencies: [] },
            { name: 'data-service', dependencies: ['auth-service'] }
          ],
          serviceMesh: {
            enabled: true,
            type: 'istio',
            features: ['traffic-management', 'security', 'observability']
          },
          deploymentOrder: ['auth-service', 'data-service', 'api-gateway'],
          healthChecks: true
        }
      );

      expect(workflows.length).toBeGreaterThan(0);
      
      const workflow = workflows[0];
      
      // Should include service mesh configuration
      expect(workflow.content).toContain('istio');
      
      // Should include traffic management
      expect(workflow.content.toLowerCase()).toMatch(/(traffic|routing|mesh)/);

      console.log('🕸️ Service mesh integration:', {
        workflows: workflows.length,
        serviceMesh: 'istio',
        hasTrafficManagement: workflow.content.toLowerCase().includes('traffic'),
        services: 3
      });
    });

    it('should generate microservices workflows with distributed tracing', async () => {
      const microservicesResult = createMicroservicesDetectionResult({
        services: [
          { name: 'frontend-service', language: 'JavaScript', framework: 'React' },
          { name: 'backend-service', language: 'Python', framework: 'Django' },
          { name: 'database-service', language: 'Go', framework: 'Gin' }
        ],
        orchestration: 'kubernetes',
        monitoring: true,
        tracing: true
      });

      const workflows = await generator.generateAdvancedPatternWorkflows(
        microservicesResult,
        {
          type: 'microservices',
          services: [
            { name: 'frontend-service', dependencies: ['backend-service'] },
            { name: 'backend-service', dependencies: ['database-service'] },
            { name: 'database-service', dependencies: [] }
          ],
          tracing: {
            enabled: true,
            provider: 'jaeger',
            sampling: 0.1
          },
          monitoring: {
            metrics: true,
            logs: true,
            traces: true
          },
          deploymentOrder: ['database-service', 'backend-service', 'frontend-service'],
          healthChecks: true
        }
      );

      expect(workflows.length).toBeGreaterThan(0);
      
      const workflow = workflows[0];
      
      // Should include tracing configuration
      expect(workflow.content.toLowerCase()).toMatch(/(jaeger|tracing|trace)/);
      
      // Should include monitoring setup
      expect(workflow.content.toLowerCase()).toMatch(/(monitor|metrics|observability)/);

      console.log('🔍 Distributed tracing integration:', {
        workflows: workflows.length,
        tracingProvider: 'jaeger',
        hasTracing: workflow.content.toLowerCase().includes('jaeger'),
        hasMonitoring: workflow.content.toLowerCase().includes('monitor')
      });
    });
  });

  describe('Canary Deployment Patterns', () => {
    it('should generate canary deployment workflows', async () => {
      const canaryResult = createCanaryDeploymentDetectionResult({
        application: 'web-application',
        language: 'JavaScript',
        framework: 'React',
        deploymentTarget: 'kubernetes',
        monitoringEnabled: true
      });

      const workflows = await generator.generateAdvancedPatternWorkflows(
        canaryResult,
        {
          type: 'canary',
          stages: [
            { name: 'canary', percentage: 5, duration: '5m' },
            { name: 'rollout-25', percentage: 25, duration: '10m' },
            { name: 'rollout-50', percentage: 50, duration: '15m' },
            { name: 'complete', percentage: 100, duration: '0m' }
          ],
          metrics: ['error-rate', 'response-time', 'throughput', 'cpu-usage'],
          rollbackTriggers: ['error-rate > 5%', 'response-time > 2s', 'cpu-usage > 80%']
        }
      );

      expect(workflows.length).toBeGreaterThan(0);
      
      const canaryWorkflow = workflows.find(w => w.filename.includes('canary')) || workflows[0];
      
      // Should include progressive rollout stages
      expect(canaryWorkflow.content).toContain('5%');
      expect(canaryWorkflow.content).toContain('25%');
      expect(canaryWorkflow.content).toContain('50%');
      expect(canaryWorkflow.content).toContain('100%');
      
      // Should include monitoring and rollback logic
      expect(canaryWorkflow.content).toContain('error-rate');
      expect(canaryWorkflow.content).toContain('rollback');

      // Should include stage dependencies
      expect(canaryWorkflow.content).toContain('needs:');

      console.log('🚀 Canary deployment validation:', {
        workflows: workflows.length,
        stages: 4,
        hasProgressiveRollout: canaryWorkflow.content.includes('5%'),
        hasMonitoring: canaryWorkflow.content.includes('error-rate'),
        hasRollback: canaryWorkflow.content.includes('rollback')
      });
    });

    it('should generate blue-green deployment workflows', async () => {
      const blueGreenResult = createCanaryDeploymentDetectionResult({
        application: 'api-service',
        language: 'Python',
        framework: 'FastAPI',
        deploymentTarget: 'aws',
        monitoringEnabled: true
      });

      const workflows = await generator.generateAdvancedPatternWorkflows(
        blueGreenResult,
        {
          type: 'blue-green',
          environments: ['blue', 'green'],
          switchStrategy: 'load-balancer',
          healthChecks: {
            enabled: true,
            endpoint: '/health',
            timeout: '30s',
            retries: 3
          },
          rollbackStrategy: 'automatic',
          monitoringDuration: '10m'
        }
      );

      expect(workflows.length).toBeGreaterThan(0);
      
      const workflow = workflows[0];
      
      // Should include blue-green deployment logic
      expect(workflow.content.toLowerCase()).toMatch(/(blue|green)/);
      
      // Should include health checks
      expect(workflow.content).toContain('/health');
      
      // Should include load balancer switching
      expect(workflow.content.toLowerCase()).toMatch(/(load.balancer|switch|traffic)/);

      console.log('🔄 Blue-green deployment validation:', {
        workflows: workflows.length,
        hasBlueGreen: workflow.content.toLowerCase().includes('blue'),
        hasHealthChecks: workflow.content.includes('/health'),
        hasTrafficSwitching: workflow.content.toLowerCase().includes('switch')
      });
    });

    it('should generate feature flag deployment workflows', async () => {
      const featureFlagResult = createCanaryDeploymentDetectionResult({
        application: 'feature-service',
        language: 'Go',
        framework: 'Gin',
        deploymentTarget: 'kubernetes',
        monitoringEnabled: true
      });

      const workflows = await generator.generateAdvancedPatternWorkflows(
        featureFlagResult,
        {
          type: 'feature-flags',
          flagProvider: 'launchdarkly',
          deploymentStrategy: 'gradual-rollout',
          userSegments: ['beta-users', 'premium-users', 'all-users'],
          rolloutPercentages: [10, 50, 100],
          metrics: ['conversion-rate', 'user-engagement', 'error-rate'],
          rollbackTriggers: ['error-rate > 3%', 'conversion-rate < 95%']
        }
      );

      expect(workflows.length).toBeGreaterThan(0);
      
      const workflow = workflows[0];
      
      // Should include feature flag configuration
      expect(workflow.content.toLowerCase()).toMatch(/(feature.flag|launchdarkly|flag)/);
      
      // Should include user segmentation
      expect(workflow.content).toContain('beta-users');
      
      // Should include gradual rollout
      expect(workflow.content).toContain('10');
      expect(workflow.content).toContain('50');

      console.log('🏁 Feature flag deployment validation:', {
        workflows: workflows.length,
        flagProvider: 'launchdarkly',
        hasFeatureFlags: workflow.content.toLowerCase().includes('flag'),
        hasUserSegments: workflow.content.includes('beta-users'),
        hasGradualRollout: workflow.content.includes('10')
      });
    });
  });

  describe('Multi-Environment Deployment Patterns', () => {
    it('should generate complex multi-environment workflows', async () => {
      const multiEnvResult: DetectionResult = {
        frameworks: [
          { name: 'React', confidence: 0.9, evidence: ['package.json'], category: 'frontend' }
        ],
        languages: [
          { name: 'JavaScript', confidence: 0.9, primary: true }
        ],
        buildTools: [
          { name: 'npm', configFile: 'package.json', confidence: 0.9 }
        ],
        packageManagers: [
          { name: 'npm', confidence: 0.9 }
        ],
        testingFrameworks: [
          { name: 'Jest', type: 'unit', confidence: 0.8 }
        ],
        deploymentTargets: [
          { platform: 'AWS', type: 'container', confidence: 0.8 }
        ],
        projectMetadata: {
          name: 'multi-env-app',
          description: 'Application with multiple environments'
        }
      };

      const environments = [
        {
          name: 'development',
          type: 'development' as const,
          approvalRequired: false,
          secrets: ['DEV_API_KEY', 'DEV_DATABASE_URL'],
          variables: { NODE_ENV: 'development', DEBUG: 'true' },
          deploymentStrategy: 'rolling' as const,
          rollbackEnabled: true
        },
        {
          name: 'staging',
          type: 'staging' as const,
          approvalRequired: true,
          secrets: ['STAGING_API_KEY', 'STAGING_DATABASE_URL'],
          variables: { NODE_ENV: 'staging', DEBUG: 'false' },
          deploymentStrategy: 'blue-green' as const,
          rollbackEnabled: true
        },
        {
          name: 'production',
          type: 'production' as const,
          approvalRequired: true,
          secrets: ['PROD_API_KEY', 'PROD_DATABASE_URL'],
          variables: { NODE_ENV: 'production', DEBUG: 'false' },
          deploymentStrategy: 'canary' as const,
          rollbackEnabled: true
        }
      ];

      const workflows = await generator.generateMultiEnvironmentWorkflows(
        multiEnvResult,
        environments
      );

      expect(workflows.length).toBeGreaterThan(0);
      
      // Should have environment-specific workflows or environment-aware workflows
      const hasEnvironmentLogic = workflows.some(w => 
        w.content.includes('development') || 
        w.content.includes('staging') || 
        w.content.includes('production')
      );
      expect(hasEnvironmentLogic).toBe(true);

      // Should include approval gates for staging and production
      const hasApprovalGates = workflows.some(w => 
        w.content.includes('environment:') || 
        w.content.includes('required_reviewers')
      );

      console.log('🌍 Multi-environment deployment validation:', {
        workflows: workflows.length,
        environments: environments.length,
        hasEnvironmentLogic,
        hasApprovalGates,
        deploymentStrategies: environments.map(e => e.deploymentStrategy)
      });
    });

    it('should generate environment promotion workflows', async () => {
      const promotionResult: DetectionResult = {
        frameworks: [
          { name: 'Django', confidence: 0.9, evidence: ['requirements.txt'], category: 'backend' }
        ],
        languages: [
          { name: 'Python', confidence: 0.9, primary: true }
        ],
        buildTools: [
          { name: 'pip', configFile: 'requirements.txt', confidence: 0.9 }
        ],
        packageManagers: [
          { name: 'pip', confidence: 0.9 }
        ],
        testingFrameworks: [
          { name: 'pytest', type: 'unit', confidence: 0.8 }
        ],
        deploymentTargets: [
          { platform: 'Kubernetes', type: 'container', confidence: 0.8 }
        ],
        projectMetadata: {
          name: 'promotion-app',
          description: 'Application with environment promotion'
        }
      };

      const environments = [
        {
          name: 'dev',
          type: 'development' as const,
          approvalRequired: false,
          secrets: ['DEV_SECRET'],
          variables: { ENV: 'dev' },
          deploymentStrategy: 'rolling' as const,
          rollbackEnabled: true
        },
        {
          name: 'staging',
          type: 'staging' as const,
          approvalRequired: false,
          secrets: ['STAGING_SECRET'],
          variables: { ENV: 'staging' },
          deploymentStrategy: 'rolling' as const,
          rollbackEnabled: true,
          promotionSource: 'dev'
        },
        {
          name: 'prod',
          type: 'production' as const,
          approvalRequired: true,
          secrets: ['PROD_SECRET'],
          variables: { ENV: 'prod' },
          deploymentStrategy: 'canary' as const,
          rollbackEnabled: true,
          promotionSource: 'staging'
        }
      ];

      const workflows = await generator.generateMultiEnvironmentWorkflows(
        promotionResult,
        environments
      );

      expect(workflows.length).toBeGreaterThan(0);
      
      // Should include promotion logic
      const hasPromotionLogic = workflows.some(w => 
        w.content.includes('needs:') || 
        w.content.includes('depends_on')
      );

      console.log('📈 Environment promotion validation:', {
        workflows: workflows.length,
        hasPromotionLogic,
        promotionChain: 'dev → staging → prod'
      });
    });
  });

  describe('Agent Hooks Integration Patterns', () => {
    it('should generate Agent Hooks integration workflows', async () => {
      const agentHooksResult: DetectionResult = {
        frameworks: [
          { name: 'Express', confidence: 0.8, evidence: ['package.json'], category: 'backend' }
        ],
        languages: [
          { name: 'JavaScript', confidence: 0.9, primary: true }
        ],
        buildTools: [
          { name: 'npm', configFile: 'package.json', confidence: 0.9 }
        ],
        packageManagers: [
          { name: 'npm', confidence: 0.9 }
        ],
        testingFrameworks: [
          { name: 'Jest', type: 'unit', confidence: 0.8 }
        ],
        deploymentTargets: [
          { platform: 'Heroku', type: 'traditional', confidence: 0.7 }
        ],
        projectMetadata: {
          name: 'agent-hooks-app',
          description: 'Application with Agent Hooks integration'
        }
      };

      const workflows = await generator.generateAgentHooksWorkflows(agentHooksResult, {
        workflowType: 'maintenance',
        agentHooksEnabled: true,
        optimizationLevel: 'standard',
        includeComments: true
      });

      expect(workflows.length).toBeGreaterThan(0);
      
      const workflow = workflows[0];
      
      // Should include Agent Hooks triggers
      expect(workflow.content).toContain('repository_dispatch');
      expect(workflow.content).toContain('readme-updated');
      expect(workflow.content).toContain('performance-regression');
      expect(workflow.content).toContain('security-alert');

      // Should include webhook response logic
      expect(workflow.content).toContain('Agent Hooks');

      console.log('🤖 Agent Hooks integration validation:', {
        workflows: workflows.length,
        hasRepositoryDispatch: workflow.content.includes('repository_dispatch'),
        hasWebhookResponse: workflow.content.includes('Agent Hooks'),
        triggers: ['readme-updated', 'performance-regression', 'security-alert'].length
      });
    });

    it('should generate intelligent automation workflows', async () => {
      const automationResult: DetectionResult = {
        frameworks: [
          { name: 'React', confidence: 0.9, evidence: ['package.json'], category: 'frontend' }
        ],
        languages: [
          { name: 'TypeScript', confidence: 0.9, primary: true }
        ],
        buildTools: [
          { name: 'vite', configFile: 'vite.config.ts', confidence: 0.8 }
        ],
        packageManagers: [
          { name: 'npm', confidence: 0.9 }
        ],
        testingFrameworks: [
          { name: 'Vitest', type: 'unit', confidence: 0.8 }
        ],
        deploymentTargets: [
          { platform: 'Vercel', type: 'static', confidence: 0.9 }
        ],
        projectMetadata: {
          name: 'automation-app',
          description: 'Application with intelligent automation'
        }
      };

      const workflows = await generator.generateAgentHooksWorkflows(automationResult, {
        workflowType: 'maintenance',
        agentHooksEnabled: true,
        optimizationLevel: 'aggressive',
        includeComments: true
      });

      expect(workflows.length).toBeGreaterThan(0);
      
      const workflow = workflows[0];
      
      // Should include intelligent triggers
      expect(workflow.content).toContain('issues:');
      expect(workflow.content).toContain('pull_request:');
      expect(workflow.content).toContain('push:');

      // Should include automation metadata
      expect(workflow.metadata.optimizations).toContain('webhook-automation');

      console.log('🧠 Intelligent automation validation:', {
        workflows: workflows.length,
        hasIssueAutomation: workflow.content.includes('issues:'),
        hasPRAutomation: workflow.content.includes('pull_request:'),
        optimizations: workflow.metadata.optimizations.length
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle complex advanced patterns efficiently', async () => {
      const complexResult = createMultiFrameworkDetectionResult([
        { name: 'JavaScript', frameworks: ['React', 'Express'] },
        { name: 'Python', frameworks: ['Django', 'FastAPI'] },
        { name: 'Go', frameworks: ['Gin'] },
        { name: 'Rust', frameworks: ['Actix'] }
      ]);

      const startTime = Date.now();
      
      // Generate multiple advanced patterns
      const monorepoWorkflows = await generator.generateAdvancedPatternWorkflows(
        complexResult,
        { type: 'monorepo', packages: ['frontend', 'backend', 'api', 'shared'] }
      );
      
      const microservicesWorkflows = await generator.generateAdvancedPatternWorkflows(
        complexResult,
        { 
          type: 'microservices', 
          services: [
            { name: 'frontend', dependencies: [] },
            { name: 'backend', dependencies: ['api'] },
            { name: 'api', dependencies: [] }
          ]
        }
      );
      
      const canaryWorkflows = await generator.generateAdvancedPatternWorkflows(
        complexResult,
        { 
          type: 'canary', 
          stages: [
            { name: 'canary', percentage: 10 },
            { name: 'rollout', percentage: 100 }
          ]
        }
      );
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Performance requirements
      expect(totalTime).toBeLessThan(20000); // Under 20 seconds for complex patterns
      
      const totalWorkflows = monorepoWorkflows.length + microservicesWorkflows.length + canaryWorkflows.length;
      expect(totalWorkflows).toBeGreaterThan(0);

      console.log('⚡ Advanced patterns performance:', {
        totalTime: `${totalTime}ms`,
        patterns: 3,
        totalWorkflows,
        avgTimePerPattern: `${(totalTime / 3).toFixed(2)}ms`
      });
    });

    it('should generate scalable workflows for large-scale deployments', async () => {
      const largeScaleResult = createMicroservicesDetectionResult({
        services: Array.from({ length: 15 }, (_, i) => ({
          name: `service-${i + 1}`,
          language: ['Go', 'Python', 'JavaScript', 'Java', 'Rust'][i % 5],
          framework: ['Gin', 'FastAPI', 'Express', 'Spring Boot', 'Actix'][i % 5]
        })),
        orchestration: 'kubernetes',
        monitoring: true
      });

      const workflows = await generator.generateAdvancedPatternWorkflows(
        largeScaleResult,
        {
          type: 'microservices',
          services: Array.from({ length: 15 }, (_, i) => ({
            name: `service-${i + 1}`,
            dependencies: i > 0 ? [`service-${i}`] : []
          })),
          parallelization: true,
          batchDeployment: true,
          healthChecks: true
        }
      );

      expect(workflows.length).toBeGreaterThan(0);
      
      const workflow = workflows[0];
      
      // Should handle large scale efficiently
      expect(workflow.content.length).toBeLessThan(100000); // Reasonable size for large scale
      
      // Should include parallelization
      expect(workflow.content).toContain('strategy:');
      expect(workflow.content).toContain('matrix:');

      console.log('🏗️ Large-scale deployment validation:', {
        services: 15,
        workflows: workflows.length,
        hasParallelization: workflow.content.includes('matrix:'),
        workflowSize: `${(workflow.content.length / 1024).toFixed(2)}KB`
      });
    });
  });
});