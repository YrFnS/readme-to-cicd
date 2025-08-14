/**
 * Regression Test Suite for YAML Generator
 * 
 * This test suite validates that workflow generation quality doesn't degrade over time
 * and maintains consistent performance and output quality across versions.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { YAMLGeneratorImpl } from '../src/generator/yaml-generator';
import { DetectionResult } from '../src/generator/interfaces';
import { 
  createTestYAMLGenerator,
  validateWorkflowGeneration,
  generateWorkflowPerformanceReport,
  type WorkflowTestCase,
  type CurrentResult
} from './utils/yaml-generator-test-helpers';
import { RegressionTestManager } from './utils/regression-test-manager';
import * as yaml from 'js-yaml';

describe('Regression Test Suite', () => {
  let generator: YAMLGeneratorImpl;
  let regressionManager: RegressionTestManager;
  let currentResults: CurrentResult[] = [];

  beforeAll(async () => {
    generator = createTestYAMLGenerator();
    regressionManager = new RegressionTestManager();
  });

  afterAll(async () => {
    // Generate regression report
    const baselineResults = await regressionManager.getBaselineResults();
    const comparison = regressionManager.compareWithBaseline(currentResults, baselineResults);
    const report = regressionManager.generateRegressionReport(comparison);
    
    console.log(report);

    // Update baseline if needed and no critical regressions
    if (comparison.criticalRegressions.length === 0 && await regressionManager.shouldUpdateBaseline()) {
      await regressionManager.archiveBaseline();
      await regressionManager.updateBaseline(currentResults);
      console.log('📊 Baseline updated with current results');
    }
  });

  describe('Framework Generation Regression Tests', () => {
    it('should maintain React workflow generation quality', async () => {
      const reactDetectionResult: DetectionResult = {
        frameworks: [
          { name: 'React', confidence: 0.9, evidence: ['package.json', 'src/App.jsx'], category: 'frontend' }
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
          { platform: 'Vercel', type: 'static', confidence: 0.8 }
        ],
        projectMetadata: {
          name: 'react-regression-test',
          description: 'React project for regression testing'
        }
      };

      const testCase: WorkflowTestCase = {
        name: 'React App Regression',
        detectionResult: reactDetectionResult,
        expectedWorkflowFeatures: {
          nodeSetup: true,
          buildSteps: ['npm ci', 'npm run build'],
          testSteps: ['npm test'],
          cacheStrategies: ['npm'],
          securityScans: ['npm-audit'],
          deploymentSteps: ['build-artifacts']
        },
        minValidationScore: 0.85,
        description: 'React application regression test'
      };

      const result = await validateWorkflowGeneration(generator, testCase);

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(0.85);
      expect(result.errors).toHaveLength(0);

      // Record result for regression analysis
      currentResults.push({
        name: 'React App Regression',
        score: result.score,
        workflowSize: result.performanceMetrics.workflowSize,
        optimizations: result.workflowFeatures.cacheStrategies.length + result.workflowFeatures.securityScans.length,
        warnings: result.warnings.length
      });

      console.log(generateWorkflowPerformanceReport(
        'React App Regression',
        result.performanceMetrics
      ));
    });

    it('should maintain Python Django workflow generation quality', async () => {
      const djangoDetectionResult: DetectionResult = {
        frameworks: [
          { name: 'Django', confidence: 0.9, evidence: ['requirements.txt', 'manage.py'], category: 'backend' }
        ],
        languages: [
          { name: 'Python', confidence: 0.9, primary: true }
        ],
        buildTools: [
          { name: 'pip', configFile: 'requirements.txt', confidence: 0.9 }
        ],
        packageManagers: [
          { name: 'pip', confidence: 0.9 }
        ],
        testingFrameworks: [
          { name: 'pytest', type: 'unit', confidence: 0.8 }
        ],
        deploymentTargets: [
          { platform: 'AWS', type: 'container', confidence: 0.8 }
        ],
        projectMetadata: {
          name: 'django-regression-test',
          description: 'Django project for regression testing'
        }
      };

      const testCase: WorkflowTestCase = {
        name: 'Python Django Regression',
        detectionResult: djangoDetectionResult,
        expectedWorkflowFeatures: {
          pythonSetup: true,
          djangoSupport: true,
          buildSteps: ['pip install -r requirements.txt'],
          testSteps: ['python manage.py test', 'pytest'],
          cacheStrategies: ['pip'],
          securityScans: ['bandit', 'safety'],
          deploymentSteps: ['collectstatic', 'migrate']
        },
        minValidationScore: 0.82,
        description: 'Django application regression test'
      };

      const result = await validateWorkflowGeneration(generator, testCase);

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(0.82);

      // Record result for regression analysis
      currentResults.push({
        name: 'Python Django Regression',
        score: result.score,
        workflowSize: result.performanceMetrics.workflowSize,
        optimizations: result.workflowFeatures.cacheStrategies.length + result.workflowFeatures.securityScans.length,
        warnings: result.warnings.length
      });

      console.log(generateWorkflowPerformanceReport(
        'Python Django Regression',
        result.performanceMetrics
      ));
    });

    it('should maintain Go microservice workflow generation quality', async () => {
      const goDetectionResult: DetectionResult = {
        frameworks: [
          { name: 'Gin', confidence: 0.8, evidence: ['go.mod', 'main.go'], category: 'backend' }
        ],
        languages: [
          { name: 'Go', confidence: 0.9, primary: true }
        ],
        buildTools: [
          { name: 'go', configFile: 'go.mod', confidence: 0.9 }
        ],
        packageManagers: [
          { name: 'go', confidence: 0.9 }
        ],
        testingFrameworks: [
          { name: 'testing', type: 'unit', confidence: 0.9 }
        ],
        deploymentTargets: [
          { platform: 'Kubernetes', type: 'container', confidence: 0.8 }
        ],
        projectMetadata: {
          name: 'go-regression-test',
          description: 'Go microservice for regression testing'
        }
      };

      const testCase: WorkflowTestCase = {
        name: 'Go Microservice Regression',
        detectionResult: goDetectionResult,
        expectedWorkflowFeatures: {
          goSetup: true,
          ginSupport: true,
          buildSteps: ['go build', 'go mod download'],
          testSteps: ['go test ./...', 'go vet'],
          cacheStrategies: ['go-modules'],
          securityScans: ['gosec'],
          deploymentSteps: ['docker-build']
        },
        minValidationScore: 0.80,
        description: 'Go microservice regression test'
      };

      const result = await validateWorkflowGeneration(generator, testCase);

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(0.80);

      // Record result for regression analysis
      currentResults.push({
        name: 'Go Microservice Regression',
        score: result.score,
        workflowSize: result.performanceMetrics.workflowSize,
        optimizations: result.workflowFeatures.cacheStrategies.length + result.workflowFeatures.securityScans.length,
        warnings: result.warnings.length
      });

      console.log(generateWorkflowPerformanceReport(
        'Go Microservice Regression',
        result.performanceMetrics
      ));
    });

    it('should maintain Rust CLI tool workflow generation quality', async () => {
      const rustDetectionResult: DetectionResult = {
        frameworks: [
          { name: 'Clap', confidence: 0.7, evidence: ['Cargo.toml'], category: 'backend' }
        ],
        languages: [
          { name: 'Rust', confidence: 0.9, primary: true }
        ],
        buildTools: [
          { name: 'cargo', configFile: 'Cargo.toml', confidence: 0.9 }
        ],
        packageManagers: [
          { name: 'cargo', confidence: 0.9 }
        ],
        testingFrameworks: [
          { name: 'cargo-test', type: 'unit', confidence: 0.9 }
        ],
        deploymentTargets: [
          { platform: 'GitHub Releases', type: 'static', confidence: 0.8 }
        ],
        projectMetadata: {
          name: 'rust-regression-test',
          description: 'Rust CLI tool for regression testing'
        }
      };

      const testCase: WorkflowTestCase = {
        name: 'Rust CLI Tool Regression',
        detectionResult: rustDetectionResult,
        expectedWorkflowFeatures: {
          rustSetup: true,
          cargoSupport: true,
          buildSteps: ['cargo build --release'],
          testSteps: ['cargo test', 'cargo clippy'],
          cacheStrategies: ['cargo'],
          securityScans: ['cargo-audit'],
          deploymentSteps: ['release-artifacts']
        },
        minValidationScore: 0.78,
        description: 'Rust CLI tool regression test'
      };

      const result = await validateWorkflowGeneration(generator, testCase);

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(0.78);

      // Record result for regression analysis
      currentResults.push({
        name: 'Rust CLI Tool Regression',
        score: result.score,
        workflowSize: result.performanceMetrics.workflowSize,
        optimizations: result.workflowFeatures.cacheStrategies.length + result.workflowFeatures.securityScans.length,
        warnings: result.warnings.length
      });

      console.log(generateWorkflowPerformanceReport(
        'Rust CLI Tool Regression',
        result.performanceMetrics
      ));
    });

    it('should maintain Java Spring Boot workflow generation quality', async () => {
      const javaDetectionResult: DetectionResult = {
        frameworks: [
          { name: 'Spring Boot', confidence: 0.8, evidence: ['pom.xml', 'src/main/java'], category: 'backend' }
        ],
        languages: [
          { name: 'Java', confidence: 0.9, primary: true }
        ],
        buildTools: [
          { name: 'maven', configFile: 'pom.xml', confidence: 0.9 }
        ],
        packageManagers: [
          { name: 'maven', confidence: 0.9 }
        ],
        testingFrameworks: [
          { name: 'JUnit', type: 'unit', confidence: 0.8 }
        ],
        deploymentTargets: [
          { platform: 'AWS', type: 'container', confidence: 0.8 }
        ],
        projectMetadata: {
          name: 'java-regression-test',
          description: 'Java Spring Boot application for regression testing'
        }
      };

      const testCase: WorkflowTestCase = {
        name: 'Java Spring Boot Regression',
        detectionResult: javaDetectionResult,
        expectedWorkflowFeatures: {
          javaSetup: true,
          springBootSupport: true,
          buildSteps: ['./mvnw compile', './mvnw package'],
          testSteps: ['./mvnw test'],
          cacheStrategies: ['maven'],
          securityScans: ['dependency-check'],
          deploymentSteps: ['docker-build', 'jar-artifact']
        },
        minValidationScore: 0.83,
        description: 'Java Spring Boot application regression test'
      };

      const result = await validateWorkflowGeneration(generator, testCase);

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(0.83);

      // Record result for regression analysis
      currentResults.push({
        name: 'Java Spring Boot Regression',
        score: result.score,
        workflowSize: result.performanceMetrics.workflowSize,
        optimizations: result.workflowFeatures.cacheStrategies.length + result.workflowFeatures.securityScans.length,
        warnings: result.warnings.length
      });

      console.log(generateWorkflowPerformanceReport(
        'Java Spring Boot Regression',
        result.performanceMetrics
      ));
    });
  });

  describe('Performance Regression Tests', () => {
    it('should maintain consistent generation performance', async () => {
      const testDetectionResult: DetectionResult = {
        frameworks: [
          { name: 'React', confidence: 0.8, evidence: ['package.json'], category: 'frontend' }
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
          name: 'performance-regression-test',
          description: 'Project for performance regression testing'
        }
      };

      const iterations = 10;
      const generationTimes: number[] = [];
      const workflowSizes: number[] = [];
      const memoryUsages: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        const startMemory = process.memoryUsage().heapUsed;
        
        const workflow = await generator.generateWorkflow(testDetectionResult);
        
        const endTime = Date.now();
        const endMemory = process.memoryUsage().heapUsed;

        generationTimes.push(endTime - startTime);
        workflowSizes.push(workflow.content.length);
        memoryUsages.push(Math.max(0, endMemory - startMemory));

        // Validate each generated workflow
        expect(workflow).toBeDefined();
        expect(workflow.content).toBeTruthy();
        expect(() => yaml.load(workflow.content)).not.toThrow();
      }

      const avgTime = generationTimes.reduce((a, b) => a + b, 0) / generationTimes.length;
      const maxTime = Math.max(...generationTimes);
      const minTime = Math.min(...generationTimes);
      const avgSize = workflowSizes.reduce((a, b) => a + b, 0) / workflowSizes.length;
      const avgMemory = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;

      // Performance regression requirements
      expect(avgTime).toBeLessThan(3000); // Under 3 seconds average
      expect(maxTime).toBeLessThan(8000); // Under 8 seconds maximum
      expect(avgMemory).toBeLessThan(50 * 1024 * 1024); // Under 50MB average memory

      // Consistency requirements
      const timeVariance = Math.max(...generationTimes) - Math.min(...generationTimes);
      expect(timeVariance).toBeLessThan(5000); // Less than 5 seconds variance

      console.log('⚡ Performance regression results:', {
        iterations,
        avgTime: `${avgTime.toFixed(2)}ms`,
        minTime: `${minTime}ms`,
        maxTime: `${maxTime}ms`,
        timeVariance: `${timeVariance}ms`,
        avgSize: `${(avgSize / 1024).toFixed(2)}KB`,
        avgMemory: `${(avgMemory / 1024 / 1024).toFixed(2)}MB`,
        consistency: `${((1 - timeVariance / maxTime) * 100).toFixed(1)}%`
      });
    });

    it('should handle complex projects without performance degradation', async () => {
      const complexDetectionResult: DetectionResult = {
        frameworks: [
          { name: 'React', confidence: 0.8, evidence: ['frontend/package.json'], category: 'frontend' },
          { name: 'Express', confidence: 0.8, evidence: ['backend/package.json'], category: 'backend' },
          { name: 'Django', confidence: 0.7, evidence: ['api/requirements.txt'], category: 'backend' }
        ],
        languages: [
          { name: 'JavaScript', confidence: 0.9, primary: true },
          { name: 'TypeScript', confidence: 0.8, primary: false },
          { name: 'Python', confidence: 0.8, primary: false }
        ],
        buildTools: [
          { name: 'npm', configFile: 'package.json', confidence: 0.9 },
          { name: 'webpack', configFile: 'webpack.config.js', confidence: 0.7 },
          { name: 'pip', configFile: 'requirements.txt', confidence: 0.8 }
        ],
        packageManagers: [
          { name: 'npm', confidence: 0.9 },
          { name: 'pip', confidence: 0.8 }
        ],
        testingFrameworks: [
          { name: 'Jest', type: 'unit', confidence: 0.8 },
          { name: 'Cypress', type: 'e2e', confidence: 0.7 },
          { name: 'pytest', type: 'unit', confidence: 0.8 }
        ],
        deploymentTargets: [
          { platform: 'Docker', type: 'container', confidence: 0.8 },
          { platform: 'Kubernetes', type: 'container', confidence: 0.7 }
        ],
        projectMetadata: {
          name: 'complex-regression-test',
          description: 'Complex multi-framework project for regression testing'
        }
      };

      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;
      
      const workflows = await generator.generateCompleteWorkflowSuite(complexDetectionResult);
      
      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;

      const generationTime = endTime - startTime;
      const memoryUsage = Math.max(0, endMemory - startMemory);

      // Complex project performance requirements
      expect(generationTime).toBeLessThan(15000); // Under 15 seconds for complex projects
      expect(workflows.length).toBeGreaterThan(0);
      expect(memoryUsage).toBeLessThan(100 * 1024 * 1024); // Under 100MB for complex projects

      // Should generate multiple workflow types
      const workflowTypes = new Set(workflows.map(w => w.type));
      expect(workflowTypes.size).toBeGreaterThan(1);

      // Should handle complexity gracefully
      const totalWarnings = workflows.reduce((sum, w) => sum + w.metadata.warnings.length, 0);
      expect(totalWarnings).toBeLessThan(30); // Reasonable warning count for complex projects

      console.log('🏗️ Complex project regression results:', {
        generationTime: `${generationTime}ms`,
        memoryUsage: `${(memoryUsage / 1024 / 1024).toFixed(2)}MB`,
        workflowsGenerated: workflows.length,
        workflowTypes: Array.from(workflowTypes),
        totalWarnings,
        avgWorkflowSize: `${(workflows.reduce((sum, w) => sum + w.content.length, 0) / workflows.length / 1024).toFixed(2)}KB`
      });
    });
  });

  describe('Quality Regression Tests', () => {
    it('should maintain workflow validation quality', async () => {
      const testCases = [
        {
          name: 'Simple Node.js App',
          detectionResult: {
            frameworks: [{ name: 'Express', confidence: 0.8, evidence: ['package.json'], category: 'backend' as const }],
            languages: [{ name: 'JavaScript', confidence: 0.9, primary: true }],
            buildTools: [{ name: 'npm', configFile: 'package.json', confidence: 0.9 }],
            packageManagers: [{ name: 'npm', confidence: 0.9 }],
            testingFrameworks: [{ name: 'Jest', type: 'unit' as const, confidence: 0.8 }],
            deploymentTargets: [{ platform: 'Heroku', type: 'traditional' as const, confidence: 0.7 }],
            projectMetadata: { name: 'simple-nodejs-app', description: 'Simple Node.js application' }
          }
        },
        {
          name: 'Python Web App',
          detectionResult: {
            frameworks: [{ name: 'Flask', confidence: 0.8, evidence: ['requirements.txt'], category: 'backend' as const }],
            languages: [{ name: 'Python', confidence: 0.9, primary: true }],
            buildTools: [{ name: 'pip', configFile: 'requirements.txt', confidence: 0.9 }],
            packageManagers: [{ name: 'pip', confidence: 0.9 }],
            testingFrameworks: [{ name: 'pytest', type: 'unit' as const, confidence: 0.8 }],
            deploymentTargets: [{ platform: 'AWS', type: 'container' as const, confidence: 0.8 }],
            projectMetadata: { name: 'python-web-app', description: 'Python web application' }
          }
        }
      ];

      for (const testCase of testCases) {
        const workflow = await generator.generateWorkflow(testCase.detectionResult);
        
        // Validate workflow quality
        const validationResult = generator.validateWorkflow(workflow.content);
        
        expect(validationResult.isValid).toBe(true);
        expect(validationResult.errors).toHaveLength(0);
        
        // Should have reasonable content
        expect(workflow.content.length).toBeGreaterThan(200);
        expect(workflow.content).toContain('name:');
        expect(workflow.content).toContain('on:');
        expect(workflow.content).toContain('jobs:');
        
        // Should have valid YAML syntax
        expect(() => yaml.load(workflow.content)).not.toThrow();

        console.log(`✅ ${testCase.name} quality validation:`, {
          isValid: validationResult.isValid,
          errors: validationResult.errors.length,
          warnings: validationResult.warnings.length,
          suggestions: validationResult.suggestions.length,
          workflowSize: `${(workflow.content.length / 1024).toFixed(2)}KB`
        });
      }
    });

    it('should maintain consistent output format', async () => {
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
          name: 'format-consistency-test',
          description: 'Test for output format consistency'
        }
      };

      const workflows = await generator.generateMultipleWorkflows(
        detectionResult,
        ['ci', 'cd', 'security']
      );

      expect(workflows.length).toBeGreaterThan(0);

      // All workflows should have consistent structure
      for (const workflow of workflows) {
        expect(workflow.filename).toBeTruthy();
        expect(workflow.filename).toMatch(/\.ya?ml$/);
        expect(workflow.content).toBeTruthy();
        expect(['ci', 'cd', 'security']).toContain(workflow.type);
        expect(workflow.metadata).toBeDefined();
        expect(workflow.metadata.generatedAt).toBeInstanceOf(Date);
        expect(workflow.metadata.generatorVersion).toBeTruthy();
        expect(workflow.metadata.detectionSummary).toBeTruthy();
        expect(Array.isArray(workflow.metadata.optimizations)).toBe(true);
        expect(Array.isArray(workflow.metadata.warnings)).toBe(true);

        // Should have valid YAML structure
        const parsedWorkflow = yaml.load(workflow.content) as any;
        expect(parsedWorkflow.name).toBeTruthy();
        expect(parsedWorkflow.on).toBeDefined();
        expect(parsedWorkflow.jobs).toBeDefined();
      }

      console.log('📋 Output format consistency validation:', {
        workflows: workflows.length,
        allHaveFilenames: workflows.every(w => w.filename),
        allHaveContent: workflows.every(w => w.content),
        allHaveMetadata: workflows.every(w => w.metadata),
        allValidYAML: workflows.every(w => {
          try {
            yaml.load(w.content);
            return true;
          } catch {
            return false;
          }
        })
      });
    });
  });

  describe('Edge Case Regression Tests', () => {
    it('should handle empty detection results consistently', async () => {
      const emptyDetectionResult: DetectionResult = {
        frameworks: [],
        languages: [],
        buildTools: [],
        packageManagers: [],
        testingFrameworks: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'empty-project',
          description: 'Project with no detected frameworks'
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

      // Should be valid YAML
      expect(() => yaml.load(workflow.content)).not.toThrow();

      console.log('⚠️ Empty detection handling regression:', {
        workflowGenerated: true,
        warnings: workflow.metadata.warnings.length,
        workflowSize: workflow.content.length,
        hasBasicStructure: workflow.content.includes('name:') && workflow.content.includes('jobs:')
      });
    });

    it('should handle conflicting detections consistently', async () => {
      const conflictingDetectionResult: DetectionResult = {
        frameworks: [
          { name: 'React', confidence: 0.8, evidence: ['package.json'], category: 'frontend' },
          { name: 'Vue', confidence: 0.7, evidence: ['package.json'], category: 'frontend' },
          { name: 'Angular', confidence: 0.6, evidence: ['package.json'], category: 'frontend' }
        ],
        languages: [
          { name: 'JavaScript', confidence: 0.9, primary: true }
        ],
        buildTools: [
          { name: 'webpack', configFile: 'webpack.config.js', confidence: 0.7 },
          { name: 'vite', configFile: 'vite.config.js', confidence: 0.8 },
          { name: 'parcel', configFile: 'package.json', confidence: 0.6 }
        ],
        packageManagers: [
          { name: 'npm', confidence: 0.9 }
        ],
        testingFrameworks: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'conflicting-project',
          description: 'Project with conflicting framework detections'
        }
      };

      const workflow = await generator.generateWorkflow(conflictingDetectionResult);

      expect(workflow).toBeDefined();
      expect(workflow.content).toBeTruthy();
      
      // Should generate a workflow despite conflicts
      expect(() => yaml.load(workflow.content)).not.toThrow();
      
      // Should include warnings about conflicts
      expect(workflow.metadata.warnings.length).toBeGreaterThan(0);

      // Should choose the highest confidence options
      expect(workflow.content).toContain('vite'); // Highest confidence build tool

      console.log('⚠️ Conflict resolution regression:', {
        workflowGenerated: true,
        warnings: workflow.metadata.warnings.length,
        chosenFramework: 'React (highest confidence)',
        chosenBuildTool: 'Vite (highest confidence)'
      });
    });
  });
});