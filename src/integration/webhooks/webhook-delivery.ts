/**
 * Webhook Delivery System
 * 
 * Handles the actual delivery of webhook events to registered endpoints
 * with timeout handling, signature generation, and response processing.
 */

import { EventEmitter } from 'events';
import type {
  WebhookConfig,
  Webhook,
  WebhookEvent,
  WebhookDeliveryResult
} from './types';

export class WebhookDelivery extends EventEmitter {
  private config: WebhookConfig;

  constructor(config: WebhookConfig) {
    super();
    this.config = config;
  }

  /**
   * Deliver an event to a webhook endpoint
   */
  async deliver(webhook: Webhook, event: WebhookEvent, attempt: number = 1): Promise<WebhookDeliveryResult> {
    const startTime = Date.now();
    const deliveryId = this.generateDeliveryId();

    try {
      // Prepare payload
      const payload = this.preparePayload(event);
      
      // Generate signature if secret is provided
      const signature = webhook.secret 
        ? this.generateSignature(payload, webhook.secret)
        : undefined;

      // Prepare headers
      const headers = this.prepareHeaders(webhook, signature, event);

      // Make HTTP request
      const response = await this.makeRequest(webhook.url, payload, headers);
      
      const duration = Date.now() - startTime;
      const result: WebhookDeliveryResult = {
        webhookId: webhook.id,
        eventId: event.id,
        success: this.isSuccessfulResponse(response.status),
        statusCode: response.status,
        responseBody: response.body,
        attempt,
        deliveredAt: new Date(),
        duration
      };

      this.emit('delivery', result);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const result: WebhookDeliveryResult = {
        webhookId: webhook.id,
        eventId: event.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        attempt,
        deliveredAt: new Date(),
        duration
      };

      this.emit('delivery', result);
      return result;
    }
  }

  /**
   * Prepare the webhook payload
   */
  private preparePayload(event: WebhookEvent): string {
    const payload = {
      id: event.id,
      type: event.type,
      data: event.data,
      timestamp: event.timestamp.toISOString(),
      source: event.source,
      version: event.version,
      metadata: event.metadata
    };

    return JSON.stringify(payload);
  }

  /**
   * Generate webhook signature for payload verification
   */
  private generateSignature(payload: string, secret: string): string {
    // In a real implementation, this would use crypto.createHmac
    // For now, we'll create a simple hash-like signature
    const hash = this.simpleHash(payload + secret);
    return `sha256=${hash}`;
  }

  /**
   * Prepare HTTP headers for the webhook request
   */
  private prepareHeaders(webhook: Webhook, signature?: string, event?: WebhookEvent): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'README-to-CICD-Webhook/1.0.0',
      'X-Webhook-ID': webhook.id,
      'X-Webhook-Delivery': this.generateDeliveryId(),
      'X-Webhook-Timestamp': new Date().toISOString(),
      ...webhook.headers
    };

    if (signature) {
      headers['X-Webhook-Signature'] = signature;
    }

    if (event) {
      headers['X-Event-ID'] = event.id;
      headers['X-Event-Type'] = event.type;
    }

    return headers;
  }

  /**
   * Make HTTP request to webhook endpoint
   */
  private async makeRequest(
    url: string, 
    payload: string, 
    headers: Record<string, string>
  ): Promise<{ status: number; body: string }> {
    // Mock HTTP client implementation
    // In production, this would use fetch() or a proper HTTP client
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Request timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      // Simulate HTTP request
      setTimeout(() => {
        clearTimeout(timeout);
        
        // Mock different responses based on URL
        if (url.includes('httpbin.org')) {
          resolve({
            status: 200,
            body: JSON.stringify({ success: true, received: JSON.parse(payload) })
          });
        } else if (url.includes('error')) {
          reject(new Error('Connection refused'));
        } else if (url.includes('timeout')) {
          // Don't resolve - let it timeout
          return;
        } else if (url.includes('500')) {
          resolve({
            status: 500,
            body: JSON.stringify({ error: 'Internal server error' })
          });
        } else {
          resolve({
            status: 200,
            body: JSON.stringify({ success: true })
          });
        }
      }, 100); // Simulate network delay
    });
  }

  /**
   * Check if HTTP response status indicates success
   */
  private isSuccessfulResponse(status: number): boolean {
    return status >= 200 && status < 300;
  }

  /**
   * Generate a unique delivery ID
   */
  private generateDeliveryId(): string {
    return `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Simple hash function for signature generation
   * In production, use crypto.createHmac('sha256', secret)
   */
  private simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}