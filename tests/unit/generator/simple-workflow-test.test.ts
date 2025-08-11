/**
 * Simple workflow test without problematic imports
 */

import { describe, it, expect } from 'vitest';
import { SimpleCIWorkflowGenerator } from '../../../src/generator/workflow-specialization/simple-ci-generator';
import { DetectionResult, GenerationOptions } from '../../../src/generator/interfaces';

describe('Simple Workflow Generation', () => {
  it('should generate a basic CI workflow', async () => {
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
      workflowType: 'ci',
      optimizationLevel: 'basic',
      includeComments: true,
      securityLevel: 'basic'
    };

    const generator = new SimpleCIWorkflowGenerator();
    const result = await generator.generateCIWorkflow(mockDetectionResult, mockOptions);

    expect(result).toBeDefined();
    expect(result.type).toBe('ci');
    expect(result.filename).toBe('ci.yml');
    expect(result.content).toContain('name: CI');
    expect(result.content).toContain('JavaScript');
    expect(result.metadata).toBeDefined();
    expect(result.metadata.generatedAt).toBeInstanceOf(Date);
    expect(result.metadata.detectionSummary).toContain('JavaScript');
  });
});