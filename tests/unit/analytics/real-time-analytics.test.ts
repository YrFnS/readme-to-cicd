/**
 * Real-Time Analytics Tests
 * Tests for real-time analytics and streaming data processing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  RealTimeAnalytics, 
  RealTimeAnalyticsConfig, 
  StreamProcessor, 
  MetricAggregator 
} from '../../../src/analytics/real-time-analytics';
import { AnalyticsEvent, AlertSeverity } from '../../../src/analytics/types';

describe('RealTimeAnalytics', () => {
  let realTimeAnalytics: RealTimeAnalytics;
  let mockStreamProcessor: StreamProcessor;
  let mockMetricAggregator: MetricAggregator;
  let config: RealTimeAnalyticsConfig;

  beforeEach(() => {
    mockStreamProcessor = {
      processEvent: vi.fn().mockResolvedValue({
        eventId: 'evt_123',
        processed: true,
        metrics: { event_count: 1 },
        alerts: [],
        errors: []
      }),
      processEventBatch: vi.fn().mockResolvedValue([
        {
          eventId: 'evt_123',
          processed: true,
          metrics: { event_count: 1 },
          alerts: []
        }
      ]),
      createStream: vi.fn().mockResolvedValue(undefined),
      destroyStream: vi.fn().mockResolvedValue(undefined)
    };

    mockMetricAggregator = {
      aggregate: vi.fn().mockResolvedValue({
        aggregationType: 'count',
        value: 100,
        windowStart: new Date(),
        windowEnd: new Date(),
        count: 100
      }),
      getRunningMetrics: vi.fn().mockResolvedValue({
        event_count: 100,
        avg_response_time: 150
      }),
      resetMetrics: vi.fn().mockResolvedValue(undefined)
    };

    config = {
      enableStreamProcessing: true,
      enableRealTimeAlerts: true,
      bufferSize: 1, // Set to 1 for immediate processing in tests
      processingInterval: 1000,
      alertEvaluationInterval: 5000,
      maxConcurrentStreams: 5
    };

    realTimeAnalytics = new RealTimeAnalytics(
      config,
      mockStreamProcessor,
      mockMetricAggregator
    );
  });

  afterEach(async () => {
    await realTimeAnalytics.stop();
  });

  describe('Event Processing', () => {
    it('should process real-time analytics events', async () => {
      const event: AnalyticsEvent = {
        id: 'evt_123',
        timestamp: new Date(),
        type: 'user_action',
        source: 'web_app',
        userId: 'user123',
        data: { action: 'click', button: 'submit' }
      };

      await realTimeAnalytics.processEvent(event);

      // With buffer size 1, should trigger batch processing
      expect(mockStreamProcessor.processEventBatch).toHaveBeenCalledWith([event]);
    });

    it('should emit event received event', async () => {
      const eventSpy = vi.fn();
      realTimeAnalytics.on('eventReceived', eventSpy);

      const event: AnalyticsEvent = {
        id: 'evt_123',
        timestamp: new Date(),
        type: 'user_action',
        source: 'web_app',
        data: {}
      };

      await realTimeAnalytics.processEvent(event);

      expect(eventSpy).toHaveBeenCalledWith(event);
    });

    it('should process critical events immediately', async () => {
      const criticalEvent: AnalyticsEvent = {
        id: 'evt_critical',
        timestamp: new Date(),
        type: 'error_event',
        source: 'api',
        data: { error: 'Database connection failed' }
      };

      await realTimeAnalytics.processEvent(criticalEvent);

      expect(mockStreamProcessor.processEvent).toHaveBeenCalledWith(criticalEvent);
    });

    it('should trigger batch processing when buffer is full', async () => {
      config.bufferSize = 2;
      const analytics = new RealTimeAnalytics(
        config,
        mockStreamProcessor,
        mockMetricAggregator
      );

      const event1: AnalyticsEvent = {
        id: 'evt_1',
        timestamp: new Date(),
        type: 'user_action',
        source: 'web',
        data: {}
      };

      const event2: AnalyticsEvent = {
        id: 'evt_2',
        timestamp: new Date(),
        type: 'user_action',
        source: 'web',
        data: {}
      };

      await analytics.processEvent(event1);
      await analytics.processEvent(event2);

      expect(mockStreamProcessor.processEventBatch).toHaveBeenCalledWith([event1, event2]);
      await analytics.stop();
    });
  });

  describe('Stream Management', () => {
    it('should create analytics stream', async () => {
      const aggregations = [
        {
          type: 'count' as const,
          field: 'userId',
          windowType: 'tumbling' as const,
          windowDuration: 60000,
          groupBy: ['userId']
        }
      ];

      const filters = [
        {
          field: 'type',
          operator: 'eq' as const,
          value: 'user_action'
        }
      ];

      await realTimeAnalytics.createAnalyticsStream(
        'user_activity',
        60000,
        aggregations,
        filters
      );

      expect(mockStreamProcessor.createStream).toHaveBeenCalledWith(
        'user_activity',
        expect.objectContaining({
          windowSize: 60000,
          aggregations,
          filters
        })
      );
    });

    it('should reject stream creation when max streams reached', async () => {
      config.maxConcurrentStreams = 1;
      const analytics = new RealTimeAnalytics(
        config,
        mockStreamProcessor,
        mockMetricAggregator
      );

      await analytics.createAnalyticsStream('stream1', 60000, []);

      await expect(
        analytics.createAnalyticsStream('stream2', 60000, [])
      ).rejects.toThrow('Maximum concurrent streams reached');

      await analytics.stop();
    });

    it('should emit stream created event', async () => {
      const streamSpy = vi.fn();
      realTimeAnalytics.on('streamCreated', streamSpy);

      await realTimeAnalytics.createAnalyticsStream('test_stream', 60000, []);

      expect(streamSpy).toHaveBeenCalledWith({
        streamId: 'test_stream',
        config: expect.objectContaining({
          windowSize: 60000
        })
      });
    });

    it('should create user activity monitoring stream', async () => {
      const streamId = await realTimeAnalytics.createUserActivityStream();

      expect(streamId).toBe('user_activity_monitor');
      expect(mockStreamProcessor.createStream).toHaveBeenCalledWith(
        'user_activity_monitor',
        expect.objectContaining({
          aggregations: expect.arrayContaining([
            expect.objectContaining({
              type: 'count',
              field: 'userId'
            })
          ]),
          filters: expect.arrayContaining([
            expect.objectContaining({
              field: 'type',
              value: 'user_action'
            })
          ])
        })
      );
    });

    it('should create performance monitoring stream', async () => {
      const streamId = await realTimeAnalytics.createPerformanceStream();

      expect(streamId).toBe('performance_monitor');
      expect(mockStreamProcessor.createStream).toHaveBeenCalledWith(
        'performance_monitor',
        expect.objectContaining({
          aggregations: expect.arrayContaining([
            expect.objectContaining({
              type: 'avg',
              field: 'data.value'
            })
          ])
        })
      );
    });

    it('should create error monitoring stream with alerts', async () => {
      const streamId = await realTimeAnalytics.createErrorMonitoringStream();

      expect(streamId).toBe('error_monitor');
      expect(mockStreamProcessor.createStream).toHaveBeenCalledWith(
        'error_monitor',
        expect.objectContaining({
          filters: expect.arrayContaining([
            expect.objectContaining({
              field: 'type',
              value: 'error_event'
            })
          ])
        })
      );
    });

    it('should create business metrics stream', async () => {
      const streamId = await realTimeAnalytics.createBusinessMetricsStream();

      expect(streamId).toBe('business_metrics');
      expect(mockStreamProcessor.createStream).toHaveBeenCalledWith(
        'business_metrics',
        expect.objectContaining({
          aggregations: expect.arrayContaining([
            expect.objectContaining({
              type: 'sum',
              field: 'data.value'
            })
          ])
        })
      );
    });
  });

  describe('Alert Management', () => {
    it('should create real-time alert rule', async () => {
      const condition = {
        metric: 'error_rate',
        operator: 'gt' as const,
        value: 10,
        duration: 60000
      };

      const actions = [
        {
          type: 'webhook' as const,
          configuration: { url: '/alerts/error-rate' }
        }
      ];

      const alertId = await realTimeAnalytics.createRealTimeAlert(
        'High Error Rate',
        condition,
        'critical',
        actions
      );

      expect(alertId).toMatch(/^alert_\d+_[a-z0-9]+$/);
    });

    it('should emit alert rule created event', async () => {
      const alertSpy = vi.fn();
      realTimeAnalytics.on('alertRuleCreated', alertSpy);

      const condition = {
        metric: 'response_time',
        operator: 'gt' as const,
        value: 1000,
        duration: 60000
      };

      await realTimeAnalytics.createRealTimeAlert('Slow Response', condition, 'warning', []);

      expect(alertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Slow Response',
          severity: 'warning'
        })
      );
    });
  });

  describe('Metrics Retrieval', () => {
    it('should get real-time metrics for stream', async () => {
      const metrics = await realTimeAnalytics.getRealTimeMetrics('test_stream');

      expect(mockMetricAggregator.getRunningMetrics).toHaveBeenCalledWith('test_stream');
      expect(metrics).toEqual({
        event_count: 100,
        avg_response_time: 150
      });
    });

    it('should get current system metrics', async () => {
      const metrics = await realTimeAnalytics.getCurrentMetrics();

      expect(metrics).toMatchObject({
        eventRate: expect.any(Number),
        processingLatency: expect.any(Number),
        activeStreams: expect.any(Number),
        alertsTriggered: expect.any(Number),
        bufferSize: expect.any(Number),
        timestamp: expect.any(Date)
      });
    });
  });

  describe('Batch Processing', () => {
    it('should emit batch processed event', async () => {
      const batchSpy = vi.fn();
      realTimeAnalytics.on('batchProcessed', batchSpy);

      const event: AnalyticsEvent = {
        id: 'evt_1',
        timestamp: new Date(),
        type: 'user_action',
        source: 'web',
        data: {}
      };

      await realTimeAnalytics.processEvent(event);

      expect(batchSpy).toHaveBeenCalledWith({
        count: 1,
        results: expect.any(Array)
      });
    });

    it('should handle processing errors gracefully', async () => {
      const error = new Error('Processing failed');
      (mockStreamProcessor.processEventBatch as any).mockRejectedValue(error);

      const errorSpy = vi.fn();
      realTimeAnalytics.on('processingError', errorSpy);

      const event: AnalyticsEvent = {
        id: 'evt_1',
        timestamp: new Date(),
        type: 'user_action',
        source: 'web',
        data: {}
      };

      await realTimeAnalytics.processEvent(event);

      expect(errorSpy).toHaveBeenCalledWith({
        batch: [event],
        error
      });
    });
  });

  describe('Alert Processing', () => {
    it('should handle alert triggers', async () => {
      // First create an alert rule
      const alertId = await realTimeAnalytics.createRealTimeAlert(
        'Test Alert',
        {
          metric: 'error_rate',
          operator: 'gt',
          value: 10,
          duration: 60000
        },
        'critical',
        []
      );

      const alertTrigger = {
        ruleId: alertId,
        ruleName: 'Test Alert',
        severity: 'critical' as AlertSeverity,
        value: 15,
        threshold: 10,
        timestamp: new Date(),
        context: {}
      };

      // Reset the mock and set up the specific response for this test
      vi.clearAllMocks();
      (mockStreamProcessor.processEventBatch as any).mockResolvedValueOnce([{
        eventId: 'evt_critical',
        processed: true,
        metrics: {},
        alerts: [alertTrigger]
      }]);

      const alertSpy = vi.fn();
      realTimeAnalytics.on('alertTriggered', alertSpy);

      const event: AnalyticsEvent = {
        id: 'evt_critical',
        timestamp: new Date(),
        type: 'error_event',
        source: 'api',
        data: {}
      };

      await realTimeAnalytics.processEvent(event);

      expect(alertSpy).toHaveBeenCalledWith(alertTrigger);
    });
  });

  describe('Error Handling', () => {
    it('should handle stream creation errors', async () => {
      const error = new Error('Stream creation failed');
      (mockStreamProcessor.createStream as any).mockRejectedValue(error);

      await expect(
        realTimeAnalytics.createAnalyticsStream('test_stream', 60000, [])
      ).rejects.toThrow('Stream creation failed');
    });

    it('should handle immediate processing errors', async () => {
      const error = new Error('Processing failed');
      (mockStreamProcessor.processEvent as any).mockRejectedValue(error);

      const errorSpy = vi.fn();
      realTimeAnalytics.on('immediateProcessingError', errorSpy);

      const criticalEvent: AnalyticsEvent = {
        id: 'evt_critical',
        timestamp: new Date(),
        type: 'error_event',
        source: 'api',
        data: {}
      };

      await realTimeAnalytics.processEvent(criticalEvent);

      expect(errorSpy).toHaveBeenCalledWith({
        event: criticalEvent,
        error
      });
    });
  });

  describe('Lifecycle', () => {
    it('should stop gracefully', async () => {
      await realTimeAnalytics.createAnalyticsStream('test_stream', 60000, []);

      const stoppedSpy = vi.fn();
      realTimeAnalytics.on('stopped', stoppedSpy);

      await realTimeAnalytics.stop();

      expect(mockStreamProcessor.destroyStream).toHaveBeenCalledWith('test_stream');
      expect(stoppedSpy).toHaveBeenCalled();
    });

    it('should process remaining events on stop', async () => {
      const event: AnalyticsEvent = {
        id: 'evt_1',
        timestamp: new Date(),
        type: 'user_action',
        source: 'web',
        data: {}
      };

      await realTimeAnalytics.processEvent(event);
      await realTimeAnalytics.stop();

      expect(mockStreamProcessor.processEventBatch).toHaveBeenCalled();
    });
  });
});