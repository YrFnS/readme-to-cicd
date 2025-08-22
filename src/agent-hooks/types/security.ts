import { RepositoryInfo } from './index';

export enum SecuritySeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

export enum SecurityAlertState {
  OPEN = 'open',
  DISMISSED = 'dismissed',
  FIXED = 'fixed',
  CLOSED = 'closed',
  AUTO_DISMISSED = 'auto_dismissed',
  RESOLVED = 'resolved'
}

export enum SecurityAlertType {
  CODE_SCANNING = 'code_scanning',
  SECRET_SCANNING = 'secret_scanning',
  DEPENDABOT = 'dependabot',
  MANUAL = 'manual'
}

export interface SecurityAlert {
  id: string;
  number: number;
  type: SecurityAlertType;
  state: SecurityAlertState;
  severity: SecuritySeverity;
  title: string;
  description: string;
  html_url: string;
  repository: RepositoryInfo;
  created_at: string;
  updated_at: string;
  dismissed_at?: string;
  dismissed_by?: string;
  dismissed_reason?: string;
  fixed_at?: string;
  vulnerable_version?: string;
  safe_version?: string;
  package_name?: string;
  manifest_path?: string;
  scope?: string;
  identifiers?: VulnerabilityIdentifier[];
  references?: string[];
  cvss_score?: number;
  cvss_vector?: string;
}

export interface VulnerabilityIdentifier {
  type: string;
  value: string;
}

export interface CodeScanningAlert {
  number: number;
  created_at: string;
  updated_at: string;
  url: string;
  html_url: string;
  state: SecurityAlertState;
  fixed_at?: string;
  dismissed_by?: string;
  dismissed_at?: string;
  dismissed_reason?: string;
  rule: CodeScanningRule;
  tool: CodeScanningTool;
  most_recent_instance: CodeScanningInstance;
}

export interface CodeScanningRule {
  id: string;
  severity: SecuritySeverity;
  description: string;
  name: string;
  tags?: string[];
  security_severity_level?: string;
  cvss_score?: number;
  cvss_vector?: string;
}

export interface CodeScanningTool {
  name: string;
  version?: string;
}

export interface CodeScanningInstance {
  ref: string;
  analysis_key: string;
  environment: string;
  category: string;
  state: string;
  commit_sha: string;
  message: CodeScanningMessage;
  location: CodeScanningLocation;
  classifications?: string[];
}

export interface CodeScanningMessage {
  text?: string;
}

export interface CodeScanningLocation {
  path: string;
  start_line?: number;
  end_line?: number;
  start_column?: number;
  end_column?: number;
  snippet?: string;
}

export interface SecretScanningAlert {
  number: number;
  created_at: string;
  updated_at: string;
  url: string;
  html_url: string;
  state: SecurityAlertState;
  resolved_at?: string;
  resolved_by?: string;
  resolution?: string;
  secret_type: string;
  secret_type_display_name: string;
  secret: string;
  repository: RepositoryInfo;
}

export interface DependabotAlert {
  number: number;
  state: SecurityAlertState;
  dependency: DependabotDependency;
  security_advisory: SecurityAdvisory;
  security_vulnerability: SecurityVulnerability;
  url: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  dismissed_at?: string;
  dismissed_by?: string;
  dismissed_reason?: string;
  fixed_at?: string;
}

export interface DependabotDependency {
  package: PackageInfo;
  manifest_path: string;
  scope: string;
}

export interface PackageInfo {
  ecosystem: string;
  name: string;
}

export interface SecurityAdvisory {
  ghsa_id: string;
  cve_id?: string;
  summary: string;
  description: string;
  severity: SecuritySeverity;
  identifiers: VulnerabilityIdentifier[];
  references: AdvisoryReference[];
  published_at: string;
  updated_at: string;
  withdrawn_at?: string;
  vulnerabilities: Vulnerability[];
}

export interface AdvisoryReference {
  url: string;
  kind: string;
}

export interface Vulnerability {
  package: PackageInfo;
  vulnerable_version_range: string;
  first_patched_version?: string;
}

export interface SecurityVulnerability {
  package: PackageInfo;
  vulnerable_version_range: string;
  first_patched_version?: string;
}

export interface SecurityScanResult {
  repository: RepositoryInfo;
  scan_type: SecurityAlertType;
  alerts: SecurityAlert[];
  scan_time: Date;
  scan_duration: number;
  total_alerts: number;
  critical_alerts: number;
  high_alerts: number;
  medium_alerts: number;
  low_alerts: number;
  info_alerts: number;
  new_alerts: number;
  fixed_alerts: number;
  dismissed_alerts: number;
}

export interface ComplianceRequirement {
  id: string;
  name: string;
  description: string;
  category: ComplianceCategory;
  severity: SecuritySeverity;
  frameworks: string[]; // OWASP, SOC2, ISO27001, etc.
  controls: ComplianceControl[];
  enabled: boolean;
  metadata?: Record<string, any>;
}

export enum ComplianceCategory {
  ACCESS_CONTROL = 'access_control',
  DATA_PROTECTION = 'data_protection',
  INFRASTRUCTURE_SECURITY = 'infrastructure_security',
  NETWORK_SECURITY = 'network_security',
  INCIDENT_RESPONSE = 'incident_response',
  COMPLIANCE_MANAGEMENT = 'compliance_management'
}

export interface ComplianceControl {
  id: string;
  name: string;
  description: string;
  check_type: ControlCheckType;
  check_config: Record<string, any>;
  remediation_steps?: string[];
  documentation_links?: string[];
}

export enum ControlCheckType {
  AUTOMATED = 'automated',
  SEMI_AUTOMATED = 'semi_automated',
  MANUAL = 'manual'
}

export interface ComplianceCheckResult {
  requirement_id: string;
  control_id: string;
  status: ComplianceStatus;
  evidence?: string;
  findings?: string[];
  remediation?: string[];
  checked_at: Date;
  checked_by?: string;
}

export enum ComplianceStatus {
  PASSED = 'passed',
  FAILED = 'failed',
  NOT_APPLICABLE = 'not_applicable',
  ERROR = 'error',
  MANUAL_REVIEW = 'manual_review'
}

export interface ComplianceAssessment {
  repository: RepositoryInfo;
  assessment_date: Date;
  overall_status: ComplianceStatus;
  requirements: ComplianceCheckResult[];
  score: number; // 0-100
  critical_failures: number;
  high_risk_findings: number;
  recommendations: string[];
  next_assessment_date?: Date;
}

export interface SecurityRemediation {
  alert_id: string;
  alert_type: SecurityAlertType;
  title: string;
  description: string;
  severity: SecuritySeverity;
  recommended_actions: RemediationAction[];
  estimated_effort: 'low' | 'medium' | 'high';
  automated_fix_available: boolean;
  fix_pr_url?: string;
  created_at: Date;
  resolved_at?: Date;
  status: 'open' | 'in_progress' | 'resolved' | 'dismissed';
}

export interface RemediationAction {
  type: 'update_dependency' | 'patch_code' | 'update_configuration' | 'rotate_secret' | 'review_code';
  description: string;
  file_path?: string;
  line_number?: number;
  old_value?: string;
  new_value?: string;
  automation_possible: boolean;
}

export interface SecurityMetrics {
  total_alerts: number;
  alerts_by_severity: Record<SecuritySeverity, number>;
  alerts_by_type: Record<SecurityAlertType, number>;
  alerts_by_state: Record<SecurityAlertState, number>;
  mean_time_to_fix: number; // in hours
  mean_time_to_dismiss: number; // in hours
  security_score: number; // 0-100
  trend_direction: 'improving' | 'declining' | 'stable';
  scan_success_rate: number; // 0-100
  last_scan_date?: Date;
}

export interface SecurityConfiguration {
  enabled_scanners: SecurityAlertType[];
  severity_thresholds: Record<SecuritySeverity, number>;
  auto_fix_enabled: boolean;
  notification_channels: string[];
  scan_schedule: string; // cron expression
  excluded_paths: string[];
  custom_rules?: SecurityRule[];
  compliance_frameworks: string[];
}

export interface SecurityRule {
  id: string;
  name: string;
  description: string;
  condition: string; // Expression to evaluate
  severity: SecuritySeverity;
  category: string;
  remediation?: string;
  enabled: boolean;
}

export interface SecurityScanJob {
  id: string;
  repository: RepositoryInfo;
  scan_types: SecurityAlertType[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at?: Date;
  completed_at?: Date;
  error?: string;
  results?: SecurityScanResult;
  priority: number;
  retries: number;
}

export interface SecurityDashboard {
  overall_score: number;
  critical_issues: number;
  high_risk_issues: number;
  recent_alerts: SecurityAlert[];
  compliance_status: Record<string, ComplianceStatus>;
  security_trends: SecurityTrend[];
  top_vulnerabilities: TopVulnerability[];
}

export interface SecurityTrend {
  date: string;
  total_alerts: number;
  critical_alerts: number;
  high_alerts: number;
  fixed_alerts: number;
}

export interface TopVulnerability {
  type: string;
  count: number;
  severity: SecuritySeverity;
  affected_repositories: number;
}