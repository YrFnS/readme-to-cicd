/**
 * Result aggregation utilities for combining analyzer outputs
 */

import { 
  ProjectInfo, 
  AnalysisResult, 
  EnhancedAnalyzerResult,
  AggregatedResult,
  ParseError, 
  ConfidenceScores,
  LanguageInfo,
  DependencyInfo,
  CommandInfo,
  TestingInfo,
  ProjectMetadata,
  IntegrationMetadata,
  ValidationStatus,
  ValidationIssue,
  ConflictResolution
} from '../types';

/**
 * Analyzer dependency configuration for execution ordering
 */
export interface AnalyzerDependency {
  analyzerName: string;
  dependencies: string[];
  priority: number;
  optional: boolean;
}

/**
 * Data flow validation result
 */
export interface DataFlowValidation {
  isValid: boolean;
  stage: string;
  sourceAnalyzer: string;
  targetAnalyzer: string;
  validationErrors: string[];
  dataIntegrity: number;
}

/**
 * Execution sequence result
 */
export interface ExecutionSequence {
  sequence: string[];
  dependencyGraph: Map<string, string[]>;
  validationResults: DataFlowValidation[];
  executionMetadata: {
    totalStages: number;
    dependenciesResolved: number;
    validationsPassed: number;
    executionTime: number;
  };
}
import { 
  calculateOverallConfidence, 
  normalizeConfidence, 
  aggregateAnalyzerConfidences,
  aggregateWithConflictResolution,
  ANALYZER_RELIABILITY_WEIGHTS
} from './confidence-calculator';

/**
 * Aggregates results from multiple content analyzers into a unified ProjectInfo structure
 */
export class ResultAggregator {
  private errors: ParseError[] = [];
  private warnings: ParseError[] = [];
  private conflictsResolved: ConflictResolution[] = [];
  private validationIssues: ValidationIssue[] = [];
  private dataFlowValidations: DataFlowValidation[] = [];

  /**
   * Default analyzer dependency configuration
   */
  private readonly defaultDependencies: AnalyzerDependency[] = [
    {
      analyzerName: 'MetadataExtractor',
      dependencies: [],
      priority: 1,
      optional: false
    },
    {
      analyzerName: 'LanguageDetector',
      dependencies: ['MetadataExtractor'],
      priority: 2,
      optional: false
    },
    {
      analyzerName: 'DependencyExtractor',
      dependencies: ['LanguageDetector'],
      priority: 3,
      optional: false
    },
    {
      analyzerName: 'CommandExtractor',
      dependencies: ['LanguageDetector', 'DependencyExtractor'],
      priority: 4,
      optional: false
    },
    {
      analyzerName: 'TestingDetector',
      dependencies: ['LanguageDetector', 'DependencyExtractor'],
      priority: 4,
      optional: true
    }
  ];

  /**
   * Enhanced aggregate method with data flow sequencing and dependency resolution
   */
  async aggregateEnhanced(results: EnhancedAnalyzerResult[], customDependencies?: AnalyzerDependency[]): Promise<AggregatedResult> {
    const startTime = Date.now();
    this.errors = [];
    this.warnings = [];
    this.conflictsResolved = [];
    this.validationIssues = [];
    this.dataFlowValidations = [];

    // Only perform dependency resolution if there are multiple analyzers
    // This maintains backward compatibility for single-analyzer scenarios
    let executionSequence: ExecutionSequence;
    let dataFlowValidation: ExecutionSequence;
    
    if (results.length > 1) {
      const analyzerDependencies = customDependencies || this.defaultDependencies;
      executionSequence = this.resolveAnalyzerDependencies(results, analyzerDependencies);
      
      // Validate data flow between analyzer stages
      dataFlowValidation = this.validateDataFlowSequencing(results, executionSequence);
      this.dataFlowValidations = dataFlowValidation.validationResults;
    } else {
      // For single analyzer, create a simple execution sequence
      executionSequence = {
        sequence: results.map(r => r.analyzerName),
        dependencyGraph: new Map(),
        validationResults: [],
        executionMetadata: {
          totalStages: results.length,
          dependenciesResolved: 0,
          validationsPassed: 0,
          executionTime: 0
        }
      };
      dataFlowValidation = executionSequence;
      this.dataFlowValidations = [];
    }

    // Collect and merge analyzer results in dependency order
    const mergedResults = this.collectAndMergeResults(results);
    
    // Resolve conflicts between analyzers
    const resolvedResults = this.resolveConflicts(mergedResults);
    
    // Extract data from resolved results
    const metadata = this.extractMetadata(resolvedResults);
    const languages = this.extractLanguages(resolvedResults);
    const dependencies = this.extractDependencies(resolvedResults);
    const commands = this.extractCommands(resolvedResults);
    const testing = this.extractTesting(resolvedResults);

    // Calculate aggregated confidence scores
    const confidence = this.calculateAggregatedConfidence(results, {
      metadata,
      languages,
      dependencies,
      commands,
      testing
    });

    // Create integration metadata with data flow information
    const integrationMetadata: IntegrationMetadata = {
      analyzersUsed: results.map(r => r.analyzerName),
      processingTime: Date.now() - startTime,
      dataQuality: this.calculateDataQuality(results),
      completeness: this.calculateCompleteness(results),
      conflictsResolved: this.conflictsResolved,
      dataFlowValidation: {
        sequenceExecuted: executionSequence.sequence,
        dependenciesResolved: executionSequence.executionMetadata.dependenciesResolved,
        validationsPassed: dataFlowValidation.executionMetadata.validationsPassed,
        totalValidations: this.dataFlowValidations.length,
        averageDataIntegrity: this.calculateAverageDataIntegrity()
      }
    };

    // Validate integration results
    const validationStatus = this.validateIntegration({
      languages,
      commands,
      dependencies,
      testing,
      metadata,
      confidence,
      integrationMetadata,
      validationStatus: { isValid: true, completeness: 0, issues: [] }
    });

    return {
      languages,
      commands,
      dependencies,
      testing,
      metadata,
      confidence,
      integrationMetadata,
      validationStatus
    };
  }

  /**
   * Legacy aggregate method for backward compatibility
   */
  async aggregate(results: Map<string, AnalysisResult>): Promise<ProjectInfo> {
    this.errors = [];
    this.warnings = [];

    // Collect all errors and warnings from analyzers
    this.collectErrors(results);

    // Extract data from each analyzer type
    const metadata = this.extractMetadata(results);
    const languages = this.extractLanguages(results);
    const dependencies = this.extractDependencies(results);
    const commands = this.extractCommands(results);
    const testing = this.extractTesting(results);

    // Calculate confidence scores
    const confidence = this.calculateConfidenceScores(results, {
      metadata,
      languages,
      dependencies,
      commands,
      testing
    });

    return {
      metadata,
      languages,
      dependencies,
      commands,
      testing,
      confidence
    };
  }

  /**
   * Get collected errors from aggregation process
   */
  getErrors(): ParseError[] {
    return [...this.errors];
  }

  /**
   * Get data flow validation results
   */
  getDataFlowValidations(): DataFlowValidation[] {
    return [...this.dataFlowValidations];
  }

  /**
   * Get execution sequence for a set of analyzer results (for testing/debugging)
   */
  getExecutionSequence(results: EnhancedAnalyzerResult[], customDependencies?: AnalyzerDependency[]): ExecutionSequence {
    // Clear errors for fresh execution
    this.errors = [];
    this.warnings = [];
    
    const analyzerDependencies = customDependencies || this.defaultDependencies;
    return this.resolveAnalyzerDependencies(results, analyzerDependencies);
  }

  /**
   * Resolve analyzer dependencies and create execution sequence
   */
  private resolveAnalyzerDependencies(
    results: EnhancedAnalyzerResult[], 
    dependencies: AnalyzerDependency[]
  ): ExecutionSequence {
    const startTime = Date.now();
    const availableAnalyzers = new Set(results.map(r => r.analyzerName));
    const dependencyGraph = new Map<string, string[]>();
    const sequence: string[] = [];
    const processed = new Set<string>();

    // Build dependency graph
    for (const dep of dependencies) {
      if (availableAnalyzers.has(dep.analyzerName)) {
        dependencyGraph.set(dep.analyzerName, dep.dependencies.filter(d => availableAnalyzers.has(d)));
      }
    }

    // Topological sort to determine execution order
    const visit = (analyzer: string, visiting: Set<string>) => {
      if (processed.has(analyzer)) return;
      if (visiting.has(analyzer)) {
        this.errors.push({
          code: 'CIRCULAR_DEPENDENCY',
          message: `Circular dependency detected involving analyzer: ${analyzer}`,
          component: 'ResultAggregator',
          severity: 'error',
          details: { analyzer, dependencyChain: Array.from(visiting) }
        });
        return;
      }

      visiting.add(analyzer);
      const deps = dependencyGraph.get(analyzer) || [];
      
      // Get the original dependencies (not filtered ones) to check for missing dependencies
      const depConfig = dependencies.find(d => d.analyzerName === analyzer);
      const originalDeps = depConfig?.dependencies || [];
      
      // Only check dependencies if this analyzer has a dependency configuration
      if (depConfig) {
        for (const dep of originalDeps) {
          if (availableAnalyzers.has(dep)) {
            visit(dep, visiting);
          } else {
            // Only report missing dependencies for non-optional dependencies
            if (!depConfig.optional) {
              this.errors.push({
                code: 'MISSING_DEPENDENCY',
                message: `Required dependency '${dep}' not available for analyzer '${analyzer}'`,
                component: 'ResultAggregator',
                severity: 'error',
                details: { analyzer, missingDependency: dep }
              });
            }
          }
        }
      }

      visiting.delete(analyzer);
      processed.add(analyzer);
      sequence.push(analyzer);
    };

    // Process all analyzers
    for (const analyzer of availableAnalyzers) {
      visit(analyzer, new Set());
    }

    // Add any remaining analyzers not in dependency config
    for (const result of results) {
      if (!processed.has(result.analyzerName)) {
        sequence.push(result.analyzerName);
        processed.add(result.analyzerName);
      }
    }

    const executionTime = Date.now() - startTime;
    const dependenciesResolved = Array.from(dependencyGraph.values()).flat().length;

    return {
      sequence,
      dependencyGraph,
      validationResults: [],
      executionMetadata: {
        totalStages: sequence.length,
        dependenciesResolved,
        validationsPassed: 0,
        executionTime
      }
    };
  }

  /**
   * Validate data flow between analyzer stages
   */
  private validateDataFlowSequencing(
    results: EnhancedAnalyzerResult[],
    executionSequence: ExecutionSequence
  ): ExecutionSequence {
    const validationResults: DataFlowValidation[] = [];
    const resultMap = new Map(results.map(r => [r.analyzerName, r]));

    // Validate each stage in the execution sequence
    for (let i = 0; i < executionSequence.sequence.length; i++) {
      const currentAnalyzer = executionSequence.sequence[i];
      if (!currentAnalyzer) continue;
      
      const currentResult = resultMap.get(currentAnalyzer);
      
      if (!currentResult) continue;

      // Get dependencies for current analyzer
      const dependencies = executionSequence.dependencyGraph.get(currentAnalyzer) || [];
      
      // Validate data flow from each dependency
      for (const depAnalyzer of dependencies) {
        const depResult = resultMap.get(depAnalyzer);
        if (!depResult) continue;

        const validation = this.validateDataFlowBetweenAnalyzers(
          depResult,
          currentResult,
          `stage_${i}`
        );
        validationResults.push(validation);
      }

      // Validate data integrity for current stage
      const integrityValidation = this.validateStageDataIntegrity(
        currentResult,
        `stage_${i}`
      );
      validationResults.push(integrityValidation);
    }

    const validationsPassed = validationResults.filter(v => v.isValid).length;

    return {
      ...executionSequence,
      validationResults,
      executionMetadata: {
        ...executionSequence.executionMetadata,
        validationsPassed
      }
    };
  }

  /**
   * Validate data flow between two specific analyzers
   */
  private validateDataFlowBetweenAnalyzers(
    sourceResult: EnhancedAnalyzerResult,
    targetResult: EnhancedAnalyzerResult,
    stage: string
  ): DataFlowValidation {
    const validationErrors: string[] = [];
    let dataIntegrity = 1.0;

    // Validate source data availability
    if (!sourceResult.data || (Array.isArray(sourceResult.data) && sourceResult.data.length === 0)) {
      validationErrors.push(`Source analyzer '${sourceResult.analyzerName}' produced no data`);
      dataIntegrity *= 0.5;
    }

    // Validate confidence compatibility
    if (sourceResult.confidence < 0.3 && targetResult.confidence > 0.7) {
      validationErrors.push(`Confidence mismatch: source (${sourceResult.confidence}) vs target (${targetResult.confidence})`);
      dataIntegrity *= 0.8;
    }

    // Validate specific data flow patterns
    const flowValidation = this.validateSpecificDataFlow(sourceResult, targetResult);
    if (!flowValidation.isValid) {
      validationErrors.push(...flowValidation.errors);
      dataIntegrity *= flowValidation.integrityFactor;
    }

    // Check for data consistency
    const consistencyCheck = this.checkDataConsistency(sourceResult, targetResult);
    if (!consistencyCheck.isConsistent) {
      validationErrors.push(...consistencyCheck.issues);
      dataIntegrity *= 0.9;
    }

    return {
      isValid: validationErrors.length === 0,
      stage,
      sourceAnalyzer: sourceResult.analyzerName,
      targetAnalyzer: targetResult.analyzerName,
      validationErrors,
      dataIntegrity: Math.max(0, Math.min(1, dataIntegrity))
    };
  }

  /**
   * Validate data integrity for a single analyzer stage
   */
  private validateStageDataIntegrity(
    result: EnhancedAnalyzerResult,
    stage: string
  ): DataFlowValidation {
    const validationErrors: string[] = [];
    let dataIntegrity = 1.0;

    // Check data structure validity
    if (!result.data) {
      validationErrors.push(`No data produced by ${result.analyzerName}`);
      dataIntegrity = 0;
    } else {
      // Validate data structure based on analyzer type
      const structureValidation = this.validateAnalyzerDataStructure(result);
      if (!structureValidation.isValid) {
        validationErrors.push(...structureValidation.errors);
        dataIntegrity *= structureValidation.integrityFactor;
      }
    }

    // Check confidence score validity
    if (result.confidence < 0 || result.confidence > 1) {
      validationErrors.push(`Invalid confidence score: ${result.confidence}`);
      dataIntegrity *= 0.8;
    }

    // Check metadata completeness
    if (!result.metadata || result.metadata.completeness === undefined) {
      validationErrors.push(`Missing or incomplete metadata for ${result.analyzerName}`);
      dataIntegrity *= 0.9;
    }

    return {
      isValid: validationErrors.length === 0,
      stage,
      sourceAnalyzer: result.analyzerName,
      targetAnalyzer: result.analyzerName,
      validationErrors,
      dataIntegrity: Math.max(0, Math.min(1, dataIntegrity))
    };
  }

  /**
   * Validate specific data flow patterns between analyzers
   */
  private validateSpecificDataFlow(
    sourceResult: EnhancedAnalyzerResult,
    targetResult: EnhancedAnalyzerResult
  ): { isValid: boolean; errors: string[]; integrityFactor: number } {
    const errors: string[] = [];
    let integrityFactor = 1.0;

    // LanguageDetector -> CommandExtractor flow
    if (sourceResult.analyzerName === 'LanguageDetector' && targetResult.analyzerName === 'CommandExtractor') {
      if (!Array.isArray(sourceResult.data) || sourceResult.data.length === 0) {
        errors.push('LanguageDetector must provide language data for CommandExtractor');
        integrityFactor = 0.5;
      }
    }

    // LanguageDetector -> DependencyExtractor flow
    if (sourceResult.analyzerName === 'LanguageDetector' && targetResult.analyzerName === 'DependencyExtractor') {
      if (!Array.isArray(sourceResult.data) || sourceResult.data.length === 0) {
        errors.push('LanguageDetector must provide language data for DependencyExtractor');
        integrityFactor = 0.7;
      }
    }

    // DependencyExtractor -> CommandExtractor flow
    if (sourceResult.analyzerName === 'DependencyExtractor' && targetResult.analyzerName === 'CommandExtractor') {
      if (!sourceResult.data || !sourceResult.data.packages) {
        errors.push('DependencyExtractor should provide package information for CommandExtractor');
        integrityFactor = 0.8;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      integrityFactor
    };
  }

  /**
   * Check data consistency between analyzers
   */
  private checkDataConsistency(
    sourceResult: EnhancedAnalyzerResult,
    targetResult: EnhancedAnalyzerResult
  ): { isConsistent: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check source overlap
    const sourceOverlap = sourceResult.sources.filter(s => targetResult.sources.includes(s));
    if (sourceOverlap.length === 0 && sourceResult.sources.length > 0 && targetResult.sources.length > 0) {
      issues.push(`No source overlap between ${sourceResult.analyzerName} and ${targetResult.analyzerName}`);
    }

    // Check confidence correlation
    const confidenceDiff = Math.abs(sourceResult.confidence - targetResult.confidence);
    if (confidenceDiff > 0.5) {
      issues.push(`Large confidence difference (${confidenceDiff.toFixed(2)}) between analyzers`);
    }

    return {
      isConsistent: issues.length === 0,
      issues
    };
  }

  /**
   * Validate analyzer-specific data structures
   */
  private validateAnalyzerDataStructure(
    result: EnhancedAnalyzerResult
  ): { isValid: boolean; errors: string[]; integrityFactor: number } {
    const errors: string[] = [];
    let integrityFactor = 1.0;

    switch (result.analyzerName) {
      case 'LanguageDetector':
        if (!Array.isArray(result.data)) {
          errors.push('LanguageDetector data must be an array');
          integrityFactor = 0.3;
        } else {
          for (const lang of result.data) {
            if (!lang.name || typeof lang.confidence !== 'number') {
              errors.push('Invalid language entry structure');
              integrityFactor *= 0.8;
            }
          }
        }
        break;

      case 'DependencyExtractor':
        if (!result.data || typeof result.data !== 'object') {
          errors.push('DependencyExtractor data must be an object');
          integrityFactor = 0.3;
        } else {
          const requiredFields = ['packageFiles', 'installCommands', 'packages', 'dependencies', 'devDependencies'];
          for (const field of requiredFields) {
            if (!Array.isArray(result.data[field])) {
              errors.push(`DependencyExtractor missing or invalid field: ${field}`);
              integrityFactor *= 0.9;
            }
          }
        }
        break;

      case 'CommandExtractor':
        if (!result.data || typeof result.data !== 'object') {
          errors.push('CommandExtractor data must be an object');
          integrityFactor = 0.3;
        } else {
          const requiredFields = ['build', 'test', 'run', 'install', 'other'];
          for (const field of requiredFields) {
            if (!Array.isArray(result.data[field])) {
              errors.push(`CommandExtractor missing or invalid field: ${field}`);
              integrityFactor *= 0.9;
            }
          }
        }
        break;

      case 'TestingDetector':
        if (!result.data || typeof result.data !== 'object') {
          errors.push('TestingDetector data must be an object');
          integrityFactor = 0.3;
        } else {
          const requiredFields = ['frameworks', 'tools', 'configFiles', 'testFiles', 'commands', 'coverage'];
          for (const field of requiredFields) {
            if (result.data[field] === undefined) {
              errors.push(`TestingDetector missing field: ${field}`);
              integrityFactor *= 0.9;
            }
          }
        }
        break;

      case 'MetadataExtractor':
        if (!result.data || typeof result.data !== 'object') {
          errors.push('MetadataExtractor data must be an object');
          integrityFactor = 0.3;
        }
        break;

      default:
        // Generic validation for unknown analyzers
        if (result.data === null || result.data === undefined) {
          errors.push(`Unknown analyzer ${result.analyzerName} produced no data`);
          integrityFactor = 0.5;
        }
    }

    return {
      isValid: errors.length === 0,
      errors,
      integrityFactor: Math.max(0.1, integrityFactor)
    };
  }

  /**
   * Get collected warnings from aggregation process
   */
  getWarnings(): ParseError[] {
    return [...this.warnings];
  }

  /**
   * Collect errors and warnings from all analyzer results
   */
  private collectErrors(results: Map<string, AnalysisResult>): void {
    for (const [analyzerName, result] of results) {
      if (result.errors) {
        for (const error of result.errors) {
          if (error.severity === 'error') {
            this.errors.push(error);
          } else if (error.severity === 'warning') {
            this.warnings.push(error);
          }
        }
      }
    }
  }

  /**
   * Extract metadata information from analyzer results
   */
  private extractMetadata(results: Map<string, AnalysisResult | EnhancedAnalyzerResult>): ProjectMetadata {
    const metadataResult = results.get('MetadataExtractor') || results.get('metadata');
    
    if (!metadataResult?.data) {
      return {};
    }

    return {
      name: metadataResult.data.name,
      description: metadataResult.data.description,
      structure: metadataResult.data.structure || [],
      environment: metadataResult.data.environment || []
    };
  }

  /**
   * Extract and merge language information from analyzer results
   */
  private extractLanguages(results: Map<string, AnalysisResult | EnhancedAnalyzerResult>): LanguageInfo[] {
    // Try both possible analyzer names for backward compatibility
    const languageResult = results.get('LanguageDetector') || results.get('language');
    
    if (!languageResult?.data) {
      return [];
    }

    // The LanguageDetector returns languages directly in the data field
    const languages = Array.isArray(languageResult.data) ? languageResult.data : languageResult.data.languages;
    
    if (!languages) {
      return [];
    }

    // Ensure all language entries have required fields and filter out invalid entries
    return languages
      .filter((lang: any) => lang && typeof lang === 'object')
      .map((lang: any) => ({
        name: lang.name || 'Unknown',
        confidence: normalizeConfidence(lang.confidence || 0),
        sources: lang.sources || [],
        frameworks: lang.frameworks || []
      }));
  }

  /**
   * Extract dependency information from analyzer results
   */
  private extractDependencies(results: Map<string, AnalysisResult | EnhancedAnalyzerResult>): DependencyInfo {
    // Try both possible analyzer names for backward compatibility
    const dependencyResult = results.get('DependencyExtractor') || results.get('dependency');
    
    if (!dependencyResult?.data) {
      return {
        packageFiles: [],
        installCommands: [],
        packages: [],
        dependencies: [],
        devDependencies: []
      };
    }

    return {
      packageFiles: dependencyResult.data.packageFiles || [],
      installCommands: dependencyResult.data.installCommands || [],
      packages: dependencyResult.data.packages || [],
      dependencies: dependencyResult.data.dependencies || [],
      devDependencies: dependencyResult.data.devDependencies || []
    };
  }

  /**
   * Extract command information from analyzer results
   */
  private extractCommands(results: Map<string, AnalysisResult | EnhancedAnalyzerResult>): CommandInfo {
    const commandResult = results.get('CommandExtractor');
    
    if (!commandResult?.data) {
      return {
        build: [],
        test: [],
        run: [],
        install: [],
        other: []
      };
    }

    return {
      build: commandResult.data.build || [],
      test: commandResult.data.test || [],
      run: commandResult.data.run || [],
      install: commandResult.data.install || [],
      other: commandResult.data.other || []
    };
  }

  /**
   * Extract testing information from analyzer results
   */
  private extractTesting(results: Map<string, AnalysisResult | EnhancedAnalyzerResult>): TestingInfo {
    const testingResult = results.get('TestingDetector') || results.get('testing');
    
    if (!testingResult?.data) {
      return {
        frameworks: [],
        tools: [],
        configFiles: [],
        confidence: 0,
        testFiles: [],
        commands: [],
        coverage: { enabled: false, tools: [] }
      };
    }

    return {
      frameworks: testingResult.data.frameworks || [],
      tools: testingResult.data.tools || [],
      configFiles: testingResult.data.configFiles || [],
      confidence: normalizeConfidence(testingResult.confidence),
      testFiles: testingResult.data.testFiles || [],
      commands: testingResult.data.commands || [],
      coverage: testingResult.data.coverage || { enabled: false, tools: [] }
    };
  }

  /**
   * Calculate confidence scores for all categories
   */
  private calculateConfidenceScores(
    results: Map<string, AnalysisResult>,
    extractedData: {
      metadata: ProjectMetadata;
      languages: LanguageInfo[];
      dependencies: DependencyInfo;
      commands: CommandInfo;
      testing: TestingInfo;
    }
  ): ConfidenceScores {
    // Get individual analyzer confidence scores (try both naming conventions)
    const languageConfidence = (results.get('LanguageDetector') || results.get('language'))?.confidence || 0;
    const dependencyConfidence = (results.get('DependencyExtractor') || results.get('dependency'))?.confidence || 0;
    const commandConfidence = results.get('CommandExtractor')?.confidence || 0;
    const testingConfidence = (results.get('TestingDetector') || results.get('testing'))?.confidence || 0;
    const metadataConfidence = (results.get('MetadataExtractor') || results.get('metadata'))?.confidence || 0;

    // Normalize all scores
    const scores = {
      languages: normalizeConfidence(languageConfidence),
      dependencies: normalizeConfidence(dependencyConfidence),
      commands: normalizeConfidence(commandConfidence),
      testing: normalizeConfidence(testingConfidence),
      metadata: normalizeConfidence(metadataConfidence)
    };

    // Calculate overall confidence
    const overall = calculateOverallConfidence(scores);

    return {
      ...scores,
      overall
    };
  }

  /**
   * Handle partial failures by providing fallback values
   */
  private handlePartialFailure<T>(
    analyzerName: string,
    result: AnalysisResult | undefined,
    fallbackValue: T,
    errorCode: string = 'ANALYZER_FAILED'
  ): T {
    if (!result) {
      this.errors.push({
        code: errorCode,
        message: `Analyzer '${analyzerName}' failed to produce results`,
        component: 'ResultAggregator',
        severity: 'error',
        details: { analyzerName }
      });
      return fallbackValue;
    }

    if (result.errors && result.errors.length > 0) {
      const hasErrors = result.errors.some(e => e.severity === 'error');
      if (hasErrors) {
        this.errors.push({
          code: 'ANALYZER_PARTIAL_FAILURE',
          message: `Analyzer '${analyzerName}' completed with errors`,
          component: 'ResultAggregator',
          severity: 'warning',
          details: { analyzerName, errors: result.errors }
        });
      }
    }

    return result.data || fallbackValue;
  }

  /**
   * Collect and merge results from multiple analyzers
   */
  private collectAndMergeResults(results: EnhancedAnalyzerResult[]): Map<string, EnhancedAnalyzerResult> {
    const mergedResults = new Map<string, EnhancedAnalyzerResult>();

    for (const result of results) {
      // Collect errors and warnings
      if (result.errors) {
        this.errors.push(...result.errors);
      }
      if (result.warnings) {
        this.warnings.push(...result.warnings);
      }

      // Handle partial failures gracefully
      const processedResult = this.handlePartialAnalyzerFailure(result);

      // Check for duplicate analyzers
      if (mergedResults.has(result.analyzerName)) {
        this.conflictsResolved.push({
          conflictType: 'duplicate_analyzer',
          conflictingAnalyzers: [result.analyzerName],
          resolution: 'merged_results',
          confidence: Math.max(mergedResults.get(result.analyzerName)!.confidence, result.confidence)
        });

        // Merge duplicate analyzer results
        const existing = mergedResults.get(result.analyzerName)!;
        mergedResults.set(result.analyzerName, this.mergeAnalyzerResults(existing, processedResult));
      } else {
        mergedResults.set(result.analyzerName, processedResult);
      }
    }

    return mergedResults;
  }

  /**
   * Merge two analyzer results from the same analyzer
   */
  private mergeAnalyzerResults(existing: EnhancedAnalyzerResult, incoming: EnhancedAnalyzerResult): EnhancedAnalyzerResult {
    // Handle array data (like languages)
    let mergedData;
    if (Array.isArray(existing.data) && Array.isArray(incoming.data)) {
      mergedData = [...existing.data, ...incoming.data];
    } else if (Array.isArray(existing.data)) {
      mergedData = existing.data;
    } else if (Array.isArray(incoming.data)) {
      mergedData = incoming.data;
    } else {
      // Handle object data
      mergedData = { ...existing.data, ...incoming.data };
    }

    return {
      analyzerName: existing.analyzerName,
      data: mergedData,
      confidence: Math.max(existing.confidence, incoming.confidence),
      sources: [...new Set([...existing.sources, ...incoming.sources])],
      errors: [...(existing.errors || []), ...(incoming.errors || [])],
      warnings: [...(existing.warnings || []), ...(incoming.warnings || [])],
      metadata: {
        processingTime: (existing.metadata?.processingTime || 0) + (incoming.metadata?.processingTime || 0),
        dataQuality: Math.max(existing.metadata?.dataQuality || 0, incoming.metadata?.dataQuality || 0),
        completeness: Math.max(existing.metadata?.completeness || 0, incoming.metadata?.completeness || 0)
      }
    };
  }

  /**
   * Resolve conflicts between different analyzers using predefined priority rules
   */
  private resolveConflicts(results: Map<string, EnhancedAnalyzerResult>): Map<string, EnhancedAnalyzerResult> {
    // Define analyzer priority for conflict resolution
    const analyzerPriority: Record<string, number> = {
      'LanguageDetector': 10,
      'DependencyExtractor': 9,
      'CommandExtractor': 8,
      'TestingDetector': 7,
      'MetadataExtractor': 6,
      'default': 5
    };

    // Resolve language detection conflicts
    const languageResults = Array.from(results.values()).filter(r => 
      r.analyzerName === 'LanguageDetector' || 
      r.analyzerName === 'AlternativeLanguageDetector' ||
      (r.data && (Array.isArray(r.data) || r.data.languages))
    );

    if (languageResults.length > 1) {
      const resolved = this.resolveLanguageConflicts(languageResults);
      
      // Remove all conflicting analyzers
      for (const result of languageResults) {
        results.delete(result.analyzerName);
      }
      
      // Add the resolved result
      for (const result of resolved) {
        results.set(result.analyzerName, result);
      }
    }

    // Resolve confidence conflicts between analyzers
    this.resolveConfidenceConflicts(results, analyzerPriority);

    // Resolve data consistency conflicts
    this.resolveDataConsistencyConflicts(results, analyzerPriority);

    return results;
  }

  /**
   * Resolve conflicts between language detection results
   */
  private resolveLanguageConflicts(results: EnhancedAnalyzerResult[]): EnhancedAnalyzerResult[] {
    if (results.length <= 1) return results;

    // Find the highest confidence result
    const highestConfidence = Math.max(...results.map(r => r.confidence));
    const primaryResult = results.find(r => r.confidence === highestConfidence)!;

    // Merge languages from all results, prioritizing higher confidence
    const allLanguages = new Map<string, any>();
    
    for (const result of results.sort((a, b) => b.confidence - a.confidence)) {
      const languages = Array.isArray(result.data) ? result.data : result.data?.languages || [];
      for (const lang of languages) {
        if (lang && lang.name) {
          if (!allLanguages.has(lang.name) || allLanguages.get(lang.name).confidence < lang.confidence) {
            allLanguages.set(lang.name, lang);
          }
        }
      }
    }

    this.conflictsResolved.push({
      conflictType: 'language_detection',
      conflictingAnalyzers: results.map(r => r.analyzerName),
      resolution: 'merged_by_confidence',
      confidence: highestConfidence
    });

    // Return only the primary result with merged languages, remove others
    const mergedLanguages = Array.from(allLanguages.values());
    const resolvedResult = {
      ...primaryResult,
      analyzerName: 'LanguageDetector', // Always use standard name for extraction
      data: mergedLanguages
    };

    // Return only the resolved result, filtering out the conflicting ones
    return [resolvedResult];
  }

  /**
   * Calculate aggregated confidence scores with enhanced algorithms
   */
  private calculateAggregatedConfidence(
    results: EnhancedAnalyzerResult[],
    extractedData: {
      metadata: ProjectMetadata;
      languages: LanguageInfo[];
      dependencies: DependencyInfo;
      commands: CommandInfo;
      testing: TestingInfo;
    }
  ): ConfidenceScores {
    // Prepare analyzer results for advanced aggregation
    const analyzerResults = results.map(result => ({
      analyzerName: result.analyzerName,
      confidence: result.confidence,
      dataQuality: result.metadata?.dataQuality ?? 0.5,
      completeness: result.metadata?.completeness ?? 0.5
    }));

    // Calculate category-specific confidence scores with enhanced algorithms
    const scores = {
      languages: this.calculateCategoryConfidence('LanguageDetector', analyzerResults, extractedData.languages.length),
      dependencies: this.calculateCategoryConfidence('DependencyExtractor', analyzerResults, extractedData.dependencies.packages.length),
      commands: this.calculateCategoryConfidence('CommandExtractor', analyzerResults, 
        Object.values(extractedData.commands).reduce((sum, arr) => sum + arr.length, 0)),
      testing: this.calculateCategoryConfidence('TestingDetector', analyzerResults, extractedData.testing.frameworks.length),
      metadata: this.calculateCategoryConfidence('MetadataExtractor', analyzerResults, 
        extractedData.metadata.name ? 1 : 0)
    };

    // Calculate overall confidence with advanced aggregation and conflict resolution
    const overall = this.calculateOverallConfidenceWithConflictResolution(analyzerResults, scores);

    return {
      ...scores,
      overall: normalizeConfidence(overall)
    };
  }

  /**
   * Calculate weighted confidence based on analyzer performance and data quantity
   */
  private calculateWeightedConfidence(analyzerName: string, confidences: Map<string, number>, dataCount: number): number {
    const baseConfidence = confidences.get(analyzerName) || 0;
    const dataQualityBoost = Math.min(0.2, dataCount * 0.05); // Up to 20% boost based on data quantity
    return normalizeConfidence(baseConfidence + dataQualityBoost);
  }

  /**
   * Calculate overall data quality score
   */
  private calculateDataQuality(results: EnhancedAnalyzerResult[]): number {
    if (results.length === 0) return 0;

    const qualityScores = results.map(r => r.metadata?.dataQuality || r.confidence);
    return qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
  }

  /**
   * Calculate completeness score based on expected vs actual data
   */
  private calculateCompleteness(results: EnhancedAnalyzerResult[]): number {
    const expectedAnalyzers = ['LanguageDetector', 'DependencyExtractor', 'CommandExtractor', 'TestingDetector', 'MetadataExtractor'];
    const actualAnalyzers = results.map(r => r.analyzerName);
    
    const completenessRatio = actualAnalyzers.filter(name => expectedAnalyzers.includes(name)).length / expectedAnalyzers.length;
    
    // Factor in individual analyzer completeness
    const analyzerCompleteness = results.map(r => r.metadata?.completeness || 0.8); // Default to 0.8 instead of 0.5
    const avgAnalyzerCompleteness = analyzerCompleteness.length > 0 
      ? analyzerCompleteness.reduce((sum, c) => sum + c, 0) / analyzerCompleteness.length 
      : 0.8;

    // Weight the completeness ratio more heavily
    return (completenessRatio * 0.6) + (avgAnalyzerCompleteness * 0.4);
  }

  /**
   * Calculate average data integrity from data flow validations
   */
  private calculateAverageDataIntegrity(): number {
    if (this.dataFlowValidations.length === 0) {
      return 1.0; // Perfect integrity if no validations performed
    }

    const totalIntegrity = this.dataFlowValidations.reduce((sum, validation) => sum + validation.dataIntegrity, 0);
    return totalIntegrity / this.dataFlowValidations.length;
  }

  /**
   * Validate integration results and identify issues
   */
  private validateIntegration(result: AggregatedResult): ValidationStatus {
    const issues: ValidationIssue[] = [];

    // Use comprehensive completeness validation
    const completenessIssues = this.validateResultCompleteness(result);
    issues.push(...completenessIssues);

    // Check for unresolved conflicts
    if (this.conflictsResolved.length > 0) {
      issues.push({
        type: 'conflict',
        severity: 'info',
        message: `${this.conflictsResolved.length} conflicts were resolved during aggregation`,
        component: 'ResultAggregator'
      });
    }

    // Check completeness
    if (result.integrationMetadata.completeness < 0.8) {
      issues.push({
        type: 'incomplete',
        severity: 'warning',
        message: `Integration completeness is ${(result.integrationMetadata.completeness * 100).toFixed(1)}%`,
        component: 'ResultAggregator'
      });
    }

    // Check data flow validation issues (only if there are significant failures)
    const failedValidations = this.dataFlowValidations.filter(v => !v.isValid);
    if (failedValidations.length > 0 && this.dataFlowValidations.length > 0) {
      const failureRate = failedValidations.length / this.dataFlowValidations.length;
      // Only report if failure rate is significant (>30%) or there are many failures
      if (failureRate > 0.3 || failedValidations.length > 2) {
        issues.push({
          type: 'incomplete',
          severity: 'warning',
          message: `${failedValidations.length} data flow validations failed`,
          component: 'ResultAggregator'
        });
      }
    }

    // Check for low data integrity (only if significantly low)
    const avgIntegrity = this.calculateAverageDataIntegrity();
    if (avgIntegrity < 0.5) { // More lenient threshold
      issues.push({
        type: 'low_confidence',
        severity: 'warning',
        message: `Low data integrity (${(avgIntegrity * 100).toFixed(1)}%)`,
        component: 'ResultAggregator'
      });
    }

    // Check for dependency resolution errors (only report circular dependencies as errors)
    const circularDependencyErrors = this.errors.filter(e => e.code === 'CIRCULAR_DEPENDENCY');
    if (circularDependencyErrors.length > 0) {
      issues.push({
        type: 'incomplete',
        severity: 'error',
        message: `${circularDependencyErrors.length} circular dependency errors`,
        component: 'ResultAggregator'
      });
    }

    // Check for analyzer partial failures
    const partialFailureErrors = this.errors.filter(e => e.code === 'ANALYZER_PARTIAL_FAILURE');
    if (partialFailureErrors.length > 0) {
      issues.push({
        type: 'incomplete',
        severity: 'warning',
        message: `${partialFailureErrors.length} analyzers had partial failures`,
        component: 'ResultAggregator'
      });
    }

    // Don't add missing dependency issues to validation status for backward compatibility
    // They are already in the errors array and can be accessed via getErrors()

    const isValid = !issues.some(issue => issue.severity === 'error');
    
    return {
      isValid,
      completeness: result.integrationMetadata.completeness,
      issues
    };
  }

  /**
   * Calculate category-specific confidence with enhanced algorithms
   */
  private calculateCategoryConfidence(
    primaryAnalyzer: string,
    analyzerResults: Array<{
      analyzerName: string;
      confidence: number;
      dataQuality?: number;
      completeness?: number;
    }>,
    dataCount: number
  ): number {
    // Find results for this category (primary analyzer and alternatives)
    const categoryResults = analyzerResults.filter(result => 
      result.analyzerName === primaryAnalyzer || 
      result.analyzerName.includes(primaryAnalyzer.replace('Detector', '').replace('Extractor', ''))
    );

    if (categoryResults.length === 0) {
      return 0;
    }

    // Use advanced aggregation algorithm
    const baseConfidence = aggregateAnalyzerConfidences(categoryResults, {
      algorithm: 'weighted_average',
      qualityBoost: true,
      reliabilityWeights: ANALYZER_RELIABILITY_WEIGHTS
    });

    // Apply data quantity boost (up to 20% boost based on data count)
    const dataQualityBoost = Math.min(0.2, dataCount * 0.05);
    
    return normalizeConfidence(baseConfidence + dataQualityBoost);
  }

  /**
   * Calculate overall confidence with advanced conflict resolution
   */
  private calculateOverallConfidenceWithConflictResolution(
    analyzerResults: Array<{
      analyzerName: string;
      confidence: number;
      dataQuality?: number;
      completeness?: number;
    }>,
    categoryScores: Omit<ConfidenceScores, 'overall'>
  ): number {
    // Use conflict resolution algorithm
    const { aggregatedConfidence, conflicts } = aggregateWithConflictResolution(
      analyzerResults,
      0.3 // conflict threshold
    );

    // Calculate weighted overall confidence from category scores
    const categoryOverall = calculateOverallConfidence(categoryScores);

    // Combine analyzer-level and category-level confidence
    const combinedConfidence = (aggregatedConfidence * 0.4) + (categoryOverall * 0.6);

    // Apply additional penalty for resolved conflicts
    const resolvedConflictPenalty = Math.max(0.8, 1 - (this.conflictsResolved.length * 0.05));

    // Apply penalty for detected conflicts
    const detectedConflictPenalty = conflicts.length > 0 
      ? Math.max(0.9, 1 - (conflicts.length * 0.02))
      : 1.0;

    return normalizeConfidence(combinedConfidence * resolvedConflictPenalty * detectedConflictPenalty);
  }

  /**
   * Handle partial failures from analyzers gracefully
   */
  private handlePartialAnalyzerFailure(result: EnhancedAnalyzerResult): EnhancedAnalyzerResult {
    // Check if analyzer failed completely
    if (!result.data || (Array.isArray(result.data) && result.data.length === 0)) {
      // Check if this is a critical failure or just empty data
      const hasErrors = result.errors && result.errors.some(e => e.severity === 'error');
      
      if (hasErrors) {
        this.errors.push({
          code: 'ANALYZER_PARTIAL_FAILURE',
          message: `Analyzer '${result.analyzerName}' failed to produce valid results`,
          component: 'ResultAggregator',
          severity: 'warning',
          details: { 
            analyzerName: result.analyzerName,
            originalErrors: result.errors,
            confidence: result.confidence
          }
        });

        // Provide fallback data based on analyzer type
        const fallbackData = this.getFallbackDataForAnalyzer(result.analyzerName);
        return {
          ...result,
          data: fallbackData,
          confidence: Math.max(0.1, result.confidence * 0.5), // Reduce confidence for failed analyzer
          metadata: {
            ...result.metadata,
            completeness: 0.1, // Mark as very incomplete
            dataQuality: 0.2   // Mark as low quality
          }
        };
      }
    }

    // Check for low confidence results
    if (result.confidence < 0.3) {
      this.warnings.push({
        code: 'LOW_CONFIDENCE_RESULT',
        message: `Analyzer '${result.analyzerName}' produced low confidence results (${result.confidence.toFixed(2)})`,
        component: 'ResultAggregator',
        severity: 'warning',
        details: { 
          analyzerName: result.analyzerName,
          confidence: result.confidence
        }
      });
    }

    return result;
  }

  /**
   * Get fallback data for failed analyzers
   */
  private getFallbackDataForAnalyzer(analyzerName: string): any {
    switch (analyzerName) {
      case 'LanguageDetector':
        return [];
      case 'DependencyExtractor':
        return {
          packageFiles: [],
          installCommands: [],
          packages: [],
          dependencies: [],
          devDependencies: []
        };
      case 'CommandExtractor':
        return {
          build: [],
          test: [],
          run: [],
          install: [],
          other: []
        };
      case 'TestingDetector':
        return {
          frameworks: [],
          tools: [],
          configFiles: [],
          testFiles: [],
          commands: [],
          coverage: { enabled: false, tools: [] }
        };
      case 'MetadataExtractor':
        return {};
      default:
        return null;
    }
  }

  /**
   * Resolve confidence conflicts between analyzers
   */
  private resolveConfidenceConflicts(
    results: Map<string, EnhancedAnalyzerResult>, 
    analyzerPriority: Record<string, number>
  ): void {
    const analyzerResults = Array.from(results.values());
    
    // Find analyzers with significantly different confidence scores
    for (let i = 0; i < analyzerResults.length; i++) {
      for (let j = i + 1; j < analyzerResults.length; j++) {
        const analyzer1 = analyzerResults[i];
        const analyzer2 = analyzerResults[j];
        
        if (!analyzer1 || !analyzer2) continue;
        
        const confidenceDiff = Math.abs(analyzer1.confidence - analyzer2.confidence);
        
        // If confidence difference is significant (>0.4), resolve conflict
        if (confidenceDiff > 0.4) {
          const priority1 = analyzerPriority[analyzer1.analyzerName] || analyzerPriority['default'] || 0;
          const priority2 = analyzerPriority[analyzer2.analyzerName] || analyzerPriority['default'] || 0;
          
          // Use higher priority analyzer's confidence as reference
          const referencePriority = Math.max(priority1, priority2);
          const referenceAnalyzer = priority1 > priority2 ? analyzer1 : analyzer2;
          const conflictingAnalyzer = priority1 > priority2 ? analyzer2 : analyzer1;
          
          if (!referenceAnalyzer || !conflictingAnalyzer) continue;
          
          this.conflictsResolved.push({
            conflictType: 'confidence_conflict',
            conflictingAnalyzers: [analyzer1.analyzerName, analyzer2.analyzerName],
            resolution: `prioritized_${referenceAnalyzer.analyzerName}`,
            confidence: referenceAnalyzer.confidence
          });

          // Adjust conflicting analyzer's confidence towards reference
          const adjustedConfidence = (conflictingAnalyzer.confidence + referenceAnalyzer.confidence) / 2;
          const updatedResult: EnhancedAnalyzerResult = {
            ...conflictingAnalyzer,
            confidence: adjustedConfidence,
            analyzerName: conflictingAnalyzer.analyzerName
          };
          
          results.set(conflictingAnalyzer.analyzerName, updatedResult);
        }
      }
    }
  }

  /**
   * Resolve data consistency conflicts between analyzers
   */
  private resolveDataConsistencyConflicts(
    results: Map<string, EnhancedAnalyzerResult>,
    analyzerPriority: Record<string, number>
  ): void {
    // Check for language-dependency consistency
    const languageResult = results.get('LanguageDetector');
    const dependencyResult = results.get('DependencyExtractor');
    
    if (languageResult && dependencyResult) {
      const languages = Array.isArray(languageResult.data) ? languageResult.data : [];
      const packages = dependencyResult.data?.packages || [];
      
      // Check if detected languages are consistent with package managers
      const languagePackageConsistency = this.checkLanguagePackageConsistency(languages, packages);
      
      if (!languagePackageConsistency.isConsistent) {
        this.conflictsResolved.push({
          conflictType: 'data_consistency',
          conflictingAnalyzers: ['LanguageDetector', 'DependencyExtractor'],
          resolution: 'language_priority',
          confidence: Math.min(languageResult.confidence, dependencyResult.confidence)
        });

        // Log inconsistency as warning
        this.warnings.push({
          code: 'DATA_CONSISTENCY_CONFLICT',
          message: 'Detected languages may not be consistent with package dependencies',
          component: 'ResultAggregator',
          severity: 'warning',
          details: {
            languages: languages.map((l: any) => l.name),
            packages: packages.map((p: any) => p.name),
            inconsistencies: languagePackageConsistency.issues
          }
        });
      }
    }

    // Check for command-language consistency
    const commandResult = results.get('CommandExtractor');
    
    if (languageResult && commandResult) {
      const languages = Array.isArray(languageResult.data) ? languageResult.data : [];
      const allCommands = [
        ...(commandResult.data?.build || []),
        ...(commandResult.data?.test || []),
        ...(commandResult.data?.run || []),
        ...(commandResult.data?.install || [])
      ];
      
      const commandLanguageConsistency = this.checkCommandLanguageConsistency(languages, allCommands);
      
      if (!commandLanguageConsistency.isConsistent) {
        this.conflictsResolved.push({
          conflictType: 'command_language_consistency',
          conflictingAnalyzers: ['LanguageDetector', 'CommandExtractor'],
          resolution: 'command_priority',
          confidence: Math.min(languageResult.confidence, commandResult.confidence)
        });
      }
    }
  }

  /**
   * Check consistency between detected languages and package managers
   */
  private checkLanguagePackageConsistency(
    languages: any[], 
    packages: any[]
  ): { isConsistent: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Language to package manager mapping
    const languagePackageMap: Record<string, string[]> = {
      'JavaScript': ['npm', 'yarn'],
      'TypeScript': ['npm', 'yarn'],
      'Python': ['pip'],
      'Java': ['maven', 'gradle'],
      'C#': ['nuget'],
      'Go': ['go'],
      'Rust': ['cargo'],
      'PHP': ['composer'],
      'Ruby': ['gem', 'bundler']
    };
    
    for (const lang of languages) {
      if (lang && lang.name && languagePackageMap[lang.name]) {
        const expectedManagers = languagePackageMap[lang.name];
        const hasMatchingPackage = packages.some((pkg: any) => 
          pkg && expectedManagers && expectedManagers.includes(pkg.manager)
        );
        
        if (!hasMatchingPackage && packages.length > 0) {
          issues.push(`Language ${lang.name} detected but no matching package manager found`);
        }
      }
    }
    
    return {
      isConsistent: issues.length === 0,
      issues
    };
  }

  /**
   * Check consistency between detected languages and commands
   */
  private checkCommandLanguageConsistency(
    languages: any[], 
    commands: any[]
  ): { isConsistent: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Language to command pattern mapping
    const languageCommandMap: Record<string, string[]> = {
      'JavaScript': ['npm', 'node', 'yarn'],
      'TypeScript': ['npm', 'tsc', 'yarn'],
      'Python': ['pip', 'python', 'pytest'],
      'Java': ['mvn', 'gradle', 'java'],
      'Go': ['go'],
      'Rust': ['cargo'],
      'PHP': ['composer', 'php'],
      'Ruby': ['gem', 'bundle', 'ruby']
    };
    
    for (const lang of languages) {
      if (lang && lang.name && languageCommandMap[lang.name]) {
        const expectedCommands = languageCommandMap[lang.name];
        const hasMatchingCommand = commands.some((cmd: any) => 
          cmd && cmd.command && expectedCommands && expectedCommands.some(pattern => 
            cmd.command.toLowerCase().includes(pattern)
          )
        );
        
        if (!hasMatchingCommand && commands.length > 0) {
          issues.push(`Language ${lang.name} detected but no matching commands found`);
        }
      }
    }
    
    return {
      isConsistent: issues.length === 0,
      issues
    };
  }

  /**
   * Validate result completeness and identify missing components
   */
  private validateResultCompleteness(result: AggregatedResult): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    // Check for critical missing data
    if (result.languages.length === 0) {
      issues.push({
        type: 'missing_data',
        severity: 'warning',
        message: 'No programming languages detected - this may indicate parsing issues',
        component: 'LanguageDetector'
      });
    }
    
    if (result.dependencies.packages.length === 0 && result.dependencies.packageFiles.length === 0) {
      issues.push({
        type: 'missing_data',
        severity: 'info',
        message: 'No dependencies detected - project may not have external dependencies',
        component: 'DependencyExtractor'
      });
    }
    
    const totalCommands = Object.values(result.commands).reduce((sum, arr) => sum + arr.length, 0);
    if (totalCommands === 0) {
      issues.push({
        type: 'missing_data',
        severity: 'warning',
        message: 'No commands detected - README may lack setup/usage instructions',
        component: 'CommandExtractor'
      });
    }
    
    // Check for low confidence in critical areas
    if (result.confidence.languages < 0.5 && result.languages.length > 0) {
      issues.push({
        type: 'low_confidence',
        severity: 'warning',
        message: `Low confidence in language detection (${(result.confidence.languages * 100).toFixed(1)}%)`,
        component: 'LanguageDetector'
      });
    }
    
    if (result.confidence.overall < 0.4) {
      issues.push({
        type: 'low_confidence',
        severity: 'error',
        message: `Overall confidence is critically low (${(result.confidence.overall * 100).toFixed(1)}%)`,
        component: 'ResultAggregator'
      });
    }
    
    return issues;
  }

  /**
   * Get confidence aggregation statistics for debugging and analysis
   */
  getConfidenceAggregationStats(results: EnhancedAnalyzerResult[]): {
    analyzerReliabilities: Record<string, number>;
    confidenceDistribution: {
      mean: number;
      median: number;
      standardDeviation: number;
      range: [number, number];
    };
    qualityMetrics: {
      averageDataQuality: number;
      averageCompleteness: number;
      qualityVariance: number;
    };
    conflictAnalysis: {
      totalConflicts: number;
      conflictSeverity: Record<'low' | 'medium' | 'high', number>;
      mostConflictedAnalyzers: string[];
    };
  } {
    const analyzerResults = results.map(result => ({
      analyzerName: result.analyzerName,
      confidence: result.confidence,
      dataQuality: result.metadata?.dataQuality ?? 0.5,
      completeness: result.metadata?.completeness ?? 0.5
    }));

    // Calculate analyzer reliabilities
    const analyzerReliabilities: Record<string, number> = {};
    for (const result of analyzerResults) {
      analyzerReliabilities[result.analyzerName] = 
        ANALYZER_RELIABILITY_WEIGHTS[result.analyzerName] ?? 
        ANALYZER_RELIABILITY_WEIGHTS['default'] ?? 0.6;
    }

    // Calculate confidence distribution
    const confidences = analyzerResults.map(r => r.confidence);
    const mean = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    const sortedConfidences = [...confidences].sort((a, b) => a - b);
    const median = sortedConfidences.length % 2 === 0
      ? ((sortedConfidences[sortedConfidences.length / 2 - 1] ?? 0) + (sortedConfidences[sortedConfidences.length / 2] ?? 0)) / 2
      : sortedConfidences[Math.floor(sortedConfidences.length / 2)] ?? 0;
    
    const variance = confidences.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / confidences.length;
    const standardDeviation = Math.sqrt(variance);
    const range: [number, number] = [Math.min(...confidences), Math.max(...confidences)];

    // Calculate quality metrics
    const dataQualities = analyzerResults.map(r => r.dataQuality!);
    const completenesses = analyzerResults.map(r => r.completeness!);
    
    const averageDataQuality = dataQualities.reduce((sum, q) => sum + q, 0) / dataQualities.length;
    const averageCompleteness = completenesses.reduce((sum, c) => sum + c, 0) / completenesses.length;
    
    const qualityMean = averageDataQuality;
    const qualityVariance = dataQualities.reduce((sum, q) => sum + Math.pow(q - qualityMean, 2), 0) / dataQualities.length;

    // Analyze conflicts
    const { conflicts } = aggregateWithConflictResolution(analyzerResults);
    const conflictSeverity = { low: 0, medium: 0, high: 0 };
    const analyzerConflictCount: Record<string, number> = {};

    for (const conflict of conflicts) {
      conflictSeverity[conflict.severity]++;
      for (const analyzer of conflict.analyzers) {
        analyzerConflictCount[analyzer] = (analyzerConflictCount[analyzer] || 0) + 1;
      }
    }

    const mostConflictedAnalyzers = Object.entries(analyzerConflictCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([analyzer]) => analyzer);

    return {
      analyzerReliabilities,
      confidenceDistribution: {
        mean,
        median,
        standardDeviation,
        range
      },
      qualityMetrics: {
        averageDataQuality,
        averageCompleteness,
        qualityVariance
      },
      conflictAnalysis: {
        totalConflicts: conflicts.length,
        conflictSeverity,
        mostConflictedAnalyzers
      }
    };
  }
}