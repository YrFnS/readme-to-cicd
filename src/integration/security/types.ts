/**
 * Security Management Types
 */

export interface SecurityConfig {
  authentication: AuthConfig;
  authorization: AuthzConfig;
  encryption: EncryptionConfig;
  compliance: ComplianceConfig;
  audit: AuditConfig;
  monitoring: SecurityMonitoringConfig;
  policies: PolicyConfig;
  training: TrainingConfig;
}

export interface AuthConfig {
  providers: AuthProvider[];
  sessionTimeout: number;
  mfaRequired: boolean;
  passwordPolicy: PasswordPolicy;
  tokenExpiry: number;
}

export interface AuthProvider {
  type: 'oauth2' | 'saml' | 'ldap' | 'apikey';
  name: string;
  config: Record<string, any>;
  enabled: boolean;
}

export interface AuthzConfig {
  rbac: RBACConfig;
  permissions: Permission[];
  roles: Role[];
  policies: AuthzPolicy[];
}

export interface RBACConfig {
  enabled: boolean;
  hierarchical: boolean;
  inheritance: boolean;
  defaultRole: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  actions: string[];
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  inherits?: string[];
}

export interface AuthzPolicy {
  id: string;
  name: string;
  rules: PolicyRule[];
  effect: 'allow' | 'deny';
}

export interface PolicyRule {
  resource: string;
  action: string;
  condition?: string;
}

export interface EncryptionConfig {
  algorithms: EncryptionAlgorithm[];
  keyManagement: KeyManagementConfig;
  tls: TLSConfig;
  dataEncryption: DataEncryptionConfig;
}

export interface EncryptionAlgorithm {
  name: string;
  keySize: number;
  mode: string;
  enabled: boolean;
}

export interface KeyManagementConfig {
  provider: 'vault' | 'aws-kms' | 'azure-keyvault' | 'gcp-kms';
  rotationInterval: number;
  backupEnabled: boolean;
}

export interface TLSConfig {
  version: string;
  cipherSuites: string[];
  certificateValidation: boolean;
  hsts: boolean;
}

export interface DataEncryptionConfig {
  atRest: boolean;
  inTransit: boolean;
  algorithm: string;
  keyDerivation: string;
}

export interface ComplianceConfig {
  frameworks: ComplianceFramework[];
  reporting: ComplianceReporting;
  auditing: ComplianceAuditing;
  validation: ComplianceValidation;
}

export interface ComplianceFramework {
  name: string;
  version: string;
  controls: ComplianceControl[];
  enabled: boolean;
}

export interface ComplianceControl {
  id: string;
  name: string;
  description: string;
  requirements: string[];
  validation: ValidationRule[];
  automated: boolean;
}

export interface ValidationRule {
  type: 'policy' | 'configuration' | 'audit' | 'scan';
  rule: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ComplianceReporting {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  recipients: string[];
  format: 'json' | 'pdf' | 'html';
  automated: boolean;
}

export interface ComplianceAuditing {
  enabled: boolean;
  retention: number;
  encryption: boolean;
  immutable: boolean;
}

export interface ComplianceValidation {
  continuous: boolean;
  scheduled: boolean;
  onDemand: boolean;
  threshold: number;
}

export interface AuditConfig {
  enabled: boolean;
  events: AuditEvent[];
  storage: AuditStorage;
  retention: AuditRetention;
  alerting: AuditAlerting;
}

export interface AuditEvent {
  type: string;
  category: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  fields: string[];
}

export interface AuditStorage {
  type: 'database' | 'file' | 'siem' | 'cloud';
  encryption: boolean;
  compression: boolean;
  replication: boolean;
}

export interface AuditRetention {
  period: number;
  archival: boolean;
  deletion: boolean;
  compliance: string[];
}

export interface AuditAlerting {
  enabled: boolean;
  rules: AlertRule[];
  channels: AlertChannel[];
}

export interface AlertRule {
  id: string;
  condition: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  threshold: number;
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  config: Record<string, any>;
  enabled: boolean;
}

export interface SecurityMonitoringConfig {
  realTime: boolean;
  threatDetection: ThreatDetectionConfig;
  anomalyDetection: AnomalyDetectionConfig;
  incidentResponse: IncidentResponseConfig;
}

export interface ThreatDetectionConfig {
  enabled: boolean;
  sources: ThreatSource[];
  rules: ThreatRule[];
  intelligence: ThreatIntelligenceConfig;
}

export interface ThreatSource {
  type: 'logs' | 'network' | 'endpoint' | 'cloud';
  name: string;
  config: Record<string, any>;
}

export interface ThreatRule {
  id: string;
  name: string;
  pattern: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'alert' | 'block' | 'quarantine';
}

export interface ThreatIntelligenceConfig {
  feeds: ThreatFeed[];
  correlation: boolean;
  enrichment: boolean;
}

export interface ThreatFeed {
  name: string;
  url: string;
  format: string;
  updateInterval: number;
}

export interface AnomalyDetectionConfig {
  enabled: boolean;
  algorithms: AnomalyAlgorithm[];
  baselines: BaselineConfig[];
  sensitivity: number;
}

export interface AnomalyAlgorithm {
  name: string;
  type: 'statistical' | 'ml' | 'rule-based';
  config: Record<string, any>;
}

export interface BaselineConfig {
  metric: string;
  period: number;
  threshold: number;
  adaptive: boolean;
}

export interface IncidentResponseConfig {
  enabled: boolean;
  playbooks: IncidentPlaybook[];
  escalation: EscalationConfig;
  communication: CommunicationConfig;
}

export interface IncidentPlaybook {
  id: string;
  name: string;
  triggers: string[];
  steps: ResponseStep[];
  automation: boolean;
}

export interface ResponseStep {
  id: string;
  name: string;
  action: string;
  automated: boolean;
  timeout: number;
}

export interface EscalationConfig {
  levels: EscalationLevel[];
  timeouts: number[];
  notifications: string[];
}

export interface EscalationLevel {
  level: number;
  contacts: string[];
  actions: string[];
}

export interface CommunicationConfig {
  channels: CommunicationChannel[];
  templates: MessageTemplate[];
  automation: boolean;
}

export interface CommunicationChannel {
  type: 'email' | 'slack' | 'teams' | 'webhook';
  config: Record<string, any>;
  priority: number;
}

export interface MessageTemplate {
  type: string;
  subject: string;
  body: string;
  format: 'text' | 'html' | 'markdown';
}

export interface PolicyConfig {
  enforcement: PolicyEnforcement;
  validation: PolicyValidation;
  management: PolicyManagement;
}

export interface PolicyEnforcement {
  enabled: boolean;
  mode: 'advisory' | 'enforcing' | 'blocking';
  exceptions: PolicyException[];
}

export interface PolicyException {
  id: string;
  policy: string;
  resource: string;
  reason: string;
  expiry: Date;
}

export interface PolicyValidation {
  continuous: boolean;
  scheduled: boolean;
  onDemand: boolean;
}

export interface PolicyManagement {
  versioning: boolean;
  approval: boolean;
  testing: boolean;
  rollback: boolean;
}

export interface TrainingConfig {
  programs: TrainingProgram[];
  certification: CertificationConfig;
  awareness: AwarenessConfig;
  tracking: TrainingTracking;
}

export interface TrainingProgram {
  id: string;
  name: string;
  description: string;
  modules: TrainingModule[];
  mandatory: boolean;
  frequency: number;
}

export interface TrainingModule {
  id: string;
  name: string;
  content: string;
  duration: number;
  assessment: boolean;
}

export interface CertificationConfig {
  enabled: boolean;
  requirements: CertificationRequirement[];
  validity: number;
  renewal: boolean;
}

export interface CertificationRequirement {
  type: 'training' | 'assessment' | 'experience';
  criteria: string;
  weight: number;
}

export interface AwarenessConfig {
  campaigns: AwarenessCampaign[];
  communications: AwarenessCommunication[];
  metrics: AwarenessMetric[];
}

export interface AwarenessCampaign {
  id: string;
  name: string;
  topic: string;
  duration: number;
  audience: string[];
}

export interface AwarenessCommunication {
  type: 'email' | 'poster' | 'video' | 'workshop';
  frequency: string;
  content: string;
}

export interface AwarenessMetric {
  name: string;
  target: number;
  measurement: string;
}

export interface TrainingTracking {
  completion: boolean;
  progress: boolean;
  assessment: boolean;
  certification: boolean;
}

// Security Assessment Types
export interface SecurityAssessment {
  id: string;
  type: 'vulnerability' | 'penetration' | 'compliance' | 'risk';
  scope: AssessmentScope;
  methodology: string;
  findings: SecurityFinding[];
  recommendations: SecurityRecommendation[];
  status: AssessmentStatus;
}

export interface AssessmentScope {
  systems: string[];
  networks: string[];
  applications: string[];
  data: string[];
}

export interface SecurityFinding {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  evidence: string[];
  impact: string;
  likelihood: string;
}

export interface SecurityRecommendation {
  id: string;
  finding: string;
  action: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  effort: string;
  timeline: string;
}

export interface AssessmentStatus {
  phase: 'planning' | 'execution' | 'reporting' | 'remediation' | 'complete';
  progress: number;
  startDate: Date;
  endDate?: Date;
}

// Vulnerability Scanning Types
export interface VulnerabilityConfig {
  scanners: VulnerabilityScanner[];
  schedules: ScanSchedule[];
  policies: ScanPolicy[];
  reporting: VulnerabilityReporting;
}

export interface VulnerabilityScanner {
  name: string;
  type: 'network' | 'web' | 'container' | 'code' | 'dependency';
  config: Record<string, any>;
  enabled: boolean;
}

export interface ScanSchedule {
  id: string;
  scanner: string;
  frequency: string;
  targets: string[];
  enabled: boolean;
}

export interface ScanPolicy {
  id: string;
  name: string;
  rules: ScanRule[];
  actions: ScanAction[];
}

export interface ScanRule {
  condition: string;
  severity: string;
  category: string;
}

export interface ScanAction {
  type: 'alert' | 'ticket' | 'block' | 'remediate';
  config: Record<string, any>;
}

export interface VulnerabilityReporting {
  dashboards: boolean;
  alerts: boolean;
  reports: boolean;
  integration: string[];
}

// Penetration Testing Types
export interface PenetrationTestConfig {
  methodology: string;
  scope: PenTestScope;
  rules: PenTestRule[];
  reporting: PenTestReporting;
}

export interface PenTestScope {
  internal: boolean;
  external: boolean;
  applications: string[];
  networks: string[];
  social: boolean;
}

export interface PenTestRule {
  type: 'allowed' | 'forbidden';
  action: string;
  condition: string;
}

export interface PenTestReporting {
  executive: boolean;
  technical: boolean;
  remediation: boolean;
  timeline: number;
}