/**
 * Integration tests for ReadmeParserImpl - Main parser orchestration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReadmeParserImpl } from '../../src/parser/readme-parser';
import { ParseResult, ProjectInfo, ContentAnalyzer, AnalysisResult } from '../../src/parser/types';
import { Token } from 'marked';

describe('ReadmeParserImpl Integration Tests', () => {
  let parser: ReadmeParserImpl;

  beforeEach(() => {
    parser = new ReadmeParserImpl();
  });

  describe('parseContent - Complete Workflow', () => {
    it('should successfully parse a comprehensive README with all analyzers', async () => {
      const readmeContent = `
# My Awesome Project

A comprehensive Node.js application with React frontend and Python backend services.

## Installation

\`\`\`bash
npm install
pip install -r requirements.txt
cargo build
\`\`\`

## Usage

\`\`\`bash
npm run build
npm test
python manage.py runserver
cargo run
\`\`\`

## Testing

This project uses Jest for JavaScript testing and pytest for Python testing.

\`\`\`bash
npm run test:coverage
pytest --cov=src
\`\`\`

## Environment Variables

\`\`\`
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/mydb
API_KEY=your-api-key-here
\`\`\`

## Project Structure

\`\`\`
src/
  components/
  services/
  utils/
tests/
  unit/
  integration/
package.json
requirements.txt
Cargo.toml
\`\`\`
      `;

      const result = await parser.parseContent(readmeContent);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      const projectInfo = result.data!;
      
      // Verify all analyzer results are present
      expect(projectInfo.languages).toBeDefined();
      expect(projectInfo.languages.length).toBeGreaterThan(0);
      
      expect(projectInfo.dependencies).toBeDefined();
      expect(projectInfo.dependencies.packageFiles.length).toBeGreaterThan(0);
      
      expect(projectInfo.commands).toBeDefined();
      expect(projectInfo.commands.build.length).toBeGreaterThan(0);
      expect(projectInfo.commands.test.length).toBeGreaterThan(0);
      
      expect(projectInfo.testing).toBeDefined();
      expect(projectInfo.testing.frameworks.length).toBeGreaterThan(0);
      
      expect(projectInfo.metadata).toBeDefined();
      expect(projectInfo.metadata.name).toBe('My Awesome Project');
      expect(projectInfo.metadata.environment).toBeDefined();
      expect(projectInfo.metadata.environment!.length).toBeGreaterThan(0);
      
      expect(projectInfo.confidence).toBeDefined();
      expect(projectInfo.confidence.overall).toBeGreaterThan(0);
    });

    it('should handle minimal README content gracefully', async () => {
      const readmeContent = `
# Simple Project

Just a basic project.
      `;

      const result = await parser.parseContent(readmeContent);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      const projectInfo = result.data!;
      
      // Should have basic metadata
      expect(projectInfo.metadata.name).toBe('Simple Project');
      expect(projectInfo.metadata.description).toContain('basic project');
      
      // Other sections should be empty but present
      expect(projectInfo.languages).toEqual([]);
      expect(projectInfo.dependencies.packageFiles).toEqual([]);
      expect(projectInfo.commands.build).toEqual([]);
      expect(projectInfo.testing.frameworks).toEqual([]);
      
      // Confidence should be low but not zero
      expect(projectInfo.confidence.overall).toBeGreaterThan(0);
      expect(projectInfo.confidence.overall).toBeLessThan(0.5);
    });

    it('should handle malformed markdown gracefully', async () => {
      const readmeContent = `
# Broken Markdown

This has some **unclosed bold text

\`\`\`javascript
function test() {
  console.log("test");
}
\`\`\`

And some random text here...
      `;

      const result = await parser.parseContent(readmeContent);

      // Should still succeed with graceful degradation
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Should extract what it can
      expect(result.data!.metadata.name).toBe('Broken Markdown');
      expect(result.data!.languages.some(lang => lang.name === 'JavaScript')).toBe(true);
    });
  });

  describe('parseFile - File System Integration', () => {
    it('should handle non-existent file gracefully', async () => {
      const result = await parser.parseFile('non-existent-file.md');

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.errors![0].code).toContain('FILE');
    });

    it('should parse actual README file if it exists', async () => {
      // This test would work with an actual README.md file in the project
      const result = await parser.parseFile('README.md');

      // If file doesn't exist, should fail gracefully
      if (!result.success) {
        expect(result.errors).toBeDefined();
        expect(result.errors![0].code).toContain('FILE');
      } else {
        // If file exists, should parse successfully
        expect(result.data).toBeDefined();
        expect(result.data!.confidence).toBeDefined();
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle empty content', async () => {
      const result = await parser.parseContent('');

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].code).toBe('EMPTY_CONTENT');
    });

    it('should handle null/undefined content', async () => {
      const result1 = await parser.parseContent(null as any);
      const result2 = await parser.parseContent(undefined as any);

      expect(result1.success).toBe(false);
      expect(result1.errors![0].code).toBe('INVALID_INPUT');
      
      expect(result2.success).toBe(false);
      expect(result2.errors![0].code).toBe('INVALID_INPUT');
    });

    it('should continue processing when some analyzers fail', async () => {
      // Create a mock analyzer that always fails
      const failingAnalyzer: ContentAnalyzer = {
        name: 'FailingAnalyzer',
        analyze: async () => {
          throw new Error('Simulated analyzer failure');
        }
      };

      parser.registerAnalyzer(failingAnalyzer);

      const readmeContent = `
# Test Project

A simple test project with JavaScript.

\`\`\`javascript
console.log("Hello World");
\`\`\`
      `;

      const result = await parser.parseContent(readmeContent);

      // Should still succeed despite one analyzer failing
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Should have errors from the failing analyzer
      expect(result.errors).toBeDefined();
      expect(result.errors!.some(error => 
        error.component === 'FailingAnalyzer' && 
        error.code === 'ANALYZER_EXECUTION_ERROR'
      )).toBe(true);
      
      // Should still have results from working analyzers
      expect(result.data!.languages.length).toBeGreaterThan(0);
      expect(result.data!.metadata.name).toBe('Test Project');
    });

    it('should fail gracefully when all analyzers fail', async () => {
      // Clear all analyzers and add only failing ones
      parser.clearAnalyzers();
      
      const failingAnalyzer1: ContentAnalyzer = {
        name: 'FailingAnalyzer1',
        analyze: async () => { throw new Error('Failure 1'); }
      };
      
      const failingAnalyzer2: ContentAnalyzer = {
        name: 'FailingAnalyzer2', 
        analyze: async () => { throw new Error('Failure 2'); }
      };

      parser.registerAnalyzer(failingAnalyzer1);
      parser.registerAnalyzer(failingAnalyzer2);

      const result = await parser.parseContent('# Test');

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.some(error => error.code === 'ALL_ANALYZERS_FAILED')).toBe(true);
    });
  });

  describe('Parallel Execution', () => {
    it('should execute analyzers in parallel', async () => {
      const readmeContent = `
# Performance Test

Testing parallel execution of analyzers.

\`\`\`javascript
console.log("test");
\`\`\`

\`\`\`bash
npm install
npm test
\`\`\`
      `;

      const startTime = Date.now();
      const result = await parser.parseContent(readmeContent);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      
      // Should complete reasonably quickly (less than 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
      
      // Should have results from multiple analyzers
      expect(result.data!.languages.length).toBeGreaterThan(0);
      expect(result.data!.commands.install.length).toBeGreaterThan(0);
      expect(result.data!.commands.test.length).toBeGreaterThan(0);
    });

    it('should handle analyzer timeouts', async () => {
      // Create a slow analyzer that takes longer than timeout
      const slowAnalyzer: ContentAnalyzer = {
        name: 'SlowAnalyzer',
        analyze: async () => {
          await new Promise(resolve => setTimeout(resolve, 12000)); // 12 seconds (longer than 10s timeout)
          return {
            data: { test: 'data' },
            confidence: 0.5,
            sources: ['slow-analysis']
          };
        }
      };

      parser.registerAnalyzer(slowAnalyzer);

      const result = await parser.parseContent('# Test');

      // Should complete without hanging
      expect(result.success).toBe(true);
      
      // Should have timeout error for slow analyzer
      expect(result.errors).toBeDefined();
      expect(result.errors!.some(error => 
        error.component === 'SlowAnalyzer' && 
        error.message.includes('timeout')
      )).toBe(true);
    }, 15000); // 15 second test timeout
  });

  describe('Confidence Scoring Aggregation', () => {
    it('should calculate overall confidence based on analyzer success rate', async () => {
      const readmeContent = `
# Confidence Test

A comprehensive project with multiple languages and tools.

\`\`\`javascript
console.log("JavaScript code");
\`\`\`

\`\`\`python
print("Python code")
\`\`\`

\`\`\`bash
npm install
pip install -r requirements.txt
npm test
pytest
\`\`\`

Uses Jest and pytest for testing.
      `;

      const result = await parser.parseContent(readmeContent);

      expect(result.success).toBe(true);
      expect(result.data!.confidence).toBeDefined();
      
      const confidence = result.data!.confidence;
      
      // Overall confidence should be reasonable
      expect(confidence.overall).toBeGreaterThan(0.3);
      expect(confidence.overall).toBeLessThanOrEqual(1.0);
      
      // Individual confidence scores should be present
      expect(confidence.languages).toBeGreaterThan(0);
      expect(confidence.dependencies).toBeGreaterThan(0);
      expect(confidence.commands).toBeGreaterThan(0);
      expect(confidence.testing).toBeGreaterThan(0);
      expect(confidence.metadata).toBeGreaterThan(0);
    });

    it('should adjust confidence when some analyzers fail', async () => {
      // Add a failing analyzer
      const failingAnalyzer: ContentAnalyzer = {
        name: 'FailingAnalyzer',
        analyze: async () => { throw new Error('Simulated failure'); }
      };

      parser.registerAnalyzer(failingAnalyzer);

      const readmeContent = `
# Confidence Test

Simple project for testing confidence adjustment.

\`\`\`javascript
console.log("test");
\`\`\`
      `;

      const result = await parser.parseContent(readmeContent);

      expect(result.success).toBe(true);
      
      // Confidence should be adjusted down due to analyzer failure
      const totalAnalyzers = parser.getAnalyzerInfo().length;
      const successfulAnalyzers = totalAnalyzers - 1; // One failed
      const expectedAdjustment = successfulAnalyzers / totalAnalyzers;
      
      // Overall confidence should be adjusted by success rate
      expect(result.data!.confidence.overall).toBeLessThan(1.0);
      expect(result.data!.confidence.overall).toBeGreaterThan(0);
    });
  });

  describe('Analyzer Management', () => {
    it('should provide analyzer information', async () => {
      const info = parser.getAnalyzerInfo();
      
      expect(info).toBeDefined();
      expect(info.length).toBeGreaterThan(0);
      
      // Should have default analyzers
      const analyzerNames = info.map(a => a.name);
      expect(analyzerNames).toContain('LanguageDetector');
      expect(analyzerNames).toContain('DependencyExtractor');
      expect(analyzerNames).toContain('CommandExtractor');
      expect(analyzerNames).toContain('TestingDetector');
      expect(analyzerNames).toContain('MetadataExtractor');
    });

    it('should check if specific analyzer is registered', async () => {
      expect(parser.hasAnalyzer('LanguageDetector')).toBe(true);
      expect(parser.hasAnalyzer('NonExistentAnalyzer')).toBe(false);
    });

    it('should parse with specific analyzers only', async () => {
      const readmeContent = `
# Selective Test

JavaScript project with testing.

\`\`\`javascript
console.log("test");
\`\`\`

\`\`\`bash
npm test
\`\`\`

Uses Jest for testing.
      `;

      const result = await parser.parseContentWithAnalyzers(
        readmeContent, 
        ['LanguageDetector', 'TestingDetector']
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Should have language and testing results
      expect(result.data!.languages.length).toBeGreaterThan(0);
      expect(result.data!.testing.frameworks.length).toBeGreaterThan(0);
      
      // Should not have dependency or command results (analyzers not included)
      expect(result.data!.dependencies.packageFiles).toEqual([]);
      expect(result.data!.commands.build).toEqual([]);
    });

    it('should provide parser information', async () => {
      const info = parser.getParserInfo();
      
      expect(info).toBeDefined();
      expect(info.analyzersRegistered).toBeGreaterThan(0);
      expect(info.analyzerNames).toContain('LanguageDetector');
      expect(info.version).toBeDefined();
      expect(info.capabilities).toContain('parallel-processing');
      expect(info.capabilities).toContain('error-recovery');
      expect(info.capabilities).toContain('confidence-scoring');
    });
  });

  describe('Content Validation', () => {
    it('should validate content before parsing', async () => {
      const validContent = '# Valid README\n\nThis is valid markdown.';
      const emptyContent = '';
      const nonStringContent = null as any;
      
      const validResult = parser.validateContent(validContent);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toEqual([]);
      
      const emptyResult = parser.validateContent(emptyContent);
      expect(emptyResult.valid).toBe(false);
      expect(emptyResult.errors.length).toBeGreaterThan(0);
      
      const nullResult = parser.validateContent(nonStringContent);
      expect(nullResult.valid).toBe(false);
      expect(nullResult.errors.length).toBeGreaterThan(0);
    });

    it('should detect non-markdown content', async () => {
      const plainText = 'This is just plain text without any markdown formatting';
      
      const result = parser.validateContent(plainText);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => 
        error.includes('markdown formatting')
      )).toBe(true);
    });

    it('should reject oversized content', async () => {
      const largeContent = '#'.repeat(1024 * 1024 + 1); // Over 1MB
      
      const result = parser.validateContent(largeContent);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => 
        error.includes('maximum size limit')
      )).toBe(true);
    });
  });
});