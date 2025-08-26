/**
 * Unit tests for MockAnalyzer test utility
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockAnalyzer, createMockAnalyzer, createMockAnalyzers } from '../../utils/mock-analyzer';

describe('MockAnalyzer', () => {
  let mockAnalyzer: MockAnalyzer;

  beforeEach(() => {
    mockAnalyzer = new MockAnalyzer();
  });

  describe('Basic Interface', () => {
    it('should have correct name', () => {
      expect(mockAnalyzer.name).toBe('MockAnalyzer');
    });

    it('should implement Analyzer interface', () => {
      expect(mockAnalyzer.analyze).toBeDefined();
      expect(typeof mockAnalyzer.analyze).toBe('function');
    });
  });

  describe('Analyze Method', () => {
    it('should return successful result with mock data', async () => {
      const ast = [];
      const content = 'Test content for mock analyzer';

      const result = await mockAnalyzer.analyze(ast, content);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.mock).toBe(true);
      expect(result.data.content).toBe('Test content for mock analyzer');
      expect(result.data.astNodes).toBe(0);
      expect(result.confidence).toBe(0.5);
    });

    it('should handle long content correctly', async () => {
      const ast = [];
      const longContent = 'A'.repeat(100);

      const result = await mockAnalyzer.analyze(ast, longContent);

      expect(result.success).toBe(true);
      expect(result.data.content).toBe('A'.repeat(50)); // First 50 chars
      expect(result.data.content.length).toBe(50);
    });

    it('should count AST nodes correctly', async () => {
      const ast = [
        { type: 'heading', text: 'Test' },
        { type: 'paragraph', text: 'Content' },
        { type: 'code', text: 'code' }
      ];
      const content = 'Test content';

      const result = await mockAnalyzer.analyze(ast, content);

      expect(result.data.astNodes).toBe(3);
    });

    it('should handle wrapped AST format', async () => {
      const wrappedAst = {
        ast: [
          { type: 'heading', text: 'Test' },
          { type: 'paragraph', text: 'Content' }
        ]
      };
      const content = 'Test content';

      const result = await mockAnalyzer.analyze(wrappedAst as any, content);

      expect(result.data.astNodes).toBe(2);
    });
  });

  describe('Lifecycle Methods', () => {
    it('should initialize correctly', async () => {
      expect(mockAnalyzer.isInitialized()).toBe(false);

      await mockAnalyzer.initialize();

      expect(mockAnalyzer.isInitialized()).toBe(true);
    });

    it('should cleanup correctly', () => {
      expect(mockAnalyzer.isCleanedUp()).toBe(false);

      mockAnalyzer.cleanup();

      expect(mockAnalyzer.isCleanedUp()).toBe(true);
    });

    it('should reset state correctly', async () => {
      await mockAnalyzer.initialize();
      mockAnalyzer.cleanup();

      expect(mockAnalyzer.isInitialized()).toBe(true);
      expect(mockAnalyzer.isCleanedUp()).toBe(true);

      mockAnalyzer.reset();

      expect(mockAnalyzer.isInitialized()).toBe(false);
      expect(mockAnalyzer.isCleanedUp()).toBe(false);
    });
  });

  describe('Factory Functions', () => {
    it('should create mock analyzer with factory function', () => {
      const analyzer = createMockAnalyzer();

      expect(analyzer).toBeInstanceOf(MockAnalyzer);
      expect(analyzer.name).toBe('MockAnalyzer');
    });

    it('should create multiple mock analyzers with unique names', () => {
      const analyzers = createMockAnalyzers(3);

      expect(analyzers).toHaveLength(3);
      expect(analyzers[0].name).toBe('MockAnalyzer1');
      expect(analyzers[1].name).toBe('MockAnalyzer2');
      expect(analyzers[2].name).toBe('MockAnalyzer3');

      // Verify they are all MockAnalyzer instances
      analyzers.forEach(analyzer => {
        expect(analyzer).toBeInstanceOf(MockAnalyzer);
      });
    });

    it('should create empty array for zero count', () => {
      const analyzers = createMockAnalyzers(0);

      expect(analyzers).toHaveLength(0);
      expect(Array.isArray(analyzers)).toBe(true);
    });
  });

  describe('Integration Testing Support', () => {
    it('should support multiple analyze calls', async () => {
      const results = await Promise.all([
        mockAnalyzer.analyze([], 'Content 1'),
        mockAnalyzer.analyze([], 'Content 2'),
        mockAnalyzer.analyze([], 'Content 3')
      ]);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.data.content).toBe(`Content ${index + 1}`);
      });
    });

    it('should maintain state across operations', async () => {
      await mockAnalyzer.initialize();
      
      const result = await mockAnalyzer.analyze([], 'Test');
      
      expect(mockAnalyzer.isInitialized()).toBe(true);
      expect(result.success).toBe(true);
      
      mockAnalyzer.cleanup();
      
      expect(mockAnalyzer.isCleanedUp()).toBe(true);
    });
  });
});