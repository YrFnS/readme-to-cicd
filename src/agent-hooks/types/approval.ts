import { RepositoryInfo } from './index';
import { AutomationDecision } from './index';
import { SecurityAlert } from './security';

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  ESCALATED = 'escalated'
}

export enum ApprovalType {
  AUTOMATION_DECISION = 'automation_decision',
  SECURITY_FIX = 'security_fix',
  DEPENDENCY_UPDATE = 'dependency_update',
  INFRASTRUCTURE_CHANGE = 'infrastructure_change',
  CONFIGURATION_CHANGE = 'configuration_change',
  CUSTOM = 'custom'
}

export enum UserRole {
  ADMIN = 'admin',
  APPROVER = 'approver',
  REVIEWER = 'reviewer',
  DEVELOPER = 'developer',
  VIEWER = 'viewer'
}

export enum TeamRole {
  OWNER = 'owner',
  MAINTAINER = 'maintainer',
  MEMBER = 'member'
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  role: UserRole;
  teams: string[];
  preferences: UserPreferences;
  createdAt: Date;
  lastActive: Date;
  isActive: boolean;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  members: TeamMember[];
  repositories: string[];
  approvalPolicies: ApprovalPolicy[];
  notificationSettings: TeamNotificationSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  userId: string;
  role: TeamRole;
  joinedAt: Date;
  permissions: Permission[];
}

export interface Permission {
  resource: string;
  action: string;
  scope: string;
}

export interface UserPreferences {
  timezone: string;
  language: string;
  notificationChannels: string[];
  approvalDelegation: boolean;
  autoApproveThreshold?: number;
  workingHours: WorkingHours;
}

export interface WorkingHours {
  timezone: string;
  schedule: {
    [key: string]: {
      start: string;
      end: string;
      enabled: boolean;
    };
  };
}

export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  title: string;
  description: string;
  requesterId: string;
  repository: RepositoryInfo;
  data: ApprovalRequestData;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: ApprovalStatus;
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  autoApproveAt?: Date;
  escalationPolicy?: EscalationPolicy;
  approvers: ApprovalAssignment[];
  reviewers: ApprovalAssignment[];
  currentStep: number;
  steps: ApprovalStep[];
  comments: ApprovalComment[];
  attachments: ApprovalAttachment[];
  metadata: Record<string, any>;
}

export interface ApprovalRequestData {
  automationDecision?: AutomationDecision;
  securityAlert?: SecurityAlert;
  dependencyUpdate?: DependencyUpdate;
  infrastructureChange?: InfrastructureChange;
  configurationChange?: ConfigurationChange;
  customData?: Record<string, any>;
}

export interface DependencyUpdate {
  packageName: string;
  currentVersion: string;
  newVersion: string;
  vulnerability?: {
    severity: string;
    description: string;
  };
}

export interface InfrastructureChange {
  resourceType: string;
  action: string;
  impact: string;
  rollbackPlan?: string;
}

export interface ConfigurationChange {
  filePath: string;
  changes: ConfigurationDiff[];
  impact: string;
}

export interface ConfigurationDiff {
  lineNumber?: number;
  oldValue?: string;
  newValue: string;
  context: string;
}

export interface ApprovalAssignment {
  userId: string;
  assignedAt: Date;
  dueDate?: Date;
  status: 'pending' | 'approved' | 'rejected' | 'delegated';
  delegatedTo?: string;
  response?: ApprovalResponse;
  respondedAt?: Date;
}

export interface ApprovalResponse {
  decision: 'approve' | 'reject' | 'request_changes';
  comment?: string;
  conditions?: string[];
  approvalLevel?: number;
  metadata: Record<string, any>;
}

export interface ApprovalStep {
  id: string;
  name: string;
  description?: string;
  order: number;
  approverRoles: UserRole[];
  teamIds: string[];
  minApprovals: number;
  requiresUnanimous?: boolean;
  timeoutHours: number;
  autoApprove: boolean;
  conditions?: ApprovalCondition[];
}

export interface ApprovalCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'not_contains' | 'regex' | 'in' | 'not_in';
  value: any;
  negate?: boolean;
}

export interface ApprovalComment {
  id: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isInternal: boolean;
  attachments: ApprovalAttachment[];
}

export interface ApprovalAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface ApprovalPolicy {
  id: string;
  name: string;
  description?: string;
  teamId?: string;
  repositoryPattern?: string;
  approvalType: ApprovalType;
  conditions: ApprovalCondition[];
  workflow: ApprovalWorkflow;
  enabled: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalWorkflow {
  name: string;
  steps: ApprovalStep[];
  escalationPolicy?: EscalationPolicy;
  timeoutPolicy?: TimeoutPolicy;
  notificationPolicy?: NotificationPolicy;
}

export interface EscalationPolicy {
  enabled: boolean;
  levels: EscalationLevel[];
  maxLevels: number;
}

export interface EscalationLevel {
  level: number;
  timeoutHours: number;
  escalateToRoles: UserRole[];
  escalateToTeams: string[];
  notifyChannels: string[];
}

export interface TimeoutPolicy {
  action: 'auto_approve' | 'auto_reject' | 'escalate' | 'remind';
  timeoutHours: number;
  reminderHours?: number[];
}

export interface NotificationPolicy {
  channels: string[];
  templates: Record<string, string>;
  frequency: 'immediate' | 'daily' | 'weekly';
  includeDetails: boolean;
  includeAttachments: boolean;
}

export interface TeamNotificationSettings {
  approvalRequests: boolean;
  approvalDecisions: boolean;
  escalationAlerts: boolean;
  timeoutAlerts: boolean;
  channels: string[];
  templates: Record<string, string>;
}

export interface ApprovalMetrics {
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  expired_requests: number;
  avg_approval_time: number;
  avg_rejection_time: number;
  approval_rate: number;
  team_metrics: Record<string, TeamApprovalMetrics>;
  user_metrics: Record<string, UserApprovalMetrics>;
}

export interface TeamApprovalMetrics {
  team_id: string;
  team_name: string;
  total_requests: number;
  approved_requests: number;
  rejected_requests: number;
  avg_approval_time: number;
  approval_rate: number;
  active_approvers: number;
}

export interface UserApprovalMetrics {
  user_id: string;
  user_name: string;
  total_assigned: number;
  total_approved: number;
  total_rejected: number;
  avg_response_time: number;
  approval_rate: number;
  delegation_rate: number;
}

export interface ApprovalDashboard {
  pending_approvals: ApprovalRequest[];
  overdue_approvals: ApprovalRequest[];
  recent_decisions: ApprovalDecision[];
  team_performance: TeamApprovalMetrics[];
  system_health: {
    healthy_approvers: number;
    total_approvers: number;
    avg_response_time: number;
  };
  bottlenecks: ApprovalBottleneck[];
}

export interface ApprovalDecision {
  requestId: string;
  userId: string;
  decision: 'approve' | 'reject' | 'request_changes';
  timestamp: Date;
  comment?: string;
  conditions?: string[];
}

export interface ApprovalBottleneck {
  type: 'user_unavailable' | 'team_backlog' | 'complex_request' | 'missing_information';
  description: string;
  affected_requests: number;
  impact: 'low' | 'medium' | 'high';
  suggestion: string;
}

export interface ApprovalTemplate {
  id: string;
  name: string;
  description?: string;
  type: ApprovalType;
  titleTemplate: string;
  descriptionTemplate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  defaultWorkflow: ApprovalWorkflow;
  conditions: ApprovalCondition[];
  enabled: boolean;
  metadata: Record<string, any>;
}

export interface ApprovalAuditLog {
  id: string;
  requestId: string;
  userId: string;
  action: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface ApprovalReminder {
  id: string;
  requestId: string;
  userId: string;
  type: 'assignment' | 'due_date' | 'escalation' | 'timeout';
  scheduledFor: Date;
  sentAt?: Date;
  status: 'pending' | 'sent' | 'cancelled';
  metadata: Record<string, any>;
}

export interface ApprovalDelegation {
  id: string;
  delegatorId: string;
  delegateId: string;
  startDate: Date;
  endDate?: Date;
  conditions?: ApprovalCondition[];
  isActive: boolean;
  createdAt: Date;
  metadata: Record<string, any>;
}