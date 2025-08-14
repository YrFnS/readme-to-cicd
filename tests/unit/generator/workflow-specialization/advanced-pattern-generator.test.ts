/**
 * Tests for Advanced Pattern Generator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  AdvancedPatternGenerator,
  AdvancedPatternConfig,
  MonorepoConfig,
  MicroservicesConfig,
  FeatureFlagConfig,
  CanaryConfig,
  OrchestrationConfig
} from '../../../../src/generator/workflow-specialization/advanced-pattern-generator';
import { DetectionResult, GenerationOptions } from '../../../../src/generator/interfaces';

describe('AdvancedPatternGenerator', () => {
  let generator: AdvancedPatternGenerator;
  let mockDetectionResult: DetectionResult;
  let mockOptions: GenerationOptions;

  beforeEach(() => {
    generator = new AdvancedPatternGenerator();
    
    mockDetectionResult = {
      frameworks: [
        {
          name: 'React',
          version: '18.0.0',
          confidence: 0.95,
          evidence: ['package.json', 'src/App.jsx'],
          category: 'frontend'
        }
      ],
      languages: [
        {
          name: 'JavaScript',
          version: 'ES2022',
          confidence: 0.9,
          primary: true
        }
      ],
      buildTools: [
        {
          name: 'Vite',
          configFile: 'vite.config.js',
          confidence: 0.85
        }
      ],
      packageManagers: [
        {
          name: 'npm',
          lockFile: 'package-lock.json',
          confidence: 0.9
        }
      ],
      testingFrameworks: [
        {
          name: 'Vitest',
          type: 'unit',
          confidence: 0.8
        }
      ],
      deploymentTargets: [
        {
          platform: 'Vercel',
          type: 'static',
          confidence: 0.7
        }
      ],
      projectMetadata: {
        name: 'test-project',
        description: 'A test project',
        version: '1.0.0'
      }
    };

    mockOptions = {
      workflowType: 'ci',
      optimizationLevel: 'standard',
      includeComments: true,
      securityLevel: 'standard'
    };
  });

  describe('generateAdvancedPatterns', () => {
    it('should throw error for unsupported pattern type', async () => {
      const config: AdvancedPatternConfig = {
        type: 'unsupported' as any
      };

      await expect(
        generator.generateAdvancedPatterns(mockDetectionResult, config, mockOptions)
      ).rejects.toThrow('Unsupported advanced pattern type: unsupported');
    });

    it('should generate monorepo workflows', async () => {
      const monorepoConfig: MonorepoConfig = {
        packages: [
          {
            name: 'frontend',
            path: 'packages/frontend',
            framework: 'react',
            dependencies: [],
            buildCommand: 'npm run build',
            testCommand: 'npm test',
            deployable: true
          },
          {
            name: 'backend',
            path: 'packages/backend',
            framework: 'express',
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
      };

      const config: AdvancedPatternConfig = {
        type: 'monorepo',
        monorepo: monorepoConfig
      };

      const workflows = await generator.generateAdvancedPatterns(
        mockDetectionResult, 
        config, 
        mockOptions
      );

      expect(workflows).toHaveLength(4); // CI + Selective Build + 2 Package workflows
      
      // Check main CI workflow
      const ciWorkflow = workflows.find(w => w.name === 'Monorepo CI');
      expect(ciWorkflow).toBeDefined();
      expect(ciWorkflow?.type).toBe('ci');
      expect(ciWorkflow?.jobs).toHaveLength(3); // detect-changes + 2 build jobs
      
      // Check selective build workflow
      const selectiveWorkflow = workflows.find(w => w.name === 'Selective Build');
      expect(selectiveWorkflow).toBeDefined();
      expect(selectiveWorkflow?.triggers.workflowDispatch).toBeDefined();
    });

    it('should generate microservices workflows', async () => {
      const microservicesConfig: MicroservicesConfig = {
        services: [
          {
            name: 'user-service',
            path: 'services/user',
            framework: 'express',
            port: 3001,
            dependencies: [],
            healthCheckPath: '/health',
            deploymentStrategy: 'rolling',
            resources: {
              cpu: '500m',
              memory: '512Mi',
              replicas: 2
            }
          },
          {
            name: 'order-service',
            path: 'services/order',
            framework: 'express',
            port: 3002,
            dependencies: ['user-service'],
            healthCheckPath: '/health',
            deploymentStrategy: 'blue-green',
            resources: {
              cpu: '1000m',
              memory: '1Gi',
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
            timeout: 5000,
            retries: 3,
            interval: 30000
          }
        ],
        serviceDiscovery: {
          enabled: true,
          provider: 'kubernetes',
          endpoint: 'http://kubernetes.default.svc',
          healthCheckInterval: 30000
        },
        coordination: {
          strategy: 'dependency-based',
          rollbackOnFailure: true,
          maxConcurrency: 2,
          timeout: 600000
        }
      };

      const config: AdvancedPatternConfig = {
        type: 'microservices',
        microservices: microservicesConfig
      };

      const workflows = await generator.generateAdvancedPatterns(
        mockDetectionResult, 
        config, 
        mockOptions
      );

      expect(workflows).toHaveLength(3); // Deployment + Health Check + Coordination
      
      const deploymentWorkflow = workflows.find(w => w.name === 'Microservices Deployment');
      expect(deploymentWorkflow).toBeDefined();
      expect(deploymentWorkflow?.jobs).toHaveLength(3); // resolve-dependencies + 2 deploy jobs
    });

    it('should generate feature flag workflows', async () => {
      const featureFlagConfig: FeatureFlagConfig = {
        provider: 'launchdarkly',
        flags: [
          {
            name: 'new-checkout-flow',
            key: 'new-checkout-flow',
            environments: ['development', 'staging', 'production'],
            rolloutPercentage: 10,
            dependencies: []
          }
        ],
        deploymentStrategy: {
          type: 'gradual',
          rolloutSteps: [
            {
              percentage: 10,
              duration: 300,
              criteria: [
                {
                  metric: 'error_rate',
                  threshold: 0.01,
                  operator: 'lt'
                }
              ]
            },
            {
              percentage: 50,
              duration: 600,
              criteria: [
                {
                  metric: 'response_time',
                  threshold: 500,
                  operator: 'lt'
                }
              ]
            }
          ],
          monitoringPeriod: 1800,
          autoRollback: true
        },
        rollbackTriggers: [
          {
            metric: 'error_rate',
            threshold: 0.05,
            duration: 300,
            action: 'rollback'
          }
        ]
      };

      const config: AdvancedPatternConfig = {
        type: 'feature-flags',
        featureFlags: featureFlagConfig
      };

      const workflows = await generator.generateAdvancedPatterns(
        mockDetectionResult, 
        config, 
        mockOptions
      );

      expect(workflows).toHaveLength(3); // Deployment + Rollback + Monitoring
      
      const deploymentWorkflow = workflows.find(w => w.name === 'Feature Flag Deployment');
      expect(deploymentWorkflow).toBeDefined();
      expect(deploymentWorkflow?.triggers.workflowDispatch).toBeDefined();
    });

    it('should generate canary deployment workflows', async () => {
      const canaryConfig: CanaryConfig = {
        stages: [
          {
            name: 'canary-5',
            trafficPercentage: 5,
            duration: 300,
            successCriteria: [
              {
                metric: 'success_rate',
                threshold: 0.99,
                operator: 'gte',
                duration: 300
              }
            ],
            rollbackCriteria: [
              {
                metric: 'error_rate',
                threshold: 0.01,
                operator: 'gte',
                duration: 60
              }
            ]
          },
          {
            name: 'canary-25',
            trafficPercentage: 25,
            duration: 600,
            successCriteria: [
              {
                metric: 'success_rate',
                threshold: 0.99,
                operator: 'gte',
                duration: 600
              }
            ],
            rollbackCriteria: [
              {
                metric: 'error_rate',
                threshold: 0.01,
                operator: 'gte',
                duration: 120
              }
            ]
          }
        ],
        metrics: [
          {
            name: 'error_rate',
            source: 'prometheus',
            query: 'rate(http_requests_total{status=~"5.."}[5m])',
            threshold: 0.01,
            unit: 'percentage'
          }
        ],
        rollbackTriggers: [
          {
            metric: 'error_rate',
            threshold: 0.05,
            duration: 300,
            action: 'rollback'
          }
        ],
        trafficSplitting: {
          strategy: 'percentage',
          rules: [
            {
              condition: 'canary',
              percentage: 5,
              target: 'canary'
            }
          ]
        },
        monitoring: {
          enabled: true,
          dashboardUrl: 'https://grafana.example.com/canary',
          alertChannels: ['slack', 'email'],
          metricsRetention: 86400
        }
      };

      const config: AdvancedPatternConfig = {
        type: 'canary',
        canary: canaryConfig
      };

      const workflows = await generator.generateAdvancedPatterns(
        mockDetectionResult, 
        config, 
        mockOptions
      );

      expect(workflows).toHaveLength(3); // Deployment + Monitoring + Promotion
      
      const canaryWorkflow = workflows.find(w => w.name === 'Canary Deployment');
      expect(canaryWorkflow).toBeDefined();
      expect(canaryWorkflow?.jobs).toHaveLength(5); // deploy-canary + 2 stages + 2 validation jobs
    });

    it('should generate orchestration workflows', async () => {
      const orchestrationConfig: OrchestrationConfig = {
        parentWorkflow: {
          name: 'Main Orchestration',
          triggers: {
            push: {
              branches: ['main']
            }
          },
          strategy: 'sequential',
          timeout: 3600
        },
        childWorkflows: [
          {
            name: 'build-workflow',
            workflow: 'build.yml',
            inputs: {
              environment: 'production'
            },
            dependencies: [],
            timeout: 1800
          },
          {
            name: 'test-workflow',
            workflow: 'test.yml',
            inputs: {
              test_suite: 'full'
            },
            dependencies: ['build-workflow'],
            timeout: 2400
          }
        ],
        coordination: {
          strategy: 'wait-all',
          maxConcurrency: 2,
          retryPolicy: {
            enabled: true,
            maxAttempts: 3,
            backoffStrategy: 'exponential',
            initialDelay: 30,
            maxDelay: 300
          }
        },
        errorHandling: {
          strategy: 'fail-fast',
          notifications: [
            {
              channel: 'slack',
              endpoint: 'https://hooks.slack.com/webhook',
              conditions: ['failure', 'timeout']
            }
          ],
          rollbackEnabled: true
        }
      };

      const config: AdvancedPatternConfig = {
        type: 'orchestration',
        orchestration: orchestrationConfig
      };

      const workflows = await generator.generateAdvancedPatterns(
        mockDetectionResult, 
        config, 
        mockOptions
      );

      expect(workflows).toHaveLength(3); // Parent + Coordination + Error Handling
      
      const parentWorkflow = workflows.find(w => w.name === 'Main Orchestration');
      expect(parentWorkflow).toBeDefined();
      expect(parentWorkflow?.jobs).toHaveLength(3); // plan + 2 execute jobs
    });
  });

  describe('workflow validation', () => {
    it('should generate valid workflow structures', async () => {
      const monorepoConfig: MonorepoConfig = {
        packages: [
          {
            name: 'app',
            path: 'packages/app',
            framework: 'react',
            dependencies: [],
            buildCommand: 'npm run build',
            testCommand: 'npm test',
            deployable: true
          }
        ],
        sharedDependencies: [],
        buildOrder: ['app'],
        pathTriggers: [],
        selectiveBuilds: {
          enabled: false,
          strategy: 'all',
          changeDetection: 'git-diff',
          baseRef: 'main'
        },
        dependencyGraph: {
          enabled: false,
          includeDevDependencies: false,
          maxDepth: 1,
          excludePatterns: []
        },
        cacheStrategy: {
          global: false,
          perPackage: true,
          sharedCache: false,
          cacheKey: 'cache-key',
          restoreKeys: []
        }
      };

      const config: AdvancedPatternConfig = {
        type: 'monorepo',
        monorepo: monorepoConfig
      };

      const workflows = await generator.generateAdvancedPatterns(
        mockDetectionResult, 
        config, 
        mockOptions
      );

      // Validate workflow structure
      workflows.forEach(workflow => {
        expect(workflow.name).toBeDefined();
        expect(workflow.type).toBeDefined();
        expect(workflow.triggers).toBeDefined();
        expect(workflow.jobs).toBeDefined();
        expect(Array.isArray(workflow.jobs)).toBe(true);
        
        // Validate job structure
        workflow.jobs.forEach(job => {
          expect(job.name).toBeDefined();
          expect(job.runsOn).toBeDefined();
          expect(job.steps).toBeDefined();
          expect(Array.isArray(job.steps)).toBe(true);
          
          // Validate step structure
          job.steps.forEach(step => {
            expect(step.name).toBeDefined();
            expect(step.uses || step.run).toBeDefined();
          });
        });
      });
    });
  });
});