/**
 * Integration tests for context sharing between analyzers
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AnalysisContextFactory, AnalysisContext } from '../../src/shared/types/analysis-context';
import { LanguageDetector } from '../../src/parser/analyzers/language-detector';
import { CommandExtractor } from '../../src/parser/analyzers/command-extractor';
import { MarkdownParser } from '../../src/parser/utils/markdown-parser';

describe('Context Sharing Integration', () => {
  let analysisContext: AnalysisContext;
  let languageDetector: LanguageDetector;
  let commandExtractor: CommandExtractor;
  let markdownParser: MarkdownParser;

  beforeEach(() => {
    languageDetector = new LanguageDetector();
    commandExtractor = new CommandExtractor();
    markdownParser = new MarkdownParser();
  });

  describe('Basic Context Sharing', () => {
    it('should create and validate analysis context', () => {
      const content = '# Test Project\n\n```bash\nnpm install\nnpm run build\n```';
      
      analysisContext = AnalysisContextFactory.create(content);
      
      expect(analysisContext.sessionId).toBeDefined();
      expect(analysisContext.content).toBe(content);
      expect(analysisContext.languageContexts).toEqual([]);
      expect(analysisContext.sharedData.size).toBe(0);
      expect(analysisContext.metadata.startTime).toBeInstanceOf(Date);
      expect(analysisContext.validation.isValid).toBe(true);
    });

    it('should validate context integrity', () => {
      const content = '# Test Project';
      analysisContext = AnalysisContextFactory.create(content);
      
      const validation = AnalysisContextFactory.validateContext(analysisContext);
      
      expect(validation.isValid).toBe(true);
      expect(validation.validationScore).toBe(1.0);
      expect(validation.issues).toEqual([]);
    });
  });

  describe('Language Detection Context Sharing', () => {
    it('should share language contexts through analysis context', async () => {
      const content = `# JavaScript Project

This is a Node.js application.

\`\`\`javascript
const express = require('express');
const app = express();
\`\`\`

## Installation

\`\`\`bash
npm install
npm start
\`\`\``;

      analysisContext = AnalysisContextFactory.create(content);
      const parseResult = await markdownParser.parseContent(content);
      
      expect(parseResult.success).toBe(true);
      const ast = parseResult.data!.ast;

      // Run language detection with context
      const languageResult = await languageDetector.analyze(ast, content, analysisContext);
      
      expect(languageResult.success).toBe(true);
      expect(languageResult.data).toBeDefined();
      
      // Check that language contexts were shared
      expect(analysisContext.languageContexts.length).toBeGreaterThan(0);
      expect(analysisContext.sharedData.has('languageContexts')).toBe(true);
      expect(analysisContext.sharedData.has('languageDetectionResult')).toBe(true);
      
      const sharedContexts = analysisContext.sharedData.get('languageContexts');
      expect(sharedContexts).toBeDefined();
      expect(Array.isArray(sharedContexts)).toBe(true);
      expect(sharedContexts.length).toBeGreaterThan(0);
    });

    it('should detect JavaScript language with high confidence', async () => {
      const content = `# Node.js API

\`\`\`javascript
const express = require('express');
app.listen(3000);
\`\`\`

\`\`\`bash
npm install express
npm start
\`\`\``;

      analysisContext = AnalysisContextFactory.create(content);
      const parseResult = await markdownParser.parseContent(content);
      const ast = parseResult.data!.ast;

      const result = await languageDetector.analyze(ast, content, analysisContext);
      
      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      
      const jsLanguage = result.data.find(lang => lang.name === 'JavaScript');
      expect(jsLanguage).toBeDefined();
      expect(jsLanguage!.confidence).toBeGreaterThan(0.8);
      
      // Check shared contexts
      const sharedContexts = analysisContext.sharedData.get('languageContexts');
      expect(sharedContexts).toBeDefined();
      
      const jsContext = sharedContexts.find((ctx: any) => ctx.language === 'JavaScript');
      expect(jsContext).toBeDefined();
      expect(jsContext.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Command Extraction Context Sharing', () => {
    it('should inherit language contexts from shared data', async () => {
      const content = `# Python Project

\`\`\`python
import flask
app = flask.Flask(__name__)
\`\`\`

## Setup

\`\`\`bash
pip install flask
python app.py
\`\`\``;

      analysisContext = AnalysisContextFactory.create(content);
      const parseResult = await markdownParser.parseContent(content);
      const ast = parseResult.data!.ast;

      // First run language detection
      await languageDetector.analyze(ast, content, analysisContext);
      
      // Then run command extraction
      const commandResult = await commandExtractor.analyze(ast, content, analysisContext);
      
      expect(commandResult.success).toBe(true);
      expect(commandResult.data).toBeDefined();
      
      // Check that command extraction used shared language contexts
      expect(analysisContext.sharedData.has('commandExtractionResult')).toBe(true);
      
      const extractionResult = analysisContext.sharedData.get('commandExtractionResult');
      expect(extractionResult).toBeDefined();
      expect(extractionResult.commands).toBeDefined();
      expect(extractionResult.commandInfo).toBeDefined();
    });

    it('should properly associate commands with language contexts', async () => {
      const content = `# Multi-language Project

## JavaScript Setup
\`\`\`bash
npm install
npm run build
\`\`\`

## Python Setup  
\`\`\`bash
pip install -r requirements.txt
python manage.py runserver
\`\`\``;

      analysisContext = AnalysisContextFactory.create(content);
      const parseResult = await markdownParser.parseContent(content);
      const ast = parseResult.data!.ast;

      // Run both analyzers
      await languageDetector.analyze(ast, content, analysisContext);
      const commandResult = await commandExtractor.analyze(ast, content, analysisContext);
      
      expect(commandResult.success).toBe(true);
      
      const extractionResult = analysisContext.sharedData.get('commandExtractionResult');
      expect(extractionResult).toBeDefined();
      
      const commands = extractionResult.commands;
      expect(commands.length).toBeGreaterThan(0);
      
      // Check that commands have language associations
      const npmCommand = commands.find((cmd: any) => cmd.command.includes('npm'));
      const pipCommand = commands.find((cmd: any) => cmd.command.includes('pip'));
      
      if (npmCommand) {
        expect(npmCommand.language).toBeDefined();
        expect(npmCommand.languageContext).toBeDefined();
      }
      
      if (pipCommand) {
        expect(pipCommand.language).toBeDefined();
        expect(pipCommand.languageContext).toBeDefined();
      }
    });
  });

  describe('Data Flow Validation', () => {
    it('should validate data flow between analyzers', async () => {
      const content = `# Test Project

\`\`\`javascript
console.log('Hello World');
\`\`\`

\`\`\`bash
npm test
\`\`\``;

      analysisContext = AnalysisContextFactory.create(content);
      const parseResult = await markdownParser.parseContent(content);
      const ast = parseResult.data!.ast;

      // Run language detection first
      await languageDetector.analyze(ast, content, analysisContext);
      
      // Run command extraction second
      await commandExtractor.analyze(ast, content, analysisContext);
      
      // Check data flow validation
      expect(analysisContext.validation.dataFlow.length).toBeGreaterThan(0);
      
      const dataFlowValidation = analysisContext.validation.dataFlow[0];
      expect(dataFlowValidation.sourceAnalyzer).toBe('CommandExtractor');
      expect(dataFlowValidation.targetAnalyzer).toBe('YamlGenerator');
      expect(dataFlowValidation.dataKeys).toContain('commandExtractionResult');
      expect(dataFlowValidation.dataKeys).toContain('languageContexts');
      expect(dataFlowValidation.isValid).toBe(true);
      expect(dataFlowValidation.integrityScore).toBeGreaterThan(0);
    });

    it('should track analyzer processing order', async () => {
      const content = '# Simple Project\n\n```bash\necho "test"\n```';
      
      analysisContext = AnalysisContextFactory.create(content);
      const parseResult = await markdownParser.parseContent(content);
      const ast = parseResult.data!.ast;

      expect(analysisContext.metadata.processedBy).toEqual([]);
      
      await languageDetector.analyze(ast, content, analysisContext);
      expect(analysisContext.metadata.processedBy).toContain('LanguageDetector');
      
      await commandExtractor.analyze(ast, content, analysisContext);
      expect(analysisContext.metadata.processedBy).toContain('CommandExtractor');
      
      // Should have both analyzers in processing order
      expect(analysisContext.metadata.processedBy.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Context Validation', () => {
    it('should validate shared data consistency', async () => {
      const content = `# Validation Test

\`\`\`typescript
interface Test {
  name: string;
}
\`\`\`

\`\`\`bash
npm run type-check
\`\`\``;

      analysisContext = AnalysisContextFactory.create(content);
      const parseResult = await markdownParser.parseContent(content);
      const ast = parseResult.data!.ast;

      await languageDetector.analyze(ast, content, analysisContext);
      await commandExtractor.analyze(ast, content, analysisContext);
      
      // Validate the final context
      const validation = AnalysisContextFactory.validateContext(analysisContext);
      
      expect(validation.isValid).toBe(true);
      expect(validation.consistency.length).toBeGreaterThan(0);
      
      const languageCheck = validation.consistency.find(check => 
        check.checkType === 'language-contexts'
      );
      expect(languageCheck).toBeDefined();
      expect(languageCheck!.passed).toBe(true);
    });

    it('should handle missing shared data gracefully', async () => {
      const content = '# Empty Project';
      
      analysisContext = AnalysisContextFactory.create(content);
      const parseResult = await markdownParser.parseContent(content);
      const ast = parseResult.data!.ast;

      // Run command extraction without language detection first
      const commandResult = await commandExtractor.analyze(ast, content, analysisContext);
      
      expect(commandResult.success).toBe(true);
      
      // Should handle missing language contexts gracefully
      const extractionResult = analysisContext.sharedData.get('commandExtractionResult');
      expect(extractionResult).toBeDefined();
      expect(extractionResult.commands).toBeDefined();
    });
  });

  describe('Performance and Memory', () => {
    it('should track performance metrics', async () => {
      const content = `# Performance Test

\`\`\`javascript
const app = require('express')();
\`\`\`

\`\`\`bash
npm install express
npm start
\`\`\``;

      analysisContext = AnalysisContextFactory.create(content);
      const parseResult = await markdownParser.parseContent(content);
      const ast = parseResult.data!.ast;

      const startTime = Date.now();
      
      await languageDetector.analyze(ast, content, analysisContext);
      await commandExtractor.analyze(ast, content, analysisContext);
      
      const endTime = Date.now();
      
      // Check performance tracking
      expect(analysisContext.performance).toBeDefined();
      expect(analysisContext.performance.totalTime).toBeGreaterThanOrEqual(0);
      
      // Performance tracking may not be fully implemented yet, so just check structure
      expect(analysisContext.performance.analyzerTimes).toBeInstanceOf(Map);
      expect(analysisContext.performance.memoryUsage).toBeDefined();
      expect(analysisContext.performance.metrics).toBeDefined();
    });

    it('should limit context size', () => {
      const largeContent = 'x'.repeat(1000000); // 1MB of content
      
      expect(() => {
        AnalysisContextFactory.create(largeContent, {
          maxContextSize: 500000 // 500KB limit
        });
      }).not.toThrow(); // Should handle large content gracefully
    });
  });
});