import { FrameworkDetector, ProjectInfo } from './interfaces/framework-detector';
import { DetectionResult } from './interfaces/detection-result';
import { CIPipeline } from './interfaces/ci-pipeline';
import { DetectionEngine } from './detection-engine';
import { DetectionError, DetectionFailureError } from './errors/detection-errors';
import { ErrorRecovery } from './errors/error-recovery';
import { DetectionLogger, getLogger, timeOperation } from './utils/logger';

/**
 * Main framework detection implementation
 */
export class FrameworkDetectorImpl implements FrameworkDetector {
  private detectionEngine: DetectionEngine;
  private logger: DetectionLogger;

  constructor() {
    this.detectionEngine = new DetectionEngine();
    this.logger = getLogger();
  }

  /**
   * Detect frameworks and build tools from project information
   */
  async detectFrameworks(projectInfo: ProjectInfo, projectPath?: string): Promise<DetectionResult> {
    return await timeOperation(
      this.logger,
      'FrameworkDetector',
      'detectFrameworks',
      async () => {
        this.logger.info('FrameworkDetector', 'Starting framework detection', {
          languages: projectInfo.languages,
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

        if (!detectionResult.success) {
          this.logger.error('FrameworkDetector', 'Framework detection failed', detectionResult.error);
          throw new DetectionFailureError(
            `Framework detection failed: ${detectionResult.error.message}`,
            'FrameworkDetector',
            { 
              originalError: detectionResult.error.message,
              projectInfo: {
                languages: projectInfo.languages,
                configFiles: projectInfo.configFiles?.length || 0
              }
            }
          );
        }

        const result = detectionResult.data;
        const executionTime = Date.now() - Date.now(); // Will be set by timeOperation

        this.logger.info('FrameworkDetector', 'Framework detection completed successfully', {
          frameworksDetected: result.frameworks.length,
          buildToolsDetected: result.buildTools.length,
          overallConfidence: result.confidence.score,
          warningsCount: result.warnings.length
        });

        return {
          ...result,
          detectedAt: new Date(),
          executionTime: 0 // Will be overridden by timeOperation
        };
      },
      {
        languages: projectInfo.languages,
        configFiles: projectInfo.configFiles?.length || 0
      }
    );
  }

  /**
   * Generate CI/CD pipeline steps based on detection results
   */
  async suggestCISteps(detectionResult: DetectionResult): Promise<CIPipeline> {
    return await timeOperation(
      this.logger,
      'FrameworkDetector',
      'suggestCISteps',
      async () => {
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

        if (!pipelineResult.success) {
          this.logger.error('FrameworkDetector', 'CI step generation failed', pipelineResult.error);
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

        this.logger.info('FrameworkDetector', 'CI step generation completed', {
          setupSteps: pipelineResult.data.setup.length,
          buildSteps: pipelineResult.data.build.length,
          testSteps: pipelineResult.data.test.length,
          deploySteps: pipelineResult.data.deploy.length
        });

        return pipelineResult.data;
      },
      {
        frameworksCount: detectionResult.frameworks.length,
        buildToolsCount: detectionResult.buildTools.length
      }
    );
  }
}