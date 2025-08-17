import * as vscode from 'vscode';
import * as yaml from 'yaml';
import { 
  WorkflowValidationResult, 
  ValidationError, 
  ValidationSeverity,
  WorkflowFile,
  DetectedFramework,
  QuickFixSuggestion
} from './types';
import { YAMLValidationService } from './YAMLValidationService';

/**
 * Comprehensive workflow validation and testing service
 * Provides advanced validation, dry-run simulation, and optimization suggestions
 */
export class WorkflowValidator {
  private yamlValidationService: YAMLValidationService;
  private githubActionsRegistry: Map<string, ActionMetadata> = new Map();

  constructor() {
    this.yamlValidationService = new YAMLValidationService();
    this.initializeActionRegistry();
  }

  /**
   * Perform comprehensive workflow validation
   */
  public async validateWorkflow(
    workflowFile: WorkflowFile,
    context?: {
      detectedFrameworks?: DetectedFramework[];
      projectSecrets?: string[];
      organizationPolicies?: OrganizationPolicy[];
    }
  ): Promise<ComprehensiveValidationResult> {
    const results: ComprehensiveValidationResult = {
      syntaxValidation: { isValid: true, errors: [], warnings: [] },
      schemaValidation: { isValid: true, errors: [], warnings: [] },
      actionValidation: { isValid: true, errors: [], warnings: [] },
      secretValidation: { isValid: true, errors: [], warnings: [] },
      performanceAnalysis: { score: 100, suggestions: [], bottlenecks: [] },
      securityAnalysis: { score: 100, vulnerabilities: [], recommendations: [] },
      optimizationSuggestions: [],
      quickFixes: [],
      overallScore: 100
    };

    try {
      // Parse YAML content
      const parsedWorkflow = yaml.parseDocument(workflowFile.content);
      const workflowObject = parsedWorkflow.toJS();

      // 1. Basic YAML and schema validation
      const document = await vscode.workspace.openTextDocument({
        content: workflowFile.content,
        language: 'yaml'
      });
      results.syntaxValidation = await this.yamlValidationService.validateYAMLFile(document);

      // 2. Action validation and version compatibility
      results.actionValidation = await this.validateActions(workflowObject, workflowFile.content);

      // 3. Secret reference validation
      results.secretValidation = await this.validateSecrets(
        workflowObject, 
        workflowFile.content,
        context?.projectSecrets
      );

      // 4. Performance analysis
      results.performanceAnalysis = await this.analyzePerformance(
        workflowObject,
        context?.detectedFrameworks
      );

      // 5. Security analysis
      results.securityAnalysis = await this.analyzeSecurityIssues(workflowObject);

      // 6. Generate optimization suggestions
      results.optimizationSuggestions = await this.generateOptimizationSuggestions(
        workflowObject,
        context?.detectedFrameworks
      );

      // 7. Generate quick fixes
      results.quickFixes = await this.generateQuickFixes(results, workflowFile.content);

      // Calculate overall score
      results.overallScore = this.calculateOverallScore(results);

    } catch (error) {
      results.syntaxValidation.errors.push({
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: ValidationSeverity.Error,
        line: 0,
        column: 0,
        code: 'validation-error'
      });
      results.syntaxValidation.isValid = false;
    }

    return results;
  }

  /**
   * Perform dry-run simulation of workflow
   */
  public async simulateWorkflow(
    workflowFile: WorkflowFile,
    simulationOptions: WorkflowSimulationOptions = {}
  ): Promise<WorkflowSimulationResult> {
    const simulation: WorkflowSimulationResult = {
      success: true,
      executionPlan: [],
      estimatedDuration: 0,
      resourceUsage: { cpu: 0, memory: 0, storage: 0 },
      potentialIssues: [],
      recommendations: []
    };

    try {
      const workflowObject = yaml.parse(workflowFile.content);
      
      // Analyze workflow structure and create execution plan
      simulation.executionPlan = await this.createExecutionPlan(workflowObject);
      
      // Estimate execution time and resource usage
      simulation.estimatedDuration = this.estimateExecutionTime(simulation.executionPlan);
      simulation.resourceUsage = this.estimateResourceUsage(simulation.executionPlan);
      
      // Identify potential runtime issues
      simulation.potentialIssues = await this.identifyPotentialIssues(
        workflowObject,
        simulationOptions
      );
      
      // Generate recommendations
      simulation.recommendations = this.generateSimulationRecommendations(
        simulation.executionPlan,
        simulation.potentialIssues
      );

    } catch (error) {
      simulation.success = false;
      simulation.potentialIssues.push({
        type: 'simulation-error',
        severity: ValidationSeverity.Error,
        message: `Simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        impact: 'high'
      });
    }

    return simulation;
  }

  /**
   * Validate GitHub Actions and their versions
   */
  private async validateActions(
    workflowObject: any,
    content: string
  ): Promise<WorkflowValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (!workflowObject.jobs) {
      return { isValid: true, errors, warnings };
    }

    for (const [jobName, job] of Object.entries(workflowObject.jobs as any)) {
      const jobObj = job as any;
      if (!jobObj.steps || !Array.isArray(jobObj.steps)) {
        continue;
      }

      for (let stepIndex = 0; stepIndex < jobObj.steps.length; stepIndex++) {
        const step = jobObj.steps[stepIndex];
        if (!step.uses) {
          continue;
        }

        const actionRef = step.uses as string;
        const validation = await this.validateActionReference(actionRef);
        
        if (!validation.isValid) {
          errors.push({
            message: validation.error || `Invalid action reference: ${actionRef}`,
            severity: ValidationSeverity.Error,
            line: this.getLineFromPath(content, `/jobs/${jobName}/steps/${stepIndex}/uses`),
            column: 0,
            code: 'invalid-action-reference'
          });
        }

        // Check for version compatibility
        const versionCheck = await this.checkActionVersionCompatibility(actionRef);
        if (!versionCheck.isLatest && versionCheck.hasSecurityUpdates) {
          warnings.push({
            message: `Action ${actionRef} has security updates available. Consider updating to ${versionCheck.latestVersion}`,
            severity: ValidationSeverity.Warning,
            line: this.getLineFromPath(content, `/jobs/${jobName}/steps/${stepIndex}/uses`),
            column: 0,
            code: 'outdated-action-version'
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }  /*
*
   * Validate secret references and usage
   */
  private async validateSecrets(
    workflowObject: any,
    content: string,
    projectSecrets?: string[]
  ): Promise<WorkflowValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const referencedSecrets = new Set<string>();

    // Extract all secret references from the workflow
    const secretMatches = content.matchAll(/\$\{\{\s*secrets\.([A-Z_][A-Z0-9_]*)\s*\}\}/g);
    for (const match of secretMatches) {
      const secretName = match[1];
      referencedSecrets.add(secretName);

      // Check if secret exists in project secrets
      if (projectSecrets && !projectSecrets.includes(secretName)) {
        const line = this.getLineFromContent(content, match.index || 0);
        warnings.push({
          message: `Secret '${secretName}' is referenced but not defined in repository secrets`,
          severity: ValidationSeverity.Warning,
          line,
          column: 0,
          code: 'undefined-secret'
        });
      }
    }

    // Check for hardcoded secrets or sensitive data
    const sensitivePatterns = [
      { pattern: /password\s*[:=]\s*["']?[^"'\s]+/gi, message: 'Potential hardcoded password detected' },
      { pattern: /api[_-]?key\s*[:=]\s*["']?[^"'\s]+/gi, message: 'Potential hardcoded API key detected' },
      { pattern: /token\s*[:=]\s*["']?[^"'\s]+/gi, message: 'Potential hardcoded token detected' },
      { pattern: /secret\s*[:=]\s*["']?[^"'\s]+/gi, message: 'Potential hardcoded secret detected' }
    ];

    for (const { pattern, message } of sensitivePatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const line = this.getLineFromContent(content, match.index || 0);
        errors.push({
          message,
          severity: ValidationSeverity.Error,
          line,
          column: 0,
          code: 'hardcoded-secret'
        });
      }
    }

    // Validate secret usage patterns
    this.validateSecretUsagePatterns(workflowObject, content, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Analyze workflow performance and identify bottlenecks
   */
  private async analyzePerformance(
    workflowObject: any,
    detectedFrameworks?: DetectedFramework[]
  ): Promise<PerformanceAnalysis> {
    const analysis: PerformanceAnalysis = {
      score: 100,
      suggestions: [],
      bottlenecks: []
    };

    if (!workflowObject.jobs) {
      return analysis;
    }

    let totalScore = 100;
    const suggestions: string[] = [];
    const bottlenecks: PerformanceBottleneck[] = [];

    // Analyze job parallelization
    const jobs = Object.entries(workflowObject.jobs as any);
    const jobDependencies = this.analyzeJobDependencies(workflowObject.jobs);
    
    if (jobs.length > 1 && jobDependencies.parallelizable.length < jobs.length * 0.5) {
      totalScore -= 10;
      suggestions.push('Consider parallelizing more jobs to reduce overall execution time');
      bottlenecks.push({
        type: 'sequential-execution',
        impact: 'medium',
        description: 'Jobs are running sequentially when they could be parallelized',
        suggestion: 'Review job dependencies and parallelize independent jobs'
      });
    }

    // Analyze caching usage
    const hasCaching = this.analyzesCachingUsage(workflowObject);
    if (!hasCaching && detectedFrameworks) {
      const cachableFrameworks = detectedFrameworks.filter(f => 
        ['node', 'python', 'java', 'go', 'rust', 'php'].includes(f.name.toLowerCase())
      );
      
      if (cachableFrameworks.length > 0) {
        totalScore -= 15;
        suggestions.push(`Add caching for ${cachableFrameworks.map(f => f.name).join(', ')} dependencies`);
        bottlenecks.push({
          type: 'missing-cache',
          impact: 'high',
          description: 'Dependencies are downloaded on every run',
          suggestion: 'Implement dependency caching to speed up builds'
        });
      }
    }

    // Analyze matrix builds
    const matrixAnalysis = this.analyzeMatrixBuilds(workflowObject);
    if (matrixAnalysis.inefficient) {
      totalScore -= 5;
      suggestions.push('Optimize matrix build configuration to reduce redundant executions');
      bottlenecks.push({
        type: 'inefficient-matrix',
        impact: 'medium',
        description: 'Matrix build has too many combinations',
        suggestion: 'Reduce matrix combinations or use include/exclude'
      });
    }

    // Analyze runner selection
    const runnerAnalysis = this.analyzeRunnerSelection(workflowObject);
    if (runnerAnalysis.suboptimal) {
      totalScore -= 5;
      suggestions.push('Consider using more appropriate runners for better performance');
    }

    analysis.score = Math.max(0, totalScore);
    analysis.suggestions = suggestions;
    analysis.bottlenecks = bottlenecks;

    return analysis;
  }

  /**
   * Analyze security issues in the workflow
   */
  private async analyzeSecurityIssues(workflowObject: any): Promise<SecurityAnalysis> {
    const analysis: SecurityAnalysis = {
      score: 100,
      vulnerabilities: [],
      recommendations: []
    };

    let securityScore = 100;
    const vulnerabilities: SecurityVulnerability[] = [];
    const recommendations: string[] = [];

    // Check for dangerous permissions
    if (workflowObject.permissions) {
      if (workflowObject.permissions === 'write-all' || 
          (typeof workflowObject.permissions === 'object' && 
           Object.values(workflowObject.permissions).includes('write-all'))) {
        securityScore -= 20;
        vulnerabilities.push({
          type: 'excessive-permissions',
          severity: 'high',
          description: `Workflow has excessive permissions: write-all`,
          recommendation: 'Use minimal required permissions'
        });
      }
    }

    // Check for pull_request_target usage
    if (workflowObject.on && workflowObject.on.pull_request_target) {
      securityScore -= 15;
      vulnerabilities.push({
        type: 'pull-request-target',
        severity: 'medium',
        description: 'Using pull_request_target can be dangerous with untrusted code',
        recommendation: 'Consider using pull_request instead or add proper security checks'
      });
    }

    // Check for script injection vulnerabilities
    const scriptInjectionCheck = this.checkScriptInjection(workflowObject);
    if (scriptInjectionCheck.vulnerable) {
      securityScore -= 25;
      vulnerabilities.push(...scriptInjectionCheck.vulnerabilities);
    }

    // Check for third-party action security
    const actionSecurityCheck = await this.checkActionSecurity(workflowObject);
    securityScore -= actionSecurityCheck.riskScore;
    vulnerabilities.push(...actionSecurityCheck.vulnerabilities);

    analysis.score = Math.max(0, securityScore);
    analysis.vulnerabilities = vulnerabilities;
    analysis.recommendations = recommendations;

    return analysis;
  }

  /**
   * Generate optimization suggestions based on detected frameworks and workflow analysis
   */
  private async generateOptimizationSuggestions(
    workflowObject: any,
    detectedFrameworks?: DetectedFramework[]
  ): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];

    if (!detectedFrameworks) {
      return suggestions;
    }

    // Framework-specific optimizations
    for (const framework of detectedFrameworks) {
      const frameworkSuggestions = this.getFrameworkOptimizations(framework, workflowObject);
      suggestions.push(...frameworkSuggestions);
    }

    // General workflow optimizations
    const generalSuggestions = this.getGeneralOptimizations(workflowObject);
    suggestions.push(...generalSuggestions);

    return suggestions;
  }

  /**
   * Generate quick fixes for common issues
   */
  private async generateQuickFixes(
    validationResults: ComprehensiveValidationResult,
    content: string
  ): Promise<QuickFixSuggestion[]> {
    const quickFixes: QuickFixSuggestion[] = [];

    // Generate fixes for syntax errors
    for (const error of validationResults.syntaxValidation.errors) {
      const fix = this.generateSyntaxFix(error, content);
      if (fix) {
        quickFixes.push(fix);
      }
    }

    // Generate fixes for action version issues
    for (const warning of validationResults.actionValidation.warnings) {
      if (warning.code === 'outdated-action-version') {
        const fix = this.generateActionVersionFix(warning, content);
        if (fix) {
          quickFixes.push(fix);
        }
      }
    }

    // Generate fixes for missing caching
    for (const bottleneck of validationResults.performanceAnalysis.bottlenecks) {
      if (bottleneck.type === 'missing-cache') {
        const fix = this.generateCachingFix(bottleneck, content);
        if (fix) {
          quickFixes.push(fix);
        }
      }
    }

    // Generate fixes for performance issues
    if (validationResults.performanceAnalysis.bottlenecks.length > 0) {
      quickFixes.push({
        title: 'Add performance optimizations',
        description: 'Apply suggested performance improvements',
        edit: new vscode.WorkspaceEdit(),
        kind: vscode.CodeActionKind.QuickFix
      });
    }

    return quickFixes;
  }

  /**
   * Create execution plan for workflow simulation
   */
  private async createExecutionPlan(workflowObject: any): Promise<ExecutionStep[]> {
    const executionPlan: ExecutionStep[] = [];

    if (!workflowObject.jobs) {
      return executionPlan;
    }

    // Analyze job dependencies and create execution order
    const jobDependencies = this.analyzeJobDependencies(workflowObject.jobs);
    const executionOrder = this.calculateExecutionOrder(jobDependencies);

    for (const jobName of executionOrder) {
      const job = workflowObject.jobs[jobName];
      if (!job) continue;

      const jobSteps = this.createJobExecutionSteps(jobName, job);
      executionPlan.push(...jobSteps);
    }

    return executionPlan;
  }

  /**
   * Initialize GitHub Actions registry with common actions
   */
  private initializeActionRegistry(): void {
    const commonActions: ActionMetadata[] = [
      {
        name: 'actions/checkout',
        latestVersion: 'v4',
        description: 'Checkout repository code',
        trusted: true,
        securityScore: 95
      },
      {
        name: 'actions/setup-node',
        latestVersion: 'v4',
        description: 'Setup Node.js environment',
        trusted: true,
        securityScore: 95
      },
      {
        name: 'actions/cache',
        latestVersion: 'v3',
        description: 'Cache dependencies and build outputs',
        trusted: true,
        securityScore: 90
      }
      // Add more common actions...
    ];

    for (const action of commonActions) {
      this.githubActionsRegistry.set(action.name, action);
    }
  }  
// Helper methods for validation and analysis

  private async validateActionReference(actionRef: string): Promise<{ isValid: boolean; error?: string }> {
    const actionPattern = /^([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)@([a-zA-Z0-9_.-]+)$/;
    if (!actionPattern.test(actionRef)) {
      return { 
        isValid: false, 
        error: 'Action reference should be in format: owner/repo@version' 
      };
    }

    const match = actionPattern.exec(actionRef);
    if (!match) {
      return { isValid: false, error: 'Invalid action format' };
    }
    
    const [, actionName] = match;
    
    // Check against registry
    const actionMetadata = this.githubActionsRegistry.get(actionName);
    if (actionMetadata) {
      return { 
        isValid: true // Valid format, but might be outdated
      };
    }

    return { isValid: true };
  }

  private async checkActionVersionCompatibility(actionRef: string): Promise<{
    isLatest: boolean;
    latestVersion?: string;
    hasSecurityUpdates: boolean;
  }> {
    const actionPattern = /^([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)@([a-zA-Z0-9_.-]+)$/;
    const match = actionPattern.exec(actionRef);
    
    if (!match) {
      return { isLatest: false, hasSecurityUpdates: false };
    }

    const [, actionName, currentVersion] = match;
    const actionMetadata = this.githubActionsRegistry.get(actionName);
    
    if (!actionMetadata) {
      return { isLatest: false, hasSecurityUpdates: false };
    }

    const isLatest = currentVersion === actionMetadata.latestVersion;
    const hasSecurityUpdates = !isLatest && actionMetadata.securityScore < 90;

    return {
      isLatest,
      latestVersion: actionMetadata.latestVersion,
      hasSecurityUpdates
    };
  }

  private validateSecretUsagePatterns(
    _workflowObject: any,
    content: string,
    _errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    // Check for secrets used in conditions (potential information disclosure)
    const conditionalSecretPattern = /if:\s*.*\$\{\{\s*secrets\./g;
    const matches = content.matchAll(conditionalSecretPattern);
    
    for (const match of matches) {
      const line = this.getLineFromContent(content, match.index || 0);
      warnings.push({
        message: 'Using secrets in conditional expressions may leak information',
        severity: ValidationSeverity.Warning,
        line,
        column: 0,
        code: 'secret-in-condition'
      });
    }
  }

  private analyzeJobDependencies(jobs: any): JobDependencyAnalysis {
    const dependencies: Record<string, string[]> = {};
    const parallelizable: string[] = [];
    
    for (const [jobName, job] of Object.entries(jobs as any)) {
      const jobObj = job as any;
      const needs = jobObj.needs;
      
      if (!needs) {
        parallelizable.push(jobName);
        dependencies[jobName] = [];
      } else if (Array.isArray(needs)) {
        dependencies[jobName] = needs;
      } else if (typeof needs === 'string') {
        dependencies[jobName] = [needs];
      }
    }

    return { dependencies, parallelizable };
  }

  private analyzesCachingUsage(workflowObject: any): boolean {
    const content = JSON.stringify(workflowObject);
    return content.includes('actions/cache') || content.includes('cache:');
  }

  private analyzeMatrixBuilds(workflowObject: any): { inefficient: boolean; suggestions: string[] } {
    // Simplified matrix analysis
    let inefficient = false;
    const suggestions: string[] = [];

    if (workflowObject.jobs) {
      for (const [jobName, job] of Object.entries(workflowObject.jobs as any)) {
        const jobObj = job as any;
        if (jobObj.strategy?.matrix) {
          const matrix = jobObj.strategy.matrix;
          const combinations = this.calculateMatrixCombinations(matrix);
          
          if (combinations > 20) {
            inefficient = true;
            suggestions.push(`Job ${jobName} has ${combinations} matrix combinations, consider reducing`);
          }
        }
      }
    }

    return { inefficient, suggestions };
  }

  private analyzeRunnerSelection(_workflowObject: any): { suboptimal: boolean; suggestions: string[] } {
    const suggestions: string[] = [];
    let suboptimal = false;

    // Implementation would analyze runner selection
    // For now, return default values
    return { suboptimal, suggestions };
  }

  private checkScriptInjection(workflowObject: any): { vulnerable: boolean; vulnerabilities: SecurityVulnerability[] } {
    const vulnerabilities: SecurityVulnerability[] = [];
    let vulnerable = false;

    // Check for potential script injection in run commands
    const content = JSON.stringify(workflowObject);
    const dangerousPatterns = [
      /\$\{\{\s*github\.event\.pull_request\.title\s*\}\}/g,
      /\$\{\{\s*github\.event\.head_commit\.message\s*\}\}/g,
      /\$\{\{\s*github\.event\.issue\.title\s*\}\}/g
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(content)) {
        vulnerable = true;
        vulnerabilities.push({
          type: 'script-injection',
          severity: 'high',
          description: 'Potential script injection vulnerability detected',
          recommendation: 'Sanitize user input or use environment variables'
        });
      }
    }

    return { vulnerable, vulnerabilities };
  }

  private async checkActionSecurity(workflowObject: any): Promise<{
    riskScore: number;
    vulnerabilities: SecurityVulnerability[];
  }> {
    let riskScore = 0;
    const vulnerabilities: SecurityVulnerability[] = [];

    if (workflowObject.jobs) {
      for (const [jobName, job] of Object.entries(workflowObject.jobs as any)) {
        const jobObj = job as any;
        if (jobObj.steps) {
          for (const step of jobObj.steps) {
            if (step.uses) {
              const actionRef = step.uses as string;
              const [actionName] = actionRef.split('@');
              const actionMetadata = this.githubActionsRegistry.get(actionName);
              
              if (!actionMetadata || !actionMetadata.trusted) {
                riskScore += 5;
                vulnerabilities.push({
                  type: 'untrusted-action',
                  severity: 'medium',
                  description: `Using untrusted action: ${actionRef}`,
                  recommendation: 'Verify action security and consider alternatives'
                });
              }
            }
          }
        }
      }
    }

    return { riskScore, vulnerabilities };
  }

  private getFrameworkOptimizations(
    framework: DetectedFramework,
    workflowObject: any
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    switch (framework.name.toLowerCase()) {
      case 'node':
      case 'nodejs':
        suggestions.push({
          type: 'caching',
          priority: 'high',
          description: 'Add Node.js dependency caching',
          implementation: 'Add actions/cache step for node_modules',
          estimatedImprovement: '30-60% faster builds'
        });
        break;
      
      case 'python':
        suggestions.push({
          type: 'caching',
          priority: 'high',
          description: 'Add Python dependency caching',
          implementation: 'Add actions/cache step for pip cache',
          estimatedImprovement: '20-40% faster builds'
        });
        break;
      
      case 'java':
        suggestions.push({
          type: 'caching',
          priority: 'high',
          description: 'Add Maven/Gradle dependency caching',
          implementation: 'Add actions/cache step for .m2 or .gradle',
          estimatedImprovement: '40-70% faster builds'
        });
        break;
    }

    return suggestions;
  }

  private getGeneralOptimizations(workflowObject: any): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Check for missing fail-fast strategy
    if (workflowObject.jobs) {
      for (const [jobName, job] of Object.entries(workflowObject.jobs as any)) {
        const jobObj = job as any;
        if (jobObj.strategy?.matrix && !jobObj.strategy['fail-fast']) {
          suggestions.push({
            type: 'strategy',
            priority: 'medium',
            description: `Enable fail-fast for matrix job ${jobName}`,
            implementation: 'Add fail-fast: true to strategy',
            estimatedImprovement: 'Faster failure detection'
          });
        }
      }
    }

    return suggestions;
  }

  private calculateOverallScore(results: ComprehensiveValidationResult): number {
    const weights = {
      syntax: 0.2,
      schema: 0.2,
      actions: 0.15,
      secrets: 0.15,
      performance: 0.15,
      security: 0.15
    };

    let score = 0;
    score += (results.syntaxValidation.isValid ? 100 : 0) * weights.syntax;
    score += (results.schemaValidation.isValid ? 100 : 0) * weights.schema;
    score += (results.actionValidation.isValid ? 100 : 0) * weights.actions;
    score += (results.secretValidation.isValid ? 100 : 0) * weights.secrets;
    score += results.performanceAnalysis.score * weights.performance;
    score += results.securityAnalysis.score * weights.security;

    return Math.round(score);
  }

  // Utility methods
  private getLineFromPath(content: string, path: string): number {
    // Simplified implementation - in real scenario, you'd map JSON paths to YAML lines
    const lines = content.split('\n');
    const pathParts = path.split('/').filter(p => p);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (pathParts.some(part => line.includes(part))) {
        return i;
      }
    }
    
    return 0;
  }

  private getLineFromContent(content: string, position: number): number {
    const lines = content.substring(0, position).split('\n');
    return Math.max(0, lines.length - 1);
  }

  private calculateMatrixCombinations(matrix: any): number {
    let combinations = 1;
    for (const [_key, values] of Object.entries(matrix)) {
      if (Array.isArray(values)) {
        combinations *= values.length;
      }
    }
    return combinations;
  }

  private hasWindowsSpecificSteps(_job: any): boolean {
    // Implementation would check for Windows-specific steps
    return false;
  }

  private calculateExecutionOrder(dependencies: JobDependencyAnalysis): string[] {
    // Simplified topological sort
    const order: string[] = [];
    const visited = new Set<string>();
    
    const visit = (jobName: string) => {
      if (visited.has(jobName)) return;
      visited.add(jobName);
      
      const deps = dependencies.dependencies[jobName] || [];
      for (const dep of deps) {
        visit(dep);
      }
      
      order.push(jobName);
    };

    for (const jobName of Object.keys(dependencies.dependencies)) {
      visit(jobName);
    }

    return order;
  }

  private createJobExecutionSteps(jobName: string, job: any): ExecutionStep[] {
    const steps: ExecutionStep[] = [];
    
    if (job.steps && Array.isArray(job.steps)) {
      for (let i = 0; i < job.steps.length; i++) {
        const step = job.steps[i];
        steps.push({
          id: `${jobName}-step-${i}`,
          name: step.name || `Step ${i + 1}`,
          type: step.uses ? 'action' : 'run',
          estimatedDuration: this.estimateStepDuration(step),
          dependencies: i > 0 ? [`${jobName}-step-${i - 1}`] : []
        });
      }
    }

    return steps;
  }

  private estimateStepDuration(step: any): number {
    // Simplified duration estimation
    if (step.uses) {
      if (step.uses.includes('checkout')) return 10;
      if (step.uses.includes('setup-')) return 30;
      if (step.uses.includes('cache')) return 15;
      return 20;
    }
    
    if (step.run) {
      const runCommand = step.run as string;
      if (runCommand.includes('npm install') || runCommand.includes('yarn install')) return 120;
      if (runCommand.includes('npm test') || runCommand.includes('yarn test')) return 180;
      if (runCommand.includes('build')) return 300;
      return 60;
    }

    return 30;
  }

  private estimateExecutionTime(executionPlan: ExecutionStep[]): number {
    return executionPlan.reduce((total, step) => total + step.estimatedDuration, 0);
  }

  private estimateResourceUsage(executionPlan: ExecutionStep[]): ResourceUsage {
    // Simplified resource estimation
    return {
      cpu: executionPlan.length * 0.5, // CPU cores
      memory: executionPlan.length * 512, // MB
      storage: executionPlan.length * 100 // MB
    };
  }

  private async identifyPotentialIssues(
    workflowObject: any,
    options: WorkflowSimulationOptions
  ): Promise<PotentialIssue[]> {
    const issues: PotentialIssue[] = [];

    // Check for missing required secrets
    if (options.availableSecrets) {
      const requiredSecrets = this.extractRequiredSecrets(workflowObject);
      for (const secret of requiredSecrets) {
        if (!options.availableSecrets.includes(secret)) {
          issues.push({
            type: 'missing-secret',
            severity: ValidationSeverity.Error,
            message: `Required secret '${secret}' is not available`,
            impact: 'high'
          });
        }
      }
    }

    return issues;
  }

  private generateSimulationRecommendations(
    executionPlan: ExecutionStep[],
    issues: PotentialIssue[]
  ): string[] {
    const recommendations: string[] = [];

    if (issues.length > 0) {
      recommendations.push('Resolve identified issues before running the workflow');
    }

    if (executionPlan.length > 10) {
      recommendations.push('Consider breaking down large workflows into smaller, focused workflows');
    }

    return recommendations;
  }

  private extractRequiredSecrets(workflowObject: any): string[] {
    const content = JSON.stringify(workflowObject);
    const secretMatches = content.matchAll(/\$\{\{\s*secrets\.([A-Z_][A-Z0-9_]*)\s*\}\}/g);
    const secrets = new Set<string>();
    
    for (const match of secretMatches) {
      secrets.add(match[1]);
    }

    return Array.from(secrets);
  }

  private generateSyntaxFix(error: ValidationError, content: string): QuickFixSuggestion | null {
    // Simplified syntax fix generation
    if (error.code === 'yaml-syntax-error') {
      return {
        title: 'Fix YAML syntax error',
        description: 'Correct the YAML syntax issue',
        edit: new vscode.WorkspaceEdit(),
        kind: vscode.CodeActionKind.QuickFix
      };
    }
    return null;
  }

  private generateActionVersionFix(_warning: ValidationError, _content: string): QuickFixSuggestion | null {
    // Implementation would create workspace edit to update action version
    return {
      title: 'Update action to latest version',
      description: 'Update the action to the latest secure version',
      edit: new vscode.WorkspaceEdit(),
      kind: vscode.CodeActionKind.QuickFix
    };
  }

  private generateCachingFix(_bottleneck: PerformanceBottleneck, _content: string): QuickFixSuggestion | null {
    return {
      title: 'Add dependency caching',
      description: 'Add caching step to improve build performance',
      edit: new vscode.WorkspaceEdit(),
      kind: vscode.CodeActionKind.QuickFix
    };
  }

  public dispose(): void {
    this.yamlValidationService.dispose();
  }
}

// Additional interfaces for the WorkflowValidator

interface ActionMetadata {
  name: string;
  latestVersion: string;
  description: string;
  trusted: boolean;
  securityScore: number;
}

interface ComprehensiveValidationResult {
  syntaxValidation: WorkflowValidationResult;
  schemaValidation: WorkflowValidationResult;
  actionValidation: WorkflowValidationResult;
  secretValidation: WorkflowValidationResult;
  performanceAnalysis: PerformanceAnalysis;
  securityAnalysis: SecurityAnalysis;
  optimizationSuggestions: OptimizationSuggestion[];
  quickFixes: QuickFixSuggestion[];
  overallScore: number;
}

interface PerformanceAnalysis {
  score: number;
  suggestions: string[];
  bottlenecks: PerformanceBottleneck[];
}

interface PerformanceBottleneck {
  type: string;
  impact: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
}

interface SecurityAnalysis {
  score: number;
  vulnerabilities: SecurityVulnerability[];
  recommendations: string[];
}

interface SecurityVulnerability {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string;
}

interface OptimizationSuggestion {
  type: string;
  priority: 'low' | 'medium' | 'high';
  description: string;
  implementation: string;
  estimatedImprovement: string;
}

interface WorkflowSimulationOptions {
  availableSecrets?: string[];
  environmentVariables?: Record<string, string>;
  runnerType?: string;
  timeoutMinutes?: number;
}

interface WorkflowSimulationResult {
  success: boolean;
  executionPlan: ExecutionStep[];
  estimatedDuration: number;
  resourceUsage: ResourceUsage;
  potentialIssues: PotentialIssue[];
  recommendations: string[];
}

interface ExecutionStep {
  id: string;
  name: string;
  type: 'action' | 'run';
  estimatedDuration: number;
  dependencies: string[];
}

interface ResourceUsage {
  cpu: number;
  memory: number;
  storage: number;
}

interface PotentialIssue {
  type: string;
  severity: ValidationSeverity;
  message: string;
  impact: 'low' | 'medium' | 'high';
}

interface JobDependencyAnalysis {
  dependencies: Record<string, string[]>;
  parallelizable: string[];
}

interface OrganizationPolicy {
  name: string;
  rules: PolicyRule[];
}

interface PolicyRule {
  type: string;
  condition: string;
  action: 'allow' | 'deny' | 'warn';
  message: string;
}