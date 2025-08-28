/**
 * Analysis Context Infrastructure
 * 
 * This module provides the core infrastructure for sharing analysis context
 * and data between different analyzers in the integration pipeline.
 */

import { LanguageContext, Evidence, SourceRange } from './language-context';
import { ParseError } from '../../parser/types';

/**
 * Core analysis context interface that provides shared data and state
 * between analyzers during the analysis pipeline execution
 */
export interface AnalysisContext {
  /** Unique identifier for this analysis session */
  sessionId: string;
  
  /** Language contexts detected and shared between analyzers */
  languageContexts: LanguageContext[];
  
  /** Shared data store for inter-analyzer communication */
  sharedData: Map<string, any>;
  
  /** Analysis metadata and processing information */
  metadata: AnalysisMetadata;
  
  /** Context validation state */
  validation: ContextValidation;
  
  /** Context inheritance chain */
  inheritanceChain: ContextInheritance[];
}

/**
 * Metadata about the analysis process and context
 */
export interface AnalysisMetadata {
  /** Timestamp when analysis started */
  startTime: Date;
  
  /** Timestamp when analysis completed (if finished) */
  endTime?: Date;
  
  /** List of analyzers that have processed this context */
  processedBy: string[];
  
  /** Current analyzer being executed */
  currentAnalyzer?: string;
  
  /** Source content information */
  sourceInfo: SourceInfo;
  
  /** Performance metrics */
  performance: PerformanceMetrics;
  
  /** Quality metrics */
  quality: QualityMetrics;
}

/**
 * Information about the source content being analyzed
 */
export interface SourceInfo {
  /** Content length in characters */
  contentLength: number;
  
  /** Number of lines in the content */
  lineCount: number;
  
  /** Content hash for caching and validation */
  contentHash: string;
  
  /** Source file path (if available) */
  filePath?: string;
  
  /** Content type/format */
  contentType: 'markdown' | 'text' | 'other';
}

/**
 * Performance metrics for the analysis process
 */
export interface PerformanceMetrics {
  /** Total processing time in milliseconds */
  totalProcessingTime: number;
  
  /** Processing time per analyzer */
  analyzerTimes: Map<string, number>;
  
  /** Memory usage metrics */
  memoryUsage?: MemoryUsage;
  
  /** Cache hit/miss statistics */
  cacheStats?: CacheStatistics;
}

/**
 * Memory usage information
 */
export interface MemoryUsage {
  /** Peak memory usage in bytes */
  peakUsage: number;
  
  /** Current memory usage in bytes */
  currentUsage: number;
  
  /** Memory usage by component */
  componentUsage: Map<string, number>;
}

/**
 * Cache statistics
 */
export interface CacheStatistics {
  /** Number of cache hits */
  hits: number;
  
  /** Number of cache misses */
  misses: number;
  
  /** Cache hit ratio (0.0 to 1.0) */
  hitRatio: number;
}

/**
 * Quality metrics for the analysis results
 */
export interface QualityMetrics {
  /** Overall data quality score (0.0 to 1.0) */
  overallQuality: number;
  
  /** Completeness score (0.0 to 1.0) */
  completeness: number;
  
  /** Consistency score across analyzers (0.0 to 1.0) */
  consistency: number;
  
  /** Confidence score aggregation */
  confidenceDistribution: ConfidenceDistribution;
  
  /** Data integrity checks */
  integrityChecks: IntegrityCheck[];
}

/**
 * Distribution of confidence scores across different analysis aspects
 */
export interface ConfidenceDistribution {
  /** Average confidence across all analyzers */
  average: number;
  
  /** Minimum confidence score */
  minimum: number;
  
  /** Maximum confidence score */
  maximum: number;
  
  /** Standard deviation of confidence scores */
  standardDeviation: number;
  
  /** Confidence scores by analyzer */
  byAnalyzer: Map<string, number>;
}

/**
 * Data integrity check result
 */
export interface IntegrityCheck {
  /** Name of the integrity check */
  name: string;
  
  /** Whether the check passed */
  passed: boolean;
  
  /** Severity of failure (if any) */
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  /** Description of the check or failure */
  description: string;
  
  /** Suggested remediation */
  remediation?: string;
}

/**
 * Context validation state and results
 */
export interface ContextValidation {
  /** Whether the context is valid */
  isValid: boolean;
  
  /** Validation errors */
  errors: ValidationError[];
  
  /** Validation warnings */
  warnings: ValidationWarning[];
  
  /** Validation rules that were applied */
  rulesApplied: ValidationRule[];
  
  /** Data flow validation results */
  dataFlowValidation: DataFlowValidation;
}

/**
 * Validation error information
 */
export interface ValidationError {
  /** Error code */
  code: string;
  
  /** Human-readable error message */
  message: string;
  
  /** Component that generated the error */
  component: string;
  
  /** Severity level */
  severity: 'error' | 'warning' | 'info';
  
  /** Location where error occurred (if applicable) */
  location?: SourceRange;
  
  /** Suggested fix */
  suggestedFix?: string;
}

/**
 * Validation warning information
 */
export interface ValidationWarning {
  /** Warning code */
  code: string;
  
  /** Human-readable warning message */
  message: string;
  
  /** Component that generated the warning */
  component: string;
  
  /** Location where warning occurred (if applicable) */
  location?: SourceRange;
}

/**
 * Validation rule definition
 */
export interface ValidationRule {
  /** Rule identifier */
  id: string;
  
  /** Rule name */
  name: string;
  
  /** Rule description */
  description: string;
  
  /** Rule type */
  type: 'data-integrity' | 'context-consistency' | 'flow-validation' | 'quality-check';
  
  /** Whether the rule is mandatory */
  mandatory: boolean;
  
  /** Rule execution result */
  result: 'passed' | 'failed' | 'skipped';
}

/**
 * Data flow validation results
 */
export interface DataFlowValidation {
  /** Whether data flow is valid */
  isValid: boolean;
  
  /** Sequence of analyzers executed */
  executionSequence: string[];
  
  /** Dependencies between analyzers */
  dependencies: AnalyzerDependency[];
  
  /** Data propagation validation */
  dataPropagation: DataPropagationCheck[];
  
  /** Context inheritance validation */
  inheritanceValidation: InheritanceValidation[];
}

/**
 * Analyzer dependency information
 */
export interface AnalyzerDependency {
  /** Analyzer that depends on another */
  dependent: string;
  
  /** Analyzer that is depended upon */
  dependency: string;
  
  /** Type of dependency */
  type: 'data' | 'context' | 'sequence' | 'optional';
  
  /** Whether the dependency was satisfied */
  satisfied: boolean;
  
  /** Description of the dependency */
  description?: string;
}

/**
 * Data propagation check result
 */
export interface DataPropagationCheck {
  /** Source analyzer */
  source: string;
  
  /** Target analyzer */
  target: string;
  
  /** Data key being propagated */
  dataKey: string;
  
  /** Whether propagation was successful */
  successful: boolean;
  
  /** Error message if propagation failed */
  error?: string;
}

/**
 * Context inheritance validation result
 */
export interface InheritanceValidation {
  /** Child analyzer */
  child: string;
  
  /** Parent analyzer */
  parent: string;
  
  /** Type of inheritance */
  inheritanceType: 'language-context' | 'shared-data' | 'metadata';
  
  /** Whether inheritance was successful */
  successful: boolean;
  
  /** Inheritance rule applied */
  ruleApplied?: string;
  
  /** Error message if inheritance failed */
  error?: string;
}

/**
 * Context inheritance information
 */
export interface ContextInheritance {
  /** Analyzer that inherited context */
  analyzer: string;
  
  /** Source of the inherited context */
  source: string;
  
  /** Type of inheritance */
  type: 'language-context' | 'shared-data' | 'metadata';
  
  /** Timestamp when inheritance occurred */
  timestamp: Date;
  
  /** Success status */
  successful: boolean;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Context builder for creating and managing analysis contexts
 */
export class AnalysisContextBuilder {
  private context: Partial<AnalysisContext> = {};
  
  /**
   * Create a new context builder
   */
  static create(): AnalysisContextBuilder {
    return new AnalysisContextBuilder();
  }
  
  /**
   * Set the session ID
   */
  withSessionId(sessionId: string): AnalysisContextBuilder {
    this.context.sessionId = sessionId;
    return this;
  }
  
  /**
   * Set language contexts
   */
  withLanguageContexts(contexts: LanguageContext[]): AnalysisContextBuilder {
    this.context.languageContexts = contexts;
    return this;
  }
  
  /**
   * Set source information
   */
  withSourceInfo(sourceInfo: SourceInfo): AnalysisContextBuilder {
    if (!this.context.metadata) {
      this.context.metadata = this.createDefaultMetadata();
    }
    this.context.metadata.sourceInfo = sourceInfo;
    return this;
  }
  
  /**
   * Add shared data
   */
  withSharedData(key: string, value: any): AnalysisContextBuilder {
    if (!this.context.sharedData) {
      this.context.sharedData = new Map();
    }
    this.context.sharedData.set(key, value);
    return this;
  }
  
  /**
   * Build the analysis context
   */
  build(): AnalysisContext {
    // Ensure all required fields are present
    const sessionId = this.context.sessionId || this.generateSessionId();
    const languageContexts = this.context.languageContexts || [];
    const sharedData = this.context.sharedData || new Map();
    const metadata = this.context.metadata || this.createDefaultMetadata();
    const validation = this.createDefaultValidation();
    const inheritanceChain = this.context.inheritanceChain || [];
    
    return {
      sessionId,
      languageContexts,
      sharedData,
      metadata,
      validation,
      inheritanceChain
    };
  }
  
  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Create default metadata
   */
  private createDefaultMetadata(): AnalysisMetadata {
    return {
      startTime: new Date(),
      processedBy: [],
      sourceInfo: {
        contentLength: 0,
        lineCount: 0,
        contentHash: '',
        contentType: 'markdown'
      },
      performance: {
        totalProcessingTime: 0,
        analyzerTimes: new Map()
      },
      quality: {
        overallQuality: 0,
        completeness: 0,
        consistency: 0,
        confidenceDistribution: {
          average: 0,
          minimum: 0,
          maximum: 0,
          standardDeviation: 0,
          byAnalyzer: new Map()
        },
        integrityChecks: []
      }
    };
  }
  
  /**
   * Create default validation state
   */
  private createDefaultValidation(): ContextValidation {
    return {
      isValid: true,
      errors: [],
      warnings: [],
      rulesApplied: [],
      dataFlowValidation: {
        isValid: true,
        executionSequence: [],
        dependencies: [],
        dataPropagation: [],
        inheritanceValidation: []
      }
    };
  }
}

/**
 * Utility functions for working with analysis contexts
 */
export class AnalysisContextUtils {
  /**
   * Validate an analysis context
   */
  static validate(context: AnalysisContext): ContextValidation {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const rulesApplied: ValidationRule[] = [];
    
    // Basic validation rules
    const rules = [
      {
        id: 'session-id-present',
        name: 'Session ID Present',
        description: 'Context must have a valid session ID',
        type: 'data-integrity' as const,
        mandatory: true,
        check: () => !!context.sessionId && context.sessionId.length > 0
      },
      {
        id: 'metadata-present',
        name: 'Metadata Present',
        description: 'Context must have metadata',
        type: 'data-integrity' as const,
        mandatory: true,
        check: () => !!context.metadata
      },
      {
        id: 'shared-data-initialized',
        name: 'Shared Data Initialized',
        description: 'Shared data map must be initialized',
        type: 'data-integrity' as const,
        mandatory: true,
        check: () => context.sharedData instanceof Map
      }
    ];
    
    // Apply validation rules
    for (const rule of rules) {
      const passed = rule.check();
      const ruleResult: ValidationRule = {
        ...rule,
        result: passed ? 'passed' : 'failed'
      };
      rulesApplied.push(ruleResult);
      
      if (!passed && rule.mandatory) {
        errors.push({
          code: rule.id,
          message: `Validation failed: ${rule.description}`,
          component: 'AnalysisContextValidator',
          severity: 'error'
        });
      }
    }
    
    // Data flow validation
    const dataFlowValidation = this.validateDataFlow(context);
    
    return {
      isValid: errors.length === 0 && dataFlowValidation.isValid,
      errors,
      warnings,
      rulesApplied,
      dataFlowValidation
    };
  }
  
  /**
   * Validate data flow within the context
   */
  private static validateDataFlow(context: AnalysisContext): DataFlowValidation {
    return {
      isValid: true,
      executionSequence: context.metadata.processedBy,
      dependencies: [],
      dataPropagation: [],
      inheritanceValidation: []
    };
  }
  
  /**
   * Merge two analysis contexts
   */
  static merge(primary: AnalysisContext, secondary: AnalysisContext): AnalysisContext {
    return {
      sessionId: primary.sessionId,
      languageContexts: [...primary.languageContexts, ...secondary.languageContexts],
      sharedData: new Map([...primary.sharedData, ...secondary.sharedData]),
      metadata: {
        ...primary.metadata,
        processedBy: [...new Set([...primary.metadata.processedBy, ...secondary.metadata.processedBy])],
        endTime: secondary.metadata.endTime || primary.metadata.endTime
      },
      validation: primary.validation, // Keep primary validation
      inheritanceChain: [...primary.inheritanceChain, ...secondary.inheritanceChain]
    };
  }
  
  /**
   * Create a hash of the context for caching
   */
  static hash(context: AnalysisContext): string {
    const hashData = {
      sessionId: context.sessionId,
      languageContextsCount: context.languageContexts.length,
      sharedDataKeys: Array.from(context.sharedData.keys()).sort(),
      contentHash: context.metadata.sourceInfo.contentHash
    };
    
    return Buffer.from(JSON.stringify(hashData)).toString('base64');
  }
}