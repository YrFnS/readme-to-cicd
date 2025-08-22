/**
 * Integration test for orchestration engine and YAML generator method compatibility
 * Tests the exact method call pattern used in production code
 * 
 * Requirements: 2.3, 2.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { YAMLGeneratorImpl } from '../../../src/generator/yaml-generator';
import { OrchestrationEngine } from '../../../src/integration/orchestration-engine';

describe('Orchestration Engine - YAML Generator Integration', () => {
  let orchestrationEngine: OrchestrationEngine;

  beforeEach(() => {
    orchestrationEngine = new OrchestrationEngine();
  });

  it('should successfully call generateWorkflow with orchestration engine format', async () => {
    // Simulate the exact data format that orchestration engine creates
    const mockDetectionResult = {
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

    // Access the private yamlGenerator instance for testing
    const yamlGenerator = (orchestrationEngine as any).yamlGenerator;
    
    // This should match the exact call in orchestration-engine.ts line 150-154
    const yamlResult = await yamlGenerator.generateWorkflow(
      mockDetectionResult,
      generationOptions
    );

    // Verify the result matches orchestration engine expectations
    expect(yamlResult).toBeDefined();
    expect(yamlResult.filename).toBeDefined();
    expect(yamlResult.content).toBeDefined();
    expect(yamlResult.type).toBe('ci');
    expect(yamlResult.metadata).toBeDefined();
    expect(yamlResult.metadata.generatedAt).toBeInstanceOf(Date);
    expect(yamlResult.metadata.generatorVersion).toBeDefined();
    expect(yamlResult.metadata.detectionSummary).toBeDefined();
    expect(Array.isArray(yamlResult.metadata.optimizations)).toBe(true);
    expect(Array.isArray(yamlResult.metadata.warnings)).toBe(true);
  });

  it('should handle the convertDetectionResultToGeneratorFormat output', async () => {
    // Test with the exact format produced by convertDetectionResultToGeneratorFormat
    const convertedFormat = {
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
          name: 'Express',
          confidence: 0.85,
          evidence: ['package.json contains express']
        }
      ],
      buildTools: [
        {
          name: 'npm',
          version: undefined,
          confidence: 0.9,
          evidence: ['package-lock.json found']
        }
      ],
      packageManagers: [],
      testingFrameworks: [],
      deploymentTargets: [],
      projectMetadata: {
        name: 'Generated Project',
        description: 'Auto-generated from README analysis',
        version: '1.0.0'
      }
    };

    const yamlGenerator = (orchestrationEngine as any).yamlGenerator;
    
    // Should handle the converted format without errors
    const result = await yamlGenerator.generateWorkflow(convertedFormat);
    
    expect(result).toBeDefined();
    expect(result.filename).toMatch(/\.yml?$/);
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.type).toBeDefined();
  });

  it('should validate system health includes YAML generator', async () => {
    const healthResult = await orchestrationEngine.validateSystemHealth();
    
    expect(healthResult.success).toBe(true);
    expect(healthResult.data).toBe(true);
    
    const systemStatus = orchestrationEngine.getSystemStatus();
    expect(systemStatus.components.yamlGenerator).toBe(true);
    expect(systemStatus.ready).toBe(true);
  });

  it('should handle method call with minimal detection result', async () => {
    // Test with minimal required fields
    const minimalDetectionResult = {
      frameworks: [],
      languages: [],
      buildTools: [],
      packageManagers: [],
      testingFrameworks: [],
      deploymentTargets: [],
      projectMetadata: {
        name: 'Minimal Project',
        description: 'Minimal test project',
        version: '1.0.0'
      }
    };

    const yamlGenerator = (orchestrationEngine as any).yamlGenerator;
    
    // Should handle minimal input without errors
    const result = await yamlGenerator.generateWorkflow(minimalDetectionResult);
    
    expect(result).toBeDefined();
    expect(result.filename).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.type).toBeDefined();
    expect(result.metadata).toBeDefined();
  });

  it('should maintain type safety with TypeScript compilation', () => {
    // This test ensures TypeScript compilation succeeds with the current signatures
    const yamlGenerator = (orchestrationEngine as any).yamlGenerator as YAMLGeneratorImpl;
    
    // Verify the method exists and has the expected signature
    expect(yamlGenerator.generateWorkflow).toBeDefined();
    expect(typeof yamlGenerator.generateWorkflow).toBe('function');
    
    // TypeScript should enforce the correct parameter types
    // This would fail compilation if types don't match
    const mockCall = async () => {
      const detectionResult = {
        frameworks: [],
        languages: [],
        buildTools: [],
        packageManagers: [],
        testingFrameworks: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'Type Test',
          description: 'Type safety test',
          version: '1.0.0'
        }
      };
      
      const options = {
        workflowType: 'ci' as const,
        optimizationLevel: 'standard' as const,
        includeComments: true,
        securityLevel: 'standard' as const
      };
      
      return yamlGenerator.generateWorkflow(detectionResult, options);
    };
    
    expect(mockCall).toBeDefined();
  });
});