/**
 * Performance Workflow Generator
 * Generates specialized performance monitoring and benchmarking workflows
 */

import { DetectionResult, GenerationOptions, WorkflowOutput } from '../interfaces';
import { PerformanceMonitoringGenerator } from '../templates/performance-monitoring-generator';
import { YAMLRenderer } from '../renderers/yaml-renderer';

/**
 * Performance Workflow Generator class
 */
export class PerformanceWorkflowGenerator {
  private performanceMonitoringGenerator: PerformanceMonitoringGenerator;
  private yamlRenderer: YAMLRenderer;

  constructor() {
    this.performanceMonitoringGenerator = new PerformanceMonitoringGenerator();
    this.yamlRenderer = new YAMLRenderer({
      yamlConfig: {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
        noCompatMode: false,
        condenseFlow: false,
        quotingType: 'auto',
        forceQuotes: false,
        sortKeys: false
      },
      commentConfig: {
        enabled: true,
        includeGenerationInfo: true,
        includeStepDescriptions: true,
        includeOptimizationNotes: true,
        customComments: {}
      },
      preserveComments: true,
      addBlankLines: true
    });
  }

  /**
   * Generate performance monitoring workflow
   */
  async generatePerformanceWorkflow(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput> {
    try {
      // Generate the performance monitoring workflow template
      const workflowTemplate = this.performanceMonitoringGenerator.generatePerformanceMonitoringWorkflow(
        detectionResult,
        options
      );

      // Render the workflow to YAML
      const renderingResult = await this.yamlRenderer.renderWorkflow(workflowTemplate);

      // Generate filename
      const filename = this.generateFilename(detectionResult, options);

      // Create workflow output
      const workflowOutput: WorkflowOutput = {
        filename,
        content: renderingResult.yaml,
        type: 'performance',
        metadata: {
          generatedAt: new Date(),
          generatorVersion: '1.0.0',
          detectionSummary: this.createDetectionSummary(detectionResult),
          optimizations: this.getOptimizations(detectionResult, options),
          warnings: []
        }
      };

      return workflowOutput;
    } catch (error) {
      throw new Error(`Failed to generate performance workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate filename for performance workflow
   */
  private generateFilename(detectionResult: DetectionResult, options: GenerationOptions): string {
    const projectName = detectionResult.projectMetadata.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return `${projectName}-performance.yml`;
  }

  /**
   * Create detection summary for metadata
   */
  private createDetectionSummary(detectionResult: DetectionResult): string {
    const frameworks = detectionResult.frameworks.map(f => f.name).join(', ');
    const languages = detectionResult.languages.filter(l => l.primary).map(l => l.name).join(', ');
    
    return `Performance monitoring workflow for ${languages} project with ${frameworks}`;
  }

  /**
   * Get optimizations applied to the workflow
   */
  private getOptimizations(detectionResult: DetectionResult, options: GenerationOptions): string[] {
    const optimizations: string[] = [];

    // Framework-specific optimizations
    const hasNodeJS = detectionResult.languages.some(l => 
      l.name.toLowerCase() === 'javascript' || l.name.toLowerCase() === 'typescript'
    );
    if (hasNodeJS) {
      optimizations.push('Node.js performance benchmarking with clinic and autocannon');
    }

    const hasPython = detectionResult.languages.some(l => l.name.toLowerCase() === 'python');
    if (hasPython) {
      optimizations.push('Python performance testing with pytest-benchmark');
    }

    const hasJava = detectionResult.languages.some(l => l.name.toLowerCase() === 'java');
    if (hasJava) {
      optimizations.push('Java performance testing with JMH benchmarks');
    }

    const hasGo = detectionResult.languages.some(l => l.name.toLowerCase() === 'go');
    if (hasGo) {
      optimizations.push('Go performance benchmarking with built-in testing tools');
    }

    const hasRust = detectionResult.languages.some(l => l.name.toLowerCase() === 'rust');
    if (hasRust) {
      optimizations.push('Rust performance testing with Criterion benchmarks');
    }

    // General optimizations
    optimizations.push('Automated regression detection and alerting');
    optimizations.push('Load testing with multiple scenarios');
    optimizations.push('Performance metrics collection and storage');
    optimizations.push('Dashboard reporting and visualization');

    // Optimization level specific
    switch (options.optimizationLevel) {
      case 'aggressive':
        optimizations.push('Matrix builds across multiple environments');
        optimizations.push('Advanced scaling monitoring');
        optimizations.push('Auto-revert on performance regressions');
        break;
      case 'standard':
        optimizations.push('Parallel benchmark execution');
        optimizations.push('Comprehensive metrics aggregation');
        break;
      case 'basic':
        optimizations.push('Basic performance monitoring');
        break;
    }

    return optimizations;
  }
}