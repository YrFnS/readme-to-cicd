/**
 * Tests for EnvironmentManager
 * Validates requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnvironmentManager, SecretConfig, VariableConfig, OIDCConfig, ConfigFileTemplate } from '../../../src/generator/environment-manager';
import { EnvironmentConfig, DetectionResult } from '../../../src/generator/interfaces';

describe('EnvironmentManager', () => {
  let environmentManager: EnvironmentManager;
  let mockDetectionResult: DetectionResult;
  let mockEnvironments: EnvironmentConfig[];

  beforeEach(() => {
    environmentManager = new EnvironmentManager();
    
    mockDetectionResult = {
      frameworks: [
        { name: 'React', confidence: 0.9, evidence: ['package.json'], category: 'frontend' },
        { name: 'Express', confidence: 0.8, evidence: ['package.json'], category: 'backend' }
      ],
      languages: [
        { name: 'JavaScript', confidence: 0.9, primary: true },
        { name: 'TypeScript', confidence: 0.8, primary: false }
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
        { platform: 'AWS', type: 'container', confidence: 0.7 },
        { platform: 'Vercel', type: 'static', confidence: 0.9 }
      ],
      projectMetadata: {
        name: 'test-project',
        description: 'A test project',
        version: '1.0.0'
      }
    };

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

  describe('Secret Management', () => {
    it('should register and retrieve secrets', () => {
      const secret: SecretConfig = {
        name: 'API_KEY',
        description: 'External API key',
        required: true,
        environments: ['production'],
        type: 'api_key'
      };

      environmentManager.registerSecret(secret);
      const secrets = environmentManager.getSecrets();
      
      expect(secrets.has('API_KEY')).toBe(true);
      expect(secrets.get('API_KEY')).toEqual(secret);
    });

    it('should auto-detect React frontend secrets', () => {
      const result = environmentManager.generateEnvironmentSteps(mockEnvironments, mockDetectionResult);
      
      const secrets = environmentManager.getSecrets();
      expect(secrets.has('REACT_APP_API_URL')).toBe(true);
      expect(secrets.get('REACT_APP_API_URL')?.type).toBe('generic');
    });

    it('should auto-detect Express backend secrets', () => {
      const result = environmentManager.generateEnvironmentSteps(mockEnvironments, mockDetectionResult);
      
      const secrets = environmentManager.getSecrets();
      expect(secrets.has('DATABASE_URL')).toBe(true);
      expect(secrets.has('JWT_SECRET')).toBe(true);
      expect(secrets.get('DATABASE_URL')?.type).toBe('connection_string');
      expect(secrets.get('JWT_SECRET')?.type).toBe('token');
    });

    it('should auto-detect AWS deployment secrets', () => {
      const result = environmentManager.generateEnvironmentSteps(mockEnvironments, mockDetectionResult);
      
      const secrets = environmentManager.getSecrets();
      expect(secrets.has('AWS_ACCESS_KEY_ID')).toBe(true);
      expect(secrets.has('AWS_SECRET_ACCESS_KEY')).toBe(true);
    });

    it('should auto-detect Vercel deployment secrets', () => {
      const result = environmentManager.generateEnvironmentSteps(mockEnvironments, mockDetectionResult);
      
      const secrets = environmentManager.getSecrets();
      expect(secrets.has('VERCEL_TOKEN')).toBe(true);
      expect(secrets.has('VERCEL_ORG_ID')).toBe(true);
      expect(secrets.has('VERCEL_PROJECT_ID')).toBe(true);
    });

    it('should generate secret references correctly', () => {
      const secret: SecretConfig = {
        name: 'TEST_SECRET',
        required: true,
        environments: ['production'],
        type: 'token'
      };

      environmentManager.registerSecret(secret);
      const result = environmentManager.generateEnvironmentSteps(mockEnvironments, mockDetectionResult);
      
      expect(result.secretReferences['TEST_SECRET']).toBe('${{ secrets.TEST_SECRET }}');
    });
  });

  describe('Variable Management', () => {
    it('should register and retrieve variables', () => {
      const variable: VariableConfig = {
        name: 'NODE_ENV',
        value: 'production',
        description: 'Node.js environment',
        required: true,
        environments: ['production'],
        type: 'string'
      };

      environmentManager.registerVariable(variable);
      const variables = environmentManager.getVariables();
      
      expect(variables.has('NODE_ENV')).toBe(true);
      expect(variables.get('NODE_ENV')).toEqual(variable);
    });

    it('should auto-detect common frontend variables', () => {
      const result = environmentManager.generateEnvironmentSteps(mockEnvironments, mockDetectionResult);
      
      const variables = environmentManager.getVariables();
      expect(variables.has('NODE_ENV')).toBe(true);
      expect(variables.get('NODE_ENV')?.required).toBe(true);
    });

    it('should generate variable references correctly', () => {
      const variable: VariableConfig = {
        name: 'TEST_VAR',
        required: true,
        environments: ['production'],
        type: 'string'
      };

      environmentManager.registerVariable(variable);
      const result = environmentManager.generateEnvironmentSteps(mockEnvironments, mockDetectionResult);
      
      expect(result.variableReferences['TEST_VAR']).toBe('${{ vars.TEST_VAR }}');
    });

    it('should use environment-specific variable values', () => {
      const result = environmentManager.generateEnvironmentSteps(mockEnvironments, mockDetectionResult);
      
      expect(result.variableReferences['NODE_ENV']).toBeDefined();
      expect(result.variableReferences['DEBUG']).toBeDefined();
    });
  });

  describe('OIDC Integration', () => {
    it('should register and retrieve OIDC configurations', () => {
      const oidcConfig: OIDCConfig = {
        provider: 'aws',
        roleArn: 'arn:aws:iam::123456789012:role/GitHubActions',
        audience: 'sts.amazonaws.com'
      };

      environmentManager.registerOIDC('production', oidcConfig);
      const configs = environmentManager.getOIDCConfigs();
      
      expect(configs.has('production')).toBe(true);
      expect(configs.get('production')).toEqual(oidcConfig);
    });

    it('should generate AWS OIDC steps', () => {
      const oidcConfig: OIDCConfig = {
        provider: 'aws',
        roleArn: 'arn:aws:iam::123456789012:role/GitHubActions'
      };

      environmentManager.registerOIDC('production', oidcConfig);
      const result = environmentManager.generateEnvironmentSteps(mockEnvironments, mockDetectionResult);
      
      expect(result.oidcSteps).toHaveLength(1);
      expect(result.oidcSteps[0].uses).toBe('aws-actions/configure-aws-credentials@v4');
      expect(result.oidcSteps[0].with?.['role-to-assume']).toBe(oidcConfig.roleArn);
    });

    it('should generate Azure OIDC steps', () => {
      const oidcConfig: OIDCConfig = {
        provider: 'azure',
        subscriptionId: 'subscription-123'
      };

      environmentManager.registerOIDC('production', oidcConfig);
      const result = environmentManager.generateEnvironmentSteps(mockEnvironments, mockDetectionResult);
      
      expect(result.oidcSteps).toHaveLength(1);
      expect(result.oidcSteps[0].uses).toBe('azure/login@v1');
      expect(result.oidcSteps[0].with?.['subscription-id']).toBe(oidcConfig.subscriptionId);
    });

    it('should generate GCP OIDC steps', () => {
      const oidcConfig: OIDCConfig = {
        provider: 'gcp',
        workloadIdentityProvider: 'projects/123/locations/global/workloadIdentityPools/pool/providers/provider',
        serviceAccount: 'github-actions@project.iam.gserviceaccount.com'
      };

      environmentManager.registerOIDC('production', oidcConfig);
      const result = environmentManager.generateEnvironmentSteps(mockEnvironments, mockDetectionResult);
      
      expect(result.oidcSteps).toHaveLength(1);
      expect(result.oidcSteps[0].uses).toBe('google-github-actions/auth@v2');
      expect(result.oidcSteps[0].with?.['workload_identity_provider']).toBe(oidcConfig.workloadIdentityProvider);
    });

    it('should generate custom OIDC steps', () => {
      const oidcConfig: OIDCConfig = {
        provider: 'custom',
        audience: 'custom-audience',
        issuer: 'https://custom-issuer.com'
      };

      environmentManager.registerOIDC('production', oidcConfig);
      const result = environmentManager.generateEnvironmentSteps(mockEnvironments, mockDetectionResult);
      
      expect(result.oidcSteps).toHaveLength(1);
      expect(result.oidcSteps[0].run).toContain('Custom OIDC authentication');
      expect(result.oidcSteps[0].env?.OIDC_ISSUER).toBe(oidcConfig.issuer);
    });
  });

  describe('Configuration File Templating', () => {
    it('should register and retrieve configuration templates', () => {
      const template: ConfigFileTemplate = {
        filename: 'config.json',
        content: '{"api_url": "{{API_URL}}", "secret": "{{API_SECRET}}"}',
        format: 'json',
        variables: ['API_URL'],
        secrets: ['API_SECRET']
      };

      environmentManager.registerConfigTemplate(template);
      const templates = environmentManager.getConfigTemplates();
      
      expect(templates.has('config.json')).toBe(true);
      expect(templates.get('config.json')).toEqual(template);
    });

    it('should process configuration templates with variables and secrets', () => {
      const template: ConfigFileTemplate = {
        filename: 'config.{{environment}}.json',
        content: '{"env": "{{NODE_ENV}}", "secret": "{{API_SECRET}}"}',
        format: 'json',
        variables: ['NODE_ENV'],
        secrets: ['API_SECRET'],
        environment: 'production' // Only for production environment
      };

      const variable: VariableConfig = {
        name: 'NODE_ENV',
        value: 'production',
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

      environmentManager.registerConfigTemplate(template);
      environmentManager.registerVariable(variable);
      environmentManager.registerSecret(secret);

      const result = environmentManager.generateEnvironmentSteps(mockEnvironments, mockDetectionResult);
      
      expect(result.configFiles).toHaveLength(1);
      expect(result.configFiles[0].filename).toBe('config.production.json');
      expect(result.configFiles[0].content).toContain('"env": "production"');
      expect(result.configFiles[0].content).toContain('"secret": "${{ secrets.API_SECRET }}"');
    });

    it('should generate default .env files when no templates are provided', () => {
      const result = environmentManager.generateEnvironmentSteps(mockEnvironments, mockDetectionResult);
      
      expect(result.configFiles.length).toBeGreaterThan(0);
      expect(result.configFiles.some(f => f.filename.includes('.env'))).toBe(true);
    });
  });

  describe('Environment Steps Generation', () => {
    it('should generate environment-specific steps', () => {
      const result = environmentManager.generateEnvironmentSteps(mockEnvironments, mockDetectionResult);
      
      expect(result.environmentSteps.length).toBeGreaterThan(0);
      expect(result.environmentSteps.some(step => step.name?.includes('development'))).toBe(true);
      expect(result.environmentSteps.some(step => step.name?.includes('production'))).toBe(true);
    });

    it('should include secret validation steps', () => {
      const secret: SecretConfig = {
        name: 'REQUIRED_SECRET',
        required: true,
        environments: ['production'],
        type: 'token'
      };

      environmentManager.registerSecret(secret);
      const result = environmentManager.generateEnvironmentSteps(mockEnvironments, mockDetectionResult);
      
      expect(result.environmentSteps.some(step => 
        step.name?.includes('Validate') && step.run?.includes('REQUIRED_SECRET')
      )).toBe(true);
    });

    it('should generate proper secret references', () => {
      const result = environmentManager.generateEnvironmentSteps(mockEnvironments, mockDetectionResult);
      
      Object.values(result.secretReferences).forEach(ref => {
        expect(ref).toMatch(/^\$\{\{ secrets\.\w+ \}\}$/);
      });
    });

    it('should generate proper variable references', () => {
      const result = environmentManager.generateEnvironmentSteps(mockEnvironments, mockDetectionResult);
      
      Object.values(result.variableReferences).forEach(ref => {
        expect(ref).toMatch(/^\$\{\{ vars\.\w+ \}\}$|^[^$]/);
      });
    });
  });

  describe('Validation', () => {
    it('should warn about missing required secrets', () => {
      const secret: SecretConfig = {
        name: 'MISSING_SECRET',
        required: true,
        environments: ['nonexistent'], // Environment that doesn't exist
        type: 'token'
      };

      environmentManager.registerSecret(secret);
      
      const result = environmentManager.generateEnvironmentSteps(mockEnvironments, mockDetectionResult);
      
      expect(result.warnings.some(w => w.includes('MISSING_SECRET'))).toBe(true);
    });

    it('should warn about potential secrets in variables', () => {
      const variable: VariableConfig = {
        name: 'API_PASSWORD',
        value: 'this-looks-like-a-secret-value-123456789',
        required: true,
        environments: ['production'],
        type: 'string'
      };

      environmentManager.registerVariable(variable);
      const result = environmentManager.generateEnvironmentSteps(mockEnvironments, mockDetectionResult);
      
      expect(result.warnings.some(w => w.includes('API_PASSWORD') && w.includes('sensitive data'))).toBe(true);
    });

    it('should warn about incomplete OIDC configurations', () => {
      const incompleteOIDC: OIDCConfig = {
        provider: 'aws'
        // Missing roleArn
      };

      environmentManager.registerOIDC('production', incompleteOIDC);
      const result = environmentManager.generateEnvironmentSteps(mockEnvironments, mockDetectionResult);
      
      expect(result.warnings.some(w => w.includes('AWS OIDC') && w.includes('roleArn'))).toBe(true);
    });
  });

  describe('Utility Methods', () => {
    it('should clear all configurations', () => {
      environmentManager.registerSecret({
        name: 'TEST_SECRET',
        required: true,
        environments: ['production'],
        type: 'token'
      });

      environmentManager.registerVariable({
        name: 'TEST_VAR',
        required: true,
        environments: ['production'],
        type: 'string'
      });

      environmentManager.clear();
      
      expect(environmentManager.getSecrets().size).toBe(0);
      expect(environmentManager.getVariables().size).toBe(0);
      expect(environmentManager.getOIDCConfigs().size).toBe(0);
      expect(environmentManager.getConfigTemplates().size).toBe(0);
    });

    it('should return copies of internal maps', () => {
      const secret: SecretConfig = {
        name: 'TEST_SECRET',
        required: true,
        environments: ['production'],
        type: 'token'
      };

      environmentManager.registerSecret(secret);
      const secrets1 = environmentManager.getSecrets();
      const secrets2 = environmentManager.getSecrets();
      
      expect(secrets1).not.toBe(secrets2); // Different instances
      expect(secrets1.get('TEST_SECRET')).toEqual(secrets2.get('TEST_SECRET')); // Same content
    });
  });
});