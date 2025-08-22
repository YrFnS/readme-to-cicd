import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrchestrationEngine } from '../../../src/integration/orchestration-engine';
import { YAMLGeneratorImpl } from '../../../src/generator/yaml-generator';

// Mock the dependencies
vi.mock('../../../src/parser', () => ({
  ReadmeParserImpl: vi.fn().mockImplementation(() => ({
    parseFile: vi.fn()
  }))
}));

vi.mock('../../../src/detection/framework-detector', () => ({
  FrameworkDetectorImpl: vi.fn().mockImplementation(() => ({
    detectFrameworks: vi.fn()
  }))
}));

vi.mock('../../../src/generator/yaml-generator', () => ({
  YAMLGeneratorImpl: vi.fn().mockImplementation(() => ({
    generateWorkflow: vi.fn()
  }))
}));

describe('OrchestrationEngine YAML Method Call', () => {
  let orchestrationEngine: OrchestrationEngine;
  let mockYamlGenerator: any;

  beforeEach(() => {
    orchestrationEngine = new OrchestrationEngine();
    // Get the mocked YAML generator instance
    mockYamlGenerator = (orchestrationEngine as any).yamlGenerator;
  });

  it('should call generateWorkflow method (singular) instead of generateWorkflows', async () => {
    // Arrange
    const mockParseResult = {
      success: true,
      data: {
        metadata: { name: 'test-project', description: 'test description' },
        commands: { build: [], test: [] },
        dependencies: { packages: [], packageFiles: [] },
        languages: [{ name: 'javascript' }]
      }
    };

    const mockDetectionResult = {
      frameworks: [{ name: 'react', confidence: 0.9, evidence: ['package.json'] }],
      buildTools: [],
      containers: [],
      confidence: { overall: 0.9 },
      alternatives: [],
      warnings: [],
      detectedAt: new Date(),
      executionTime: 100
    };

    const mockWorkflowOutput = {
      filename: 'ci.yml',
      content: 'name: CI\non: push',
      type: 'ci',
      metadata: {
        generatedAt: new Date(),
        generatorVersion: '2.0.0',
        detectionSummary: 'React project detected',
        optimizations: [],
        warnings: []
      }
    };

    // Setup mocks
    (orchestrationEngine as any).readmeParser.parseFile.mockResolvedValue(mockParseResult);
    (orchestrationEngine as any).frameworkDetector.detectFrameworks.mockResolvedValue(mockDetectionResult);
    mockYamlGenerator.generateWorkflow.mockResolvedValue(mockWorkflowOutput);

    const request = {
      readmePath: 'README.md',
      outputDir: '.github/workflows',
      workflowTypes: ['ci'],
      dryRun: false
    };

    // Act
    const result = await orchestrationEngine.processWorkflowRequest(request);

    // Assert
    expect(result.success).toBe(true);
    expect(mockYamlGenerator.generateWorkflow).toHaveBeenCalledTimes(1);
    expect(mockYamlGenerator.generateWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        frameworks: expect.any(Array),
        languages: expect.any(Array),
        buildTools: expect.any(Array),
        packageManagers: expect.any(Array),
        testingFrameworks: expect.any(Array),
        deploymentTargets: expect.any(Array),
        projectMetadata: expect.any(Object)
      }),
      expect.objectContaining({
        workflowType: 'ci',
        optimizationLevel: 'standard',
        includeComments: true,
        securityLevel: 'standard'
      })
    );
  });

  it('should handle generateWorkflow method errors appropriately', async () => {
    // Arrange
    const mockParseResult = {
      success: true,
      data: {
        metadata: { name: 'test-project', description: 'test description' },
        commands: { build: [], test: [] },
        dependencies: { packages: [], packageFiles: [] },
        languages: [{ name: 'javascript' }]
      }
    };

    const mockDetectionResult = {
      frameworks: [{ name: 'react', confidence: 0.9, evidence: ['package.json'] }],
      buildTools: [],
      containers: [],
      confidence: { overall: 0.9 },
      alternatives: [],
      warnings: [],
      detectedAt: new Date(),
      executionTime: 100
    };

    // Setup mocks
    (orchestrationEngine as any).readmeParser.parseFile.mockResolvedValue(mockParseResult);
    (orchestrationEngine as any).frameworkDetector.detectFrameworks.mockResolvedValue(mockDetectionResult);
    mockYamlGenerator.generateWorkflow.mockRejectedValue(new Error('YAML generation failed'));

    const request = {
      readmePath: 'README.md',
      outputDir: '.github/workflows',
      workflowTypes: ['ci'],
      dryRun: false
    };

    // Act
    const result = await orchestrationEngine.processWorkflowRequest(request);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toContain('YAML generation failed');
    expect(mockYamlGenerator.generateWorkflow).toHaveBeenCalledTimes(1);
  });

  it('should convert detection result to generator format correctly', async () => {
    // Arrange
    const mockParseResult = {
      success: true,
      data: {
        metadata: { name: 'test-project', description: 'test description' },
        commands: { build: [], test: [] },
        dependencies: { packages: [], packageFiles: [] },
        languages: [{ name: 'javascript' }]
      }
    };

    const mockDetectionResult = {
      frameworks: [
        { 
          name: 'react', 
          version: '18.0.0',
          confidence: 0.9, 
          evidence: ['package.json', 'src/App.jsx'],
          category: 'frontend'
        }
      ],
      buildTools: [
        {
          name: 'webpack',
          version: '5.0.0',
          confidence: 0.8,
          evidence: ['webpack.config.js']
        }
      ],
      containers: [],
      confidence: { overall: 0.9 },
      alternatives: [],
      warnings: [],
      detectedAt: new Date(),
      executionTime: 100
    };

    const mockWorkflowOutput = {
      filename: 'ci.yml',
      content: 'name: CI\non: push',
      type: 'ci',
      metadata: {
        generatedAt: new Date(),
        generatorVersion: '2.0.0',
        detectionSummary: 'React project detected',
        optimizations: [],
        warnings: []
      }
    };

    // Setup mocks
    (orchestrationEngine as any).readmeParser.parseFile.mockResolvedValue(mockParseResult);
    (orchestrationEngine as any).frameworkDetector.detectFrameworks.mockResolvedValue(mockDetectionResult);
    mockYamlGenerator.generateWorkflow.mockResolvedValue(mockWorkflowOutput);

    const request = {
      readmePath: 'README.md'
    };

    // Act
    await orchestrationEngine.processWorkflowRequest(request);

    // Assert - Check that the conversion happened correctly
    const generatorFormatCall = mockYamlGenerator.generateWorkflow.mock.calls[0][0];
    
    expect(generatorFormatCall).toHaveProperty('frameworks');
    expect(generatorFormatCall).toHaveProperty('languages');
    expect(generatorFormatCall).toHaveProperty('buildTools');
    expect(generatorFormatCall).toHaveProperty('packageManagers');
    expect(generatorFormatCall).toHaveProperty('testingFrameworks');
    expect(generatorFormatCall).toHaveProperty('deploymentTargets');
    expect(generatorFormatCall).toHaveProperty('projectMetadata');

    // Check framework conversion
    expect(generatorFormatCall.frameworks).toHaveLength(1);
    expect(generatorFormatCall.frameworks[0]).toEqual({
      name: 'react',
      version: '18.0.0',
      confidence: 0.9,
      evidence: ['package.json', 'src/App.jsx'],
      category: 'frontend'
    });

    // Check build tools conversion
    expect(generatorFormatCall.buildTools).toHaveLength(1);
    expect(generatorFormatCall.buildTools[0]).toEqual({
      name: 'webpack',
      version: '5.0.0',
      confidence: 0.8,
      evidence: ['webpack.config.js']
    });
  });

  it('should handle single workflow generation result correctly', async () => {
    // Arrange
    const mockParseResult = {
      success: true,
      data: {
        metadata: { name: 'test-project', description: 'test description' },
        commands: { build: [], test: [] },
        dependencies: { packages: [], packageFiles: [] },
        languages: [{ name: 'javascript' }]
      }
    };

    const mockDetectionResult = {
      frameworks: [{ name: 'react', confidence: 0.9, evidence: ['package.json'] }],
      buildTools: [],
      containers: [],
      confidence: { overall: 0.9 },
      alternatives: [],
      warnings: [],
      detectedAt: new Date(),
      executionTime: 100
    };

    const mockWorkflowOutput = {
      filename: 'ci.yml',
      content: 'name: CI\non: push',
      type: 'ci',
      metadata: {
        generatedAt: new Date(),
        generatorVersion: '2.0.0',
        detectionSummary: 'React project detected',
        optimizations: ['React optimizations applied'],
        warnings: ['Consider adding tests']
      }
    };

    // Setup mocks
    (orchestrationEngine as any).readmeParser.parseFile.mockResolvedValue(mockParseResult);
    (orchestrationEngine as any).frameworkDetector.detectFrameworks.mockResolvedValue(mockDetectionResult);
    mockYamlGenerator.generateWorkflow.mockResolvedValue(mockWorkflowOutput);

    const request = {
      readmePath: 'README.md'
    };

    // Act
    const result = await orchestrationEngine.processWorkflowRequest(request);

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      success: true,
      generatedFiles: ['ci.yml'],
      detectedFrameworks: ['react'],
      warnings: ['Consider adding tests']
    });
  });
});