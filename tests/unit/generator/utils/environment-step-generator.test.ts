/**
 * Tests for EnvironmentStepGenerator
 * Validates environment-specific workflow step generation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnvironmentStepGenerator, EnvironmentStepOptions } from '../../../../src/generator/utils/environment-step-generator';
import { EnvironmentManager, SecretConfig, VariableConfig, OIDCConfig } from '../../../../src/generator/environment-manager';
import { EnvironmentConfig } from '../../../../src/generator/interfaces';

describe('EnvironmentStepGenerator', () => {
  let environmentManager: EnvironmentManager;
  let stepGenerator: EnvironmentStepGenerator;
  let mockEnvironments: EnvironmentConfig[];

  beforeEach(() => {
    environmentManager = new EnvironmentManager();
    stepGenerator = new EnvironmentStepGenerator(environmentManager);

    mockEnvironments = [
      {
        name: 'development',
        type: 'development',
        approvalRequired: false,
        secrets: ['DEV_API_KEY'],
        variables: { NODE_ENV: 'development', DEBUG: 'true' },
        deploymentStrategy: 'rolling',
        rollbackEnabled: false
      },
      {
        name: 'staging',
        type: 'staging',
        approvalRequired: false,
        secrets: ['STAGING_API_KEY'],
        variables: { NODE_ENV: 'staging', DEBUG: 'false' },
        deploymentStrategy: 'rolling',
        rollbackEnabled: true
      },
      {
        name: 'production',
        type: 'production',
        approvalRequired: true,
        secrets: ['PROD_API_KEY', 'DATABASE_URL'],
        variables: { NODE_ENV: 'production', DEBUG: 'false' },
        deploymentStrategy: 'blue-green',
        rollbackEnabled: true
      }
    ];
  });

  describe('Environment Setup Steps', () => {
    it('should generate complete environment setup steps', () => {
      const steps = stepGenerator.generateEnvironmentSetupSteps(mockEnvironments);
      
      expect(steps.length).toBeGreaterThan(0);
      expect(steps.some(step => step.name?.includes('Detect deployment environment'))).toBe(true);
    });

    it('should include environment detection step', () => {
      const steps = stepGenerator.generateEnvironmentSetupSteps(mockEnvironments);
      
      const detectionStep = steps.find(step => step.id === 'detect-env');
      expect(detectionStep).toBeDefined();
      expect(detectionStep?.run).toContain('echo "environment=production" >> $GITHUB_OUTPUT');
      expect(detectionStep?.run).toContain('echo "environment=staging" >> $GITHUB_OUTPUT');
      expect(detectionStep?.run).toContain('echo "environment=development" >> $GITHUB_OUTPUT');
    });

    it('should generate secret validation steps when enabled', () => {
      const secret: SecretConfig = {
        name: 'REQUIRED_SECRET',
        required: true,
        environments: ['production'],
        type: 'token'
      };

      environmentManager.registerSecret(secret);
      
      const steps = stepGenerator.generateEnvironmentSetupSteps(mockEnvironments, {
        validateSecrets: true
      });
      
      expect(steps.some(step => 
        step.name?.includes('Validate production secrets') &&
        step.run?.includes('REQUIRED_SECRET')
      )).toBe(true);
    });

    it('should skip secret validation when disabled', () => {
      const secret: SecretConfig = {
        name: 'REQUIRED_SECRET',
        required: true,
        environments: ['production'],
        type: 'token'
      };

      environmentManager.registerSecret(secret);
      
      const steps = stepGenerator.generateEnvironmentSetupSteps(mockEnvironments, {
        validateSecrets: false
      });
      
      expect(steps.some(step => step.name?.includes('Validate'))).toBe(false);
    });

    it('should generate OIDC authentication steps when enabled', () => {
      const oidcConfig: OIDCConfig = {
        provider: 'aws',
        roleArn: 'arn:aws:iam::123456789012:role/GitHubActions'
      };

      environmentManager.registerOIDC('production', oidcConfig);
      
      const steps = stepGenerator.generateEnvironmentSetupSteps(mockEnvironments, {
        includeOIDC: true
      });
      
      expect(steps.some(step => 
        step.uses === 'aws-actions/configure-aws-credentials@v4'
      )).toBe(true);
    });

    it('should skip OIDC steps when disabled', () => {
      const oidcConfig: OIDCConfig = {
        provider: 'aws',
        roleArn: 'arn:aws:iam::123456789012:role/GitHubActions'
      };

      environmentManager.registerOIDC('production', oidcConfig);
      
      const steps = stepGenerator.generateEnvironmentSetupSteps(mockEnvironments, {
        includeOIDC: false
      });
      
      expect(steps.some(step => step.uses?.includes('aws-actions'))).toBe(false);
    });

    it('should generate environment files when enabled', () => {
      const variable: VariableConfig = {
        name: 'TEST_VAR',
        required: true,
        environments: ['production'],
        type: 'string'
      };

      environmentManager.registerVariable(variable);
      
      const steps = stepGenerator.generateEnvironmentSetupSteps(mockEnvironments, {
        generateEnvFiles: true
      });
      
      expect(steps.some(step => 
        step.name?.includes('Create .env file') &&
        step.run?.includes('.env.production')
      )).toBe(true);
    });
  });

  describe('Secret Validation Steps', () => {
    it('should generate validation steps for required secrets', () => {
      const secrets: SecretConfig[] = [
        {
          name: 'DATABASE_URL',
          required: true,
          environments: ['production'],
          type: 'connection_string'
        },
        {
          name: 'API_KEY',
          required: true,
          environments: ['production'],
          type: 'api_key'
        }
      ];

      secrets.forEach(secret => environmentManager.registerSecret(secret));
      
      const steps = stepGenerator.generateEnvironmentSetupSteps(mockEnvironments);
      
      const validationStep = steps.find(step => 
        step.name?.includes('Validate production secrets')
      );
      
      expect(validationStep).toBeDefined();
      expect(validationStep?.run).toContain('DATABASE_URL');
      expect(validationStep?.run).toContain('API_KEY');
      expect(validationStep?.env?.DATABASE_URL).toBe('${{ secrets.DATABASE_URL }}');
      expect(validationStep?.env?.API_KEY).toBe('${{ secrets.API_KEY }}');
    });

    it('should include conditional execution based on environment', () => {
      const secret: SecretConfig = {
        name: 'PROD_SECRET',
        required: true,
        environments: ['production'],
        type: 'token'
      };

      environmentManager.registerSecret(secret);
      
      const steps = stepGenerator.generateEnvironmentSetupSteps(mockEnvironments);
      
      const validationStep = steps.find(step => 
        step.name?.includes('Validate production secrets')
      );
      
      expect(validationStep?.if).toBe("steps.detect-env.outputs.environment == 'production'");
    });
  });

  describe('OIDC Authentication Steps', () => {
    it('should generate AWS OIDC steps with proper configuration', () => {
      const oidcConfig: OIDCConfig = {
        provider: 'aws',
        roleArn: 'arn:aws:iam::123456789012:role/GitHubActions',
        audience: 'sts.amazonaws.com'
      };

      environmentManager.registerOIDC('production', oidcConfig);
      
      const steps = stepGenerator.generateEnvironmentSetupSteps(mockEnvironments);
      
      const oidcStep = steps.find(step => 
        step.uses === 'aws-actions/configure-aws-credentials@v4'
      );
      
      expect(oidcStep).toBeDefined();
      expect(oidcStep?.with?.['role-to-assume']).toBe(oidcConfig.roleArn);
      expect(oidcStep?.with?.['role-session-name']).toContain('GitHubActions-production');
      expect(oidcStep?.with?.['aws-region']).toBe("${{ vars.AWS_REGION || 'us-east-1' }}");
      expect(oidcStep?.if).toBe("steps.detect-env.outputs.environment == 'production'");
    });

    it('should generate Azure OIDC steps with proper configuration', () => {
      const oidcConfig: OIDCConfig = {
        provider: 'azure',
        subscriptionId: 'subscription-123'
      };

      environmentManager.registerOIDC('production', oidcConfig);
      
      const steps = stepGenerator.generateEnvironmentSetupSteps(mockEnvironments);
      
      const oidcStep = steps.find(step => 
        step.uses === 'azure/login@v1'
      );
      
      expect(oidcStep).toBeDefined();
      expect(oidcStep?.with?.['subscription-id']).toBe(oidcConfig.subscriptionId);
      expect(oidcStep?.with?.['client-id']).toBe('${{ secrets.AZURE_CLIENT_ID }}');
      expect(oidcStep?.with?.['tenant-id']).toBe('${{ secrets.AZURE_TENANT_ID }}');
    });

    it('should generate GCP OIDC steps with proper configuration', () => {
      const oidcConfig: OIDCConfig = {
        provider: 'gcp',
        workloadIdentityProvider: 'projects/123/locations/global/workloadIdentityPools/pool/providers/provider',
        serviceAccount: 'github-actions@project.iam.gserviceaccount.com'
      };

      environmentManager.registerOIDC('production', oidcConfig);
      
      const steps = stepGenerator.generateEnvironmentSetupSteps(mockEnvironments);
      
      const oidcStep = steps.find(step => 
        step.uses === 'google-github-actions/auth@v2'
      );
      
      expect(oidcStep).toBeDefined();
      expect(oidcStep?.with?.['workload_identity_provider']).toBe(oidcConfig.workloadIdentityProvider);
      expect(oidcStep?.with?.['service_account']).toBe(oidcConfig.serviceAccount);
    });
  });

  describe('Configuration File Steps', () => {
    it('should generate configuration file creation steps', () => {
      environmentManager.registerConfigTemplate({
        filename: 'config.{{environment}}.json',
        content: '{"env": "{{NODE_ENV}}", "debug": {{DEBUG}}}',
        format: 'json',
        variables: ['NODE_ENV', 'DEBUG'],
        secrets: []
      });
      
      const steps = stepGenerator.generateEnvironmentSetupSteps(mockEnvironments, {
        includeConfigGeneration: true
      });
      
      expect(steps.some(step => 
        step.name?.includes('Generate configuration files for production') &&
        step.run?.includes('config.production.json')
      )).toBe(true);
    });

    it('should include conditional execution for configuration files', () => {
      environmentManager.registerConfigTemplate({
        filename: 'config.json',
        content: '{"test": true}',
        format: 'json',
        variables: [],
        secrets: [],
        environment: 'production'
      });
      
      const steps = stepGenerator.generateEnvironmentSetupSteps(mockEnvironments);
      
      const configStep = steps.find(step => 
        step.name?.includes('Generate configuration files for production')
      );
      
      expect(configStep?.if).toBe("steps.detect-env.outputs.environment == 'production'");
    });
  });

  describe('Environment File Steps', () => {
    it('should generate .env file creation steps', () => {
      const variable: VariableConfig = {
        name: 'API_URL',
        required: true,
        environments: ['production'],
        type: 'string'
      };

      const secret: SecretConfig = {
        name: 'API_SECRET',
        required: true,
        environments: ['production'],
        type: 'token'
      };

      environmentManager.registerVariable(variable);
      environmentManager.registerSecret(secret);
      
      const steps = stepGenerator.generateEnvironmentSetupSteps(mockEnvironments);
      
      const envStep = steps.find(step => 
        step.name?.includes('Create .env file for production')
      );
      
      expect(envStep).toBeDefined();
      expect(envStep?.run).toContain('.env.production');
      expect(envStep?.run).toContain('API_URL=${{ vars.API_URL || env.API_URL }}');
      expect(envStep?.run).toContain('API_SECRET=${{ secrets.API_SECRET }}');
      expect(envStep?.env?.API_URL).toBe('${{ vars.API_URL }}');
      expect(envStep?.env?.API_SECRET).toBe('${{ secrets.API_SECRET }}');
    });

    it('should include environment variables from environment config', () => {
      // Register variables that match the environment config
      environmentManager.registerVariable({
        name: 'NODE_ENV',
        required: true,
        environments: ['production'],
        type: 'string'
      });

      environmentManager.registerVariable({
        name: 'DEBUG',
        required: false,
        environments: ['production'],
        type: 'string'
      });

      const steps = stepGenerator.generateEnvironmentSetupSteps(mockEnvironments);
      
      const envStep = steps.find(step => 
        step.name?.includes('Create .env file for production')
      );
      
      expect(envStep).toBeDefined();
      expect(envStep?.run).toContain('NODE_ENV=${{ vars.NODE_ENV || env.NODE_ENV }}');
      expect(envStep?.run).toContain('DEBUG=${{ vars.DEBUG || env.DEBUG }}');
    });
  });

  describe('Deployment Steps', () => {
    it('should generate static deployment steps', () => {
      const steps = stepGenerator.generateDeploymentSteps(mockEnvironments, 'static');
      
      expect(steps.some(step => 
        step.name?.includes('Deploy to production (Static)') &&
        step.run?.includes('npm run build')
      )).toBe(true);
    });

    it('should generate container deployment steps', () => {
      const steps = stepGenerator.generateDeploymentSteps(mockEnvironments, 'container');
      
      expect(steps.some(step => 
        step.name?.includes('Build and push container for production') &&
        step.run?.includes('docker build') &&
        step.run?.includes('docker push')
      )).toBe(true);
    });

    it('should generate serverless deployment steps', () => {
      const steps = stepGenerator.generateDeploymentSteps(mockEnvironments, 'serverless');
      
      expect(steps.some(step => 
        step.name?.includes('Deploy serverless to production') &&
        step.run?.includes('serverless deploy --stage production')
      )).toBe(true);
    });

    it('should generate traditional deployment steps', () => {
      const steps = stepGenerator.generateDeploymentSteps(mockEnvironments, 'traditional');
      
      expect(steps.some(step => 
        step.name?.includes('Deploy to production (Traditional)') &&
        step.run?.includes('rsync')
      )).toBe(true);
    });

    it('should include environment-specific conditions in deployment steps', () => {
      const steps = stepGenerator.generateDeploymentSteps(mockEnvironments, 'static');
      
      steps.forEach(step => {
        expect(step.if).toMatch(/steps\.detect-env\.outputs\.environment == '(development|staging|production)'/);
      });
    });
  });

  describe('Options Handling', () => {
    it('should respect all option flags', () => {
      const options: EnvironmentStepOptions = {
        includeValidation: false,
        includeOIDC: false,
        includeConfigGeneration: false,
        validateSecrets: false,
        generateEnvFiles: false
      };

      const steps = stepGenerator.generateEnvironmentSetupSteps(mockEnvironments, options);
      
      // Should only have the environment detection step
      expect(steps.length).toBe(1);
      expect(steps[0].id).toBe('detect-env');
    });

    it('should use default options when none provided', () => {
      const steps = stepGenerator.generateEnvironmentSetupSteps(mockEnvironments);
      
      // Should include environment detection step at minimum
      expect(steps.length).toBeGreaterThan(0);
      expect(steps.some(step => step.id === 'detect-env')).toBe(true);
    });

    it('should merge provided options with defaults', () => {
      const steps = stepGenerator.generateEnvironmentSetupSteps(mockEnvironments, {
        validateSecrets: false
      });
      
      // Should still include other default steps but not secret validation
      expect(steps.some(step => step.id === 'detect-env')).toBe(true);
      expect(steps.some(step => step.name?.includes('Validate'))).toBe(false);
    });
  });
});