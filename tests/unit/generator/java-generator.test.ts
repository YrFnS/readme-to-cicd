import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JavaWorkflowGenerator } from '../../../src/generator/templates/java-generator';
import { DetectionResult } from '../../../src/generator/interfaces';
import { TemplateManager } from '../../../src/generator/templates/template-manager';

describe('JavaWorkflowGenerator', () => {
  let generator: JavaWorkflowGenerator;
  let mockTemplateManager: TemplateManager;

  beforeEach(() => {
    mockTemplateManager = {
      compileTemplate: vi.fn().mockResolvedValue({
        template: {
          name: 'Test Workflow',
          triggers: { push: { branches: ['main'] } },
          jobs: [{
            name: 'test',
            runsOn: 'ubuntu-latest',
            strategy: {
              matrix: {
                'java-version': ['{{jdkVersions}}']
              }
            },
            steps: [
              { name: 'Checkout', uses: 'actions/checkout@v4' },
              { name: 'Setup JDK', uses: 'actions/setup-java@v4', with: { 'java-version': '{{jdkVersion}}' } },
              { name: 'Build', run: '{{buildCommand}}' },
              { name: 'Test', run: '{{testCommand}}' }
            ]
          }]
        },
        errors: [],
        warnings: []
      })
    } as any;
    
    generator = new JavaWorkflowGenerator(mockTemplateManager);
  });

  describe('Spring Boot Maven workflow generation', () => {
    it('should generate Spring Boot Maven workflow with JDK matrix', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Java', version: '17', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'spring-boot', confidence: 0.9, evidence: ['pom.xml', 'Application.java'], category: 'backend' }],
        buildTools: [{ name: 'maven', configFile: 'pom.xml', confidence: 0.9 }],
        packageManagers: [{ name: 'maven', lockFile: 'pom.xml', confidence: 0.9 }],
        testingFrameworks: [{ name: 'junit', type: 'unit', confidence: 0.8 }],
        deploymentTargets: [],
        projectMetadata: { name: 'spring-boot-app' }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.filename).toBe('spring-boot-maven-ci.yml');
      expect(result.content).toContain('java-version');
      expect(result.content).toContain('mvn'); // Maven commands should be present
      expect(result.metadata.detectionSummary).toContain('spring-boot');
      expect(result.metadata.detectionSummary).toContain('maven');
    });

    it('should include Spring Boot specific optimizations', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Java', version: '17', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'spring-boot', confidence: 0.9, evidence: ['pom.xml'], category: 'backend' }],
        buildTools: [
          { name: 'maven', configFile: 'pom.xml', confidence: 0.9 },
          { name: 'jacoco', configFile: 'jacoco.xml', confidence: 0.7 }
        ],
        packageManagers: [{ name: 'maven', lockFile: 'pom.xml', confidence: 0.9 }],
        testingFrameworks: [{ name: 'junit', type: 'unit', confidence: 0.8 }],
        deploymentTargets: [],
        projectMetadata: { name: 'spring-boot-app' }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.metadata.optimizations).toContain('Spring Boot optimizations and health checks');
      expect(result.metadata.optimizations).toContain('maven dependency caching enabled');
    });
  });

  describe('Spring Boot Gradle workflow generation', () => {
    it('should generate Spring Boot Gradle workflow with wrapper support', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Java', version: '11', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'spring-boot', confidence: 0.9, evidence: ['build.gradle'], category: 'backend' }],
        buildTools: [
          { name: 'gradle', configFile: 'build.gradle', confidence: 0.9 },
          { name: 'gradle-wrapper', configFile: 'gradlew', confidence: 0.8 }
        ],
        packageManagers: [{ name: 'gradle', lockFile: 'build.gradle', confidence: 0.9 }],
        testingFrameworks: [{ name: 'junit', type: 'unit', confidence: 0.8 }],
        deploymentTargets: [],
        projectMetadata: { name: 'spring-boot-gradle-app' }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.filename).toBe('spring-boot-gradle-ci.yml');
      expect(result.content).toContain('gradle');
      expect(result.metadata.optimizations).toContain('Build tool wrapper for consistent builds');
      expect(result.metadata.optimizations).toContain('Gradle build cache and daemon optimizations');
    });
  });

  describe('Plain Java Maven workflow generation', () => {
    it('should generate plain Java Maven workflow', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Java', version: '11', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'java', confidence: 0.8, evidence: ['pom.xml'], category: 'backend' }],
        buildTools: [{ name: 'maven', configFile: 'pom.xml', confidence: 0.9 }],
        packageManagers: [{ name: 'maven', lockFile: 'pom.xml', confidence: 0.9 }],
        testingFrameworks: [{ name: 'junit', type: 'unit', confidence: 0.8 }],
        deploymentTargets: [],
        projectMetadata: { name: 'java-app' }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.filename).toBe('java-maven-ci.yml');
      expect(result.content).toContain('mvn'); // Maven commands should be present
      expect(result.metadata.detectionSummary).toContain('java');
      expect(result.metadata.detectionSummary).toContain('maven');
    });
  });

  describe('Plain Java Gradle workflow generation', () => {
    it('should generate plain Java Gradle workflow', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Java', version: '8', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'java', confidence: 0.8, evidence: ['build.gradle'], category: 'backend' }],
        buildTools: [{ name: 'gradle', configFile: 'build.gradle', confidence: 0.9 }],
        packageManagers: [{ name: 'gradle', lockFile: 'build.gradle', confidence: 0.9 }],
        testingFrameworks: [{ name: 'junit', type: 'unit', confidence: 0.8 }],
        deploymentTargets: [],
        projectMetadata: { name: 'java-gradle-app' }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.filename).toBe('java-gradle-ci.yml');
      expect(result.content).toContain('gradle');
      expect(result.metadata.detectionSummary).toContain('java');
      expect(result.metadata.detectionSummary).toContain('gradle');
    });
  });

  describe('JDK version matrix generation', () => {
    it('should generate basic matrix for basic optimization level', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Java', version: '17', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'java', confidence: 0.8, evidence: ['pom.xml'], category: 'backend' }],
        buildTools: [{ name: 'maven', configFile: 'pom.xml', confidence: 0.9 }],
        packageManagers: [{ name: 'maven', lockFile: 'pom.xml', confidence: 0.9 }],
        testingFrameworks: [],
        deploymentTargets: [],
        projectMetadata: { name: 'java-app' }
      };

      const result = await generator.generateWorkflow(detectionResult, { 
        optimizationLevel: 'basic',
        workflowType: 'ci',
        includeComments: true,
        securityLevel: 'standard'
      });

      expect(result.content).toContain('matrix');
      expect(result.metadata.optimizations).toContain('Matrix strategy for multiple JDK versions');
    });

    it('should generate aggressive matrix for aggressive optimization level', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Java', version: '11', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'spring-boot', confidence: 0.9, evidence: ['pom.xml'], category: 'backend' }],
        buildTools: [{ name: 'maven', configFile: 'pom.xml', confidence: 0.9 }],
        packageManagers: [{ name: 'maven', lockFile: 'pom.xml', confidence: 0.9 }],
        testingFrameworks: [],
        deploymentTargets: [],
        projectMetadata: { name: 'spring-boot-app' }
      };

      const result = await generator.generateWorkflow(detectionResult, { 
        optimizationLevel: 'aggressive',
        workflowType: 'ci',
        includeComments: true,
        securityLevel: 'standard'
      });

      expect(result.content).toContain('matrix');
      expect(result.metadata.optimizations).toContain('Matrix strategy for multiple JDK versions');
    });
  });

  describe('Code quality tools integration', () => {
    it('should include Checkstyle and PMD when detected', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Java', version: '11', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'java', confidence: 0.8, evidence: ['pom.xml'], category: 'backend' }],
        buildTools: [
          { name: 'maven', configFile: 'pom.xml', confidence: 0.9 },
          { name: 'checkstyle', configFile: 'checkstyle.xml', confidence: 0.8 },
          { name: 'pmd', configFile: 'pmd.xml', confidence: 0.7 }
        ],
        packageManagers: [{ name: 'maven', lockFile: 'pom.xml', confidence: 0.9 }],
        testingFrameworks: [],
        deploymentTargets: [],
        projectMetadata: { name: 'java-app' }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.metadata.optimizations).toContain('Code quality checks with static analysis tools');
    });

    it('should include SpotBugs when detected', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Java', version: '11', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'java', confidence: 0.8, evidence: ['pom.xml'], category: 'backend' }],
        buildTools: [
          { name: 'maven', configFile: 'pom.xml', confidence: 0.9 },
          { name: 'spotbugs', configFile: 'spotbugs.xml', confidence: 0.8 }
        ],
        packageManagers: [{ name: 'maven', lockFile: 'pom.xml', confidence: 0.9 }],
        testingFrameworks: [],
        deploymentTargets: [],
        projectMetadata: { name: 'java-app' }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.metadata.optimizations).toContain('Bug detection with SpotBugs included');
    });

    it('should include JaCoCo coverage when detected', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Java', version: '11', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'java', confidence: 0.8, evidence: ['pom.xml'], category: 'backend' }],
        buildTools: [
          { name: 'maven', configFile: 'pom.xml', confidence: 0.9 },
          { name: 'jacoco', configFile: 'jacoco.xml', confidence: 0.8 }
        ],
        packageManagers: [{ name: 'maven', lockFile: 'pom.xml', confidence: 0.9 }],
        testingFrameworks: [],
        deploymentTargets: [],
        projectMetadata: { name: 'java-app' }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.metadata.optimizations).toContain('Code coverage with JaCoCo enabled');
    });
  });

  describe('Testing framework support', () => {
    it('should support JUnit testing framework', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Java', version: '11', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'java', confidence: 0.8, evidence: ['pom.xml'], category: 'backend' }],
        buildTools: [{ name: 'maven', configFile: 'pom.xml', confidence: 0.9 }],
        packageManagers: [{ name: 'maven', lockFile: 'pom.xml', confidence: 0.9 }],
        testingFrameworks: [{ name: 'junit', type: 'unit', confidence: 0.9 }],
        deploymentTargets: [],
        projectMetadata: { name: 'java-app' }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.content).toContain('test');
      expect(result.filename).toBe('java-maven-ci.yml');
    });

    it('should support TestNG testing framework', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Java', version: '11', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'java', confidence: 0.8, evidence: ['pom.xml'], category: 'backend' }],
        buildTools: [{ name: 'maven', configFile: 'pom.xml', confidence: 0.9 }],
        packageManagers: [{ name: 'maven', lockFile: 'pom.xml', confidence: 0.9 }],
        testingFrameworks: [{ name: 'testng', type: 'unit', confidence: 0.9 }],
        deploymentTargets: [],
        projectMetadata: { name: 'java-app' }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.content).toContain('test');
      expect(result.filename).toBe('java-maven-ci.yml');
    });
  });

  describe('Micronaut framework support', () => {
    it('should generate Micronaut workflow with framework-specific settings', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Java', version: '17', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'micronaut', confidence: 0.9, evidence: ['micronaut-cli.yml'], category: 'backend' }],
        buildTools: [{ name: 'maven', configFile: 'pom.xml', confidence: 0.9 }],
        packageManagers: [{ name: 'maven', lockFile: 'pom.xml', confidence: 0.9 }],
        testingFrameworks: [{ name: 'junit', type: 'unit', confidence: 0.8 }],
        deploymentTargets: [],
        projectMetadata: { name: 'micronaut-app' }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.filename).toBe('micronaut-maven-ci.yml');
      expect(result.metadata.detectionSummary).toContain('micronaut');
    });
  });

  describe('Quarkus framework support', () => {
    it('should generate Quarkus workflow with native compilation option', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Java', version: '17', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'quarkus', confidence: 0.9, evidence: ['quarkus.properties'], category: 'backend' }],
        buildTools: [{ name: 'maven', configFile: 'pom.xml', confidence: 0.9 }],
        packageManagers: [{ name: 'maven', lockFile: 'pom.xml', confidence: 0.9 }],
        testingFrameworks: [{ name: 'junit', type: 'unit', confidence: 0.8 }],
        deploymentTargets: [],
        projectMetadata: { name: 'quarkus-app' }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.filename).toBe('quarkus-maven-ci.yml');
      expect(result.metadata.detectionSummary).toContain('quarkus');
    });
  });

  describe('Error handling', () => {
    it('should throw error when no Java language detected', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Python', version: '3.9', confidence: 0.9, primary: true }],
        frameworks: [],
        buildTools: [],
        packageManagers: [],
        testingFrameworks: [],
        deploymentTargets: [],
        projectMetadata: { name: 'python-app' }
      };

      await expect(generator.generateWorkflow(detectionResult))
        .rejects.toThrow('No Java framework detected in detection results');
    });

    it('should handle missing build tool gracefully', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Java', version: '11', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'java', confidence: 0.8, evidence: [], category: 'backend' }],
        buildTools: [],
        packageManagers: [],
        testingFrameworks: [],
        deploymentTargets: [],
        projectMetadata: { name: 'java-app' }
      };

      const result = await generator.generateWorkflow(detectionResult);

      // Should default to Maven
      expect(result.filename).toBe('java-maven-ci.yml');
      expect(result.metadata.detectionSummary).toContain('maven');
    });
  });

  describe('Build tool preference', () => {
    it('should prefer Gradle when both Maven and Gradle are detected', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Java', version: '11', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'java', confidence: 0.8, evidence: ['pom.xml', 'build.gradle'], category: 'backend' }],
        buildTools: [
          { name: 'maven', configFile: 'pom.xml', confidence: 0.8 },
          { name: 'gradle', configFile: 'build.gradle', confidence: 0.9 }
        ],
        packageManagers: [
          { name: 'maven', lockFile: 'pom.xml', confidence: 0.8 },
          { name: 'gradle', lockFile: 'build.gradle', confidence: 0.9 }
        ],
        testingFrameworks: [],
        deploymentTargets: [],
        projectMetadata: { name: 'java-app' }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.filename).toBe('java-gradle-ci.yml');
      expect(result.metadata.detectionSummary).toContain('gradle');
    });
  });
});