/**
 * Integration tests for ResultAggregator with ReadmeParserImpl
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReadmeParserImpl } from '../../src/parser/readme-parser';
import { BaseAnalyzer } from '../../src/parser/analyzers/base-analyzer';
import { AnalysisResult, MarkdownAST } from '../../src/parser/types';

// Mock analyzer for testing
class MockLanguageAnalyzer extends BaseAnalyzer {
  readonly name = 'language';

  async analyze(ast: MarkdownAST, rawContent: string): Promise<AnalysisResult> {
    return this.createResult(
      {
        languages: [
          { name: 'TypeScript', confidence: 0.9, sources: ['code-block'], frameworks: ['Node.js'] }
        ]
      },
      0.9,
      ['code-block']
    );
  }
}

class MockDependencyAnalyzer extends BaseAnalyzer {
  readonly name = 'dependency';

  async analyze(ast: MarkdownAST, rawContent: string): Promise<AnalysisResult> {
    return this.createResult(
      {
        packageFiles: [{ name: 'package.json', type: 'npm', mentioned: true, confidence: 0.8 }],
        installCommands: [{ command: 'npm install', confidence: 0.8 }],
        packages: []
      },
      0.8,
      ['file-reference']
    );
  }
}

class MockMetadataAnalyzer extends BaseAnalyzer {
  readonly name = 'metadata';

  async analyze(ast: MarkdownAST, rawContent: string): Promise<AnalysisResult> {
    return this.createResult(
      {
        name: 'test-project',
        description: 'A test project for README parsing',
        structure: ['src/', 'tests/'],
        environment: []
      },
      0.7,
      ['text-mention']
    );
  }
}

describe('ResultAggregator Integration', () => {
  let parser: ReadmeParserImpl;

  beforeEach(() => {
    parser = new ReadmeParserImpl();
  });

  it('should integrate ResultAggregator with parser when analyzers are registered', async () => {
    // Register mock analyzers
    parser.registerAnalyzer(new MockLanguageAnalyzer());
    parser.registerAnalyzer(new MockDependencyAnalyzer());
    parser.registerAnalyzer(new MockMetadataAnalyzer());

    const content = `
# Test Project

A test project for README parsing.

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`typescript
import { parser } from './src/parser';
\`\`\`
`;

    const result = await parser.parseContent(content);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeDefined();
      expect(result.data.metadata.name).toBe('test-project');
      expect(result.data.languages).toHaveLength(1);
      expect(result.data.languages[0].name).toBe('TypeScript');
      expect(result.data.dependencies.packageFiles).toHaveLength(1);
      expect(result.data.confidence.overall).toBeGreaterThan(0);
    }
  });

  it('should handle analyzer errors gracefully through ResultAggregator', async () => {
    // Create an analyzer that throws an error
    class ErrorAnalyzer extends BaseAnalyzer {
      readonly name = 'error-analyzer';

      async analyze(): Promise<AnalysisResult> {
        throw new Error('Test analyzer error');
      }
    }

    parser.registerAnalyzer(new ErrorAnalyzer());
    parser.registerAnalyzer(new MockLanguageAnalyzer());

    const result = await parser.parseContent('# Test');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeDefined();
      expect(result.data.languages).toHaveLength(1); // Language analyzer still worked
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
      expect(result.errors?.[0].component).toBe('error-analyzer');
    }
  });

  it('should aggregate confidence scores correctly', async () => {
    parser.registerAnalyzer(new MockLanguageAnalyzer()); // confidence: 0.9
    parser.registerAnalyzer(new MockDependencyAnalyzer()); // confidence: 0.8
    parser.registerAnalyzer(new MockMetadataAnalyzer()); // confidence: 0.7

    const result = await parser.parseContent('# Test Project');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.confidence.languages).toBe(0.9);
      expect(result.data.confidence.dependencies).toBe(0.8);
      expect(result.data.confidence.metadata).toBe(0.7);
      expect(result.data.confidence.overall).toBeGreaterThan(0);
      expect(result.data.confidence.overall).toBeLessThanOrEqual(1);
    }
  });

  it('should handle empty analyzer results', async () => {
    // Don't register any analyzers
    const result = await parser.parseContent('# Test');

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0].code).toBe('NO_ANALYZERS');
  });
});