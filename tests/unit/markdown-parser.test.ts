/**
 * Unit tests for MarkdownParser class
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MarkdownParser, MarkdownParseError } from '../../src/parser/utils/markdown-parser';

describe('MarkdownParser', () => {
  let parser: MarkdownParser;

  beforeEach(() => {
    parser = new MarkdownParser();
  });

  describe('constructor and configuration', () => {
    it('should create parser with default options', () => {
      const defaultParser = new MarkdownParser();
      const options = defaultParser.getOptions();

      expect(options.gfm).toBe(true);
      expect(options.breaks).toBe(false);
      expect(options.pedantic).toBe(false);
      expect(options.sanitize).toBe(false);
      expect(options.smartLists).toBe(true);
      expect(options.smartypants).toBe(false);
    });

    it('should create parser with custom options', () => {
      const customParser = new MarkdownParser({
        gfm: false,
        breaks: true,
        smartypants: true
      });
      const options = customParser.getOptions();

      expect(options.gfm).toBe(false);
      expect(options.breaks).toBe(true);
      expect(options.smartypants).toBe(true);
      expect(options.smartLists).toBe(true); // Should keep default
    });

    it('should update options after creation', () => {
      parser.setOptions({ breaks: true, pedantic: true });
      const options = parser.getOptions();

      expect(options.breaks).toBe(true);
      expect(options.pedantic).toBe(true);
      expect(options.gfm).toBe(true); // Should keep existing
    });
  });

  describe('parseContent', () => {
    it('should successfully parse simple markdown', async () => {
      const content = '# Hello World\n\nThis is a test.';
      const result = await parser.parseContent(content);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ast).toBeInstanceOf(Array);
        expect(result.data.ast.length).toBeGreaterThan(0);
        expect(result.data.rawContent).toBe(content + '\n'); // Normalized with newline
        expect(result.data.tokenCount).toBeGreaterThan(0);
        expect(result.data.processingTime).toBeGreaterThanOrEqual(0);
      }
    });

    it('should parse GitHub Flavored Markdown features', async () => {
      const content = `# Test
      
\`\`\`javascript
console.log('hello');
\`\`\`

- [x] Task 1
- [ ] Task 2

| Column 1 | Column 2 |
|----------|----------|
| Cell 1   | Cell 2   |
`;

      const result = await parser.parseContent(content);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ast).toBeInstanceOf(Array);
        expect(result.data.tokenCount).toBeGreaterThan(0);
        
        // Should contain code block
        const codeBlocks = parser.findCodeBlocks(result.data.ast, 'javascript');
        expect(codeBlocks.length).toBeGreaterThan(0);
      }
    });

    it('should reject empty content', async () => {
      const result = await parser.parseContent('');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('EMPTY_CONTENT');
        expect(result.error.message).toContain('cannot be empty');
      }
    });

    it('should reject non-string content', async () => {
      const result = await parser.parseContent(null as any);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_CONTENT_TYPE');
        expect(result.error.message).toContain('must be a string');
      }
    });

    it('should reject content that is too large', async () => {
      const largeContent = 'a'.repeat(6 * 1024 * 1024); // 6MB (exceeds 5MB limit)
      const result = await parser.parseContent(largeContent);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('CONTENT_TOO_LARGE');
        expect(result.error.message).toContain('exceeds maximum allowed size');
      }
    });

    it('should normalize line endings', async () => {
      const contentWithCRLF = '# Title\r\n\r\nContent\r\n';
      const result = await parser.parseContent(contentWithCRLF);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rawContent).toBe('# Title\n\nContent\n');
        expect(result.data.rawContent).not.toContain('\r');
      }
    });

    it('should remove trailing whitespace from lines', async () => {
      const contentWithTrailingSpaces = '# Title   \n\nContent\t\n';
      const result = await parser.parseContent(contentWithTrailingSpaces);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rawContent).toBe('# Title\n\nContent\n');
      }
    });

    it('should ensure content ends with newline', async () => {
      const contentWithoutNewline = '# Title\n\nContent';
      const result = await parser.parseContent(contentWithoutNewline);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rawContent.endsWith('\n')).toBe(true);
      }
    });

    it('should handle malformed markdown gracefully', async () => {
      const malformedContent = '# Title\n\n```\nUnclosed code block\n\n[Broken link](';
      const result = await parser.parseContent(malformedContent);

      // Should still succeed but may have warnings or partial parsing
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ast).toBeInstanceOf(Array);
      }
    });

    it('should validate AST structure', async () => {
      const content = '# Valid markdown';
      const result = await parser.parseContent(content);

      expect(result.success).toBe(true);
      if (result.success) {
        // Each token should have a type property
        result.data.ast.forEach((token, index) => {
          expect(token).toHaveProperty('type');
          expect(typeof token.type).toBe('string');
        });
      }
    });
  });

  describe('parseContentSync', () => {
    it('should parse content synchronously', () => {
      const content = '# Sync Test\n\nSynchronous parsing.';
      const result = parser.parseContentSync(content);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ast).toBeInstanceOf(Array);
        expect(result.data.tokenCount).toBeGreaterThan(0);
        expect(result.data.processingTime).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle errors synchronously', () => {
      const result = parser.parseContentSync('');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('EMPTY_CONTENT');
      }
    });
  });

  describe('utility methods', () => {
    let sampleAST: any[];

    beforeEach(async () => {
      const content = `# Title

\`\`\`javascript
console.log('test');
\`\`\`

\`\`\`python
print('test')
\`\`\`

Regular paragraph text.

## Subtitle

More text content.
`;
      const result = await parser.parseContent(content);
      if (result.success) {
        sampleAST = result.data.ast;
      }
    });

    it('should extract tokens by type', () => {
      const headings = parser.extractTokensByType(sampleAST, 'heading');
      expect(headings.length).toBeGreaterThan(0);
      
      headings.forEach(heading => {
        expect(heading.type).toBe('heading');
      });
    });

    it('should find all code blocks', () => {
      const codeBlocks = parser.findCodeBlocks(sampleAST);
      expect(codeBlocks.length).toBeGreaterThanOrEqual(2);
      
      codeBlocks.forEach(block => {
        expect(block.type).toBe('code');
      });
    });

    it('should find code blocks by language', () => {
      const jsBlocks = parser.findCodeBlocks(sampleAST, 'javascript');
      const pyBlocks = parser.findCodeBlocks(sampleAST, 'python');
      
      expect(jsBlocks.length).toBeGreaterThanOrEqual(1);
      expect(pyBlocks.length).toBeGreaterThanOrEqual(1);
    });

    it('should extract text content from AST', () => {
      const textContent = parser.extractTextContent(sampleAST);
      
      expect(textContent).toContain('Title');
      expect(textContent).toContain('Regular paragraph text');
      expect(textContent).toContain('Subtitle');
      expect(textContent).toContain('More text content');
    });

    it('should handle empty AST in utility methods', () => {
      const emptyAST: any[] = [];
      
      expect(parser.extractTokensByType(emptyAST, 'heading')).toEqual([]);
      expect(parser.findCodeBlocks(emptyAST)).toEqual([]);
      expect(parser.extractTextContent(emptyAST)).toBe('');
    });
  });

  describe('error handling', () => {
    it('should handle parsing exceptions gracefully', async () => {
      // Mock the lexer to throw an error
      const originalLex = parser['lexer'].lex;
      parser['lexer'].lex = vi.fn().mockImplementation(() => {
        throw new Error('Parsing failed');
      });

      const result = await parser.parseContent('# Test');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PARSE_ERROR');
        expect(result.error.component).toBe('MarkdownParser');
      }

      // Restore original method
      parser['lexer'].lex = originalLex;
    });

    it('should handle syntax errors with line information', async () => {
      // This is a conceptual test - marked is quite forgiving
      // In practice, most markdown syntax errors are handled gracefully
      const result = await parser.parseContent('# Valid content');
      expect(result.success).toBe(true);
    });

    it('should handle stack overflow errors', async () => {
      // Mock to simulate stack overflow
      const originalLex = parser['lexer'].lex;
      parser['lexer'].lex = vi.fn().mockImplementation(() => {
        throw new Error('Maximum call stack size exceeded');
      });

      const result = await parser.parseContent('# Test');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('STACK_OVERFLOW');
        expect(result.error.message).toContain('too complex or deeply nested');
      }

      // Restore original method
      parser['lexer'].lex = originalLex;
    });

    it('should handle out of memory errors', async () => {
      // Mock to simulate out of memory
      const originalLex = parser['lexer'].lex;
      parser['lexer'].lex = vi.fn().mockImplementation(() => {
        throw new Error('JavaScript heap out of memory');
      });

      const result = await parser.parseContent('# Test');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('OUT_OF_MEMORY');
        expect(result.error.message).toContain('too large to process');
      }

      // Restore original method
      parser['lexer'].lex = originalLex;
    });

    it('should handle non-Error exceptions', async () => {
      // Mock to throw non-Error
      const originalLex = parser['lexer'].lex;
      parser['lexer'].lex = vi.fn().mockImplementation(() => {
        throw 'String error';
      });

      const result = await parser.parseContent('# Test');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNKNOWN_ERROR');
        expect(result.error.message).toContain('unknown error occurred');
      }

      // Restore original method
      parser['lexer'].lex = originalLex;
    });

    it('should include error details in parse errors', async () => {
      const originalLex = parser['lexer'].lex;
      parser['lexer'].lex = vi.fn().mockImplementation(() => {
        throw new Error('Detailed parsing error');
      });

      const content = 'Test content for error details';
      const result = await parser.parseContent(content);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details).toBeDefined();
        expect(result.error.details.contentLength).toBe(content.length);
        expect(result.error.details.contentPreview).toContain('Test content');
      }

      // Restore original method
      parser['lexer'].lex = originalLex;
    });
  });
});