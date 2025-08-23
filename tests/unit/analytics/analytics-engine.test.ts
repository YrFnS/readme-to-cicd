/**
 * Analytics Engine Tests
 * Comprehensive tests for analytics accuracy and functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AnalyticsEngine, AnalyticsEngineConfig, AnalyticsStorage, AnalyticsQuery, AnalyticsAggregation } from '../../../src/analytics/analytics-engine';
import { AnalyticsEvent } from '../../../src/analytics/types';

describe('AnalyticsEngine', () => {
  let analyticsEngine: AnalyticsEngine;
  let mockStorage: AnalyticsStorage;
  let config: AnalyticsEngineConfig;

  beforeEach(() => {
    mockStorage = {
      store: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue([]),
      aggregate: vi.fn().mockResolvedValue({}),
      cleanup: vi.fn().mockResolvedValue(undefined)
    };

    config = {
      enableUsageTracking: true,
      enablePerformanceTracking: true,
      enableBusinessTracking: true,
      batchSize: 1, // Set to 1 for immediate storage in tests
      flushInterval: 1000,
      retentionDays: 30,
      anonymizeData: false
    };

    analyticsEngine = new AnalyticsEngine(config, mockStorage);
  });

  afterEach(async () => {
    await analyticsEngine.stop();
  });

  describe('Event Tracking', () => {
    it('should track analytics events', async () => {
      const eventData = {
        type: 'user_action' as const,
        source: 'test',
        data: { action: 'click', button: 'submit' }
      };

      await analyticsEngine.trackEvent(eventData);

      expect(mockStorage.store).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'user_action',
            source: 'test',
            data: { action: 'click', button: 'submit' }
          })
        ])
      );
    });

    it('should generate unique event IDs', async () => {
      const events: AnalyticsEvent[] = [];
      
      analyticsEngine.on('event', (event: AnalyticsEvent) => {
        events.push(event);
      });

      await analyticsEngine.trackEvent({
        type: 'user_action',
        source: 'test1',
        data: {}
      });

      await analyticsEngine.trackEvent({
        type: 'user_action',
        source: 'test2',
        data: {}
      });

      expect(events).toHaveLength(2);
      expect(events[0].id).not.toBe(events[1].id);
      expect(events[0].id).toMatch(/^evt_\d+_[a-z0-9]+$/);
    });

    it('should add timestamps to events', async () => {
      const beforeTime = new Date();
      
      await analyticsEngine.trackEvent({
        type: 'user_action',
        source: 'test',
        data: {}
      });

      const afterTime = new Date();

      expect(mockStorage.store).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            timestamp: expect.any(Date)
          })
        ])
      );

      const storedEvent = (mockStorage.store as any).mock.calls[0][0][0];
      expect(storedEvent.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(storedEvent.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should anonymize user IDs when enabled', async () => {
      config.anonymizeData = true;
      const engine = new AnalyticsEngine(config, mockStorage);

      await engine.trackEvent({
        type: 'user_action',
        source: 'test',
        userId: 'user123',
        data: {}
      });

      expect(mockStorage.store).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            userId: expect.stringMatching(/^anon_[a-z0-9]+$/)
          })
        ])
      );

      await engine.stop();
    });
  });

  describe('User Interaction Tracking', () => {
    it('should track user interactions when enabled', async () => {
      await analyticsEngine.trackUserInteraction('click', 'user123', 'session456', { button: 'submit' });

      expect(mockStorage.store).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'user_action',
            source: 'user_interaction',
            userId: 'user123',
            sessionId: 'session456',
            data: {
              action: 'click',
              button: 'submit'
            }
          })
        ])
      );
    });

    it('should not track user interactions when disabled', async () => {
      config.enableUsageTracking = false;
      const engine = new AnalyticsEngine(config, mockStorage);

      await engine.trackUserInteraction('click', 'user123');

      expect(mockStorage.store).not.toHaveBeenCalled();
      await engine.stop();
    });
  });

  describe('Feature Usage Tracking', () => {
    it('should track feature usage', async () => {
      await analyticsEngine.trackFeatureUsage('readme-parser', 'user123', 'session456', { version: '1.0' });

      expect(mockStorage.store).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'user_action',
            source: 'feature_usage',
            data: {
              feature: 'readme-parser',
              version: '1.0'
            }
          })
        ])
      );
    });
  });

  describe('Performance Tracking', () => {
    it('should track performance metrics', async () => {
      await analyticsEngine.trackPerformance('response_time', 150, 'api-gateway', { endpoint: '/parse' });

      expect(mockStorage.store).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'performance_metric',
            source: 'api-gateway',
            data: {
              metric: 'response_time',
              value: 150,
              endpoint: '/parse'
            }
          })
        ])
      );
    });

    it('should not track performance when disabled', async () => {
      config.enablePerformanceTracking = false;
      const engine = new AnalyticsEngine(config, mockStorage);

      await engine.trackPerformance('response_time', 150, 'api-gateway');

      expect(mockStorage.store).not.toHaveBeenCalled();
      await engine.stop();
    });
  });

  describe('Business Metrics Tracking', () => {
    it('should track business metrics', async () => {
      await analyticsEngine.trackBusinessMetric('conversion_rate', 0.15, 'signup', { campaign: 'summer2024' });

      expect(mockStorage.store).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'business_metric',
            source: 'signup',
            data: {
              metric: 'conversion_rate',
              value: 0.15,
              campaign: 'summer2024'
            }
          })
        ])
      );
    });
  });

  describe('Batch Processing', () => {
    it('should flush events when batch size is reached', async () => {
      config.batchSize = 2;
      const engine = new AnalyticsEngine(config, mockStorage);

      await engine.trackEvent({ type: 'user_action', source: 'test1', data: {} });
      expect(mockStorage.store).not.toHaveBeenCalled();

      await engine.trackEvent({ type: 'user_action', source: 'test2', data: {} });
      expect(mockStorage.store).toHaveBeenCalledTimes(1);
      expect(mockStorage.store).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ source: 'test1' }),
        expect.objectContaining({ source: 'test2' })
      ]));

      await engine.stop();
    });

    it('should flush events manually', async () => {
      // Use a larger batch size for this test to prevent automatic flushing
      const largerBatchConfig = { ...config, batchSize: 10 };
      const engine = new AnalyticsEngine(largerBatchConfig, mockStorage);
      
      await engine.trackEvent({ type: 'user_action', source: 'test', data: {} });
      expect(mockStorage.store).not.toHaveBeenCalled();

      await engine.flush();
      expect(mockStorage.store).toHaveBeenCalledTimes(1);
      
      await engine.stop();
    });

    it('should emit flush event with count', async () => {
      // Use a larger batch size for this test to prevent automatic flushing
      const largerBatchConfig = { ...config, batchSize: 10 };
      const engine = new AnalyticsEngine(largerBatchConfig, mockStorage);
      
      const flushSpy = vi.fn();
      engine.on('flush', flushSpy);

      await engine.trackEvent({ type: 'user_action', source: 'test1', data: {} });
      await engine.trackEvent({ type: 'user_action', source: 'test2', data: {} });
      await engine.flush();

      expect(flushSpy).toHaveBeenCalledWith(2);
      
      await engine.stop();
    });
  });

  describe('Analytics Retrieval', () => {
    it('should get usage analytics', async () => {
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };

      const mockEvents: AnalyticsEvent[] = [
        {
          id: 'evt1',
          timestamp: new Date('2024-01-15'),
          type: 'user_action',
          source: 'user_interaction',
          userId: 'user1',
          sessionId: 'session1',
          data: { action: 'click' }
        },
        {
          id: 'evt2',
          timestamp: new Date('2024-01-16'),
          type: 'user_action',
          source: 'feature_usage',
          userId: 'user2',
          sessionId: 'session2',
          data: { feature: 'parser' }
        }
      ];

      (mockStorage.query as any).mockResolvedValue(mockEvents);

      const analytics = await analyticsEngine.getUsageAnalytics(timeRange);

      expect(analytics).toHaveProperty('userInteractions');
      expect(analytics).toHaveProperty('featureUsage');
      expect(analytics).toHaveProperty('systemAdoption');
      expect(analytics).toHaveProperty('sessionAnalytics');
      expect(analytics.userInteractions.totalUsers).toBe(2);
    });

    it('should get performance analytics', async () => {
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };

      const mockEvents: AnalyticsEvent[] = [
        {
          id: 'evt1',
          timestamp: new Date('2024-01-15'),
          type: 'performance_metric',
          source: 'api',
          data: { metric: 'response_time', value: 100 }
        },
        {
          id: 'evt2',
          timestamp: new Date('2024-01-16'),
          type: 'performance_metric',
          source: 'api',
          data: { metric: 'response_time', value: 200 }
        }
      ];

      (mockStorage.query as any).mockResolvedValue(mockEvents);

      const analytics = await analyticsEngine.getPerformanceAnalytics(timeRange);

      expect(analytics).toHaveProperty('responseTime');
      expect(analytics).toHaveProperty('throughput');
      expect(analytics).toHaveProperty('resourceUsage');
      expect(analytics.responseTime.average).toBe(150);
      expect(analytics.responseTime.min).toBe(100);
      expect(analytics.responseTime.max).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      const error = new Error('Storage error');
      (mockStorage.store as any).mockRejectedValue(error);

      const errorSpy = vi.fn();
      analyticsEngine.on('error', errorSpy);

      await analyticsEngine.trackEvent({ type: 'user_action', source: 'test', data: {} });
      await analyticsEngine.flush();

      expect(errorSpy).toHaveBeenCalledWith(error);
    });

    it('should retry failed events', async () => {
      const error = new Error('Storage error');
      (mockStorage.store as any)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(undefined);

      const errorSpy = vi.fn();
      analyticsEngine.on('error', errorSpy);

      await analyticsEngine.trackEvent({ type: 'user_action', source: 'test', data: {} });
      
      // First call should fail and emit error
      expect(errorSpy).toHaveBeenCalledWith(error);

      // Should retry on next flush
      await analyticsEngine.flush();

      expect(mockStorage.store).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup old data', async () => {
      await analyticsEngine.cleanup();

      expect(mockStorage.cleanup).toHaveBeenCalledWith(
        expect.any(Date)
      );

      const cutoffDate = (mockStorage.cleanup as any).mock.calls[0][0];
      const expectedCutoff = new Date();
      expectedCutoff.setDate(expectedCutoff.getDate() - config.retentionDays);
      
      expect(cutoffDate.getTime()).toBeCloseTo(expectedCutoff.getTime(), -2);
    });

    it('should emit cleanup event', async () => {
      const cleanupSpy = vi.fn();
      analyticsEngine.on('cleanup', cleanupSpy);

      await analyticsEngine.cleanup();

      expect(cleanupSpy).toHaveBeenCalledWith(expect.any(Date));
    });
  });

  describe('Lifecycle', () => {
    it('should stop gracefully', async () => {
      await analyticsEngine.trackEvent({ type: 'user_action', source: 'test', data: {} });
      
      await analyticsEngine.stop();

      // Should flush remaining events
      expect(mockStorage.store).toHaveBeenCalledTimes(1);
    });
  });
});