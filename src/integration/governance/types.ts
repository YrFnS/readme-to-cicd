/**
 * Governance and Compliance Management Types
 * 
 * Defines interfaces and types for comprehensive governance, compliance monitoring,
 * policy enforcement, risk management, and regulatory compliance support.
 */

export interface ComplianceFramework {
  id: string;
  name: string;
  version: string;
  type: 'SOC2' | 'HIPAA' | 'PCI-DSS' | 'GDPR' | 'ISO27001' | 'CUSTOM';
  requirements: ComplianceRequirement[];
  controls: ComplianceControl[];
  assessmentCriteria: AssessmentCriteria[];
  reportingRequirements: ReportingRequirement[];
}

export interface ComplianceRequirement {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  mandatory: boolean;
  controls: string[];
  evidence: EvidenceRequirement[];
  testProcedures: TestProcedure[];
}

export interface ComplianceControl {
  id: string;
  name: string;
  description: string;
  type: 'preventive' | 'detective' | 'corrective' | 'compensating';
  category: string;
  implementation: ControlImplementation;
  testing: ControlTesting;
  effectiveness: ControlEffectiveness;
}

export interface Policy {
  id: string;
  name: string;
  version: string;
  description: string;
  type: 'security' | 'operational' | 'compliance' | 'governance';
  scope: PolicyScope;
  rules: PolicyRule[];
  enforcement: PolicyEnforcement;
  exceptions: PolicyException[];
  approvals: PolicyApproval[];
  effectiveDate: Date;
  reviewDate: Date;
}

export interface PolicyRule {
  id: string;
  condition: string;
  action: 'allow' | 'deny' | 'warn' | 'audit';
  parameters: Record<string, any>;
  priority: number;
  enabled: boolean;
}

export interface PolicyEnforcement {
  mode: 'advisory' | 'enforcing' | 'blocking';
  automated: boolean;
  realTime: boolean;
  notifications: NotificationConfig[];
  escalation: EscalationConfig;
}

export interface RiskAssessment {
  id: string;
  title: string;
  description: string;
  category: 'security' | 'operational' | 'compliance' | 'financial' | 'reputational';
  likelihood: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  impact: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  riskScore: number;
  inherentRisk: number;
  residualRisk: number;
  mitigations: RiskMitigation[];
  owner: string;
  status: 'identified' | 'assessed' | 'mitigated' | 'accepted' | 'transferred';
  reviewDate: Date;
}

export interface RiskMitigation {
  id: string;
  strategy: 'avoid' | 'mitigate' | 'transfer' | 'accept';
  description: string;
  implementation: MitigationImplementation;
  effectiveness: number;
  cost: number;
  timeline: string;
  responsible: string;
  status: 'planned' | 'in-progress' | 'completed' | 'deferred';
}

export interface ComplianceReport {
  id: string;
  framework: string;
  reportType: 'assessment' | 'audit' | 'certification' | 'monitoring';
  period: ReportingPeriod;
  overallStatus: 'compliant' | 'non-compliant' | 'partially-compliant';
  complianceScore: number;
  findings: ComplianceFinding[];
  recommendations: ComplianceRecommendation[];
  evidence: ComplianceEvidence[];
  certifications: ComplianceCertification[];
  generatedAt: Date;
  validUntil?: Date;
}

export interface ComplianceFinding {
  id: string;
  requirementId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in-progress' | 'resolved' | 'accepted';
  description: string;
  evidence: string[];
  remediation: RemediationPlan;
  dueDate?: Date;
  assignee?: string;
}

export interface AuditTrail {
  id: string;
  timestamp: Date;
  userId: string;
  userRole: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, any>;
  outcome: 'success' | 'failure' | 'partial';
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  correlationId: string;
}

export interface GovernanceWorkflow {
  id: string;
  name: string;
  type: 'approval' | 'review' | 'assessment' | 'remediation';
  description: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  participants: WorkflowParticipant[];
  sla: WorkflowSLA;
  status: 'active' | 'inactive' | 'draft';
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'manual' | 'automated' | 'conditional';
  description: string;
  assignee: string;
  dueDate?: Date;
  dependencies: string[];
  actions: WorkflowAction[];
  conditions: WorkflowCondition[];
}

export interface ComplianceMonitoring {
  id: string;
  framework: string;
  controls: MonitoredControl[];
  metrics: ComplianceMetric[];
  alerts: ComplianceAlert[];
  dashboards: ComplianceDashboard[];
  automatedChecks: AutomatedCheck[];
  continuousAssessment: ContinuousAssessment;
}

export interface MonitoredControl {
  controlId: string;
  monitoringFrequency: 'real-time' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  dataSource: string;
  thresholds: ControlThreshold[];
  alerting: AlertingConfig;
  evidence: EvidenceCollection;
}

export interface ComplianceMetric {
  id: string;
  name: string;
  description: string;
  type: 'percentage' | 'count' | 'ratio' | 'score';
  calculation: string;
  target: number;
  current: number;
  trend: 'improving' | 'stable' | 'declining';
  history: MetricHistory[];
}

// Supporting interfaces
export interface AssessmentCriteria {
  id: string;
  description: string;
  testMethod: string;
  passingScore: number;
  frequency: string;
}

export interface EvidenceRequirement {
  type: string;
  description: string;
  format: string;
  retention: string;
}

export interface TestProcedure {
  id: string;
  description: string;
  steps: string[];
  expectedResult: string;
  frequency: string;
}

export interface ControlImplementation {
  status: 'not-implemented' | 'partially-implemented' | 'implemented' | 'optimized';
  description: string;
  owner: string;
  implementationDate?: Date;
  evidence: string[];
}

export interface ControlTesting {
  frequency: string;
  method: string;
  lastTested?: Date;
  nextTest?: Date;
  results: TestResult[];
}

export interface ControlEffectiveness {
  rating: 'ineffective' | 'partially-effective' | 'effective' | 'highly-effective';
  lastAssessed: Date;
  assessor: string;
  notes: string;
}

export interface PolicyScope {
  components: string[];
  environments: string[];
  users: string[];
  resources: string[];
}

export interface PolicyException {
  id: string;
  reason: string;
  approver: string;
  expiryDate: Date;
  conditions: string[];
}

export interface PolicyApproval {
  approver: string;
  approvedAt: Date;
  comments?: string;
}

export interface NotificationConfig {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  recipients: string[];
  template: string;
  conditions: string[];
}

export interface EscalationConfig {
  levels: EscalationLevel[];
  timeouts: number[];
  autoEscalate: boolean;
}

export interface EscalationLevel {
  level: number;
  assignee: string;
  actions: string[];
}

export interface MitigationImplementation {
  approach: string;
  resources: string[];
  dependencies: string[];
  milestones: Milestone[];
}

export interface Milestone {
  name: string;
  dueDate: Date;
  deliverables: string[];
  status: 'pending' | 'in-progress' | 'completed' | 'delayed';
}

export interface ReportingPeriod {
  startDate: Date;
  endDate: Date;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
}

export interface ComplianceRecommendation {
  id: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  rationale: string;
  implementation: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
}

export interface ComplianceEvidence {
  id: string;
  type: string;
  description: string;
  source: string;
  collectedAt: Date;
  validUntil?: Date;
  metadata: Record<string, any>;
}

export interface ComplianceCertification {
  id: string;
  framework: string;
  level: string;
  issuedBy: string;
  issuedAt: Date;
  validUntil: Date;
  scope: string;
  conditions: string[];
}

export interface RemediationPlan {
  id: string;
  description: string;
  steps: RemediationStep[];
  timeline: string;
  resources: string[];
  responsible: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface RemediationStep {
  id: string;
  description: string;
  dueDate: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  assignee: string;
  dependencies: string[];
}

export interface WorkflowTrigger {
  type: 'manual' | 'scheduled' | 'event' | 'condition';
  configuration: Record<string, any>;
}

export interface WorkflowParticipant {
  userId: string;
  role: string;
  permissions: string[];
}

export interface WorkflowSLA {
  duration: number;
  unit: 'hours' | 'days' | 'weeks';
  escalation: boolean;
}

export interface WorkflowAction {
  type: 'approve' | 'reject' | 'request-info' | 'delegate' | 'escalate';
  parameters: Record<string, any>;
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not-equals' | 'greater-than' | 'less-than' | 'contains';
  value: any;
}

export interface ControlThreshold {
  metric: string;
  operator: 'greater-than' | 'less-than' | 'equals' | 'not-equals';
  value: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AlertingConfig {
  enabled: boolean;
  channels: string[];
  frequency: string;
  conditions: string[];
}

export interface EvidenceCollection {
  automated: boolean;
  sources: string[];
  retention: string;
  format: string;
}

export interface ComplianceAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  source: string;
  timestamp: Date;
  status: 'open' | 'acknowledged' | 'resolved';
}

export interface ComplianceDashboard {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  filters: DashboardFilter[];
  permissions: string[];
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'alert';
  configuration: Record<string, any>;
  dataSource: string;
}

export interface DashboardFilter {
  field: string;
  type: 'select' | 'date' | 'text' | 'number';
  options?: string[];
}

export interface AutomatedCheck {
  id: string;
  name: string;
  description: string;
  frequency: string;
  script: string;
  parameters: Record<string, any>;
  lastRun?: Date;
  nextRun?: Date;
  status: 'active' | 'inactive' | 'error';
}

export interface ContinuousAssessment {
  enabled: boolean;
  frequency: string;
  scope: string[];
  automation: number;
  reporting: ContinuousReporting;
}

export interface ContinuousReporting {
  realTime: boolean;
  dashboards: string[];
  alerts: string[];
  notifications: string[];
}

export interface MetricHistory {
  timestamp: Date;
  value: number;
  context: Record<string, any>;
}

export interface TestResult {
  date: Date;
  result: 'pass' | 'fail' | 'partial';
  score: number;
  findings: string[];
  evidence: string[];
  tester: string;
}

// Result types for operations
export interface ComplianceValidationResult {
  framework: string;
  overallCompliance: number;
  controlResults: ControlValidationResult[];
  findings: ComplianceFinding[];
  recommendations: ComplianceRecommendation[];
  nextAssessment: Date;
}

export interface ControlValidationResult {
  controlId: string;
  status: 'compliant' | 'non-compliant' | 'partially-compliant';
  score: number;
  evidence: string[];
  gaps: string[];
  recommendations: string[];
}

export interface PolicyResult {
  policyId: string;
  decision: 'allow' | 'deny' | 'warn';
  reason: string;
  appliedRules: string[];
  context: Record<string, any>;
  timestamp: Date;
}

export interface GovernanceMetrics {
  complianceScore: number;
  policyViolations: number;
  riskScore: number;
  auditFindings: number;
  remediationProgress: number;
  certificationStatus: string;
}