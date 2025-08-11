import { describe, it, expect, beforeEach } from 'vitest';
import { DeploymentGenerator } from '../../src/generator/templates/deployment-generator';
import { TemplateManager } from '../../src/generator/templates/template-manager';
import { DetectionResult, GenerationOptions, EnvironmentConfig } from '../../src/generator/interfaces';
import * as yaml from 'yaml';
import * as path from 'path';

describe('DeploymentGenerator Integration Tests', () => {
  let generator: DeploymentGenerator;
  let templateManager: TemplateManager;

  beforeEach(() => {
    templateManager = new TemplateManager({
      baseTemplatesPath: path.join(process.cwd(), 'templates'),
      customTemplatesPath: undefined,
      cacheEnabled: false
    });
    
    generator = new DeploymentGenerator(templateManager);
  });

  describe('Container deployment workflows', () => {
    it('should generate valid Docker deployment YAML', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'JavaScript', version: '18', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'express', confidence: 0.9, evidence: ['package.json'], category: 'backend' }],
        packageManagers: [{ name: 'npm', lockFile: 'package-lock.json', confidence: 0.8 }],
        testingFrameworks: [],
        buildTools: [{ name: 'docker', configFile: 'Dockerfile', confidence: 0.9 }],
        deploymentTargets: [{ platform: 'docker', type: 'container', confidence: 0.9 }],
        projectMetadata: {
          name: 'express-app',
          description: 'Express application'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      // Validate YAML syntax
      expect(() => yaml.parse(result.content)).not.toThrow();
      
      const parsedYaml = yaml.parse(result.content);
      
      // Validate workflow structure
      expect(parsedYaml).toHaveProperty('name');
      expect(parsedYaml).toHaveProperty('on');
      expect(parsedYaml).toHaveProperty('jobs');
      expect(parsedYaml).toHaveProperty('permissions');
      
      // Validate permissions
      expect(parsedYaml.permissions).toHaveProperty('contents', 'read');
      expect(parsedYaml.permissions).toHaveProperty('packages', 'write');
      expect(parsedYaml.permissions).toHaveProperty('deployments', 'write');
      
      // Validate jobs structure
      expect(Object.keys(parsedYaml.jobs)).toContain('build-and-push');
      expect(parsedYaml.jobs['build-and-push']).toHaveProperty('steps');
      
      // Validate Docker-specific steps
      const buildSteps = parsedYaml.jobs['build-and-push'].steps;
      const stepNames = buildSteps.map((step: any) => step.name);
      
      expect(stepNames).toContain('Checkout code');
      expect(stepNames).toContain('Set up Docker Buildx');
      expect(stepNames).toContain('Log in to Container Registry');
      expect(stepNames).toContain('Build and push Docker image');
    });

    it('should generate valid AWS ECS deployment YAML', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Python', version: '3.11', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'fastapi', confidence: 0.9, evidence: ['main.py'], category: 'backend' }],
        packageManagers: [{ name: 'pip', lockFile: 'requirements.txt', confidence: 0.8 }],
        testingFrameworks: [],
        buildTools: [{ name: 'docker', configFile: 'Dockerfile', confidence: 0.9 }],
        deploymentTargets: [
          { platform: 'aws-ecs', type: 'container', confidence: 0.9 }
        ],
        projectMetadata: {
          name: 'fastapi-app',
          description: 'FastAPI application'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      // Validate YAML syntax
      expect(() => yaml.parse(result.content)).not.toThrow();
      
      const parsedYaml = yaml.parse(result.content);
      
      // Validate AWS-specific structure
      expect(parsedYaml.permissions).toHaveProperty('id-token', 'write');
      expect(parsedYaml).toHaveProperty('env');
      expect(parsedYaml.env).toHaveProperty('AWS_REGION');
      expect(parsedYaml.env).toHaveProperty('ECR_REPOSITORY');
      
      // Validate AWS-specific jobs
      expect(Object.keys(parsedYaml.jobs)).toContain('build-and-push');
      expect(Object.keys(parsedYaml.jobs)).toContain('deploy-to-ecs');
      
      // Validate AWS-specific steps
      const deploySteps = parsedYaml.jobs['deploy-to-ecs'].steps;
      const stepNames = deploySteps.map((step: any) => step.name);
      
      expect(stepNames).toContain('Configure AWS credentials');
      expect(stepNames).toContain('Deploy to ECS service');
    });
  });

  describe('Static site deployment workflows', () => {
    it('should generate valid GitHub Pages deployment YAML', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'JavaScript', version: '18', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'react', confidence: 0.9, evidence: ['package.json'], category: 'frontend' }],
        packageManagers: [{ name: 'npm', lockFile: 'package-lock.json', confidence: 0.8 }],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [
          { platform: 'github-pages', type: 'static', confidence: 0.9 }
        ],
        projectMetadata: {
          name: 'react-app',
          description: 'React application'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      // Validate YAML syntax
      expect(() => yaml.parse(result.content)).not.toThrow();
      
      const parsedYaml = yaml.parse(result.content);
      
      // Validate GitHub Pages specific structure
      expect(parsedYaml.permissions).toHaveProperty('pages', 'write');
      expect(parsedYaml.permissions).toHaveProperty('id-token', 'write');
      
      // Validate jobs
      expect(Object.keys(parsedYaml.jobs)).toContain('build');
      expect(Object.keys(parsedYaml.jobs)).toContain('deploy');
      
      // Validate build steps
      const buildSteps = parsedYaml.jobs.build.steps;
      const buildStepNames = buildSteps.map((step: any) => step.name);
      
      expect(buildStepNames).toContain('Setup Node.js');
      expect(buildStepNames).toContain('Install dependencies');
      expect(buildStepNames).toContain('Setup Pages');
      expect(buildStepNames).toContain('Upload Pages artifact');
      
      // Validate deploy steps
      const deploySteps = parsedYaml.jobs.deploy.steps;
      const deployStepNames = deploySteps.map((step: any) => step.name);
      
      expect(deployStepNames).toContain('Deploy to GitHub Pages');
    });

    it('should generate valid Netlify deployment YAML', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'JavaScript', version: '20', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'vue', confidence: 0.9, evidence: ['package.json'], category: 'frontend' }],
        packageManagers: [{ name: 'yarn', lockFile: 'yarn.lock', confidence: 0.8 }],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [
          { platform: 'netlify', type: 'static', confidence: 0.9 }
        ],
        projectMetadata: {
          name: 'vue-app',
          description: 'Vue application'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      // Validate YAML syntax
      expect(() => yaml.parse(result.content)).not.toThrow();
      
      const parsedYaml = yaml.parse(result.content);
      
      // Validate Netlify-specific structure
      expect(parsedYaml).toHaveProperty('env');
      expect(parsedYaml.env).toHaveProperty('NETLIFY_SITE_ID');
      expect(parsedYaml.env).toHaveProperty('NETLIFY_AUTH_TOKEN');
      
      // Validate triggers include pull requests
      expect(parsedYaml.on).toHaveProperty('pull_request');
      
      // Validate steps
      const steps = parsedYaml.jobs['build-and-deploy'].steps;
      const stepNames = steps.map((step: any) => step.name);
      
      expect(stepNames).toContain('Deploy to Netlify');
      expect(stepNames).toContain('Comment on PR');
    });
  });

  describe('Multi-environment deployment workflows', () => {
    it('should generate valid multi-environment deployment YAML', async () => {
      const environments: EnvironmentConfig[] = [
        {
          name: 'staging',
          type: 'staging',
          approvalRequired: false,
          secrets: ['STAGING_API_KEY'],
          variables: { NODE_ENV: 'staging' },
          deploymentStrategy: 'rolling',
          rollbackEnabled: true
        },
        {
          name: 'production',
          type: 'production',
          approvalRequired: true,
          secrets: ['PROD_API_KEY'],
          variables: { NODE_ENV: 'production' },
          deploymentStrategy: 'blue-green',
          rollbackEnabled: true
        }
      ];

      const options: GenerationOptions = {
        workflowType: 'cd',
        optimizationLevel: 'standard',
        includeComments: true,
        environments,
        securityLevel: 'standard'
      };

      const detectionResult: DetectionResult = {
        languages: [{ name: 'JavaScript', version: '18', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'express', confidence: 0.9, evidence: ['package.json'], category: 'backend' }],
        packageManagers: [{ name: 'npm', lockFile: 'package-lock.json', confidence: 0.8 }],
        testingFrameworks: [],
        buildTools: [{ name: 'docker', configFile: 'Dockerfile', confidence: 0.9 }],
        deploymentTargets: [{ platform: 'docker', type: 'container', confidence: 0.9 }],
        projectMetadata: {
          name: 'multi-env-app',
          description: 'Multi-environment application'
        }
      };

      const result = await generator.generateWorkflow(detectionResult, options);

      // Validate YAML syntax
      expect(() => yaml.parse(result.content)).not.toThrow();
      
      const parsedYaml = yaml.parse(result.content);
      
      // Validate multi-environment structure
      expect(Object.keys(parsedYaml.jobs)).toContain('determine-environment');
      expect(Object.keys(parsedYaml.jobs)).toContain('deploy-staging');
      expect(Object.keys(parsedYaml.jobs)).toContain('deploy-production');
      expect(Object.keys(parsedYaml.jobs)).toContain('notify-deployment');
      
      // Validate workflow dispatch inputs
      expect(parsedYaml.on).toHaveProperty('workflow_dispatch');
      expect(parsedYaml.on.workflow_dispatch).toHaveProperty('inputs');
      expect(parsedYaml.on.workflow_dispatch.inputs).toHaveProperty('environment');
      
      // Validate environment determination logic
      const determineEnvJob = parsedYaml.jobs['determine-environment'];
      expect(determineEnvJob).toHaveProperty('outputs');
      expect(determineEnvJob.outputs).toHaveProperty('environment');
      expect(determineEnvJob.outputs).toHaveProperty('should-deploy');
      
      // Validate staging deployment
      const stagingJob = parsedYaml.jobs['deploy-staging'];
      expect(stagingJob).toHaveProperty('environment');
      expect(stagingJob.environment).toHaveProperty('name', 'staging');
      
      // Validate production deployment
      const productionJob = parsedYaml.jobs['deploy-production'];
      expect(productionJob).toHaveProperty('environment');
      expect(productionJob.environment).toHaveProperty('name', 'production');
    });
  });

  describe('YAML validation', () => {
    it('should generate syntactically valid YAML for all deployment types', async () => {
      const testCases = [
        {
          name: 'Docker deployment',
          detectionResult: {
            languages: [{ name: 'JavaScript', version: '18', confidence: 0.9, primary: true }],
            frameworks: [{ name: 'express', confidence: 0.9, evidence: ['package.json'], category: 'backend' }],
            packageManagers: [{ name: 'npm', lockFile: 'package-lock.json', confidence: 0.8 }],
            testingFrameworks: [],
            buildTools: [{ name: 'docker', configFile: 'Dockerfile', confidence: 0.9 }],
            deploymentTargets: [{ platform: 'docker', type: 'container', confidence: 0.9 }],
            projectMetadata: { name: 'test-app', description: 'Test application' }
          }
        },
        {
          name: 'Static site deployment',
          detectionResult: {
            languages: [{ name: 'JavaScript', version: '18', confidence: 0.9, primary: true }],
            frameworks: [{ name: 'react', confidence: 0.9, evidence: ['package.json'], category: 'frontend' }],
            packageManagers: [{ name: 'npm', lockFile: 'package-lock.json', confidence: 0.8 }],
            testingFrameworks: [],
            buildTools: [],
            deploymentTargets: [{ platform: 'static', type: 'static', confidence: 0.8 }],
            projectMetadata: { name: 'react-app', description: 'React application' }
          }
        }
      ];

      for (const testCase of testCases) {
        const result = await generator.generateWorkflow(testCase.detectionResult as DetectionResult);
        
        // Should not throw when parsing YAML
        expect(() => yaml.parse(result.content), `${testCase.name} should generate valid YAML`).not.toThrow();
        
        const parsedYaml = yaml.parse(result.content);
        
        // Basic workflow structure validation
        expect(parsedYaml, `${testCase.name} should have name`).toHaveProperty('name');
        expect(parsedYaml, `${testCase.name} should have triggers`).toHaveProperty('on');
        expect(parsedYaml, `${testCase.name} should have jobs`).toHaveProperty('jobs');
        expect(parsedYaml, `${testCase.name} should have permissions`).toHaveProperty('permissions');
        
        // Jobs should be objects with required properties
        const jobs = parsedYaml.jobs;
        expect(typeof jobs, `${testCase.name} jobs should be an object`).toBe('object');
        
        for (const [jobName, job] of Object.entries(jobs)) {
          expect(job, `${testCase.name} job ${jobName} should have runs-on`).toHaveProperty('runs-on');
          expect(job, `${testCase.name} job ${jobName} should have steps`).toHaveProperty('steps');
          expect(Array.isArray((job as any).steps), `${testCase.name} job ${jobName} steps should be an array`).toBe(true);
        }
      }
    });
  });
});