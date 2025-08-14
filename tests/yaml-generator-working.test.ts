/**
 * Working YAML Generator Test Suite
 * 
 * This test suite validates the basic YAML Generator functionality
 * with working implementations.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { YAMLGeneratorImpl } from '../src/generator/yaml-generator';
import { DetectionResult } from '../src/generator/interfaces';
import * as yaml from 'js-yaml';

describe('Working YAML Generator Test Suite', () => {
  let generator: YAMLGeneratorImpl;

  beforeAll(async () => {
    generator = new YAMLGeneratorImpl({
      cacheEnabled: true
    });
  });

  describe('Basic Workflow Generation', () => {
    it('should generate a basic CI workflow for JavaScript projects', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          { name: 'Express', confidence: 0.8, evidence: ['package.json'], category: 'backend' }
        ],
        languages: [
          { name: 'JavaScript', confidence: 0.9, primary: true }
        ],
        buildTools: [
          { name: 'npm', configFile: 'package.json', confidence: 0.9 }
        ],
        packageManagers: [
          { name: 'npm', confidence: 0.9 }
        ],
        testingFrameworks: [
          { name: 'Jest', type: 'unit', confidence: 0.8 }
        ],
        deploymentTargets: [
          { platform: 'Heroku', type: 'traditional', confidence: 0.7 }
        ],
        projectMetadata: {
          name: 'basic-js-app',
          description: 'A basic JavaScript application'
        }
      };

      const workflow = await generator.generateWorkflow(detectionResult);

      expect(workflow).toBeDefined();
      expect(workflow.filename).toBeTruthy();
      expect(workflow.content).toBeTruthy();
      expect(workflow.type).toBe('ci');
      expect(workflow.metadata).toBeDefined();

      // Validate YAML syntax
      expect(() => yaml.load(workflow.content)).not.toThrow();

      // Validate basic workflow structure
      expect(workflow.content).toContain('name:');
      expect(workflow.content).toContain('on:');
      expect(workflow.content).toContain('jobs:');

      console.log('✅ Basic JavaScript workflow generated successfully');
      console.log(`   Workflow size: ${workflow.content.length} characters`);
      console.log(`   Optimizations: ${workflow.metadata.optimizations.length}`);
      console.log(`   Warnings: ${workflow.metadata.warnings.length}`);
    });

    it('should validate generated workflows', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          { name: 'React', confidence: 0.9, evidence: ['package.json'], category: 'frontend' }
        ],
        languages: [
          { name: 'JavaScript', confidence: 0.9, primary: true }
        ],
        buildTools: [
          { name: 'npm', configFile: 'package.json', confidence: 0.9 }
        ],
        packageManagers: [
          { name: 'npm', confidence: 0.9 }
        ],
        testingFrameworks: [
          { name: 'Jest', type: 'unit', confidence: 0.8 }
        ],
        deploymentTargets: [
          { platform: 'Netlify', type: 'static', confidence: 0.8 }
        ],
        projectMetadata: {
          name: 'validation-test-app',
          description: 'App for testing validation'
        }
      };

      const workflow = await generator.generateWorkflow(detectionResult);
      
      // Validate using the generator's built-in validation
      const validationResult = generator.validateWorkflow(workflow.content);
      
      expect(validationResult).toBeDefined();
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toBeDefined();
      expect(validationResult.warnings).toBeDefined();
      expect(validationResult.suggestions).toBeDefined();

      console.log('✅ Workflow validation passed');
      console.log(`   Errors: ${validationResult.errors.length}`);
      console.log(`   Warnings: ${validationResult.warnings.length}`);
      console.log(`   Suggestions: ${validationResult.suggestions.length}`);
    });

    it('should generate multiple workflow types', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          { name: 'Next.js', confidence: 0.9, evidence: ['next.config.js'], category: 'fullstack' }
        ],
        languages: [
          { name: 'TypeScript', confidence: 0.9, primary: true }
        ],
        buildTools: [
          { name: 'npm', configFile: 'package.json', confidence: 0.9 }
        ],
        packageManagers: [
          { name: 'npm', confidence: 0.9 }
        ],
        testingFrameworks: [
          { name: 'Jest', type: 'unit', confidence: 0.8 }
        ],
        deploymentTargets: [
          { platform: 'Vercel', type: 'static', confidence: 0.9 }
        ],
        projectMetadata: {
          name: 'multi-workflow-app',
          description: 'App for testing multiple workflows'
        }
      };

      const workflows = await generator.generateMultipleWorkflows(
        detectionResult,
        ['ci', 'cd']
      );

      expect(workflows.length).toBeGreaterThan(0);
      expect(workflows.length).toBeLessThanOrEqual(2);

      // Validate each workflow
      workflows.forEach(workflow => {
        expect(workflow).toBeDefined();
        expect(workflow.content).toBeTruthy();
        expect(['ci', 'cd']).toContain(workflow.type);
        
        // Validate YAML syntax
        expect(() => yaml.load(workflow.content)).not.toThrow();
      });

      console.log(`✅ Generated ${workflows.length} workflows successfully`);
      workflows.forEach(w => {
        console.log(`   ${w.type}: ${w.filename} (${w.content.length} chars)`);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle empty detection results gracefully', async () => {
      const emptyDetectionResult: DetectionResult = {
        frameworks: [],
        languages: [],
        buildTools: [],
        packageManagers: [],
        testingFrameworks: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'empty-project',
          description: 'An empty project for testing'
        }
      };

      const workflow = await generator.generateWorkflow(emptyDetectionResult);

      expect(workflow).toBeDefined();
      expect(workflow.content).toBeTruthy();
      expect(workflow.metadata.warnings.length).toBeGreaterThan(0);

      // Should still generate a basic workflow
      expect(workflow.content).toContain('name:');
      expect(workflow.content).toContain('on:');
      expect(workflow.content).toContain('jobs:');

      console.log('✅ Empty detection results handled gracefully');
      console.log(`   Warnings: ${workflow.metadata.warnings.length}`);
    });

    it('should handle invalid YAML gracefully during validation', async () => {
      const invalidYaml = `
name: Invalid Workflow
on:
  push:
    branches: [main
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Invalid step
        run: echo "missing quote
`;

      const validationResult = generator.validateWorkflow(invalidYaml);
      
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThan(0);

      console.log('✅ Invalid YAML handled gracefully');
      console.log(`   Detected ${validationResult.errors.length} errors`);
    });
  });

  describe('Performance', () => {
    it('should generate workflows efficiently', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          { name: 'Vue', confidence: 0.8, evidence: ['package.json'], category: 'frontend' }
        ],
        languages: [
          { name: 'JavaScript', confidence: 0.9, primary: true }
        ],
        buildTools: [
          { name: 'npm', configFile: 'package.json', confidence: 0.9 }
        ],
        packageManagers: [
          { name: 'npm', confidence: 0.9 }
        ],
        testingFrameworks: [
          { name: 'Jest', type: 'unit', confidence: 0.8 }
        ],
        deploymentTargets: [
          { platform: 'Netlify', type: 'static', confidence: 0.7 }
        ],
        projectMetadata: {
          name: 'performance-test-app',
          description: 'App for performance testing'
        }
      };

      const startTime = Date.now();
      const workflow = await generator.generateWorkflow(detectionResult);
      const endTime = Date.now();

      const generationTime = endTime - startTime;

      // Performance requirements
      expect(generationTime).toBeLessThan(5000); // Under 5 seconds
      expect(workflow).toBeDefined();
      expect(workflow.content).toBeTruthy();

      console.log(`✅ Workflow generated in ${generationTime}ms`);
    });
  });
});