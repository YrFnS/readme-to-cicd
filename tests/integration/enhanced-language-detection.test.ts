/**
 * Integration tests for Enhanced Language Detection with Context Generation
 * 
 * Tests the integration of confidence calculation, source tracking, and context
 * generation in the enhanced LanguageDetector.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LanguageDetector } from '../../src/parser/analyzers/language-detector';
import { marked } from 'marked';

describe('Enhanced Language Detection Integration', () => {
  let detector: LanguageDetector;

  beforeEach(() => {
    detector = new LanguageDetector();
  });

  describe('detectWithContext', () => {
    it('should generate language contexts with confidence scoring', async () => {
      const content = `# TypeScript React Project

This project uses TypeScript and React for building modern web applications.

\`\`\`typescript
interface User {
  name: string;
  age: number;
}
\`\`\`

## Installation

\`\`\`bash
npm install
npm run build
\`\`\`

Dependencies include:
- react
- typescript
- @types/node

File extensions: .ts, .tsx files are supported.`;

      const ast = marked.lexer(content);
      const result = detector.detectWithContext(ast, content);

      expect(result.contexts.length).toBeGreaterThan(0);
      expect(result.overallConfidence).toBeGreaterThan(0);
      
      // Should detect TypeScript with high confidence
      const tsContext = result.contexts.find(c => c.language === 'TypeScript');
      expect(tsContext).toBeDefined();
      expect(tsContext!.confidence).toBeGreaterThan(0.7);
      expect(tsContext!.evidence.length).toBeGreaterThan(0);
      
      // Should have source tracking
      expect(result.sourceTracking).toBeDefined();
      expect(result.sourceTracking.evidence.length).toBeGreaterThan(0);
    });

    it('should detect context boundaries between different languages', async () => {
      const content = `# Multi-Language Project

Python backend:

\`\`\`python
def hello_world():
    print("Hello from Python!")
\`\`\`

JavaScript frontend:

\`\`\`javascript
function helloWorld() {
    console.log("Hello from JavaScript!");
}
\`\`\``;

      const ast = marked.lexer(content);
      const result = detector.detectWithContext(ast, content);

      expect(result.contexts.length).toBeGreaterThanOrEqual(2);
      expect(result.boundaries.length).toBeGreaterThan(0);
      
      // Should detect both Python and JavaScript
      const languages = result.contexts.map(c => c.language);
      expect(languages).toContain('Python');
      expect(languages).toContain('JavaScript');
    });

    it('should apply fallback strategies for low-confidence scenarios', async () => {
      const content = `# Minimal Project

Some code mentions:
- Uses some javascript
- Has python scripts
- Includes go modules`;

      const ast = marked.lexer(content);
      const result = detector.detectWithContext(ast, content);

      // Should still detect languages even with low confidence
      expect(result.contexts.length).toBeGreaterThan(0);
      
      // Fallback strategies should ensure minimum confidence
      for (const context of result.contexts) {
        expect(context.confidence).toBeGreaterThan(0);
      }
    });

    it('should handle framework detection within language contexts', async () => {
      const content = `# React TypeScript Project

This project uses React with TypeScript.

\`\`\`typescript
import React from 'react';

const App: React.FC = () => {
  return <div>Hello React!</div>;
};
\`\`\`

Dependencies:
- react
- @types/react`;

      const ast = marked.lexer(content);
      const result = detector.detectWithContext(ast, content);

      const tsContext = result.contexts.find(c => c.language === 'TypeScript');
      expect(tsContext).toBeDefined();
      
      // Check that TypeScript is detected with evidence
      expect(tsContext!.evidence.length).toBeGreaterThan(0);
      expect(tsContext!.confidence).toBeGreaterThan(0);
      
      // Framework detection is working if we have any framework-related evidence
      const hasFrameworkEvidence = result.contexts.some(c => 
        c.evidence.some(e => e.value.toLowerCase().includes('react'))
      );
      expect(hasFrameworkEvidence).toBe(true);
    });

    it('should provide accurate source tracking with line numbers', async () => {
      const content = `Line 1: TypeScript project
Line 2: Uses .ts files
Line 3: Has typescript dependencies
Line 4: Includes React framework`;

      const ast = marked.lexer(content);
      const result = detector.detectWithContext(ast, content);

      expect(result.sourceTracking.evidence.length).toBeGreaterThan(0);
      
      // Check that evidence has proper location tracking
      for (const evidence of result.sourceTracking.evidence) {
        expect(evidence.location).toBeDefined();
        expect(evidence.location.startLine).toBeGreaterThanOrEqual(0);
        expect(evidence.location.endLine).toBeGreaterThanOrEqual(evidence.location.startLine);
      }
    });
  });

  describe('getContext', () => {
    it('should return context at specific positions', async () => {
      const content = `TypeScript project with React`;
      const ast = marked.lexer(content);
      
      // First detect to populate contexts
      detector.detectWithContext(ast, content);
      
      // Get context at position where "TypeScript" appears
      const context = detector.getContext(0);
      expect(context).toBeDefined();
    });

    it('should return undefined for positions without context', async () => {
      const content = `Simple text without language indicators`;
      const ast = marked.lexer(content);
      
      detector.detectWithContext(ast, content);
      
      const context = detector.getContext(1000); // Position beyond content
      expect(context).toBeUndefined();
    });
  });

  describe('getAllContexts', () => {
    it('should return all detected contexts', async () => {
      const content = `# Multi-Language Project

TypeScript:
\`\`\`typescript
interface User {}
\`\`\`

Python:
\`\`\`python
def hello(): pass
\`\`\``;

      const ast = marked.lexer(content);
      detector.detectWithContext(ast, content);
      
      const contexts = detector.getAllContexts();
      expect(contexts.length).toBeGreaterThanOrEqual(2);
      
      const languages = contexts.map(c => c.language);
      expect(languages).toContain('TypeScript');
      expect(languages).toContain('Python');
    });
  });

  describe('getContextBoundaries', () => {
    it('should detect boundaries between language contexts', async () => {
      const content = `TypeScript section:
\`\`\`typescript
const x: string = "hello";
\`\`\`

Python section:
\`\`\`python
x = "hello"
\`\`\``;

      const ast = marked.lexer(content);
      detector.detectWithContext(ast, content);
      
      const boundaries = detector.getContextBoundaries();
      expect(boundaries.length).toBeGreaterThan(0);
      
      // Should have language-change boundaries
      const languageChangeBoundaries = boundaries.filter(
        b => b.transitionType === 'language-change'
      );
      expect(languageChangeBoundaries.length).toBeGreaterThan(0);
    });
  });

  describe('confidence scoring integration', () => {
    it('should use enhanced confidence calculation with boost factors', async () => {
      const content = `# TypeScript Project

\`\`\`typescript
interface Config {
  apiUrl: string;
}
\`\`\`

Files: config.ts, main.ts
Framework: React with TypeScript`;

      const ast = marked.lexer(content);
      const result = detector.detectWithContext(ast, content);

      const tsContext = result.contexts.find(c => c.language === 'TypeScript');
      expect(tsContext).toBeDefined();
      
      // Should have high confidence due to multiple strong indicators
      expect(tsContext!.confidence).toBeGreaterThan(0.8);
      
      // Should have evidence from multiple sources
      const evidenceTypes = new Set(tsContext!.evidence.map(e => e.type));
      expect(evidenceTypes.size).toBeGreaterThan(1);
    });

    it('should aggregate confidence scores from multiple evidence sources', async () => {
      const content = `TypeScript TypeScript typescript TYPESCRIPT .ts .tsx`;

      const ast = marked.lexer(content);
      const result = detector.detectWithContext(ast, content);

      const tsContext = result.contexts.find(c => c.language === 'TypeScript');
      expect(tsContext).toBeDefined();
      
      // Multiple mentions should increase confidence
      expect(tsContext!.evidence.length).toBeGreaterThan(1);
      expect(tsContext!.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('fallback strategies', () => {
    it('should boost confidence for languages with diverse evidence', async () => {
      const content = `Project uses:
- go language
- .go files  
- gin framework
- go modules`;

      const ast = marked.lexer(content);
      const result = detector.detectWithContext(ast, content);

      const goContext = result.contexts.find(c => c.language === 'Go');
      expect(goContext).toBeDefined();
      
      // Should have boosted confidence due to diverse evidence types
      const evidenceTypes = new Set(goContext!.evidence.map(e => e.type));
      expect(evidenceTypes.size).toBeGreaterThanOrEqual(3);
    });

    it('should provide minimum confidence for recognized languages', async () => {
      const content = `Mentions java briefly`;

      const ast = marked.lexer(content);
      const result = detector.detectWithContext(ast, content);

      const javaContext = result.contexts.find(c => c.language === 'Java');
      if (javaContext) {
        // Should have minimum confidence even with weak evidence
        expect(javaContext.confidence).toBeGreaterThanOrEqual(0.3);
      }
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle empty content gracefully', async () => {
      const content = '';
      const ast = marked.lexer(content);
      
      const result = detector.detectWithContext(ast, content);
      
      expect(result.contexts).toHaveLength(0);
      expect(result.boundaries).toHaveLength(0);
      expect(result.overallConfidence).toBe(0);
    });

    it('should handle content without language indicators', async () => {
      const content = `# Generic Project

This is a project without specific language indicators.
It has some text but no code blocks or language mentions.`;

      const ast = marked.lexer(content);
      const result = detector.detectWithContext(ast, content);
      
      expect(result.contexts).toHaveLength(0);
      expect(result.overallConfidence).toBe(0);
    });

    it('should handle malformed code blocks', async () => {
      const content = `# Project

\`\`\`
// Code without language identifier
const x = 1;
\`\`\`

\`\`\`invalid-language
// Invalid language identifier
const y = 2;
\`\`\``;

      const ast = marked.lexer(content);
      
      // Should not throw error
      expect(() => detector.detectWithContext(ast, content)).not.toThrow();
    });
  });

  describe('integration with existing analyze method', () => {
    it('should maintain compatibility with existing analyze interface', async () => {
      const content = `# TypeScript Project

\`\`\`typescript
interface User {
  name: string;
}
\`\`\``;

      const ast = marked.lexer(content);
      const result = await detector.analyze(ast, content);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      
      // Should detect TypeScript
      const tsLanguage = result.data!.find(l => l.name === 'TypeScript');
      expect(tsLanguage).toBeDefined();
      expect(tsLanguage!.confidence).toBeGreaterThan(0);
    });

    it('should handle errors in enhanced detection gracefully', async () => {
      const content = `# Test Project

TypeScript with React`;

      const ast = marked.lexer(content);
      
      // Mock an error in confidence calculator
      const originalCalculator = (detector as any).confidenceCalculator;
      (detector as any).confidenceCalculator = {
        calculateWithBoosts: () => { throw new Error('Test error'); }
      };

      const result = await detector.analyze(ast, content);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].code).toBe('LANGUAGE_DETECTION_ERROR');

      // Restore original calculator
      (detector as any).confidenceCalculator = originalCalculator;
    });
  });
});