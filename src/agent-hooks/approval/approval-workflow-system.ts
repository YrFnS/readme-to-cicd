import {
  User,
  Team,
  UserRole,
  TeamRole,
  ApprovalRequest,
  ApprovalStatus,
  ApprovalType,
  ApprovalAssignment,
  ApprovalStep,
  ApprovalResponse,
  ApprovalComment,
  ApprovalPolicy,
  ApprovalWorkflow,
  ApprovalTemplate,
  ApprovalMetrics,
  ApprovalDashboard,
  ApprovalAuditLog,
  ApprovalReminder,
  ApprovalDelegation,
  ApprovalRequestData,
  EscalationPolicy,
  EscalationLevel,
  TimeoutPolicy,
  NotificationPolicy
} from '../types/approval';
import { RepositoryInfo } from '../types';
import { AutomationDecision } from '../types';
import { SecurityAlert } from '../types/security';
import { ErrorHandler } from '../errors/error-handler';
import { NotificationSystem } from '../notifications/notification-system';
import { NotificationType, NotificationPriority, NotificationChannel } from '../types/notifications';

export class ApprovalWorkflowSystem {
  private users: Map<string, User>;
  private teams: Map<string, Team>;
  private approvalRequests: Map<string, ApprovalRequest>;
  private approvalPolicies: Map<string, ApprovalPolicy>;
  private approvalTemplates: Map<string, ApprovalTemplate>;
  private delegations: Map<string, ApprovalDelegation[]>;
  private auditLogs: ApprovalAuditLog[];
  private reminders: Map<string, ApprovalReminder[]>;

  private errorHandler: ErrorHandler;
  private notificationSystem: NotificationSystem;

  constructor(
    errorHandler: ErrorHandler,
    notificationSystem: NotificationSystem
  ) {
    this.users = new Map();
    this.teams = new Map();
    this.approvalRequests = new Map();
    this.approvalPolicies = new Map();
    this.approvalTemplates = new Map();
    this.delegations = new Map();
    this.auditLogs = [];
    this.reminders = new Map();

    this.errorHandler = errorHandler;
    this.notificationSystem = notificationSystem;
  }

  // User Management
  addUser(user: User): void {
    this.users.set(user.id, user);
    this.logAudit('user_created', user.id, user.id, { user });
  }

  updateUser(userId: string, updates: Partial<User>): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    const updatedUser = { ...user, ...updates };
    this.users.set(userId, updatedUser);
    this.logAudit('user_updated', userId, userId, { updates });
    return true;
  }

  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }


  // Team Management
  createTeam(team: Team): void {
    this.teams.set(team.id, team);
    this.logAudit('team_created', team.id, 'system', { team });
  }

  addTeamMember(teamId: string, userId: string, role: TeamRole): boolean {
    const team = this.teams.get(teamId);
    const user = this.users.get(userId);

    if (!team || !user) return false;

    const existingMember = team.members.find(m => m.userId === userId);
    if (existingMember) return false;

    team.members.push({
      userId,
      role,
      joinedAt: new Date(),
      permissions: this.getDefaultPermissions(role)
    });

    this.logAudit('team_member_added', teamId, userId, { role });
    return true;
  }

  removeTeamMember(teamId: string, userId: string): boolean {
    const team = this.teams.get(teamId);
    if (!team) return false;

    const memberIndex = team.members.findIndex(m => m.userId === userId);
    if (memberIndex === -1) return false;

    team.members.splice(memberIndex, 1);
    this.logAudit('team_member_removed', teamId, userId, {});
    return true;
  }

  getTeam(teamId: string): Team | undefined {
    return this.teams.get(teamId);
  }

  getUserTeams(userId: string): Team[] {
    return Array.from(this.teams.values()).filter(team =>
      team.members.some(member => member.userId === userId)
    );
  }

  // Approval Request Management
  async createApprovalRequest(
    type: ApprovalType,
    title: string,
    description: string,
    requesterId: string,
    repository: RepositoryInfo,
    data: ApprovalRequestData,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
  ): Promise<string> {
    try {
      // Find applicable approval policy
      const policy = this.findApplicablePolicy(type, repository);
      if (!policy) {
        throw new Error(`No approval policy found for ${type} in ${repository.fullName}`);
      }

      // Create approval request
      const request: ApprovalRequest = {
        id: this.generateId('approval'),
        type,
        title,
        description,
        requesterId,
        repository,
        data,
        priority,
        status: ApprovalStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        approvers: [],
        reviewers: [],
        currentStep: 0,
        steps: policy.workflow.steps,
        comments: [],
        attachments: [],
        metadata: {}
      };

      // Assign approvers for current step
      await this.assignStepApprovers(request);

      this.approvalRequests.set(request.id, request);
      this.logAudit('approval_request_created', request.id, requesterId, { request });

      // Send notifications
      await this.notifyApprovalRequest(request);

      // Schedule reminders
      await this.scheduleReminders(request);

      return request.id;

    } catch (error) {
      await this.errorHandler.handleError(error as Error, {
        component: 'approval-workflow-system',
        operation: 'create_approval_request',
        repository: repository.fullName
      });
      throw error;
    }
  }

  async approveRequest(
    requestId: string,
    userId: string,
    decision: 'approve' | 'reject' | 'request_changes',
    comment?: string,
    conditions?: string[]
  ): Promise<boolean> {
    try {
      const request = this.approvalRequests.get(requestId);
      if (!request) return false;

      const assignment = this.findUserAssignment(request, userId);
      if (!assignment) return false;

      // Update assignment
      assignment.status = decision === 'approve' ? 'approved' : 'rejected';
      const response: any = {
        decision,
        metadata: {}
      };
      if (comment) response.comment = comment;
      if (conditions) response.conditions = conditions;
      assignment.response = response;
      assignment.respondedAt = new Date();

      this.logAudit('approval_response', requestId, userId, {
        decision,
        comment,
        conditions
      });

      // Check if step is complete
      const stepComplete = this.isStepComplete(request);
      if (stepComplete) {
        await this.advanceToNextStep(request);
      }

      // Send notification
      await this.notifyApprovalDecision(request, assignment);

      return true;

    } catch (error) {
      await this.errorHandler.handleError(error as Error, {
        component: 'approval-workflow-system',
        operation: 'approve_request'
      });
      throw error;
    }
  }

  async addComment(
    requestId: string,
    userId: string,
    content: string,
    isInternal: boolean = false
  ): Promise<boolean> {
    try {
      const request = this.approvalRequests.get(requestId);
      if (!request) return false;

      const comment: ApprovalComment = {
        id: this.generateId('comment'),
        userId,
        content,
        createdAt: new Date(),
        updatedAt: new Date(),
        isInternal,
        attachments: []
      };

      request.comments.push(comment);
      request.updatedAt = new Date();

      this.logAudit('comment_added', requestId, userId, { comment: comment.id });

      // Notify relevant parties
      await this.notifyComment(request, comment);

      return true;

    } catch (error) {
      await this.errorHandler.handleError(error as Error, {
        component: 'approval-workflow-system',
        operation: 'add_comment'
      });
      throw error;
    }
  }

  // Policy Management
  addApprovalPolicy(policy: ApprovalPolicy): void {
    this.approvalPolicies.set(policy.id, policy);
    this.logAudit('policy_created', policy.id, 'system', { policy });
  }

  removeApprovalPolicy(policyId: string): void {
    this.approvalPolicies.delete(policyId);
    this.logAudit('policy_removed', policyId, 'system', {});
  }

  getApplicablePolicies(repository: RepositoryInfo, type: ApprovalType): ApprovalPolicy[] {
    return Array.from(this.approvalPolicies.values()).filter(policy => {
      if (!policy.enabled || policy.approvalType !== type) return false;

      // Check repository pattern
      if (policy.repositoryPattern) {
        const regex = new RegExp(policy.repositoryPattern);
        if (!regex.test(repository.fullName)) return false;
      }

      // Check team membership
      if (policy.teamId) {
        const team = this.teams.get(policy.teamId);
        if (!team || !team.repositories.includes(repository.fullName)) return false;
      }

      return true;
    });
  }

  // Template Management
  addApprovalTemplate(template: ApprovalTemplate): void {
    this.approvalTemplates.set(template.id, template);
    this.logAudit('template_created', template.id, 'system', { template });
  }

  getApprovalTemplate(type: ApprovalType): ApprovalTemplate | undefined {
    return Array.from(this.approvalTemplates.values()).find(template =>
      template.type === type && template.enabled
    );
  }

  // Delegation Management
  addDelegation(delegation: ApprovalDelegation): void {
    const delegatorDelegations = this.delegations.get(delegation.delegatorId) || [];
    delegatorDelegations.push(delegation);
    this.delegations.set(delegation.delegatorId, delegatorDelegations);

    this.logAudit('delegation_created', delegation.id, delegation.delegatorId, { delegation });
  }

  removeDelegation(delegationId: string): void {
    for (const [userId, delegations] of this.delegations.entries()) {
      const index = delegations.findIndex(d => d.id === delegationId);
      if (index !== -1) {
        delegations.splice(index, 1);
        this.logAudit('delegation_removed', delegationId, userId, {});
        break;
      }
    }
  }

  getActiveDelegations(userId: string): ApprovalDelegation[] {
    const delegations = this.delegations.get(userId) || [];
    const now = new Date();

    return delegations.filter(delegation => {
      if (!delegation.isActive) return false;
      if (delegation.startDate > now) return false;
      if (delegation.endDate && delegation.endDate < now) return false;
      return true;
    });
  }

  // Metrics and Dashboard
  getApprovalMetrics(): ApprovalMetrics {
    const requests = Array.from(this.approvalRequests.values());

    const totalRequests = requests.length;
    const pendingRequests = requests.filter(r => r.status === ApprovalStatus.PENDING).length;
    const approvedRequests = requests.filter(r => r.status === ApprovalStatus.APPROVED).length;
    const rejectedRequests = requests.filter(r => r.status === ApprovalStatus.REJECTED).length;
    const expiredRequests = requests.filter(r => r.status === ApprovalStatus.EXPIRED).length;

    const approvalTimes = requests
      .filter(r => r.status === ApprovalStatus.APPROVED && r.updatedAt)
      .map(r => r.updatedAt.getTime() - r.createdAt.getTime());

    const avgApprovalTime = approvalTimes.length > 0
      ? approvalTimes.reduce((sum, time) => sum + time, 0) / approvalTimes.length
      : 0;

    const approvalRate = totalRequests > 0 ? (approvedRequests / totalRequests) * 100 : 100;

    return {
      total_requests: totalRequests,
      pending_requests: pendingRequests,
      approved_requests: approvedRequests,
      rejected_requests: rejectedRequests,
      expired_requests: expiredRequests,
      avg_approval_time: avgApprovalTime,
      avg_rejection_time: 0, // Would calculate from rejection timestamps
      approval_rate: approvalRate,
      team_metrics: {},
      user_metrics: {}
    };
  }

  getApprovalDashboard(userId?: string): ApprovalDashboard {
    const requests = Array.from(this.approvalRequests.values());

    const pendingApprovals = requests.filter(r =>
      r.status === ApprovalStatus.PENDING &&
      r.approvers.some(a => a.userId === userId && a.status === 'pending')
    );

    const now = new Date();
    const overdueApprovals = requests.filter(r =>
      r.status === ApprovalStatus.PENDING &&
      r.dueDate && r.dueDate < now
    );

    const recentDecisions = this.auditLogs
      .filter(log => log.action === 'approval_response')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10)
      .map(log => ({
        requestId: log.requestId,
        userId: log.userId,
        decision: (log.details as any).decision,
        timestamp: log.timestamp,
        comment: (log.details as any).comment
      }));

    return {
      pending_approvals: pendingApprovals,
      overdue_approvals: overdueApprovals,
      recent_decisions: recentDecisions,
      team_performance: [],
      system_health: {
        healthy_approvers: this.getHealthyApproverCount(),
        total_approvers: this.users.size,
        avg_response_time: this.calculateAvgResponseTime()
      },
      bottlenecks: this.identifyBottlenecks()
    };
  }

  // Helper Methods
  private findApplicablePolicy(type: ApprovalType, repository: RepositoryInfo): ApprovalPolicy | undefined {
    const applicablePolicies = this.getApplicablePolicies(repository, type);

    // Return the highest priority policy
    return applicablePolicies.sort((a, b) => b.priority - a.priority)[0];
  }

  private async assignStepApprovers(request: ApprovalRequest): Promise<void> {
    const currentStep = request.steps[request.currentStep];
    if (!currentStep) return;

    const approvers: ApprovalAssignment[] = [];

    // Add role-based approvers
    for (const role of currentStep.approverRoles) {
      const users = this.getUsersByRole(role);
      for (const user of users) {
        if (this.isUserEligible(user, request.repository)) {
          approvers.push({
            userId: user.id,
            assignedAt: new Date(),
            dueDate: this.calculateDueDate(currentStep.timeoutHours),
            status: 'pending'
          });
        }
      }
    }

    // Add team-based approvers
    for (const teamId of currentStep.teamIds) {
      const team = this.teams.get(teamId);
      if (!team) continue;

      for (const member of team.members) {
        if (member.role === TeamRole.OWNER || member.role === TeamRole.MAINTAINER) {
          approvers.push({
            userId: member.userId,
            assignedAt: new Date(),
            dueDate: this.calculateDueDate(currentStep.timeoutHours),
            status: 'pending'
          });
        }
      }
    }

    request.approvers = approvers;
  }

  private isStepComplete(request: ApprovalRequest): boolean {
    const currentStep = request.steps[request.currentStep];
    if (!currentStep) return true;

    const stepApprovers = request.approvers.filter(a =>
      request.approvers.some(ra => ra.userId === a.userId)
    );

    const approvedCount = stepApprovers.filter(a => a.status === 'approved').length;
    const minApprovals = currentStep.minApprovals || stepApprovers.length;

    return approvedCount >= minApprovals;
  }

  private async advanceToNextStep(request: ApprovalRequest): Promise<void> {
    request.currentStep++;

    if (request.currentStep >= request.steps.length) {
      // Workflow complete
      request.status = ApprovalStatus.APPROVED;
      request.updatedAt = new Date();
      await this.notifyWorkflowComplete(request);
    } else {
      // Move to next step
      request.approvers = [];
      await this.assignStepApprovers(request);
      await this.notifyStepAdvanced(request);
    }
  }

  private findUserAssignment(request: ApprovalRequest, userId: string): ApprovalAssignment | undefined {
    return request.approvers.find(a => a.userId === userId) ||
           request.reviewers.find(r => r.userId === userId);
  }

  private isUserEligible(user: User, repository: RepositoryInfo): boolean {
    // Check if user is active and has appropriate permissions
    if (!user.isActive) return false;

    // Check team membership for repository
    const userTeams = this.getUserTeams(user.id);
    return userTeams.some(team => team.repositories.includes(repository.fullName));
  }

  private calculateDueDate(timeoutHours: number): Date {
    const now = new Date();
    now.setHours(now.getHours() + timeoutHours);
    return now;
  }

  private getUsersByRole(role: UserRole): User[] {
    return Array.from(this.users.values()).filter(user => user.role === role);
  }

  private getDefaultPermissions(role: TeamRole): any[] {
    // Would implement role-based permissions
    return [];
  }

  // Notification Methods
  private async notifyApprovalRequest(request: ApprovalRequest): Promise<void> {
    const approvers = request.approvers.map(a => a.userId);
    const recipients = approvers.map(userId => {
      const user = this.users.get(userId);
      return user ? { channel: NotificationChannel.SLACK as const, address: `@${user.username}` } : null;
    }).filter(Boolean);

    if (recipients.length > 0) {
      await this.notificationSystem.sendNotification(
        NotificationType.CUSTOM,
        NotificationPriority.HIGH,
        `Approval Request: ${request.title}`,
        `New approval request requires your attention:\n\n${request.description}`,
        recipients as any,
        request.repository,
        { requestId: request.id }
      );
    }
  }

  private async notifyApprovalDecision(request: ApprovalRequest, assignment: ApprovalAssignment): Promise<void> {
    // Notify requester
    const requester = this.users.get(request.requesterId);
    if (requester) {
      await this.notificationSystem.sendNotification(
        NotificationType.CUSTOM,
        NotificationPriority.MEDIUM,
        `Approval Decision: ${request.title}`,
        `${assignment.response?.decision.toUpperCase()} by user`,
        [{ channel: NotificationChannel.SLACK as const, address: `@${requester.username}` }],
        request.repository,
        { requestId: request.id, decision: assignment.response?.decision }
      );
    }
  }

  private async notifyWorkflowComplete(request: ApprovalRequest): Promise<void> {
    const requester = this.users.get(request.requesterId);
    if (requester) {
      await this.notificationSystem.sendNotification(
        NotificationType.CUSTOM,
        NotificationPriority.MEDIUM,
        `Approval Complete: ${request.title}`,
        `Your approval request has been ${request.status.toLowerCase()}`,
        [{ channel: NotificationChannel.SLACK as const, address: `@${requester.username}` }],
        request.repository,
        { requestId: request.id, status: request.status }
      );
    }
  }

  private async notifyStepAdvanced(request: ApprovalRequest): Promise<void> {
    const newApprovers = request.approvers.map(a => a.userId);
    // Notify new step approvers
    // Implementation would send notifications to new approvers
  }

  private async notifyComment(request: ApprovalRequest, comment: ApprovalComment): Promise<void> {
    // Notify relevant parties about new comment
    // Implementation would determine who should be notified
  }

  // Reminder and Escalation Methods
  private async scheduleReminders(request: ApprovalRequest): Promise<void> {
    // Schedule reminders for due dates, escalations, etc.
    // Implementation would create and schedule reminder jobs
  }

  // Metrics and Analytics Methods
  private getHealthyApproverCount(): number {
    return Array.from(this.users.values()).filter(user =>
      user.isActive && user.role !== UserRole.VIEWER
    ).length;
  }

  private calculateAvgResponseTime(): number {
    // Calculate average response time from audit logs
    const responseLogs = this.auditLogs.filter(log => log.action === 'approval_response');

    if (responseLogs.length === 0) return 0;

    const totalTime = responseLogs.reduce((sum, log) => {
      const request = this.approvalRequests.get(log.requestId);
      if (!request) return sum;

      const responseTime = log.timestamp.getTime() - request.createdAt.getTime();
      return sum + responseTime;
    }, 0);

    return totalTime / responseLogs.length;
  }

  private identifyBottlenecks(): any[] {
    // Analyze approval patterns to identify bottlenecks
    // Implementation would look for patterns in approval delays
    return [];
  }

  // Audit and Logging
  private logAudit(action: string, resourceId: string, userId: string, details: Record<string, any>): void {
    const auditLog: ApprovalAuditLog = {
      id: this.generateId('audit'),
      requestId: resourceId,
      userId,
      action,
      details,
      timestamp: new Date()
    };

    this.auditLogs.push(auditLog);
  }

  // Utility Methods
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}