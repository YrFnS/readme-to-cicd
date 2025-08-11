/**
 * Tests for Workflow Specialization functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CIWorkflowGenerator,
  CDWorkflowGenerator,
  ReleaseWorkflowGenerator,
  MaintenanceWorkflowGenerator,
  WorkflowSpecializationManager
} from '../../../src/generator/workflow-specialization';
import { DetectionResult, GenerationOptions } from '../../../src/generator/interfaces';

describe('Workflow Specialization', () => {
  let mockDetectionResult: DetectionResult;
  let mockOptions: GenerationOptions;

  beforeEach(() => {
    mockDetectionResult = {
      frameworks: [
        { name: 'React', version: '18.0.0', confidence: 0.9, evidence: ['package.json'], category: 'frontend' }
      ],
      languages: [
        { name: 'JavaScript', version: '18.0.0', confidence: 0.95, primary: true },
        { name: 'TypeScript', version: '5.0.0', confidence: 0.8, primary: false }
      ],
      buildTools: [
        { name: 'webpack', configFile: 'webpack.config.js', confidence: 0.8 }
      ],
      packageManagers: [
        { name: 'npm', lockFile: 'package-lock.json', confidence: 0.9 }
      ],
      testingFrameworks: [
        { name: 'Jest', type: 'unit', confidence: 0.9 },
        { name: 'Cypress', type: 'e2e', confidence: 0.7 }
      ],
      deploymentTargets: [
        { platform: 'Netlify', type: 'static', confidence: 0.8 }
      ],
      projectMetadata: {
        name: 'test-project',
        description: 'A test project',
        version: '1.0.0',
        license: 'MIT'
      }
    };

    mockOptions = {
      workflowType: 'ci',
      optimizationLevel: 'standard',
      includeComments: true,
      securityLevel: 'standard',
      testingStrategy: {
        unitTests: true,
        integrationTests: true,
        e2eTests: true,
        performanceTests: false,
        securityTests: true,
        contractTests: false,
        chaosEngineering: false
      }
    };
  });

  describe('CIWorkflowGenerator', () => {
    let generator: CIWorkflowGenerator;

    beforeEach(() => {
      generator = new CIWorkflowGenerator();
    });

    it('should generate CI workflow with correct structure', async () => {
      const result = await generator.generateCIWorkflow(mockDetectionResult, mockOptions);

      expect(result).toBeDefined();
      expect(result.type).toBe('ci');
      expect(result.filename).toBe('ci.yml');
      expect(result.content).toContain('Continuous Integration');
      expect(result.metadata.generatedAt).toBeInstanceOf(Date);
      expect(result.metadata.optimizations).toBeInstanceOf(Array);
    });

    it('should include language-specific setup steps', async () => {
      const result = await generator.generateCIWorkflow(mockDetectionResult, mockOptions);

      expect(result.content).toContain('Setup Node.js');
      expect(result.metadata.detectionSummary).toContain('JavaScript');
    });

    it('should apply optimizations based on level', async () => {
      const aggressiveOptions = { ...mockOptions, optimizationLevel: 'aggressive' as const };
      const result = await generator.generateCIWorkflow(mockDetectionResult, aggressiveOptions);

      expect(result.metadata.optimizations).toContain('Matrix strategy for multiple versions');
    });

    it('should include security scanning for non-basic security level', async () => {
      const enterpriseOptions = { ...mockOptions, securityLevel: 'enterprise' as const };
      const result = await generator.generateCIWorkflow(mockDetectionResult, enterpriseOptions);

      expect(result.metadata.optimizations).toContain('Security scanning integrated');
    });
  });

  describe('CDWorkflowGenerator', () => {
    let generator: CDWorkflowGenerator;

    beforeEach(() => {
      generator = new CDWorkflowGenerator();
      mockOptions.workflowType = 'cd';
      mockOptions.environments = [
        {
          name: 'staging',
          type: 'staging',
          approvalRequired: false,
          secrets: ['STAGING_SECRET'],
          variables: { NODE_ENV: 'staging' },
          deploymentStrategy: 'rolling',
          rollbackEnabled: true
        },
        {
          name: 'production',
          type: 'production',
          approvalRequired: true,
          secrets: ['PROD_SECRET'],
          variables: { NODE_ENV: 'production' },
          deploymentStrategy: 'blue-green',
          rollbackEnabled: true
        }
      ];
    });

    it('should generate CD workflow with deployment focus', async () => {
      const result = await generator.generateCDWorkflow(mockDetectionResult, mockOptions);

      expect(result).toBeDefined();
      expect(result.type).toBe('cd');
      expect(result.filename).toBe('cd.yml');
      expect(result.content).toContain('Continuous Deployment');
      expect(result.metadata.optimizations).toContain('Multi-environment deployment support');
    });

    it('should include environment-specific configurations', async () => {
      const result = await generator.generateCDWorkflow(mockDetectionResult, mockOptions);

      expect(result.metadata.optimizations).toContain('Health checks and verification');
      expect(result.metadata.optimizations).toContain('Rollback preparation and recovery');
    });

    it('should handle OIDC configuration', async () => {
      const oidcOptions = {
        ...mockOptions,
        environmentManagement: {
          includeSecretValidation: true,
          includeOIDC: true,
          includeConfigGeneration: true,
          generateEnvFiles: true,
          autoDetectSecrets: true
        }
      };

      const result = await generator.generateCDWorkflow(mockDetectionResult, oidcOptions);

      expect(result.metadata.optimizations).toContain('OIDC authentication for cloud deployments');
    });
  });

  describe('ReleaseWorkflowGenerator', () => {
    let generator: ReleaseWorkflowGenerator;

    beforeEach(() => {
      generator = new ReleaseWorkflowGenerator();
      mockOptions.workflowType = 'release';
    });

    it('should generate release workflow with versioning focus', async () => {
      const result = await generator.generateReleaseWorkflow(mockDetectionResult, mockOptions);

      expect(result).toBeDefined();
      expect(result.type).toBe('release');
      expect(result.filename).toBe('release.yml');
      expect(result.content).toContain('Release');
      expect(result.metadata.optimizations).toContain('Automated version calculation and updating');
    });

    it('should include changelog generation', async () => {
      const result = await generator.generateReleaseWorkflow(mockDetectionResult, mockOptions);

      expect(result.metadata.optimizations).toContain('Comprehensive changelog generation');
    });

    it('should include package publishing', async () => {
      const result = await generator.generateReleaseWorkflow(mockDetectionResult, mockOptions);

      expect(result.metadata.optimizations).toContain('Automated package publishing');
    });

    it('should handle projects without package managers', async () => {
      const noPackageManagerResult = {
        ...mockDetectionResult,
        packageManagers: []
      };

      const result = await generator.generateReleaseWorkflow(noPackageManagerResult, mockOptions);

      expect(result.metadata.warnings).toContain('No package managers detected - manual publishing may be required');
    });
  });

  describe('MaintenanceWorkflowGenerator', () => {
    let generator: MaintenanceWorkflowGenerator;

    beforeEach(() => {
      generator = new MaintenanceWorkflowGenerator();
      mockOptions.workflowType = 'maintenance';
    });

    it('should generate maintenance workflow with dependency focus', async () => {
      const result = await generator.generateMaintenanceWorkflow(mockDetectionResult, mockOptions);

      expect(result).toBeDefined();
      expect(result.type).toBe('maintenance');
      expect(result.filename).toBe('maintenance.yml');
      expect(result.content).toContain('Maintenance');
      expect(result.metadata.optimizations).toContain('Automated dependency updates');
    });

    it('should include security patching', async () => {
      const result = await generator.generateMaintenanceWorkflow(mockDetectionResult, mockOptions);

      expect(result.metadata.optimizations).toContain('Security vulnerability patching');
    });

    it('should include repository cleanup', async () => {
      const result = await generator.generateMaintenanceWorkflow(mockDetectionResult, mockOptions);

      expect(result.metadata.optimizations).toContain('Repository cleanup and maintenance');
    });

    it('should handle projects without package managers', async () => {
      const noPackageManagerResult = {
        ...mockDetectionResult,
        packageManagers: []
      };

      const result = await generator.generateMaintenanceWorkflow(noPackageManagerResult, mockOptions);

      expect(result.metadata.warnings).toContain('No package managers detected - limited maintenance capabilities');
    });
  });

  describe('WorkflowSpecializationManager', () => {
    let manager: WorkflowSpecializationManager;

    beforeEach(() => {
      manager = new WorkflowSpecializationManager();
    });

    it('should generate specialized workflow by type', async () => {
      const result = await manager.generateSpecializedWorkflow('ci', mockDetectionResult, mockOptions);

      expect(result).toBeDefined();
      expect(result.type).toBe('ci');
    });

    it('should generate multiple specialized workflows', async () => {
      const types = ['ci', 'cd', 'release', 'maintenance'] as const;
      const results = await manager.generateMultipleSpecializedWorkflows(types, mockDetectionResult, mockOptions);

      expect(results).toHaveLength(4);
      expect(results.map(r => r.type)).toEqual(['ci', 'cd', 'release', 'maintenance']);
    });

    it('should generate complete workflow suite', async () => {
      const results = await manager.generateCompleteWorkflowSuite(mockDetectionResult, mockOptions);

      expect(results).toHaveLength(4);
      expect(results.map(r => r.type)).toEqual(['ci', 'cd', 'release', 'maintenance']);
    });

    it('should generate recommended workflows based on detection', async () => {
      const results = await manager.generateRecommendedWorkflows(mockDetectionResult, mockOptions);

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.type === 'ci')).toBe(true);
      expect(results.some(r => r.type === 'maintenance')).toBe(true);
    });

    it('should validate workflow compatibility', () => {
      const validation = manager.validateWorkflowCompatibility(
        ['cd'],
        mockDetectionResult,
        mockOptions
      );

      expect(validation.compatible).toBe(true);
      expect(validation.warnings).toContain('CD workflow recommended with CI workflow for artifact reuse');
    });

    it('should generate workflow statistics', async () => {
      const workflows = await manager.generateCompleteWorkflowSuite(mockDetectionResult, mockOptions);
      const stats = manager.getGenerationStatistics(workflows);

      expect(stats.totalWorkflows).toBe(4);
      expect(stats.workflowTypes.ci).toBe(1);
      expect(stats.workflowTypes.cd).toBe(1);
      expect(stats.workflowTypes.release).toBe(1);
      expect(stats.workflowTypes.maintenance).toBe(1);
      expect(stats.optimizationsApplied.length).toBeGreaterThan(0);
    });

    it('should generate workflow coordination configuration', async () => {
      const workflows = await manager.generateCompleteWorkflowSuite(mockDetectionResult, mockOptions);
      const coordination = manager.generateWorkflowCoordination(workflows);

      expect(coordination.dependencies['cd.yml']).toContain('ci.yml');
      expect(coordination.dependencies['release.yml']).toContain('ci.yml');
      expect(coordination.triggers['ci.yml']).toContain('push');
      expect(coordination.triggers['ci.yml']).toContain('pull_request');
      expect(coordination.sharedSecrets).toContain('GITHUB_TOKEN');
    });

    it('should handle unsupported workflow types', async () => {
      await expect(
        manager.generateSpecializedWorkflow('unsupported' as any, mockDetectionResult, mockOptions)
      ).rejects.toThrow('Unsupported workflow type: unsupported');
    });
  });

  describe('Language-specific workflows', () => {
    it('should generate Python-specific CI workflow', async () => {
      const pythonDetection = {
        ...mockDetectionResult,
        languages: [
          { name: 'Python', version: '3.11', confidence: 0.95, primary: true }
        ],
        packageManagers: [
          { name: 'pip', lockFile: 'requirements.txt', confidence: 0.9 }
        ]
      };

      const generator = new CIWorkflowGenerator();
      const result = await generator.generateCIWorkflow(pythonDetection, mockOptions);

      expect(result.metadata.detectionSummary).toContain('Python');
    });

    it('should generate Java-specific release workflow', async () => {
      const javaDetection = {
        ...mockDetectionResult,
        languages: [
          { name: 'Java', version: '17', confidence: 0.95, primary: true }
        ],
        buildTools: [
          { name: 'maven', configFile: 'pom.xml', confidence: 0.9 }
        ],
        packageManagers: [
          { name: 'maven', lockFile: 'pom.xml', confidence: 0.9 }
        ]
      };

      const generator = new ReleaseWorkflowGenerator();
      const result = await generator.generateReleaseWorkflow(javaDetection, mockOptions);

      expect(result.metadata.detectionSummary).toContain('Java');
    });

    it('should generate Rust-specific maintenance workflow', async () => {
      const rustDetection = {
        ...mockDetectionResult,
        languages: [
          { name: 'Rust', version: '1.70', confidence: 0.95, primary: true }
        ],
        packageManagers: [
          { name: 'cargo', lockFile: 'Cargo.lock', confidence: 0.9 }
        ]
      };

      const generator = new MaintenanceWorkflowGenerator();
      const result = await generator.generateMaintenanceWorkflow(rustDetection, mockOptions);

      expect(result.metadata.detectionSummary).toContain('Rust');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty detection results', async () => {
      const emptyDetection: DetectionResult = {
        frameworks: [],
        languages: [],
        buildTools: [],
        packageManagers: [],
        testingFrameworks: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'empty-project'
        }
      };

      const generator = new CIWorkflowGenerator();
      const result = await generator.generateCIWorkflow(emptyDetection, mockOptions);

      expect(result).toBeDefined();
      expect(result.metadata.warnings).toContain('No languages detected - using generic workflow');
    });

    it('should handle minimal options', async () => {
      const minimalOptions: GenerationOptions = {
        workflowType: 'ci',
        optimizationLevel: 'basic',
        includeComments: false,
        securityLevel: 'basic'
      };

      const generator = new CIWorkflowGenerator();
      const result = await generator.generateCIWorkflow(mockDetectionResult, minimalOptions);

      expect(result).toBeDefined();
      expect(result.type).toBe('ci');
    });

    it('should continue generating other workflows when one fails', async () => {
      const manager = new WorkflowSpecializationManager();
      
      // Mock a failure in one generator
      const originalMethod = manager['releaseGenerator'].generateReleaseWorkflow;
      manager['releaseGenerator'].generateReleaseWorkflow = async () => {
        throw new Error('Test error');
      };

      const results = await manager.generateMultipleSpecializedWorkflows(
        ['ci', 'release', 'maintenance'],
        mockDetectionResult,
        mockOptions
      );

      // Should have CI and maintenance workflows, but not release
      expect(results).toHaveLength(2);
      expect(results.map(r => r.type)).toEqual(['ci', 'maintenance']);

      // Restore original method
      manager['releaseGenerator'].generateReleaseWorkflow = originalMethod;
    });
  });
});