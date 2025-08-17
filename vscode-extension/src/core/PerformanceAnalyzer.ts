/**
 * Performance Analyzer
 * 
 * Analyzes workflows for performance optimization opportunities.
 * Provides recommendations for caching, parallelization, and resource optimization.
 */

import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import { WorkflowType, ExtensionConfiguration } from './types';

export interface PerformanceAnalysis {
  workflowPath: string;
  overallScore: number;
  recommendations: PerformanceRecommendation[];
  cachingOpportunities: CachingOpportunity[];
  parallelizationSuggestions: ParallelizationSuggestion[];
  resourceOptimizations: ResourceOptimization[];
  bottlenecks: PerformanceBottleneck[];
  estimatedImprovements: EstimatedImprovement[];
}

export interface PerformanceRecommendation {
  id: string;
  title: string;
  description: string;
  category: 'caching' | 'parallelization' | 'resource' | 'dependency' | 'matrix';
  priority: 'high' | 'medium' | 'low';
  estimatedTimeSaving: number; // in seconds
  implementation: RecommendationImplementation;
  applicableSteps: string[];
}

export interface RecommendationImplementation {
  type: 'yaml-modification' | 'step-addition' | 'job-restructure' | 'matrix-optimization';
  changes: YamlChange[];
  example: string;
  documentation: string;
}

export interface YamlChange {
  path: string;
  operation: 'add' | 'modify' | 'remove';
  value?: any;
  condition?: string;
}

export interface CachingOpportunity {
  stepName: string;
  jobName: string;
  cacheType: 'dependencies' | 'build-artifacts' | 'test-results' | 'docker-layers';
  framework: string;
  estimatedSaving: number;
  cacheKey: string;
  cachePaths: string[];
  implementation: string;
}

export interface ParallelizationSuggestion {
  currentStructure: 'sequential' | 'partially-parallel' | 'parallel';
  suggestedStructure: 'parallel' | 'matrix' | 'fan-out-fan-in';
  affectedJobs: string[];
  dependencies: JobDependency[];
  estimatedReduction: number;
  implementation: ParallelizationImplementation;
}

export interface JobDependency {
  job: string;
  dependsOn: string[];
  canRunInParallel: boolean;
  reason: string;
}

export interface ParallelizationImplementation {
  strategy: 'job-parallelization' | 'matrix-build' | 'workflow-splitting';
  configuration: any;
  example: string;
}

export interface ResourceOptimization {
  resourceType: 'runner' | 'memory' | 'cpu' | 'storage';
  currentUsage: string;
  recommendedUsage: string;
  reasoning: string;
  costImpact: 'increase' | 'decrease' | 'neutral';
  performanceImpact: number;
}

export interface PerformanceBottleneck {
  location: string;
  type: 'slow-step' | 'resource-constraint' | 'dependency-wait' | 'inefficient-caching';
  description: string;
  estimatedDuration: number;
  suggestions: string[];
}

export interface EstimatedImprovement {
  category: string;
  currentTime: number;
  optimizedTime: number;
  timeSaving: number;
  confidence: number;
}

export class PerformanceAnalyzer {
  private frameworkCacheStrategies: Map<string, CacheStrategy> = new Map();
  private runnerPerformanceProfiles: Map<string, RunnerProfile> = new Map();

  constructor(
    private context: vscode.ExtensionContext,
    private configuration: ExtensionConfiguration
  ) {
    this.initializeFrameworkStrategies();
    this.initializeRunnerProfiles();
  }

  /**
   * Analyze workflow performance and provide optimization recommendations
   */
  async analyzeWorkflowPerformance(workflowPath: string): Promise<PerformanceAnalysis> {
    try {
      const workflowContent = await vscode.workspace.fs.readFile(vscode.Uri.file(workflowPath));
      const workflow = yaml.load(workflowContent.toString()) as any;

      const analysis: PerformanceAnalysis = {
        workflowPath,
        overallScore: 0,
        recommendations: [],
        cachingOpportunities: [],
        parallelizationSuggestions: [],
        resourceOptimizations: [],
        bottlenecks: [],
        estimatedImprovements: []
      };

      // Analyze different aspects of performance
      analysis.cachingOpportunities = await this.analyzeCachingOpportunities(workflow);
      analysis.parallelizationSuggestions = await this.analyzeParallelizationOpportunities(workflow);
      analysis.resourceOptimizations = await this.analyzeResourceOptimizations(workflow);
      analysis.bottlenecks = await this.identifyBottlenecks(workflow);

      // Generate recommendations based on analysis
      analysis.recommendations = this.generateRecommendations(analysis);

      // Calculate estimated improvements
      analysis.estimatedImprovements = this.calculateEstimatedImprovements(analysis);

      // Calculate overall performance score
      analysis.overallScore = this.calculateOverallScore(analysis);

      return analysis;

    } catch (error) {
      throw new Error(`Failed to analyze workflow performance: ${error.message}`);
    }
  }

  /**
   * Analyze multiple workflows and provide comparative analysis
   */
  async analyzeMultipleWorkflows(workflowPaths: string[]): Promise<MultiWorkflowAnalysis> {
    const analyses = await Promise.all(
      workflowPaths.map(path => this.analyzeWorkflowPerformance(path))
    );

    return {
      workflows: analyses,
      crossWorkflowOptimizations: this.findCrossWorkflowOptimizations(analyses),
      sharedCachingOpportunities: this.findSharedCachingOpportunities(analyses),
      resourceConsolidation: this.analyzeResourceConsolidation(analyses),
      overallRecommendations: this.generateOverallRecommendations(analyses)
    };
  }

  /**
   * Generate optimized workflow with performance improvements applied
   */
  async generateOptimizedWorkflow(
    workflowPath: string,
    selectedRecommendations: string[]
  ): Promise<OptimizedWorkflowResult> {
    const analysis = await this.analyzeWorkflowPerformance(workflowPath);
    const workflowContent = await vscode.workspace.fs.readFile(vscode.Uri.file(workflowPath));
    let workflow = yaml.load(workflowContent.toString()) as any;

    const appliedOptimizations: AppliedOptimization[] = [];
    const warnings: string[] = [];

    for (const recommendationId of selectedRecommendations) {
      const recommendation = analysis.recommendations.find(r => r.id === recommendationId);
      if (!recommendation) {
        warnings.push(`Recommendation ${recommendationId} not found`);
        continue;
      }

      try {
        workflow = this.applyRecommendation(workflow, recommendation);
        appliedOptimizations.push({
          recommendationId,
          title: recommendation.title,
          estimatedSaving: recommendation.estimatedTimeSaving,
          applied: true
        });
      } catch (error) {
        warnings.push(`Failed to apply recommendation ${recommendationId}: ${error.message}`);
        appliedOptimizations.push({
          recommendationId,
          title: recommendation.title,
          estimatedSaving: 0,
          applied: false,
          error: error.message
        });
      }
    }

    const optimizedContent = yaml.dump(workflow, { indent: 2, lineWidth: 120 });
    const totalEstimatedSaving = appliedOptimizations
      .filter(o => o.applied)
      .reduce((sum, o) => sum + o.estimatedSaving, 0);

    return {
      originalPath: workflowPath,
      optimizedContent,
      appliedOptimizations,
      warnings,
      estimatedTimeSaving: totalEstimatedSaving,
      performanceScore: this.calculateOptimizedScore(analysis, appliedOptimizations)
    };
  }

  private async analyzeCachingOpportunities(workflow: any): Promise<CachingOpportunity[]> {
    const opportunities: CachingOpportunity[] = [];

    if (!workflow.jobs) return opportunities;

    for (const [jobName, job] of Object.entries(workflow.jobs as any)) {
      const jobObj = job as any;
      if (!jobObj.steps) continue;

      for (const step of jobObj.steps) {
        // Analyze dependency caching opportunities
        if (this.isDependencyInstallStep(step)) {
          const framework = this.detectFrameworkFromStep(step);
          const cacheStrategy = this.frameworkCacheStrategies.get(framework);
          
          if (cacheStrategy && !this.hasCaching(jobObj.steps, step)) {
            opportunities.push({
              stepName: step.name || 'Dependency Installation',
              jobName,
              cacheType: 'dependencies',
              framework,
              estimatedSaving: cacheStrategy.estimatedSaving,
              cacheKey: cacheStrategy.cacheKey,
              cachePaths: cacheStrategy.paths,
              implementation: this.generateCacheImplementation(cacheStrategy, step)
            });
          }
        }

        // Analyze build artifact caching
        if (this.isBuildStep(step)) {
          opportunities.push({
            stepName: step.name || 'Build',
            jobName,
            cacheType: 'build-artifacts',
            framework: 'generic',
            estimatedSaving: 120, // 2 minutes average
            cacheKey: 'build-${{ hashFiles(\'**/*.json\', \'**/*.lock\') }}',
            cachePaths: ['dist/', 'build/', 'out/'],
            implementation: this.generateBuildCacheImplementation(step)
          });
        }

        // Analyze Docker layer caching
        if (this.isDockerStep(step)) {
          opportunities.push({
            stepName: step.name || 'Docker Build',
            jobName,
            cacheType: 'docker-layers',
            framework: 'docker',
            estimatedSaving: 180, // 3 minutes average
            cacheKey: 'docker-${{ hashFiles(\'Dockerfile\', \'**/*.json\') }}',
            cachePaths: ['/tmp/.buildx-cache'],
            implementation: this.generateDockerCacheImplementation(step)
          });
        }
      }
    }

    return opportunities;
  }

  private async analyzeParallelizationOpportunities(workflow: any): Promise<ParallelizationSuggestion[]> {
    const suggestions: ParallelizationSuggestion[] = [];

    if (!workflow.jobs) return suggestions;

    const jobs = Object.keys(workflow.jobs);
    const dependencies = this.analyzeJobDependencies(workflow.jobs);
    
    // Analyze current parallelization level
    const currentStructure = this.determineCurrentParallelization(workflow.jobs, dependencies);
    
    // Suggest job parallelization
    const parallelizableJobs = dependencies.filter(dep => dep.canRunInParallel);
    if (parallelizableJobs.length > 1) {
      suggestions.push({
        currentStructure,
        suggestedStructure: 'parallel',
        affectedJobs: parallelizableJobs.map(j => j.job),
        dependencies,
        estimatedReduction: this.calculateParallelizationSaving(parallelizableJobs),
        implementation: {
          strategy: 'job-parallelization',
          configuration: {
            removeUnnecessaryDependencies: true,
            parallelJobs: parallelizableJobs.map(j => j.job)
          },
          example: this.generateParallelizationExample(parallelizableJobs)
        }
      });
    }

    // Suggest matrix builds
    const matrixOpportunities = this.findMatrixBuildOpportunities(workflow.jobs);
    for (const opportunity of matrixOpportunities) {
      suggestions.push({
        currentStructure,
        suggestedStructure: 'matrix',
        affectedJobs: [opportunity.jobName],
        dependencies: [],
        estimatedReduction: opportunity.estimatedSaving,
        implementation: {
          strategy: 'matrix-build',
          configuration: opportunity.matrixConfig,
          example: opportunity.example
        }
      });
    }

    return suggestions;
  }

  private async analyzeResourceOptimizations(workflow: any): Promise<ResourceOptimization[]> {
    const optimizations: ResourceOptimization[] = [];

    if (!workflow.jobs) return optimizations;

    for (const [jobName, job] of Object.entries(workflow.jobs as any)) {
      // Analyze runner optimization
      const runnerOptimization = this.analyzeRunnerOptimization(job, jobName);
      if (runnerOptimization) {
        optimizations.push(runnerOptimization);
      }

      // Analyze resource allocation
      const resourceOptimizations = this.analyzeResourceAllocation(job, jobName);
      optimizations.push(...resourceOptimizations);
    }

    return optimizations;
  }

  private async identifyBottlenecks(workflow: any): Promise<PerformanceBottleneck[]> {
    const bottlenecks: PerformanceBottleneck[] = [];

    if (!workflow.jobs) return bottlenecks;

    for (const [jobName, job] of Object.entries(workflow.jobs as any)) {
      const jobObj = job as any;
      if (!jobObj.steps) continue;

      // Identify slow steps
      const slowSteps = this.identifySlowSteps(jobObj.steps, jobName);
      bottlenecks.push(...slowSteps);

      // Identify dependency bottlenecks
      const dependencyBottlenecks = this.identifyDependencyBottlenecks(jobObj, jobName);
      bottlenecks.push(...dependencyBottlenecks);
    }

    return bottlenecks;
  }

  private generateRecommendations(analysis: PerformanceAnalysis): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];

    // Generate caching recommendations
    for (const opportunity of analysis.cachingOpportunities) {
      recommendations.push({
        id: `cache-${opportunity.stepName.toLowerCase().replace(/\s+/g, '-')}`,
        title: `Add ${opportunity.cacheType} caching for ${opportunity.stepName}`,
        description: `Implement caching for ${opportunity.framework} dependencies to reduce build time`,
        category: 'caching',
        priority: opportunity.estimatedSaving > 120 ? 'high' : 'medium',
        estimatedTimeSaving: opportunity.estimatedSaving,
        implementation: {
          type: 'step-addition',
          changes: [{
            path: `jobs.${opportunity.jobName}.steps`,
            operation: 'add',
            value: this.generateCacheStep(opportunity)
          }],
          example: opportunity.implementation,
          documentation: 'https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows'
        },
        applicableSteps: [opportunity.stepName]
      });
    }

    // Generate parallelization recommendations
    for (const suggestion of analysis.parallelizationSuggestions) {
      recommendations.push({
        id: `parallel-${suggestion.suggestedStructure}`,
        title: `Implement ${suggestion.suggestedStructure} execution`,
        description: `Convert sequential jobs to ${suggestion.suggestedStructure} execution`,
        category: 'parallelization',
        priority: suggestion.estimatedReduction > 300 ? 'high' : 'medium',
        estimatedTimeSaving: suggestion.estimatedReduction,
        implementation: {
          type: 'job-restructure',
          changes: this.generateParallelizationChanges(suggestion),
          example: suggestion.implementation.example,
          documentation: 'https://docs.github.com/en/actions/using-jobs/using-jobs-in-a-workflow'
        },
        applicableSteps: suggestion.affectedJobs
      });
    }

    // Generate resource optimization recommendations
    for (const optimization of analysis.resourceOptimizations) {
      recommendations.push({
        id: `resource-${optimization.resourceType}`,
        title: `Optimize ${optimization.resourceType} usage`,
        description: optimization.reasoning,
        category: 'resource',
        priority: optimization.performanceImpact > 0.2 ? 'high' : 'low',
        estimatedTimeSaving: optimization.performanceImpact * 60, // Convert to seconds
        implementation: {
          type: 'yaml-modification',
          changes: [{
            path: `jobs.*.runs-on`,
            operation: 'modify',
            value: optimization.recommendedUsage
          }],
          example: `runs-on: ${optimization.recommendedUsage}`,
          documentation: 'https://docs.github.com/en/actions/using-github-hosted-runners/about-github-hosted-runners'
        },
        applicableSteps: []
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority] || 
             b.estimatedTimeSaving - a.estimatedTimeSaving;
    });
  }

  private calculateEstimatedImprovements(analysis: PerformanceAnalysis): EstimatedImprovement[] {
    const improvements: EstimatedImprovement[] = [];

    // Calculate caching improvements
    const cachingImprovement = analysis.cachingOpportunities.reduce((sum, opp) => sum + opp.estimatedSaving, 0);
    if (cachingImprovement > 0) {
      improvements.push({
        category: 'Caching',
        currentTime: 600, // Assume 10 minutes baseline
        optimizedTime: 600 - cachingImprovement,
        timeSaving: cachingImprovement,
        confidence: 0.8
      });
    }

    // Calculate parallelization improvements
    const parallelizationImprovement = analysis.parallelizationSuggestions.reduce((sum, sugg) => sum + sugg.estimatedReduction, 0);
    if (parallelizationImprovement > 0) {
      improvements.push({
        category: 'Parallelization',
        currentTime: 900, // Assume 15 minutes baseline
        optimizedTime: 900 - parallelizationImprovement,
        timeSaving: parallelizationImprovement,
        confidence: 0.7
      });
    }

    // Calculate resource optimization improvements
    const resourceImprovement = analysis.resourceOptimizations.reduce((sum, opt) => sum + (opt.performanceImpact * 60), 0);
    if (resourceImprovement > 0) {
      improvements.push({
        category: 'Resource Optimization',
        currentTime: 480, // Assume 8 minutes baseline
        optimizedTime: 480 - resourceImprovement,
        timeSaving: resourceImprovement,
        confidence: 0.6
      });
    }

    return improvements;
  }

  private calculateOverallScore(analysis: PerformanceAnalysis): number {
    let score = 100; // Start with perfect score

    // Deduct points for missing caching
    score -= analysis.cachingOpportunities.length * 10;

    // Deduct points for poor parallelization
    score -= analysis.parallelizationSuggestions.length * 15;

    // Deduct points for resource inefficiencies
    score -= analysis.resourceOptimizations.length * 5;

    // Deduct points for bottlenecks
    score -= analysis.bottlenecks.length * 8;

    return Math.max(0, Math.min(100, score));
  }

  // Helper methods for analysis
  private initializeFrameworkStrategies(): void {
    this.frameworkCacheStrategies.set('node', {
      cacheKey: 'node-${{ hashFiles(\'**/package-lock.json\', \'**/yarn.lock\') }}',
      paths: ['~/.npm', '~/.yarn/cache', 'node_modules'],
      estimatedSaving: 180
    });

    this.frameworkCacheStrategies.set('python', {
      cacheKey: 'python-${{ hashFiles(\'**/requirements.txt\', \'**/Pipfile.lock\') }}',
      paths: ['~/.cache/pip'],
      estimatedSaving: 120
    });

    this.frameworkCacheStrategies.set('java', {
      cacheKey: 'java-${{ hashFiles(\'**/pom.xml\', \'**/build.gradle\') }}',
      paths: ['~/.m2/repository', '~/.gradle/caches'],
      estimatedSaving: 240
    });

    this.frameworkCacheStrategies.set('go', {
      cacheKey: 'go-${{ hashFiles(\'**/go.sum\') }}',
      paths: ['~/go/pkg/mod'],
      estimatedSaving: 90
    });
  }

  private initializeRunnerProfiles(): void {
    this.runnerPerformanceProfiles.set('ubuntu-latest', {
      cpu: 2,
      memory: 7,
      storage: 14,
      costPerMinute: 0.008,
      suitableFor: ['general', 'web', 'api']
    });

    this.runnerPerformanceProfiles.set('ubuntu-22.04', {
      cpu: 2,
      memory: 7,
      storage: 14,
      costPerMinute: 0.008,
      suitableFor: ['general', 'web', 'api']
    });

    this.runnerPerformanceProfiles.set('windows-latest', {
      cpu: 2,
      memory: 7,
      storage: 14,
      costPerMinute: 0.016,
      suitableFor: ['windows', 'dotnet', 'desktop']
    });

    this.runnerPerformanceProfiles.set('macos-latest', {
      cpu: 3,
      memory: 14,
      storage: 14,
      costPerMinute: 0.08,
      suitableFor: ['ios', 'macos', 'mobile']
    });
  }

  private isDependencyInstallStep(step: any): boolean {
    if (!step.run && !step.uses) return false;
    
    const installPatterns = [
      /npm\s+install/,
      /yarn\s+install/,
      /pip\s+install/,
      /mvn\s+install/,
      /gradle\s+build/,
      /go\s+mod\s+download/
    ];

    const command = step.run || step.uses || '';
    return installPatterns.some(pattern => pattern.test(command));
  }

  private detectFrameworkFromStep(step: any): string {
    const command = step.run || step.uses || '';
    
    if (/npm|yarn|node/.test(command)) return 'node';
    if (/pip|python/.test(command)) return 'python';
    if (/mvn|maven|gradle/.test(command)) return 'java';
    if (/go\s+/.test(command)) return 'go';
    if (/dotnet|nuget/.test(command)) return 'dotnet';
    
    return 'generic';
  }

  private hasCaching(steps: any[], targetStep: any): boolean {
    return steps.some(step => 
      step.uses && step.uses.includes('actions/cache') &&
      steps.indexOf(step) < steps.indexOf(targetStep)
    );
  }

  private isBuildStep(step: any): boolean {
    const buildPatterns = [
      /npm\s+run\s+build/,
      /yarn\s+build/,
      /mvn\s+compile/,
      /gradle\s+build/,
      /go\s+build/,
      /dotnet\s+build/
    ];

    const command = step.run || '';
    return buildPatterns.some(pattern => pattern.test(command));
  }

  private isDockerStep(step: any): boolean {
    return step.uses && step.uses.includes('docker/') ||
           step.run && /docker\s+build/.test(step.run);
  }

  private generateCacheImplementation(strategy: CacheStrategy, step: any): string {
    return `- name: Cache dependencies
  uses: actions/cache@v3
  with:
    path: |
${strategy.paths.map(p => `      ${p}`).join('\n')}
    key: ${strategy.cacheKey}
    restore-keys: |
      ${strategy.cacheKey.split('-')[0]}-`;
  }

  private generateBuildCacheImplementation(step: any): string {
    return `- name: Cache build artifacts
  uses: actions/cache@v3
  with:
    path: |
      dist/
      build/
      out/
    key: build-\${{ hashFiles('**/*.json', '**/*.lock') }}
    restore-keys: |
      build-`;
  }

  private generateDockerCacheImplementation(step: any): string {
    return `- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v2
  
- name: Cache Docker layers
  uses: actions/cache@v3
  with:
    path: /tmp/.buildx-cache
    key: docker-\${{ hashFiles('Dockerfile', '**/*.json') }}
    restore-keys: |
      docker-`;
  }

  private analyzeJobDependencies(jobs: any): JobDependency[] {
    const dependencies: JobDependency[] = [];

    for (const [jobName, job] of Object.entries(jobs)) {
      const needs = (job as any).needs || [];
      const dependsOn = Array.isArray(needs) ? needs : [needs].filter(Boolean);
      
      dependencies.push({
        job: jobName,
        dependsOn,
        canRunInParallel: dependsOn.length === 0,
        reason: dependsOn.length === 0 ? 'No dependencies' : `Depends on: ${dependsOn.join(', ')}`
      });
    }

    return dependencies;
  }

  private determineCurrentParallelization(jobs: any, dependencies: JobDependency[]): 'sequential' | 'partially-parallel' | 'parallel' {
    const parallelJobs = dependencies.filter(d => d.canRunInParallel).length;
    const totalJobs = Object.keys(jobs).length;

    if (parallelJobs === 0) return 'sequential';
    if (parallelJobs === totalJobs) return 'parallel';
    return 'partially-parallel';
  }

  private calculateParallelizationSaving(parallelizableJobs: JobDependency[]): number {
    // Estimate time saving based on number of jobs that can run in parallel
    const averageJobTime = 300; // 5 minutes
    const parallelJobs = parallelizableJobs.length;
    
    if (parallelJobs <= 1) return 0;
    
    // Time saving = (sequential time - parallel time)
    const sequentialTime = parallelJobs * averageJobTime;
    const parallelTime = averageJobTime; // All jobs run simultaneously
    
    return sequentialTime - parallelTime;
  }

  private findMatrixBuildOpportunities(jobs: any): MatrixOpportunity[] {
    const opportunities: MatrixOpportunity[] = [];

    for (const [jobName, job] of Object.entries(jobs as any)) {
      const jobObj = job as any;
      if (!jobObj.steps) continue;

      // Look for opportunities to use matrix builds
      const testingSteps = jobObj.steps.filter((step: any) => 
        step.run && /test|spec/.test(step.run)
      );

      if (testingSteps.length > 0) {
        // Suggest matrix for multiple Node.js versions, Python versions, etc.
        const framework = this.detectFrameworkFromJob(jobObj);
        const matrixConfig = this.generateMatrixConfig(framework);
        
        if (matrixConfig) {
          opportunities.push({
            jobName,
            matrixConfig,
            estimatedSaving: 120, // 2 minutes average
            example: this.generateMatrixExample(jobName, matrixConfig)
          });
        }
      }
    }

    return opportunities;
  }

  private detectFrameworkFromJob(job: any): string {
    const steps = job.steps || [];
    for (const step of steps) {
      const framework = this.detectFrameworkFromStep(step);
      if (framework !== 'generic') return framework;
    }
    return 'generic';
  }

  private generateMatrixConfig(framework: string): any {
    const matrixConfigs: Record<string, any> = {
      node: {
        'node-version': ['16', '18', '20']
      },
      python: {
        'python-version': ['3.8', '3.9', '3.10', '3.11']
      },
      java: {
        'java-version': ['11', '17', '21']
      }
    };

    return matrixConfigs[framework];
  }

  private generateMatrixExample(jobName: string, matrixConfig: any): string {
    return `${jobName}:
  runs-on: ubuntu-latest
  strategy:
    matrix:
${Object.entries(matrixConfig).map(([key, values]) => 
  `      ${key}: ${JSON.stringify(values)}`
).join('\n')}
  steps:
    - uses: actions/checkout@v3
    - name: Setup
      uses: actions/setup-node@v3
      with:
        node-version: \${{ matrix.node-version }}`;
  }

  private analyzeRunnerOptimization(job: any, jobName: string): ResourceOptimization | null {
    const currentRunner = job['runs-on'] || 'ubuntu-latest';
    const currentProfile = this.runnerPerformanceProfiles.get(currentRunner);
    
    if (!currentProfile) return null;

    // Analyze job requirements and suggest optimal runner
    const jobComplexity = this.assessJobComplexity(job);
    const optimalRunner = this.selectOptimalRunner(jobComplexity);
    
    if (optimalRunner !== currentRunner) {
      const optimalProfile = this.runnerPerformanceProfiles.get(optimalRunner)!;
      
      return {
        resourceType: 'runner',
        currentUsage: currentRunner,
        recommendedUsage: optimalRunner,
        reasoning: `Job complexity suggests ${optimalRunner} would be more cost-effective`,
        costImpact: optimalProfile.costPerMinute < currentProfile.costPerMinute ? 'decrease' : 'increase',
        performanceImpact: this.calculatePerformanceImpact(currentProfile, optimalProfile)
      };
    }

    return null;
  }

  private analyzeResourceAllocation(job: any, jobName: string): ResourceOptimization[] {
    const optimizations: ResourceOptimization[] = [];
    
    // This is a simplified implementation
    // In practice, you would analyze actual resource usage patterns
    
    return optimizations;
  }

  private identifySlowSteps(steps: any[], jobName: string): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = [];

    for (const step of steps) {
      const estimatedDuration = this.estimateStepDuration(step);
      
      if (estimatedDuration > 300) { // 5 minutes
        bottlenecks.push({
          location: `${jobName}.${step.name || 'unnamed step'}`,
          type: 'slow-step',
          description: `Step takes approximately ${Math.round(estimatedDuration / 60)} minutes`,
          estimatedDuration,
          suggestions: this.generateSlowStepSuggestions(step)
        });
      }
    }

    return bottlenecks;
  }

  private identifyDependencyBottlenecks(job: any, jobName: string): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = [];
    
    const needs = job.needs || [];
    if (needs.length > 3) {
      bottlenecks.push({
        location: jobName,
        type: 'dependency-wait',
        description: `Job waits for ${needs.length} dependencies`,
        estimatedDuration: 180, // 3 minutes average wait
        suggestions: [
          'Consider reducing dependencies',
          'Parallelize independent jobs',
          'Use conditional job execution'
        ]
      });
    }

    return bottlenecks;
  }

  private assessJobComplexity(job: any): 'simple' | 'moderate' | 'complex' {
    const steps = job.steps || [];
    const stepCount = steps.length;
    
    if (stepCount <= 5) return 'simple';
    if (stepCount <= 10) return 'moderate';
    return 'complex';
  }

  private selectOptimalRunner(complexity: 'simple' | 'moderate' | 'complex'): string {
    switch (complexity) {
      case 'simple': return 'ubuntu-latest';
      case 'moderate': return 'ubuntu-latest';
      case 'complex': return 'ubuntu-latest'; // Could suggest larger runners
      default: return 'ubuntu-latest';
    }
  }

  private calculatePerformanceImpact(current: RunnerProfile, optimal: RunnerProfile): number {
    // Calculate performance impact as a ratio
    const cpuImpact = optimal.cpu / current.cpu;
    const memoryImpact = optimal.memory / current.memory;
    return (cpuImpact + memoryImpact) / 2 - 1; // -1 to 1 scale
  }

  private estimateStepDuration(step: any): number {
    const command = step.run || step.uses || '';
    
    // Estimate duration based on step patterns
    if (/npm\s+install|yarn\s+install/.test(command)) return 120; // 2 minutes
    if (/pip\s+install/.test(command)) return 90; // 1.5 minutes
    if (/mvn\s+install|gradle\s+build/.test(command)) return 300; // 5 minutes
    if (/npm\s+run\s+build|yarn\s+build/.test(command)) return 180; // 3 minutes
    if (/npm\s+test|yarn\s+test/.test(command)) return 240; // 4 minutes
    if (/docker\s+build/.test(command)) return 360; // 6 minutes
    if (/deploy|publish/.test(command)) return 120; // 2 minutes
    
    return 60; // 1 minute default
  }

  private generateSlowStepSuggestions(step: any): string[] {
    const suggestions: string[] = [];
    const command = step.run || step.uses || '';
    
    if (/npm\s+install|yarn\s+install/.test(command)) {
      suggestions.push('Add dependency caching to speed up installation');
      suggestions.push('Consider using npm ci for faster installs');
    }
    
    if (/docker\s+build/.test(command)) {
      suggestions.push('Enable Docker layer caching');
      suggestions.push('Use multi-stage builds to reduce image size');
      suggestions.push('Consider using a base image with pre-installed dependencies');
    }
    
    if (/test/.test(command)) {
      suggestions.push('Run tests in parallel');
      suggestions.push('Use test result caching');
      suggestions.push('Consider splitting tests across multiple jobs');
    }
    
    if (suggestions.length === 0) {
      suggestions.push('Consider optimizing this step or running it in parallel');
    }
    
    return suggestions;
  }

  private generateParallelizationExample(parallelizableJobs: JobDependency[]): string {
    const jobNames = parallelizableJobs.map(j => j.job);
    return `# Remove dependencies to allow parallel execution
${jobNames.map(job => `${job}:
  runs-on: ubuntu-latest
  # Remove 'needs' to run in parallel`).join('\n\n')}`;
  }

  private generateCacheStep(opportunity: CachingOpportunity): any {
    return {
      name: `Cache ${opportunity.cacheType}`,
      uses: 'actions/cache@v3',
      with: {
        path: opportunity.cachePaths.join('\n'),
        key: opportunity.cacheKey,
        'restore-keys': opportunity.cacheKey.split('-')[0] + '-'
      }
    };
  }

  private findCrossWorkflowOptimizations(analyses: PerformanceAnalysis[]): CrossWorkflowOptimization[] {
    const optimizations: CrossWorkflowOptimization[] = [];
    
    // Find shared caching opportunities
    const sharedCaches = new Map<string, string[]>();
    for (const analysis of analyses) {
      for (const opportunity of analysis.cachingOpportunities) {
        const key = `${opportunity.framework}-${opportunity.cacheType}`;
        if (!sharedCaches.has(key)) {
          sharedCaches.set(key, []);
        }
        sharedCaches.get(key)!.push(analysis.workflowPath);
      }
    }
    
    for (const [cacheType, workflows] of sharedCaches) {
      if (workflows.length > 1) {
        optimizations.push({
          type: 'shared-caching',
          description: `Share ${cacheType} cache across ${workflows.length} workflows`,
          affectedWorkflows: workflows,
          estimatedSaving: workflows.length * 60 // 1 minute per workflow
        });
      }
    }
    
    return optimizations;
  }

  private findSharedCachingOpportunities(analyses: PerformanceAnalysis[]): SharedCachingOpportunity[] {
    const opportunities: SharedCachingOpportunity[] = [];
    const cacheGroups = new Map<string, string[]>();
    
    for (const analysis of analyses) {
      for (const opportunity of analysis.cachingOpportunities) {
        const key = opportunity.cacheKey.split('-')[0]; // Get cache prefix
        if (!cacheGroups.has(key)) {
          cacheGroups.set(key, []);
        }
        cacheGroups.get(key)!.push(analysis.workflowPath);
      }
    }
    
    for (const [cacheType, workflows] of cacheGroups) {
      if (workflows.length > 1) {
        opportunities.push({
          cacheType,
          workflows,
          sharedKey: `${cacheType}-shared-\${{ hashFiles('**/*.json', '**/*.lock') }}`,
          estimatedSaving: workflows.length * 45 // 45 seconds per workflow
        });
      }
    }
    
    return opportunities;
  }

  private analyzeResourceConsolidation(analyses: PerformanceAnalysis[]): ResourceConsolidation {
    const runnerUsage = new Map<string, number>();
    const allJobs: string[] = [];
    
    for (const analysis of analyses) {
      // This is a simplified analysis - in practice you'd parse the actual workflows
      runnerUsage.set('ubuntu-latest', (runnerUsage.get('ubuntu-latest') || 0) + 1);
      allJobs.push(`${analysis.workflowPath}-job`);
    }
    
    return {
      sharedRunners: Array.from(runnerUsage.keys()),
      consolidatedJobs: allJobs.slice(0, 3), // Suggest consolidating first 3 jobs
      estimatedSaving: Math.min(analyses.length * 30, 180) // Max 3 minutes saving
    };
  }

  private generateOverallRecommendations(analyses: PerformanceAnalysis[]): PerformanceRecommendation[] {
    const allRecommendations = analyses.flatMap(a => a.recommendations);
    
    // Group similar recommendations
    const grouped = new Map<string, PerformanceRecommendation[]>();
    for (const rec of allRecommendations) {
      if (!grouped.has(rec.category)) {
        grouped.set(rec.category, []);
      }
      grouped.get(rec.category)!.push(rec);
    }
    
    // Create consolidated recommendations
    const consolidated: PerformanceRecommendation[] = [];
    for (const [category, recs] of grouped) {
      if (recs.length > 1) {
        consolidated.push({
          id: `consolidated-${category}`,
          title: `Optimize ${category} across all workflows`,
          description: `Apply ${category} optimizations to ${recs.length} workflows`,
          category: category as any,
          priority: 'high',
          estimatedTimeSaving: recs.reduce((sum, r) => sum + r.estimatedTimeSaving, 0),
          implementation: {
            type: 'yaml-modification',
            changes: [],
            example: `Apply ${category} optimizations to all workflows`,
            documentation: 'https://docs.github.com/en/actions'
          },
          applicableSteps: []
        });
      }
    }
    
    return consolidated;
  }

  private applyRecommendation(workflow: any, recommendation: PerformanceRecommendation): any {
    const modifiedWorkflow = JSON.parse(JSON.stringify(workflow)); // Deep clone
    
    for (const change of recommendation.implementation.changes) {
      this.applyYamlChange(modifiedWorkflow, change);
    }
    
    return modifiedWorkflow;
  }

  private applyYamlChange(workflow: any, change: YamlChange): void {
    const pathParts = change.path.split('.');
    let current = workflow;
    
    // Navigate to the parent of the target
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (part === '*') {
        // Handle wildcard paths
        for (const key of Object.keys(current)) {
          this.applyYamlChange(current[key], {
            ...change,
            path: pathParts.slice(i + 1).join('.')
          });
        }
        return;
      }
      
      if (!current[part]) {
        if (change.operation === 'add') {
          current[part] = {};
        } else {
          return; // Path doesn't exist
        }
      }
      current = current[part];
    }
    
    const finalKey = pathParts[pathParts.length - 1];
    
    switch (change.operation) {
      case 'add':
        if (Array.isArray(current[finalKey])) {
          current[finalKey].push(change.value);
        } else {
          current[finalKey] = change.value;
        }
        break;
      case 'modify':
        current[finalKey] = change.value;
        break;
      case 'remove':
        delete current[finalKey];
        break;
    }
  }



  private generateParallelizationChanges(suggestion: ParallelizationSuggestion): YamlChange[] {
    const changes: YamlChange[] = [];
    
    // Remove unnecessary dependencies
    for (const job of suggestion.affectedJobs) {
      changes.push({
        path: `jobs.${job}.needs`,
        operation: 'remove'
      });
    }
    
    return changes;
  }

  private calculateOptimizedScore(
    analysis: PerformanceAnalysis,
    optimizations: AppliedOptimization[]
  ): number {
    let score = analysis.overallScore;
    
    // Add points for applied optimizations
    for (const optimization of optimizations) {
      if (optimization.applied) {
        score += Math.min(20, optimization.estimatedSaving / 10);
      }
    }
    
    return Math.min(100, score);
  }
}

// Additional interfaces
interface CacheStrategy {
  cacheKey: string;
  paths: string[];
  estimatedSaving: number;
}

interface RunnerProfile {
  cpu: number;
  memory: number;
  storage: number;
  costPerMinute: number;
  suitableFor: string[];
}

interface MatrixOpportunity {
  jobName: string;
  matrixConfig: any;
  estimatedSaving: number;
  example: string;
}

interface MultiWorkflowAnalysis {
  workflows: PerformanceAnalysis[];
  crossWorkflowOptimizations: CrossWorkflowOptimization[];
  sharedCachingOpportunities: SharedCachingOpportunity[];
  resourceConsolidation: ResourceConsolidation;
  overallRecommendations: PerformanceRecommendation[];
}

interface CrossWorkflowOptimization {
  type: string;
  description: string;
  affectedWorkflows: string[];
  estimatedSaving: number;
}

interface SharedCachingOpportunity {
  cacheType: string;
  workflows: string[];
  sharedKey: string;
  estimatedSaving: number;
}

interface ResourceConsolidation {
  sharedRunners: string[];
  consolidatedJobs: string[];
  estimatedSaving: number;
}

interface OptimizedWorkflowResult {
  originalPath: string;
  optimizedContent: string;
  appliedOptimizations: AppliedOptimization[];
  warnings: string[];
  estimatedTimeSaving: number;
  performanceScore: number;
}

interface AppliedOptimization {
  recommendationId: string;
  title: string;
  estimatedSaving: number;
  applied: boolean;
  error?: string;
}