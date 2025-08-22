import { RepositoryInfo, WebhookEvent, RepositoryChanges, AutomationDecision } from './index';

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  triggers: RuleTrigger[];
  conditions: RuleCondition[];
  actions: RuleAction[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  owner?: string;
  tags?: string[];
}

export interface RuleTrigger {
  type: 'webhook_event' | 'repository_change' | 'schedule' | 'performance_threshold' | 'security_alert';
  eventType?: string; // For webhook events
  changeType?: 'dependency' | 'configuration' | 'file' | 'readme'; // For repository changes
  schedule?: string; // Cron expression for scheduled triggers
  threshold?: number; // For performance thresholds
  debounceMs?: number; // Debounce time to avoid duplicate triggers
}

export interface RuleCondition {
  type: 'file_exists' | 'file_contains' | 'dependency_version' | 'framework_detected' |
        'performance_metric' | 'security_vulnerability' | 'repository_size' | 'team_member';
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' |
           'less_than' | 'matches' | 'not_matches' | 'in' | 'not_in';
  value: any;
  field?: string; // Specific field to check (e.g., 'severity' for security alerts)
  negate?: boolean; // Whether to negate the condition
}

export interface RuleAction {
  type: 'create_pr' | 'create_issue' | 'send_notification' | 'run_analysis' |
        'update_workflow' | 'trigger_deployment' | 'security_scan' | 'performance_report';
  parameters: Record<string, any>;
  approvalRequired: boolean;
  notificationChannels?: string[];
  retryCount?: number;
  timeout?: number;
}

export interface RuleEvaluationContext {
  webhookEvent?: WebhookEvent;
  repository: RepositoryInfo;
  changes?: RepositoryChanges;
  performanceMetrics?: any;
  securityAlerts?: any[];
  timestamp: Date;
  rule: AutomationRule;
}

export interface RuleEvaluationResult {
  rule: AutomationRule;
  triggered: boolean;
  conditionsMet: boolean;
  actions: RuleActionResult[];
  confidence: number; // 0-1
  reasoning: string[];
  errors: string[];
}

export interface RuleActionResult {
  action: RuleAction;
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
  approved?: boolean;
  approvalRequestId?: string;
}

export interface RuleConflict {
  conflictingRules: AutomationRule[];
  conflictType: 'priority' | 'action' | 'condition';
  resolution: 'highest_priority' | 'manual' | 'merge' | 'skip';
  description: string;
}

export interface RuleValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: 'security' | 'performance' | 'quality' | 'deployment' | 'monitoring';
  triggers: RuleTrigger[];
  conditions: RuleCondition[];
  actions: RuleAction[];
  tags: string[];
}

export interface RuleExecutionHistory {
  ruleId: string;
  executionId: string;
  timestamp: Date;
  context: RuleEvaluationContext;
  result: RuleEvaluationResult;
  duration: number;
  success: boolean;
}

export interface RuleMetrics {
  ruleId: string;
  executions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecuted?: Date;
  triggers: number;
  falsePositives: number;
  truePositives: number;
  precision: number; // truePositives / (truePositives + falsePositives)
  recall: number; // truePositives / total relevant cases
}

export type RuleSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface RuleAlert {
  id: string;
  ruleId: string;
  severity: RuleSeverity;
  message: string;
  context: RuleEvaluationContext;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}