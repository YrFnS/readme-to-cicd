/**
 * Security Management Interfaces
 */

import {
  SecurityConfig,
  SecurityAssessment,
  ComplianceFramework,
  ComplianceControl,
  AuditEvent,
  SecurityFinding,
  ThreatRule,
  IncidentPlaybook,
  TrainingProgram,
  PolicyConfig,
  VulnerabilityConfig,
  PenetrationTestConfig
} from './types';

export interface ISecurityManager {
  initialize(config: SecurityConfig): Promise<void>;
  authenticate(credentials: Credentials): Promise<AuthenticationResult>;
  authorize(user: User, resource: Resource, action: Action): Promise<boolean>;
  encrypt(data: string, context?: EncryptionContext): Promise<string>;
  decrypt(encryptedData: string, context?: EncryptionContext): Promise<string>;
  auditLog(event: AuditEvent): Promise<void>;
  assessSecurity(): Promise<SecurityAssessment>;
  getSecurityStatus(): Promise<SecurityStatus>;
}

export interface IComplianceManager {
  initialize(frameworks: ComplianceFramework[]): Promise<void>;
  validateCompliance(framework: string): Promise<ComplianceReport>;
  enforcePolicy(policy: PolicyConfig): Promise<PolicyResult>;
  generateAuditReport(timeRange: TimeRange): Promise<AuditReport>;
  trackRisk(risk: RiskAssessment): Promise<void>;
  getComplianceStatus(): Promise<ComplianceStatus>;
  scheduleAssessment(assessment: AssessmentConfig): Promise<string>;
}

export interface ISecurityMonitor {
  initialize(config: SecurityConfig): Promise<void>;
  startMonitoring(): Promise<void>;
  stopMonitoring(): Promise<void>;
  detectThreats(): Promise<ThreatDetectionResult[]>;
  analyzeAnomalies(): Promise<AnomalyDetectionResult[]>;
  getSecurityMetrics(): Promise<SecurityMetrics>;
  generateAlert(alert: SecurityAlert): Promise<void>;
}

export interface IPolicyEngine {
  initialize(policies: PolicyConfig): Promise<void>;
  evaluatePolicy(policy: string, context: PolicyContext): Promise<PolicyResult>;
  enforcePolicy(policy: string, resource: string): Promise<EnforcementResult>;
  validatePolicies(): Promise<PolicyValidationResult>;
  updatePolicy(policy: string, definition: PolicyDefinition): Promise<void>;
  getPolicyStatus(): Promise<PolicyStatus>;
}

export interface ISecurityTraining {
  initialize(config: TrainingConfig): Promise<void>;
  createProgram(program: TrainingProgram): Promise<string>;
  enrollUser(userId: string, programId: string): Promise<void>;
  trackProgress(userId: string, programId: string): Promise<TrainingProgress>;
  generateCertificate(userId: string, programId: string): Promise<Certificate>;
  getTrainingMetrics(): Promise<TrainingMetrics>;
  scheduleAwareness(campaign: AwarenessCampaign): Promise<string>;
}

export interface ISecurityDocumentation {
  initialize(): Promise<void>;
  generatePolicyDocument(policy: string): Promise<PolicyDocument>;
  generateProcedureDocument(procedure: string): Promise<ProcedureDocument>;
  generateIncidentPlan(scenario: string): Promise<IncidentResponsePlan>;
  generateComplianceGuide(framework: string): Promise<ComplianceGuide>;
  generateTrainingMaterial(topic: string): Promise<TrainingMaterial>;
  updateDocumentation(type: string, content: string): Promise<void>;
}

export interface IVulnerabilityScanner {
  initialize(config: VulnerabilityConfig): Promise<void>;
  scanSystem(target: ScanTarget): Promise<VulnerabilityScanResult>;
  scheduleScan(schedule: ScanSchedule): Promise<string>;
  getVulnerabilities(filter?: VulnerabilityFilter): Promise<Vulnerability[]>;
  remediateVulnerability(id: string, action: RemediationAction): Promise<void>;
  generateReport(format: ReportFormat): Promise<VulnerabilityReport>;
}

export interface IPenetrationTester {
  initialize(config: PenetrationTestConfig): Promise<void>;
  planTest(scope: PenTestScope): Promise<PenTestPlan>;
  executeTest(planId: string): Promise<PenTestResult>;
  generateReport(testId: string): Promise<PenTestReport>;
  trackRemediation(findings: SecurityFinding[]): Promise<RemediationStatus>;
}

export interface IThreatDetector {
  initialize(config: ThreatDetectionConfig): Promise<void>;
  detectThreats(data: ThreatData): Promise<ThreatDetectionResult[]>;
  updateRules(rules: ThreatRule[]): Promise<void>;
  correlateEvents(events: SecurityEvent[]): Promise<CorrelationResult[]>;
  enrichThreatData(threat: ThreatIndicator): Promise<EnrichedThreat>;
  generateThreatReport(): Promise<ThreatReport>;
}

export interface IIncidentResponse {
  initialize(config: IncidentResponseConfig): Promise<void>;
  createIncident(incident: IncidentData): Promise<string>;
  executePlaybook(incidentId: string, playbookId: string): Promise<PlaybookResult>;
  escalateIncident(incidentId: string, level: number): Promise<void>;
  updateIncident(incidentId: string, update: IncidentUpdate): Promise<void>;
  closeIncident(incidentId: string, resolution: IncidentResolution): Promise<void>;
  generateIncidentReport(incidentId: string): Promise<IncidentReport>;
}

// Supporting Types
export interface Credentials {
  type: 'password' | 'token' | 'certificate' | 'biometric';
  identifier: string;
  secret: string;
  metadata?: Record<string, any>;
}

export interface AuthenticationResult {
  success: boolean;
  user?: User;
  token?: string;
  expiresAt?: Date;
  error?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  metadata: Record<string, any>;
}

export interface Resource {
  type: string;
  id: string;
  attributes: Record<string, any>;
}

export interface Action {
  name: string;
  parameters?: Record<string, any>;
}

export interface EncryptionContext {
  algorithm?: string;
  keyId?: string;
  metadata?: Record<string, any>;
}

export interface SecurityStatus {
  overall: 'secure' | 'warning' | 'critical';
  components: ComponentStatus[];
  lastAssessment: Date;
  nextAssessment: Date;
  metrics: SecurityMetrics;
}

export interface ComponentStatus {
  component: string;
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
  lastCheck: Date;
}

export interface SecurityMetrics {
  vulnerabilities: VulnerabilityMetrics;
  threats: ThreatMetrics;
  compliance: ComplianceMetrics;
  incidents: IncidentMetrics;
}

export interface VulnerabilityMetrics {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  remediated: number;
}

export interface ThreatMetrics {
  detected: number;
  blocked: number;
  investigated: number;
  falsePositives: number;
}

export interface ComplianceMetrics {
  frameworks: number;
  controls: number;
  compliant: number;
  nonCompliant: number;
  score: number;
}

export interface IncidentMetrics {
  total: number;
  open: number;
  resolved: number;
  meanTimeToDetection: number;
  meanTimeToResolution: number;
}

export interface ComplianceReport {
  framework: string;
  version: string;
  assessment: ComplianceAssessment;
  controls: ControlAssessment[];
  score: number;
  status: 'compliant' | 'non-compliant' | 'partial';
  recommendations: string[];
  generatedAt: Date;
}

export interface ComplianceAssessment {
  scope: string[];
  methodology: string;
  assessor: string;
  date: Date;
  duration: number;
}

export interface ControlAssessment {
  control: ComplianceControl;
  status: 'compliant' | 'non-compliant' | 'not-applicable';
  evidence: string[];
  gaps: string[];
  recommendations: string[];
}

export interface PolicyResult {
  policy: string;
  result: 'allow' | 'deny' | 'conditional';
  reason: string;
  conditions?: string[];
  metadata?: Record<string, any>;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface AuditReport {
  period: TimeRange;
  events: AuditEventSummary[];
  statistics: AuditStatistics;
  findings: AuditFinding[];
  recommendations: string[];
}

export interface AuditEventSummary {
  type: string;
  count: number;
  severity: string;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface AuditStatistics {
  totalEvents: number;
  uniqueUsers: number;
  uniqueResources: number;
  errorRate: number;
  complianceRate: number;
}

export interface AuditFinding {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence: string[];
  recommendation: string;
}

export interface RiskAssessment {
  id: string;
  asset: string;
  threat: string;
  vulnerability: string;
  impact: number;
  likelihood: number;
  risk: number;
  mitigation: string[];
}

export interface ComplianceStatus {
  frameworks: FrameworkStatus[];
  overallScore: number;
  lastAssessment: Date;
  nextAssessment: Date;
  trends: ComplianceTrend[];
}

export interface FrameworkStatus {
  name: string;
  version: string;
  score: number;
  status: 'compliant' | 'non-compliant' | 'partial';
  controls: number;
  compliantControls: number;
}

export interface ComplianceTrend {
  framework: string;
  period: string;
  score: number;
  change: number;
}

export interface AssessmentConfig {
  type: 'vulnerability' | 'penetration' | 'compliance' | 'risk';
  scope: string[];
  schedule: Date;
  methodology: string;
  assessor: string;
}

export interface ThreatDetectionResult {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  source: string;
  timestamp: Date;
  indicators: ThreatIndicator[];
  context: ThreatContext;
}

export interface ThreatIndicator {
  type: string;
  value: string;
  confidence: number;
  source: string;
}

export interface ThreatContext {
  asset: string;
  user?: string;
  location?: string;
  metadata: Record<string, any>;
}

export interface AnomalyDetectionResult {
  id: string;
  type: string;
  metric: string;
  value: number;
  baseline: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

export interface SecurityAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  source: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface PolicyContext {
  user: User;
  resource: Resource;
  action: Action;
  environment: Record<string, any>;
}

export interface EnforcementResult {
  enforced: boolean;
  action: string;
  result: 'allowed' | 'denied' | 'modified';
  reason: string;
  metadata?: Record<string, any>;
}

export interface PolicyValidationResult {
  valid: boolean;
  errors: PolicyError[];
  warnings: PolicyWarning[];
  suggestions: PolicySuggestion[];
}

export interface PolicyError {
  policy: string;
  rule: string;
  message: string;
  line?: number;
}

export interface PolicyWarning {
  policy: string;
  rule: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface PolicySuggestion {
  policy: string;
  rule: string;
  suggestion: string;
  benefit: string;
}

export interface PolicyDefinition {
  name: string;
  version: string;
  rules: PolicyRule[];
  metadata: Record<string, any>;
}

export interface PolicyStatus {
  policies: PolicyInfo[];
  enforcement: EnforcementStatus;
  violations: PolicyViolation[];
}

export interface PolicyInfo {
  name: string;
  version: string;
  status: 'active' | 'inactive' | 'deprecated';
  lastUpdated: Date;
}

export interface EnforcementStatus {
  mode: 'advisory' | 'enforcing' | 'blocking';
  active: boolean;
  violations: number;
  exceptions: number;
}

export interface PolicyViolation {
  policy: string;
  resource: string;
  user: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface TrainingProgress {
  userId: string;
  programId: string;
  progress: number;
  completedModules: string[];
  currentModule?: string;
  startDate: Date;
  estimatedCompletion?: Date;
}

export interface Certificate {
  id: string;
  userId: string;
  programId: string;
  issuedDate: Date;
  expiryDate: Date;
  status: 'valid' | 'expired' | 'revoked';
}

export interface TrainingMetrics {
  enrollment: number;
  completion: number;
  certifications: number;
  averageScore: number;
  complianceRate: number;
}

export interface AwarenessCampaign {
  id: string;
  name: string;
  topic: string;
  startDate: Date;
  endDate: Date;
  audience: string[];
  metrics: CampaignMetrics;
}

export interface CampaignMetrics {
  reach: number;
  engagement: number;
  completion: number;
  feedback: number;
}

export interface PolicyDocument {
  id: string;
  title: string;
  version: string;
  content: string;
  format: 'markdown' | 'html' | 'pdf';
  lastUpdated: Date;
}

export interface ProcedureDocument {
  id: string;
  title: string;
  version: string;
  steps: ProcedureStep[];
  format: 'markdown' | 'html' | 'pdf';
  lastUpdated: Date;
}

export interface ProcedureStep {
  id: string;
  title: string;
  description: string;
  actions: string[];
  prerequisites?: string[];
}

export interface IncidentResponsePlan {
  id: string;
  scenario: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  playbooks: IncidentPlaybook[];
  contacts: EmergencyContact[];
  resources: string[];
}

export interface EmergencyContact {
  role: string;
  name: string;
  phone: string;
  email: string;
  availability: string;
}

export interface ComplianceGuide {
  framework: string;
  version: string;
  overview: string;
  requirements: RequirementGuide[];
  implementation: ImplementationGuide[];
  validation: ValidationGuide[];
}

export interface RequirementGuide {
  control: string;
  description: string;
  requirements: string[];
  examples: string[];
}

export interface ImplementationGuide {
  control: string;
  steps: string[];
  tools: string[];
  references: string[];
}

export interface ValidationGuide {
  control: string;
  methods: string[];
  evidence: string[];
  frequency: string;
}

export interface TrainingMaterial {
  id: string;
  topic: string;
  type: 'presentation' | 'video' | 'document' | 'interactive';
  content: string;
  duration: number;
  objectives: string[];
}

export interface ScanTarget {
  type: 'host' | 'network' | 'application' | 'container';
  identifier: string;
  credentials?: Credentials;
  configuration?: Record<string, any>;
}

export interface VulnerabilityScanResult {
  scanId: string;
  target: ScanTarget;
  startTime: Date;
  endTime: Date;
  vulnerabilities: Vulnerability[];
  summary: ScanSummary;
}

export interface Vulnerability {
  id: string;
  cve?: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cvss: number;
  category: string;
  affected: string[];
  solution: string;
  references: string[];
}

export interface ScanSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  fixed: number;
}

export interface ScanSchedule {
  id: string;
  name: string;
  targets: ScanTarget[];
  frequency: string;
  nextRun: Date;
  enabled: boolean;
}

export interface VulnerabilityFilter {
  severity?: string[];
  category?: string[];
  status?: string[];
  dateRange?: TimeRange;
}

export interface RemediationAction {
  type: 'patch' | 'configure' | 'mitigate' | 'accept';
  description: string;
  automated: boolean;
  timeline: string;
}

export interface ReportFormat {
  type: 'json' | 'xml' | 'pdf' | 'html' | 'csv';
  template?: string;
  options?: Record<string, any>;
}

export interface VulnerabilityReport {
  id: string;
  format: ReportFormat;
  content: string;
  generatedAt: Date;
  summary: ReportSummary;
}

export interface ReportSummary {
  scans: number;
  vulnerabilities: number;
  remediated: number;
  pending: number;
  trends: TrendData[];
}

export interface TrendData {
  period: string;
  value: number;
  change: number;
}

export interface PenTestScope {
  internal: boolean;
  external: boolean;
  applications: string[];
  networks: string[];
  socialEngineering: boolean;
  physicalSecurity: boolean;
}

export interface PenTestPlan {
  id: string;
  scope: PenTestScope;
  methodology: string;
  timeline: PenTestTimeline;
  team: PenTestTeam;
  rules: PenTestRule[];
}

export interface PenTestTimeline {
  start: Date;
  end: Date;
  phases: PenTestPhase[];
}

export interface PenTestPhase {
  name: string;
  start: Date;
  end: Date;
  activities: string[];
}

export interface PenTestTeam {
  lead: string;
  members: string[];
  external: boolean;
}

export interface PenTestRule {
  type: 'allowed' | 'forbidden' | 'restricted';
  description: string;
  scope: string[];
}

export interface PenTestResult {
  planId: string;
  executionId: string;
  findings: SecurityFinding[];
  summary: PenTestSummary;
  recommendations: SecurityRecommendation[];
  timeline: PenTestExecution[];
}

export interface PenTestSummary {
  duration: number;
  findings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface PenTestExecution {
  phase: string;
  start: Date;
  end: Date;
  activities: ExecutedActivity[];
}

export interface ExecutedActivity {
  name: string;
  result: string;
  findings: string[];
  evidence: string[];
}

export interface PenTestReport {
  id: string;
  type: 'executive' | 'technical' | 'remediation';
  content: string;
  format: ReportFormat;
  generatedAt: Date;
}

export interface RemediationStatus {
  findings: number;
  remediated: number;
  inProgress: number;
  pending: number;
  accepted: number;
}

export interface ThreatData {
  source: string;
  type: string;
  data: Record<string, any>;
  timestamp: Date;
}

export interface CorrelationResult {
  id: string;
  events: SecurityEvent[];
  pattern: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecurityEvent {
  id: string;
  type: string;
  source: string;
  timestamp: Date;
  data: Record<string, any>;
}

export interface EnrichedThreat {
  indicator: ThreatIndicator;
  intelligence: ThreatIntelligence;
  context: ThreatContext;
  risk: RiskScore;
}

export interface ThreatIntelligence {
  reputation: number;
  category: string[];
  malwareFamily?: string;
  attribution?: string;
  firstSeen?: Date;
  lastSeen?: Date;
}

export interface RiskScore {
  value: number;
  factors: RiskFactor[];
  confidence: number;
}

export interface RiskFactor {
  name: string;
  weight: number;
  value: number;
}

export interface ThreatReport {
  period: TimeRange;
  threats: ThreatSummary[];
  trends: ThreatTrend[];
  recommendations: string[];
}

export interface ThreatSummary {
  type: string;
  count: number;
  severity: string;
  blocked: number;
  investigated: number;
}

export interface ThreatTrend {
  type: string;
  period: string;
  count: number;
  change: number;
}

export interface IncidentData {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  source: string;
  reporter: string;
  affected: string[];
}

export interface PlaybookResult {
  playbookId: string;
  executionId: string;
  steps: StepResult[];
  status: 'success' | 'failure' | 'partial';
  duration: number;
}

export interface StepResult {
  stepId: string;
  status: 'success' | 'failure' | 'skipped';
  output: string;
  duration: number;
  error?: string;
}

export interface IncidentUpdate {
  status?: 'open' | 'investigating' | 'resolved' | 'closed';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
  notes?: string;
  evidence?: string[];
}

export interface IncidentResolution {
  type: 'resolved' | 'false-positive' | 'duplicate' | 'wont-fix';
  description: string;
  actions: string[];
  lessons: string[];
}

export interface IncidentReport {
  incidentId: string;
  timeline: IncidentTimeline[];
  impact: IncidentImpact;
  response: ResponseSummary;
  lessons: string[];
  recommendations: string[];
}

export interface IncidentTimeline {
  timestamp: Date;
  event: string;
  actor: string;
  description: string;
}

export interface IncidentImpact {
  systems: string[];
  users: number;
  duration: number;
  cost: number;
  reputation: string;
}

export interface ResponseSummary {
  timeToDetection: number;
  timeToResponse: number;
  timeToResolution: number;
  effectiveness: number;
  improvements: string[];
}