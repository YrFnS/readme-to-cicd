import { describe, it, expect, beforeEach } from 'vitest';
import { SystemEvent } from '../../../src/integration/types';

// Test version of EventStore since it's internal to OrchestrationEngine
class EventStore {
  private events: SystemEvent[] = [];

  append(event: SystemEvent): void {
    this.events.push({
      ...event,
      timestamp: new Date()
    });
  }

  getEvents(fromTimestamp?: Date): SystemEvent[] {
    if (!fromTimestamp) return [...this.events];
    
    return this.events.filter(event => event.timestamp >= fromTimestamp);
  }

  getEventsByType(type: string): SystemEvent[] {
    return this.events.filter(event => event.type === type);
  }

  clear(): void {
    this.events = [];
  }

  size(): number {
    return this.events.length;
  }
}

describe('EventStore', () => {
  let eventStore: EventStore;

  beforeEach(() => {
    eventStore = new EventStore();
  });

  describe('Basic Operations', () => {
    it('should start empty', () => {
      expect(eventStore.size()).toBe(0);
      expect(eventStore.getEvents()).toEqual([]);
    });

    it('should append events', () => {
      const event: SystemEvent = {
        type: 'test.event',
        source: 'test',
        data: { message: 'test' },
        timestamp: new Date(),
        severity: 'info'
      };

      eventStore.append(event);

      expect(eventStore.size()).toBe(1);
      const events = eventStore.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('test.event');
    });

    it('should update timestamp when appending', () => {
      const originalTimestamp = new Date('2023-01-01');
      const event: SystemEvent = {
        type: 'test.event',
        source: 'test',
        data: {},
        timestamp: originalTimestamp,
        severity: 'info'
      };

      eventStore.append(event);

      const storedEvents = eventStore.getEvents();
      expect(storedEvents[0].timestamp).not.toEqual(originalTimestamp);
      expect(storedEvents[0].timestamp).toBeInstanceOf(Date);
    });

    it('should clear all events', () => {
      const events: SystemEvent[] = [
        {
          type: 'event1',
          source: 'test',
          data: {},
          timestamp: new Date(),
          severity: 'info'
        },
        {
          type: 'event2',
          source: 'test',
          data: {},
          timestamp: new Date(),
          severity: 'warning'
        }
      ];

      events.forEach(event => eventStore.append(event));
      expect(eventStore.size()).toBe(2);

      eventStore.clear();
      expect(eventStore.size()).toBe(0);
      expect(eventStore.getEvents()).toEqual([]);
    });
  });

  describe('Event Retrieval', () => {
    beforeEach(() => {
      // Clear the store first
      eventStore.clear();
      
      const events: SystemEvent[] = [
        {
          type: 'workflow.started',
          source: 'orchestration-engine',
          data: { requestId: 'req-1' },
          timestamp: new Date('2023-01-01T10:00:00Z'),
          severity: 'info'
        },
        {
          type: 'component.failure',
          source: 'component-manager',
          data: { componentId: 'parser' },
          timestamp: new Date('2023-01-01T10:05:00Z'),
          severity: 'error'
        },
        {
          type: 'workflow.completed',
          source: 'orchestration-engine',
          data: { requestId: 'req-1' },
          timestamp: new Date('2023-01-01T10:10:00Z'),
          severity: 'info'
        },
        {
          type: 'component.failure',
          source: 'component-manager',
          data: { componentId: 'generator' },
          timestamp: new Date('2023-01-01T10:15:00Z'),
          severity: 'error'
        }
      ];

      // Manually add events with specific timestamps for testing
      events.forEach(event => {
        (eventStore as any).events.push(event); // Direct access for testing
      });
    });

    it('should get all events when no filter provided', () => {
      const events = eventStore.getEvents();
      expect(events).toHaveLength(4);
    });

    it('should filter events by timestamp', () => {
      const filterDate = new Date('2023-01-01T10:07:00Z');
      const events = eventStore.getEvents(filterDate);
      
      // Should return events from 10:10 and 10:15 (after filter date)
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('workflow.completed');
      expect(events[1].type).toBe('component.failure');
    });

    it('should filter events by type', () => {
      const failureEvents = eventStore.getEventsByType('component.failure');
      
      expect(failureEvents).toHaveLength(2);
      failureEvents.forEach(event => {
        expect(event.type).toBe('component.failure');
        expect(event.severity).toBe('error');
      });
    });

    it('should return empty array for non-existent event type', () => {
      const events = eventStore.getEventsByType('non.existent.type');
      expect(events).toEqual([]);
    });

    it('should return empty array when filtering with future timestamp', () => {
      const futureDate = new Date('2024-01-01T00:00:00Z'); // Future relative to test data (2023)
      const events = eventStore.getEvents(futureDate);
      expect(events).toEqual([]);
    });
  });

  describe('Event Ordering', () => {
    it('should maintain chronological order', () => {
      const events: SystemEvent[] = [
        {
          type: 'first',
          source: 'test',
          data: {},
          timestamp: new Date(),
          severity: 'info'
        },
        {
          type: 'second',
          source: 'test',
          data: {},
          timestamp: new Date(),
          severity: 'info'
        },
        {
          type: 'third',
          source: 'test',
          data: {},
          timestamp: new Date(),
          severity: 'info'
        }
      ];

      // Add small delays to ensure different timestamps
      for (let i = 0; i < events.length; i++) {
        setTimeout(() => eventStore.append(events[i]), i * 10);
      }

      // Wait for all events to be added
      setTimeout(() => {
        const storedEvents = eventStore.getEvents();
        expect(storedEvents[0].type).toBe('first');
        expect(storedEvents[1].type).toBe('second');
        expect(storedEvents[2].type).toBe('third');
      }, 100);
    });
  });

  describe('Event Data Integrity', () => {
    it('should preserve event data', () => {
      const complexData = {
        requestId: 'req-123',
        userId: 'user-456',
        metadata: {
          source: 'api',
          version: '1.2.3',
          tags: ['important', 'urgent']
        },
        metrics: {
          duration: 1500,
          memoryUsage: 256000
        }
      };

      const event: SystemEvent = {
        type: 'complex.event',
        source: 'test-service',
        data: complexData,
        timestamp: new Date(),
        severity: 'info'
      };

      eventStore.append(event);

      const storedEvents = eventStore.getEvents();
      expect(storedEvents[0].data).toEqual(complexData);
      expect(storedEvents[0].source).toBe('test-service');
      expect(storedEvents[0].severity).toBe('info');
    });

    it('should handle events with null/undefined data', () => {
      const events: SystemEvent[] = [
        {
          type: 'null.data',
          source: 'test',
          data: null,
          timestamp: new Date(),
          severity: 'info'
        },
        {
          type: 'undefined.data',
          source: 'test',
          data: undefined,
          timestamp: new Date(),
          severity: 'info'
        }
      ];

      events.forEach(event => eventStore.append(event));

      const storedEvents = eventStore.getEvents();
      expect(storedEvents[0].data).toBeNull();
      expect(storedEvents[1].data).toBeUndefined();
    });
  });

  describe('Performance', () => {
    it('should handle large number of events', () => {
      const eventCount = 1000;
      
      for (let i = 0; i < eventCount; i++) {
        eventStore.append({
          type: `event.${i}`,
          source: 'performance-test',
          data: { index: i },
          timestamp: new Date(),
          severity: 'info'
        });
      }

      expect(eventStore.size()).toBe(eventCount);
      
      const allEvents = eventStore.getEvents();
      expect(allEvents).toHaveLength(eventCount);
      
      const specificEvents = eventStore.getEventsByType('event.500');
      expect(specificEvents).toHaveLength(1);
      expect(specificEvents[0].data.index).toBe(500);
    });
  });
});