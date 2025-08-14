/**
 * Integration tests for YAMLGenerator advanced orchestration
 * Tests the enhanced main generator with all advanced features
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { YAMLGeneratorImpl } from '../../src/generator/yaml-generator';
import { DetectionResult, GenerationOptions, WorkflowType } from '../../src/generator/interfaces';
import { AdvancedPatternConfig } from '../../src/generator/workflow-specialization/advanced-pattern-generator';

describe('YAMLGenerator Advanced Orchestration', () => {
  let generator: YAMLGeneratorImpl;
  let mockDetectionResult: DetectionResult;

  beforeEach(() => {
    generator = new YAMLGeneratorImpl({
      agentHooksConfig: {
        automationLevel: 'standard',
        optimizationEnabled: true,
        recoveryEnabled: true
      },
      advancedPatternsEnabled: true
    });

    mockDetectionResult = {
      frameworks: [
        { name: 'React', version: '18.0.0', confidence: 0.9, evidence: ['package.json'], category: 'frontend' },
        { name: 'Express', version: '4.18.0', confidence: 0.8, evidence: ['package.json'], category: 'backend' }
      ],
      languages: [
        { name: 'TypeScript', version: '5.0.0', confidence: 0.95, primary: true },
        { name: 'JavaScript', confidence: 0.8, primary: false }
      ],
      buildTools: [
        { name: 'npm', configFile: 'package.json', confidence: 0.9 }
      ],
      packageManagers: [
        { name: 'npm', lockFile: 'package-lock.json', confidence: 0.9 }
      ],
      testingFrameworks: [
        { name: 'Jest', type: 'unit', confidence: 0.8 },
        { name: 'Cypress', type: 'e2e', confidence: 0.7 }
      ],
      deploymentTargets: [
        { platform: 'Vercel', type: 'static', confidence: 0.8 }
      ],
      projectMetadata: {
        name: 'test-project',
        description: 'A test project for advanced orchestration',
        version: '1.0.0'
      }
    };
  });

  describe('Advanced Pattern Generation', () => {
    it('should generate monorepo workflows', async () => {
      const patternConfig: AdvancedPatternConfig = {
        type: 'monorepo',
        monorepo: {
          packages: [
            {
              name: 'frontend',
              path: 'packages/frontend',
              framework: 'React',
              dependencies: [],
              buildCommand: 'npm run build',
              testCommand: 'npm test',
              deployable: true
            },
            {
              name: 'backend',
              path: 'packages/backend',
              framework: 'Express',
              dependencies: [],
              buildCommand: 'npm run build',
              testCommand: 'npm test',
              deployable: true
            }
          ],
          sharedDependencies: ['@types/node'],
          buildOrder: ['backend', 'frontend'],
          pathTriggers: [
            {
              paths: ['packages/frontend/**'],
              packages: ['frontend'],
              triggerType: 'build'
            }
          ],
          selectiveBuilds: {
            enabled: true,
            strategy: 'changed-only',
            changeDetection: 'git-diff',
            baseRef: 'main'
          },
          dependencyGraph: {
            enabled: true,
            includeDevDependencies: false,
            maxDepth: 3,
            excludePatterns: ['node_modules/**']
          },
          cacheStrategy: {
            global: true,
            perPackage: true,
            sharedCache: true,
            cacheKey: 'monorepo-${{ hashFiles(\'**/package-lock.json\') }}',
            restoreKeys: ['monorepo-']
          }
        }
      };

      const workflows = await generator.generateAdvancedPatternWorkflows(
        mockDetectionResult,
        patternConfig
      );

      expect(workflows).toBeDefined();
      expect(workflows.length).toBeGreaterThan(0);
      
      const monorepoWorkflow = workflows.find(w => w.filename.includes('monorepo'));
      expect(monorepoWorkflow).toBeDefined();
      expect(monorepoWorkflow?.metadata.optimizations).toContain('Advanced pattern: monorepo');
    });

    it('should generate microservices workflows', async () => {
      const patternConfig: AdvancedPatternConfig = {
        type: 'microservices',
        microservices: {
          services: [
            {
              name: 'user-service',
              path: 'services/user',
              framework: 'Express',
              port: 3001,
              dependencies: [],
              healthCheckPath: '/health',
              deploymentStrategy: 'rolling',
              resources: {
                cpu: '100m',
                memory: '128Mi',
                replicas: 2
              }
            },
            {
              name: 'order-service',
              path: 'services/order',
              framework: 'Express',
              port: 3002,
              dependencies: ['user-service'],
              healthCheckPath: '/health',
              deploymentStrategy: 'blue-green',
              resources: {
                cpu: '200m',
                memory: '256Mi',
                replicas: 3
              }
            }
          ],
          deploymentOrder: ['user-service', 'order-service'],
          healthChecks: [
            {
              name: 'user-service-health',
              url: 'http://user-service:3001/health',
              method: 'GET',
              expectedStatus: 200,
              timeout: 30,
              retries: 3,
              interval: 10
            }
          ],
          serviceDiscovery: {
            enabled: true,
            provider: 'kubernetes',
            endpoint: 'http://kubernetes.default.svc',
            healthCheckInterval: 30
          },
          coordination: {
            strategy: 'dependency-based',
            rollbackOnFailure: true,
            maxConcurrency: 2,
            timeout: 600
          }
        }
      };

      const workflows = await generator.generateAdvancedPatternWorkflows(
        mockDetectionResult,
        patternConfig
      );

      expect(workflows).toBeDefined();
      expect(workflows.length).toBeGreaterThan(0);
      
      const microservicesWorkflow = workflows.find(w => w.filename.includes('microservices'));
      expect(microservicesWorkflow).toBeDefined();
      expect(microservicesWorkflow?.metadata.optimizations).toContain('Advanced pattern: microservices');
    });
  });

  describe('Multi-Environment Generation', () => {
    it('should generate multi-environment deployment workflows', async () => {
      const environments = [
        {
          name: 'development',
          type: 'development' as const,
          approvalRequired: false,
          secrets: ['DEV_API_KEY'],
          variables: { NODE_ENV: 'development', API_URL: 'https://dev-api.example.com' },
          deploymentStrategy: 'rolling' as const,
          rollbackEnabled: true
        },
        {
          name: 'staging',
          type: 'staging' as const,
          approvalRequired: true,
          secrets: ['STAGING_API_KEY'],
          variables: { NODE_ENV: 'staging', API_URL: 'https://staging-api.example.com' },
          deploymentStrategy: 'blue-green' as const,
          rollbackEnabled: true
        },
        {
          name: 'production',
          type: 'production' as const,
          approvalRequired: true,
          secrets: ['PROD_API_KEY'],
          variables: { NODE_ENV: 'production', API_URL: 'https://api.example.com' },
          deploymentStrategy: 'canary' as const,
          rollbackEnabled: true
        }
      ];

      const workflows = await generator.generateMultiEnvironmentWorkflows(
        mockDetectionResult,
        environments
      );

      expect(workflows).toBeDefined();
      expect(workflows.length).toBeGreaterThan(0);
      
      // Should have workflows for each environment plus promotion and rollback
      expect(workflows.length).toBeGreaterThanOrEqual(environments.length);
      
      const productionWorkflow = workflows.find(w => w.filename.includes('production'));
      expect(productionWorkflow).toBeDefined();
      expect(productionWorkflow?.metadata.optimizations).toContain('Multi-environment deployment configured');
    });
  });

  describe('Agent Hooks Integration', () => {
    it('should generate Agent Hooks workflows when enabled', async () => {
      const options: GenerationOptions = {
        workflowType: 'ci',
        optimizationLevel: 'standard',
        includeComments: true,
        securityLevel: 'standard',
        agentHooksEnabled: true,
        environmentManagement: {
          includeSecretValidation: true,
          includeOIDC: true,
          includeConfigGeneration: true,
          generateEnvFiles: true,
          autoDetectSecrets: true
        }
      };

      const workflows = await generator.generateAgentHooksWorkflows(
        mockDetectionResult,
        options
      );

      expect(workflows).toBeDefined();
      expect(workflows.length).toBeGreaterThan(0);
      
      const agentHooksWorkflow = workflows.find(w => w.filename.includes('agent-hooks'));
      expect(agentHooksWorkflow).toBeDefined();
      expect(agentHooksWorkflow?.metadata.optimizations).toContain('webhook-automation');
    });
  });

  describe('Advanced Security Workflows', () => {
    it('should generate advanced security workflows for enterprise level', async () => {
      const options: GenerationOptions = {
        workflowType: 'security',
        optimizationLevel: 'aggressive',
        includeComments: true,
        securityLevel: 'enterprise',
        agentHooksEnabled: false,
        environmentManagement: {
          includeSecretValidation: true,
          includeOIDC: true,
          includeConfigGeneration: true,
          generateEnvFiles: true,
          autoDetectSecrets: true
        }
      };

      const workflows = await generator.generateAdvancedSecurityWorkflows(
        mockDetectionResult,
        options
      );

      expect(workflows).toBeDefined();
      expect(workflows.length).toBeGreaterThan(0);
      
      const securityWorkflow = workflows[0];
      expect(securityWorkflow).toBeDefined();
      expect(securityWorkflow.type).toBe('security');
    });
  });

  describe('Monitoring Workflows', () => {
    it('should generate monitoring workflows when configured', async () => {
      const options: GenerationOptions = {
        workflowType: 'ci',
        optimizationLevel: 'standard',
        includeComments: true,
        securityLevel: 'standard',
        agentHooksEnabled: false,
        monitoringConfig: {
          performanceTracking: true,
          alerting: {
            enabled: true,
            channels: ['slack'],
            thresholds: { errorRate: 5, responseTime: 1000 }
          },
          dashboards: [
            {
              name: 'CI/CD Dashboard',
              type: 'grafana',
              metrics: ['build_time', 'test_success_rate']
            }
          ],
          slaTracking: {
            enabled: true,
            targets: { availability: 99.9, responseTime: 500 }
          },
          logAggregation: {
            enabled: true,
            level: 'info',
            format: 'json'
          }
        },
        environmentManagement: {
          includeSecretValidation: true,
          includeOIDC: true,
          includeConfigGeneration: true,
          generateEnvFiles: true,
          autoDetectSecrets: true
        }
      };

      const workflows = await generator.generateMonitoringWorkflows(
        mockDetectionResult,
        options
      );

      expect(workflows).toBeDefined();
      expect(workflows.length).toBe(1);
      
      const monitoringWorkflow = workflows[0];
      expect(monitoringWorkflow).toBeDefined();
      expect(monitoringWorkflow.metadata.optimizations).toContain('Performance monitoring enabled');
    });
  });

  describe('Advanced Testing Workflows', () => {
    it('should generate advanced testing workflows', async () => {
      const options: GenerationOptions = {
        workflowType: 'ci',
        optimizationLevel: 'standard',
        includeComments: true,
        securityLevel: 'standard',
        agentHooksEnabled: false,
        testingStrategy: {
          unitTests: true,
          integrationTests: true,
          e2eTests: true,
          performanceTests: true,
          securityTests: true,
          contractTests: true,
          chaosEngineering: true
        },
        environmentManagement: {
          includeSecretValidation: true,
          includeOIDC: true,
          includeConfigGeneration: true,
          generateEnvFiles: true,
          autoDetectSecrets: true
        }
      };

      const workflows = await generator.generateAdvancedTestingWorkflows(
        mockDetectionResult,
        options
      );

      expect(workflows).toBeDefined();
      expect(workflows.length).toBeGreaterThan(0);
      
      const testingWorkflow = workflows[0];
      expect(testingWorkflow).toBeDefined();
    });
  });

  describe('Complex Workflow Validation', () => {
    it('should validate complex workflows with enhanced validator', async () => {
      const yamlContent = `
name: Complex Workflow
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: npm test
  deploy:
    needs: test
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        run: npm run deploy
`;

      const validationResult = await generator.validateComplexWorkflow(yamlContent, {
        type: 'multi-environment',
        environments: ['production']
      });

      expect(validationResult).toBeDefined();
      expect(validationResult.isValid).toBeDefined();
      expect(validationResult.errors).toBeDefined();
      expect(validationResult.warnings).toBeDefined();
      expect(validationResult.suggestions).toBeDefined();
    });
  });

  describe('Complete Workflow Suite Generation', () => {
    it('should generate complete workflow suite with all advanced features', async () => {
      const options: GenerationOptions = {
        workflowType: 'ci',
        optimizationLevel: 'aggressive',
        includeComments: true,
        securityLevel: 'enterprise',
        agentHooksEnabled: true,
        environments: [
          {
            name: 'production',
            type: 'production',
            approvalRequired: true,
            secrets: ['PROD_SECRET'],
            variables: { NODE_ENV: 'production' },
            deploymentStrategy: 'canary',
            rollbackEnabled: true
          }
        ],
        monitoringConfig: {
          performanceTracking: true,
          alerting: {
            enabled: true,
            channels: ['slack'],
            thresholds: { errorRate: 5 }
          },
          dashboards: [],
          slaTracking: {
            enabled: true,
            targets: { availability: 99.9 }
          },
          logAggregation: {
            enabled: true,
            level: 'info',
            format: 'json'
          }
        },
        testingStrategy: {
          unitTests: true,
          integrationTests: true,
          e2eTests: true,
          performanceTests: true,
          securityTests: true,
          contractTests: false,
          chaosEngineering: false
        },
        environmentManagement: {
          includeSecretValidation: true,
          includeOIDC: true,
          includeConfigGeneration: true,
          generateEnvFiles: true,
          autoDetectSecrets: true
        }
      };

      const workflows = await generator.generateCompleteWorkflowSuite(
        mockDetectionResult,
        options
      );

      expect(workflows).toBeDefined();
      expect(workflows.length).toBeGreaterThan(0);
      
      // Should include CI, CD, release, and maintenance workflows
      const workflowTypes = workflows.map(w => w.type);
      expect(workflowTypes).toContain('ci');
      expect(workflowTypes).toContain('cd');
      
      // Verify advanced features are applied
      const ciWorkflow = workflows.find(w => w.type === 'ci');
      expect(ciWorkflow?.metadata.optimizations).toContain('Agent Hooks integration enabled');
      expect(ciWorkflow?.metadata.optimizations).toContain('Advanced security level: enterprise');
    });
  });

  describe('Generator Statistics and Metadata', () => {
    it('should provide comprehensive generation statistics', async () => {
      const workflows = await generator.generateCompleteWorkflowSuite(
        mockDetectionResult
      );

      const stats = generator.getGenerationStatistics(workflows);

      expect(stats).toBeDefined();
      expect(stats.totalWorkflows).toBe(workflows.length);
      expect(stats.generatorVersion).toBe('2.0.0');
      expect(stats.totalOptimizations).toBeGreaterThan(0);
      expect(stats.workflowTypes).toBeDefined();
    });
  });

  describe('Advanced Generator Access', () => {
    it('should provide access to all advanced generators', () => {
      expect(generator.getAdvancedPatternGenerator()).toBeDefined();
      expect(generator.getAdvancedSecurityGenerator()).toBeDefined();
      expect(generator.getAgentHooksIntegration()).toBeDefined();
      expect(generator.getMonitoringGenerator()).toBeDefined();
      expect(generator.getMultiEnvironmentGenerator()).toBeDefined();
      expect(generator.getTestingStrategyGenerator()).toBeDefined();
      expect(generator.getEnhancedValidator()).toBeDefined();
    });
  });
});