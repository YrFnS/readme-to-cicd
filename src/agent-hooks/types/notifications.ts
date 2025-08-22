import { RepositoryInfo } from './index';
import { SecurityAlert } from './security';
import { AutomationDecision } from './index';

export enum NotificationChannel {
  SLACK = 'slack',
  EMAIL = 'email',
  WEBHOOK = 'webhook',
  TEAMS = 'teams',
  DISCORD = 'discord'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum NotificationType {
  SECURITY_ALERT = 'security_alert',
  AUTOMATION_COMPLETED = 'automation_completed',
  AUTOMATION_FAILED = 'automation_failed',
  PR_CREATED = 'pr_created',
  PR_MERGED = 'pr_merged',
  DEPLOYMENT_STARTED = 'deployment_started',
  DEPLOYMENT_COMPLETED = 'deployment_completed',
  DEPLOYMENT_FAILED = 'deployment_failed',
  SYSTEM_HEALTH = 'system_health',
  PERFORMANCE_ISSUE = 'performance_issue',
  CUSTOM = 'custom'
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  subject: string;
  body: string;
  variables: string[];
  channels: NotificationChannel[];
  enabled: boolean;
  metadata?: Record<string, any>;
}

export interface NotificationMessage {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  subject: string;
  body: string;
  recipients: NotificationRecipient[];
  repository?: RepositoryInfo;
  data?: Record<string, any>;
  timestamp: Date;
  template?: string;
  metadata?: Record<string, any>;
}

export interface NotificationRecipient {
  channel: NotificationChannel;
  address: string;
  metadata?: Record<string, any>;
}

export interface NotificationDelivery {
  id: string;
  messageId: string;
  channel: NotificationChannel;
  recipient: string;
  status: DeliveryStatus;
  attempts: number;
  lastAttempt?: Date;
  nextAttempt?: Date;
  error?: string;
  response?: any;
  deliveredAt?: Date;
}

export enum DeliveryStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETRY = 'retry',
  CANCELLED = 'cancelled'
}

export interface SlackNotification {
  channel: string;
  text: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  username?: string;
  icon_emoji?: string;
  icon_url?: string;
}

export interface SlackBlock {
  type: 'section' | 'divider' | 'image' | 'actions' | 'context';
  text?: SlackTextObject;
  fields?: SlackTextObject[];
  accessory?: any;
  elements?: any[];
  image_url?: string;
  alt_text?: string;
}

export interface SlackTextObject {
  type: 'plain_text' | 'mrkdwn';
  text: string;
  emoji?: boolean;
}

export interface SlackAttachment {
  color?: string;
  pretext?: string;
  author_name?: string;
  author_link?: string;
  author_icon?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: SlackField[];
  image_url?: string;
  thumb_url?: string;
  footer?: string;
  footer_icon?: string;
  ts?: number;
  mrkdwn_in?: string[];
}

export interface SlackField {
  title: string;
  value: string;
  short?: boolean;
}

export interface EmailNotification {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  encoding?: string;
}

export interface WebhookNotification {
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  body: any;
  timeout?: number;
  retry?: boolean;
}

export interface NotificationConfig {
  enabled: boolean;
  defaultChannels: NotificationChannel[];
  templates: NotificationTemplate[];
  channelConfigs: Record<NotificationChannel, ChannelConfig>;
  retryPolicy: RetryPolicy;
  rateLimits: RateLimit[];
  filters: NotificationFilter[];
}

export interface ChannelConfig {
  enabled: boolean;
  apiKey?: string;
  webhookUrl?: string;
  smtpConfig?: SMTPConfig;
  defaultRecipient?: string;
  timeout?: number;
  retry?: boolean;
  metadata?: Record<string, any>;
}

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  tls?: any;
}

export interface RetryPolicy {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export interface RateLimit {
  channel: NotificationChannel;
  limit: number;
  window: number; // in seconds
  strategy: 'drop' | 'queue' | 'throttle';
}

export interface NotificationFilter {
  id: string;
  name: string;
  condition: string; // Expression to evaluate
  action: 'allow' | 'deny' | 'modify';
  priority: number;
  enabled: boolean;
}

export interface NotificationMetrics {
  total_sent: number;
  total_failed: number;
  total_pending: number;
  average_delivery_time: number;
  delivery_success_rate: number;
  channel_metrics: Record<NotificationChannel, ChannelMetrics>;
  recent_activity: NotificationActivity[];
}

export interface ChannelMetrics {
  sent: number;
  failed: number;
  pending: number;
  average_delivery_time: number;
  success_rate: number;
  last_used?: Date;
}

export interface NotificationActivity {
  timestamp: Date;
  type: 'sent' | 'failed' | 'retry';
  channel: NotificationChannel;
  recipient: string;
  message_type: NotificationType;
  success: boolean;
  error?: string;
}

export interface ExternalIntegration {
  id: string;
  name: string;
  type: IntegrationType;
  enabled: boolean;
  config: Record<string, any>;
  auth: IntegrationAuth;
  endpoints: IntegrationEndpoint[];
  rateLimits?: RateLimit[];
  retryPolicy?: RetryPolicy;
  metadata?: Record<string, any>;
}

export enum IntegrationType {
  JIRA = 'jira',
  LINEAR = 'linear',
  GITHUB_ISSUES = 'github_issues',
  SLACK = 'slack',
  TEAMS = 'teams',
  DISCORD = 'discord',
  WEBHOOK = 'webhook',
  EMAIL = 'email',
  CUSTOM = 'custom'
}

export interface IntegrationAuth {
  type: 'api_key' | 'oauth' | 'basic' | 'bearer' | 'custom';
  credentials: Record<string, string>;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface IntegrationEndpoint {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  parameters?: string[];
  headers?: Record<string, string>;
  body?: any;
}

export interface IntegrationResult {
  success: boolean;
  data?: any;
  error?: string;
  statusCode?: number;
  headers?: Record<string, string>;
  retryable?: boolean;
}

export interface NotificationRule {
  id: string;
  name: string;
  trigger: NotificationTrigger;
  conditions: NotificationCondition[];
  actions: NotificationAction[];
  enabled: boolean;
  priority: number;
  cooldown?: number; // in minutes
  metadata?: Record<string, any>;
}

export interface NotificationTrigger {
  type: 'event' | 'schedule' | 'metric' | 'custom';
  eventType?: NotificationType;
  schedule?: string; // cron expression
  metric?: string;
  threshold?: number;
  operator?: 'gt' | 'lt' | 'eq' | 'contains' | 'regex';
}

export interface NotificationCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'not_contains' | 'regex' | 'in' | 'not_in';
  value: any;
  negate?: boolean;
}

export interface NotificationAction {
  type: 'send_notification' | 'create_ticket' | 'webhook' | 'log' | 'custom';
  config: Record<string, any>;
  condition?: string;
}

export interface NotificationQueue {
  id: string;
  messageId: string;
  priority: number;
  scheduledFor: Date;
  createdAt: Date;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  status: 'queued' | 'processing' | 'delivered' | 'failed' | 'cancelled';
}