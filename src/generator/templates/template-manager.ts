/**
 * Template Manager for loading and caching workflow templates
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as Handlebars from 'handlebars';
import { TemplateLoadConfig, TemplateCompilationResult, FrameworkTemplateRegistry, TemplateMetadata } from './template-types';
import { WorkflowTemplate, WorkflowType } from '../types';

/**
 * Template Manager class for handling workflow templates
 */
export class TemplateManager {
  private config: TemplateLoadConfig;
  private templateCache: Map<string, WorkflowTemplate> = new Map();
  private compiledTemplateCache: Map<string, HandlebarsTemplateDelegate> = new Map();
  private frameworkRegistry: FrameworkTemplateRegistry | null = null;

  constructor(config: TemplateLoadConfig) {
    this.config = config;
    this.initializeHandlebarsHelpers();
  }

  /**
   * Load template by name with hierarchy support
   */
  async loadTemplate(templateName: string): Promise<WorkflowTemplate> {
    // Check cache first
    if (this.config.cacheEnabled && this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    try {
      // Try to load from custom templates first, then base templates
      let templatePath = await this.findTemplatePath(templateName);
      
      if (!templatePath) {
        throw new Error(`Template '${templateName}' not found`);
      }

      const templateContent = await fs.readFile(templatePath, 'utf-8');
      const template = this.parseTemplate(templateContent, templateName);

      // Cache the template if caching is enabled
      if (this.config.cacheEnabled) {
        this.templateCache.set(templateName, template);
      }

      return template;
    } catch (error) {
      throw new Error(`Failed to load template '${templateName}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Compile template with data using Handlebars
   */
  async compileTemplate(templateName: string, data: any): Promise<TemplateCompilationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Load the base template
      const baseTemplate = await this.loadTemplate(templateName);
      
      // Get or compile the Handlebars template
      let compiledTemplate = this.compiledTemplateCache.get(templateName);
      
      if (!compiledTemplate) {
        const templateSource = this.templateToHandlebarsSource(baseTemplate);
        compiledTemplate = Handlebars.compile(templateSource);
        
        if (this.config.cacheEnabled) {
          this.compiledTemplateCache.set(templateName, compiledTemplate);
        }
      }

      // Compile with data
      const compiledSource = compiledTemplate(data);
      const compiledWorkflow = this.parseTemplate(compiledSource, templateName);

      // Validate the compiled template
      const validationResult = this.validateTemplate(compiledWorkflow);
      errors.push(...validationResult.errors);
      warnings.push(...validationResult.warnings);

      // Generate metadata
      const metadata: TemplateMetadata = {
        name: templateName,
        version: '1.0.0',
        author: 'README-to-CICD',
        description: `Compiled workflow template for ${templateName}`,
        tags: [baseTemplate.type],
        lastModified: new Date(),
        dependencies: this.extractTemplateDependencies(baseTemplate)
      };

      return {
        template: compiledWorkflow,
        errors,
        warnings,
        metadata
      };
    } catch (error) {
      errors.push(`Template compilation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Return a minimal template on error
      const fallbackTemplate: WorkflowTemplate = {
        name: templateName,
        type: 'ci' as WorkflowType,
        triggers: {},
        jobs: []
      };

      return {
        template: fallbackTemplate,
        errors,
        warnings,
        metadata: {
          name: templateName,
          version: '1.0.0',
          author: 'README-to-CICD',
          description: 'Fallback template due to compilation error',
          tags: ['error'],
          lastModified: new Date(),
          dependencies: []
        }
      };
    }
  }

  /**
   * Get framework templates registry
   */
  getFrameworkRegistry(): FrameworkTemplateRegistry {
    if (!this.frameworkRegistry) {
      this.frameworkRegistry = this.buildFrameworkRegistry();
    }
    return this.frameworkRegistry;
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.templateCache.clear();
    this.compiledTemplateCache.clear();
    this.frameworkRegistry = null;
  }

  /**
   * Reload templates (useful for development)
   */
  async reloadTemplates(): Promise<void> {
    this.clearCache();
    // Pre-load common templates
    const commonTemplates = ['ci-basic', 'cd-basic', 'nodejs-ci', 'python-ci'];
    
    for (const templateName of commonTemplates) {
      try {
        await this.loadTemplate(templateName);
      } catch (error) {
        // Ignore errors for optional templates
      }
    }
  }

  /**
   * Find template path with hierarchy support
   */
  private async findTemplatePath(templateName: string): Promise<string | null> {
    const possiblePaths = [
      // Custom templates take precedence
      ...(this.config.customTemplatesPath ? [
        path.join(this.config.customTemplatesPath, `${templateName}.yaml`),
        path.join(this.config.customTemplatesPath, `${templateName}.yml`),
        path.join(this.config.customTemplatesPath, `${templateName}.json`)
      ] : []),
      // Base templates
      path.join(this.config.baseTemplatesPath, `${templateName}.yaml`),
      path.join(this.config.baseTemplatesPath, `${templateName}.yml`),
      path.join(this.config.baseTemplatesPath, `${templateName}.json`),
      // Framework-specific templates
      path.join(this.config.baseTemplatesPath, 'frameworks', `${templateName}.yaml`),
      path.join(this.config.baseTemplatesPath, 'frameworks', `${templateName}.yml`),
      // Language-specific templates
      path.join(this.config.baseTemplatesPath, 'languages', `${templateName}.yaml`),
      path.join(this.config.baseTemplatesPath, 'languages', `${templateName}.yml`)
    ];

    for (const templatePath of possiblePaths) {
      try {
        await fs.access(templatePath);
        return templatePath;
      } catch {
        // Continue to next path
      }
    }

    return null;
  }

  /**
   * Parse template from string content
   */
  private parseTemplate(content: string, templateName: string): WorkflowTemplate {
    try {
      // Try parsing as JSON first, then YAML
      let parsed: any;
      
      if (content.trim().startsWith('{')) {
        parsed = JSON.parse(content);
      } else {
        // Use js-yaml for proper YAML parsing
        parsed = yaml.load(content);
      }

      // Convert to WorkflowTemplate format
      return this.normalizeTemplate(parsed, templateName);
    } catch (error) {
      throw new Error(`Failed to parse template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }



  /**
   * Normalize parsed template to WorkflowTemplate format
   */
  private normalizeTemplate(parsed: any, templateName: string): WorkflowTemplate {
    // Handle jobs as array or object
    let jobs: any[] = [];
    
    if (Array.isArray(parsed.jobs)) {
      jobs = parsed.jobs.map((job: any) => ({
        name: job.name || 'Unnamed Job',
        runsOn: job.runsOn || job['runs-on'] || 'ubuntu-latest',
        steps: Array.isArray(job.steps) ? job.steps : [],
        strategy: job.strategy,
        needs: job.needs,
        if: job.if,
        environment: job.environment,
        permissions: job.permissions,
        timeout: job.timeout,
        continueOnError: job.continueOnError,
        outputs: job.outputs
      }));
    } else if (parsed.jobs && typeof parsed.jobs === 'object') {
      jobs = Object.entries(parsed.jobs).map(([name, job]: [string, any]) => ({
        name: job.name || name,
        runsOn: job.runsOn || job['runs-on'] || 'ubuntu-latest',
        steps: Array.isArray(job.steps) ? job.steps : [],
        strategy: job.strategy,
        needs: job.needs,
        if: job.if,
        environment: job.environment,
        permissions: job.permissions,
        timeout: job.timeout,
        continueOnError: job.continueOnError,
        outputs: job.outputs
      }));
    }

    return {
      name: parsed.name || templateName,
      type: parsed.type || 'ci',
      triggers: parsed.triggers || parsed.on || {},
      jobs,
      permissions: parsed.permissions,
      concurrency: parsed.concurrency,
      defaults: parsed.defaults,
      environment: parsed.env
    };
  }

  /**
   * Convert WorkflowTemplate to Handlebars source
   */
  private templateToHandlebarsSource(template: WorkflowTemplate): string {
    // Convert template to a Handlebars-compatible format
    return JSON.stringify(template, null, 2);
  }

  /**
   * Validate compiled template
   */
  private validateTemplate(template: WorkflowTemplate): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!template.name || template.name.trim() === '') {
      errors.push('Template must have a name');
    }

    if (!template.jobs || template.jobs.length === 0) {
      errors.push('Template must have at least one job');
    }

    // Validate jobs
    for (const job of template.jobs || []) {
      if (!job.name || job.name.trim() === '') {
        errors.push('Job must have a name');
      }
      
      if (!job.runsOn || job.runsOn.trim() === '') {
        errors.push(`Job '${job.name || 'unnamed'}' must specify runs-on`);
      }
      
      if (!job.steps || job.steps.length === 0) {
        warnings.push(`Job '${job.name || 'unnamed'}' has no steps`);
      }
      
      // Validate steps
      for (const step of job.steps || []) {
        if (!step.name || step.name.trim() === '') {
          warnings.push(`Step in job '${job.name || 'unnamed'}' should have a name`);
        }
        
        if (!step.uses && !step.run) {
          errors.push(`Step '${step.name || 'unnamed'}' in job '${job.name || 'unnamed'}' must have either 'uses' or 'run'`);
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Extract template dependencies
   */
  private extractTemplateDependencies(template: WorkflowTemplate): string[] {
    const dependencies: Set<string> = new Set();

    // Extract action dependencies
    for (const job of template.jobs) {
      for (const step of job.steps) {
        if (step.uses) {
          dependencies.add(step.uses);
        }
      }
    }

    return Array.from(dependencies);
  }

  /**
   * Build framework registry
   */
  private buildFrameworkRegistry(): FrameworkTemplateRegistry {
    // This would be loaded from actual template files
    // For now, return a basic structure
    return {
      nodejs: {
        setup: [],
        build: [],
        test: [],
        deploy: [],
        cache: [],
        performance: [],
        security: []
      },
      python: {
        setup: [],
        build: [],
        test: [],
        deploy: [],
        cache: [],
        performance: [],
        security: []
      },
      rust: {
        setup: [],
        build: [],
        test: [],
        deploy: [],
        cache: [],
        performance: [],
        security: []
      },
      go: {
        setup: [],
        build: [],
        test: [],
        deploy: [],
        cache: [],
        performance: [],
        security: []
      },
      java: {
        setup: [],
        build: [],
        test: [],
        deploy: [],
        cache: [],
        performance: [],
        security: []
      },
      docker: {
        build: [],
        push: [],
        security: [],
        cache: []
      },
      frontend: {
        build: [],
        test: [],
        deploy: [],
        cache: []
      }
    };
  }

  /**
   * Initialize Handlebars helpers
   */
  private initializeHandlebarsHelpers(): void {
    // Register common helpers
    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    Handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
    Handlebars.registerHelper('gt', (a: number, b: number) => a > b);
    Handlebars.registerHelper('lt', (a: number, b: number) => a < b);
    Handlebars.registerHelper('and', (a: any, b: any) => a && b);
    Handlebars.registerHelper('or', (a: any, b: any) => a || b);
    Handlebars.registerHelper('not', (a: any) => !a);
    
    // Framework-specific helpers
    Handlebars.registerHelper('isNodeJS', (framework: string) => 
      ['nodejs', 'react', 'vue', 'angular', 'next', 'express', 'nestjs'].includes(framework.toLowerCase())
    );
    
    Handlebars.registerHelper('isPython', (framework: string) => 
      ['python', 'django', 'flask', 'fastapi'].includes(framework.toLowerCase())
    );
    
    Handlebars.registerHelper('isRust', (framework: string) => 
      ['rust', 'actix', 'rocket', 'warp'].includes(framework.toLowerCase())
    );
    
    Handlebars.registerHelper('isGo', (framework: string) => 
      ['go', 'gin', 'echo', 'fiber'].includes(framework.toLowerCase())
    );
    
    Handlebars.registerHelper('isJava', (framework: string) => 
      ['java', 'spring', 'maven', 'gradle'].includes(framework.toLowerCase())
    );
  }
}