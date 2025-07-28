/**
 * Integration tests for Language Context Infrastructure
 * 
 * These tests verify that the language context components work together
 * correctly in realistic scenarios.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  LanguageContext,
  SourceRange,
  Evidence,
  EvidenceType,
  InheritanceRule,
  ContextInheritanceBase,
  LanguageContextFactory,
  ContextBoundaryDetector,
  ContextCollection
} from '../../src/shared/types';

describe('Language Context Integration', () => {
  describe('Multi-language document processing', () => {
    let collection: ContextCollection;

    beforeEach(() => {
      collection = new ContextCollection();
    });

    it('should handle a README with multiple programming languages', () => {
      // Simulate a README with JavaScript, Python, and shell commands
      const jsContext = LanguageContextFactory.create(
        'javascript',
        0.9,
        { startLine: 0, endLine: 10, startColumn: 0, endColumn: 50 },
        [
          {
            type: 'keyword' as EvidenceType,
            value: 'npm install',
            confidence: 0.9,
            location: { startLine: 2, endLine: 2, startColumn: 0, endColumn: 11 },
            snippet: 'npm install express'
          },
          {
            type: 'syntax' as EvidenceType,
            value: 'const',
            confidence: 0.8,
            location: { startLine: 5, endLine: 5, startColumn: 0, endColumn: 5 },
            snippet: 'const app = express();'
          }
        ]
      );

      const pythonContext = LanguageContextFactory.create(
        'python',
        0.85,
        { startLine: 15, endLine: 25, startColumn: 0, endColumn: 40 },
        [
          {
            type: 'keyword' as EvidenceType,
            value: 'pip install',
            confidence: 0.9,
            location: { startLine: 17, endLine: 17, startColumn: 0, endColumn: 11 },
            snippet: 'pip install flask'
          },
          {
            type: 'syntax' as EvidenceType,
            value: 'def',
            confidence: 0.8,
            location: { startLine: 20, endLine: 20, startColumn: 0, endColumn: 3 },
            snippet: 'def main():'
          }
        ]
      );

      const shellContext = LanguageContextFactory.create(
        'shell',
        0.7,
        { startLine: 30, endLine: 35, startColumn: 0, endColumn: 30 },
        [
          {
            type: 'syntax' as EvidenceType,
            value: 'docker run',
            confidence: 0.8,
            location: { startLine: 32, endLine: 32, startColumn: 0, endColumn: 10 },
            snippet: 'docker run -p 3000:3000 app'
          }
        ]
      );

      collection.addContext(jsContext);
      collection.addContext(pythonContext);
      collection.addContext(shellContext);

      // Verify contexts are properly stored and accessible
      expect(collection.getAllContexts()).toHaveLength(3);
      
      // Test position-based lookup
      expect(collection.getContextAt(5, 10)?.language).toBe('javascript');
      expect(collection.getContextAt(20, 5)?.language).toBe('python');
      expect(collection.getContextAt(32, 15)?.language).toBe('shell');

      // Test language-based filtering
      expect(collection.getContextsForLanguage('javascript')).toHaveLength(1);
      expect(collection.getContextsForLanguage('python')).toHaveLength(1);
      expect(collection.getContextsForLanguage('shell')).toHaveLength(1);

      // Test boundary detection
      const boundaries = collection.getBoundaries();
      expect(boundaries).toHaveLength(2); // JS->Python and Python->Shell
      expect(boundaries[0].transitionType).toBe('language-change');
      expect(boundaries[1].transitionType).toBe('language-change');

      // Test statistics
      const stats = collection.getStatistics();
      expect(stats.uniqueLanguages).toBe(3);
      expect(stats.totalContexts).toBe(3);
      expect(stats.languageDistribution).toEqual({
        javascript: 1,
        python: 1,
        shell: 1
      });
    });

    it('should handle overlapping contexts with different confidence levels', () => {
      // Create overlapping contexts where one has higher confidence
      const lowConfidenceContext = LanguageContextFactory.create(
        'javascript',
        0.4,
        { startLine: 0, endLine: 10, startColumn: 0, endColumn: 50 },
        [
          {
            type: 'pattern' as EvidenceType,
            value: 'generic pattern',
            confidence: 0.4,
            location: { startLine: 2, endLine: 2, startColumn: 0, endColumn: 15 }
          }
        ]
      );

      const highConfidenceContext = LanguageContextFactory.create(
        'typescript',
        0.9,
        { startLine: 5, endLine: 15, startColumn: 0, endColumn: 60 },
        [
          {
            type: 'syntax' as EvidenceType,
            value: 'interface',
            confidence: 0.9,
            location: { startLine: 7, endLine: 7, startColumn: 0, endColumn: 9 },
            snippet: 'interface User {'
          }
        ]
      );

      collection.addContext(lowConfidenceContext);
      collection.addContext(highConfidenceContext);

      // The overlapping area should return the first matching context (based on insertion order)
      const contextAt8 = collection.getContextAt(8, 10);
      // Since both contexts overlap at line 8, it returns the first one added (lowConfidenceContext)
      expect(contextAt8?.language).toBe('javascript');
      expect(contextAt8?.confidence).toBe(0.4);
      
      // But we can get contexts in the range and verify both are present
      const contextsInRange = collection.getContextsInRange({
        startLine: 8, endLine: 8, startColumn: 10, endColumn: 10
      });
      expect(contextsInRange).toHaveLength(2);
      expect(contextsInRange.some(c => c.language === 'javascript')).toBe(true);
      expect(contextsInRange.some(c => c.language === 'typescript')).toBe(true);

      // Test boundary detection for confidence changes
      const boundaries = collection.getBoundaries();
      expect(boundaries).toHaveLength(1);
      expect(boundaries[0].transitionType).toBe('language-change');
    });
  });

  describe('Context inheritance scenarios', () => {
    class TestInheritanceComponent extends ContextInheritanceBase {
      public processWithInheritance(childContext?: LanguageContext): LanguageContext | undefined {
        return this.applyInheritanceRules(childContext);
      }
    }

    it('should inherit context from parent when child has low confidence', () => {
      const component = new TestInheritanceComponent();
      
      // Set up inheritance rule for low confidence scenarios
      const lowConfidenceRule: InheritanceRule = {
        condition: 'low-confidence',
        action: 'inherit',
        priority: 10,
        description: 'Inherit parent context when child confidence is low'
      };
      
      component.addInheritanceRule(lowConfidenceRule);

      // Create parent context with high confidence
      const parentContext = LanguageContextFactory.create(
        'javascript',
        0.9,
        { startLine: 0, endLine: 20, startColumn: 0, endColumn: 100 },
        [
          {
            type: 'framework' as EvidenceType,
            value: 'react',
            confidence: 0.9,
            location: { startLine: 5, endLine: 5, startColumn: 0, endColumn: 5 }
          }
        ]
      );

      // Create child context with low confidence
      const childContext = LanguageContextFactory.create(
        'unknown',
        0.3,
        { startLine: 10, endLine: 15, startColumn: 0, endColumn: 50 },
        []
      );

      component.setParentContext(parentContext);
      const result = component.processWithInheritance(childContext);

      // Should inherit parent context due to low child confidence
      expect(result?.language).toBe('javascript');
      expect(result?.confidence).toBe(0.9);
    });

    it('should merge contexts when both have medium confidence', () => {
      const component = new TestInheritanceComponent();
      
      const mergeRule: InheritanceRule = {
        condition: 'always',
        action: 'merge',
        priority: 5,
        description: 'Always merge contexts'
      };
      
      component.addInheritanceRule(mergeRule);

      const parentContext = LanguageContextFactory.create(
        'javascript',
        0.7,
        { startLine: 0, endLine: 20, startColumn: 0, endColumn: 100 },
        [
          {
            type: 'dependency' as EvidenceType,
            value: 'express',
            confidence: 0.7,
            location: { startLine: 2, endLine: 2, startColumn: 0, endColumn: 7 }
          }
        ]
      );

      const childContext = LanguageContextFactory.create(
        'typescript',
        0.8,
        { startLine: 10, endLine: 15, startColumn: 0, endColumn: 50 },
        [
          {
            type: 'syntax' as EvidenceType,
            value: 'interface',
            confidence: 0.8,
            location: { startLine: 12, endLine: 12, startColumn: 0, endColumn: 9 }
          }
        ]
      );

      component.setParentContext(parentContext);
      const result = component.processWithInheritance(childContext);

      // Should merge contexts
      expect(result?.language).toBe('typescript'); // Child has higher confidence
      expect(result?.evidence).toHaveLength(2); // Evidence from both contexts
      expect(result?.parentContext).toEqual(parentContext);
    });
  });

  describe('Real-world README processing simulation', () => {
    it('should process a complex README with multiple sections', () => {
      const collection = new ContextCollection();
      
      // Simulate processing a README with:
      // 1. Project description (no specific language)
      // 2. Installation instructions (Node.js/npm)
      // 3. Python setup section
      // 4. Docker commands
      // 5. API examples (JavaScript)

      const contexts = [
        // Installation section - Node.js
        LanguageContextFactory.create(
          'javascript',
          0.85,
          { startLine: 10, endLine: 20, startColumn: 0, endColumn: 80 },
          [
            {
              type: 'tool' as EvidenceType,
              value: 'npm',
              confidence: 0.9,
              location: { startLine: 12, endLine: 12, startColumn: 0, endColumn: 3 },
              snippet: 'npm install'
            },
            {
              type: 'dependency' as EvidenceType,
              value: 'package.json',
              confidence: 0.8,
              location: { startLine: 15, endLine: 15, startColumn: 0, endColumn: 12 }
            }
          ]
        ),

        // Python setup section
        LanguageContextFactory.create(
          'python',
          0.9,
          { startLine: 25, endLine: 35, startColumn: 0, endColumn: 70 },
          [
            {
              type: 'tool' as EvidenceType,
              value: 'pip',
              confidence: 0.9,
              location: { startLine: 27, endLine: 27, startColumn: 0, endColumn: 3 },
              snippet: 'pip install -r requirements.txt'
            },
            {
              type: 'dependency' as EvidenceType,
              value: 'requirements.txt',
              confidence: 0.85,
              location: { startLine: 30, endLine: 30, startColumn: 0, endColumn: 15 }
            }
          ]
        ),

        // Docker section
        LanguageContextFactory.create(
          'shell',
          0.8,
          { startLine: 40, endLine: 50, startColumn: 0, endColumn: 90 },
          [
            {
              type: 'tool' as EvidenceType,
              value: 'docker',
              confidence: 0.9,
              location: { startLine: 42, endLine: 42, startColumn: 0, endColumn: 6 },
              snippet: 'docker build -t myapp .'
            },
            {
              type: 'syntax' as EvidenceType,
              value: 'docker-compose',
              confidence: 0.8,
              location: { startLine: 45, endLine: 45, startColumn: 0, endColumn: 14 }
            }
          ]
        ),

        // API examples - JavaScript
        LanguageContextFactory.create(
          'javascript',
          0.95,
          { startLine: 55, endLine: 70, startColumn: 0, endColumn: 100 },
          [
            {
              type: 'syntax' as EvidenceType,
              value: 'fetch',
              confidence: 0.9,
              location: { startLine: 57, endLine: 57, startColumn: 0, endColumn: 5 },
              snippet: 'fetch(\'/api/users\')'
            },
            {
              type: 'syntax' as EvidenceType,
              value: 'async/await',
              confidence: 0.95,
              location: { startLine: 60, endLine: 60, startColumn: 0, endColumn: 5 },
              snippet: 'const response = await fetch(...)'
            }
          ]
        )
      ];

      // Add all contexts to collection
      contexts.forEach(context => collection.addContext(context));

      // Verify comprehensive processing
      const stats = collection.getStatistics();
      expect(stats.totalContexts).toBe(4);
      expect(stats.uniqueLanguages).toBe(3); // JavaScript, Python, Shell
      expect(stats.languageDistribution.javascript).toBe(2); // Installation + API examples
      expect(stats.languageDistribution.python).toBe(1);
      expect(stats.languageDistribution.shell).toBe(1);

      // Verify high overall confidence
      expect(stats.averageConfidence).toBeGreaterThan(0.8);
      expect(stats.highConfidenceCount).toBe(4); // All contexts have confidence >= 0.8

      // Verify boundary detection
      const boundaries = collection.getBoundaries();
      expect(boundaries.length).toBeGreaterThan(0);

      // Test specific position lookups
      expect(collection.getContextAt(15, 10)?.language).toBe('javascript'); // Installation
      expect(collection.getContextAt(30, 5)?.language).toBe('python'); // Python setup
      expect(collection.getContextAt(45, 10)?.language).toBe('shell'); // Docker
      expect(collection.getContextAt(60, 20)?.language).toBe('javascript'); // API examples
    });
  });
});