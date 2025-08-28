/**
 * Context-Aware Analyzer Base Class
 * 
 * Provides base functionality for analyzers that can share and use
 * analysis context for improved coordination and data flow.
 */

import { ContentAnalyzer, AnalysisResult, MarkdownAST, ParseError } from '../types';
import { AnalysisContext, AnalysisContextUtils, ValidationError } from '../../shared/types/analysis-context';
import { LanguageContext } from '../../shared/types/language-context';

/**
 * Base class for context-aware analyzers that can share data and coordinate
 * with other analyzers through the analysis context
 */
export abstract class ContextAwareAnalyzer implements ContentAnalyzer {
  abstract readonly name: string;
  
  /**
   * Analyze content with optional shared context
   */
  async analyze(
    ast: MarkdownAST, 
    rawContent: string, 
    context?: AnalysisContext
  ): Promise<AnalysisResult> {
    const startTime = Date.now();
    
    try {
      // Update context with current analyzer
      if (context) {
        this.updateContextMetadata(context, startTime);
      }
      
      // Perform context-aware analysis
      const result = await this.performAnalysis(ast, rawContent, context);
      
      // Update context with results
      if (context) {
        this.updateContextWithResults(context, result, startTime);
      }
      
      return result;
      
    } catch (error) {
      const errorResult: AnalysisResult = {
        data: null,
        confidence: 0,
        sources: [],
        errors: [{
          code: 'CONTEXT_AWARE_ANALYSIS_ERROR',
          message: error instanceof Error ? error.message : 'Unknown analysis error',
          component: this.name,
          severity: 'error'
        }]
      };
      
      // Update context with error
      if (context) {
        this.updateContextWithError(context, error, startTime);
      }
      
      return errorResult;
    }
  }
  
  /**
   * Perform the actual analysis - to be implemented by subclasses
   */
  protected abstract performAnalysis(
    ast: MarkdownAST, 
    rawContent: string, 
    context?: AnalysisContext
  ): Promise<AnalysisResult>;
  
  /**
   * Update context metadata when analysis starts
   */
  protected updateContextMetadata(context: AnalysisContext, startTime: number): void {
    context.metadata.currentAnalyzer = this.name;
    context.metadata.processedBy.push(this.name);
    context.metadata.performance.analyzerTimes.set(this.name, startTime);
  }
  
  /**
   * Update context with analysis results
   */
  protected updateContextWithResults(
    context: AnalysisContext, 
    result: AnalysisResult, 
    startTime: number
  ): void {
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    // Update performance metrics
    context.metadata.performance.analyzerTimes.set(this.name, processingTime);
    context.metadata.performance.totalProcessingTime += processingTime;
    
    // Update quality metrics
    if (result.confidence !== undefined) {
      context.metadata.quality.confidenceDistribution.byAnalyzer.set(this.name, result.confidence);
      this.updateConfidenceDistribution(context);
    }
    
    // Store analyzer result in shared data
    context.sharedData.set(`${this.name}_result`, result);
    
    // Add any errors to context validation
    if (result.errors && result.errors.length > 0) {
      // Convert ParseError to ValidationError
      const validationErrors = result.errors.map(error => 
        new ValidationError(error.message, this.name, error.code)
      );
      context.validation.errors.push(...validationErrors);
    }
  }
  
  /**
   * Update context with error information
   */
  protected updateContextWithError(
    context: AnalysisContext, 
    error: any, 
    startTime: number
  ): void {
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    // Update performance metrics
    context.metadata.performance.analyzerTimes.set(this.name, processingTime);
    context.metadata.performance.totalProcessingTime += processingTime;
    
    // Add error to validation
    context.validation.errors.push(new ValidationError(
      `Analyzer ${this.name} execution failed: ${error instanceof Error ? error.message : 'Unknown analyzer error'}`,
      this.name,
      'ANALYZER_EXECUTION_ERROR'
    ));
    
    // Mark context as invalid
    context.validation.isValid = false;
  }
  
  /**
   * Update confidence distribution statistics
   */
  private updateConfidenceDistribution(context: AnalysisContext): void {
    const confidences = Array.from(context.metadata.quality.confidenceDistribution.byAnalyzer.values());
    
    if (confidences.length === 0) return;
    
    const sum = confidences.reduce((a, b) => a + b, 0);
    const average = sum / confidences.length;
    const minimum = Math.min(...confidences);
    const maximum = Math.max(...confidences);
    
    // Calculate standard deviation
    const variance = confidences.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / confidences.length;
    const standardDeviation = Math.sqrt(variance);
    
    context.metadata.quality.confidenceDistribution = {
      average,
      minimum,
      maximum,
      variance,
      standardDeviation,
      byAnalyzer: context.metadata.quality.confidenceDistribution.byAnalyzer
    };
  }
  
  /**
   * Get language contexts from shared context
   */
  protected getLanguageContexts(context?: AnalysisContext): LanguageContext[] {
    return context?.languageContexts || [];
  }
  
  /**
   * Add language context to shared context
   */
  protected addLanguageContext(context: AnalysisContext, languageContext: LanguageContext): void {
    context.languageContexts.push(languageContext);
  }
  
  /**
   * Get shared data by key
   */
  protected getSharedData<T>(context: AnalysisContext, key: string): T | undefined {
    return context.sharedData.get(key) as T | undefined;
  }
  
  /**
   * Set shared data by key
   */
  protected setSharedData<T>(context: AnalysisContext, key: string, value: T): void {
    context.sharedData.set(key, value);
  }
  
  /**
   * Get result from another analyzer
   */
  protected getAnalyzerResult(context: AnalysisContext, analyzerName: string): AnalysisResult | undefined {
    return this.getSharedData<AnalysisResult>(context, `${analyzerName}_result`);
  }
  
  /**
   * Check if another analyzer has been executed
   */
  protected hasAnalyzerExecuted(context: AnalysisContext, analyzerName: string): boolean {
    return context.metadata.processedBy.includes(analyzerName);
  }
  
  /**
   * Get dependency data from another analyzer
   */
  protected getDependencyData<T>(
    context: AnalysisContext, 
    analyzerName: string, 
    dataKey?: string
  ): T | undefined {
    const result = this.getAnalyzerResult(context, analyzerName);
    if (!result || !result.data) return undefined;
    
    if (dataKey) {
      return result.data[dataKey] as T;
    }
    
    return result.data as T;
  }
  
  /**
   * Validate context before analysis
   */
  protected validateContext(context?: AnalysisContext): boolean {
    if (!context) return true; // Context is optional
    
    const validation = AnalysisContextUtils.validate(context);
    return validation.isValid;
  }
  
  /**
   * Log context information for debugging
   */
  protected logContextInfo(context?: AnalysisContext, message?: string): void {
    if (!context) return;
    
    const info = {
      analyzer: this.name,
      sessionId: context.sessionId,
      processedBy: context.metadata.processedBy,
      languageContextsCount: context.languageContexts.length,
      sharedDataKeys: Array.from(context.sharedData.keys()),
      message
    };
    
    console.log(`[${this.name}] Context Info:`, JSON.stringify(info, null, 2));
  }
}

/**
 * Utility class for context-aware analyzer operations
 */
export class ContextAwareAnalyzerUtils {
  /**
   * Create a context inheritance record
   */
  static createInheritanceRecord(
    analyzer: string,
    source: string,
    type: 'language-context' | 'shared-data' | 'metadata',
    successful: boolean,
    metadata?: Record<string, any>
  ) {
    return {
      analyzer,
      source,
      type,
      timestamp: new Date(),
      successful,
      metadata
    };
  }
  
  /**
   * Validate analyzer dependencies
   */
  static validateDependencies(
    context: AnalysisContext,
    analyzerName: string,
    dependencies: string[]
  ): { satisfied: boolean; missing: string[] } {
    const missing = dependencies.filter(dep => !context.metadata.processedBy.includes(dep));
    return {
      satisfied: missing.length === 0,
      missing
    };
  }
  
  /**
   * Get execution order recommendation based on dependencies
   */
  static getExecutionOrder(analyzers: { name: string; dependencies: string[] }[]): string[] {
    const order: string[] = [];
    const remaining = [...analyzers];
    
    while (remaining.length > 0) {
      const ready = remaining.filter(analyzer => 
        analyzer.dependencies.every(dep => order.includes(dep))
      );
      
      if (ready.length === 0) {
        // Circular dependency or unresolvable - add remaining in original order
        remaining.forEach(analyzer => order.push(analyzer.name));
        break;
      }
      
      ready.forEach(analyzer => {
        order.push(analyzer.name);
        const index = remaining.findIndex(r => r.name === analyzer.name);
        remaining.splice(index, 1);
      });
    }
    
    return order;
  }
}