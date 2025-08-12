/**
 * Integration tests for MultiEnvironmentGenerator
 * Tests complete workflow generation with real-world scenarios
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MultiEnvironmentGenerator } from '../../src/generator/workflow-specialization/multi-environment-generator';
import { EnvironmentManager } from '../../src/generator/environment-manager';
import { EnvironmentConfig, DetectionResult } from '../../src/generator/interfaces';
import * as yaml from 'js-yaml';

describe('MultiEnvironmentGenerator Integration', () => {
  let generator: MultiEnvironmentGenerator;
  let environmentManager: EnvironmentManager;

  beforeEach(() => {
    environmentManager = new EnvironmentManager();
    generator = new MultiEnvironmentGenerator(environmentManager);
  });

  describe('Real-world scenarios', () => {
    it('should generate complete multi-environment workflow for React application', async () => {
      const environments: EnvironmentConfig[] = [
        {
          name: 'development',
          type: 'development',
          approvalRequired: false,
          secrets: ['REACT_APP_API_URL', 'DATABASE_URL'],
          variables: {
            NODE_ENV: 'development',
            DEPLOYMENT_URL: 'https://dev-app.example.com',
            HEALTH_ENDPOINT: 'https://dev-app.example.com/health'
          },
          deploymentStrategy: 'rolling',
          rollbackEnabled: true
        },
        {
          name: 'staging',
          type: 'staging',
          approvalRequired: true,
          secrets: ['REACT_APP_API_URL', 'DATABASE_URL', 'JWT_SECRET'],
          variables: {
            NODE_ENV: 'staging',
            DEPLOYMENT_URL: 'https://staging-app.example.com',
            HEALTH_ENDPOINT: 'https://staging-app.example.com/health'
          },
          deploymentStrategy: 'blue-green',
          rollbackEnabled: true
        },
        {
          name: 'production',
          type: 'production',
          approvalRequired: true,
          secrets: ['REACT_APP_API_URL', 'DATABASE_URL', 'JWT_SECRET'],
          variables: {
            NODE_ENV: 'production',
            DEPLOYMENT_URL: 'https://app.example.com',
            HEALTH_ENDPOINT: 'https://app.example.com/health'
          },
          deploymentStrategy: 'canary',
          rollbackEnabled: true
        }
      ];

      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'React',
            version: '18.2.0',
            confidence: 0.95,
            evidence: ['package.json', 'src/App.jsx', 'public/index.html'],
            category: 'frontend'
          }
        ],
        languages: [
          {
            name: 'JavaScript',
            version: 'ES2022',
            confidence: 0.9,
            primary: true
          },
          {
            name: 'TypeScript',
            version: '5.0.0',
            confidence: 0.8,
            primary: false
          }
        ],
        buildTools: [
          {
            name: 'Vite',
            configFile: 'vite.config.js',
            confidence: 0.9
          }
        ],
        packageManagers: [
          {
            name: 'npm',
            lockFile: 'package-lock.json',
            confidence: 0.95
          }
        ],
        testingFrameworks: [
          {
            name: 'Vitest',
            type: 'unit',
            confidence: 0.8
          },
          {
            name: 'Cypress',
            type: 'e2e',
            confidence: 0.7
          }
        ],
        deploymentTargets: [
          {
            platform: 'AWS S3',
            type: 'static',
            confidence: 0.8
          }
        ],
        projectMetadata: {
          name: 'react-app',
          description: 'A modern React application',
          version: '2.1.0',
          repository: 'https://github.com/example/react-app'
        }
      };

      const result = generator.generateMultiEnvironmentWorkflows(
        environments,
        detectionResult
      );

      // Verify basic structure
      expect(result.workflows).toHaveLength(5);
      expect(result.environmentConfigs).toHaveLength(3);
      expect(result.deploymentStrategies.size).toBe(3);
      expect(result.approvalGates).toHaveLength(2);
      expect(result.promotionPipelines).toHaveLength(2);
      expect(result.rollbackConfigs.size).toBe(3);

      // Verify each environment workflow can be serialized to valid YAML
      const envWorkflows = result.workflows.filter(w => w.name.startsWith('Deploy to'));
      for (const workflow of envWorkflows) {
        expect(() => yaml.dump(workflow)).not.toThrow();
        
        // Verify workflow structure
        expect(workflow.name).toBeDefined();
        expect(workflow.type).toBe('cd');
        expect(workflow.jobs).toBeDefined();
        expect(workflow.jobs.length).toBeGreaterThan(0);
        expect(workflow.permissions).toBeDefined();
        expect(workflow.triggers).toBeDefined();
      }

      // Verify promotion workflow
      const promotionWorkflow = result.workflows.find(w => w.name === 'Environment Promotion Pipeline');
      expect(promotionWorkflow).toBeDefined();
      expect(promotionWorkflow?.jobs).toHaveLength(2);
      expect(() => yaml.dump(promotionWorkflow)).not.toThrow();

      // Verify rollback workflow
      const rollbackWorkflow = result.workflows.find(w => w.name === 'Emergency Rollback');
      expect(rollbackWorkflow).toBeDefined();
      expect(rollbackWorkflow?.jobs).toHaveLength(3);
      expect(() => yaml.dump(rollbackWorkflow)).not.toThrow();
    });

    it('should generate complete multi-environment workflow for Node.js API', async () => {
      const environments: EnvironmentConfig[] = [
        {
          name: 'dev',
          type: 'development',
          approvalRequired: false,
          secrets: ['DATABASE_URL', 'JWT_SECRET', 'API_KEY'],
          variables: {
            NODE_ENV: 'development',
            PORT: '3000',
            DEPLOYMENT_URL: 'https://api-dev.example.com'
          },
          deploymentStrategy: 'rolling',
          rollbackEnabled: true
        },
        {
          name: 'prod',
          type: 'production',
          approvalRequired: true,
          secrets: ['DATABASE_URL', 'JWT_SECRET', 'API_KEY', 'REDIS_URL'],
          variables: {
            NODE_ENV: 'production',
            PORT: '8080',
            DEPLOYMENT_URL: 'https://api.example.com'
          },
          deploymentStrategy: 'blue-green',
          rollbackEnabled: true
        }
      ];

      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'Express',
            version: '4.18.0',
            confidence: 0.9,
            evidence: ['package.json', 'app.js', 'routes/'],
            category: 'backend'
          }
        ],
        languages: [
          {
            name: 'JavaScript',
            version: 'ES2022',
            confidence: 0.95,
            primary: true
          }
        ],
        buildTools: [],
        packageManagers: [
          {
            name: 'npm',
            lockFile: 'package-lock.json',
            confidence: 0.9
          }
        ],
        testingFrameworks: [
          {
            name: 'Jest',
            type: 'unit',
            confidence: 0.8
          },
          {
            name: 'Supertest',
            type: 'integration',
            confidence: 0.7
          }
        ],
        deploymentTargets: [
          {
            platform: 'Docker',
            type: 'container',
            confidence: 0.9
          }
        ],
        projectMetadata: {
          name: 'express-api',
          description: 'RESTful API built with Express.js',
          version: '1.5.2'
        }
      };

      const result = generator.generateMultiEnvironmentWorkflows(
        environments,
        detectionResult
      );

      // Verify structure for 2-environment setup
      expect(result.workflows).toHaveLength(4); // 2 env + 1 promotion + 1 rollback
      expect(result.environmentConfigs).toHaveLength(2);
      expect(result.promotionPipelines).toHaveLength(1); // dev to prod

      // Verify Node.js specific deployment steps
      const devWorkflow = result.workflows.find(w => w.name === 'Deploy to dev');
      expect(devWorkflow).toBeDefined();
      
      const deployJob = devWorkflow?.jobs.find(job => job.name === 'deploy-dev');
      expect(deployJob).toBeDefined();
      
      // Should have Node.js setup step
      const nodeSetup = deployJob?.steps.find(step => step.uses === 'actions/setup-node@v4');
      expect(nodeSetup).toBeDefined();
      
      // Should have npm install step
      const npmInstall = deployJob?.steps.find(step => step.run === 'npm ci');
      expect(npmInstall).toBeDefined();
      
      // Should have build step
      const buildStep = deployJob?.steps.find(step => step.run?.includes('npm run build'));
      expect(buildStep).toBeDefined();
    });

    it('should handle complex promotion pipeline with multiple conditions', async () => {
      const environments: EnvironmentConfig[] = [
        {
          name: 'dev',
          type: 'development',
          approvalRequired: false,
          secrets: ['DB_URL'],
          variables: { NODE_ENV: 'development' },
          deploymentStrategy: 'rolling',
          rollbackEnabled: true
        },
        {
          name: 'staging',
          type: 'staging',
          approvalRequired: true,
          secrets: ['DB_URL', 'API_KEY'],
          variables: { NODE_ENV: 'staging' },
          deploymentStrategy: 'blue-green',
          rollbackEnabled: true
        },
        {
          name: 'production',
          type: 'production',
          approvalRequired: true,
          secrets: ['DB_URL', 'API_KEY', 'JWT_SECRET'],
          variables: { NODE_ENV: 'production' },
          deploymentStrategy: 'canary',
          rollbackEnabled: true
        }
      ];

      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'Next.js',
            version: '13.4.0',
            confidence: 0.9,
            evidence: ['next.config.js', 'pages/', 'app/'],
            category: 'fullstack'
          }
        ],
        languages: [
          {
            name: 'TypeScript',
            version: '5.0.0',
            confidence: 0.95,
            primary: true
          }
        ],
        buildTools: [],
        packageManagers: [
          {
            name: 'pnpm',
            lockFile: 'pnpm-lock.yaml',
            confidence: 0.9
          }
        ],
        testingFrameworks: [
          {
            name: 'Jest',
            type: 'unit',
            confidence: 0.8
          }
        ],
        deploymentTargets: [
          {
            platform: 'Vercel',
            type: 'serverless',
            confidence: 0.9
          }
        ],
        projectMetadata: {
          name: 'nextjs-app',
          description: 'Full-stack Next.js application'
        }
      };

      const result = generator.generateMultiEnvironmentWorkflows(
        environments,
        detectionResult
      );

      // Verify promotion pipeline structure
      expect(result.promotionPipelines).toHaveLength(2);
      
      // Check dev to staging promotion
      const devToStaging = result.promotionPipelines.find(
        p => p.sourceEnvironment === 'dev' && p.targetEnvironment === 'staging'
      );
      expect(devToStaging).toBeDefined();
      expect(devToStaging?.conditions).toBeDefined();
      expect(devToStaging?.conditions.length).toBeGreaterThan(0);
      expect(devToStaging?.autoPromote).toBe(true);

      // Check staging to production promotion
      const stagingToProd = result.promotionPipelines.find(
        p => p.sourceEnvironment === 'staging' && p.targetEnvironment === 'production'
      );
      expect(stagingToProd).toBeDefined();
      expect(stagingToProd?.conditions).toBeDefined();
      expect(stagingToProd?.autoPromote).toBe(false);
      
      // Production promotion should have manual approval condition
      const hasManualApproval = stagingToProd?.conditions.some(c => c.type === 'manual_approval');
      expect(hasManualApproval).toBe(true);
      
      // Production promotion should have time delay condition
      const hasTimeDelay = stagingToProd?.conditions.some(c => c.type === 'time_delay');
      expect(hasTimeDelay).toBe(true);

      // Verify promotion workflow jobs
      const promotionWorkflow = result.workflows.find(w => w.name === 'Environment Promotion Pipeline');
      expect(promotionWorkflow).toBeDefined();
      expect(promotionWorkflow?.jobs).toHaveLength(2);
      
      // Check that promotion jobs have proper conditions
      for (const job of promotionWorkflow?.jobs || []) {
        expect(job.if).toBeDefined();
        expect(job.steps.length).toBeGreaterThan(0);
        
        // Should have condition validation steps
        const conditionSteps = job.steps.filter(step => 
          step.name.includes('validation') || 
          step.name.includes('approval') ||
          step.name.includes('delay')
        );
        expect(conditionSteps.length).toBeGreaterThan(0);
      }
    });

    it('should generate valid YAML for all workflow types', async () => {
      const environments: EnvironmentConfig[] = [
        {
          name: 'test',
          type: 'development',
          approvalRequired: false,
          secrets: ['SECRET_KEY'],
          variables: { ENV: 'test' },
          deploymentStrategy: 'rolling',
          rollbackEnabled: true
        }
      ];

      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'Django',
            version: '4.2.0',
            confidence: 0.9,
            evidence: ['manage.py', 'requirements.txt'],
            category: 'backend'
          }
        ],
        languages: [
          {
            name: 'Python',
            version: '3.11',
            confidence: 0.95,
            primary: true
          }
        ],
        buildTools: [],
        packageManagers: [
          {
            name: 'pip',
            lockFile: 'requirements.txt',
            confidence: 0.9
          }
        ],
        testingFrameworks: [
          {
            name: 'pytest',
            type: 'unit',
            confidence: 0.8
          }
        ],
        deploymentTargets: [
          {
            platform: 'Heroku',
            type: 'traditional',
            confidence: 0.8
          }
        ],
        projectMetadata: {
          name: 'django-app',
          description: 'Django web application'
        }
      };

      const result = generator.generateMultiEnvironmentWorkflows(
        environments,
        detectionResult
      );

      // Test that all generated workflows produce valid YAML
      for (const workflow of result.workflows) {
        let yamlContent: string;
        
        expect(() => {
          // Convert workflow template to GitHub Actions format
          const githubWorkflow = {
            name: workflow.name,
            on: workflow.triggers,
            permissions: workflow.permissions,
            jobs: Object.fromEntries(
              workflow.jobs.map(job => [
                job.name,
                {
                  'runs-on': job.runsOn,
                  steps: job.steps,
                  needs: job.needs,
                  if: job.if,
                  environment: job.environment,
                  timeout: job.timeout,
                  strategy: job.strategy,
                  outputs: job.outputs
                }
              ])
            )
          };
          
          yamlContent = yaml.dump(githubWorkflow, {
            indent: 2,
            lineWidth: 120,
            noRefs: true
          });
        }).not.toThrow();

        // Verify the YAML can be parsed back
        expect(() => {
          yaml.load(yamlContent!);
        }).not.toThrow();

        // Verify basic GitHub Actions workflow structure
        const parsed = yaml.load(yamlContent!) as any;
        expect(parsed.name).toBeDefined();
        expect(parsed.on).toBeDefined();
        expect(parsed.jobs).toBeDefined();
        expect(typeof parsed.jobs).toBe('object');
        
        // Verify jobs structure
        for (const [jobName, job] of Object.entries(parsed.jobs)) {
          expect(typeof jobName).toBe('string');
          expect(typeof job).toBe('object');
          expect((job as any)['runs-on']).toBeDefined();
          expect((job as any).steps).toBeDefined();
          expect(Array.isArray((job as any).steps)).toBe(true);
        }
      }
    });
  });

  describe('Performance and scalability', () => {
    it('should handle large number of environments efficiently', async () => {
      const environments: EnvironmentConfig[] = [];
      
      // Generate 10 environments
      for (let i = 1; i <= 10; i++) {
        environments.push({
          name: `env-${i}`,
          type: i <= 3 ? 'development' : i <= 7 ? 'staging' : 'production',
          approvalRequired: i > 7,
          secrets: [`SECRET_${i}`],
          variables: { ENV_ID: i.toString() },
          deploymentStrategy: i % 3 === 0 ? 'canary' : i % 2 === 0 ? 'blue-green' : 'rolling',
          rollbackEnabled: true
        });
      }

      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'React',
            confidence: 0.9,
            evidence: ['package.json'],
            category: 'frontend'
          }
        ],
        languages: [
          {
            name: 'JavaScript',
            confidence: 0.9,
            primary: true
          }
        ],
        buildTools: [],
        packageManagers: [
          {
            name: 'npm',
            confidence: 0.9
          }
        ],
        testingFrameworks: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'large-scale-app'
        }
      };

      const startTime = Date.now();
      const result = generator.generateMultiEnvironmentWorkflows(
        environments,
        detectionResult
      );
      const endTime = Date.now();

      // Should complete within reasonable time (< 1 second)
      expect(endTime - startTime).toBeLessThan(1000);

      // Verify all environments are processed
      expect(result.environmentConfigs).toHaveLength(10);
      expect(result.deploymentStrategies.size).toBe(10);
      expect(result.promotionPipelines.length).toBe(9); // n-1 promotions
      
      // Should generate workflows for all environments plus promotion and rollback
      expect(result.workflows).toHaveLength(12); // 10 env + 1 promotion + 1 rollback
    });
  });
});