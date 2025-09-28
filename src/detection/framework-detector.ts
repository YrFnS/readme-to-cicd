import { FrameworkDetector, ProjectInfo } from './interfaces/framework-detector';
import { DetectionResult } from './interfaces/detection-result';
import { CIPipeline } from './interfaces/ci-pipeline';
import { DetectionEngine } from './detection-engine';
import { DetectionError, DetectionFailureError } from './errors/detection-errors';
import { ErrorRecovery } from './errors/error-recovery';
import { DetectionLogger, getLogger, timeOperation } from './utils/logger';
import { CacheManager, getCacheManager } from './performance/cache-manager';
import { PerformanceMonitor, getPerformanceMonitor, timed } from './performance/performance-monitor';
import { getPluginSystem } from './extensibility/plugin-system';
import { getConfigManager } from './configuration/config-manager';

/**
 * Main framework detection implementation with performance optimizations
 */
export class FrameworkDetectorImpl implements FrameworkDetector {
  private detectionEngine: DetectionEngine;
  private cacheManager: CacheManager;
  private performanceMonitor: PerformanceMonitor;
  private logger: DetectionLogger;

  constructor() {
    this.detectionEngine = new DetectionEngine();
    this.cacheManager = getCacheManager();
    this.performanceMonitor = getPerformanceMonitor();
    this.logger = getLogger();
    
    // Initialize configuration and plugins
    this.initializeExtensions();
  }

  /**
   * Initialize extensions and plugins
   */
  private async initializeExtensions(): Promise<void> {
    try {
      // Load configuration
      const configManager = getConfigManager();
      await configManager.loadConfig();
      
      // Initialize plugin system with registered analyzers
      const pluginSystem = getPluginSystem();
      const activeAnalyzers = pluginSystem.getActiveAnalyzers();
      
      // Register plugin analyzers with detection engine
      for (const analyzer of activeAnalyzers) {
        this.detectionEngine.registerAnalyzer(analyzer);
      }
      
      this.logger.info('FrameworkDetector', 'Extensions initialized', {
        pluginAnalyzers: activeAnalyzers.length,
        cacheEnabled: true,
        performanceMonitoring: true
      });
    } catch (error) {
      this.logger.warn('FrameworkDetector', 'Failed to initialize extensions', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Detect frameworks and build tools from project information with caching
   */
  async detectFrameworks(projectInfo: ProjectInfo, projectPath?: string): Promise<DetectionResult> {
    const operationId = `detectFrameworks-${projectInfo.name}-${Date.now()}`;
    this.performanceMonitor.startOperation(operationId, 'FrameworkDetector', {
      languages: projectInfo.languages || [],
      configFiles: projectInfo.configFiles?.length || 0
    });

    try {
      // Check cache first
      const cachedResult = this.cacheManager.getCachedDetectionResult(projectInfo, projectPath);
      if (cachedResult) {
        this.logger.info('FrameworkDetector', 'Returning cached detection result', {
          project: projectInfo.name,
          frameworks: cachedResult.frameworks.length,
          cacheAge: Date.now() - cachedResult.detectedAt.getTime()
        });
        
        this.performanceMonitor.recordMetric('cache.hit', 1, 'count', { type: 'detection' });
        this.performanceMonitor.endOperation(operationId, 'FrameworkDetector', true);
        return cachedResult;
      }

      this.performanceMonitor.recordMetric('cache.miss', 1, 'count', { type: 'detection' });

      this.logger.info('FrameworkDetector', 'Starting framework detection', {
        languages: projectInfo.languages || [],
        configFilesCount: projectInfo.configFiles?.length || 0,
        hasProjectPath: !!projectPath
      });

      const detectionResult = await ErrorRecovery.withRetry(
        () => this.detectionEngine.analyze(projectInfo, projectPath),
        {
          maxAttempts: 2,
          retryableErrors: ['DETECTION_FAILURE', 'INTEGRATION_ERROR']
        }
      );

      if (detectionResult.success === false) {
        this.logger.error('FrameworkDetector', 'Framework detection failed', detectionResult.error);
        this.performanceMonitor.endOperation(operationId, 'FrameworkDetector', false, detectionResult.error.message);
        
        throw new DetectionFailureError(
          `Framework detection failed: ${detectionResult.error.message}`,
          'FrameworkDetector',
          { 
            originalError: detectionResult.error.message,
            projectInfo: {
              languages: projectInfo.languages || [],
              configFiles: projectInfo.configFiles?.length || 0
            }
          }
        );
      }

      const result: DetectionResult = {
        frameworks: detectionResult.data?.frameworks || [],
        buildTools: detectionResult.data?.buildTools || [],
        containers: detectionResult.data?.containers || [],
        confidence: detectionResult.data?.confidence || {
          score: 0.0,
          level: 'low',
          breakdown: {
            frameworks: { 
              score: 0.0, 
              detectedCount: 0, 
              evidenceQuality: { strongEvidence: 0, mediumEvidence: 0, weakEvidence: 0, diversityScore: 0 }, 
              factors: [] 
            },
            buildTools: { 
              score: 0.0, 
              detectedCount: 0, 
              evidenceQuality: { strongEvidence: 0, mediumEvidence: 0, weakEvidence: 0, diversityScore: 0 }, 
              factors: [] 
            },
            containers: { 
              score: 0.0, 
              detectedCount: 0, 
              evidenceQuality: { strongEvidence: 0, mediumEvidence: 0, weakEvidence: 0, diversityScore: 0 }, 
              factors: [] 
            },
            languages: { 
              score: 0.0, 
              detectedCount: 0, 
              evidenceQuality: { strongEvidence: 0, mediumEvidence: 0, weakEvidence: 0, diversityScore: 0 }, 
              factors: [] 
            }
          },
          factors: [],
          recommendations: ['Ensure README contains clear project information', 'Add framework-specific configuration files']
        },
        alternatives: detectionResult.data?.alternatives || [],
        warnings: detectionResult.data?.warnings || [],
        detectedAt: new Date(),
        executionTime: 0 // Will be set by performance monitor
      };

      // Cache the result
      this.cacheManager.cacheDetectionResult(projectInfo, result, projectPath);

      this.logger.info('FrameworkDetector', 'Framework detection completed successfully', {
        frameworksDetected: result.frameworks.length,
        buildToolsDetected: result.buildTools.length,
        overallConfidence: result.confidence.score,
        warningsCount: result.warnings.length
      });

      // Record performance metrics
      this.performanceMonitor.recordMetric('frameworks.detected', result.frameworks.length, 'count');
      this.performanceMonitor.recordMetric('confidence.score', result.confidence.score, 'ratio');
      this.performanceMonitor.endOperation(operationId, 'FrameworkDetector', true);

      return result;

    } catch (error) {
      this.performanceMonitor.endOperation(operationId, 'FrameworkDetector', false, 
        error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Generate CI/CD pipeline steps based on detection results with caching
   */
  async suggestCISteps(detectionResult: DetectionResult): Promise<CIPipeline> {
    const operationId = `suggestCISteps-${Date.now()}`;
    this.performanceMonitor.startOperation(operationId, 'FrameworkDetector', {
      frameworks: detectionResult.frameworks.length,
      buildTools: detectionResult.buildTools.length
    });

    try {
      // Check cache first
      const cachedPipeline = this.cacheManager.getCachedPipelineResult(detectionResult);
      if (cachedPipeline) {
        this.logger.info('FrameworkDetector', 'Returning cached CI pipeline', {
          setupSteps: cachedPipeline.setup.length,
          buildSteps: cachedPipeline.build.length,
          testSteps: cachedPipeline.test.length
        });
        
        this.performanceMonitor.recordMetric('cache.hit', 1, 'count', { type: 'pipeline' });
        this.performanceMonitor.endOperation(operationId, 'FrameworkDetector', true);
        return cachedPipeline;
      }

      this.performanceMonitor.recordMetric('cache.miss', 1, 'count', { type: 'pipeline' });

      this.logger.info('FrameworkDetector', 'Starting CI step generation', {
        frameworksCount: detectionResult.frameworks.length,
        buildToolsCount: detectionResult.buildTools.length,
        confidence: detectionResult.confidence.score
      });

      const pipelineResult = await ErrorRecovery.withRetry(
        () => this.detectionEngine.generateCIPipeline(detectionResult),
        {
          maxAttempts: 2,
          retryableErrors: ['GENERATION_ERROR', 'TEMPLATE_ERROR']
        }
      );

      if (pipelineResult.success === false) {
        this.logger.error('FrameworkDetector', 'CI step generation failed', pipelineResult.error);
        this.performanceMonitor.endOperation(operationId, 'FrameworkDetector', false, pipelineResult.error.message);
        
        throw new DetectionFailureError(
          `CI step generation failed: ${pipelineResult.error.message}`,
          'FrameworkDetector',
          {
            originalError: pipelineResult.error.message,
            detectionResult: {
              frameworksCount: detectionResult.frameworks.length,
              buildToolsCount: detectionResult.buildTools.length
            }
          }
        );
      }

      const pipeline = pipelineResult.data;

      // Cache the pipeline result
      this.cacheManager.cachePipelineResult(detectionResult, pipeline);

      this.logger.info('FrameworkDetector', 'CI step generation completed', {
        setupSteps: pipeline.setup.length,
        buildSteps: pipeline.build.length,
        testSteps: pipeline.test.length,
        deploySteps: pipeline.deploy.length
      });

      // Record performance metrics
      this.performanceMonitor.recordMetric('pipeline.steps.total', 
        pipeline.setup.length + pipeline.build.length + pipeline.test.length + pipeline.deploy.length, 
        'count'
      );
      this.performanceMonitor.endOperation(operationId, 'FrameworkDetector', true);

      return pipeline;

    } catch (error) {
      this.performanceMonitor.endOperation(operationId, 'FrameworkDetector', false,
        error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    return {
      cache: this.cacheManager.getStats(),
      performance: this.performanceMonitor.getStats(),
      plugins: getPluginSystem().getStats(),
      config: getConfigManager().getStats()
    };
  }

  /**
   * Clear caches and reset performance data
   */
  clearCaches(): void {
    this.cacheManager.clear();
    this.performanceMonitor.clear();
    this.logger.info('FrameworkDetector', 'Caches cleared');
  }
}