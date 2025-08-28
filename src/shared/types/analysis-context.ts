/**
 * Analysis Context Infrastructure
 * 
 * This module provides the core infrastructure for sharing data between analyzers
 * during the analysis pipeline execution. It enables proper context propagation
 * and data flow validation.
 */

import { LanguageContext, Evidence, SourceRange } from './language-context';
import { ParseError } from '../../parser/types';

/**
 * Core analysis context interface that provides shared data between analyzers
 */
export interface AnalysisContext {
  /** Unique identifier for this analysis session */
  sessionId: string;
  
  /** Original content being analyzed */
  content: string;
  
  /** Language contexts detected during analysis */
  languageContexts: LanguageContext[];
  
  /** Shared data store for inter-analyzer communication */
  sharedData: Map<string, any>;
  
  /** Analysis metadata and tracking information */
  metadata: AnalysisMetadata;
  
  /** Context validation status */
  validation: ContextValidation;
  
  /** Performance tracking data */
  performance: PerformanceData;
  
  /** Inheritance chain for context propagation */
  inheritanceChain?: string[];
}

/**
 * Analysis metadata and tracking information
 */
export interface AnalysisMetadata {
  /** Timestamp when analysis started */
  startTime: Date;
  
  /** Current analysis stage */
  currentStage: string;
  
  /** Completed analysis stages */
  completedStages: string[];
  
  /** Failed analysis stages */
  failedStages: string[];
  
  /** Analyzers that have processed this context */
  processedBy: string[];
  
  /** Source file path (if applicable) */
  sourcePath?: string;
  
  /** Content hash for validation */
  contentHash: string;
  
  /** Current analyzer being executed */
  currentAnalyzer?: string;
  
  /** Performance tracking data */
  performance?: {
    startTime: number;
    endTime?: number;
    duration?: number;
    memoryUsage?: number;
    analyzerTimes?: Map<string, number>;
    totalProcessingTime?: number;
  };
  
  /** Quality metrics */
  quality?: {
    score: number;
    factors: Array<{ name: string; score: number; weight: number }>;
    confidenceDistribution?: {
      byAnalyzer: Map<string, number>;
      average: number;
      minimum: number;
      maximum: number;
      variance: number;
      standardDeviation: number;
    };
  };
  
  /** Analysis errors */
  errors?: ParseError[];
}

/**
 * Context validation status and data flow tracking
 */
export interface ContextValidation {
  /** Whether the context is valid for analysis */
  isValid: boolean;
  
  /** Data flow validation results */
  dataFlow: DataFlowValidation[];
  
  /** Context consistency checks */
  consistency: ConsistencyCheck[];
  
  /** Validation errors and warnings */
  issues: ValidationIssue[];
  
  /** Overall validation score (0-1) */
  validationScore: number;
  
  /** Validation errors */
  errors?: ValidationError[];
  
  /** Validation warnings */
  warnings?: ValidationWarning[];
  
  /** Rules that were applied during validation */
  rulesApplied?: string[];
  
  /** Data flow validation results */
  dataFlowValidation?: DataFlowValidation[];
}

/**
 * Data flow validation between analyzers
 */
export interface DataFlowValidation {
  /** Source analyzer name */
  sourceAnalyzer: string;
  
  /** Target analyzer name */
  targetAnalyzer: string;
  
  /** Data keys being passed */
  dataKeys: string[];
  
  /** Whether the data flow is valid */
  isValid: boolean;
  
  /** Validation errors */
  errors: string[];
  
  /** Data integrity score (0-1) */
  integrityScore: number;
  
  /** Execution sequence information */
  executionSequence?: {
    order: number;
    timestamp: Date;
    dependencies: string[];
  };
}

/**
 * Context consistency check result
 */
export interface ConsistencyCheck {
  /** Check type identifier */
  checkType: string;
  
  /** Whether the check passed */
  passed: boolean;
  
  /** Check description */
  description: string;
  
  /** Issues found during check */
  issues: string[];
  
  /** Confidence in the check result */
  confidence: number;
}

/**
 * Validation issue tracking
 */
export interface ValidationIssue {
  /** Issue type */
  type: 'error' | 'warning' | 'info';
  
  /** Issue severity */
  severity: 'critical' | 'high' | 'medium' | 'low';
  
  /** Issue message */
  message: string;
  
  /** Component that reported the issue */
  component: string;
  
  /** Source location (if applicable) */
  location?: SourceRange;
  
  /** Suggested resolution */
  resolution?: string;
}

/**
 * Performance tracking data
 */
export interface PerformanceData {
  /** Total analysis time (ms) */
  totalTime: number;
  
  /** Per-analyzer timing data */
  analyzerTimes: Map<string, number>;
  
  /** Memory usage tracking */
  memoryUsage: MemoryUsage;
  
  /** Performance metrics */
  metrics: PerformanceMetrics;
}

/**
 * Memory usage tracking
 */
export interface MemoryUsage {
  /** Peak memory usage (bytes) */
  peak: number;
  
  /** Current memory usage (bytes) */
  current: number;
  
  /** Memory usage by analyzer */
  byAnalyzer: Map<string, number>;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /** Operations per second */
  operationsPerSecond: number;
  
  /** Average processing time per analyzer */
  averageAnalyzerTime: number;
  
  /** Context switching overhead */
  contextSwitchingTime: number;
  
  /** Data serialization time */
  serializationTime: number;
}

/**
 * Context sharing configuration
 */
export interface ContextSharingConfig {
  /** Enable context validation */
  enableValidation: boolean;
  
  /** Enable performance tracking */
  enablePerformanceTracking: boolean;
  
  /** Maximum context size (bytes) */
  maxContextSize: number;
  
  /** Context timeout (ms) */
  contextTimeout: number;
  
  /** Enable data flow logging */
  enableDataFlowLogging: boolean;
}

/**
 * Context update operation
 */
export interface ContextUpdate {
  /** Analyzer making the update */
  analyzer: string;
  
  /** Update type */
  type: 'add' | 'update' | 'remove';
  
  /** Data key being updated */
  key: string;
  
  /** New value (for add/update operations) */
  value?: any;
  
  /** Update timestamp */
  timestamp: Date;
  
  /** Update metadata */
  metadata?: Record<string, any>;
}

/**
 * Context snapshot for rollback/recovery
 */
export interface ContextSnapshot {
  /** Snapshot identifier */
  id: string;
  
  /** Snapshot timestamp */
  timestamp: Date;
  
  /** Analyzer that created the snapshot */
  createdBy: string;
  
  /** Snapshot data */
  data: {
    languageContexts: LanguageContext[];
    sharedData: Record<string, any>;
    metadata: AnalysisMetadata;
  };
}

/**
 * Base class for context-aware analyzers
 */
export abstract class ContextAwareAnalyzer {
  protected context?: AnalysisContext;
  protected config: ContextSharingConfig;

  constructor(config: Partial<ContextSharingConfig> = {}) {
    this.config = {
      enableValidation: true,
      enablePerformanceTracking: true,
      maxContextSize: 10 * 1024 * 1024, // 10MB
      contextTimeout: 30000, // 30 seconds
      enableDataFlowLogging: false,
      ...config
    };
  }

  /**
   * Set the analysis context for this analyzer
   */
  public setAnalysisContext(context: AnalysisContext): void {
    this.context = context;
    this.onContextSet(context);
  }

  /**
   * Get the current analysis context
   */
  public getAnalysisContext(): AnalysisContext | undefined {
    return this.context;
  }

  /**
   * Update shared data in the context
   */
  protected updateSharedData(key: string, value: any, metadata?: Record<string, any>): void {
    if (!this.context) {
      throw new Error('Analysis context not set');
    }

    const update: ContextUpdate = {
      analyzer: this.getAnalyzerName(),
      type: this.context.sharedData.has(key) ? 'update' : 'add',
      key,
      value,
      timestamp: new Date(),
      metadata
    };

    this.context.sharedData.set(key, value);
    this.context.metadata.processedBy.push(this.getAnalyzerName());

    if (this.config.enableDataFlowLogging) {
      this.logContextUpdate(update);
    }
  }

  /**
   * Get shared data from the context
   */
  protected getSharedData<T = any>(key: string): T | undefined {
    if (!this.context) {
      return undefined;
    }

    return this.context.sharedData.get(key) as T;
  }

  /**
   * Check if shared data exists
   */
  protected hasSharedData(key: string): boolean {
    if (!this.context) {
      return false;
    }

    return this.context.sharedData.has(key);
  }

  /**
   * Get language contexts from the analysis context
   */
  protected getLanguageContexts(): LanguageContext[] {
    if (!this.context) {
      return [];
    }

    return this.context.languageContexts;
  }

  /**
   * Add a language context to the analysis context
   */
  protected addLanguageContext(context: LanguageContext): void {
    if (!this.context) {
      throw new Error('Analysis context not set');
    }

    this.context.languageContexts.push(context);
  }

  /**
   * Validate context data flow
   */
  protected validateDataFlow(targetAnalyzer: string, dataKeys: string[]): DataFlowValidation {
    if (!this.context) {
      return {
        sourceAnalyzer: this.getAnalyzerName(),
        targetAnalyzer,
        dataKeys,
        isValid: false,
        errors: ['Analysis context not set'],
        integrityScore: 0
      };
    }

    const errors: string[] = [];
    let validKeys = 0;

    for (const key of dataKeys) {
      if (!this.context.sharedData.has(key)) {
        errors.push(`Missing required data key: ${key}`);
      } else {
        validKeys++;
      }
    }

    const integrityScore = dataKeys.length > 0 ? validKeys / dataKeys.length : 1;
    const isValid = errors.length === 0;

    const validation: DataFlowValidation = {
      sourceAnalyzer: this.getAnalyzerName(),
      targetAnalyzer,
      dataKeys,
      isValid,
      errors,
      integrityScore
    };

    this.context.validation.dataFlow.push(validation);

    return validation;
  }

  /**
   * Create a context snapshot for rollback
   */
  protected createSnapshot(): ContextSnapshot {
    if (!this.context) {
      throw new Error('Analysis context not set');
    }

    return {
      id: `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      createdBy: this.getAnalyzerName(),
      data: {
        languageContexts: [...this.context.languageContexts],
        sharedData: Object.fromEntries(this.context.sharedData),
        metadata: { ...this.context.metadata }
      }
    };
  }

  /**
   * Abstract method to get the analyzer name
   */
  protected abstract getAnalyzerName(): string;

  /**
   * Called when context is set (override in subclasses)
   */
  protected onContextSet(context: AnalysisContext): void {
    // Default implementation - can be overridden
  }

  /**
   * Log context update (override in subclasses for custom logging)
   */
  protected logContextUpdate(update: ContextUpdate): void {
    // Default implementation - can be overridden
    console.debug(`Context update: ${update.analyzer} ${update.type} ${update.key}`);
  }
}

/**
 * Analysis context utilities
 */
export class AnalysisContextUtils {
  /**
   * Merge two analysis contexts
   */
  static merge(context1: AnalysisContext, context2: AnalysisContext): AnalysisContext {
    return {
      ...context1,
      languageContexts: [...context1.languageContexts, ...context2.languageContexts],
      sharedData: new Map([...context1.sharedData, ...context2.sharedData]),
      metadata: {
        ...context1.metadata,
        processedBy: [...context1.metadata.processedBy, ...context2.metadata.processedBy]
      }
    };
  }

  /**
   * Clone an analysis context
   */
  static clone(context: AnalysisContext): AnalysisContext {
    return {
      ...context,
      languageContexts: [...context.languageContexts],
      sharedData: new Map(context.sharedData),
      metadata: { ...context.metadata },
      validation: { ...context.validation },
      performance: { ...context.performance }
    };
  }

  /**
   * Validate an analysis context
   */
  static validate(context: AnalysisContext): ContextValidation {
    const issues: ValidationIssue[] = [];
    
    // Basic validation
    if (!context.sessionId) {
      issues.push({
        type: 'error',
        severity: 'critical',
        message: 'Missing session ID',
        component: 'AnalysisContextUtils'
      });
    }
    
    if (!context.content) {
      issues.push({
        type: 'warning',
        severity: 'medium',
        message: 'Empty content',
        component: 'AnalysisContextUtils'
      });
    }
    
    return {
      isValid: issues.filter(i => i.type === 'error').length === 0,
      dataFlow: context.validation.dataFlow,
      consistency: context.validation.consistency,
      issues,
      validationScore: issues.length === 0 ? 1.0 : 0.5
    };
  }
}

/**
 * Validation error type
 */
export class ValidationError extends Error {
  public readonly code?: string;
  
  constructor(message: string, public readonly component: string, code?: string) {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
  }
}

/**
 * Validation warning type
 */
export class ValidationWarning extends Error {
  public readonly code?: string;
  
  constructor(message: string, public readonly component: string, code?: string) {
    super(message);
    this.name = 'ValidationWarning';
    this.code = code;
  }
}

/**
 * Validation rule interface
 */
export interface ValidationRule {
  id?: string;
  name: string;
  description: string;
  mandatory?: boolean;
  validate: (context: AnalysisContext) => ValidationIssue[];
  result?: 'passed' | 'failed';
}

/**
 * Analyzer dependency interface
 */
export interface AnalyzerDependency {
  analyzer: string;
  dataKeys: string[];
  required: boolean;
  satisfied?: boolean;
  dependent?: string;
}

/**
 * Data propagation check interface
 */
export interface DataPropagationCheck {
  sourceAnalyzer: string;
  targetAnalyzer: string;
  dataKey: string;
  propagated: boolean;
  timestamp: Date;
  successful?: boolean;
  source?: string;
}

/**
 * Inheritance validation interface
 */
export interface InheritanceValidation {
  parentAnalyzer: string;
  childAnalyzer: string;
  inheritedKeys: string[];
  isValid: boolean;
  errors: string[];
  successful?: boolean;
  child?: string;
  parent?: string;
  inheritanceType?: string;
  error?: string;
}

/**
 * Context factory for creating analysis contexts
 */
export class AnalysisContextFactory {
  /**
   * Create a new analysis context
   */
  static create(
    content: string,
    config: Partial<ContextSharingConfig> = {},
    sourcePath?: string
  ): AnalysisContext {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const contentHash = this.calculateContentHash(content);

    return {
      sessionId,
      content,
      languageContexts: [],
      sharedData: new Map(),
      metadata: {
        startTime: new Date(),
        currentStage: 'initialization',
        completedStages: [],
        failedStages: [],
        processedBy: [],
        sourcePath,
        contentHash
      },
      validation: {
        isValid: true,
        dataFlow: [],
        consistency: [],
        issues: [],
        validationScore: 1.0
      },
      performance: {
        totalTime: 0,
        analyzerTimes: new Map(),
        memoryUsage: {
          peak: 0,
          current: 0,
          byAnalyzer: new Map()
        },
        metrics: {
          operationsPerSecond: 0,
          averageAnalyzerTime: 0,
          contextSwitchingTime: 0,
          serializationTime: 0
        }
      }
    };
  }

  /**
   * Calculate content hash for validation
   */
  private static calculateContentHash(content: string): string {
    // Simple hash function - in production, use a proper hash library
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Validate context integrity
   */
  static validateContext(context: AnalysisContext): ContextValidation {
    const issues: ValidationIssue[] = [];
    const consistency: ConsistencyCheck[] = [];

    // Check content hash
    const currentHash = this.calculateContentHash(context.content);
    if (currentHash !== context.metadata.contentHash) {
      issues.push({
        type: 'error',
        severity: 'critical',
        message: 'Content hash mismatch - context may be corrupted',
        component: 'AnalysisContextFactory'
      });
    }

    // Check language contexts consistency
    const languageCheck: ConsistencyCheck = {
      checkType: 'language-contexts',
      passed: context.languageContexts.every(ctx => ctx.language && ctx.confidence >= 0),
      description: 'Validate language contexts have valid data',
      issues: [],
      confidence: 1.0
    };

    context.languageContexts.forEach((ctx, index) => {
      if (!ctx.language) {
        languageCheck.issues.push(`Language context ${index} missing language`);
        languageCheck.passed = false;
      }
      if (ctx.confidence < 0 || ctx.confidence > 1) {
        languageCheck.issues.push(`Language context ${index} has invalid confidence: ${ctx.confidence}`);
        languageCheck.passed = false;
      }
    });

    consistency.push(languageCheck);

    // Calculate validation score
    const validationScore = issues.filter(i => i.type === 'error').length === 0 ? 1.0 : 0.5;

    return {
      isValid: issues.filter(i => i.type === 'error').length === 0,
      dataFlow: context.validation.dataFlow,
      consistency,
      issues,
      validationScore
    };
  }
}