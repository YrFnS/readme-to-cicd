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
          errors.push({
            code: rule.id,
            message: `Validation failed: ${rule.description}`,
            component: 'ContextValidator',
            severity: 'error'
          });
        } else {
          warnings.push({
            code: rule.id,
            message: `Validation warning: ${rule.description}`,
            component: 'ContextValidator'
          });
        }
      }
    }
    
    // Perform data flow validation
    const dataFlowValidation = this.validateDataFlow(context);
    
    // Add data flow errors to main errors
    if (!dataFlowValidation.isValid) {
      errors.push({
        code: 'DATA_FLOW_VALIDATION_FAILED',
        message: 'Data flow validation failed',
        component: 'ContextValidator',
        severity: 'error'
      });
    }
    
    return {
      isValid: errors.length === 0 && dataFlowValidation.isValid,
      errors,
      warnings,
      rulesApplied,
      dataFlowValidation
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
        type: 'data-integrity',
        mandatory: true,
        result: 'passed'
      },
      {
        id: 'metadata-present',
        name: 'Metadata Present',
        description: 'Context must have metadata',
        type: 'data-integrity',
        mandatory: true,
        result: 'passed'
      },
      {
        id: 'shared-data-initialized',
        name: 'Shared Data Initialized',
        description: 'Shared data map must be initialized',
        type: 'data-integrity',
        mandatory: true,
        result: 'passed'
      },
      {
        id: 'language-contexts-valid',
        name: 'Language Contexts Valid',
        description: 'Language contexts must be properly formatted',
        type: 'context-consistency',
        mandatory: false,
        result: 'passed'
      },
      {
        id: 'analyzer-sequence-valid',
        name: 'Analyzer Sequence Valid',
        description: 'Analyzer execution sequence must be logical',
        type: 'flow-validation',
        mandatory: false,
        result: 'passed'
      },
      {
        id: 'confidence-scores-reasonable',
        name: 'Confidence Scores Reasonable',
        description: 'Confidence scores must be within valid ranges',
        type: 'quality-check',
        mandatory: false,
        result: 'passed'
      }
    ];
  }
  
  /**
   * Apply a validation rule to the context
   */
  private applyRule(rule: ValidationRule, context: AnalysisContext): ValidationRule {
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
      isValid,
      executionSequence: context.metadata.processedBy,
      dependencies,
      dataPropagation,
      inheritanceValidation
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
          dependent: analyzer,
          dependency: dep.name,
          type: dep.type,
          satisfied,
          description: `${analyzer} depends on ${dep.name} for ${dep.type}`
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
        source: 'LanguageDetector',
        target: 'SharedContext',
        dataKey: 'language_contexts',
        successful: !!languageContexts,
        error: !languageContexts ? 'Language contexts not shared' : undefined
      });
    }
    
    // Check if CommandExtractor used language contexts
    if (context.metadata.processedBy.includes('CommandExtractor') && 
        context.metadata.processedBy.includes('LanguageDetector')) {
      const commandAssociations = context.sharedData.get('command_language_associations');
      checks.push({
        source: 'LanguageDetector',
        target: 'CommandExtractor',
        dataKey: 'command_language_associations',
        successful: !!commandAssociations && Array.isArray(commandAssociations) && commandAssociations.length > 0,
        error: !commandAssociations ? 'Command-language associations not created' : undefined
      });
    }
    
    return checks;
  }
  
  /**
   * Validate context inheritance
   */
  private validateInheritance(context: AnalysisContext): InheritanceValidation[] {
    const validations: InheritanceValidation[] = [];
    
    // Validate language context inheritance
    for (const inheritance of context.inheritanceChain) {
      validations.push({
        child: inheritance.analyzer,
        parent: inheritance.source,
        inheritanceType: inheritance.type,
        successful: inheritance.successful,
        error: !inheritance.successful ? 'Inheritance failed' : undefined
      });
    }
    
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
    const rulesPassed = validation.rulesApplied.filter(rule => rule.result === 'passed').length;
    const rulesFailed = validation.rulesApplied.filter(rule => rule.result === 'failed').length;
    
    return {
      isValid: validation.isValid,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
      rulesApplied: validation.rulesApplied.length,
      rulesPassed,
      rulesFailed,
      dataFlowValid: validation.dataFlowValidation.isValid
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