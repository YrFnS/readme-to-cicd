/**
 * Webhook System Types and Interfaces
 */

export interface WebhookConfig {
  enabled: boolean;
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  batchSize: number;
  deliveryTracking: boolean;
  signatureSecret?: string;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  secret?: string;
  headers?: Record<string, string>;
  filters?: EventFilter[];
  retryConfig?: RetryConfig;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
  source: string;
  version: string;
  metadata?: Record<string, any>;
}

export interface WebhookDeliveryResult {
  webhookId: string;
  eventId: string;
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  error?: string;
  attempt: number;
  deliveredAt: Date;
  duration: number;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[];
}

export interface EventFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'nin' | 'contains' | 'regex';
  value: any;
}

export interface WebhookMetrics {
  totalWebhooks: number;
  activeWebhooks: number;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  averageDeliveryTime: number;
  deliverySuccessRate: number;
  eventTypes: Record<string, number>;
  webhookStats: Record<string, WebhookStats>;
}

export interface WebhookStats {
  webhookId: string;
  url: string;
  deliveries: number;
  successes: number;
  failures: number;
  averageResponseTime: number;
  lastDelivery?: Date;
  lastSuccess?: Date;
  lastFailure?: Date;
}

export interface DeliveryAttempt {
  id: string;
  webhookId: string;
  eventId: string;
  attempt: number;
  scheduledAt: Date;
  deliveredAt?: Date;
  statusCode?: number;
  responseBody?: string;
  error?: string;
  duration?: number;
}

export interface WebhookSubscription {
  webhookId: string;
  eventType: string;
  filters?: EventFilter[];
  active: boolean;
  createdAt: Date;
}