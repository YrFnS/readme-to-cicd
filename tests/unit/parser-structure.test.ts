/**
 * Test the basic parser structure and interfaces
 */

import { describe, it, expect } from 'vitest';
import { 
  createReadmeParser, 
  ReadmeParserImpl, 
  AnalyzerRegistry,
  BaseAnalyzer
} from '../../src/parser';

describe('Parser Structure', () => {
  it('should create a parser instance', () => {
    const parser = createReadmeParser();
    expect(parser).toBeInstanceOf(ReadmeParserImpl);
  });

  it('should have analyzer registry', () => {
    const registry = new AnalyzerRegistry();
    expect(registry).toBeDefined();
    expect(registry.size).toBe(0);
  });

  it('should handle empty content gracefully', async () => {
    const parser = createReadmeParser();
    const result = await parser.parseContent('');
    
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0]?.code).toBe('EMPTY_CONTENT');
  });

  it('should handle invalid file path', async () => {
    const parser = createReadmeParser();
    const result = await parser.parseFile('');
    
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0]?.code).toBe('INVALID_PATH');
  });

  it('should handle non-existent file', async () => {
    const parser = createReadmeParser();
    const result = await parser.parseFile('non-existent-file.md');
    
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0]?.code).toBe('FILE_NOT_FOUND');
  });
});