import { DetectionResult } from '../interfaces/detection-result';
import { FrameworkInfo } from '../interfaces/framework-info';
import { LanguageDetectionResult } from '../interfaces/language-analyzer';

/**
 * Result aggregation utilities for combining analyzer outputs
 */
export class ResultAggregator {
  /**
   * Merge results from multiple language analyzers
   */
  mergeAnalyzerResults(results: LanguageDetectionResult[]): Partial<DetectionResult> {
    const allFrameworks: FrameworkInfo[] = [];
    const allBuildTools: any[] = [];
    const allWarnings: string[] = [];
    
    // Combine all results
    results.forEach(result => {
      allFrameworks.push(...(result.frameworks || []));
      allBuildTools.push(...(result.buildTools || []));
      allWarnings.push(...(result.metadata?.warnings || []));
    });
    
    // Remove duplicates and resolve conflicts
    const uniqueFrameworks = this.deduplicateFrameworks(allFrameworks);
    const uniqueBuildTools = this.deduplicateBuildTools(allBuildTools);
    
    return {
      frameworks: uniqueFrameworks,
      buildTools: uniqueBuildTools,
      warnings: this.createWarningsFromConflicts(allFrameworks, uniqueFrameworks)
    };
  }

  /**
   * Remove duplicate frameworks and resolve conflicts
   */
  private deduplicateFrameworks(frameworks: FrameworkInfo[]): FrameworkInfo[] {
    const frameworkMap = new Map<string, FrameworkInfo>();
    
    frameworks.forEach(framework => {
      const key = `${framework.name}-${framework.ecosystem}`;
      const existing = frameworkMap.get(key);
      
      if (!existing || framework.confidence > existing.confidence) {
        frameworkMap.set(key, framework);
      }
    });
    
    return Array.from(frameworkMap.values());
  }

  /**
   * Remove duplicate build tools
   */
  private deduplicateBuildTools(buildTools: any[]): any[] {
    const toolMap = new Map<string, any>();
    
    buildTools.forEach(tool => {
      const existing = toolMap.get(tool.name);
      
      if (!existing || tool.confidence > existing.confidence) {
        toolMap.set(tool.name, tool);
      }
    });
    
    return Array.from(toolMap.values());
  }

  /**
   * Create warnings from framework conflicts
   */
  private createWarningsFromConflicts(original: FrameworkInfo[], deduplicated: FrameworkInfo[]): any[] {
    const warnings: any[] = [];
    
    if (original.length > deduplicated.length) {
      const conflictCount = original.length - deduplicated.length;
      warnings.push({
        type: 'conflict',
        message: `${conflictCount} framework conflicts resolved by confidence score`,
        affected: ['frameworks'],
        resolution: 'Review detection results and verify framework choices'
      });
    }
    
    return warnings;
  }

  /**
   * Calculate aggregated confidence score
   */
  calculateAggregatedConfidence(results: LanguageDetectionResult[]): number {
    if (results.length === 0) return 0;
    
    const totalConfidence = results.reduce((sum, result) => sum + result.confidence, 0);
    return totalConfidence / results.length;
  }

  /**
   * Combine recommendations from multiple analyzers
   */
  combineRecommendations(results: LanguageDetectionResult[]): string[] {
    const allRecommendations = results.flatMap(result => result.recommendations);
    return Array.from(new Set(allRecommendations)); // Remove duplicates
  }
}