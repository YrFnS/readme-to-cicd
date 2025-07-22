/**
 * Test for the updated ReadmeParserImpl using FileReader and MarkdownParser
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { ReadmeParserImpl } from '../../src/parser/readme-parser';

describe('Updated ReadmeParserImpl', () => {
  let parser: ReadmeParserImpl;
  let testFilePath: string;

  beforeEach(() => {
    parser = new ReadmeParserImpl();
    testFilePath = join(process.cwd(), 'test-parser-readme.md');
  });

  afterEach(async () => {
    // Clean up test file if it exists
    try {
      await fs.unlink(testFilePath);
    } catch {
      // File might not exist, ignore error
    }
  });

  it('should parse content using the new MarkdownParser', async () => {
    const content = `# Test Project

This is a test project.

\`\`\`javascript
console.log('hello');
\`\`\`
`;

    const result = await parser.parseContent(content);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeDefined();
      expect(result.data.metadata).toBeDefined();
      expect(result.data.languages).toBeDefined();
      expect(result.data.dependencies).toBeDefined();
      expect(result.data.commands).toBeDefined();
      expect(result.data.testing).toBeDefined();
      expect(result.data.confidence).toBeDefined();
    }
  });

  it('should parse file using the new FileReader', async () => {
    const content = `# File Test

This tests file reading.
`;

    await fs.writeFile(testFilePath, content, 'utf8');

    const result = await parser.parseFile(testFilePath);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeDefined();
    }
  });

  it('should handle file not found errors', async () => {
    const result = await parser.parseFile('non-existent-file.md');
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.errors![0].code).toBe('FILE_NOT_FOUND');
    }
  });

  it('should handle empty content errors', async () => {
    const result = await parser.parseContent('');
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.errors![0].code).toBe('EMPTY_CONTENT');
    }
  });

  it('should handle no analyzers registered', async () => {
    const content = '# Test';
    
    const result = await parser.parseContent(content);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.errors![0].code).toBe('NO_ANALYZERS');
    }
  });
});