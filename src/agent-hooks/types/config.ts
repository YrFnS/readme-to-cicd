import { RepositoryInfo } from './index';
import { NotificationChannel } from './notifications';

export enum DeploymentMode {
  STANDALONE = 'standalone',
  SERVERLESS = 'serverless',
  CONTAINER = 'container',
  CLUSTER = 'cluster'
}

export enum EnvironmentType {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TESTING = 'testing'
}

export enum ConfigurationSource {
  FILE = 'file',
  ENVIRONMENT = 'environment',
  DATABASE = 'database',
  REMOTE = 'remote',
  DEFAULT = 'default'
}

export enum ConfigurationScope {
  GLOBAL = 'global',
  ENVIRONMENT = 'environment',
  REPOSITORY = 'repository',
  TEAM = 'team',
  USER = 'user'
}

export interface ConfigurationSchema {
  id: string;
  name: string;
  version: string;
  description?: string;
  properties: ConfigurationProperty[];
  required: string[];
  additionalProperties: boolean;
  metadata?: Record<string, any>;
}

export interface ConfigurationProperty {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  default?: any;
  required: boolean;
  enum?: any[];
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  items?: ConfigurationProperty;
  properties?: ConfigurationProperty[];
  validation?: ConfigurationValidation;
  sensitive?: boolean;
  scope?: ConfigurationScope;
}

export interface ConfigurationValidation {
  type: 'regex' | 'range' | 'custom' | 'required' | 'enum';
  rule: any;
  message?: string;
}

export interface ConfigurationValue {
  key: string;
  value: any;
  source: ConfigurationSource;
  scope: ConfigurationScope;
  environment?: EnvironmentType;
  repository?: string;
  team?: string;
  user?: string;
  encrypted: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface ConfigurationSet {
  id: string;
  name: string;
  description?: string;
  environment: EnvironmentType;
  repository?: RepositoryInfo;
  team?: string;
  values: ConfigurationValue[];
  schema?: ConfigurationSchema;
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface ConfigurationTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  schema: ConfigurationSchema;
  defaultValues: Record<string, any>;
  examples: ConfigurationExample[];
  tags: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConfigurationExample {
  name: string;
  description?: string;
  values: Record<string, any>;
  useCase?: string;
}

export interface DeploymentConfiguration {
  id: string;
  name: string;
  description?: string;
  mode: DeploymentMode;
  environment: EnvironmentType;
  configuration: ConfigurationSet;
  strategy: DeploymentStrategy;
  healthChecks: DeploymentHealthCheck[];
  rollback: RollbackConfiguration;
  monitoring: DeploymentMonitoring;
  notifications: DeploymentNotification[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeploymentStrategy {
  type: 'rolling' | 'blue_green' | 'canary' | 'recreate';
  parameters: Record<string, any>;
  timeout: number;
  maxRetries: number;
  autoPromote: boolean;
  promoteAfter?: number; // minutes
  trafficSplit?: {
    canary: number;
    stable: number;
  };
}

export interface DeploymentHealthCheck {
  name: string;
  type: 'http' | 'tcp' | 'custom';
  endpoint?: string;
  port?: number;
  timeout: number;
  interval: number;
  maxFailures: number;
  startDelay: number;
  command?: string;
  expectedResponse?: string;
}

export interface RollbackConfiguration {
  enabled: boolean;
  automatic: boolean;
  triggerConditions: RollbackTrigger[];
  strategy: 'immediate' | 'gradual' | 'manual';
  maxVersions: number;
  timeout: number;
}

export interface RollbackTrigger {
  type: 'health_check_failure' | 'error_rate' | 'response_time' | 'custom_metric';
  threshold: number;
  duration: number; // minutes
  operator: 'gt' | 'lt' | 'eq' | 'ne';
}

export interface DeploymentMonitoring {
  enabled: boolean;
  metrics: string[];
  alerts: DeploymentAlert[];
  dashboards: string[];
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  retention: string;
}

export interface DeploymentAlert {
  name: string;
  condition: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  channels: NotificationChannel[];
  cooldown: number; // minutes
}

export interface DeploymentNotification {
  event: 'started' | 'completed' | 'failed' | 'rolled_back';
  channels: NotificationChannel[];
  template: string;
  recipients: string[];
}

export interface EnvironmentConfiguration {
  id: string;
  name: string;
  type: EnvironmentType;
  description?: string;
  baseConfiguration: ConfigurationSet;
  overrides: ConfigurationOverride[];
  variables: EnvironmentVariable[];
  secrets: EnvironmentSecret[];
  endpoints: EnvironmentEndpoint[];
  features: EnvironmentFeature[];
  compliance: EnvironmentCompliance[];
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConfigurationOverride {
  component: string;
  key: string;
  value: any;
  reason?: string;
}

export interface EnvironmentVariable {
  name: string;
  value: string;
  encrypted: boolean;
  description?: string;
}

export interface EnvironmentSecret {
  name: string;
  value: string; // encrypted
  description?: string;
  rotationPolicy?: SecretRotationPolicy;
}

export interface SecretRotationPolicy {
  enabled: boolean;
  interval: number; // days
  notifyBefore: number; // days
  autoRotate: boolean;
}

export interface EnvironmentEndpoint {
  name: string;
  url: string;
  type: 'api' | 'webhook' | 'database' | 'cache' | 'queue';
  authentication?: EndpointAuthentication;
  healthCheck?: string;
}

export interface EndpointAuthentication {
  type: 'basic' | 'bearer' | 'api_key' | 'oauth' | 'none';
  credentials: Record<string, string>;
}

export interface EnvironmentFeature {
  name: string;
  enabled: boolean;
  configuration: Record<string, any>;
  dependencies?: string[];
}

export interface EnvironmentCompliance {
  framework: string;
  requirements: string[];
  status: 'compliant' | 'non_compliant' | 'unknown';
  lastCheck?: Date;
  evidence?: string[];
}

export interface ConfigurationChange {
  id: string;
  configurationId: string;
  changes: ConfigurationDiff[];
  appliedAt: Date;
  appliedBy: string;
  reason?: string;
  rollbackId?: string;
}

export interface ConfigurationDiff {
  key: string;
  oldValue?: any;
  newValue: any;
  type: 'added' | 'modified' | 'deleted';
}

export interface ConfigurationBackup {
  id: string;
  configurationId: string;
  version: number;
  data: Record<string, any>;
  createdAt: Date;
  createdBy: string;
  reason?: string;
  expiresAt?: Date;
}

export interface ConfigurationAudit {
  id: string;
  configurationId: string;
  action: 'create' | 'update' | 'delete' | 'backup' | 'restore';
  changes: ConfigurationDiff[];
  userId: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
}

export interface DeploymentHistory {
  id: string;
  configurationId: string;
  deploymentId: string;
  version: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  success: boolean;
  error?: string;
  metrics: DeploymentMetric[];
  logs: DeploymentLog[];
  rollbackId?: string;
}

export interface DeploymentMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  context: Record<string, any>;
}

export interface DeploymentLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  component?: string;
  context?: Record<string, any>;
}

export interface ConfigurationHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  checks: ConfigurationHealthCheck[];
  timestamp: Date;
  issues: string[];
  recommendations: string[];
}

export interface ConfigurationHealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  details?: Record<string, any>;
  lastCheck: Date;
}

export interface ConfigurationDashboard {
  environments: EnvironmentConfiguration[];
  recentChanges: ConfigurationChange[];
  deploymentHistory: DeploymentHistory[];
  health: ConfigurationHealth;
  alerts: ConfigurationAlert[];
  metrics: ConfigurationMetrics;
}

export interface ConfigurationAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  source: string;
  timestamp: Date;
  acknowledged: boolean;
  resolved: boolean;
}

export interface ConfigurationMetrics {
  totalConfigurations: number;
  activeEnvironments: number;
  recentChanges: number;
  failedDeployments: number;
  averageDeploymentTime: number;
  configurationHealthScore: number;
  secretsRotationDue: number;
}