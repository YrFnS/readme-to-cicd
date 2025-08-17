/**
 * Multi-Workflow Coordinator
 * 
 * Coordinates the generation and management of multiple workflows simultaneously.
 * Handles dependencies, shared resources, and workflow orchestration.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { 
  WorkflowType, 
  WorkflowConfiguration, 
  ExtensionConfiguration,
  CLIGenerationResult 
} from './types';
import { 
  TemplateManager, 
  MultiWorkflowConfiguration, 
  WorkflowCoordination,
  MultiWorkflowResult,
  WorkflowGenerationResult 
} from './TemplateManager';
import { CLIIntegration } from './CLIIntegration';
import { FileSystemManager } from './FileSystemManager';
import { SettingsManager } from './SettingsManager';

export interface WorkflowGenerationPlan {
  workflows: PlannedWorkflow[];
  dependencies: WorkflowDependency[];
  estimatedDuration: number;
  requiredResources: string[];
  conflicts: WorkflowConflict[];
}

export interface PlannedWorkflow {
  id: string;
  name: string;
  type: WorkflowType;
  templateId: string;
  configuration: WorkflowConfiguration;
  estimatedSize: number;
  requiredSecrets: string[];
  outputPath: string;
}

export interface WorkflowDependency {
  workflow: string;
  dependsOn: string[];
  condition?: string;
  timeout?: number;
}

export interface WorkflowConflict {
  type: 'naming' | 'resource' | 'dependency' | 'configuration';
  workflows: string[];
  description: string;
  resolution: ConflictResolution[];
}

export interface ConflictResolution {
  action: 'rename' | 'merge' | 'skip' | 'override';
  description: string;
  automatic: boolean;
}

export interface WorkflowUpdateStrategy {
  preserveCustomizations: boolean;
  backupExisting: boolean;
  mergeStrategy: 'replace' | 'merge' | 'prompt';
  customSections: string[];
}

export class MultiWorkflowCoordinator {
  private templateManager: TemplateManager;
  private cliIntegration: CLIIntegration;
  private fileSystemManager: FileSystemManager;
  private settingsManager: SettingsManager;

  constructor(
    private context: vscode.ExtensionContext,
    templateManager: TemplateManager,
    cliIntegration: CLIIntegration,
    fileSystemManager: FileSystemManager,
    settingsManager: SettingsManager
  ) {
    this.templateManager = templateManager;
    this.cliIntegration = cliIntegration;
    this.fileSystemManager = fileSystemManager;
    this.settingsManager = settingsManager;
  }

  /**
   * Plan multi-workflow generation
   */
  async planMultiWorkflowGeneration(
    workflowTypes: WorkflowType[],
    readmePath: string,
    outputDirectory: string,
    configuration?: Partial<MultiWorkflowConfiguration>
  ): Promise<WorkflowGenerationPlan> {
    try {
      // Analyze README to determine optimal workflow configuration
      const readmeAnalysis = await this.analyzeReadmeForWorkflows(readmePath);
      
      // Create workflow configurations for each type
      const workflows: PlannedWorkflow[] = [];
      const dependencies: WorkflowDependency[] = [];
      
      for (const workflowType of workflowTypes) {
        const workflowConfig = this.createWorkflowConfiguration(workflowType, readmeAnalysis);
        const templateId = await this.selectOptimalTemplate(workflowType, readmeAnalysis);
        
        const plannedWorkflow: PlannedWorkflow = {
          id: `${workflowType}-${Date.now()}`,
          name: this.generateWorkflowName(workflowType, readmeAnalysis),
          type: workflowType,
          templateId,
          configuration: workflowConfig,
          estimatedSize: await this.estimateWorkflowSize(templateId, workflowConfig),
          requiredSecrets: this.extractRequiredSecrets(workflowConfig),
          outputPath: path.join(outputDirectory, `${workflowType}.yml`)
        };
        
        workflows.push(plannedWorkflow);
      }

      // Determine workflow dependencies
      const workflowDependencies = this.calculateWorkflowDependencies(workflows);
      dependencies.push(...workflowDependencies);

      // Detect conflicts
      const conflicts = await this.detectWorkflowConflicts(workflows, outputDirectory);

      // Calculate estimated duration
      const estimatedDuration = this.calculateEstimatedDuration(workflows, dependencies);

      // Determine required resources
      const requiredResources = this.collectRequiredResources(workflows);

      return {
        workflows,
        dependencies,
        estimatedDuration,
        requiredResources,
        conflicts
      };

    } catch (error) {
      throw new Error(`Failed to plan multi-workflow generation: ${error.message}`);
    }
  }

  /**
   * Execute multi-workflow generation
   */
  async executeMultiWorkflowGeneration(
    plan: WorkflowGenerationPlan,
    readmePath: string,
    progressCallback?: (progress: number, message: string) => void
  ): Promise<MultiWorkflowResult> {
    const totalSteps = plan.workflows.length + plan.dependencies.length;
    let currentStep = 0;

    const updateProgress = (message: string) => {
      currentStep++;
      const progress = (currentStep / totalSteps) * 100;
      progressCallback?.(progress, message);
    };

    try {
      // Resolve conflicts first
      await this.resolveWorkflowConflicts(plan.conflicts);

      // Create multi-workflow configuration
      const multiConfig: MultiWorkflowConfiguration = {
        workflows: plan.workflows.map(w => w.configuration),
        coordination: {
          dependencies: plan.dependencies,
          executionOrder: this.calculateExecutionOrder(plan.workflows, plan.dependencies),
          sharedSecrets: this.extractSharedSecrets(plan.workflows),
          sharedVariables: await this.extractSharedVariables(readmePath),
          conflictResolution: 'merge'
        },
        templates: plan.workflows.map(w => w.templateId),
        customizations: await this.loadExistingCustomizations(plan.workflows)
      };

      updateProgress('Generating workflows from templates...');

      // Generate workflows using template manager
      const result = await this.templateManager.generateMultiWorkflow(
        multiConfig,
        readmePath,
        path.dirname(plan.workflows[0].outputPath)
      );

      if (!result.success) {
        return result;
      }

      updateProgress('Coordinating workflow dependencies...');

      // Apply workflow coordination
      await this.applyWorkflowCoordination(result.workflows, multiConfig.coordination);

      updateProgress('Writing workflow files...');

      // Write workflow files
      await this.writeWorkflowFiles(result.workflows, plan.workflows);

      updateProgress('Validating generated workflows...');

      // Validate generated workflows
      const validationResults = await this.validateGeneratedWorkflows(result.workflows);
      
      // Add validation warnings to results
      for (let i = 0; i < result.workflows.length; i++) {
        const validation = validationResults[i];
        if (validation && !validation.isValid) {
          result.workflows[i].warnings.push(
            ...validation.errors.map(e => e.message)
          );
        }
      }

      updateProgress('Multi-workflow generation complete');

      return {
        ...result,
        success: result.success && validationResults.every(v => v.isValid)
      };

    } catch (error) {
      return {
        success: false,
        workflows: [],
        errors: [error.message],
        coordination: {
          executionOrder: [],
          dependencies: [],
          sharedResources: []
        }
      };
    }
  }

  /**
   * Update existing workflows while preserving customizations
   */
  async updateWorkflowsWithStrategy(
    workflowPaths: string[],
    strategy: WorkflowUpdateStrategy,
    progressCallback?: (progress: number, message: string) => void
  ): Promise<WorkflowUpdateResult> {
    const results: WorkflowUpdateResult = {
      updated: [],
      skipped: [],
      errors: [],
      backups: []
    };

    for (let i = 0; i < workflowPaths.length; i++) {
      const workflowPath = workflowPaths[i];
      const progress = ((i + 1) / workflowPaths.length) * 100;
      
      progressCallback?.(progress, `Updating ${path.basename(workflowPath)}...`);

      try {
        const updateResult = await this.updateSingleWorkflow(workflowPath, strategy);
        
        if (updateResult.updated) {
          results.updated.push(updateResult);
        } else {
          results.skipped.push({
            path: workflowPath,
            reason: updateResult.reason || 'No changes needed'
          });
        }

        if (updateResult.backupPath) {
          results.backups.push(updateResult.backupPath);
        }

      } catch (error) {
        results.errors.push({
          path: workflowPath,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Analyze workflow coordination and suggest optimizations
   */
  async analyzeWorkflowCoordination(
    workflowPaths: string[]
  ): Promise<CoordinationAnalysis> {
    const workflows = await this.loadExistingWorkflows(workflowPaths);
    
    const analysis: CoordinationAnalysis = {
      duplicatedSteps: this.findDuplicatedSteps(workflows),
      sharedResources: this.findSharedResources(workflows),
      optimizationOpportunities: this.findOptimizationOpportunities(workflows),
      dependencyIssues: this.findDependencyIssues(workflows),
      recommendations: []
    };

    // Generate recommendations based on analysis
    analysis.recommendations = this.generateCoordinationRecommendations(analysis);

    return analysis;
  }

  private async analyzeReadmeForWorkflows(readmePath: string): Promise<ReadmeAnalysis> {
    // Use CLI integration to analyze README
    const cliResult = await this.cliIntegration.parseReadme(readmePath);
    
    if (!cliResult.success) {
      throw new Error(`Failed to analyze README: ${cliResult.stderr}`);
    }

    // Parse CLI output to extract framework information
    const frameworks = this.parseFrameworksFromCLI(cliResult.stdout);
    const projectType = this.determineProjectType(frameworks);
    const deploymentTargets = this.inferDeploymentTargets(frameworks);

    return {
      frameworks,
      projectType,
      deploymentTargets,
      hasTests: this.detectTestingFrameworks(frameworks),
      hasDocumentation: this.detectDocumentation(cliResult.stdout),
      complexity: this.assessProjectComplexity(frameworks)
    };
  }

  private createWorkflowConfiguration(
    workflowType: WorkflowType,
    analysis: ReadmeAnalysis
  ): WorkflowConfiguration {
    return {
      workflowTypes: [workflowType],
      frameworks: analysis.frameworks.map(f => ({
        name: f.name,
        version: f.version,
        enabled: true,
        confidence: f.confidence
      })),
      deploymentTargets: analysis.deploymentTargets,
      securityLevel: this.determineSecurityLevel(workflowType, analysis),
      optimizationLevel: this.determineOptimizationLevel(analysis.complexity),
      includeComments: true,
      customSteps: []
    };
  }

  private async selectOptimalTemplate(
    workflowType: WorkflowType,
    analysis: ReadmeAnalysis
  ): Promise<string> {
    const templates = this.templateManager.getTemplates({
      type: workflowType,
      frameworks: analysis.frameworks.map(f => f.name)
    });

    if (templates.length === 0) {
      throw new Error(`No templates found for workflow type: ${workflowType}`);
    }

    // Select template with highest compatibility score
    const scoredTemplates = templates.map(template => ({
      template,
      score: this.calculateTemplateCompatibilityScore(template, analysis)
    }));

    scoredTemplates.sort((a, b) => b.score - a.score);
    return scoredTemplates[0].template.id;
  }

  private calculateTemplateCompatibilityScore(template: any, analysis: ReadmeAnalysis): number {
    let score = 0;

    // Framework compatibility
    const frameworkMatches = template.frameworks.filter((f: string) => 
      analysis.frameworks.some(af => af.name === f)
    ).length;
    score += frameworkMatches * 10;

    // Usage popularity
    score += template.metadata.usage * 0.1;

    // Template rating
    if (template.metadata.rating) {
      score += template.metadata.rating * 2;
    }

    return score;
  }

  private calculateWorkflowDependencies(workflows: PlannedWorkflow[]): WorkflowDependency[] {
    const dependencies: WorkflowDependency[] = [];

    // CI should run before CD
    const ciWorkflow = workflows.find(w => w.type === 'ci');
    const cdWorkflow = workflows.find(w => w.type === 'cd');
    
    if (ciWorkflow && cdWorkflow) {
      dependencies.push({
        workflow: cdWorkflow.name,
        dependsOn: [ciWorkflow.name],
        condition: 'success'
      });
    }

    // Security should run after CI
    const securityWorkflow = workflows.find(w => w.type === 'security');
    if (ciWorkflow && securityWorkflow) {
      dependencies.push({
        workflow: securityWorkflow.name,
        dependsOn: [ciWorkflow.name]
      });
    }

    // Release should run after CD
    const releaseWorkflow = workflows.find(w => w.type === 'release');
    if (cdWorkflow && releaseWorkflow) {
      dependencies.push({
        workflow: releaseWorkflow.name,
        dependsOn: [cdWorkflow.name]
      });
    }

    return dependencies;
  }

  private async detectWorkflowConflicts(
    workflows: PlannedWorkflow[],
    outputDirectory: string
  ): Promise<WorkflowConflict[]> {
    const conflicts: WorkflowConflict[] = [];

    // Check for naming conflicts
    const names = workflows.map(w => w.name);
    const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
    
    if (duplicateNames.length > 0) {
      conflicts.push({
        type: 'naming',
        workflows: duplicateNames,
        description: 'Multiple workflows have the same name',
        resolution: [{
          action: 'rename',
          description: 'Automatically rename conflicting workflows',
          automatic: true
        }]
      });
    }

    // Check for file conflicts
    const existingFiles = await this.fileSystemManager.listWorkflowFiles(outputDirectory);
    const conflictingFiles = workflows.filter(w => 
      existingFiles.some(f => path.basename(f) === path.basename(w.outputPath))
    );

    if (conflictingFiles.length > 0) {
      conflicts.push({
        type: 'resource',
        workflows: conflictingFiles.map(w => w.name),
        description: 'Workflow files already exist',
        resolution: [
          {
            action: 'override',
            description: 'Replace existing files',
            automatic: false
          },
          {
            action: 'rename',
            description: 'Generate with different names',
            automatic: true
          }
        ]
      });
    }

    return conflicts;
  }

  private calculateEstimatedDuration(
    workflows: PlannedWorkflow[],
    dependencies: WorkflowDependency[]
  ): number {
    // Base time per workflow (in seconds)
    const baseTime = 30;
    
    // Additional time for dependencies
    const dependencyTime = dependencies.length * 10;
    
    // Time based on workflow complexity
    const complexityTime = workflows.reduce((total, workflow) => {
      return total + (workflow.estimatedSize / 1000) * 5; // 5 seconds per KB
    }, 0);

    return baseTime + dependencyTime + complexityTime;
  }

  private collectRequiredResources(workflows: PlannedWorkflow[]): string[] {
    const resources = new Set<string>();

    workflows.forEach(workflow => {
      workflow.requiredSecrets.forEach(secret => resources.add(secret));
      workflow.configuration.frameworks.forEach(framework => {
        resources.add(`framework:${framework.name}`);
      });
      workflow.configuration.deploymentTargets.forEach(target => {
        resources.add(`deployment:${target.platform}`);
      });
    });

    return Array.from(resources);
  }

  private async resolveWorkflowConflicts(conflicts: WorkflowConflict[]): Promise<void> {
    for (const conflict of conflicts) {
      const automaticResolution = conflict.resolution.find(r => r.automatic);
      
      if (automaticResolution) {
        // Apply automatic resolution
        switch (automaticResolution.action) {
          case 'rename':
            // Conflicts will be resolved during generation
            break;
          case 'skip':
            // Mark workflows to skip
            break;
        }
      } else {
        // Prompt user for resolution
        const choice = await vscode.window.showWarningMessage(
          conflict.description,
          ...conflict.resolution.map(r => r.description)
        );
        
        if (choice) {
          const selectedResolution = conflict.resolution.find(r => r.description === choice);
          // Apply selected resolution
        }
      }
    }
  }

  private calculateExecutionOrder(
    workflows: PlannedWorkflow[],
    dependencies: WorkflowDependency[]
  ): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    
    const visit = (workflowName: string): void => {
      if (visited.has(workflowName)) return;
      
      const deps = dependencies.find(d => d.workflow === workflowName);
      if (deps) {
        deps.dependsOn.forEach(dep => visit(dep));
      }
      
      visited.add(workflowName);
      order.push(workflowName);
    };

    workflows.forEach(workflow => visit(workflow.name));
    return order;
  }

  private extractSharedSecrets(workflows: PlannedWorkflow[]): string[] {
    const allSecrets = workflows.flatMap(w => w.requiredSecrets);
    const secretCounts = allSecrets.reduce((counts, secret) => {
      counts[secret] = (counts[secret] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    // Return secrets used by multiple workflows
    return Object.entries(secretCounts)
      .filter(([_, count]) => count > 1)
      .map(([secret, _]) => secret);
  }

  private async extractSharedVariables(readmePath: string): Promise<Record<string, any>> {
    // Extract common variables from README analysis
    const analysis = await this.analyzeReadmeForWorkflows(readmePath);
    
    return {
      projectName: path.basename(path.dirname(readmePath)),
      frameworks: analysis.frameworks.map(f => f.name),
      hasTests: analysis.hasTests,
      complexity: analysis.complexity
    };
  }

  private async loadExistingCustomizations(
    workflows: PlannedWorkflow[]
  ): Promise<any[]> {
    // Load existing customizations for workflows
    // This would integrate with the template manager's customization system
    return [];
  }

  private async applyWorkflowCoordination(
    workflows: WorkflowGenerationResult[],
    coordination: WorkflowCoordination
  ): Promise<void> {
    // Apply shared secrets and variables to workflow content
    for (const workflow of workflows) {
      let content = workflow.content;
      
      // Add shared secrets section
      if (coordination.sharedSecrets.length > 0) {
        const secretsSection = this.generateSecretsSection(coordination.sharedSecrets);
        content = this.insertSecretsSection(content, secretsSection);
      }
      
      // Add shared variables
      if (Object.keys(coordination.sharedVariables).length > 0) {
        const variablesSection = this.generateVariablesSection(coordination.sharedVariables);
        content = this.insertVariablesSection(content, variablesSection);
      }
      
      workflow.content = content;
    }
  }

  private async writeWorkflowFiles(
    workflows: WorkflowGenerationResult[],
    plannedWorkflows: PlannedWorkflow[]
  ): Promise<void> {
    for (let i = 0; i < workflows.length; i++) {
      const workflow = workflows[i];
      const planned = plannedWorkflows[i];
      
      await this.fileSystemManager.writeWorkflowFile(
        planned.outputPath,
        workflow.content
      );
    }
  }

  private async validateGeneratedWorkflows(
    workflows: WorkflowGenerationResult[]
  ): Promise<any[]> {
    // This would integrate with the YAML validation service
    return workflows.map(() => ({ isValid: true, errors: [] }));
  }

  private async updateSingleWorkflow(
    workflowPath: string,
    strategy: WorkflowUpdateStrategy
  ): Promise<SingleWorkflowUpdateResult> {
    // Implementation for updating a single workflow
    return {
      path: workflowPath,
      updated: false,
      reason: 'Not implemented'
    };
  }

  private async loadExistingWorkflows(workflowPaths: string[]): Promise<any[]> {
    // Load and parse existing workflow files
    return [];
  }

  private findDuplicatedSteps(workflows: any[]): any[] {
    // Find duplicated steps across workflows
    return [];
  }

  private findSharedResources(workflows: any[]): any[] {
    // Find shared resources across workflows
    return [];
  }

  private findOptimizationOpportunities(workflows: any[]): any[] {
    // Find optimization opportunities
    return [];
  }

  private findDependencyIssues(workflows: any[]): any[] {
    // Find dependency issues
    return [];
  }

  private generateCoordinationRecommendations(analysis: CoordinationAnalysis): string[] {
    // Generate recommendations based on analysis
    return [];
  }

  // Helper methods for content manipulation
  private generateSecretsSection(secrets: string[]): string {
    return `
env:
${secrets.map(secret => `  ${secret}: \${{ secrets.${secret} }}`).join('\n')}
`;
  }

  private insertSecretsSection(content: string, secretsSection: string): string {
    // Insert secrets section into workflow YAML
    return content.replace(/^(name:.*)$/m, `$1\n${secretsSection}`);
  }

  private generateVariablesSection(variables: Record<string, any>): string {
    return `
env:
${Object.entries(variables).map(([key, value]) => `  ${key}: ${value}`).join('\n')}
`;
  }

  private insertVariablesSection(content: string, variablesSection: string): string {
    // Insert variables section into workflow YAML
    return content.replace(/^(name:.*)$/m, `$1\n${variablesSection}`);
  }

  // Helper methods for analysis
  private parseFrameworksFromCLI(output: string): FrameworkInfo[] {
    // Parse framework information from CLI output
    return [];
  }

  private determineProjectType(frameworks: FrameworkInfo[]): string {
    // Determine project type based on frameworks
    return 'web';
  }

  private inferDeploymentTargets(frameworks: FrameworkInfo[]): any[] {
    // Infer deployment targets from frameworks
    return [];
  }

  private detectTestingFrameworks(frameworks: FrameworkInfo[]): boolean {
    // Detect if testing frameworks are present
    return frameworks.some(f => f.type === 'testing');
  }

  private detectDocumentation(output: string): boolean {
    // Detect if documentation is present
    return output.includes('documentation') || output.includes('docs');
  }

  private assessProjectComplexity(frameworks: FrameworkInfo[]): 'simple' | 'moderate' | 'complex' {
    // Assess project complexity based on frameworks
    if (frameworks.length <= 2) return 'simple';
    if (frameworks.length <= 5) return 'moderate';
    return 'complex';
  }

  private determineSecurityLevel(
    workflowType: WorkflowType,
    analysis: ReadmeAnalysis
  ): 'basic' | 'standard' | 'strict' {
    // Determine security level based on workflow type and analysis
    if (workflowType === 'security') return 'strict';
    if (workflowType === 'release') return 'standard';
    return 'basic';
  }

  private determineOptimizationLevel(
    complexity: 'simple' | 'moderate' | 'complex'
  ): 'basic' | 'standard' | 'aggressive' {
    // Determine optimization level based on complexity
    switch (complexity) {
      case 'simple': return 'basic';
      case 'moderate': return 'standard';
      case 'complex': return 'aggressive';
    }
  }

  private generateWorkflowName(workflowType: WorkflowType, analysis: ReadmeAnalysis): string {
    // Generate a descriptive workflow name
    const typeNames = {
      ci: 'Continuous Integration',
      cd: 'Continuous Deployment',
      release: 'Release',
      security: 'Security Scan',
      performance: 'Performance Test',
      maintenance: 'Maintenance'
    };

    return typeNames[workflowType] || workflowType.toUpperCase();
  }

  private async estimateWorkflowSize(templateId: string, config: WorkflowConfiguration): Promise<number> {
    // Estimate workflow file size in bytes
    const template = this.templateManager.getTemplate(templateId);
    if (!template) return 1000; // Default estimate

    let size = template.content.length;
    
    // Add size for frameworks
    size += config.frameworks.length * 100;
    
    // Add size for deployment targets
    size += config.deploymentTargets.length * 200;
    
    // Add size for custom steps
    size += config.customSteps.length * 150;

    return size;
  }

  private extractRequiredSecrets(config: WorkflowConfiguration): string[] {
    const secrets: string[] = [];

    // Extract secrets from deployment targets
    config.deploymentTargets.forEach(target => {
      secrets.push(...target.secrets);
    });

    // Add common secrets based on frameworks
    config.frameworks.forEach(framework => {
      if (framework.name === 'docker') {
        secrets.push('DOCKER_USERNAME', 'DOCKER_PASSWORD');
      }
      if (framework.name === 'aws') {
        secrets.push('AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY');
      }
    });

    return [...new Set(secrets)]; // Remove duplicates
  }
}

// Additional interfaces
interface ReadmeAnalysis {
  frameworks: FrameworkInfo[];
  projectType: string;
  deploymentTargets: any[];
  hasTests: boolean;
  hasDocumentation: boolean;
  complexity: 'simple' | 'moderate' | 'complex';
}

interface FrameworkInfo {
  name: string;
  version?: string;
  confidence: number;
  type: string;
}

interface WorkflowUpdateResult {
  updated: SingleWorkflowUpdateResult[];
  skipped: { path: string; reason: string }[];
  errors: { path: string; error: string }[];
  backups: string[];
}

interface SingleWorkflowUpdateResult {
  path: string;
  updated: boolean;
  reason?: string;
  backupPath?: string;
}

interface CoordinationAnalysis {
  duplicatedSteps: any[];
  sharedResources: any[];
  optimizationOpportunities: any[];
  dependencyIssues: any[];
  recommendations: string[];
}