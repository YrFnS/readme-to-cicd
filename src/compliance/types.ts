/**
 * Core types and interfaces for compliance management system
 */

export interface ComplianceFramework {
  id: string;
  name: string;
  version: string;
  type: 'SOC2' | 'HIPAA' | 'PCI-DSS' | 'GDPR' | 'ISO27001' | 'CUSTOM';
  requirements: ComplianceRequirement[];
  controls: ComplianceControl[];
  assessmentCriteria: AssessmentCriteria[];
}

export interface ComplianceRequirement {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  controls: string[];
  evidence: EvidenceRequirement[];
}

export interface ComplianceControl {
  id: string;
  name: string;
  description: string;
  type: 'PREVENTIVE' | 'DETECTIVE' | 'CORRECTIVE';
  implementation: ControlImplementation;
  testing: ControlTesting;
  frequency: 'CONTINUOUS' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
}

export interface ControlImplementation {
  automated: boolean;
  manual: boolean;
  procedures: string[];
  tools: string[];
  responsible: string[];
}

export interface ControlTesting {
  method: 'AUTOMATED' | 'MANUAL' | 'HYBRID';
  frequency: string;
  criteria: TestCriteria[];
  evidence: string[];
}

export interface TestCriteria {
  id: string;
  description: string;
  expectedResult: string;
  tolerance: number;
}

export interface EvidenceRequirement {
  type: 'DOCUMENT' | 'LOG' | 'SCREENSHOT' | 'REPORT' | 'CERTIFICATE';
  description: string;
  retention: number; // days
  location: string;
}

export interface AssessmentCriteria {
  id: string;
  requirement: string;
  weight: number;
  scoring: ScoringMethod;
}

export interface ScoringMethod {
  type: 'BINARY' | 'WEIGHTED' | 'PERCENTAGE';
  scale: number;
  thresholds: ScoreThreshold[];
}

export interface ScoreThreshold {
  level: 'COMPLIANT' | 'PARTIALLY_COMPLIANT' | 'NON_COMPLIANT';
  minScore: number;
  maxScore: number;
}

export interface ComplianceReport {
  id: string;
  framework: string;
  timestamp: Date;
  overallScore: number;
  status: 'COMPLIANT' | 'PARTIALLY_COMPLIANT' | 'NON_COMPLIANT';
  findings: ComplianceFinding[];
  recommendations: ComplianceRecommendation[];
  evidence: ComplianceEvidence[];
  nextAssessment: Date;
}

export interface ComplianceFinding {
  id: string;
  requirement: string;
  control: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PASS' | 'FAIL' | 'NOT_APPLICABLE' | 'NOT_TESTED';
  description: string;
  evidence: string[];
  remediation: RemediationAction[];
}

export interface RemediationAction {
  id: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignee: string;
  dueDate: Date;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'DEFERRED';
}

export interface ComplianceRecommendation {
  id: string;
  category: string;
  description: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  timeline: string;
}

export interface ComplianceEvidence {
  id: string;
  type: string;
  description: string;
  location: string;
  timestamp: Date;
  hash: string;
  metadata: Record<string, any>;
}

export interface Policy {
  id: string;
  name: string;
  version: string;
  description: string;
  type: 'SECURITY' | 'OPERATIONAL' | 'COMPLIANCE' | 'GOVERNANCE';
  scope: PolicyScope;
  rules: PolicyRule[];
  enforcement: PolicyEnforcement;
  exceptions: PolicyException[];
  approvals: PolicyApproval[];
}

export interface PolicyScope {
  components: string[];
  environments: string[];
  users: string[];
  resources: string[];
}

export interface PolicyRule {
  id: string;
  condition: string;
  action: 'ALLOW' | 'DENY' | 'WARN' | 'LOG';
  parameters: Record<string, any>;
  exceptions: string[];
}

export interface PolicyEnforcement {
  mode: 'ENFORCING' | 'PERMISSIVE' | 'DISABLED';
  automated: boolean;
  notifications: NotificationConfig[];
  escalation: EscalationConfig;
}

export interface NotificationConfig {
  type: 'EMAIL' | 'SLACK' | 'WEBHOOK' | 'SMS';
  recipients: string[];
  template: string;
  conditions: string[];
}

export interface EscalationConfig {
  levels: EscalationLevel[];
  timeout: number;
  autoEscalate: boolean;
}

export interface EscalationLevel {
  level: number;
  recipients: string[];
  timeout: number;
  actions: string[];
}

export interface PolicyException {
  id: string;
  reason: string;
  requestor: string;
  approver: string;
  expiration: Date;
  conditions: string[];
}

export interface PolicyApproval {
  id: string;
  approver: string;
  timestamp: Date;
  comments: string;
  status: 'APPROVED' | 'REJECTED' | 'PENDING';
}

export interface PolicyResult {
  policyId: string;
  decision: 'ALLOW' | 'DENY' | 'WARN';
  reason: string;
  evidence: string[];
  recommendations: string[];
}

export interface RiskAssessment {
  id: string;
  title: string;
  description: string;
  category: 'SECURITY' | 'OPERATIONAL' | 'COMPLIANCE' | 'FINANCIAL' | 'REPUTATIONAL';
  likelihood: RiskLevel;
  impact: RiskLevel;
  riskScore: number;
  mitigation: MitigationStrategy[];
  owner: string;
  status: 'IDENTIFIED' | 'ASSESSED' | 'MITIGATED' | 'ACCEPTED' | 'TRANSFERRED';
  lastReview: Date;
  nextReview: Date;
}

export interface RiskLevel {
  level: 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  score: number;
  justification: string;
}

export interface MitigationStrategy {
  id: string;
  type: 'AVOID' | 'MITIGATE' | 'TRANSFER' | 'ACCEPT';
  description: string;
  controls: string[];
  cost: number;
  effectiveness: number;
  timeline: string;
  responsible: string;
}

export interface AuditEvent {
  id: string;
  timestamp: Date;
  user: string;
  action: string;
  resource: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'ERROR';
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
}

export interface AuditReport {
  id: string;
  title: string;
  period: {
    start: Date;
    end: Date;
  };
  scope: string[];
  events: AuditEvent[];
  summary: AuditSummary;
  findings: AuditFinding[];
  recommendations: string[];
}

export interface AuditSummary {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  errorEvents: number;
  uniqueUsers: number;
  topActions: ActionSummary[];
  riskEvents: AuditEvent[];
}

export interface ActionSummary {
  action: string;
  count: number;
  percentage: number;
}

export interface AuditFinding {
  id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  description: string;
  evidence: string[];
  recommendation: string;
}

export interface GovernanceWorkflow {
  id: string;
  name: string;
  description: string;
  type: 'APPROVAL' | 'REVIEW' | 'ASSESSMENT' | 'REMEDIATION';
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  approvers: WorkflowApprover[];
  notifications: NotificationConfig[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'MANUAL' | 'AUTOMATED';
  description: string;
  assignee: string;
  timeout: number;
  conditions: string[];
  actions: WorkflowAction[];
}

export interface WorkflowAction {
  type: 'APPROVE' | 'REJECT' | 'REQUEST_INFO' | 'ESCALATE' | 'NOTIFY';
  parameters: Record<string, any>;
}

export interface WorkflowTrigger {
  event: string;
  conditions: string[];
  parameters: Record<string, any>;
}

export interface WorkflowApprover {
  role: string;
  users: string[];
  required: boolean;
  order: number;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface ComplianceMonitoringConfig {
  frameworks: string[];
  frequency: string;
  automated: boolean;
  notifications: NotificationConfig[];
  thresholds: ComplianceThreshold[];
}

export interface ComplianceThreshold {
  metric: string;
  operator: 'GT' | 'LT' | 'EQ' | 'NE' | 'GTE' | 'LTE';
  value: number;
  action: 'ALERT' | 'ESCALATE' | 'AUTO_REMEDIATE';
}