/**
 * Performance Monitoring Generator
 * Creates GitHub Actions workflows for performance monitoring, benchmarking, and regression detection
 */

import { 
  WorkflowTemplate, 
  JobTemplate, 
  StepTemplate, 
  TriggerConfig,
  MatrixStrategy,
  PermissionConfig
} from '../types';
import { DetectionResult, GenerationOptions, MonitoringConfig } from '../interfaces';

/**
 * Performance monitoring configuration
 */
export interface PerformanceMonitoringConfig {
  benchmarkExecution: BenchmarkExecutionConfig;
  metricsCollection: MetricsCollectionConfig;
  regressionDetection: RegressionDetectionConfig;
  loadTesting: LoadTestingConfig;
  dashboardReporting: DashboardReportingConfig;
}

/**
 * Benchmark execution configuration
 */
export interface BenchmarkExecutionConfig {
  enabled: boolean;
  frameworks: string[];
  testSuites: string[];
  iterations: number;
  warmupRuns: number;
  timeout: number;
  parallelExecution: boolean;
  customBenchmarks: CustomBenchmarkConfig[];
}

/**
 * Custom benchmark configuration
 */
export interface CustomBenchmarkConfig {
  name: string;
  command: string;
  outputFormat: 'json' | 'xml' | 'csv' | 'text';
  metricsPath: string;
  thresholds: Record<string, number>;
}

/**
 * Metrics collection configuration
 */
export interface MetricsCollectionConfig {
  enabled: boolean;
  storage: 'github-artifacts' | 'external-db' | 's3' | 'gcs';
  retention: number; // days
  metrics: PerformanceMetricType[];
  aggregation: 'mean' | 'median' | 'p95' | 'p99';
  exportFormats: ('json' | 'csv' | 'prometheus')[];
}

/**
 * Performance metric types
 */
export type PerformanceMetricType = 
  | 'response-time'
  | 'throughput'
  | 'memory-usage'
  | 'cpu-usage'
  | 'disk-io'
  | 'network-io'
  | 'error-rate'
  | 'availability'
  | 'custom';

/**
 * Regression detection configuration
 */
export interface RegressionDetectionConfig {
  enabled: boolean;
  baselineBranch: string;
  thresholds: RegressionThresholds;
  comparisonMethod: 'statistical' | 'percentage' | 'absolute';
  alerting: AlertingConfig;
  autoRevert: boolean;
}

/**
 * Regression thresholds
 */
export interface RegressionThresholds {
  responseTime: number; // percentage increase
  throughput: number; // percentage decrease
  memoryUsage: number; // percentage increase
  errorRate: number; // percentage increase
  custom: Record<string, number>;
}

/**
 * Alerting configuration
 */
export interface AlertingConfig {
  enabled: boolean;
  channels: ('slack' | 'email' | 'teams' | 'webhook')[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  escalation: boolean;
}

/**
 * Load testing configuration
 */
export interface LoadTestingConfig {
  enabled: boolean;
  tools: ('k6' | 'artillery' | 'jmeter' | 'wrk' | 'custom')[];
  scenarios: LoadTestScenario[];
  scaling: ScalingConfig;
  monitoring: LoadTestMonitoringConfig;
}

/**
 * Load test scenario
 */
export interface LoadTestScenario {
  name: string;
  type: 'smoke' | 'load' | 'stress' | 'spike' | 'volume';
  duration: string;
  virtualUsers: number;
  rampUp: string;
  targets: string[];
  assertions: LoadTestAssertion[];
}

/**
 * Load test assertion
 */
export interface LoadTestAssertion {
  metric: string;
  condition: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'ne';
  value: number;
  percentile?: number;
}

/**
 * Scaling configuration
 */
export interface ScalingConfig {
  enabled: boolean;
  minInstances: number;
  maxInstances: number;
  targetCPU: number;
  targetMemory: number;
  scaleUpCooldown: number;
  scaleDownCooldown: number;
}

/**
 * Load test monitoring configuration
 */
export interface LoadTestMonitoringConfig {
  realTimeMetrics: boolean;
  resourceMonitoring: boolean;
  distributedTracing: boolean;
  logAggregation: boolean;
}

/**
 * Dashboard reporting configuration
 */
export interface DashboardReportingConfig {
  enabled: boolean;
  platforms: ('grafana' | 'datadog' | 'newrelic' | 'custom')[];
  updateFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  reports: DashboardReportConfig[];
  notifications: DashboardNotificationConfig;
}

/**
 * Dashboard report configuration
 */
export interface DashboardReportConfig {
  name: string;
  type: 'summary' | 'detailed' | 'trend' | 'comparison';
  metrics: string[];
  timeRange: string;
  format: 'html' | 'pdf' | 'json';
  recipients: string[];
}

/**
 * Dashboard notification configuration
 */
export interface DashboardNotificationConfig {
  enabled: boolean;
  triggers: ('regression' | 'improvement' | 'threshold' | 'anomaly')[];
  channels: string[];
  frequency: 'immediate' | 'hourly' | 'daily';
}

/**
 * Performance Monitoring Generator class
 */
export class PerformanceMonitoringGenerator {
  private config: PerformanceMonitoringConfig;

  constructor(config?: Partial<PerformanceMonitoringConfig>) {
    this.config = this.mergeWithDefaults(config);
  }

  /**
   * Generate performance monitoring workflow
   */
  generatePerformanceMonitoringWorkflow(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): WorkflowTemplate {
    const jobs: JobTemplate[] = [];

    // Add benchmark execution job
    if (this.config.benchmarkExecution.enabled) {
      jobs.push(this.createBenchmarkExecutionJob(detectionResult));
    }

    // Add metrics collection job
    if (this.config.metricsCollection.enabled) {
      jobs.push(this.createMetricsCollectionJob(detectionResult));
    }

    // Add regression detection job
    if (this.config.regressionDetection.enabled) {
      jobs.push(this.createRegressionDetectionJob(detectionResult));
    }

    // Add load testing job
    if (this.config.loadTesting.enabled) {
      jobs.push(this.createLoadTestingJob(detectionResult));
    }

    // Add dashboard reporting job
    if (this.config.dashboardReporting.enabled) {
      jobs.push(this.createDashboardReportingJob(detectionResult));
    }

    return {
      name: 'Performance Monitoring',
      type: 'performance',
      triggers: this.createPerformanceTriggers(),
      jobs,
      permissions: this.createPerformancePermissions(),
      concurrency: {
        group: 'performance-monitoring-${{ github.ref }}',
        cancelInProgress: false
      }
    };
  }

  /**
   * Create benchmark execution job
   */
  private createBenchmarkExecutionJob(detectionResult: DetectionResult): JobTemplate {
    const steps: StepTemplate[] = [
      {
        name: 'Checkout code',
        uses: 'actions/checkout@v4',
        with: {
          'fetch-depth': 0
        }
      }
    ];

    // Add language-specific setup
    steps.push(...this.createLanguageSetupSteps(detectionResult));

    // Add benchmark execution steps
    steps.push(...this.createBenchmarkSteps(detectionResult));

    // Add results upload
    steps.push({
      name: 'Upload benchmark results',
      uses: 'actions/upload-artifact@v4',
      with: {
        name: 'benchmark-results-${{ github.run_id }}',
        path: 'benchmark-results/',
        'retention-days': this.config.metricsCollection.retention
      },
      if: 'always()'
    });

    const strategy = this.createBenchmarkStrategy(detectionResult);
    return {
      name: 'benchmark-execution',
      runsOn: 'ubuntu-latest',
      ...(strategy && { strategy }),
      steps,
      timeout: this.config.benchmarkExecution.timeout
    };
  }

  /**
   * Create metrics collection job
   */
  private createMetricsCollectionJob(detectionResult: DetectionResult): JobTemplate {
    const steps: StepTemplate[] = [
      {
        name: 'Download benchmark results',
        uses: 'actions/download-artifact@v4',
        with: {
          pattern: 'benchmark-results-*',
          path: 'benchmark-results/',
          'merge-multiple': true
        }
      },
      {
        name: 'Collect and aggregate metrics',
        run: this.createMetricsCollectionScript(),
        env: {
          METRICS_STORAGE: this.config.metricsCollection.storage,
          AGGREGATION_METHOD: this.config.metricsCollection.aggregation,
          EXPORT_FORMATS: this.config.metricsCollection.exportFormats.join(',')
        }
      }
    ];

    // Add storage-specific upload steps
    steps.push(...this.createMetricsStorageSteps());

    return {
      name: 'metrics-collection',
      runsOn: 'ubuntu-latest',
      needs: ['benchmark-execution'],
      steps,
      if: 'always()'
    };
  }  /**
  
 * Create regression detection job
   */
  private createRegressionDetectionJob(detectionResult: DetectionResult): JobTemplate {
    const steps: StepTemplate[] = [
      {
        name: 'Download current metrics',
        uses: 'actions/download-artifact@v4',
        with: {
          pattern: 'metrics-*',
          path: 'current-metrics/',
          'merge-multiple': true
        }
      },
      {
        name: 'Fetch baseline metrics',
        run: this.createBaselineMetricsFetchScript(),
        env: {
          BASELINE_BRANCH: this.config.regressionDetection.baselineBranch,
          COMPARISON_METHOD: this.config.regressionDetection.comparisonMethod
        }
      },
      {
        name: 'Perform regression analysis',
        run: this.createRegressionAnalysisScript(),
        env: {
          RESPONSE_TIME_THRESHOLD: this.config.regressionDetection.thresholds.responseTime.toString(),
          THROUGHPUT_THRESHOLD: this.config.regressionDetection.thresholds.throughput.toString(),
          MEMORY_THRESHOLD: this.config.regressionDetection.thresholds.memoryUsage.toString(),
          ERROR_RATE_THRESHOLD: this.config.regressionDetection.thresholds.errorRate.toString()
        }
      },
      {
        name: 'Generate regression report',
        run: this.createRegressionReportScript(),
        if: 'always()'
      }
    ];

    // Add alerting steps if regression detected
    if (this.config.regressionDetection.alerting.enabled) {
      steps.push(...this.createAlertingSteps());
    }

    // Add auto-revert steps if enabled
    if (this.config.regressionDetection.autoRevert) {
      steps.push(...this.createAutoRevertSteps());
    }

    return {
      name: 'regression-detection',
      runsOn: 'ubuntu-latest',
      needs: ['metrics-collection'],
      steps,
      if: 'always()'
    };
  }

  /**
   * Create load testing job
   */
  private createLoadTestingJob(detectionResult: DetectionResult): JobTemplate {
    const steps: StepTemplate[] = [
      {
        name: 'Checkout code',
        uses: 'actions/checkout@v4'
      }
    ];

    // Add load testing tool setup
    steps.push(...this.createLoadTestingSetupSteps());

    // Add load test execution for each scenario
    for (const scenario of this.config.loadTesting.scenarios) {
      steps.push(...this.createLoadTestScenarioSteps(scenario));
    }

    // Add results collection
    steps.push({
      name: 'Collect load test results',
      run: this.createLoadTestResultsScript(),
      if: 'always()'
    });

    // Add scaling monitoring if enabled
    if (this.config.loadTesting.scaling.enabled) {
      steps.push(...this.createScalingMonitoringSteps());
    }

    const strategy = this.createLoadTestingStrategy();
    return {
      name: 'load-testing',
      runsOn: 'ubuntu-latest',
      ...(strategy && { strategy }),
      steps,
      timeout: 60 // 1 hour for load tests
    };
  }

  /**
   * Create dashboard reporting job
   */
  private createDashboardReportingJob(detectionResult: DetectionResult): JobTemplate {
    const steps: StepTemplate[] = [
      {
        name: 'Download all metrics',
        uses: 'actions/download-artifact@v4',
        with: {
          pattern: '*-results-*',
          path: 'all-metrics/',
          'merge-multiple': true
        }
      },
      {
        name: 'Generate performance reports',
        run: this.createDashboardReportScript(),
        env: {
          PLATFORMS: this.config.dashboardReporting.platforms.join(','),
          UPDATE_FREQUENCY: this.config.dashboardReporting.updateFrequency
        }
      }
    ];

    // Add platform-specific dashboard updates
    for (const platform of this.config.dashboardReporting.platforms) {
      steps.push(...this.createPlatformDashboardSteps(platform));
    }

    // Add notification steps
    if (this.config.dashboardReporting.notifications.enabled) {
      steps.push(...this.createDashboardNotificationSteps());
    }

    return {
      name: 'dashboard-reporting',
      runsOn: 'ubuntu-latest',
      needs: ['regression-detection', 'load-testing'],
      steps,
      if: 'always()'
    };
  }

  /**
   * Create performance monitoring triggers
   */
  private createPerformanceTriggers(): TriggerConfig {
    return {
      push: {
        branches: ['main', 'develop', 'release/*']
      },
      pullRequest: {
        branches: ['main', 'develop'],
        types: ['opened', 'synchronize', 'reopened']
      },
      schedule: [
        {
          cron: '0 2 * * *' // Daily at 2 AM
        },
        {
          cron: '0 14 * * 1' // Weekly on Monday at 2 PM
        }
      ],
      workflowDispatch: {
        inputs: {
          scenario: {
            description: 'Load test scenario to run',
            required: false,
            default: 'all',
            type: 'choice',
            options: ['all', ...this.config.loadTesting.scenarios.map(s => s.name)]
          },
          baseline: {
            description: 'Baseline branch for comparison',
            required: false,
            default: this.config.regressionDetection.baselineBranch,
            type: 'string'
          }
        }
      }
    };
  }

  /**
   * Create performance monitoring permissions
   */
  private createPerformancePermissions(): PermissionConfig {
    return {
      contents: 'read',
      actions: 'read',
      checks: 'write',
      pullRequests: 'write',
      issues: 'write',
      packages: 'read'
    };
  }

  /**
   * Create language-specific setup steps
   */
  private createLanguageSetupSteps(detectionResult: DetectionResult): StepTemplate[] {
    const steps: StepTemplate[] = [];
    const primaryLanguage = detectionResult.languages.find(l => l.primary);

    if (!primaryLanguage) {return steps;}

    switch (primaryLanguage.name.toLowerCase()) {
      case 'javascript':
      case 'typescript':
        steps.push({
          name: 'Setup Node.js',
          uses: 'actions/setup-node@v4',
          with: {
            'node-version': primaryLanguage.version || '20',
            cache: this.detectPackageManager(detectionResult)
          }
        });
        break;

      case 'python':
        steps.push({
          name: 'Setup Python',
          uses: 'actions/setup-python@v5',
          with: {
            'python-version': primaryLanguage.version || '3.11'
          }
        });
        break;

      case 'java':
        steps.push({
          name: 'Setup Java',
          uses: 'actions/setup-java@v4',
          with: {
            'java-version': primaryLanguage.version || '17',
            distribution: 'temurin'
          }
        });
        break;

      case 'go':
        steps.push({
          name: 'Setup Go',
          uses: 'actions/setup-go@v5',
          with: {
            'go-version': primaryLanguage.version || '1.21'
          }
        });
        break;

      case 'rust':
        steps.push({
          name: 'Setup Rust',
          uses: 'dtolnay/rust-toolchain@stable',
          with: {
            toolchain: primaryLanguage.version || 'stable'
          }
        });
        break;
    }

    return steps;
  }

  /**
   * Create benchmark execution steps
   */
  private createBenchmarkSteps(detectionResult: DetectionResult): StepTemplate[] {
    const steps: StepTemplate[] = [];

    // Install dependencies
    steps.push({
      name: 'Install dependencies',
      run: this.createDependencyInstallScript(detectionResult)
    });

    // Install benchmarking tools
    steps.push({
      name: 'Install benchmarking tools',
      run: this.createBenchmarkToolsInstallScript(detectionResult)
    });

    // Run framework-specific benchmarks
    for (const framework of detectionResult.frameworks) {
      steps.push(...this.createFrameworkBenchmarkSteps(framework.name));
    }

    // Run custom benchmarks
    for (const benchmark of this.config.benchmarkExecution.customBenchmarks) {
      steps.push({
        name: `Run ${benchmark.name} benchmark`,
        run: benchmark.command,
        env: {
          BENCHMARK_ITERATIONS: this.config.benchmarkExecution.iterations.toString(),
          WARMUP_RUNS: this.config.benchmarkExecution.warmupRuns.toString(),
          OUTPUT_FORMAT: benchmark.outputFormat,
          METRICS_PATH: benchmark.metricsPath
        }
      });
    }

    return steps;
  }

  /**
   * Create benchmark strategy for matrix builds
   */
  private createBenchmarkStrategy(detectionResult: DetectionResult): MatrixStrategy | undefined {
    if (!this.config.benchmarkExecution.parallelExecution) {
      return undefined;
    }

    const matrix: Record<string, any[]> = {};

    // Add language versions if multiple detected
    const primaryLanguage = detectionResult.languages.find(l => l.primary);
    if (primaryLanguage) {
      switch (primaryLanguage.name.toLowerCase()) {
        case 'javascript':
        case 'typescript':
          matrix['node-version'] = ['18', '20', '21'];
          break;
        case 'python':
          matrix['python-version'] = ['3.9', '3.10', '3.11', '3.12'];
          break;
        case 'java':
          matrix['java-version'] = ['11', '17', '21'];
          break;
        case 'go':
          matrix['go-version'] = ['1.20', '1.21', '1.22'];
          break;
      }
    }

    // Add OS matrix for comprehensive testing
    matrix.os = ['ubuntu-latest', 'windows-latest', 'macos-latest'];

    return {
      matrix,
      failFast: false,
      maxParallel: 6
    };
  }

  /**
   * Create metrics collection script
   */
  private createMetricsCollectionScript(): string {
    return `
#!/bin/bash
set -e

echo "Collecting and aggregating performance metrics..."

# Create output directory
mkdir -p aggregated-metrics

# Process benchmark results
for result_file in benchmark-results/*.json; do
  if [ -f "$result_file" ]; then
    echo "Processing $result_file"
    
    # Extract metrics based on format
    case "$EXPORT_FORMATS" in
      *json*)
        cp "$result_file" "aggregated-metrics/$(basename "$result_file")"
        ;;
      *csv*)
        jq -r '.[] | [.name, .value, .unit, .timestamp] | @csv' "$result_file" > "aggregated-metrics/$(basename "$result_file" .json).csv"
        ;;
      *prometheus*)
        jq -r '.[] | "# TYPE \\(.name) gauge\\n\\(.name) \\(.value) \\(.timestamp)"' "$result_file" > "aggregated-metrics/$(basename "$result_file" .json).prom"
        ;;
    esac
  fi
done

# Aggregate metrics by type
echo "Aggregating metrics by type..."
case "$AGGREGATION_METHOD" in
  mean)
    jq -s 'group_by(.name) | map({name: .[0].name, value: (map(.value) | add / length), unit: .[0].unit, timestamp: now})' aggregated-metrics/*.json > aggregated-metrics/summary.json
    ;;
  median)
    jq -s 'group_by(.name) | map({name: .[0].name, value: (map(.value) | sort | .[length/2]), unit: .[0].unit, timestamp: now})' aggregated-metrics/*.json > aggregated-metrics/summary.json
    ;;
  p95)
    jq -s 'group_by(.name) | map({name: .[0].name, value: (map(.value) | sort | .[length*0.95|floor]), unit: .[0].unit, timestamp: now})' aggregated-metrics/*.json > aggregated-metrics/summary.json
    ;;
  p99)
    jq -s 'group_by(.name) | map({name: .[0].name, value: (map(.value) | sort | .[length*0.99|floor]), unit: .[0].unit, timestamp: now})' aggregated-metrics/*.json > aggregated-metrics/summary.json
    ;;
esac

echo "Metrics collection completed"
    `.trim();
  }

  /**
   * Create metrics storage steps
   */
  private createMetricsStorageSteps(): StepTemplate[] {
    const steps: StepTemplate[] = [];

    switch (this.config.metricsCollection.storage) {
      case 'github-artifacts':
        steps.push({
          name: 'Upload aggregated metrics',
          uses: 'actions/upload-artifact@v4',
          with: {
            name: 'metrics-${{ github.run_id }}',
            path: 'aggregated-metrics/',
            'retention-days': this.config.metricsCollection.retention
          }
        });
        break;

      case 's3':
        steps.push({
          name: 'Upload metrics to S3',
          run: `
            aws s3 cp aggregated-metrics/ s3://\\\${{ secrets.METRICS_S3_BUCKET }}/metrics/\\\${{ github.run_id }}/ --recursive
          `,
          env: {
            AWS_ACCESS_KEY_ID: '\${{ secrets.AWS_ACCESS_KEY_ID }}',
            AWS_SECRET_ACCESS_KEY: '\${{ secrets.AWS_SECRET_ACCESS_KEY }}',
            AWS_REGION: '\${{ secrets.AWS_REGION }}'
          }
        });
        break;

      case 'gcs':
        steps.push({
          name: 'Upload metrics to GCS',
          run: `
            gsutil -m cp -r aggregated-metrics/ gs://\\\${{ secrets.METRICS_GCS_BUCKET }}/metrics/\\\${{ github.run_id }}/
          `,
          env: {
            GOOGLE_APPLICATION_CREDENTIALS: '\${{ secrets.GCP_SA_KEY }}'
          }
        });
        break;

      case 'external-db':
        steps.push({
          name: 'Upload metrics to database',
          run: this.createDatabaseUploadScript(),
          env: {
            DB_CONNECTION_STRING: '\${{ secrets.METRICS_DB_CONNECTION }}',
            DB_TABLE: '\${{ secrets.METRICS_DB_TABLE }}'
          }
        });
        break;
    }

    return steps;
  }  /**

   * Create baseline metrics fetch script
   */
  private createBaselineMetricsFetchScript(): string {
    return `
#!/bin/bash
set -e

echo "Fetching baseline metrics from $BASELINE_BRANCH..."

# Create baseline directory
mkdir -p baseline-metrics

# Fetch baseline metrics from artifacts or storage
case "$METRICS_STORAGE" in
  github-artifacts)
    # Use GitHub CLI to fetch artifacts from baseline branch
    gh run list --branch "\$BASELINE_BRANCH" --limit 1 --json databaseId --jq '.[0].databaseId' > baseline_run_id.txt
    if [ -s baseline_run_id.txt ]; then
      BASELINE_RUN_ID=\$(cat baseline_run_id.txt)
      gh run download "\$BASELINE_RUN_ID" --pattern "metrics-*" --dir baseline-metrics/ || echo "No baseline metrics found"
    fi
    ;;
  s3)
    aws s3 cp s3://\\\${{ secrets.METRICS_S3_BUCKET }}/baseline/latest/ baseline-metrics/ --recursive || echo "No baseline metrics found"
    ;;
  gcs)
    gsutil -m cp -r gs://\\\${{ secrets.METRICS_GCS_BUCKET }}/baseline/latest/ baseline-metrics/ || echo "No baseline metrics found"
    ;;
  external-db)
    # Fetch from database
    echo "Fetching baseline from database..."
    # Custom database query script would go here
    ;;
esac

echo "Baseline metrics fetch completed"
    `.trim();
  }

  /**
   * Create regression analysis script
   */
  private createRegressionAnalysisScript(): string {
    return `
#!/bin/bash
set -e

echo "Performing regression analysis..."

# Create analysis output directory
mkdir -p regression-analysis

# Compare current metrics with baseline
python3 << 'EOF'
import json
import os
import sys
from pathlib import Path

def load_metrics(directory):
    metrics = {}
    for file_path in Path(directory).glob('*.json'):
        with open(file_path) as f:
            data = json.load(f)
            if isinstance(data, list):
                for metric in data:
                    metrics[metric['name']] = metric['value']
            else:
                metrics.update(data)
    return metrics

def calculate_regression(current, baseline, threshold, comparison_method):
    if baseline == 0:
        return float('inf') if current > 0 else 0
    
    if comparison_method == 'percentage':
        return ((current - baseline) / baseline) * 100
    elif comparison_method == 'absolute':
        return current - baseline
    else:  # statistical
        # Simple statistical comparison (could be enhanced with proper statistical tests)
        return ((current - baseline) / baseline) * 100

# Load metrics
current_metrics = load_metrics('current-metrics')
baseline_metrics = load_metrics('baseline-metrics')

# Perform regression analysis
regressions = []
improvements = []

thresholds = {
    'response_time': float(os.environ.get('RESPONSE_TIME_THRESHOLD', '10')),
    'throughput': float(os.environ.get('THROUGHPUT_THRESHOLD', '10')),
    'memory_usage': float(os.environ.get('MEMORY_THRESHOLD', '15')),
    'error_rate': float(os.environ.get('ERROR_RATE_THRESHOLD', '5'))
}

comparison_method = os.environ.get('COMPARISON_METHOD', 'percentage')

for metric_name, current_value in current_metrics.items():
    if metric_name in baseline_metrics:
        baseline_value = baseline_metrics[metric_name]
        regression = calculate_regression(current_value, baseline_value, 0, comparison_method)
        
        # Determine if this is a regression based on metric type
        is_regression = False
        threshold = 10  # default threshold
        
        if 'response_time' in metric_name.lower() or 'latency' in metric_name.lower():
            is_regression = regression > thresholds['response_time']
            threshold = thresholds['response_time']
        elif 'throughput' in metric_name.lower() or 'rps' in metric_name.lower():
            is_regression = regression < -thresholds['throughput']  # negative because lower throughput is bad
            threshold = thresholds['throughput']
        elif 'memory' in metric_name.lower():
            is_regression = regression > thresholds['memory_usage']
            threshold = thresholds['memory_usage']
        elif 'error' in metric_name.lower():
            is_regression = regression > thresholds['error_rate']
            threshold = thresholds['error_rate']
        
        result = {
            'metric': metric_name,
            'current': current_value,
            'baseline': baseline_value,
            'change': regression,
            'threshold': threshold,
            'is_regression': is_regression
        }
        
        if is_regression:
            regressions.append(result)
        elif regression < -5:  # Improvement threshold
            improvements.append(result)

# Save results
with open('regression-analysis/results.json', 'w') as f:
    json.dump({
        'regressions': regressions,
        'improvements': improvements,
        'total_metrics': len(current_metrics),
        'compared_metrics': len([m for m in current_metrics if m in baseline_metrics])
    }, f, indent=2)

# Set GitHub output
if regressions:
    print(f"::set-output name=has_regressions::true")
    print(f"::set-output name=regression_count::{len(regressions)}")
    print(f"::error::Found {len(regressions)} performance regressions")
    sys.exit(1)
else:
    print(f"::set-output name=has_regressions::false")
    print(f"::set-output name=regression_count::0")
    print("No performance regressions detected")

if improvements:
    print(f"::notice::Found {len(improvements)} performance improvements")

EOF

echo "Regression analysis completed"
    `.trim();
  }

  /**
   * Create regression report script
   */
  private createRegressionReportScript(): string {
    return `
#!/bin/bash
set -e

echo "Generating regression report..."

# Create report directory
mkdir -p regression-report

# Generate HTML report
python3 << 'EOF'
import json
import os
from datetime import datetime

# Load analysis results
with open('regression-analysis/results.json') as f:
    results = json.load(f)

# Generate HTML report
html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Performance Regression Report</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .header {{ background-color: #f0f0f0; padding: 20px; border-radius: 5px; }}
        .regression {{ background-color: #ffebee; padding: 10px; margin: 10px 0; border-left: 4px solid #f44336; }}
        .improvement {{ background-color: #e8f5e8; padding: 10px; margin: 10px 0; border-left: 4px solid #4caf50; }}
        .metric {{ font-weight: bold; }}
        .value {{ font-family: monospace; }}
        table {{ border-collapse: collapse; width: 100%; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background-color: #f2f2f2; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Performance Regression Report</h1>
        <p>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        <p>Commit: \${{ github.sha }}</p>
        <p>Branch: \${{ github.ref_name }}</p>
    </div>
    
    <h2>Summary</h2>
    <ul>
        <li>Total metrics analyzed: {results['total_metrics']}</li>
        <li>Metrics compared with baseline: {results['compared_metrics']}</li>
        <li>Regressions found: {len(results['regressions'])}</li>
        <li>Improvements found: {len(results['improvements'])}</li>
    </ul>
"""

if results['regressions']:
    html_content += """
    <h2>Performance Regressions</h2>
    <table>
        <tr>
            <th>Metric</th>
            <th>Current</th>
            <th>Baseline</th>
            <th>Change (%)</th>
            <th>Threshold (%)</th>
        </tr>
    """
    for reg in results['regressions']:
        html_content += f"""
        <tr>
            <td>{reg['metric']}</td>
            <td class="value">{reg['current']:.2f}</td>
            <td class="value">{reg['baseline']:.2f}</td>
            <td class="value" style="color: red;">{reg['change']:+.2f}%</td>
            <td class="value">{reg['threshold']:.2f}%</td>
        </tr>
        """
    html_content += "</table>"

if results['improvements']:
    html_content += """
    <h2>Performance Improvements</h2>
    <table>
        <tr>
            <th>Metric</th>
            <th>Current</th>
            <th>Baseline</th>
            <th>Change (%)</th>
        </tr>
    """
    for imp in results['improvements']:
        html_content += f"""
        <tr>
            <td>{imp['metric']}</td>
            <td class="value">{imp['current']:.2f}</td>
            <td class="value">{imp['baseline']:.2f}</td>
            <td class="value" style="color: green;">{imp['change']:+.2f}%</td>
        </tr>
        """
    html_content += "</table>"

html_content += """
</body>
</html>
"""

# Save HTML report
with open('regression-report/report.html', 'w') as f:
    f.write(html_content)

# Generate markdown summary for PR comments
md_content = f"""
## Performance Analysis Results

**Summary:**
- Total metrics analyzed: {results['total_metrics']}
- Metrics compared with baseline: {results['compared_metrics']}
- Regressions found: {len(results['regressions'])}
- Improvements found: {len(results['improvements'])}

"""

if results['regressions']:
    md_content += "### ⚠️ Performance Regressions\n\n"
    md_content += "| Metric | Current | Baseline | Change | Threshold |\n"
    md_content += "|--------|---------|----------|--------|----------|\n"
    for reg in results['regressions']:
        md_content += f"| {reg['metric']} | {reg['current']:.2f} | {reg['baseline']:.2f} | {reg['change']:+.2f}% | {reg['threshold']:.2f}% |\n"
    md_content += "\n"

if results['improvements']:
    md_content += "### ✅ Performance Improvements\n\n"
    md_content += "| Metric | Current | Baseline | Change |\n"
    md_content += "|--------|---------|----------|--------|\n"
    for imp in results['improvements']:
        md_content += f"| {imp['metric']} | {imp['current']:.2f} | {imp['baseline']:.2f} | {imp['change']:+.2f}% |\n"

# Save markdown report
with open('regression-report/summary.md', 'w') as f:
    f.write(md_content)

EOF

echo "Regression report generated"
    `.trim();
  }

  /**
   * Create alerting steps
   */
  private createAlertingSteps(): StepTemplate[] {
    const steps: StepTemplate[] = [];

    if (this.config.regressionDetection.alerting.channels.includes('slack')) {
      steps.push({
        name: 'Send Slack alert',
        uses: '8398a7/action-slack@v3',
        with: {
          status: 'failure',
          text: 'Performance regression detected! Check the regression report for details.',
          webhook_url: '\${{ secrets.SLACK_WEBHOOK_URL }}'
        },
        if: 'steps.regression-analysis.outputs.has_regressions == \'true\''
      });
    }

    if (this.config.regressionDetection.alerting.channels.includes('email')) {
      steps.push({
        name: 'Send email alert',
        uses: 'dawidd6/action-send-mail@v3',
        with: {
          server_address: '\${{ secrets.SMTP_SERVER }}',
          server_port: '\${{ secrets.SMTP_PORT }}',
          username: '\${{ secrets.SMTP_USERNAME }}',
          password: '\${{ secrets.SMTP_PASSWORD }}',
          subject: 'Performance Regression Alert - \${{ github.repository }}',
          body: 'file://regression-report/summary.md',
          to: '\${{ secrets.ALERT_EMAIL_RECIPIENTS }}'
        },
        if: 'steps.regression-analysis.outputs.has_regressions == \'true\''
      });
    }

    return steps;
  }

  /**
   * Create auto-revert steps
   */
  private createAutoRevertSteps(): StepTemplate[] {
    return [
      {
        name: 'Create revert PR',
        uses: 'actions/github-script@v7',
        with: {
          script: `
            const { data: commit } = await github.rest.git.getCommit({
              owner: context.repo.owner,
              repo: context.repo.repo,
              commit_sha: context.sha
            });
            
            const revertMessage = \`Revert "\${commit.message}"\n\nThis reverts commit \${context.sha} due to performance regression.\`;
            
            // Create revert commit
            const { data: revertCommit } = await github.rest.git.createCommit({
              owner: context.repo.owner,
              repo: context.repo.repo,
              message: revertMessage,
              tree: commit.parents[0].sha,
              parents: [context.sha]
            });
            
            // Create branch for revert
            const branchName = \`revert-\${context.sha.substring(0, 7)}\`;
            await github.rest.git.createRef({
              owner: context.repo.owner,
              repo: context.repo.repo,
              ref: \`refs/heads/\${branchName}\`,
              sha: revertCommit.sha
            });
            
            // Create PR
            await github.rest.pulls.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: \`Auto-revert: Performance regression in \${context.sha.substring(0, 7)}\`,
              head: branchName,
              base: context.ref.replace('refs/heads/', ''),
              body: \`This PR automatically reverts commit \${context.sha} due to detected performance regression.\\n\\nRegression count: \\\${{ steps.regression-analysis.outputs.regression_count }}\\n\\nPlease review the performance report before merging.\`
            });
          `
        },
        if: 'steps.regression-analysis.outputs.has_regressions == \'true\' && github.event_name == \'push\''
      }
    ];
  }  /*
*
   * Create load testing setup steps
   */
  private createLoadTestingSetupSteps(): StepTemplate[] {
    const steps: StepTemplate[] = [];

    for (const tool of this.config.loadTesting.tools) {
      switch (tool) {
        case 'k6':
          steps.push({
            name: 'Install k6',
            run: `
              sudo gpg -k
              sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
              echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
              sudo apt-get update
              sudo apt-get install k6
            `
          });
          break;

        case 'artillery':
          steps.push({
            name: 'Install Artillery',
            run: 'npm install -g artillery@latest'
          });
          break;

        case 'jmeter':
          steps.push({
            name: 'Install JMeter',
            run: `
              wget https://archive.apache.org/dist/jmeter/binaries/apache-jmeter-5.6.2.tgz
              tar -xzf apache-jmeter-5.6.2.tgz
              export PATH=$PATH:$(pwd)/apache-jmeter-5.6.2/bin
            `
          });
          break;

        case 'wrk':
          steps.push({
            name: 'Install wrk',
            run: `
              sudo apt-get update
              sudo apt-get install -y build-essential libssl-dev git
              git clone https://github.com/wg/wrk.git
              cd wrk && make && sudo cp wrk /usr/local/bin/
            `
          });
          break;
      }
    }

    return steps;
  }

  /**
   * Create load test scenario steps
   */
  private createLoadTestScenarioSteps(scenario: LoadTestScenario): StepTemplate[] {
    const steps: StepTemplate[] = [];

    // Create scenario-specific test file
    steps.push({
      name: `Generate ${scenario.name} test configuration`,
      run: this.createLoadTestConfigScript(scenario)
    });

    // Execute load test based on tool
    for (const tool of this.config.loadTesting.tools) {
      steps.push({
        name: `Run ${scenario.name} with ${tool}`,
        run: this.createLoadTestExecutionScript(tool, scenario),
        timeout: this.parseTimeoutFromDuration(scenario.duration) + 300 // Add 5 minutes buffer
      });
    }

    return steps;
  }

  /**
   * Create load test results collection script
   */
  private createLoadTestResultsScript(): string {
    return `
#!/bin/bash
set -e

echo "Collecting load test results..."

# Create results directory
mkdir -p load-test-results

# Aggregate results from all tools and scenarios
for result_file in *.json *.xml *.csv; do
  if [ -f "$result_file" ]; then
    echo "Processing $result_file"
    
    # Convert to standard format
    case "$result_file" in
      *.json)
        cp "$result_file" "load-test-results/"
        ;;
      *.xml)
        # Convert JMeter XML to JSON (simplified)
        python3 -c "
import xml.etree.ElementTree as ET
import json
import sys

tree = ET.parse('$result_file')
root = tree.getroot()
results = []

for sample in root.findall('.//httpSample'):
    results.append({
        'timestamp': sample.get('ts'),
        'elapsed': int(sample.get('t', 0)),
        'label': sample.get('lb'),
        'responseCode': sample.get('rc'),
        'success': sample.get('s') == 'true',
        'bytes': int(sample.get('by', 0))
    })

with open('load-test-results/$(basename "$result_file" .xml).json', 'w') as f:
    json.dump(results, f, indent=2)
        "
        ;;
      *.csv)
        # Convert CSV to JSON
        python3 -c "
import csv
import json

results = []
with open('$result_file', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        results.append(row)

with open('load-test-results/$(basename "$result_file" .csv).json', 'w') as f:
    json.dump(results, f, indent=2)
        "
        ;;
    esac
  fi
done

# Generate summary report
python3 << 'EOF'
import json
import os
from pathlib import Path
from statistics import mean, median

def calculate_percentile(data, percentile):
    sorted_data = sorted(data)
    index = int(len(sorted_data) * percentile / 100)
    return sorted_data[min(index, len(sorted_data) - 1)]

summary = {
    'scenarios': [],
    'overall': {
        'total_requests': 0,
        'successful_requests': 0,
        'failed_requests': 0,
        'avg_response_time': 0,
        'p95_response_time': 0,
        'p99_response_time': 0,
        'throughput': 0
    }
}

all_response_times = []
total_requests = 0
successful_requests = 0

for result_file in Path('load-test-results').glob('*.json'):
    with open(result_file) as f:
        data = json.load(f)
    
    if not data:
        continue
    
    response_times = [float(item.get('elapsed', 0)) for item in data if 'elapsed' in item]
    success_count = sum(1 for item in data if item.get('success', True))
    
    scenario_summary = {
        'name': result_file.stem,
        'total_requests': len(data),
        'successful_requests': success_count,
        'failed_requests': len(data) - success_count,
        'success_rate': (success_count / len(data)) * 100 if data else 0,
        'avg_response_time': mean(response_times) if response_times else 0,
        'median_response_time': median(response_times) if response_times else 0,
        'p95_response_time': calculate_percentile(response_times, 95) if response_times else 0,
        'p99_response_time': calculate_percentile(response_times, 99) if response_times else 0
    }
    
    summary['scenarios'].append(scenario_summary)
    all_response_times.extend(response_times)
    total_requests += len(data)
    successful_requests += success_count

# Calculate overall metrics
if all_response_times:
    summary['overall'] = {
        'total_requests': total_requests,
        'successful_requests': successful_requests,
        'failed_requests': total_requests - successful_requests,
        'success_rate': (successful_requests / total_requests) * 100,
        'avg_response_time': mean(all_response_times),
        'median_response_time': median(all_response_times),
        'p95_response_time': calculate_percentile(all_response_times, 95),
        'p99_response_time': calculate_percentile(all_response_times, 99)
    }

# Save summary
with open('load-test-results/summary.json', 'w') as f:
    json.dump(summary, f, indent=2)

print(f"Load test summary: {total_requests} requests, {(successful_requests/total_requests)*100:.1f}% success rate")

EOF

echo "Load test results collection completed"
    `.trim();
  }

  /**
   * Create scaling monitoring steps
   */
  private createScalingMonitoringSteps(): StepTemplate[] {
    return [
      {
        name: 'Monitor scaling metrics',
        run: `
#!/bin/bash
echo "Monitoring scaling metrics during load test..."

# Create scaling metrics directory
mkdir -p scaling-metrics

# Monitor CPU and memory usage
while pgrep -f "load-test" > /dev/null; do
  echo "$(date): $(ps aux | grep -E '(CPU|MEM)' | head -1)" >> scaling-metrics/resource-usage.log
  top -bn1 | grep "Cpu(s)" >> scaling-metrics/cpu-usage.log
  free -m >> scaling-metrics/memory-usage.log
  sleep 10
done

echo "Scaling monitoring completed"
        `,
        if: 'always()'
      },
      {
        name: 'Analyze scaling performance',
        run: this.createScalingAnalysisScript(),
        if: 'always()'
      }
    ];
  }

  /**
   * Create load testing strategy
   */
  private createLoadTestingStrategy(): MatrixStrategy | undefined {
    if (this.config.loadTesting.scenarios.length <= 1) {
      return undefined;
    }

    return {
      matrix: {
        scenario: this.config.loadTesting.scenarios.map(s => s.name)
      },
      failFast: false,
      maxParallel: 3
    };
  }

  /**
   * Create dashboard report script
   */
  private createDashboardReportScript(): string {
    return `
#!/bin/bash
set -e

echo "Generating performance dashboard reports..."

# Create dashboard directory
mkdir -p dashboard-reports

# Aggregate all metrics
python3 << 'EOF'
import json
import os
from pathlib import Path
from datetime import datetime

# Collect all metrics
all_metrics = {
    'timestamp': datetime.now().isoformat(),
    'commit': os.environ.get('GITHUB_SHA', 'unknown'),
    'branch': os.environ.get('GITHUB_REF_NAME', 'unknown'),
    'benchmarks': {},
    'load_tests': {},
    'regressions': {},
    'system_metrics': {}
}

# Load benchmark results
benchmark_files = list(Path('all-metrics').glob('**/benchmark-results*.json'))
for file_path in benchmark_files:
    with open(file_path) as f:
        data = json.load(f)
        all_metrics['benchmarks'][file_path.stem] = data

# Load load test results
loadtest_files = list(Path('all-metrics').glob('**/load-test-results*.json'))
for file_path in loadtest_files:
    with open(file_path) as f:
        data = json.load(f)
        all_metrics['load_tests'][file_path.stem] = data

# Load regression analysis
regression_files = list(Path('all-metrics').glob('**/regression-analysis*.json'))
for file_path in regression_files:
    with open(file_path) as f:
        data = json.load(f)
        all_metrics['regressions'][file_path.stem] = data

# Generate dashboard data
dashboard_data = {
    'metadata': {
        'generated_at': all_metrics['timestamp'],
        'commit': all_metrics['commit'],
        'branch': all_metrics['branch']
    },
    'summary': {
        'total_benchmarks': len(all_metrics['benchmarks']),
        'total_load_tests': len(all_metrics['load_tests']),
        'regressions_found': sum(len(r.get('regressions', [])) for r in all_metrics['regressions'].values()),
        'improvements_found': sum(len(r.get('improvements', [])) for r in all_metrics['regressions'].values())
    },
    'metrics': all_metrics
}

# Save dashboard data
with open('dashboard-reports/dashboard-data.json', 'w') as f:
    json.dump(dashboard_data, f, indent=2)

# Generate HTML dashboard
html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Performance Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .dashboard-header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; }}
        .metrics-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }}
        .metric-card {{ background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
        .metric-value {{ font-size: 2em; font-weight: bold; color: #333; }}
        .metric-label {{ color: #666; margin-top: 5px; }}
        .chart-container {{ width: 100%; height: 300px; margin: 20px 0; }}
    </style>
</head>
<body>
    <div class="dashboard-header">
        <h1>Performance Dashboard</h1>
        <p>Generated: {dashboard_data['metadata']['generated_at']}</p>
        <p>Commit: {dashboard_data['metadata']['commit']}</p>
        <p>Branch: {dashboard_data['metadata']['branch']}</p>
    </div>
    
    <div class="metrics-grid">
        <div class="metric-card">
            <div class="metric-value">{dashboard_data['summary']['total_benchmarks']}</div>
            <div class="metric-label">Benchmarks Executed</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">{dashboard_data['summary']['total_load_tests']}</div>
            <div class="metric-label">Load Tests Completed</div>
        </div>
        <div class="metric-card">
            <div class="metric-value" style="color: {'red' if dashboard_data['summary']['regressions_found'] > 0 else 'green'}">{dashboard_data['summary']['regressions_found']}</div>
            <div class="metric-label">Regressions Found</div>
        </div>
        <div class="metric-card">
            <div class="metric-value" style="color: green">{dashboard_data['summary']['improvements_found']}</div>
            <div class="metric-label">Improvements Found</div>
        </div>
    </div>
    
    <div class="chart-container">
        <canvas id="performanceChart"></canvas>
    </div>
    
    <script>
        // Performance chart implementation would go here
        const ctx = document.getElementById('performanceChart').getContext('2d');
        new Chart(ctx, {{
            type: 'line',
            data: {{
                labels: ['Baseline', 'Current'],
                datasets: [{{
                    label: 'Response Time (ms)',
                    data: [100, 95], // Sample data
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }}]
            }},
            options: {{
                responsive: true,
                maintainAspectRatio: false,
                scales: {{
                    y: {{
                        beginAtZero: true
                    }}
                }}
            }}
        }});
    </script>
</body>
</html>
"""

with open('dashboard-reports/dashboard.html', 'w') as f:
    f.write(html_content)

EOF

echo "Dashboard reports generated"
    `.trim();
  }

  /**
   * Create platform-specific dashboard steps
   */
  private createPlatformDashboardSteps(platform: string): StepTemplate[] {
    const steps: StepTemplate[] = [];

    switch (platform) {
      case 'grafana':
        steps.push({
          name: `Update Grafana dashboard`,
          run: `
            curl -X POST "\${{ secrets.GRAFANA_URL }}/api/dashboards/db" \\
              -H "Authorization: Bearer \${{ secrets.GRAFANA_API_KEY }}" \\
              -H "Content-Type: application/json" \\
              -d @dashboard-reports/dashboard-data.json
          `
        });
        break;

      case 'datadog':
        steps.push({
          name: `Send metrics to Datadog`,
          run: `
            curl -X POST "https://api.datadoghq.com/api/v1/series" \\
              -H "Content-Type: application/json" \\
              -H "DD-API-KEY: \${{ secrets.DATADOG_API_KEY }}" \\
              -d @dashboard-reports/datadog-metrics.json
          `
        });
        break;

      case 'newrelic':
        steps.push({
          name: `Send metrics to New Relic`,
          run: `
            curl -X POST "https://metric-api.newrelic.com/metric/v1" \\
              -H "Content-Type: application/json" \\
              -H "Api-Key: \${{ secrets.NEWRELIC_API_KEY }}" \\
              -d @dashboard-reports/newrelic-metrics.json
          `
        });
        break;
    }

    return steps;
  }

  /**
   * Create dashboard notification steps
   */
  private createDashboardNotificationSteps(): StepTemplate[] {
    const steps: StepTemplate[] = [];

    for (const trigger of this.config.dashboardReporting.notifications.triggers) {
      steps.push({
        name: `Send ${trigger} notification`,
        run: this.createNotificationScript(trigger),
        if: `steps.regression-detection.outputs.${trigger}_detected == 'true'`
      });
    }

    return steps;
  }

  // Helper methods for script generation
  private detectPackageManager(detectionResult: DetectionResult): string {
    const packageManager = detectionResult.packageManagers.find(pm => pm.confidence > 0.8);
    return packageManager?.name || 'npm';
  }

  private createDependencyInstallScript(detectionResult: DetectionResult): string {
    const packageManager = this.detectPackageManager(detectionResult);
    
    switch (packageManager) {
      case 'yarn':
        return 'yarn install --frozen-lockfile';
      case 'pnpm':
        return 'pnpm install --frozen-lockfile';
      default:
        return 'npm ci';
    }
  }

  private createBenchmarkToolsInstallScript(detectionResult: DetectionResult): string {
    const primaryLanguage = detectionResult.languages.find(l => l.primary);
    
    switch (primaryLanguage?.name.toLowerCase()) {
      case 'javascript':
      case 'typescript':
        return 'npm install -g clinic autocannon';
      case 'python':
        return 'pip install pytest-benchmark memory-profiler';
      case 'java':
        return 'echo "JMH benchmarking tools already available"';
      case 'go':
        return 'go install golang.org/x/perf/cmd/benchstat@latest';
      case 'rust':
        return 'cargo install cargo-criterion';
      default:
        return 'echo "No specific benchmarking tools needed"';
    }
  }

  private createFrameworkBenchmarkSteps(frameworkName: string): StepTemplate[] {
    const steps: StepTemplate[] = [];

    switch (frameworkName.toLowerCase()) {
      case 'react':
        steps.push({
          name: 'Run React performance benchmarks',
          run: `
            npm run build
            npx lighthouse-ci autorun --collect.numberOfRuns=3 --assert.assertions.categories:performance=0.8
          `
        });
        break;

      case 'express':
        steps.push({
          name: 'Run Express API benchmarks',
          run: `
            npm start &
            sleep 10
            autocannon -c 100 -d 30 http://localhost:3000/api/health
            pkill -f "npm start"
          `
        });
        break;

      case 'django':
        steps.push({
          name: 'Run Django benchmarks',
          run: `
            python manage.py runserver &
            sleep 10
            ab -n 1000 -c 10 http://127.0.0.1:8000/
            pkill -f "python manage.py runserver"
          `
        });
        break;
    }

    return steps;
  }

  private createLoadTestConfigScript(scenario: LoadTestScenario): string {
    return `
#!/bin/bash
echo "Generating ${scenario.name} test configuration..."

# Create k6 test script
cat > ${scenario.name}-k6.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '${scenario.rampUp}', target: ${scenario.virtualUsers} },
    { duration: '${scenario.duration}', target: ${scenario.virtualUsers} },
    { duration: '30s', target: 0 },
  ],
};

export default function() {
  ${scenario.targets.map(target => `
  let response = http.get('${target}');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  `).join('\n')}
  
  sleep(1);
}
EOF

# Create Artillery test script
cat > ${scenario.name}-artillery.yml << 'EOF'
config:
  target: '${scenario.targets[0] || 'http://localhost:3000'}'
  phases:
    - duration: ${this.parseDurationToSeconds(scenario.duration)}
      arrivalRate: ${Math.floor(scenario.virtualUsers / 10)}
scenarios:
  - name: "${scenario.name}"
    requests:
      ${scenario.targets.map(target => `- get:\n        url: "${target}"`).join('\n      ')}
EOF

echo "Test configuration generated for ${scenario.name}"
    `.trim();
  }

  private createLoadTestExecutionScript(tool: string, scenario: LoadTestScenario): string {
    switch (tool) {
      case 'k6':
        return `k6 run --out json=${scenario.name}-k6-results.json ${scenario.name}-k6.js`;
      case 'artillery':
        return `artillery run --output ${scenario.name}-artillery-results.json ${scenario.name}-artillery.yml`;
      case 'jmeter':
        return `jmeter -n -t ${scenario.name}.jmx -l ${scenario.name}-jmeter-results.jtl`;
      case 'wrk':
        return `wrk -t12 -c${scenario.virtualUsers} -d${scenario.duration} --latency ${scenario.targets[0]} > ${scenario.name}-wrk-results.txt`;
      default:
        return `echo "Unknown load testing tool: ${tool}"`;
    }
  }

  private createScalingAnalysisScript(): string {
    return `
#!/bin/bash
echo "Analyzing scaling performance..."

python3 << 'EOF'
import json
import re
from pathlib import Path

# Analyze resource usage logs
cpu_usage = []
memory_usage = []

if Path('scaling-metrics/cpu-usage.log').exists():
    with open('scaling-metrics/cpu-usage.log') as f:
        for line in f:
            match = re.search(r'(\d+\.\d+)%us', line)
            if match:
                cpu_usage.append(float(match.group(1)))

if Path('scaling-metrics/memory-usage.log').exists():
    with open('scaling-metrics/memory-usage.log') as f:
        for line in f:
            if 'Mem:' in line:
                parts = line.split()
                if len(parts) >= 3:
                    used = int(parts[2])
                    total = int(parts[1])
                    memory_usage.append((used / total) * 100)

# Generate scaling report
scaling_report = {
    'cpu_metrics': {
        'avg_usage': sum(cpu_usage) / len(cpu_usage) if cpu_usage else 0,
        'max_usage': max(cpu_usage) if cpu_usage else 0,
        'min_usage': min(cpu_usage) if cpu_usage else 0
    },
    'memory_metrics': {
        'avg_usage': sum(memory_usage) / len(memory_usage) if memory_usage else 0,
        'max_usage': max(memory_usage) if memory_usage else 0,
        'min_usage': min(memory_usage) if memory_usage else 0
    },
    'scaling_efficiency': 'good' if (max(cpu_usage) if cpu_usage else 0) < 80 else 'needs_improvement'
}

with open('scaling-metrics/scaling-report.json', 'w') as f:
    json.dump(scaling_report, f, indent=2)

print(f"Scaling analysis completed. Efficiency: {scaling_report['scaling_efficiency']}")
EOF
    `.trim();
  }

  private createDatabaseUploadScript(): string {
    return `
#!/bin/bash
echo "Uploading metrics to database..."

python3 << 'EOF'
import json
import os
import psycopg2
from pathlib import Path

# Connect to database
conn = psycopg2.connect(os.environ['DB_CONNECTION_STRING'])
cur = conn.cursor()

# Upload metrics
for metrics_file in Path('aggregated-metrics').glob('*.json'):
    with open(metrics_file) as f:
        metrics = json.load(f)
    
    for metric in metrics:
        cur.execute(
            f"INSERT INTO {os.environ['DB_TABLE']} (name, value, unit, timestamp, commit_sha, branch) VALUES (%s, %s, %s, %s, %s, %s)",
            (metric['name'], metric['value'], metric.get('unit', ''), metric['timestamp'], os.environ.get('GITHUB_SHA'), os.environ.get('GITHUB_REF_NAME'))
        )

conn.commit()
cur.close()
conn.close()

print("Metrics uploaded to database")
EOF
    `.trim();
  }

  private createNotificationScript(trigger: string): string {
    return `
#!/bin/bash
echo "Sending ${trigger} notification..."

# Implementation would depend on the specific trigger and notification channels
case "${trigger}" in
  regression)
    echo "Performance regression detected - sending alerts"
    ;;
  improvement)
    echo "Performance improvement detected - sending positive notification"
    ;;
  threshold)
    echo "Performance threshold exceeded - sending warning"
    ;;
  anomaly)
    echo "Performance anomaly detected - sending investigation alert"
    ;;
esac
    `.trim();
  }

  // Utility methods
  private parseTimeoutFromDuration(duration: string): number {
    const match = duration.match(/(\d+)([smh])/);
    if (!match || !match[1]) {return 300;} // 5 minutes default

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      default: return 300;
    }
  }

  private parseDurationToSeconds(duration: string): number {
    return this.parseTimeoutFromDuration(duration);
  }

  /**
   * Merge configuration with defaults
   */
  private mergeWithDefaults(config?: Partial<PerformanceMonitoringConfig>): PerformanceMonitoringConfig {
    const defaults: PerformanceMonitoringConfig = {
      benchmarkExecution: {
        enabled: true,
        frameworks: [],
        testSuites: ['unit', 'integration'],
        iterations: 10,
        warmupRuns: 3,
        timeout: 1800, // 30 minutes
        parallelExecution: true,
        customBenchmarks: []
      },
      metricsCollection: {
        enabled: true,
        storage: 'github-artifacts',
        retention: 30,
        metrics: ['response-time', 'throughput', 'memory-usage', 'cpu-usage'],
        aggregation: 'mean',
        exportFormats: ['json']
      },
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
        autoRevert: false
      },
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
            assertions: [
              { metric: 'http_req_duration', condition: 'lt', value: 500 }
            ]
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
      },
      dashboardReporting: {
        enabled: true,
        platforms: ['custom'],
        updateFrequency: 'daily',
        reports: [
          {
            name: 'Performance Summary',
            type: 'summary',
            metrics: ['response-time', 'throughput', 'error-rate'],
            timeRange: '7d',
            format: 'html',
            recipients: []
          }
        ],
        notifications: {
          enabled: true,
          triggers: ['regression'],
          channels: ['slack'],
          frequency: 'immediate'
        }
      }
    };

    return {
      benchmarkExecution: { ...defaults.benchmarkExecution, ...config?.benchmarkExecution },
      metricsCollection: { ...defaults.metricsCollection, ...config?.metricsCollection },
      regressionDetection: { 
        ...defaults.regressionDetection, 
        ...config?.regressionDetection,
        thresholds: { ...defaults.regressionDetection.thresholds, ...config?.regressionDetection?.thresholds },
        alerting: { ...defaults.regressionDetection.alerting, ...config?.regressionDetection?.alerting }
      },
      loadTesting: { 
        ...defaults.loadTesting, 
        ...config?.loadTesting,
        scaling: { ...defaults.loadTesting.scaling, ...config?.loadTesting?.scaling },
        monitoring: { ...defaults.loadTesting.monitoring, ...config?.loadTesting?.monitoring }
      },
      dashboardReporting: { 
        ...defaults.dashboardReporting, 
        ...config?.dashboardReporting,
        notifications: { ...defaults.dashboardReporting.notifications, ...config?.dashboardReporting?.notifications }
      }
    };
  }
}