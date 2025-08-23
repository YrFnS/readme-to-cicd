/**
 * Unit testing framework implementation
 */

import { UnitTestSuite } from './interfaces.js';
import { TestResult, TestCase, TestStatus, TestMetrics } from './types.js';

export class UnitTestSuiteImpl implements UnitTestSuite {
  public readonly name: string;
  private tests: Map<string, TestCase> = new Map();
  private mocks: Map<string, any> = new Map();
  private stubs: Map<string, any> = new Map();

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Setup before running tests
   */
  async setup(): Promise<void> {
    // Initialize test environment
    this.resetMocks();
    
    // Setup test data if needed
    // Could integrate with test data manager here
  }

  /**
   * Teardown after running tests
   */
  async teardown(): Promise<void> {
    // Clean up test environment
    this.resetMocks();
    
    // Clean up any test artifacts
  }

  /**
   * Run all registered unit tests
   */
  async runTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    await this.setup();
    
    try {
      for (const [testId, testCase] of this.tests) {
        const result = await this.executeUnitTest(testCase);
        results.push(result);
      }
    } finally {
      await this.teardown();
    }
    
    return results;
  }

  /**
   * Add a test case to the suite
   */
  addTest(test: TestCase): void {
    this.tests.set(test.id, test);
  }

  /**
   * Remove a test case from the suite
   */
  removeTest(testId: string): void {
    this.tests.delete(testId);
  }

  /**
   * Create a mock object for testing
   */
  createMock<T>(target: T): T {
    const mockId = `mock-${Date.now()}`;
    const mock = this.createMockImplementation(target);
    this.mocks.set(mockId, mock);
    return mock;
  }

  /**
   * Create a stub object for testing
   */
  createStub<T>(target: T): T {
    const stubId = `stub-${Date.now()}`;
    const stub = this.createStubImplementation(target);
    this.stubs.set(stubId, stub);
    return stub;
  }

  /**
   * Reset all mocks and stubs
   */
  resetMocks(): void {
    this.mocks.clear();
    this.stubs.clear();
  }

  /**
   * Execute a single unit test
   */
  private async executeUnitTest(testCase: TestCase): Promise<TestResult> {
    const startTime = new Date();
    let status: TestStatus = 'pending';
    let error: Error | undefined;
    let metrics: TestMetrics | undefined;

    try {
      // Execute the test case
      const result = await testCase.execute();
      status = result.status;
      error = result.error;
      metrics = result.metrics;
      
      // If no explicit status, determine from error
      if (status === 'pending') {
        status = error ? 'failed' : 'passed';
      }
    } catch (err) {
      status = 'failed';
      error = err as Error;
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    return {
      id: `${testCase.id}-${startTime.getTime()}`,
      name: testCase.name,
      type: 'unit',
      status,
      duration,
      startTime,
      endTime,
      error,
      metrics: metrics || this.createDefaultMetrics(status),
      artifacts: []
    };
  }

  /**
   * Create a mock implementation
   */
  private createMockImplementation<T>(target: T): T {
    if (typeof target === 'function') {
      return this.createFunctionMock(target) as T;
    } else if (typeof target === 'object' && target !== null) {
      return this.createObjectMock(target);
    }
    return target;
  }

  /**
   * Create a stub implementation
   */
  private createStubImplementation<T>(target: T): T {
    if (typeof target === 'function') {
      return this.createFunctionStub(target) as T;
    } else if (typeof target === 'object' && target !== null) {
      return this.createObjectStub(target);
    }
    return target;
  }

  /**
   * Create a function mock
   */
  private createFunctionMock(fn: Function): Function {
    const calls: any[][] = [];
    const mockFn = (...args: any[]) => {
      calls.push(args);
      // Return undefined by default, can be configured
      return undefined;
    };
    
    // Add mock utilities
    (mockFn as any).calls = calls;
    (mockFn as any).callCount = () => calls.length;
    (mockFn as any).calledWith = (...args: any[]) => 
      calls.some(call => this.arraysEqual(call, args));
    (mockFn as any).reset = () => calls.length = 0;
    
    return mockFn;
  }

  /**
   * Create a function stub
   */
  private createFunctionStub(fn: Function): Function {
    let returnValue: any = undefined;
    let throwError: Error | undefined;
    
    const stubFn = (...args: any[]) => {
      if (throwError) {
        throw throwError;
      }
      return returnValue;
    };
    
    // Add stub utilities
    (stubFn as any).returns = (value: any) => {
      returnValue = value;
      return stubFn;
    };
    (stubFn as any).throws = (error: Error) => {
      throwError = error;
      return stubFn;
    };
    (stubFn as any).reset = () => {
      returnValue = undefined;
      throwError = undefined;
    };
    
    return stubFn;
  }

  /**
   * Create an object mock
   */
  private createObjectMock<T>(obj: T): T {
    const mock = {} as T;
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (typeof value === 'function') {
          (mock as any)[key] = this.createFunctionMock(value);
        } else {
          (mock as any)[key] = value;
        }
      }
    }
    
    return mock;
  }

  /**
   * Create an object stub
   */
  private createObjectStub<T>(obj: T): T {
    const stub = {} as T;
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (typeof value === 'function') {
          (stub as any)[key] = this.createFunctionStub(value);
        } else {
          (stub as any)[key] = value;
        }
      }
    }
    
    return stub;
  }

  /**
   * Check if two arrays are equal
   */
  private arraysEqual(a: any[], b: any[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((val, index) => val === b[index]);
  }

  /**
   * Create default metrics for a test result
   */
  private createDefaultMetrics(status: TestStatus): TestMetrics {
    return {
      assertions: 1,
      passed: status === 'passed' ? 1 : 0,
      failed: status === 'failed' ? 1 : 0
    };
  }
}

/**
 * Utility functions for unit testing
 */
export class UnitTestUtils {
  /**
   * Assert that a condition is true
   */
  static assert(condition: boolean, message?: string): void {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  /**
   * Assert that two values are equal
   */
  static assertEqual<T>(actual: T, expected: T, message?: string): void {
    if (actual !== expected) {
      throw new Error(
        message || `Expected ${expected}, but got ${actual}`
      );
    }
  }

  /**
   * Assert that two objects are deeply equal
   */
  static assertDeepEqual(actual: any, expected: any, message?: string): void {
    if (!this.deepEqual(actual, expected)) {
      throw new Error(
        message || `Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`
      );
    }
  }

  /**
   * Assert that a function throws an error
   */
  static assertThrows(fn: () => void, expectedError?: string | RegExp): void {
    try {
      fn();
      throw new Error('Expected function to throw an error');
    } catch (error) {
      if (expectedError) {
        const errorMessage = (error as Error).message;
        if (typeof expectedError === 'string') {
          if (!errorMessage.includes(expectedError)) {
            throw new Error(`Expected error to contain "${expectedError}", but got "${errorMessage}"`);
          }
        } else if (expectedError instanceof RegExp) {
          if (!expectedError.test(errorMessage)) {
            throw new Error(`Expected error to match ${expectedError}, but got "${errorMessage}"`);
          }
        }
      }
    }
  }

  /**
   * Assert that an async function throws an error
   */
  static async assertThrowsAsync(fn: () => Promise<void>, expectedError?: string | RegExp): Promise<void> {
    try {
      await fn();
      throw new Error('Expected function to throw an error');
    } catch (error) {
      if (expectedError) {
        const errorMessage = (error as Error).message;
        if (typeof expectedError === 'string') {
          if (!errorMessage.includes(expectedError)) {
            throw new Error(`Expected error to contain "${expectedError}", but got "${errorMessage}"`);
          }
        } else if (expectedError instanceof RegExp) {
          if (!expectedError.test(errorMessage)) {
            throw new Error(`Expected error to match ${expectedError}, but got "${errorMessage}"`);
          }
        }
      }
    }
  }

  /**
   * Deep equality check
   */
  private static deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    
    if (a == null || b == null) return false;
    
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((val, index) => this.deepEqual(val, b[index]));
    }
    
    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      
      if (keysA.length !== keysB.length) return false;
      
      return keysA.every(key => 
        keysB.includes(key) && this.deepEqual(a[key], b[key])
      );
    }
    
    return false;
  }
}