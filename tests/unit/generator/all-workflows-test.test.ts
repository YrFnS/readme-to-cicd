/**
 * Comprehensive test for all workflow generators
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorkingWorkflowSpecializationManager } from '../../../src/generator/workflow-specialization/working-workflow-manager';
import { DetectionResult, GenerationOptions } from '../../../src/generator/interfaces';

describe('All Workflow Types Generation', () => {
  let manager: WorkingWorkflowSpecializationManager;
  let mockDetectionResult: DetectionResult;
  let mockOptions: GenerationOptions;

  beforeEach(() => {
    manager = new WorkingWorkflowSpecializationManager();
    
    mockDetectionResult = {
      frameworks: [
        { name: 'React', version: '18.0.0', confidence: 0.9, evidence: ['package.json'], category: 'frontend' }
      ],
      languages: [
        { name: 'JavaScript', version: '18.0.0', confidence: 0.95, primary: true }
      ],
      buildTools: [
        { name: 'webpack', configFile: 'webpack.config.js', confidence: 0.8 }
      ],
      packageManagers: [
        { name: 'npm', lockFile: 'package-lock.json', confidence: 0.9 }
      ],
      testingFrameworks: [
        { name: 'Jest', type: 'unit', confidence: 0.9 }
      ],
      deploymentTargets: [
        { platform: 'Netlify', type: 'static', confidence: 0.8 }
      ],
      projectMetadata: {
        name: 'test-project',
        description: 'A test project',
        version: '1.0.0'
      }
    };

    mockOptions = {
      workflowType: 'ci',
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
      ]
    };
  });

  it('should generate CI workflow', async () => {
    const result = await manager.generateSpecializedWorkflow('ci', mockDetectionResult, mockOptions);

    expect(result).toBeDefined();
    expect(result.type).toBe('ci');
    expect(result.filename).toBe('ci.yml');
    expect(result.content).toContain('Continuous Integration');
    expect(result.metadata.optimizations.length).toBeGreaterThan(0);
  });

  it('should generate CD workflow', async () => {
    const result = await manager.generateSpecializedWorkflow('cd', mockDetectionResult, mockOptions);

    expect(result).toBeDefined();
    expect(result.type).toBe('cd');
    expect(result.filename).toBe('cd.yml');
    expect(result.content).toContain('Continuous Deployment');
    expect(result.metadata.optimizations).toContain('Multi-environment deployment support');
  });

  it('should generate Release workflow', async () => {
    const result = await manager.generateSpecializedWorkflow('release', mockDetectionResult, mockOptions);

    expect(result).toBeDefined();
    expect(result.type).toBe('release');
    expect(result.filename).toBe('release.yml');
    expect(result.content).toContain('Release');
    expect(result.metadata.optimizations).toContain('Automated version calculation and updating');
  });

  it('should generate Maintenance workflow', async () => {
    const result = await manager.generateSpecializedWorkflow('maintenance', mockDetectionResult, mockOptions);

    expect(result).toBeDefined();
    expect(result.type).toBe('maintenance');
    expect(result.filename).toBe('maintenance.yml');
    expect(result.content).toContain('Maintenance');
    expect(result.metadata.optimizations).toContain('Automated dependency updates');
  });

  it('should generate multiple workflows', async () => {
    const workflowTypes = ['ci', 'cd', 'release', 'maintenance'] as const;
    const results = await manager.generateMultipleSpecializedWorkflows(workflowTypes, mockDetectionResult, mockOptions);

    expect(results).toHaveLength(4);
    expect(results.map(r => r.type)).toEqual(['ci', 'cd', 'release', 'maintenance']);
    
    // Verify each workflow has unique content
    const filenames = results.map(r => r.filename);
    expect(new Set(filenames).size).toBe(4); // All unique filenames
  });

  it('should validate workflow compatibility correctly', () => {
    // Test with CD but no CI - should warn
    const validationWithWarning = manager.validateWorkflowCompatibility(
      ['cd', 'release'],
      mockDetectionResult,
      mockOptions
    );

    expect(validationWithWarning.compatible).toBe(true);
    expect(validationWithWarning.errors).toHaveLength(0);
    expect(validationWithWarning.warnings).toContain('CD workflow recommended with CI workflow for artifact reuse');

    // Test with all workflows - should not warn about CI/CD
    const validationComplete = manager.validateWorkflowCompatibility(
      ['ci', 'cd', 'release', 'maintenance'],
      mockDetectionResult,
      mockOptions
    );

    expect(validationComplete.compatible).toBe(true);
    expect(validationComplete.errors).toHaveLength(0);
  });

  it('should handle projects without package managers', () => {
    const noPackageManagerResult = {
      ...mockDetectionResult,
      packageManagers: []
    };

    const validation = manager.validateWorkflowCompatibility(
      ['release'],
      noPackageManagerResult,
      mockOptions
    );

    expect(validation.warnings).toContain('Release workflow may have limited functionality without detected package managers');
  });
});