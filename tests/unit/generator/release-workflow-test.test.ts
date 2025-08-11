/**
 * Test for Release Workflow Generator
 */

import { describe, it, expect } from 'vitest';
import { ReleaseWorkflowGenerator } from '../../../src/generator/workflow-specialization/release-workflow-generator';
import { DetectionResult, GenerationOptions } from '../../../src/generator/interfaces';

describe('Release Workflow Generation', () => {
  it('should generate a release workflow', async () => {
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
      workflowType: 'release',
      optimizationLevel: 'basic',
      includeComments: true,
      securityLevel: 'basic'
    };

    const generator = new ReleaseWorkflowGenerator();
    const result = await generator.generateReleaseWorkflow(mockDetectionResult, mockOptions);

    expect(result).toBeDefined();
    expect(result.type).toBe('release');
    expect(result.filename).toBe('release.yml');
    expect(result.content).toContain('Release');
    expect(result.metadata).toBeDefined();
    expect(result.metadata.generatedAt).toBeInstanceOf(Date);
  });
});