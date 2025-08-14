/**
 * Tests for TestingStrategyGenerator
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestingStrategyGenerator } from '../../../../src/generator/workflow-specialization/testing-strategy-generator';
import { DetectionResult, GenerationOptions } from '../../../../src/generator/interfaces';

describe('TestingStrategyGenerator', () => {
  let generator: TestingStrategyGenerator;
  let mockDetectionResult: DetectionResult;
  let mockOptions: GenerationOptions;

  beforeEach(() => {
    generator = new TestingStrategyGenerator();
    
    mockDetectionResult = {
      frameworks: [
        { name: 'React', version: '18.0.0', confidence: 0.9, evidence: ['package.json'], category: 'frontend' },
        { name: 'Express', version: '4.18.0', confidence: 0.8, evidence: ['package.json'], category: 'backend' }
      ],
      languages: [
        { name: 'JavaScript', version: '18', confidence: 0.9, primary: true },
        { name: 'TypeScript', version: '4.8', confidence: 0.8, primary: false }
      ],
      buildTools: [
        { name: 'webpack', configFile: 'webpack.config.js', confidence: 0.8 }
      ],
      packageManagers: [
        { name: 'npm', lockFile: 'package-lock.json', confidence: 0.9 }
      ],
      testingFrameworks: [
        { name: 'Jest', type: 'unit', confidence: 0.9 },
        { name: 'Playwright', type: 'e2e', confidence: 0.8 }
      ],
      deploymentTargets: [
        { platform: 'vercel', type: 'static', confidence: 0.7 }
      ],
      projectMetadata: {
        name: 'test-project',
        description: 'A test project',
        version: '1.0.0'
      }
    };

    mockOptions = {
      workflowType: 'ci',
      optimizationLevel: 'standard',
      includeComments: true,
      testingStrategy: {
        unitTests: true,
        integrationTests: true,
        e2eTests: true,
        performanceTests: false,
        securityTests: false,
        contractTests: true,
        chaosEngineering: false
      }
    };
  });

  describe('generateTestingStrategyWorkflow', () => {
    it('should generate comprehensive testing strategy workflow', async () => {
      const result = await generator.generateTestingStrategyWorkflow(mockDetectionResult, mockOptions);

      expect(result).toBeDefined();
      expect(result.filename).toBe('test-project-testing-strategy.yml');
      expect(result.type).toBe('ci');
      expect(result.content).toContain('name: Comprehensive Testing Strategy');
      expect(result.content).toContain('unit-tests');
      expect(result.content).toContain('integration-tests');
      expect(result.content).toContain('e2e-tests');
      expect(result.content).toContain('contract-tests-consumer');
      expect(result.content).toContain('contract-tests-provider');
      expect(result.metadata.optimizations).toContain('Comprehensive integration testing');
    });

    it('should include workflow dispatch inputs', async () => {
      const result = await generator.generateTestingStrategyWorkflow(mockDetectionResult, mockOptions);

      expect(result.content).toContain('workflow_dispatch');
      expect(result.content).toContain('testType');
      expect(result.content).toContain('comprehensive');
      expect(result.content).toContain('environment');
    });

    it('should set appropriate permissions', async () => {
      const result = await generator.generateTestingStrategyWorkflow(mockDetectionResult, mockOptions);

      expect(result.content).toContain('permissions:');
      expect(result.content).toContain('contents: read');
      expect(result.content).toContain('checks: write');
      expect(result.content).toContain('pullRequests: write');
    });
  });

  describe('generateIntegrationTestingWorkflow', () => {
    it('should generate integration testing workflow with services', async () => {
      // Add database framework to trigger service generation
      mockDetectionResult.frameworks.push({
        name: 'Sequelize',
        version: '6.0.0',
        confidence: 0.8,
        evidence: ['package.json'],
        category: 'backend'
      });

      const result = await generator.generateIntegrationTestingWorkflow(mockDetectionResult, mockOptions);

      expect(result).toBeDefined();
      expect(result.filename).toBe('test-project-integration-testing.yml');
      expect(result.type).toBe('ci');
      expect(result.content).toContain('name: Integration Testing');
      expect(result.content).toContain('Run database migrations');
      expect(result.content).toContain('npx sequelize-cli db:migrate');
      expect(result.content).toContain('Setup test containers');
      expect(result.content).toContain('Run database migrations');
    });

    it('should include service readiness checks', async () => {
      mockDetectionResult.frameworks.push({
        name: 'Redis',
        version: '6.0.0',
        confidence: 0.8,
        evidence: ['package.json'],
        category: 'backend'
      });

      const result = await generator.generateIntegrationTestingWorkflow(mockDetectionResult, mockOptions);

      expect(result.content).toContain('Wait for services to be ready');
      expect(result.content).toContain('redis-cli');
    });
  });

  describe('generateE2ETestingWorkflow', () => {
    it('should generate E2E testing workflow for web applications', async () => {
      const result = await generator.generateE2ETestingWorkflow(mockDetectionResult, mockOptions);

      expect(result).toBeDefined();
      expect(result.filename).toBe('test-project-e2e-testing.yml');
      expect(result.type).toBe('ci');
      expect(result.content).toContain('name: End-to-End Testing');
      expect(result.content).toContain('strategy:');
      expect(result.content).toContain('matrix:');
      expect(result.content).toContain('browser:');
      expect(result.content).toContain('chromium');
    });

    it('should throw error for non-web applications', async () => {
      // Remove web frameworks
      mockDetectionResult.frameworks = mockDetectionResult.frameworks.filter(
        f => !['React', 'Express'].includes(f.name)
      );

      await expect(
        generator.generateE2ETestingWorkflow(mockDetectionResult, mockOptions)
      ).rejects.toThrow('E2E testing workflow requires a web application framework');
    });

    it('should generate Playwright-specific steps when detected', async () => {
      const result = await generator.generateE2ETestingWorkflow(mockDetectionResult, mockOptions);

      expect(result.content).toContain('Install Playwright browsers');
      expect(result.content).toContain('npx playwright test');
    });

    it('should include cross-browser testing for frontend frameworks', async () => {
      const result = await generator.generateE2ETestingWorkflow(mockDetectionResult, mockOptions);

      expect(result.content).toContain('firefox');
      expect(result.content).toContain('webkit');
    });
  });

  describe('generateContractTestingWorkflow', () => {
    it('should generate contract testing workflow with consumer and provider jobs', async () => {
      const result = await generator.generateContractTestingWorkflow(mockDetectionResult, mockOptions);

      expect(result).toBeDefined();
      expect(result.filename).toBe('test-project-contract-testing.yml');
      expect(result.type).toBe('ci');
      expect(result.content).toContain('name: Contract Testing');
      expect(result.content).toContain('contract-tests-consumer');
      expect(result.content).toContain('contract-tests-provider');
      expect(result.content).toContain('needs:');
      expect(result.content).toContain('- contract-tests-consumer');
    });

    it('should include Pact broker configuration', async () => {
      const result = await generator.generateContractTestingWorkflow(mockDetectionResult, mockOptions);

      expect(result.content).toContain('PACT_BROKER_BASE_URL');
      expect(result.content).toContain('PACT_BROKER_TOKEN');
      expect(result.content).toContain('secrets.PACT_BROKER_URL');
    });
  });

  describe('generateChaosEngineeringWorkflow', () => {
    it('should generate chaos engineering workflow', async () => {
      const result = await generator.generateChaosEngineeringWorkflow(mockDetectionResult, mockOptions);

      expect(result).toBeDefined();
      expect(result.filename).toBe('test-project-chaos-engineering.yml');
      expect(result.type).toBe('ci');
      expect(result.content).toContain('name: Chaos Engineering');
      expect(result.content).toContain('chaos-experiments');
      expect(result.content).toContain('chaosType');
      expect(result.content).toContain('network');
      expect(result.content).toContain('resource');
      expect(result.content).toContain('timeout');
    });

    it('should include different types of chaos experiments', async () => {
      const result = await generator.generateChaosEngineeringWorkflow(mockDetectionResult, mockOptions);

      expect(result.content).toContain('Run network chaos experiments');
      expect(result.content).toContain('Run resource chaos experiments');
      expect(result.content).toContain('Run timeout chaos experiments');
    });

    it('should set continue-on-error for chaos experiments', async () => {
      const result = await generator.generateChaosEngineeringWorkflow(mockDetectionResult, mockOptions);

      expect(result.content).toContain('continue-on-error: true');
    });
  });

  describe('generateTestDataManagementWorkflow', () => {
    it('should generate test data management workflow', async () => {
      const result = await generator.generateTestDataManagementWorkflow(mockDetectionResult, mockOptions);

      expect(result).toBeDefined();
      expect(result.filename).toBe('test-project-test-data-management.yml');
      expect(result.type).toBe('ci');
      expect(result.content).toContain('name: Test Data Management');
      expect(result.content).toContain('test-data-management');
      expect(result.content).toContain('action');
      expect(result.content).toContain('provision');
      expect(result.content).toContain('cleanup');
      expect(result.content).toContain('anonymize');
    });

    it('should include database setup for data management', async () => {
      mockDetectionResult.frameworks.push({
        name: 'Sequelize',
        version: '6.0.0',
        confidence: 0.8,
        evidence: ['package.json'],
        category: 'backend'
      });

      const result = await generator.generateTestDataManagementWorkflow(mockDetectionResult, mockOptions);

      expect(result.content).toContain('Setup test database');
      expect(result.content).toContain('postgres:13');
    });

    it('should include data validation and anonymization steps', async () => {
      const result = await generator.generateTestDataManagementWorkflow(mockDetectionResult, mockOptions);

      expect(result.content).toContain('Anonymize sensitive data');
      expect(result.content).toContain('Generate synthetic test data');
      expect(result.content).toContain('Validate test data integrity');
    });
  });

  describe('framework detection methods', () => {
    it('should detect web frameworks correctly', async () => {
      const result = await generator.generateE2ETestingWorkflow(mockDetectionResult, mockOptions);
      expect(result).toBeDefined(); // Should not throw error
    });

    it('should detect database frameworks', async () => {
      mockDetectionResult.frameworks.push({
        name: 'Prisma',
        version: '4.0.0',
        confidence: 0.9,
        evidence: ['package.json'],
        category: 'backend'
      });

      const result = await generator.generateIntegrationTestingWorkflow(mockDetectionResult, mockOptions);
      expect(result.content).toContain('Run database migrations');
      expect(result.content).toContain('npx prisma migrate deploy');
    });

    it('should detect caching frameworks', async () => {
      mockDetectionResult.frameworks.push({
        name: 'Redis',
        version: '6.0.0',
        confidence: 0.8,
        evidence: ['package.json'],
        category: 'backend'
      });

      const result = await generator.generateIntegrationTestingWorkflow(mockDetectionResult, mockOptions);
      expect(result.content).toContain('redis:');
    });
  });

  describe('command generation', () => {
    it('should generate correct install commands for different package managers', async () => {
      // Test npm
      mockDetectionResult.packageManagers = [{ name: 'npm', lockFile: 'package-lock.json', confidence: 0.9 }];
      let result = await generator.generateIntegrationTestingWorkflow(mockDetectionResult, mockOptions);
      expect(result.content).toContain('npm ci');

      // Test yarn
      mockDetectionResult.packageManagers = [{ name: 'yarn', lockFile: 'yarn.lock', confidence: 0.9 }];
      result = await generator.generateIntegrationTestingWorkflow(mockDetectionResult, mockOptions);
      expect(result.content).toContain('yarn install --frozen-lockfile');

      // Test pnpm
      mockDetectionResult.packageManagers = [{ name: 'pnpm', lockFile: 'pnpm-lock.yaml', confidence: 0.9 }];
      result = await generator.generateIntegrationTestingWorkflow(mockDetectionResult, mockOptions);
      expect(result.content).toContain('pnpm install --frozen-lockfile');
    });

    it('should generate correct test commands for different languages', async () => {
      // Test JavaScript/TypeScript
      const result = await generator.generateIntegrationTestingWorkflow(mockDetectionResult, mockOptions);
      expect(result.content).toContain('npm run test:integration');

      // Test Python
      mockDetectionResult.languages = [{ name: 'Python', version: '3.9', confidence: 0.9, primary: true }];
      const pythonResult = await generator.generateIntegrationTestingWorkflow(mockDetectionResult, mockOptions);
      expect(pythonResult.content).toContain('python -m pytest tests/integration/');
    });

    it('should generate correct application start commands', async () => {
      const result = await generator.generateE2ETestingWorkflow(mockDetectionResult, mockOptions);
      expect(result.content).toContain('npm start &');
    });
  });

  describe('error handling', () => {
    it('should handle missing detection results gracefully', async () => {
      const emptyDetectionResult: DetectionResult = {
        frameworks: [],
        languages: [],
        buildTools: [],
        packageManagers: [],
        testingFrameworks: [],
        deploymentTargets: [],
        projectMetadata: { name: 'empty-project' }
      };

      const result = await generator.generateTestingStrategyWorkflow(emptyDetectionResult, mockOptions);
      expect(result).toBeDefined();
      expect(result.content).toContain('echo "No package manager detected"');
    });

    it('should throw error for invalid workflow generation', async () => {
      // Create invalid detection result that will cause an error
      const invalidDetectionResult = null as any;

      await expect(
        generator.generateTestingStrategyWorkflow(invalidDetectionResult, mockOptions)
      ).rejects.toThrow();
    });
  });

  describe('configuration building', () => {
    it('should build testing configuration based on options', async () => {
      const result = await generator.generateTestingStrategyWorkflow(mockDetectionResult, mockOptions);

      expect(result.metadata.optimizations).toContain('Comprehensive integration testing');
      expect(result.metadata.optimizations).toContain('End-to-end browser automation');
      expect(result.metadata.optimizations).toContain('Consumer-driven contract testing');
    });

    it('should generate warnings for configuration issues', async () => {
      // Enable E2E testing for non-web framework
      mockDetectionResult.frameworks = [];
      mockOptions.testingStrategy!.e2eTests = true;

      const result = await generator.generateTestingStrategyWorkflow(mockDetectionResult, mockOptions);
      expect(result.metadata.warnings).toContain('E2E testing enabled but no web framework detected');
    });
  });

  describe('matrix strategy generation', () => {
    it('should generate browser matrix for E2E testing', async () => {
      const result = await generator.generateE2ETestingWorkflow(mockDetectionResult, mockOptions);

      expect(result.content).toContain('strategy:');
      expect(result.content).toContain('matrix:');
      expect(result.content).toContain('browser:');
      expect(result.content).toContain('fail-fast: false');
    });

    it('should include multiple browsers for frontend frameworks', async () => {
      const result = await generator.generateE2ETestingWorkflow(mockDetectionResult, mockOptions);

      expect(result.content).toContain('chromium');
      expect(result.content).toContain('firefox');
      expect(result.content).toContain('webkit');
    });
  });
});