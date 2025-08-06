/**
 * Main YAML Generator implementation
 */

import { YAMLGenerator, DetectionResult, GenerationOptions, WorkflowOutput, WorkflowType, ValidationResult } from './interfaces';
import { WorkflowValidator } from './validators/workflow-validator';

/**
 * Main YAML Generator class that orchestrates workflow generation
 */
export class YAMLGeneratorImpl implements YAMLGenerator {
  private validator: WorkflowValidator;

  constructor() {
    this.validator = new WorkflowValidator({
      strictMode: true,
      allowUnknownActions: false,
      validateActionVersions: true,
      customRules: []
    });
  }

  /**
   * Generate a single workflow from detection results
   */
  async generateWorkflow(detectionResult: DetectionResult, options?: GenerationOptions): Promise<WorkflowOutput> {
    // Implementation will be added in subsequent tasks
    throw new Error('Not implemented yet - will be implemented in task 5+');
  }

  /**
   * Generate multiple workflows for different types
   */
  async generateMultipleWorkflows(detectionResult: DetectionResult, workflowTypes: WorkflowType[]): Promise<WorkflowOutput[]> {
    // Implementation will be added in subsequent tasks
    throw new Error('Not implemented yet - will be implemented in task 15');
  }

  /**
   * Validate generated YAML workflow
   */
  validateWorkflow(yamlContent: string): ValidationResult {
    return this.validator.validateWorkflow(yamlContent);
  }
}