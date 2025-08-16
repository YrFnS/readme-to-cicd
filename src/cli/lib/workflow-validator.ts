/**
 * Workflow Validator
 * 
 * Provides comprehensive validation of existing GitHub Actions workflows,
 * including YAML syntax validation, schema checking, best practice analysis,
 * and workflow update functionality with diff display.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { CLIError } from './types';

/**
 * Workflow validation result
 */
export interface WorkflowValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  /** Workflow file path */
  filePath: string;
  /** Workflow name */
  workflowName: string;
  /** Validation errors found */
  errors: WorkflowValidationError[];
  /** Validation warnings */
  warnings: WorkflowValidationWarning[];
  /** Best practice suggestions */
  suggestions: BestPracticeSuggestion[];
  /** Validation metadata */
  metadata: WorkflowValidationMetadata;
}

/**
 * Workflow validation error
 */
export interface WorkflowValidationError {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  location?: {
    line?: number;
    column?: number;
    path?: string;
  };
  suggestion?: string;
  category: 'syntax' | 'schema' | 'security' | 'performance' | 'best-practice';
}

/**
 * Workflow validation warning
 */
export interface WorkflowValidationWarning {
  code: string;
  message: string;
  suggestion?: string;
  location?: {
    line?: number;
    column?: number;
    path?: string;
  };
  category: 'deprecation' | 'optimization' | 'maintenance' | 'compatibility' | 'best-practice' | 'security';
}

/**
 * Best practice suggestion
 */
export interface BestPracticeSuggestion {
  id: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  category: 'security' | 'performance' | 'maintainability' | 'reliability';
  before?: string;
  after?: string;
  references?: string[];
}

/**
 * Workflow validation metadata
 */
export interface WorkflowValidationMetadata {
  validatedAt: Date;
  validationDuration: number;
  fileSize: number;
  linesOfCode: number;
  workflowComplexity: 'low' | 'medium' | 'high';
  actionCount: number;
  jobCount: number;
  triggerCount: number;
}

/**
 * Workflow update result
 */
export interface WorkflowUpdateResult {
  success: boolean;
  filePath: string;
  changes: WorkflowChange[];
  diff: string;
  backupPath?: string;
  errors: CLIError[];
}

/**
 * Workflow change description
 */
export interface WorkflowChange {
  type: 'add' | 'modify' | 'remove';
  description: string;
  location: string;
  oldValue?: string | undefined;
  newValue?: string | undefined;
  reason: string;
}

/**
 * Validation report
 */
export interface ValidationReport {
  summary: ValidationSummary;
  results: WorkflowValidationResult[];
  recommendations: string[];
  generatedAt: Date;
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
}

/**
 * Validation summary
 */
export interface ValidationSummary {
  overallValid: boolean;
  totalErrors: number;
  totalWarnings: number;
  totalSuggestions: number;
  criticalIssues: number;
  securityIssues: number;
  performanceIssues: number;
}

/**
 * GitHub Actions workflow schema validation
 */
interface GitHubActionsWorkflow {
  name?: string;
  on: any;
  jobs: Record<string, any>;
  env?: Record<string, string>;
  defaults?: any;
  concurrency?: any;
  permissions?: any;
}

/**
 * Workflow Validator class
 */
export class WorkflowValidator {
  private readonly projectRoot: string;
  private readonly knownActions: Set<string>;
  private readonly deprecatedActions: Map<string, string>;
  private readonly securityPatterns: RegExp[];

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.knownActions = new Set();
    this.deprecatedActions = new Map();
    this.securityPatterns = [];
    this.initializeKnownActions();
    this.initializeDeprecatedActions();
    this.initializeSecurityPatterns();
  }

  /**
   * Validate a single workflow file
   */
  public async validateWorkflow(filePath: string): Promise<WorkflowValidationResult> {
    const startTime = Date.now();
    const errors: WorkflowValidationError[] = [];
    const warnings: WorkflowValidationWarning[] = [];
    const suggestions: BestPracticeSuggestion[] = [];

    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        errors.push({
          code: 'FILE_NOT_FOUND',
          message: `Workflow file not found: ${filePath}`,
          severity: 'error',
          category: 'syntax',
          suggestion: 'Verify the file path is correct'
        });
        
        return this.createValidationResult(
          false, filePath, 'Unknown', errors, warnings, suggestions, startTime, 0, 0
        );
      }

      // Read file content
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const fileStats = fs.statSync(filePath);
      const linesOfCode = fileContent.split('\n').length;

      // Parse YAML
      let workflow: GitHubActionsWorkflow;
      try {
        const parsed = yaml.load(fileContent);
        if (!parsed || typeof parsed !== 'object') {
          workflow = {} as GitHubActionsWorkflow;
        } else {
          workflow = parsed as GitHubActionsWorkflow;
        }
      } catch (yamlError) {
        errors.push({
          code: 'YAML_SYNTAX_ERROR',
          message: `YAML syntax error: ${yamlError instanceof Error ? yamlError.message : 'Unknown error'}`,
          severity: 'error',
          category: 'syntax',
          suggestion: 'Fix YAML syntax errors using a YAML validator'
        });
        
        return this.createValidationResult(
          false, filePath, 'Invalid YAML', errors, warnings, suggestions, startTime, fileStats.size, linesOfCode
        );
      }

      const workflowName = workflow.name || path.basename(filePath, '.yml');

      // Validate workflow schema
      await this.validateWorkflowSchema(workflow, filePath, errors, warnings);

      // Validate best practices
      await this.validateBestPractices(workflow, filePath, suggestions, warnings);

      // Validate security practices
      await this.validateSecurityPractices(workflow, fileContent, errors, warnings);

      // Validate performance practices
      await this.validatePerformancePractices(workflow, warnings, suggestions);

      // Calculate complexity
      const complexity = this.calculateWorkflowComplexity(workflow);
      const actionCount = this.countActions(workflow);
      const jobCount = Object.keys(workflow.jobs || {}).length;
      const triggerCount = this.countTriggers(workflow.on);

      const isValid = errors.length === 0;
      return this.createValidationResult(
        isValid, filePath, workflowName, errors, warnings, suggestions, 
        startTime, fileStats.size, linesOfCode, complexity, actionCount, jobCount, triggerCount
      );

    } catch (error) {
      errors.push({
        code: 'VALIDATION_ERROR',
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
        category: 'syntax'
      });

      return this.createValidationResult(
        false, filePath, 'Error', errors, warnings, suggestions, startTime, 0, 0
      );
    }
  }

  /**
   * Validate multiple workflow files
   */
  public async validateWorkflows(workflowPaths: string[]): Promise<ValidationReport> {
    const results: WorkflowValidationResult[] = [];
    
    for (const filePath of workflowPaths) {
      const result = await this.validateWorkflow(filePath);
      results.push(result);
    }

    return this.generateValidationReport(results);
  }

  /**
   * Validate all workflows in .github/workflows directory
   */
  public async validateAllWorkflows(): Promise<ValidationReport> {
    const workflowsDir = path.join(this.projectRoot, '.github', 'workflows');
    
    if (!fs.existsSync(workflowsDir)) {
      return {
        summary: {
          overallValid: true,
          totalErrors: 0,
          totalWarnings: 0,
          totalSuggestions: 0,
          criticalIssues: 0,
          securityIssues: 0,
          performanceIssues: 0
        },
        results: [],
        recommendations: ['No .github/workflows directory found. Consider adding CI/CD workflows.'],
        generatedAt: new Date(),
        totalFiles: 0,
        validFiles: 0,
        invalidFiles: 0
      };
    }

    const workflowFiles = fs.readdirSync(workflowsDir)
      .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'))
      .map(file => path.join(workflowsDir, file));

    return this.validateWorkflows(workflowFiles);
  }  /**
  
 * Update workflow with improvements
   */
  public async updateWorkflow(
    filePath: string, 
    improvements: BestPracticeSuggestion[]
  ): Promise<WorkflowUpdateResult> {
    const errors: CLIError[] = [];
    const changes: WorkflowChange[] = [];

    try {
      // Validate file exists
      if (!fs.existsSync(filePath)) {
        errors.push({
          code: 'FILE_NOT_FOUND',
          message: `Workflow file not found: ${filePath}`,
          category: 'file-system',
          severity: 'error',
          suggestions: ['Verify the file path is correct']
        });
        
        return {
          success: false,
          filePath,
          changes: [],
          diff: '',
          errors
        };
      }

      // Read original content
      const originalContent = fs.readFileSync(filePath, 'utf8');
      let updatedContent = originalContent;

      // Create backup
      const backupPath = `${filePath}.backup.${Date.now()}`;
      fs.writeFileSync(backupPath, originalContent);

      // Apply improvements
      for (const improvement of improvements) {
        const changeResult = await this.applyImprovement(updatedContent, improvement);
        if (changeResult.success) {
          updatedContent = changeResult.content;
          changes.push({
            type: 'modify',
            description: improvement.title,
            location: improvement.id,
            oldValue: improvement.before || undefined,
            newValue: improvement.after || undefined,
            reason: improvement.description
          });
        }
      }

      // Generate diff
      const diff = this.generateDiff(originalContent, updatedContent);

      // Write updated content
      fs.writeFileSync(filePath, updatedContent);

      return {
        success: true,
        filePath,
        changes,
        diff,
        backupPath,
        errors: []
      };

    } catch (error) {
      errors.push({
        code: 'UPDATE_ERROR',
        message: `Failed to update workflow: ${error instanceof Error ? error.message : 'Unknown error'}`,
        category: 'file-system',
        severity: 'error',
        suggestions: ['Check file permissions and disk space']
      });

      return {
        success: false,
        filePath,
        changes: [],
        diff: '',
        errors
      };
    }
  }

  /**
   * Validate workflow schema against GitHub Actions specification
   */
  private async validateWorkflowSchema(
    workflow: GitHubActionsWorkflow,
    filePath: string,
    errors: WorkflowValidationError[],
    warnings: WorkflowValidationWarning[]
  ): Promise<void> {
    // Validate required fields
    if (!workflow.on) {
      errors.push({
        code: 'MISSING_TRIGGER',
        message: 'Workflow must have trigger events defined in "on" field',
        severity: 'error',
        category: 'schema',
        suggestion: 'Add trigger events like "push", "pull_request", or "schedule"'
      });
    }

    if (!workflow.jobs || Object.keys(workflow.jobs).length === 0) {
      errors.push({
        code: 'MISSING_JOBS',
        message: 'Workflow must have at least one job defined',
        severity: 'error',
        category: 'schema',
        suggestion: 'Add at least one job with steps to execute'
      });
    }

    // Validate jobs structure
    if (workflow.jobs) {
      for (const [jobId, job] of Object.entries(workflow.jobs)) {
        this.validateJobSchema(jobId, job, errors, warnings);
      }
    }

    // Validate workflow name
    if (workflow.name && workflow.name.length > 255) {
      warnings.push({
        code: 'LONG_WORKFLOW_NAME',
        message: 'Workflow name is longer than 255 characters',
        category: 'best-practice',
        suggestion: 'Keep workflow names concise and descriptive'
      });
    }
  }

  /**
   * Validate job schema
   */
  private validateJobSchema(
    jobId: string,
    job: any,
    errors: WorkflowValidationError[],
    warnings: WorkflowValidationWarning[]
  ): void {
    // Validate runs-on
    if (!job['runs-on']) {
      errors.push({
        code: 'MISSING_RUNS_ON',
        message: `Job "${jobId}" must specify "runs-on" field`,
        severity: 'error',
        category: 'schema',
        location: { path: `jobs.${jobId}` },
        suggestion: 'Add "runs-on" field with runner type (e.g., "ubuntu-latest")'
      });
    }

    // Validate steps
    if (!job.steps || !Array.isArray(job.steps) || job.steps.length === 0) {
      errors.push({
        code: 'MISSING_STEPS',
        message: `Job "${jobId}" must have at least one step`,
        severity: 'error',
        category: 'schema',
        location: { path: `jobs.${jobId}.steps` },
        suggestion: 'Add steps array with at least one action or command'
      });
    } else {
      // Validate each step
      job.steps.forEach((step: any, index: number) => {
        this.validateStepSchema(jobId, step, index, errors, warnings);
      });
    }
  }

  /**
   * Validate step schema
   */
  private validateStepSchema(
    jobId: string,
    step: any,
    stepIndex: number,
    errors: WorkflowValidationError[],
    warnings: WorkflowValidationWarning[]
  ): void {
    const stepPath = `jobs.${jobId}.steps[${stepIndex}]`;

    // Step must have either 'uses' or 'run'
    if (!step.uses && !step.run) {
      errors.push({
        code: 'INVALID_STEP',
        message: `Step ${stepIndex + 1} in job "${jobId}" must have either "uses" or "run" field`,
        severity: 'error',
        category: 'schema',
        location: { path: stepPath },
        suggestion: 'Add "uses" for actions or "run" for shell commands'
      });
    }

    // Validate action versions
    if (step.uses) {
      this.validateActionVersion(step.uses, stepPath, warnings);
    }

    // Validate step name
    if (!step.name) {
      warnings.push({
        code: 'MISSING_STEP_NAME',
        message: `Step ${stepIndex + 1} in job "${jobId}" should have a descriptive name`,
        category: 'best-practice',
        location: { path: stepPath },
        suggestion: 'Add "name" field with descriptive step name'
      });
    }
  }

  /**
   * Validate action versions
   */
  private validateActionVersion(
    actionUses: string,
    stepPath: string,
    warnings: WorkflowValidationWarning[]
  ): void {
    // Check for deprecated actions - check full action@version string
    if (this.deprecatedActions.has(actionUses)) {
      warnings.push({
        code: 'DEPRECATED_ACTION',
        message: `Action "${actionUses}" is deprecated`,
        category: 'deprecation',
        location: { path: stepPath },
        suggestion: `Use "${this.deprecatedActions.get(actionUses)}" instead`
      });
    }

    // Check for version pinning
    if (!actionUses.includes('@') || actionUses.endsWith('@main') || actionUses.endsWith('@master')) {
      warnings.push({
        code: 'UNPINNED_ACTION_VERSION',
        message: `Action "${actionUses}" should be pinned to a specific version`,
        category: 'best-practice',
        location: { path: stepPath },
        suggestion: 'Pin to specific version (e.g., @v3.1.0) for reproducible builds'
      });
    }
  }

  /**
   * Validate best practices
   */
  private async validateBestPractices(
    workflow: GitHubActionsWorkflow,
    filePath: string,
    suggestions: BestPracticeSuggestion[],
    warnings: WorkflowValidationWarning[]
  ): Promise<void> {
    // Check for concurrency control
    if (!workflow.concurrency && this.hasLongRunningJobs(workflow)) {
      suggestions.push({
        id: 'add-concurrency-control',
        title: 'Add concurrency control',
        description: 'Prevent multiple workflow runs from interfering with each other',
        impact: 'medium',
        effort: 'low',
        category: 'reliability',
        after: 'concurrency:\n  group: ${{ github.workflow }}-${{ github.ref }}\n  cancel-in-progress: true',
        references: ['https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#concurrency']
      });
    }

    // Check for permissions
    if (!workflow.permissions) {
      suggestions.push({
        id: 'add-permissions',
        title: 'Add explicit permissions',
        description: 'Follow principle of least privilege by specifying only required permissions',
        impact: 'high',
        effort: 'low',
        category: 'security',
        after: 'permissions:\n  contents: read\n  # Add other permissions as needed',
        references: ['https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token']
      });
    }

    // Check for environment variables
    this.validateEnvironmentVariables(workflow, suggestions);

    // Check for caching opportunities
    this.validateCachingOpportunities(workflow, suggestions);

    // Check for matrix strategies
    this.validateMatrixStrategies(workflow, suggestions);
  }

  /**
   * Validate security practices
   */
  private async validateSecurityPractices(
    workflow: GitHubActionsWorkflow,
    content: string,
    errors: WorkflowValidationError[],
    warnings: WorkflowValidationWarning[]
  ): Promise<void> {
    // Check for hardcoded secrets
    for (const pattern of this.securityPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        errors.push({
          code: 'HARDCODED_SECRET',
          message: 'Potential hardcoded secret or sensitive data found',
          severity: 'error',
          category: 'security',
          suggestion: 'Use GitHub secrets or environment variables instead'
        });
      }
    }

    // Check for pull_request_target usage
    if (workflow.on && (workflow.on['pull_request_target'] || 
        (Array.isArray(workflow.on) && workflow.on.includes('pull_request_target')))) {
      warnings.push({
        code: 'PULL_REQUEST_TARGET_RISK',
        message: 'pull_request_target trigger can be dangerous with untrusted code',
        category: 'security',
        suggestion: 'Ensure proper validation of external contributions'
      });
    }

    // Check for script injection vulnerabilities
    this.validateScriptInjection(workflow, errors);
  }

  /**
   * Validate performance practices
   */
  private async validatePerformancePractices(
    workflow: GitHubActionsWorkflow,
    warnings: WorkflowValidationWarning[],
    suggestions: BestPracticeSuggestion[]
  ): Promise<void> {
    // Check for parallel job opportunities
    const jobs = Object.keys(workflow.jobs || {});
    if (jobs.length > 1) {
      const hasUnnecessaryDependencies = this.checkUnnecessaryJobDependencies(workflow);
      if (hasUnnecessaryDependencies) {
        suggestions.push({
          id: 'optimize-job-dependencies',
          title: 'Optimize job dependencies',
          description: 'Remove unnecessary job dependencies to enable parallel execution',
          impact: 'medium',
          effort: 'medium',
          category: 'performance'
        });
      }
    }

    // Check for caching opportunities
    if (!this.hasCaching(workflow)) {
      suggestions.push({
        id: 'add-caching',
        title: 'Add dependency caching',
        description: 'Cache dependencies to speed up workflow execution',
        impact: 'high',
        effort: 'low',
        category: 'performance',
        after: '- uses: actions/cache@v3\n  with:\n    path: ~/.npm\n    key: ${{ runner.os }}-node-${{ hashFiles(\'**/package-lock.json\') }}'
      });
    }
  }  /**

   * Generate validation report
   */
  private generateValidationReport(results: WorkflowValidationResult[]): ValidationReport {
    const totalFiles = results.length;
    const validFiles = results.filter(r => r.isValid).length;
    const invalidFiles = totalFiles - validFiles;

    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
    const totalSuggestions = results.reduce((sum, r) => sum + r.suggestions.length, 0);

    const criticalIssues = results.reduce((sum, r) => 
      sum + r.errors.filter(e => e.severity === 'error').length, 0);
    const securityIssues = results.reduce((sum, r) => 
      sum + r.errors.filter(e => e.category === 'security').length, 0);
    const performanceIssues = results.reduce((sum, r) => 
      sum + r.suggestions.filter(s => s.category === 'performance').length, 0);

    const recommendations = this.generateRecommendations(results);

    return {
      summary: {
        overallValid: invalidFiles === 0,
        totalErrors,
        totalWarnings,
        totalSuggestions,
        criticalIssues,
        securityIssues,
        performanceIssues
      },
      results,
      recommendations,
      generatedAt: new Date(),
      totalFiles,
      validFiles,
      invalidFiles
    };
  }

  /**
   * Generate recommendations based on validation results
   */
  private generateRecommendations(results: WorkflowValidationResult[]): string[] {
    const recommendations: string[] = [];

    const invalidFiles = results.filter(r => !r.isValid).length;
    if (invalidFiles > 0) {
      recommendations.push(`Fix ${invalidFiles} invalid workflow file(s) to ensure proper CI/CD execution`);
    }

    const securityIssues = results.reduce((sum, r) => 
      sum + r.errors.filter(e => e.category === 'security').length, 0);
    if (securityIssues > 0) {
      recommendations.push(`Address ${securityIssues} security issue(s) to protect your repository`);
    }

    const performanceOpportunities = results.reduce((sum, r) => 
      sum + r.suggestions.filter(s => s.category === 'performance').length, 0);
    if (performanceOpportunities > 0) {
      recommendations.push(`Consider ${performanceOpportunities} performance optimization(s) to speed up workflows`);
    }

    const deprecationWarnings = results.reduce((sum, r) => 
      sum + r.warnings.filter(w => w.category === 'deprecation').length, 0);
    if (deprecationWarnings > 0) {
      recommendations.push(`Update ${deprecationWarnings} deprecated action(s) to maintain compatibility`);
    }

    if (recommendations.length === 0) {
      recommendations.push('All workflows are valid! Consider implementing suggested improvements for better performance and security.');
    }

    return recommendations;
  }

  /**
   * Apply improvement to workflow content
   */
  private async applyImprovement(
    content: string, 
    improvement: BestPracticeSuggestion
  ): Promise<{ success: boolean; content: string }> {
    try {
      let updatedContent = content;

      // Apply specific improvements based on ID
      switch (improvement.id) {
        case 'add-concurrency-control':
          updatedContent = this.addConcurrencyControl(content);
          break;
        case 'add-permissions':
          updatedContent = this.addPermissions(content);
          break;
        case 'add-caching':
          updatedContent = this.addCaching(content);
          break;
        case 'optimize-job-dependencies':
          updatedContent = this.optimizeJobDependencies(content);
          break;
        default:
          // Generic text replacement if before/after provided
          if (improvement.before && improvement.after) {
            updatedContent = content.replace(improvement.before, improvement.after);
          }
      }

      return {
        success: updatedContent !== content,
        content: updatedContent
      };
    } catch (error) {
      return {
        success: false,
        content
      };
    }
  }

  /**
   * Generate diff between original and updated content
   */
  private generateDiff(original: string, updated: string): string {
    const originalLines = original.split('\n');
    const updatedLines = updated.split('\n');
    const diff: string[] = [];

    let i = 0, j = 0;
    while (i < originalLines.length || j < updatedLines.length) {
      if (i >= originalLines.length) {
        diff.push(`+ ${updatedLines[j]}`);
        j++;
      } else if (j >= updatedLines.length) {
        diff.push(`- ${originalLines[i]}`);
        i++;
      } else if (originalLines[i] === updatedLines[j]) {
        diff.push(`  ${originalLines[i]}`);
        i++;
        j++;
      } else {
        diff.push(`- ${originalLines[i]}`);
        diff.push(`+ ${updatedLines[j]}`);
        i++;
        j++;
      }
    }

    return diff.join('\n');
  }

  /**
   * Helper methods for workflow analysis
   */
  private hasLongRunningJobs(workflow: GitHubActionsWorkflow): boolean {
    if (!workflow.jobs) return false;
    
    return Object.values(workflow.jobs).some((job: any) => {
      if (!job.steps) return false;
      return job.steps.some((step: any) => 
        step.run && (
          step.run.includes('npm install') ||
          step.run.includes('yarn install') ||
          step.run.includes('build') ||
          step.run.includes('test')
        )
      );
    });
  }

  private validateEnvironmentVariables(
    workflow: GitHubActionsWorkflow,
    suggestions: BestPracticeSuggestion[]
  ): void {
    // Check if environment variables are properly organized
    const hasGlobalEnv = !!workflow.env;
    const hasJobEnv = workflow.jobs && Object.values(workflow.jobs).some((job: any) => job.env);
    
    if (!hasGlobalEnv && hasJobEnv) {
      suggestions.push({
        id: 'organize-env-vars',
        title: 'Organize environment variables',
        description: 'Move common environment variables to workflow level',
        impact: 'low',
        effort: 'low',
        category: 'maintainability'
      });
    }
  }

  private validateCachingOpportunities(
    workflow: GitHubActionsWorkflow,
    suggestions: BestPracticeSuggestion[]
  ): void {
    if (!this.hasCaching(workflow) && this.hasPackageManager(workflow)) {
      suggestions.push({
        id: 'add-dependency-caching',
        title: 'Add dependency caching',
        description: 'Cache package manager dependencies to improve build times',
        impact: 'high',
        effort: 'low',
        category: 'performance'
      });
    }
  }

  private validateMatrixStrategies(
    workflow: GitHubActionsWorkflow,
    suggestions: BestPracticeSuggestion[]
  ): void {
    if (!this.hasMatrixStrategy(workflow) && this.couldBenefitFromMatrix(workflow)) {
      suggestions.push({
        id: 'add-matrix-strategy',
        title: 'Consider matrix strategy',
        description: 'Test across multiple environments using matrix strategy',
        impact: 'medium',
        effort: 'medium',
        category: 'reliability'
      });
    }
  }

  private validateScriptInjection(
    workflow: GitHubActionsWorkflow,
    errors: WorkflowValidationError[]
  ): void {
    if (!workflow.jobs) return;

    for (const [jobId, job] of Object.entries(workflow.jobs)) {
      if (!job.steps) continue;
      
      job.steps.forEach((step: any, index: number) => {
        if (step.run && typeof step.run === 'string' && step.run.includes('${{')) {
          // Check for potential script injection
          const dangerousPatterns = [
            /\$\{\{\s*github\.event\.pull_request\.title\s*\}\}/,
            /\$\{\{\s*github\.event\.pull_request\.body\s*\}\}/,
            /\$\{\{\s*github\.event\.head_commit\.message\s*\}\}/
          ];

          for (const pattern of dangerousPatterns) {
            if (pattern.test(step.run)) {
              errors.push({
                code: 'SCRIPT_INJECTION_RISK',
                message: 'Potential script injection vulnerability detected',
                severity: 'error',
                category: 'security',
                location: { path: `jobs.${jobId}.steps[${index}]` },
                suggestion: 'Sanitize user input or use environment variables'
              });
              break; // Only report once per step
            }
          }
        }
      });
    }
  }

  private checkUnnecessaryJobDependencies(workflow: GitHubActionsWorkflow): boolean {
    if (!workflow.jobs) return false;
    
    // Simple heuristic: if all jobs depend on a single job, there might be optimization opportunities
    const jobs = Object.entries(workflow.jobs);
    const dependentJobs = jobs.filter(([, job]) => (job as any).needs);
    
    return dependentJobs.length > 1 && 
           dependentJobs.every(([, job]) => 
             Array.isArray((job as any).needs) ? 
               (job as any).needs.length === 1 : 
               typeof (job as any).needs === 'string'
           );
  }

  private hasCaching(workflow: GitHubActionsWorkflow): boolean {
    if (!workflow.jobs) return false;
    
    return Object.values(workflow.jobs).some((job: any) => 
      job.steps && job.steps.some((step: any) => 
        step.uses && step.uses.includes('actions/cache')
      )
    );
  }

  private hasPackageManager(workflow: GitHubActionsWorkflow): boolean {
    if (!workflow.jobs) return false;
    
    return Object.values(workflow.jobs).some((job: any) => 
      job.steps && job.steps.some((step: any) => 
        step.run && (
          step.run.includes('npm install') ||
          step.run.includes('yarn install') ||
          step.run.includes('pip install') ||
          step.run.includes('bundle install')
        )
      )
    );
  }

  private hasMatrixStrategy(workflow: GitHubActionsWorkflow): boolean {
    if (!workflow.jobs) return false;
    
    return Object.values(workflow.jobs).some((job: any) => 
      job.strategy && job.strategy.matrix
    );
  }

  private couldBenefitFromMatrix(workflow: GitHubActionsWorkflow): boolean {
    if (!workflow.jobs) return false;
    
    // Check if there are multiple similar jobs that could be consolidated
    const jobs = Object.values(workflow.jobs);
    return jobs.length > 1 && jobs.some((job: any) => 
      job['runs-on'] && (
        job['runs-on'].includes('ubuntu') ||
        job['runs-on'].includes('windows') ||
        job['runs-on'].includes('macos')
      )
    );
  }

  private calculateWorkflowComplexity(workflow: GitHubActionsWorkflow): 'low' | 'medium' | 'high' {
    const jobCount = Object.keys(workflow.jobs || {}).length;
    const totalSteps = Object.values(workflow.jobs || {}).reduce((sum, job: any) => 
      sum + (job.steps ? job.steps.length : 0), 0);
    
    if (jobCount <= 2 && totalSteps <= 8) return 'low';
    if (jobCount <= 3 && totalSteps <= 15) return 'medium';
    return 'high';
  }

  private countActions(workflow: GitHubActionsWorkflow): number {
    if (!workflow.jobs) return 0;
    
    return Object.values(workflow.jobs).reduce((sum, job: any) => 
      sum + (job.steps ? job.steps.filter((step: any) => step.uses).length : 0), 0);
  }

  private countTriggers(triggers: any): number {
    if (!triggers) return 0;
    if (typeof triggers === 'string') return 1;
    if (Array.isArray(triggers)) return triggers.length;
    if (typeof triggers === 'object') return Object.keys(triggers).length;
    return 0;
  }

  /**
   * Content modification helpers
   */
  private addConcurrencyControl(content: string): string {
    const concurrencyBlock = `concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true

`;
    
    // Insert after name or at the beginning
    if (content.includes('name:')) {
      return content.replace(/(name:.*\n)/, `$1\n${concurrencyBlock}`);
    } else {
      return concurrencyBlock + content;
    }
  }

  private addPermissions(content: string): string {
    const permissionsBlock = `permissions:
  contents: read

`;
    
    // Insert after name/concurrency or at the beginning
    const insertAfter = content.match(/((?:name|concurrency):.*\n(?:.*\n)*?)(?=on:|jobs:)/);
    if (insertAfter) {
      return content.replace(insertAfter[0], insertAfter[0] + permissionsBlock);
    } else {
      return permissionsBlock + content;
    }
  }

  private addCaching(content: string): string {
    // This is a simplified implementation - in practice, you'd need more sophisticated parsing
    const cacheStep = `      - uses: actions/cache@v3
        with:
          path: ~/.npm
          key: \${{ runner.os }}-node-\${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            \${{ runner.os }}-node-

`;
    
    // Insert cache step after checkout
    return content.replace(
      /(- uses: actions\/checkout@.*\n)/,
      `$1${cacheStep}`
    );
  }

  private optimizeJobDependencies(content: string): string {
    // This would require more sophisticated YAML parsing and modification
    // For now, return content unchanged
    return content;
  }

  /**
   * Initialize known actions, deprecated actions, and security patterns
   */
  private initializeKnownActions(): void {
    // Popular GitHub Actions
    const actions = [
      'actions/checkout',
      'actions/setup-node',
      'actions/setup-python',
      'actions/setup-java',
      'actions/cache',
      'actions/upload-artifact',
      'actions/download-artifact',
      'github/super-linter',
      'codecov/codecov-action'
    ];
    
    actions.forEach(action => this.knownActions.add(action));
  }

  private initializeDeprecatedActions(): void {
    // Map of deprecated actions to their replacements
    this.deprecatedActions.set('actions/setup-node@v1', 'actions/setup-node@v3');
    this.deprecatedActions.set('actions/setup-python@v1', 'actions/setup-python@v4');
    this.deprecatedActions.set('actions/checkout@v1', 'actions/checkout@v3');
    this.deprecatedActions.set('actions/cache@v1', 'actions/cache@v3');
  }

  private initializeSecurityPatterns(): void {
    // Patterns to detect potential security issues
    this.securityPatterns.push(
      /API_KEY\s*=\s*[a-zA-Z0-9_-]+/i,
      /SECRET\s*=\s*[a-zA-Z0-9_-]+/i,
      /password\s*[:=]\s*['"][^'"]+['"]/i,
      /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i,
      /secret\s*[:=]\s*['"][^'"]+['"]/i,
      /token\s*[:=]\s*['"][^'"]+['"]/i,
      /private[_-]?key\s*[:=]\s*['"][^'"]+['"]/i
    );
  }

  /**
   * Create validation result helper
   */
  private createValidationResult(
    isValid: boolean,
    filePath: string,
    workflowName: string,
    errors: WorkflowValidationError[],
    warnings: WorkflowValidationWarning[],
    suggestions: BestPracticeSuggestion[],
    startTime: number,
    fileSize: number,
    linesOfCode: number,
    complexity: 'low' | 'medium' | 'high' = 'low',
    actionCount: number = 0,
    jobCount: number = 0,
    triggerCount: number = 0
  ): WorkflowValidationResult {
    return {
      isValid,
      filePath,
      workflowName,
      errors,
      warnings,
      suggestions,
      metadata: {
        validatedAt: new Date(),
        validationDuration: Date.now() - startTime,
        fileSize,
        linesOfCode,
        workflowComplexity: complexity,
        actionCount,
        jobCount,
        triggerCount
      }
    };
  }
}