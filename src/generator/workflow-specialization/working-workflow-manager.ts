/**
 * Working Workflow Specialization Manager - Uses only the generators that compile correctly
 * This is a temporary solution while we fix the template literal issues in other generators
 */

import { DetectionResult, GenerationOptions, WorkflowOutput, WorkflowType } from '../interfaces';
import { CIWorkflowGenerator } from './ci-workflow-generator';
import { CDWorkflowGenerator } from './cd-workflow-generator';
import { ReleaseWorkflowGenerator } from './release-workflow-generator';
import { MaintenanceWorkflowGenerator } from './maintenance-workflow-generator';

export class WorkingWorkflowSpecializationManager {
  private ciGenerator: CIWorkflowGenerator;
  private cdGenerator: CDWorkflowGenerator;
  private releaseGenerator: ReleaseWorkflowGenerator;
  private maintenanceGenerator: MaintenanceWorkflowGenerator;

  constructor() {
    this.ciGenerator = new CIWorkflowGenerator();
    this.cdGenerator = new CDWorkflowGenerator();
    this.releaseGenerator = new ReleaseWorkflowGenerator();
    this.maintenanceGenerator = new MaintenanceWorkflowGenerator();
  }

  /**
   * Generate specialized workflow based on type (currently only CI works)
   */
  async generateSpecializedWorkflow(
    workflowType: WorkflowType,
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput> {
    const workflowOptions = { ...options, workflowType };

    switch (workflowType) {
      case 'ci':
        return this.ciGenerator.generateCIWorkflow(detectionResult, workflowOptions);
      
      case 'cd':
        return this.cdGenerator.generateCDWorkflow(detectionResult, workflowOptions);
      
      case 'release':
        return this.releaseGenerator.generateReleaseWorkflow(detectionResult, workflowOptions);
      
      case 'maintenance':
        return this.maintenanceGenerator.generateMaintenanceWorkflow(detectionResult, workflowOptions);
      
      default:
        throw new Error(`Unsupported workflow type: ${workflowType}`);
    }
  }

  /**
   * Generate multiple specialized workflows (only CI for now)
   */
  async generateMultipleSpecializedWorkflows(
    workflowTypes: WorkflowType[],
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput[]> {
    const workflows: WorkflowOutput[] = [];

    for (const workflowType of workflowTypes) {
      try {
        const workflow = await this.generateSpecializedWorkflow(
          workflowType,
          detectionResult,
          options
        );
        workflows.push(workflow);
      } catch (error) {
        console.error(`Failed to generate ${workflowType} workflow:`, error);
      }
    }

    return workflows;
  }

  /**
   * Validate workflow compatibility
   */
  validateWorkflowCompatibility(
    workflowTypes: WorkflowType[],
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): { compatible: boolean; warnings: string[]; errors: string[] } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check for CD without CI
    if (workflowTypes.includes('cd') && !workflowTypes.includes('ci')) {
      warnings.push('CD workflow recommended with CI workflow for artifact reuse');
    }

    // Check for release without package managers
    if (workflowTypes.includes('release') && detectionResult.packageManagers.length === 0) {
      warnings.push('Release workflow may have limited functionality without detected package managers');
    }

    return {
      compatible: errors.length === 0,
      warnings,
      errors
    };
  }
}