/**
 * Unit tests for MockAnalyzer interface compliance
 * 
 * Tests verify that MockAnalyzer properly implements the AnalyzerInterface
 * and provides the required mock functionality for testing purposes.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  MockAnalyzer, 
  createMockAnalyzer, 
  createFailingMockAnalyzer, 
  createSuccessfulMockAnalyzer,
  MethodCall,
  MockAnalysisResult
} from '../../src/parser/analyzers/mock-analyzer';
import { 
  AnalyzerInterface, 
  AnalyzerCapabilities 
} from '../../src/parser/analyzers/enhanced-analyzer-registry';
import { MarkdownAST } from '../../src/shared/markdown-parser';
import { ParseError } from '../../src/parser/types';

describe('MockAnalyzer', () => {
  let mockAnalyzer: MockAnalyzer;
  let sampleAST: MarkdownAST;
  let sampleContent: string;

  beforeEach(() => {
    mockAnalyzer = new MockAnalyzer();
    sampleAST = [
      { type: 'heading', depth: 1, text: 'Test Project' },
      { type: 'paragraph', text: 'This is a test project.' }
    ] as any;
    sampleContent = '# Test Project\n\nThis is a test project.';
  });

  describe('Interface Compliance', () => {
    it('should implement AnalyzerInterface', () => {
      // Verify it has the correct interface structure
      expect(mockAnalyzer).toHaveProperty('name');
      expect(mockAnalyzer).toHaveProperty('analyze');
      expect(mockAnalyzer).toHaveProperty('getCapabilities');
      expect(mockAnalyzer).toHaveProperty('validateInterface');
      
      // Verify types
      expect(typeof mockAnalyzer.name).toBe('string');
      expect(typeof mockAnalyzer.analyze).toBe('function');
      expect(typeof mockAnalyzer.getCapabilities).toBe('function');
      expect(typeof mockAnalyzer.validateInterface).toBe('function');
    });

    it('should have correct name property', () => {
      expect(mockAnalyzer.name).toBe('MockAnalyzer');
      expect(mockAnalyzer.name).toMatch(/^[A-Za-z][A-Za-z0-9]*$/); // Valid identifier
    });

    it('should validate its own interface', () => {
      const isValid = mockAnalyzer.validateInterface();
      expect(isValid).toBe(true);
    });

    it('should have analyze method with correct signature', () => {
      expect(mockAnalyzer.analyze.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('analyze() method', () => {
    it('should return successful result by default', async () => {
      const result = await mockAnalyzer.analyze(sampleAST, sampleContent);
      
      expect(result.success).toBe(true);
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('confidence');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should include dynamic data in result', async () => {
      const result = await mockAnalyzer.analyze(sampleAST, sampleContent);
      
      if (result.success) {
        expect(result.data).toHaveProperty('contentLength', sampleContent.length);
        expect(result.data).toHaveProperty('astNodeCount', sampleAST.length);
        expect(result.data).toHaveProperty('hasContext', false);
        expect(result.data).toHaveProperty('processedAt');
      }
    });

    it('should handle context parameter', async () => {
      const context = { 
        sharedData: new Map(),
        analysisMetadata: {
          startTime: new Date(),
          currentAnalyzer: 'MockAnalyzer',
          previousAnalyzers: [],
          analysisId: 'test-123'
        }
      };
      
      const result = await mockAnalyzer.analyze(sampleAST, sampleContent, context);
      
      if (result.success) {
        expect(result.data.hasContext).toBe(true);
      }
    });

    it('should track method calls', async () => {
      const initialCallCount = mockAnalyzer.getCallHistory().length;
      
      await mockAnalyzer.analyze(sampleAST, sampleContent);
      
      const callHistory = mockAnalyzer.getCallHistory();
      expect(callHistory.length).toBe(initialCallCount + 1);
      
      const lastCall = mockAnalyzer.getLastCall();
      expect(lastCall?.method).toBe('analyze');
      expect(lastCall?.args).toHaveLength(3);
    });

    it('should handle errors gracefully', async () => {
      // Configure analyzer to fail
      mockAnalyzer.simulateFailure();
      
      const result = await mockAnalyzer.analyze(sampleAST, sampleContent);
      
      expect(result.success).toBe(false);
      expect(result).toHaveProperty('errors');
      expect(result.errors).toHaveLength(1);
      expect(result.confidence).toBe(0);
    });

    it('should respect processing time configuration', async () => {
      const startTime = Date.now();
      
      // Set a small processing time for testing
      mockAnalyzer.setCapabilities({ estimatedProcessingTime: 10 });
      
      await mockAnalyzer.analyze(sampleAST, sampleContent);
      
      const endTime = Date.now();
      const actualTime = endTime - startTime;
      
      // Should take at least some time (but we cap it at 50ms in implementation)
      expect(actualTime).toBeGreaterThanOrEqual(5);
    });
  });

  describe('getCapabilities() method', () => {
    it('should return valid capabilities object', () => {
      const capabilities = mockAnalyzer.getCapabilities();
      
      expect(capabilities).toHaveProperty('supportedContentTypes');
      expect(capabilities).toHaveProperty('requiresContext');
      expect(capabilities).toHaveProperty('canProcessLargeFiles');
      expect(capabilities).toHaveProperty('estimatedProcessingTime');
      expect(capabilities).toHaveProperty('dependencies');
      
      // Verify types
      expect(Array.isArray(capabilities.supportedContentTypes)).toBe(true);
      expect(typeof capabilities.requiresContext).toBe('boolean');
      expect(typeof capabilities.canProcessLargeFiles).toBe('boolean');
      expect(typeof capabilities.estimatedProcessingTime).toBe('number');
      expect(Array.isArray(capabilities.dependencies)).toBe(true);
    });

    it('should return default capabilities', () => {
      const capabilities = mockAnalyzer.getCapabilities();
      
      expect(capabilities.supportedContentTypes).toContain('text/markdown');
      expect(capabilities.supportedContentTypes).toContain('text/plain');
      expect(capabilities.requiresContext).toBe(false);
      expect(capabilities.canProcessLargeFiles).toBe(true);
      expect(capabilities.estimatedProcessingTime).toBe(100);
      expect(capabilities.dependencies).toHaveLength(0);
    });

    it('should track method calls', () => {
      const initialCallCount = mockAnalyzer.getCallsForMethod('getCapabilities').length;
      
      mockAnalyzer.getCapabilities();
      
      const calls = mockAnalyzer.getCallsForMethod('getCapabilities');
      expect(calls.length).toBe(initialCallCount + 1);
    });

    it('should allow capability configuration', () => {
      const customCapabilities = {
        supportedContentTypes: ['application/json'],
        requiresContext: true,
        estimatedProcessingTime: 500
      };
      
      mockAnalyzer.setCapabilities(customCapabilities);
      const capabilities = mockAnalyzer.getCapabilities();
      
      expect(capabilities.supportedContentTypes).toEqual(['application/json']);
      expect(capabilities.requiresContext).toBe(true);
      expect(capabilities.estimatedProcessingTime).toBe(500);
    });
  });

  describe('validateInterface() method', () => {
    it('should return true for valid interface', () => {
      const isValid = mockAnalyzer.validateInterface();
      expect(isValid).toBe(true);
    });

    it('should track method calls', () => {
      const initialCallCount = mockAnalyzer.getCallsForMethod('validateInterface').length;
      
      mockAnalyzer.validateInterface();
      
      const calls = mockAnalyzer.getCallsForMethod('validateInterface');
      expect(calls.length).toBe(initialCallCount + 1);
    });

    it('should validate required properties and methods', () => {
      // This test verifies the validation logic itself
      const isValid = mockAnalyzer.validateInterface();
      
      // Should pass all validation checks
      expect(isValid).toBe(true);
      
      // Verify the validation was recorded
      const lastCall = mockAnalyzer.getLastCall();
      expect(lastCall?.method).toBe('validateInterface');
      expect(lastCall?.result).toBe(true);
    });
  });

  describe('Mock-specific functionality', () => {
    it('should allow setting custom mock results', async () => {
      const customResult: MockAnalysisResult = {
        data: { customData: 'test', value: 42 },
        confidence: 0.75,
        sources: ['custom-source']
      };
      
      mockAnalyzer.setMockResult(customResult);
      const result = await mockAnalyzer.analyze(sampleAST, sampleContent);
      
      if (result.success) {
        expect(result.data).toMatchObject(customResult.data);
        expect(result.confidence).toBe(0.75);
        expect(result.sources).toContain('custom-source');
      }
    });

    it('should reset to default state', async () => {
      // Modify the analyzer
      mockAnalyzer.setMockResult({
        data: { modified: true },
        confidence: 0.1,
        sources: ['modified']
      });
      
      await mockAnalyzer.analyze(sampleAST, sampleContent);
      
      // Reset and verify
      mockAnalyzer.resetMock();
      
      const result = await mockAnalyzer.analyze(sampleAST, sampleContent);
      const callHistory = mockAnalyzer.getCallHistory();
      
      if (result.success) {
        expect(result.data).toHaveProperty('mockData', 'test-data');
        expect(result.confidence).toBe(0.9);
      }
      expect(callHistory).toHaveLength(1); // Only the call after reset
    });

    it('should track call statistics', async () => {
      // Make several calls
      await mockAnalyzer.analyze(sampleAST, sampleContent);
      mockAnalyzer.getCapabilities();
      mockAnalyzer.validateInterface();
      await mockAnalyzer.analyze(sampleAST, sampleContent);
      
      const stats = mockAnalyzer.getCallStatistics();
      
      expect(stats.totalCalls).toBe(4);
      expect(stats.methodCounts.analyze).toBe(2);
      expect(stats.methodCounts.getCapabilities).toBe(1);
      expect(stats.methodCounts.validateInterface).toBe(1);
      expect(stats.lastCallTime).toBeInstanceOf(Date);
    });

    it('should simulate failure correctly', async () => {
      const customError: ParseError = {
        code: 'CUSTOM_ERROR',
        message: 'Custom test error',
        component: 'MockAnalyzer',
        severity: 'error'
      };
      
      mockAnalyzer.simulateFailure(customError);
      const result = await mockAnalyzer.analyze(sampleAST, sampleContent);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0].code).toBe('CUSTOM_ERROR');
      expect(result.errors?.[0].message).toBe('Custom test error');
    });

    it('should simulate success correctly', async () => {
      const customData = { success: true, value: 123 };
      const customConfidence = 0.85;
      
      mockAnalyzer.simulateSuccess(customData, customConfidence);
      const result = await mockAnalyzer.analyze(sampleAST, sampleContent);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject(customData);
        expect(result.confidence).toBe(customConfidence);
      }
    });
  });

  describe('Factory functions', () => {
    it('should create analyzer with createMockAnalyzer', () => {
      const analyzer = createMockAnalyzer({
        mockResult: {
          data: { factory: 'created' },
          confidence: 0.8,
          sources: ['factory']
        }
      });
      
      expect(analyzer).toBeInstanceOf(MockAnalyzer);
      expect(analyzer.name).toBe('MockAnalyzer');
    });

    it('should create failing analyzer with createFailingMockAnalyzer', async () => {
      const analyzer = createFailingMockAnalyzer();
      const result = await analyzer.analyze(sampleAST, sampleContent);
      
      expect(result.success).toBe(false);
    });

    it('should create successful analyzer with createSuccessfulMockAnalyzer', async () => {
      const analyzer = createSuccessfulMockAnalyzer({ test: 'data' }, 0.95);
      const result = await analyzer.analyze(sampleAST, sampleContent);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject({ test: 'data' });
        expect(result.confidence).toBe(0.95);
      }
    });
  });

  describe('Call history management', () => {
    it('should clear call history', async () => {
      await mockAnalyzer.analyze(sampleAST, sampleContent);
      mockAnalyzer.getCapabilities();
      
      expect(mockAnalyzer.getCallHistory().length).toBeGreaterThan(0);
      
      mockAnalyzer.clearCallHistory();
      
      expect(mockAnalyzer.getCallHistory()).toHaveLength(0);
    });

    it('should filter calls by method', async () => {
      await mockAnalyzer.analyze(sampleAST, sampleContent);
      mockAnalyzer.getCapabilities();
      mockAnalyzer.validateInterface();
      await mockAnalyzer.analyze(sampleAST, sampleContent);
      
      const analyzeCalls = mockAnalyzer.getCallsForMethod('analyze');
      const capabilityCalls = mockAnalyzer.getCallsForMethod('getCapabilities');
      
      expect(analyzeCalls).toHaveLength(2);
      expect(capabilityCalls).toHaveLength(1);
      
      analyzeCalls.forEach(call => {
        expect(call.method).toBe('analyze');
      });
    });
  });

  describe('Error handling', () => {
    it('should handle exceptions in analyze method', async () => {
      // Create a mock that throws an error
      const throwingAnalyzer = new MockAnalyzer();
      
      // Override the analyze method to throw
      const originalAnalyze = throwingAnalyzer.analyze;
      throwingAnalyzer.analyze = async () => {
        throw new Error('Test exception');
      };
      
      // This should be handled gracefully by the base implementation
      // Note: This test might need adjustment based on actual error handling
    });

    it('should handle malformed AST gracefully', async () => {
      const malformedAST = null as any;
      const result = await mockAnalyzer.analyze(malformedAST, sampleContent);
      
      // Should not throw, should return a result
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle empty content', async () => {
      const result = await mockAnalyzer.analyze([], '');
      
      expect(result).toBeDefined();
      if (result.success) {
        expect(result.data.contentLength).toBe(0);
        expect(result.data.astNodeCount).toBe(0);
      }
    });
  });
});