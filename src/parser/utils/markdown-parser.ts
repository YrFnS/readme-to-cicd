/**
 * MarkdownParser - Wrapper around marked library for AST generation with error handling
 */

import { marked, Token, Lexer } from 'marked';
import { ParseError, Result, MarkdownAST } from '../types';

/**
 * Custom error class for markdown parsing operations
 */
export class MarkdownParseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly line?: number,
    public readonly column?: number,
    public readonly originalError?: Error
  ) {
    super(`Markdown parse failed: ${message}`);
    this.name = 'MarkdownParseError';
  }
}

/**
 * Markdown parsing result with metadata
 */
export interface MarkdownParseResult {
  ast: MarkdownAST;
  rawContent: string;
  tokenCount: number;
  processingTime: number;
}

/**
 * Configuration options for markdown parsing
 */
export interface MarkdownParserOptions {
  gfm?: boolean;           // GitHub Flavored Markdown
  breaks?: boolean;        // Convert \n to <br>
  pedantic?: boolean;      // Conform to original markdown.pl
  sanitize?: boolean;      // Sanitize HTML
  smartLists?: boolean;    // Use smarter list behavior
  smartypants?: boolean;   // Use "smart" typographic punctuation
}

/**
 * MarkdownParser class with comprehensive error handling and validation
 */
export class MarkdownParser {
  private lexer: Lexer;
  private options: MarkdownParserOptions;

  constructor(options: MarkdownParserOptions = {}) {
    this.options = {
      gfm: true,              // Enable GitHub Flavored Markdown by default
      breaks: false,          // Don't convert \n to <br> by default
      pedantic: false,        // Use modern behavior
      sanitize: false,        // Don't sanitize HTML (we're parsing, not rendering)
      smartLists: true,       // Use smarter list behavior
      smartypants: false,     // Don't use smart punctuation
      ...options
    };

    // Configure marked with our options
    marked.setOptions(this.options);
    this.lexer = new Lexer(this.options);
  }

  /**
   * Parse markdown content to AST with comprehensive error handling
   */
  async parseContent(content: string): Promise<Result<MarkdownParseResult, ParseError>> {
    const startTime = Date.now();

    try {
      // Validate input content
      const validationResult = this.validateContent(content);
      if (!validationResult.success) {
        return validationResult as Result<MarkdownParseResult, ParseError>;
      }

      // Normalize content for consistent parsing
      const normalizedContent = this.normalizeContent(content);

      // Parse to AST using marked lexer
      const ast = this.lexer.lex(normalizedContent);

      // Validate generated AST
      const astValidation = this.validateAST(ast);
      if (!astValidation.success) {
        return astValidation as Result<MarkdownParseResult, ParseError>;
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: {
          ast,
          rawContent: normalizedContent,
          tokenCount: ast.length,
          processingTime
        }
      };

    } catch (error) {
      return this.handleParseError(error, content);
    }
  }

  /**
   * Parse markdown content synchronously (for cases where async is not needed)
   */
  parseContentSync(content: string): Result<MarkdownParseResult, ParseError> {
    const startTime = Date.now();

    try {
      // Validate input content
      const validationResult = this.validateContent(content);
      if (!validationResult.success) {
        return validationResult as Result<MarkdownParseResult, ParseError>;
      }

      // Normalize content for consistent parsing
      const normalizedContent = this.normalizeContent(content);

      // Parse to AST using marked lexer
      const ast = this.lexer.lex(normalizedContent);

      // Validate generated AST
      const astValidation = this.validateAST(ast);
      if (!astValidation.success) {
        return astValidation as Result<MarkdownParseResult, ParseError>;
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: {
          ast,
          rawContent: normalizedContent,
          tokenCount: ast.length,
          processingTime
        }
      };

    } catch (error) {
      return this.handleParseError(error, content);
    }
  }

  /**
   * Get parser configuration
   */
  getOptions(): MarkdownParserOptions {
    return { ...this.options };
  }

  /**
   * Update parser configuration
   */
  setOptions(options: Partial<MarkdownParserOptions>): void {
    this.options = { ...this.options, ...options };
    marked.setOptions(this.options);
    this.lexer = new Lexer(this.options);
  }

  /**
   * Validate markdown content before parsing
   */
  private validateContent(content: string): Result<void, ParseError> {
    if (typeof content !== 'string') {
      return {
        success: false,
        error: {
          code: 'INVALID_CONTENT_TYPE',
          message: 'Content must be a string',
          component: 'MarkdownParser',
          severity: 'error'
        }
      };
    }

    if (content.length === 0) {
      return {
        success: false,
        error: {
          code: 'EMPTY_CONTENT',
          message: 'Content cannot be empty',
          component: 'MarkdownParser',
          severity: 'error'
        }
      };
    }

    // Check for extremely large content that might cause performance issues
    const MAX_CONTENT_SIZE = 5 * 1024 * 1024; // 5MB
    if (content.length > MAX_CONTENT_SIZE) {
      return {
        success: false,
        error: {
          code: 'CONTENT_TOO_LARGE',
          message: `Content size (${content.length} characters) exceeds maximum allowed size (${MAX_CONTENT_SIZE} characters)`,
          component: 'MarkdownParser',
          severity: 'error'
        }
      };
    }

    return { success: true, data: undefined };
  }

  /**
   * Normalize content for consistent parsing
   */
  private normalizeContent(content: string): string {
    // Normalize line endings to \n
    let normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Remove trailing whitespace from lines
    normalized = normalized.replace(/[ \t]+$/gm, '');
    
    // Ensure content ends with a newline
    if (!normalized.endsWith('\n')) {
      normalized += '\n';
    }

    return normalized;
  }

  /**
   * Validate generated AST
   */
  private validateAST(ast: Token[]): Result<void, ParseError> {
    if (!Array.isArray(ast)) {
      return {
        success: false,
        error: {
          code: 'INVALID_AST',
          message: 'Generated AST is not an array',
          component: 'MarkdownParser',
          severity: 'error'
        }
      };
    }

    // Check for basic token structure
    for (let i = 0; i < ast.length; i++) {
      const token = ast[i];
      if (!token || typeof token !== 'object' || !token.type) {
        return {
          success: false,
          error: {
            code: 'MALFORMED_TOKEN',
            message: `Token at index ${i} is malformed or missing required 'type' property`,
            component: 'MarkdownParser',
            severity: 'error',
            details: { tokenIndex: i, token }
          }
        };
      }
    }

    return { success: true, data: undefined };
  }

  /**
   * Handle parsing errors with detailed error information
   */
  private handleParseError(error: unknown, content: string): Result<MarkdownParseResult, ParseError> {
    if (error instanceof Error) {
      let code = 'PARSE_ERROR';
      let message = error.message;
      let line: number | undefined;
      let column: number | undefined;

      // Try to extract line/column information from error message
      const lineMatch = error.message.match(/line (\d+)/i);
      const columnMatch = error.message.match(/column (\d+)/i);
      
      if (lineMatch && lineMatch[1]) {
        line = parseInt(lineMatch[1], 10);
      }
      if (columnMatch && columnMatch[1]) {
        column = parseInt(columnMatch[1], 10);
      }

      // Categorize specific error types
      if (error.message.includes('Unexpected token')) {
        code = 'SYNTAX_ERROR';
        message = 'Markdown syntax error: ' + error.message;
      } else if (error.message.includes('Maximum call stack')) {
        code = 'STACK_OVERFLOW';
        message = 'Content too complex or deeply nested';
      } else if (error.message.includes('out of memory')) {
        code = 'OUT_OF_MEMORY';
        message = 'Content too large to process';
      }

      const errorResult: ParseError = {
        code,
        message,
        component: 'MarkdownParser',
        severity: 'error',
        details: {
          originalError: error.message,
          contentLength: content.length,
          contentPreview: content.substring(0, 100) + (content.length > 100 ? '...' : '')
        }
      };

      if (line !== undefined) errorResult.line = line;
      if (column !== undefined) errorResult.column = column;

      return {
        success: false,
        error: errorResult
      };
    }

    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unknown error occurred while parsing markdown',
        component: 'MarkdownParser',
        severity: 'error',
        details: {
          contentLength: content.length
        }
      }
    };
  }

  /**
   * Extract specific token types from AST
   */
  extractTokensByType(ast: Token[], tokenType: string): Token[] {
    return ast.filter(token => token.type === tokenType);
  }

  /**
   * Find code blocks with specific language
   */
  findCodeBlocks(ast: Token[], language?: string): Token[] {
    const codeBlocks = ast.filter(token => token.type === 'code');
    
    if (!language) {
      return codeBlocks;
    }

    return codeBlocks.filter(token => {
      const lang = (token as any).lang;
      return lang && lang.toLowerCase() === language.toLowerCase();
    });
  }

  /**
   * Extract all text content from AST
   */
  extractTextContent(ast: Token[]): string {
    let textContent = '';
    
    const extractFromToken = (token: Token): void => {
      if ('text' in token && typeof token.text === 'string') {
        textContent += token.text + ' ';
      }
      
      if ('tokens' in token && Array.isArray(token.tokens)) {
        token.tokens.forEach(extractFromToken);
      }
    };

    ast.forEach(extractFromToken);
    
    return textContent.trim();
  }
}