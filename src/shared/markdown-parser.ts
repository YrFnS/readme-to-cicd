/**
 * Shared markdown parsing utilities and types
 */

import { Token } from 'marked';

// Re-export Token types from marked for convenience
export type MarkdownAST = Token[];
export type MarkdownNode = Token;

// Export commonly used token types
export { Token } from 'marked';

/**
 * Utility functions for working with markdown AST
 */
export class MarkdownUtils {
  /**
   * Find all nodes of a specific type in the AST
   */
  static findNodesByType(ast: MarkdownAST, type: string): Token[] {
    const results: Token[] = [];
    
    function traverse(nodes: Token[]) {
      for (const node of nodes) {
        if (node.type === type) {
          results.push(node);
        }
        
        // Traverse child nodes if they exist
        if ('tokens' in node && Array.isArray(node.tokens)) {
          traverse(node.tokens);
        }
      }
    }
    
    traverse(ast);
    return results;
  }

  /**
   * Extract text content from a node
   */
  static extractText(node: Token): string {
    if ('text' in node && typeof node.text === 'string') {
      return node.text;
    }
    
    if ('tokens' in node && Array.isArray(node.tokens)) {
      return node.tokens.map(token => this.extractText(token)).join('');
    }
    
    return '';
  }

  /**
   * Safely get the value/text from a code token
   */
  static getCodeValue(node: Token): string | null {
    if (node.type === 'code') {
      // Try different possible properties for code content
      if ('text' in node && typeof node.text === 'string') {
        return node.text;
      }
      if ('raw' in node && typeof node.raw === 'string') {
        return node.raw;
      }
    }
    return null;
  }

  /**
   * Safely get text from a heading token
   */
  static getHeadingText(node: Token): string | null {
    if (node.type === 'heading') {
      if ('text' in node && typeof node.text === 'string') {
        return node.text;
      }
      if ('tokens' in node && Array.isArray(node.tokens)) {
        return node.tokens.map(token => this.extractText(token)).join('');
      }
    }
    return null;
  }

  /**
   * Find code blocks with specific language
   */
  static findCodeBlocks(ast: MarkdownAST, language?: string): Token[] {
    const codeBlocks = this.findNodesByType(ast, 'code');
    
    if (!language) {
      return codeBlocks;
    }
    
    return codeBlocks.filter(block => {
      if ('lang' in block && typeof block.lang === 'string') {
        return block.lang.toLowerCase() === language.toLowerCase();
      }
      return false;
    });
  }

  /**
   * Find headings by level
   */
  static findHeadings(ast: MarkdownAST, level?: number): Token[] {
    const headings = this.findNodesByType(ast, 'heading');
    
    if (level === undefined) {
      return headings;
    }
    
    return headings.filter(heading => {
      if ('depth' in heading && typeof heading.depth === 'number') {
        return heading.depth === level;
      }
      return false;
    });
  }
}