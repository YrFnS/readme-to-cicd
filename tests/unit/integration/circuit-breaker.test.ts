import { describe, it, expect, beforeEach, vi } from 'vitest';

// Test version of CircuitBreaker since it's internal to OrchestrationEngine
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly timeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  getState(): string {
    return this.state;
  }

  getFailureCount(): number {
    return this.failures;
  }
}

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker(3, 1000); // 3 failures, 1 second timeout
  });

  describe('Closed State', () => {
    it('should start in closed state', () => {
      expect(circuitBreaker.getState()).toBe('closed');
    });

    it('should execute operations successfully when closed', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await circuitBreaker.execute(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledOnce();
      expect(circuitBreaker.getState()).toBe('closed');
    });

    it('should remain closed after successful operations', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      for (let i = 0; i < 5; i++) {
        await circuitBreaker.execute(operation);
      }
      
      expect(circuitBreaker.getState()).toBe('closed');
      expect(operation).toHaveBeenCalledTimes(5);
    });

    it('should track failures but remain closed below threshold', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('failure'));
      
      // Execute 2 failures (below threshold of 3)
      for (let i = 0; i < 2; i++) {
        try {
          await circuitBreaker.execute(operation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(circuitBreaker.getState()).toBe('closed');
      expect(circuitBreaker.getFailureCount()).toBe(2);
    });
  });

  describe('Open State', () => {
    it('should open after reaching failure threshold', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('failure'));
      
      // Execute failures to reach threshold
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(operation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(circuitBreaker.getState()).toBe('open');
    });

    it('should reject operations immediately when open', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('failure'));
      
      // Trigger circuit breaker to open
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(operation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Now circuit breaker should be open
      const newOperation = vi.fn().mockResolvedValue('success');
      
      await expect(circuitBreaker.execute(newOperation)).rejects.toThrow('Circuit breaker is open');
      expect(newOperation).not.toHaveBeenCalled();
    });

    it('should transition to half-open after timeout', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('failure'));
      
      // Trigger circuit breaker to open
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(operation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(circuitBreaker.getState()).toBe('open');
      
      // Wait for timeout (simulate by advancing time)
      await new Promise(resolve => setTimeout(resolve, 1100)); // Wait longer than timeout
      
      const newOperation = vi.fn().mockResolvedValue('success');
      const result = await circuitBreaker.execute(newOperation);
      
      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe('closed');
    });
  });

  describe('Half-Open State', () => {
    it('should reset to closed on successful operation in half-open state', async () => {
      const failingOperation = vi.fn().mockRejectedValue(new Error('failure'));
      const successOperation = vi.fn().mockResolvedValue('success');
      
      // Trigger circuit breaker to open
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Execute successful operation (should transition from half-open to closed)
      const result = await circuitBreaker.execute(successOperation);
      
      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe('closed');
      expect(circuitBreaker.getFailureCount()).toBe(0);
    });

    it('should return to open on failure in half-open state', async () => {
      const failingOperation = vi.fn().mockRejectedValue(new Error('failure'));
      
      // Trigger circuit breaker to open
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Execute failing operation (should return to open)
      try {
        await circuitBreaker.execute(failingOperation);
      } catch (error) {
        // Expected to fail
      }
      
      expect(circuitBreaker.getState()).toBe('open');
    });
  });

  describe('Configuration', () => {
    it('should respect custom failure threshold', async () => {
      const customBreaker = new CircuitBreaker(2, 1000); // 2 failures threshold
      const operation = vi.fn().mockRejectedValue(new Error('failure'));
      
      // Execute 2 failures (should open with threshold of 2)
      for (let i = 0; i < 2; i++) {
        try {
          await customBreaker.execute(operation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(customBreaker.getState()).toBe('open');
    });

    it('should respect custom timeout', async () => {
      const customBreaker = new CircuitBreaker(2, 500); // 500ms timeout
      const failingOperation = vi.fn().mockRejectedValue(new Error('failure'));
      const successOperation = vi.fn().mockResolvedValue('success');
      
      // Trigger circuit breaker to open
      for (let i = 0; i < 2; i++) {
        try {
          await customBreaker.execute(failingOperation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(customBreaker.getState()).toBe('open');
      
      // Wait for custom timeout
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Should be able to execute now
      const result = await customBreaker.execute(successOperation);
      expect(result).toBe('success');
    });
  });

  describe('Error Propagation', () => {
    it('should propagate original errors when closed', async () => {
      const customError = new Error('Custom error message');
      const operation = vi.fn().mockRejectedValue(customError);
      
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Custom error message');
    });

    it('should propagate circuit breaker errors when open', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('failure'));
      
      // Trigger circuit breaker to open
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(operation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      const newOperation = vi.fn().mockResolvedValue('success');
      await expect(circuitBreaker.execute(newOperation)).rejects.toThrow('Circuit breaker is open');
    });
  });
});