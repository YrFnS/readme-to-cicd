/**
 * Template Manager
 * 
 * Manages workflow templates including built-in, custom, and organization templates.
 * Handles template discovery, validation, customization, and coordination.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { WorkflowType, ExtensionConfiguration, WorkflowConfiguration } from './types';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  type: WorkflowType;
  category: 'built-in' | 'custom' | 'organization';
  version: string;
  author?: string;
  tags: string[];
  frameworks: string[];
  content: string;
  variables: TemplateVariable[];
  dependencies: string[];
  metadata: TemplateMetadata;
}

export interface TemplateVariable {
  name: string;
  description: string;
  type: 'string' | 'boolean' | 'number' | 'array' | 'object';
  required: boolean;
  defaultValue?: any;
  validation?: TemplateVariableValidation;
}

export interface TemplateVariableValidation {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  enum?: any[];
}

export interface TemplateMetadata {
  created: Date;
  modified: Date;
  usage: number;
  rating?: number;
  compatibility: string[];
  requirements: string[];
  examples: TemplateExample[];
}

export interface TemplateExample {
  name: string;
  description: string;
  configuration: Record<string, any>;
  expectedOutput: string;
}

export interface TemplateCustomization {
  templateId: string;
  customizations: Record<string, any>;
  preserveOnUpdate: string[];
  lastModified: Date;
}

export interface MultiWorkflowConfiguration {
  workflows: WorkflowConfiguration[];
  coordination: WorkflowCoordination;
  templates: string[];
  customizations: TemplateCustomization[];
}

export interface WorkflowCoordination {
  dependencies: WorkflowDependency[];
  executionOrder: string[];
  sharedSecrets: string[];
  sharedVariables: Record<string, any>;
  conflictResolution: 'merge' | 'override' | 'prompt';
}

export interface WorkflowDependency {
  workflow: string;
  dependsOn: string[];
  condition?: string;
  timeout?: number;
}

export class TemplateManager {
  private templates: Map<string, WorkflowTemplate> = new Map();
  private customizations: Map<string, TemplateCustomization> = new Map();
  private builtInTemplatesPath: string;
  private customTemplatesPath: string;
  private organizationTemplatesPath?: string;

  constructor(
    private context: vscode.ExtensionContext,
    private configuration: ExtensionConfiguration
  ) {
    this.builtInTemplatesPath = path.join(context.extensionPath, 'templates');
    this.customTemplatesPath = path.join(context.globalStorageUri.fsPath, 'templates');
    
    // Organization templates path from configuration
    if (configuration.customTemplates.length > 0) {
      this.organizationTemplatesPath = configuration.customTemplates[0];
    }
  }

  /**
   * Initialize template manager and load all templates
   */
  async initialize(): Promise<void> {
    try {
      await this.ensureDirectories();
      await this.loadBuiltInTemplates();
      await this.loadCustomTemplates();
      await this.loadOrganizationTemplates();
      await this.loadCustomizations();
    } catch (error) {
      throw new Error(`Failed to initialize template manager: ${error}`);
    }
  }

  /**
   * Get all available templates
   */
  getTemplates(filter?: TemplateFilter): WorkflowTemplate[] {
    let templates = Array.from(this.templates.values());

    if (filter) {
      templates = templates.filter(template => {
        if (filter.type && template.type !== filter.type) return false;
        if (filter.category && template.category !== filter.category) return false;
        if (filter.frameworks && !filter.frameworks.some(f => template.frameworks.includes(f))) return false;
        if (filter.tags && !filter.tags.some(t => template.tags.includes(t))) return false;
        return true;
      });
    }

    return templates.sort((a, b) => {
      // Sort by category (built-in first), then by usage, then by name
      if (a.category !== b.category) {
        const order = { 'built-in': 0, 'organization': 1, 'custom': 2 };
        return order[a.category] - order[b.category];
      }
      if (a.metadata.usage !== b.metadata.usage) {
        return b.metadata.usage - a.metadata.usage;
      }
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): WorkflowTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Create custom template from existing workflow
   */
  async createCustomTemplate(
    name: string,
    description: string,
    workflowContent: string,
    type: WorkflowType,
    frameworks: string[] = [],
    tags: string[] = []
  ): Promise<WorkflowTemplate> {
    const id = this.generateTemplateId(name);
    const template: WorkflowTemplate = {
      id,
      name,
      description,
      type,
      category: 'custom',
      version: '1.0.0',
      tags,
      frameworks,
      content: workflowContent,
      variables: this.extractVariables(workflowContent),
      dependencies: this.extractDependencies(workflowContent),
      metadata: {
        created: new Date(),
        modified: new Date(),
        usage: 0,
        compatibility: [],
        requirements: [],
        examples: []
      }
    };

    await this.saveCustomTemplate(template);
    this.templates.set(id, template);

    return template;
  }

  /**
   * Update existing template
   */
  async updateTemplate(
    id: string,
    updates: Partial<WorkflowTemplate>
  ): Promise<WorkflowTemplate> {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template ${id} not found`);
    }

    if (template.category === 'built-in') {
      throw new Error('Cannot modify built-in templates');
    }

    const updatedTemplate = {
      ...template,
      ...updates,
      metadata: {
        ...template.metadata,
        modified: new Date()
      }
    };

    await this.saveCustomTemplate(updatedTemplate);
    this.templates.set(id, updatedTemplate);

    return updatedTemplate;
  }

  /**
   * Delete custom template
   */
  async deleteTemplate(id: string): Promise<void> {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template ${id} not found`);
    }

    if (template.category === 'built-in') {
      throw new Error('Cannot delete built-in templates');
    }

    const templatePath = path.join(this.customTemplatesPath, `${id}.json`);
    await fs.unlink(templatePath);
    this.templates.delete(id);
  }

  /**
   * Generate multiple workflows from templates
   */
  async generateMultiWorkflow(
    configuration: MultiWorkflowConfiguration,
    readmePath: string,
    outputDirectory: string
  ): Promise<MultiWorkflowResult> {
    const results: WorkflowGenerationResult[] = [];
    const errors: string[] = [];
    const coordination = configuration.coordination;

    try {
      // Validate workflow dependencies
      this.validateWorkflowDependencies(coordination.dependencies);

      // Generate workflows in dependency order
      const executionOrder = this.calculateExecutionOrder(
        configuration.workflows,
        coordination.dependencies
      );

      for (const workflowIndex of executionOrder) {
        const workflowConfig = configuration.workflows[workflowIndex];
        const templateIds = this.selectTemplatesForWorkflow(workflowConfig, configuration.templates);

        for (const templateId of templateIds) {
          try {
            const result = await this.generateWorkflowFromTemplate(
              templateId,
              workflowConfig,
              readmePath,
              outputDirectory,
              coordination.sharedVariables
            );
            results.push(result);
          } catch (error) {
            errors.push(`Failed to generate workflow from template ${templateId}: ${error}`);
          }
        }
      }

      // Apply customizations
      await this.applyCustomizations(results, configuration.customizations);

      // Coordinate workflows
      await this.coordinateWorkflows(results, coordination);

      return {
        success: errors.length === 0,
        workflows: results,
        errors,
        coordination: {
          executionOrder: executionOrder.map(i => configuration.workflows[i].workflowTypes[0]),
          dependencies: coordination.dependencies,
          sharedResources: coordination.sharedSecrets.concat(Object.keys(coordination.sharedVariables))
        }
      };

    } catch (error) {
      return {
        success: false,
        workflows: results,
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
   * Apply template customizations while preserving custom modifications
   */
  async applyCustomizations(
    workflows: WorkflowGenerationResult[],
    customizations: TemplateCustomization[]
  ): Promise<void> {
    for (const workflow of workflows) {
      const customization = customizations.find(c => c.templateId === workflow.templateId);
      if (!customization) continue;

      try {
        // Parse existing workflow content
        const existingContent = workflow.content;
        const customizedContent = this.mergeCustomizations(
          existingContent,
          customization.customizations,
          customization.preserveOnUpdate
        );

        workflow.content = customizedContent;
        workflow.customized = true;
      } catch (error) {
        workflow.warnings.push(`Failed to apply customizations: ${error.message}`);
      }
    }
  }

  /**
   * Coordinate multiple workflows (shared secrets, variables, dependencies)
   */
  private async coordinateWorkflows(
    workflows: WorkflowGenerationResult[],
    coordination: WorkflowCoordination
  ): Promise<void> {
    // Add shared secrets to all workflows
    for (const workflow of workflows) {
      workflow.sharedSecrets = coordination.sharedSecrets;
    }

    // Add shared variables
    for (const workflow of workflows) {
      workflow.sharedVariables = coordination.sharedVariables;
    }

    // Add dependency information
    for (const workflow of workflows) {
      const deps = coordination.dependencies.filter(d => d.workflow === workflow.filename);
      workflow.dependencies = deps.map(d => d.dependsOn).flat();
    }
  }

  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.customTemplatesPath, { recursive: true });
  }

  private async loadBuiltInTemplates(): Promise<void> {
    try {
      const templatesDir = this.builtInTemplatesPath;
      const files = await fs.readdir(templatesDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const templatePath = path.join(templatesDir, file);
          const content = await fs.readFile(templatePath, 'utf-8');
          const template: WorkflowTemplate = JSON.parse(content);
          template.category = 'built-in';
          this.templates.set(template.id, template);
        }
      }
    } catch (error) {
      // Built-in templates directory might not exist in development
      console.warn('Could not load built-in templates:', error.message);
    }
  }

  private async loadCustomTemplates(): Promise<void> {
    try {
      const files = await fs.readdir(this.customTemplatesPath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const templatePath = path.join(this.customTemplatesPath, file);
          const content = await fs.readFile(templatePath, 'utf-8');
          const template: WorkflowTemplate = JSON.parse(content);
          template.category = 'custom';
          this.templates.set(template.id, template);
        }
      }
    } catch (error) {
      // Custom templates directory might not exist yet
    }
  }

  private async loadOrganizationTemplates(): Promise<void> {
    if (!this.organizationTemplatesPath) return;

    try {
      const files = await fs.readdir(this.organizationTemplatesPath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const templatePath = path.join(this.organizationTemplatesPath, file);
          const content = await fs.readFile(templatePath, 'utf-8');
          const template: WorkflowTemplate = JSON.parse(content);
          template.category = 'organization';
          this.templates.set(template.id, template);
        }
      }
    } catch (error) {
      console.warn('Could not load organization templates:', error.message);
    }
  }

  private async loadCustomizations(): Promise<void> {
    try {
      const customizationsPath = path.join(this.customTemplatesPath, 'customizations.json');
      const content = await fs.readFile(customizationsPath, 'utf-8');
      const customizations: TemplateCustomization[] = JSON.parse(content);
      
      for (const customization of customizations) {
        this.customizations.set(customization.templateId, customization);
      }
    } catch (error) {
      // Customizations file might not exist yet
    }
  }

  private async saveCustomTemplate(template: WorkflowTemplate): Promise<void> {
    const templatePath = path.join(this.customTemplatesPath, `${template.id}.json`);
    await fs.writeFile(templatePath, JSON.stringify(template, null, 2));
  }

  /**
   * Save template customization metadata
   */
  async saveCustomization(customization: TemplateCustomization): Promise<void> {
    this.customizations.set(customization.templateId, customization);
    
    const customizationsPath = path.join(this.customTemplatesPath, 'customizations.json');
    const allCustomizations = Array.from(this.customizations.values());
    await fs.writeFile(customizationsPath, JSON.stringify(allCustomizations, null, 2));
  }

  /**
   * Get template customization
   */
  getCustomization(templateId: string): TemplateCustomization | undefined {
    return this.customizations.get(templateId);
  }

  /**
   * Generate workflow from template with enhanced variable substitution
   */
  async generateWorkflowFromTemplate(
    templateId: string,
    workflowConfig: WorkflowConfiguration,
    readmePath: string,
    outputDirectory: string,
    sharedVariables: Record<string, any>
  ): Promise<WorkflowGenerationResult> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Increment usage counter
    template.metadata.usage++;

    // Generate workflow content by substituting variables
    const variables = {
      ...sharedVariables,
      ...this.extractWorkflowVariables(workflowConfig),
      readmePath,
      outputDirectory,
      templateId, // Add template ID for tracking
      generatedAt: new Date().toISOString()
    };

    let content = this.substituteVariables(template.content, variables);
    
    // Add template metadata as comments
    content = this.addTemplateMetadata(content, template, variables);
    
    const filename = this.generateWorkflowFilename(template, workflowConfig);

    return {
      templateId,
      filename,
      content,
      type: template.type,
      frameworks: template.frameworks,
      customized: false,
      warnings: [],
      sharedSecrets: [],
      sharedVariables: {},
      dependencies: []
    };
  }

  /**
   * Import templates from organization repository
   */
  async importOrganizationTemplates(repositoryUrl: string): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: [],
      errors: [],
      skipped: []
    };

    try {
      // This would integrate with Git to clone/pull organization templates
      // For now, we'll simulate the process
      
      const templates = await this.fetchTemplatesFromRepository(repositoryUrl);
      
      for (const template of templates) {
        try {
          // Validate template
          const validation = this.validateTemplate(template);
          if (!validation.isValid) {
            result.errors.push({
              templateId: template.id,
              error: validation.errors.join(', ')
            });
            continue;
          }

          // Check if template already exists
          if (this.templates.has(template.id)) {
            result.skipped.push({
              templateId: template.id,
              reason: 'Template already exists'
            });
            continue;
          }

          // Import template
          template.category = 'organization';
          this.templates.set(template.id, template);
          await this.saveOrganizationTemplate(template);
          
          result.imported.push(template.id);

        } catch (error) {
          result.errors.push({
            templateId: template.id,
            error: error.message
          });
        }
      }

      result.success = result.errors.length === 0;
      return result;

    } catch (error) {
      result.errors.push({
        templateId: 'repository',
        error: `Failed to fetch templates: ${error.message}`
      });
      return result;
    }
  }

  /**
   * Export custom templates for sharing
   */
  async exportTemplates(templateIds: string[], exportPath: string): Promise<ExportResult> {
    const result: ExportResult = {
      success: false,
      exported: [],
      errors: []
    };

    try {
      const exportData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        templates: [] as WorkflowTemplate[]
      };

      for (const templateId of templateIds) {
        const template = this.templates.get(templateId);
        if (!template) {
          result.errors.push({
            templateId,
            error: 'Template not found'
          });
          continue;
        }

        if (template.category === 'built-in') {
          result.errors.push({
            templateId,
            error: 'Cannot export built-in templates'
          });
          continue;
        }

        exportData.templates.push(template);
        result.exported.push(templateId);
      }

      await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
      result.success = true;

    } catch (error) {
      result.errors.push({
        templateId: 'export',
        error: error.message
      });
    }

    return result;
  }

  /**
   * Validate template structure and content
   */
  validateTemplate(template: WorkflowTemplate): TemplateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!template.id) errors.push('Template ID is required');
    if (!template.name) errors.push('Template name is required');
    if (!template.content) errors.push('Template content is required');
    if (!template.type) errors.push('Template type is required');

    // Content validation
    if (template.content) {
      // Check for valid YAML structure
      try {
        const yaml = require('js-yaml');
        yaml.load(template.content);
      } catch (error) {
        errors.push(`Invalid YAML structure: ${error.message}`);
      }

      // Check for required GitHub Actions structure
      if (!template.content.includes('name:')) {
        warnings.push('Template should include a workflow name');
      }
      if (!template.content.includes('on:')) {
        errors.push('Template must include trigger events (on:)');
      }
      if (!template.content.includes('jobs:')) {
        errors.push('Template must include jobs section');
      }
    }

    // Variable validation
    if (template.variables) {
      for (const variable of template.variables) {
        if (!variable.name) {
          errors.push('Template variable must have a name');
        }
        if (variable.required && !variable.defaultValue) {
          warnings.push(`Required variable '${variable.name}' has no default value`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private generateTemplateId(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  }

  private extractVariables(content: string): TemplateVariable[] {
    const variables: TemplateVariable[] = [];
    const variablePattern = /\{\{(\w+)\}\}/g;
    let match;

    while ((match = variablePattern.exec(content)) !== null) {
      const name = match[1];
      if (!variables.find(v => v.name === name)) {
        variables.push({
          name,
          description: `Template variable: ${name}`,
          type: 'string',
          required: true
        });
      }
    }

    return variables;
  }

  private extractDependencies(content: string): string[] {
    const dependencies: string[] = [];
    
    // Extract GitHub Actions dependencies
    const actionPattern = /uses:\s*([^\s@]+)@/g;
    let match;

    while ((match = actionPattern.exec(content)) !== null) {
      const action = match[1];
      if (!dependencies.includes(action)) {
        dependencies.push(action);
      }
    }

    return dependencies;
  }

  private validateWorkflowDependencies(dependencies: WorkflowDependency[]): void {
    const workflowNames = new Set(dependencies.map(d => d.workflow));
    
    for (const dep of dependencies) {
      for (const dependsOn of dep.dependsOn) {
        if (!workflowNames.has(dependsOn)) {
          throw new Error(`Workflow dependency not found: ${dependsOn}`);
        }
      }
    }

    // Check for circular dependencies
    this.checkCircularDependencies(dependencies);
  }

  private checkCircularDependencies(dependencies: WorkflowDependency[]): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (workflow: string): boolean => {
      if (recursionStack.has(workflow)) return true;
      if (visited.has(workflow)) return false;

      visited.add(workflow);
      recursionStack.add(workflow);

      const deps = dependencies.find(d => d.workflow === workflow);
      if (deps) {
        for (const dep of deps.dependsOn) {
          if (hasCycle(dep)) return true;
        }
      }

      recursionStack.delete(workflow);
      return false;
    };

    for (const dep of dependencies) {
      if (hasCycle(dep.workflow)) {
        throw new Error(`Circular dependency detected involving workflow: ${dep.workflow}`);
      }
    }
  }

  private calculateExecutionOrder(
    workflows: WorkflowConfiguration[],
    dependencies: WorkflowDependency[]
  ): number[] {
    const order: number[] = [];
    const visited = new Set<number>();
    
    const visit = (index: number): void => {
      if (visited.has(index)) return;
      
      const workflow = workflows[index];
      const workflowName = workflow.workflowTypes[0]; // Use first workflow type as identifier
      const deps = dependencies.find(d => d.workflow === workflowName);
      
      if (deps) {
        for (const depName of deps.dependsOn) {
          const depIndex = workflows.findIndex(w => w.workflowTypes.includes(depName as WorkflowType));
          if (depIndex !== -1) {
            visit(depIndex);
          }
        }
      }
      
      visited.add(index);
      order.push(index);
    };

    for (let i = 0; i < workflows.length; i++) {
      visit(i);
    }

    return order;
  }

  private selectTemplatesForWorkflow(
    workflowConfig: WorkflowConfiguration,
    availableTemplates: string[]
  ): string[] {
    const selectedTemplates: string[] = [];

    for (const workflowType of workflowConfig.workflowTypes) {
      // Find best matching template for this workflow type
      const candidates = availableTemplates.filter(templateId => {
        const template = this.templates.get(templateId);
        return template && template.type === workflowType;
      });

      if (candidates.length > 0) {
        // Select template with highest usage or first available
        const bestTemplate = candidates.sort((a, b) => {
          const templateA = this.templates.get(a)!;
          const templateB = this.templates.get(b)!;
          return templateB.metadata.usage - templateA.metadata.usage;
        })[0];

        selectedTemplates.push(bestTemplate);
      }
    }

    return selectedTemplates;
  }



  private extractWorkflowVariables(config: WorkflowConfiguration): Record<string, any> {
    return {
      frameworks: config.frameworks.map(f => f.name),
      deploymentTargets: config.deploymentTargets.map(d => d.platform),
      securityLevel: config.securityLevel,
      optimizationLevel: config.optimizationLevel,
      includeComments: config.includeComments
    };
  }

  private substituteVariables(content: string, variables: Record<string, any>): string {
    let result = content;
    
    for (const [key, value] of Object.entries(variables)) {
      const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(pattern, String(value));
    }

    return result;
  }

  private generateWorkflowFilename(
    template: WorkflowTemplate,
    config: WorkflowConfiguration
  ): string {
    const type = template.type;
    const frameworks = config.frameworks.map(f => f.name).join('-');
    return `${type}${frameworks ? '-' + frameworks : ''}.yml`;
  }

  private mergeCustomizations(
    content: string,
    customizations: Record<string, any>,
    preserveOnUpdate: string[]
  ): string {
    // This is a simplified implementation
    // In a real implementation, you would parse the YAML and merge specific sections
    let result = content;

    for (const [key, value] of Object.entries(customizations)) {
      if (preserveOnUpdate.includes(key)) {
        // Apply customization while preserving the section
        const pattern = new RegExp(`(${key}:).*?(?=\\n\\w|$)`, 's');
        result = result.replace(pattern, `$1 ${JSON.stringify(value)}`);
      }
    }

    return result;
  }

  private addTemplateMetadata(
    content: string,
    template: WorkflowTemplate,
    variables: Record<string, any>
  ): string {
    const metadata = `# Generated from template: ${template.name} (${template.id})
# Template version: ${template.version}
# Generated at: ${variables.generatedAt}
# Template ID: ${template.id}

`;
    return metadata + content;
  }

  private async fetchTemplatesFromRepository(repositoryUrl: string): Promise<WorkflowTemplate[]> {
    // This would integrate with Git to fetch templates from a repository
    // For now, return empty array as placeholder
    return [];
  }

  private async saveOrganizationTemplate(template: WorkflowTemplate): Promise<void> {
    if (!this.organizationTemplatesPath) {
      throw new Error('Organization templates path not configured');
    }
    
    const templatePath = path.join(this.organizationTemplatesPath, `${template.id}.json`);
    await fs.writeFile(templatePath, JSON.stringify(template, null, 2));
  }
}

// Additional interfaces for the template system
export interface TemplateFilter {
  type?: WorkflowType;
  category?: 'built-in' | 'custom' | 'organization';
  frameworks?: string[];
  tags?: string[];
}

export interface WorkflowGenerationResult {
  templateId: string;
  filename: string;
  content: string;
  type: WorkflowType;
  frameworks: string[];
  customized: boolean;
  warnings: string[];
  sharedSecrets: string[];
  sharedVariables: Record<string, any>;
  dependencies: string[];
}

export interface MultiWorkflowResult {
  success: boolean;
  workflows: WorkflowGenerationResult[];
  errors: string[];
  coordination: {
    executionOrder: string[];
    dependencies: WorkflowDependency[];
    sharedResources: string[];
  };
}

export interface ImportResult {
  success: boolean;
  imported: string[];
  errors: { templateId: string; error: string }[];
  skipped: { templateId: string; reason: string }[];
}

export interface ExportResult {
  success: boolean;
  exported: string[];
  errors: { templateId: string; error: string }[];
}

export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}