/**
 * Disaster Recovery and Business Continuity Types
 * 
 * Defines interfaces and types for disaster recovery, high availability,
 * data replication, and business continuity management.
 */

export interface DisasterRecoveryConfig {
  enabled: boolean;
  backupStrategy: BackupStrategy;
  replicationStrategy: ReplicationStrategy;
  failoverStrategy: FailoverStrategy;
  recoveryObjectives: RecoveryObjectives;
  businessContinuity: BusinessContinuityConfig;
}

export interface RecoveryObjectives {
  /** Recovery Time Objective - maximum acceptable downtime */
  rto: number; // in seconds
  /** Recovery Point Objective - maximum acceptable data loss */
  rpo: number; // in seconds
  /** Maximum Tolerable Downtime */
  mtd: number; // in seconds
}

export interface BackupStrategy {
  type: 'full' | 'incremental' | 'differential';
  frequency: BackupFrequency;
  retention: RetentionPolicy;
  encryption: EncryptionConfig;
  compression: boolean;
  verification: boolean;
}

export interface BackupFrequency {
  full: string; // cron expression
  incremental: string; // cron expression
  differential?: string; // cron expression
}

export interface RetentionPolicy {
  daily: number; // days to keep daily backups
  weekly: number; // weeks to keep weekly backups
  monthly: number; // months to keep monthly backups
  yearly: number; // years to keep yearly backups
}

export interface EncryptionConfig {
  enabled: boolean;
  algorithm: 'AES-256' | 'AES-128';
  keyRotation: boolean;
  keyRotationInterval: number; // in days
}

export interface ReplicationStrategy {
  type: 'synchronous' | 'asynchronous' | 'semi-synchronous';
  targets: ReplicationTarget[];
  consistency: ConsistencyLevel;
  conflictResolution: ConflictResolutionStrategy;
}

export interface ReplicationTarget {
  id: string;
  region: string;
  endpoint: string;
  priority: number; // 1 = primary, 2+ = secondary
  lag: number; // acceptable lag in seconds
}

export type ConsistencyLevel = 'strong' | 'eventual' | 'weak';
export type ConflictResolutionStrategy = 'last-write-wins' | 'manual' | 'custom';

export interface FailoverStrategy {
  type: 'automatic' | 'manual' | 'hybrid';
  triggers: FailoverTrigger[];
  healthChecks: HealthCheckConfig[];
  rollbackPolicy: RollbackPolicy;
}

export interface FailoverTrigger {
  type: 'health-check' | 'performance' | 'manual' | 'scheduled';
  threshold: number;
  duration: number; // seconds before triggering
  cooldown: number; // seconds before allowing another trigger
}

export interface HealthCheckConfig {
  name: string;
  endpoint: string;
  interval: number; // seconds
  timeout: number; // seconds
  retries: number;
  expectedStatus: number[];
}

export interface RollbackPolicy {
  automatic: boolean;
  conditions: RollbackCondition[];
  timeout: number; // seconds to wait before rollback
}

export interface RollbackCondition {
  type: 'health-check-failure' | 'performance-degradation' | 'error-rate';
  threshold: number;
  duration: number; // seconds
}

export interface BusinessContinuityConfig {
  degradationLevels: DegradationLevel[];
  essentialServices: string[];
  communicationPlan: CommunicationPlan;
  escalationMatrix: EscalationMatrix;
}

export interface DegradationLevel {
  level: number; // 1 = minimal impact, 5 = severe impact
  name: string;
  description: string;
  triggers: DegradationTrigger[];
  actions: DegradationAction[];
}

export interface DegradationTrigger {
  type: 'resource-usage' | 'error-rate' | 'response-time' | 'availability';
  metric: string;
  threshold: number;
  duration: number; // seconds
}

export interface DegradationAction {
  type: 'disable-feature' | 'reduce-capacity' | 'switch-mode' | 'notify';
  target: string;
  parameters: Record<string, any>;
}

export interface CommunicationPlan {
  channels: NotificationChannel[];
  templates: NotificationTemplate[];
  escalationRules: EscalationRule[];
}

export interface NotificationChannel {
  id: string;
  type: 'email' | 'sms' | 'slack' | 'webhook';
  config: Record<string, any>;
  priority: number;
}

export interface NotificationTemplate {
  id: string;
  type: 'incident' | 'recovery' | 'degradation' | 'maintenance';
  subject: string;
  body: string;
  channels: string[];
}

export interface EscalationRule {
  level: number;
  duration: number; // seconds before escalation
  recipients: string[];
  channels: string[];
}

export interface EscalationMatrix {
  levels: EscalationLevel[];
  autoEscalation: boolean;
  maxLevel: number;
}

export interface EscalationLevel {
  level: number;
  name: string;
  contacts: Contact[];
  timeout: number; // seconds
}

export interface Contact {
  id: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
  availability: AvailabilityWindow[];
}

export interface AvailabilityWindow {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  timezone: string;
}

// Recovery Testing Types
export interface RecoveryTest {
  id: string;
  name: string;
  type: RecoveryTestType;
  schedule: string; // cron expression
  config: RecoveryTestConfig;
  validation: ValidationConfig;
}

export type RecoveryTestType = 
  | 'backup-restore' 
  | 'failover' 
  | 'data-consistency' 
  | 'performance' 
  | 'end-to-end';

export interface RecoveryTestConfig {
  environment: 'test' | 'staging' | 'production-safe';
  scope: string[]; // components to test
  duration: number; // maximum test duration in seconds
  rollback: boolean; // whether to rollback after test
}

export interface ValidationConfig {
  checks: ValidationCheck[];
  successCriteria: SuccessCriteria;
  reporting: ReportingConfig;
}

export interface ValidationCheck {
  name: string;
  type: 'health' | 'performance' | 'data-integrity' | 'functionality';
  config: Record<string, any>;
  timeout: number;
}

export interface SuccessCriteria {
  minHealthScore: number; // 0-100
  maxRecoveryTime: number; // seconds
  maxDataLoss: number; // seconds
  requiredServices: string[];
}

export interface ReportingConfig {
  format: 'json' | 'html' | 'pdf';
  recipients: string[];
  storage: StorageConfig;
}

export interface StorageConfig {
  type: 'local' | 's3' | 'azure-blob' | 'gcs';
  config: Record<string, any>;
  retention: number; // days
}

// Status and Monitoring Types
export interface DisasterRecoveryStatus {
  overall: HealthStatus;
  components: ComponentStatus[];
  lastBackup: BackupStatus;
  replication: ReplicationStatus;
  tests: TestStatus[];
  incidents: IncidentStatus[];
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'critical' | 'unknown';
  score: number; // 0-100
  lastCheck: Date;
  issues: HealthIssue[];
}

export interface HealthIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  message: string;
  timestamp: Date;
}

export interface ComponentStatus {
  id: string;
  name: string;
  status: HealthStatus;
  region: string;
  isPrimary: boolean;
  lastFailover?: Date;
}

export interface BackupStatus {
  id: string;
  type: 'full' | 'incremental' | 'differential';
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  size: number; // bytes
  verification: VerificationStatus;
}

export interface VerificationStatus {
  status: 'pending' | 'passed' | 'failed' | 'skipped';
  checksum?: string;
  errors?: string[];
}

export interface ReplicationStatus {
  targets: ReplicationTargetStatus[];
  lag: number; // seconds
  consistency: ConsistencyStatus;
  conflicts: ConflictStatus[];
}

export interface ReplicationTargetStatus {
  targetId: string;
  status: 'active' | 'inactive' | 'error' | 'syncing';
  lag: number; // seconds
  lastSync: Date;
  errors?: string[];
}

export interface ConsistencyStatus {
  level: ConsistencyLevel;
  violations: ConsistencyViolation[];
  lastCheck: Date;
}

export interface ConsistencyViolation {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
}

export interface ConflictStatus {
  id: string;
  type: string;
  description: string;
  resolution: 'pending' | 'resolved' | 'escalated';
  timestamp: Date;
}

export interface TestStatus {
  testId: string;
  status: 'scheduled' | 'running' | 'passed' | 'failed' | 'cancelled';
  startTime?: Date;
  endTime?: Date;
  results?: TestResults;
}

export interface TestResults {
  success: boolean;
  score: number; // 0-100
  duration: number; // seconds
  checks: CheckResult[];
  report?: string; // URL or path to detailed report
}

export interface CheckResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number; // seconds
  message?: string;
  details?: Record<string, any>;
}

export interface IncidentStatus {
  id: string;
  type: 'outage' | 'degradation' | 'data-loss' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  startTime: Date;
  endTime?: Date;
  impact: ImpactAssessment;
  response: ResponseStatus;
}

export interface ImpactAssessment {
  affectedServices: string[];
  affectedUsers: number;
  dataLoss: number; // seconds
  downtime: number; // seconds
  estimatedCost: number;
}

export interface ResponseStatus {
  currentLevel: number;
  assignedTeam: string;
  actions: ResponseAction[];
  communications: Communication[];
}

export interface ResponseAction {
  id: string;
  type: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  assignee: string;
  timestamp: Date;
}

export interface Communication {
  id: string;
  type: 'internal' | 'external' | 'customer';
  channel: string;
  message: string;
  timestamp: Date;
  recipients: string[];
}

// Result Types
export interface BackupResult {
  success: boolean;
  backupId: string;
  size: number;
  duration: number;
  verification: VerificationStatus;
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  restoreId: string;
  duration: number;
  dataIntegrity: boolean;
  error?: string;
}

export interface FailoverResult {
  success: boolean;
  failoverId: string;
  duration: number;
  newPrimary: string;
  oldPrimary: string;
  error?: string;
}

export interface RecoveryTestResult {
  success: boolean;
  testId: string;
  results: TestResults;
  recommendations: string[];
  error?: string;
}