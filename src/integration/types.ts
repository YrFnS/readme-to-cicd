/**
 * Core types and interfaces for enterprise integration system
 */

// Base integration types
export interface IntegrationConfig {
  id: string;
  name: string;
  type: IntegrationType;
  enabled: boolean;
  configuration: Record<string, any>;
  credentials?: IntegrationCredentials;
  metadata?: IntegrationMetadata;
}

export interface IntegrationCredentials {
  type: 'oauth' | 'api-key' | 'basic-auth' | 'certificate' | 'ldap';
  data: Record<string, string>;
  expiresAt?: Date;
}

export interface IntegrationMetadata {
  version: string;
  lastSync?: Date;
  status: IntegrationStatus;
  healthCheck?: HealthCheckResult;
  tags?: string[];
}

export type IntegrationType = 
  | 'identity'
  | 'workflow'
  | 'notification'
  | 'cicd'
  | 'monitoring';

export type IntegrationStatus = 
  | 'active'
  | 'inactive'
  | 'error'
  | 'syncing'
  | 'maintenance';

// Identity integration types
export interface IdentityProvider {
  type: 'ldap' | 'active-directory' | 'sso' | 'oauth' | 'saml';
  endpoint: string;
  configuration: IdentityProviderConfig;
}

export interface IdentityProviderConfig {
  baseDN?: string;
  searchFilter?: string;
  attributes?: string[];
  ssoUrl?: string;
  entityId?: string;
  certificate?: string;
}

export interface UserInfo {
  id: string;
  username: string;
  email: string;
  displayName: string;
  groups: string[];
  attributes: Record<string, any>;
}

// Workflow integration types
export interface WorkflowSystem {
  type: 'jira' | 'servicenow' | 'custom';
  baseUrl: string;
  configuration: WorkflowSystemConfig;
}

export interface WorkflowSystemConfig {
  projectKey?: string;
  instanceUrl?: string;
  apiVersion?: string;
  customFields?: Record<string, string>;
}

export interface WorkflowItem {
  id: string;
  title: string;
  description: string;
  status: string;
  assignee?: string;
  priority: string;
  labels: string[];
  customFields: Record<string, any>;
}

// Notification integration types
export interface NotificationProvider {
  type: 'slack' | 'teams' | 'email' | 'webhook';
  configuration: NotificationProviderConfig;
}

export interface NotificationProviderConfig {
  webhookUrl?: string;
  channel?: string;
  smtpServer?: string;
  fromAddress?: string;
  template?: string;
}

export interface NotificationMessage {
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  recipients: string[];
  metadata?: Record<string, any>;
}

// CI/CD integration types
export interface CICDPlatform {
  type: 'jenkins' | 'gitlab-ci' | 'github-actions' | 'azure-devops';
  baseUrl: string;
  configuration: CICDPlatformConfig;
}

export interface CICDPlatformConfig {
  projectId?: string;
  organizationId?: string;
  pipelineTemplate?: string;
  defaultBranch?: string;
}

export interface PipelineExecution {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  branch: string;
  commit: string;
  startTime: Date;
  endTime?: Date;
  logs?: string;
}

// Monitoring integration types
export interface MonitoringPlatform {
  type: 'datadog' | 'newrelic' | 'prometheus' | 'custom';
  configuration: MonitoringPlatformConfig;
}

export interface MonitoringPlatformConfig {
  apiKey?: string;
  region?: string;
  dashboardId?: string;
  alertRules?: AlertRule[];
}

export interface MetricData {
  name: string;
  value: number;
  timestamp: Date;
  tags: Record<string, string>;
  unit?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

// Integration hub types
export interface IntegrationHub {
  registerIntegration(config: IntegrationConfig): Promise<void>;
  removeIntegration(id: string): Promise<void>;
  getIntegration(id: string): Promise<IntegrationConfig | null>;
  listIntegrations(type?: IntegrationType): Promise<IntegrationConfig[]>;
  syncIntegration(id: string): Promise<SyncResult>;
  healthCheck(id?: string): Promise<HealthCheckResult[]>;
}

export interface SyncResult {
  success: boolean;
  itemsSynced: number;
  errors: string[];
  duration: number;
  lastSync: Date;
}

export interface HealthCheckResult {
  integrationId: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: Date;
  details?: Record<string, any>;
}

// Event types for integration system
export interface IntegrationEvent {
  type: IntegrationEventType;
  integrationId: string;
  timestamp: Date;
  data: any;
  correlationId?: string;
}

export type IntegrationEventType =
  | 'sync-started'
  | 'sync-completed'
  | 'sync-failed'
  | 'health-check'
  | 'configuration-changed'
  | 'error-occurred';

// Result types
export interface IntegrationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

export interface BatchResult<T = any> {
  success: boolean;
  results: IntegrationResult<T>[];
  totalProcessed: number;
  successCount: number;
  errorCount: number;
}

// Re-export orchestration types for backward compatibility
export { SystemEvent, CircuitBreakerStatus, QueueStatus } from '../shared/types/orchestration';
export { WorkflowRequest } from './orchestration/orchestration-engine';