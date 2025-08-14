/**
 * YAML Generator Integration Test Suite
 * 
 * This test suite validates the YAML Generator functionality with real-world scenarios
 * and focuses on testing the actual implemented functionality.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { YAMLGeneratorImpl } from '../src/generator/yaml-generator';
import { DetectionResult, WorkflowType } from '../src/generator/interfaces';
import * as yaml from 'js-yaml';

describe('YAML Generator Integration Test Suite', () => {
  let generator: YAMLGeneratorImpl;

  beforeAll(async () => {
    generator = new YAMLGeneratorImpl({
      cacheEnabled: true,
      agentHooksConfig: {
        enabled: true,
        webhookUrl: 'https://test-webhook.example.com',
        automationLevel: 'standard'
      },
      advancedPatternsEnabled: true
    });
  });

  afterAll(() => {
    console.log('\n✅ YAML Generator Integration Tests Completed');
  });

  describe('Framework-Specific Workflow Generation', () => {
    it('should generate valid React TypeScript workflow', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'React',
            version: '18.2.0',
            confidence: 0.9,
            evidence: ['package.json', 'src/App.tsx'],
            category: 'frontend'
          }
        ],
        languages: [
          {
            name: 'JavaScript',
            version: '18.0.0',
            confidence: 0.9,
            primary: true
          },
          {
            name: 'TypeScript',
            version: '5.0.0',
            confidence: 0.8,
            primary: false
          }
        ],
        buildTools: [
          {
            name: 'Vite',
            configFile: 'vite.config.ts',
            confidence: 0.8
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
            platform: 'Vercel',
            type: 'static',
            confidence: 0.7
          }
        ],
        projectMetadata: {
          name: 'react-typescript-app',
          description: 'A modern React TypeScript application',
          version: '1.0.0',
          license: 'MIT'
        }
      };

      const workflow = await generator.generateWorkflow(detectionResult, {
        workflowType: 'ci',
        optimizationLevel: 'standard',
        includeComments: true,
        securityLevel: 'standard',
        agentHooksEnabled: false,
        environmentManagement: {
          includeSecretValidation: true,
          includeOIDC: false,
          includeConfigGeneration: true,
          generateEnvFiles: false,
          autoDetectSecrets: true
        }
      });

      // Validate workflow structure
      expect(workflow).toBeDefined();
      expect(workflow.filename).toBeTruthy();
      expect(workflow.content).toBeTruthy();
      expect(workflow.type).toBe('ci');
      expect(workflow.metadata).toBeDefined();

      // Validate YAML syntax
      expect(() => yaml.load(workflow.content)).not.toThrow();

      // Validate workflow contains expected elements
      expect(workflow.content).toContain('name:');
      expect(workflow.content).toContain('on:');
      expect(workflow.content).toContain('jobs:');

      // Validate React/TypeScript specific elements
      const hasNodeSetup = workflow.content.includes('setup-node') || workflow.content.includes('actions/setup-node');
      expect(hasNodeSetup).toBe(true);

      console.log('✅ React TypeScript workflow generated successfully');
      console.log(`   Workflow size: ${workflow.content.length} characters`);
      console.log(`   Optimizations: ${workflow.metadata.optimizations.length}`);
      console.log(`   Warnings: ${workflow.metadata.warnings.length}`);
    });

    it('should generate valid Python Django workflow', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'Django',
            version: '4.2.0',
            confidence: 0.9,
            evidence: ['requirements.txt', 'manage.py'],
            category: 'backend'
          }
        ],
        languages: [
          {
            name: 'Python',
            version: '3.11.0',
            confidence: 0.9,
            primary: true
          }
        ],
        buildTools: [
          {
            name: 'pip',
            configFile: 'requirements.txt',
            confidence: 0.9
          }
        ],
        packageManagers: [
          {
            name: 'pip',
            confidence: 0.9
          }
        ],
        testingFrameworks: [
          {
            name: 'pytest',
            type: 'unit',
            confidence: 0.8
          }
        ],
        deploymentTargets: [
          {
            platform: 'AWS',
            type: 'container',
            confidence: 0.7
          }
        ],
        projectMetadata: {
          name: 'django-rest-api',
          description: 'A Django REST API application',
          version: '1.0.0',
          license: 'MIT'
        }
      };

      const workflow = await generator.generateWorkflow(detectionResult, {
        workflowType: 'ci',
        optimizationLevel: 'standard',
        includeComments: true,
        securityLevel: 'enterprise',
        agentHooksEnabled: false,
        environmentManagement: {
          includeSecretValidation: true,
          includeOIDC: true,
          includeConfigGeneration: true,
          generateEnvFiles: true,
          autoDetectSecrets: true
        }
      });

      // Validate workflow structure
      expect(workflow).toBeDefined();
      expect(workflow.content).toBeTruthy();
      expect(workflow.type).toBe('ci');

      // Validate YAML syntax
      expect(() => yaml.load(workflow.content)).not.toThrow();

      // Validate Python specific elements
      const hasPythonSetup = workflow.content.includes('setup-python') || workflow.content.includes('actions/setup-python');
      expect(hasPythonSetup).toBe(true);

      console.log('✅ Python Django workflow generated successfully');
      console.log(`   Workflow size: ${workflow.content.length} characters`);
      console.log(`   Security level: enterprise`);
    });

    it('should generate valid Go microservice workflow', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'Gin',
            version: '1.9.0',
            confidence: 0.8,
            evidence: ['go.mod', 'main.go'],
            category: 'backend'
          }
        ],
        languages: [
          {
            name: 'Go',
            version: '1.21.0',
            confidence: 0.9,
            primary: true
          }
        ],
        buildTools: [
          {
            name: 'go',
            configFile: 'go.mod',
            confidence: 0.9
          }
        ],
        packageManagers: [
          {
            name: 'go',
            confidence: 0.9
          }
        ],
        testingFrameworks: [
          {
            name: 'testing',
            type: 'unit',
            confidence: 0.9
          }
        ],
        deploymentTargets: [
          {
            platform: 'Kubernetes',
            type: 'container',
            confidence: 0.8
          }
        ],
        projectMetadata: {
          name: 'go-gin-microservice',
          description: 'A Go microservice with Gin framework',
          version: '1.0.0',
          license: 'MIT'
        }
      };

      const workflow = await generator.generateWorkflow(detectionResult, {
        workflowType: 'ci',
        optimizationLevel: 'aggressive',
        includeComments: true,
        securityLevel: 'standard',
        agentHooksEnabled: false,
        environmentManagement: {
          includeSecretValidation: true,
          includeOIDC: false,
          includeConfigGeneration: true,
          generateEnvFiles: false,
          autoDetectSecrets: true
        }
      });

      // Validate workflow structure
      expect(workflow).toBeDefined();
      expect(workflow.content).toBeTruthy();
      expect(workflow.type).toBe('ci');

      // Validate YAML syntax
      expect(() => yaml.load(workflow.content)).not.toThrow();

      // Validate Go specific elements
      const hasGoSetup = workflow.content.includes('setup-go') || workflow.content.includes('actions/setup-go');
      expect(hasGoSetup).toBe(true);

      console.log('✅ Go microservice workflow generated successfully');
      console.log(`   Optimization level: aggressive`);
    });
  });

  describe('Multi-Framework Project Workflows', () => {
    it('should generate coordinated workflows for multi-language projects', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'React',
            version: '18.2.0',
            confidence: 0.8,
            evidence: ['frontend/package.json'],
            category: 'frontend'
          },
          {
            name: 'Django',
            version: '4.2.0',
            confidence: 0.8,
            evidence: ['backend/requirements.txt'],
            category: 'backend'
          }
        ],
        languages: [
          {
            name: 'JavaScript',
            confidence: 0.8,
            primary: true
          },
          {
            name: 'Python',
            confidence: 0.8,
            primary: false
          }
        ],
        buildTools: [
          {
            name: 'npm',
            configFile: 'frontend/package.json',
            confidence: 0.8
          },
          {
            name: 'pip',
            configFile: 'backend/requirements.txt',
            confidence: 0.8
          }
        ],
        packageManagers: [
          {
            name: 'npm',
            confidence: 0.8
          },
          {
            name: 'pip',
            confidence: 0.8
          }
        ],
        testingFrameworks: [
          {
            name: 'Jest',
            type: 'unit',
            confidence: 0.7
          },
          {
            name: 'pytest',
            type: 'unit',
            confidence: 0.7
          }
        ],
        deploymentTargets: [
          {
            platform: 'Docker',
            type: 'container',
            confidence: 0.8
          }
        ],
        projectMetadata: {
          name: 'fullstack-app',
          description: 'A full-stack application with React and Django',
          version: '1.0.0'
        }
      };

      const workflows = await generator.generateMultipleWorkflows(
        detectionResult,
        ['ci', 'cd', 'security']
      );

      expect(workflows.length).toBeGreaterThan(0);
      expect(workflows.length).toBeLessThanOrEqual(3);

      // Validate each workflow
      workflows.forEach(workflow => {
        expect(workflow).toBeDefined();
        expect(workflow.content).toBeTruthy();
        expect(['ci', 'cd', 'security']).toContain(workflow.type);
        
        // Validate YAML syntax
        expect(() => yaml.load(workflow.content)).not.toThrow();
      });

      console.log('✅ Multi-framework workflows generated successfully');
      console.log(`   Generated ${workflows.length} workflows`);
      console.log(`   Types: ${workflows.map(w => w.type).join(', ')}`);
    });
  });

  describe('Workflow Validation', () => {
    it('should validate generated workflows against GitHub Actions schema', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'Express',
            confidence: 0.8,
            evidence: ['package.json'],
            category: 'backend'
          }
        ],
        languages: [
          {
            name: 'JavaScript',
            confidence: 0.9,
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
            platform: 'Heroku',
            type: 'traditional',
            confidence: 0.7
          }
        ],
        projectMetadata: {
          name: 'express-api',
          description: 'An Express.js API'
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

      // If there are errors, they should not be critical
      if (validationResult.errors.length > 0) {
        const criticalErrors = validationResult.errors.filter(e => e.severity === 'error');
        expect(criticalErrors.length).toBe(0);
      }

      console.log('✅ Workflow validation passed');
      console.log(`   Errors: ${validationResult.errors.length}`);
      console.log(`   Warnings: ${validationResult.warnings.length}`);
      console.log(`   Suggestions: ${validationResult.suggestions.length}`);
    });

    it('should handle invalid YAML gracefully', async () => {
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

  describe('Performance and Scalability', () => {
    it('should generate workflows efficiently', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'React',
            confidence: 0.8,
            evidence: ['package.json'],
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
            platform: 'Netlify',
            type: 'static',
            confidence: 0.7
          }
        ],
        projectMetadata: {
          name: 'performance-test-app',
          description: 'App for performance testing'
        }
      };

      const iterations = 5;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        const workflow = await generator.generateWorkflow(detectionResult);
        const endTime = Date.now();
        
        times.push(endTime - startTime);
        
        // Validate each generated workflow
        expect(workflow).toBeDefined();
        expect(workflow.content).toBeTruthy();
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      // Performance requirements
      expect(avgTime).toBeLessThan(2000); // Under 2 seconds average
      expect(maxTime).toBeLessThan(5000); // Under 5 seconds maximum

      console.log('✅ Performance test completed');
      console.log(`   Average time: ${avgTime.toFixed(2)}ms`);
      console.log(`   Min time: ${minTime}ms`);
      console.log(`   Max time: ${maxTime}ms`);
      console.log(`   Iterations: ${iterations}`);
    });

    it('should handle complex projects with multiple frameworks', async () => {
      const complexDetectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'React',
            confidence: 0.8,
            evidence: ['frontend/package.json'],
            category: 'frontend'
          },
          {
            name: 'Express',
            confidence: 0.8,
            evidence: ['backend/package.json'],
            category: 'backend'
          },
          {
            name: 'Django',
            confidence: 0.7,
            evidence: ['api/requirements.txt'],
            category: 'backend'
          }
        ],
        languages: [
          {
            name: 'JavaScript',
            confidence: 0.9,
            primary: true
          },
          {
            name: 'TypeScript',
            confidence: 0.8,
            primary: false
          },
          {
            name: 'Python',
            confidence: 0.8,
            primary: false
          }
        ],
        buildTools: [
          {
            name: 'npm',
            configFile: 'package.json',
            confidence: 0.9
          },
          {
            name: 'webpack',
            configFile: 'webpack.config.js',
            confidence: 0.7
          },
          {
            name: 'pip',
            configFile: 'requirements.txt',
            confidence: 0.8
          }
        ],
        packageManagers: [
          {
            name: 'npm',
            confidence: 0.9
          },
          {
            name: 'pip',
            confidence: 0.8
          }
        ],
        testingFrameworks: [
          {
            name: 'Jest',
            type: 'unit',
            confidence: 0.8
          },
          {
            name: 'Cypress',
            type: 'e2e',
            confidence: 0.7
          },
          {
            name: 'pytest',
            type: 'unit',
            confidence: 0.8
          }
        ],
        deploymentTargets: [
          {
            platform: 'Docker',
            type: 'container',
            confidence: 0.8
          },
          {
            platform: 'Kubernetes',
            type: 'container',
            confidence: 0.7
          }
        ],
        projectMetadata: {
          name: 'complex-fullstack-app',
          description: 'A complex full-stack application with multiple frameworks',
          version: '2.0.0'
        }
      };

      const startTime = Date.now();
      const workflow = await generator.generateWorkflow(complexDetectionResult, {
        workflowType: 'ci',
        optimizationLevel: 'aggressive',
        includeComments: true,
        securityLevel: 'enterprise',
        agentHooksEnabled: true,
        environmentManagement: {
          includeSecretValidation: true,
          includeOIDC: true,
          includeConfigGeneration: true,
          generateEnvFiles: true,
          autoDetectSecrets: true
        }
      });
      const endTime = Date.now();

      const generationTime = endTime - startTime;

      // Validate complex workflow
      expect(workflow).toBeDefined();
      expect(workflow.content).toBeTruthy();
      expect(generationTime).toBeLessThan(10000); // Under 10 seconds for complex projects

      // Validate YAML syntax
      expect(() => yaml.load(workflow.content)).not.toThrow();

      // Should handle complexity gracefully
      expect(workflow.metadata.warnings.length).toBeLessThan(10);

      console.log('✅ Complex project handled successfully');
      console.log(`   Generation time: ${generationTime}ms`);
      console.log(`   Workflow size: ${workflow.content.length} characters`);
      console.log(`   Frameworks: ${complexDetectionResult.frameworks.length}`);
      console.log(`   Languages: ${complexDetectionResult.languages.length}`);
      console.log(`   Warnings: ${workflow.metadata.warnings.length}`);
    });
  });

  describe('Error Handling and Edge Cases', () => {
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

    it('should handle conflicting framework detections', async () => {
      const conflictingDetectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'React',
            confidence: 0.8,
            evidence: ['package.json'],
            category: 'frontend'
          },
          {
            name: 'Vue',
            confidence: 0.7,
            evidence: ['package.json'],
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
        buildTools: [
          {
            name: 'webpack',
            configFile: 'webpack.config.js',
            confidence: 0.7
          },
          {
            name: 'vite',
            configFile: 'vite.config.js',
            confidence: 0.8
          }
        ],
        packageManagers: [
          {
            name: 'npm',
            confidence: 0.9
          }
        ],
        testingFrameworks: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'conflicting-project',
          description: 'A project with conflicting framework detections'
        }
      };

      const workflow = await generator.generateWorkflow(conflictingDetectionResult);

      expect(workflow).toBeDefined();
      expect(workflow.content).toBeTruthy();
      
      // Should generate a workflow despite conflicts
      expect(() => yaml.load(workflow.content)).not.toThrow();
      
      // Should include warnings about conflicts
      expect(workflow.metadata.warnings.length).toBeGreaterThan(0);

      console.log('✅ Conflicting detections handled gracefully');
      console.log(`   Warnings: ${workflow.metadata.warnings.length}`);
    });
  });

  describe('Workflow Content Validation', () => {
    it('should generate workflows with proper GitHub Actions structure', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'Next.js',
            confidence: 0.9,
            evidence: ['next.config.js', 'package.json'],
            category: 'fullstack'
          }
        ],
        languages: [
          {
            name: 'TypeScript',
            confidence: 0.9,
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
            confidence: 0.9
          }
        ],
        projectMetadata: {
          name: 'nextjs-app',
          description: 'A Next.js application'
        }
      };

      const workflow = await generator.generateWorkflow(detectionResult);
      
      // Parse YAML to validate structure
      const parsedWorkflow = yaml.load(workflow.content) as any;
      
      expect(parsedWorkflow).toBeDefined();
      expect(parsedWorkflow.name).toBeTruthy();
      expect(parsedWorkflow.on).toBeDefined();
      expect(parsedWorkflow.jobs).toBeDefined();
      
      // Validate jobs structure
      const jobs = Object.keys(parsedWorkflow.jobs);
      expect(jobs.length).toBeGreaterThan(0);
      
      // Validate first job has required properties
      const firstJob = parsedWorkflow.jobs[jobs[0]];
      expect(firstJob['runs-on']).toBeTruthy();
      expect(firstJob.steps).toBeDefined();
      expect(Array.isArray(firstJob.steps)).toBe(true);
      expect(firstJob.steps.length).toBeGreaterThan(0);

      console.log('✅ Workflow structure validation passed');
      console.log(`   Jobs: ${jobs.length}`);
      console.log(`   First job steps: ${firstJob.steps.length}`);
    });

    it('should include security best practices', async () => {
      const detectionResult: DetectionResult = {
        frameworks: [
          {
            name: 'Express',
            confidence: 0.8,
            evidence: ['package.json'],
            category: 'backend'
          }
        ],
        languages: [
          {
            name: 'JavaScript',
            confidence: 0.9,
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
            confidence: 0.9
          }
        ],
        testingFrameworks: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'secure-app',
          description: 'An app for security testing'
        }
      };

      const workflow = await generator.generateWorkflow(detectionResult, {
        workflowType: 'ci',
        optimizationLevel: 'standard',
        includeComments: true,
        securityLevel: 'enterprise',
        agentHooksEnabled: false,
        environmentManagement: {
          includeSecretValidation: true,
          includeOIDC: true,
          includeConfigGeneration: true,
          generateEnvFiles: true,
          autoDetectSecrets: true
        }
      });

      // Check for security best practices
      const content = workflow.content.toLowerCase();
      
      // Should include permissions
      expect(workflow.content).toContain('permissions:');
      
      // Should use pinned action versions (check for @v pattern)
      const actionMatches = workflow.content.match(/uses: .+@v\d+/g);
      expect(actionMatches).toBeTruthy();
      if (actionMatches) {
        expect(actionMatches.length).toBeGreaterThan(0);
      }

      console.log('✅ Security best practices validation passed');
      console.log(`   Pinned actions: ${actionMatches?.length || 0}`);
      console.log(`   Security level: enterprise`);
    });
  });
});