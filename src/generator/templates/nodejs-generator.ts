/**
 * Node.js Workflow Generator
 * Generates GitHub Actions workflows for Node.js projects and frameworks
 */

import { DetectionResult, WorkflowOutput, GenerationOptions } from '../interfaces';
import { WorkflowTemplate, StepTemplate } from '../types';
import { TemplateManager } from './template-manager';
import * as yaml from 'yaml';

/**
 * Node.js framework detection information
 */
interface NodeJSFramework {
  name: string;
  version?: string | undefined;
  packageManager: 'npm' | 'yarn' | 'pnpm';
  hasTypeScript: boolean;
  hasLinting: boolean;
  hasTesting: boolean;
  hasCoverage: boolean;
  buildCommand?: string | undefined;
  testCommand?: string | undefined;
  lintCommand?: string | undefined;
  buildOutputPath?: string | undefined;
}

/**
 * Node.js Workflow Generator class
 */
export class NodeJSWorkflowGenerator {
  private templateManager: TemplateManager;

  constructor(templateManager: TemplateManager) {
    this.templateManager = templateManager;
  }

  /**
   * Generate Node.js workflow based on detected frameworks
   */
  async generateWorkflow(detectionResult: DetectionResult, options?: GenerationOptions): Promise<WorkflowOutput> {
    const nodeJSInfo = this.extractNodeJSInfo(detectionResult);
    
    if (!nodeJSInfo) {
      throw new Error('No Node.js framework detected in detection results');
    }

    // Determine the appropriate template based on detected framework
    const templateName = this.selectTemplate(nodeJSInfo);
    
    // Prepare template data
    const templateData = this.prepareTemplateData(nodeJSInfo, options);
    
    // Compile the template
    const compilationResult = await this.templateManager.compileTemplate(templateName, templateData);
    
    if (compilationResult.errors.length > 0) {
      throw new Error(`Template compilation failed: ${compilationResult.errors.join(', ')}`);
    }

    // Convert to YAML
    const yamlContent = this.templateToYAML(compilationResult.template, templateData);
    
    // Generate filename
    const filename = this.generateFilename(nodeJSInfo, options?.workflowType || 'ci');

    return {
      filename,
      content: yamlContent,
      type: options?.workflowType || 'ci',
      metadata: {
        generatedAt: new Date(),
        generatorVersion: '1.0.0',
        detectionSummary: `Node.js ${nodeJSInfo.name} project with ${nodeJSInfo.packageManager}`,
        optimizations: this.getOptimizations(nodeJSInfo),
        warnings: compilationResult.warnings
      }
    };
  }

  /**
   * Extract Node.js information from detection results
   */
  private extractNodeJSInfo(detectionResult: DetectionResult): NodeJSFramework | null {
    // Find Node.js or JavaScript language
    const nodeLanguage = detectionResult.languages.find(lang => 
      lang.name.toLowerCase() === 'javascript' || 
      lang.name.toLowerCase() === 'typescript' ||
      lang.name.toLowerCase() === 'nodejs'
    );

    if (!nodeLanguage) {
      return null;
    }

    // Find Node.js frameworks
    const nodeFrameworks = detectionResult.frameworks.filter(fw => 
      ['react', 'vue', 'angular', 'nextjs', 'express', 'nestjs', 'nodejs'].includes(fw.name.toLowerCase())
    );

    if (nodeFrameworks.length === 0) {
      return null;
    }

    // Get the primary framework (highest confidence)
    const primaryFramework = nodeFrameworks.reduce((prev, current) => 
      current.confidence > prev.confidence ? current : prev
    );

    // Detect package manager
    const packageManager = this.detectPackageManager(detectionResult);
    
    // Detect TypeScript
    const hasTypeScript = detectionResult.languages.some(lang => 
      lang.name.toLowerCase() === 'typescript'
    ) || detectionResult.buildTools.some(tool => 
      tool.name.toLowerCase().includes('typescript')
    );

    // Detect testing frameworks
    const testingFrameworks = detectionResult.testingFrameworks || [];
    const hasTesting = testingFrameworks.length > 0;
    
    // Detect linting
    const hasLinting = detectionResult.buildTools.some(tool => 
      ['eslint', 'prettier', 'tslint'].includes(tool.name.toLowerCase())
    );

    // Detect coverage
    const hasCoverage = testingFrameworks.some(fw => 
      ['jest', 'vitest', 'nyc', 'c8'].includes(fw.name.toLowerCase())
    );

    return {
      name: primaryFramework.name.toLowerCase(),
      version: primaryFramework.version,
      packageManager,
      hasTypeScript,
      hasLinting,
      hasTesting,
      hasCoverage,
      buildCommand: this.getBuildCommand(primaryFramework.name, packageManager),
      testCommand: this.getTestCommand(packageManager, testingFrameworks),
      lintCommand: this.getLintCommand(packageManager, hasLinting),
      buildOutputPath: this.getBuildOutputPath(primaryFramework.name)
    };
  }

  /**
   * Detect package manager from detection results
   */
  private detectPackageManager(detectionResult: DetectionResult): 'npm' | 'yarn' | 'pnpm' {
    const packageManagers = detectionResult.packageManagers || [];
    
    // Check for specific package managers
    if (packageManagers.some(pm => pm.name.toLowerCase() === 'pnpm')) {
      return 'pnpm';
    }
    if (packageManagers.some(pm => pm.name.toLowerCase() === 'yarn')) {
      return 'yarn';
    }
    
    // Default to npm
    return 'npm';
  }

  /**
   * Select appropriate template based on framework
   */
  private selectTemplate(nodeJSInfo: NodeJSFramework): string {
    switch (nodeJSInfo.name) {
      case 'react':
        return 'react-ci';
      case 'vue':
        return 'vue-ci';
      case 'angular':
        return 'angular-ci';
      case 'nextjs':
      case 'next':
        return 'nextjs-ci';
      case 'express':
        return 'express-ci';
      case 'nestjs':
        return 'nestjs-ci';
      default:
        return 'nodejs-ci';
    }
  }

  /**
   * Prepare template data for compilation
   */
  private prepareTemplateData(nodeJSInfo: NodeJSFramework, options?: GenerationOptions): any {
    const nodeVersion = nodeJSInfo.version || '20';
    
    return {
      // Framework info
      framework: nodeJSInfo.name,
      nodeVersion,
      packageManager: nodeJSInfo.packageManager,
      
      // Feature flags
      hasTypeScript: nodeJSInfo.hasTypeScript,
      hasLinting: nodeJSInfo.hasLinting,
      hasTesting: nodeJSInfo.hasTesting,
      hasCoverage: nodeJSInfo.hasCoverage,
      
      // Commands
      installCommand: this.getInstallCommand(nodeJSInfo.packageManager),
      buildCommand: nodeJSInfo.buildCommand,
      testCommand: nodeJSInfo.testCommand,
      lintCommand: nodeJSInfo.lintCommand,
      typeCheckCommand: this.getTypeCheckCommand(nodeJSInfo.packageManager, nodeJSInfo.hasTypeScript),
      
      // Paths
      buildOutputPath: nodeJSInfo.buildOutputPath,
      
      // Options
      includeComments: options?.includeComments ?? true,
      optimizationLevel: options?.optimizationLevel || 'standard',
      securityLevel: options?.securityLevel || 'standard',
      
      // Matrix strategy
      nodeVersions: this.getNodeVersionMatrix(nodeVersion, options?.optimizationLevel),
      
      // Environment variables
      environmentVariables: this.getEnvironmentVariables(nodeJSInfo, options)
    };
  }

  /**
   * Get install command for package manager
   */
  private getInstallCommand(packageManager: 'npm' | 'yarn' | 'pnpm'): string {
    switch (packageManager) {
      case 'yarn':
        return 'yarn install --frozen-lockfile';
      case 'pnpm':
        return 'pnpm install --frozen-lockfile';
      default:
        return 'npm ci';
    }
  }

  /**
   * Get build command for framework
   */
  private getBuildCommand(framework: string, packageManager: 'npm' | 'yarn' | 'pnpm'): string {
    const runCommand = packageManager === 'npm' ? 'npm run' : packageManager;
    
    switch (framework.toLowerCase()) {
      case 'react':
      case 'vue':
      case 'angular':
      case 'nextjs':
      case 'next':
        return `${runCommand} build`;
      case 'express':
      case 'nestjs':
        return `${runCommand} build`;
      default:
        return `${runCommand} build`;
    }
  }

  /**
   * Get test command
   */
  private getTestCommand(packageManager: 'npm' | 'yarn' | 'pnpm', testingFrameworks: any[]): string {
    const runCommand = packageManager === 'npm' ? 'npm run' : packageManager;
    
    // Check for specific test frameworks
    if (testingFrameworks.some(fw => fw.name.toLowerCase() === 'jest')) {
      return `${runCommand} test`;
    }
    if (testingFrameworks.some(fw => fw.name.toLowerCase() === 'vitest')) {
      return `${runCommand} test`;
    }
    
    // Default test command
    return `${runCommand} test`;
  }

  /**
   * Get lint command
   */
  private getLintCommand(packageManager: 'npm' | 'yarn' | 'pnpm', hasLinting: boolean): string {
    if (!hasLinting) {
      return '';
    }
    
    const runCommand = packageManager === 'npm' ? 'npm run' : packageManager;
    return `${runCommand} lint`;
  }

  /**
   * Get type check command
   */
  private getTypeCheckCommand(packageManager: 'npm' | 'yarn' | 'pnpm', hasTypeScript: boolean): string {
    if (!hasTypeScript) {
      return '';
    }
    
    const runCommand = packageManager === 'npm' ? 'npm run' : packageManager;
    return `${runCommand} type-check`;
  }

  /**
   * Get build output path for framework
   */
  private getBuildOutputPath(framework: string): string {
    switch (framework.toLowerCase()) {
      case 'react':
        return 'build/';
      case 'vue':
        return 'dist/';
      case 'angular':
        return 'dist/';
      case 'nextjs':
      case 'next':
        return '.next/';
      default:
        return 'dist/';
    }
  }

  /**
   * Get Node.js version matrix based on optimization level
   */
  private getNodeVersionMatrix(primaryVersion: string, optimizationLevel?: string): string[] {
    const primary = primaryVersion || '20';
    
    switch (optimizationLevel) {
      case 'basic':
        return [primary];
      case 'aggressive':
        return ['18', '20', '22'];
      default: // standard
        return ['18', '20'];
    }
  }

  /**
   * Get environment variables for the workflow
   */
  private getEnvironmentVariables(nodeJSInfo: NodeJSFramework, options?: GenerationOptions): Record<string, string> {
    const env: Record<string, string> = {};
    
    // Common Node.js environment variables
    env.NODE_ENV = 'test';
    
    // Framework-specific environment variables
    if (nodeJSInfo.name === 'react' || nodeJSInfo.name === 'vue') {
      env.CI = 'true';
    }
    
    if (nodeJSInfo.name === 'nextjs') {
      env.NEXT_TELEMETRY_DISABLED = '1';
    }
    
    return env;
  }

  /**
   * Get optimizations applied to the workflow
   */
  private getOptimizations(nodeJSInfo: NodeJSFramework): string[] {
    const optimizations: string[] = [];
    
    optimizations.push(`${nodeJSInfo.packageManager} caching enabled`);
    
    if (nodeJSInfo.hasTypeScript) {
      optimizations.push('TypeScript type checking included');
    }
    
    if (nodeJSInfo.hasLinting) {
      optimizations.push('Code linting included');
    }
    
    if (nodeJSInfo.hasCoverage) {
      optimizations.push('Test coverage reporting enabled');
    }
    
    optimizations.push('Matrix strategy for multiple Node.js versions');
    optimizations.push('Artifact caching for build outputs');
    
    return optimizations;
  }

  /**
   * Convert template to YAML with proper formatting
   */
  private templateToYAML(template: WorkflowTemplate, templateData: any): string {
    // Convert template to GitHub Actions workflow format
    const workflow: any = {
      name: template.name,
      on: template.triggers,
      permissions: template.permissions || { contents: 'read' },
      jobs: {}
    };

    // Add defaults if present
    if (template.defaults) {
      workflow.defaults = template.defaults;
    }

    // Add concurrency if present
    if (template.concurrency) {
      workflow.concurrency = template.concurrency;
    }

    // Convert jobs
    template.jobs.forEach((job, index) => {
      const jobId = job.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      workflow.jobs[jobId] = {
        name: job.name,
        'runs-on': job.runsOn,
        steps: job.steps.map(step => this.processStep(step, templateData)).filter(step => step !== null)
      };

      // Add optional job properties
      if (job.strategy) {
        workflow.jobs[jobId].strategy = job.strategy;
      }
      if (job.needs) {
        workflow.jobs[jobId].needs = job.needs;
      }
      if (job.if) {
        workflow.jobs[jobId].if = job.if;
      }
      if (job.environment) {
        workflow.jobs[jobId].environment = job.environment;
      }
      if (job.permissions) {
        workflow.jobs[jobId].permissions = job.permissions;
      }
      if (job.timeout) {
        workflow.jobs[jobId]['timeout-minutes'] = job.timeout;
      }
    });

    // Convert to YAML with proper formatting
    return yaml.stringify(workflow, {
      indent: 2,
      lineWidth: 120,
      minContentWidth: 0,
      doubleQuotedAsJSON: false
    });
  }

  /**
   * Process individual step with template data
   */
  private processStep(step: StepTemplate, templateData: any): any | null {
    // Check if step should be included based on conditions
    if (step.if) {
      const condition = this.processTemplate(step.if, templateData);
      // Simple condition evaluation - if it's a template variable that evaluates to false, skip the step
      if (condition === 'false' || condition === '' || condition === 'undefined' || condition === 'null') {
        return null;
      }
    }

    const processedStep: any = {
      name: step.name
    };

    // Add uses or run
    if (step.uses) {
      processedStep.uses = step.uses;
    }
    if (step.run) {
      const runCommand = this.processTemplate(step.run, templateData);
      // Skip step if run command is empty after template processing
      if (runCommand.trim() === '' || runCommand.trim() === "''") {
        return null;
      }
      processedStep.run = runCommand;
    }

    // Skip step if it has neither uses nor run
    if (!processedStep.uses && !processedStep.run) {
      return null;
    }

    // Add with parameters
    if (step.with) {
      processedStep.with = {};
      Object.entries(step.with).forEach(([key, value]) => {
        processedStep.with[key] = this.processTemplate(String(value), templateData);
      });
    }

    // Add environment variables
    if (step.env) {
      processedStep.env = {};
      Object.entries(step.env).forEach(([key, value]) => {
        processedStep.env[key] = this.processTemplate(String(value), templateData);
      });
    }

    // Add conditional (after processing)
    if (step.if) {
      const processedCondition = this.processTemplate(step.if, templateData);
      if (processedCondition !== 'false' && processedCondition !== '' && processedCondition !== 'undefined') {
        processedStep.if = processedCondition;
      }
    }

    // Add other properties
    if (step.continueOnError) {
      processedStep['continue-on-error'] = step.continueOnError;
    }
    if (step.timeout) {
      processedStep['timeout-minutes'] = step.timeout;
    }
    if (step.workingDirectory) {
      processedStep['working-directory'] = step.workingDirectory;
    }

    return processedStep;
  }

  /**
   * Process template strings with data substitution
   */
  private processTemplate(template: string, data: any): string {
    let result = template;
    
    // Simple template variable substitution
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      if (result.includes(placeholder)) {
        // Handle boolean values specially
        if (typeof value === 'boolean') {
          result = result.replace(new RegExp(placeholder, 'g'), value ? 'true' : 'false');
        } else {
          result = result.replace(new RegExp(placeholder, 'g'), String(value || ''));
        }
      }
    });

    return result;
  }

  /**
   * Generate appropriate filename for the workflow
   */
  private generateFilename(nodeJSInfo: NodeJSFramework, workflowType: string): string {
    const framework = nodeJSInfo.name;
    const type = workflowType.toLowerCase();
    
    if (framework === 'nodejs') {
      return `${type}.yml`;
    }
    
    return `${framework}-${type}.yml`;
  }
}