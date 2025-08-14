/**
 * Workflow Specialization Manager - Orchestrates specialized workflow generators
 * Coordinates CI, CD, release, and maintenance workflow generation
 */

import { DetectionResult, GenerationOptions, WorkflowOutput, WorkflowType } from '../interfaces';
import { CIWorkflowGenerator } from './ci-workflow-generator';
import { CDWorkflowGenerator } from './cd-workflow-generator';
import { ReleaseWorkflowGenerator } from './release-workflow-generator';
import { MaintenanceWorkflowGenerator } from './maintenance-workflow-generator';
import { SecurityWorkflowGenerator } from './security-workflow-generator';
import { PerformanceWorkflowGenerator } from './performance-workflow-generator';

export class WorkflowSpecializationManager {
  private ciGenerator: CIWorkflowGenerator;
  private cdGenerator: CDWorkflowGenerator;
  private releaseGenerator: ReleaseWorkflowGenerator;
  private maintenanceGenerator: MaintenanceWorkflowGenerator;
  private securityGenerator: SecurityWorkflowGenerator;
  private performanceGenerator: PerformanceWorkflowGenerator;

  constructor() {
    this.ciGenerator = new CIWorkflowGenerator();
    this.cdGenerator = new CDWorkflowGenerator();
    this.releaseGenerator = new ReleaseWorkflowGenerator();
    this.maintenanceGenerator = new MaintenanceWorkflowGenerator();
    this.securityGenerator = new SecurityWorkflowGenerator();
    this.performanceGenerator = new PerformanceWorkflowGenerator();
  }

  /**
   * Generate specialized workflow based on type
   */
  async generateSpecializedWorkflow(
    workflowType: WorkflowType,
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput> {
    // Ensure the workflow type in options matches the requested type
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
      
      case 'security':
        return this.securityGenerator.generateSecurityWorkflow(detectionResult, workflowOptions);
      
      case 'performance':
        return this.performanceGenerator.generatePerformanceWorkflow(detectionResult, workflowOptions);
      
      default:
        throw new Error(`Unsupported workflow type: ${workflowType}`);
    }
  }

  /**
   * Generate multiple specialized workflows
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
        // Continue with other workflows even if one fails
      }
    }

    return workflows;
  }

  /**
   * Generate complete workflow suite (CI, CD, release, maintenance)
   */
  async generateCompleteWorkflowSuite(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput[]> {
    const workflowTypes: WorkflowType[] = ['ci', 'cd', 'release', 'maintenance'];
    return this.generateMultipleSpecializedWorkflows(workflowTypes, detectionResult, options);
  }

  /**
   * Generate workflows based on project characteristics
   */
  async generateRecommendedWorkflows(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput[]> {
    const recommendedTypes = this.getRecommendedWorkflowTypes(detectionResult, options);
    return this.generateMultipleSpecializedWorkflows(recommendedTypes, detectionResult, options);
  }

  /**
   * Get recommended workflow types based on detection results
   */
  private getRecommendedWorkflowTypes(
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): WorkflowType[] {
    const types: WorkflowType[] = [];

    // CI is always recommended
    types.push('ci');

    // CD is recommended if deployment targets are detected
    if (detectionResult.deploymentTargets.length > 0 || options.environments) {
      types.push('cd');
    }

    // Release is recommended for libraries and packages
    if (this.isLibraryProject(detectionResult)) {
      types.push('release');
    }

    // Maintenance is always recommended for active projects
    types.push('maintenance');

    return types;
  }

  /**
   * Check if project appears to be a library/package
   */
  private isLibraryProject(detectionResult: DetectionResult): boolean {
    // Check for common library indicators
    const packageManagers = detectionResult.packageManagers.map(pm => pm.name);
    
    // Node.js libraries typically have package.json
    if (packageManagers.includes('npm') || packageManagers.includes('yarn') || packageManagers.includes('pnpm')) {
      return true;
    }

    // Python libraries typically have setup.py or pyproject.toml
    if (packageManagers.includes('pip') || packageManagers.includes('poetry')) {
      return true;
    }

    // Rust libraries have Cargo.toml
    if (packageManagers.includes('cargo')) {
      return true;
    }

    // Go modules
    if (packageManagers.includes('go')) {
      return true;
    }

    // Java libraries
    if (packageManagers.includes('maven') || packageManagers.includes('gradle')) {
      return true;
    }

    return false;
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

    // Check for maintenance without languages
    if (workflowTypes.includes('maintenance') && detectionResult.languages.length === 0) {
      warnings.push('Maintenance workflow will use generic dependency management');
    }

    // Check environment configuration for CD
    if (workflowTypes.includes('cd') && (!options.environments || options.environments.length === 0)) {
      warnings.push('CD workflow will use default staging/production environments');
    }

    return {
      compatible: errors.length === 0,
      warnings,
      errors
    };
  }

  /**
   * Get workflow generation statistics
   */
  getGenerationStatistics(workflows: WorkflowOutput[]): {
    totalWorkflows: number;
    workflowTypes: Record<WorkflowType, number>;
    totalSteps: number;
    averageStepsPerWorkflow: number;
    optimizationsApplied: string[];
    warningsGenerated: string[];
  } {
    const stats = {
      totalWorkflows: workflows.length,
      workflowTypes: {} as Record<WorkflowType, number>,
      totalSteps: 0,
      averageStepsPerWorkflow: 0,
      optimizationsApplied: [] as string[],
      warningsGenerated: [] as string[]
    };

    // Count workflow types
    workflows.forEach(workflow => {
      stats.workflowTypes[workflow.type] = (stats.workflowTypes[workflow.type] || 0) + 1;
      
      // Collect optimizations and warnings
      stats.optimizationsApplied.push(...workflow.metadata.optimizations);
      stats.warningsGenerated.push(...workflow.metadata.warnings);
    });

    // Remove duplicates
    stats.optimizationsApplied = [...new Set(stats.optimizationsApplied)];
    stats.warningsGenerated = [...new Set(stats.warningsGenerated)];

    // Calculate average steps (would need to parse workflow content for accurate count)
    stats.averageStepsPerWorkflow = Math.round(stats.totalSteps / workflows.length) || 0;

    return stats;
  }

  /**
   * Generate workflow coordination configuration
   */
  generateWorkflowCoordination(workflows: WorkflowOutput[]): {
    dependencies: Record<string, string[]>;
    triggers: Record<string, string[]>;
    sharedSecrets: string[];
    sharedVariables: string[];
  } {
    const coordination = {
      dependencies: {} as Record<string, string[]>,
      triggers: {} as Record<string, string[]>,
      sharedSecrets: [] as string[],
      sharedVariables: [] as string[]
    };

    // Define workflow dependencies
    workflows.forEach(workflow => {
      switch (workflow.type) {
        case 'cd':
          coordination.dependencies[workflow.filename] = ['ci.yml'];
          coordination.triggers[workflow.filename] = ['workflow_run'];
          break;
        
        case 'release':
          coordination.dependencies[workflow.filename] = ['ci.yml'];
          coordination.triggers[workflow.filename] = ['workflow_dispatch', 'schedule'];
          break;
        
        case 'maintenance':
          coordination.triggers[workflow.filename] = ['schedule', 'workflow_dispatch', 'repository_dispatch'];
          break;
        
        case 'ci':
          coordination.triggers[workflow.filename] = ['push', 'pull_request'];
          break;
      }
    });

    // Define shared secrets and variables
    if (workflows.some(w => w.type === 'cd' || w.type === 'release')) {
      coordination.sharedSecrets.push(
        'GITHUB_TOKEN',
        'NPM_TOKEN',
        'PYPI_TOKEN',
        'CARGO_TOKEN',
        'MAVEN_USERNAME',
        'MAVEN_PASSWORD'
      );
    }

    if (workflows.some(w => w.type === 'cd')) {
      coordination.sharedSecrets.push(
        'AWS_ROLE_ARN_STAGING',
        'AWS_ROLE_ARN_PRODUCTION',
        'AZURE_CLIENT_ID',
        'AZURE_TENANT_ID',
        'AZURE_SUBSCRIPTION_ID'
      );
      
      coordination.sharedVariables.push(
        'AWS_REGION',
        'CLOUD_PROVIDER',
        'CONTAINER_REGISTRY',
        'APP_URL_STAGING',
        'APP_URL_PRODUCTION'
      );
    }

    return coordination;
  }
}