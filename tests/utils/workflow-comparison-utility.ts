/**
 * Workflow Comparison Utility for validating and comparing generated workflows
 */

import * as yaml from 'js-yaml';

export interface WorkflowComparison {
  similarity: number;
  differences: WorkflowDifference[];
  structuralChanges: StructuralChange[];
  optimizationChanges: OptimizationChange[];
}

export interface WorkflowDifference {
  type: 'structure' | 'content' | 'optimization' | 'security';
  path: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  oldValue?: any;
  newValue?: any;
}

export interface StructuralChange {
  type: 'added' | 'removed' | 'modified';
  element: 'job' | 'step' | 'trigger' | 'permission';
  name: string;
  impact: 'low' | 'medium' | 'high';
}

export interface OptimizationChange {
  type: 'cache' | 'parallelization' | 'matrix' | 'condition';
  description: string;
  impact: 'performance' | 'cost' | 'reliability';
  improvement: boolean;
}

export interface BestPracticesValidation {
  score: number;
  goodPractices: string[];
  improvements: string[];
  criticalIssues: string[];
}

export class WorkflowComparisonUtility {
  /**
   * Compare two workflow YAML contents and return detailed comparison
   */
  compareWorkflows(workflow1: string, workflow2: string): WorkflowComparison {
    try {
      const parsed1 = yaml.load(workflow1) as any;
      const parsed2 = yaml.load(workflow2) as any;

      if (!parsed1 || !parsed2) {
        throw new Error('Invalid YAML structure in one or both workflows');
      }

      const differences = this.findDifferences(parsed1, parsed2);
      const structuralChanges = this.analyzeStructuralChanges(parsed1, parsed2);
      const optimizationChanges = this.analyzeOptimizationChanges(parsed1, parsed2);
      const similarity = this.calculateSimilarity(parsed1, parsed2, differences);

      return {
        similarity,
        differences,
        structuralChanges,
        optimizationChanges
      };
    } catch (error) {
      throw new Error(`Workflow comparison failed: ${error}`);
    }
  }

  /**
   * Validate workflow against GitHub Actions best practices
   */
  validateBestPractices(workflowContent: string): BestPracticesValidation {
    try {
      const workflow = yaml.load(workflowContent) as any;
      
      if (!workflow) {
        throw new Error('Invalid YAML structure');
      }

      const goodPractices: string[] = [];
      const improvements: string[] = [];
      const criticalIssues: string[] = [];

      // Check for pinned action versions
      const actions = this.extractActions(workflow);
      const pinnedActions = actions.filter(action => this.isActionPinned(action));
      
      if (pinnedActions.length === actions.length && actions.length > 0) {
        goodPractices.push('pinned-action-versions');
      } else if (pinnedActions.length > 0) {
        improvements.push('Some actions are not pinned to specific versions');
      } else if (actions.length > 0) {
        criticalIssues.push('No actions are pinned to specific versions');
      }

      // Check for explicit permissions
      if (workflow.permissions) {
        goodPractices.push('explicit-permissions');
        
        // Check for minimal permissions
        if (this.hasMinimalPermissions(workflow.permissions)) {
          goodPractices.push('minimal-permissions');
        } else {
          improvements.push('Consider using more restrictive permissions');
        }
      } else {
        improvements.push('Add explicit permissions to workflow');
      }

      // Check for caching
      if (this.hasCaching(workflow)) {
        goodPractices.push('dependency-caching');
      } else {
        improvements.push('Add dependency caching to improve performance');
      }

      // Check for matrix strategies
      if (this.hasMatrixStrategy(workflow)) {
        goodPractices.push('matrix-testing');
      }

      // Check for conditional execution
      if (this.hasConditionalExecution(workflow)) {
        goodPractices.push('conditional-execution');
      }

      // Check for secrets handling
      const secretsUsage = this.analyzeSecretsUsage(workflow);
      if (secretsUsage.secure) {
        goodPractices.push('secure-secrets-handling');
      } else if (secretsUsage.issues.length > 0) {
        criticalIssues.push(...secretsUsage.issues);
      }

      // Check for timeout settings
      if (this.hasTimeoutSettings(workflow)) {
        goodPractices.push('timeout-settings');
      } else {
        improvements.push('Add timeout settings to prevent hanging jobs');
      }

      // Check for artifact management
      if (this.hasArtifactManagement(workflow)) {
        goodPractices.push('artifact-management');
      }

      // Check for environment protection
      if (this.hasEnvironmentProtection(workflow)) {
        goodPractices.push('environment-protection');
      }

      // Calculate score
      const totalChecks = goodPractices.length + improvements.length + criticalIssues.length;
      const score = totalChecks > 0 ? goodPractices.length / totalChecks : 0;

      return {
        score,
        goodPractices,
        improvements,
        criticalIssues
      };
    } catch (error) {
      throw new Error(`Best practices validation failed: ${error}`);
    }
  }

  /**
   * Find differences between two parsed workflow objects
   */
  private findDifferences(workflow1: any, workflow2: any, path: string = ''): WorkflowDifference[] {
    const differences: WorkflowDifference[] = [];

    // Compare basic properties
    if (workflow1.name !== workflow2.name) {
      differences.push({
        type: 'content',
        path: `${path}.name`,
        description: 'Workflow name changed',
        severity: 'low',
        oldValue: workflow1.name,
        newValue: workflow2.name
      });
    }

    // Compare triggers
    const triggerDiffs = this.compareTriggers(workflow1.on, workflow2.on, `${path}.on`);
    differences.push(...triggerDiffs);

    // Compare jobs
    const jobDiffs = this.compareJobs(workflow1.jobs, workflow2.jobs, `${path}.jobs`);
    differences.push(...jobDiffs);

    // Compare permissions
    const permissionDiffs = this.comparePermissions(workflow1.permissions, workflow2.permissions, `${path}.permissions`);
    differences.push(...permissionDiffs);

    return differences;
  }

  /**
   * Compare workflow triggers
   */
  private compareTriggers(triggers1: any, triggers2: any, path: string): WorkflowDifference[] {
    const differences: WorkflowDifference[] = [];

    if (!triggers1 && !triggers2) return differences;
    if (!triggers1 || !triggers2) {
      differences.push({
        type: 'structure',
        path,
        description: 'Triggers added or removed',
        severity: 'high',
        oldValue: triggers1,
        newValue: triggers2
      });
      return differences;
    }

    // Compare trigger types
    const triggers1Keys = Object.keys(triggers1);
    const triggers2Keys = Object.keys(triggers2);

    const addedTriggers = triggers2Keys.filter(key => !triggers1Keys.includes(key));
    const removedTriggers = triggers1Keys.filter(key => !triggers2Keys.includes(key));

    addedTriggers.forEach(trigger => {
      differences.push({
        type: 'structure',
        path: `${path}.${trigger}`,
        description: `Trigger '${trigger}' added`,
        severity: 'medium',
        newValue: triggers2[trigger]
      });
    });

    removedTriggers.forEach(trigger => {
      differences.push({
        type: 'structure',
        path: `${path}.${trigger}`,
        description: `Trigger '${trigger}' removed`,
        severity: 'medium',
        oldValue: triggers1[trigger]
      });
    });

    return differences;
  }

  /**
   * Compare workflow jobs
   */
  private compareJobs(jobs1: any, jobs2: any, path: string): WorkflowDifference[] {
    const differences: WorkflowDifference[] = [];

    if (!jobs1 && !jobs2) return differences;
    if (!jobs1 || !jobs2) {
      differences.push({
        type: 'structure',
        path,
        description: 'Jobs structure changed completely',
        severity: 'high',
        oldValue: jobs1,
        newValue: jobs2
      });
      return differences;
    }

    const jobs1Keys = Object.keys(jobs1);
    const jobs2Keys = Object.keys(jobs2);

    const addedJobs = jobs2Keys.filter(key => !jobs1Keys.includes(key));
    const removedJobs = jobs1Keys.filter(key => !jobs2Keys.includes(key));
    const commonJobs = jobs1Keys.filter(key => jobs2Keys.includes(key));

    addedJobs.forEach(job => {
      differences.push({
        type: 'structure',
        path: `${path}.${job}`,
        description: `Job '${job}' added`,
        severity: 'medium',
        newValue: jobs2[job]
      });
    });

    removedJobs.forEach(job => {
      differences.push({
        type: 'structure',
        path: `${path}.${job}`,
        description: `Job '${job}' removed`,
        severity: 'medium',
        oldValue: jobs1[job]
      });
    });

    // Compare common jobs
    commonJobs.forEach(job => {
      const jobDiffs = this.compareJob(jobs1[job], jobs2[job], `${path}.${job}`);
      differences.push(...jobDiffs);
    });

    return differences;
  }

  /**
   * Compare individual job
   */
  private compareJob(job1: any, job2: any, path: string): WorkflowDifference[] {
    const differences: WorkflowDifference[] = [];

    // Compare runs-on
    if (job1['runs-on'] !== job2['runs-on']) {
      differences.push({
        type: 'content',
        path: `${path}.runs-on`,
        description: 'Runner changed',
        severity: 'medium',
        oldValue: job1['runs-on'],
        newValue: job2['runs-on']
      });
    }

    // Compare steps
    const stepDiffs = this.compareSteps(job1.steps, job2.steps, `${path}.steps`);
    differences.push(...stepDiffs);

    // Compare strategy
    if (job1.strategy || job2.strategy) {
      const strategyDiffs = this.compareStrategy(job1.strategy, job2.strategy, `${path}.strategy`);
      differences.push(...strategyDiffs);
    }

    return differences;
  }

  /**
   * Compare job steps
   */
  private compareSteps(steps1: any[], steps2: any[], path: string): WorkflowDifference[] {
    const differences: WorkflowDifference[] = [];

    if (!steps1 && !steps2) return differences;
    if (!steps1 || !steps2) {
      differences.push({
        type: 'structure',
        path,
        description: 'Steps structure changed completely',
        severity: 'high',
        oldValue: steps1,
        newValue: steps2
      });
      return differences;
    }

    // Simple comparison by length and content
    if (steps1.length !== steps2.length) {
      differences.push({
        type: 'structure',
        path,
        description: `Number of steps changed from ${steps1.length} to ${steps2.length}`,
        severity: 'medium',
        oldValue: steps1.length,
        newValue: steps2.length
      });
    }

    // Compare step actions
    const actions1 = steps1.filter(step => step.uses).map(step => step.uses);
    const actions2 = steps2.filter(step => step.uses).map(step => step.uses);

    const addedActions = actions2.filter(action => !actions1.includes(action));
    const removedActions = actions1.filter(action => !actions2.includes(action));

    addedActions.forEach(action => {
      differences.push({
        type: 'content',
        path: `${path}[].uses`,
        description: `Action '${action}' added`,
        severity: 'low',
        newValue: action
      });
    });

    removedActions.forEach(action => {
      differences.push({
        type: 'content',
        path: `${path}[].uses`,
        description: `Action '${action}' removed`,
        severity: 'low',
        oldValue: action
      });
    });

    return differences;
  }

  /**
   * Compare job strategy
   */
  private compareStrategy(strategy1: any, strategy2: any, path: string): WorkflowDifference[] {
    const differences: WorkflowDifference[] = [];

    if (!strategy1 && !strategy2) return differences;
    if (!strategy1 || !strategy2) {
      differences.push({
        type: 'optimization',
        path,
        description: 'Strategy added or removed',
        severity: 'medium',
        oldValue: strategy1,
        newValue: strategy2
      });
      return differences;
    }

    // Compare matrix
    if (strategy1.matrix || strategy2.matrix) {
      const matrixDiff = this.compareMatrix(strategy1.matrix, strategy2.matrix, `${path}.matrix`);
      differences.push(...matrixDiff);
    }

    return differences;
  }

  /**
   * Compare matrix strategy
   */
  private compareMatrix(matrix1: any, matrix2: any, path: string): WorkflowDifference[] {
    const differences: WorkflowDifference[] = [];

    if (!matrix1 && !matrix2) return differences;
    if (!matrix1 || !matrix2) {
      differences.push({
        type: 'optimization',
        path,
        description: 'Matrix strategy added or removed',
        severity: 'medium',
        oldValue: matrix1,
        newValue: matrix2
      });
      return differences;
    }

    // Compare matrix dimensions
    const matrix1Keys = Object.keys(matrix1);
    const matrix2Keys = Object.keys(matrix2);

    const addedDimensions = matrix2Keys.filter(key => !matrix1Keys.includes(key));
    const removedDimensions = matrix1Keys.filter(key => !matrix2Keys.includes(key));

    addedDimensions.forEach(dimension => {
      differences.push({
        type: 'optimization',
        path: `${path}.${dimension}`,
        description: `Matrix dimension '${dimension}' added`,
        severity: 'low',
        newValue: matrix2[dimension]
      });
    });

    removedDimensions.forEach(dimension => {
      differences.push({
        type: 'optimization',
        path: `${path}.${dimension}`,
        description: `Matrix dimension '${dimension}' removed`,
        severity: 'low',
        oldValue: matrix1[dimension]
      });
    });

    return differences;
  }

  /**
   * Compare permissions
   */
  private comparePermissions(permissions1: any, permissions2: any, path: string): WorkflowDifference[] {
    const differences: WorkflowDifference[] = [];

    if (!permissions1 && !permissions2) return differences;
    if (!permissions1 || !permissions2) {
      differences.push({
        type: 'security',
        path,
        description: 'Permissions added or removed',
        severity: 'high',
        oldValue: permissions1,
        newValue: permissions2
      });
      return differences;
    }

    // If permissions are strings, compare directly
    if (typeof permissions1 === 'string' || typeof permissions2 === 'string') {
      if (permissions1 !== permissions2) {
        differences.push({
          type: 'security',
          path,
          description: 'Permission level changed',
          severity: 'high',
          oldValue: permissions1,
          newValue: permissions2
        });
      }
      return differences;
    }

    // Compare object permissions
    const perms1Keys = Object.keys(permissions1);
    const perms2Keys = Object.keys(permissions2);

    const addedPerms = perms2Keys.filter(key => !perms1Keys.includes(key));
    const removedPerms = perms1Keys.filter(key => !perms2Keys.includes(key));
    const changedPerms = perms1Keys.filter(key => 
      perms2Keys.includes(key) && permissions1[key] !== permissions2[key]
    );

    addedPerms.forEach(perm => {
      differences.push({
        type: 'security',
        path: `${path}.${perm}`,
        description: `Permission '${perm}' added`,
        severity: 'medium',
        newValue: permissions2[perm]
      });
    });

    removedPerms.forEach(perm => {
      differences.push({
        type: 'security',
        path: `${path}.${perm}`,
        description: `Permission '${perm}' removed`,
        severity: 'medium',
        oldValue: permissions1[perm]
      });
    });

    changedPerms.forEach(perm => {
      differences.push({
        type: 'security',
        path: `${path}.${perm}`,
        description: `Permission '${perm}' changed`,
        severity: 'high',
        oldValue: permissions1[perm],
        newValue: permissions2[perm]
      });
    });

    return differences;
  }

  /**
   * Analyze structural changes
   */
  private analyzeStructuralChanges(workflow1: any, workflow2: any): StructuralChange[] {
    const changes: StructuralChange[] = [];

    // Analyze job changes
    const jobs1 = workflow1.jobs ? Object.keys(workflow1.jobs) : [];
    const jobs2 = workflow2.jobs ? Object.keys(workflow2.jobs) : [];

    const addedJobs = jobs2.filter(job => !jobs1.includes(job));
    const removedJobs = jobs1.filter(job => !jobs2.includes(job));

    addedJobs.forEach(job => {
      changes.push({
        type: 'added',
        element: 'job',
        name: job,
        impact: 'medium'
      });
    });

    removedJobs.forEach(job => {
      changes.push({
        type: 'removed',
        element: 'job',
        name: job,
        impact: 'medium'
      });
    });

    // Analyze trigger changes
    const triggers1 = workflow1.on ? Object.keys(workflow1.on) : [];
    const triggers2 = workflow2.on ? Object.keys(workflow2.on) : [];

    const addedTriggers = triggers2.filter(trigger => !triggers1.includes(trigger));
    const removedTriggers = triggers1.filter(trigger => !triggers2.includes(trigger));

    addedTriggers.forEach(trigger => {
      changes.push({
        type: 'added',
        element: 'trigger',
        name: trigger,
        impact: 'high'
      });
    });

    removedTriggers.forEach(trigger => {
      changes.push({
        type: 'removed',
        element: 'trigger',
        name: trigger,
        impact: 'high'
      });
    });

    return changes;
  }

  /**
   * Analyze optimization changes
   */
  private analyzeOptimizationChanges(workflow1: any, workflow2: any): OptimizationChange[] {
    const changes: OptimizationChange[] = [];

    // Check for caching changes
    const hasCaching1 = this.hasCaching(workflow1);
    const hasCaching2 = this.hasCaching(workflow2);

    if (!hasCaching1 && hasCaching2) {
      changes.push({
        type: 'cache',
        description: 'Dependency caching added',
        impact: 'performance',
        improvement: true
      });
    } else if (hasCaching1 && !hasCaching2) {
      changes.push({
        type: 'cache',
        description: 'Dependency caching removed',
        impact: 'performance',
        improvement: false
      });
    }

    // Check for matrix strategy changes
    const hasMatrix1 = this.hasMatrixStrategy(workflow1);
    const hasMatrix2 = this.hasMatrixStrategy(workflow2);

    if (!hasMatrix1 && hasMatrix2) {
      changes.push({
        type: 'matrix',
        description: 'Matrix strategy added',
        impact: 'reliability',
        improvement: true
      });
    } else if (hasMatrix1 && !hasMatrix2) {
      changes.push({
        type: 'matrix',
        description: 'Matrix strategy removed',
        impact: 'reliability',
        improvement: false
      });
    }

    // Check for conditional execution changes
    const hasConditions1 = this.hasConditionalExecution(workflow1);
    const hasConditions2 = this.hasConditionalExecution(workflow2);

    if (!hasConditions1 && hasConditions2) {
      changes.push({
        type: 'condition',
        description: 'Conditional execution added',
        impact: 'cost',
        improvement: true
      });
    } else if (hasConditions1 && !hasConditions2) {
      changes.push({
        type: 'condition',
        description: 'Conditional execution removed',
        impact: 'cost',
        improvement: false
      });
    }

    return changes;
  }

  /**
   * Calculate similarity between two workflows
   */
  private calculateSimilarity(workflow1: any, workflow2: any, differences: WorkflowDifference[]): number {
    // Base similarity calculation
    let similarity = 1.0;

    // Penalize based on differences
    differences.forEach(diff => {
      switch (diff.severity) {
        case 'high':
          similarity -= 0.2;
          break;
        case 'medium':
          similarity -= 0.1;
          break;
        case 'low':
          similarity -= 0.05;
          break;
      }
    });

    // Bonus for structural similarities
    const jobs1Count = workflow1.jobs ? Object.keys(workflow1.jobs).length : 0;
    const jobs2Count = workflow2.jobs ? Object.keys(workflow2.jobs).length : 0;

    if (jobs1Count > 0 && jobs2Count > 0) {
      const jobSimilarity = Math.min(jobs1Count, jobs2Count) / Math.max(jobs1Count, jobs2Count);
      similarity = (similarity + jobSimilarity) / 2;
    }

    return Math.max(0, Math.min(1, similarity));
  }

  /**
   * Extract all actions from workflow
   */
  private extractActions(workflow: any): string[] {
    const actions: string[] = [];

    if (workflow.jobs) {
      for (const job of Object.values(workflow.jobs) as any[]) {
        if (job.steps) {
          for (const step of job.steps) {
            if (step.uses) {
              actions.push(step.uses);
            }
          }
        }
      }
    }

    return actions;
  }

  /**
   * Check if action is pinned to a version
   */
  private isActionPinned(action: string): boolean {
    return action.includes('@v') || action.includes('@sha') || 
           action.match(/@[a-f0-9]{40}$/) !== null;
  }

  /**
   * Check if workflow has minimal permissions
   */
  private hasMinimalPermissions(permissions: any): boolean {
    if (typeof permissions === 'string') {
      return permissions === 'read-all' || permissions === 'none';
    }

    if (typeof permissions === 'object') {
      const writePermissions = Object.values(permissions).filter(perm => perm === 'write').length;
      return writePermissions <= 2; // Allow up to 2 write permissions
    }

    return false;
  }

  /**
   * Check if workflow has caching
   */
  private hasCaching(workflow: any): boolean {
    if (!workflow.jobs) return false;

    for (const job of Object.values(workflow.jobs) as any[]) {
      if (job.steps) {
        for (const step of job.steps) {
          if (step.uses && step.uses.includes('actions/cache')) {
            return true;
          }
          if (step.with && step.with.cache) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Check if workflow has matrix strategy
   */
  private hasMatrixStrategy(workflow: any): boolean {
    if (!workflow.jobs) return false;

    for (const job of Object.values(workflow.jobs) as any[]) {
      if (job.strategy && job.strategy.matrix) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if workflow has conditional execution
   */
  private hasConditionalExecution(workflow: any): boolean {
    if (!workflow.jobs) return false;

    for (const job of Object.values(workflow.jobs) as any[]) {
      if (job.if) return true;
      
      if (job.steps) {
        for (const step of job.steps) {
          if (step.if) return true;
        }
      }
    }

    return false;
  }

  /**
   * Analyze secrets usage
   */
  private analyzeSecretsUsage(workflow: any): { secure: boolean; issues: string[] } {
    const issues: string[] = [];
    let secure = true;

    const workflowString = JSON.stringify(workflow).toLowerCase();

    // Check for hardcoded secrets
    if (workflowString.includes('password') || workflowString.includes('token')) {
      const secretsPattern = /\$\{\{\s*secrets\./g;
      if (!secretsPattern.test(workflowString)) {
        issues.push('Potential hardcoded secrets detected');
        secure = false;
      }
    }

    // Check for secrets without proper permissions
    if (workflowString.includes('secrets.') && !workflow.permissions) {
      issues.push('Using secrets without explicit permissions');
      secure = false;
    }

    return { secure, issues };
  }

  /**
   * Check if workflow has timeout settings
   */
  private hasTimeoutSettings(workflow: any): boolean {
    if (!workflow.jobs) return false;

    for (const job of Object.values(workflow.jobs) as any[]) {
      if (job['timeout-minutes']) return true;
      
      if (job.steps) {
        for (const step of job.steps) {
          if (step['timeout-minutes']) return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if workflow has artifact management
   */
  private hasArtifactManagement(workflow: any): boolean {
    if (!workflow.jobs) return false;

    for (const job of Object.values(workflow.jobs) as any[]) {
      if (job.steps) {
        for (const step of job.steps) {
          if (step.uses && (
            step.uses.includes('actions/upload-artifact') ||
            step.uses.includes('actions/download-artifact')
          )) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Check if workflow has environment protection
   */
  private hasEnvironmentProtection(workflow: any): boolean {
    if (!workflow.jobs) return false;

    for (const job of Object.values(workflow.jobs) as any[]) {
      if (job.environment) return true;
    }

    return false;
  }
}