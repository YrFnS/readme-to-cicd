import { ProjectInfo } from './interfaces/framework-detector';
import { DetectionResult } from './interfaces/detection-result';
import { CIPipeline } from './interfaces/ci-pipeline';
import { LanguageAnalyzer, LanguageDetectionResult } from './interfaces/language-analyzer';
import { FrameworkInfo } from './interfaces/framework-info';
import { OverallConfidence } from './interfaces/confidence';
import { Evidence } from './interfaces/evidence';
import { ConfidenceCalculator } from './utils/confidence-calculator';
import { EvidenceCollectorImpl } from './utils/evidence-collector';
import { ResultAggregator } from './utils/result-aggregator';
import { DetectionError, DetectionFailureError, IntegrationError } from './errors/detection-errors';
import { ErrorRecovery, Result } from './errors/error-recovery';
import { AlternativeSuggestionGenerator, AlternativeSuggestion } from './utils/alternative-suggestions';
import { ConflictResolver, DetectionConflict } from './utils/conflict-resolution';
import { WarningSystem, DetectionWarning as SystemWarning } from './utils/warning-system';
import { DetectionWarning } from './interfaces/detection-result';
import { DetectionLogger, getLogger, timeOperation } from './utils/logger';

/**
 * Core detection engine that orchestrates framework analysis
 */
export class DetectionEngine {
  private analyzers: LanguageAnalyzer[] = [];
  private confidenceCalculator: ConfidenceCalculator;
  private evidenceCollector: EvidenceCollectorImpl;
  private resultAggregator: ResultAggregator;
  private alternativeSuggestionGenerator: AlternativeSuggestionGenerator;
  private conflictResolver: ConflictResolver;
  private warningSystem: WarningSystem;
  private logger: DetectionLogger;

  constructor() {
    this.confidenceCalculator = new ConfidenceCalculator();
    this.evidenceCollector = new EvidenceCollectorImpl();
    this.resultAggregator = new ResultAggregator();
    this.alternativeSuggestionGenerator = new AlternativeSuggestionGenerator();
    this.conflictResolver = new ConflictResolver();
    this.warningSystem = new WarningSystem();
    this.logger = getLogger();
    
    // Analyzers will be registered here when implemented
    this.initializeAnalyzers();
  }

  /**
   * Initialize language analyzers
   */
  private initializeAnalyzers(): void {
    // TODO: Register analyzers when implemented
    // this.analyzers.push(new NodeJSAnalyzer());
    // this.analyzers.push(new PythonAnalyzer());
    // etc.
  }

  /**
   * Analyze project and detect frameworks
   */
  async analyze(projectInfo: ProjectInfo, projectPath?: string): Promise<Omit<DetectionResult, 'detectedAt' | 'executionTime'>> {
    return await timeOperation(
      this.logger,
      'DetectionEngine',
      'analyze',
      async () => {
        this.logger.info('DetectionEngine', 'Starting framework detection analysis', {
          projectLanguages: projectInfo.languages,
          configFiles: projectInfo.configFiles?.length || 0,
          projectPath: projectPath ? '[PROVIDED]' : '[NOT_PROVIDED]'
        });

        // Collect evidence from project information with error handling
        const evidenceResult = await ErrorRecovery.withRetry(
          () => this.evidenceCollector.collectEvidence(projectInfo, projectPath),
          { maxAttempts: 2 }
        );

        if (!evidenceResult.success) {
          this.logger.error('DetectionEngine', 'Failed to collect evidence', evidenceResult.error);
          throw new IntegrationError(
            'Evidence collection failed',
            'DetectionEngine',
            'EvidenceCollector',
            { originalError: evidenceResult.error.message }
          );
        }

        const evidence = evidenceResult.data;
        this.logger.debug('DetectionEngine', 'Evidence collected', {
          evidenceCount: evidence.length,
          evidenceTypes: [...new Set(evidence.map(e => e.type))]
        });

        // Run applicable analyzers in parallel with improved error handling
        const applicableAnalyzers = this.analyzers.filter(analyzer => analyzer.canAnalyze(projectInfo));
        this.logger.info('DetectionEngine', 'Running analyzers', {
          totalAnalyzers: this.analyzers.length,
          applicableAnalyzers: applicableAnalyzers.length,
          analyzerNames: applicableAnalyzers.map(a => a.name)
        });

        const analyzerPromises = applicableAnalyzers.map(async (analyzer): Promise<LanguageDetectionResult | null> => {
          const analyzerResult = await ErrorRecovery.withRetry(
            () => analyzer.analyze(projectInfo, projectPath),
            { 
              maxAttempts: 2,
              retryableErrors: ['FILESYSTEM_ERROR', 'PARSE_ERROR']
            }
          );

          if (!analyzerResult.success) {
            this.logger.warn('DetectionEngine', `${analyzer.name} analysis failed`, {
              analyzer: analyzer.name,
              error: analyzerResult.error.message,
              recoverable: analyzerResult.error.recoverable
            });
            return null;
          }

          this.logger.debug('DetectionEngine', `${analyzer.name} analysis completed`, {
            analyzer: analyzer.name,
            frameworksFound: analyzerResult.data.frameworks.length,
            buildToolsFound: analyzerResult.data.buildTools.length,
            confidence: analyzerResult.data.confidence
          });

          return analyzerResult.data;
        });

        const analyzerResults = (await Promise.all(analyzerPromises))
          .filter((result): result is LanguageDetectionResult => result !== null);

        this.logger.info('DetectionEngine', 'Analyzer execution completed', {
          successfulAnalyzers: analyzerResults.length,
          failedAnalyzers: applicableAnalyzers.length - analyzerResults.length
        });

        // Aggregate results from all analyzers
        const aggregatedResults = this.resultAggregator.mergeAnalyzerResults(analyzerResults);
        
        // Calculate overall confidence using evidence and detection results
        const confidence = this.confidenceCalculator.calculateOverallConfidence(
          evidence, 
          { 
            frameworks: aggregatedResults.frameworks || [],
            buildTools: aggregatedResults.buildTools || [],
            analyzerResults 
          }
        );

        this.logger.info('DetectionEngine', 'Confidence calculated', {
          overallScore: confidence.score,
          level: confidence.level,
          frameworksDetected: aggregatedResults.frameworks?.length || 0,
          buildToolsDetected: aggregatedResults.buildTools?.length || 0
        });

        // Detect and resolve conflicts
        const conflicts = this.conflictResolver.detectConflicts({
          frameworks: aggregatedResults.frameworks || [],
          buildTools: aggregatedResults.buildTools || [],
          evidence,
          projectLanguages: projectInfo.languages
        });

        let resolvedFrameworks = aggregatedResults.frameworks || [];
        let resolvedBuildTools = aggregatedResults.buildTools || [];
        let conflictWarnings: string[] = [];

        if (conflicts.length > 0) {
          this.logger.warn('DetectionEngine', 'Conflicts detected', {
            conflictCount: conflicts.length,
            conflictTypes: conflicts.map(c => c.type)
          });

          const resolution = this.conflictResolver.resolveConflicts(conflicts, {
            frameworks: resolvedFrameworks,
            buildTools: resolvedBuildTools,
            evidence,
            projectLanguages: projectInfo.languages
          });

          resolvedFrameworks = resolution.resolvedContext.frameworks;
          resolvedBuildTools = resolution.resolvedContext.buildTools;
          conflictWarnings = resolution.warnings;
        }

        // Generate alternative suggestions
        const alternatives = this.alternativeSuggestionGenerator.generateAlternatives({
          detectedFrameworks: resolvedFrameworks,
          evidence,
          confidence,
          projectLanguages: projectInfo.languages,
          configFiles: projectInfo.configFiles || []
        });

        this.logger.debug('DetectionEngine', 'Alternative suggestions generated', {
          alternativeCount: alternatives.length,
          alternativeNames: alternatives.map(a => a.name)
        });

        // Generate comprehensive warnings
        const systemWarnings = this.warningSystem.generateWarnings({
          frameworks: resolvedFrameworks,
          buildTools: resolvedBuildTools,
          evidence,
          confidence,
          conflicts,
          projectLanguages: projectInfo.languages,
          configFiles: projectInfo.configFiles || []
        });

        // Combine all warnings - convert everything to DetectionWarning format
        const allWarnings: DetectionWarning[] = [
          // Convert aggregated warnings to DetectionWarning format
          ...(aggregatedResults.warnings || []).map(w => ({
            type: 'incomplete' as const,
            message: typeof w === 'string' ? w : w.message || 'Analysis warning',
            affected: ['frameworks', 'buildTools']
          })),
          // Convert conflict warnings to DetectionWarning format
          ...conflictWarnings.map(w => ({
            type: 'conflict' as const,
            message: w,
            affected: ['frameworks']
          })),
          // Convert system warnings to DetectionWarning format
          ...systemWarnings.map(w => ({
            type: 'incomplete' as const,
            message: w.message,
            affected: w.affectedItems,
            resolution: w.recommendations.join('; ')
          }))
        ];

        this.logger.info('DetectionEngine', 'Analysis completed successfully', {
          finalFrameworkCount: resolvedFrameworks.length,
          finalBuildToolCount: resolvedBuildTools.length,
          alternativeCount: alternatives.length,
          warningCount: allWarnings.length,
          overallConfidence: confidence.score
        });

        return {
          frameworks: resolvedFrameworks,
          buildTools: resolvedBuildTools,
          containers: [], // Will be populated when container analyzer is implemented
          confidence,
          alternatives,
          warnings: allWarnings
        };
      },
      { projectPath: projectPath ? '[PROVIDED]' : '[NOT_PROVIDED]' }
    );
  }

  /**
   * Generate CI/CD pipeline from detection results
   */
  async generateCIPipeline(detectionResult: DetectionResult): Promise<CIPipeline> {
    // Basic pipeline structure - will be enhanced when step generator is implemented
    return {
      setup: [],
      build: [],
      test: [],
      security: [],
      deploy: [],
      cache: [],
      metadata: {
        name: 'Generated CI Pipeline',
        triggers: [{ type: 'push', branches: ['main'] }],
        environments: ['development'],
        secrets: [],
        variables: {}
      }
    };
  }

  /**
   * Generate alternative framework suggestions for low-confidence detections
   */
  private generateAlternatives(
    frameworks: FrameworkInfo[], 
    evidence: Evidence[], 
    overallConfidence: number
  ): any[] {
    const alternatives: any[] = [];
    
    // If confidence is low, suggest alternatives based on evidence
    if (overallConfidence < 0.5) {
      const textEvidence = evidence.filter(e => e.type === 'text_mention');
      
      textEvidence.forEach(e => {
        // Don't suggest alternatives for already detected frameworks
        const alreadyDetected = frameworks.some(f => 
          f.name.toLowerCase().includes(e.value.toLowerCase())
        );
        
        if (!alreadyDetected) {
          alternatives.push({
            name: e.value,
            reason: `Mentioned in project documentation`,
            confidence: e.weight * 0.7, // Lower confidence for alternatives
            evidence: [`Found in ${e.source}`]
          });
        }
      });
    }
    
    return alternatives.slice(0, 3); // Limit to top 3 alternatives
  }

  /**
   * Generate warnings from analysis results
   */
  private generateAnalysisWarnings(
    analyzerResults: LanguageDetectionResult[], 
    evidence: Evidence[]
  ): any[] {
    const warnings: any[] = [];
    
    // Check for failed analyzers
    const failedAnalyzers = this.analyzers.length - analyzerResults.length;
    if (failedAnalyzers > 0) {
      warnings.push({
        type: 'incomplete',
        message: `${failedAnalyzers} analyzer(s) failed to complete`,
        affected: ['frameworks', 'buildTools'],
        resolution: 'Check project structure and configuration files'
      });
    }
    
    // Check for conflicting framework detections
    const frameworkNames = analyzerResults
      .flatMap(r => r.frameworks)
      .map(f => f.name.toLowerCase());
    
    const duplicates = frameworkNames.filter((name, index) => 
      frameworkNames.indexOf(name) !== index
    );
    
    if (duplicates.length > 0) {
      warnings.push({
        type: 'conflict',
        message: `Multiple detections for frameworks: ${Array.from(new Set(duplicates)).join(', ')}`,
        affected: ['frameworks'],
        resolution: 'Review detection results and verify framework choices'
      });
    }
    
    // Check for minimal evidence
    if (evidence.length < 3) {
      warnings.push({
        type: 'incomplete',
        message: 'Limited evidence found for framework detection',
        affected: ['frameworks', 'buildTools'],
        resolution: 'Add more configuration files or improve documentation'
      });
    }
    
    return warnings;
  }

  /**
   * Register a language analyzer
   */
  registerAnalyzer(analyzer: LanguageAnalyzer): void {
    if (!this.analyzers.find(a => a.name === analyzer.name)) {
      this.analyzers.push(analyzer);
      console.log(`Registered analyzer: ${analyzer.name} for ${analyzer.ecosystem}`);
    }
  }

  /**
   * Get registered analyzers
   */
  getRegisteredAnalyzers(): LanguageAnalyzer[] {
    return [...this.analyzers];
  }
}