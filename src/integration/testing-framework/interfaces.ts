/**
 * Core interfaces for the comprehensive testing framework
 */

import {
  TestResult,
  TestSuite,
  TestCase,
  TestEnvironment,
  TestReport,
  TestType,
  PerformanceMetrics,
  TestArtifact
} from './types.js';

/**
 * Main testing framework interface
 */
export interface TestingFramework {
  // Core testing capabilities
  executeTest(testCase: TestCase): Promise<TestResult>;
  executeSuite(testSuite: TestSuite): Promise<TestResult[]>;
  
  // Environment management
  createEnvironment(config: TestEnvironment): Promise<string>;
  destroyEnvironment(environmentId: string): Promise<void>;
  
  // Reporting and analytics
  generateReport(results: TestResult[]): Promise<TestReport>;
  getTestHistory(testId: string): Promise<TestResult[]>;
  
  // Test management
  registerSuite(suite: TestSuite): Promise<void>;
  unregisterSuite(suiteId: string): Promise<void>;
  listSuites(): Promise<TestSuite[]>;
}

/**
 * Unit testing framework interface
 */
export interface UnitTestSuite {
  name: string;
  setup(): Promise<void>;
  teardown(): Promise<void>;
  runTests(): Promise<TestResult[]>;
  
  // Test registration
  addTest(test: TestCase): void;
  removeTest(testId: string): void;
  
  // Mocking and stubbing
  createMock<T>(target: T): T;
  createStub<T>(target: T): T;
  resetMocks(): void;
}

/**
 * Integration testing framework interface
 */
export interface IntegrationTestSuite {
  name: string;
  components: string[];
  
  // Component interaction testing
  testComponentInteraction(source: string, target: string): Promise<TestResult>;
  testDataFlow(workflow: string[]): Promise<TestResult>;
  testErrorPropagation(errorScenario: string): Promise<TestResult>;
  
  // API contract testing
  validateAPIContract(apiSpec: string, endpoint: string): Promise<TestResult>;
  testBackwardCompatibility(oldVersion: string, newVersion: string): Promise<TestResult>;
}

/**
 * End-to-end testing framework interface
 */
export interface E2ETestSuite {
  name: string;
  scenarios: E2EScenario[];
  
  // Workflow testing
  executeScenario(scenario: E2EScenario): Promise<TestResult>;
  testUserJourney(journey: UserJourney): Promise<TestResult>;
  
  // Browser automation
  navigateToPage(url: string): Promise<void>;
  interactWithElement(selector: string, action: string): Promise<void>;
  captureScreenshot(name: string): Promise<TestArtifact>;
}

export interface E2EScenario {
  id: string;
  name: string;
  steps: E2EStep[];
  expectedOutcome: string;
}

export interface E2EStep {
  action: string;
  target?: string;
  data?: any;
  validation?: string;
}

export interface UserJourney {
  id: string;
  name: string;
  persona: string;
  scenarios: E2EScenario[];
}

/**
 * Performance testing framework interface
 */
export interface PerformanceTestSuite {
  name: string;
  
  // Load testing
  executeLoadTest(config: LoadTestConfig): Promise<TestResult>;
  executeStressTest(config: StressTestConfig): Promise<TestResult>;
  executeVolumeTest(config: VolumeTestConfig): Promise<TestResult>;
  
  // Scalability testing
  testHorizontalScaling(config: ScalingTestConfig): Promise<TestResult>;
  testVerticalScaling(config: ScalingTestConfig): Promise<TestResult>;
  
  // Performance monitoring
  collectMetrics(duration: number): Promise<PerformanceMetrics>;
  generatePerformanceReport(results: TestResult[]): Promise<TestReport>;
}

export interface LoadTestConfig {
  targetUrl: string;
  concurrentUsers: number;
  duration: number;
  rampUpTime: number;
  thresholds: PerformanceThreshold[];
}

export interface StressTestConfig {
  targetUrl: string;
  maxUsers: number;
  incrementStep: number;
  incrementInterval: number;
  breakingPoint?: number;
}

export interface VolumeTestConfig {
  dataSize: number;
  recordCount: number;
  batchSize: number;
  timeout: number;
}

export interface ScalingTestConfig {
  initialInstances: number;
  maxInstances: number;
  scalingTrigger: string;
  scalingMetric: string;
}

export interface PerformanceThreshold {
  metric: string;
  operator: '<' | '>' | '<=' | '>=' | '=';
  value: number;
  severity: 'warning' | 'error';
}

/**
 * Chaos engineering framework interface
 */
export interface ChaosTestSuite {
  name: string;
  
  // Fault injection
  injectNetworkLatency(target: string, latency: number): Promise<void>;
  injectNetworkPartition(targets: string[]): Promise<void>;
  injectServiceFailure(service: string, failureType: string): Promise<void>;
  injectResourceExhaustion(resource: string, percentage: number): Promise<void>;
  
  // Resilience testing
  testCircuitBreaker(service: string): Promise<TestResult>;
  testRetryMechanism(service: string): Promise<TestResult>;
  testGracefulDegradation(scenario: string): Promise<TestResult>;
  
  // Recovery testing
  testDisasterRecovery(scenario: string): Promise<TestResult>;
  testBackupRestore(backupId: string): Promise<TestResult>;
  
  // Cleanup
  restoreSystem(): Promise<void>;
}

/**
 * Contract testing framework interface
 */
export interface ContractTestSuite {
  name: string;
  
  // API contract validation
  validateOpenAPISpec(specPath: string, baseUrl: string): Promise<TestResult>;
  validateGraphQLSchema(schemaPath: string, endpoint: string): Promise<TestResult>;
  
  // Consumer-driven contracts
  generateConsumerContract(consumer: string, provider: string): Promise<string>;
  validateProviderContract(contractPath: string, providerUrl: string): Promise<TestResult>;
  
  // Backward compatibility
  compareAPIVersions(oldSpec: string, newSpec: string): Promise<TestResult>;
  validateBreakingChanges(changes: APIChange[]): Promise<TestResult>;
}

export interface APIChange {
  type: 'added' | 'removed' | 'modified';
  path: string;
  field: string;
  oldValue?: any;
  newValue?: any;
  breaking: boolean;
}

/**
 * Regression testing framework interface
 */
export interface RegressionTestSuite {
  name: string;
  
  // Test execution
  executeRegressionSuite(): Promise<TestResult[]>;
  executeSmokeSuite(): Promise<TestResult[]>;
  executeCriticalPathSuite(): Promise<TestResult[]>;
  
  // Test management
  updateBaseline(testId: string, result: TestResult): Promise<void>;
  compareWithBaseline(testId: string, result: TestResult): Promise<boolean>;
  
  // Automated execution
  scheduleExecution(schedule: string): Promise<void>;
  triggerOnChange(changeType: string): Promise<void>;
}

/**
 * Security testing framework interface
 */
export interface SecurityTestSuite {
  name: string;
  
  // Vulnerability scanning
  scanForVulnerabilities(target: string): Promise<TestResult>;
  scanDependencies(): Promise<TestResult>;
  scanContainerImages(images: string[]): Promise<TestResult>;
  
  // Penetration testing
  testAuthentication(endpoint: string): Promise<TestResult>;
  testAuthorization(endpoint: string, roles: string[]): Promise<TestResult>;
  testInputValidation(endpoint: string, payloads: any[]): Promise<TestResult>;
  
  // Compliance testing
  validateCompliance(framework: string): Promise<TestResult>;
  auditSecurityControls(): Promise<TestResult>;
}

/**
 * Test data management interface
 */
export interface TestDataManager {
  // Data generation
  generateTestData(schema: any, count: number): Promise<any[]>;
  generateRandomData(type: string, constraints?: any): Promise<any>;
  
  // Data management
  setupTestData(dataset: string): Promise<void>;
  cleanupTestData(dataset: string): Promise<void>;
  
  // Data masking
  maskSensitiveData(data: any, rules: MaskingRule[]): Promise<any>;
  anonymizeData(data: any): Promise<any>;
}

export interface MaskingRule {
  field: string;
  method: 'hash' | 'encrypt' | 'replace' | 'remove';
  replacement?: string;
}

/**
 * Test monitoring and observability interface
 */
export interface TestMonitoring {
  // Metrics collection
  collectTestMetrics(testId: string): Promise<TestMetrics>;
  trackTestExecution(testId: string): Promise<void>;
  
  // Alerting
  createAlert(condition: string, action: string): Promise<string>;
  removeAlert(alertId: string): Promise<void>;
  
  // Dashboards
  createDashboard(config: DashboardConfig): Promise<string>;
  updateDashboard(dashboardId: string, config: DashboardConfig): Promise<void>;
}

export interface DashboardConfig {
  name: string;
  widgets: Widget[];
  refreshInterval: number;
}

export interface Widget {
  type: 'chart' | 'table' | 'metric' | 'log';
  title: string;
  query: string;
  visualization: any;
}