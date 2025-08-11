/**
 * Unit tests for YAML Generator orchestration functionality
 * Tests the coordination and integration logic of YAMLGeneratorImpl
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { YAMLGeneratorImpl } from '../../src/generator/yaml-generator';
import { DetectionResult, GenerationOptions, WorkflowOutput } from '../../src/generator/interfaces';

// Mock all the specialized generators
vi.mock('../../src/generator/workflow-specialization/workflow-specialization-manager', () => ({
  WorkflowSpecializationManager: vi.fn().mockImplementation(() => ({
    generateSpecializedWorkflow: vi.fn(),
    generateMultipleSpecializedWorkflows: vi.fn(),
    validateWorkflowCompatibility: vi.fn().mockReturnValue({
      compatible: true,
      warnings: [],
      errors: []
    }),
    generateWorkflowCoordination: vi.fn().mockReturnValue({
      dependencies: {},
      triggers: {},
      sharedSecrets: [],
      sharedVariables: []
    }),
    getGenerationStatistics: vi.fn().mockReturnValue({
      totalWorkflows: 1,
      workflowTypes: { ci: 1 },
      totalSteps: 5,
      averageStepsPerWorkflow: 5,
      optimizationsApplied: ['opt1', 'opt2'],
      warningsGenerated: ['warn1']
    })
  }))
}));

vi.mock('../../src/generator/templates/template-manager', () => ({
  TemplateManager: vi.fn().mockImplementation(() => ({
    clearCache: vi.fn(),
    reloadTemplates: vi.fn()
  }))
}));

vi.mock('../../src/generator/environment-manager', () => ({
  EnvironmentManager: vi.fn().mockImplementation(() => ({
    generateEnvironmentSteps: vi.fn().mockReturnValue({
      environmentSteps: [],
      secretReferences: {},
      variableReferences: {},
      configFiles: [],
      oidcSteps: [],
      warnings: []
    }),
    clear: vi.fn()
  }))
}));

vi.mock('../../src/generator/validators/workflow-validator', () => ({
  WorkflowValidator: vi.fn().mockImplementation(() => ({
    validateWorkflow: vi.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    })
  }))
}));

// Mock other generators
vi.mock('../../src/generator/templates/nodejs-generator', () => ({
  NodeJSWorkflowGenerator: vi.fn().mockImplementation(() => ({}))
}));

vi.mock('../../src/generator/templates/python-generator', () => ({
  PythonWorkflowGenerator: vi.fn().mockImplementation(() => ({}))
}));

vi.mock('../../src/generator/templates/rust-generator', () => ({
  RustWorkflowGenerator: vi.fn().mockImplementation(() => ({}))
}));

vi.mock('../../src/generator/templates/go-generator', () => ({
  GoWorkflowGenerator: vi.fn().mockImplementation(() => ({}))
}));

vi.mock('../../src/generator/templates/java-generator', () => ({
  JavaWorkflowGenerator: vi.fn().mockImplementation(() => ({}))
}));

vi.mock('../../src/generator/templates/deployment-generator', () => ({
  DeploymentGenerator: vi.fn().mockImplementation(() => ({}))
}));

vi.mock('../../src/generator/templates/security-step-generator', () => ({
  SecurityStepGenerator: vi.fn().mockImplementation(() => ({}))
}));

vi.mock('../../src/generator/utils/cache-utils', () => ({
  CacheStrategyGenerator: vi.fn().mockImplementation(() => ({}))
}));

describe('YAML Generator Orchestration Unit Tests', () => {
  let generator: YAMLGeneratorImpl;
  let mockDetectionResult: DetectionResult;

  beforeEach(() => {
    vi.clearAllMocks();
    
    generator = new YAMLGeneratorImpl({
      baseTemplatesPath: './templates',
      cacheEnabled: false
    });

    mockDetectionResult = {
      frameworks: [
        {
          name: 'React',
          version: '18.0.0',
          confidence: 0.9,
          evidence: ['package.json contains react'],
          category: 'frontend'
        }
      ],
      languages: [
        {
          name: 'JavaScript',
          version: '18.0.0',
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
      testingFrameworks: [],
      deploymentTargets: [],
      projectMetadata: {
        name: 'test-app',
        description: 'Test application'
      }
    };
  });

  describe('Default Options Processing', () => {
    it('should set default options correctly', async () => {
      // Mock the workflow specialization manager
      const mockWorkflow: WorkflowOutput = {
        filename: 'ci.yml',
        content: 'name: CI\non: [push]',
        type: 'ci',
        metadata: {
          generatedAt: new Date(),
          generatorVersion: '1.0.0',
          detectionSummary: 'React application',
          optimizations: [],
          warnings: []
        }
      };

      // Mock the generateSpecializedWorkflow method
      const mockGenerateSpecializedWorkflow = vi.fn().mockResolvedValue(mockWorkflow);
      (generator as any).workflowSpecializationManager.generateSpecializedWorkflow = mockGenerateSpecializedWorkflow;

      await generator.generateWorkflow(mockDetectionResult);

      // Verify default options were applied
      expect(mockGenerateSpecializedWorkflow).toHaveBeenCalledWith(
        'ci', // default workflow type
        mockDetectionResult,
        expect.objectContaining({
          workflowType: 'ci',
          optimizationLevel: 'standard',
          includeComments: true,
          securityLevel: 'standard',
          agentHooksEnabled: false,
          environmentManagement: expect.objectContaining({
            includeSecretValidation: true,
            includeOIDC: true,
            includeConfigGeneration: true,
            generateEnvFiles: true,
            autoDetectSecrets: true
          })
        })
      );
    });

    it('should preserve custom options', async () => {
      const customOptions: GenerationOptions = {
        workflowType: 'cd',
        optimizationLevel: 'aggressive',
        includeComments: false,
        securityLevel: 'enterprise',
        agentHooksEnabled: true
      };

      const mockWorkflow: WorkflowOutput = {
        filename: 'cd.yml',
        content: 'name: CD\non: [push]',
        type: 'cd',
        metadata: {
          generatedAt: new Date(),
          generatorVersion: '1.0.0',
          detectionSummary: 'React application',
          optimizations: [],
          warnings: []
        }
      };

      const mockGenerateSpecializedWorkflow = vi.fn().mockResolvedValue(mockWorkflow);
      (generator as any).workflowSpecializationManager.generateSpecializedWorkflow = mockGenerateSpecializedWorkflow;

      await generator.generateWorkflow(mockDetectionResult, customOptions);

      expect(mockGenerateSpecializedWorkflow).toHaveBeenCalledWith(
        'cd',
        mockDetectionResult,
        expect.objectContaining({
          workflowType: 'cd',
          optimizationLevel: 'aggressive',
          includeComments: false,
          securityLevel: 'enterprise',
          agentHooksEnabled: true
        })
      );
    });
  });

  describe('Organization Policy Application', () => {
    it('should apply security requirements from organization policies', async () => {
      const options: GenerationOptions = {
        workflowType: 'ci',
        optimizationLevel: 'standard',
        includeComments: true,
        securityLevel: 'basic',
        organizationPolicies: {
          requiredSecurityScans: ['dependency-scan', 'sast'],
          approvalRequired: false,
          allowedActions: [],
          blockedActions: [],
          environmentRestrictions: {}
        }
      };

      const mockWorkflow: WorkflowOutput = {
        filename: 'ci.yml',
        content: 'name: CI\non: [push]',
        type: 'ci',
        metadata: {
          generatedAt: new Date(),
          generatorVersion: '1.0.0',
          detectionSummary: 'React application',
          optimizations: [],
          warnings: []
        }
      };

      const mockGenerateSpecializedWorkflow = vi.fn().mockResolvedValue(mockWorkflow);
      (generator as any).workflowSpecializationManager.generateSpecializedWorkflow = mockGenerateSpecializedWorkflow;

      await generator.generateWorkflow(mockDetectionResult, options);

      // Should upgrade security level to enterprise
      expect(mockGenerateSpecializedWorkflow).toHaveBeenCalledWith(
        'ci',
        mockDetectionResult,
        expect.objectContaining({
          securityLevel: 'enterprise',
          testingStrategy: expect.objectContaining({
            securityTests: true
          })
        })
      );
    });

    it('should apply approval requirements to environments', async () => {
      const options: GenerationOptions = {
        workflowType: 'cd',
        optimizationLevel: 'standard',
        includeComments: true,
        securityLevel: 'standard',
        environments: [
          {
            name: 'staging',
            type: 'staging',
            approvalRequired: false,
            secrets: [],
            variables: {},
            deploymentStrategy: 'rolling',
            rollbackEnabled: true
          }
        ],
        organizationPolicies: {
          requiredSecurityScans: [],
          approvalRequired: true,
          allowedActions: [],
          blockedActions: [],
          environmentRestrictions: {}
        }
      };

      const mockWorkflow: WorkflowOutput = {
        filename: 'cd.yml',
        content: 'name: CD\non: [push]',
        type: 'cd',
        metadata: {
          generatedAt: new Date(),
          generatorVersion: '1.0.0',
          detectionSummary: 'React application',
          optimizations: [],
          warnings: []
        }
      };

      const mockGenerateSpecializedWorkflow = vi.fn().mockResolvedValue(mockWorkflow);
      (generator as any).workflowSpecializationManager.generateSpecializedWorkflow = mockGenerateSpecializedWorkflow;

      // Ensure the environment manager returns proper structure
      const mockGenerateEnvironmentSteps = vi.fn().mockReturnValue({
        environmentSteps: [],
        secretReferences: {},
        variableReferences: {},
        configFiles: [],
        oidcSteps: [],
        warnings: []
      });
      (generator as any).environmentManager.generateEnvironmentSteps = mockGenerateEnvironmentSteps;

      await generator.generateWorkflow(mockDetectionResult, options);

      // Should apply approval requirement to environments
      expect(mockGenerateSpecializedWorkflow).toHaveBeenCalledWith(
        'cd',
        mockDetectionResult,
        expect.objectContaining({
          environments: expect.arrayContaining([
            expect.objectContaining({
              approvalRequired: true
            })
          ])
        })
      );
    });
  });

  describe('Framework Enhancement Application', () => {
    it('should apply Node.js enhancements for JavaScript projects', async () => {
      const mockWorkflow: WorkflowOutput = {
        filename: 'ci.yml',
        content: 'name: CI\non: [push]',
        type: 'ci',
        metadata: {
          generatedAt: new Date(),
          generatorVersion: '1.0.0',
          detectionSummary: 'React application',
          optimizations: [],
          warnings: []
        }
      };

      const mockGenerateSpecializedWorkflow = vi.fn().mockResolvedValue(mockWorkflow);
      (generator as any).workflowSpecializationManager.generateSpecializedWorkflow = mockGenerateSpecializedWorkflow;

      const result = await generator.generateWorkflow(mockDetectionResult);

      expect(result.metadata.optimizations).toContain('Node.js optimizations applied');
      expect(result.metadata.optimizations).toContain('Caching strategies applied');
    });

    it('should apply Python enhancements for Python projects', async () => {
      const pythonDetectionResult = {
        ...mockDetectionResult,
        languages: [
          {
            name: 'Python',
            version: '3.9.0',
            confidence: 0.95,
            primary: true
          }
        ]
      };

      const mockWorkflow: WorkflowOutput = {
        filename: 'ci.yml',
        content: 'name: CI\non: [push]',
        type: 'ci',
        metadata: {
          generatedAt: new Date(),
          generatorVersion: '1.0.0',
          detectionSummary: 'Python application',
          optimizations: [],
          warnings: []
        }
      };

      const mockGenerateSpecializedWorkflow = vi.fn().mockResolvedValue(mockWorkflow);
      (generator as any).workflowSpecializationManager.generateSpecializedWorkflow = mockGenerateSpecializedWorkflow;

      const result = await generator.generateWorkflow(pythonDetectionResult);

      expect(result.metadata.optimizations).toContain('Python optimizations applied');
    });

    it('should apply security enhancements for non-basic security levels', async () => {
      const options: GenerationOptions = {
        workflowType: 'ci',
        optimizationLevel: 'standard',
        includeComments: true,
        securityLevel: 'enterprise'
      };

      const mockWorkflow: WorkflowOutput = {
        filename: 'ci.yml',
        content: 'name: CI\non: [push]',
        type: 'ci',
        metadata: {
          generatedAt: new Date(),
          generatorVersion: '1.0.0',
          detectionSummary: 'React application',
          optimizations: [],
          warnings: []
        }
      };

      const mockGenerateSpecializedWorkflow = vi.fn().mockResolvedValue(mockWorkflow);
      (generator as any).workflowSpecializationManager.generateSpecializedWorkflow = mockGenerateSpecializedWorkflow;

      const result = await generator.generateWorkflow(mockDetectionResult, options);

      expect(result.metadata.optimizations).toContain('Security level: enterprise');
    });

    it('should apply deployment enhancements when deployment targets are detected', async () => {
      const detectionWithDeployment = {
        ...mockDetectionResult,
        deploymentTargets: [
          {
            platform: 'Vercel',
            type: 'static' as const,
            confidence: 0.8
          }
        ]
      };

      const mockWorkflow: WorkflowOutput = {
        filename: 'ci.yml',
        content: 'name: CI\non: [push]',
        type: 'ci',
        metadata: {
          generatedAt: new Date(),
          generatorVersion: '1.0.0',
          detectionSummary: 'React application',
          optimizations: [],
          warnings: []
        }
      };

      const mockGenerateSpecializedWorkflow = vi.fn().mockResolvedValue(mockWorkflow);
      (generator as any).workflowSpecializationManager.generateSpecializedWorkflow = mockGenerateSpecializedWorkflow;

      const result = await generator.generateWorkflow(detectionWithDeployment);

      expect(result.metadata.optimizations).toContain('Deployment optimizations applied');
    });
  });

  describe('Environment Management Application', () => {
    it('should apply environment management when environments are configured', async () => {
      const options: GenerationOptions = {
        workflowType: 'cd',
        optimizationLevel: 'standard',
        includeComments: true,
        securityLevel: 'standard',
        environments: [
          {
            name: 'production',
            type: 'production',
            approvalRequired: true,
            secrets: ['PROD_API_KEY'],
            variables: { NODE_ENV: 'production' },
            deploymentStrategy: 'blue-green',
            rollbackEnabled: true
          }
        ],
        environmentManagement: {
          includeSecretValidation: true,
          includeOIDC: true,
          includeConfigGeneration: true,
          generateEnvFiles: true,
          autoDetectSecrets: true
        }
      };

      const mockWorkflow: WorkflowOutput = {
        filename: 'cd.yml',
        content: 'name: CD\non: [push]',
        type: 'cd',
        metadata: {
          generatedAt: new Date(),
          generatorVersion: '1.0.0',
          detectionSummary: 'React application',
          optimizations: [],
          warnings: []
        }
      };

      const mockGenerateSpecializedWorkflow = vi.fn().mockResolvedValue(mockWorkflow);
      (generator as any).workflowSpecializationManager.generateSpecializedWorkflow = mockGenerateSpecializedWorkflow;

      // Mock environment manager
      const mockGenerateEnvironmentSteps = vi.fn().mockReturnValue({
        environmentSteps: [],
        secretReferences: { PROD_API_KEY: '${{ secrets.PROD_API_KEY }}' },
        variableReferences: { NODE_ENV: 'production' },
        configFiles: [],
        oidcSteps: [],
        warnings: []
      });
      (generator as any).environmentManager.generateEnvironmentSteps = mockGenerateEnvironmentSteps;

      const result = await generator.generateWorkflow(mockDetectionResult, options);

      expect(mockGenerateEnvironmentSteps).toHaveBeenCalledWith(
        options.environments,
        mockDetectionResult
      );
      expect(result.metadata.optimizations).toContain('Environment management configured');
      expect(result.metadata.optimizations).toContain('Environments: production');
      expect(result.metadata.optimizations).toContain('Secrets configured: 1');
    });

    it('should skip environment management when not configured', async () => {
      const options: GenerationOptions = {
        workflowType: 'ci',
        optimizationLevel: 'standard',
        includeComments: true,
        securityLevel: 'standard'
        // No environments or environmentManagement
      };

      const mockWorkflow: WorkflowOutput = {
        filename: 'ci.yml',
        content: 'name: CI\non: [push]',
        type: 'ci',
        metadata: {
          generatedAt: new Date(),
          generatorVersion: '1.0.0',
          detectionSummary: 'React application',
          optimizations: [],
          warnings: []
        }
      };

      const mockGenerateSpecializedWorkflow = vi.fn().mockResolvedValue(mockWorkflow);
      (generator as any).workflowSpecializationManager.generateSpecializedWorkflow = mockGenerateSpecializedWorkflow;

      const mockGenerateEnvironmentSteps = vi.fn();
      (generator as any).environmentManager.generateEnvironmentSteps = mockGenerateEnvironmentSteps;

      await generator.generateWorkflow(mockDetectionResult, options);

      expect(mockGenerateEnvironmentSteps).not.toHaveBeenCalled();
    });
  });

  describe('Template Override Handling', () => {
    it('should clear template cache when custom templates are provided', async () => {
      const options: GenerationOptions = {
        workflowType: 'ci',
        optimizationLevel: 'standard',
        includeComments: true,
        securityLevel: 'standard',
        customTemplates: {
          'ci-basic': {
            name: 'Custom CI',
            type: 'ci',
            triggers: {},
            jobs: []
          }
        }
      };

      const mockWorkflow: WorkflowOutput = {
        filename: 'ci.yml',
        content: 'name: CI\non: [push]',
        type: 'ci',
        metadata: {
          generatedAt: new Date(),
          generatorVersion: '1.0.0',
          detectionSummary: 'React application',
          optimizations: [],
          warnings: []
        }
      };

      const mockGenerateSpecializedWorkflow = vi.fn().mockResolvedValue(mockWorkflow);
      (generator as any).workflowSpecializationManager.generateSpecializedWorkflow = mockGenerateSpecializedWorkflow;

      const mockClearCache = vi.fn();
      (generator as any).templateManager.clearCache = mockClearCache;

      await generator.generateWorkflow(mockDetectionResult, options);

      expect(mockClearCache).toHaveBeenCalled();
    });

    it('should not clear cache when no custom templates are provided', async () => {
      const mockWorkflow: WorkflowOutput = {
        filename: 'ci.yml',
        content: 'name: CI\non: [push]',
        type: 'ci',
        metadata: {
          generatedAt: new Date(),
          generatorVersion: '1.0.0',
          detectionSummary: 'React application',
          optimizations: [],
          warnings: []
        }
      };

      const mockGenerateSpecializedWorkflow = vi.fn().mockResolvedValue(mockWorkflow);
      (generator as any).workflowSpecializationManager.generateSpecializedWorkflow = mockGenerateSpecializedWorkflow;

      const mockClearCache = vi.fn();
      (generator as any).templateManager.clearCache = mockClearCache;

      await generator.generateWorkflow(mockDetectionResult);

      expect(mockClearCache).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle workflow generation errors gracefully', async () => {
      const mockGenerateSpecializedWorkflow = vi.fn().mockRejectedValue(new Error('Template not found'));
      (generator as any).workflowSpecializationManager.generateSpecializedWorkflow = mockGenerateSpecializedWorkflow;

      await expect(generator.generateWorkflow(mockDetectionResult)).rejects.toThrow('Failed to generate workflow: Template not found');
    });

    it('should handle multiple workflow generation errors gracefully', async () => {
      // Mock validateWorkflowCompatibility to return an error
      const mockValidateWorkflowCompatibility = vi.fn().mockReturnValue({
        compatible: false,
        warnings: [],
        errors: ['Incompatible workflow types']
      });
      (generator as any).workflowSpecializationManager.validateWorkflowCompatibility = mockValidateWorkflowCompatibility;

      await expect(generator.generateMultipleWorkflows(mockDetectionResult, ['ci', 'cd'])).rejects.toThrow('Incompatible workflow types: Incompatible workflow types');
    });
  });

  describe('Utility Methods', () => {
    it('should provide access to internal managers', () => {
      expect(generator.getTemplateManager()).toBeDefined();
      expect(generator.getEnvironmentManager()).toBeDefined();
      expect(generator.getWorkflowSpecializationManager()).toBeDefined();
    });

    it('should provide version information', () => {
      expect(generator.getVersion()).toBe('1.0.0');
    });

    it('should support cache management', async () => {
      const mockClearCache = vi.fn();
      const mockReloadTemplates = vi.fn();
      const mockClear = vi.fn();

      (generator as any).templateManager.clearCache = mockClearCache;
      (generator as any).templateManager.reloadTemplates = mockReloadTemplates;
      (generator as any).environmentManager.clear = mockClear;

      generator.clearCaches();
      await generator.reloadTemplates();

      expect(mockClearCache).toHaveBeenCalled();
      expect(mockReloadTemplates).toHaveBeenCalled();
      expect(mockClear).toHaveBeenCalled();
    });

    it('should provide generation statistics', () => {
      const mockWorkflows: WorkflowOutput[] = [
        {
          filename: 'ci.yml',
          content: 'name: CI',
          type: 'ci',
          metadata: {
            generatedAt: new Date(),
            generatorVersion: '1.0.0',
            detectionSummary: 'Test',
            optimizations: ['opt1', 'opt2'],
            warnings: ['warn1']
          }
        }
      ];

      const mockGetGenerationStatistics = vi.fn().mockReturnValue({
        totalWorkflows: 1,
        workflowTypes: { ci: 1 },
        totalSteps: 5,
        averageStepsPerWorkflow: 5,
        optimizationsApplied: ['opt1', 'opt2'],
        warningsGenerated: ['warn1']
      });

      (generator as any).workflowSpecializationManager.getGenerationStatistics = mockGetGenerationStatistics;

      const stats = generator.getGenerationStatistics(mockWorkflows);

      expect(stats.totalWorkflows).toBe(1);
      expect(stats.generatorVersion).toBe('1.0.0');
      expect(stats.totalOptimizations).toBe(2);
      expect(stats.totalWarnings).toBe(1);
      expect(stats.averageOptimizationsPerWorkflow).toBe(2);
    });
  });
});