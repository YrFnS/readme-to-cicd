/**
 * MockAnalyzer Implementation
 * 
 * A test analyzer that implements the AnalyzerInterface for testing purposes.
 * Provides configurable mock behavior and tracks method calls for validation.
 */

import { MarkdownAST } from '../../shared/markdown-parser';
import { AnalyzerResult, ParseError } from '../types';
import { AnalysisContext } from '../../shared/types/analysis-context';
import { 
  AnalyzerInterface, 
  AnalyzerCapabilities 
} from './enhanced-analyzer-registry';

/**
 * Method call tracking for testing purposes
 */
export interface MethodCall {
  method: string;
  args: any[];
  timestamp: Date;
  result?: any;
}

/**
 * Mock analysis result that can be configured for testing
 */
export interface MockAnalysisResult {
  data: any;
  confidence: number;
  sources?: string[];
  shouldFail?: boolean;
  error?: ParseError;
}

/**
 * MockAnalyzer class that implements AnalyzerInterface for testing
 */
export class MockAnalyzer implements AnalyzerInterface<any> {
  readonly name = 'MockAnalyzer';
  
  private mockResult: MockAnalysisResult;
  private callHistory: MethodCall[] = [];
  private capabilities: AnalyzerCapabilities;

  constructor(mockResult?: MockAnalysisResult) {
    this.mockResult = mockResult || {
      data: { mockData: 'test-data', type: 'mock' },
      confidence: 0.9,
      sources: ['mock-source']
    };

    this.capabilities = {
      supportedContentTypes: ['text/markdown', 'text/plain'],
      requiresContext: false,
      canProcessLargeFiles: true,
      estimatedProcessingTime: 100,
      dependencies: []
    };
  }

  /**
   * Analyze method implementation for testing
   */
  async analyze(
    ast: MarkdownAST, 
    content: string, 
    context?: AnalysisContext
  ): Promise<AnalyzerResult<any>> {
    const call: MethodCall = {
      method: 'analyze',
      args: [ast, content, context],
      timestamp: new Date()
    };

    try {
      // Simulate processing delay if configured
      if (this.capabilities.estimatedProcessingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, Math.min(this.capabilities.estimatedProcessingTime, 50)));
      }

      let result: AnalyzerResult<any>;

      if (this.mockResult.shouldFail) {
        result = {
          success: false,
          confidence: 0,
          errors: this.mockResult.error ? [this.mockResult.error] : [
            {
              code: 'MOCK_ERROR',
              message: 'Mock analyzer configured to fail',
              component: this.name,
              severity: 'error'
            }
          ]
        };
      } else {
        result = {
          success: true,
          data: {
            ...this.mockResult.data,
            // Add some dynamic data based on input
            contentLength: content.length,
            astNodeCount: Array.isArray(ast) ? ast.length : 0,
            hasContext: !!context,
            processedAt: new Date().toISOString()
          },
          confidence: this.mockResult.confidence,
          sources: this.mockResult.sources || ['mock-source']
        };
      }

      call.result = result;
      this.callHistory.push(call);
      
      return result;
    } catch (error) {
      const errorResult: AnalyzerResult<any> = {
        success: false,
        confidence: 0,
        errors: [{
          code: 'MOCK_ANALYZER_ERROR',
          message: `MockAnalyzer error: ${error instanceof Error ? error.message : String(error)}`,
          component: this.name,
          severity: 'error'
        }]
      };

      call.result = errorResult;
      this.callHistory.push(call);
      
      return errorResult;
    }
  }

  /**
   * Get analyzer capabilities
   */
  getCapabilities(): AnalyzerCapabilities {
    const call: MethodCall = {
      method: 'getCapabilities',
      args: [],
      timestamp: new Date(),
      result: this.capabilities
    };
    
    this.callHistory.push(call);
    return { ...this.capabilities };
  }

  /**
   * Validate interface implementation
   */
  validateInterface(): boolean {
    const call: MethodCall = {
      method: 'validateInterface',
      args: [],
      timestamp: new Date()
    };

    try {
      // Check that all required methods exist and are functions
      const hasName = typeof this.name === 'string' && this.name.length > 0;
      const hasAnalyze = typeof this.analyze === 'function';
      const hasGetCapabilities = typeof this.getCapabilities === 'function';
      const hasValidateInterface = typeof this.validateInterface === 'function';

      // Check that analyze method has correct signature
      const analyzeSignature = this.analyze.length >= 2; // Should accept at least ast and content

      const isValid = hasName && hasAnalyze && hasGetCapabilities && hasValidateInterface && analyzeSignature;
      
      call.result = isValid;
      this.callHistory.push(call);
      
      return isValid;
    } catch (error) {
      call.result = false;
      this.callHistory.push(call);
      return false;
    }
  }

  // Mock-specific methods for testing

  /**
   * Set the mock result that will be returned by analyze()
   */
  setMockResult(result: MockAnalysisResult): void {
    this.mockResult = result;
  }

  /**
   * Reset the mock to default state
   */
  resetMock(): void {
    this.mockResult = {
      data: { mockData: 'test-data', type: 'mock' },
      confidence: 0.9,
      sources: ['mock-source']
    };
    this.callHistory = [];
  }

  /**
   * Get the history of method calls for testing verification
   */
  getCallHistory(): MethodCall[] {
    return [...this.callHistory];
  }

  /**
   * Get the last method call
   */
  getLastCall(): MethodCall | undefined {
    return this.callHistory[this.callHistory.length - 1];
  }

  /**
   * Get calls for a specific method
   */
  getCallsForMethod(methodName: string): MethodCall[] {
    return this.callHistory.filter(call => call.method === methodName);
  }

  /**
   * Clear the call history
   */
  clearCallHistory(): void {
    this.callHistory = [];
  }

  /**
   * Configure analyzer capabilities for testing
   */
  setCapabilities(capabilities: Partial<AnalyzerCapabilities>): void {
    this.capabilities = { ...this.capabilities, ...capabilities };
  }

  /**
   * Configure the analyzer to simulate failure
   */
  simulateFailure(error?: ParseError): void {
    this.mockResult = {
      ...this.mockResult,
      shouldFail: true,
      error: error || {
        code: 'MOCK_FAILURE',
        message: 'Simulated failure for testing',
        component: this.name,
        severity: 'error'
      }
    };
  }

  /**
   * Configure the analyzer to simulate success
   */
  simulateSuccess(data?: any, confidence?: number): void {
    this.mockResult = {
      data: data || { mockData: 'test-data', type: 'mock' },
      confidence: confidence || 0.9,
      sources: ['mock-source'],
      shouldFail: false
    };
  }

  /**
   * Get statistics about method calls
   */
  getCallStatistics(): {
    totalCalls: number;
    methodCounts: Record<string, number>;
    averageProcessingTime: number;
    lastCallTime?: Date;
  } {
    const methodCounts: Record<string, number> = {};
    let totalProcessingTime = 0;
    
    for (const call of this.callHistory) {
      methodCounts[call.method] = (methodCounts[call.method] || 0) + 1;
      
      // Estimate processing time (this is simplified)
      if (call.method === 'analyze') {
        totalProcessingTime += this.capabilities.estimatedProcessingTime;
      }
    }

    return {
      totalCalls: this.callHistory.length,
      methodCounts,
      averageProcessingTime: this.callHistory.length > 0 ? totalProcessingTime / this.callHistory.length : 0,
      lastCallTime: this.callHistory.length > 0 ? this.callHistory[this.callHistory.length - 1].timestamp : undefined
    };
  }
}

/**
 * Factory function to create a MockAnalyzer with specific configuration
 */
export function createMockAnalyzer(config?: {
  mockResult?: MockAnalysisResult;
  capabilities?: Partial<AnalyzerCapabilities>;
  name?: string;
}): MockAnalyzer {
  const analyzer = new MockAnalyzer(config?.mockResult);
  
  if (config?.capabilities) {
    analyzer.setCapabilities(config.capabilities);
  }
  
  // Note: name is readonly, so we can't change it after construction
  // If custom name is needed, we'd need to modify the constructor
  
  return analyzer;
}

/**
 * Create a MockAnalyzer configured for failure testing
 */
export function createFailingMockAnalyzer(error?: ParseError): MockAnalyzer {
  const analyzer = new MockAnalyzer();
  analyzer.simulateFailure(error);
  return analyzer;
}

/**
 * Create a MockAnalyzer configured for success testing
 */
export function createSuccessfulMockAnalyzer(data?: any, confidence?: number): MockAnalyzer {
  const analyzer = new MockAnalyzer();
  analyzer.simulateSuccess(data, confidence);
  return analyzer;
}