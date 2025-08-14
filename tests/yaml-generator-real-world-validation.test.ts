/**
 * Real-World Validation Test Suite for YAML Generator
 * 
 * This test suite validates the YAML Generator against real-world project structures
 * and ensures generated workflows work with actual GitHub Actions execution.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { join } from 'path';
import { YAMLGeneratorImpl } from '../src/generator/yaml-generator';
import { DetectionResult } from '../src/generator/interfaces';
import { 
  createTestYAMLGenerator,
  validateWorkflowGeneration,
  loadRealWorldDetectionResult,
  generateWorkflowPerformanceReport,
  validateGitHubActionsExecution,
  type WorkflowTestCase,
  type RealWorldWorkflowProject
} from './utils/yaml-generator-test-helpers';
import { WorkflowComparisonUtility } from './utils/workflow-comparison-utility';
import { RegressionTestManager } from './utils/regression-test-manager';
import * as yaml from 'js-yaml';

describe('Real-World Validation Test Suite', () => {
  let generator: YAMLGeneratorImpl;
  let realWorldProjects: Map<string, RealWorldWorkflowProject>;
  let comparisonUtility: WorkflowComparisonUtility;
  let regressionManager: RegressionTestManager;

  beforeAll(async () => {
    generator = createTestYAMLGenerator();
    realWorldProjects = new Map();
    comparisonUtility = new WorkflowComparisonUtility();
    regressionManager = new RegressionTestManager();
    
    // Load real-world project samples
    const projectPaths = [
      'react-typescript-app',
      'django-rest-api', 
      'go-gin-microservice',
      'rust-cli-tool',
      'java-spring-boot',
      'fullstack-react-express',
      'monorepo-workspace'
    ];

    for (const projectPath of projectPaths) {
      try {
        const fullPath = join(__dirname, 'fixtures', 'real-world-projects', projectPath);
        const project = await loadRealWorldDetectionResult(fullPath);
        realWorldProjects.set(projectPath, project);
      } catch (error) {
        console.warn(`Could not load project ${projectPath}:`, error);
      }
    }

    console.log(`🏗️ Loaded ${realWorldProjects.size} real-world projects for testing`);
  });

  afterAll(() => {
    console.log('\n✅ Real-world validation tests completed');
  });

  describe('Framework-Specific Real-World Validation', () => {
    it('should generate accurate workflows for React TypeScript projects', async () => {
      const project = realWorldProjects.get('react-typescript-app');
      if (!project) {
        console.warn('React TypeScript project not loaded, skipping test');
        return;
      }

      const testCase: WorkflowTestCase = {
        name: 'React TypeScript Real-World',
        detectionResult: project.detectionResult,
        expectedWorkflowFeatures: {
          nodeSetup: true,
          typescriptSupport: true,
          buildSteps: ['npm ci', 'npm run build'],
          testSteps: ['npm test'],
          cacheStrategies: ['npm'],
          securityScans: ['npm-audit'],
          deploymentSteps: ['build-artifacts']
        },
        minValidationScore: 0.85,
        description: 'Real-world React TypeScript application'
      };

      const result = await validateWorkflowGeneration(generator, testCase);

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(0.85);
      expect(result.errors).toHaveLength(0);
      
      // Validate specific React features
      expect(result.workflowFeatures.nodeSetup).toBe(true);
      expect(result.workflowFeatures.typescriptSupport).toBe(true);
      expect(result.workflowFeatures.buildSteps.length).toBeGreaterThan(0);

      console.log(generateWorkflowPerformanceReport(
        'React TypeScript Real-World',
        result.performanceMetrics
      ));
    });

    it('should generate accurate workflows for Django REST API projects', async () => {
      const project = realWorldProjects.get('django-rest-api');
      if (!project) {
        console.warn('Django REST API project not loaded, skipping test');
        return;
      }

      const testCase: WorkflowTestCase = {
        name: 'Django REST API Real-World',
        detectionResult: project.detectionResult,
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
        description: 'Real-world Django REST API with comprehensive features'
      };

      const result = await validateWorkflowGeneration(generator, testCase);

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(0.82);
      
      // Validate Django-specific features
      expect(result.workflowFeatures.pythonSetup).toBe(true);
      expect(result.workflowFeatures.djangoSupport).toBe(true);

      console.log(generateWorkflowPerformanceReport(
        'Django REST API Real-World',
        result.performanceMetrics
      ));
    });

    it('should generate accurate workflows for Go microservice projects', async () => {
      const project = realWorldProjects.get('go-gin-microservice');
      if (!project) {
        console.warn('Go Gin microservice project not loaded, skipping test');
        return;
      }

      const testCase: WorkflowTestCase = {
        name: 'Go Gin Microservice Real-World',
        detectionResult: project.detectionResult,
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
        description: 'Real-world Go microservice with Gin framework'
      };

      const result = await validateWorkflowGeneration(generator, testCase);

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(0.80);
      
      // Validate Go-specific features
      expect(result.workflowFeatures.goSetup).toBe(true);

      console.log(generateWorkflowPerformanceReport(
        'Go Gin Microservice Real-World',
        result.performanceMetrics
      ));
    });

    it('should generate accurate workflows for Rust CLI tool projects', async () => {
      const project = realWorldProjects.get('rust-cli-tool');
      if (!project) {
        console.warn('Rust CLI tool project not loaded, skipping test');
        return;
      }

      const testCase: WorkflowTestCase = {
        name: 'Rust CLI Tool Real-World',
        detectionResult: project.detectionResult,
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
        description: 'Real-world Rust CLI tool'
      };

      const result = await validateWorkflowGeneration(generator, testCase);

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(0.78);
      
      // Validate Rust-specific features
      expect(result.workflowFeatures.rustSetup).toBe(true);

      console.log(generateWorkflowPerformanceReport(
        'Rust CLI Tool Real-World',
        result.performanceMetrics
      ));
    });

    it('should generate accurate workflows for Java Spring Boot projects', async () => {
      const project = realWorldProjects.get('java-spring-boot');
      if (!project) {
        console.warn('Java Spring Boot project not loaded, skipping test');
        return;
      }

      const testCase: WorkflowTestCase = {
        name: 'Java Spring Boot Real-World',
        detectionResult: project.detectionResult,
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
        description: 'Real-world Java Spring Boot application'
      };

      const result = await validateWorkflowGeneration(generator, testCase);

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(0.83);
      
      // Validate Java-specific features
      expect(result.workflowFeatures.javaSetup).toBe(true);

      console.log(generateWorkflowPerformanceReport(
        'Java Spring Boot Real-World',
        result.performanceMetrics
      ));
    });
  });

  describe('Complex Real-World Scenarios', () => {
    it('should handle full-stack applications with multiple frameworks', async () => {
      const project = realWorldProjects.get('fullstack-react-express');
      if (!project) {
        console.warn('Full-stack React Express project not loaded, skipping test');
        return;
      }

      const workflows = await generator.generateMultipleWorkflows(
        project.detectionResult,
        ['ci', 'cd', 'security']
      );

      expect(workflows.length).toBeGreaterThan(0);
      expect(workflows.length).toBeLessThanOrEqual(3);

      // Validate each workflow
      for (const workflow of workflows) {
        expect(workflow).toBeDefined();
        expect(workflow.content).toBeTruthy();
        expect(['ci', 'cd', 'security']).toContain(workflow.type);
        
        // Validate YAML syntax
        expect(() => yaml.load(workflow.content)).not.toThrow();
        
        // Validate GitHub Actions compatibility
        const validationResult = await validateGitHubActionsExecution(workflow.content);
        expect(validationResult.isValid).toBe(true);
      }

      console.log('🌐 Full-stack application workflow results:', {
        workflows: workflows.map(w => `${w.filename} (${w.type})`),
        totalSize: workflows.reduce((sum, w) => sum + w.content.length, 0),
        avgSecurityScore: workflows.reduce((sum, w) => sum + (w.metadata.optimizations.length || 0), 0) / workflows.length
      });
    });

    it('should handle monorepo workspace structures', async () => {
      const project = realWorldProjects.get('monorepo-workspace');
      if (!project) {
        console.warn('Monorepo workspace project not loaded, skipping test');
        return;
      }

      const workflow = await generator.generateWorkflow(project.detectionResult, {
        workflowType: 'ci',
        optimizationLevel: 'aggressive',
        includeComments: true,
        securityLevel: 'standard',
        agentHooksEnabled: false
      });

      expect(workflow).toBeDefined();
      expect(workflow.content).toBeTruthy();

      // Should include path-based triggers for monorepo
      expect(workflow.content).toContain('paths:');
      
      // Should include selective build logic
      expect(workflow.content).toContain('if:');

      // Validate YAML syntax
      expect(() => yaml.load(workflow.content)).not.toThrow();

      console.log('📦 Monorepo workflow results:', {
        workflowSize: workflow.content.length,
        hasPathTriggers: workflow.content.includes('paths:'),
        hasSelectiveBuilds: workflow.content.includes('if:'),
        optimizations: workflow.metadata.optimizations.length
      });
    });
  });

  describe('GitHub Actions Integration Validation', () => {
    it('should generate workflows that pass GitHub Actions schema validation', async () => {
      const projects = Array.from(realWorldProjects.values()).slice(0, 3); // Test first 3 projects
      
      for (const project of projects) {
        const workflow = await generator.generateWorkflow(project.detectionResult);
        
        // Validate against GitHub Actions schema
        const validationResult = await validateGitHubActionsExecution(workflow.content);
        
        expect(validationResult.isValid).toBe(true);
        expect(validationResult.errors).toHaveLength(0);
        
        // Should have valid workflow structure
        expect(workflow.content).toContain('name:');
        expect(workflow.content).toContain('on:');
        expect(workflow.content).toContain('jobs:');
        
        // Should use valid GitHub Actions
        expect(workflow.content).toContain('actions/checkout@v4');

        console.log(`✅ ${project.name} GitHub Actions validation:`, {
          isValid: validationResult.isValid,
          securityScore: validationResult.securityScore,
          actionVersions: validationResult.actionVersions.length
        });
      }
    });

    it('should generate workflows with proper security practices', async () => {
      const project = realWorldProjects.get('django-rest-api');
      if (!project) {
        console.warn('Django REST API project not loaded, skipping test');
        return;
      }

      const workflow = await generator.generateWorkflow(project.detectionResult, {
        workflowType: 'ci',
        securityLevel: 'enterprise',
        optimizationLevel: 'standard',
        includeComments: true
      });
      
      // Should include security best practices
      expect(workflow.content).toContain('permissions:');
      
      // Should pin action versions
      const actionMatches = workflow.content.match(/uses: .+@v?\d+/g);
      expect(actionMatches).toBeTruthy();
      if (actionMatches) {
        expect(actionMatches.length).toBeGreaterThan(0);
      }
      
      // Should include security scanning
      expect(workflow.content.toLowerCase()).toMatch(/(security|scan|audit)/);

      console.log('🔒 Security practices validation:', {
        hasPermissions: workflow.content.includes('permissions:'),
        pinnedActions: actionMatches?.length || 0,
        securityScanning: workflow.content.toLowerCase().includes('security'),
        warnings: workflow.metadata.warnings.length
      });
    });

    it('should generate workflows with appropriate caching strategies', async () => {
      const projects = Array.from(realWorldProjects.values());
      
      for (const project of projects) {
        const workflow = await generator.generateWorkflow(project.detectionResult, {
          workflowType: 'ci',
          optimizationLevel: 'aggressive',
          includeComments: true
        });

        // Should include caching for performance
        const hasCaching = workflow.content.includes('cache:') || 
                          workflow.content.includes('actions/cache') ||
                          workflow.content.includes('cache-dependency-path');
        
        if (project.detectionResult.buildTools.length > 0) {
          expect(hasCaching).toBe(true);
        }

        console.log(`⚡ ${project.name} caching validation:`, {
          hasCaching,
          buildTools: project.detectionResult.buildTools.map(bt => bt.name),
          optimizations: workflow.metadata.optimizations.filter(opt => opt.includes('cache')).length
        });
      }
    });
  });

  describe('Performance and Scalability Validation', () => {
    it('should handle large complex real-world projects efficiently', async () => {
      const project = realWorldProjects.get('fullstack-react-express');
      if (!project) {
        console.warn('Full-stack project not loaded, skipping test');
        return;
      }

      const startTime = Date.now();
      const workflows = await generator.generateCompleteWorkflowSuite(project.detectionResult);
      const endTime = Date.now();

      const generationTime = endTime - startTime;

      // Performance requirements for real-world projects
      expect(generationTime).toBeLessThan(15000); // Under 15 seconds for complex projects
      expect(workflows.length).toBeGreaterThan(0);
      
      // Should generate multiple workflow types
      const workflowTypes = new Set(workflows.map(w => w.type));
      expect(workflowTypes.size).toBeGreaterThan(1);

      // Should handle complexity gracefully
      const totalWarnings = workflows.reduce((sum, w) => sum + w.metadata.warnings.length, 0);
      expect(totalWarnings).toBeLessThan(25); // Reasonable warning count for complex projects

      console.log('⚡ Complex real-world project performance:', {
        generationTime: `${generationTime}ms`,
        workflowsGenerated: workflows.length,
        workflowTypes: Array.from(workflowTypes),
        totalWarnings,
        avgWorkflowSize: Math.round(workflows.reduce((sum, w) => sum + w.content.length, 0) / workflows.length)
      });
    });

    it('should maintain consistent performance across real-world projects', async () => {
      const projects = Array.from(realWorldProjects.values()).slice(0, 5); // Test first 5 projects
      const generationTimes: number[] = [];
      const workflowSizes: number[] = [];

      for (const project of projects) {
        const startTime = Date.now();
        const workflow = await generator.generateWorkflow(project.detectionResult);
        const endTime = Date.now();

        generationTimes.push(endTime - startTime);
        workflowSizes.push(workflow.content.length);

        // Each workflow should be valid
        expect(workflow).toBeDefined();
        expect(workflow.content).toBeTruthy();
        expect(() => yaml.load(workflow.content)).not.toThrow();
      }

      const avgTime = generationTimes.reduce((a, b) => a + b, 0) / generationTimes.length;
      const maxTime = Math.max(...generationTimes);
      const avgSize = workflowSizes.reduce((a, b) => a + b, 0) / workflowSizes.length;

      // Performance consistency requirements
      expect(avgTime).toBeLessThan(5000); // Under 5 seconds average
      expect(maxTime).toBeLessThan(10000); // Under 10 seconds maximum
      expect(avgSize).toBeGreaterThan(500); // Workflows should have reasonable content

      console.log('📊 Real-world performance consistency:', {
        projects: projects.length,
        avgTime: `${avgTime.toFixed(2)}ms`,
        maxTime: `${maxTime}ms`,
        avgSize: `${(avgSize / 1024).toFixed(2)}KB`,
        consistency: `${((1 - (maxTime - avgTime) / maxTime) * 100).toFixed(1)}%`
      });
    });
  });

  describe('Workflow Quality and Best Practices', () => {
    it('should generate workflows that follow GitHub Actions best practices', async () => {
      const projects = Array.from(realWorldProjects.values()).slice(0, 3);
      
      for (const project of projects) {
        const workflow = await generator.generateWorkflow(project.detectionResult, {
          workflowType: 'ci',
          securityLevel: 'standard',
          optimizationLevel: 'standard',
          includeComments: true
        });

        const bestPractices = comparisonUtility.validateBestPractices(workflow.content);
        
        // Should have a good best practices score
        expect(bestPractices.score).toBeGreaterThan(0.6);
        
        // Should have more good practices than critical issues
        expect(bestPractices.goodPractices.length).toBeGreaterThan(bestPractices.criticalIssues.length);

        console.log(`🏆 ${project.name} best practices:`, {
          score: `${(bestPractices.score * 100).toFixed(1)}%`,
          goodPractices: bestPractices.goodPractices.length,
          improvements: bestPractices.improvements.length,
          criticalIssues: bestPractices.criticalIssues.length
        });
      }
    });

    it('should generate workflows with appropriate complexity for project size', async () => {
      const simpleProject = realWorldProjects.get('rust-cli-tool');
      const complexProject = realWorldProjects.get('fullstack-react-express');
      
      if (!simpleProject || !complexProject) {
        console.warn('Required projects not loaded, skipping test');
        return;
      }

      const simpleWorkflow = await generator.generateWorkflow(simpleProject.detectionResult);
      const complexWorkflow = await generator.generateWorkflow(complexProject.detectionResult);

      // Complex projects should have more comprehensive workflows
      expect(complexWorkflow.content.length).toBeGreaterThan(simpleWorkflow.content.length);
      expect(complexWorkflow.metadata.optimizations.length).toBeGreaterThanOrEqual(simpleWorkflow.metadata.optimizations.length);

      // Both should be valid
      expect(() => yaml.load(simpleWorkflow.content)).not.toThrow();
      expect(() => yaml.load(complexWorkflow.content)).not.toThrow();

      console.log('📏 Workflow complexity scaling:', {
        simple: {
          size: `${(simpleWorkflow.content.length / 1024).toFixed(2)}KB`,
          optimizations: simpleWorkflow.metadata.optimizations.length
        },
        complex: {
          size: `${(complexWorkflow.content.length / 1024).toFixed(2)}KB`,
          optimizations: complexWorkflow.metadata.optimizations.length
        }
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle projects with minimal detection data gracefully', async () => {
      const minimalDetectionResult: DetectionResult = {
        frameworks: [],
        languages: [{ name: 'JavaScript', confidence: 0.5, primary: true }],
        buildTools: [],
        packageManagers: [],
        testingFrameworks: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'minimal-project',
          description: 'A project with minimal detection data'
        }
      };

      const workflow = await generator.generateWorkflow(minimalDetectionResult);

      expect(workflow).toBeDefined();
      expect(workflow.content).toBeTruthy();
      expect(workflow.metadata.warnings.length).toBeGreaterThan(0);

      // Should still generate a basic workflow
      expect(workflow.content).toContain('name:');
      expect(workflow.content).toContain('on:');
      expect(workflow.content).toContain('jobs:');

      console.log('⚠️ Minimal detection handling:', {
        workflowGenerated: true,
        warnings: workflow.metadata.warnings.length,
        workflowSize: workflow.content.length
      });
    });

    it('should handle projects with conflicting framework detections', async () => {
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
        languages: [{ name: 'JavaScript', confidence: 0.9, primary: true }],
        buildTools: [
          { name: 'webpack', configFile: 'webpack.config.js', confidence: 0.7 },
          { name: 'vite', configFile: 'vite.config.js', confidence: 0.8 }
        ],
        packageManagers: [{ name: 'npm', confidence: 0.9 }],
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

      console.log('⚠️ Conflict resolution:', {
        workflowGenerated: true,
        warnings: workflow.metadata.warnings.length,
        chosenFramework: workflow.content.includes('vite') ? 'Vite (higher confidence)' : 'Other'
      });
    });
  });
});