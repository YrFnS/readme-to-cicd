/**
 * Retry Manager
 * 
 * Manages retry logic for failed webhook deliveries with
 * exponential backoff and configurable retry policies.
 */

import { EventEmitter } from 'events';
import type { WebhookConfig, RetryConfig } from './types';

interface RetryAttempt {
  webhookId: string;
  eventId: string;
  attempt: number;
  scheduledAt: Date;
  nextRetryAt: Date;
}

export class RetryManager extends EventEmitter {
  private config: WebhookConfig;
  private retryQueue: Map<string, RetryAttempt> = new Map();
  private retryTimer: NodeJS.Timeout | null = null;

  constructor(config: WebhookConfig) {
    super();
    this.config = config;
    this.startRetryProcessor();
  }

  /**
   * Schedule a retry for a failed webhook delivery
   */
  async scheduleRetry(webhookId: string, eventId: string, attempt: number = 1): Promise<void> {
    if (attempt >= this.config.maxRetries) {
      this.emit('failed', webhookId, eventId);
      return;
    }

    const retryKey = `${webhookId}:${eventId}`;
    const delay = this.calculateRetryDelay(attempt);
    const nextRetryAt = new Date(Date.now() + delay);

    const retryAttempt: RetryAttempt = {
      webhookId,
      eventId,
      attempt: attempt + 1,
      scheduledAt: new Date(),
      nextRetryAt
    };

    this.retryQueue.set(retryKey, retryAttempt);
    this.emit('scheduled', { webhookId, eventId, attempt: attempt + 1, nextRetryAt });
  }

  /**
   * Cancel a scheduled retry
   */
  async cancelRetry(webhookId: string, eventId: string): Promise<void> {
    const retryKey = `${webhookId}:${eventId}`;
    const removed = this.retryQueue.delete(retryKey);
    
    if (removed) {
      this.emit('cancelled', { webhookId, eventId });
    }
  }

  /**
   * Get all scheduled retries
   */
  getScheduledRetries(): RetryAttempt[] {
    return Array.from(this.retryQueue.values());
  }

  /**
   * Get scheduled retries for a specific webhook
   */
  getWebhookRetries(webhookId: string): RetryAttempt[] {
    return Array.from(this.retryQueue.values())
      .filter(retry => retry.webhookId === webhookId);
  }

  /**
   * Clear all scheduled retries
   */
  clearAllRetries(): void {
    this.retryQueue.clear();
    this.emit('cleared');
  }

  /**
   * Clear retries for a specific webhook
   */
  clearWebhookRetries(webhookId: string): void {
    const keysToRemove: string[] = [];
    
    for (const [key, retry] of this.retryQueue.entries()) {
      if (retry.webhookId === webhookId) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      this.retryQueue.delete(key);
    }

    if (keysToRemove.length > 0) {
      this.emit('webhookRetriesCleared', { webhookId, count: keysToRemove.length });
    }
  }

  /**
   * Get retry statistics
   */
  getRetryStats(): {
    totalScheduled: number;
    byWebhook: Record<string, number>;
    byAttempt: Record<number, number>;
    nextRetry?: Date;
  } {
    const retries = Array.from(this.retryQueue.values());
    const byWebhook: Record<string, number> = {};
    const byAttempt: Record<number, number> = {};
    let nextRetry: Date | undefined;

    for (const retry of retries) {
      byWebhook[retry.webhookId] = (byWebhook[retry.webhookId] || 0) + 1;
      byAttempt[retry.attempt] = (byAttempt[retry.attempt] || 0) + 1;
      
      if (!nextRetry || retry.nextRetryAt < nextRetry) {
        nextRetry = retry.nextRetryAt;
      }
    }

    return {
      totalScheduled: retries.length,
      byWebhook,
      byAttempt,
      nextRetry
    };
  }

  /**
   * Destroy the retry manager and cleanup resources
   */
  destroy(): void {
    this.stopRetryProcessor();
    this.retryQueue.clear();
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = this.config.retryDelay;
    const maxDelay = 300000; // 5 minutes max
    const backoffMultiplier = 2;
    
    const delay = baseDelay * Math.pow(backoffMultiplier, attempt - 1);
    return Math.min(delay, maxDelay);
  }

  /**
   * Start the retry processor
   */
  private startRetryProcessor(): void {
    if (this.retryTimer) {
      return;
    }

    // Check for retries every 10 seconds
    this.retryTimer = setInterval(() => {
      this.processRetries();
    }, 10000);
  }

  /**
   * Stop the retry processor
   */
  private stopRetryProcessor(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
  }

  /**
   * Process scheduled retries
   */
  private processRetries(): void {
    const now = new Date();
    const readyRetries: RetryAttempt[] = [];

    for (const [key, retry] of this.retryQueue.entries()) {
      if (retry.nextRetryAt <= now) {
        readyRetries.push(retry);
        this.retryQueue.delete(key);
      }
    }

    for (const retry of readyRetries) {
      this.emit('retry', retry.webhookId, retry.eventId, retry.attempt);
    }
  }
}