/**
 * Enhanced validation with detailed feedback and suggestions
 */

import { WorkflowValidator } from './workflow-validator';
import { ValidationResult, ValidationError, ValidationWarning } from '../interfaces';
import { ValidationConfig, ValidationIssue } from './validation-types';
import { GenerationError } from '../errors/generation-errors';
import { DetectionResult } from '../interfaces';
import * as yaml from 'yaml';

/**
 * Enhanced validation configuration
 */
export interface EnhancedValidationConfig extends ValidationConfig {
  provideSuggestions: boolean;
  includePerformanceAnalysis: boolean;
  includeSecurityAnalysis: boolean;
  includeBestPracticeAnalysis: boolean;
  includeCompatibilityAnalysis: boolean;
  maxSuggestions: number;
  suggestionPriority: SuggestionPriority[];
}

/**
 * Suggestion priority levels
 */
export type SuggestionPriority = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * Detailed validation feedback
 */
export interface DetailedValidationFeedback {
  validationResult: ValidationResult;
  performanceAnalysis: PerformanceAnalysis;
  securityAnalysis: SecurityAnalysis;
  bestPracticeAnalysis: BestPracticeAnalysis;
  compatibilityAnalysis: CompatibilityAnalysis;
  suggestions: DetailedSuggestion[];
  improvementScore: number;
  estimatedImprovements: EstimatedImprovement[];
}

/**
 * Performance analysis results
 */
export interface PerformanceAnalysis {
  estimatedRuntime: number;
  parallelizationOpportunities: string[];
  cachingOpportunities: string[];
  optimizationPotential: 'low' | 'medium' | 'high';
  bottlenecks: PerformanceBottleneck[];
}

/**
 * Performance bottleneck
 */
export interface PerformanceBottleneck {
  location: string;
  type: 'sequential' | 'redundant' | 'inefficient';
  impact: 'low' | 'medium' | 'high';
  suggestion: string;
}

/**
 * Security analysis results
 */
export interface SecurityAnalysis {
  securityScore: number;
  vulnerabilities: SecurityVulnerability[];
  missingSecurityFeatures: string[];
  complianceIssues: ComplianceIssue[];
  recommendations: SecurityRecommendation[];
}

/**
 * Security vulnerability
 */
export interface SecurityVulnerability {
  type: 'action-version' | 'permission' | 'secret-exposure' | 'third-party';
  severity: 'critical' | 'high' | 'medium' | 'low';
  location: string;
  description: string;
  remediation: string;
}

/**
 * Compliance issue
 */
export interface ComplianceIssue {
  framework: 'SOC2' | 'HIPAA' | 'PCI-DSS' | 'GDPR' | 'custom';
  requirement: string;
  currentStatus: 'compliant' | 'non-compliant' | 'partial';
  remediation: string;
}

/**
 * Security recommendation
 */
export interface SecurityRecommendation {
  category: 'permissions' | 'actions' | 'secrets' | 'scanning' | 'monitoring';
  priority: SuggestionPriority;
  description: string;
  implementation: string;
}

/**
 * Best practice analysis results
 */
export interface BestPracticeAnalysis {
  overallScore: number;
  categories: BestPracticeCategory[];
  violations: BestPracticeViolation[];
  recommendations: BestPracticeRecommendation[];
}

/**
 * Best practice category
 */
export interface BestPracticeCategory {
  name: string;
  score: number;
  maxScore: number;
  issues: string[];
}

/**
 * Best practice violation
 */
export interface BestPracticeViolation {
  rule: string;
  severity: 'error' | 'warning' | 'info';
  location: string;
  description: string;
  fix: string;
}

/**
 * Best practice recommendation
 */
export interface BestPracticeRecommendation {
  category: string;
  priority: SuggestionPriority;
  description: string;
  benefit: string;
  implementation: string;
}

/**
 * Compatibility analysis results
 */
export interface CompatibilityAnalysis {
  githubActionsVersion: string;
  runnerCompatibility: RunnerCompatibility[];
  actionCompatibility: ActionCompatibility[];
  deprecationWarnings: DeprecationWarning[];
  futureCompatibility: FutureCompatibilityIssue[];
}

/**
 * Runner compatibility
 */
export interface RunnerCompatibility {
  runner: string;
  compatible: boolean;
  issues: string[];
  alternatives: string[];
}

/**
 * Action compatibility
 */
export interface ActionCompatibility {
  action: string;
  version: string;
  compatible: boolean;
  latestVersion: string;
  breakingChanges: string[];
  migrationPath: string;
}

/**
 * Deprecation warning
 */
export interface DeprecationWarning {
  feature: string;
  deprecatedIn: string;
  removedIn: string;
  replacement: string;
  migrationGuide: string;
}

/**
 * Future compatibility issue
 */
export interface FutureCompatibilityIssue {
  feature: string;
  risk: 'low' | 'medium' | 'high';
  timeline: string;
  impact: string;
  preparation: string;
}

/**
 * Detailed suggestion
 */
export interface DetailedSuggestion {
  id: string;
  priority: SuggestionPriority;
  category: 'performance' | 'security' | 'best-practice' | 'compatibility' | 'maintainability';
  title: string;
  description: string;
  implementation: string;
  estimatedImpact: string;
  effort: 'low' | 'medium' | 'high';
  prerequisites: string[];
  relatedSuggestions: string[];
}

/**
 * Estimated improvement
 */
export interface EstimatedImprovement {
  metric: 'runtime' | 'security' | 'maintainability' | 'reliability';
  currentValue: number;
  improvedValue: number;
  improvement: string;
  confidence: number;
}

/**
 * Default enhanced validation configuration
 */
const DEFAULT_ENHANCED_CONFIG: EnhancedValidationConfig = {
  strictMode: true,
  allowUnknownActions: false,
  validateActionVersions: true,
  customRules: [],
  provideSuggestions: true,
  includePerformanceAnalysis: true,
  includeSecurityAnalysis: true,
  includeBestPracticeAnalysis: true,
  includeCompatibilityAnalysis: true,
  maxSuggestions: 20,
  suggestionPriority: ['critical', 'high', 'medium', 'low', 'info']
};

/**
 * Enhanced workflow validator with detailed feedback
 */
export class EnhancedWorkflowValidator extends WorkflowValidator {
  private enhancedConfig: EnhancedValidationConfig;

  constructor(config: Partial<EnhancedValidationConfig> = {}) {
    const finalConfig = { ...DEFAULT_ENHANCED_CONFIG, ...config };
    super(finalConfig);
    this.enhancedConfig = finalConfig;
  }

  /**
   * Validate workflow with detailed feedback
   */
  async validateWithDetailedFeedback(
    yamlContent: string,
    detectionResult?: DetectionResult
  ): Promise<DetailedValidationFeedback> {
    // Run basic validation first
    const validationResult = this.validateWorkflow(yamlContent);

    // Parse workflow for analysis
    let workflowObject: any;
    try {
      workflowObject = yaml.parse(yamlContent);
    } catch (error) {
      // Return minimal feedback if parsing fails
      return this.createMinimalFeedback(validationResult, error as Error);
    }

    // Perform detailed analysis
    const [
      performanceAnalysis,
      securityAnalysis,
      bestPracticeAnalysis,
      compatibilityAnalysis
    ] = await Promise.all([
      this.enhancedConfig.includePerformanceAnalysis 
        ? this.analyzePerformance(workflowObject, detectionResult)
        : this.createEmptyPerformanceAnalysis(),
      this.enhancedConfig.includeSecurityAnalysis
        ? this.analyzeSecurity(workflowObject, detectionResult)
        : this.createEmptySecurityAnalysis(),
      this.enhancedConfig.includeBestPracticeAnalysis
        ? this.analyzeBestPractices(workflowObject, detectionResult)
        : this.createEmptyBestPracticeAnalysis(),
      this.enhancedConfig.includeCompatibilityAnalysis
        ? this.analyzeCompatibility(workflowObject, detectionResult)
        : this.createEmptyCompatibilityAnalysis()
    ]);

    // Generate suggestions
    const suggestions = this.enhancedConfig.provideSuggestions
      ? this.generateDetailedSuggestions(
          validationResult,
          performanceAnalysis,
          securityAnalysis,
          bestPracticeAnalysis,
          compatibilityAnalysis,
          workflowObject
        )
      : [];

    // Calculate improvement score
    const improvementScore = this.calculateImprovementScore(
      validationResult,
      performanceAnalysis,
      securityAnalysis,
      bestPracticeAnalysis,
      compatibilityAnalysis
    );

    // Estimate improvements
    const estimatedImprovements = this.estimateImprovements(
      suggestions,
      performanceAnalysis,
      securityAnalysis
    );

    return {
      validationResult,
      performanceAnalysis,
      securityAnalysis,
      bestPracticeAnalysis,
      compatibilityAnalysis,
      suggestions: suggestions.slice(0, this.enhancedConfig.maxSuggestions),
      improvementScore,
      estimatedImprovements
    };
  }

  /**
   * Analyze workflow performance
   */
  private async analyzePerformance(
    workflowObject: any,
    detectionResult?: DetectionResult
  ): Promise<PerformanceAnalysis> {
    const parallelizationOpportunities: string[] = [];
    const cachingOpportunities: string[] = [];
    const bottlenecks: PerformanceBottleneck[] = [];
    let estimatedRuntime = 0;

    if (!workflowObject.jobs) {
      return {
        estimatedRuntime: 0,
        parallelizationOpportunities: [],
        cachingOpportunities: [],
        optimizationPotential: 'low',
        bottlenecks: []
      };
    }

    // Analyze job dependencies and parallelization
    const jobs = Object.keys(workflowObject.jobs);
    const jobsWithDependencies = jobs.filter(jobId => 
      workflowObject.jobs[jobId].needs && workflowObject.jobs[jobId].needs.length > 0
    );

    if (jobsWithDependencies.length < jobs.length - 1) {
      parallelizationOpportunities.push(
        `${jobs.length - jobsWithDependencies.length - 1} jobs can run in parallel`
      );
    }

    // Analyze caching opportunities
    jobs.forEach(jobId => {
      const job = workflowObject.jobs[jobId];
      if (!job.steps) return;

      let hasSetupStep = false;
      let hasCacheStep = false;
      let hasDependencyInstall = false;

      job.steps.forEach((step: any, index: number) => {
        if (step.uses && step.uses.includes('setup-')) {
          hasSetupStep = true;
        }
        if (step.uses && step.uses.includes('cache')) {
          hasCacheStep = true;
        }
        if (step.run && (
          step.run.includes('npm install') ||
          step.run.includes('pip install') ||
          step.run.includes('cargo build') ||
          step.run.includes('go mod download')
        )) {
          hasDependencyInstall = true;
        }

        // Estimate step runtime
        estimatedRuntime += this.estimateStepRuntime(step, detectionResult);
      });

      if (hasSetupStep && hasDependencyInstall && !hasCacheStep) {
        cachingOpportunities.push(`Job '${jobId}' could benefit from dependency caching`);
      }

      // Check for sequential bottlenecks
      if (job.steps.length > 10) {
        bottlenecks.push({
          location: `jobs.${jobId}`,
          type: 'sequential',
          impact: 'medium',
          suggestion: 'Consider splitting into multiple jobs or using matrix strategy'
        });
      }
    });

    // Determine optimization potential
    let optimizationPotential: 'low' | 'medium' | 'high' = 'low';
    if (parallelizationOpportunities.length > 2 || cachingOpportunities.length > 2) {
      optimizationPotential = 'high';
    } else if (parallelizationOpportunities.length > 0 || cachingOpportunities.length > 0) {
      optimizationPotential = 'medium';
    }

    return {
      estimatedRuntime,
      parallelizationOpportunities,
      cachingOpportunities,
      optimizationPotential,
      bottlenecks
    };
  }

  /**
   * Analyze workflow security
   */
  private async analyzeSecurity(
    workflowObject: any,
    detectionResult?: DetectionResult
  ): Promise<SecurityAnalysis> {
    const vulnerabilities: SecurityVulnerability[] = [];
    const missingSecurityFeatures: string[] = [];
    const complianceIssues: ComplianceIssue[] = [];
    const recommendations: SecurityRecommendation[] = [];

    // Check permissions
    if (!workflowObject.permissions) {
      vulnerabilities.push({
        type: 'permission',
        severity: 'medium',
        location: 'workflow.permissions',
        description: 'No explicit permissions defined',
        remediation: 'Add explicit permissions to limit token scope'
      });
    } else if (workflowObject.permissions === 'write-all') {
      vulnerabilities.push({
        type: 'permission',
        severity: 'high',
        location: 'workflow.permissions',
        description: 'Overly broad permissions granted',
        remediation: 'Use specific permissions instead of write-all'
      });
    }

    // Check for security scanning
    let hasSecurityScanning = false;
    let hasDependencyScanning = false;

    if (workflowObject.jobs) {
      Object.keys(workflowObject.jobs).forEach(jobId => {
        const job = workflowObject.jobs[jobId];
        if (!job.steps) return;

        job.steps.forEach((step: any, stepIndex: number) => {
          if (step.uses) {
            // Check action versions
            if (!step.uses.includes('@') || step.uses.includes('@main') || step.uses.includes('@master')) {
              vulnerabilities.push({
                type: 'action-version',
                severity: 'high',
                location: `jobs.${jobId}.steps[${stepIndex}]`,
                description: `Action ${step.uses} should use a specific version`,
                remediation: 'Pin to a specific version tag for security'
              });
            }

            // Check for security scanning actions
            if (step.uses.includes('codeql') || step.uses.includes('security')) {
              hasSecurityScanning = true;
            }

            // Check for dependency scanning
            if (step.uses.includes('dependency') || step.uses.includes('audit')) {
              hasDependencyScanning = true;
            }

            // Check for third-party actions
            if (!step.uses.startsWith('actions/') && 
                !step.uses.startsWith('github/') && 
                !step.uses.startsWith('docker/')) {
              vulnerabilities.push({
                type: 'third-party',
                severity: 'medium',
                location: `jobs.${jobId}.steps[${stepIndex}]`,
                description: `Third-party action ${step.uses} - verify trustworthiness`,
                remediation: 'Review action source code and maintainer reputation'
              });
            }
          }

          // Check for secret exposure in run commands
          if (step.run && (step.run.includes('${{') || step.run.includes('${{'))) {
            const secretPattern = /\$\{\{\s*secrets\./gi;
            if (secretPattern.test(step.run)) {
              vulnerabilities.push({
                type: 'secret-exposure',
                severity: 'critical',
                location: `jobs.${jobId}.steps[${stepIndex}]`,
                description: 'Potential secret exposure in run command',
                remediation: 'Use environment variables instead of inline secrets'
              });
            }
          }
        });
      });
    }

    // Check for missing security features
    if (!hasSecurityScanning) {
      missingSecurityFeatures.push('Static Application Security Testing (SAST)');
      recommendations.push({
        category: 'scanning',
        priority: 'high',
        description: 'Add CodeQL or similar SAST scanning',
        implementation: 'Add github/codeql-action to your workflow'
      });
    }

    if (!hasDependencyScanning) {
      missingSecurityFeatures.push('Dependency vulnerability scanning');
      recommendations.push({
        category: 'scanning',
        priority: 'medium',
        description: 'Add dependency vulnerability scanning',
        implementation: 'Enable Dependabot or add npm audit/pip-audit steps'
      });
    }

    // Calculate security score
    const maxScore = 100;
    let securityScore = maxScore;
    
    vulnerabilities.forEach(vuln => {
      switch (vuln.severity) {
        case 'critical': securityScore -= 25; break;
        case 'high': securityScore -= 15; break;
        case 'medium': securityScore -= 10; break;
        case 'low': securityScore -= 5; break;
      }
    });

    securityScore -= missingSecurityFeatures.length * 10;
    securityScore = Math.max(0, securityScore);

    return {
      securityScore,
      vulnerabilities,
      missingSecurityFeatures,
      complianceIssues,
      recommendations
    };
  }

  /**
   * Analyze best practices
   */
  private async analyzeBestPractices(
    workflowObject: any,
    detectionResult?: DetectionResult
  ): Promise<BestPracticeAnalysis> {
    const categories: BestPracticeCategory[] = [];
    const violations: BestPracticeViolation[] = [];
    const recommendations: BestPracticeRecommendation[] = [];

    // Analyze naming conventions
    const namingScore = this.analyzeNamingConventions(workflowObject, violations);
    categories.push({
      name: 'Naming Conventions',
      score: namingScore,
      maxScore: 100,
      issues: violations.filter(v => v.rule.includes('naming')).map(v => v.description)
    });

    // Analyze workflow structure
    const structureScore = this.analyzeWorkflowStructure(workflowObject, violations);
    categories.push({
      name: 'Workflow Structure',
      score: structureScore,
      maxScore: 100,
      issues: violations.filter(v => v.rule.includes('structure')).map(v => v.description)
    });

    // Analyze error handling
    const errorHandlingScore = this.analyzeErrorHandling(workflowObject, violations);
    categories.push({
      name: 'Error Handling',
      score: errorHandlingScore,
      maxScore: 100,
      issues: violations.filter(v => v.rule.includes('error')).map(v => v.description)
    });

    // Generate recommendations based on violations
    violations.forEach(violation => {
      if (violation.severity === 'error' || violation.severity === 'warning') {
        recommendations.push({
          category: this.categorizeBestPractice(violation.rule),
          priority: violation.severity === 'error' ? 'high' : 'medium',
          description: violation.description,
          benefit: this.getBestPracticeBenefit(violation.rule),
          implementation: violation.fix
        });
      }
    });

    const overallScore = categories.reduce((sum, cat) => sum + cat.score, 0) / categories.length;

    return {
      overallScore,
      categories,
      violations,
      recommendations
    };
  }

  /**
   * Analyze compatibility
   */
  private async analyzeCompatibility(
    workflowObject: any,
    detectionResult?: DetectionResult
  ): Promise<CompatibilityAnalysis> {
    const runnerCompatibility: RunnerCompatibility[] = [];
    const actionCompatibility: ActionCompatibility[] = [];
    const deprecationWarnings: DeprecationWarning[] = [];
    const futureCompatibility: FutureCompatibilityIssue[] = [];

    // Analyze runner compatibility
    if (workflowObject.jobs) {
      const runners = new Set<string>();
      Object.values(workflowObject.jobs).forEach((job: any) => {
        if (job['runs-on']) {
          if (typeof job['runs-on'] === 'string') {
            runners.add(job['runs-on']);
          } else if (Array.isArray(job['runs-on'])) {
            job['runs-on'].forEach((runner: string) => runners.add(runner));
          }
        }
      });

      runners.forEach(runner => {
        runnerCompatibility.push({
          runner,
          compatible: this.isRunnerCompatible(runner),
          issues: this.getRunnerIssues(runner),
          alternatives: this.getRunnerAlternatives(runner)
        });
      });
    }

    return {
      githubActionsVersion: 'v2', // Current GitHub Actions version
      runnerCompatibility,
      actionCompatibility,
      deprecationWarnings,
      futureCompatibility
    };
  }

  /**
   * Generate detailed suggestions
   */
  private generateDetailedSuggestions(
    validationResult: ValidationResult,
    performanceAnalysis: PerformanceAnalysis,
    securityAnalysis: SecurityAnalysis,
    bestPracticeAnalysis: BestPracticeAnalysis,
    compatibilityAnalysis: CompatibilityAnalysis,
    workflowObject: any
  ): DetailedSuggestion[] {
    const suggestions: DetailedSuggestion[] = [];
    let suggestionId = 1;

    // Performance suggestions
    performanceAnalysis.parallelizationOpportunities.forEach(opportunity => {
      suggestions.push({
        id: `perf-${suggestionId++}`,
        priority: 'medium',
        category: 'performance',
        title: 'Improve Parallelization',
        description: opportunity,
        implementation: 'Review job dependencies and run independent jobs in parallel',
        estimatedImpact: '20-40% faster build times',
        effort: 'medium',
        prerequisites: [],
        relatedSuggestions: []
      });
    });

    performanceAnalysis.cachingOpportunities.forEach(opportunity => {
      suggestions.push({
        id: `perf-${suggestionId++}`,
        priority: 'high',
        category: 'performance',
        title: 'Add Dependency Caching',
        description: opportunity,
        implementation: 'Add actions/cache step before dependency installation',
        estimatedImpact: '30-60% faster dependency installation',
        effort: 'low',
        prerequisites: [],
        relatedSuggestions: []
      });
    });

    // Security suggestions
    securityAnalysis.vulnerabilities.forEach(vulnerability => {
      suggestions.push({
        id: `sec-${suggestionId++}`,
        priority: vulnerability.severity === 'critical' ? 'critical' : 
                 vulnerability.severity === 'high' ? 'high' : 'medium',
        category: 'security',
        title: `Fix ${vulnerability.type} vulnerability`,
        description: vulnerability.description,
        implementation: vulnerability.remediation,
        estimatedImpact: 'Improved security posture',
        effort: vulnerability.type === 'action-version' ? 'low' : 'medium',
        prerequisites: [],
        relatedSuggestions: []
      });
    });

    // Best practice suggestions
    bestPracticeAnalysis.recommendations.forEach(recommendation => {
      suggestions.push({
        id: `bp-${suggestionId++}`,
        priority: recommendation.priority,
        category: 'best-practice',
        title: recommendation.description,
        description: recommendation.benefit,
        implementation: recommendation.implementation,
        estimatedImpact: 'Better maintainability and reliability',
        effort: 'low',
        prerequisites: [],
        relatedSuggestions: []
      });
    });

    // Sort by priority
    const priorityOrder: Record<SuggestionPriority, number> = {
      critical: 0, high: 1, medium: 2, low: 3, info: 4
    };

    return suggestions.sort((a, b) => 
      priorityOrder[a.priority] - priorityOrder[b.priority]
    );
  }

  /**
   * Calculate improvement score
   */
  private calculateImprovementScore(
    validationResult: ValidationResult,
    performanceAnalysis: PerformanceAnalysis,
    securityAnalysis: SecurityAnalysis,
    bestPracticeAnalysis: BestPracticeAnalysis,
    compatibilityAnalysis: CompatibilityAnalysis
  ): number {
    let score = 100;

    // Deduct for validation errors
    score -= validationResult.errors.length * 10;
    score -= validationResult.warnings.length * 5;

    // Factor in security score
    score = (score + securityAnalysis.securityScore) / 2;

    // Factor in best practices score
    score = (score + bestPracticeAnalysis.overallScore) / 2;

    // Factor in performance potential
    if (performanceAnalysis.optimizationPotential === 'high') {
      score -= 20;
    } else if (performanceAnalysis.optimizationPotential === 'medium') {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Estimate improvements from suggestions
   */
  private estimateImprovements(
    suggestions: DetailedSuggestion[],
    performanceAnalysis: PerformanceAnalysis,
    securityAnalysis: SecurityAnalysis
  ): EstimatedImprovement[] {
    const improvements: EstimatedImprovement[] = [];

    // Runtime improvement
    const performanceSuggestions = suggestions.filter(s => s.category === 'performance');
    if (performanceSuggestions.length > 0) {
      const estimatedImprovement = Math.min(50, performanceSuggestions.length * 15);
      improvements.push({
        metric: 'runtime',
        currentValue: performanceAnalysis.estimatedRuntime,
        improvedValue: performanceAnalysis.estimatedRuntime * (1 - estimatedImprovement / 100),
        improvement: `${estimatedImprovement}% faster`,
        confidence: 0.8
      });
    }

    // Security improvement
    const securitySuggestions = suggestions.filter(s => s.category === 'security');
    if (securitySuggestions.length > 0) {
      const estimatedImprovement = Math.min(30, securitySuggestions.length * 10);
      improvements.push({
        metric: 'security',
        currentValue: securityAnalysis.securityScore,
        improvedValue: Math.min(100, securityAnalysis.securityScore + estimatedImprovement),
        improvement: `${estimatedImprovement} point increase`,
        confidence: 0.9
      });
    }

    return improvements;
  }

  // Helper methods for analysis
  private estimateStepRuntime(step: any, detectionResult?: DetectionResult): number {
    // Basic runtime estimation based on step type
    if (step.uses) {
      if (step.uses.includes('setup-')) return 30; // Setup steps
      if (step.uses.includes('cache')) return 10; // Cache steps
      if (step.uses.includes('checkout')) return 15; // Checkout
      return 20; // Other actions
    }
    
    if (step.run) {
      if (step.run.includes('install') || step.run.includes('npm ci')) return 60;
      if (step.run.includes('build')) return 120;
      if (step.run.includes('test')) return 90;
      return 30; // Other run commands
    }
    
    return 10; // Default
  }

  private analyzeNamingConventions(workflowObject: any, violations: BestPracticeViolation[]): number {
    let score = 100;
    
    // Check workflow name
    if (!workflowObject.name || workflowObject.name.length < 3) {
      violations.push({
        rule: 'naming-workflow-name',
        severity: 'warning',
        location: 'workflow.name',
        description: 'Workflow should have a descriptive name',
        fix: 'Add a clear, descriptive name for the workflow'
      });
      score -= 10;
    }

    return score;
  }

  private analyzeWorkflowStructure(workflowObject: any, violations: BestPracticeViolation[]): number {
    let score = 100;
    
    if (!workflowObject.jobs || Object.keys(workflowObject.jobs).length === 0) {
      violations.push({
        rule: 'structure-no-jobs',
        severity: 'error',
        location: 'workflow.jobs',
        description: 'Workflow must have at least one job',
        fix: 'Add at least one job to the workflow'
      });
      score -= 50;
    }

    return score;
  }

  private analyzeErrorHandling(workflowObject: any, violations: BestPracticeViolation[]): number {
    let score = 100;
    
    // Check for continue-on-error usage
    if (workflowObject.jobs) {
      Object.keys(workflowObject.jobs).forEach(jobId => {
        const job = workflowObject.jobs[jobId];
        if (job.steps) {
          const hasErrorHandling = job.steps.some((step: any) => 
            step['continue-on-error'] !== undefined || step.if
          );
          
          if (!hasErrorHandling && job.steps.length > 5) {
            violations.push({
              rule: 'error-handling-missing',
              severity: 'info',
              location: `jobs.${jobId}`,
              description: 'Consider adding error handling for complex jobs',
              fix: 'Add continue-on-error or conditional steps where appropriate'
            });
            score -= 5;
          }
        }
      });
    }

    return score;
  }

  private categorizeBestPractice(rule: string): string {
    if (rule.includes('naming')) return 'naming';
    if (rule.includes('structure')) return 'structure';
    if (rule.includes('error')) return 'error-handling';
    return 'general';
  }

  private getBestPracticeBenefit(rule: string): string {
    if (rule.includes('naming')) return 'Improved readability and maintainability';
    if (rule.includes('structure')) return 'Better workflow organization';
    if (rule.includes('error')) return 'More robust error handling';
    return 'General improvement';
  }

  private isRunnerCompatible(runner: string): boolean {
    const compatibleRunners = [
      'ubuntu-latest', 'ubuntu-22.04', 'ubuntu-20.04',
      'windows-latest', 'windows-2022', 'windows-2019',
      'macos-latest', 'macos-12', 'macos-11'
    ];
    return compatibleRunners.includes(runner);
  }

  private getRunnerIssues(runner: string): string[] {
    if (!this.isRunnerCompatible(runner)) {
      return [`Runner '${runner}' may not be available or supported`];
    }
    return [];
  }

  private getRunnerAlternatives(runner: string): string[] {
    if (runner.includes('ubuntu')) return ['ubuntu-latest', 'ubuntu-22.04'];
    if (runner.includes('windows')) return ['windows-latest', 'windows-2022'];
    if (runner.includes('macos')) return ['macos-latest', 'macos-12'];
    return ['ubuntu-latest'];
  }

  private createMinimalFeedback(validationResult: ValidationResult, error: Error): DetailedValidationFeedback {
    return {
      validationResult,
      performanceAnalysis: this.createEmptyPerformanceAnalysis(),
      securityAnalysis: this.createEmptySecurityAnalysis(),
      bestPracticeAnalysis: this.createEmptyBestPracticeAnalysis(),
      compatibilityAnalysis: this.createEmptyCompatibilityAnalysis(),
      suggestions: [],
      improvementScore: 0,
      estimatedImprovements: []
    };
  }

  private createEmptyPerformanceAnalysis(): PerformanceAnalysis {
    return {
      estimatedRuntime: 0,
      parallelizationOpportunities: [],
      cachingOpportunities: [],
      optimizationPotential: 'low',
      bottlenecks: []
    };
  }

  private createEmptySecurityAnalysis(): SecurityAnalysis {
    return {
      securityScore: 0,
      vulnerabilities: [],
      missingSecurityFeatures: [],
      complianceIssues: [],
      recommendations: []
    };
  }

  private createEmptyBestPracticeAnalysis(): BestPracticeAnalysis {
    return {
      overallScore: 0,
      categories: [],
      violations: [],
      recommendations: []
    };
  }

  private createEmptyCompatibilityAnalysis(): CompatibilityAnalysis {
    return {
      githubActionsVersion: 'v2',
      runnerCompatibility: [],
      actionCompatibility: [],
      deprecationWarnings: [],
      futureCompatibility: []
    };
  }
}