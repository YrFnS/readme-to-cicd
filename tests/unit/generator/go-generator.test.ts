import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GoWorkflowGenerator } from '../../../src/generator/templates/go-generator';
import { DetectionResult } from '../../../src/generator/interfaces';
import { TemplateManager } from '../../../src/generator/templates/template-manager';

describe('GoWorkflowGenerator', () => {
  let generator: GoWorkflowGenerator;
  let mockTemplateManager: TemplateManager;

  beforeEach(() => {
    mockTemplateManager = {
      compileTemplate: vi.fn().mockResolvedValue({
        template: {
          name: 'Test Go Workflow',
          triggers: { push: { branches: ['main'] } },
          jobs: [{
            name: 'test',
            runsOn: 'ubuntu-latest',
            strategy: {
              matrix: {
                'go-version': ['{{goVersions}}'],
                'os': ['{{operatingSystems}}']
              }
            },
            steps: [
              { name: 'Checkout', uses: 'actions/checkout@v4' },
              { name: 'Setup Go', uses: 'actions/setup-go@v4', with: { 'go-version': '{{goVersion}}' } },
              { name: 'Download deps', run: 'go mod download', if: '{{hasGoMod}}' },
              { name: 'Build', run: '{{buildCommand}}' },
              { name: 'Test', run: '{{testCommand}}' },
              { name: 'Vet', run: '{{vetCommand}}' }
            ]
          }]
        },
        errors: [],
        warnings: []
      })
    } as any;
    
    generator = new GoWorkflowGenerator(mockTemplateManager);
  });

  describe('Basic Go workflow generation', () => {
    it('should generate basic Go workflow with modules', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Go', version: '1.21', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'go', confidence: 0.8, evidence: ['go.mod'], category: 'backend' }],
        packageManagers: [{ name: 'go modules', lockFile: 'go.mod', confidence: 0.9 }],
        testingFrameworks: [],
        buildTools: [{ name: 'go build', configFile: 'go.mod', confidence: 0.8 }],
        deploymentTargets: [],
        projectMetadata: { name: 'test-go-app' }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.filename).toBe('ci.yml');
      expect(result.content).toContain('go-version');
      expect(result.content).toContain('go mod download');
      expect(result.metadata.detectionSummary).toContain('Go go project');
      expect(result.metadata.optimizations).toContain('Go modules dependency caching enabled');
    });

    it('should handle Go project without modules', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Go', version: '1.20', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'go', confidence: 0.8, evidence: ['main.go'], category: 'backend' }],
        packageManagers: [],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [],
        projectMetadata: { name: 'legacy-go-app' }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.filename).toBe('ci.yml');
      expect(result.content).not.toContain('go mod download');
      expect(result.metadata.detectionSummary).toContain('Go go project');
    });
  });

  describe('Gin framework workflow generation', () => {
    it('should generate Gin workflow with web service optimizations', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Go', version: '1.21', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'gin', confidence: 0.9, evidence: ['gin framework'], category: 'backend' }],
        packageManagers: [{ name: 'go modules', lockFile: 'go.mod', confidence: 0.9 }],
        testingFrameworks: [{ name: 'go test', type: 'unit', confidence: 0.8 }],
        buildTools: [{ name: 'go build', configFile: 'go.mod', confidence: 0.8 }],
        deploymentTargets: [{ platform: 'docker', type: 'container', confidence: 0.7 }],
        projectMetadata: { name: 'gin-api' }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.filename).toBe('gin-ci.yml');
      expect(result.content).toContain('go-version');
      expect(result.metadata.detectionSummary).toContain('Go gin project with gin');
      expect(result.metadata.optimizations).toContain('gin web framework optimizations');
    });

    it('should include Docker support for Gin applications', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Go', version: '1.21', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'gin', confidence: 0.9, evidence: ['gin framework'], category: 'backend' }],
        packageManagers: [{ name: 'go modules', lockFile: 'go.mod', confidence: 0.9 }],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [{ platform: 'docker', type: 'container', confidence: 0.8 }],
        projectMetadata: { name: 'gin-docker-app' }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.filename).toBe('gin-ci.yml');
      expect(result.metadata.optimizations).toContain('Docker containerization support');
    });
  });

  describe('Echo framework workflow generation', () => {
    it('should generate Echo workflow with proper environment setup', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Go', version: '1.20', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'echo', confidence: 0.9, evidence: ['echo framework'], category: 'backend' }],
        packageManagers: [{ name: 'go modules', lockFile: 'go.mod', confidence: 0.9 }],
        testingFrameworks: [{ name: 'go test', type: 'unit', confidence: 0.8 }],
        buildTools: [],
        deploymentTargets: [],
        projectMetadata: { name: 'echo-service' }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.filename).toBe('echo-ci.yml');
      expect(result.content).toContain('go-version');
      expect(result.metadata.detectionSummary).toContain('Go echo project with echo');
    });
  });

  describe('Fiber framework workflow generation', () => {
    it('should generate Fiber workflow with performance optimizations', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Go', version: '1.21', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'fiber', confidence: 0.9, evidence: ['fiber framework'], category: 'backend' }],
        packageManagers: [{ name: 'go modules', lockFile: 'go.mod', confidence: 0.9 }],
        testingFrameworks: [{ name: 'benchmark', type: 'performance', confidence: 0.7 }],
        buildTools: [],
        deploymentTargets: [],
        projectMetadata: { name: 'fiber-fast-api' }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.filename).toBe('fiber-ci.yml');
      expect(result.content).toContain('go-version');
      expect(result.metadata.detectionSummary).toContain('Go fiber project with fiber');
      expect(result.metadata.optimizations).toContain('Performance benchmarking included');
    });
  });

  describe('Build constraints and tags handling', () => {
    it('should handle build tags for different test types', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Go', version: '1.21', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'go', confidence: 0.8, evidence: ['go.mod'], category: 'backend' }],
        packageManagers: [{ name: 'go modules', lockFile: 'go.mod', confidence: 0.9 }],
        testingFrameworks: [
          { name: 'go test', type: 'unit', confidence: 0.8 },
          { name: 'integration test', type: 'integration', confidence: 0.7 }
        ],
        buildTools: [{ name: 'go build', configFile: 'go.mod', confidence: 0.8 }],
        deploymentTargets: [],
        projectMetadata: { name: 'multi-test-app' }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.metadata.optimizations).toContain('Build tags optimization: unit, integration');
    });

    it('should handle cross-compilation constraints', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Go', version: '1.21', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'go', confidence: 0.8, evidence: ['go.mod'], category: 'backend' }],
        packageManagers: [{ name: 'go modules', lockFile: 'go.mod', confidence: 0.9 }],
        testingFrameworks: [],
        buildTools: [{ name: 'go build', configFile: 'go.mod', confidence: 0.8 }],
        deploymentTargets: [],
        projectMetadata: { name: 'cross-platform-app' }
      };

      const result = await generator.generateWorkflow(detectionResult, { optimizationLevel: 'aggressive' });

      expect(result.content).toContain('matrix');
      expect(result.content).toContain('os:');
    });
  });

  describe('Go version matrix strategies', () => {
    it('should generate basic matrix for standard optimization', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Go', version: '1.21', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'go', confidence: 0.8, evidence: ['go.mod'], category: 'backend' }],
        packageManagers: [{ name: 'go modules', lockFile: 'go.mod', confidence: 0.9 }],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [],
        projectMetadata: { name: 'standard-app' }
      };

      const result = await generator.generateWorkflow(detectionResult, { optimizationLevel: 'standard' });

      expect(result.content).toContain('matrix');
      expect(result.metadata.optimizations).toContain('Matrix strategy for multiple Go versions');
    });

    it('should generate aggressive matrix for maximum compatibility', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Go', version: '1.21', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'go', confidence: 0.8, evidence: ['go.mod'], category: 'backend' }],
        packageManagers: [{ name: 'go modules', lockFile: 'go.mod', confidence: 0.9 }],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [],
        projectMetadata: { name: 'compatibility-app' }
      };

      const result = await generator.generateWorkflow(detectionResult, { optimizationLevel: 'aggressive' });

      expect(result.content).toContain('matrix');
      expect(result.metadata.optimizations).toContain('Matrix strategy for multiple Go versions');
    });

    it('should generate minimal matrix for basic optimization', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Go', version: '1.21', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'go', confidence: 0.8, evidence: ['go.mod'], category: 'backend' }],
        packageManagers: [{ name: 'go modules', lockFile: 'go.mod', confidence: 0.9 }],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [],
        projectMetadata: { name: 'simple-app' }
      };

      const result = await generator.generateWorkflow(detectionResult, { optimizationLevel: 'basic' });

      expect(result.content).toContain('1.21');
      expect(result.content).not.toContain('1.19');
    });
  });

  describe('Linting and code quality', () => {
    it('should include linting when detected', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Go', version: '1.21', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'go', confidence: 0.8, evidence: ['go.mod'], category: 'backend' }],
        packageManagers: [{ name: 'go modules', lockFile: 'go.mod', confidence: 0.9 }],
        testingFrameworks: [],
        buildTools: [{ name: 'golangci-lint', confidence: 0.8 }],
        deploymentTargets: [],
        projectMetadata: { name: 'linted-app' }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.metadata.optimizations).toContain('Code linting with golangci-lint included');
    });

    it('should always include go vet', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Go', version: '1.21', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'go', confidence: 0.8, evidence: ['go.mod'], category: 'backend' }],
        packageManagers: [{ name: 'go modules', lockFile: 'go.mod', confidence: 0.9 }],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [],
        projectMetadata: { name: 'vetted-app' }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.metadata.optimizations).toContain('Go vet static analysis included');
    });
  });

  describe('Coverage and benchmarking', () => {
    it('should include coverage reporting when testing is detected', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Go', version: '1.21', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'go', confidence: 0.8, evidence: ['go.mod'], category: 'backend' }],
        packageManagers: [{ name: 'go modules', lockFile: 'go.mod', confidence: 0.9 }],
        testingFrameworks: [{ name: 'go test', type: 'unit', confidence: 0.8 }],
        buildTools: [],
        deploymentTargets: [],
        projectMetadata: { name: 'tested-app' }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.metadata.optimizations).toContain('Test coverage reporting enabled');
      expect(result.metadata.optimizations).toContain('Race condition detection enabled');
    });

    it('should include benchmarking when performance tests are detected', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Go', version: '1.21', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'go', confidence: 0.8, evidence: ['go.mod'], category: 'backend' }],
        packageManagers: [{ name: 'go modules', lockFile: 'go.mod', confidence: 0.9 }],
        testingFrameworks: [{ name: 'benchmark', type: 'performance', confidence: 0.7 }],
        buildTools: [],
        deploymentTargets: [],
        projectMetadata: { name: 'benchmarked-app' }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.metadata.optimizations).toContain('Performance benchmarking included');
    });
  });

  describe('Error handling', () => {
    it('should throw error when no Go language is detected', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Python', version: '3.11', confidence: 0.9, primary: true }],
        frameworks: [],
        packageManagers: [],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [],
        projectMetadata: { name: 'non-go-app' }
      };

      await expect(generator.generateWorkflow(detectionResult))
        .rejects.toThrow('No Go framework detected in detection results');
    });

    it('should handle template compilation errors', async () => {
      const mockTemplateManagerWithError = {
        compileTemplate: vi.fn().mockResolvedValue({
          template: {},
          errors: ['Template compilation failed'],
          warnings: []
        })
      } as any;

      const generatorWithError = new GoWorkflowGenerator(mockTemplateManagerWithError);

      const detectionResult: DetectionResult = {
        languages: [{ name: 'Go', version: '1.21', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'go', confidence: 0.8, evidence: ['go.mod'], category: 'backend' }],
        packageManagers: [],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [],
        projectMetadata: { name: 'error-app' }
      };

      await expect(generatorWithError.generateWorkflow(detectionResult))
        .rejects.toThrow('Template compilation failed: Template compilation failed');
    });
  });

  describe('Web service detection', () => {
    it('should detect generic web service without specific framework', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Go', version: '1.21', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'go', confidence: 0.8, evidence: ['go.mod'], category: 'backend' }],
        packageManagers: [{ name: 'go modules', lockFile: 'go.mod', confidence: 0.9 }],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [],
        projectMetadata: { name: 'web-service' }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.filename).toBe('ci.yml');
      expect(result.metadata.detectionSummary).toContain('Go go project');
    });
  });
});