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
import { LazyLoader, getLazyLoader } from './performance/lazy-loader';
import { getConfigManager } from './configuration/config-manager';

/**
 * Core detection engine that orchestrates framework analysis with lazy loading
 */
export class DetectionEngine {
  private analyzers: LanguageAnalyzer[] = [];
  private confidenceCalculator: ConfidenceCalculator;
  private evidenceCollector: EvidenceCollectorImpl;
  private resultAggregator: ResultAggregator;
  private alternativeSuggestionGenerator: AlternativeSuggestionGenerator;
  private conflictResolver: ConflictResolver;
  private warningSystem: WarningSystem;
  private lazyLoader: LazyLoader;
  private logger: DetectionLogger;

  private initializationPromise: Promise<void>;

  constructor() {
    this.confidenceCalculator = new ConfidenceCalculator();
    this.evidenceCollector = new EvidenceCollectorImpl();
    this.resultAggregator = new ResultAggregator();
    this.alternativeSuggestionGenerator = new AlternativeSuggestionGenerator();
    this.conflictResolver = new ConflictResolver();
    this.warningSystem = new WarningSystem();
    this.lazyLoader = getLazyLoader();
    this.logger = getLogger();
    
    // Initialize analyzers asynchronously with lazy loading
    this.initializationPromise = this.initializeAnalyzers();
  }

  /**
   * Initialize language analyzers with lazy loading
   */
  private async initializeAnalyzers(): Promise<void> {
    try {
      const configManager = getConfigManager();
      const globalConfig = configManager.getGlobalConfig();
      
      // Only preload if lazy loading is disabled or for essential analyzers
      if (!globalConfig.detection.enableLazyLoading) {
        await this.loadAllAnalyzers();
      } else {
        // Just log that lazy loading is enabled
        this.logger.info('DetectionEngine', 'Lazy loading enabled, analyzers will be loaded on demand');
      }
    } catch (error) {
      this.logger.error('DetectionEngine', 'Failed to initialize analyzers', error as Error);
      // Continue - analyzers will be loaded on demand
    }
  }

  /**
   * Load all analyzers immediately (for non-lazy loading mode)
   */
  private async loadAllAnalyzers(): Promise<void> {
    const analyzerNames = ['nodejs', 'python', 'rust', 'go', 'java', 'container', 'frontend'];
    
    for (const analyzerName of analyzerNames) {
      try {
        const result = await this.lazyLoader.loadAnalyzer(analyzerName);
        if (result.success && result.module) {
          this.analyzers.push(result.module);
        }
      } catch (error) {
        this.logger.warn('DetectionEngine', 'Failed to load analyzer', {
          analyzer: analyzerName,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    this.logger.info('DetectionEngine', 'All analyzers loaded', {
      analyzerCount: this.analyzers.length,
      analyzers: this.analyzers.map(a => a.name)
    });
  }

  /**
   * Get analyzer for ecosystem with lazy loading
   */
  private async getAnalyzerForEcosystem(ecosystem: string): Promise<LanguageAnalyzer | null> {
    // First check if analyzer is already loaded
    const existingAnalyzer = this.analyzers.find(a => a.ecosystem === ecosystem);
    if (existingAnalyzer) {
      return existingAnalyzer;
    }

    // Map ecosystem to analyzer name
    const ecosystemMap: Record<string, string> = {
      'nodejs': 'nodejs',
      'python': 'python',
      'rust': 'rust',
      'go': 'go',
      'java': 'java',
      'container': 'container',
      'frontend': 'frontend'
    };

    const analyzerName = ecosystemMap[ecosystem.toLowerCase()];
    if (!analyzerName) {
      return null;
    }

    // Load analyzer lazily
    const result = await this.lazyLoader.loadAnalyzer(analyzerName);
    if (result.success && result.module) {
      this.analyzers.push(result.module);
      return result.module;
    }

    return null;
  }

  /**
   * Get applicable analyzers for project, loading them on-demand
   */
  private async getApplicableAnalyzers(projectInfo: ProjectInfo, evidence: Evidence[]): Promise<LanguageAnalyzer[]> {
    const applicableAnalyzers: LanguageAnalyzer[] = [];
    
    // Determine which ecosystems to check based on project languages and evidence
    const ecosystemsToCheck = new Set<string>();
    
    // Add ecosystems based on project languages
    projectInfo.languages.forEach(lang => {
      const langLower = lang.toLowerCase();
      if (langLower.includes('javascript') || langLower.includes('typescript')) {
        ecosystemsToCheck.add('nodejs');
        ecosystemsToCheck.add('frontend');
      }
      if (langLower.includes('python')) {
        ecosystemsToCheck.add('python');
      }
      if (langLower.includes('rust')) {
        ecosystemsToCheck.add('rust');
      }
      if (langLower.includes('go')) {
        ecosystemsToCheck.add('go');
      }
      if (langLower.includes('java') || langLower.includes('kotlin') || langLower.includes('scala')) {
        ecosystemsToCheck.add('java');
      }
    });
    
    // Add ecosystems based on evidence
    evidence.forEach(e => {
      const valueLower = e.value.toLowerCase();
      if (valueLower.includes('package.json') || valueLower.includes('npm') || valueLower.includes('yarn') || valueLower.includes('node')) {
        ecosystemsToCheck.add('nodejs');
      }
      if (valueLower.includes('requirements.txt') || valueLower.includes('setup.py') || valueLower.includes('pip') || valueLower.includes('python')) {
        ecosystemsToCheck.add('python');
      }
      if (valueLower.includes('cargo.toml') || valueLower.includes('rust')) {
        ecosystemsToCheck.add('rust');
      }
      if (valueLower.includes('go.mod') || valueLower.includes('go.sum')) {
        ecosystemsToCheck.add('go');
      }
      if (valueLower.includes('pom.xml') || valueLower.includes('build.gradle') || valueLower.includes('maven') || valueLower.includes('gradle')) {
        ecosystemsToCheck.add('java');
      }
      if (valueLower.includes('dockerfile') || valueLower.includes('docker-compose')) {
        ecosystemsToCheck.add('container');
      }
      if (valueLower.includes('webpack') || valueLower.includes('vite') || valueLower.includes('react') || valueLower.includes('vue') || valueLower.includes('angular')) {
        ecosystemsToCheck.add('frontend');
      }
    });
    
    // If no specific ecosystems identified, try common ones
    if (ecosystemsToCheck.size === 0) {
      ecosystemsToCheck.add('nodejs');
      ecosystemsToCheck.add('python');
      ecosystemsToCheck.add('frontend');
    }
    
    this.logger.debug('DetectionEngine', 'Loading analyzers for ecosystems', {
      ecosystems: Array.from(ecosystemsToCheck),
      projectLanguages: projectInfo.languages,
      evidenceCount: evidence.length
    });
    
    // Load analyzers for each ecosystem
    for (const ecosystem of ecosystemsToCheck) {
      try {
        const analyzer = await this.getAnalyzerForEcosystem(ecosystem);
        if (analyzer && analyzer.canAnalyze(projectInfo)) {
          applicableAnalyzers.push(analyzer);
          this.logger.debug('DetectionEngine', 'Loaded applicable analyzer', {
            analyzer: analyzer.name,
            ecosystem: analyzer.ecosystem
          });
        }
      } catch (error) {
        this.logger.warn('DetectionEngine', 'Failed to load analyzer for ecosystem', {
          ecosystem,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return applicableAnalyzers;
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
        // Wait for analyzer initialization to complete
        await this.initializationPromise;

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

        if (evidenceResult.success === false) {
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

        // CRITICAL FIX: Load analyzers on-demand based on project languages and evidence
        const applicableAnalyzers = await this.getApplicableAnalyzers(projectInfo, evidence);
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

          if (analyzerResult.success === false) {
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
    return await timeOperation(
      this.logger,
      'DetectionEngine',
      'generateCIPipeline',
      async () => {
        this.logger.info('DetectionEngine', 'Starting CI pipeline generation', {
          frameworksCount: detectionResult.frameworks.length,
          buildToolsCount: detectionResult.buildTools.length,
          containersCount: detectionResult.containers.length
        });

        // Import and use CIStepGenerator
        const { CIStepGenerator } = await import('./templates/step-generator');
        const stepGenerator = new CIStepGenerator();

        const pipeline = await stepGenerator.generatePipeline(detectionResult);

        this.logger.info('DetectionEngine', 'CI pipeline generation completed', {
          setupSteps: pipeline.setup.length,
          buildSteps: pipeline.build.length,
          testSteps: pipeline.test.length,
          securitySteps: pipeline.security.length,
          deploySteps: pipeline.deploy.length,
          cacheStrategies: pipeline.cache.length
        });

        return pipeline;
      },
      {
        frameworksCount: detectionResult.frameworks.length,
        buildToolsCount: detectionResult.buildTools.length
      }
    );
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