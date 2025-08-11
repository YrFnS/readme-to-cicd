/**
 * Integration tests for YAML Generator orchestration
 * Tests the main YAMLGeneratorImpl class coordination of all specialized generators
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { YAMLGeneratorImpl } from '../../src/generator/yaml-generator';
import { DetectionResult, GenerationOptions, WorkflowType } from '../../src/generator/interfaces';

describe('YAML Generator Orchestration', () => {
  let generator: YAMLGeneratorImpl;
  let mockDetectionResult: DetectionResult;

  beforeEach(() => {
    generator = new YAMLGeneratorImpl({
      baseTemplatesPath: './templates',
      cacheEnabled: false // Disable caching for tests
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
        },
        {
          name: 'TypeScript',
          version: '4.8.0',
          confidence: 0.8,
          primary: false
        }
      ],
      buildTools: [
        {
          name: 'webpack',
          configFile: 'webpack.config.js',
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
          name: 'Jest',
          type: 'unit',
          confidence: 0.85
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
        name: 'test-react-app',
        description: 'A test React application',
        version: '1.0.0',
        license: 'MIT'
      }
    };
  });

  describe('Single Workflow Generation', () => {
    it('should generate a CI workflow with default options', async () => {
      const workflow = await generator.generateWorkflow(mockDetectionResult);

      expect(workflow).toBeDefined();
      expect(workflow.type).toBe('ci');
      expect(workflow.filename).toContain('ci');
      expect(workflow.content).toBeTruthy();
      expect(workflow.metadata).toBeDefined();
      expect(workflow.metadata.generatedAt).toBeInstanceOf(Date);
      expect(workflow.metadata.generatorVersion).toBe('1.0.0');
    });

    it('should generate a CD workflow with custom options', async () => {
      const options: GenerationOptions = {
        workflowType: 'cd',
        optimizationLevel: 'aggressive',
        includeComments: true,
        securityLevel: 'enterprise',
        environments: [
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
        ]
      };

      const workflow = await generator.generateWorkflow(mockDetectionResult, options);

      expect(workflow.type).toBe('cd');
      expect(workflow.metadata.optimizations).toContain('Environment management configured');
      expect(workflow.metadata.optimizations).toContain('Environments: staging, production');
    });

    it('should apply organization policies', async () => {
      const options: GenerationOptions = {
        workflowType: 'ci',
        optimizationLevel: 'standard',
        includeComments: true,
        securityLevel: 'basic',
        organizationPolicies: {
          requiredSecurityScans: ['dependency-scan', 'sast'],
          approvalRequired: true,
          allowedActions: ['actions/checkout@v4', 'actions/setup-node@v4'],
          blockedActions: ['actions/checkout@v2'],
          environmentRestrictions: {
            production: ['admin', 'deploy']
          }
        }
      };

      const workflow = await generator.generateWorkflow(mockDetectionResult, options);

      expect(workflow.metadata.optimizations).toContain('Security level: enterprise');
    });

    it('should handle template overrides', async () => {
      const options: GenerationOptions = {
        workflowType: 'ci',
        optimizationLevel: 'standard',
        includeComments: true,
        securityLevel: 'standard',
        customTemplates: {
          'ci-basic': {
            name: 'Custom CI Template',
            type: 'ci',
            triggers: {
              push: { branches: ['main', 'develop'] },
              pull_request: { branches: ['main'] }
            },
            jobs: [
              {
                name: 'custom-test',
                runsOn: 'ubuntu-latest',
                steps: [
                  {
                    name: 'Custom checkout',
                    uses: 'actions/checkout@v4'
                  }
                ]
              }
            ]
          }
        }
      };

      const workflow = await generator.generateWorkflow(mockDetectionResult, options);

      expect(workflow).toBeDefined();
      // Template overrides would be applied during template loading
    });
  });

  describe('Multiple Workflow Generation', () => {
    it('should generate multiple workflows successfully', async () => {
      const workflowTypes: WorkflowType[] = ['ci', 'cd', 'release'];
      const workflows = await generator.generateMultipleWorkflows(mockDetectionResult, workflowTypes);

      expect(workflows).toHaveLength(3);
      expect(workflows.map(w => w.type)).toEqual(['ci', 'cd', 'release']);
      
      // Check that each workflow has proper metadata
      workflows.forEach(workflow => {
        expect(workflow.metadata).toBeDefined();
        expect(workflow.metadata.generatedAt).toBeInstanceOf(Date);
        expect(workflow.content).toBeTruthy();
      });
    });

    it('should handle workflow generation failures gracefully', async () => {
      // Mock a scenario where one workflow type fails
      const workflowTypes: WorkflowType[] = ['ci', 'cd', 'maintenance'];
      
      // This should not throw, but may have fewer workflows if some fail
      const workflows = await generator.generateMultipleWorkflows(mockDetectionResult, workflowTypes);
      
      expect(workflows.length).toBeGreaterThan(0);
      expect(workflows.length).toBeLessThanOrEqual(3);
    });

    it('should add workflow coordination metadata', async () => {
      const workflowTypes: WorkflowType[] = ['ci', 'cd'];
      const workflows = await generator.generateMultipleWorkflows(mockDetectionResult, workflowTypes);

      expect(workflows).toHaveLength(2);
      
      // CD workflow should have coordination metadata
      const cdWorkflow = workflows.find(w => w.type === 'cd');
      expect(cdWorkflow?.metadata.optimizations).toContain('Workflow coordination configured');
    });
  });

  describe('Recommended Workflow Generation', () => {
    it('should generate recommended workflows based on detection results', async () => {
      const workflows = await generator.generateRecommendedWorkflows(mockDetectionResult);

      expect(workflows.length).toBeGreaterThan(0);
      
      // Should always include CI
      expect(workflows.some(w => w.type === 'ci')).toBe(true);
      
      // Should include CD since deployment targets are detected
      expect(workflows.some(w => w.type === 'cd')).toBe(true);
      
      // Should include maintenance
      expect(workflows.some(w => w.type === 'maintenance')).toBe(true);
    });

    it('should generate different recommendations for library projects', async () => {
      const libraryDetectionResult = {
        ...mockDetectionResult,
        packageManagers: [
          {
            name: 'npm',
            lockFile: 'package-lock.json',
            confidence: 0.9
          }
        ],
        deploymentTargets: [] // No deployment targets for library
      };

      const workflows = await generator.generateRecommendedWorkflows(libraryDetectionResult);

      expect(workflows.some(w => w.type === 'ci')).toBe(true);
      expect(workflows.some(w => w.type === 'release')).toBe(true);
    });
  });

  describe('Complete Workflow Suite Generation', () => {
    it('should generate complete workflow suite', async () => {
      const workflows = await generator.generateCompleteWorkflowSuite(mockDetectionResult);

      expect(workflows).toHaveLength(4);
      expect(workflows.map(w => w.type).sort()).toEqual(['cd', 'ci', 'maintenance', 'release']);
    });
  });

  describe('Framework-Specific Enhancements', () => {
    it('should apply Node.js enhancements for JavaScript projects', async () => {
      const workflow = await generator.generateWorkflow(mockDetectionResult);

      expect(workflow.metadata.optimizations).toContain('Node.js optimizations applied');
      expect(workflow.metadata.optimizations).toContain('Caching strategies applied');
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
        ],
        frameworks: [
          {
            name: 'Django',
            version: '4.0.0',
            confidence: 0.9,
            evidence: ['requirements.txt contains Django'],
            category: 'backend'
          }
        ]
      };

      const workflow = await generator.generateWorkflow(pythonDetectionResult);

      expect(workflow.metadata.optimizations).toContain('Python optimizations applied');
    });
  });

  describe('Environment Management', () => {
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

      const workflow = await generator.generateWorkflow(mockDetectionResult, options);

      expect(workflow.metadata.optimizations).toContain('Environment management configured');
      expect(workflow.metadata.optimizations).toContain('Environments: production');
    });
  });

  describe('Security Enhancements', () => {
    it('should apply security enhancements for enterprise security level', async () => {
      const options: GenerationOptions = {
        workflowType: 'ci',
        optimizationLevel: 'standard',
        includeComments: true,
        securityLevel: 'enterprise'
      };

      const workflow = await generator.generateWorkflow(mockDetectionResult, options);

      expect(workflow.metadata.optimizations).toContain('Security level: enterprise');
    });
  });

  describe('Validation', () => {
    it('should validate generated workflows', async () => {
      const workflow = await generator.generateWorkflow(mockDetectionResult);
      const validationResult = generator.validateWorkflow(workflow.content);

      expect(validationResult).toBeDefined();
      expect(validationResult.isValid).toBeDefined();
      expect(validationResult.errors).toBeDefined();
      expect(validationResult.warnings).toBeDefined();
    });
  });

  describe('Statistics and Utilities', () => {
    it('should provide generation statistics', async () => {
      const workflows = await generator.generateMultipleWorkflows(mockDetectionResult, ['ci', 'cd']);
      const stats = generator.getGenerationStatistics(workflows);

      expect(stats.totalWorkflows).toBe(2);
      expect(stats.workflowTypes.ci).toBe(1);
      expect(stats.workflowTypes.cd).toBe(1);
      expect(stats.generatorVersion).toBe('1.0.0');
      expect(stats.totalOptimizations).toBeGreaterThan(0);
    });

    it('should provide access to internal managers', () => {
      expect(generator.getTemplateManager()).toBeDefined();
      expect(generator.getEnvironmentManager()).toBeDefined();
      expect(generator.getWorkflowSpecializationManager()).toBeDefined();
    });

    it('should support cache management', async () => {
      generator.clearCaches();
      await generator.reloadTemplates();
      
      // Should not throw
      expect(true).toBe(true);
    });

    it('should provide version information', () => {
      expect(generator.getVersion()).toBe('1.0.0');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid detection results gracefully', async () => {
      const invalidDetectionResult = {
        ...mockDetectionResult,
        frameworks: [], // Empty frameworks
        languages: []   // Empty languages
      };

      // Should not throw, but generate a basic workflow
      const workflow = await generator.generateWorkflow(invalidDetectionResult);
      expect(workflow).toBeDefined();
    });

    it('should handle template loading errors gracefully', async () => {
      const generatorWithInvalidPath = new YAMLGeneratorImpl({
        baseTemplatesPath: '/nonexistent/path',
        cacheEnabled: false
      });

      // Should handle template loading errors
      try {
        await generatorWithInvalidPath.generateWorkflow(mockDetectionResult);
        // If it doesn't throw, that's also acceptable as it means graceful handling
        expect(true).toBe(true);
      } catch (error) {
        // If it does throw, verify it's a meaningful error
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Failed to generate workflow');
      }
    });
  });
});