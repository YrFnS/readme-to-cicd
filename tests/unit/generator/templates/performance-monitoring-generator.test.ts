/**
 * Tests for PerformanceMonitoringGenerator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  PerformanceMonitoringGenerator,
  PerformanceMonitoringConfig,
  BenchmarkExecutionConfig,
  MetricsCollectionConfig,
  RegressionDetectionConfig,
  LoadTestingConfig,
  DashboardReportingConfig
} from '../../../../src/generator/templates/performance-monitoring-generator';
import { DetectionResult, GenerationOptions } from '../../../../src/generator/interfaces';

describe('PerformanceMonitoringGenerator', () => {
  let generator: PerformanceMonitoringGenerator;
  let mockDetectionResult: DetectionResult;
  let mockOptions: GenerationOptions;

  beforeEach(() => {
    generator = new PerformanceMonitoringGenerator();
    
    mockDetectionResult = {
      frameworks: [
        { name: 'React', confidence: 0.9, evidence: ['package.json'], category: 'frontend' },
        { name: 'Express', confidence: 0.8, evidence: ['package.json'], category: 'backend' }
      ],
      languages: [
        { name: 'JavaScript', confidence: 0.9, primary: true },
        { name: 'TypeScript', confidence: 0.7, primary: false }
      ],
      buildTools: [
        { name: 'webpack', configFile: 'webpack.config.js', confidence: 0.8 }
      ],
      packageManagers: [
        { name: 'npm', lockFile: 'package-lock.json', confidence: 0.9 }
      ],
      testingFrameworks: [
        { name: 'Jest', type: 'unit', confidence: 0.9 }
      ],
      deploymentTargets: [
        { platform: 'Vercel', type: 'static', confidence: 0.8 }
      ],
      projectMetadata: {
        name: 'test-project',
        description: 'A test project',
        version: '1.0.0'
      }
    };

    mockOptions = {
      workflowType: 'performance',
      optimizationLevel: 'standard',
      includeComments: true,
      securityLevel: 'standard'
    };
  });

  describe('constructor', () => {
    it('should create generator with default configuration', () => {
      const gen = new PerformanceMonitoringGenerator();
      expect(gen).toBeInstanceOf(PerformanceMonitoringGenerator);
    });

    it('should create generator with custom configuration', () => {
      const customConfig: Partial<PerformanceMonitoringConfig> = {
        benchmarkExecution: {
          enabled: false,
          frameworks: ['React'],
          testSuites: ['unit'],
          iterations: 5,
          warmupRuns: 1,
          timeout: 900,
          parallelExecution: false,
          customBenchmarks: []
        }
      };

      const gen = new PerformanceMonitoringGenerator(customConfig);
      expect(gen).toBeInstanceOf(PerformanceMonitoringGenerator);
    });
  });

  describe('generatePerformanceMonitoringWorkflow', () => {
    it('should generate complete performance monitoring workflow', () => {
      const workflow = generator.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);

      expect(workflow.name).toBe('Performance Monitoring');
      expect(workflow.type).toBe('performance');
      expect(workflow.jobs).toBeDefined();
      expect(workflow.jobs.length).toBeGreaterThan(0);
      expect(workflow.triggers).toBeDefined();
      expect(workflow.permissions).toBeDefined();
      expect(workflow.concurrency).toBeDefined();
    });

    it('should include benchmark execution job when enabled', () => {
      const workflow = generator.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);
      
      const benchmarkJob = workflow.jobs.find(job => job.name === 'benchmark-execution');
      expect(benchmarkJob).toBeDefined();
      expect(benchmarkJob?.steps).toBeDefined();
      expect(benchmarkJob?.steps.length).toBeGreaterThan(0);
    });

    it('should include metrics collection job when enabled', () => {
      const workflow = generator.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);
      
      const metricsJob = workflow.jobs.find(job => job.name === 'metrics-collection');
      expect(metricsJob).toBeDefined();
      expect(metricsJob?.needs).toContain('benchmark-execution');
    });

    it('should include regression detection job when enabled', () => {
      const workflow = generator.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);
      
      const regressionJob = workflow.jobs.find(job => job.name === 'regression-detection');
      expect(regressionJob).toBeDefined();
      expect(regressionJob?.needs).toContain('metrics-collection');
    });

    it('should include load testing job when enabled', () => {
      const workflow = generator.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);
      
      const loadTestJob = workflow.jobs.find(job => job.name === 'load-testing');
      expect(loadTestJob).toBeDefined();
    });

    it('should include dashboard reporting job when enabled', () => {
      const workflow = generator.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);
      
      const dashboardJob = workflow.jobs.find(job => job.name === 'dashboard-reporting');
      expect(dashboardJob).toBeDefined();
      expect(dashboardJob?.needs).toContain('regression-detection');
      expect(dashboardJob?.needs).toContain('load-testing');
    });

    it('should skip disabled components', () => {
      const customConfig: Partial<PerformanceMonitoringConfig> = {
        benchmarkExecution: { enabled: false } as BenchmarkExecutionConfig,
        loadTesting: { enabled: false } as LoadTestingConfig
      };

      const gen = new PerformanceMonitoringGenerator(customConfig);
      const workflow = gen.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);

      const benchmarkJob = workflow.jobs.find(job => job.name === 'benchmark-execution');
      const loadTestJob = workflow.jobs.find(job => job.name === 'load-testing');
      
      expect(benchmarkJob).toBeUndefined();
      expect(loadTestJob).toBeUndefined();
    });
  });

  describe('benchmark execution', () => {
    it('should create appropriate setup steps for JavaScript projects', () => {
      const workflow = generator.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);
      const benchmarkJob = workflow.jobs.find(job => job.name === 'benchmark-execution');
      
      expect(benchmarkJob?.steps).toBeDefined();
      
      const setupStep = benchmarkJob?.steps.find(step => step.name === 'Setup Node.js');
      expect(setupStep).toBeDefined();
      expect(setupStep?.uses).toBe('actions/setup-node@v4');
    });

    it('should create appropriate setup steps for Python projects', () => {
      const pythonDetectionResult = {
        ...mockDetectionResult,
        languages: [{ name: 'Python', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'Django', confidence: 0.8, evidence: ['manage.py'], category: 'backend' as const }]
      };

      const workflow = generator.generatePerformanceMonitoringWorkflow(pythonDetectionResult, mockOptions);
      const benchmarkJob = workflow.jobs.find(job => job.name === 'benchmark-execution');
      
      const setupStep = benchmarkJob?.steps.find(step => step.name === 'Setup Python');
      expect(setupStep).toBeDefined();
      expect(setupStep?.uses).toBe('actions/setup-python@v5');
    });

    it('should include matrix strategy when parallel execution is enabled', () => {
      const workflow = generator.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);
      const benchmarkJob = workflow.jobs.find(job => job.name === 'benchmark-execution');
      
      expect(benchmarkJob?.strategy).toBeDefined();
      expect(benchmarkJob?.strategy?.matrix).toBeDefined();
      expect(benchmarkJob?.strategy?.failFast).toBe(false);
    });

    it('should include artifact upload step', () => {
      const workflow = generator.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);
      const benchmarkJob = workflow.jobs.find(job => job.name === 'benchmark-execution');
      
      const uploadStep = benchmarkJob?.steps.find(step => step.name === 'Upload benchmark results');
      expect(uploadStep).toBeDefined();
      expect(uploadStep?.uses).toBe('actions/upload-artifact@v4');
      expect(uploadStep?.if).toBe('always()');
    });
  });

  describe('metrics collection', () => {
    it('should download benchmark results', () => {
      const workflow = generator.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);
      const metricsJob = workflow.jobs.find(job => job.name === 'metrics-collection');
      
      const downloadStep = metricsJob?.steps.find(step => step.name === 'Download benchmark results');
      expect(downloadStep).toBeDefined();
      expect(downloadStep?.uses).toBe('actions/download-artifact@v4');
    });

    it('should include metrics collection and aggregation step', () => {
      const workflow = generator.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);
      const metricsJob = workflow.jobs.find(job => job.name === 'metrics-collection');
      
      const collectionStep = metricsJob?.steps.find(step => step.name === 'Collect and aggregate metrics');
      expect(collectionStep).toBeDefined();
      expect(collectionStep?.run).toBeDefined();
      expect(collectionStep?.env).toBeDefined();
    });

    it('should include storage-specific upload steps', () => {
      const workflow = generator.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);
      const metricsJob = workflow.jobs.find(job => job.name === 'metrics-collection');
      
      // Default storage is github-artifacts
      const uploadStep = metricsJob?.steps.find(step => step.name === 'Upload aggregated metrics');
      expect(uploadStep).toBeDefined();
      expect(uploadStep?.uses).toBe('actions/upload-artifact@v4');
    });
  });

  describe('regression detection', () => {
    it('should fetch baseline metrics', () => {
      const workflow = generator.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);
      const regressionJob = workflow.jobs.find(job => job.name === 'regression-detection');
      
      const fetchStep = regressionJob?.steps.find(step => step.name === 'Fetch baseline metrics');
      expect(fetchStep).toBeDefined();
      expect(fetchStep?.run).toBeDefined();
      expect(fetchStep?.env).toBeDefined();
    });

    it('should perform regression analysis', () => {
      const workflow = generator.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);
      const regressionJob = workflow.jobs.find(job => job.name === 'regression-detection');
      
      const analysisStep = regressionJob?.steps.find(step => step.name === 'Perform regression analysis');
      expect(analysisStep).toBeDefined();
      expect(analysisStep?.run).toBeDefined();
      expect(analysisStep?.env).toBeDefined();
    });

    it('should generate regression report', () => {
      const workflow = generator.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);
      const regressionJob = workflow.jobs.find(job => job.name === 'regression-detection');
      
      const reportStep = regressionJob?.steps.find(step => step.name === 'Generate regression report');
      expect(reportStep).toBeDefined();
      expect(reportStep?.if).toBe('always()');
    });

    it('should include alerting steps when enabled', () => {
      const workflow = generator.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);
      const regressionJob = workflow.jobs.find(job => job.name === 'regression-detection');
      
      const slackStep = regressionJob?.steps.find(step => step.name === 'Send Slack alert');
      expect(slackStep).toBeDefined();
      expect(slackStep?.if).toContain('has_regressions');
    });

    it('should not include auto-revert steps by default', () => {
      const workflow = generator.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);
      const regressionJob = workflow.jobs.find(job => job.name === 'regression-detection');
      
      const revertStep = regressionJob?.steps.find(step => step.name === 'Create revert PR');
      expect(revertStep).toBeUndefined();
    });

    it('should include auto-revert steps when enabled', () => {
      const customConfig: Partial<PerformanceMonitoringConfig> = {
        regressionDetection: {
          enabled: true,
          baselineBranch: 'main',
          thresholds: {
            responseTime: 10,
            throughput: 10,
            memoryUsage: 15,
            errorRate: 5,
            custom: {}
          },
          comparisonMethod: 'percentage',
          alerting: {
            enabled: true,
            channels: ['slack'],
            severity: 'medium',
            escalation: false
          },
          autoRevert: true
        }
      };

      const gen = new PerformanceMonitoringGenerator(customConfig);
      const workflow = gen.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);
      const regressionJob = workflow.jobs.find(job => job.name === 'regression-detection');
      
      const revertStep = regressionJob?.steps.find(step => step.name === 'Create revert PR');
      expect(revertStep).toBeDefined();
    });
  });

  describe('load testing', () => {
    it('should include load testing tool setup', () => {
      const workflow = generator.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);
      const loadTestJob = workflow.jobs.find(job => job.name === 'load-testing');
      
      const setupStep = loadTestJob?.steps.find(step => step.name === 'Install k6');
      expect(setupStep).toBeDefined();
    });

    it('should create test scenarios', () => {
      const workflow = generator.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);
      const loadTestJob = workflow.jobs.find(job => job.name === 'load-testing');
      
      const configStep = loadTestJob?.steps.find(step => step.name?.includes('test configuration'));
      expect(configStep).toBeDefined();
    });

    it('should collect load test results', () => {
      const workflow = generator.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);
      const loadTestJob = workflow.jobs.find(job => job.name === 'load-testing');
      
      const resultsStep = loadTestJob?.steps.find(step => step.name === 'Collect load test results');
      expect(resultsStep).toBeDefined();
      expect(resultsStep?.if).toBe('always()');
    });

    it('should include matrix strategy for multiple scenarios', () => {
      const customConfig: Partial<PerformanceMonitoringConfig> = {
        loadTesting: {
          enabled: true,
          tools: ['k6'],
          scenarios: [
            {
              name: 'smoke-test',
              type: 'smoke',
              duration: '1m',
              virtualUsers: 1,
              rampUp: '10s',
              targets: ['http://localhost:3000'],
              assertions: []
            },
            {
              name: 'load-test',
              type: 'load',
              duration: '5m',
              virtualUsers: 100,
              rampUp: '30s',
              targets: ['http://localhost:3000'],
              assertions: []
            }
          ],
          scaling: {
            enabled: false,
            minInstances: 1,
            maxInstances: 10,
            targetCPU: 70,
            targetMemory: 80,
            scaleUpCooldown: 300,
            scaleDownCooldown: 600
          },
          monitoring: {
            realTimeMetrics: true,
            resourceMonitoring: true,
            distributedTracing: false,
            logAggregation: true
          }
        }
      };

      const gen = new PerformanceMonitoringGenerator(customConfig);
      const workflow = gen.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);
      const loadTestJob = workflow.jobs.find(job => job.name === 'load-testing');
      
      expect(loadTestJob?.strategy).toBeDefined();
      expect(loadTestJob?.strategy?.matrix.scenario).toContain('smoke-test');
      expect(loadTestJob?.strategy?.matrix.scenario).toContain('load-test');
    });
  });

  describe('dashboard reporting', () => {
    it('should download all metrics', () => {
      const workflow = generator.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);
      const dashboardJob = workflow.jobs.find(job => job.name === 'dashboard-reporting');
      
      const downloadStep = dashboardJob?.steps.find(step => step.name === 'Download all metrics');
      expect(downloadStep).toBeDefined();
      expect(downloadStep?.uses).toBe('actions/download-artifact@v4');
    });

    it('should generate performance reports', () => {
      const workflow = generator.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);
      const dashboardJob = workflow.jobs.find(job => job.name === 'dashboard-reporting');
      
      const reportStep = dashboardJob?.steps.find(step => step.name === 'Generate performance reports');
      expect(reportStep).toBeDefined();
      expect(reportStep?.run).toBeDefined();
      expect(reportStep?.env).toBeDefined();
    });

    it('should run after regression detection and load testing', () => {
      const workflow = generator.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);
      const dashboardJob = workflow.jobs.find(job => job.name === 'dashboard-reporting');
      
      expect(dashboardJob?.needs).toContain('regression-detection');
      expect(dashboardJob?.needs).toContain('load-testing');
      expect(dashboardJob?.if).toBe('always()');
    });
  });

  describe('workflow triggers', () => {
    it('should include push triggers for main branches', () => {
      const workflow = generator.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);
      
      expect(workflow.triggers.push).toBeDefined();
      expect(workflow.triggers.push?.branches).toContain('main');
      expect(workflow.triggers.push?.branches).toContain('develop');
    });

    it('should include pull request triggers', () => {
      const workflow = generator.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);
      
      expect(workflow.triggers.pullRequest).toBeDefined();
      expect(workflow.triggers.pullRequest?.branches).toContain('main');
      expect(workflow.triggers.pullRequest?.types).toContain('opened');
    });

    it('should include scheduled triggers', () => {
      const workflow = generator.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);
      
      expect(workflow.triggers.schedule).toBeDefined();
      expect(workflow.triggers.schedule?.length).toBeGreaterThan(0);
    });

    it('should include workflow dispatch trigger', () => {
      const workflow = generator.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);
      
      expect(workflow.triggers.workflowDispatch).toBeDefined();
      expect(workflow.triggers.workflowDispatch?.inputs).toBeDefined();
    });
  });

  describe('permissions', () => {
    it('should set appropriate permissions', () => {
      const workflow = generator.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);
      
      expect(workflow.permissions).toBeDefined();
      expect(workflow.permissions?.contents).toBe('read');
      expect(workflow.permissions?.actions).toBe('read');
      expect(workflow.permissions?.checks).toBe('write');
      expect(workflow.permissions?.pullRequests).toBe('write');
    });
  });

  describe('concurrency', () => {
    it('should set concurrency group', () => {
      const workflow = generator.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);
      
      expect(workflow.concurrency).toBeDefined();
      expect(workflow.concurrency?.group).toBe('performance-monitoring-${{ github.ref }}');
      expect(workflow.concurrency?.cancelInProgress).toBe(false);
    });
  });

  describe('configuration merging', () => {
    it('should merge partial configuration with defaults', () => {
      const partialConfig: Partial<PerformanceMonitoringConfig> = {
        benchmarkExecution: {
          enabled: false,
          iterations: 5
        } as BenchmarkExecutionConfig
      };

      const gen = new PerformanceMonitoringGenerator(partialConfig);
      const workflow = gen.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);
      
      // Should not include benchmark job since it's disabled
      const benchmarkJob = workflow.jobs.find(job => job.name === 'benchmark-execution');
      expect(benchmarkJob).toBeUndefined();
    });

    it('should use default values for unspecified configuration', () => {
      const gen = new PerformanceMonitoringGenerator();
      const workflow = gen.generatePerformanceMonitoringWorkflow(mockDetectionResult, mockOptions);
      
      // Should include all default jobs
      expect(workflow.jobs.length).toBeGreaterThan(3);
    });
  });

  describe('language-specific adaptations', () => {
    it('should adapt to Java projects', () => {
      const javaDetectionResult = {
        ...mockDetectionResult,
        languages: [{ name: 'Java', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'Spring Boot', confidence: 0.8, evidence: ['pom.xml'], category: 'backend' as const }]
      };

      const workflow = generator.generatePerformanceMonitoringWorkflow(javaDetectionResult, mockOptions);
      const benchmarkJob = workflow.jobs.find(job => job.name === 'benchmark-execution');
      
      const setupStep = benchmarkJob?.steps.find(step => step.name === 'Setup Java');
      expect(setupStep).toBeDefined();
      expect(setupStep?.uses).toBe('actions/setup-java@v4');
    });

    it('should adapt to Go projects', () => {
      const goDetectionResult = {
        ...mockDetectionResult,
        languages: [{ name: 'Go', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'Gin', confidence: 0.8, evidence: ['go.mod'], category: 'backend' as const }]
      };

      const workflow = generator.generatePerformanceMonitoringWorkflow(goDetectionResult, mockOptions);
      const benchmarkJob = workflow.jobs.find(job => job.name === 'benchmark-execution');
      
      const setupStep = benchmarkJob?.steps.find(step => step.name === 'Setup Go');
      expect(setupStep).toBeDefined();
      expect(setupStep?.uses).toBe('actions/setup-go@v5');
    });

    it('should adapt to Rust projects', () => {
      const rustDetectionResult = {
        ...mockDetectionResult,
        languages: [{ name: 'Rust', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'Actix', confidence: 0.8, evidence: ['Cargo.toml'], category: 'backend' as const }]
      };

      const workflow = generator.generatePerformanceMonitoringWorkflow(rustDetectionResult, mockOptions);
      const benchmarkJob = workflow.jobs.find(job => job.name === 'benchmark-execution');
      
      const setupStep = benchmarkJob?.steps.find(step => step.name === 'Setup Rust');
      expect(setupStep).toBeDefined();
      expect(setupStep?.uses).toBe('dtolnay/rust-toolchain@stable');
    });
  });
});