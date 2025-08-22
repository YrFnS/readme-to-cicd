import {
  RepositoryChanges,
  AutomationDecision,
  AutomationRule,
  RepositoryInfo,
  WorkflowChange,
  PerformanceImpact,
  AnalysisResult,
  EventPriority,
  ConfigChange,
  FileChange,
  ReadmeAnalysis
} from '../types';
import { PRCreator, PRCreatorConfig } from './pr-creator';
import { GitHubAPIConfig } from '../types';

export class AutomationEngine {
  private prCreator?: PRCreator;

  constructor(private config: AutomationConfig, githubConfig?: GitHubAPIConfig) {
    if (githubConfig) {
      const prConfig: PRCreatorConfig = {
        defaultBranchPrefix: 'agent-hooks/optimization',
        maxPRsPerHour: 10
      };
      this.prCreator = new PRCreator(githubConfig, prConfig);
    }
  }

  /**
   * Validate a decision object
   */
  private isValidDecision(decision: AutomationDecision): boolean {
    return !!(
      decision &&
      typeof decision.shouldCreatePR === 'boolean' &&
      Array.isArray(decision.changes) &&
      typeof decision.rationale === 'string' &&
      decision.performanceImpact &&
      typeof decision.performanceImpact.estimatedTimeSavings === 'number' &&
      typeof decision.performanceImpact.costReduction === 'number'
    );
  }

  /**
   * Classify and analyze changes (placeholder implementation)
   */
  private async classifyChanges(changes: RepositoryChanges): Promise<RepositoryChanges> {
    // This will be enhanced with actual classification logic
    // For now, return the changes as-is
    return changes;
  }

  /**
   * Evaluate automation rules (placeholder implementation)
   */
  private async evaluateRules(changes: RepositoryChanges, repository: RepositoryInfo): Promise<AutomationRule[]> {
    // This will be enhanced with actual rule evaluation logic
    // For now, return configured default rules
    return this.config.defaultRules || [];
  }

  /**
   * Process decisions in batches (placeholder implementation)
   */
  private async processBatches(decisions: AutomationDecision[], repository: RepositoryInfo): Promise<AutomationDecision[]> {
    // This will be enhanced with actual batch processing logic
    // For now, return decisions as-is
    return decisions;
  }

  /**
   * Main entry point for processing repository changes and generating automation decisions
   */
  async evaluateChanges(
    changes: RepositoryChanges,
    repository: RepositoryInfo
  ): Promise<AutomationDecision[]> {
    const startTime = Date.now();

    // Input validation
    if (!changes || !repository) {
      throw new Error('Invalid input: changes and repository are required');
    }

    if (!repository.owner || !repository.name) {
      throw new Error('Invalid repository info: owner and name are required');
    }

    try {
      // Step 1: Classify and analyze changes with error handling
      let classifiedChanges: RepositoryChanges;
      try {
        classifiedChanges = await this.classifyChanges(changes);
      } catch (error) {
        console.warn('Change classification failed, using original changes:', error);
        classifiedChanges = changes;
      }

      // Step 2: Apply automation rules with fallback
      let applicableRules: AutomationRule[] = [];
      try {
        applicableRules = await this.evaluateRules(classifiedChanges, repository);
      } catch (error) {
        console.warn('Rule evaluation failed, using empty rules:', error);
      }

      // Step 3: Generate workflow changes with error handling
      let workflowChanges: WorkflowChange[] = [];
      try {
        workflowChanges = await this.generateWorkflowChanges(
          classifiedChanges,
          repository
        );
      } catch (error) {
        console.error('Workflow generation failed:', error);
        // Continue with empty changes rather than failing completely
      }

      // Step 4: Make automation decisions with validation
      let decisions: AutomationDecision[] = [];
      try {
        decisions = await this.makeDecisions(
          classifiedChanges,
          workflowChanges,
          applicableRules,
          repository
        );

        // Validate decisions
        decisions = decisions.filter(decision => this.isValidDecision(decision));
      } catch (error) {
        console.error('Decision making failed:', error);
        // Return empty decisions rather than failing
      }

      // Step 5: Score and prioritize decisions with error handling
      let scoredDecisions: AutomationDecision[] = decisions;
      try {
        scoredDecisions = await this.scoreDecisions(decisions, classifiedChanges);
      } catch (error) {
        console.warn('Decision scoring failed, using original decisions:', error);
      }

      // Step 6: Apply batching logic with error handling
      let batchedDecisions: AutomationDecision[] = scoredDecisions;
      try {
        batchedDecisions = await this.processBatches(scoredDecisions, repository);
      } catch (error) {
        console.warn('Batch processing failed, using scored decisions:', error);
      }

      // Step 7: Final validation and optimization with error handling
      let finalDecisions: AutomationDecision[] = batchedDecisions;
      try {
        finalDecisions = await this.optimizeDecisions(batchedDecisions);
      } catch (error) {
        console.warn('Decision optimization failed, using batched decisions:', error);
      }

      const processingTime = Date.now() - startTime;

      // Log processing summary
      console.log(`Automation evaluation completed for ${repository.fullName}:`, {
        processingTime,
        changes: changes.modifiedFiles.length + changes.addedFiles.length,
        decisions: finalDecisions.length,
        rules: applicableRules.length
      });

      return finalDecisions;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const processingTime = Date.now() - startTime;

      console.error(`Automation evaluation failed for ${repository.fullName}:`, {
        error: errorMessage,
        processingTime,
        changes: changes ? (changes.modifiedFiles.length + changes.addedFiles.length) : 0
      });

      throw new Error(`Automation evaluation failed: ${errorMessage}`);
    }
  }

  /**
   * Create pull requests for automation decisions
   */
  async createPRsForDecisions(
    decisions: AutomationDecision[],
    repository: RepositoryInfo
  ): Promise<import('../types').PRCreationResult[]> {
    if (!this.prCreator) {
      throw new Error('PR Creator not initialized. GitHub configuration required.');
    }

    return this.prCreator.createPRsForDecisions(decisions, repository);
  }

  /**
   * Process changes and create PRs in one step
   */
  async processChangesAndCreatePRs(
    changes: RepositoryChanges,
    repository: RepositoryInfo
  ): Promise<{
    decisions: AutomationDecision[];
    prResults: import('../types').PRCreationResult[];
  }> {
    // Evaluate changes to get decisions
    const decisions = await this.evaluateChanges(changes, repository);

    // Create PRs for decisions that should have them
    const prResults = this.prCreator
      ? await this.prCreator.createPRsForDecisions(decisions, repository)
      : [];

    return {
      decisions,
      prResults
    };
  }

  /**
   * Schedule analysis for a repository based on changes
   */
  async scheduleAnalysis(repository: RepositoryInfo, priority: EventPriority = EventPriority.MEDIUM): Promise<void> {
    // This would integrate with the analysis queue system
    // For now, we'll implement the core logic
    console.log(`Scheduling analysis for ${repository.fullName} with priority ${priority}`);
  }

  /**
   * Apply custom automation rules
   */
  async applyCustomRules(rules: AutomationRule[]): Promise<void> {
    // Store rules in config for now - will be enhanced with proper rule engine later
    this.config.defaultRules = [...this.config.defaultRules, ...rules];
  }

  /**
   * Generate workflow changes based on repository changes
   */
  private async generateWorkflowChanges(
    changes: RepositoryChanges,
    repository: RepositoryInfo
  ): Promise<WorkflowChange[]> {
    const workflowChanges: WorkflowChange[] = [];

    // Analyze dependency changes
    for (const depChange of changes.dependencyChanges) {
      const changes = await this.generateDependencyRelatedChanges(depChange, repository);
      workflowChanges.push(...changes);
    }

    // Analyze configuration changes
    for (const configChange of changes.configurationChanges) {
      const changes = await this.generateConfigurationRelatedChanges(configChange, repository);
      workflowChanges.push(...changes);
    }

    // Analyze significant file changes
    const significantFiles = [...changes.modifiedFiles, ...changes.addedFiles]
      .filter(change => change.significance === 'high');

    for (const fileChange of significantFiles) {
      const changes = await this.generateFileRelatedChanges(fileChange, repository);
      workflowChanges.push(...changes);
    }

    return workflowChanges;
  }

  /**
   * Generate changes related to dependency updates
   */
  private async generateDependencyRelatedChanges(
    depChange: DependencyChange,
    repository: RepositoryInfo
  ): Promise<WorkflowChange[]> {
    const changes: WorkflowChange[] = [];

    // Generate cache optimization changes
    if (depChange.framework === 'nodejs' && depChange.type === 'updated') {
      changes.push({
        type: 'update',
        file: '.github/workflows/ci.yml',
        content: this.generateNodejsCacheOptimization(repository),
        description: 'Optimize Node.js caching strategy for dependency changes',
        category: 'performance'
      });
    }

    // Generate security scanning updates
    if (depChange.breaking) {
      changes.push({
        type: 'update',
        file: '.github/workflows/security.yml',
        content: this.generateEnhancedSecurityScan(repository),
        description: 'Enhance security scanning for breaking dependency changes',
        category: 'security'
      });
    }

    return changes;
  }

  /**
   * Generate changes related to configuration updates
   */
  private async generateConfigurationRelatedChanges(
    configChange: ConfigChange,
    repository: RepositoryInfo
  ): Promise<WorkflowChange[]> {
    const changes: WorkflowChange[] = [];

    // Handle package.json changes
    if (configChange.type === 'package.json') {
      changes.push({
        type: 'update',
        file: '.github/workflows/ci.yml',
        content: this.generateUpdatedCIWorkflow(repository, configChange),
        description: 'Update CI workflow to match new package.json configuration',
        category: 'ci'
      });
    }

    return changes;
  }

  /**
   * Generate changes related to significant file modifications
   */
  private async generateFileRelatedChanges(
    fileChange: FileChange,
    repository: RepositoryInfo
  ): Promise<WorkflowChange[]> {
    const changes: WorkflowChange[] = [];

    // Handle README changes
    if (fileChange.path.toLowerCase() === 'readme.md') {
      changes.push({
        type: 'update',
        file: '.github/workflows/ci.yml',
        content: this.generateUpdatedFromReadme(repository, fileChange),
        description: 'Update workflow based on README changes',
        category: 'ci'
      });
    }

    return changes;
  }

  /**
   * Make automation decisions based on changes and rules
   */
  private async makeDecisions(
    changes: RepositoryChanges,
    workflowChanges: WorkflowChange[],
    rules: AutomationRule[],
    repository: RepositoryInfo
  ): Promise<AutomationDecision[]> {
    const decisions: AutomationDecision[] = [];

    // Generate decisions for significant changes
    if (workflowChanges.length > 0) {
      const performanceImpact: PerformanceImpact = {
        estimatedTimeSavings: 5.0, // 5 minutes estimated savings
        costReduction: 2.50, // $2.50 per month estimated
        confidence: 0.8,
        rationale: 'Optimized caching and parallelization based on detected changes'
      };

      decisions.push({
        shouldCreatePR: true,
        changes: workflowChanges,
        priority: 'medium',
        rationale: `Generated ${workflowChanges.length} workflow improvements based on repository changes`,
        performanceImpact
      });
    }

    // Generate decisions for dependency updates
    if (changes.dependencyChanges.length > 0) {
      const dependencyDecisions = this.generateDependencyDecisions(changes.dependencyChanges, repository);
      decisions.push(...dependencyDecisions);
    }

    return decisions;
  }

  /**
   * Score decisions based on priority and impact
   */
  private async scoreDecisions(
    decisions: AutomationDecision[],
    changes: RepositoryChanges
  ): Promise<AutomationDecision[]> {
    return Promise.all(
      decisions.map(async (decision) => ({
        ...decision,
        priority: this.calculateDecisionPriority(decision, changes)
      }))
    );
  }

  /**
   * Optimize decisions for efficiency and user experience
   */
  private async optimizeDecisions(decisions: AutomationDecision[]): Promise<AutomationDecision[]> {
    // Filter out low-impact decisions if there are higher priority ones
    const highPriorityDecisions = decisions.filter(d => d.priority === 'high' || d.priority === 'critical');

    if (highPriorityDecisions.length > 0) {
      // If there are high-priority decisions, focus on those
      return highPriorityDecisions;
    }

    // Apply performance-based filtering
    return decisions.filter(decision => {
      // Filter out decisions with very low performance impact
      if (decision.performanceImpact.estimatedTimeSavings < 1) {
        return false;
      }

      // Filter out decisions with low confidence
      if (decision.performanceImpact.confidence < 0.3) {
        return false;
      }

      return true;
    });
  }

  /**
   * Generate Node.js cache optimization
   */
  private generateNodejsCacheOptimization(repository: RepositoryInfo): string {
    return `
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js \${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: \${{ matrix.node-version }}
        cache: 'npm'
        cache-dependency-path: '**/package-lock.json'

    - name: Install dependencies
      run: npm ci

    - name: Run tests
      run: npm test

    - name: Cache optimization
      uses: actions/cache@v3
      with:
        path: |
          ~/.npm
          .next/cache
        key: \${{ runner.os }}-node-\${{ matrix.node-version }}-\${{ hashFiles('**/package-lock.json') }}
`;
  }

  /**
   * Generate enhanced security scanning
   */
  private generateEnhancedSecurityScan(repository: RepositoryInfo): string {
    return `
name: Security Scan
on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * 1'  # Weekly security scan

jobs:
  security:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Security audit
      run: npm audit --audit-level high

    - name: CodeQL Analysis
      uses: github/codeql-action/init@v3
      with:
        languages: javascript

    - name: Perform CodeQL Analysis
      uses: github/codeql-action/analyze@v3

    - name: Dependency check
      uses: dependency-check/Dependency-Check_Action@main
      with:
        project: '${repository.name}'
        path: '.'
        format: 'ALL'
        args: >
          --enableRetired
          --enableExperimental
          --nvdValidForHours 24
`;
  }

  /**
   * Generate updated CI workflow from package.json changes
   */
  private generateUpdatedCIWorkflow(repository: RepositoryInfo, configChange: ConfigChange): string {
    return `
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run linting
      run: npm run lint

    - name: Run tests
      run: npm test

    - name: Build
      run: npm run build
`;
  }

  /**
   * Generate comprehensive workflow updates based on README changes
   */
  private generateUpdatedFromReadme(repository: RepositoryInfo, fileChange: FileChange): string {
    const content = fileChange.content || '';
    const detectedFeatures = this.analyzeReadmeContent(content);

    return this.generateComprehensiveWorkflow(repository, detectedFeatures);
  }

  /**
   * Analyze README content to detect project features and requirements
   */
  private analyzeReadmeContent(content: string): ReadmeAnalysis {
    const analysis: ReadmeAnalysis = {
      hasTests: false,
      hasLinting: false,
      hasBuild: false,
      hasDeploy: false,
      frameworks: [],
      languages: [],
      packageManager: 'npm',
      nodeVersion: '18',
      testCommand: 'npm test',
      buildCommand: 'npm run build',
      deployTarget: null
    };

    const lowerContent = content.toLowerCase();

    // Detect testing
    if (lowerContent.includes('test') || lowerContent.includes('jest') ||
        lowerContent.includes('mocha') || lowerContent.includes('vitest')) {
      analysis.hasTests = true;
      if (lowerContent.includes('jest')) analysis.testCommand = 'npm test';
      if (lowerContent.includes('vitest')) analysis.testCommand = 'npm test';
    }

    // Detect linting
    if (lowerContent.includes('eslint') || lowerContent.includes('prettier') ||
        lowerContent.includes('lint')) {
      analysis.hasLinting = true;
    }

    // Detect build process
    if (lowerContent.includes('build') || lowerContent.includes('webpack') ||
        lowerContent.includes('vite') || lowerContent.includes('rollup')) {
      analysis.hasBuild = true;
    }

    // Detect deployment
    if (lowerContent.includes('vercel')) analysis.deployTarget = 'vercel';
    if (lowerContent.includes('netlify')) analysis.deployTarget = 'netlify';
    if (lowerContent.includes('heroku')) analysis.deployTarget = 'heroku';
    if (lowerContent.includes('aws')) analysis.deployTarget = 'aws';

    // Detect frameworks
    if (lowerContent.includes('react')) analysis.frameworks.push('react');
    if (lowerContent.includes('vue')) analysis.frameworks.push('vue');
    if (lowerContent.includes('angular')) analysis.frameworks.push('angular');
    if (lowerContent.includes('next.js')) analysis.frameworks.push('nextjs');
    if (lowerContent.includes('nuxt')) analysis.frameworks.push('nuxt');

    // Detect languages
    if (lowerContent.includes('typescript')) analysis.languages.push('typescript');
    if (lowerContent.includes('javascript')) analysis.languages.push('javascript');

    // Detect package manager
    if (lowerContent.includes('yarn')) analysis.packageManager = 'yarn';
    if (lowerContent.includes('pnpm')) analysis.packageManager = 'pnpm';

    // Detect Node version requirements
    if (lowerContent.includes('node 20') || lowerContent.includes('node.js 20')) {
      analysis.nodeVersion = '20';
    }
    if (lowerContent.includes('node 18') || lowerContent.includes('node.js 18')) {
      analysis.nodeVersion = '18';
    }

    return analysis;
  }

  /**
   * Generate comprehensive workflow based on README analysis
   */
  private generateComprehensiveWorkflow(repository: RepositoryInfo, analysis: ReadmeAnalysis): string {
    const hasTypeScript = analysis.languages.includes('typescript');
    const isReact = analysis.frameworks.includes('react') || analysis.frameworks.includes('nextjs');

    let workflow = `name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '${analysis.nodeVersion}'

jobs:
`;

    // Test job
    workflow += `
  test:
    name: Test & Lint
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [${analysis.nodeVersion}]

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js \${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: \${{ matrix.node-version }}
        cache: '${analysis.packageManager}'

    - name: Install dependencies
      run: ${analysis.packageManager} ${analysis.packageManager === 'npm' ? 'ci' : 'install --frozen-lockfile'}`;

    if (analysis.hasLinting) {
      workflow += `

    - name: Run linting
      run: ${analysis.packageManager} run lint`;
    }

    if (analysis.hasTests) {
      workflow += `

    - name: Run tests
      run: ${analysis.testCommand}

    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        token: \${{ secrets.CODECOV_TOKEN }}
        fail_ci_if_error: false`;
    }

    if (analysis.hasBuild) {
      workflow += `

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: \${{ env.NODE_VERSION }}
        cache: '${analysis.packageManager}'

    - name: Install dependencies
      run: ${analysis.packageManager} ${analysis.packageManager === 'npm' ? 'ci' : 'install --frozen-lockfile'}

    - name: Build application
      run: ${analysis.buildCommand}

    - name: Upload build artifacts
      uses: actions/upload-artifact@v3
      with:
        name: build-artifacts
        path: |
          dist/
          build/
          .next/
        retention-days: 7`;
    }

    // Security job
    workflow += `

  security:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: test

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: \${{ env.NODE_VERSION }}
        cache: '${analysis.packageManager}'

    - name: Install dependencies
      run: ${analysis.packageManager} ${analysis.packageManager === 'npm' ? 'ci' : 'install --frozen-lockfile'}

    - name: Run security audit
      run: ${analysis.packageManager} audit --audit-level high

    - name: CodeQL Analysis
      uses: github/codeql-action/init@v3
      with:
        languages: javascript${hasTypeScript ? ',typescript' : ''}

    - name: Perform CodeQL Analysis
      uses: github/codeql-action/analyze@v3`;

    // Deployment job if deploy target detected
    if (analysis.deployTarget) {
      workflow += this.generateDeploymentJob(analysis.deployTarget, analysis);
    }

    return workflow;
  }

  /**
   * Generate deployment job based on target
   */
  private generateDeploymentJob(target: string, analysis: ReadmeAnalysis): string {
    switch (target) {
      case 'vercel':
        return `

  deploy:
    name: Deploy to Vercel
    runs-on: ubuntu-latest
    needs: [build, security]
    if: github.ref == 'refs/heads/main'

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v25
      with:
        vercel-token: \${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}
        working-directory: ./`;

      case 'netlify':
        return `

  deploy:
    name: Deploy to Netlify
    runs-on: ubuntu-latest
    needs: [build, security]
    if: github.ref == 'refs/heads/main'

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Deploy to Netlify
      uses: nwtgck/actions-netlify@v2.0
      with:
        publish-dir: './dist'
        production-branch: main
        github-token: \${{ secrets.GITHUB_TOKEN }}
        deploy-message: 'Deploy from GitHub Actions'
        enable-pull-request-comment: false
        enable-commit-comment: true
        overwrites-pull-request-comment: true
      env:
        NETLIFY_AUTH_TOKEN: \${{ secrets.NETLIFY_AUTH_TOKEN }}
        NETLIFY_SITE_ID: \${{ secrets.NETLIFY_SITE_ID }}`;

      default:
        return `

  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    needs: [build, security]
    if: github.ref == 'refs/heads/main'

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Deploy application
      run: echo "Custom deployment for ${target} - configure as needed"`;
    }
  }

  /**
   * Generate decisions for dependency changes
   */
  private generateDependencyDecisions(dependencyChanges: any[], repository: RepositoryInfo): AutomationDecision[] {
    return dependencyChanges.map(change => ({
      shouldCreatePR: change.breaking || change.type === 'updated',
      changes: [],
      priority: change.breaking ? 'high' : 'medium',
      rationale: `Dependency ${change.framework} was ${change.type}`,
      performanceImpact: {
        estimatedTimeSavings: 2.0,
        costReduction: 1.0,
        confidence: 0.7,
        rationale: 'Dependency optimization may improve build times'
      }
    }));
  }

  /**
   * Calculate priority for a decision
   */
  private calculateDecisionPriority(
    decision: AutomationDecision,
    changes: RepositoryChanges
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Critical priority for breaking changes
    if (changes.dependencyChanges.some(d => d.breaking)) {
      return 'critical';
    }

    // High priority for significant performance improvements
    if (decision.performanceImpact.costReduction > 5) {
      return 'high';
    }

    // High priority for significant time savings
    if (decision.performanceImpact.estimatedTimeSavings > 10) {
      return 'high';
    }

    // Medium priority for moderate performance improvements
    if (decision.performanceImpact.costReduction > 1) {
      return 'medium';
    }

    // Medium priority for workflow changes
    if (decision.changes.length > 0) {
      return 'medium';
    }

    // Low priority for minor changes
    return 'low';
  }
}

// Helper interfaces
interface AutomationConfig {
  enabledFeatures: string[];
  defaultRules: AutomationRule[];
  approvalWorkflows: any[];
  batchingConfig: any;
  priorityThresholds: any;
  notificationSettings: any;
}

interface DependencyChange {
  framework: string;
  version?: string;
  type: 'added' | 'updated' | 'removed';
  breaking: boolean;
}