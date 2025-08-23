/**
 * Security Management Framework Types
 * 
 * Defines interfaces and types for comprehensive security controls including
 * authentication, authorization, encryption, audit logging, and compliance.
 */

// Authentication Types
export interface Credentials {
  type: 'oauth' | 'saml' | 'api-key' | 'basic'
  data: OAuthCredentials | SAMLCredentials | ApiKeyCredentials | BasicCredentials
}

export interface OAuthCredentials {
  accessToken: string
  refreshToken?: string
  tokenType: string
  expiresIn?: number
  scope?: string[]
}

export interface SAMLCredentials {
  assertion: string
  sessionIndex?: string
  nameId: string
  attributes?: Record<string, string[]>
}

export interface ApiKeyCredentials {
  key: string
  secret?: string
  algorithm?: string
}

export interface BasicCredentials {
  username: string
  password: string
}

export interface AuthenticationResult {
  success: boolean
  user?: User
  token?: string
  expiresAt?: Date
  error?: string
  metadata?: Record<string, any>
}

// Authorization Types
export interface User {
  id: string
  username: string
  email: string
  roles: Role[]
  permissions: Permission[]
  attributes: Record<string, any>
  lastLogin?: Date
  isActive: boolean
}

export interface Role {
  id: string
  name: string
  description: string
  permissions: Permission[]
  inherits?: string[]
}

export interface Permission {
  id: string
  resource: string
  action: string
  conditions?: PermissionCondition[]
}

export interface PermissionCondition {
  field: string
  operator: 'eq' | 'ne' | 'in' | 'nin' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains'
  value: any
}

export interface Resource {
  type: string
  id: string
  attributes: Record<string, any>
}

export type Action = 'create' | 'read' | 'update' | 'delete' | 'execute' | 'admin'

// Encryption Types
export interface EncryptionContext {
  algorithm: 'AES-256-GCM' | 'AES-256-CBC' | 'RSA-OAEP'
  keyId?: string
  additionalData?: Buffer
}

export interface EncryptionResult {
  ciphertext: string
  iv?: string
  tag?: string
  keyId: string
}

export interface DecryptionResult {
  plaintext: string
  verified: boolean
}

// Audit Types
export interface AuditEvent {
  id: string
  timestamp: Date
  userId?: string
  sessionId?: string
  eventType: AuditEventType
  resource: string
  action: string
  result: 'success' | 'failure' | 'error'
  details: Record<string, any>
  ipAddress?: string
  userAgent?: string
  riskScore?: number
}

export type AuditEventType = 
  | 'authentication'
  | 'authorization'
  | 'data-access'
  | 'configuration-change'
  | 'security-event'
  | 'compliance-check'
  | 'system-event'

export interface AuditQuery {
  startTime?: Date
  endTime?: Date
  userId?: string
  eventType?: AuditEventType
  resource?: string
  action?: string
  result?: 'success' | 'failure' | 'error'
  limit?: number
  offset?: number
}

export interface AuditReport {
  events: AuditEvent[]
  totalCount: number
  summary: AuditSummary
  generatedAt: Date
}

export interface AuditSummary {
  totalEvents: number
  successfulEvents: number
  failedEvents: number
  errorEvents: number
  uniqueUsers: number
  topResources: Array<{ resource: string; count: number }>
  topActions: Array<{ action: string; count: number }>
}

// Compliance Types
export interface ComplianceFramework {
  id: string
  name: string
  version: string
  controls: ComplianceControl[]
}

export interface ComplianceControl {
  id: string
  title: string
  description: string
  requirements: string[]
  category: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface ComplianceReport {
  frameworkId: string
  assessmentDate: Date
  overallScore: number
  controlResults: ComplianceControlResult[]
  recommendations: ComplianceRecommendation[]
}

export interface ComplianceControlResult {
  controlId: string
  status: 'compliant' | 'non-compliant' | 'partial' | 'not-applicable'
  score: number
  evidence: string[]
  gaps: string[]
}

export interface ComplianceRecommendation {
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  controlIds: string[]
  estimatedEffort: string
}

// Security Scanning Types
export interface SecurityScan {
  id: string
  type: 'vulnerability' | 'compliance' | 'penetration' | 'code-analysis'
  target: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startTime: Date
  endTime?: Date
  results?: SecurityScanResult
}

export interface SecurityScanResult {
  summary: SecurityScanSummary
  vulnerabilities: Vulnerability[]
  recommendations: SecurityRecommendation[]
}

export interface SecurityScanSummary {
  totalVulnerabilities: number
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  riskScore: number
}

export interface Vulnerability {
  id: string
  title: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  cvssScore?: number
  cveId?: string
  component: string
  version?: string
  fixVersion?: string
  references: string[]
}

export interface SecurityRecommendation {
  id: string
  title: string
  description: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: string
  actionItems: string[]
}

// Policy Types
export interface Policy {
  id: string
  name: string
  description: string
  type: 'security' | 'compliance' | 'operational'
  rules: PolicyRule[]
  enforcement: 'advisory' | 'blocking'
  isActive: boolean
}

export interface PolicyRule {
  id: string
  condition: string
  action: 'allow' | 'deny' | 'log' | 'alert'
  parameters?: Record<string, any>
}

export interface PolicyResult {
  policyId: string
  ruleId?: string
  decision: 'allow' | 'deny'
  reason: string
  metadata?: Record<string, any>
}

// Risk Assessment Types
export interface RiskAssessment {
  id: string
  timestamp: Date
  riskType: 'security' | 'compliance' | 'operational'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  impact: string
  likelihood: string
  mitigation: string[]
  status: 'open' | 'mitigated' | 'accepted' | 'closed'
}

// Configuration Types
export interface SecurityConfig {
  authentication: AuthConfig
  authorization: AuthzConfig
  encryption: EncryptionConfig
  audit: AuditConfig
  compliance: ComplianceConfig
  scanning: ScanningConfig
}

export interface AuthConfig {
  providers: AuthProvider[]
  sessionTimeout: number
  maxLoginAttempts: number
  lockoutDuration: number
  passwordPolicy: PasswordPolicy
}

export interface AuthProvider {
  type: 'oauth' | 'saml' | 'ldap' | 'local'
  name: string
  config: Record<string, any>
  isEnabled: boolean
}

export interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  maxAge: number
  historyCount: number
}

export interface AuthzConfig {
  defaultRole: string
  roleHierarchy: Record<string, string[]>
  permissionCache: {
    enabled: boolean
    ttl: number
  }
}

export interface EncryptionConfig {
  defaultAlgorithm: string
  keyRotationInterval: number
  keyManagement: {
    provider: 'local' | 'vault' | 'aws-kms' | 'azure-keyvault'
    config: Record<string, any>
  }
}

export interface AuditConfig {
  enabled: boolean
  storage: {
    type: 'database' | 'file' | 'elasticsearch'
    config: Record<string, any>
  }
  retention: {
    days: number
    archiveAfterDays?: number
  }
  realTimeAlerts: boolean
}

export interface ComplianceConfig {
  frameworks: string[]
  assessmentSchedule: string
  autoRemediation: boolean
  reportingEmail: string[]
}

export interface ScanningConfig {
  enabled: boolean
  schedule: string
  scanTypes: string[]
  integrations: {
    vulnerabilityDb: string
    scanners: string[]
  }
}