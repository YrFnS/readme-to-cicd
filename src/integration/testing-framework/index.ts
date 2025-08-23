/**
 * Testing Framework - Main exports
 */

// Core framework
export { ComprehensiveTestingFramework } from './testing-framework.js';

// Test suite implementations
export { UnitTestSuiteImpl, UnitTestUtils } from './unit-test-suite.js';
export { IntegrationTestSuiteImpl } from './integration-test-suite.js';
export { E2ETestSuiteImpl } from './e2e-test-suite.js';
export { PerformanceTestSuiteImpl } from './performance-test-suite.js';
export { ChaosTestSuiteImpl } from './chaos-test-suite.js';
export { ContractTestSuiteImpl } from './contract-test-suite.js';
export { RegressionTestSuiteImpl } from './regression-test-suite.js';
export { SecurityTestSuiteImpl } from './security-test-suite.js';

// Supporting services
export { TestDataManagerImpl } from './test-data-manager.js';
export { TestMonitoringImpl } from './test-monitoring.js';

// Types and interfaces
export * from './types.js';
export * from './interfaces.js';

/**
 * Factory function to create a fully configured testing framework
 */
export function createTestingFramework(): ComprehensiveTestingFramework {
  // Create test suite implementations
  const unitTestSuite = new UnitTestSuiteImpl('Unit Tests');
  const integrationTestSuite = new IntegrationTestSuiteImpl('Integration Tests', []);
  const e2eTestSuite = new E2ETestSuiteImpl('E2E Tests');
  const performanceTestSuite = new PerformanceTestSuiteImpl('Performance Tests');
  const chaosTestSuite = new ChaosTestSuiteImpl('Chaos Tests');
  const contractTestSuite = new ContractTestSuiteImpl('Contract Tests');
  const regressionTestSuite = new RegressionTestSuiteImpl('Regression Tests');
  const securityTestSuite = new SecurityTestSuiteImpl('Security Tests');
  
  // Create supporting services
  const testDataManager = new TestDataManagerImpl();
  const testMonitoring = new TestMonitoringImpl();
  
  // Create and return the comprehensive testing framework
  return new ComprehensiveTestingFramework(
    unitTestSuite,
    integrationTestSuite,
    e2eTestSuite,
    performanceTestSuite,
    chaosTestSuite,
    contractTestSuite,
    regressionTestSuite,
    securityTestSuite,
    testDataManager,
    testMonitoring
  );
}

/**
 * Default testing framework instance
 */
export const testingFramework = createTestingFramework();

/**
 * Utility functions for test creation
 */
export class TestUtils {
  /**
   * Create a simple unit test case
   */
  static createUnitTest(
    id: string,
    name: string,
    testFunction: () => Promise<void> | void
  ) {
    return {
      id,
      name,
      description: `Unit test: ${name}`,
      tags: ['unit'],
      severity: 'medium' as const,
      execute: async () => {
        try {
          await testFunction();
          return {
            id: `${id}-${Date.now()}`,
            name,
            type: 'unit' as const,
            status: 'passed' as const,
            duration: 0,
            startTime: new Date(),
            endTime: new Date(),
            artifacts: []
          };
        } catch (error) {
          return {
            id: `${id}-${Date.now()}`,
            name,
            type: 'unit' as const,
            status: 'failed' as const,
            duration: 0,
            startTime: new Date(),
            endTime: new Date(),
            error: error as Error,
            artifacts: []
          };
        }
      }
    };
  }

  /**
   * Create a performance test case
   */
  static createPerformanceTest(
    id: string,
    name: string,
    config: {
      targetUrl: string;
      concurrentUsers: number;
      duration: number;
      thresholds: Array<{
        metric: string;
        operator: '<' | '>' | '<=' | '>=' | '=';
        value: number;
      }>;
    }
  ) {
    return {
      id,
      name,
      description: `Performance test: ${name}`,
      tags: ['performance'],
      severity: 'high' as const,
      execute: async () => {
        const framework = createTestingFramework();
        return await framework.performanceTestSuite.executeLoadTest({
          targetUrl: config.targetUrl,
          concurrentUsers: config.concurrentUsers,
          duration: config.duration,
          rampUpTime: 30000, // 30 seconds
          thresholds: config.thresholds.map(t => ({
            metric: t.metric,
            operator: t.operator,
            value: t.value,
            severity: 'error' as const
          }))
        });
      }
    };
  }

  /**
   * Create an integration test case
   */
  static createIntegrationTest(
    id: string,
    name: string,
    components: string[],
    testFunction: () => Promise<void> | void
  ) {
    return {
      id,
      name,
      description: `Integration test: ${name}`,
      tags: ['integration'],
      severity: 'high' as const,
      execute: async () => {
        try {
          await testFunction();
          return {
            id: `${id}-${Date.now()}`,
            name,
            type: 'integration' as const,
            status: 'passed' as const,
            duration: 0,
            startTime: new Date(),
            endTime: new Date(),
            artifacts: []
          };
        } catch (error) {
          return {
            id: `${id}-${Date.now()}`,
            name,
            type: 'integration' as const,
            status: 'failed' as const,
            duration: 0,
            startTime: new Date(),
            endTime: new Date(),
            error: error as Error,
            artifacts: []
          };
        }
      }
    };
  }

  /**
   * Create a security test case
   */
  static createSecurityTest(
    id: string,
    name: string,
    target: string,
    testType: 'vulnerability' | 'authentication' | 'authorization' | 'input-validation'
  ) {
    return {
      id,
      name,
      description: `Security test: ${name}`,
      tags: ['security'],
      severity: 'critical' as const,
      execute: async () => {
        const framework = createTestingFramework();
        
        switch (testType) {
          case 'vulnerability':
            return await framework.securityTestSuite.scanForVulnerabilities(target);
          case 'authentication':
            return await framework.securityTestSuite.testAuthentication(target);
          case 'authorization':
            return await framework.securityTestSuite.testAuthorization(target, ['user', 'admin']);
          case 'input-validation':
            return await framework.securityTestSuite.testInputValidation(target, [
              '<script>alert("xss")</script>',
              "'; DROP TABLE users; --",
              '../../../etc/passwd'
            ]);
          default:
            throw new Error(`Unknown security test type: ${testType}`);
        }
      }
    };
  }
}

/**
 * Test suite builder for fluent API
 */
export class TestSuiteBuilder {
  private suite: any = {
    id: '',
    name: '',
    type: 'unit',
    tests: [],
    setup: undefined,
    teardown: undefined,
    timeout: 30000
  };

  static create(id: string, name: string) {
    const builder = new TestSuiteBuilder();
    builder.suite.id = id;
    builder.suite.name = name;
    return builder;
  }

  withType(type: 'unit' | 'integration' | 'e2e' | 'performance' | 'chaos' | 'contract' | 'regression' | 'security') {
    this.suite.type = type;
    return this;
  }

  withSetup(setupFn: () => Promise<void> | void) {
    this.suite.setup = setupFn;
    return this;
  }

  withTeardown(teardownFn: () => Promise<void> | void) {
    this.suite.teardown = teardownFn;
    return this;
  }

  withTimeout(timeout: number) {
    this.suite.timeout = timeout;
    return this;
  }

  addTest(test: any) {
    this.suite.tests.push(test);
    return this;
  }

  addTests(tests: any[]) {
    this.suite.tests.push(...tests);
    return this;
  }

  build() {
    return this.suite;
  }
}

/**
 * Example usage and test templates
 */
export const TestTemplates = {
  /**
   * Create a basic unit test suite
   */
  createUnitTestSuite: (name: string) => {
    return TestSuiteBuilder
      .create(`unit-${Date.now()}`, name)
      .withType('unit')
      .withSetup(async () => {
        // Setup test environment
      })
      .withTeardown(async () => {
        // Cleanup test environment
      })
      .build();
  },

  /**
   * Create a performance test suite
   */
  createPerformanceTestSuite: (name: string, baseUrl: string) => {
    return TestSuiteBuilder
      .create(`perf-${Date.now()}`, name)
      .withType('performance')
      .addTest(TestUtils.createPerformanceTest(
        'load-test-1',
        'Basic Load Test',
        {
          targetUrl: baseUrl,
          concurrentUsers: 10,
          duration: 60000,
          thresholds: [
            { metric: 'responseTime', operator: '<', value: 1000 },
            { metric: 'errorRate', operator: '<', value: 0.05 }
          ]
        }
      ))
      .build();
  },

  /**
   * Create a security test suite
   */
  createSecurityTestSuite: (name: string, target: string) => {
    return TestSuiteBuilder
      .create(`security-${Date.now()}`, name)
      .withType('security')
      .addTests([
        TestUtils.createSecurityTest('vuln-scan', 'Vulnerability Scan', target, 'vulnerability'),
        TestUtils.createSecurityTest('auth-test', 'Authentication Test', target, 'authentication'),
        TestUtils.createSecurityTest('authz-test', 'Authorization Test', target, 'authorization'),
        TestUtils.createSecurityTest('input-val', 'Input Validation Test', target, 'input-validation')
      ])
      .build();
  }
};