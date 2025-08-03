/**
 * Integration layer between README Parser and Framework Detection
 * 
 * This module provides utilities to convert README Parser output to Framework Detection input,
 * ensuring seamless data flow between components.
 */

import { ProjectInfo as ReadmeProjectInfo } from '../../parser/types/index';
import { ProjectInfo as DetectionProjectInfo } from '../interfaces/framework-detector';
import { DetectionResult } from '../interfaces/detection-result';
import { FrameworkDetectorImpl } from '../framework-detector';
import { ReadmeParserImpl } from '../../parser/readme-parser';
import { DetectionLogger, getLogger } from '../utils/logger';

/**
 * Integration configuration options
 */
export interface IntegrationConfig {
  /** Enable detailed logging */
  enableLogging?: boolean;
  /** Timeout for detection operations (ms) */
  detectionTimeout?: number;
  /** Enable file system analysis when project path is available */
  enableFileSystemAnalysis?: boolean;
  /** Maximum number of retry attempts for failed operations */
  maxRetries?: number;
}

/**
 * Enhanced detection result with success indicator
 */
export interface EnhancedDetectionResult extends DetectionResult {
  /** Whether the detection was successful */
  success: boolean;
}

/**
 * Integration result with metadata
 */
export interface IntegrationResult {
  /** Detection results with success indicator */
  detectionResult: EnhancedDetectionResult;
  /** Integration metadata */
  metadata: IntegrationMetadata;
  /** Performance metrics */
  performance: PerformanceMetrics;
}

/**
 * Integration execution metadata
 */
export interface IntegrationMetadata {
  /** README parsing time (ms) */
  parsingTime: number;
  /** Framework detection time (ms) */
  detectionTime: number;
  /** Total integration time (ms) */
  totalTime: number;
  /** Data conversion success */
  conversionSuccess: boolean;
  /** Number of analyzers executed */
  analyzersExecuted: number;
  /** Integration warnings */
  warnings: string[];
}

/**
 * Performance metrics for integration
 */
export interface PerformanceMetrics {
  /** Memory usage before integration (MB) */
  memoryBefore: number;
  /** Memory usage after integration (MB) */
  memoryAfter: number;
  /** Peak memory usage during integration (MB) */
  peakMemory: number;
  /** CPU time used (ms) */
  cpuTime: number;
}

/**
 * Main integration class for README Parser and Framework Detection
 */
export class ReadmeParserIntegration {
  private readmeParser: ReadmeParserImpl;
  private frameworkDetector: FrameworkDetectorImpl;
  private logger: DetectionLogger;
  private config: IntegrationConfig;

  constructor(config: IntegrationConfig = {}) {
    this.config = {
      enableLogging: true,
      detectionTimeout: 30000, // 30 seconds
      enableFileSystemAnalysis: true,
      maxRetries: 2,
      ...config
    };

    this.readmeParser = new ReadmeParserImpl({
      enableCaching: true,
      enablePerformanceMonitoring: true,
      useIntegrationPipeline: true
    });
    
    this.frameworkDetector = new FrameworkDetectorImpl();
    this.logger = getLogger();
  }

  /**
   * Complete integration workflow: parse README and detect frameworks
   */
  async processReadmeFile(
    readmeFilePath: string, 
    projectPath?: string
  ): Promise<IntegrationResult> {
    const startTime = Date.now();
    const memoryBefore = this.getMemoryUsage();
    let peakMemory = memoryBefore;
    
    const metadata: IntegrationMetadata = {
      parsingTime: 0,
      detectionTime: 0,
      totalTime: 0,
      conversionSuccess: false,
      analyzersExecuted: 0,
      warnings: []
    };

    try {
      this.logger.info('ReadmeParserIntegration', 'Starting README processing', {
        readmeFile: readmeFilePath,
        projectPath: projectPath || '[NOT_PROVIDED]'
      });

      // Step 1: Parse README file
      const parseStartTime = Date.now();
      const parseResult = await this.readmeParser.parseFile(readmeFilePath);
      metadata.parsingTime = Date.now() - parseStartTime;

      // Update peak memory
      const memoryAfterParsing = this.getMemoryUsage();
      peakMemory = Math.max(peakMemory, memoryAfterParsing);

      if (!parseResult.success || !parseResult.data) {
        throw new Error(`README parsing failed: ${parseResult.errors?.[0]?.message || 'Unknown error'}`);
      }

      this.logger.info('ReadmeParserIntegration', 'README parsing completed', {
        parsingTime: metadata.parsingTime,
        languagesFound: parseResult.data.languages.length,
        dependenciesFound: parseResult.data.dependencies.packages.length
      });

      // Read the raw README content for framework detection
      let rawReadmeContent = '';
      try {
        const fs = await import('fs/promises');
        rawReadmeContent = await fs.readFile(readmeFilePath, 'utf-8');
      } catch (error) {
        this.logger.warn('ReadmeParserIntegration', 'Failed to read raw README content', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Step 2: Convert README Parser output to Framework Detection input
      const detectionProjectInfo = this.convertProjectInfo(parseResult.data, rawReadmeContent);
      metadata.conversionSuccess = true;

      this.logger.debug('ReadmeParserIntegration', 'Data conversion completed', {
        originalLanguages: parseResult.data.languages.length,
        convertedLanguages: detectionProjectInfo.languages.length,
        originalDependencies: parseResult.data.dependencies.packages.length,
        convertedDependencies: detectionProjectInfo.dependencies.length
      });

      // Step 3: Detect frameworks
      const detectionStartTime = Date.now();
      const detectionResult = await this.frameworkDetector.detectFrameworks(
        detectionProjectInfo, 
        this.config.enableFileSystemAnalysis ? projectPath : undefined
      );
      metadata.detectionTime = Date.now() - detectionStartTime;

      // Update peak memory
      const memoryAfterDetection = this.getMemoryUsage();
      peakMemory = Math.max(peakMemory, memoryAfterDetection);

      metadata.analyzersExecuted = detectionResult.frameworks.length + detectionResult.buildTools.length;

      this.logger.info('ReadmeParserIntegration', 'Framework detection completed', {
        detectionTime: metadata.detectionTime,
        frameworksDetected: detectionResult.frameworks.length,
        buildToolsDetected: detectionResult.buildTools.length,
        overallConfidence: detectionResult.confidence.score
      });

      // Collect warnings from both parsing and detection
      if (parseResult.warnings) {
        metadata.warnings.push(...parseResult.warnings);
      }
      if (detectionResult.warnings) {
        metadata.warnings.push(...detectionResult.warnings.map(w => w.message));
      }

      // Calculate final metrics
      const totalTime = Date.now() - startTime;
      const memoryAfter = this.getMemoryUsage();

      metadata.totalTime = totalTime;

      const performance: PerformanceMetrics = {
        memoryBefore,
        memoryAfter,
        peakMemory,
        cpuTime: totalTime // Approximation
      };

      this.logger.info('ReadmeParserIntegration', 'Integration completed successfully', {
        totalTime: metadata.totalTime,
        parsingTime: metadata.parsingTime,
        detectionTime: metadata.detectionTime,
        memoryUsed: memoryAfter - memoryBefore,
        warningsCount: metadata.warnings.length
      });

      // Create enhanced detection result with success indicator
      const enhancedDetectionResult: EnhancedDetectionResult = {
        ...detectionResult,
        success: true
      };

      return {
        detectionResult: enhancedDetectionResult,
        metadata,
        performance
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('ReadmeParserIntegration', 'Integration failed', error as Error);

      metadata.totalTime = Date.now() - startTime;
      metadata.warnings.push(`Integration failed: ${errorMessage}`);

      // Return error result with success indicator
      const errorDetectionResult: EnhancedDetectionResult = {
        frameworks: [],
        buildTools: [],
        containers: [],
        confidence: { 
          score: 0, 
          level: 'none', 
          breakdown: {
            frameworks: { score: 0, detectedCount: 0, evidenceQuality: { strongEvidence: 0, mediumEvidence: 0, weakEvidence: 0, diversityScore: 0 }, factors: [] },
            buildTools: { score: 0, detectedCount: 0, evidenceQuality: { strongEvidence: 0, mediumEvidence: 0, weakEvidence: 0, diversityScore: 0 }, factors: [] },
            containers: { score: 0, detectedCount: 0, evidenceQuality: { strongEvidence: 0, mediumEvidence: 0, weakEvidence: 0, diversityScore: 0 }, factors: [] },
            languages: { score: 0, detectedCount: 0, evidenceQuality: { strongEvidence: 0, mediumEvidence: 0, weakEvidence: 0, diversityScore: 0 }, factors: [] }
          },
          factors: [],
          recommendations: []
        },
        alternatives: [],
        warnings: [{
          type: 'incomplete',
          message: `Integration failed: ${errorMessage}`,
          affected: ['frameworks', 'buildTools']
        }],
        detectedAt: new Date(),
        executionTime: metadata.totalTime,
        success: false
      };

      return {
        detectionResult: errorDetectionResult,
        metadata,
        performance: {
          memoryBefore,
          memoryAfter: this.getMemoryUsage(),
          peakMemory,
          cpuTime: metadata.totalTime
        }
      };
    }
  }

  /**
   * Process README content directly (without file system access)
   */
  async processReadmeContent(
    readmeContent: string,
    projectPath?: string
  ): Promise<IntegrationResult> {
    const startTime = Date.now();
    const memoryBefore = this.getMemoryUsage();
    let peakMemory = memoryBefore;
    
    const metadata: IntegrationMetadata = {
      parsingTime: 0,
      detectionTime: 0,
      totalTime: 0,
      conversionSuccess: false,
      analyzersExecuted: 0,
      warnings: []
    };

    try {
      this.logger.info('ReadmeParserIntegration', 'Starting README content processing', {
        contentLength: readmeContent.length,
        projectPath: projectPath || '[NOT_PROVIDED]'
      });

      // Step 1: Parse README content
      const parseStartTime = Date.now();
      const parseResult = await this.readmeParser.parseContent(readmeContent);
      metadata.parsingTime = Date.now() - parseStartTime;

      const memoryAfterParsing = this.getMemoryUsage();
      peakMemory = Math.max(peakMemory, memoryAfterParsing);

      if (!parseResult.success || !parseResult.data) {
        throw new Error(`README parsing failed: ${parseResult.errors?.[0]?.message || 'Unknown error'}`);
      }

      // Step 2: Convert and detect (same as file processing)
      const detectionProjectInfo = this.convertProjectInfo(parseResult.data, readmeContent);
      metadata.conversionSuccess = true;

      const detectionStartTime = Date.now();
      const detectionResult = await this.frameworkDetector.detectFrameworks(
        detectionProjectInfo, 
        this.config.enableFileSystemAnalysis ? projectPath : undefined
      );
      metadata.detectionTime = Date.now() - detectionStartTime;

      const memoryAfterDetection = this.getMemoryUsage();
      peakMemory = Math.max(peakMemory, memoryAfterDetection);

      metadata.analyzersExecuted = detectionResult.frameworks.length + detectionResult.buildTools.length;
      metadata.totalTime = Date.now() - startTime;

      // Collect warnings
      if (parseResult.warnings) {
        metadata.warnings.push(...parseResult.warnings);
      }
      if (detectionResult.warnings) {
        metadata.warnings.push(...detectionResult.warnings.map(w => w.message));
      }

      const performance: PerformanceMetrics = {
        memoryBefore,
        memoryAfter: this.getMemoryUsage(),
        peakMemory,
        cpuTime: metadata.totalTime
      };

      this.logger.info('ReadmeParserIntegration', 'Content processing completed successfully', {
        totalTime: metadata.totalTime,
        frameworksDetected: detectionResult.frameworks.length,
        confidence: detectionResult.confidence.score
      });

      // Create enhanced detection result with success indicator
      const enhancedDetectionResult: EnhancedDetectionResult = {
        ...detectionResult,
        success: true
      };

      return {
        detectionResult: enhancedDetectionResult,
        metadata,
        performance
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('ReadmeParserIntegration', 'Content processing failed', error as Error);

      metadata.totalTime = Date.now() - startTime;
      metadata.warnings.push(`Processing failed: ${errorMessage}`);

      const errorDetectionResult: EnhancedDetectionResult = {
        frameworks: [],
        buildTools: [],
        containers: [],
        confidence: { 
          score: 0, 
          level: 'none', 
          breakdown: {
            frameworks: { score: 0, detectedCount: 0, evidenceQuality: { strongEvidence: 0, mediumEvidence: 0, weakEvidence: 0, diversityScore: 0 }, factors: [] },
            buildTools: { score: 0, detectedCount: 0, evidenceQuality: { strongEvidence: 0, mediumEvidence: 0, weakEvidence: 0, diversityScore: 0 }, factors: [] },
            containers: { score: 0, detectedCount: 0, evidenceQuality: { strongEvidence: 0, mediumEvidence: 0, weakEvidence: 0, diversityScore: 0 }, factors: [] },
            languages: { score: 0, detectedCount: 0, evidenceQuality: { strongEvidence: 0, mediumEvidence: 0, weakEvidence: 0, diversityScore: 0 }, factors: [] }
          },
          factors: [],
          recommendations: []
        },
        alternatives: [],
        warnings: [{
          type: 'incomplete',
          message: `Processing failed: ${errorMessage}`,
          affected: ['frameworks', 'buildTools']
        }],
        detectedAt: new Date(),
        executionTime: metadata.totalTime,
        success: false
      };

      return {
        detectionResult: errorDetectionResult,
        metadata,
        performance: {
          memoryBefore,
          memoryAfter: this.getMemoryUsage(),
          peakMemory,
          cpuTime: metadata.totalTime
        }
      };
    }
  }

  /**
   * Convert README Parser ProjectInfo to Framework Detection ProjectInfo
   */
  private convertProjectInfo(readmeProjectInfo: ReadmeProjectInfo, rawContent?: string): DetectionProjectInfo {
    this.logger.debug('ReadmeParserIntegration', 'Converting project info', {
      inputLanguages: readmeProjectInfo.languages.length,
      inputDependencies: readmeProjectInfo.dependencies.packages.length,
      inputCommands: {
        install: readmeProjectInfo.commands.install.length,
        build: readmeProjectInfo.commands.build.length,
        test: readmeProjectInfo.commands.test.length
      }
    });

    // Extract language names from language objects
    const languages = readmeProjectInfo.languages.map(lang => 
      typeof lang === 'string' ? lang : lang.name
    );

    // Extract dependencies from various sources
    const dependencies = [
      ...readmeProjectInfo.dependencies.packages.map(pkg => 
        typeof pkg === 'string' ? pkg : pkg.name
      ),
      ...readmeProjectInfo.dependencies.dependencies.map(dep =>
        typeof dep === 'string' ? dep : dep.name
      ),
      ...readmeProjectInfo.dependencies.devDependencies.map(dep =>
        typeof dep === 'string' ? dep : dep.name
      )
    ];

    // Extract commands from command categories
    const buildCommands = [
      ...readmeProjectInfo.commands.build.map(cmd => 
        typeof cmd === 'string' ? cmd : cmd.command
      ),
      ...readmeProjectInfo.commands.run.map(cmd => 
        typeof cmd === 'string' ? cmd : cmd.command
      )
    ];

    const testCommands = readmeProjectInfo.commands.test.map(cmd => 
      typeof cmd === 'string' ? cmd : cmd.command
    );

    const installationSteps = readmeProjectInfo.commands.install.map(cmd => 
      typeof cmd === 'string' ? cmd : cmd.command
    );

    // Extract config files from dependencies
    const configFiles = readmeProjectInfo.dependencies.packageFiles.map(file =>
      typeof file === 'string' ? file : file.name
    );

    const detectionProjectInfo: DetectionProjectInfo = {
      name: readmeProjectInfo.metadata.name || 'Unknown Project',
      description: readmeProjectInfo.metadata.description || '',
      languages,
      dependencies,
      buildCommands,
      testCommands,
      installationSteps,
      usageExamples: [], // README parser doesn't extract usage examples yet
      configFiles,
      deploymentInfo: [], // README parser doesn't extract deployment info yet
      rawContent: rawContent || '' // Use provided raw content or empty string
    };

    this.logger.debug('ReadmeParserIntegration', 'Conversion completed', {
      outputLanguages: detectionProjectInfo.languages.length,
      outputDependencies: detectionProjectInfo.dependencies.length,
      outputBuildCommands: detectionProjectInfo.buildCommands.length,
      outputTestCommands: detectionProjectInfo.testCommands.length,
      outputConfigFiles: detectionProjectInfo.configFiles.length
    });

    return detectionProjectInfo;
  }

  /**
   * Get current memory usage in MB
   */
  private getMemoryUsage(): number {
    const usage = process.memoryUsage();
    return Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100;
  }

  /**
   * Get integration statistics
   */
  getStatistics(): {
    readmeParserStats: any;
    frameworkDetectorStats: any;
  } {
    return {
      readmeParserStats: this.readmeParser.getPerformanceStats(),
      frameworkDetectorStats: {
        // Framework detector doesn't expose stats yet
        initialized: true
      }
    };
  }

  /**
   * Clear performance data and caches
   */
  clearCaches(): void {
    this.readmeParser.clearPerformanceData();
    this.logger.info('ReadmeParserIntegration', 'Caches cleared');
  }
}

/**
 * Create a new integration instance with default configuration
 */
export function createIntegration(config?: IntegrationConfig): ReadmeParserIntegration {
  return new ReadmeParserIntegration(config);
}

/**
 * Convenience function for quick README processing
 */
export async function processReadme(
  readmeFilePath: string,
  projectPath?: string,
  config?: IntegrationConfig
): Promise<IntegrationResult> {
  const integration = createIntegration(config);
  return await integration.processReadmeFile(readmeFilePath, projectPath);
}

/**
 * Convenience function for quick README content processing
 */
export async function processReadmeContent(
  readmeContent: string,
  projectPath?: string,
  config?: IntegrationConfig
): Promise<IntegrationResult> {
  const integration = createIntegration(config);
  return await integration.processReadmeContent(readmeContent, projectPath);
}