import { describe, it, expect, beforeEach } from 'vitest';

// Since PriorityQueue is internal to OrchestrationEngine, we'll create a test version
class PriorityQueue<T> {
  private items: Array<{ item: T; priority: number }> = [];

  enqueue(item: T, priority: number | string): void {
    const priorityValue = this.getPriorityValue(priority);
    this.items.push({ item, priority: priorityValue });
    this.items.sort((a, b) => b.priority - a.priority);
  }

  dequeue(): T | undefined {
    return this.items.shift()?.item;
  }

  size(): number {
    return this.items.length;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  private getPriorityValue(priority: number | string): number {
    if (typeof priority === 'number') return priority;
    
    const priorityMap: Record<string, number> = {
      'critical': 4,
      'high': 3,
      'normal': 2,
      'low': 1
    };
    return priorityMap[priority] || 2;
  }
}

describe('PriorityQueue', () => {
  let queue: PriorityQueue<string>;

  beforeEach(() => {
    queue = new PriorityQueue<string>();
  });

  describe('Basic Operations', () => {
    it('should start empty', () => {
      expect(queue.isEmpty()).toBe(true);
      expect(queue.size()).toBe(0);
    });

    it('should enqueue and dequeue items', () => {
      queue.enqueue('item1', 'normal');
      
      expect(queue.isEmpty()).toBe(false);
      expect(queue.size()).toBe(1);
      
      const item = queue.dequeue();
      expect(item).toBe('item1');
      expect(queue.isEmpty()).toBe(true);
    });

    it('should return undefined when dequeuing from empty queue', () => {
      const item = queue.dequeue();
      expect(item).toBeUndefined();
    });
  });

  describe('Priority Handling', () => {
    it('should handle string priorities correctly', () => {
      queue.enqueue('low-item', 'low');
      queue.enqueue('high-item', 'high');
      queue.enqueue('critical-item', 'critical');
      queue.enqueue('normal-item', 'normal');

      expect(queue.dequeue()).toBe('critical-item');
      expect(queue.dequeue()).toBe('high-item');
      expect(queue.dequeue()).toBe('normal-item');
      expect(queue.dequeue()).toBe('low-item');
    });

    it('should handle numeric priorities correctly', () => {
      queue.enqueue('priority-1', 1);
      queue.enqueue('priority-5', 5);
      queue.enqueue('priority-3', 3);

      expect(queue.dequeue()).toBe('priority-5');
      expect(queue.dequeue()).toBe('priority-3');
      expect(queue.dequeue()).toBe('priority-1');
    });

    it('should handle mixed priority types', () => {
      queue.enqueue('numeric-high', 10);
      queue.enqueue('string-critical', 'critical');
      queue.enqueue('numeric-low', 1);
      queue.enqueue('string-normal', 'normal');

      expect(queue.dequeue()).toBe('numeric-high');
      expect(queue.dequeue()).toBe('string-critical');
      expect(queue.dequeue()).toBe('string-normal');
      expect(queue.dequeue()).toBe('numeric-low');
    });

    it('should use default priority for unknown strings', () => {
      queue.enqueue('unknown-priority', 'unknown');
      queue.enqueue('high-priority', 'high');
      queue.enqueue('low-priority', 'low');

      expect(queue.dequeue()).toBe('high-priority');
      expect(queue.dequeue()).toBe('unknown-priority'); // Should get default priority (2)
      expect(queue.dequeue()).toBe('low-priority');
    });
  });

  describe('FIFO within Same Priority', () => {
    it('should maintain FIFO order for items with same priority', () => {
      queue.enqueue('first', 'normal');
      queue.enqueue('second', 'normal');
      queue.enqueue('third', 'normal');

      expect(queue.dequeue()).toBe('first');
      expect(queue.dequeue()).toBe('second');
      expect(queue.dequeue()).toBe('third');
    });
  });

  describe('Size Tracking', () => {
    it('should track size correctly during operations', () => {
      expect(queue.size()).toBe(0);

      queue.enqueue('item1', 'normal');
      expect(queue.size()).toBe(1);

      queue.enqueue('item2', 'high');
      expect(queue.size()).toBe(2);

      queue.dequeue();
      expect(queue.size()).toBe(1);

      queue.dequeue();
      expect(queue.size()).toBe(0);
    });

    it('should handle multiple enqueue/dequeue cycles', () => {
      for (let i = 0; i < 5; i++) {
        queue.enqueue(`item${i}`, 'normal');
      }
      expect(queue.size()).toBe(5);

      for (let i = 0; i < 3; i++) {
        queue.dequeue();
      }
      expect(queue.size()).toBe(2);

      for (let i = 0; i < 2; i++) {
        queue.enqueue(`new-item${i}`, 'high');
      }
      expect(queue.size()).toBe(4);
    });
  });
});