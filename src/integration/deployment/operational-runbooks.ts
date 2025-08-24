/**
 * Operational Runbooks Manager
 * 
 * Provides troubleshooting guides, maintenance procedures, and operational
 * documentation for system administrators and operations teams.
 */

import { Logger } from '../../cli/lib/logger';
import { Result, success, failure } from '../../shared/types/result';
import { MonitoringSystem } from '../monitoring/monitoring-system';
import { ConfigurationManager } from '../configuration/configuration-manager';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Runbook definition
 */
export interface Runbook {
  id: string;
  title: string;
  description: string;
  category: 'troubleshooting' | 'maintenance' | 'deployment' | 'monitoring' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  estimatedTime: number; // in minutes
  prerequisites: string[];
  steps: RunbookStep[];
  rollbackSteps?: RunbookStep[];
  relatedRunbooks: string[];
  tags: string[];
  lastUpdated: Date;
  version: string;
}

export interface RunbookStep {
  id: string;
  title: string;
  description: string;
  type: 'manual' | 'automated' | 'verification' | 'decision';
  command?: string;
  expectedOutput?: string;
  troubleshooting?: TroubleshootingGuide;
  automation?: AutomationScript;
  verification?: VerificationCheck;
  decision?: DecisionPoint;
}

export interface TroubleshootingGuide {
  commonIssues: CommonIssue[];
  diagnosticCommands: string[];
  logLocations: string[];
  escalationProcedure: string;
}

export interface CommonIssue {
  symptom: string;
  cause: string;
  solution: string;
  prevention: string;
}

export interface AutomationScript {
  language: 'bash' | 'powershell' | 'python' | 'javascript';
  script: string;
  parameters: Record<string, any>;
  timeout: number;
  retries: number;
}

export interface VerificationCheck {
  type: 'health-check' | 'metric-check' | 'log-check' | 'service-check';
  criteria: string;
  expectedValue: any;
  tolerance?: number;
}

export interface DecisionPoint {
  condition: string;
  trueAction: string;
  falseAction: string;
  defaultAction: string;
}

/**
 * Runbook execution result
 */
export interface RunbookExecution {
  runbookId: string;
  executionId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';
  currentStep: number;
  stepResults: StepResult[];
  logs: string[];
  errors: string[];
  executedBy: string;
  notes: string[];
}

export interface StepResult {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime: Date;
  endTime?: Date;
  output?: string;
  error?: string;
  notes?: string;
}

/**
 * Maintenance window definition
 */
export interface MaintenanceWindow {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  type: 'planned' | 'emergency' | 'routine';
  impact: 'none' | 'low' | 'medium' | 'high';
  affectedServices: string[];
  procedures: string[]; // Runbook IDs
  approvals: Approval[];
  notifications: NotificationConfig[];
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
}

export interface Approval {
  approver: string;
  approved: boolean;
  timestamp?: Date;
  comments?: string;
}

export interface NotificationConfig {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  recipients: string[];
  template: string;
  timing: 'before' | 'during' | 'after' | 'all';
}

/**
 * Operational runbooks manager
 */
export class OperationalRunbooksManager {
  private logger: Logger;
  private monitoringSystem: MonitoringSystem;
  private configManager: ConfigurationManager;
  private runbooks: Map<string, Runbook> = new Map();
  private executions: Map<string, RunbookExecution> = new Map();
  private maintenanceWindows: Map<string, MaintenanceWindow> = new Map();
  private runbooksPath: string;

  constructor(
    logger: Logger,
    monitoringSystem: MonitoringSystem,
    configManager: ConfigurationManager,
    runbooksPath?: string
  ) {
    this.logger = logger;
    this.monitoringSystem = monitoringSystem;
    this.configManager = configManager;
    this.runbooksPath = runbooksPath || path.join(process.cwd(), 'runbooks');
  }

  /**
   * Initialize the runbooks manager
   */
  async initialize(): Promise<Result<void>> {
    try {
      this.logger.info('Initializing OperationalRunbooksManager...');

      // Ensure runbooks directory exists
      await fs.mkdir(this.runbooksPath, { recursive: true });

      // Load existing runbooks
      await this.loadRunbooks();

      // Initialize default runbooks if none exist
      if (this.runbooks.size === 0) {
        await this.initializeDefaultRunbooks();
      }

      this.logger.info('OperationalRunbooksManager initialized successfully', {
        runbooksCount: this.runbooks.size
      });

      return success(undefined);

    } catch (error) {
      const errorMessage = `Failed to initialize OperationalRunbooksManager: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errorMessage, { error });
      return failure(new Error(errorMessage));
    }
  }

  /**
   * Execute a runbook
   */
  async executeRunbook(runbookId: string, executedBy: string, parameters?: Record<string, any>): Promise<RunbookExecution> {
    const runbook = this.runbooks.get(runbookId);
    if (!runbook) {
      throw new Error(`Runbook not found: ${runbookId}`);
    }

    const executionId = `exec-${Date.now()}`;
    const execution: RunbookExecution = {
      runbookId,
      executionId,
      startTime: new Date(),
      status: 'running',
      currentStep: 0,
      stepResults: [],
      logs: [],
      errors: [],
      executedBy,
      notes: []
    };

    this.executions.set(executionId, execution);

    this.logger.info('Starting runbook execution', {
      runbookId,
      executionId,
      executedBy,
      title: runbook.title
    });

    try {
      execution.logs.push(`Starting execution of runbook: ${runbook.title}`);
      execution.logs.push(`Estimated time: ${runbook.estimatedTime} minutes`);

      // Check prerequisites
      execution.logs.push('Checking prerequisites...');
      const prerequisitesCheck = await this.checkPrerequisites(runbook.prerequisites);
      if (!prerequisitesCheck.success) {
        throw new Error(`Prerequisites not met: ${prerequisitesCheck.error}`);
      }

      // Execute steps
      for (let i = 0; i < runbook.steps.length; i++) {
        const step = runbook.steps[i];
        execution.currentStep = i;
        
        execution.logs.push(`Executing step ${i + 1}/${runbook.steps.length}: ${step.title}`);
        
        const stepResult = await this.executeStep(step, parameters);
        execution.stepResults.push(stepResult);

        if (stepResult.status === 'failed') {
          execution.status = 'failed';
          execution.errors.push(`Step ${i + 1} failed: ${stepResult.error}`);
          break;
        }

        // Handle decision points
        if (step.type === 'decision' && step.decision) {
          const decision = await this.evaluateDecision(step.decision, stepResult.output);
          execution.notes.push(`Decision: ${decision}`);
        }
      }

      // Complete execution if all steps succeeded
      if (execution.status === 'running') {
        execution.status = 'completed';
        execution.logs.push('Runbook execution completed successfully');
      }

      execution.endTime = new Date();

      this.logger.info('Runbook execution completed', {
        runbookId,
        executionId,
        status: execution.status,
        duration: execution.endTime.getTime() - execution.startTime.getTime()
      });

      return execution;

    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      const errorMessage = error instanceof Error ? error.message : String(error);
      execution.errors.push(errorMessage);
      execution.logs.push(`Execution failed: ${errorMessage}`);

      this.logger.error('Runbook execution failed', {
        runbookId,
        executionId,
        error: errorMessage
      });

      return execution;
    }
  }

  /**
   * Schedule maintenance window
   */
  async scheduleMaintenanceWindow(window: Omit<MaintenanceWindow, 'id' | 'status'>): Promise<string> {
    const windowId = `maint-${Date.now()}`;
    const maintenanceWindow: MaintenanceWindow = {
      ...window,
      id: windowId,
      status: 'scheduled'
    };

    this.maintenanceWindows.set(windowId, maintenanceWindow);

    this.logger.info('Maintenance window scheduled', {
      windowId,
      title: window.title,
      startTime: window.startTime,
      endTime: window.endTime
    });

    // Send notifications
    await this.sendMaintenanceNotifications(maintenanceWindow, 'before');

    return windowId;
  }

  /**
   * Execute maintenance window
   */
  async executeMaintenanceWindow(windowId: string): Promise<Result<void>> {
    const window = this.maintenanceWindows.get(windowId);
    if (!window) {
      return failure(new Error(`Maintenance window not found: ${windowId}`));
    }

    try {
      this.logger.info('Starting maintenance window', {
        windowId,
        title: window.title
      });

      window.status = 'in-progress';

      // Send during notifications
      await this.sendMaintenanceNotifications(window, 'during');

      // Execute maintenance procedures
      for (const procedureId of window.procedures) {
        this.logger.info('Executing maintenance procedure', {
          windowId,
          procedureId
        });

        const execution = await this.executeRunbook(procedureId, 'maintenance-system');
        
        if (execution.status === 'failed') {
          throw new Error(`Maintenance procedure failed: ${procedureId}`);
        }
      }

      window.status = 'completed';

      // Send completion notifications
      await this.sendMaintenanceNotifications(window, 'after');

      this.logger.info('Maintenance window completed', {
        windowId,
        title: window.title
      });

      return success(undefined);

    } catch (error) {
      window.status = 'cancelled';
      const errorMessage = `Maintenance window failed: ${error instanceof Error ? error.message : String(error)}`;
      
      this.logger.error(errorMessage, { windowId });
      
      // Send failure notifications
      await this.sendMaintenanceNotifications(window, 'after');
      
      return failure(new Error(errorMessage));
    }
  }

  /**
   * Get troubleshooting guide for a specific issue
   */
  async getTroubleshootingGuide(symptom: string): Promise<Runbook[]> {
    const matchingRunbooks: Runbook[] = [];

    for (const runbook of this.runbooks.values()) {
      if (runbook.category === 'troubleshooting') {
        // Check if runbook addresses the symptom
        const hasMatchingStep = runbook.steps.some(step => 
          step.troubleshooting?.commonIssues.some(issue => 
            issue.symptom.toLowerCase().includes(symptom.toLowerCase())
          )
        );

        if (hasMatchingStep || 
            runbook.title.toLowerCase().includes(symptom.toLowerCase()) ||
            runbook.description.toLowerCase().includes(symptom.toLowerCase())) {
          matchingRunbooks.push(runbook);
        }
      }
    }

    // Sort by severity (critical first)
    matchingRunbooks.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    return matchingRunbooks;
  }

  /**
   * Get runbook by ID
   */
  async getRunbook(runbookId: string): Promise<Runbook | null> {
    return this.runbooks.get(runbookId) || null;
  }

  /**
   * List all runbooks
   */
  async listRunbooks(category?: string): Promise<Runbook[]> {
    const runbooks = Array.from(this.runbooks.values());
    
    if (category) {
      return runbooks.filter(r => r.category === category);
    }
    
    return runbooks;
  }

  /**
   * Get execution status
   */
  async getExecutionStatus(executionId: string): Promise<RunbookExecution | null> {
    return this.executions.get(executionId) || null;
  }

  /**
   * List maintenance windows
   */
  async listMaintenanceWindows(status?: string): Promise<MaintenanceWindow[]> {
    const windows = Array.from(this.maintenanceWindows.values());
    
    if (status) {
      return windows.filter(w => w.status === status);
    }
    
    return windows;
  }

  // Private helper methods

  private async loadRunbooks(): Promise<void> {
    try {
      const files = await fs.readdir(this.runbooksPath);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.runbooksPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const runbook = JSON.parse(content) as Runbook;
          
          // Convert date strings back to Date objects
          runbook.lastUpdated = new Date(runbook.lastUpdated);
          
          this.runbooks.set(runbook.id, runbook);
          
        } catch (error) {
          this.logger.warn('Failed to load runbook file', {
            file,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      this.logger.info('Loaded runbooks', { count: this.runbooks.size });

    } catch (error) {
      this.logger.warn('Failed to load runbooks directory', {
        path: this.runbooksPath,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async initializeDefaultRunbooks(): Promise<void> {
    const defaultRunbooks: Runbook[] = [
      {
        id: 'system-health-check',
        title: 'System Health Check',
        description: 'Comprehensive system health verification procedure',
        category: 'troubleshooting',
        severity: 'medium',
        estimatedTime: 15,
        prerequisites: ['System access', 'Monitoring tools available'],
        steps: [
          {
            id: 'check-services',
            title: 'Check System Services',
            description: 'Verify all critical services are running',
            type: 'verification',
            verification: {
              type: 'service-check',
              criteria: 'all_services_running',
              expectedValue: true
            }
          },
          {
            id: 'check-resources',
            title: 'Check Resource Usage',
            description: 'Verify CPU, memory, and disk usage are within normal ranges',
            type: 'verification',
            verification: {
              type: 'metric-check',
              criteria: 'resource_usage',
              expectedValue: 80,
              tolerance: 10
            }
          },
          {
            id: 'check-connectivity',
            title: 'Check Network Connectivity',
            description: 'Verify network connectivity to external services',
            type: 'verification',
            verification: {
              type: 'health-check',
              criteria: 'network_connectivity',
              expectedValue: true
            }
          }
        ],
        relatedRunbooks: ['performance-troubleshooting', 'network-troubleshooting'],
        tags: ['health', 'monitoring', 'verification'],
        lastUpdated: new Date(),
        version: '1.0.0'
      },
      {
        id: 'deployment-rollback',
        title: 'Emergency Deployment Rollback',
        description: 'Emergency procedure to rollback a failed deployment',
        category: 'deployment',
        severity: 'critical',
        estimatedTime: 10,
        prerequisites: ['Deployment access', 'Previous version available'],
        steps: [
          {
            id: 'stop-traffic',
            title: 'Stop Traffic to Failed Deployment',
            description: 'Immediately stop routing traffic to the failed deployment',
            type: 'automated',
            automation: {
              language: 'bash',
              script: 'kubectl patch service app-service -p \'{"spec":{"selector":{"version":"stable"}}}\'',
              parameters: {},
              timeout: 30000,
              retries: 3
            }
          },
          {
            id: 'rollback-deployment',
            title: 'Rollback to Previous Version',
            description: 'Rollback the deployment to the previous stable version',
            type: 'automated',
            automation: {
              language: 'bash',
              script: 'kubectl rollout undo deployment/app-deployment',
              parameters: {},
              timeout: 300000,
              retries: 1
            }
          },
          {
            id: 'verify-rollback',
            title: 'Verify Rollback Success',
            description: 'Verify the rollback completed successfully and service is healthy',
            type: 'verification',
            verification: {
              type: 'health-check',
              criteria: 'deployment_healthy',
              expectedValue: true
            }
          }
        ],
        rollbackSteps: [
          {
            id: 'restore-traffic',
            title: 'Restore Traffic Routing',
            description: 'Restore normal traffic routing if rollback fails',
            type: 'manual',
            command: 'kubectl patch service app-service -p \'{"spec":{"selector":{"version":"latest"}}}\''
          }
        ],
        relatedRunbooks: ['deployment-troubleshooting', 'traffic-management'],
        tags: ['deployment', 'rollback', 'emergency'],
        lastUpdated: new Date(),
        version: '1.0.0'
      },
      {
        id: 'performance-troubleshooting',
        title: 'Performance Issue Troubleshooting',
        description: 'Diagnose and resolve system performance issues',
        category: 'troubleshooting',
        severity: 'high',
        estimatedTime: 30,
        prerequisites: ['Monitoring access', 'System metrics available'],
        steps: [
          {
            id: 'identify-bottleneck',
            title: 'Identify Performance Bottleneck',
            description: 'Analyze system metrics to identify the performance bottleneck',
            type: 'manual',
            troubleshooting: {
              commonIssues: [
                {
                  symptom: 'High response times',
                  cause: 'Database query performance',
                  solution: 'Optimize database queries and add indexes',
                  prevention: 'Regular query performance monitoring'
                },
                {
                  symptom: 'High CPU usage',
                  cause: 'Inefficient algorithms or infinite loops',
                  solution: 'Profile application and optimize code',
                  prevention: 'Code review and performance testing'
                },
                {
                  symptom: 'High memory usage',
                  cause: 'Memory leaks or large object retention',
                  solution: 'Analyze memory dumps and fix leaks',
                  prevention: 'Memory profiling in development'
                }
              ],
              diagnosticCommands: [
                'top -p $(pgrep -f app)',
                'iostat -x 1 5',
                'free -h',
                'df -h'
              ],
              logLocations: [
                '/var/log/app/application.log',
                '/var/log/system.log'
              ],
              escalationProcedure: 'Contact senior engineer if issue persists after 1 hour'
            }
          },
          {
            id: 'apply-mitigation',
            title: 'Apply Performance Mitigation',
            description: 'Apply immediate mitigation measures',
            type: 'decision',
            decision: {
              condition: 'bottleneck_type',
              trueAction: 'scale-horizontally',
              falseAction: 'optimize-configuration',
              defaultAction: 'restart-service'
            }
          },
          {
            id: 'monitor-improvement',
            title: 'Monitor Performance Improvement',
            description: 'Monitor system to verify performance improvement',
            type: 'verification',
            verification: {
              type: 'metric-check',
              criteria: 'response_time',
              expectedValue: 500,
              tolerance: 100
            }
          }
        ],
        relatedRunbooks: ['system-health-check', 'scaling-procedures'],
        tags: ['performance', 'troubleshooting', 'optimization'],
        lastUpdated: new Date(),
        version: '1.0.0'
      },
      {
        id: 'security-incident-response',
        title: 'Security Incident Response',
        description: 'Response procedure for security incidents and breaches',
        category: 'security',
        severity: 'critical',
        estimatedTime: 60,
        prerequisites: ['Security team access', 'Incident response tools'],
        steps: [
          {
            id: 'isolate-threat',
            title: 'Isolate Security Threat',
            description: 'Immediately isolate the affected systems to prevent spread',
            type: 'automated',
            automation: {
              language: 'bash',
              script: 'iptables -A INPUT -s $THREAT_IP -j DROP',
              parameters: { THREAT_IP: '' },
              timeout: 10000,
              retries: 1
            }
          },
          {
            id: 'assess-damage',
            title: 'Assess Security Damage',
            description: 'Assess the extent of the security breach',
            type: 'manual',
            troubleshooting: {
              commonIssues: [
                {
                  symptom: 'Unauthorized access detected',
                  cause: 'Compromised credentials or vulnerability exploitation',
                  solution: 'Reset credentials and patch vulnerabilities',
                  prevention: 'Regular security audits and monitoring'
                }
              ],
              diagnosticCommands: [
                'grep "Failed password" /var/log/auth.log',
                'netstat -tulpn | grep LISTEN',
                'ps aux | grep -v "\\[.*\\]"'
              ],
              logLocations: [
                '/var/log/auth.log',
                '/var/log/security.log',
                '/var/log/audit/audit.log'
              ],
              escalationProcedure: 'Immediately notify CISO and security team'
            }
          },
          {
            id: 'contain-incident',
            title: 'Contain Security Incident',
            description: 'Contain the incident to prevent further damage',
            type: 'manual'
          },
          {
            id: 'document-incident',
            title: 'Document Security Incident',
            description: 'Document all details of the security incident',
            type: 'manual'
          }
        ],
        relatedRunbooks: ['system-hardening', 'audit-procedures'],
        tags: ['security', 'incident', 'response', 'emergency'],
        lastUpdated: new Date(),
        version: '1.0.0'
      }
    ];

    // Save default runbooks
    for (const runbook of defaultRunbooks) {
      await this.saveRunbook(runbook);
      this.runbooks.set(runbook.id, runbook);
    }

    this.logger.info('Initialized default runbooks', { count: defaultRunbooks.length });
  }

  private async saveRunbook(runbook: Runbook): Promise<void> {
    const filePath = path.join(this.runbooksPath, `${runbook.id}.json`);
    const content = JSON.stringify(runbook, null, 2);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  private async checkPrerequisites(prerequisites: string[]): Promise<Result<void>> {
    // In a real implementation, this would check actual prerequisites
    // For now, we'll simulate the check
    for (const prerequisite of prerequisites) {
      this.logger.debug('Checking prerequisite', { prerequisite });
      
      // Simulate prerequisite check (95% success rate)
      if (Math.random() < 0.05) {
        return failure(new Error(`Prerequisite not met: ${prerequisite}`));
      }
    }

    return success(undefined);
  }

  private async executeStep(step: RunbookStep, parameters?: Record<string, any>): Promise<StepResult> {
    const stepResult: StepResult = {
      stepId: step.id,
      status: 'running',
      startTime: new Date()
    };

    try {
      switch (step.type) {
        case 'automated':
          if (step.automation) {
            stepResult.output = await this.executeAutomation(step.automation, parameters);
          }
          break;

        case 'verification':
          if (step.verification) {
            const verificationResult = await this.executeVerification(step.verification);
            stepResult.output = JSON.stringify(verificationResult);
            if (!verificationResult.success) {
              throw new Error('Verification failed');
            }
          }
          break;

        case 'manual':
          // Manual steps require human intervention
          stepResult.output = 'Manual step - requires human intervention';
          stepResult.notes = 'This step must be completed manually by the operator';
          break;

        case 'decision':
          // Decision steps return the decision criteria
          stepResult.output = step.decision?.condition || 'decision-required';
          break;

        default:
          stepResult.output = 'Step completed';
      }

      stepResult.status = 'completed';
      stepResult.endTime = new Date();

    } catch (error) {
      stepResult.status = 'failed';
      stepResult.endTime = new Date();
      stepResult.error = error instanceof Error ? error.message : String(error);
    }

    return stepResult;
  }

  private async executeAutomation(automation: AutomationScript, parameters?: Record<string, any>): Promise<string> {
    // In a real implementation, this would execute the actual script
    // For now, we'll simulate script execution
    
    this.logger.info('Executing automation script', {
      language: automation.language,
      timeout: automation.timeout
    });

    // Simulate script execution time
    await new Promise(resolve => setTimeout(resolve, Math.min(automation.timeout / 10, 2000)));

    // Simulate script output (90% success rate)
    if (Math.random() < 0.1) {
      throw new Error('Script execution failed');
    }

    return `Script executed successfully (${automation.language})`;
  }

  private async executeVerification(verification: VerificationCheck): Promise<{ success: boolean; value: any }> {
    // In a real implementation, this would perform actual verification
    // For now, we'll simulate verification
    
    this.logger.info('Executing verification check', {
      type: verification.type,
      criteria: verification.criteria
    });

    // Simulate verification time
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate verification result (85% success rate)
    const success = Math.random() > 0.15;
    const value = success ? verification.expectedValue : 'unexpected-value';

    return { success, value };
  }

  private async evaluateDecision(decision: DecisionPoint, input?: string): Promise<string> {
    // In a real implementation, this would evaluate the decision condition
    // For now, we'll simulate decision evaluation
    
    // Simple decision logic based on input
    if (input && input.includes('error')) {
      return decision.falseAction;
    } else if (input && input.includes('success')) {
      return decision.trueAction;
    } else {
      return decision.defaultAction;
    }
  }

  private async sendMaintenanceNotifications(window: MaintenanceWindow, timing: 'before' | 'during' | 'after'): Promise<void> {
    const relevantNotifications = window.notifications.filter(n => 
      n.timing === timing || n.timing === 'all'
    );

    for (const notification of relevantNotifications) {
      try {
        await this.monitoringSystem.sendNotification({
          title: `Maintenance Window: ${window.title}`,
          message: this.getMaintenanceMessage(window, timing),
          severity: window.impact === 'high' ? 'warning' : 'info',
          channels: [{
            type: notification.type as any,
            configuration: { recipients: notification.recipients },
            enabled: true
          }]
        });

      } catch (error) {
        this.logger.error('Failed to send maintenance notification', {
          windowId: window.id,
          notification: notification.type,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  private getMaintenanceMessage(window: MaintenanceWindow, timing: 'before' | 'during' | 'after'): string {
    switch (timing) {
      case 'before':
        return `Scheduled maintenance "${window.title}" will begin at ${window.startTime.toISOString()}. Expected impact: ${window.impact}`;
      case 'during':
        return `Maintenance "${window.title}" is now in progress. Expected completion: ${window.endTime.toISOString()}`;
      case 'after':
        return `Maintenance "${window.title}" has been completed. Status: ${window.status}`;
      default:
        return `Maintenance window update: ${window.title}`;
    }
  }
}