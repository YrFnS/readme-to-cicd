/**
 * Monitoring Generator for comprehensive workflow monitoring and observability
 */

import { DetectionResult, GenerationOptions, WorkflowOutput } from '../interfaces';

/**
 * Alert channel types
 */
export type AlertChannel = 'slack' | 'email' | 'webhook' | 'pagerduty' | 'teams';

/**
 * Alert rule configuration
 */
export interface AlertRule {
  name: string;
  condition: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  channels: AlertChannel[];
  enabled: boolean;
}

/**
 * Workflow metrics configuration
 */
export interface WorkflowMetricsConfig {
  enabled: boolean;
  collectExecutionTime: boolean;
  collectResourceUsage: boolean;
  collectJobMetrics: boolean;
  collectFailureMetrics: boolean;
  collectStepMetrics: boolean;
  metricsStorage: 'github-artifacts' | 'prometheus' | 'datadog';
  retentionDays: number;
  aggregationInterval: string;
}

/**
 * Alerting configuration
 */
export interface AlertingConfig {
  enabled: boolean;
  channels: any[];
  rules: AlertRule[];
  escalation: any;
  suppressionRules?: any[];
}

/**
 * Dashboard integration configuration
 */
export interface DashboardIntegrationConfig {
  enabled: boolean;
  platforms: any[];
  updateFrequency: string;
  dashboards?: any[];
}

/**
 * Structured logging configuration
 */
export interface StructuredLoggingConfig {
  enabled: boolean;
  format: 'json' | 'structured' | 'plain';
  level?: string;
  fields?: any[];
  forwarding: any;
  correlation: any;
}

/**
 * SLA tracking configuration
 */
export interface SLATrackingConfig {
  enabled: boolean;
  slas?: any[];
  reporting: any;
  alerting: any;
  customDefinitions?: Record<string, any>;
}

/**
 * Comprehensive monitoring configuration
 */
export interface ComprehensiveMonitoringConfig {
  workflowMetrics: WorkflowMetricsConfig;
  alerting: AlertingConfig;
  dashboardIntegration: DashboardIntegrationConfig;
  structuredLogging: StructuredLoggingConfig;
  slaTracking: SLATrackingConfig;
}

/**
 * Default monitoring configuration
 */
const DEFAULT_MONITORING_CONFIG: ComprehensiveMonitoringConfig = {
  workflowMetrics: {
    enabled: true,
    collectExecutionTime: true,
    collectResourceUsage: true,
    collectJobMetrics: true,
    collectFailureMetrics: true,
    collectStepMetrics: false,
    metricsStorage: 'github-artifacts',
    retentionDays: 30,
    aggregationInterval: '5m'
  },
  alerting: {
    enabled: true,
    channels: ['slack'],
    rules: [],
    escalation: false,
    suppressionRules: []
  },
  dashboardIntegration: {
    enabled: true,
    platforms: ['grafana'],
    updateFrequency: 'on-completion',
    dashboards: []
  },
  structuredLogging: {
    enabled: true,
    format: 'json',
    level: 'info',
    fields: [],
    forwarding: false,
    correlation: false
  },
  slaTracking: {
    enabled: true,
    slas: [],
    reporting: true,
    alerting: true,
    customDefinitions: {}
  }
};

/**
 * Monitoring Generator class
 */
export class MonitoringGenerator {
  private config: ComprehensiveMonitoringConfig;

  constructor(config?: Partial<ComprehensiveMonitoringConfig>) {
    this.config = this.mergeConfig(DEFAULT_MONITORING_CONFIG, config || {});
  }

  /**
   * Generate comprehensive monitoring workflow
   */
  generateMonitoringWorkflow(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): any {
    const jobs: any[] = [];

    // Add workflow metrics job if enabled
    if (this.config.workflowMetrics.enabled) {
      jobs.push(this.createWorkflowMetricsJob());
    }

    // Add alerting job if enabled
    if (this.config.alerting.enabled) {
      jobs.push(this.createAlertingJob());
    }

    // Add dashboard integration job if enabled
    if (this.config.dashboardIntegration.enabled) {
      jobs.push(this.createDashboardIntegrationJob());
    }

    // Add structured logging job if enabled
    if (this.config.structuredLogging.enabled) {
      jobs.push(this.createStructuredLoggingJob());
    }

    // Add SLA tracking job if enabled
    if (this.config.slaTracking.enabled) {
      jobs.push(this.createSLATrackingJob());
    }

    return {
      name: 'Monitoring and Observability',
      type: 'ci',
      jobs,
      triggers: {
        workflowRun: {
          workflows: ['*'],
          types: ['completed']
        },
        schedule: [
          { cron: '*/5 * * * *' }, // Every 5 minutes
          { cron: '0 * * * *' },   // Hourly
          { cron: '0 0 * * *' }    // Daily
        ],
        workflowDispatch: {
          inputs: {
            monitoring_type: {
              description: 'Type of monitoring to run',
              required: false,
              default: 'standard',
              type: 'choice',
              options: ['minimal', 'standard', 'comprehensive']
            },
            time_range: {
              description: 'Time range for metrics collection',
              required: false,
              default: '24h',
              type: 'choice',
              options: ['1h', '6h', '24h', '7d']
            }
          }
        }
      },
      permissions: {
        contents: 'read',
        actions: 'read',
        checks: 'write',
        pullRequests: 'write',
        issues: 'write',
        packages: 'read',
        deployments: 'read'
      },
      concurrency: {
        group: 'monitoring-${{ github.ref }}',
        cancelInProgress: false
      }
    };
  }

  /**
   * Create workflow metrics job
   */
  private createWorkflowMetricsJob(): any {
    const steps: any[] = [
      {
        name: 'Initialize metrics collection',
        run: 'echo "Initializing workflow metrics collection"',
        env: {
          GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}',
          WORKFLOW_RUN_ID: '${{ github.run_id }}'
        }
      }
    ];

    if (this.config.workflowMetrics.collectExecutionTime) {
      steps.push({
        name: 'Track execution time',
        run: 'echo "START_TIME=$(date +%s)" >> $GITHUB_ENV'
      });
    }

    if (this.config.workflowMetrics.collectResourceUsage) {
      steps.push({
        name: 'Monitor resource usage',
        run: 'echo "Monitoring resource usage"'
      });
    }

    if (this.config.workflowMetrics.collectJobMetrics) {
      steps.push({
        name: 'Collect job metrics',
        run: 'echo "Collecting job-level metrics"'
      });
    }

    if (this.config.workflowMetrics.collectFailureMetrics) {
      steps.push({
        name: 'Collect failure metrics',
        run: 'echo "Tracking failure metrics"',
        if: 'failure()'
      });
    }

    if (this.config.workflowMetrics.collectStepMetrics) {
      steps.push({
        name: 'Collect step metrics',
        run: 'echo "Collecting step-level metrics"'
      });
    }

    // Add storage step based on configuration
    if (this.config.workflowMetrics.metricsStorage === 'prometheus') {
      steps.push({
        name: 'Push metrics to Prometheus',
        run: 'echo "Pushing metrics to Prometheus"',
        env: {
          PROMETHEUS_GATEWAY_URL: '${{ secrets.PROMETHEUS_GATEWAY_URL }}'
        },
        if: 'always()'
      });
    } else if (this.config.workflowMetrics.metricsStorage === 'datadog') {
      steps.push({
        name: 'Send metrics to Datadog',
        run: 'echo "Sending metrics to Datadog"',
        env: {
          DD_API_KEY: '${{ secrets.DD_API_KEY }}'
        },
        if: 'always()'
      });
    } else {
      // Default to GitHub artifacts
      steps.push({
        name: 'Upload workflow metrics',
        uses: 'actions/upload-artifact@v4',
        with: {
          name: 'workflow-metrics',
          path: 'metrics/'
        },
        if: 'always()'
      });
    }

    return {
      name: 'workflow-metrics',
      'runs-on': 'ubuntu-latest',
      if: 'always()',
      steps
    };
  }

  /**
   * Create alerting job
   */
  private createAlertingJob(): any {
    const steps: any[] = [
      {
        name: 'Evaluate alert conditions',
        run: 'echo "Evaluating alert conditions"',
        env: {
          ALERT_RULES: '${{ toJSON(vars.ALERT_RULES) }}'
        }
      }
    ];

    // Handle different channel configurations
    if (Array.isArray(this.config.alerting.channels) && this.config.alerting.channels.length > 0) {
      // Check if it's the new format with channel objects or simple strings
      const firstChannel = this.config.alerting.channels[0];
      if (typeof firstChannel === 'object' && firstChannel.type) {
        // New format with channel objects
        this.config.alerting.channels.forEach((channel: any) => {
          if (channel.type === 'slack') {
            steps.push({
              name: `Send Slack alert to ${channel.name}`,
              uses: '8398a7/action-slack@v3',
              with: {
                status: '${{ job.status }}',
                webhook_url: channel.config.webhook_url
              },
              if: 'steps.evaluate-alerts.outputs.alerts_count > 0'
            });
          } else if (channel.type === 'email') {
            steps.push({
              name: `Send email alert to ${channel.name}`,
              run: 'echo "Sending email alert"',
              if: 'steps.evaluate-alerts.outputs.alerts_count > 0'
            });
          } else if (channel.type === 'pagerduty') {
            steps.push({
              name: `Send PagerDuty alert to ${channel.name}`,
              run: 'echo "Sending PagerDuty alert"',
              if: 'steps.evaluate-alerts.outputs.alerts_count > 0'
            });
          } else if (channel.type === 'webhook') {
            steps.push({
              name: `Send webhook alert to ${channel.name}`,
              run: 'echo "Sending webhook alert"',
              if: 'steps.evaluate-alerts.outputs.alerts_count > 0'
            });
          }
        });
      } else {
        // Legacy format with simple channel names
        if (this.config.alerting.channels.includes('slack')) {
          steps.push({
            name: 'Send Slack alert',
            uses: '8398a7/action-slack@v3',
            with: {
              status: '${{ job.status }}',
              webhook_url: '${{ secrets.SLACK_WEBHOOK }}'
            },
            if: 'steps.evaluate-alerts.outputs.alerts_count > 0'
          });
        }
      }
    }

    if (this.config.alerting.escalation && this.config.alerting.escalation.enabled) {
      steps.push({
        name: 'Handle escalation',
        run: 'echo "Handling alert escalation"',
        if: 'steps.evaluate-alerts.outputs.escalation_required == \'true\''
      });
    }

    return {
      name: 'alerting',
      'runs-on': 'ubuntu-latest',
      if: 'always()',
      needs: ['workflow-metrics'],
      steps
    };
  }

  /**
   * Create dashboard integration job
   */
  private createDashboardIntegrationJob(): any {
    const steps: any[] = [
      {
        name: 'Prepare dashboard data',
        run: 'echo "Preparing dashboard data"'
      }
    ];

    // Handle different platform configurations
    if (Array.isArray(this.config.dashboardIntegration.platforms) && this.config.dashboardIntegration.platforms.length > 0) {
      // Check if it's the new format with platform objects or simple strings
      const firstPlatform = this.config.dashboardIntegration.platforms[0];
      if (typeof firstPlatform === 'object' && firstPlatform.type) {
        // New format with platform objects
        this.config.dashboardIntegration.platforms.forEach((platform: any) => {
          if (platform.enabled !== false) {
            if (platform.type === 'grafana') {
              steps.push({
                name: `Update Grafana dashboard - ${platform.name}`,
                run: 'echo "Updating Grafana dashboard"'
              });
            } else if (platform.type === 'datadog') {
              steps.push({
                name: `Update Datadog dashboard - ${platform.name}`,
                run: 'echo "Updating Datadog dashboard"'
              });
            } else if (platform.type === 'newrelic') {
              steps.push({
                name: `Update New Relic dashboard - ${platform.name}`,
                run: 'echo "Updating New Relic dashboard"'
              });
            }
          }
        });
      } else {
        // Legacy format with simple platform names
        if (this.config.dashboardIntegration.platforms.includes('grafana')) {
          steps.push({
            name: 'Update Grafana dashboard',
            run: 'echo "Updating Grafana dashboard"'
          });
        }
      }
    }

    return {
      name: 'dashboard-integration',
      'runs-on': 'ubuntu-latest',
      if: 'always()',
      needs: ['workflow-metrics'],
      steps
    };
  }

  /**
   * Create structured logging job
   */
  private createStructuredLoggingJob(): any {
    const steps: any[] = [
      {
        name: 'Initialize structured logging',
        run: 'echo "Initializing structured logging"',
        env: {
          LOG_FORMAT: 'json',
          LOG_LEVEL: 'info',
          CORRELATION_ENABLED: 'true'
        }
      },
      {
        name: 'Collect workflow logs',
        run: 'echo "Collecting structured logs"'
      }
    ];

    if (this.config.structuredLogging.forwarding) {
      steps.push({
        name: 'Forward logs',
        run: 'echo "Forwarding logs to external system"'
      });
    }

    if (this.config.structuredLogging.correlation) {
      steps.push({
        name: 'Add correlation IDs',
        run: 'echo "Adding correlation IDs to logs"'
      });
    }

    return {
      name: 'structured-logging',
      'runs-on': 'ubuntu-latest',
      if: 'always()',
      steps
    };
  }

  /**
   * Create SLA tracking job
   */
  private createSLATrackingJob(): any {
    const steps: any[] = [
      {
        name: 'Calculate SLA metrics',
        run: 'echo "Calculating SLA metrics"',
        env: {
          SLA_DEFINITIONS: '${{ toJSON(vars.SLA_DEFINITIONS) }}'
        }
      },
      {
        name: 'Update SLA dashboard',
        run: 'echo "Updating SLA dashboard"',
        if: 'steps.calculate-sla.outputs.sla_updated == \'true\''
      }
    ];

    // Handle reporting configuration
    if (this.config.slaTracking.reporting && 
        (this.config.slaTracking.reporting === true || this.config.slaTracking.reporting.enabled)) {
      steps.push({
        name: 'Generate SLA report',
        run: 'echo "Generating SLA report"',
        if: 'steps.calculate-sla.outputs.report_due == \'true\''
      });
    }

    // Handle alerting configuration
    if (this.config.slaTracking.alerting && 
        (this.config.slaTracking.alerting === true || this.config.slaTracking.alerting.enabled)) {
      steps.push({
        name: 'Check SLA violations',
        run: 'echo "Checking for SLA violations"',
        if: 'steps.calculate-sla.outputs.violations_detected == \'true\''
      });
    }

    return {
      name: 'sla-tracking',
      'runs-on': 'ubuntu-latest',
      if: 'always()',
      needs: ['workflow-metrics'],
      steps
    };
  }

  /**
   * Generate workflow YAML content
   */
  private generateWorkflowYAML(jobs: any[]): string {
    const workflow = {
      name: 'Monitoring Workflow',
      on: {
        workflow_run: {
          workflows: ['*'],
          types: ['completed']
        },
        schedule: [
          { cron: '0 */6 * * *' }
        ],
        workflow_dispatch: {
          inputs: {
            monitoring_level: {
              description: 'Monitoring level',
              required: false,
              default: 'standard',
              type: 'choice',
              options: ['minimal', 'standard', 'comprehensive']
            }
          }
        }
      },
      permissions: {
        contents: 'read',
        actions: 'read',
        checks: 'read',
        'pull-requests': 'read'
      },
      jobs: jobs.reduce((acc, job) => {
        acc[job.name] = {
          'runs-on': job['runs-on'],
          ...(job.if && { if: job.if }),
          steps: job.steps
        };
        return acc;
      }, {} as Record<string, any>)
    };

    return `# Generated Monitoring Workflow
# Generated at: ${new Date().toISOString()}

${JSON.stringify(workflow, null, 2)}`;
  }

  /**
   * Create detection summary
   */
  private createDetectionSummary(detectionResult: DetectionResult): string {
    const languages = detectionResult.languages?.map(l => l.name).join(', ') || 'Unknown';
    const frameworks = detectionResult.frameworks?.map(f => f.name).join(', ') || 'None';
    return `Languages: ${languages}, Frameworks: ${frameworks}`;
  }

  /**
   * Merge configuration with defaults
   */
  private mergeConfig(
    defaultConfig: ComprehensiveMonitoringConfig,
    userConfig: Partial<ComprehensiveMonitoringConfig>
  ): ComprehensiveMonitoringConfig {
    return {
      workflowMetrics: { ...defaultConfig.workflowMetrics, ...userConfig.workflowMetrics },
      alerting: { ...defaultConfig.alerting, ...userConfig.alerting },
      dashboardIntegration: { ...defaultConfig.dashboardIntegration, ...userConfig.dashboardIntegration },
      structuredLogging: { ...defaultConfig.structuredLogging, ...userConfig.structuredLogging },
      slaTracking: { ...defaultConfig.slaTracking, ...userConfig.slaTracking }
    };
  }
}