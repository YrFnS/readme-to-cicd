/**
 * Context Manager
 * 
 * Provides utilities for managing language contexts, including context
 * creation, validation, and boundary detection.
 */

import { 
  LanguageContext, 
  SourceRange, 
  Evidence, 
  ContextBoundary, 
  BoundaryTransitionType,
  LanguageContextMetadata 
} from './language-context';

/**
 * Factory for creating language contexts with proper validation
 */
export class LanguageContextFactory {
  /**
   * Create a new language context with validation
   */
  public static create(
    language: string,
    confidence: number,
    sourceRange: SourceRange,
    evidence: Evidence[],
    parentContext?: LanguageContext,
    metadata?: Partial<LanguageContextMetadata>
  ): LanguageContext {
    // Validate inputs
    this.validateLanguage(language);
    this.validateConfidence(confidence);
    this.validateSourceRange(sourceRange);
    this.validateEvidence(evidence);

    const fullMetadata: LanguageContextMetadata = {
      createdAt: new Date(),
      source: 'context-factory',
      ...metadata
    };

    return {
      language,
      confidence,
      sourceRange,
      evidence,
      ...(parentContext && { parentContext }),
      metadata: fullMetadata
    };
  }

  /**
   * Create a default "unknown" language context
   */
  public static createDefault(sourceRange: SourceRange): LanguageContext {
    return this.create(
      'unknown',
      0.1,
      sourceRange,
      [],
      undefined,
      { source: 'default-context' }
    );
  }

  private static validateLanguage(language: string): void {
    if (!language || typeof language !== 'string' || language.trim().length === 0) {
      throw new Error('Language must be a non-empty string');
    }
  }

  private static validateConfidence(confidence: number): void {
    if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
      throw new Error('Confidence must be a number between 0 and 1');
    }
  }

  private static validateSourceRange(sourceRange: SourceRange): void {
    if (!sourceRange) {
      throw new Error('Source range is required');
    }
    
    if (sourceRange.startLine < 0 || sourceRange.endLine < 0 ||
        sourceRange.startColumn < 0 || sourceRange.endColumn < 0) {
      throw new Error('Source range coordinates must be non-negative');
    }

    if (sourceRange.startLine > sourceRange.endLine ||
        (sourceRange.startLine === sourceRange.endLine && 
         sourceRange.startColumn > sourceRange.endColumn)) {
      throw new Error('Invalid source range: start must be before or equal to end');
    }
  }

  private static validateEvidence(evidence: Evidence[]): void {
    if (!Array.isArray(evidence)) {
      throw new Error('Evidence must be an array');
    }

    for (const item of evidence) {
      if (!item.type || !item.value || typeof item.confidence !== 'number') {
        throw new Error('Invalid evidence item: missing required fields');
      }
      
      if (item.confidence < 0 || item.confidence > 1) {
        throw new Error('Evidence confidence must be between 0 and 1');
      }
    }
  }
}

/**
 * Utility for detecting context boundaries in content
 */
export class ContextBoundaryDetector {
  private confidenceThreshold: number = 0.5;

  constructor(confidenceThreshold?: number) {
    if (confidenceThreshold !== undefined) {
      this.confidenceThreshold = confidenceThreshold;
    }
  }

  /**
   * Detect boundaries between different language contexts
   */
  public detectBoundaries(contexts: LanguageContext[]): ContextBoundary[] {
    const boundaries: ContextBoundary[] = [];

    for (let i = 0; i < contexts.length - 1; i++) {
      const current = contexts[i];
      const next = contexts[i + 1];

      if (!current || !next) continue;

      const transitionType = this.determineTransitionType(current, next);
      if (transitionType) {
        boundaries.push({
          location: {
            startLine: current.sourceRange.endLine,
            endLine: next.sourceRange.startLine,
            startColumn: current.sourceRange.endColumn,
            endColumn: next.sourceRange.startColumn
          },
          beforeContext: current,
          afterContext: next,
          transitionType
        });
      }
    }

    return boundaries;
  }

  /**
   * Determine the type of transition between two contexts
   */
  private determineTransitionType(
    before: LanguageContext, 
    after: LanguageContext
  ): BoundaryTransitionType | null {
    // Language change
    if (before.language !== after.language) {
      return 'language-change';
    }

    // Framework change
    if (before.metadata?.framework !== after.metadata?.framework) {
      return 'framework-change';
    }

    // Confidence drop
    if (before.confidence >= this.confidenceThreshold && 
        after.confidence < this.confidenceThreshold) {
      return 'confidence-drop';
    }

    // No significant boundary detected
    return null;
  }
}

/**
 * Utility for managing context collections and lookups
 */
export class ContextCollection {
  private contexts: LanguageContext[] = [];
  private boundaryDetector: ContextBoundaryDetector;

  constructor(confidenceThreshold?: number) {
    this.boundaryDetector = new ContextBoundaryDetector(confidenceThreshold);
  }

  /**
   * Add a context to the collection
   */
  public addContext(context: LanguageContext): void {
    this.contexts.push(context);
    // Keep contexts sorted by source range start position
    this.contexts.sort((a, b) => {
      if (a.sourceRange.startLine !== b.sourceRange.startLine) {
        return a.sourceRange.startLine - b.sourceRange.startLine;
      }
      return a.sourceRange.startColumn - b.sourceRange.startColumn;
    });
  }

  /**
   * Get context at a specific position
   */
  public getContextAt(line: number, column: number): LanguageContext | undefined {
    return this.contexts.find(context => 
      this.isPositionInRange(line, column, context.sourceRange)
    );
  }

  /**
   * Get all contexts for a specific language
   */
  public getContextsForLanguage(language: string): LanguageContext[] {
    return this.contexts.filter(context => context.language === language);
  }

  /**
   * Get contexts within a specific range
   */
  public getContextsInRange(range: SourceRange): LanguageContext[] {
    return this.contexts.filter(context => 
      this.rangesOverlap(context.sourceRange, range)
    );
  }

  /**
   * Get all detected boundaries
   */
  public getBoundaries(): ContextBoundary[] {
    return this.boundaryDetector.detectBoundaries(this.contexts);
  }

  /**
   * Get all contexts
   */
  public getAllContexts(): LanguageContext[] {
    return [...this.contexts];
  }

  /**
   * Clear all contexts
   */
  public clear(): void {
    this.contexts = [];
  }

  /**
   * Get context statistics
   */
  public getStatistics(): ContextStatistics {
    const languageCounts = new Map<string, number>();
    let totalConfidence = 0;
    let highConfidenceCount = 0;

    for (const context of this.contexts) {
      languageCounts.set(
        context.language, 
        (languageCounts.get(context.language) || 0) + 1
      );
      totalConfidence += context.confidence;
      if (context.confidence >= 0.8) {
        highConfidenceCount++;
      }
    }

    return {
      totalContexts: this.contexts.length,
      uniqueLanguages: languageCounts.size,
      languageDistribution: Object.fromEntries(languageCounts),
      averageConfidence: this.contexts.length > 0 ? totalConfidence / this.contexts.length : 0,
      highConfidenceCount,
      boundaries: this.getBoundaries().length
    };
  }

  private isPositionInRange(line: number, column: number, range: SourceRange): boolean {
    if (line < range.startLine || line > range.endLine) {
      return false;
    }
    
    if (line === range.startLine && column < range.startColumn) {
      return false;
    }
    
    if (line === range.endLine && column > range.endColumn) {
      return false;
    }
    
    return true;
  }

  private rangesOverlap(range1: SourceRange, range2: SourceRange): boolean {
    return !(range1.endLine < range2.startLine || 
             range2.endLine < range1.startLine ||
             (range1.endLine === range2.startLine && range1.endColumn < range2.startColumn) ||
             (range2.endLine === range1.startLine && range2.endColumn < range1.startColumn));
  }
}

/**
 * Statistics about a context collection
 */
export interface ContextStatistics {
  totalContexts: number;
  uniqueLanguages: number;
  languageDistribution: Record<string, number>;
  averageConfidence: number;
  highConfidenceCount: number;
  boundaries: number;
}