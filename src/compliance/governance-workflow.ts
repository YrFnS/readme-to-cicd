/**
 * GovernanceWorkflow - Automated governance and approval workflow system
 * 
 * Implements governance workflows with approval processes, automated
 * routing, escalation, and audit trails for organizational compliance.
 */

import {
  GovernanceWorkflow,
  WorkflowStep,
  WorkflowAction,
  WorkflowTrigger,
  WorkflowApprover,
  NotificationConfig,
  AuditEvent
} from './types';
import { AuditTrailManager } from './audit-trail-manager';

export class GovernanceWorkflowManager {
  private workflows: Map<string, GovernanceWorkflow> = new Map();
  private activeInstances: Map<string, WorkflowInstance> = new Map();
  private auditManager: AuditTrailManager;
  private notificationService: NotificationService;

  constructor(
    auditManager: AuditTrailManager,
    notificationService: NotificationService
  ) {
    this.auditManager = auditManager;
    this.notificationService = notificationService;
  }

  /**
   * Register a governance workflow
   */
  async registerWorkflow(workflow: GovernanceWorkflow): Promise<void> {
    // Validate workflow structure
    this.validateWorkflow(workflow);

    // Store workflow
    this.workflows.set(workflow.id, workflow);

    // Log workflow registration
    await this.auditManager.logEvent({
      id: `audit-${Date.now()}`,
      timestamp: new Date(),
      user: 'system',
      action: 'WORKFLOW_REGISTERED',
      resource: workflow.id,
      outcome: 'SUCCESS',
      details: {
        workflowName: workflow.name,
        type: workflow.type,
        stepsCount: workflow.steps.length,
        approversCount: workflow.approvers.length
      },
      ipAddress: 'localhost',
      userAgent: 'GovernanceWorkflowManager',
      sessionId: 'system'
    });
  }

  /**
   * Start a workflow instance
   */
  async startWorkflow(
    workflowId: string,
    context: WorkflowContext,
    initiator: string
  ): Promise<WorkflowInstance> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    // Create workflow instance
    const instance: WorkflowInstance = {
      id: `instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      workflowId,
      status: 'ACTIVE',
      currentStep: 0,
      context,
      initiator,
      startTime: new Date(),
      steps: workflow.steps.map(step => ({
        stepId: step.id,
        status: 'PENDING',
        assignee: step.assignee,
        startTime: undefined,
        endTime: undefined,
        result: undefined,
        comments: undefined
      })),
      approvals: [],
      notifications: [],
      auditTrail: []
    };

    // Store instance
    this.activeInstances.set(instance.id, instance);

    // Log workflow start
    await this.auditManager.logEvent({
      id: `audit-${Date.now()}`,
      timestamp: new Date(),
      user: initiator,
      action: 'WORKFLOW_STARTED',
      resource: instance.id,
      outcome: 'SUCCESS',
      details: {
        workflowId,
        workflowName: workflow.name,
        context
      },
      ipAddress: context.ipAddress || 'localhost',
      userAgent: context.userAgent || 'GovernanceWorkflowManager',
      sessionId: context.sessionId || 'system'
    });

    // Start first step
    await this.processNextStep(instance);

    return instance;
  }

  /**
   * Process workflow action (approve, reject, etc.)
   */
  async processAction(
    instanceId: string,
    action: WorkflowActionRequest,
    actor: string
  ): Promise<WorkflowInstance> {
    const instance = this.activeInstances.get(instanceId);
    if (!instance) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }

    const workflow = this.workflows.get(instance.workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${instance.workflowId}`);
    }

    // Validate actor has permission to perform action
    await this.validateActionPermission(instance, action, actor);

    // Record action in audit trail
    const auditEntry: WorkflowAuditEntry = {
      timestamp: new Date(),
      actor,
      action: action.type,
      stepId: workflow.steps[instance.currentStep]?.id,
      details: action.details,
      comments: action.comments
    };
    instance.auditTrail.push(auditEntry);

    // Process the action
    switch (action.type) {
      case 'APPROVE':
        await this.processApproval(instance, action, actor);
        break;
      case 'REJECT':
        await this.processRejection(instance, action, actor);
        break;
      case 'REQUEST_INFO':
        await this.processInfoRequest(instance, action, actor);
        break;
      case 'ESCALATE':
        await this.processEscalation(instance, action, actor);
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }

    // Log action
    await this.auditManager.logEvent({
      id: `audit-${Date.now()}`,
      timestamp: new Date(),
      user: actor,
      action: `WORKFLOW_${action.type}`,
      resource: instanceId,
      outcome: 'SUCCESS',
      details: {
        workflowId: instance.workflowId,
        stepId: workflow.steps[instance.currentStep]?.id,
        actionDetails: action.details,
        comments: action.comments
      },
      ipAddress: instance.context.ipAddress || 'localhost',
      userAgent: instance.context.userAgent || 'GovernanceWorkflowManager',
      sessionId: instance.context.sessionId || 'system'
    });

    return instance;
  }

  /**
   * Get workflow instance status
   */
  getWorkflowInstance(instanceId: string): WorkflowInstance | undefined {
    return this.activeInstances.get(instanceId);
  }

  /**
   * List active workflow instances
   */
  listActiveInstances(filter?: WorkflowInstanceFilter): WorkflowInstance[] {
    let instances = Array.from(this.activeInstances.values());

    if (filter) {
      if (filter.workflowId) {
        instances = instances.filter(i => i.workflowId === filter.workflowId);
      }
      if (filter.status) {
        instances = instances.filter(i => i.status === filter.status);
      }
      if (filter.initiator) {
        instances = instances.filter(i => i.initiator === filter.initiator);
      }
      if (filter.assignee) {
        instances = instances.filter(i => 
          i.steps.some(s => s.assignee === filter.assignee && s.status === 'ACTIVE')
        );
      }
    }

    return instances.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  /**
   * Get pending approvals for a user
   */
  getPendingApprovals(userId: string): WorkflowPendingApproval[] {
    const pendingApprovals: WorkflowPendingApproval[] = [];

    for (const instance of this.activeInstances.values()) {
      if (instance.status !== 'ACTIVE') continue;

      const workflow = this.workflows.get(instance.workflowId);
      if (!workflow) continue;

      const currentStep = workflow.steps[instance.currentStep];
      if (!currentStep) continue;

      // Check if user is assigned to current step
      if (currentStep.assignee === userId || 
          workflow.approvers.some(a => a.users.includes(userId))) {
        
        pendingApprovals.push({
          instanceId: instance.id,
          workflowId: instance.workflowId,
          workflowName: workflow.name,
          stepName: currentStep.name,
          initiator: instance.initiator,
          startTime: instance.startTime,
          context: instance.context,
          priority: this.calculatePriority(instance, workflow)
        });
      }
    }

    return pendingApprovals.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Cancel workflow instance
   */
  async cancelWorkflow(instanceId: string, reason: string, actor: string): Promise<void> {
    const instance = this.activeInstances.get(instanceId);
    if (!instance) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }

    instance.status = 'CANCELLED';
    instance.endTime = new Date();

    // Add audit entry
    instance.auditTrail.push({
      timestamp: new Date(),
      actor,
      action: 'CANCEL',
      stepId: undefined,
      details: { reason },
      comments: reason
    });

    // Log cancellation
    await this.auditManager.logEvent({
      id: `audit-${Date.now()}`,
      timestamp: new Date(),
      user: actor,
      action: 'WORKFLOW_CANCELLED',
      resource: instanceId,
      outcome: 'SUCCESS',
      details: {
        workflowId: instance.workflowId,
        reason,
        duration: instance.endTime.getTime() - instance.startTime.getTime()
      },
      ipAddress: instance.context.ipAddress || 'localhost',
      userAgent: instance.context.userAgent || 'GovernanceWorkflowManager',
      sessionId: instance.context.sessionId || 'system'
    });

    // Send notifications
    await this.sendWorkflowNotification(instance, 'WORKFLOW_CANCELLED', {
      reason,
      cancelledBy: actor
    });
  }

  /**
   * Validate workflow structure
   */
  private validateWorkflow(workflow: GovernanceWorkflow): void {
    if (!workflow.id || !workflow.name || !workflow.type) {
      throw new Error('Workflow must have id, name, and type');
    }

    if (!workflow.steps || workflow.steps.length === 0) {
      throw new Error('Workflow must have at least one step');
    }

    for (const step of workflow.steps) {
      if (!step.id || !step.name || !step.type) {
        throw new Error('Workflow step must have id, name, and type');
      }
    }

    if (!workflow.approvers || workflow.approvers.length === 0) {
      throw new Error('Workflow must have at least one approver');
    }
  }

  /**
   * Process next step in workflow
   */
  private async processNextStep(instance: WorkflowInstance): Promise<void> {
    const workflow = this.workflows.get(instance.workflowId);
    if (!workflow) return;

    const currentStep = workflow.steps[instance.currentStep];
    if (!currentStep) {
      // Workflow completed
      await this.completeWorkflow(instance);
      return;
    }

    // Update step status
    const stepInstance = instance.steps[instance.currentStep];
    stepInstance.status = 'ACTIVE';
    stepInstance.startTime = new Date();

    // Send notifications for manual steps
    if (currentStep.type === 'MANUAL') {
      await this.sendStepNotification(instance, currentStep);
    }

    // Process automated steps immediately
    if (currentStep.type === 'AUTOMATED') {
      await this.processAutomatedStep(instance, currentStep);
    }

    // Set timeout if specified
    if (currentStep.timeout > 0) {
      setTimeout(async () => {
        await this.handleStepTimeout(instance, currentStep);
      }, currentStep.timeout);
    }
  }

  /**
   * Process approval action
   */
  private async processApproval(
    instance: WorkflowInstance,
    action: WorkflowActionRequest,
    actor: string
  ): Promise<void> {
    const workflow = this.workflows.get(instance.workflowId);
    if (!workflow) return;

    const currentStep = workflow.steps[instance.currentStep];
    const stepInstance = instance.steps[instance.currentStep];

    // Record approval
    instance.approvals.push({
      stepId: currentStep.id,
      approver: actor,
      timestamp: new Date(),
      decision: 'APPROVED',
      comments: action.comments
    });

    // Complete current step
    stepInstance.status = 'COMPLETED';
    stepInstance.endTime = new Date();
    stepInstance.result = 'APPROVED';
    stepInstance.comments = action.comments;

    // Move to next step
    instance.currentStep++;
    await this.processNextStep(instance);
  }

  /**
   * Process rejection action
   */
  private async processRejection(
    instance: WorkflowInstance,
    action: WorkflowActionRequest,
    actor: string
  ): Promise<void> {
    const workflow = this.workflows.get(instance.workflowId);
    if (!workflow) return;

    const currentStep = workflow.steps[instance.currentStep];
    const stepInstance = instance.steps[instance.currentStep];

    // Record rejection
    instance.approvals.push({
      stepId: currentStep.id,
      approver: actor,
      timestamp: new Date(),
      decision: 'REJECTED',
      comments: action.comments
    });

    // Complete workflow with rejection
    stepInstance.status = 'COMPLETED';
    stepInstance.endTime = new Date();
    stepInstance.result = 'REJECTED';
    stepInstance.comments = action.comments;

    instance.status = 'REJECTED';
    instance.endTime = new Date();

    // Send rejection notifications
    await this.sendWorkflowNotification(instance, 'WORKFLOW_REJECTED', {
      rejectedBy: actor,
      reason: action.comments,
      stepName: currentStep.name
    });
  }

  /**
   * Process information request
   */
  private async processInfoRequest(
    instance: WorkflowInstance,
    action: WorkflowActionRequest,
    actor: string
  ): Promise<void> {
    // Send notification to initiator requesting additional information
    await this.sendWorkflowNotification(instance, 'INFO_REQUESTED', {
      requestedBy: actor,
      request: action.comments,
      stepName: this.workflows.get(instance.workflowId)?.steps[instance.currentStep]?.name
    });
  }

  /**
   * Process escalation action
   */
  private async processEscalation(
    instance: WorkflowInstance,
    action: WorkflowActionRequest,
    actor: string
  ): Promise<void> {
    const workflow = this.workflows.get(instance.workflowId);
    if (!workflow) return;

    // Find escalation approvers
    const escalationApprovers = workflow.approvers.filter(a => a.role === 'ESCALATION');
    
    if (escalationApprovers.length > 0) {
      // Notify escalation approvers
      for (const approver of escalationApprovers) {
        await this.sendWorkflowNotification(instance, 'WORKFLOW_ESCALATED', {
          escalatedBy: actor,
          reason: action.comments,
          approvers: approver.users
        });
      }
    }
  }

  /**
   * Process automated step
   */
  private async processAutomatedStep(
    instance: WorkflowInstance,
    step: WorkflowStep
  ): Promise<void> {
    const stepInstance = instance.steps[instance.currentStep];

    try {
      // Execute automated actions
      for (const action of step.actions) {
        await this.executeAutomatedAction(instance, action);
      }

      // Complete step
      stepInstance.status = 'COMPLETED';
      stepInstance.endTime = new Date();
      stepInstance.result = 'COMPLETED';

      // Move to next step
      instance.currentStep++;
      await this.processNextStep(instance);

    } catch (error) {
      stepInstance.status = 'FAILED';
      stepInstance.endTime = new Date();
      stepInstance.result = 'FAILED';
      stepInstance.comments = error.message;

      instance.status = 'FAILED';
      instance.endTime = new Date();

      // Send failure notification
      await this.sendWorkflowNotification(instance, 'WORKFLOW_FAILED', {
        stepName: step.name,
        error: error.message
      });
    }
  }

  /**
   * Execute automated action
   */
  private async executeAutomatedAction(
    instance: WorkflowInstance,
    action: WorkflowAction
  ): Promise<void> {
    switch (action.type) {
      case 'NOTIFY':
        await this.sendWorkflowNotification(instance, 'AUTOMATED_NOTIFICATION', action.parameters);
        break;
      case 'APPROVE':
        // Auto-approve step
        break;
      default:
        console.log(`Executing automated action: ${action.type}`, action.parameters);
    }
  }

  /**
   * Complete workflow
   */
  private async completeWorkflow(instance: WorkflowInstance): Promise<void> {
    instance.status = 'COMPLETED';
    instance.endTime = new Date();

    // Send completion notification
    await this.sendWorkflowNotification(instance, 'WORKFLOW_COMPLETED', {
      duration: instance.endTime.getTime() - instance.startTime.getTime(),
      totalSteps: instance.steps.length
    });

    // Log completion
    await this.auditManager.logEvent({
      id: `audit-${Date.now()}`,
      timestamp: new Date(),
      user: 'system',
      action: 'WORKFLOW_COMPLETED',
      resource: instance.id,
      outcome: 'SUCCESS',
      details: {
        workflowId: instance.workflowId,
        duration: instance.endTime.getTime() - instance.startTime.getTime(),
        totalSteps: instance.steps.length,
        approvals: instance.approvals.length
      },
      ipAddress: instance.context.ipAddress || 'localhost',
      userAgent: instance.context.userAgent || 'GovernanceWorkflowManager',
      sessionId: instance.context.sessionId || 'system'
    });

    // Remove from active instances after a delay (for audit purposes)
    setTimeout(() => {
      this.activeInstances.delete(instance.id);
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  /**
   * Handle step timeout
   */
  private async handleStepTimeout(instance: WorkflowInstance, step: WorkflowStep): Promise<void> {
    const stepInstance = instance.steps[instance.currentStep];
    
    if (stepInstance.status === 'ACTIVE') {
      // Send timeout notification
      await this.sendWorkflowNotification(instance, 'STEP_TIMEOUT', {
        stepName: step.name,
        assignee: step.assignee,
        timeout: step.timeout
      });

      // Escalate if configured
      const workflow = this.workflows.get(instance.workflowId);
      if (workflow) {
        const escalationApprovers = workflow.approvers.filter(a => a.role === 'TIMEOUT_ESCALATION');
        if (escalationApprovers.length > 0) {
          await this.processEscalation(instance, {
            type: 'ESCALATE',
            comments: `Step timeout: ${step.name}`,
            details: { timeout: step.timeout }
          }, 'system');
        }
      }
    }
  }

  /**
   * Validate action permission
   */
  private async validateActionPermission(
    instance: WorkflowInstance,
    action: WorkflowActionRequest,
    actor: string
  ): Promise<void> {
    const workflow = this.workflows.get(instance.workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const currentStep = workflow.steps[instance.currentStep];
    if (!currentStep) {
      throw new Error('No active step');
    }

    // Check if actor is assigned to current step
    if (currentStep.assignee !== actor) {
      // Check if actor is in approvers list
      const isApprover = workflow.approvers.some(a => a.users.includes(actor));
      if (!isApprover) {
        throw new Error('Actor not authorized for this action');
      }
    }
  }

  /**
   * Send step notification
   */
  private async sendStepNotification(
    instance: WorkflowInstance,
    step: WorkflowStep
  ): Promise<void> {
    await this.sendWorkflowNotification(instance, 'STEP_ASSIGNED', {
      stepName: step.name,
      assignee: step.assignee,
      description: step.description
    });
  }

  /**
   * Send workflow notification
   */
  private async sendWorkflowNotification(
    instance: WorkflowInstance,
    type: string,
    data: any
  ): Promise<void> {
    const workflow = this.workflows.get(instance.workflowId);
    if (!workflow) return;

    for (const notification of workflow.notifications) {
      await this.notificationService.send({
        type: notification.type,
        recipients: notification.recipients,
        subject: `Workflow ${type}: ${workflow.name}`,
        message: this.formatNotificationMessage(type, instance, data),
        data: {
          instanceId: instance.id,
          workflowId: instance.workflowId,
          type,
          ...data
        }
      });
    }

    // Record notification in instance
    instance.notifications.push({
      timestamp: new Date(),
      type,
      recipients: workflow.notifications.flatMap(n => n.recipients),
      data
    });
  }

  /**
   * Format notification message
   */
  private formatNotificationMessage(type: string, instance: WorkflowInstance, data: any): string {
    const workflow = this.workflows.get(instance.workflowId);
    const workflowName = workflow?.name || 'Unknown Workflow';

    switch (type) {
      case 'STEP_ASSIGNED':
        return `You have been assigned to step "${data.stepName}" in workflow "${workflowName}".`;
      case 'WORKFLOW_COMPLETED':
        return `Workflow "${workflowName}" has been completed successfully.`;
      case 'WORKFLOW_REJECTED':
        return `Workflow "${workflowName}" has been rejected by ${data.rejectedBy}. Reason: ${data.reason}`;
      case 'WORKFLOW_ESCALATED':
        return `Workflow "${workflowName}" has been escalated by ${data.escalatedBy}. Reason: ${data.reason}`;
      case 'STEP_TIMEOUT':
        return `Step "${data.stepName}" in workflow "${workflowName}" has timed out.`;
      default:
        return `Workflow "${workflowName}" notification: ${type}`;
    }
  }

  /**
   * Calculate workflow priority
   */
  private calculatePriority(instance: WorkflowInstance, workflow: GovernanceWorkflow): number {
    let priority = 0;

    // Base priority by workflow type
    switch (workflow.type) {
      case 'APPROVAL':
        priority += 50;
        break;
      case 'REVIEW':
        priority += 30;
        break;
      case 'ASSESSMENT':
        priority += 40;
        break;
      case 'REMEDIATION':
        priority += 60;
        break;
    }

    // Age factor (older workflows get higher priority)
    const ageHours = (Date.now() - instance.startTime.getTime()) / (1000 * 60 * 60);
    priority += Math.min(ageHours * 2, 40);

    return Math.round(priority);
  }
}

/**
 * Notification service interface
 */
interface NotificationService {
  send(notification: {
    type: string;
    recipients: string[];
    subject: string;
    message: string;
    data: any;
  }): Promise<void>;
}

/**
 * Workflow context interface
 */
interface WorkflowContext {
  requestId?: string;
  requestType?: string;
  requestData?: any;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dueDate?: Date;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

/**
 * Workflow instance interface
 */
interface WorkflowInstance {
  id: string;
  workflowId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'REJECTED' | 'CANCELLED' | 'FAILED';
  currentStep: number;
  context: WorkflowContext;
  initiator: string;
  startTime: Date;
  endTime?: Date;
  steps: WorkflowStepInstance[];
  approvals: WorkflowApprovalRecord[];
  notifications: WorkflowNotificationRecord[];
  auditTrail: WorkflowAuditEntry[];
}

/**
 * Workflow step instance interface
 */
interface WorkflowStepInstance {
  stepId: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  assignee: string;
  startTime?: Date;
  endTime?: Date;
  result?: string;
  comments?: string;
}

/**
 * Workflow approval record interface
 */
interface WorkflowApprovalRecord {
  stepId: string;
  approver: string;
  timestamp: Date;
  decision: 'APPROVED' | 'REJECTED';
  comments?: string;
}

/**
 * Workflow notification record interface
 */
interface WorkflowNotificationRecord {
  timestamp: Date;
  type: string;
  recipients: string[];
  data: any;
}

/**
 * Workflow audit entry interface
 */
interface WorkflowAuditEntry {
  timestamp: Date;
  actor: string;
  action: string;
  stepId?: string;
  details: any;
  comments?: string;
}

/**
 * Workflow action request interface
 */
interface WorkflowActionRequest {
  type: 'APPROVE' | 'REJECT' | 'REQUEST_INFO' | 'ESCALATE';
  comments?: string;
  details?: any;
}

/**
 * Workflow instance filter interface
 */
interface WorkflowInstanceFilter {
  workflowId?: string;
  status?: string;
  initiator?: string;
  assignee?: string;
}

/**
 * Workflow pending approval interface
 */
interface WorkflowPendingApproval {
  instanceId: string;
  workflowId: string;
  workflowName: string;
  stepName: string;
  initiator: string;
  startTime: Date;
  context: WorkflowContext;
  priority: number;
}