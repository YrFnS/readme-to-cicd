/**
 * Tests for MonitoringGenerator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  MonitoringGenerator,
  ComprehensiveMonitoringConfig,
  WorkflowMetricsConfig,
  AlertingConfig,
  DashboardIntegrationConfig,
  StructuredLoggingConfig,
  SLATrackingConfig,
  AlertChannel,
  AlertRule
} from '../../../../src/generator/workflow-specialization/monitoring-generator';
import { DetectionResult, GenerationOptions } from '../../../../src/generator/interfaces';

describe('MonitoringGenerator', () => {
  let generator: MonitoringGenerator;
  let mockDetectionResult: DetectionResult;
  let mockOptions: GenerationOptions;

  beforeEach(() => {
    generator = new MonitoringGenerator();
    
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
      workflowType: 'ci',
      optimizationLevel: 'standard',
      includeComments: true,
      securityLevel: 'standard'
    };
  });

  describe('constructor', () => {
    it('should create generator with default configuration', () => {
      const gen = new MonitoringGenerator();
      expect(gen).toBeInstanceOf(MonitoringGenerator);
    });

    it('should create generator with custom configuration', () => {
      const customConfig: Partial<ComprehensiveMonitoringConfig> = {
        workflowMetrics: {
          enabled: false,
          collectExecutionTime: false,
          collectResourceUsage: false,
          collectJobMetrics: false,
          collectStepMetrics: false,
          collectFailureMetrics: false,
          metricsStorage: 'prometheus',
          retentionDays: 7,
          aggregationInterval: '1m'
        }
      };

      const gen = new MonitoringGenerator(customConfig);
      expect(gen).toBeInstanceOf(MonitoringGenerator);
    });
  });

  describe('generateMonitoringWorkflow', () => {
    it('should generate complete monitoring workflow', () => {
      const workflow = generator.generateMonitoringWorkflow(mockDetectionResult, mockOptions);

      expect(workflow.name).toBe('Monitoring and Observability');
      expect(workflow.type).toBe('ci');
      expect(workflow.jobs).toBeDefined();
      expect(workflow.jobs.length).toBeGreaterThan(0);
      expect(workflow.triggers).toBeDefined();
      expect(workflow.permissions).toBeDefined();
      expect(workflow.concurrency).toBeDefined();
      expect(workflow.concurrency?.group).toBe('monitoring-${{ github.ref }}');
      expect(workflow.concurrency?.cancelInProgress).toBe(false);
    });

    it('should include workflow metrics job when enabled', () => {
      const workflow = generator.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      
      const metricsJob = workflow.jobs.find(job => job.name === 'workflow-metrics');
      expect(metricsJob).toBeDefined();
      expect(metricsJob?.steps).toBeDefined();
      expect(metricsJob?.steps.length).toBeGreaterThan(0);
      expect(metricsJob?.if).toBe('always()');
    });

    it('should include alerting job when enabled', () => {
      const workflow = generator.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      
      const alertingJob = workflow.jobs.find(job => job.name === 'alerting');
      expect(alertingJob).toBeDefined();
      expect(alertingJob?.needs).toContain('workflow-metrics');
      expect(alertingJob?.if).toBe('always()');
    });

    it('should include dashboard integration job when enabled', () => {
      const workflow = generator.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      
      const dashboardJob = workflow.jobs.find(job => job.name === 'dashboard-integration');
      expect(dashboardJob).toBeDefined();
      expect(dashboardJob?.needs).toContain('workflow-metrics');
      expect(dashboardJob?.if).toBe('always()');
    });

    it('should include structured logging job when enabled', () => {
      const workflow = generator.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      
      const loggingJob = workflow.jobs.find(job => job.name === 'structured-logging');
      expect(loggingJob).toBeDefined();
      expect(loggingJob?.if).toBe('always()');
    });

    it('should include SLA tracking job when enabled', () => {
      const workflow = generator.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      
      const slaJob = workflow.jobs.find(job => job.name === 'sla-tracking');
      expect(slaJob).toBeDefined();
      expect(slaJob?.needs).toContain('workflow-metrics');
      expect(slaJob?.if).toBe('always()');
    });

    it('should skip disabled components', () => {
      const customConfig: Partial<ComprehensiveMonitoringConfig> = {
        workflowMetrics: { enabled: false } as WorkflowMetricsConfig,
        alerting: { enabled: false } as AlertingConfig
      };

      const gen = new MonitoringGenerator(customConfig);
      const workflow = gen.generateMonitoringWorkflow(mockDetectionResult, mockOptions);

      const metricsJob = workflow.jobs.find(job => job.name === 'workflow-metrics');
      const alertingJob = workflow.jobs.find(job => job.name === 'alerting');
      
      expect(metricsJob).toBeUndefined();
      expect(alertingJob).toBeUndefined();
    });
  });

  describe('workflow metrics collection', () => {
    it('should create metrics initialization step', () => {
      const workflow = generator.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      const metricsJob = workflow.jobs.find(job => job.name === 'workflow-metrics');
      
      const initStep = metricsJob?.steps.find(step => step.name === 'Initialize metrics collection');
      expect(initStep).toBeDefined();
      expect(initStep?.run).toBeDefined();
      expect(initStep?.env).toBeDefined();
      expect(initStep?.env?.GITHUB_TOKEN).toBe('${{ secrets.GITHUB_TOKEN }}');
      expect(initStep?.env?.WORKFLOW_RUN_ID).toBe('${{ github.run_id }}');
    });

    it('should include execution time tracking when enabled', () => {
      const workflow = generator.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      const metricsJob = workflow.jobs.find(job => job.name === 'workflow-metrics');
      
      const trackingStep = metricsJob?.steps.find(step => step.name === 'Track execution time');
      expect(trackingStep).toBeDefined();
      expect(trackingStep?.run).toBeDefined();
    });

    it('should include resource usage monitoring when enabled', () => {
      const workflow = generator.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      const metricsJob = workflow.jobs.find(job => job.name === 'workflow-metrics');
      
      const resourceStep = metricsJob?.steps.find(step => step.name === 'Monitor resource usage');
      expect(resourceStep).toBeDefined();
      expect(resourceStep?.run).toBeDefined();
    });

    it('should include job metrics collection when enabled', () => {
      const workflow = generator.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      const metricsJob = workflow.jobs.find(job => job.name === 'workflow-metrics');
      
      const jobStep = metricsJob?.steps.find(step => step.name === 'Collect job metrics');
      expect(jobStep).toBeDefined();
      expect(jobStep?.run).toBeDefined();
    });

    it('should include failure metrics collection when enabled', () => {
      const workflow = generator.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      const metricsJob = workflow.jobs.find(job => job.name === 'workflow-metrics');
      
      const failureStep = metricsJob?.steps.find(step => step.name === 'Collect failure metrics');
      expect(failureStep).toBeDefined();
      expect(failureStep?.run).toBeDefined();
      expect(failureStep?.if).toBe('failure()');
    });

    it('should include GitHub artifacts upload by default', () => {
      const workflow = generator.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      const metricsJob = workflow.jobs.find(job => job.name === 'workflow-metrics');
      
      const uploadStep = metricsJob?.steps.find(step => step.name === 'Upload workflow metrics');
      expect(uploadStep).toBeDefined();
      expect(uploadStep?.uses).toBe('actions/upload-artifact@v4');
      expect(uploadStep?.if).toBe('always()');
    });

    it('should skip step metrics collection by default', () => {
      const workflow = generator.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      const metricsJob = workflow.jobs.find(job => job.name === 'workflow-metrics');
      
      const stepMetricsStep = metricsJob?.steps.find(step => step.name === 'Collect step metrics');
      expect(stepMetricsStep).toBeUndefined();
    });

    it('should include step metrics collection when enabled', () => {
      const customConfig: Partial<ComprehensiveMonitoringConfig> = {
        workflowMetrics: {
          enabled: true,
          collectExecutionTime: true,
          collectResourceUsage: true,
          collectJobMetrics: true,
          collectStepMetrics: true,
          collectFailureMetrics: true,
          metricsStorage: 'github-artifacts',
          retentionDays: 30,
          aggregationInterval: '5m'
        }
      };

      const gen = new MonitoringGenerator(customConfig);
      const workflow = gen.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      const metricsJob = workflow.jobs.find(job => job.name === 'workflow-metrics');
      
      const stepMetricsStep = metricsJob?.steps.find(step => step.name === 'Collect step metrics');
      expect(stepMetricsStep).toBeDefined();
    });
  });

  describe('alerting system', () => {
    it('should create alert evaluation step', () => {
      const workflow = generator.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      const alertingJob = workflow.jobs.find(job => job.name === 'alerting');
      
      const evalStep = alertingJob?.steps.find(step => step.name === 'Evaluate alert conditions');
      expect(evalStep).toBeDefined();
      expect(evalStep?.run).toBeDefined();
      expect(evalStep?.env?.ALERT_RULES).toBeDefined();
    });

    it('should include Slack alerting by default', () => {
      const workflow = generator.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      const alertingJob = workflow.jobs.find(job => job.name === 'alerting');
      
      const slackStep = alertingJob?.steps.find(step => step.name?.includes('Slack alert'));
      expect(slackStep).toBeDefined();
      expect(slackStep?.if).toBe('steps.evaluate-alerts.outputs.alerts_count > 0');
    });

    it('should include escalation handling when enabled', () => {
      const customConfig: Partial<ComprehensiveMonitoringConfig> = {
        alerting: {
          enabled: true,
          channels: [],
          rules: [],
          escalation: {
            enabled: true,
            levels: [
              { level: 1, channels: ['slack'], delay: '15m' }
            ],
            timeout: '1h'
          },
          suppressionRules: []
        }
      };

      const gen = new MonitoringGenerator(customConfig);
      const workflow = gen.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      const alertingJob = workflow.jobs.find(job => job.name === 'alerting');
      
      const escalationStep = alertingJob?.steps.find(step => step.name === 'Handle escalation');
      expect(escalationStep).toBeDefined();
      expect(escalationStep?.if).toBe('steps.evaluate-alerts.outputs.escalation_required == \'true\'');
    });

    it('should support multiple alert channels', () => {
      const customConfig: Partial<ComprehensiveMonitoringConfig> = {
        alerting: {
          enabled: true,
          channels: [
            {
              type: 'slack',
              name: 'dev-alerts',
              config: { webhook_url: '${{ secrets.SLACK_WEBHOOK_URL }}' },
              severity: ['medium', 'high', 'critical']
            },
            {
              type: 'email',
              name: 'team-email',
              config: { recipients: ['team@company.com'] },
              severity: ['high', 'critical']
            },
            {
              type: 'pagerduty',
              name: 'oncall',
              config: { integration_key: '${{ secrets.PAGERDUTY_KEY }}' },
              severity: ['critical']
            }
          ],
          rules: [],
          escalation: { enabled: false, levels: [], timeout: '1h' },
          suppressionRules: []
        }
      };

      const gen = new MonitoringGenerator(customConfig);
      const workflow = gen.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      const alertingJob = workflow.jobs.find(job => job.name === 'alerting');
      
      const slackStep = alertingJob?.steps.find(step => step.name?.includes('Slack alert to dev-alerts'));
      const emailStep = alertingJob?.steps.find(step => step.name?.includes('email alert to team-email'));
      const pagerdutyStep = alertingJob?.steps.find(step => step.name?.includes('PagerDuty alert to oncall'));
      
      expect(slackStep).toBeDefined();
      expect(emailStep).toBeDefined();
      expect(pagerdutyStep).toBeDefined();
    });
  }); 
 describe('dashboard integration', () => {
    it('should create dashboard data preparation step', () => {
      const workflow = generator.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      const dashboardJob = workflow.jobs.find(job => job.name === 'dashboard-integration');
      
      const prepStep = dashboardJob?.steps.find(step => step.name === 'Prepare dashboard data');
      expect(prepStep).toBeDefined();
      expect(prepStep?.run).toBeDefined();
    });

    it('should include Grafana dashboard updates by default', () => {
      const workflow = generator.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      const dashboardJob = workflow.jobs.find(job => job.name === 'dashboard-integration');
      
      const grafanaStep = dashboardJob?.steps.find(step => step.name?.includes('Grafana dashboard'));
      expect(grafanaStep).toBeDefined();
    });

    it('should support multiple dashboard platforms', () => {
      const customConfig: Partial<ComprehensiveMonitoringConfig> = {
        dashboardIntegration: {
          enabled: true,
          platforms: [
            {
              type: 'grafana',
              name: 'main-grafana',
              config: { url: 'https://grafana.company.com' },
              enabled: true
            },
            {
              type: 'datadog',
              name: 'datadog-dash',
              config: { site: 'datadoghq.com' },
              enabled: true
            },
            {
              type: 'newrelic',
              name: 'nr-dash',
              config: { account_id: '12345' },
              enabled: true
            }
          ],
          updateFrequency: 'hourly',
          dashboards: []
        }
      };

      const gen = new MonitoringGenerator(customConfig);
      const workflow = gen.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      const dashboardJob = workflow.jobs.find(job => job.name === 'dashboard-integration');
      
      const grafanaStep = dashboardJob?.steps.find(step => step.name?.includes('Grafana dashboard - main-grafana'));
      const datadogStep = dashboardJob?.steps.find(step => step.name?.includes('Datadog dashboard - datadog-dash'));
      const newrelicStep = dashboardJob?.steps.find(step => step.name?.includes('New Relic dashboard - nr-dash'));
      
      expect(grafanaStep).toBeDefined();
      expect(datadogStep).toBeDefined();
      expect(newrelicStep).toBeDefined();
    });

    it('should skip disabled platforms', () => {
      const customConfig: Partial<ComprehensiveMonitoringConfig> = {
        dashboardIntegration: {
          enabled: true,
          platforms: [
            {
              type: 'grafana',
              name: 'disabled-grafana',
              config: {},
              enabled: false
            }
          ],
          updateFrequency: 'hourly',
          dashboards: []
        }
      };

      const gen = new MonitoringGenerator(customConfig);
      const workflow = gen.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      const dashboardJob = workflow.jobs.find(job => job.name === 'dashboard-integration');
      
      const grafanaStep = dashboardJob?.steps.find(step => step.name?.includes('disabled-grafana'));
      expect(grafanaStep).toBeUndefined();
    });
  });

  describe('structured logging', () => {
    it('should create logging initialization step', () => {
      const workflow = generator.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      const loggingJob = workflow.jobs.find(job => job.name === 'structured-logging');
      
      const initStep = loggingJob?.steps.find(step => step.name === 'Initialize structured logging');
      expect(initStep).toBeDefined();
      expect(initStep?.run).toBeDefined();
      expect(initStep?.env).toBeDefined();
      expect(initStep?.env?.LOG_FORMAT).toBe('json');
      expect(initStep?.env?.LOG_LEVEL).toBe('info');
    });

    it('should create log collection step', () => {
      const workflow = generator.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      const loggingJob = workflow.jobs.find(job => job.name === 'structured-logging');
      
      const collectStep = loggingJob?.steps.find(step => step.name === 'Collect workflow logs');
      expect(collectStep).toBeDefined();
      expect(collectStep?.run).toBeDefined();
    });

    it('should include log forwarding when enabled', () => {
      const customConfig: Partial<ComprehensiveMonitoringConfig> = {
        structuredLogging: {
          enabled: true,
          format: 'json',
          level: 'info',
          fields: [],
          forwarding: {
            enabled: true,
            destinations: [
              {
                type: 'elasticsearch',
                name: 'main-es',
                config: { url: 'https://elasticsearch.company.com' },
                filters: []
              }
            ],
            bufferSize: 1000,
            flushInterval: '30s'
          },
          correlation: {
            enabled: true,
            traceIdHeader: 'X-Trace-Id',
            spanIdHeader: 'X-Span-Id',
            correlationIdField: 'correlation_id'
          }
        }
      };

      const gen = new MonitoringGenerator(customConfig);
      const workflow = gen.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      const loggingJob = workflow.jobs.find(job => job.name === 'structured-logging');
      
      // Should have additional log forwarding steps
      expect(loggingJob?.steps.length).toBeGreaterThan(2);
    });

    it('should support correlation when enabled', () => {
      const workflow = generator.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      const loggingJob = workflow.jobs.find(job => job.name === 'structured-logging');
      
      const initStep = loggingJob?.steps.find(step => step.name === 'Initialize structured logging');
      expect(initStep?.env?.CORRELATION_ENABLED).toBe('true');
    });
  });

  describe('SLA tracking', () => {
    it('should create SLA calculation step', () => {
      const workflow = generator.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      const slaJob = workflow.jobs.find(job => job.name === 'sla-tracking');
      
      const calcStep = slaJob?.steps.find(step => step.name === 'Calculate SLA metrics');
      expect(calcStep).toBeDefined();
      expect(calcStep?.run).toBeDefined();
      expect(calcStep?.env?.SLA_DEFINITIONS).toBeDefined();
    });

    it('should create SLA dashboard update step', () => {
      const workflow = generator.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      const slaJob = workflow.jobs.find(job => job.name === 'sla-tracking');
      
      const dashboardStep = slaJob?.steps.find(step => step.name === 'Update SLA dashboard');
      expect(dashboardStep).toBeDefined();
      expect(dashboardStep?.if).toBe('steps.calculate-sla.outputs.sla_updated == \'true\'');
    });

    it('should include SLA reporting when enabled', () => {
      const workflow = generator.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      const slaJob = workflow.jobs.find(job => job.name === 'sla-tracking');
      
      const reportStep = slaJob?.steps.find(step => step.name === 'Generate SLA report');
      expect(reportStep).toBeDefined();
      expect(reportStep?.if).toBe('steps.calculate-sla.outputs.report_due == \'true\'');
    });

    it('should include SLA alerting when enabled', () => {
      const workflow = generator.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      const slaJob = workflow.jobs.find(job => job.name === 'sla-tracking');
      
      const alertStep = slaJob?.steps.find(step => step.name === 'Check SLA violations');
      expect(alertStep).toBeDefined();
      expect(alertStep?.if).toBe('steps.calculate-sla.outputs.violations_detected == \'true\'');
    });

    it('should support custom SLA definitions', () => {
      const customConfig: Partial<ComprehensiveMonitoringConfig> = {
        slaTracking: {
          enabled: true,
          slas: [
            {
              name: 'Custom Success Rate',
              description: 'Custom success rate SLA',
              metric: 'success_rate',
              target: 99,
              unit: 'percentage',
              period: 'weekly',
              calculation: 'rate'
            },
            {
              name: 'Custom Response Time',
              description: 'Custom response time SLA',
              metric: 'response_time',
              target: 5,
              unit: 'minutes',
              period: 'daily',
              calculation: 'percentile'
            }
          ],
          reporting: {
            enabled: true,
            frequency: 'daily',
            recipients: ['sla@company.com'],
            format: 'json',
            includeDetails: false
          },
          alerting: {
            enabled: true,
            thresholds: [
              { percentage: 95, severity: 'warning', action: 'alert' },
              { percentage: 85, severity: 'critical', action: 'escalate' }
            ],
            channels: ['slack']
          }
        }
      };

      const gen = new MonitoringGenerator(customConfig);
      const workflow = gen.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      const slaJob = workflow.jobs.find(job => job.name === 'sla-tracking');
      
      expect(slaJob).toBeDefined();
      expect(slaJob?.steps.length).toBeGreaterThan(2);
    });
  });

  describe('workflow triggers', () => {
    it('should include workflow_run trigger', () => {
      const workflow = generator.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      
      expect(workflow.triggers.workflowRun).toBeDefined();
      expect(workflow.triggers.workflowRun?.workflows).toContain('*');
      expect(workflow.triggers.workflowRun?.types).toContain('completed');
    });

    it('should include scheduled triggers', () => {
      const workflow = generator.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      
      expect(workflow.triggers.schedule).toBeDefined();
      expect(workflow.triggers.schedule?.length).toBe(3);
      
      const schedules = workflow.triggers.schedule || [];
      expect(schedules.some(s => s.cron === '*/5 * * * *')).toBe(true); // Every 5 minutes
      expect(schedules.some(s => s.cron === '0 * * * *')).toBe(true);   // Hourly
      expect(schedules.some(s => s.cron === '0 0 * * *')).toBe(true);   // Daily
    });

    it('should include workflow_dispatch trigger with inputs', () => {
      const workflow = generator.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      
      expect(workflow.triggers.workflowDispatch).toBeDefined();
      expect(workflow.triggers.workflowDispatch?.inputs).toBeDefined();
      expect(workflow.triggers.workflowDispatch?.inputs?.monitoring_type).toBeDefined();
      expect(workflow.triggers.workflowDispatch?.inputs?.time_range).toBeDefined();
    });
  });

  describe('permissions', () => {
    it('should set appropriate permissions', () => {
      const workflow = generator.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      
      expect(workflow.permissions).toBeDefined();
      expect(workflow.permissions?.contents).toBe('read');
      expect(workflow.permissions?.actions).toBe('read');
      expect(workflow.permissions?.checks).toBe('write');
      expect(workflow.permissions?.pullRequests).toBe('write');
      expect(workflow.permissions?.issues).toBe('write');
      expect(workflow.permissions?.packages).toBe('read');
      expect(workflow.permissions?.deployments).toBe('read');
    });
  });

  describe('configuration merging', () => {
    it('should merge partial configuration with defaults', () => {
      const partialConfig: Partial<ComprehensiveMonitoringConfig> = {
        workflowMetrics: {
          enabled: false
        } as WorkflowMetricsConfig
      };

      const gen = new MonitoringGenerator(partialConfig);
      const workflow = gen.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      
      // Should not include metrics job since it's disabled
      const metricsJob = workflow.jobs.find(job => job.name === 'workflow-metrics');
      expect(metricsJob).toBeUndefined();
    });

    it('should use default values for unspecified configuration', () => {
      const gen = new MonitoringGenerator();
      const workflow = gen.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      
      // Should include all default jobs
      expect(workflow.jobs.length).toBeGreaterThan(3);
    });

    it('should handle complex configuration overrides', () => {
      const complexConfig: Partial<ComprehensiveMonitoringConfig> = {
        workflowMetrics: {
          enabled: true,
          collectExecutionTime: true,
          collectResourceUsage: false,
          collectJobMetrics: true,
          collectStepMetrics: true,
          collectFailureMetrics: true,
          metricsStorage: 'prometheus',
          retentionDays: 7,
          aggregationInterval: '1m'
        },
        alerting: {
          enabled: true,
          channels: [
            {
              type: 'webhook',
              name: 'custom-webhook',
              config: { url: 'https://alerts.company.com/webhook' },
              severity: ['critical']
            }
          ],
          rules: [
            {
              name: 'Custom Failure Rule',
              condition: 'workflow.conclusion == "failure"',
              severity: 'critical',
              description: 'Custom workflow failure alert',
              threshold: 1,
              duration: '0m',
              channels: ['custom-webhook']
            }
          ],
          escalation: { enabled: false, levels: [], timeout: '1h' },
          suppressionRules: []
        }
      };

      const gen = new MonitoringGenerator(complexConfig);
      const workflow = gen.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      
      const metricsJob = workflow.jobs.find(job => job.name === 'workflow-metrics');
      const alertingJob = workflow.jobs.find(job => job.name === 'alerting');
      
      expect(metricsJob).toBeDefined();
      expect(alertingJob).toBeDefined();
      
      // Should not include resource monitoring step
      const resourceStep = metricsJob?.steps.find(step => step.name === 'Monitor resource usage');
      expect(resourceStep).toBeUndefined();
      
      // Should include step metrics collection
      const stepMetricsStep = metricsJob?.steps.find(step => step.name === 'Collect step metrics');
      expect(stepMetricsStep).toBeDefined();
      
      // Should include webhook alert
      const webhookStep = alertingJob?.steps.find(step => step.name?.includes('webhook alert'));
      expect(webhookStep).toBeDefined();
    });
  });

  describe('metrics storage options', () => {
    it('should use GitHub artifacts by default', () => {
      const workflow = generator.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      const metricsJob = workflow.jobs.find(job => job.name === 'workflow-metrics');
      
      const uploadStep = metricsJob?.steps.find(step => step.name === 'Upload workflow metrics');
      expect(uploadStep).toBeDefined();
      expect(uploadStep?.uses).toBe('actions/upload-artifact@v4');
    });

    it('should support Prometheus storage', () => {
      const customConfig: Partial<ComprehensiveMonitoringConfig> = {
        workflowMetrics: {
          enabled: true,
          collectExecutionTime: true,
          collectResourceUsage: true,
          collectJobMetrics: true,
          collectStepMetrics: false,
          collectFailureMetrics: true,
          metricsStorage: 'prometheus',
          retentionDays: 30,
          aggregationInterval: '5m'
        }
      };

      const gen = new MonitoringGenerator(customConfig);
      const workflow = gen.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      const metricsJob = workflow.jobs.find(job => job.name === 'workflow-metrics');
      
      const prometheusStep = metricsJob?.steps.find(step => step.name === 'Push metrics to Prometheus');
      expect(prometheusStep).toBeDefined();
      expect(prometheusStep?.env?.PROMETHEUS_GATEWAY_URL).toBe('${{ secrets.PROMETHEUS_GATEWAY_URL }}');
    });

    it('should support Datadog storage', () => {
      const customConfig: Partial<ComprehensiveMonitoringConfig> = {
        workflowMetrics: {
          enabled: true,
          collectExecutionTime: true,
          collectResourceUsage: true,
          collectJobMetrics: true,
          collectStepMetrics: false,
          collectFailureMetrics: true,
          metricsStorage: 'datadog',
          retentionDays: 30,
          aggregationInterval: '5m'
        }
      };

      const gen = new MonitoringGenerator(customConfig);
      const workflow = gen.generateMonitoringWorkflow(mockDetectionResult, mockOptions);
      const metricsJob = workflow.jobs.find(job => job.name === 'workflow-metrics');
      
      const datadogStep = metricsJob?.steps.find(step => step.name === 'Send metrics to Datadog');
      expect(datadogStep).toBeDefined();
      expect(datadogStep?.env?.DD_API_KEY).toBe('${{ secrets.DD_API_KEY }}');
    });
  });
});