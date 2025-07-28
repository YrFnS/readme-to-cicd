/**
 * Unit tests for Language Context Infrastructure
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

describe('LanguageContext Infrastructure', () => {
  let sampleSourceRange: SourceRange;
  let sampleEvidence: Evidence[];

  beforeEach(() => {
    sampleSourceRange = {
      startLine: 0,
      endLine: 5,
      startColumn: 0,
      endColumn: 10
    };

    sampleEvidence = [
      {
        type: 'keyword' as EvidenceType,
        value: 'function',
        confidence: 0.8,
        location: sampleSourceRange,
        snippet: 'function test() {'
      }
    ];
  });

  describe('LanguageContextFactory', () => {
    it('should create a valid language context', () => {
      const context = LanguageContextFactory.create(
        'javascript',
        0.9,
        sampleSourceRange,
        sampleEvidence
      );

      expect(context.language).toBe('javascript');
      expect(context.confidence).toBe(0.9);
      expect(context.sourceRange).toEqual(sampleSourceRange);
      expect(context.evidence).toEqual(sampleEvidence);
      expect(context.metadata).toBeDefined();
      expect(context.metadata?.createdAt).toBeInstanceOf(Date);
    });

    it('should create a default unknown context', () => {
      const context = LanguageContextFactory.createDefault(sampleSourceRange);

      expect(context.language).toBe('unknown');
      expect(context.confidence).toBe(0.1);
      expect(context.sourceRange).toEqual(sampleSourceRange);
      expect(context.evidence).toEqual([]);
      expect(context.metadata?.source).toBe('default-context');
    });

    it('should validate language parameter', () => {
      expect(() => {
        LanguageContextFactory.create('', 0.5, sampleSourceRange, sampleEvidence);
      }).toThrow('Language must be a non-empty string');
    });

    it('should validate confidence parameter', () => {
      expect(() => {
        LanguageContextFactory.create('javascript', 1.5, sampleSourceRange, sampleEvidence);
      }).toThrow('Confidence must be a number between 0 and 1');

      expect(() => {
        LanguageContextFactory.create('javascript', -0.1, sampleSourceRange, sampleEvidence);
      }).toThrow('Confidence must be a number between 0 and 1');
    });

    it('should validate source range', () => {
      const invalidRange: SourceRange = {
        startLine: 5,
        endLine: 2,
        startColumn: 0,
        endColumn: 10
      };

      expect(() => {
        LanguageContextFactory.create('javascript', 0.5, invalidRange, sampleEvidence);
      }).toThrow('Invalid source range: start must be before or equal to end');
    });
  });

  describe('ContextInheritanceBase', () => {
    class TestContextInheritance extends ContextInheritanceBase {
      public testApplyInheritanceRules(childContext?: LanguageContext): LanguageContext | undefined {
        return this.applyInheritanceRules(childContext);
      }
    }

    let inheritance: TestContextInheritance;
    let parentContext: LanguageContext;
    let childContext: LanguageContext;

    beforeEach(() => {
      inheritance = new TestContextInheritance();
      
      parentContext = LanguageContextFactory.create(
        'javascript',
        0.8,
        sampleSourceRange,
        sampleEvidence
      );

      childContext = LanguageContextFactory.create(
        'typescript',
        0.9,
        {
          startLine: 6,
          endLine: 10,
          startColumn: 0,
          endColumn: 15
        },
        []
      );
    });

    it('should set and get parent context', () => {
      inheritance.setParentContext(parentContext);
      expect(inheritance.getParentContext()).toEqual(parentContext);
    });

    it('should add inheritance rules and sort by priority', () => {
      const rule1: InheritanceRule = {
        condition: 'always',
        action: 'inherit',
        priority: 1
      };

      const rule2: InheritanceRule = {
        condition: 'no-child-context',
        action: 'override',
        priority: 5
      };

      inheritance.addInheritanceRule(rule1);
      inheritance.addInheritanceRule(rule2);

      // Rules should be sorted by priority (highest first)
      expect(inheritance['inheritanceRules'][0]).toEqual(rule2);
      expect(inheritance['inheritanceRules'][1]).toEqual(rule1);
    });

    it('should apply inheritance rules correctly', () => {
      inheritance.setParentContext(parentContext);
      
      const inheritRule: InheritanceRule = {
        condition: 'always',
        action: 'inherit',
        priority: 1
      };
      
      inheritance.addInheritanceRule(inheritRule);
      
      const result = inheritance.testApplyInheritanceRules(childContext);
      expect(result).toEqual(parentContext);
    });

    it('should merge contexts when merge action is specified', () => {
      inheritance.setParentContext(parentContext);
      
      const mergeRule: InheritanceRule = {
        condition: 'always',
        action: 'merge',
        priority: 1
      };
      
      inheritance.addInheritanceRule(mergeRule);
      
      const result = inheritance.testApplyInheritanceRules(childContext);
      
      expect(result).toBeDefined();
      expect(result!.language).toBe('typescript'); // Child has higher confidence
      expect(result!.evidence.length).toBe(sampleEvidence.length); // Evidence merged
      expect(result!.parentContext).toEqual(parentContext);
    });

    it('should return child context when no parent is set', () => {
      const result = inheritance.testApplyInheritanceRules(childContext);
      expect(result).toEqual(childContext);
    });
  });

  describe('ContextBoundaryDetector', () => {
    let detector: ContextBoundaryDetector;
    let contexts: LanguageContext[];

    beforeEach(() => {
      detector = new ContextBoundaryDetector(0.5);
      
      contexts = [
        LanguageContextFactory.create('javascript', 0.9, {
          startLine: 0, endLine: 5, startColumn: 0, endColumn: 10
        }, sampleEvidence),
        LanguageContextFactory.create('python', 0.8, {
          startLine: 6, endLine: 10, startColumn: 0, endColumn: 15
        }, [])
      ];
    });

    it('should detect language change boundaries', () => {
      const boundaries = detector.detectBoundaries(contexts);
      
      expect(boundaries).toHaveLength(1);
      expect(boundaries[0].transitionType).toBe('language-change');
      expect(boundaries[0].beforeContext.language).toBe('javascript');
      expect(boundaries[0].afterContext.language).toBe('python');
    });

    it('should detect confidence drop boundaries', () => {
      const lowConfidenceContext = LanguageContextFactory.create('javascript', 0.3, {
        startLine: 6, endLine: 10, startColumn: 0, endColumn: 15
      }, []);

      const contextsWithConfidenceDrop = [contexts[0], lowConfidenceContext];
      const boundaries = detector.detectBoundaries(contextsWithConfidenceDrop);
      
      expect(boundaries).toHaveLength(1);
      expect(boundaries[0].transitionType).toBe('confidence-drop');
    });
  });

  describe('ContextCollection', () => {
    let collection: ContextCollection;
    let context1: LanguageContext;
    let context2: LanguageContext;

    beforeEach(() => {
      collection = new ContextCollection();
      
      context1 = LanguageContextFactory.create('javascript', 0.9, {
        startLine: 0, endLine: 5, startColumn: 0, endColumn: 10
      }, sampleEvidence);

      context2 = LanguageContextFactory.create('python', 0.8, {
        startLine: 6, endLine: 10, startColumn: 0, endColumn: 15
      }, []);
    });

    it('should add and retrieve contexts', () => {
      collection.addContext(context1);
      collection.addContext(context2);

      const allContexts = collection.getAllContexts();
      expect(allContexts).toHaveLength(2);
      expect(allContexts).toContain(context1);
      expect(allContexts).toContain(context2);
    });

    it('should get context at specific position', () => {
      collection.addContext(context1);
      collection.addContext(context2);

      const contextAt = collection.getContextAt(3, 5);
      expect(contextAt).toEqual(context1);

      const contextAt2 = collection.getContextAt(8, 5);
      expect(contextAt2).toEqual(context2);

      const noContext = collection.getContextAt(15, 5);
      expect(noContext).toBeUndefined();
    });

    it('should get contexts for specific language', () => {
      collection.addContext(context1);
      collection.addContext(context2);

      const jsContexts = collection.getContextsForLanguage('javascript');
      expect(jsContexts).toHaveLength(1);
      expect(jsContexts[0]).toEqual(context1);

      const pyContexts = collection.getContextsForLanguage('python');
      expect(pyContexts).toHaveLength(1);
      expect(pyContexts[0]).toEqual(context2);
    });

    it('should generate statistics', () => {
      collection.addContext(context1);
      collection.addContext(context2);

      const stats = collection.getStatistics();
      
      expect(stats.totalContexts).toBe(2);
      expect(stats.uniqueLanguages).toBe(2);
      expect(stats.languageDistribution).toEqual({
        javascript: 1,
        python: 1
      });
      expect(stats.averageConfidence).toBeCloseTo(0.85); // (0.9 + 0.8) / 2
      expect(stats.highConfidenceCount).toBe(2); // Both above 0.8
    });

    it('should clear all contexts', () => {
      collection.addContext(context1);
      collection.addContext(context2);
      
      expect(collection.getAllContexts()).toHaveLength(2);
      
      collection.clear();
      
      expect(collection.getAllContexts()).toHaveLength(0);
    });
  });
});