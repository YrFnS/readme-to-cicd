/**
 * Plugin architecture for custom template providers and extensibility
 * Implements requirements 10.2, 10.3, 10.4
 */

import { WorkflowTemplate, WorkflowType, StepTemplate, JobTemplate } from '../types';
import { DetectionResult, GenerationOptions, WorkflowOutput } from '../interfaces';

/**
 * Plugin lifecycle hooks
 */
export interface PluginHooks {
  beforeGeneration?: (context: GenerationContext) => Promise<GenerationContext>;
  afterGeneration?: (context: GenerationContext, result: WorkflowOutput) => Promise<WorkflowOutput>;
  beforeTemplateLoad?: (templateName: string, context: GenerationContext) => Promise<string>;
  afterTemplateLoad?: (templateName: string, template: WorkflowTemplate, context: GenerationContext) => Promise<WorkflowTemplate>;
  beforeStepGeneration?: (step: StepTemplate, context: GenerationContext) => Promise<StepTemplate>;
  afterStepGeneration?: (step: StepTemplate, context: GenerationContext) => Promise<StepTemplate>;
  beforeJobGeneration?: (job: JobTemplate, context: GenerationContext) => Promise<JobTemplate>;
  afterJobGeneration?: (job: JobTemplate, context: GenerationContext) => Promise<JobTemplate>;
  onError?: (error: Error, context: GenerationContext) => Promise<void>;
}

/**
 * Generation context passed to plugins
 */
export interface GenerationContext {
  detectionResult: DetectionResult;
  options: GenerationOptions;
  metadata: {
    pluginId: string;
    startTime: number;
    currentPhase: string;
    customData: Record<string, any>;
  };
}

/**
 * Plugin metadata and configuration
 */
export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  dependencies?: string[];
  supportedFrameworks?: string[];
  supportedWorkflowTypes?: WorkflowType[];
  priority: number; // Higher priority plugins run first
  enabled: boolean;
}

/**
 * Template provider interface for custom template sources
 */
export interface TemplateProvider {
  id: string;
  name: string;
  priority: number;
  
  /**
   * Check if this provider can handle the template
   */
  canProvide(templateName: string, context: GenerationContext): Promise<boolean>;
  
  /**
   * Load template from this provider
   */
  loadTemplate(templateName: string, context: GenerationContext): Promise<WorkflowTemplate>;
  
  /**
   * List available templates from this provider
   */
  listTemplates(context?: GenerationContext): Promise<string[]>;
  
  /**
   * Get template metadata
   */
  getTemplateMetadata(templateName: string): Promise<any>;
}

/**
 * Plugin interface
 */
export interface Plugin {
  metadata: PluginMetadata;
  hooks?: PluginHooks;
  templateProvider?: TemplateProvider;
  
  /**
   * Initialize the plugin
   */
  initialize?(config: any): Promise<void>;
  
  /**
   * Cleanup plugin resources
   */
  cleanup?(): Promise<void>;
  
  /**
   * Validate plugin configuration
   */
  validateConfig?(config: any): Promise<boolean>;
}

/**
 * Plugin registry and manager
 */
export class PluginManager {
  private plugins = new Map<string, Plugin>();
  private templateProviders = new Map<string, TemplateProvider>();
  private hookRegistry = new Map<keyof PluginHooks, Plugin[]>();
  private initialized = false;

  constructor() {
    this.initializeHookRegistry();
  }

  /**
   * Register a plugin
   */
  async registerPlugin(plugin: Plugin, config?: any): Promise<void> {
    // Validate plugin
    if (!plugin.metadata || !plugin.metadata.id) {
      throw new Error('Plugin must have valid metadata with id');
    }

    if (this.plugins.has(plugin.metadata.id)) {
      throw new Error(`Plugin with id '${plugin.metadata.id}' is already registered`);
    }

    // Validate configuration if plugin supports it
    if (plugin.validateConfig && config) {
      const isValid = await plugin.validateConfig(config);
      if (!isValid) {
        throw new Error(`Invalid configuration for plugin '${plugin.metadata.id}'`);
      }
    }

    // Initialize plugin
    if (plugin.initialize) {
      await plugin.initialize(config);
    }

    // Register plugin
    this.plugins.set(plugin.metadata.id, plugin);

    // Register template provider if available
    if (plugin.templateProvider) {
      this.templateProviders.set(plugin.templateProvider.id, plugin.templateProvider);
    }

    // Register hooks
    if (plugin.hooks) {
      this.registerHooks(plugin);
    }

    console.log(`Plugin '${plugin.metadata.name}' (${plugin.metadata.id}) registered successfully`);
  }

  /**
   * Unregister a plugin
   */
  async unregisterPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin '${pluginId}' not found`);
    }

    // Cleanup plugin
    if (plugin.cleanup) {
      await plugin.cleanup();
    }

    // Remove from registries
    this.plugins.delete(pluginId);
    
    if (plugin.templateProvider) {
      this.templateProviders.delete(plugin.templateProvider.id);
    }

    // Remove hooks
    if (plugin.hooks) {
      this.unregisterHooks(plugin);
    }

    console.log(`Plugin '${plugin.metadata.name}' (${pluginId}) unregistered successfully`);
  }

  /**
   * Get registered plugin
   */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * List all registered plugins
   */
  listPlugins(): PluginMetadata[] {
    return Array.from(this.plugins.values()).map(plugin => plugin.metadata);
  }

  /**
   * Get template providers sorted by priority
   */
  getTemplateProviders(): TemplateProvider[] {
    return Array.from(this.templateProviders.values())
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Execute before generation hooks
   */
  async executeBeforeGeneration(context: GenerationContext): Promise<GenerationContext> {
    const hooks = this.getHooks('beforeGeneration');
    let currentContext = context;

    for (const plugin of hooks) {
      if (plugin.hooks?.beforeGeneration && this.shouldExecutePlugin(plugin, context)) {
        try {
          currentContext = await plugin.hooks.beforeGeneration(currentContext);
        } catch (error) {
          await this.handlePluginError(plugin, error instanceof Error ? error : new Error(String(error)), context);
        }
      }
    }

    return currentContext;
  }

  /**
   * Execute after generation hooks
   */
  async executeAfterGeneration(context: GenerationContext, result: WorkflowOutput): Promise<WorkflowOutput> {
    const hooks = this.getHooks('afterGeneration');
    let currentResult = result;

    for (const plugin of hooks) {
      if (plugin.hooks?.afterGeneration && this.shouldExecutePlugin(plugin, context)) {
        try {
          currentResult = await plugin.hooks.afterGeneration(context, currentResult);
        } catch (error) {
          await this.handlePluginError(plugin, error instanceof Error ? error : new Error(String(error)), context);
        }
      }
    }

    return currentResult;
  }

  /**
   * Execute before template load hooks
   */
  async executeBeforeTemplateLoad(templateName: string, context: GenerationContext): Promise<string> {
    const hooks = this.getHooks('beforeTemplateLoad');
    let currentTemplateName = templateName;

    for (const plugin of hooks) {
      if (plugin.hooks?.beforeTemplateLoad && this.shouldExecutePlugin(plugin, context)) {
        try {
          currentTemplateName = await plugin.hooks.beforeTemplateLoad(currentTemplateName, context);
        } catch (error) {
          await this.handlePluginError(plugin, error instanceof Error ? error : new Error(String(error)), context);
        }
      }
    }

    return currentTemplateName;
  }

  /**
   * Execute after template load hooks
   */
  async executeAfterTemplateLoad(
    templateName: string, 
    template: WorkflowTemplate, 
    context: GenerationContext
  ): Promise<WorkflowTemplate> {
    const hooks = this.getHooks('afterTemplateLoad');
    let currentTemplate = template;

    for (const plugin of hooks) {
      if (plugin.hooks?.afterTemplateLoad && this.shouldExecutePlugin(plugin, context)) {
        try {
          currentTemplate = await plugin.hooks.afterTemplateLoad(templateName, currentTemplate, context);
        } catch (error) {
          await this.handlePluginError(plugin, error instanceof Error ? error : new Error(String(error)), context);
        }
      }
    }

    return currentTemplate;
  }

  /**
   * Execute before step generation hooks
   */
  async executeBeforeStepGeneration(step: StepTemplate, context: GenerationContext): Promise<StepTemplate> {
    const hooks = this.getHooks('beforeStepGeneration');
    let currentStep = step;

    for (const plugin of hooks) {
      if (plugin.hooks?.beforeStepGeneration && this.shouldExecutePlugin(plugin, context)) {
        try {
          currentStep = await plugin.hooks.beforeStepGeneration(currentStep, context);
        } catch (error) {
          await this.handlePluginError(plugin, error instanceof Error ? error : new Error(String(error)), context);
        }
      }
    }

    return currentStep;
  }

  /**
   * Execute after step generation hooks
   */
  async executeAfterStepGeneration(step: StepTemplate, context: GenerationContext): Promise<StepTemplate> {
    const hooks = this.getHooks('afterStepGeneration');
    let currentStep = step;

    for (const plugin of hooks) {
      if (plugin.hooks?.afterStepGeneration && this.shouldExecutePlugin(plugin, context)) {
        try {
          currentStep = await plugin.hooks.afterStepGeneration(currentStep, context);
        } catch (error) {
          await this.handlePluginError(plugin, error instanceof Error ? error : new Error(String(error)), context);
        }
      }
    }

    return currentStep;
  }

  /**
   * Execute before job generation hooks
   */
  async executeBeforeJobGeneration(job: JobTemplate, context: GenerationContext): Promise<JobTemplate> {
    const hooks = this.getHooks('beforeJobGeneration');
    let currentJob = job;

    for (const plugin of hooks) {
      if (plugin.hooks?.beforeJobGeneration && this.shouldExecutePlugin(plugin, context)) {
        try {
          currentJob = await plugin.hooks.beforeJobGeneration(currentJob, context);
        } catch (error) {
          await this.handlePluginError(plugin, error instanceof Error ? error : new Error(String(error)), context);
        }
      }
    }

    return currentJob;
  }

  /**
   * Execute after job generation hooks
   */
  async executeAfterJobGeneration(job: JobTemplate, context: GenerationContext): Promise<JobTemplate> {
    const hooks = this.getHooks('afterJobGeneration');
    let currentJob = job;

    for (const plugin of hooks) {
      if (plugin.hooks?.afterJobGeneration && this.shouldExecutePlugin(plugin, context)) {
        try {
          currentJob = await plugin.hooks.afterJobGeneration(currentJob, context);
        } catch (error) {
          await this.handlePluginError(plugin, error instanceof Error ? error : new Error(String(error)), context);
        }
      }
    }

    return currentJob;
  }

  /**
   * Load template using registered providers
   */
  async loadTemplateFromProviders(templateName: string, context: GenerationContext): Promise<WorkflowTemplate | null> {
    const providers = this.getTemplateProviders();

    for (const provider of providers) {
      try {
        const canProvide = await provider.canProvide(templateName, context);
        if (canProvide) {
          return await provider.loadTemplate(templateName, context);
        }
      } catch (error) {
        console.warn(`Template provider '${provider.id}' failed to load template '${templateName}':`, error);
        // Continue to next provider
      }
    }

    return null;
  }

  /**
   * Initialize hook registry
   */
  private initializeHookRegistry(): void {
    const hookTypes: (keyof PluginHooks)[] = [
      'beforeGeneration',
      'afterGeneration',
      'beforeTemplateLoad',
      'afterTemplateLoad',
      'beforeStepGeneration',
      'afterStepGeneration',
      'beforeJobGeneration',
      'afterJobGeneration',
      'onError'
    ];

    for (const hookType of hookTypes) {
      this.hookRegistry.set(hookType, []);
    }
  }

  /**
   * Register hooks for a plugin
   */
  private registerHooks(plugin: Plugin): void {
    if (!plugin.hooks) {return;}

    for (const [hookType, hookFn] of Object.entries(plugin.hooks)) {
      if (hookFn && this.hookRegistry.has(hookType as keyof PluginHooks)) {
        const hooks = this.hookRegistry.get(hookType as keyof PluginHooks)!;
        hooks.push(plugin);
        // Sort by priority (higher priority first)
        hooks.sort((a, b) => b.metadata.priority - a.metadata.priority);
      }
    }
  }

  /**
   * Unregister hooks for a plugin
   */
  private unregisterHooks(plugin: Plugin): void {
    if (!plugin.hooks) {return;}

    for (const hookType of Object.keys(plugin.hooks)) {
      if (this.hookRegistry.has(hookType as keyof PluginHooks)) {
        const hooks = this.hookRegistry.get(hookType as keyof PluginHooks)!;
        const index = hooks.findIndex(p => p.metadata.id === plugin.metadata.id);
        if (index > -1) {
          hooks.splice(index, 1);
        }
      }
    }
  }

  /**
   * Get hooks for a specific type
   */
  private getHooks(hookType: keyof PluginHooks): Plugin[] {
    return this.hookRegistry.get(hookType) || [];
  }

  /**
   * Check if plugin should execute based on context
   */
  private shouldExecutePlugin(plugin: Plugin, context: GenerationContext): boolean {
    if (!plugin.metadata.enabled) {
      return false;
    }

    // Check framework compatibility
    if (plugin.metadata.supportedFrameworks && plugin.metadata.supportedFrameworks.length > 0) {
      const detectedFrameworks = context.detectionResult.frameworks.map(f => f.name.toLowerCase());
      const hasCompatibleFramework = plugin.metadata.supportedFrameworks.some(
        framework => detectedFrameworks.includes(framework.toLowerCase())
      );
      if (!hasCompatibleFramework) {
        return false;
      }
    }

    // Check workflow type compatibility
    if (plugin.metadata.supportedWorkflowTypes && plugin.metadata.supportedWorkflowTypes.length > 0) {
      if (!plugin.metadata.supportedWorkflowTypes.includes(context.options.workflowType)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Handle plugin errors
   */
  private async handlePluginError(plugin: Plugin, error: Error, context: GenerationContext): Promise<void> {
    console.error(`Plugin '${plugin.metadata.id}' error:`, error);

    // Execute error hooks
    if (plugin.hooks?.onError) {
      try {
        await plugin.hooks.onError(error, context);
      } catch (hookError) {
        console.error(`Plugin '${plugin.metadata.id}' error hook failed:`, hookError);
      }
    }

    // Optionally disable plugin on repeated errors
    // This could be implemented with error counting and thresholds
  }

  /**
   * Get plugin statistics
   */
  getStatistics(): {
    totalPlugins: number;
    enabledPlugins: number;
    templateProviders: number;
    hookCounts: Record<string, number>;
  } {
    const enabledPlugins = Array.from(this.plugins.values()).filter(p => p.metadata.enabled);
    const hookCounts: Record<string, number> = {};

    for (const [hookType, plugins] of this.hookRegistry.entries()) {
      hookCounts[hookType] = plugins.filter(p => p.metadata.enabled).length;
    }

    return {
      totalPlugins: this.plugins.size,
      enabledPlugins: enabledPlugins.length,
      templateProviders: this.templateProviders.size,
      hookCounts
    };
  }
}

/**
 * Built-in template providers
 */

/**
 * File system template provider
 */
export class FileSystemTemplateProvider implements TemplateProvider {
  id = 'filesystem';
  name = 'File System Template Provider';
  priority = 100; // Default priority

  constructor(private basePath: string) {}

  async canProvide(templateName: string, context: GenerationContext): Promise<boolean> {
    // Check if template file exists
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const possiblePaths = [
      path.join(this.basePath, `${templateName}.yaml`),
      path.join(this.basePath, `${templateName}.yml`),
      path.join(this.basePath, `${templateName}.json`)
    ];

    for (const templatePath of possiblePaths) {
      try {
        await fs.access(templatePath);
        return true;
      } catch {
        // Continue to next path
      }
    }

    return false;
  }

  async loadTemplate(templateName: string, context: GenerationContext): Promise<WorkflowTemplate> {
    const fs = await import('fs/promises');
    const path = await import('path');
    const yaml = await import('js-yaml');
    
    const possiblePaths = [
      path.join(this.basePath, `${templateName}.yaml`),
      path.join(this.basePath, `${templateName}.yml`),
      path.join(this.basePath, `${templateName}.json`)
    ];

    for (const templatePath of possiblePaths) {
      try {
        const content = await fs.readFile(templatePath, 'utf-8');
        
        if (templatePath.endsWith('.json')) {
          return JSON.parse(content);
        } else {
          return yaml.load(content) as WorkflowTemplate;
        }
      } catch {
        // Continue to next path
      }
    }

    throw new Error(`Template '${templateName}' not found in ${this.basePath}`);
  }

  async listTemplates(context?: GenerationContext): Promise<string[]> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    try {
      const files = await fs.readdir(this.basePath);
      return files
        .filter(file => file.endsWith('.yaml') || file.endsWith('.yml') || file.endsWith('.json'))
        .map(file => path.parse(file).name);
    } catch {
      return [];
    }
  }

  async getTemplateMetadata(templateName: string): Promise<any> {
    return {
      source: 'filesystem',
      path: this.basePath,
      templateName
    };
  }
}

/**
 * HTTP template provider for remote templates
 */
export class HttpTemplateProvider implements TemplateProvider {
  id = 'http';
  name = 'HTTP Template Provider';
  priority = 50;

  constructor(private baseUrl: string, private headers?: Record<string, string>) {}

  async canProvide(templateName: string, context: GenerationContext): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${templateName}`, {
        method: 'HEAD',
        ...(this.headers && { headers: this.headers })
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async loadTemplate(templateName: string, context: GenerationContext): Promise<WorkflowTemplate> {
    const response = await fetch(`${this.baseUrl}/${templateName}`, {
      ...(this.headers && { headers: this.headers })
    });

    if (!response.ok) {
      throw new Error(`Failed to load template '${templateName}' from ${this.baseUrl}: ${response.statusText}`);
    }

    const content = await response.text();
    const yaml = await import('js-yaml');
    
    try {
      return JSON.parse(content);
    } catch {
      return yaml.load(content) as WorkflowTemplate;
    }
  }

  async listTemplates(context?: GenerationContext): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/list`, {
        ...(this.headers && { headers: this.headers })
      });
      
      if (response.ok) {
        return await response.json() as string[];
      }
    } catch {
      // Ignore errors
    }
    
    return [];
  }

  async getTemplateMetadata(templateName: string): Promise<any> {
    return {
      source: 'http',
      baseUrl: this.baseUrl,
      templateName
    };
  }
}