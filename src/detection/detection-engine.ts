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

/**
 * Core detection engine that orchestrates framework analysis
 */
export class DetectionEngine {
  private analyzers: LanguageAnalyzer[] = [];
  private confidenceCalculator: ConfidenceCalculator;
  private evidenceCollector: EvidenceCollectorImpl;
  private resultAggregator: ResultAggregator;

  constructor() {
    this.confidenceCalculator = new ConfidenceCalculator();
    this.evidenceCollector = new EvidenceCollectorImpl();
    this.resultAggregator = new ResultAggregator();
    
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
    const startTime = Date.now();
    
    // Collect evidence from project information
    const evidence = await this.evidenceCollector.collectEvidence(projectInfo, projectPath);
    
    // Run applicable analyzers in parallel for better performance
    const analyzerPromises = this.analyzers
      .filter(analyzer => analyzer.canAnalyze(projectInfo))
      .map(async (analyzer): Promise<LanguageDetectionResult | null> => {
        try {
          return await analyzer.analyze(projectInfo, projectPath);
        } catch (error) {
          // Log error but don't fail entire detection
          console.warn(`${analyzer.name} analysis failed:`, error);
          return null;
        }
      });

    const analyzerResults = (await Promise.all(analyzerPromises))
      .filter((result): result is LanguageDetectionResult => result !== null);

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

    // Generate alternatives for low-confidence detections
    const alternatives = this.generateAlternatives(
      aggregatedResults.frameworks || [], 
      evidence, 
      confidence.score
    );

    // Collect warnings from analyzers and aggregation
    const warnings = [
      ...(aggregatedResults.warnings || []),
      ...this.generateAnalysisWarnings(analyzerResults, evidence)
    ];

    const executionTime = Date.now() - startTime;
    console.log(`Detection analysis completed in ${executionTime}ms`);

    return {
      frameworks: aggregatedResults.frameworks || [],
      buildTools: aggregatedResults.buildTools || [],
      containers: [], // Will be populated when container analyzer is implemented
      confidence,
      alternatives,
      warnings
    };
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