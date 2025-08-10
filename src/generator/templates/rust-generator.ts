/**
 * Rust Workflow Generator
 * Generates GitHub Actions workflows for Rust projects and frameworks
 */

import { DetectionResult, WorkflowOutput, GenerationOptions } from '../interfaces';
import { WorkflowTemplate, StepTemplate } from '../types';
import { TemplateManager } from './template-manager';
import * as yaml from 'yaml';

/**
 * Rust framework detection information
 */
interface RustFramework {
  name: string;
  version?: string | undefined;
  toolchain: 'stable' | 'beta' | 'nightly';
  hasWorkspace: boolean;
  hasLinting: boolean;
  hasTesting: boolean;
  hasCoverage: boolean;
  hasClippy: boolean;
  hasFmt: boolean;
  buildCommand?: string | undefined;
  testCommand?: string | undefined;
  lintCommand?: string | undefined;
  clippyCommand?: string | undefined;
  fmtCommand?: string | undefined;
  workspaceMembers?: string[] | undefined;
  targetTriple?: string | undefined;
}

/**
 * Rust Workflow Generator class
 */
export class RustWorkflowGenerator {
  private templateManager: TemplateManager;

  constructor(templateManager: TemplateManager) {
    this.templateManager = templateManager;
  }

  /**
   * Generate Rust workflow based on detected frameworks
   */
  async generateWorkflow(detectionResult: DetectionResult, options?: GenerationOptions): Promise<WorkflowOutput> {
    const rustInfo = this.extractRustInfo(detectionResult);
    
    if (!rustInfo) {
      throw new Error('No Rust framework detected in detection results');
    }

    // Determine the appropriate template based on detected framework
    const templateName = this.selectTemplate(rustInfo);
    
    // Prepare template data
    const templateData = this.prepareTemplateData(rustInfo, options);
    
    // Compile the template
    const compilationResult = await this.templateManager.compileTemplate(templateName, templateData);
    
    if (compilationResult.errors.length > 0) {
      throw new Error(`Template compilation failed: ${compilationResult.errors.join(', ')}`);
    }

    // Convert to YAML
    const yamlContent = this.templateToYAML(compilationResult.template, templateData);
    
    // Generate filename
    const filename = this.generateFilename(rustInfo, options?.workflowType || 'ci');

    return {
      filename,
      content: yamlContent,
      type: options?.workflowType || 'ci',
      metadata: {
        generatedAt: new Date(),
        generatorVersion: '1.0.0',
        detectionSummary: `Rust ${rustInfo.name} project with ${rustInfo.toolchain} toolchain`,
        optimizations: this.getOptimizations(rustInfo),
        warnings: compilationResult.warnings
      }
    };
  }

  /**
   * Extract Rust information from detection results
   */
  private extractRustInfo(detectionResult: DetectionResult): RustFramework | null {
    // Find Rust language
    const rustLanguage = detectionResult.languages.find(lang => 
      lang.name.toLowerCase() === 'rust'
    );

    if (!rustLanguage) {
      return null;
    }

    // Find Rust frameworks
    const rustFrameworks = detectionResult.frameworks.filter(fw => 
      ['rust', 'actix', 'actix-web', 'rocket', 'warp', 'axum', 'tokio'].includes(fw.name.toLowerCase())
    );

    if (rustFrameworks.length === 0) {
      // If no specific framework detected, create a generic Rust framework entry
      rustFrameworks.push({
        name: 'rust',
        confidence: 0.8,
        evidence: ['Rust language detected'],
        category: 'backend'
      });
    }

    // Get the primary framework (highest confidence)
    const primaryFramework = rustFrameworks.reduce((prev, current) => 
      current.confidence > prev.confidence ? current : prev
    );

    // Detect toolchain version
    const toolchain = this.detectToolchain(detectionResult, rustLanguage.version);
    
    // Detect workspace configuration
    const hasWorkspace = this.detectWorkspace(detectionResult);
    
    // Detect testing frameworks
    const testingFrameworks = detectionResult.testingFrameworks || [];
    const hasTesting = testingFrameworks.length > 0 || this.hasDefaultTesting(detectionResult);
    
    // Detect linting and formatting tools
    const hasClippy = detectionResult.buildTools.some(tool => 
      tool.name.toLowerCase() === 'clippy'
    ) || this.hasDefaultClippy(detectionResult);

    const hasFmt = detectionResult.buildTools.some(tool => 
      tool.name.toLowerCase() === 'rustfmt'
    ) || this.hasDefaultFmt(detectionResult);

    const hasLinting = hasClippy || hasFmt;

    // Detect coverage tools
    const hasCoverage = testingFrameworks.some(fw => 
      ['tarpaulin', 'grcov', 'kcov'].includes(fw.name.toLowerCase())
    ) || detectionResult.buildTools.some(tool => 
      ['tarpaulin', 'grcov', 'kcov'].includes(tool.name.toLowerCase())
    );

    // Extract workspace members if workspace is detected
    const workspaceMembers = hasWorkspace ? this.extractWorkspaceMembers(detectionResult) : undefined;

    return {
      name: primaryFramework.name.toLowerCase(),
      version: primaryFramework.version || rustLanguage.version,
      toolchain,
      hasWorkspace,
      hasLinting,
      hasTesting,
      hasCoverage,
      hasClippy,
      hasFmt,
      buildCommand: this.getBuildCommand(primaryFramework.name, hasWorkspace),
      testCommand: this.getTestCommand(hasWorkspace, testingFrameworks),
      lintCommand: this.getLintCommand(hasClippy, hasFmt),
      clippyCommand: this.getClippyCommand(hasWorkspace),
      fmtCommand: this.getFmtCommand(hasWorkspace),
      workspaceMembers,
      targetTriple: this.getTargetTriple(detectionResult)
    };
  }

  /**
   * Detect Rust toolchain from detection results
   */
  private detectToolchain(detectionResult: DetectionResult, rustVersion?: string): 'stable' | 'beta' | 'nightly' {
    // Check for rust-toolchain file or specific version indicators
    const buildTools = detectionResult.buildTools || [];
    
    // Look for nightly features
    if (buildTools.some(tool => tool.name.toLowerCase().includes('nightly'))) {
      return 'nightly';
    }
    
    // Look for beta features
    if (buildTools.some(tool => tool.name.toLowerCase().includes('beta'))) {
      return 'beta';
    }
    
    // Check version string for channel indicators
    if (rustVersion) {
      if (rustVersion.includes('nightly')) return 'nightly';
      if (rustVersion.includes('beta')) return 'beta';
    }
    
    // Default to stable
    return 'stable';
  }

  /**
   * Detect if project uses Cargo workspace
   */
  private detectWorkspace(detectionResult: DetectionResult): boolean {
    // Look for workspace indicators in build tools or package managers
    const packageManagers = detectionResult.packageManagers || [];
    return packageManagers.some(pm => 
      pm.name.toLowerCase() === 'cargo' && 
      (pm.lockFile?.includes('workspace') || false)
    );
  }

  /**
   * Check if project has default Rust testing (built-in)
   */
  private hasDefaultTesting(detectionResult: DetectionResult): boolean {
    // Rust has built-in testing, so assume true if Rust is detected
    return true;
  }

  /**
   * Check if project has default Clippy (usually available)
   */
  private hasDefaultClippy(detectionResult: DetectionResult): boolean {
    // Clippy is usually available with Rust installations
    return true;
  }

  /**
   * Check if project has default rustfmt (usually available)
   */
  private hasDefaultFmt(detectionResult: DetectionResult): boolean {
    // rustfmt is usually available with Rust installations
    return true;
  }

  /**
   * Extract workspace members from detection results
   */
  private extractWorkspaceMembers(detectionResult: DetectionResult): string[] {
    // This would typically be extracted from Cargo.toml parsing
    // For now, return a default set
    return ['*'];
  }

  /**
   * Get target triple for cross-compilation
   */
  private getTargetTriple(detectionResult: DetectionResult): string | undefined {
    // Look for cross-compilation targets in build tools
    const buildTools = detectionResult.buildTools || [];
    const crossTarget = buildTools.find(tool => 
      tool.name.toLowerCase().includes('target') || 
      tool.name.toLowerCase().includes('cross')
    );
    
    return crossTarget?.name || undefined;
  }

  /**
   * Select appropriate template based on framework
   */
  private selectTemplate(rustInfo: RustFramework): string {
    switch (rustInfo.name) {
      case 'actix':
      case 'actix-web':
        return 'actix-ci';
      case 'rocket':
        return 'rocket-ci';
      case 'warp':
        return 'warp-ci';
      case 'axum':
        return 'axum-ci';
      default:
        return 'rust-ci';
    }
  }

  /**
   * Prepare template data for compilation
   */
  private prepareTemplateData(rustInfo: RustFramework, options?: GenerationOptions): any {
    const rustVersion = rustInfo.version || '1.70.0';
    
    return {
      // Framework info
      framework: rustInfo.name,
      rustVersion,
      toolchain: rustInfo.toolchain,
      
      // Feature flags
      hasWorkspace: rustInfo.hasWorkspace,
      hasLinting: rustInfo.hasLinting,
      hasTesting: rustInfo.hasTesting,
      hasCoverage: rustInfo.hasCoverage,
      hasClippy: rustInfo.hasClippy,
      hasFmt: rustInfo.hasFmt,
      
      // Commands
      buildCommand: rustInfo.buildCommand,
      testCommand: rustInfo.testCommand,
      lintCommand: rustInfo.lintCommand,
      clippyCommand: rustInfo.clippyCommand,
      fmtCommand: rustInfo.fmtCommand,
      
      // Workspace info
      workspaceMembers: rustInfo.workspaceMembers,
      targetTriple: rustInfo.targetTriple,
      
      // Options
      includeComments: options?.includeComments ?? true,
      optimizationLevel: options?.optimizationLevel || 'standard',
      securityLevel: options?.securityLevel || 'standard',
      
      // Matrix strategy - convert array to YAML-compatible format
      rustVersions: this.getRustVersionMatrix(rustVersion, options?.optimizationLevel),
      
      // Environment variables
      environmentVariables: this.getEnvironmentVariables(rustInfo, options),
      
      // Framework-specific flags
      isActix: rustInfo.name === 'actix' || rustInfo.name === 'actix-web',
      isRocket: rustInfo.name === 'rocket',
      isWarp: rustInfo.name === 'warp',
      isAxum: rustInfo.name === 'axum',
      
      // Web framework detection
      isWebFramework: ['actix', 'actix-web', 'rocket', 'warp', 'axum'].includes(rustInfo.name)
    };
  }

  /**
   * Get build command for framework
   */
  private getBuildCommand(framework: string, hasWorkspace: boolean): string {
    const workspaceFlag = hasWorkspace ? '--workspace' : '';
    
    switch (framework.toLowerCase()) {
      case 'actix':
      case 'actix-web':
      case 'rocket':
      case 'warp':
      case 'axum':
        return `cargo build --release ${workspaceFlag}`.trim();
      default:
        return `cargo build ${workspaceFlag}`.trim();
    }
  }

  /**
   * Get test command
   */
  private getTestCommand(hasWorkspace: boolean, testingFrameworks: any[]): string {
    const workspaceFlag = hasWorkspace ? '--workspace' : '';
    
    // Check for specific test frameworks
    if (testingFrameworks.some(fw => fw.name.toLowerCase() === 'nextest')) {
      return `cargo nextest run ${workspaceFlag}`.trim();
    }
    
    // Default test command
    return `cargo test ${workspaceFlag}`.trim();
  }

  /**
   * Get lint command (combines clippy and fmt)
   */
  private getLintCommand(hasClippy: boolean, hasFmt: boolean): string {
    const commands: string[] = [];
    
    if (hasFmt) {
      commands.push('cargo fmt --check');
    }
    
    if (hasClippy) {
      commands.push('cargo clippy -- -D warnings');
    }
    
    return commands.join(' && ') || 'echo "No linting configured"';
  }

  /**
   * Get clippy command
   */
  private getClippyCommand(hasWorkspace: boolean): string {
    const workspaceFlag = hasWorkspace ? '--workspace' : '';
    return `cargo clippy ${workspaceFlag} -- -D warnings`.trim();
  }

  /**
   * Get rustfmt command
   */
  private getFmtCommand(hasWorkspace: boolean): string {
    return 'cargo fmt --check';
  }

  /**
   * Get Rust version matrix based on optimization level
   */
  private getRustVersionMatrix(primaryVersion: string, optimizationLevel?: string): string[] {
    const primary = primaryVersion || '1.70.0';
    
    switch (optimizationLevel) {
      case 'basic':
        return [primary];
      case 'aggressive':
        return ['1.65.0', '1.70.0', '1.75.0', 'stable'];
      default: // standard
        return ['1.70.0', 'stable'];
    }
  }

  /**
   * Get environment variables for the workflow
   */
  private getEnvironmentVariables(rustInfo: RustFramework, options?: GenerationOptions): Record<string, string> {
    const env: Record<string, string> = {};
    
    // Common Rust environment variables
    env.CARGO_TERM_COLOR = 'always';
    env.RUST_BACKTRACE = '1';
    
    // Framework-specific environment variables
    if (rustInfo.name === 'rocket') {
      env.ROCKET_ENV = 'testing';
    }
    
    if (rustInfo.name === 'actix' || rustInfo.name === 'actix-web') {
      env.ACTIX_TEST = 'true';
    }
    
    // Coverage-specific environment variables
    if (rustInfo.hasCoverage) {
      env.CARGO_INCREMENTAL = '0';
      env.RUSTFLAGS = '-Cinstrument-coverage';
      env.LLVM_PROFILE_FILE = 'cargo-test-%p-%m.profraw';
    }
    
    return env;
  }

  /**
   * Get optimizations applied to the workflow
   */
  private getOptimizations(rustInfo: RustFramework): string[] {
    const optimizations: string[] = [];
    
    optimizations.push('Cargo dependency caching enabled');
    optimizations.push('Cargo target directory caching enabled');
    
    if (rustInfo.hasClippy) {
      optimizations.push('Clippy linting included');
    }
    
    if (rustInfo.hasFmt) {
      optimizations.push('Rustfmt formatting checks included');
    }
    
    if (rustInfo.hasCoverage) {
      optimizations.push('Code coverage reporting enabled');
    }
    
    if (rustInfo.hasWorkspace) {
      optimizations.push('Workspace-aware builds and testing');
    }
    
    optimizations.push('Matrix strategy for multiple Rust versions');
    optimizations.push('Incremental compilation optimizations');
    
    return optimizations;
  }  /**

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
      if (condition === 'false' || condition === '' || condition === 'undefined' || condition === 'null' || condition === 'False') {
        return null;
      }
      // Handle complex conditions like "{{hasClippy}} && {{buildCommand}}"
      if (condition.includes('false') || condition.includes('undefined') || condition.includes('null') || condition.includes(' && ')) {
        // For complex conditions, if any part is false/empty, skip the step
        const parts = condition.split('&&').map(p => p.trim());
        if (parts.some(part => part === 'false' || part === '' || part === 'undefined' || part === 'null')) {
          return null;
        }
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
        } else if (Array.isArray(value)) {
          // Handle arrays by converting to YAML array format
          const yamlArray = '[' + value.map(v => `"${v}"`).join(', ') + ']';
          result = result.replace(new RegExp(placeholder, 'g'), yamlArray);
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
  private generateFilename(rustInfo: RustFramework, workflowType: string): string {
    const framework = rustInfo.name;
    const type = workflowType.toLowerCase();
    
    if (framework === 'rust') {
      return `${type}.yml`;
    }
    
    return `${framework}-${type}.yml`;
  }
}