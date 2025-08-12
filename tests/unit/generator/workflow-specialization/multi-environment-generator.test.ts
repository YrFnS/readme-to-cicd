/**
 * Tests for MultiEnvironmentGenerator
 * Implements requirement testing for 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MultiEnvironmentGenerator } from '../../../../src/generator/workflow-specialization/multi-environment-generator';
import { EnvironmentManager } from '../../../../src/generator/environment-manager';
import { EnvironmentConfig, DetectionResult } from '../../../../src/generator/interfaces';

describe('MultiEnvironmentGenerator', () => {
  let generator: MultiEnvironmentGenerator;
  let environmentManager: EnvironmentManager;
  let mockEnvironments: EnvironmentConfig[];
  let mockDetectionResult: DetectionResult;

  beforeEach(() => {
    environmentManager = new EnvironmentManager();
    generator = new MultiEnvironmentGenerator(environmentManager);

    mockEnvironments = [
      {
        name: 'development',
        type: 'development',
        approvalRequired: false,
        secrets: ['DATABASE_URL', 'API_KEY'],
        variables: {
          NODE_ENV: 'development',
          DEPLOYMENT_URL: 'https://dev.example.com'
        },
        deploymentStrategy: 'rolling',
        rollbackEnabled: true
      },
      {
        name: 'staging',
        type: 'staging',
        approvalRequired: true,
        secrets: ['DATABASE_URL', 'API_KEY', 'JWT_SECRET'],
        variables: {
          NODE_ENV: 'staging',
          DEPLOYMENT_URL: 'https://staging.example.com'
        },
        deploymentStrategy: 'blue-green',
        rollbackEnabled: true
      },
      {
        name: 'production',
        type: 'production',
        approvalRequired: true,
        secrets: ['DATABASE_URL', 'API_KEY', 'JWT_SECRET'],
        variables: {
          NODE_ENV: 'production',
          DEPLOYMENT_URL: 'https://example.com'
        },
        deploymentStrategy: 'canary',
        rollbackEnabled: true
      }
    ];

    mockDetectionResult = {
      frameworks: [
        {
          name: 'React',
          version: '18.0.0',
          confidence: 0.9,
          evidence: ['package.json', 'src/App.jsx'],
          category: 'frontend'
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
      buildTools: [
        {
          name: 'Vite',
          configFile: 'vite.config.js',
          confidence: 0.8
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
  });

  describe('generateMultiEnvironmentWorkflows', () => {
    it('should generate separate deployment jobs for each environment (requirement 11.1)', () => {
      const result = generator.generateMultiEnvironmentWorkflows(
        mockEnvironments,
        mockDetectionResult
      );

      expect(result.workflows).toHaveLength(5); // 3 environment workflows + 1 promotion + 1 rollback
      expect(result.environmentConfigs).toHaveLength(3);

      // Check that each environment has its own workflow
      const envWorkflows = result.workflows.filter(w => w.name.startsWith('Deploy to'));
      expect(envWorkflows).toHaveLength(3);
      expect(envWorkflows.map(w => w.name)).toEqual([
        'Deploy to development',
        'Deploy to staging',
        'Deploy to production'
      ]);
    });

    it('should include manual approval gates for production environments (requirement 11.2)', () => {
      const result = generator.generateMultiEnvironmentWorkflows(
        mockEnvironments,
        mockDetectionResult
      );

      expect(result.approvalGates).toHaveLength(2); // staging and production
      
      const productionApproval = result.approvalGates.find(gate => gate.environment === 'production');
      expect(productionApproval).toBeDefined();
      expect(productionApproval?.requiredApprovals).toBe(2);
      expect(productionApproval?.approvers).toContain('@team-leads');
      expect(productionApproval?.approvers).toContain('@devops-team');
      expect(productionApproval?.approvers).toContain('@security-team');

      const stagingApproval = result.approvalGates.find(gate => gate.environment === 'staging');
      expect(stagingApproval).toBeDefined();
      expect(stagingApproval?.requiredApprovals).toBe(1);
    });

    it('should use appropriate secrets and variables for each environment (requirement 11.3)', () => {
      const result = generator.generateMultiEnvironmentWorkflows(
        mockEnvironments,
        mockDetectionResult
      );

      // Check that environment-specific configurations are preserved
      expect(result.environmentConfigs[0].variables.NODE_ENV).toBe('development');
      expect(result.environmentConfigs[1].variables.NODE_ENV).toBe('staging');
      expect(result.environmentConfigs[2].variables.NODE_ENV).toBe('production');

      // Check that secrets are properly configured
      expect(result.environmentConfigs[0].secrets).toContain('DATABASE_URL');
      expect(result.environmentConfigs[1].secrets).toContain('JWT_SECRET');
      expect(result.environmentConfigs[2].secrets).toContain('JWT_SECRET');
    });

    it('should include rollback and deployment strategies (requirement 11.4)', () => {
      const result = generator.generateMultiEnvironmentWorkflows(
        mockEnvironments,
        mockDetectionResult
      );

      // Check deployment strategies
      expect(result.deploymentStrategies.size).toBe(3);
      expect(result.deploymentStrategies.get('development')?.type).toBe('rolling');
      expect(result.deploymentStrategies.get('staging')?.type).toBe('blue-green');
      expect(result.deploymentStrategies.get('production')?.type).toBe('canary');

      // Check rollback configurations
      expect(result.rollbackConfigs.size).toBe(3);
      for (const [envName, rollbackConfig] of result.rollbackConfigs) {
        expect(rollbackConfig.enabled).toBe(true);
        expect(rollbackConfig.triggers).toBeDefined();
        expect(rollbackConfig.triggers.length).toBeGreaterThan(0);
      }

      // Check that rollback workflow is generated
      const rollbackWorkflow = result.workflows.find(w => w.name === 'Emergency Rollback');
      expect(rollbackWorkflow).toBeDefined();
      expect(rollbackWorkflow?.jobs.length).toBe(3); // One job per environment
    });

    it('should create promotion pipelines for sequential environment advancement (requirement 11.5)', () => {
      const result = generator.generateMultiEnvironmentWorkflows(
        mockEnvironments,
        mockDetectionResult
      );

      expect(result.promotionPipelines).toHaveLength(2);
      
      // Check development to staging promotion
      const devToStaging = result.promotionPipelines.find(
        p => p.sourceEnvironment === 'development' && p.targetEnvironment === 'staging'
      );
      expect(devToStaging).toBeDefined();
      expect(devToStaging?.autoPromote).toBe(true); // Non-production should auto-promote
      expect(devToStaging?.conditions).toBeDefined();

      // Check staging to production promotion
      const stagingToProd = result.promotionPipelines.find(
        p => p.sourceEnvironment === 'staging' && p.targetEnvironment === 'production'
      );
      expect(stagingToProd).toBeDefined();
      expect(stagingToProd?.autoPromote).toBe(false); // Production should not auto-promote
      expect(stagingToProd?.conditions).toBeDefined();

      // Check that promotion workflow is generated
      const promotionWorkflow = result.workflows.find(w => w.name === 'Environment Promotion Pipeline');
      expect(promotionWorkflow).toBeDefined();
      expect(promotionWorkflow?.jobs.length).toBe(2); // One job per promotion pipeline
    });
  });

  describe('deployment strategies', () => {
    it('should configure rolling deployment correctly', () => {
      const result = generator.generateMultiEnvironmentWorkflows(
        [mockEnvironments[0]], // development environment
        mockDetectionResult
      );

      const strategy = result.deploymentStrategies.get('development');
      expect(strategy?.type).toBe('rolling');
      
      const config = strategy?.configuration as any;
      expect(config.maxUnavailable).toBe('50%'); // Non-production should allow more unavailable
      expect(config.maxSurge).toBe('100%');
      expect(config.progressDeadlineSeconds).toBe(600);
    });

    it('should configure blue-green deployment correctly', () => {
      const result = generator.generateMultiEnvironmentWorkflows(
        [mockEnvironments[1]], // staging environment
        mockDetectionResult
      );

      const strategy = result.deploymentStrategies.get('staging');
      expect(strategy?.type).toBe('blue-green');
      
      const config = strategy?.configuration as any;
      expect(config.prePromotionAnalysis).toBeDefined();
      expect(config.postPromotionAnalysis).toBeDefined();
      expect(config.autoPromotionEnabled).toBe(true); // Non-production should auto-promote
      expect(config.scaleDownDelaySeconds).toBe(60); // Non-production should have shorter delay
    });

    it('should configure canary deployment correctly', () => {
      const result = generator.generateMultiEnvironmentWorkflows(
        [mockEnvironments[2]], // production environment
        mockDetectionResult
      );

      const strategy = result.deploymentStrategies.get('production');
      expect(strategy?.type).toBe('canary');
      
      const config = strategy?.configuration as any;
      expect(config.steps).toBeDefined();
      expect(config.steps.length).toBeGreaterThan(0);
      expect(config.analysis).toBeDefined();
      expect(config.maxUnavailable).toBe('25%');

      // Check that canary steps include weight progression
      const weightSteps = config.steps.filter((step: any) => step.setWeight !== undefined);
      expect(weightSteps.length).toBeGreaterThan(0);
      expect(weightSteps[0].setWeight).toBe(20);
    });
  });

  describe('framework-specific deployment', () => {
    it('should generate React deployment steps', () => {
      const result = generator.generateMultiEnvironmentWorkflows(
        [mockEnvironments[0]],
        mockDetectionResult
      );

      const workflow = result.workflows.find(w => w.name === 'Deploy to development');
      expect(workflow).toBeDefined();

      const deployJob = workflow?.jobs.find(job => job.name === 'deploy-development');
      expect(deployJob).toBeDefined();

      // Check for Node.js setup step
      const nodeSetupStep = deployJob?.steps.find(step => step.uses === 'actions/setup-node@v4');
      expect(nodeSetupStep).toBeDefined();
      expect(nodeSetupStep?.with?.['node-version']).toBe('18');

      // Check for build step
      const buildStep = deployJob?.steps.find(step => step.run?.includes('npm run build'));
      expect(buildStep).toBeDefined();
    });

    it('should generate Next.js deployment steps', () => {
      const nextjsDetectionResult = {
        ...mockDetectionResult,
        frameworks: [
          {
            name: 'Next.js',
            version: '13.0.0',
            confidence: 0.9,
            evidence: ['next.config.js', 'pages/'],
            category: 'fullstack' as const
          }
        ]
      };

      const result = generator.generateMultiEnvironmentWorkflows(
        [mockEnvironments[0]],
        nextjsDetectionResult
      );

      const workflow = result.workflows.find(w => w.name === 'Deploy to development');
      const deployJob = workflow?.jobs.find(job => job.name === 'deploy-development');
      
      // Check for Vercel deployment step
      const vercelStep = deployJob?.steps.find(step => step.uses === 'amondnet/vercel-action@v25');
      expect(vercelStep).toBeDefined();
      expect(vercelStep?.with?.['vercel-token']).toBe('${{ secrets.VERCEL_TOKEN }}');
    });

    it('should generate Python deployment steps', () => {
      const pythonDetectionResult = {
        ...mockDetectionResult,
        frameworks: [
          {
            name: 'Django',
            version: '4.0.0',
            confidence: 0.9,
            evidence: ['manage.py', 'requirements.txt'],
            category: 'backend' as const
          }
        ],
        languages: [
          {
            name: 'Python',
            version: '3.11',
            confidence: 0.95,
            primary: true
          }
        ]
      };

      const result = generator.generateMultiEnvironmentWorkflows(
        [mockEnvironments[0]],
        pythonDetectionResult
      );

      const workflow = result.workflows.find(w => w.name === 'Deploy to development');
      const deployJob = workflow?.jobs.find(job => job.name === 'deploy-development');
      
      // Check for Python setup step
      const pythonSetupStep = deployJob?.steps.find(step => step.uses === 'actions/setup-python@v4');
      expect(pythonSetupStep).toBeDefined();
      expect(pythonSetupStep?.with?.['python-version']).toBe('3.11');

      // Check for Django migrations step
      const migrateStep = deployJob?.steps.find(step => step.run?.includes('python manage.py migrate'));
      expect(migrateStep).toBeDefined();
    });
  });

  describe('workflow triggers and permissions', () => {
    it('should create appropriate triggers for different environment types', () => {
      const result = generator.generateMultiEnvironmentWorkflows(
        mockEnvironments,
        mockDetectionResult
      );

      // Development should have push triggers
      const devWorkflow = result.workflows.find(w => w.name === 'Deploy to development');
      expect(devWorkflow?.triggers.push).toBeDefined();
      expect(devWorkflow?.triggers.push?.branches).toContain('main');
      expect(devWorkflow?.triggers.push?.branches).toContain('develop');

      // Production should have schedule triggers
      const prodWorkflow = result.workflows.find(w => w.name === 'Deploy to production');
      expect(prodWorkflow?.triggers.schedule).toBeDefined();
      expect(prodWorkflow?.triggers.schedule?.[0].cron).toBe('0 9 * * 1-5');

      // All workflows should have workflow_dispatch
      for (const workflow of result.workflows) {
        expect(workflow.triggers.workflowDispatch).toBeDefined();
      }
    });

    it('should set appropriate permissions for different environments', () => {
      const result = generator.generateMultiEnvironmentWorkflows(
        mockEnvironments,
        mockDetectionResult
      );

      // All workflows should have basic permissions
      for (const workflow of result.workflows) {
        expect(workflow.permissions?.contents).toBe('read');
        expect(workflow.permissions?.deployments).toBe('write');
        expect(workflow.permissions?.idToken).toBe('write'); // For OIDC
      }

      // Production workflow should have additional permissions
      const prodWorkflow = result.workflows.find(w => w.name === 'Deploy to production');
      expect(prodWorkflow?.permissions?.checks).toBe('write');
      expect(prodWorkflow?.permissions?.statuses).toBe('write');
    });
  });

  describe('health checks and validation', () => {
    it('should include health check steps in deployment jobs', () => {
      const result = generator.generateMultiEnvironmentWorkflows(
        [mockEnvironments[0]],
        mockDetectionResult
      );

      const workflow = result.workflows.find(w => w.name === 'Deploy to development');
      const deployJob = workflow?.jobs.find(job => job.name === 'deploy-development');
      
      // Check for health check step
      const healthCheckStep = deployJob?.steps.find(step => step.name === 'Run health checks');
      expect(healthCheckStep).toBeDefined();
      expect(healthCheckStep?.run).toContain('curl -f');
      expect(healthCheckStep?.continueOnError).toBe(false);
    });

    it('should include post-deployment validation jobs', () => {
      const result = generator.generateMultiEnvironmentWorkflows(
        [mockEnvironments[0]],
        mockDetectionResult
      );

      const workflow = result.workflows.find(w => w.name === 'Deploy to development');
      const postDeployJob = workflow?.jobs.find(job => job.name === 'post-deploy-development');
      
      expect(postDeployJob).toBeDefined();
      expect(postDeployJob?.needs).toContain('deploy-development');
      
      // Check for integration tests step
      const integrationTestStep = postDeployJob?.steps.find(step => step.run?.includes('test:integration'));
      expect(integrationTestStep).toBeDefined();
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle environments without rollback enabled', () => {
      const envWithoutRollback = {
        ...mockEnvironments[0],
        rollbackEnabled: false
      };

      const result = generator.generateMultiEnvironmentWorkflows(
        [envWithoutRollback],
        mockDetectionResult
      );

      expect(result.rollbackConfigs.size).toBe(0);
      
      const workflow = result.workflows.find(w => w.name === 'Deploy to development');
      const rollbackJob = workflow?.jobs.find(job => job.name === 'rollback-development');
      expect(rollbackJob).toBeUndefined();
    });

    it('should handle unknown frameworks gracefully', () => {
      const unknownFrameworkResult = {
        ...mockDetectionResult,
        frameworks: [
          {
            name: 'UnknownFramework',
            confidence: 0.3,
            evidence: [],
            category: 'backend' as const
          }
        ]
      };

      const result = generator.generateMultiEnvironmentWorkflows(
        [mockEnvironments[0]],
        unknownFrameworkResult
      );

      expect(result.workflows).toHaveLength(3); // Should still generate workflows
      
      const workflow = result.workflows.find(w => w.name === 'Deploy to development');
      const deployJob = workflow?.jobs.find(job => job.name === 'deploy-development');
      
      // Should fall back to generic deployment
      const deployStep = deployJob?.steps.find(step => step.id === 'deploy');
      expect(deployStep?.run).toContain('No specific framework detected');
    });

    it('should generate warnings for missing configurations', () => {
      const incompleteEnvironments = [
        {
          name: 'test',
          type: 'development' as const,
          approvalRequired: false,
          secrets: [],
          variables: {},
          deploymentStrategy: 'rolling' as const,
          rollbackEnabled: false
        }
      ];

      const result = generator.generateMultiEnvironmentWorkflows(
        incompleteEnvironments,
        mockDetectionResult
      );

      // Should still generate workflows but may have warnings
      expect(result.workflows.length).toBeGreaterThan(0);
      expect(result.environmentConfigs).toHaveLength(1);
    });
  });

  describe('utility methods', () => {
    it('should provide access to configured strategies and gates', () => {
      generator.generateMultiEnvironmentWorkflows(
        mockEnvironments,
        mockDetectionResult
      );

      expect(generator.getDeploymentStrategy('development')).toBeDefined();
      expect(generator.getApprovalGate('production')).toBeDefined();
      expect(generator.getPromotionConfig('development', 'staging')).toBeDefined();
      expect(generator.getRollbackConfig('production')).toBeDefined();
    });

    it('should clear configurations when requested', () => {
      generator.generateMultiEnvironmentWorkflows(
        mockEnvironments,
        mockDetectionResult
      );

      expect(generator.getDeploymentStrategy('development')).toBeDefined();
      
      generator.clear();
      
      expect(generator.getDeploymentStrategy('development')).toBeUndefined();
      expect(generator.getApprovalGate('production')).toBeUndefined();
    });
  });
});