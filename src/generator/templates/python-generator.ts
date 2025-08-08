/**
 * Python Workflow Generator
 * Generates GitHub Actions workflows for Python projects and frameworks
 */

import { DetectionResult, WorkflowOutput, GenerationOptions } from '../interfaces';
import { WorkflowTemplate, StepTemplate } from '../types';
import { TemplateManager } from './template-manager';
import * as yaml from 'yaml';

/**
 * Python framework detection information
 */
interface PythonFramework {
  name: string;
  version?: string | undefined;
  packageManager: 'pip' | 'poetry' | 'pipenv' | 'conda';
  hasRequirementsTxt: boolean;
  hasPoetryLock: boolean;
  hasPipfileLock: boolean;
  hasCondaYml: boolean;
  hasLinting: boolean;
  hasTesting: boolean;
  hasCoverage: boolean;
  hasTypeChecking: boolean;
  buildCommand?: string | undefined;
  testCommand?: string | undefined;
  lintCommand?: string | undefined;
  typeCheckCommand?: string | undefined;
  installCommand?: string | undefined;
  virtualEnvSetup?: string | undefined;
}

/**
 * Python Workflow Generator class
 */
export class PythonWorkflowGenerator {
  private templateManager: TemplateManager;

  constructor(templateManager: TemplateManager) {
    this.templateManager = templateManager;
  }

  /**
   * Generate Python workflow based on detected frameworks
   */
  async generateWorkflow(detectionResult: DetectionResult, options?: GenerationOptions): Promise<WorkflowOutput> {
    const pythonInfo = this.extractPythonInfo(detectionResult);
    
    if (!pythonInfo) {
      throw new Error('No Python framework detected in detection results');
    }

    // Determine the appropriate template based on detected framework
    const templateName = this.selectTemplate(pythonInfo);
    
    // Prepare template data
    const templateData = this.prepareTemplateData(pythonInfo, options);
    
    // Compile the template
    const compilationResult = await this.templateManager.compileTemplate(templateName, templateData);
    
    if (compilationResult.errors.length > 0) {
      throw new Error(`Template compilation failed: ${compilationResult.errors.join(', ')}`);
    }

    // Convert to YAML
    const yamlContent = this.templateToYAML(compilationResult.template, templateData);
    
    // Generate filename
    const filename = this.generateFilename(pythonInfo, options?.workflowType || 'ci');

    return {
      filename,
      content: yamlContent,
      type: options?.workflowType || 'ci',
      metadata: {
        generatedAt: new Date(),
        generatorVersion: '1.0.0',
        detectionSummary: `Python ${pythonInfo.name} project with ${pythonInfo.packageManager}`,
        optimizations: this.getOptimizations(pythonInfo),
        warnings: compilationResult.warnings
      }
    };
  }

  /**
   * Extract Python information from detection results
   */
  private extractPythonInfo(detectionResult: DetectionResult): PythonFramework | null {
    // Find Python language
    const pythonLanguage = detectionResult.languages.find(lang => 
      lang.name.toLowerCase() === 'python'
    );

    if (!pythonLanguage) {
      return null;
    }

    // Find Python frameworks
    const pythonFrameworks = detectionResult.frameworks.filter(fw => 
      ['django', 'flask', 'fastapi', 'python'].includes(fw.name.toLowerCase())
    );

    if (pythonFrameworks.length === 0) {
      // If no specific framework detected, create a generic Python framework entry
      pythonFrameworks.push({
        name: 'python',
        confidence: 0.8,
        evidence: ['Python language detected'],
        category: 'backend'
      });
    }

    // Get the primary framework (highest confidence)
    const primaryFramework = pythonFrameworks.reduce((prev, current) => 
      current.confidence > prev.confidence ? current : prev
    );

    // Detect package manager and dependency files
    const packageManagerInfo = this.detectPackageManager(detectionResult);
    
    // Detect testing frameworks
    const testingFrameworks = detectionResult.testingFrameworks || [];
    const hasTesting = testingFrameworks.length > 0;
    
    // Detect linting tools
    const hasLinting = detectionResult.buildTools.some(tool => 
      ['flake8', 'pylint', 'black', 'isort', 'ruff'].includes(tool.name.toLowerCase())
    );

    // Detect coverage tools
    const hasCoverage = testingFrameworks.some(fw => 
      ['pytest-cov', 'coverage', 'pytest'].includes(fw.name.toLowerCase())
    ) || detectionResult.buildTools.some(tool => 
      ['coverage', 'pytest-cov'].includes(tool.name.toLowerCase())
    );

    // Detect type checking
    const hasTypeChecking = detectionResult.buildTools.some(tool => 
      ['mypy', 'pyright', 'pyre'].includes(tool.name.toLowerCase())
    );

    return {
      name: primaryFramework.name.toLowerCase(),
      version: primaryFramework.version || pythonLanguage.version,
      packageManager: packageManagerInfo.manager,
      hasRequirementsTxt: packageManagerInfo.hasRequirementsTxt,
      hasPoetryLock: packageManagerInfo.hasPoetryLock,
      hasPipfileLock: packageManagerInfo.hasPipfileLock,
      hasCondaYml: packageManagerInfo.hasCondaYml,
      hasLinting,
      hasTesting,
      hasCoverage,
      hasTypeChecking,
      buildCommand: this.getBuildCommand(primaryFramework.name, packageManagerInfo.manager),
      testCommand: this.getTestCommand(packageManagerInfo.manager, testingFrameworks),
      lintCommand: this.getLintCommand(packageManagerInfo.manager, hasLinting),
      typeCheckCommand: this.getTypeCheckCommand(packageManagerInfo.manager, hasTypeChecking),
      installCommand: this.getInstallCommand(packageManagerInfo.manager),
      virtualEnvSetup: this.getVirtualEnvSetup(packageManagerInfo.manager)
    };
  }

  /**
   * Detect package manager from detection results
   */
  private detectPackageManager(detectionResult: DetectionResult): {
    manager: 'pip' | 'poetry' | 'pipenv' | 'conda';
    hasRequirementsTxt: boolean;
    hasPoetryLock: boolean;
    hasPipfileLock: boolean;
    hasCondaYml: boolean;
  } {
    const packageManagers = detectionResult.packageManagers || [];
    
    // Check for specific package managers and their lock files
    const hasPoetryLock = packageManagers.some(pm => 
      pm.name.toLowerCase() === 'poetry' || pm.lockFile === 'poetry.lock'
    );
    const hasPipfileLock = packageManagers.some(pm => 
      pm.name.toLowerCase() === 'pipenv' || pm.lockFile === 'Pipfile.lock'
    );
    const hasCondaYml = packageManagers.some(pm => 
      pm.name.toLowerCase() === 'conda' || pm.lockFile?.includes('environment.yml')
    );
    const hasRequirementsTxt = packageManagers.some(pm => 
      pm.lockFile === 'requirements.txt'
    );

    // Determine primary package manager
    let manager: 'pip' | 'poetry' | 'pipenv' | 'conda' = 'pip';
    
    if (hasPoetryLock) {
      manager = 'poetry';
    } else if (hasPipfileLock) {
      manager = 'pipenv';
    } else if (hasCondaYml) {
      manager = 'conda';
    }

    return {
      manager,
      hasRequirementsTxt,
      hasPoetryLock,
      hasPipfileLock,
      hasCondaYml
    };
  }

  /**
   * Select appropriate template based on framework
   */
  private selectTemplate(pythonInfo: PythonFramework): string {
    switch (pythonInfo.name) {
      case 'django':
        return 'django-ci';
      case 'flask':
        return 'flask-ci';
      case 'fastapi':
        return 'fastapi-ci';
      default:
        return 'python-ci';
    }
  }

  /**
   * Prepare template data for compilation
   */
  private prepareTemplateData(pythonInfo: PythonFramework, options?: GenerationOptions): any {
    const pythonVersion = pythonInfo.version || '3.11';
    
    return {
      // Framework info
      framework: pythonInfo.name,
      pythonVersion,
      packageManager: pythonInfo.packageManager,
      
      // Feature flags
      hasRequirementsTxt: pythonInfo.hasRequirementsTxt,
      hasPoetryLock: pythonInfo.hasPoetryLock,
      hasPipfileLock: pythonInfo.hasPipfileLock,
      hasCondaYml: pythonInfo.hasCondaYml,
      hasLinting: pythonInfo.hasLinting,
      hasTesting: pythonInfo.hasTesting,
      hasCoverage: pythonInfo.hasCoverage,
      hasTypeChecking: pythonInfo.hasTypeChecking,
      
      // Commands
      installCommand: pythonInfo.installCommand,
      buildCommand: pythonInfo.buildCommand,
      testCommand: pythonInfo.testCommand,
      lintCommand: pythonInfo.lintCommand,
      typeCheckCommand: pythonInfo.typeCheckCommand,
      virtualEnvSetup: pythonInfo.virtualEnvSetup,
      
      // Options
      includeComments: options?.includeComments ?? true,
      optimizationLevel: options?.optimizationLevel || 'standard',
      securityLevel: options?.securityLevel || 'standard',
      
      // Matrix strategy - convert array to YAML-compatible format
      pythonVersions: this.getPythonVersionMatrix(pythonVersion, options?.optimizationLevel),
      
      // Environment variables
      environmentVariables: this.getEnvironmentVariables(pythonInfo, options),
      
      // Django-specific
      isDjango: pythonInfo.name === 'django',
      hasManagePy: pythonInfo.name === 'django',
      
      // FastAPI-specific
      isFastAPI: pythonInfo.name === 'fastapi',
      hasAsyncSupport: pythonInfo.name === 'fastapi',
      
      // Flask-specific
      isFlask: pythonInfo.name === 'flask',
      hasWSGI: pythonInfo.name === 'flask' || pythonInfo.name === 'django'
    };
  }

  /**
   * Get virtual environment setup command
   */
  private getVirtualEnvSetup(packageManager: 'pip' | 'poetry' | 'pipenv' | 'conda'): string {
    switch (packageManager) {
      case 'poetry':
        return 'poetry env use python';
      case 'pipenv':
        return 'pipenv install --dev';
      case 'conda':
        return 'conda env create -f environment.yml';
      default:
        return 'python -m venv venv && source venv/bin/activate';
    }
  }

  /**
   * Get install command for package manager
   */
  private getInstallCommand(packageManager: 'pip' | 'poetry' | 'pipenv' | 'conda'): string {
    switch (packageManager) {
      case 'poetry':
        return 'poetry install';
      case 'pipenv':
        return 'pipenv install --dev';
      case 'conda':
        return 'conda env update -f environment.yml';
      default:
        return 'python -m pip install --upgrade pip && pip install -r requirements.txt';
    }
  }

  /**
   * Get build command for framework
   */
  private getBuildCommand(framework: string, packageManager: 'pip' | 'poetry' | 'pipenv' | 'conda'): string {
    const runPrefix = packageManager === 'poetry' ? 'poetry run' : 
                     packageManager === 'pipenv' ? 'pipenv run' : '';
    
    switch (framework.toLowerCase()) {
      case 'django':
        return `${runPrefix} python manage.py collectstatic --noinput`.trim();
      case 'flask':
        return `${runPrefix} python -m flask build`.trim();
      case 'fastapi':
        return ''; // FastAPI typically doesn't have a build step
      default:
        return `${runPrefix} python setup.py build`.trim();
    }
  }

  /**
   * Get test command
   */
  private getTestCommand(packageManager: 'pip' | 'poetry' | 'pipenv' | 'conda', testingFrameworks: any[]): string {
    const runPrefix = packageManager === 'poetry' ? 'poetry run' : 
                     packageManager === 'pipenv' ? 'pipenv run' : '';
    
    // Check for specific test frameworks
    if (testingFrameworks.some(fw => fw.name.toLowerCase() === 'pytest')) {
      return `${runPrefix} python -m pytest`.trim();
    }
    if (testingFrameworks.some(fw => fw.name.toLowerCase() === 'unittest')) {
      return `${runPrefix} python -m unittest discover`.trim();
    }
    
    // Default test command
    return `${runPrefix} python -m pytest`.trim();
  }

  /**
   * Get lint command
   */
  private getLintCommand(packageManager: 'pip' | 'poetry' | 'pipenv' | 'conda', hasLinting: boolean): string {
    if (!hasLinting) {
      return 'echo "Linting not configured"';
    }
    
    const runPrefix = packageManager === 'poetry' ? 'poetry run' : 
                     packageManager === 'pipenv' ? 'pipenv run' : '';
    
    return `${runPrefix} python -m flake8`.trim();
  }

  /**
   * Get type check command
   */
  private getTypeCheckCommand(packageManager: 'pip' | 'poetry' | 'pipenv' | 'conda', hasTypeChecking: boolean): string {
    if (!hasTypeChecking) {
      return 'echo "Type checking not configured"';
    }
    
    const runPrefix = packageManager === 'poetry' ? 'poetry run' : 
                     packageManager === 'pipenv' ? 'pipenv run' : '';
    
    return `${runPrefix} python -m mypy .`.trim();
  }

  /**
   * Get Python version matrix based on optimization level
   */
  private getPythonVersionMatrix(primaryVersion: string, optimizationLevel?: string): string[] {
    const primary = primaryVersion || '3.11';
    
    switch (optimizationLevel) {
      case 'basic':
        return [primary];
      case 'aggressive':
        return ['3.8', '3.9', '3.10', '3.11', '3.12'];
      default: // standard
        return ['3.10', '3.11'];
    }
  }

  /**
   * Get environment variables for the workflow
   */
  private getEnvironmentVariables(pythonInfo: PythonFramework, options?: GenerationOptions): Record<string, string> {
    const env: Record<string, string> = {};
    
    // Common Python environment variables
    env.PYTHONPATH = '.';
    env.PYTHONDONTWRITEBYTECODE = '1';
    
    // Framework-specific environment variables
    if (pythonInfo.name === 'django') {
      env.DJANGO_SETTINGS_MODULE = 'settings.test';
      env.SECRET_KEY = 'test-secret-key';
    }
    
    if (pythonInfo.name === 'flask') {
      env.FLASK_ENV = 'testing';
    }
    
    if (pythonInfo.name === 'fastapi') {
      env.TESTING = 'true';
    }
    
    return env;
  }

  /**
   * Get optimizations applied to the workflow
   */
  private getOptimizations(pythonInfo: PythonFramework): string[] {
    const optimizations: string[] = [];
    
    optimizations.push(`${pythonInfo.packageManager} dependency caching enabled`);
    
    if (pythonInfo.hasTypeChecking) {
      optimizations.push('Type checking with mypy included');
    }
    
    if (pythonInfo.hasLinting) {
      optimizations.push('Code linting with flake8 included');
    }
    
    if (pythonInfo.hasCoverage) {
      optimizations.push('Test coverage reporting enabled');
    }
    
    optimizations.push('Matrix strategy for multiple Python versions');
    optimizations.push('Virtual environment setup and caching');
    
    if (pythonInfo.packageManager === 'poetry') {
      optimizations.push('Poetry dependency management optimized');
    } else if (pythonInfo.packageManager === 'pipenv') {
      optimizations.push('Pipenv virtual environment optimized');
    }
    
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
      // Handle complex conditions like "{{isDjango}} && {{buildCommand}}"
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
  private generateFilename(pythonInfo: PythonFramework, workflowType: string): string {
    const framework = pythonInfo.name;
    const type = workflowType.toLowerCase();
    
    if (framework === 'python') {
      return `${type}.yml`;
    }
    
    return `${framework}-${type}.yml`;
  }
}