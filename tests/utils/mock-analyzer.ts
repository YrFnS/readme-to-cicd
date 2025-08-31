/**
 * MockAnalyzer test utility
 * 
 * A mock analyzer implementation for testing analyzer registration
 * and integration pipeline functionality.
 */

import { Analyzer } from '../../src/parser/analyzers/registry';
import { AnalyzerInterface, AnalyzerCapabilities } from '../../src/parser/analyzers/enhanced-analyzer-registry';
import { MarkdownAST } from '../../src/shared/markdown-parser';
import { AnalyzerResult } from '../../src/parser/types';
import { AnalysisContext } from '../../src/shared/types/analysis-context';

/**
 * Mock analyzer for testing purposes - implements both old and new interfaces
 */
export class MockAnalyzer implements Analyzer<any>, AnalyzerInterface<any> {
  readonly name = 'MockAnalyzer';
  private initialized = false;
  private cleanedUp = false;

  /**
   * Mock analyze method that returns predictable test data
   */
  async analyze(ast: MarkdownAST, content: string, context?: AnalysisContext): Promise<AnalyzerResult<any>> {
    return {
      success: true,
      data: { 
        mock: true,
        content: content.substring(0, 50), // First 50 chars for testing
        astNodes: Array.isArray(ast) ? ast.length : (ast as any)?.ast?.length || 0,
        hasContext: !!context
      },
      confidence: 0.5
    };
  }

  /**
   * Get analyzer capabilities (required by AnalyzerInterface)
   */
  getCapabilities(): AnalyzerCapabilities {
    return {
      supportedContentTypes: ['markdown', 'text'],
      requiresContext: false,
      canProcessLargeFiles: true,
      estimatedProcessingTime: 100, // 100ms
      dependencies: []
    };
  }

  /**
   * Validate interface implementation (required by AnalyzerInterface)
   */
  validateInterface(): boolean {
    // Check if all required methods exist
    return (
      typeof this.analyze === 'function' &&
      typeof this.getCapabilities === 'function' &&
      typeof this.validateInterface === 'function' &&
      typeof this.name === 'string' &&
      this.name.length > 0
    );
  }

  /**
   * Optional initialize method for testing initialization flow
   */
  async initialize(): Promise<void> {
    this.initialized = true;
  }

  /**
   * Optional cleanup method for testing cleanup flow
   */
  cleanup(): void {
    this.cleanedUp = true;
  }

  /**
   * Test helper to check if analyzer was initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Test helper to check if analyzer was cleaned up
   */
  isCleanedUp(): boolean {
    return this.cleanedUp;
  }

  /**
   * Reset the mock analyzer state for testing
   */
  reset(): void {
    this.initialized = false;
    this.cleanedUp = false;
  }
}

/**
 * Factory function to create a new MockAnalyzer instance
 */
export function createMockAnalyzer(): MockAnalyzer {
  return new MockAnalyzer();
}

/**
 * Create multiple mock analyzers with different names for testing
 */
export function createMockAnalyzers(count: number): MockAnalyzer[] {
  const analyzers: MockAnalyzer[] = [];
  
  for (let i = 0; i < count; i++) {
    const analyzer = new MockAnalyzer();
    // Override the name to make each analyzer unique
    (analyzer as any).name = `MockAnalyzer${i + 1}`;
    analyzers.push(analyzer);
  }
  
  return analyzers;
}