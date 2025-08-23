/**
 * Webhook Manager
 * 
 * Manages webhook registrations, event subscriptions,
 * and delivery orchestration with retry mechanisms.
 */

import { EventEmitter } from 'events';
import { WebhookDelivery } from './webhook-delivery';
import { RetryManager } from './retry-manager';
import type {
  WebhookConfig,
  Webhook,
  WebhookEvent,
  WebhookDeliveryResult,
  WebhookMetrics,
  WebhookStats,
  EventFilter,
  WebhookSubscription
} from './types';

export class WebhookManager extends EventEmitter {
  private config: WebhookConfig;
  private webhooks: Map<string, Webhook> = new Map();
  private subscriptions: Map<string, WebhookSubscription[]> = new Map();
  private delivery: WebhookDelivery;
  private retryManager: RetryManager;
  private metrics: WebhookMetrics;
  private deliveryQueue: Array<{ webhook: Webhook; event: WebhookEvent }> = [];
  private processing: boolean = false;

  constructor(config: WebhookConfig) {
    super();
    this.config = config;
    this.delivery = new WebhookDelivery(config);
    this.retryManager = new RetryManager(config);
    this.metrics = this.initializeMetrics();

    // Setup event listeners
    this.delivery.on('delivery', (result: WebhookDeliveryResult) => {
      this.handleDeliveryResult(result);
    });

    this.retryManager.on('retry', (webhookId: string, eventId: string, attempt: number) => {
      this.emit('retry', { webhookId, eventId, attempt });
    });

    this.retryManager.on('failed', (webhookId: string, eventId: string) => {
      this.emit('deliveryFailed', { webhookId, eventId });
    });
  }

  /**
   * Register a new webhook
   */
  async registerWebhook(webhook: Omit<Webhook, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = this.generateWebhookId();
    const now = new Date();

    const newWebhook: Webhook = {
      ...webhook,
      id,
      createdAt: now,
      updatedAt: now
    };

    this.webhooks.set(id, newWebhook);

    // Create subscriptions for each event type
    for (const eventType of webhook.events) {
      this.addSubscription(id, eventType, webhook.filters);
    }

    this.updateMetrics();
    this.emit('webhookRegistered', newWebhook);

    return id;
  }

  /**
   * Update an existing webhook
   */
  async updateWebhook(id: string, updates: Partial<Webhook>): Promise<void> {
    const webhook = this.webhooks.get(id);
    if (!webhook) {
      throw new Error(`Webhook not found: ${id}`);
    }

    const updatedWebhook: Webhook = {
      ...webhook,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date()
    };

    this.webhooks.set(id, updatedWebhook);

    // Update subscriptions if events changed
    if (updates.events) {
      this.removeAllSubscriptions(id);
      for (const eventType of updates.events) {
        this.addSubscription(id, eventType, updatedWebhook.filters);
      }
    }

    this.updateMetrics();
    this.emit('webhookUpdated', updatedWebhook);
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(id: string): Promise<void> {
    const webhook = this.webhooks.get(id);
    if (!webhook) {
      throw new Error(`Webhook not found: ${id}`);
    }

    this.webhooks.delete(id);
    this.removeAllSubscriptions(id);
    this.updateMetrics();
    this.emit('webhookDeleted', webhook);
  }

  /**
   * Get a webhook by ID
   */
  getWebhook(id: string): Webhook | undefined {
    return this.webhooks.get(id);
  }

  /**
   * Get all webhooks
   */
  getAllWebhooks(): Webhook[] {
    return Array.from(this.webhooks.values());
  }

  /**
   * Get active webhooks
   */
  getActiveWebhooks(): Webhook[] {
    return Array.from(this.webhooks.values()).filter(webhook => webhook.active);
  }

  /**
   * Emit an event to all subscribed webhooks
   */
  async emitEvent(event: WebhookEvent): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const subscriptions = this.subscriptions.get(event.type) || [];
    const matchingWebhooks: Webhook[] = [];

    for (const subscription of subscriptions) {
      if (!subscription.active) {
        continue;
      }

      const webhook = this.webhooks.get(subscription.webhookId);
      if (!webhook || !webhook.active) {
        continue;
      }

      // Apply filters
      if (subscription.filters && !this.matchesFilters(event, subscription.filters)) {
        continue;
      }

      matchingWebhooks.push(webhook);
    }

    // Queue deliveries
    for (const webhook of matchingWebhooks) {
      this.queueDelivery(webhook, event);
    }

    this.processDeliveryQueue();
    this.emit('eventEmitted', { event, webhookCount: matchingWebhooks.length });
  }

  /**
   * Get webhook metrics
   */
  getMetrics(): WebhookMetrics {
    return { ...this.metrics };
  }

  /**
   * Get webhook statistics
   */
  getWebhookStats(webhookId: string): WebhookStats | undefined {
    return this.metrics.webhookStats[webhookId];
  }

  /**
   * Test webhook delivery
   */
  async testWebhook(webhookId: string): Promise<WebhookDeliveryResult> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error(`Webhook not found: ${webhookId}`);
    }

    const testEvent: WebhookEvent = {
      id: this.generateEventId(),
      type: 'webhook.test',
      data: { message: 'This is a test webhook delivery' },
      timestamp: new Date(),
      source: 'webhook-manager',
      version: '1.0.0'
    };

    return this.delivery.deliver(webhook, testEvent);
  }

  /**
   * Retry failed delivery
   */
  async retryDelivery(webhookId: string, eventId: string): Promise<void> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error(`Webhook not found: ${webhookId}`);
    }

    await this.retryManager.scheduleRetry(webhookId, eventId);
  }

  /**
   * Queue a delivery for processing
   */
  private queueDelivery(webhook: Webhook, event: WebhookEvent): void {
    this.deliveryQueue.push({ webhook, event });
  }

  /**
   * Process the delivery queue
   */
  private async processDeliveryQueue(): Promise<void> {
    if (this.processing || this.deliveryQueue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      while (this.deliveryQueue.length > 0) {
        const batch = this.deliveryQueue.splice(0, this.config.batchSize);
        const deliveryPromises = batch.map(({ webhook, event }) =>
          this.delivery.deliver(webhook, event).catch(error => {
            console.error(`Delivery failed for webhook ${webhook.id}:`, error);
            return null;
          })
        );

        await Promise.all(deliveryPromises);
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Handle delivery result
   */
  private handleDeliveryResult(result: WebhookDeliveryResult): void {
    this.updateDeliveryMetrics(result);

    if (!result.success && result.attempt < this.config.maxRetries) {
      // Schedule retry
      this.retryManager.scheduleRetry(result.webhookId, result.eventId);
    }

    this.emit('delivery', result);
  }

  /**
   * Add a subscription
   */
  private addSubscription(webhookId: string, eventType: string, filters?: EventFilter[]): void {
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }

    const subscriptions = this.subscriptions.get(eventType)!;
    subscriptions.push({
      webhookId,
      eventType,
      filters,
      active: true,
      createdAt: new Date()
    });
  }

  /**
   * Remove all subscriptions for a webhook
   */
  private removeAllSubscriptions(webhookId: string): void {
    for (const [eventType, subscriptions] of this.subscriptions.entries()) {
      const filtered = subscriptions.filter(sub => sub.webhookId !== webhookId);
      if (filtered.length === 0) {
        this.subscriptions.delete(eventType);
      } else {
        this.subscriptions.set(eventType, filtered);
      }
    }
  }

  /**
   * Check if event matches filters
   */
  private matchesFilters(event: WebhookEvent, filters: EventFilter[]): boolean {
    for (const filter of filters) {
      if (!this.matchesFilter(event, filter)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if event matches a single filter
   */
  private matchesFilter(event: WebhookEvent, filter: EventFilter): boolean {
    const value = this.getNestedValue(event, filter.field);

    switch (filter.operator) {
      case 'eq':
        return value === filter.value;
      case 'ne':
        return value !== filter.value;
      case 'gt':
        return value > filter.value;
      case 'lt':
        return value < filter.value;
      case 'in':
        return Array.isArray(filter.value) && filter.value.includes(value);
      case 'nin':
        return Array.isArray(filter.value) && !filter.value.includes(value);
      case 'contains':
        return typeof value === 'string' && value.includes(filter.value);
      case 'regex':
        return typeof value === 'string' && new RegExp(filter.value).test(value);
      default:
        return false;
    }
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): WebhookMetrics {
    return {
      totalWebhooks: 0,
      activeWebhooks: 0,
      totalDeliveries: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      averageDeliveryTime: 0,
      deliverySuccessRate: 0,
      eventTypes: {},
      webhookStats: {}
    };
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    const webhooks = Array.from(this.webhooks.values());
    this.metrics.totalWebhooks = webhooks.length;
    this.metrics.activeWebhooks = webhooks.filter(w => w.active).length;
  }

  /**
   * Update delivery metrics
   */
  private updateDeliveryMetrics(result: WebhookDeliveryResult): void {
    this.metrics.totalDeliveries++;
    
    if (result.success) {
      this.metrics.successfulDeliveries++;
    } else {
      this.metrics.failedDeliveries++;
    }

    this.metrics.deliverySuccessRate = 
      this.metrics.totalDeliveries > 0 
        ? this.metrics.successfulDeliveries / this.metrics.totalDeliveries 
        : 0;

    // Update webhook-specific stats
    if (!this.metrics.webhookStats[result.webhookId]) {
      const webhook = this.webhooks.get(result.webhookId);
      this.metrics.webhookStats[result.webhookId] = {
        webhookId: result.webhookId,
        url: webhook?.url || '',
        deliveries: 0,
        successes: 0,
        failures: 0,
        averageResponseTime: 0
      };
    }

    const stats = this.metrics.webhookStats[result.webhookId];
    stats.deliveries++;
    
    if (result.success) {
      stats.successes++;
      stats.lastSuccess = result.deliveredAt;
    } else {
      stats.failures++;
      stats.lastFailure = result.deliveredAt;
    }

    stats.lastDelivery = result.deliveredAt;
    stats.averageResponseTime = 
      (stats.averageResponseTime * (stats.deliveries - 1) + result.duration) / stats.deliveries;
  }

  /**
   * Generate webhook ID
   */
  private generateWebhookId(): string {
    return `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate event ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}