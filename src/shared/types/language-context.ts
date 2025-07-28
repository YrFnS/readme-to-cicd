/**
 * Language Context Infrastructure
 * 
 * This module provides the core infrastructure for language context sharing
 * between components, including context inheritance, source tracking, and
 * evidence management.
 */

/**
 * Represents a specific location or range within source content
 */
export interface SourceRange {
  /** Starting line number (0-based) */
  startLine: number;
  /** Ending line number (0-based) */
  endLine: number;
  /** Starting column number (0-based) */
  startColumn: number;
  /** Ending column number (0-based) */
  endColumn: number;
}

/**
 * Evidence supporting a language detection or context decision
 */
export interface Evidence {
  /** Type of evidence found */
  type: EvidenceType;
  /** The actual evidence value (keyword, filename, etc.) */
  value: string;
  /** Confidence score for this piece of evidence (0.0 to 1.0) */
  confidence: number;
  /** Location where this evidence was found */
  location: SourceRange;
  /** Optional snippet of the surrounding context */
  snippet?: string;
}

/**
 * Types of evidence that can support language detection
 */
export type EvidenceType = 
  | 'keyword'        // Language-specific keywords
  | 'extension'      // File extensions
  | 'syntax'         // Syntax patterns
  | 'dependency'     // Package/dependency names
  | 'framework'      // Framework identifiers
  | 'tool'           // Tool references
  | 'pattern'        // Code patterns
  | 'declaration';   // Explicit declarations

/**
 * Core language context interface that provides language information
 * and context inheritance capabilities
 */
export interface LanguageContext {
  /** The detected or assigned language */
  language: string;
  /** Confidence score for this language context (0.0 to 1.0) */
  confidence: number;
  /** Source range where this context applies */
  sourceRange: SourceRange;
  /** Evidence supporting this language context */
  evidence: Evidence[];
  /** Parent context for inheritance (optional) */
  parentContext?: LanguageContext;
  /** Additional metadata for this context */
  metadata?: LanguageContextMetadata;
}

/**
 * Additional metadata for language contexts
 */
export interface LanguageContextMetadata {
  /** Timestamp when context was created */
  createdAt: Date;
  /** Component that created this context */
  source: string;
  /** Framework or dialect information */
  framework?: string;
  /** Version information if available */
  version?: string;
  /** Additional properties */
  properties?: Record<string, any>;
}

/**
 * Context boundary represents a transition point between different language contexts
 */
export interface ContextBoundary {
  /** Location of the boundary */
  location: SourceRange;
  /** Context before the boundary */
  beforeContext: LanguageContext;
  /** Context after the boundary */
  afterContext: LanguageContext;
  /** Type of boundary transition */
  transitionType: BoundaryTransitionType;
}

/**
 * Types of context boundary transitions
 */
export type BoundaryTransitionType = 
  | 'language-change'    // Different programming language
  | 'framework-change'   // Different framework within same language
  | 'section-change'     // Different document section
  | 'explicit-marker'    // Explicit context marker
  | 'confidence-drop';   // Confidence threshold crossed

/**
 * Rules for context inheritance between components
 */
export interface InheritanceRule {
  /** Condition that must be met for this rule to apply */
  condition: string;
  /** Action to take when condition is met */
  action: InheritanceAction;
  /** Priority of this rule (higher numbers take precedence) */
  priority: number;
  /** Optional description of the rule */
  description?: string;
}

/**
 * Actions that can be taken during context inheritance
 */
export type InheritanceAction = 
  | 'inherit'    // Use parent context as-is
  | 'override'   // Replace parent context completely
  | 'merge'      // Combine parent and child contexts
  | 'ignore';    // Ignore parent context

/**
 * Base class for components that can inherit language context
 */
export abstract class ContextInheritanceBase {
  protected parentContext?: LanguageContext;
  protected inheritanceRules: InheritanceRule[] = [];

  /**
   * Set the parent context for inheritance
   */
  public setParentContext(context: LanguageContext): void {
    this.parentContext = context;
  }

  /**
   * Get the current parent context
   */
  public getParentContext(): LanguageContext | undefined {
    return this.parentContext;
  }

  /**
   * Add an inheritance rule
   */
  public addInheritanceRule(rule: InheritanceRule): void {
    this.inheritanceRules.push(rule);
    // Sort by priority (highest first)
    this.inheritanceRules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Apply inheritance rules to determine the effective context
   */
  protected applyInheritanceRules(childContext?: LanguageContext): LanguageContext | undefined {
    if (!this.parentContext) {
      return childContext;
    }

    // Find the first matching rule
    for (const rule of this.inheritanceRules) {
      if (this.evaluateCondition(rule.condition, childContext)) {
        return this.executeInheritanceAction(rule.action, this.parentContext, childContext);
      }
    }

    // Default behavior: inherit if no child context, otherwise use child
    return childContext || this.parentContext;
  }

  /**
   * Evaluate a condition string against the current context
   */
  private evaluateCondition(condition: string, childContext?: LanguageContext): boolean {
    // Simple condition evaluation - can be extended for more complex logic
    switch (condition) {
      case 'always':
        return true;
      case 'no-child-context':
        return !childContext;
      case 'has-child-context':
        return !!childContext;
      case 'low-confidence':
        return childContext ? childContext.confidence < 0.5 : true;
      case 'high-confidence':
        return childContext ? childContext.confidence >= 0.8 : false;
      default:
        return false;
    }
  }

  /**
   * Execute an inheritance action
   */
  private executeInheritanceAction(
    action: InheritanceAction,
    parentContext: LanguageContext,
    childContext?: LanguageContext
  ): LanguageContext | undefined {
    switch (action) {
      case 'inherit':
        return parentContext;
      case 'override':
        return childContext;
      case 'merge':
        return this.mergeContexts(parentContext, childContext);
      case 'ignore':
        return childContext;
      default:
        return childContext || parentContext;
    }
  }

  /**
   * Merge parent and child contexts
   */
  private mergeContexts(
    parentContext: LanguageContext,
    childContext?: LanguageContext
  ): LanguageContext {
    if (!childContext) {
      return parentContext;
    }

    // Merge evidence arrays
    const mergedEvidence = [...parentContext.evidence, ...childContext.evidence];
    
    // Calculate weighted confidence
    const totalConfidence = (parentContext.confidence + childContext.confidence) / 2;

    // Use child's source range but keep parent as parent
    return {
      language: childContext.confidence > parentContext.confidence 
        ? childContext.language 
        : parentContext.language,
      confidence: totalConfidence,
      sourceRange: childContext.sourceRange,
      evidence: mergedEvidence,
      parentContext: parentContext,
      metadata: {
        ...parentContext.metadata,
        ...childContext.metadata,
        createdAt: new Date(),
        source: 'merged-context'
      }
    };
  }
}