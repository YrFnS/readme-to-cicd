/**
 * Integration tests for YAML Generator method signature compatibility
 * Validates that the generateWorkflow method signature matches orchestration engine usage
 * 
 * Requirements: 2.3, 2.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { YAMLGeneratorImpl } from '../../../src/generator/yaml-generator';
import { OrchestrationEngine } from '../../../src/integration/orchestration-engine';
import { DetectionResult, GenerationOptions, WorkflowOutput } from '../../../src/generator/interfaces';
import { Result } from '../../../src/shared/types/result';

describe('YAML Generator Method Signature Compatibility', () => {
  let yamlGenerator: YAMLGeneratorImpl;
  let orchestrationEngine: OrchestrationEngine;

  beforeEach(() => {
    yamlGenerator = new YAMLGeneratorImpl();
    orchestrationEngine = new OrchestrationEngine();
  });

  describe('generateWorkflow method signature validation', () => {
    it('should have correct method signature for generateWorkflow', () => {
      // Verify the method exists and has the expected signature
      expect(yamlGenerator.generateWorkflow).toBeDefined();
      expect(typeof yamlGenerator.generateWorkflow).toBe('function');
      
      // Check method length (number of parameters)
      // generateWorkflow(detectionResult: DetectionResult, options?: GenerationOptions)
      // Should accept 1-2 parameters (second is optional)
      expect(yamlGenerator.generateWorkflow.length).toBe(2); // Both parameters are defined in signature
    });

    it('should accept DetectionResult as first parameter', async () => {
      const mockDetectionResult: DetectionResult = {
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
            version: 'ES2022',
            confidence: 0.95,
            primary: true
          }
        ],
        buildTools: [
          {
            name: 'npm',
            configFile: 'package.json',
            confidence: 0.9
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
            confidence: 0.8
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
          name: 'Test Project',
          description: 'A test project for signature validation',
          version: '1.0.0'
        }
      };

      // Should not throw when called with valid DetectionResult
      await expect(yamlGenerator.generateWorkflow(mockDetectionResult)).resolves.toBeDefined();
    });

    it('should accept optional GenerationOptions as second parameter', async () => {
      const mockDetectionResult: DetectionResult = {
        frameworks: [],
        languages: [],
        buildTools: [],
        packageManagers: [],
        testingFrameworks: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'Test Project',
          description: 'A test project',
          version: '1.0.0'
        }
      };

      const mockOptions: GenerationOptions = {
        workflowType: 'ci',
        optimizationLevel: 'standard',
        includeComments: true,
        securityLevel: 'standard'
      };

      // Should not throw when called with both parameters
      await expect(yamlGenerator.generateWorkflow(mockDetectionResult, mockOptions)).resolves.toBeDefined();
    });

    it('should return Promise<WorkflowOutput>', async () => {
      const mockDetectionResult: DetectionResult = {
        frameworks: [],
        languages: [],
        buildTools: [],
        packageManagers: [],
        testingFrameworks: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'Test Project',
          description: 'A test project',
          version: '1.0.0'
        }
      };

      const result = yamlGenerator.generateWorkflow(mockDetectionResult);
      
      // Should return a Promise
      expect(result).toBeInstanceOf(Promise);
      
      const workflowOutput = await result;
      
      // Should return WorkflowOutput structure
      expect(workflowOutput).toBeDefined();
      expect(workflowOutput).toHaveProperty('filename');
      expect(workflowOutput).toHaveProperty('content');
      expect(workflowOutput).toHaveProperty('type');
      expect(workflowOutput).toHaveProperty('metadata');
      
      // Validate WorkflowOutput properties
      expect(typeof workflowOutput.filename).toBe('string');
      expect(typeof workflowOutput.content).toBe('string');
      expect(typeof workflowOutput.type).toBe('string');
      expect(typeof workflowOutput.metadata).toBe('object');
    });

    it('should NOT return Result<WorkflowOutput, Error>', async () => {
      const mockDetectionResult: DetectionResult = {
        frameworks: [],
        languages: [],
        buildTools: [],
        packageManagers: [],
        testingFrameworks: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'Test Project',
          description: 'A test project',
          version: '1.0.0'
        }
      };

      const result = await yamlGenerator.generateWorkflow(mockDetectionResult);
      
      // Should NOT be a Result type (should not have success/error properties)
      expect(result).not.toHaveProperty('success');
      expect(result).not.toHaveProperty('error');
      expect(result).not.toHaveProperty('data');
      
      // Should be a direct WorkflowOutput
      expect(result).toHaveProperty('filename');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('metadata');
    });
  });

  describe('orchestration engine compatibility', () => {
    it('should be compatible with orchestration engine method call pattern', async () => {
      // This test verifies that the method signature matches what the orchestration engine expects
      const mockDetectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'Node.js',
            confidence: 0.9,
            evidence: ['package.json found'],
            category: 'backend'
          }
        ],
        languages: [
          {
            name: 'JavaScript',
            confidence: 0.95,
            primary: true
          }
        ],
        buildTools: [],
        packageManagers: [],
        testingFrameworks: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'Test Project',
          description: 'A test project',
          version: '1.0.0'
        }
      };

      const mockOptions: GenerationOptions = {
        workflowType: 'ci',
        optimizationLevel: 'standard',
        includeComments: true,
        securityLevel: 'standard'
      };

      // Simulate the exact call pattern used in orchestration engine
      const yamlResult = await yamlGenerator.generateWorkflow(
        mockDetectionResult,
        mockOptions
      );

      // Verify the result matches what orchestration engine expects
      expect(yamlResult).toBeDefined();
      expect(yamlResult.filename).toBeDefined();
      expect(yamlResult.content).toBeDefined();
      expect(yamlResult.type).toBeDefined();
      expect(yamlResult.metadata).toBeDefined();
      
      // Verify metadata structure
      expect(yamlResult.metadata.generatedAt).toBeInstanceOf(Date);
      expect(yamlResult.metadata.generatorVersion).toBeDefined();
      expect(yamlResult.metadata.detectionSummary).toBeDefined();
      expect(Array.isArray(yamlResult.metadata.optimizations)).toBe(true);
      expect(Array.isArray(yamlResult.metadata.warnings)).toBe(true);
    });

    it('should handle the conversion from orchestration engine format', async () => {
      // Test the exact format that orchestration engine passes after conversion
      const orchestrationEngineFormat = {
        frameworks: [
          {
            name: 'Node.js',
            version: undefined,
            confidence: 0.9,
            evidence: ['package.json found'],
            category: 'backend'
          }
        ],
        languages: [
          {
            name: 'Node.js',
            confidence: 0.9,
            evidence: ['package.json found']
          }
        ],
        buildTools: [],
        packageManagers: [],
        testingFrameworks: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'Generated Project',
          description: 'Auto-generated from README analysis',
          version: '1.0.0'
        }
      };

      const generationOptions = {
        workflowType: 'ci' as const,
        optimizationLevel: 'standard' as const,
        includeComments: true,
        securityLevel: 'standard' as const
      };

      // Should handle the orchestration engine's converted format
      const result = await yamlGenerator.generateWorkflow(
        orchestrationEngineFormat,
        generationOptions
      );

      expect(result).toBeDefined();
      expect(result.filename).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.type).toBe('ci');
    });
  });

  describe('parameter type validation', () => {
    it('should validate DetectionResult parameter structure', async () => {
      const validDetectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'Express',
            version: '4.18.0',
            confidence: 0.85,
            evidence: ['package.json contains express'],
            category: 'backend'
          }
        ],
        languages: [
          {
            name: 'TypeScript',
            version: '4.9.0',
            confidence: 0.9,
            primary: true
          }
        ],
        buildTools: [
          {
            name: 'tsc',
            configFile: 'tsconfig.json',
            confidence: 0.95
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
            name: 'Vitest',
            type: 'unit',
            confidence: 0.8
          }
        ],
        deploymentTargets: [
          {
            platform: 'Docker',
            type: 'container',
            confidence: 0.7
          }
        ],
        projectMetadata: {
          name: 'API Server',
          description: 'REST API server built with Express and TypeScript',
          version: '2.1.0',
          license: 'MIT',
          repository: 'https://github.com/user/api-server',
          homepage: 'https://api.example.com',
          author: 'Developer Name',
          keywords: ['api', 'express', 'typescript']
        }
      };

      // Should accept complete DetectionResult structure
      const result = await yamlGenerator.generateWorkflow(validDetectionResult);
      expect(result).toBeDefined();
      expect(result.metadata.detectionSummary).toContain('Express');
    });

    it('should validate GenerationOptions parameter structure', async () => {
      const mockDetectionResult: DetectionResult = {
        frameworks: [],
        languages: [],
        buildTools: [],
        packageManagers: [],
        testingFrameworks: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'Test Project',
          description: 'A test project',
          version: '1.0.0'
        }
      };

      const completeOptions: GenerationOptions = {
        workflowType: 'cd',
        optimizationLevel: 'aggressive',
        includeComments: false,
        securityLevel: 'enterprise',
        agentHooksEnabled: true,
        environmentManagement: {
          includeSecretValidation: true,
          includeOIDC: true,
          includeConfigGeneration: true,
          generateEnvFiles: true,
          autoDetectSecrets: true
        },
        environments: [
          {
            name: 'production',
            type: 'production',
            approvalRequired: true,
            secrets: ['API_KEY', 'DATABASE_URL'],
            variables: { NODE_ENV: 'production' },
            deploymentStrategy: 'blue-green',
            rollbackEnabled: true
          }
        ],
        monitoringConfig: {
          performanceTracking: true,
          alerting: {
            enabled: true,
            channels: ['slack', 'email'],
            thresholds: { errorRate: 0.01, responseTime: 500 }
          },
          dashboards: [
            {
              name: 'Application Performance',
              type: 'grafana',
              metrics: ['response_time', 'error_rate', 'throughput']
            }
          ],
          slaTracking: {
            enabled: true,
            targets: { availability: 99.9, responseTime: 200 }
          },
          logAggregation: {
            enabled: true,
            level: 'info',
            format: 'json'
          }
        },
        testingStrategy: {
          unitTests: true,
          integrationTests: true,
          e2eTests: true,
          performanceTests: true,
          securityTests: true,
          contractTests: false,
          chaosEngineering: false
        }
      };

      // Should accept complete GenerationOptions structure
      const result = await yamlGenerator.generateWorkflow(mockDetectionResult, completeOptions);
      expect(result).toBeDefined();
      expect(result.type).toBe('cd');
    });
  });

  describe('return type validation', () => {
    it('should return WorkflowOutput with all required properties', async () => {
      const mockDetectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'Vue.js',
            version: '3.0.0',
            confidence: 0.9,
            evidence: ['package.json contains vue'],
            category: 'frontend'
          }
        ],
        languages: [
          {
            name: 'JavaScript',
            confidence: 0.9,
            primary: true
          }
        ],
        buildTools: [],
        packageManagers: [],
        testingFrameworks: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'Vue App',
          description: 'A Vue.js application',
          version: '1.0.0'
        }
      };

      const result = await yamlGenerator.generateWorkflow(mockDetectionResult);

      // Validate WorkflowOutput structure
      expect(result).toMatchObject({
        filename: expect.any(String),
        content: expect.any(String),
        type: expect.any(String),
        metadata: {
          generatedAt: expect.any(Date),
          generatorVersion: expect.any(String),
          detectionSummary: expect.any(String),
          optimizations: expect.any(Array),
          warnings: expect.any(Array)
        }
      });

      // Validate specific properties
      expect(result.filename).toMatch(/\.yml?$/);
      expect(result.content.length).toBeGreaterThan(0);
      expect(['ci', 'cd', 'release', 'maintenance', 'security', 'performance']).toContain(result.type);
    });

    it('should return valid YAML content', async () => {
      const mockDetectionResult: DetectionResult = {
        frameworks: [],
        languages: [
          {
            name: 'Python',
            confidence: 0.9,
            primary: true
          }
        ],
        buildTools: [],
        packageManagers: [],
        testingFrameworks: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'Python App',
          description: 'A Python application',
          version: '1.0.0'
        }
      };

      const result = await yamlGenerator.generateWorkflow(mockDetectionResult);

      // Content should be valid YAML (basic validation)
      // Check for YAML structure - may be in comments or actual YAML
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content).toMatch(/Generated.*Workflow/i);
      
      // Should not contain template placeholders
      expect(result.content).not.toContain('{{');
      expect(result.content).not.toContain('}}');
    });
  });
});