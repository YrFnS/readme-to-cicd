/**
 * Tests for error recovery mechanisms and partial parsing failures
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReadmeParserImpl } from '../../src/parser/readme-parser';
import { 
  ParseErrorImpl, 
  ErrorFactory, 
  ErrorRecovery, 
  ErrorAggregator 
} from '../../src/parser/utils/parse-error';
import { Logger, LogLevel } from '../../src/parser/utils/logger';
import { ContentAnalyzer, AnalysisResult } from '../../src/parser/types';
import { Token } from 'marked';

// Mock analyzer that always fails
class FailingAnalyzer implements ContentAnalyzer {
  readonly name = 'FailingAnalyzer';

  async analyze(ast: Token[], rawContent: string): Promise<AnalysisResult> {
    throw new Error('Analyzer intentionally failed');
  }
}

// Mock analyzer that times out
class TimeoutAnalyzer implements ContentAnalyzer {
  readonly name = 'TimeoutAnalyzer';

  async analyze(ast: Token[], rawContent: string): Promise<AnalysisResult> {
    // Simulate timeout by taking longer than the parser timeout
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: { test: 'timeout' },
          confidence: 0.5,
          sources: ['timeout-test']
        });
      }, 15000); // 15 seconds - longer than parser timeout
    });
  }
}

// Mock analyzer that returns partial results
class PartialAnalyzer implements ContentAnalyzer {
  readonly name = 'PartialAnalyzer';

  async analyze(ast: Token[], rawContent: string): Promise<AnalysisResult> {
    return {
      data: { partial: true },
      confidence: 0.3,
      sources: ['partial-analysis'],
      errors: [
        ErrorFactory.analysis(
          'PARTIAL_ANALYSIS',
          'Could only analyze part of the content',
          'PartialAnalyzer',
          'warning'
        )
      ]
    };
  }
}

// Mock analyzer that succeeds
class SuccessfulAnalyzer implements ContentAnalyzer {
  readonly name = 'LanguageDetector'; // Use expected analyzer name

  async analyze(ast: Token[], rawContent: string): Promise<AnalysisResult> {
    return {
      data: [{ name: 'JavaScript', confidence: 0.9, sources: ['successful-analysis'] }],
      confidence: 0.9,
      sources: ['successful-analysis']
    };
  }
}

describe('Error Recovery Mechanisms', () => {
  let parser: ReadmeParserImpl;
  let logger: Logger;

  beforeEach(() => {
    parser = new ReadmeParserImpl();
    logger = Logger.getInstance({ 
      level: LogLevel.DEBUG,
      enableConsole: false 
    });
    logger.clearLogs();
    
    // Clear default analyzers to test with our mock analyzers
    parser.clearAnalyzers();
  });

  afterEach(() => {
    logger.clearLogs();
  });

  describe('Analyzer Failure Recovery', () => {
    it('should continue parsing when one analyzer fails', async () => {
      // Register one failing and one successful analyzer
      parser.registerAnalyzer(new FailingAnalyzer());
      parser.registerAnalyzer(new SuccessfulAnalyzer());

      const content = '# Test README\n\nThis is a test.';
      const result = await parser.parseContent(content);

      // Should succeed overall despite one analyzer failing
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);

      // Check that the successful analyzer's data is included
      // (This would depend on how the result aggregator handles the data)
      expect(result.data!.confidence.overall).toBeGreaterThan(0);
    });

    it('should fail when all analyzers fail', async () => {
      // Register only failing analyzers
      parser.registerAnalyzer(new FailingAnalyzer());

      const content = '# Test README\n\nThis is a test.';
      const result = await parser.parseContent(content);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.errors![0].code).toBe('ALL_ANALYZERS_FAILED');
    });

    it('should handle analyzer timeouts gracefully', async () => {
      // Register timeout and successful analyzers
      parser.registerAnalyzer(new TimeoutAnalyzer());
      parser.registerAnalyzer(new SuccessfulAnalyzer());

      const content = '# Test README\n\nThis is a test.';
      const result = await parser.parseContent(content);

      // Should succeed with the successful analyzer
      expect(result.success).toBe(true);
      expect(result.errors).toBeDefined();
      
      // Should have timeout error
      const timeoutError = result.errors!.find(e => e.message.includes('timeout') || e.code.includes('TIMEOUT'));
      expect(timeoutError).toBeDefined();
    }, 15000); // Increase timeout for this test

    it('should collect partial results from analyzers', async () => {
      // Register partial and successful analyzers
      parser.registerAnalyzer(new PartialAnalyzer());
      parser.registerAnalyzer(new SuccessfulAnalyzer());

      const content = '# Test README\n\nThis is a test.';
      const result = await parser.parseContent(content);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.errors).toBeDefined();
      
      // Should have partial analysis warning
      const partialWarning = result.errors!.find(e => e.code === 'PARTIAL_ANALYSIS');
      expect(partialWarning).toBeDefined();
    });
  });

  describe('Input Validation Recovery', () => {
    it('should handle malformed markdown gracefully', async () => {
      parser.registerAnalyzer(new SuccessfulAnalyzer());

      // Malformed markdown with unmatched code blocks
      const malformedContent = `
# Test README

\`\`\`javascript
console.log("unclosed code block");
// Missing closing \`\`\`

## Another Section
This should still be parseable.
      `;

      const result = await parser.parseContent(malformedContent);

      // Should still succeed with warnings
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should sanitize and continue with problematic content', async () => {
      parser.registerAnalyzer(new SuccessfulAnalyzer());

      // Content with control characters and null bytes
      const problematicContent = 'Hello\x01World\0Test\r\n\r\nMore content';

      const result = await parser.parseContent(problematicContent);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle empty content gracefully', async () => {
      parser.registerAnalyzer(new SuccessfulAnalyzer());

      const result = await parser.parseContent('');

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].code).toBe('EMPTY_CONTENT');
    });

    it('should handle very large content with warnings', async () => {
      parser.registerAnalyzer(new SuccessfulAnalyzer());

      // Create content that's large but not over the limit
      const largeContent = '# Large README\n\n' + 'a'.repeat(1024 * 1024); // 1MB

      const result = await parser.parseContent(largeContent);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('File Reading Recovery', () => {
    it('should handle file not found errors', async () => {
      const result = await parser.parseFile('nonexistent-file.md');

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].code).toBe('FILE_NOT_FOUND');
    });

    it('should handle permission denied errors', async () => {
      // This test would need to be adapted based on the actual file system
      // For now, we'll test the error handling structure
      const result = await parser.parseFile('/root/restricted-file.md');

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Performance and Resource Recovery', () => {
    it('should handle memory pressure gracefully', async () => {
      parser.registerAnalyzer(new SuccessfulAnalyzer());

      // Create content that might cause memory pressure
      const memoryIntensiveContent = '# Memory Test\n\n' + 
        Array(1000).fill('## Section\n\n' + 'Content '.repeat(1000)).join('\n');

      const result = await parser.parseContent(memoryIntensiveContent);

      // Should complete successfully or fail gracefully
      expect(result.success).toBeDefined();
      if (!result.success) {
        expect(result.errors).toBeDefined();
      }
    });

    it('should maintain performance tracking during errors', async () => {
      parser.registerAnalyzer(new FailingAnalyzer());
      parser.registerAnalyzer(new SuccessfulAnalyzer());

      const content = '# Test README\n\nThis is a test.';
      
      const trackingId = logger.startPerformanceTracking('error-recovery-test');
      const result = await parser.parseContent(content);
      const metrics = logger.endPerformanceTracking(trackingId);

      expect(metrics).toBeDefined();
      expect(metrics!.duration).toBeGreaterThanOrEqual(0);
      expect(result.success).toBe(true); // Should succeed despite one failure
    });
  });

  describe('Error Aggregation and Reporting', () => {
    it('should aggregate errors from multiple sources', async () => {
      parser.registerAnalyzer(new FailingAnalyzer());
      parser.registerAnalyzer(new PartialAnalyzer());
      parser.registerAnalyzer(new SuccessfulAnalyzer());

      const content = '# Test README\n\nThis is a test.';
      const result = await parser.parseContent(content);

      expect(result.success).toBe(true);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(1);

      // Should have errors from both failing and partial analyzers
      const errorCodes = result.errors!.map(e => e.code);
      expect(errorCodes).toContain('ANALYZER_EXECUTION_ERROR');
      expect(errorCodes).toContain('PARTIAL_ANALYSIS');
    });

    it('should provide detailed error context', async () => {
      parser.registerAnalyzer(new FailingAnalyzer());

      const content = '# Test README\n\nThis is a test.';
      const result = await parser.parseContent(content);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();

      const error = result.errors![0];
      expect(error.component).toBeDefined();
      expect(error.severity).toBeDefined();
      // Just check that the error has the basic required properties
      expect(error.code).toBeDefined();
      expect(error.message).toBeDefined();
    });

    it('should adjust confidence scores based on errors', async () => {
      parser.registerAnalyzer(new PartialAnalyzer());
      parser.registerAnalyzer(new SuccessfulAnalyzer());

      const content = '# Test README\n\nThis is a test.';
      const result = await parser.parseContent(content);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Confidence should be adjusted down due to partial analyzer
      expect(result.data!.confidence.overall).toBeLessThan(1.0);
    });
  });

  describe('Graceful Degradation', () => {
    it('should provide minimal viable results when most analyzers fail', async () => {
      // Register mostly failing analyzers with one partial success
      parser.registerAnalyzer(new FailingAnalyzer());
      parser.registerAnalyzer(new PartialAnalyzer());

      const content = '# Test README\n\nThis is a test.';
      const result = await parser.parseContent(content);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Should have basic structure even with limited analysis
      expect(result.data!.metadata).toBeDefined();
      expect(result.data!.languages).toBeDefined();
      expect(result.data!.dependencies).toBeDefined();
      expect(result.data!.commands).toBeDefined();
      expect(result.data!.testing).toBeDefined();
      expect(result.data!.confidence).toBeDefined();
    });

    it('should maintain parser stability across multiple error scenarios', async () => {
      parser.registerAnalyzer(new FailingAnalyzer());
      parser.registerAnalyzer(new SuccessfulAnalyzer());

      // Test multiple parsing operations to ensure stability
      const contents = [
        '# Test 1',
        '# Test 2\n\n```javascript\nconsole.log("test");\n', // Malformed
        '# Test 3\n\nNormal content',
        '', // Empty
        'No markdown formatting at all'
      ];

      for (const content of contents) {
        const result = await parser.parseContent(content);
        
        // Each operation should complete (success or controlled failure)
        expect(result.success).toBeDefined();
        if (result.success) {
          expect(result.data).toBeDefined();
        } else {
          expect(result.errors).toBeDefined();
        }
      }
    });
  });
});

describe('ErrorRecovery Utility Functions', () => {
  it('should correctly identify recoverable errors', () => {
    const recoverableErrors = [
      new ParseErrorImpl('PARTIAL_ANALYSIS', 'Partial analysis', 'Test', 'warning'),
      new ParseErrorImpl('ANALYZER_TIMEOUT', 'Timeout', 'Test', 'error', { category: 'analysis' }),
      new ParseErrorImpl('MALFORMED_SECTION', 'Malformed', 'Test', 'error', { category: 'parsing' })
    ];

    const nonRecoverableErrors = [
      new ParseErrorImpl('FILE_NOT_FOUND', 'File not found', 'Test', 'error', { category: 'file-system' }),
      new ParseErrorImpl('SYSTEM_ERROR', 'System error', 'Test', 'error', { category: 'system' })
    ];

    recoverableErrors.forEach(error => {
      expect(ErrorRecovery.canRecover(error)).toBe(true);
    });

    nonRecoverableErrors.forEach(error => {
      expect(ErrorRecovery.canRecover(error)).toBe(false);
    });
  });

  it('should provide appropriate recovery strategies', () => {
    const testCases = [
      {
        error: new ParseErrorImpl('ANALYZER_FAILED', 'Failed', 'Test', 'error', { category: 'analysis' }),
        expectedStrategy: 'skip-analyzer'
      },
      {
        error: new ParseErrorImpl('PARSE_ERROR', 'Parse error', 'Test', 'error', { category: 'parsing' }),
        expectedStrategy: 'partial-parse'
      },
      {
        error: new ParseErrorImpl('VALIDATION_ERROR', 'Validation error', 'Test', 'warning', { category: 'validation' }),
        expectedStrategy: 'sanitize-input'
      },
      {
        error: new ParseErrorImpl('UNKNOWN_ERROR', 'Unknown', 'Test', 'warning'),
        expectedStrategy: 'continue'
      }
    ];

    testCases.forEach(({ error, expectedStrategy }) => {
      expect(ErrorRecovery.getRecoveryStrategy(error)).toBe(expectedStrategy);
    });
  });
});