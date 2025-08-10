/**
 * Go Workflow Generator
 * Generates GitHub Actions workflows for Go projects and frameworks
 */

import { DetectionResult, WorkflowOutput, GenerationOptions } from '../interfaces';
import { WorkflowTemplate, StepTemplate } from '../types';
import { TemplateManager } from './template-manager';
import * as yaml from 'yaml';

/**
 * Go framework detection information
 */
interface GoFramework {
  name: string;
  version?: string | undefined;
  hasGoMod: boolean;
  hasGoSum: boolean;
  hasVendor: boolean;
  hasLinting: boolean;
  hasTesting: boolean;
  hasBenchmarks: boolean;
  hasRaceDetection: boolean;
  hasCoverage: boolean;
  buildTags?: string[] | undefined;
  buildConstraints?: string[] | undefined;
  buildCommand?: string | undefined;
  testCommand?: string | undefined;
  lintCommand?: string | undefined;
  vetCommand?: string | undefined;
  benchCommand?: string | undefined;
  coverageCommand?: string | undefined;
  webFramework?: 'gin' | 'echo' | 'fiber' | 'gorilla' | 'chi' | null;
  isWebService: boolean;
  hasDockerfile: boolean;
  hasHealthCheck: boolean;
}

/**
 * Go Workflow Generator class
 */
export class GoWorkflowGenerator {
  private templateManager: TemplateManager;

  constructor(templateManager: TemplateManager) {
    this.templateManager = templateManager;
  }

  /**
   * Generate Go workflow based on detected frameworks
   */
  async generateWorkflow(detectionResult: DetectionResult, options?: GenerationOptions): Promise<WorkflowOutput> {
    const goInfo = this.extractGoInfo(detectionResult);
    
    if (!goInfo) {
      throw new Error('No Go framework detected in detection results');
    }

    // Determine the appropriate template based on detected framework
    const templateName = this.selectTemplate(goInfo);
    
    // Prepare template data
    const templateData = this.prepareTemplateData(goInfo, options);
    
    // Compile the template
    const compilationResult = await this.templateManager.compileTemplate(templateName, templateData);
    
    if (compilationResult.errors.length > 0) {
      throw new Error(`Template compilation failed: ${compilationResult.errors.join(', ')}`);
    }

    // Convert to YAML
    const yamlContent = this.templateToYAML(compilationResult.template, templateData);
    
    // Generate filename
    const filename = this.generateFilename(goInfo, options?.workflowType || 'ci');

    return {
      filename,
      content: yamlContent,
      type: options?.workflowType || 'ci',
      metadata: {
        generatedAt: new Date(),
        generatorVersion: '1.0.0',
        detectionSummary: `Go ${goInfo.name} project${goInfo.webFramework ? ` with ${goInfo.webFramework}` : ''}`,
        optimizations: this.getOptimizations(goInfo),
        warnings: compilationResult.warnings
      }
    };
  }

  /**
   * Extract Go information from detection results
   */
  private extractGoInfo(detectionResult: DetectionResult): GoFramework | null {
    // Find Go language
    const goLanguage = detectionResult.languages.find(lang => 
      lang.name.toLowerCase() === 'go' || lang.name.toLowerCase() === 'golang'
    );

    if (!goLanguage) {
      return null;
    }

    // Find Go frameworks
    const goFrameworks = detectionResult.frameworks.filter(fw => 
      ['go', 'golang', 'gin', 'echo', 'fiber', 'gorilla', 'chi'].includes(fw.name.toLowerCase())
    );

    if (goFrameworks.length === 0) {
      // If no specific framework detected, create a generic Go framework entry
      goFrameworks.push({
        name: 'go',
        confidence: 0.8,
        evidence: ['Go language detected'],
        category: 'backend'
      });
    }

    // Get the primary framework (highest confidence)
    const primaryFramework = goFrameworks.reduce((prev, current) => 
      current.confidence > prev.confidence ? current : prev
    );

    // Detect Go module and dependency files
    const moduleInfo = this.detectGoModules(detectionResult);
    
    // Detect testing frameworks and tools
    const testingFrameworks = detectionResult.testingFrameworks || [];
    const hasTesting = testingFrameworks.length > 0 || moduleInfo.hasGoMod; // Go has built-in testing
    
    // Detect linting tools
    const hasLinting = detectionResult.buildTools.some(tool => 
      ['golint', 'golangci-lint', 'staticcheck', 'gofmt', 'goimports'].includes(tool.name.toLowerCase())
    );

    // Detect benchmarking
    const hasBenchmarks = testingFrameworks.some(fw => 
      fw.name.toLowerCase().includes('benchmark') || fw.type === 'performance'
    );

    // Detect coverage tools
    const hasCoverage = testingFrameworks.some(fw => 
      fw.name.toLowerCase().includes('coverage')
    ) || moduleInfo.hasGoMod; // Go has built-in coverage

    // Detect web framework
    const webFramework = this.detectWebFramework(primaryFramework.name, detectionResult);
    const isWebService = webFramework !== null || primaryFramework.category === 'backend';

    // Detect Docker
    const hasDockerfile = detectionResult.deploymentTargets.some(target => 
      target.type === 'container'
    );

    // Detect build constraints and tags
    const buildInfo = this.detectBuildInfo(detectionResult);

    return {
      name: primaryFramework.name.toLowerCase(),
      version: primaryFramework.version || goLanguage.version,
      hasGoMod: moduleInfo.hasGoMod,
      hasGoSum: moduleInfo.hasGoSum,
      hasVendor: moduleInfo.hasVendor,
      hasLinting,
      hasTesting,
      hasBenchmarks,
      hasRaceDetection: true, // Go has built-in race detection
      hasCoverage,
      buildTags: buildInfo.buildTags,
      buildConstraints: buildInfo.buildConstraints,
      buildCommand: this.getBuildCommand(primaryFramework.name, buildInfo),
      testCommand: this.getTestCommand(buildInfo),
      lintCommand: this.getLintCommand(hasLinting),
      vetCommand: this.getVetCommand(),
      benchCommand: this.getBenchCommand(hasBenchmarks),
      coverageCommand: this.getCoverageCommand(hasCoverage),
      webFramework,
      isWebService,
      hasDockerfile,
      hasHealthCheck: isWebService && webFramework !== null
    };
  }

  /**
   * Detect Go modules from detection results
   */
  private detectGoModules(detectionResult: DetectionResult): {
    hasGoMod: boolean;
    hasGoSum: boolean;
    hasVendor: boolean;
  } {
    const packageManagers = detectionResult.packageManagers || [];
    const buildTools = detectionResult.buildTools || [];
    
    // Check for Go modules
    const hasGoMod = packageManagers.some(pm => 
      pm.name.toLowerCase() === 'go modules' || pm.lockFile === 'go.mod'
    ) || buildTools.some(tool => 
      tool.configFile === 'go.mod'
    );

    const hasGoSum = packageManagers.some(pm => 
      pm.lockFile === 'go.sum'
    );

    const hasVendor = buildTools.some(tool => 
      tool.name.toLowerCase().includes('vendor')
    );

    return {
      hasGoMod,
      hasGoSum,
      hasVendor
    };
  }

  /**
   * Detect web framework from detection results
   */
  private detectWebFramework(frameworkName: string, detectionResult: DetectionResult): 'gin' | 'echo' | 'fiber' | 'gorilla' | 'chi' | null {
    const lowerName = frameworkName.toLowerCase();
    
    // Direct framework detection
    if (['gin', 'echo', 'fiber', 'gorilla', 'chi'].includes(lowerName)) {
      return lowerName as 'gin' | 'echo' | 'fiber' | 'gorilla' | 'chi';
    }

    // Check other frameworks for web framework indicators
    const allFrameworks = detectionResult.frameworks || [];
    for (const fw of allFrameworks) {
      const name = fw.name.toLowerCase();
      if (['gin', 'echo', 'fiber', 'gorilla', 'chi'].includes(name)) {
        return name as 'gin' | 'echo' | 'fiber' | 'gorilla' | 'chi';
      }
    }

    return null;
  }

  /**
   * Detect build information (tags, constraints)
   */
  private detectBuildInfo(detectionResult: DetectionResult): {
    buildTags: string[];
    buildConstraints: string[];
  } {
    const buildTools = detectionResult.buildTools || [];
    
    // Look for build tags in build tool configurations
    const buildTags: string[] = [];
    const buildConstraints: string[] = [];

    // Common Go build tags
    const commonTags = ['integration', 'unit', 'e2e', 'dev', 'prod', 'debug', 'release'];
    const commonConstraints = ['linux', 'windows', 'darwin', 'amd64', 'arm64', 'cgo', 'nocgo'];

    // Check if any build tools mention these tags
    buildTools.forEach(tool => {
      if (tool.name.toLowerCase().includes('build')) {
        // Add common tags that might be relevant
        buildTags.push('unit');
        if (detectionResult.testingFrameworks.some(fw => fw.type === 'integration')) {
          buildTags.push('integration');
        }
        if (detectionResult.testingFrameworks.some(fw => fw.type === 'e2e')) {
          buildTags.push('e2e');
        }
      }
    });

    // Add common constraints for cross-platform builds
    buildConstraints.push('linux', 'windows', 'darwin');

    return {
      buildTags: [...new Set(buildTags)], // Remove duplicates
      buildConstraints: [...new Set(buildConstraints)]
    };
  }

  /**
   * Select appropriate template based on framework
   */
  private selectTemplate(goInfo: GoFramework): string {
    if (goInfo.webFramework) {
      switch (goInfo.webFramework) {
        case 'gin':
          return 'gin-ci';
        case 'echo':
          return 'echo-ci';
        case 'fiber':
          return 'fiber-ci';
        case 'gorilla':
          return 'gorilla-ci';
        case 'chi':
          return 'chi-ci';
      }
    }
    
    if (goInfo.isWebService) {
      return 'go-web-ci';
    }
    
    return 'go-ci';
  }  /**

   * Prepare template data for compilation
   */
  private prepareTemplateData(goInfo: GoFramework, options?: GenerationOptions): any {
    const goVersion = goInfo.version || '1.21';
    
    return {
      // Framework info
      framework: goInfo.name,
      goVersion,
      webFramework: goInfo.webFramework,
      
      // Feature flags
      hasGoMod: goInfo.hasGoMod,
      hasGoSum: goInfo.hasGoSum,
      hasVendor: goInfo.hasVendor,
      hasLinting: goInfo.hasLinting,
      hasTesting: goInfo.hasTesting,
      hasBenchmarks: goInfo.hasBenchmarks,
      hasRaceDetection: goInfo.hasRaceDetection,
      hasCoverage: goInfo.hasCoverage,
      isWebService: goInfo.isWebService,
      hasDockerfile: goInfo.hasDockerfile,
      hasHealthCheck: goInfo.hasHealthCheck,
      
      // Build information
      buildTags: goInfo.buildTags || [],
      buildConstraints: goInfo.buildConstraints || [],
      
      // Commands
      buildCommand: goInfo.buildCommand,
      testCommand: goInfo.testCommand,
      lintCommand: goInfo.lintCommand,
      vetCommand: goInfo.vetCommand,
      benchCommand: goInfo.benchCommand,
      coverageCommand: goInfo.coverageCommand,
      
      // Options
      includeComments: options?.includeComments ?? true,
      optimizationLevel: options?.optimizationLevel || 'standard',
      securityLevel: options?.securityLevel || 'standard',
      
      // Matrix strategy
      goVersions: this.getGoVersionMatrix(goVersion, options?.optimizationLevel),
      operatingSystems: this.getOSMatrix(options?.optimizationLevel),
      
      // Environment variables
      environmentVariables: this.getEnvironmentVariables(goInfo, options),
      
      // Web framework specific flags
      isGin: goInfo.webFramework === 'gin',
      isEcho: goInfo.webFramework === 'echo',
      isFiber: goInfo.webFramework === 'fiber',
      isGorilla: goInfo.webFramework === 'gorilla',
      isChi: goInfo.webFramework === 'chi',
      
      // Build optimization flags
      enableCGO: !goInfo.buildConstraints?.includes('nocgo'),
      crossCompile: goInfo.buildConstraints && goInfo.buildConstraints.length > 1,
      
      // Testing flags
      runRaceDetector: goInfo.hasRaceDetection && goInfo.hasTesting,
      generateCoverage: goInfo.hasCoverage && goInfo.hasTesting,
      runBenchmarks: goInfo.hasBenchmarks
    };
  }

  /**
   * Get build command for Go project
   */
  private getBuildCommand(framework: string, buildInfo: { buildTags: string[]; buildConstraints: string[] }): string {
    let command = 'go build';
    
    // Add build tags if present
    if (buildInfo.buildTags && buildInfo.buildTags.length > 0) {
      command += ` -tags "${buildInfo.buildTags.join(',')}"`;
    }
    
    // Add common build flags
    command += ' -v';
    
    // Add output flag for executables
    if (framework !== 'go' || buildInfo.buildTags?.includes('main')) {
      command += ' -o ./bin/app';
    }
    
    // Add build path
    command += ' ./...';
    
    return command;
  }

  /**
   * Get test command
   */
  private getTestCommand(buildInfo: { buildTags: string[]; buildConstraints: string[] }): string {
    let command = 'go test';
    
    // Add build tags for testing
    if (buildInfo.buildTags && buildInfo.buildTags.length > 0) {
      const testTags = buildInfo.buildTags.filter(tag => ['unit', 'integration', 'e2e'].includes(tag));
      if (testTags.length > 0) {
        command += ` -tags "${testTags.join(',')}"`;
      }
    }
    
    // Add common test flags
    command += ' -v -race -coverprofile=coverage.out';
    
    // Add test path
    command += ' ./...';
    
    return command;
  }

  /**
   * Get lint command
   */
  private getLintCommand(hasLinting: boolean): string {
    if (!hasLinting) {
      return 'echo "Linting not configured"';
    }
    
    // Prefer golangci-lint if available, otherwise use basic tools
    return 'golangci-lint run ./...';
  }

  /**
   * Get vet command
   */
  private getVetCommand(): string {
    return 'go vet ./...';
  }

  /**
   * Get benchmark command
   */
  private getBenchCommand(hasBenchmarks: boolean): string {
    if (!hasBenchmarks) {
      return 'echo "Benchmarks not configured"';
    }
    
    return 'go test -bench=. -benchmem ./...';
  }

  /**
   * Get coverage command
   */
  private getCoverageCommand(hasCoverage: boolean): string {
    if (!hasCoverage) {
      return 'echo "Coverage not configured"';
    }
    
    return 'go tool cover -html=coverage.out -o coverage.html';
  }

  /**
   * Get Go version matrix based on optimization level
   */
  private getGoVersionMatrix(primaryVersion: string, optimizationLevel?: string): string[] {
    const primary = primaryVersion || '1.21';
    
    switch (optimizationLevel) {
      case 'basic':
        return [primary];
      case 'aggressive':
        return ['1.19', '1.20', '1.21', '1.22'];
      default: // standard
        return ['1.20', '1.21'];
    }
  }

  /**
   * Get operating system matrix based on optimization level
   */
  private getOSMatrix(optimizationLevel?: string): string[] {
    switch (optimizationLevel) {
      case 'basic':
        return ['ubuntu-latest'];
      case 'aggressive':
        return ['ubuntu-latest', 'windows-latest', 'macos-latest'];
      default: // standard
        return ['ubuntu-latest', 'windows-latest'];
    }
  }

  /**
   * Get environment variables for the workflow
   */
  private getEnvironmentVariables(goInfo: GoFramework, options?: GenerationOptions): Record<string, string> {
    const env: Record<string, string> = {};
    
    // Common Go environment variables
    env.GO111MODULE = 'on';
    env.GOPROXY = 'https://proxy.golang.org,direct';
    env.GOSUMDB = 'sum.golang.org';
    
    // CGO settings
    if (goInfo.buildConstraints?.includes('nocgo')) {
      env.CGO_ENABLED = '0';
    } else {
      env.CGO_ENABLED = '1';
    }
    
    // Web framework specific environment variables
    if (goInfo.webFramework === 'gin') {
      env.GIN_MODE = 'test';
    }
    
    if (goInfo.isWebService) {
      env.PORT = '8080';
      env.HOST = '0.0.0.0';
    }
    
    // Testing environment variables
    if (goInfo.hasTesting) {
      env.GOTESTSUM_FORMAT = 'testname';
    }
    
    return env;
  }

  /**
   * Get optimizations applied to the workflow
   */
  private getOptimizations(goInfo: GoFramework): string[] {
    const optimizations: string[] = [];
    
    if (goInfo.hasGoMod) {
      optimizations.push('Go modules dependency caching enabled');
    }
    
    if (goInfo.hasRaceDetection) {
      optimizations.push('Race condition detection enabled');
    }
    
    if (goInfo.hasLinting) {
      optimizations.push('Code linting with golangci-lint included');
    }
    
    if (goInfo.hasCoverage) {
      optimizations.push('Test coverage reporting enabled');
    }
    
    if (goInfo.hasBenchmarks) {
      optimizations.push('Performance benchmarking included');
    }
    
    optimizations.push('Matrix strategy for multiple Go versions');
    optimizations.push('Go vet static analysis included');
    
    if (goInfo.buildTags && goInfo.buildTags.length > 0) {
      optimizations.push(`Build tags optimization: ${goInfo.buildTags.join(', ')}`);
    }
    
    if (goInfo.webFramework) {
      optimizations.push(`${goInfo.webFramework} web framework optimizations`);
    }
    
    if (goInfo.hasDockerfile) {
      optimizations.push('Docker containerization support');
    }
    
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
      // Simple condition evaluation
      if (condition === 'false' || condition === '' || condition === 'undefined' || condition === 'null' || condition === 'False') {
        return null;
      }
      // Handle complex conditions
      if (condition.includes('false') || condition.includes('undefined') || condition.includes('null') || condition.includes(' && ')) {
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
  private generateFilename(goInfo: GoFramework, workflowType: string): string {
    const framework = goInfo.webFramework || goInfo.name;
    const type = workflowType.toLowerCase();
    
    if (framework === 'go') {
      return `${type}.yml`;
    }
    
    return `${framework}-${type}.yml`;
  }
}