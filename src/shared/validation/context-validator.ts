/**
 * Context Validation System
 * 
 * Provides comprehensive validation for analysis contexts to ensure
 * proper data flow and integrity between analyzers.
 */

import { 
  AnalysisContext, 
  ContextValidation, 
  ValidationError, 
  ValidationWarning, 
  ValidationRule,
  DataFlowValidation,
  AnalyzerDependency,
  DataPropagationCheck,
  InheritanceValidation
} from '../types/analysis-context';
import { LanguageContext } from '../types/language-context';

/**
 * Comprehensive context validator
 */
export class ContextValidator {
  private validationRules: ValidationRule[] = [];
  
  constructor() {
    this.initializeDefaultRules();
  }
  
  /**
   * Validate an analysis context comprehensively
   */
  validate(context: AnalysisContext): ContextValidation {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const rulesApplied: ValidationRule[] = [];
    
    // Apply all validation rules
    for (const rule of this.validationRules) {
      const ruleResult = this.applyRule(rule, context);
      rulesApplied.push(ruleResult);
      
      if (ruleResult.result === 'failed') {
        if (rule.mandatory) {
          errors.push(new ValidationError(
            `Validation failed: ${rule.description}`,
            'ContextValidator',
            rule.id
          ));
        } else {
          warnings.push(new ValidationWarning(
            `Validation warning: ${rule.description}`,
            'ContextValidator',
            rule.id
          ));
        }
      }
    }
    
    // Perform data flow validation
    const dataFlowValidation = this.validateDataFlow(context);
    
    // Add data flow errors to main errors
    if (!dataFlowValidation.isValid) {
      errors.push(new ValidationError(
        'Data flow validation failed',
        'ContextValidator',
        'DATA_FLOW_VALIDATION_FAILED'
      ));
    }
    
    return {
      isValid: errors.length === 0 && dataFlowValidation.isValid,
      dataFlow: [dataFlowValidation],
      consistency: [], // TODO: Implement consistency checks
      issues: [...errors.map(e => ({ type: 'error' as const, severity: 'high' as const, message: e.message, component: e.component })), 
               ...warnings.map(w => ({ type: 'warning' as const, severity: 'medium' as const, message: w.message, component: w.component }))],
      validationScore: errors.length === 0 ? (warnings.length === 0 ? 1.0 : 0.8) : 0.5,
      errors,
      warnings
    };
  }
  
  /**
   * Initialize default validation rules
   */
  private initializeDefaultRules(): void {
    this.validationRules = [
      {
        id: 'session-id-present',
        name: 'Session ID Present',
        description: 'Context must have a valid session ID',
        mandatory: true,
        validate: (context: AnalysisContext) => []
      },
      {
        id: 'metadata-present',
        name: 'Metadata Present',
        description: 'Context must have metadata',
        mandatory: true,
        validate: (context: AnalysisContext) => []
      },
      {
        id: 'shared-data-initialized',
        name: 'Shared Data Initialized',
        description: 'Shared data map must be initialized',
        mandatory: true,
        validate: (context: AnalysisContext) => []
      },
      {
        id: 'language-contexts-valid',
        name: 'Language Contexts Valid',
        description: 'Language contexts must be properly formatted',
        mandatory: false,
        validate: (context: AnalysisContext) => []
      },
      {
        id: 'analyzer-sequence-valid',
        name: 'Analyzer Sequence Valid',
        description: 'Analyzer execution sequence must be logical',
        mandatory: false,
        validate: (context: AnalysisContext) => []
      },
      {
        id: 'confidence-scores-reasonable',
        name: 'Confidence Scores Reasonable',
        description: 'Confidence scores must be within valid ranges',
        mandatory: false,
        validate: (context: AnalysisContext) => []
      }
    ];
  }
  
  /**
   * Apply a validation rule to the context
   */
  private applyRule(rule: ValidationRule, context: AnalysisContext): ValidationRule & { result: 'passed' | 'failed' } {
    let passed = false;
    
    try {
      switch (rule.id) {
        case 'session-id-present':
          passed = !!context.sessionId && context.sessionId.length > 0;
          break;
          
        case 'metadata-present':
          passed = !!context.metadata;
          break;
          
        case 'shared-data-initialized':
          passed = context.sharedData instanceof Map;
          break;
          
        case 'language-contexts-valid':
          passed = this.validateLanguageContexts(context.languageContexts);
          break;
          
        case 'analyzer-sequence-valid':
          passed = this.validateAnalyzerSequence(context.metadata.processedBy);
          break;
          
        case 'confidence-scores-reasonable':
          passed = this.validateConfidenceScores(context);
          break;
          
        default:
          passed = true; // Unknown rules pass by default
      }
    } catch (error) {
      passed = false;
    }
    
    return {
      ...rule,
      result: passed ? 'passed' : 'failed'
    };
  }
  
  /**
   * Validate language contexts
   */
  private validateLanguageContexts(contexts: LanguageContext[]): boolean {
    if (!Array.isArray(contexts)) return false;
    
    for (const context of contexts) {
      if (!context.language || typeof context.language !== 'string') return false;
      if (typeof context.confidence !== 'number' || context.confidence < 0 || context.confidence > 1) return false;
      if (!context.sourceRange || typeof context.sourceRange !== 'object') return false;
      if (!Array.isArray(context.evidence)) return false;
    }
    
    return true;
  }
  
  /**
   * Validate analyzer execution sequence
   */
  private validateAnalyzerSequence(processedBy: string[]): boolean {
    if (!Array.isArray(processedBy)) return false;
    
    // Define expected analyzer dependencies
    const dependencies: Record<string, string[]> = {
      'CommandExtractor': ['LanguageDetector'],
      'TestingDetector': ['LanguageDetector', 'DependencyExtractor'],
      'MetadataExtractor': [] // No dependencies
    };
    
    // Check if dependencies are satisfied
    for (let i = 0; i < processedBy.length; i++) {
      const analyzer = processedBy[i];
      const requiredDeps = dependencies[analyzer] || [];
      
      for (const dep of requiredDeps) {
        const depIndex = processedBy.indexOf(dep);
        if (depIndex === -1 || depIndex > i) {
          return false; // Dependency not satisfied or executed after dependent
        }
      }
    }
    
    return true;
  }
  
  /**
   * Validate confidence scores
   */
  private validateConfidenceScores(context: AnalysisContext): boolean {
    const distribution = context.metadata.quality.confidenceDistribution;
    
    // Check if confidence scores are within valid ranges
    if (distribution.average < 0 || distribution.average > 1) return false;
    if (distribution.minimum < 0 || distribution.minimum > 1) return false;
    if (distribution.maximum < 0 || distribution.maximum > 1) return false;
    if (distribution.standardDeviation < 0) return false;
    
    // Check individual analyzer scores
    for (const [analyzer, score] of distribution.byAnalyzer) {
      if (typeof score !== 'number' || score < 0 || score > 1) return false;
    }
    
    return true;
  }
  
  /**
   * Validate data flow within the context
   */
  private validateDataFlow(context: AnalysisContext): DataFlowValidation {
    const dependencies = this.analyzeDependencies(context);
    const dataPropagation = this.validateDataPropagation(context);
    const inheritanceValidation = this.validateInheritance(context);
    
    const isValid = dependencies.every(dep => dep.satisfied) &&
                   dataPropagation.every(prop => prop.successful) &&
                   inheritanceValidation.every(inh => inh.successful);
    
    return {
      sourceAnalyzer: 'ContextValidator',
      targetAnalyzer: 'System',
      dataKeys: Array.from(context.sharedData.keys()),
      isValid,
      errors: dataPropagation.filter(dp => !dp.successful).map(dp => `Data propagation failed from ${dp.sourceAnalyzer} to ${dp.targetAnalyzer} for key ${dp.dataKey}`),
      integrityScore: isValid ? 1.0 : 0.5
    };
  }
  
  /**
   * Analyze analyzer dependencies
   */
  private analyzeDependencies(context: AnalysisContext): AnalyzerDependency[] {
    const dependencies: AnalyzerDependency[] = [];
    const processedBy = context.metadata.processedBy;
    
    // Define known dependencies
    const knownDeps: Record<string, Array<{ name: string; type: 'data' | 'context' | 'sequence' | 'optional' }>> = {
      'CommandExtractor': [
        { name: 'LanguageDetector', type: 'context' }
      ],
      'TestingDetector': [
        { name: 'LanguageDetector', type: 'data' },
        { name: 'DependencyExtractor', type: 'optional' }
      ],
      'MetadataExtractor': [
        { name: 'LanguageDetector', type: 'optional' },
        { name: 'DependencyExtractor', type: 'optional' },
        { name: 'CommandExtractor', type: 'optional' }
      ]
    };
    
    for (const analyzer of processedBy) {
      const deps = knownDeps[analyzer] || [];
      
      for (const dep of deps) {
        const satisfied = processedBy.includes(dep.name) && 
                         processedBy.indexOf(dep.name) < processedBy.indexOf(analyzer);
        
        dependencies.push({
          analyzer: dep.name,
          dataKeys: [], // TODO: Extract actual data keys from dependency
          required: true,
          satisfied,
          dependent: analyzer
        });
      }
    }
    
    return dependencies;
  }
  
  /**
   * Validate data propagation between analyzers
   */
  private validateDataPropagation(context: AnalysisContext): DataPropagationCheck[] {
    const checks: DataPropagationCheck[] = [];
    
    // Check if LanguageDetector shared language contexts
    if (context.metadata.processedBy.includes('LanguageDetector')) {
      const languageContexts = context.sharedData.get('language_contexts');
      checks.push({
        sourceAnalyzer: 'LanguageDetector',
        targetAnalyzer: 'SharedContext',
        dataKey: 'language_contexts',
        propagated: !!languageContexts,
        timestamp: new Date()
      });
    }
    
    // Check if CommandExtractor used language contexts
    if (context.metadata.processedBy.includes('CommandExtractor') && 
        context.metadata.processedBy.includes('LanguageDetector')) {
      const commandAssociations = context.sharedData.get('command_language_associations');
      checks.push({
        sourceAnalyzer: 'LanguageDetector',
        targetAnalyzer: 'CommandExtractor',
        dataKey: 'command_language_associations',
        propagated: !!commandAssociations && Array.isArray(commandAssociations) && commandAssociations.length > 0,
        timestamp: new Date()
      });
    }
    
    return checks;
  }
  
  /**
   * Validate context inheritance
   */
  private validateInheritance(context: AnalysisContext): InheritanceValidation[] {
    const validations: InheritanceValidation[] = [];
    
    // For now, create a simple inheritance validation since inheritanceChain is string[]
    const inheritanceValidation: InheritanceValidation[] = context.inheritanceChain?.map((analyzer, index) => ({
      parentAnalyzer: index > 0 ? context.inheritanceChain![index - 1] : 'root',
      childAnalyzer: analyzer,
      inheritedKeys: [],
      isValid: true,
      errors: [],
      successful: true
    })) || [];
    
    validations.push(...inheritanceValidation);
    
    return validations;
  }
  
  /**
   * Add a custom validation rule
   */
  addRule(rule: Omit<ValidationRule, 'result'>): void {
    this.validationRules.push({ ...rule, result: 'passed' });
  }
  
  /**
   * Remove a validation rule
   */
  removeRule(ruleId: string): boolean {
    const index = this.validationRules.findIndex(rule => rule.id === ruleId);
    if (index !== -1) {
      this.validationRules.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Get all validation rules
   */
  getRules(): ValidationRule[] {
    return [...this.validationRules];
  }
}

/**
 * Utility functions for context validation
 */
export class ContextValidationUtils {
  /**
   * Create a validation summary
   */
  static createSummary(validation: ContextValidation): {
    isValid: boolean;
    errorCount: number;
    warningCount: number;
    rulesApplied: number;
    rulesPassed: number;
    rulesFailed: number;
    dataFlowValid: boolean;
  } {
    // Since rulesApplied is now string[], calculate pass/fail from errors
    const rulesFailed = validation.errors.length;
    const rulesPassed = validation.rulesApplied.length - rulesFailed;
    
    return {
      isValid: validation.isValid,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
      rulesApplied: validation.rulesApplied.length,
      rulesPassed,
      rulesFailed,
      dataFlowValid: validation.dataFlowValidation.every(df => df.isValid)
    };
  }
  
  /**
   * Format validation results for logging
   */
  static formatForLogging(validation: ContextValidation): string {
    const summary = this.createSummary(validation);
    
    let result = `Context Validation Summary:\n`;
    result += `  Valid: ${summary.isValid}\n`;
    result += `  Errors: ${summary.errorCount}\n`;
    result += `  Warnings: ${summary.warningCount}\n`;
    result += `  Rules: ${summary.rulesPassed}/${summary.rulesApplied} passed\n`;
    result += `  Data Flow: ${summary.dataFlowValid ? 'Valid' : 'Invalid'}\n`;
    
    if (validation.errors.length > 0) {
      result += `\nErrors:\n`;
      validation.errors.forEach(error => {
        result += `  - ${error.code}: ${error.message}\n`;
      });
    }
    
    if (validation.warnings.length > 0) {
      result += `\nWarnings:\n`;
      validation.warnings.forEach(warning => {
        result += `  - ${warning.code}: ${warning.message}\n`;
      });
    }
    
    return result;
  }
}

/**
 * Global context validator instance
 */
export const globalContextValidator = new ContextValidator();