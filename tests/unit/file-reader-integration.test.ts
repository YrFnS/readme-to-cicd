/**
 * Integration tests for FileReader and MarkdownParser working together
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { FileReader } from '../../src/parser/utils/file-reader';
import { MarkdownParser } from '../../src/parser/utils/markdown-parser';

describe('FileReader + MarkdownParser Integration', () => {
  let fileReader: FileReader;
  let markdownParser: MarkdownParser;
  let testFilePath: string;

  beforeEach(async () => {
    fileReader = new FileReader();
    markdownParser = new MarkdownParser();
    testFilePath = join(process.cwd(), 'test-readme.md');
  });

  afterEach(async () => {
    // Clean up test file if it exists
    try {
      await fs.unlink(testFilePath);
    } catch {
      // File might not exist, ignore error
    }
  });

  it('should read and parse a real markdown file', async () => {
    // Create a test README file
    const testContent = `# Test Project

This is a test project written in **JavaScript**.

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`javascript
const app = require('./app');
app.start();
\`\`\`

## Testing

Run tests with:

\`\`\`bash
npm test
\`\`\`
`;

    await fs.writeFile(testFilePath, testContent, 'utf8');

    // Read the file
    const readResult = await fileReader.readFile(testFilePath);
    expect(readResult.success).toBe(true);

    if (readResult.success) {
      // Parse the content
      const parseResult = await markdownParser.parseContent(readResult.data.content);
      expect(parseResult.success).toBe(true);

      if (parseResult.success) {
        // Verify the AST contains expected elements
        expect(parseResult.data.ast.length).toBeGreaterThan(0);
        expect(parseResult.data.tokenCount).toBeGreaterThan(0);

        // Find code blocks
        const codeBlocks = markdownParser.findCodeBlocks(parseResult.data.ast);
        expect(codeBlocks.length).toBe(3); // bash, javascript, bash

        const jsBlocks = markdownParser.findCodeBlocks(parseResult.data.ast, 'javascript');
        expect(jsBlocks.length).toBe(1);

        const bashBlocks = markdownParser.findCodeBlocks(parseResult.data.ast, 'bash');
        expect(bashBlocks.length).toBe(2);

        // Extract text content
        const textContent = markdownParser.extractTextContent(parseResult.data.ast);
        expect(textContent).toContain('Test Project');
        expect(textContent).toContain('JavaScript');
        expect(textContent).toContain('Installation');
      }
    }
  });

  it('should handle file reading errors gracefully', async () => {
    const nonExistentPath = join(process.cwd(), 'non-existent-file.md');
    
    const readResult = await fileReader.readFile(nonExistentPath);
    expect(readResult.success).toBe(false);
    
    if (!readResult.success) {
      expect(readResult.error.code).toBe('FILE_NOT_FOUND');
      expect(readResult.error.component).toBe('FileReader');
    }
  });

  it('should handle empty files gracefully', async () => {
    // Create an empty file
    await fs.writeFile(testFilePath, '', 'utf8');

    const readResult = await fileReader.readFile(testFilePath);
    expect(readResult.success).toBe(true);

    if (readResult.success) {
      // Try to parse empty content
      const parseResult = await markdownParser.parseContent(readResult.data.content);
      expect(parseResult.success).toBe(false);
      
      if (!parseResult.success) {
        expect(parseResult.error.code).toBe('EMPTY_CONTENT');
      }
    }
  });

  it('should handle whitespace-only files', async () => {
    // Create a file with only whitespace
    await fs.writeFile(testFilePath, '   \n\t  \n  ', 'utf8');

    const readResult = await fileReader.readFile(testFilePath);
    expect(readResult.success).toBe(true);

    if (readResult.success) {
      // Parse should succeed but normalize the content
      const parseResult = await markdownParser.parseContent(readResult.data.content);
      expect(parseResult.success).toBe(true);
      
      if (parseResult.success) {
        // Content should be normalized
        expect(parseResult.data.rawContent.trim()).toBe('');
        expect(parseResult.data.ast.length).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('should preserve file metadata through the pipeline', async () => {
    const testContent = '# Simple Test\n\nContent here.';
    await fs.writeFile(testFilePath, testContent, 'utf8');

    const readResult = await fileReader.readFile(testFilePath);
    expect(readResult.success).toBe(true);

    if (readResult.success) {
      // Verify file metadata
      expect(readResult.data.filePath).toContain('test-readme.md');
      expect(readResult.data.size).toBe(testContent.length);
      expect(readResult.data.encoding).toBe('utf8');

      // Parse and verify processing metadata
      const parseResult = await markdownParser.parseContent(readResult.data.content);
      expect(parseResult.success).toBe(true);

      if (parseResult.success) {
        expect(parseResult.data.processingTime).toBeGreaterThanOrEqual(0);
        expect(parseResult.data.tokenCount).toBeGreaterThan(0);
        expect(parseResult.data.rawContent).toContain('Simple Test');
      }
    }
  });
});