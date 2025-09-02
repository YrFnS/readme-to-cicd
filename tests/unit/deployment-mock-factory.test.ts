/**
 * Tests for Deployment Mock Factory
 * 
 * Validates the deployment mock factory functionality including:
 * - Consistent response patterns
 * - Success and failure scenarios
 * - Configuration options
 * - All deployment operation types
 * - Environment-specific behavior
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  DeploymentMockFactory, 
  defaultDeploymentMockFactory, 
  DeploymentMocks,
  type DeploymentOperationType,
  type DeploymentEnvironment,
  type DeploymentMockConfig 
} from '../utils/deployment-mock-factory';
import { isSuccess, isFailure } from '../../src/shared/types/result';

describe('DeploymentMockFactory', () => {
  let factory: DeploymentMockFactory;

  beforeEach(() => {
    factory = new DeploymentMockFactory();
  });

  describe('Constructor and Configuration', () => {
    it('should create factory with default configuration', () => {
      const config = factory.getConfig();
      
      expect(config.successRate).toBe(0.90);
      expect(config.durationRange.min).toBe(5000);
      expect(config.durationRange.max).toBe(30000);
      expect(config.includeWarnings).toBe(false);
      expect(config.defaultEnvironment).toBe('staging');
      expect(config.generateUrls).toBe(true);
      expect(config.errorScenarios).toEqual({});
    });

    it('should create factory with custom configuration', () => {
      const customConfig: Partial<DeploymentMockConfig> = {
        successRate: 0.8,
        durationRange: { min: 2000, max: 15000 },
        includeWarnings: true,
        defaultEnvironment: 'production',
        generateUrls: false
      };

      const customFactory = new DeploymentMockFactory(customConfig);
      const config = customFactory.getConfig();

      expect(config.successRate).toBe(0.8);
      expect(config.durationRange.min).toBe(2000);
      expect(config.durationRange.max).toBe(15000);
      expect(config.includeWarnings).toBe(true);
      expect(config.defaultEnvironment).toBe('production');
      expect(config.generateUrls).toBe(false);
    });

    it('should update configuration after creation', () => {
      factory.updateConfig({ successRate: 0.5, defaultEnvironment: 'development' });
      
      const config = factory.getConfig();
      expect(config.successRate).toBe(0.5);
      expect(config.defaultEnvironment).toBe('development');
    });

    it('should reset factory state and configuration', () => {
      factory.updateConfig({ successRate: 0.5, defaultEnvironment: 'production' });
      factory.reset();
      
      const config = factory.getConfig();
      expect(config.successRate).toBe(0.90); // Back to default
      expect(config.defaultEnvironment).toBe('staging'); // Back to default
    });
  });

  describe('Deployment Operation Types', () => {
    const operationTypes: DeploymentOperationType[] = [
      'application',
      'infrastructure',
      'database',
      'configuration',
      'rollback',
      'health-check',
      'scaling',
      'migration'
    ];

    operationTypes.forEach(type => {
      it(`should create successful response for ${type} operation`, () => {
        const result = factory.createDeploymentResponse(type, { forceSuccess: true });
        
        expect(isSuccess(result)).toBe(true);
        if (isSuccess(result)) {
          expect(result.data.deployment.type).toBe(type);
          expect(result.data.deployment.status).toBe('deployed');
          expect(result.data.deployment.id).toMatch(/^deploy_[a-z0-9]+_[a-z0-9]+$/);
          expect(result.data.deployment.startTime).toBeInstanceOf(Date);
          expect(result.data.deployment.endTime).toBeInstanceOf(Date);
          expect(result.data.deployment.version).toMatch(/^\d+\.\d+\.\d+$/);
          expect(result.data.deployment.buildId).toMatch(/^[a-f0-9]{8}$/);
          expect(result.data.duration).toBeGreaterThan(0);
          expect(result.data.message).toContain('successfully');
          expect(result.data.artifacts).toBeInstanceOf(Array);
        }
      });

      it(`should create failure response for ${type} operation`, () => {
        const result = factory.createDeploymentResponse(type, { forceFailure: true });
        
        expect(isFailure(result)).toBe(true);
        if (isFailure(result)) {
          expect(result.error.operation).toBe(type);
          expect(result.error.code).toMatch(/^DEPLOY_/);
          expect(result.error.message).toBeTruthy();
          expect(result.error.suggestions).toBeInstanceOf(Array);
          expect(result.error.suggestions!.length).toBeGreaterThan(0);
          expect(typeof result.error.rollbackRecommended).toBe('boolean');
        }
      });
    });
  });

  describe('Environment Handling', () => {
    const environments: DeploymentEnvironment[] = [
      'development',
      'staging', 
      'production',
      'test',
      'preview'
    ];

    environments.forEach(environment => {
      it(`should handle ${environment} environment correctly`, () => {
        const result = factory.createDeploymentResponse('application', { 
          forceSuccess: true, 
          environment 
        });
        
        if (isSuccess(result)) {
          expect(result.data.deployment.environment).toBe(environment);
          expect(result.data.message).toContain(environment);
          
          if (factory.getConfig().generateUrls) {
            expect(result.data.deployment.deploymentUrl).toContain(
              environment === 'production' ? 'app.example.com' : `${environment}-app.example.com`
            );
          }
        }
      });

      it(`should handle ${environment} environment in failure scenarios`, () => {
        const result = factory.createDeploymentResponse('application', { 
          forceFailure: true, 
          environment 
        });
        
        if (isFailure(result)) {
          expect(result.error.environment).toBe(environment);
          expect(result.error.message).toContain(environment);
        }
      });
    });
  });

  describe('Response Consistency', () => {
    it('should generate unique operation IDs', () => {
      const ids = new Set<string>();
      
      for (let i = 0; i < 100; i++) {
        const result = factory.createDeploymentResponse('application', { forceSuccess: true });
        if (isSuccess(result)) {
          ids.add(result.data.deployment.id);
        }
      }
      
      expect(ids.size).toBe(100); // All IDs should be unique
    });

    it('should respect duration range configuration', () => {
      factory.updateConfig({ durationRange: { min: 10000, max: 20000 } });
      
      for (let i = 0; i < 50; i++) {
        const result = factory.createDeploymentResponse('application', { forceSuccess: true });
        if (isSuccess(result)) {
          expect(result.data.duration).toBeGreaterThanOrEqual(10000);
          expect(result.data.duration).toBeLessThanOrEqual(20000);
        }
      }
    });

    it('should include warnings when configured', () => {
      factory.updateConfig({ includeWarnings: true });
      
      const result = factory.createDeploymentResponse('application', { forceSuccess: true });
      if (isSuccess(result)) {
        // Warnings may or may not be present (randomly generated), but should be array if present
        if (result.data.warnings) {
          expect(result.data.warnings).toBeInstanceOf(Array);
        }
      }
    });

    it('should not include warnings when disabled', () => {
      factory.updateConfig({ includeWarnings: false });
      
      const result = factory.createDeploymentResponse('application', { forceSuccess: true });
      if (isSuccess(result)) {
        expect(result.data.warnings).toBeUndefined();
      }
    });

    it('should generate URLs when enabled', () => {
      factory.updateConfig({ generateUrls: true });
      
      const result = factory.createDeploymentResponse('application', { 
        forceSuccess: true, 
        environment: 'production' 
      });
      
      if (isSuccess(result)) {
        expect(result.data.deployment.deploymentUrl).toBeTruthy();
        expect(result.data.deployment.healthCheckUrl).toBeTruthy();
        expect(result.data.deployment.deploymentUrl).toMatch(/^https:\/\//);
        expect(result.data.deployment.healthCheckUrl).toMatch(/^https:\/\//);
      }
    });

    it('should not generate URLs when disabled', () => {
      factory.updateConfig({ generateUrls: false });
      
      const result = factory.createDeploymentResponse('application', { forceSuccess: true });
      
      if (isSuccess(result)) {
        expect(result.data.deployment.deploymentUrl).toBeUndefined();
        expect(result.data.deployment.healthCheckUrl).toBeUndefined();
      }
    });
  });

  describe('Deployment Metadata Validation', () => {
    it('should generate valid version strings', () => {
      for (let i = 0; i < 20; i++) {
        const result = factory.createDeploymentResponse('application', { forceSuccess: true });
        if (isSuccess(result)) {
          expect(result.data.deployment.version).toMatch(/^\d+\.\d+\.\d+$/);
        }
      }
    });

    it('should generate valid build IDs', () => {
      const result = factory.createDeploymentResponse('application', { forceSuccess: true });
      
      if (isSuccess(result)) {
        expect(result.data.deployment.buildId).toMatch(/^[a-f0-9]{8}$/);
      }
    });

    it('should include custom metadata when provided', () => {
      const customMetadata = { 
        testKey: 'testValue', 
        deployedBy: 'test-user',
        buildNumber: '12345'
      };
      const result = factory.createDeploymentResponse('application', { 
        forceSuccess: true, 
        customMetadata 
      });
      
      if (isSuccess(result)) {
        expect(result.data.deployment.metadata).toMatchObject(customMetadata);
      }
    });

    it('should include environment-specific metadata', () => {
      const prodResult = factory.createDeploymentResponse('application', { 
        forceSuccess: true, 
        environment: 'production' 
      });
      const devResult = factory.createDeploymentResponse('application', { 
        forceSuccess: true, 
        environment: 'development' 
      });
      
      if (isSuccess(prodResult) && isSuccess(devResult)) {
        // Production should have more instances/replicas
        expect(prodResult.data.deployment.metadata?.instances).toBeGreaterThan(
          devResult.data.deployment.metadata?.instances
        );
        expect(prodResult.data.deployment.metadata?.replicas).toBeGreaterThan(
          devResult.data.deployment.metadata?.replicas
        );
      }
    });

    it('should generate appropriate artifacts for different operation types', () => {
      const appResult = factory.createDeploymentResponse('application', { forceSuccess: true });
      const dbResult = factory.createDeploymentResponse('database', { forceSuccess: true });
      const infraResult = factory.createDeploymentResponse('infrastructure', { forceSuccess: true });

      if (isSuccess(appResult)) {
        expect(appResult.data.artifacts).toContain('deployment.yaml');
        expect(appResult.data.artifacts).toContain('service.yaml');
      }

      if (isSuccess(dbResult)) {
        expect(dbResult.data.artifacts).toContain('database-schema.sql');
        expect(dbResult.data.artifacts).toContain('migration-scripts.sql');
      }

      if (isSuccess(infraResult)) {
        expect(infraResult.data.artifacts).toContain('cloudformation-template.yaml');
        expect(infraResult.data.artifacts).toContain('terraform-state.tfstate');
      }
    });
  });

  describe('Error Scenarios', () => {
    it('should use custom error scenarios when configured', () => {
      const customError = {
        code: 'CUSTOM_DEPLOYMENT_ERROR',
        message: 'Custom deployment error message',
        operation: 'application' as DeploymentOperationType,
        environment: 'production' as DeploymentEnvironment,
        suggestions: ['Custom suggestion'],
        rollbackRecommended: true
      };

      factory.updateConfig({
        errorScenarios: {
          application: customError
        }
      });

      const result = factory.createDeploymentResponse('application', { forceFailure: true });
      
      if (isFailure(result)) {
        expect(result.error.code).toBe('CUSTOM_DEPLOYMENT_ERROR');
        expect(result.error.message).toBe('Custom deployment error message');
        expect(result.error.suggestions).toEqual(['Custom suggestion']);
        expect(result.error.rollbackRecommended).toBe(true);
      }
    });

    it('should include deployment context in error responses', () => {
      const result = factory.createDeploymentResponse('database', { 
        forceFailure: true,
        environment: 'production',
        version: '2.1.0'
      });
      
      if (isFailure(result)) {
        expect(result.error.context).toBeDefined();
        expect(result.error.context!.operationId).toMatch(/^deploy_/);
        expect(result.error.context!.startTime).toBeTruthy();
        expect(result.error.context!.version).toBe('2.1.0');
        expect(result.error.environment).toBe('production');
      }
    });

    it('should set appropriate rollback recommendations', () => {
      const appResult = factory.createDeploymentResponse('application', { forceFailure: true });
      const infraResult = factory.createDeploymentResponse('infrastructure', { forceFailure: true });
      const healthResult = factory.createDeploymentResponse('health-check', { forceFailure: true });

      if (isFailure(appResult)) {
        expect(appResult.error.rollbackRecommended).toBe(true); // App deployments should recommend rollback
      }

      if (isFailure(infraResult)) {
        expect(infraResult.error.rollbackRecommended).toBe(false); // Infrastructure rollbacks are complex
      }

      if (isFailure(healthResult)) {
        expect(healthResult.error.rollbackRecommended).toBe(false); // Health checks don't need rollback
      }
    });
  });

  describe('Success Rate Configuration', () => {
    it('should respect success rate configuration', () => {
      // Set very low success rate to test failure generation
      factory.updateConfig({ successRate: 0.1 });
      
      let successCount = 0;
      let failureCount = 0;
      
      // Run many operations to test probability
      for (let i = 0; i < 100; i++) {
        const result = factory.createDeploymentResponse('application');
        if (isSuccess(result)) {
          successCount++;
        } else {
          failureCount++;
        }
      }
      
      // With 0.1 success rate, we should have more failures than successes
      expect(failureCount).toBeGreaterThan(successCount);
    });

    it('should always succeed when forceSuccess is true', () => {
      factory.updateConfig({ successRate: 0 }); // 0% success rate
      
      const result = factory.createDeploymentResponse('application', { forceSuccess: true });
      expect(isSuccess(result)).toBe(true);
    });

    it('should always fail when forceFailure is true', () => {
      factory.updateConfig({ successRate: 1 }); // 100% success rate
      
      const result = factory.createDeploymentResponse('application', { forceFailure: true });
      expect(isFailure(result)).toBe(true);
    });
  });

  describe('Version and Custom Options', () => {
    it('should use custom version when provided', () => {
      const customVersion = '3.2.1';
      const result = factory.createDeploymentResponse('application', { 
        forceSuccess: true, 
        version: customVersion 
      });
      
      if (isSuccess(result)) {
        expect(result.data.deployment.version).toBe(customVersion);
      }
    });

    it('should use custom environment when provided', () => {
      const customEnvironment: DeploymentEnvironment = 'preview';
      const result = factory.createDeploymentResponse('application', { 
        forceSuccess: true, 
        environment: customEnvironment 
      });
      
      if (isSuccess(result)) {
        expect(result.data.deployment.environment).toBe(customEnvironment);
      }
    });
  });
});

describe('Default Deployment Mock Factory', () => {
  it('should be available as singleton instance', () => {
    expect(defaultDeploymentMockFactory).toBeInstanceOf(DeploymentMockFactory);
  });

  it('should have default configuration', () => {
    const config = defaultDeploymentMockFactory.getConfig();
    expect(config.successRate).toBe(0.90);
    expect(config.defaultEnvironment).toBe('staging');
  });
});

describe('DeploymentMocks Convenience Functions', () => {
  describe('Application Deployment Mocks', () => {
    it('should create successful application deployment', () => {
      const result = DeploymentMocks.successfulAppDeployment();
      
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.deployment.type).toBe('application');
        expect(result.data.deployment.status).toBe('deployed');
      }
    });

    it('should create failed application deployment', () => {
      const result = DeploymentMocks.failedAppDeployment();
      
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.operation).toBe('application');
      }
    });

    it('should accept environment and custom metadata for application deployment', () => {
      const customMetadata = { deployedBy: 'test-user' };
      const result = DeploymentMocks.successfulAppDeployment('production', customMetadata);
      
      if (isSuccess(result)) {
        expect(result.data.deployment.environment).toBe('production');
        expect(result.data.deployment.metadata).toMatchObject(customMetadata);
      }
    });
  });

  describe('Infrastructure Deployment Mocks', () => {
    it('should create successful infrastructure deployment', () => {
      const result = DeploymentMocks.successfulInfraDeployment();
      
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.deployment.type).toBe('infrastructure');
        expect(result.data.deployment.status).toBe('deployed');
      }
    });

    it('should create failed infrastructure deployment', () => {
      const result = DeploymentMocks.failedInfraDeployment();
      
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.operation).toBe('infrastructure');
      }
    });
  });

  describe('Database Deployment Mocks', () => {
    it('should create successful database deployment', () => {
      const result = DeploymentMocks.successfulDbDeployment();
      
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.deployment.type).toBe('database');
        expect(result.data.deployment.status).toBe('deployed');
      }
    });

    it('should create failed database deployment', () => {
      const result = DeploymentMocks.failedDbDeployment();
      
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.operation).toBe('database');
      }
    });
  });

  describe('Configuration Update Mocks', () => {
    it('should create successful configuration update', () => {
      const result = DeploymentMocks.successfulConfigUpdate();
      
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.deployment.type).toBe('configuration');
        expect(result.data.deployment.status).toBe('deployed');
      }
    });

    it('should create failed configuration update', () => {
      const result = DeploymentMocks.failedConfigUpdate();
      
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.operation).toBe('configuration');
      }
    });
  });

  describe('Rollback Mocks', () => {
    it('should create successful rollback', () => {
      const result = DeploymentMocks.successfulRollback();
      
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.deployment.type).toBe('rollback');
        expect(result.data.deployment.status).toBe('deployed');
      }
    });

    it('should create failed rollback', () => {
      const result = DeploymentMocks.failedRollback();
      
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.operation).toBe('rollback');
      }
    });
  });

  describe('Health Check Mocks', () => {
    it('should create successful health check', () => {
      const result = DeploymentMocks.successfulHealthCheck();
      
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.deployment.type).toBe('health-check');
        expect(result.data.deployment.status).toBe('deployed');
      }
    });

    it('should create failed health check', () => {
      const result = DeploymentMocks.failedHealthCheck();
      
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.operation).toBe('health-check');
      }
    });
  });
});

describe('Integration with Result Pattern', () => {
  it('should work seamlessly with Result pattern type guards', () => {
    const successResult = DeploymentMocks.successfulAppDeployment();
    const failureResult = DeploymentMocks.failedAppDeployment();

    // Test type guards
    expect(isSuccess(successResult)).toBe(true);
    expect(isFailure(successResult)).toBe(false);
    expect(isSuccess(failureResult)).toBe(false);
    expect(isFailure(failureResult)).toBe(true);

    // Test TypeScript type narrowing works correctly
    if (isSuccess(successResult)) {
      // TypeScript should know this is DeploymentResult
      expect(successResult.data.deployment).toBeDefined();
      expect(successResult.data.message).toBeDefined();
      expect(successResult.data.duration).toBeDefined();
    }

    if (isFailure(failureResult)) {
      // TypeScript should know this is DeploymentError
      expect(failureResult.error.code).toBeDefined();
      expect(failureResult.error.message).toBeDefined();
      expect(failureResult.error.operation).toBeDefined();
      expect(failureResult.error.environment).toBeDefined();
    }
  });
});

describe('Performance and Memory', () => {
  it('should handle many operations without memory issues', () => {
    const factory = new DeploymentMockFactory();
    const results: any[] = [];

    // Create many mock responses
    for (let i = 0; i < 1000; i++) {
      const result = factory.createDeploymentResponse('application');
      results.push(result);
    }

    expect(results.length).toBe(1000);
    
    // Verify all results are valid
    results.forEach(result => {
      expect(result).toHaveProperty('success');
      if (isSuccess(result)) {
        expect(result.data.deployment).toBeDefined();
      } else {
        expect(result.error).toBeDefined();
      }
    });
  });

  it('should reset state properly to prevent memory leaks', () => {
    const factory = new DeploymentMockFactory();
    
    // Generate many operations
    for (let i = 0; i < 100; i++) {
      factory.createDeploymentResponse('application');
    }
    
    // Reset should clear internal state
    factory.reset();
    
    // Should be able to continue generating operations
    const result = factory.createDeploymentResponse('database', { forceSuccess: true });
    expect(isSuccess(result)).toBe(true);
  });
});

describe('Cross-Environment Consistency', () => {
  it('should maintain consistent behavior across environments', () => {
    const testFactory = new DeploymentMockFactory();
    const environments: DeploymentEnvironment[] = ['development', 'staging', 'production'];
    
    environments.forEach(environment => {
      const result = testFactory.createDeploymentResponse('application', { 
        forceSuccess: true, 
        environment 
      });
      
      if (isSuccess(result)) {
        expect(result.data.deployment.environment).toBe(environment);
        expect(result.data.deployment.type).toBe('application');
        expect(result.data.deployment.status).toBe('deployed');
        expect(result.data.deployment.version).toMatch(/^\d+\.\d+\.\d+$/);
        expect(result.data.artifacts).toBeInstanceOf(Array);
        expect(result.data.artifacts!.length).toBeGreaterThan(0);
      }
    });
  });
});