import { FrameworkDetector, ProjectInfo } from './interfaces/framework-detector';
import { DetectionResult } from './interfaces/detection-result';
import { CIPipeline } from './interfaces/ci-pipeline';
import { DetectionEngine } from './detection-engine';

/**
 * Main framework detection implementation
 */
export class FrameworkDetectorImpl implements FrameworkDetector {
  private detectionEngine: DetectionEngine;

  constructor() {
    this.detectionEngine = new DetectionEngine();
  }

  /**
   * Detect frameworks and build tools from project information
   */
  async detectFrameworks(projectInfo: ProjectInfo, projectPath?: string): Promise<DetectionResult> {
    const startTime = Date.now();
    
    try {
      const result = await this.detectionEngine.analyze(projectInfo, projectPath);
      
      return {
        ...result,
        detectedAt: new Date(),
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      throw new Error(`Framework detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate CI/CD pipeline steps based on detection results
   */
  async suggestCISteps(detectionResult: DetectionResult): Promise<CIPipeline> {
    try {
      return await this.detectionEngine.generateCIPipeline(detectionResult);
    } catch (error) {
      throw new Error(`CI step generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}