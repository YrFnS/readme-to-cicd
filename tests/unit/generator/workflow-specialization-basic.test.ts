/**
 * Basic tests for Workflow Specialization functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SimpleCIWorkflowGenerator } from '../../../src/generator/workflow-specialization/simple-ci-generator';
import { WorkingWorkflowSpecializationManager } from '../../../src/generator/workflow-specialization/working-workflow-manager';
import { DetectionResult, GenerationOptions } from '../../../src/generator/interfaces';

describe('Workflow Specialization - Basic Tests', () => {
  let mockDetectionResult: DetectionResult;
  let mockOptions: GenerationOptions;

  beforeEach(() => {
    mockDetectionResult = {
      frameworks: [],
      languages: [
        { name: 'JavaScript', version: '18.0.0', confidence: 0.95, primary: true }
      ],
      buildTools: [],
      packageManagers: [
        { name: 'npm', lockFile: 'package-lock.json', confidence: 0.9 }
      ],
      testingFrameworks: [],
      deploymentTargets: [],
      projectMetadata: {
        name: 'test-project'
      }
    };

    mockOptions = {
      workflowType: 'ci',
      optimizationLevel: 'basic',
      includeComments: true,
      securityLevel: 'basic'
    };
  });

  describe('WorkflowSpecializationManager', () => {
    let manager: WorkingWorkflowSpecializationManager;

    beforeEach(() => {
      manager = new WorkingWorkflowSpecializationManager();
    });

    it('should create manager instance', () => {
      expect(manager).toBeDefined();
    });

    it('should generate CI workflow', async () => {
      const generator = new SimpleCIWorkflowGenerator();
      const result = await generator.generateCIWorkflow(mockDetectionResult, mockOptions);

      expect(result).toBeDefined();
      expect(result.type).toBe('ci');
      expect(result.filename).toBe('ci.yml');
      expect(result.metadata).toBeDefined();
      expect(result.metadata.generatedAt).toBeInstanceOf(Date);
    });

    it('should validate workflow compatibility', () => {
      const validation = manager.validateWorkflowCompatibility(
        ['ci'],
        mockDetectionResult,
        mockOptions
      );

      expect(validation.compatible).toBe(true);
      expect(validation.warnings).toBeInstanceOf(Array);
      expect(validation.errors).toBeInstanceOf(Array);
    });

    it('should handle unsupported workflow types', async () => {
      await expect(
        manager.generateSpecializedWorkflow('unsupported' as any, mockDetectionResult, mockOptions)
      ).rejects.toThrow('Unsupported workflow type: unsupported');
    });
  });
});