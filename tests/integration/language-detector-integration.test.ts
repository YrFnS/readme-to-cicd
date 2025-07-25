/**
 * Integration tests for LanguageDetector with real README files
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { LanguageDetector } from '../../src/parser/analyzers/language-detector';
import { MarkdownParser } from '../../src/parser/utils/markdown-parser';
import { LanguageInfo } from '../../src/parser/types';

describe('LanguageDetector Integration Tests', () => {
  let detector: LanguageDetector;
  let markdownParser: MarkdownParser;

  beforeEach(() => {
    detector = new LanguageDetector();
    markdownParser = new MarkdownParser();
  });

  const readSampleReadme = (filename: string): string => {
    const filePath = join(__dirname, '../fixtures/sample-readmes', filename);
    return readFileSync(filePath, 'utf-8');
  };

  describe('JavaScript Project Detection', () => {
    it('should accurately detect JavaScript project characteristics', async () => {
      const content = readSampleReadme('javascript-project.md');
      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      expect(result.confidence).toBeGreaterThan(0.6);
      
      const languages = result.data as LanguageInfo[];
      const jsLang = languages.find(lang => lang.name === 'JavaScript');
      
      expect(jsLang).toBeDefined();
      expect(jsLang!.confidence).toBeGreaterThan(0.7);
      
      // Should detect from multiple sources
      expect(jsLang!.sources).toContain('code-block');
      expect(jsLang!.sources).toContain('text-mention');
      expect(jsLang!.sources).toContain('file-reference');
      
      // JavaScript should be among the top detected languages
      const topLanguages = languages.slice(0, 2).map(lang => lang.name);
      expect(topLanguages).toContain('JavaScript');
    });
  });

  describe('Python Project Detection', () => {
    it('should accurately detect Python project characteristics', async () => {
      const content = readSampleReadme('python-project.md');
      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      expect(result.confidence).toBeGreaterThan(0.6);
      
      const languages = result.data as LanguageInfo[];
      const pyLang = languages.find(lang => lang.name === 'Python');
      
      expect(pyLang).toBeDefined();
      expect(pyLang!.confidence).toBeGreaterThan(0.7);
      
      // Should detect from multiple sources
      expect(pyLang!.sources).toContain('code-block');
      expect(pyLang!.sources).toContain('text-mention');
      expect(pyLang!.sources).toContain('file-reference');
      expect(pyLang!.sources).toContain('pattern-match');
      
      // Python should be among the top detected languages
      const topLanguages = languages.slice(0, 2).map(lang => lang.name);
      expect(topLanguages).toContain('Python');
    });
  });

  describe('Multi-Language Project Detection', () => {
    it('should detect multiple languages with appropriate confidence scores', async () => {
      const content = readSampleReadme('multi-language-project.md');
      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      expect(result.confidence).toBeGreaterThan(0.7);
      
      const languages = result.data as LanguageInfo[];
      const languageNames = languages.map(lang => lang.name);
      
      // Should detect all major languages
      expect(languageNames).toContain('TypeScript');
      expect(languageNames).toContain('JavaScript');
      expect(languageNames).toContain('C++');
      expect(languageNames).toContain('SQL');
      
      // Each language should have reasonable confidence
      languages.forEach(lang => {
        expect(lang.confidence).toBeGreaterThan(0.3);
      });
      
      // Languages should be sorted by confidence
      for (let i = 0; i < languages.length - 1; i++) {
        expect(languages[i].confidence).toBeGreaterThanOrEqual(languages[i + 1].confidence);
      }
      
      // TypeScript should likely be the primary language due to strong evidence
      const tsLang = languages.find(lang => lang.name === 'TypeScript');
      expect(tsLang).toBeDefined();
      expect(tsLang!.sources).toContain('code-block');
      expect(tsLang!.sources).toContain('text-mention');
      expect(tsLang!.sources).toContain('file-reference');
    });

    it('should provide detailed source information for each detected language', async () => {
      const content = readSampleReadme('multi-language-project.md');
      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, content);
      const languages = result.data as LanguageInfo[];
      
      // Check that each language has appropriate sources
      const tsLang = languages.find(lang => lang.name === 'TypeScript');
      const jsLang = languages.find(lang => lang.name === 'JavaScript');
      const cppLang = languages.find(lang => lang.name === 'C++');
      
      expect(tsLang?.sources).toEqual(expect.arrayContaining(['code-block', 'text-mention', 'file-reference']));
      expect(jsLang?.sources).toEqual(expect.arrayContaining(['code-block', 'text-mention', 'file-reference']));
      expect(cppLang?.sources).toEqual(expect.arrayContaining(['code-block', 'text-mention', 'file-reference']));
    });
  });

  describe('Performance with Real Content', () => {
    it('should process real README files efficiently', async () => {
      const content = readSampleReadme('multi-language-project.md');
      const parseResult = markdownParser.parseContentSync(content);
      expect(parseResult.success).toBe(true);

      const startTime = Date.now();
      const result = await detector.analyze(parseResult.data!.ast, content);
      const endTime = Date.now();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(100);
      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle large README files without performance degradation', async () => {
      // Create a large README by repeating content
      const baseContent = readSampleReadme('multi-language-project.md');
      const largeContent = baseContent.repeat(10);
      
      const parseResult = markdownParser.parseContentSync(largeContent);
      expect(parseResult.success).toBe(true);

      const startTime = Date.now();
      const result = await detector.analyze(parseResult.data!.ast, largeContent);
      const endTime = Date.now();

      // Should still complete within reasonable time even with large content
      expect(endTime - startTime).toBeLessThan(500);
      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      
      // Should still detect languages accurately
      const languages = result.data as LanguageInfo[];
      expect(languages.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases with Real Content', () => {
    it('should handle README with minimal language indicators', async () => {
      const minimalContent = `
# Simple Project

This is a basic project.

## Installation

Download and install.

## Usage

Run the application.
      `;

      const parseResult = markdownParser.parseContentSync(minimalContent);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, minimalContent);
      expect(result.confidence).toBe(0);
      expect(result.data).toEqual([]);
    });

    it('should handle README with mixed case language mentions', async () => {
      const mixedCaseContent = `
# Mixed Case Project

This project uses JAVASCRIPT for the frontend and python for the backend.
We also have some C++ utilities and TypeScript definitions.
      `;

      const parseResult = markdownParser.parseContentSync(mixedCaseContent);
      expect(parseResult.success).toBe(true);

      const result = await detector.analyze(parseResult.data!.ast, mixedCaseContent);
      const languages = result.data as LanguageInfo[];
      const languageNames = languages.map(lang => lang.name);
      
      expect(languageNames).toContain('JavaScript');
      expect(languageNames).toContain('Python');
      expect(languageNames).toContain('C++');
      expect(languageNames).toContain('TypeScript');
    });
  });
});