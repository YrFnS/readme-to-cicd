/**
 * Real-Time Analytics
 * Real-time analytics with streaming data processing and alerting
 */

import { EventEmitter } from 'events';
import {
  AnalyticsEvent,
  AlertRule,
  AlertSeverity,
  AlertCondition,
  AlertAction
} from './types';

export interface RealTimeAnalyticsConfig {
  enableStreamProcessing: boolean;
  enableRealTimeAlerts: boolean;
  bufferSize: number;
  processingInterval: number;
  alertEvaluationInterval: number;
  maxConcurrentStreams: number;
}

export interface StreamProcessor {
  processEvent(event: AnalyticsEvent): Promise<ProcessingResult>;
  processEventBatch(events: AnalyticsEvent[]): Promise<ProcessingResult[]>;
  createStream(streamId: string, config: StreamConfig): Promise<void>;
  destroyStream(streamId: string): Promise<void>;
}

export interface ProcessingResult {
  eventId: string;
  processed: boolean;
  metrics: Record<string, number>;
  alerts?: AlertTrigger[];
  errors?: string[];
}

export interface StreamConfig {
  windowSize: number;
  aggregations: StreamAggregation[];
  filters: StreamFilter[];
  outputs: StreamOutput[];
}

export interface StreamAggregation {
  type: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'percentile';
  field: string;
  windowType: 'tumbling' | 'sliding' | 'session';
  windowDuration: number;
  groupBy?: string[];
}

export interface StreamFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
  value: any;
}

export interface StreamOutput {
  type: 'webhook' | 'database' | 'queue' | 'file';
  configuration: Record<string, any>;
}

export interface AlertTrigger {
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  value: number;
  threshold: number;
  timestamp: Date;
  context: Record<string, any>;
}

export interface MetricAggregator {
  aggregate(events: AnalyticsEvent[], aggregation: StreamAggregation): Promise<AggregationResult>;
  getRunningMetrics(streamId: string): Promise<Record<string, number>>;
  resetMetrics(streamId: string): Promise<void>;
}

export interface AggregationResult {
  aggregationType: string;
  value: number;
  windowStart: Date;
  windowEnd: Date;
  count: number;
}

export class RealTimeAnalytics extends EventEmitter {
  private config: RealTimeAnalyticsConfig;
  private streamProcessor: StreamProcessor;
  private metricAggregator: MetricAggregator;
  private eventBuffer: AnalyticsEvent[] = [];
  private activeStreams: Map<string, StreamConfig> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private processingTimer?: NodeJS.Timeout;
  private alertTimer?: NodeJS.Timeout;
  private runningMetrics: Map<string, Record<string, number>> = new Map();

  constructor(
    config: RealTimeAnalyticsConfig,
    streamProcessor: StreamProcessor,
    metricAggregator: MetricAggregator
  ) {
    super();
    this.config = config;
    this.streamProcessor = streamProcessor;
    this.metricAggregator = metricAggregator;

    if (this.config.enableStreamProcessing) {
      this.startStreamProcessing();
    }

    if (this.config.enableRealTimeAlerts) {
      this.startAlertEvaluation();
    }
  }

  /**
   * Process real-time analytics event
   */
  async processEvent(event: AnalyticsEvent): Promise<void> {
    this.eventBuffer.push(event);
    
    // Immediate processing for critical events
    if (this.isCriticalEvent(event)) {
      await this.processEventImmediate(event);
    }

    // Trigger processing if buffer is full
    if (this.eventBuffer.length >= this.config.bufferSize) {
      await this.processBatch();
    }

    this.emit('eventReceived', event);
  }

  /**
   * Create a real-time analytics stream
   */
  async createAnalyticsStream(
    streamId: string,
    windowSize: number,
    aggregations: StreamAggregation[],
    filters?: StreamFilter[],
    outputs?: StreamOutput[]
  ): Promise<void> {
    if (this.activeStreams.size >= this.config.maxConcurrentStreams) {
      throw new Error('Maximum concurrent streams reached');
    }

    const streamConfig: StreamConfig = {
      windowSize,
      aggregations,
      filters: filters || [],
      outputs: outputs || []
    };

    await this.streamProcessor.createStream(streamId, streamConfig);
    this.activeStreams.set(streamId, streamConfig);
    this.runningMetrics.set(streamId, {});

    this.emit('streamCreated', { streamId, config: streamConfig });
  }

  /**
   * Create real-time alert rule
   */
  async createRealTimeAlert(
    name: string,
    condition: AlertCondition,
    severity: AlertSeverity,
    actions: AlertAction[]
  ): Promise<string> {
    const alertId = this.generateAlertId();
    const alertRule: AlertRule = {
      id: alertId,
      name,
      condition,
      threshold: condition.value,
      severity,
      actions,
      enabled: true
    };

    this.alertRules.set(alertId, alertRule);
    this.emit('alertRuleCreated', alertRule);
    
    return alertId;
  }

  /**
   * Get real-time metrics for a stream
   */
  async getRealTimeMetrics(streamId: string): Promise<Record<string, number>> {
    return this.metricAggregator.getRunningMetrics(streamId);
  }

  /**
   * Get current system metrics
   */
  async getCurrentMetrics(): Promise<SystemMetrics> {
    const eventRate = this.calculateEventRate();
    const processingLatency = this.calculateProcessingLatency();
    const activeStreamsCount = this.activeStreams.size;
    const alertsTriggered = await this.getRecentAlertsCount();

    return {
      eventRate,
      processingLatency,
      activeStreams: activeStreamsCount,
      alertsTriggered,
      bufferSize: this.eventBuffer.length,
      timestamp: new Date()
    };
  }

  /**
   * Create user activity monitoring stream
   */
  async createUserActivityStream(): Promise<string> {
    const streamId = 'user_activity_monitor';
    
    const aggregations: StreamAggregation[] = [
      {
        type: 'count',
        field: 'userId',
        windowType: 'tumbling',
        windowDuration: 60000, // 1 minute
        groupBy: ['userId']
      },
      {
        type: 'count',
        field: 'type',
        windowType: 'sliding',
        windowDuration: 300000, // 5 minutes
        groupBy: ['type']
      }
    ];

    const filters: StreamFilter[] = [
      {
        field: 'type',
        operator: 'eq',
        value: 'user_action'
      }
    ];

    await this.createAnalyticsStream(streamId, 60000, aggregations, filters);
    return streamId;
  }

  /**
   * Create performance monitoring stream
   */
  async createPerformanceStream(): Promise<string> {
    const streamId = 'performance_monitor';
    
    const aggregations: StreamAggregation[] = [
      {
        type: 'avg',
        field: 'data.value',
        windowType: 'sliding',
        windowDuration: 300000, // 5 minutes
        groupBy: ['source']
      },
      {
        type: 'max',
        field: 'data.value',
        windowType: 'tumbling',
        windowDuration: 60000, // 1 minute
        groupBy: ['data.metric']
      },
      {
        type: 'percentile',
        field: 'data.value',
        windowType: 'sliding',
        windowDuration: 600000, // 10 minutes
        groupBy: ['data.metric']
      }
    ];

    const filters: StreamFilter[] = [
      {
        field: 'type',
        operator: 'eq',
        value: 'performance_metric'
      }
    ];

    await this.createAnalyticsStream(streamId, 60000, aggregations, filters);
    return streamId;
  }

  /**
   * Create error monitoring stream
   */
  async createErrorMonitoringStream(): Promise<string> {
    const streamId = 'error_monitor';
    
    const aggregations: StreamAggregation[] = [
      {
        type: 'count',
        field: 'type',
        windowType: 'tumbling',
        windowDuration: 60000, // 1 minute
        groupBy: ['source']
      },
      {
        type: 'count',
        field: 'data.errorType',
        windowType: 'sliding',
        windowDuration: 300000, // 5 minutes
        groupBy: ['data.errorType']
      }
    ];

    const filters: StreamFilter[] = [
      {
        field: 'type',
        operator: 'eq',
        value: 'error_event'
      }
    ];

    await this.createAnalyticsStream(streamId, 60000, aggregations, filters);
    
    // Create alert for high error rates
    await this.createRealTimeAlert(
      'High Error Rate',
      {
        metric: 'error_count',
        operator: 'gt',
        value: 10,
        duration: 60000
      },
      'critical',
      [
        {
          type: 'webhook',
          configuration: { url: '/alerts/error-rate' }
        }
      ]
    );

    return streamId;
  }

  /**
   * Create business metrics stream
   */
  async createBusinessMetricsStream(): Promise<string> {
    const streamId = 'business_metrics';
    
    const aggregations: StreamAggregation[] = [
      {
        type: 'sum',
        field: 'data.value',
        windowType: 'tumbling',
        windowDuration: 3600000, // 1 hour
        groupBy: ['data.metric']
      },
      {
        type: 'avg',
        field: 'data.value',
        windowType: 'sliding',
        windowDuration: 86400000, // 24 hours
        groupBy: ['data.category']
      }
    ];

    const filters: StreamFilter[] = [
      {
        field: 'type',
        operator: 'eq',
        value: 'business_metric'
      }
    ];

    await this.createAnalyticsStream(streamId, 3600000, aggregations, filters);
    return streamId;
  }

  /**
   * Stop real-time analytics
   */
  async stop(): Promise<void> {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
    }
    
    if (this.alertTimer) {
      clearInterval(this.alertTimer);
    }

    // Process remaining events
    if (this.eventBuffer.length > 0) {
      await this.processBatch();
    }

    // Destroy all streams
    for (const streamId of this.activeStreams.keys()) {
      await this.streamProcessor.destroyStream(streamId);
    }

    this.emit('stopped');
  }

  private startStreamProcessing(): void {
    this.processingTimer = setInterval(async () => {
      if (this.eventBuffer.length > 0) {
        await this.processBatch();
      }
    }, this.config.processingInterval);
  }

  private startAlertEvaluation(): void {
    this.alertTimer = setInterval(async () => {
      await this.evaluateAlerts();
    }, this.config.alertEvaluationInterval);
  }

  private async processBatch(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const batch = this.eventBuffer.splice(0, this.config.bufferSize);
    
    try {
      const results = await this.streamProcessor.processEventBatch(batch);
      
      // Update running metrics
      for (const result of results) {
        await this.updateRunningMetrics(result);
      }

      // Check for alert triggers
      const alertTriggers = results.flatMap(r => r.alerts || []);
      for (const trigger of alertTriggers) {
        await this.handleAlertTrigger(trigger);
      }

      this.emit('batchProcessed', { count: batch.length, results });
    } catch (error) {
      this.emit('processingError', { batch, error });
      // Re-add events to buffer for retry
      this.eventBuffer.unshift(...batch);
    }
  }

  private async processEventImmediate(event: AnalyticsEvent): Promise<void> {
    try {
      const result = await this.streamProcessor.processEvent(event);
      await this.updateRunningMetrics(result);
      
      if (result.alerts) {
        for (const trigger of result.alerts) {
          await this.handleAlertTrigger(trigger);
        }
      }
    } catch (error) {
      this.emit('immediateProcessingError', { event, error });
    }
  }

  private async updateRunningMetrics(result: ProcessingResult): Promise<void> {
    for (const [streamId, metrics] of this.runningMetrics) {
      const updatedMetrics = { ...metrics, ...result.metrics };
      this.runningMetrics.set(streamId, updatedMetrics);
    }
  }

  private async evaluateAlerts(): Promise<void> {
    for (const [alertId, rule] of this.alertRules) {
      if (!rule.enabled) continue;

      try {
        const shouldTrigger = await this.shouldTriggerAlert(rule);
        if (shouldTrigger) {
          const trigger: AlertTrigger = {
            ruleId: alertId,
            ruleName: rule.name,
            severity: rule.severity,
            value: 0, // Would be calculated based on current metrics
            threshold: rule.threshold,
            timestamp: new Date(),
            context: {}
          };
          
          await this.handleAlertTrigger(trigger);
        }
      } catch (error) {
        this.emit('alertEvaluationError', { alertId, error });
      }
    }
  }

  private async shouldTriggerAlert(rule: AlertRule): Promise<boolean> {
    // Implementation would check current metrics against rule conditions
    // For now, returning false as placeholder
    return false;
  }

  private async handleAlertTrigger(trigger: AlertTrigger): Promise<void> {
    const rule = this.alertRules.get(trigger.ruleId);
    if (!rule) return;

    // Execute alert actions
    for (const action of rule.actions) {
      try {
        await this.executeAlertAction(action, trigger);
      } catch (error) {
        this.emit('alertActionError', { action, trigger, error });
      }
    }

    this.emit('alertTriggered', trigger);
  }

  private async executeAlertAction(action: AlertAction, trigger: AlertTrigger): Promise<void> {
    switch (action.type) {
      case 'webhook':
        // Send webhook notification
        break;
      case 'email':
        // Send email notification
        break;
      case 'slack':
        // Send Slack notification
        break;
      case 'sms':
        // Send SMS notification
        break;
    }
  }

  private isCriticalEvent(event: AnalyticsEvent): boolean {
    return event.type === 'error_event' || 
           (event.type === 'performance_metric' && event.data.metric === 'response_time' && event.data.value > 5000);
  }

  private calculateEventRate(): number {
    // Calculate events per second based on recent activity
    return this.eventBuffer.length / 60; // Simplified calculation
  }

  private calculateProcessingLatency(): number {
    // Calculate average processing latency
    return 50; // Placeholder value in milliseconds
  }

  private async getRecentAlertsCount(): Promise<number> {
    // Count alerts triggered in the last hour
    return 0; // Placeholder
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export interface SystemMetrics {
  eventRate: number;
  processingLatency: number;
  activeStreams: number;
  alertsTriggered: number;
  bufferSize: number;
  timestamp: Date;
}