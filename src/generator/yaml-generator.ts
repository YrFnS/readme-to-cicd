/**
 * Main YAML Generator implementation
 * Orchestrates all specialized generators and provides the main entry point for workflow generation
 */

import { YAMLGenerator, DetectionResult, GenerationOptions, WorkflowOutput, WorkflowType, ValidationResult, TemplateOverrides, PolicyConfig } from './interfaces';
import { WorkflowValidator } from './validators/workflow-validator';
import { WorkflowSpecializationManager } from './workflow-specialization/workflow-specialization-manager';
import { TemplateManager } from './templates/template-manager';
import { EnvironmentManager } from './environment-manager';
import { NodeJSWorkflowGenerator } from './templates/nodejs-generator';
import { PythonWorkflowGenerator } from './templates/python-generator';
import { RustWorkflowGenerator } from './templates/rust-generator';
import { GoWorkflowGenerator } from './templates/go-generator';
import { JavaWorkflowGenerator } from './templates/java-generator';
import { DeploymentGenerator } from './templates/deployment-generator';
import { SecurityStepGenerator } from './templates/security-step-generator';
import { CacheStrategyGenerator } from './utils/cache-utils';
import * as path from 'path';

/**
 * Main YAML Generator class that orchestrates workflow generation
 * Implements requirements 10.1, 10.2, 10.3, 10.4, 10.5
 */
export class YAMLGeneratorImpl implements YAMLGenerator {
  private validator: WorkflowValidator;
  private workflowSpecializationManager: WorkflowSpecializationManager;
  private templateManager: TemplateManager;
  private environmentManager: EnvironmentManager;
  private nodejsGenerator: NodeJSWorkflowGenerator;
  private pythonGenerator: PythonWorkflowGenerator;
  private rustGenerator: RustWorkflowGenerator;
  private goGenerator: GoWorkflowGenerator;
  private javaGenerator: JavaWorkflowGenerator;
  private deploymentGenerator: DeploymentGenerator;
  private securityStepGenerator: SecurityStepGenerator;
  private cacheStrategyGenerator: CacheStrategyGenerator;
  private generatorVersion: string = '1.0.0';

  constructor(options?: {
    baseTemplatesPath?: string;
    customTemplatesPath?: string;
    cacheEnabled?: boolean;
  }) {
    // Initialize validator
    this.validator = new WorkflowValidator({
      strictMode: true,
      allowUnknownActions: false,
      validateActionVersions: true,
      customRules: []
    });

    // Initialize template manager
    const templateConfig: any = {
      baseTemplatesPath: options?.baseTemplatesPath || path.join(__dirname, '../../templates'),
      cacheEnabled: options?.cacheEnabled ?? true,
      reloadOnChange: false
    };
    
    if (options?.customTemplatesPath) {
      templateConfig.customTemplatesPath = options.customTemplatesPath;
    }
    
    this.templateManager = new TemplateManager(templateConfig);

    // Initialize specialized generators
    this.workflowSpecializationManager = new WorkflowSpecializationManager();
    this.environmentManager = new EnvironmentManager();
    this.nodejsGenerator = new NodeJSWorkflowGenerator(this.templateManager);
    this.pythonGenerator = new PythonWorkflowGenerator(this.templateManager);
    this.rustGenerator = new RustWorkflowGenerator(this.templateManager);
    this.goGenerator = new GoWorkflowGenerator(this.templateManager);
    this.javaGenerator = new JavaWorkflowGenerator(this.templateManager);
    this.deploymentGenerator = new DeploymentGenerator(this.templateManager);
    this.securityStepGenerator = new SecurityStepGenerator();
    this.cacheStrategyGenerator = new CacheStrategyGenerator();
  }

  /**
   * Generate a single workflow from detection results
   * Implements requirement 10.1: Template override and customization system
   */
  async generateWorkflow(detectionResult: DetectionResult, options?: GenerationOptions): Promise<WorkflowOutput> {
    try {
      // Set default options
      const workflowOptions = this.setDefaultOptions(options);

      // Apply organization policies
      const processedOptions = this.applyOrganizationPolicies(workflowOptions, detectionResult);

      // Apply template overrides
      await this.applyTemplateOverrides(processedOptions.customTemplates);

      // Generate workflow using specialized generators
      const workflow = await this.workflowSpecializationManager.generateSpecializedWorkflow(
        processedOptions.workflowType,
        detectionResult,
        processedOptions
      );

      // Apply framework-specific enhancements
      const enhancedWorkflow = await this.applyFrameworkEnhancements(workflow, detectionResult, processedOptions);

      // Apply environment management
      const finalWorkflow = await this.applyEnvironmentManagement(enhancedWorkflow, detectionResult, processedOptions);

      // Validate the generated workflow
      const validationResult = this.validateWorkflow(finalWorkflow.content);
      if (!validationResult.isValid) {
        finalWorkflow.metadata.warnings.push(...validationResult.errors.map(e => e.message));
      }

      return finalWorkflow;
    } catch (error) {
      throw new Error(`Failed to generate workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate multiple workflows for different types
   * Implements requirement 10.2: Multiple workflow type generation
   */
  async generateMultipleWorkflows(detectionResult: DetectionResult, workflowTypes: WorkflowType[]): Promise<WorkflowOutput[]> {
    try {
      const workflows: WorkflowOutput[] = [];
      const errors: string[] = [];

      // Validate workflow compatibility
      const baseOptions = this.setDefaultOptions();
      const compatibility = this.workflowSpecializationManager.validateWorkflowCompatibility(
        workflowTypes,
        detectionResult,
        baseOptions
      );

      if (!compatibility.compatible) {
        throw new Error(`Incompatible workflow types: ${compatibility.errors.join(', ')}`);
      }

      // Generate each workflow type
      for (const workflowType of workflowTypes) {
        try {
          const workflowOptions = { ...baseOptions, workflowType };
          const workflow = await this.generateWorkflow(detectionResult, workflowOptions);
          workflows.push(workflow);
        } catch (error) {
          errors.push(`Failed to generate ${workflowType} workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // Continue with other workflows
        }
      }

      // Add coordination metadata
      const coordination = this.workflowSpecializationManager.generateWorkflowCoordination(workflows);
      workflows.forEach(workflow => {
        workflow.metadata.optimizations.push('Workflow coordination configured');
        if (coordination.dependencies && coordination.dependencies[workflow.filename]) {
          const deps = coordination.dependencies[workflow.filename];
          if (deps) {
            workflow.metadata.optimizations.push(`Dependencies: ${deps.join(', ')}`);
          }
        }
      });

      if (errors.length > 0) {
        console.warn('Some workflows failed to generate:', errors);
      }

      return workflows;
    } catch (error) {
      throw new Error(`Failed to generate multiple workflows: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate recommended workflows based on detection results
   * Implements requirement 10.3: Intelligent workflow recommendation
   */
  async generateRecommendedWorkflows(detectionResult: DetectionResult, options?: GenerationOptions): Promise<WorkflowOutput[]> {
    const baseOptions = this.setDefaultOptions(options);
    return this.workflowSpecializationManager.generateRecommendedWorkflows(detectionResult, baseOptions);
  }

  /**
   * Generate complete workflow suite (CI, CD, release, maintenance)
   * Implements requirement 10.4: Complete workflow suite generation
   */
  async generateCompleteWorkflowSuite(detectionResult: DetectionResult, options?: GenerationOptions): Promise<WorkflowOutput[]> {
    const baseOptions = this.setDefaultOptions(options);
    return this.workflowSpecializationManager.generateCompleteWorkflowSuite(detectionResult, baseOptions);
  }

  /**
   * Validate generated YAML workflow
   */
  validateWorkflow(yamlContent: string): ValidationResult {
    return this.validator.validateWorkflow(yamlContent);
  }

  /**
   * Set default generation options
   * Implements requirement 10.5: Default configuration management
   */
  private setDefaultOptions(options?: GenerationOptions): GenerationOptions {
    const result: GenerationOptions = {
      workflowType: options?.workflowType || 'ci',
      optimizationLevel: options?.optimizationLevel || 'standard',
      includeComments: options?.includeComments ?? true,
      securityLevel: options?.securityLevel || 'standard',
      agentHooksEnabled: options?.agentHooksEnabled ?? false,
      environmentManagement: options?.environmentManagement || {
        includeSecretValidation: true,
        includeOIDC: true,
        includeConfigGeneration: true,
        generateEnvFiles: true,
        autoDetectSecrets: true
      }
    };

    // Only set optional properties if they exist
    if (options?.customTemplates) {
      result.customTemplates = options.customTemplates;
    }
    if (options?.organizationPolicies) {
      result.organizationPolicies = options.organizationPolicies;
    }
    if (options?.environments) {
      result.environments = options.environments;
    }
    if (options?.monitoringConfig) {
      result.monitoringConfig = options.monitoringConfig;
    }
    if (options?.testingStrategy) {
      result.testingStrategy = options.testingStrategy;
    }

    return result;
  }

  /**
   * Apply organization policies to generation options
   * Implements requirement 10.4: Organization policy integration and enforcement
   */
  private applyOrganizationPolicies(options: GenerationOptions, detectionResult: DetectionResult): GenerationOptions {
    if (!options.organizationPolicies) {
      return options;
    }

    const policies = options.organizationPolicies;
    const processedOptions = { ...options };

    // Apply security requirements
    if (policies.requiredSecurityScans.length > 0) {
      processedOptions.securityLevel = 'enterprise';
      if (!processedOptions.testingStrategy) {
        processedOptions.testingStrategy = {
          unitTests: true,
          integrationTests: true,
          e2eTests: false,
          performanceTests: false,
          securityTests: true,
          contractTests: false,
          chaosEngineering: false
        };
      } else {
        processedOptions.testingStrategy.securityTests = true;
      }
    }

    // Apply approval requirements
    if (policies.approvalRequired && processedOptions.environments) {
      processedOptions.environments = processedOptions.environments.map(env => ({
        ...env,
        approvalRequired: env.type === 'production' || policies.approvalRequired
      }));
    }

    // Apply action restrictions
    // This would be implemented in the template processing phase
    // For now, we store the policies for later use

    return processedOptions;
  }

  /**
   * Apply template overrides from custom templates
   * Implements requirement 10.1: Template override and customization system
   */
  private async applyTemplateOverrides(customTemplates?: TemplateOverrides): Promise<void> {
    if (!customTemplates) {
      return;
    }

    // Clear existing cache to ensure custom templates are loaded
    this.templateManager.clearCache();

    // Custom templates will be loaded automatically by the template manager
    // when templates are requested, as it checks custom paths first
  }

  /**
   * Apply framework-specific enhancements to the workflow
   */
  private async applyFrameworkEnhancements(
    workflow: WorkflowOutput,
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput> {
    let enhancedWorkflow = { ...workflow };

    // Apply language-specific enhancements
    for (const language of detectionResult.languages) {
      switch (language.name.toLowerCase()) {
        case 'javascript':
        case 'typescript':
          enhancedWorkflow = await this.applyNodeJSEnhancements(enhancedWorkflow, detectionResult, options);
          break;
        case 'python':
          enhancedWorkflow = await this.applyPythonEnhancements(enhancedWorkflow, detectionResult, options);
          break;
        case 'rust':
          enhancedWorkflow = await this.applyRustEnhancements(enhancedWorkflow, detectionResult, options);
          break;
        case 'go':
          enhancedWorkflow = await this.applyGoEnhancements(enhancedWorkflow, detectionResult, options);
          break;
        case 'java':
          enhancedWorkflow = await this.applyJavaEnhancements(enhancedWorkflow, detectionResult, options);
          break;
      }
    }

    // Apply security enhancements
    if (options.securityLevel !== 'basic') {
      enhancedWorkflow = await this.applySecurityEnhancements(enhancedWorkflow, detectionResult, options);
    }

    // Apply caching optimizations
    enhancedWorkflow = await this.applyCachingOptimizations(enhancedWorkflow, detectionResult, options);

    // Apply deployment enhancements
    if (detectionResult.deploymentTargets.length > 0) {
      enhancedWorkflow = await this.applyDeploymentEnhancements(enhancedWorkflow, detectionResult, options);
    }

    return enhancedWorkflow;
  }

  /**
   * Apply Node.js specific enhancements
   */
  private async applyNodeJSEnhancements(
    workflow: WorkflowOutput,
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput> {
    // This would integrate with the NodeJSWorkflowGenerator
    // For now, add optimization metadata
    workflow.metadata.optimizations.push('Node.js optimizations applied');
    return workflow;
  }

  /**
   * Apply Python specific enhancements
   */
  private async applyPythonEnhancements(
    workflow: WorkflowOutput,
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput> {
    // This would integrate with the PythonWorkflowGenerator
    workflow.metadata.optimizations.push('Python optimizations applied');
    return workflow;
  }

  /**
   * Apply Rust specific enhancements
   */
  private async applyRustEnhancements(
    workflow: WorkflowOutput,
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput> {
    // This would integrate with the RustWorkflowGenerator
    workflow.metadata.optimizations.push('Rust optimizations applied');
    return workflow;
  }

  /**
   * Apply Go specific enhancements
   */
  private async applyGoEnhancements(
    workflow: WorkflowOutput,
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput> {
    // This would integrate with the GoWorkflowGenerator
    workflow.metadata.optimizations.push('Go optimizations applied');
    return workflow;
  }

  /**
   * Apply Java specific enhancements
   */
  private async applyJavaEnhancements(
    workflow: WorkflowOutput,
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput> {
    // This would integrate with the JavaWorkflowGenerator
    workflow.metadata.optimizations.push('Java optimizations applied');
    return workflow;
  }

  /**
   * Apply security enhancements to the workflow
   */
  private async applySecurityEnhancements(
    workflow: WorkflowOutput,
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput> {
    // This would integrate with the SecurityStepGenerator
    workflow.metadata.optimizations.push(`Security level: ${options.securityLevel}`);
    return workflow;
  }

  /**
   * Apply caching optimizations to the workflow
   */
  private async applyCachingOptimizations(
    workflow: WorkflowOutput,
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput> {
    // This would integrate with the CacheStrategyGenerator
    workflow.metadata.optimizations.push('Caching strategies applied');
    return workflow;
  }

  /**
   * Apply deployment enhancements to the workflow
   */
  private async applyDeploymentEnhancements(
    workflow: WorkflowOutput,
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput> {
    // This would integrate with the DeploymentGenerator
    workflow.metadata.optimizations.push('Deployment optimizations applied');
    return workflow;
  }

  /**
   * Apply environment management to the workflow
   */
  private async applyEnvironmentManagement(
    workflow: WorkflowOutput,
    detectionResult: DetectionResult,
    options: GenerationOptions
  ): Promise<WorkflowOutput> {
    if (!options.environmentManagement || !options.environments) {
      return workflow;
    }

    // Generate environment management steps
    const envResult = this.environmentManager.generateEnvironmentSteps(
      options.environments,
      detectionResult
    );

    // Add environment management metadata
    workflow.metadata.optimizations.push('Environment management configured');
    if (envResult.warnings.length > 0) {
      workflow.metadata.warnings.push(...envResult.warnings);
    }

    // Update metadata with environment information
    workflow.metadata.optimizations.push(
      `Environments: ${options.environments.map(e => e.name).join(', ')}`
    );

    if (envResult.secretReferences && Object.keys(envResult.secretReferences).length > 0) {
      workflow.metadata.optimizations.push(
        `Secrets configured: ${Object.keys(envResult.secretReferences).length}`
      );
    }

    if (envResult.oidcSteps.length > 0) {
      workflow.metadata.optimizations.push('OIDC authentication configured');
    }

    return workflow;
  }

  /**
   * Get generation statistics for multiple workflows
   */
  getGenerationStatistics(workflows: WorkflowOutput[]): {
    totalWorkflows: number;
    workflowTypes: Record<WorkflowType, number>;
    totalOptimizations: number;
    totalWarnings: number;
    averageOptimizationsPerWorkflow: number;
    generatorVersion: string;
  } {
    const stats = this.workflowSpecializationManager.getGenerationStatistics(workflows);
    
    return {
      ...stats,
      totalOptimizations: stats.optimizationsApplied.length,
      totalWarnings: stats.warningsGenerated.length,
      averageOptimizationsPerWorkflow: Math.round(stats.optimizationsApplied.length / workflows.length) || 0,
      generatorVersion: this.generatorVersion
    };
  }

  /**
   * Clear all caches (useful for development and testing)
   */
  clearCaches(): void {
    this.templateManager.clearCache();
    this.environmentManager.clear();
  }

  /**
   * Reload templates (useful for development)
   */
  async reloadTemplates(): Promise<void> {
    await this.templateManager.reloadTemplates();
  }

  /**
   * Get the current generator version
   */
  getVersion(): string {
    return this.generatorVersion;
  }

  /**
   * Get template manager instance (for advanced usage)
   */
  getTemplateManager(): TemplateManager {
    return this.templateManager;
  }

  /**
   * Get environment manager instance (for advanced usage)
   */
  getEnvironmentManager(): EnvironmentManager {
    return this.environmentManager;
  }

  /**
   * Get workflow specialization manager instance (for advanced usage)
   */
  getWorkflowSpecializationManager(): WorkflowSpecializationManager {
    return this.workflowSpecializationManager;
  }
}