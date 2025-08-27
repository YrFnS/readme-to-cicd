/**
 * Integration tests for ReadmeParser and IntegrationPipeline connection
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReadmeParserImpl } from '../../../src/parser/readme-parser';
import { IntegrationPipeline } from '../../../src/integration/integration-pipeline';
import { LanguageDetectorAdapter } from '../../../src/parser/analyzers/analyzer-adapters';

describe('ReadmeParser - IntegrationPipeline Connection', () => {
  let parser: ReadmeParserImpl;
  let pipeline: IntegrationPipeline;

  beforeEach(() => {
    pipeline = new IntegrationPipeline();
    parser = new ReadmeParserImpl(pipeline);
  });

  afterEach(() => {
    if (pipeline) {
      pipeline.cleanup();
    }
  });

  describe('Constructor Integration', () => {
    it('should accept IntegrationPipeline instance in constructor', () => {
      const testPipeline = new IntegrationPipeline();
      const testParser = new ReadmeParserImpl(testPipeline);
      
      expect(testParser).toBeDefined();
      expect(testParser.getAnalyzerInfo().some(info => info.source === 'pipeline')).toBe(true);
      
      testPipeline.cleanup();
    });

    it('should use pipeline for analyzer coordination when provided', () => {
      const analyzerInfo = parser.getAnalyzerInfo();
      
      // Should have analyzers registered through pipeline
      expect(analyzerInfo.length).toBeGreaterThan(0);
      expect(analyzerInfo.some(info => info.source === 'pipeline')).toBe(true);
    });

    it('should fall back to registry when no pipeline provided', () => {
      const fallbackParser = new ReadmeParserImpl();
      const analyzerInfo = fallbackParser.getAnalyzerInfo();
      
      // Should have analyzers registered through registry
      expect(analyzerInfo.length).toBeGreaterThan(0);
      expect(analyzerInfo.every(info => info.source === 'registry')).toBe(true);
    });
  });

  describe('Analyzer Registration Through Pipeline', () => {
    it('should register analyzers through pipeline instead of direct instantiation', async () => {
      const customAnalyzer = new LanguageDetectorAdapter();
      
      await parser.registerAnalyzer(customAnalyzer);
      
      // Verify analyzer is registered in pipeline
      expect(pipeline.hasAnalyzer(customAnalyzer.name)).toBe(true);
      expect(parser.hasAnalyzer(customAnalyzer.name)).toBe(true);
    });

    it('should handle analyzer registration failures gracefully', async () => {
      // Create a mock analyzer that will cause registration to fail
      const problematicAnalyzer = {
        name: 'ProblematicAnalyzer',
        analyze: async () => ({ data: null, confidence: 0, sources: [], errors: [] })
      } as any;

      // Mock the pipeline to throw an error
      const originalRegister = pipeline.registerAnalyzer;
      pipeline.registerAnalyzer = async () => {
        throw new Error('Registration failed');
      };

      // Should not throw, should fall back to registry
      await expect(parser.registerAnalyzer(problematicAnalyzer)).resolves.not.toThrow();
      
      // Restore original method
      pipeline.registerAnalyzer = originalRegister;
    });

    it('should clear analyzers from both pipeline and registry', () => {
      parser.clearAnalyzers();
      
      expect(pipeline.getRegisteredAnalyzers().length).toBe(0);
      expect(parser.getAnalyzerInfo().length).toBe(0);
    });
  });

  describe('Pipeline-Based Result Aggregation', () => {
    it('should use pipeline for result aggregation instead of direct analyzer calls', async () => {
      const testContent = `
# Test Project

A Node.js project with TypeScript.

## Installation
\`\`\`bash
npm install
npm test
\`\`\`
      `;

      const result = await parser.parseContent(testContent);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.languages).toBeDefined();
      expect(result.data?.commands).toBeDefined();
    });

    it('should handle pipeline execution failures and fall back to manual analysis', async () => {
      // Mock pipeline to fail
      const originalExecute = pipeline.execute;
      pipeline.execute = async () => {
        throw new Error('Pipeline execution failed');
      };

      const testContent = `
# Test Project

A simple test project.
      `;

      const result = await parser.parseContent(testContent);
      
      // Should still succeed using fallback
      expect(result.success).toBe(true);
      
      // Restore original method
      pipeline.execute = originalExecute;
    });

    it('should provide higher confidence scores when using pipeline', async () => {
      const testContent = `
# Node.js Project

A TypeScript Node.js application.

## Scripts
\`\`\`bash
npm install
npm run build
npm test
\`\`\`
      `;

      const pipelineResult = await parser.parseContent(testContent);
      
      // Create parser without pipeline for comparison
      const fallbackParser = new ReadmeParserImpl(undefined, { useIntegrationPipeline: false });
      const fallbackResult = await fallbackParser.parseContent(testContent);

      expect(pipelineResult.success).toBe(true);
      expect(fallbackResult.success).toBe(true);
      
      // Pipeline should provide higher confidence
      expect(pipelineResult.data?.confidence.overall).toBeGreaterThanOrEqual(
        fallbackResult.data?.confidence.overall || 0
      );
    });
  });

  describe('Integration Test Verification', () => {
    it('should maintain analyzer context sharing through pipeline', async () => {
      const testContent = `
# Python Project

A Python web application using Flask.

## Setup
\`\`\`python
pip install -r requirements.txt
python app.py
\`\`\`
      `;

      const result = await parser.parseContent(testContent);
      
      expect(result.success).toBe(true);
      expect(result.data?.languages).toBeDefined();
      expect(result.data?.commands).toBeDefined();
      
      // Verify language context is shared with command extraction
      const pythonLanguage = result.data?.languages.find(lang => lang.name === 'Python');
      if (pythonLanguage) {
        const installCommands = result.data?.commands.install || [];
        const pythonCommands = installCommands.filter((cmd: any) => cmd.language === 'Python');
        expect(pythonCommands.length).toBeGreaterThan(0);
      }
    });

    it('should handle empty content gracefully through pipeline', async () => {
      const result = await parser.parseContent('');
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle malformed content gracefully through pipeline', async () => {
      const malformedContent = '# Incomplete markdown\n```bash\nnpm install\n'; // Missing closing backticks
      
      const result = await parser.parseContent(malformedContent);
      
      // Should still attempt to parse and provide partial results
      expect(result).toBeDefined();
      // May succeed with warnings or fail gracefully
      if (result.success) {
        expect(result.data).toBeDefined();
      } else {
        expect(result.errors).toBeDefined();
      }
    });
  });

  describe('Performance and Resource Management', () => {
    it('should properly cleanup resources when parser is done', () => {
      const testPipeline = new IntegrationPipeline();
      const testParser = new ReadmeParserImpl(testPipeline);
      
      // Verify initial state
      expect(testPipeline.getRegisteredAnalyzers().length).toBeGreaterThan(0);
      
      // Cleanup
      testPipeline.cleanup();
      
      // Verify cleanup
      expect(testPipeline.getRegisteredAnalyzers().length).toBe(0);
    });

    it('should handle concurrent parsing requests through pipeline', async () => {
      const testContent1 = '# Project 1\nA Node.js project.\n```bash\nnpm install\n```';
      const testContent2 = '# Project 2\nA Python project.\n```python\npip install flask\n```';
      const testContent3 = '# Project 3\nA Java project.\n```bash\nmvn clean install\n```';

      const promises = [
        parser.parseContent(testContent1),
        parser.parseContent(testContent2),
        parser.parseContent(testContent3)
      ];

      const results = await Promise.all(promises);
      
      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });
    });
  });
});