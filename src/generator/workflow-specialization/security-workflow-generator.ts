/**
 * Security Workflow Generator
 * Generates specialized security scanning and compliance workflows
 */

import { DetectionResult, GenerationOptions, WorkflowOutput } from '../interfaces';
import { SecurityStepGenerator } from '../templates/security-step-generator';
import { YAMLRenderer } from '../renderers/yaml-renderer';
import { WorkflowTemplate } from '../types';

/**
 * Security Workflow Generator class
 */
export class SecurityWorkflowGenerator {
  private securityStepGenerator: SecurityStepGenerator;
  private yamlRenderer: YAMLRenderer;

  constructor() {
    this.securityStepGenerator = new SecurityStepGenerator();
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
   * Generate security workflow
   */
  async generateSecurityWorkflow(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput> {
    try {
      // Create basic security workflow template
      const workflowTemplate: WorkflowTemplate = {
        name: 'Security Scanning',
        type: 'security',
        triggers: {
          push: {
            branches: ['main', 'develop']
          },
          pullRequest: {
            branches: ['main', 'develop']
          },
          schedule: [
            { cron: '0 2 * * 1' } // Weekly on Monday at 2 AM
          ]
        },
        jobs: [
          {
            name: 'security-scan',
            runsOn: 'ubuntu-latest',
            steps: this.securityStepGenerator.generateSecurityJob(detectionResult, options)
          }
        ],
        permissions: {
          contents: 'read',
          securityEvents: 'write'
        }
      };

      // Render the workflow to YAML
      const renderingResult = await this.yamlRenderer.renderWorkflow(workflowTemplate);

      // Generate filename
      const filename = this.generateFilename(detectionResult);

      // Create workflow output
      const workflowOutput: WorkflowOutput = {
        filename,
        content: renderingResult.yaml,
        type: 'security',
        metadata: {
          generatedAt: new Date(),
          generatorVersion: '1.0.0',
          detectionSummary: this.createDetectionSummary(detectionResult),
          optimizations: ['Security scanning', 'Dependency vulnerability checks'],
          warnings: []
        }
      };

      return workflowOutput;
    } catch (error) {
      throw new Error(`Failed to generate security workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate filename for security workflow
   */
  private generateFilename(detectionResult: DetectionResult): string {
    const projectName = detectionResult.projectMetadata.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return `${projectName}-security.yml`;
  }

  /**
   * Create detection summary for metadata
   */
  private createDetectionSummary(detectionResult: DetectionResult): string {
    const frameworks = detectionResult.frameworks.map(f => f.name).join(', ');
    const languages = detectionResult.languages.filter(l => l.primary).map(l => l.name).join(', ');
    
    return `Security scanning workflow for ${languages} project with ${frameworks}`;
  }
}