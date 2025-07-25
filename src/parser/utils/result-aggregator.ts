/**
 * Result aggregation utilities for combining analyzer outputs
 */

import { 
  ProjectInfo, 
  AnalysisResult, 
  ParseError, 
  ConfidenceScores,
  LanguageInfo,
  DependencyInfo,
  CommandInfo,
  TestingInfo,
  ProjectMetadata
} from '../types';
import { calculateOverallConfidence, normalizeConfidence } from './confidence-calculator';

/**
 * Aggregates results from multiple content analyzers into a unified ProjectInfo structure
 */
export class ResultAggregator {
  private errors: ParseError[] = [];
  private warnings: ParseError[] = [];

  /**
   * Aggregate multiple analysis results into a single ProjectInfo object
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
  private extractMetadata(results: Map<string, AnalysisResult>): ProjectMetadata {
    const metadataResult = results.get('metadata');
    
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
  private extractLanguages(results: Map<string, AnalysisResult>): LanguageInfo[] {
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
  private extractDependencies(results: Map<string, AnalysisResult>): DependencyInfo {
    // Try both possible analyzer names for backward compatibility
    const dependencyResult = results.get('DependencyExtractor') || results.get('dependency');
    
    if (!dependencyResult?.data) {
      return {
        packageFiles: [],
        installCommands: [],
        packages: []
      };
    }

    return {
      packageFiles: dependencyResult.data.packageFiles || [],
      installCommands: dependencyResult.data.installCommands || [],
      packages: dependencyResult.data.packages || []
    };
  }

  /**
   * Extract command information from analyzer results
   */
  private extractCommands(results: Map<string, AnalysisResult>): CommandInfo {
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
  private extractTesting(results: Map<string, AnalysisResult>): TestingInfo {
    const testingResult = results.get('TestingDetector') || results.get('testing');
    
    if (!testingResult?.data) {
      return {
        frameworks: [],
        tools: [],
        configFiles: [],
        confidence: 0
      };
    }

    return {
      frameworks: testingResult.data.frameworks || [],
      tools: testingResult.data.tools || [],
      configFiles: testingResult.data.configFiles || [],
      confidence: normalizeConfidence(testingResult.confidence)
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
    const metadataConfidence = results.get('metadata')?.confidence || 0;

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
}