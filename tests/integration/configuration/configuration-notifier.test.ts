/**
 * Configuration Notifier Tests
 * 
 * Tests for the configuration change notification system including
 * multiple notification channels, filtering, and retry mechanisms.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigurationNotifier } from '../../../src/integration/configuration/notification/configuration-notifier.js';
import {
  ConfigurationChange,
  ConfigurationNotification,
  NotificationChannel,
  NotificationFilter
} from '../../../src/integration/configuration/types/configuration-types.js';

// Mock fetch for webhook tests
global.fetch = vi.fn();

describe('ConfigurationNotifier', () => {
  let notifier: ConfigurationNotifier;

  beforeEach(() => {
    notifier = new ConfigurationNotifier();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any event listeners
    notifier.removeAllListeners();
  });

  describe('Channel Management', () => {
    it('should add notification channels', async () => {
      const channel: NotificationChannel = {
        id: 'test-webhook',
        type: 'webhook',
        settings: {
          url: 'https://example.com/webhook',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000,
          retries: 3
        },
        filters: []
      };

      await notifier.addChannel(channel);

      const channels = notifier.getChannels();
      expect(channels).toHaveLength(1);
      expect(channels[0].id).toBe('test-webhook');
    });

    it('should remove notification channels', async () => {
      const channel: NotificationChannel = {
        id: 'removable-channel',
        type: 'webhook',
        settings: {
          url: 'https://example.com/webhook',
          method: 'POST',
          headers: {},
          timeout: 5000,
          retries: 3
        },
        filters: []
      };

      await notifier.addChannel(channel);
      expect(notifier.getChannels()).toHaveLength(1);

      await notifier.removeChannel('removable-channel');
      expect(notifier.getChannels()).toHaveLength(0);
    });

    it('should update notification channels', async () => {
      const channel: NotificationChannel = {
        id: 'updatable-channel',
        type: 'webhook',
        settings: {
          url: 'https://example.com/webhook',
          method: 'POST',
          headers: {},
          timeout: 5000,
          retries: 3
        },
        filters: []
      };

      await notifier.addChannel(channel);

      const updates = {
        settings: {
          ...channel.settings,
          url: 'https://updated.example.com/webhook'
        }
      };

      await notifier.updateChannel('updatable-channel', updates);

      const updatedChannel = notifier.getChannel('updatable-channel');
      expect(updatedChannel!.settings.url).toBe('https://updated.example.com/webhook');
    });

    it('should validate channel configurations', async () => {
      const invalidChannel: NotificationChannel = {
        id: 'invalid-webhook',
        type: 'webhook',
        settings: {
          url: 'invalid-url', // Invalid URL
          method: 'POST',
          headers: {},
          timeout: 5000,
          retries: 3
        },
        filters: []
      };

      await expect(notifier.addChannel(invalidChannel)).rejects.toThrow('Invalid webhook URL format');
    });
  });

  describe('Notification Filtering', () => {
    it('should filter notifications by key pattern', async () => {
      const channel: NotificationChannel = {
        id: 'filtered-channel',
        type: 'webhook',
        settings: {
          url: 'https://example.com/webhook',
          method: 'POST',
          headers: {},
          timeout: 5000,
          retries: 3
        },
        filters: [
          {
            type: 'key-pattern',
            pattern: '^system\\.',
            include: true
          }
        ]
      };

      await notifier.addChannel(channel);

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }));

      // Notification that should match the filter
      const matchingChange: ConfigurationChange = {
        key: 'system.name',
        oldValue: 'old-name',
        newValue: 'new-name',
        environment: 'test',
        timestamp: new Date(),
        source: 'test'
      };

      await notifier.notifyChange(matchingChange);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Reset mock
      mockFetch.mockClear();

      // Notification that should not match the filter
      const nonMatchingChange: ConfigurationChange = {
        key: 'components.app.replicas',
        oldValue: 1,
        newValue: 3,
        environment: 'test',
        timestamp: new Date(),
        source: 'test'
      };

      await notifier.notifyChange(nonMatchingChange);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should filter notifications by environment', async () => {
      const channel: NotificationChannel = {
        id: 'env-filtered-channel',
        type: 'webhook',
        settings: {
          url: 'https://example.com/webhook',
          method: 'POST',
          headers: {},
          timeout: 5000,
          retries: 3
        },
        filters: [
          {
            type: 'environment',
            pattern: 'production',
            include: true
          }
        ]
      };

      await notifier.addChannel(channel);

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }));

      // Production change (should be sent)
      const prodChange: ConfigurationChange = {
        key: 'system.name',
        oldValue: 'old-name',
        newValue: 'new-name',
        environment: 'production',
        timestamp: new Date(),
        source: 'test'
      };

      await notifier.notifyChange(prodChange);
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(mockFetch).toHaveBeenCalledTimes(1);

      mockFetch.mockClear();

      // Development change (should not be sent)
      const devChange: ConfigurationChange = {
        key: 'system.name',
        oldValue: 'old-name',
        newValue: 'new-name',
        environment: 'development',
        timestamp: new Date(),
        source: 'test'
      };

      await notifier.notifyChange(devChange);
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Webhook Notifications', () => {
    it('should send webhook notifications', async () => {
      const channel: NotificationChannel = {
        id: 'webhook-channel',
        type: 'webhook',
        settings: {
          url: 'https://example.com/webhook',
          method: 'POST',
          headers: { 'Authorization': 'Bearer token123' },
          timeout: 5000,
          retries: 3
        },
        filters: []
      };

      await notifier.addChannel(channel);

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }));

      const change: ConfigurationChange = {
        key: 'system.name',
        oldValue: 'old-name',
        newValue: 'new-name',
        environment: 'test',
        timestamp: new Date(),
        source: 'test'
      };

      await notifier.notifyChange(change);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token123'
          }),
          body: expect.stringContaining('"key":"system.name"')
        })
      );
    });

    it('should retry failed webhook notifications', async () => {
      const channel: NotificationChannel = {
        id: 'retry-webhook',
        type: 'webhook',
        settings: {
          url: 'https://example.com/webhook',
          method: 'POST',
          headers: {},
          timeout: 5000,
          retries: 3
        },
        filters: []
      };

      await notifier.addChannel(channel);

      const mockFetch = vi.mocked(fetch);
      // First call fails, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(new Response('OK', { status: 200 }));

      const change: ConfigurationChange = {
        key: 'system.name',
        oldValue: 'old-name',
        newValue: 'new-name',
        environment: 'test',
        timestamp: new Date(),
        source: 'test'
      };

      await notifier.notifyChange(change);

      // Wait for retry processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should emit failure events after max retries', async () => {
      const channel: NotificationChannel = {
        id: 'failing-webhook',
        type: 'webhook',
        settings: {
          url: 'https://example.com/webhook',
          method: 'POST',
          headers: {},
          timeout: 5000,
          retries: 2
        },
        filters: []
      };

      await notifier.addChannel(channel);

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockRejectedValue(new Error('Persistent network error'));

      let failureEvent: any = null;
      notifier.on('notificationFailed', (event) => {
        failureEvent = event;
      });

      const change: ConfigurationChange = {
        key: 'system.name',
        oldValue: 'old-name',
        newValue: 'new-name',
        environment: 'test',
        timestamp: new Date(),
        source: 'test'
      };

      await notifier.notifyChange(change);

      // Wait for all retries to complete
      await new Promise(resolve => setTimeout(resolve, 5000));

      expect(failureEvent).not.toBeNull();
      expect(failureEvent.channel.id).toBe('failing-webhook');
    });
  });

  describe('Slack Notifications', () => {
    it('should send Slack notifications', async () => {
      const channel: NotificationChannel = {
        id: 'slack-channel',
        type: 'slack',
        settings: {
          webhookUrl: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
          channel: '#alerts',
          username: 'Config Bot',
          iconEmoji: ':gear:'
        },
        filters: []
      };

      await notifier.addChannel(channel);

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue(new Response('ok', { status: 200 }));

      const change: ConfigurationChange = {
        key: 'system.name',
        oldValue: 'old-name',
        newValue: 'new-name',
        environment: 'production',
        timestamp: new Date(),
        source: 'test'
      };

      await notifier.notifyChange(change);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(mockFetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"channel":"#alerts"')
        })
      );

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1]!.body as string);
      expect(body.username).toBe('Config Bot');
      expect(body.icon_emoji).toBe(':gear:');
      expect(body.attachments[0].fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ title: 'Key', value: 'system.name' }),
          expect.objectContaining({ title: 'Environment', value: 'production' })
        ])
      );
    });
  });

  describe('Teams Notifications', () => {
    it('should send Microsoft Teams notifications', async () => {
      const channel: NotificationChannel = {
        id: 'teams-channel',
        type: 'teams',
        settings: {
          webhookUrl: 'https://outlook.office.com/webhook/xxx',
          title: 'Configuration Alert',
          themeColor: 'FF6B35'
        },
        filters: []
      };

      await notifier.addChannel(channel);

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue(new Response('1', { status: 200 }));

      const change: ConfigurationChange = {
        key: 'system.replicas',
        oldValue: 1,
        newValue: 3,
        environment: 'production',
        timestamp: new Date(),
        source: 'test'
      };

      await notifier.notifyChange(change);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(mockFetch).toHaveBeenCalledWith(
        'https://outlook.office.com/webhook/xxx',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1]!.body as string);
      expect(body['@type']).toBe('MessageCard');
      expect(body.themeColor).toBe('FF6B35');
      expect(body.sections[0].activityTitle).toBe('Configuration Alert');
    });
  });

  describe('Direct Notifications', () => {
    it('should send direct notifications', async () => {
      const channel: NotificationChannel = {
        id: 'direct-channel',
        type: 'webhook',
        settings: {
          url: 'https://example.com/webhook',
          method: 'POST',
          headers: {},
          timeout: 5000,
          retries: 3
        },
        filters: []
      };

      await notifier.addChannel(channel);

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }));

      const notification: ConfigurationNotification = {
        type: 'validation-error',
        key: 'system.config',
        environment: 'production',
        message: 'Configuration validation failed',
        timestamp: new Date(),
        metadata: { error: 'Invalid value' }
      };

      await notifier.notify(notification);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Channel Testing', () => {
    it('should test notification channels', async () => {
      const channel: NotificationChannel = {
        id: 'test-channel',
        type: 'webhook',
        settings: {
          url: 'https://example.com/webhook',
          method: 'POST',
          headers: {},
          timeout: 5000,
          retries: 3
        },
        filters: []
      };

      await notifier.addChannel(channel);

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }));

      await notifier.testChannel('test-channel');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"message":"This is a test notification"')
        })
      );
    });

    it('should throw error when testing non-existent channel', async () => {
      await expect(
        notifier.testChannel('non-existent-channel')
      ).rejects.toThrow('not found');
    });
  });

  describe('Event Handling', () => {
    it('should emit events for successful notifications', async () => {
      const channel: NotificationChannel = {
        id: 'event-channel',
        type: 'webhook',
        settings: {
          url: 'https://example.com/webhook',
          method: 'POST',
          headers: {},
          timeout: 5000,
          retries: 3
        },
        filters: []
      };

      await notifier.addChannel(channel);

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }));

      let sentEvent: any = null;
      notifier.on('notificationSent', (event) => {
        sentEvent = event;
      });

      const change: ConfigurationChange = {
        key: 'system.name',
        oldValue: 'old-name',
        newValue: 'new-name',
        environment: 'test',
        timestamp: new Date(),
        source: 'test'
      };

      await notifier.notifyChange(change);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(sentEvent).not.toBeNull();
      expect(sentEvent.channel.id).toBe('event-channel');
      expect(sentEvent.notification.key).toBe('system.name');
    });

    it('should emit events for channel management', async () => {
      let addedEvent: any = null;
      let removedEvent: any = null;

      notifier.on('channelAdded', (event) => {
        addedEvent = event;
      });

      notifier.on('channelRemoved', (event) => {
        removedEvent = event;
      });

      const channel: NotificationChannel = {
        id: 'event-test-channel',
        type: 'webhook',
        settings: {
          url: 'https://example.com/webhook',
          method: 'POST',
          headers: {},
          timeout: 5000,
          retries: 3
        },
        filters: []
      };

      await notifier.addChannel(channel);
      expect(addedEvent).not.toBeNull();
      expect(addedEvent.id).toBe('event-test-channel');

      await notifier.removeChannel('event-test-channel');
      expect(removedEvent).not.toBeNull();
      expect(removedEvent.id).toBe('event-test-channel');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid channel types gracefully', async () => {
      const channel: NotificationChannel = {
        id: 'invalid-type-channel',
        type: 'invalid-type' as any,
        settings: {},
        filters: []
      };

      await expect(notifier.addChannel(channel)).rejects.toThrow('Unsupported notification channel type');
    });

    it('should handle malformed webhook URLs', async () => {
      const channel: NotificationChannel = {
        id: 'malformed-webhook',
        type: 'webhook',
        settings: {
          url: 'not-a-valid-url',
          method: 'POST',
          headers: {},
          timeout: 5000,
          retries: 3
        },
        filters: []
      };

      await expect(notifier.addChannel(channel)).rejects.toThrow('Invalid webhook URL format');
    });
  });
});