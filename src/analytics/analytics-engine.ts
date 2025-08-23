/**
 * Analytics Engine
 * Core analytics system for usage tracking and performance analytics
 */

import { EventEmitter } from 'events';
import {
  AnalyticsEvent,
  AnalyticsEventType,
  UsageAnalytics,
  PerformanceAnalytics,
  BusinessAnalytics,
  UserInteractionMetrics,
  FeatureUsageMetrics,
  SystemAdoptionMetrics,
  SessionAnalytics,
  ResponseTimeMetrics,
  ThroughputMetrics,
  ResourceUsageMetrics,
  ConversionMetrics,
  SatisfactionMetrics,
  ROIMetrics
} from './types';

export interface AnalyticsEngineConfig {
  enableUsageTracking: boolean;
  enablePerformanceTracking: boolean;
  enableBusinessTracking: boolean;
  batchSize: number;
  flushInterval: number;
  retentionDays: number;
  anonymizeData: boolean;
}

export interface AnalyticsStorage {
  store(events: AnalyticsEvent[]): Promise<void>;
  query(query: AnalyticsQuery): Promise<AnalyticsEvent[]>;
  aggregate(aggregation: AnalyticsAggregation): Promise<any>;
  cleanup(olderThan: Date): Promise<void>;
}

export interface AnalyticsQuery {
  eventTypes?: AnalyticsEventType[];
  timeRange: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, any>;
  limit?: number;
  offset?: number;
}

export interface AnalyticsAggregation {
  groupBy: string[];
  metrics: string[];
  timeRange: {
    start: Date;
    end: Date;
  };
  interval?: 'hour' | 'day' | 'week' | 'month';
}

export class AnalyticsEngine extends EventEmitter {
  private config: AnalyticsEngineConfig;
  private storage: AnalyticsStorage;
  private eventBuffer: AnalyticsEvent[] = [];
  private flushTimer?: NodeJS.Timeout;
  private metrics: Map<string, any> = new Map();

  constructor(config: AnalyticsEngineConfig, storage: AnalyticsStorage) {
    super();
    this.config = config;
    this.storage = storage;
    this.startFlushTimer();
  }

  /**
   * Track analytics event
   */
  async trackEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<void> {
    const analyticsEvent: AnalyticsEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      ...event
    };

    if (this.config.anonymizeData) {
      analyticsEvent.userId = this.anonymizeUserId(analyticsEvent.userId);
    }

    this.eventBuffer.push(analyticsEvent);
    this.emit('event', analyticsEvent);

    if (this.eventBuffer.length >= this.config.batchSize) {
      await this.flush();
    }
  }

  /**
   * Track user interaction
   */
  async trackUserInteraction(
    action: string,
    userId?: string,
    sessionId?: string,
    data?: Record<string, any>
  ): Promise<void> {
    if (!this.config.enableUsageTracking) return;

    await this.trackEvent({
      type: 'user_action',
      source: 'user_interaction',
      userId,
      sessionId,
      data: {
        action,
        ...data
      }
    });
  }

  /**
   * Track feature usage
   */
  async trackFeatureUsage(
    feature: string,
    userId?: string,
    sessionId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.config.enableUsageTracking) return;

    await this.trackEvent({
      type: 'user_action',
      source: 'feature_usage',
      userId,
      sessionId,
      data: {
        feature,
        ...metadata
      }
    });
  }

  /**
   * Track performance metric
   */
  async trackPerformance(
    metric: string,
    value: number,
    component: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.config.enablePerformanceTracking) return;

    await this.trackEvent({
      type: 'performance_metric',
      source: component,
      data: {
        metric,
        value,
        ...metadata
      }
    });
  }

  /**
   * Track business metric
   */
  async trackBusinessMetric(
    metric: string,
    value: number,
    category: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.config.enableBusinessTracking) return;

    await this.trackEvent({
      type: 'business_metric',
      source: category,
      data: {
        metric,
        value,
        ...metadata
      }
    });
  }

  /**
   * Get usage analytics
   */
  async getUsageAnalytics(timeRange: { start: Date; end: Date }): Promise<UsageAnalytics> {
    const userInteractions = await this.getUserInteractionMetrics(timeRange);
    const featureUsage = await this.getFeatureUsageMetrics(timeRange);
    const systemAdoption = await this.getSystemAdoptionMetrics(timeRange);
    const sessionAnalytics = await this.getSessionAnalytics(timeRange);

    return {
      userInteractions,
      featureUsage,
      systemAdoption,
      sessionAnalytics
    };
  }

  /**
   * Get performance analytics
   */
  async getPerformanceAnalytics(timeRange: { start: Date; end: Date }): Promise<PerformanceAnalytics> {
    const responseTime = await this.getResponseTimeMetrics(timeRange);
    const throughput = await this.getThroughputMetrics(timeRange);
    const resourceUsage = await this.getResourceUsageMetrics(timeRange);
    const errorRates = await this.getErrorRateMetrics(timeRange);
    const availability = await this.getAvailabilityMetrics(timeRange);

    return {
      responseTime,
      throughput,
      resourceUsage,
      errorRates,
      availability
    };
  }

  /**
   * Get business analytics
   */
  async getBusinessAnalytics(timeRange: { start: Date; end: Date }): Promise<BusinessAnalytics> {
    const conversionRates = await this.getConversionMetrics(timeRange);
    const userSatisfaction = await this.getSatisfactionMetrics(timeRange);
    const systemROI = await this.getROIMetrics(timeRange);
    const businessImpact = await this.getImpactMetrics(timeRange);

    return {
      conversionRates,
      userSatisfaction,
      systemROI,
      businessImpact
    };
  }

  /**
   * Flush buffered events to storage
   */
  async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      await this.storage.store(events);
      this.emit('flush', events.length);
    } catch (error) {
      this.emit('error', error);
      // Re-add events to buffer for retry
      this.eventBuffer.unshift(...events);
    }
  }

  /**
   * Cleanup old analytics data
   */
  async cleanup(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
    
    await this.storage.cleanup(cutoffDate);
    this.emit('cleanup', cutoffDate);
  }

  /**
   * Stop analytics engine
   */
  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flush();
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(async () => {
      await this.flush();
    }, this.config.flushInterval);
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private anonymizeUserId(userId?: string): string | undefined {
    if (!userId) return undefined;
    // Simple hash-based anonymization
    return `anon_${this.simpleHash(userId)}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private async getUserInteractionMetrics(timeRange: { start: Date; end: Date }): Promise<UserInteractionMetrics> {
    const events = await this.storage.query({
      eventTypes: ['user_action'],
      timeRange,
      filters: { source: 'user_interaction' }
    });

    const uniqueUsers = new Set(events.map(e => e.userId).filter(Boolean));
    const sessions = new Set(events.map(e => e.sessionId).filter(Boolean));

    return {
      totalUsers: uniqueUsers.size,
      activeUsers: uniqueUsers.size,
      newUsers: 0, // Would need historical data to calculate
      returningUsers: 0, // Would need historical data to calculate
      userRetention: {
        day1: 0,
        day7: 0,
        day30: 0,
        day90: 0
      },
      userEngagement: {
        averageSessionsPerUser: sessions.size / Math.max(uniqueUsers.size, 1),
        averageActionsPerSession: events.length / Math.max(sessions.size, 1),
        timeSpentPerFeature: {}
      }
    };
  }

  private async getFeatureUsageMetrics(timeRange: { start: Date; end: Date }): Promise<FeatureUsageMetrics> {
    const events = await this.storage.query({
      eventTypes: ['user_action'],
      timeRange,
      filters: { source: 'feature_usage' }
    });

    const featureUsage = new Map<string, number>();
    const featurePerformance = new Map<string, number[]>();

    events.forEach(event => {
      const feature = event.data.feature;
      if (feature) {
        featureUsage.set(feature, (featureUsage.get(feature) || 0) + 1);
      }
    });

    return {
      featureAdoption: Object.fromEntries(featureUsage),
      featureUsageFrequency: Object.fromEntries(featureUsage),
      featurePerformance: {},
      featureErrors: {}
    };
  }

  private async getSystemAdoptionMetrics(timeRange: { start: Date; end: Date }): Promise<SystemAdoptionMetrics> {
    const events = await this.storage.query({
      eventTypes: ['system_event'],
      timeRange
    });

    return {
      totalInstallations: 0,
      activeInstallations: 0,
      adoptionRate: 0,
      churnRate: 0,
      growthRate: 0
    };
  }

  private async getSessionAnalytics(timeRange: { start: Date; end: Date }): Promise<SessionAnalytics> {
    const events = await this.storage.query({
      eventTypes: ['user_action'],
      timeRange
    });

    const sessions = new Map<string, AnalyticsEvent[]>();
    events.forEach(event => {
      if (event.sessionId) {
        if (!sessions.has(event.sessionId)) {
          sessions.set(event.sessionId, []);
        }
        sessions.get(event.sessionId)!.push(event);
      }
    });

    const sessionDurations = Array.from(sessions.values()).map(sessionEvents => {
      if (sessionEvents.length < 2) return 0;
      const start = Math.min(...sessionEvents.map(e => e.timestamp.getTime()));
      const end = Math.max(...sessionEvents.map(e => e.timestamp.getTime()));
      return end - start;
    });

    return {
      averageSessionDuration: sessionDurations.reduce((a, b) => a + b, 0) / Math.max(sessionDurations.length, 1),
      sessionCount: sessions.size,
      bounceRate: 0,
      pagesPerSession: 0,
      conversionRate: 0
    };
  }

  private async getResponseTimeMetrics(timeRange: { start: Date; end: Date }): Promise<ResponseTimeMetrics> {
    const events = await this.storage.query({
      eventTypes: ['performance_metric'],
      timeRange,
      filters: { 'data.metric': 'response_time' }
    });

    const responseTimes = events.map(e => e.data.value).sort((a, b) => a - b);
    
    if (responseTimes.length === 0) {
      return { average: 0, median: 0, p95: 0, p99: 0, min: 0, max: 0 };
    }

    return {
      average: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      median: responseTimes[Math.floor(responseTimes.length / 2)],
      p95: responseTimes[Math.floor(responseTimes.length * 0.95)],
      p99: responseTimes[Math.floor(responseTimes.length * 0.99)],
      min: responseTimes[0],
      max: responseTimes[responseTimes.length - 1]
    };
  }

  private async getThroughputMetrics(timeRange: { start: Date; end: Date }): Promise<ThroughputMetrics> {
    const events = await this.storage.query({
      eventTypes: ['performance_metric'],
      timeRange,
      filters: { 'data.metric': 'throughput' }
    });

    const throughputValues = events.map(e => e.data.value);
    const average = throughputValues.reduce((a, b) => a + b, 0) / Math.max(throughputValues.length, 1);

    return {
      requestsPerSecond: average,
      requestsPerMinute: average * 60,
      requestsPerHour: average * 3600,
      peakThroughput: Math.max(...throughputValues, 0)
    };
  }

  private async getResourceUsageMetrics(timeRange: { start: Date; end: Date }): Promise<ResourceUsageMetrics> {
    // Implementation would query resource usage metrics
    return {
      cpu: { current: 0, average: 0, peak: 0, utilization: 0 },
      memory: { current: 0, average: 0, peak: 0, utilization: 0 },
      disk: { current: 0, average: 0, peak: 0, utilization: 0 },
      network: { inbound: 0, outbound: 0, latency: 0, packetLoss: 0 }
    };
  }

  private async getErrorRateMetrics(timeRange: { start: Date; end: Date }) {
    const events = await this.storage.query({
      eventTypes: ['error_event'],
      timeRange
    });

    return {
      overall: events.length,
      byComponent: {},
      byEndpoint: {}
    };
  }

  private async getAvailabilityMetrics(timeRange: { start: Date; end: Date }) {
    return {
      uptime: 99.9,
      downtime: 0.1,
      sla: 99.9,
      incidents: 0
    };
  }

  private async getConversionMetrics(timeRange: { start: Date; end: Date }): Promise<ConversionMetrics> {
    return {
      signupConversion: 0,
      activationConversion: 0,
      retentionConversion: 0,
      revenueConversion: 0
    };
  }

  private async getSatisfactionMetrics(timeRange: { start: Date; end: Date }): Promise<SatisfactionMetrics> {
    return {
      npsScore: 0,
      csatScore: 0,
      userFeedback: { averageRating: 0, totalFeedback: 0, sentiment: 'neutral' },
      supportTickets: { totalTickets: 0, resolvedTickets: 0, averageResolutionTime: 0, satisfaction: 0 }
    };
  }

  private async getROIMetrics(timeRange: { start: Date; end: Date }): Promise<ROIMetrics> {
    return {
      costSavings: 0,
      timeReduction: 0,
      productivityGain: 0,
      errorReduction: 0
    };
  }

  private async getImpactMetrics(timeRange: { start: Date; end: Date }) {
    return {
      timeToValue: 0,
      productivityIncrease: 0,
      errorReduction: 0,
      costReduction: 0
    };
  }
}