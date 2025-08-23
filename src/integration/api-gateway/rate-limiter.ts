/**
 * Rate Limiter Implementation
 * 
 * Provides configurable rate limiting and throttling policies
 * with support for different algorithms and quota management.
 */

import type { RequestContext, RateLimitConfig } from './types';

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

export class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: RateLimitConfig) {
    this.config = config;
    
    if (config.enabled) {
      this.startCleanupInterval();
    }
  }

  /**
   * Check if request is within rate limit
   */
  async checkLimit(context: RequestContext): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const key = this.generateKey(context);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get or create rate limit entry
    let entry = this.store.get(key);
    
    if (!entry || entry.resetTime <= now) {
      // Create new entry or reset expired entry
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs,
        firstRequest: now
      };
      this.store.set(key, entry);
    }

    // Check if request should be counted
    const shouldCount = this.shouldCountRequest(context, entry);
    
    if (shouldCount) {
      entry.count++;
    }

    // Check if limit exceeded
    if (entry.count > this.config.maxRequests) {
      const resetIn = Math.ceil((entry.resetTime - now) / 1000);
      
      throw {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded. Try again in ${resetIn} seconds.`,
        statusCode: 429,
        details: {
          limit: this.config.maxRequests,
          remaining: 0,
          resetTime: entry.resetTime,
          retryAfter: resetIn
        }
      };
    }

    // Add rate limit headers to context metadata
    context.metadata.rateLimit = {
      limit: this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      resetTime: entry.resetTime,
      resetIn: Math.ceil((entry.resetTime - now) / 1000)
    };
  }

  /**
   * Get current rate limit status for a key
   */
  async getStatus(context: RequestContext): Promise<{
    limit: number;
    remaining: number;
    resetTime: number;
    resetIn: number;
  }> {
    const key = this.generateKey(context);
    const entry = this.store.get(key);
    const now = Date.now();

    if (!entry || entry.resetTime <= now) {
      return {
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests,
        resetTime: now + this.config.windowMs,
        resetIn: Math.ceil(this.config.windowMs / 1000)
      };
    }

    return {
      limit: this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      resetTime: entry.resetTime,
      resetIn: Math.ceil((entry.resetTime - now) / 1000)
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  async reset(context: RequestContext): Promise<void> {
    const key = this.generateKey(context);
    this.store.delete(key);
  }

  /**
   * Clear all rate limit entries
   */
  async clear(): Promise<void> {
    this.store.clear();
  }

  /**
   * Get rate limit statistics
   */
  getStats(): {
    totalKeys: number;
    activeKeys: number;
    config: RateLimitConfig;
  } {
    const now = Date.now();
    let activeKeys = 0;

    for (const entry of this.store.values()) {
      if (entry.resetTime > now) {
        activeKeys++;
      }
    }

    return {
      totalKeys: this.store.size,
      activeKeys,
      config: this.config
    };
  }

  /**
   * Update rate limit configuration
   */
  updateConfig(newConfig: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.enabled && !this.cleanupInterval) {
      this.startCleanupInterval();
    } else if (!this.config.enabled && this.cleanupInterval) {
      this.stopCleanupInterval();
    }
  }

  /**
   * Destroy the rate limiter and cleanup resources
   */
  destroy(): void {
    this.stopCleanupInterval();
    this.store.clear();
  }

  /**
   * Generate a unique key for rate limiting
   */
  private generateKey(context: RequestContext): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(context);
    }

    // Default key generation strategy
    const ip = context.metadata.remoteAddress || 'unknown';
    const user = context.user?.id || 'anonymous';
    const path = context.path;
    
    return `${ip}:${user}:${path}`;
  }

  /**
   * Determine if request should be counted towards rate limit
   */
  private shouldCountRequest(context: RequestContext, entry: RateLimitEntry): boolean {
    // Skip successful requests if configured
    if (this.config.skipSuccessfulRequests && context.metadata.isSuccessful) {
      return false;
    }

    // Skip failed requests if configured
    if (this.config.skipFailedRequests && context.metadata.isFailed) {
      return false;
    }

    return true;
  }

  /**
   * Start cleanup interval to remove expired entries
   */
  private startCleanupInterval(): void {
    if (this.cleanupInterval) {
      return;
    }

    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Stop cleanup interval
   */
  private stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Remove expired rate limit entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime <= now) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.store.delete(key);
    }

    if (expiredKeys.length > 0) {
      console.log(`Rate limiter cleaned up ${expiredKeys.length} expired entries`);
    }
  }
}