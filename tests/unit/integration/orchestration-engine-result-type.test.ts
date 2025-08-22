import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrchestrationEngine } from '../../../src/integration/orchestration-engine';
import { Result } from '../../../src/shared/types/result';

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

describe('OrchestrationEngine Result Type Usage', () => {
  let orchestrationEngine: OrchestrationEngine;
  let mockReadmeParser: any;
  let mockFrameworkDetector: any;
  let mockYamlGenerator: any;

  beforeEach(() => {
    orchestrationEngine = new OrchestrationEngine();
    mockReadmeParser = (orchestrationEngine as any).readmeParser;
    mockFrameworkDetector = (orchestrationEngine as any).frameworkDetector;
    mockYamlGenerator = (orchestrationEngine as any).yamlGenerator;
  });

  describe('processWorkflowRequest Result type handling', () => {
    it('should return success Result when all components succeed', async () => {
      // Arrange
      const mockParseResult = {
        success: true,
        data: {
          metadata: { name: 'test-project', description: 'Test project' },
          languages: [{ name: 'JavaScript' }],
          dependencies: { packages: ['react'], packageFiles: ['package.json'] },
          commands: { build: [{ command: 'npm run build' }], test: [{ command: 'npm test' }] }
        }
      };

      const mockDetectionResult = {
        frameworks: [{ name: 'React', confidence: 0.9 }]
      };

      const mockYamlResult = {
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

      mockReadmeParser.parseFile.mockResolvedValue(mockParseResult);
      mockFrameworkDetector.detectFrameworks.mockResolvedValue(mockDetectionResult);
      mockYamlGenerator.generateWorkflow.mockResolvedValue(mockYamlResult);

      // Act
      const result = await orchestrationEngine.processWorkflowRequest({
        readmePath: 'README.md'
      });

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.success).toBe(true);
        expect(result.data.generatedFiles).toEqual(['ci.yml']);
        expect(result.data.detectedFrameworks).toEqual(['React']);
      }
    });

    it('should return failure Result when README parsing fails', async () => {
      // Arrange
      const mockParseResult = {
        success: false,
        errors: [{ message: 'File not found' }]
      };

      mockReadmeParser.parseFile.mockResolvedValue(mockParseResult);

      // Act
      const result = await orchestrationEngine.processWorkflowRequest({
        readmePath: 'nonexistent.md'
      });

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('README parsing failed: File not found');
      }
    });

    it('should return failure Result when framework detection fails', async () => {
      // Arrange
      const mockParseResult = {
        success: true,
        data: {
          metadata: { name: 'test-project' },
          languages: [],
          dependencies: { packages: [], packageFiles: [] },
          commands: {}
        }
      };

      mockReadmeParser.parseFile.mockResolvedValue(mockParseResult);
      mockFrameworkDetector.detectFrameworks.mockResolvedValue(null);

      // Act
      const result = await orchestrationEngine.processWorkflowRequest({
        readmePath: 'README.md'
      });

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Framework detection failed');
      }
    });

    it('should return failure Result when YAML generation fails', async () => {
      // Arrange
      const mockParseResult = {
        success: true,
        data: {
          metadata: { name: 'test-project' },
          languages: [{ name: 'JavaScript' }],
          dependencies: { packages: [], packageFiles: [] },
          commands: {}
        }
      };

      const mockDetectionResult = {
        frameworks: [{ name: 'React', confidence: 0.9 }]
      };

      mockReadmeParser.parseFile.mockResolvedValue(mockParseResult);
      mockFrameworkDetector.detectFrameworks.mockResolvedValue(mockDetectionResult);
      mockYamlGenerator.generateWorkflow.mockRejectedValue(new Error('Template not found'));

      // Act
      const result = await orchestrationEngine.processWorkflowRequest({
        readmePath: 'README.md'
      });

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('YAML generation failed: Template not found');
      }
    });

    it('should handle exceptions and return failure Result', async () => {
      // Arrange
      mockReadmeParser.parseFile.mockRejectedValue(new Error('Unexpected error'));

      // Act
      const result = await orchestrationEngine.processWorkflowRequest({
        readmePath: 'README.md'
      });

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Unexpected error');
      }
    });
  });

  describe('validateSystemHealth Result type handling', () => {
    it('should return success Result when all components are initialized', async () => {
      // Act
      const result = await orchestrationEngine.validateSystemHealth();

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });

    it('should return failure Result when a component is not initialized', async () => {
      // Arrange
      (orchestrationEngine as any).readmeParser = null;

      // Act
      const result = await orchestrationEngine.validateSystemHealth();

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Component ReadmeParser is not initialized');
      }
    });

    it('should handle exceptions in system health check', async () => {
      // Arrange
      // Mock a property access that throws an error
      Object.defineProperty(orchestrationEngine, 'readmeParser', {
        get: () => { throw new Error('Property access failed'); }
      });

      // Act
      const result = await orchestrationEngine.validateSystemHealth();

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Property access failed');
      }
    });
  });

  describe('Result type compatibility', () => {
    it('should properly type-check Result usage in processWorkflowRequest', () => {
      // This test verifies that TypeScript compilation succeeds
      // The actual type checking happens at compile time
      const engine = new OrchestrationEngine();
      
      // This should compile without errors if Result type is properly imported
      const processPromise: Promise<Result<any, Error>> = engine.processWorkflowRequest({
        readmePath: 'test.md'
      });
      
      expect(processPromise).toBeDefined();
    });

    it('should properly type-check Result usage in validateSystemHealth', () => {
      // This test verifies that TypeScript compilation succeeds
      const engine = new OrchestrationEngine();
      
      // This should compile without errors if Result type is properly imported
      const healthPromise: Promise<Result<boolean, Error>> = engine.validateSystemHealth();
      
      expect(healthPromise).toBeDefined();
    });
  });
});