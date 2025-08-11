/**
 * Test for Maintenance Workflow Generator
 */

import { describe, it, expect } from 'vitest';
import { MaintenanceWorkflowGenerator } from '../../../src/generator/workflow-specialization/maintenance-workflow-generator';
import { DetectionResult, GenerationOptions } from '../../../src/generator/interfaces';

describe('Maintenance Workflow Generation', () => {
  it('should generate a maintenance workflow', async () => {
    const mockDetectionResult: DetectionResult = {
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

    const mockOptions: GenerationOptions = {
      workflowType: 'maintenance',
      optimizationLevel: 'basic',
      includeComments: true,
      securityLevel: 'basic'
    };

    const generator = new MaintenanceWorkflowGenerator();
    const result = await generator.generateMaintenanceWorkflow(mockDetectionResult, mockOptions);

    expect(result).toBeDefined();
    expect(result.type).toBe('maintenance');
    expect(result.filename).toBe('maintenance.yml');
    expect(result.content).toContain('Maintenance');
    expect(result.metadata).toBeDefined();
    expect(result.metadata.generatedAt).toBeInstanceOf(Date);
  });
});