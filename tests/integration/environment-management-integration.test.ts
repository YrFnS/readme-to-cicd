/**
 * Integration tests for Environment Management
 * Tests the complete workflow from detection to environment step generation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnvironmentManager, EnvironmentStepGenerator } from '../../src/generator';
import { EnvironmentConfig, DetectionResult } from '../../src/generator/interfaces';

describe('Environment Management Integration', () => {
  let environmentManager: EnvironmentManager;
  let stepGenerator: EnvironmentStepGenerator;
  let mockDetectionResult: DetectionResult;
  let mockEnvironments: EnvironmentConfig[];

  beforeEach(() => {
    environmentManager = new EnvironmentManager();
    stepGenerator = new EnvironmentStepGenerator(environmentManager);

    mockDetectionResult = {
      frameworks: [
        { name: 'React', confidence: 0.9, evidence: ['package.json'], category: 'frontend' },
        { name: 'Express', confidence: 0.8, evidence: ['package.json'], category: 'backend' }
      ],
      languages: [
        { name: 'TypeScript', confidence: 0.9, primary: true }
      ],
      buildTools: [
        { name: 'npm', confidence: 0.9, configFile: 'package.json' }
      ],
      packageManagers: [
        { name: 'npm', confidence: 0.9, lockFile: 'package-lock.json' }
      ],
      testingFrameworks: [
        { name: 'Jest', type: 'unit', confidence: 0.8 }
      ],
      deploymentTargets: [
        { platform: 'AWS', type: 'container', confidence: 0.8 },
        { platform: 'Vercel', type: 'static', confidence: 0.9 }
      ],
      projectMetadata: {
        name: 'fullstack-app',
        description: 'A full-stack application',
        version: '1.0.0'
      }
    };

    mockEnvironments = [
      {
        name: 'development',
        type: 'development',
        approvalRequired: false,
        secrets: ['DEV_DATABASE_URL'],
        variables: { NODE_ENV: 'development', DEBUG: 'true' },
        deploymentStrategy: 'rolling',
        rollbackEnabled: false
      },
      {
        name: 'staging',
        type: 'staging',
        approvalRequired: false,
        secrets: ['STAGING_DATABASE_URL', 'JWT_SECRET'],
        variables: { NODE_ENV: 'staging', DEBUG: 'false' },
        deploymentStrategy: 'rolling',
        rollbackEnabled: true
      },
      {
        name: 'production',
        type: 'production',
        approvalRequired: true,
        secrets: ['PROD_DATABASE_URL', 'JWT_SECRET', 'STRIPE_SECRET_KEY'],
        variables: { NODE_ENV: 'production', DEBUG: 'false' },
        deploymentStrategy: 'blue-green',
        rollbackEnabled: true
      }
    ];
  });

  describe('End-to-End Environment Management', () => {
    it('should auto-detect and configure secrets for full-stack application', () => {
      const result = environmentManager.generateEnvironmentSteps(mockEnvironments, mockDetectionResult);

      // Should auto-detect React frontend secrets
      const secrets = environmentManager.getSecrets();
      expect(secrets.has('REACT_APP_API_URL')).toBe(true);

      // Should auto-detect Express backend secrets
      expect(secrets.has('DATABASE_URL')).toBe(true);
      expect(secrets.has('JWT_SECRET')).toBe(true);

      // Should auto-detect AWS deployment secrets
      expect(secrets.has('AWS_ACCESS_KEY_ID')).toBe(true);
      expect(secrets.has('AWS_SECRET_ACCESS_KEY')).toBe(true);

      // Should auto-detect Vercel deployment secrets
      expect(secrets.has('VERCEL_TOKEN')).toBe(true);
      expect(secrets.has('VERCEL_ORG_ID')).toBe(true);
      expect(secrets.has('VERCEL_PROJECT_ID')).toBe(true);

      // Should generate environment steps
      expect(result.environmentSteps.length).toBeGreaterThan(0);
      expect(result.secretReferences).toBeDefined();
      expect(result.variableReferences).toBeDefined();
    });

    it('should generate complete workflow with OIDC authentication', () => {
      // Configure AWS OIDC for production
      environmentManager.registerOIDC('production', {
        provider: 'aws',
        roleArn: 'arn:aws:iam::123456789012:role/GitHubActions-Production'
      });

      // Register a required secret to trigger validation steps
      environmentManager.registerSecret({
        name: 'REQUIRED_TEST_SECRET',
        required: true,
        environments: ['production'],
        type: 'token'
      });

      const steps = stepGenerator.generateEnvironmentSetupSteps(mockEnvironments, {
        includeOIDC: true,
        validateSecrets: true,
        generateEnvFiles: true
      });

      // Should include environment detection
      expect(steps.some(step => step.id === 'detect-env')).toBe(true);

      // Should include OIDC authentication
      expect(steps.some(step => 
        step.uses === 'aws-actions/configure-aws-credentials@v4'
      )).toBe(true);

      // Should include secret validation
      expect(steps.some(step => 
        step.name?.includes('Validate') && step.name?.includes('secrets')
      )).toBe(true);

      // Should include environment file generation
      expect(steps.some(step => 
        step.name?.includes('Create .env file')
      )).toBe(true);
    });

    it('should handle multi-environment deployment with proper conditions', () => {
      const deploymentSteps = stepGenerator.generateDeploymentSteps(mockEnvironments, 'container');

      // Should generate deployment steps for each environment
      expect(deploymentSteps).toHaveLength(3);

      // Each step should have proper conditional execution
      deploymentSteps.forEach(step => {
        expect(step.if).toMatch(/steps\.detect-env\.outputs\.environment == '(development|staging|production)'/);
      });

      // Should include container-specific commands
      deploymentSteps.forEach(step => {
        expect(step.run).toContain('docker');
      });
    });

    it('should generate configuration files with proper variable substitution', () => {
      // Register a configuration template
      environmentManager.registerConfigTemplate({
        filename: 'app.{{environment}}.json',
        content: JSON.stringify({
          database: { url: '{{DATABASE_URL}}' },
          jwt: { secret: '{{JWT_SECRET}}' },
          environment: '{{NODE_ENV}}',
          debug: '{{DEBUG}}'
        }),
        format: 'json',
        variables: ['NODE_ENV', 'DEBUG'],
        secrets: ['DATABASE_URL', 'JWT_SECRET']
      });

      const result = environmentManager.generateEnvironmentSteps(mockEnvironments, mockDetectionResult);

      // Should generate configuration files for each environment
      expect(result.configFiles.length).toBeGreaterThan(0);

      // Should process template variables
      const prodConfig = result.configFiles.find(f => f.filename === 'app.production.json');
      expect(prodConfig).toBeDefined();
      expect(prodConfig?.content).toContain('${{ secrets.DATABASE_URL }}');
      expect(prodConfig?.content).toContain('${{ secrets.JWT_SECRET }}');
    });

    it('should validate configuration and provide warnings', () => {
      // Register a required secret that won't be available
      environmentManager.registerSecret({
        name: 'MISSING_REQUIRED_SECRET',
        required: true,
        environments: ['nonexistent'],
        type: 'token'
      });

      // Register a variable that looks like a secret
      environmentManager.registerVariable({
        name: 'API_PASSWORD',
        value: 'this-looks-like-a-secret-value-with-sensitive-data',
        required: true,
        environments: ['production'],
        type: 'string'
      });

      const result = environmentManager.generateEnvironmentSteps(mockEnvironments, mockDetectionResult);

      // Should warn about missing required secret
      expect(result.warnings.some(w => w.includes('MISSING_REQUIRED_SECRET'))).toBe(true);

      // Should warn about potential secret in variables
      expect(result.warnings.some(w => w.includes('API_PASSWORD') && w.includes('sensitive data'))).toBe(true);
    });

    it('should support multiple cloud providers with OIDC', () => {
      // Configure multiple cloud providers
      environmentManager.registerOIDC('aws-prod', {
        provider: 'aws',
        roleArn: 'arn:aws:iam::123456789012:role/GitHubActions'
      });

      environmentManager.registerOIDC('azure-prod', {
        provider: 'azure',
        subscriptionId: 'subscription-123'
      });

      environmentManager.registerOIDC('gcp-prod', {
        provider: 'gcp',
        workloadIdentityProvider: 'projects/123/locations/global/workloadIdentityPools/pool/providers/provider',
        serviceAccount: 'github-actions@project.iam.gserviceaccount.com'
      });

      const multiCloudEnvironments: EnvironmentConfig[] = [
        { ...mockEnvironments[2], name: 'aws-prod', type: 'production' },
        { ...mockEnvironments[2], name: 'azure-prod', type: 'production' },
        { ...mockEnvironments[2], name: 'gcp-prod', type: 'production' }
      ];

      const steps = stepGenerator.generateEnvironmentSetupSteps(multiCloudEnvironments, {
        includeOIDC: true
      });

      // Should include AWS OIDC step
      expect(steps.some(step => 
        step.uses === 'aws-actions/configure-aws-credentials@v4'
      )).toBe(true);

      // Should include Azure OIDC step
      expect(steps.some(step => 
        step.uses === 'azure/login@v1'
      )).toBe(true);

      // Should include GCP OIDC step
      expect(steps.some(step => 
        step.uses === 'google-github-actions/auth@v2'
      )).toBe(true);
    });

    it('should handle complex configuration with all features enabled', () => {
      // Set up comprehensive configuration
      environmentManager.registerSecret({
        name: 'COMPREHENSIVE_SECRET',
        required: true,
        environments: ['production'],
        type: 'token'
      });

      environmentManager.registerVariable({
        name: 'COMPREHENSIVE_VAR',
        value: 'test-value',
        required: true,
        environments: ['production'],
        type: 'string'
      });

      environmentManager.registerOIDC('production', {
        provider: 'aws',
        roleArn: 'arn:aws:iam::123456789012:role/GitHubActions'
      });

      environmentManager.registerConfigTemplate({
        filename: 'comprehensive.{{environment}}.yml',
        content: 'secret: {{COMPREHENSIVE_SECRET}}\nvariable: {{COMPREHENSIVE_VAR}}',
        format: 'yaml',
        variables: ['COMPREHENSIVE_VAR'],
        secrets: ['COMPREHENSIVE_SECRET']
      });

      // Generate with all options enabled
      const steps = stepGenerator.generateEnvironmentSetupSteps(mockEnvironments, {
        includeValidation: true,
        includeOIDC: true,
        includeConfigGeneration: true,
        validateSecrets: true,
        generateEnvFiles: true
      });

      // Should include all types of steps
      expect(steps.some(step => step.id === 'detect-env')).toBe(true);
      expect(steps.some(step => step.name?.includes('Validate'))).toBe(true);
      expect(steps.some(step => step.uses?.includes('aws-actions'))).toBe(true);
      expect(steps.some(step => step.name?.includes('Generate configuration files'))).toBe(true);
      expect(steps.some(step => step.name?.includes('Create .env file'))).toBe(true);

      // Verify the comprehensive result
      const result = environmentManager.generateEnvironmentSteps(mockEnvironments, mockDetectionResult);
      expect(result.secretReferences['COMPREHENSIVE_SECRET']).toBe('${{ secrets.COMPREHENSIVE_SECRET }}');
      expect(result.variableReferences['COMPREHENSIVE_VAR']).toBe('test-value');
      expect(result.configFiles.some(f => f.filename === 'comprehensive.production.yml')).toBe(true);
      expect(result.oidcSteps.some(s => s.uses === 'aws-actions/configure-aws-credentials@v4')).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large numbers of secrets and variables efficiently', () => {
      const startTime = Date.now();

      // Register 100 secrets and variables
      for (let i = 0; i < 100; i++) {
        environmentManager.registerSecret({
          name: `SECRET_${i}`,
          required: i % 10 === 0, // Every 10th secret is required
          environments: ['production'],
          type: 'token'
        });

        environmentManager.registerVariable({
          name: `VAR_${i}`,
          value: `value_${i}`,
          required: i % 20 === 0, // Every 20th variable is required
          environments: ['production'],
          type: 'string'
        });
      }

      const result = environmentManager.generateEnvironmentSteps(mockEnvironments, mockDetectionResult);
      const endTime = Date.now();

      // Should complete within reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);

      // Should handle all secrets and variables
      expect(Object.keys(result.secretReferences).length).toBeGreaterThan(100);
      expect(Object.keys(result.variableReferences).length).toBeGreaterThan(100);
    });

    it('should handle multiple environments efficiently', () => {
      const manyEnvironments: EnvironmentConfig[] = [];
      
      // Create 20 environments
      for (let i = 0; i < 20; i++) {
        manyEnvironments.push({
          name: `env-${i}`,
          type: i < 5 ? 'development' : i < 15 ? 'staging' : 'production',
          approvalRequired: i >= 15,
          secrets: [`SECRET_${i}`],
          variables: { [`VAR_${i}`]: `value_${i}` },
          deploymentStrategy: 'rolling',
          rollbackEnabled: i >= 10
        });
      }

      const startTime = Date.now();
      const steps = stepGenerator.generateEnvironmentSetupSteps(manyEnvironments);
      const endTime = Date.now();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(2000);

      // Should generate steps for all environments
      expect(steps.length).toBeGreaterThan(0);
    });
  });
});