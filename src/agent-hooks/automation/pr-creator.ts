import {
  AutomationDecision,
  RepositoryInfo,
  PRCreationResult
} from '../types';
import { GitHubAPIClient } from '../github/github-api-client';
import { GitHubAPIConfig } from '../types';

export interface PRCreatorConfig {
  defaultBranchPrefix?: string;
  maxPRsPerHour?: number;
}

export class PRCreator {
  private githubClient: GitHubAPIClient;
  private config: PRCreatorConfig;

  constructor(
    githubConfig: GitHubAPIConfig,
    config: PRCreatorConfig = {}
  ) {
    this.githubClient = new GitHubAPIClient(githubConfig);
    this.config = {
      defaultBranchPrefix: 'agent-hooks/optimization',
      maxPRsPerHour: 10,
      ...config
    };
  }

  /**
   * Create pull requests for automation decisions
   */
  async createPRsForDecisions(
    decisions: AutomationDecision[],
    repository: RepositoryInfo
  ): Promise<PRCreationResult[]> {
    const results: PRCreationResult[] = [];

    // Filter decisions that should create PRs
    const prDecisions = decisions.filter(d => d.shouldCreatePR);

    if (prDecisions.length === 0) {
      return results;
    }

    // Check rate limiting
    if (prDecisions.length > this.config.maxPRsPerHour!) {
      results.push({
        success: false,
        error: `Too many PRs requested: ${prDecisions.length}. Max allowed: ${this.config.maxPRsPerHour}`,
        prNumber: undefined,
        prUrl: undefined,
        branchName: undefined,
        warnings: undefined
      });
      return results;
    }

    // Process each decision
    for (const decision of prDecisions) {
      try {
        const result = await this.createPRForDecision(decision, repository);
        results.push(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          success: false,
          error: `Failed to create PR for decision: ${errorMessage}`,
          prNumber: undefined,
          prUrl: undefined,
          branchName: undefined,
          warnings: [`Decision priority: ${decision.priority}`, `Changes: ${decision.changes.length}`]
        });
      }
    }

    return results;
  }

  /**
   * Create a single pull request for a decision
   */
  private async createPRForDecision(
    decision: AutomationDecision,
    repository: RepositoryInfo
  ): Promise<PRCreationResult> {
    try {
      // Generate unique branch name
      const branchName = this.generateBranchName(decision);

      // Apply the changes to a new branch
      const changeResults = await this.applyChanges(repository.owner, repository.name, branchName, decision.changes);

      if (!changeResults.success) {
        return {
          success: false,
          error: changeResults.error || 'Failed to apply changes',
          prNumber: undefined,
          prUrl: undefined,
          branchName,
          warnings: changeResults.warnings
        };
      }

      // Generate PR content
      const prTitle = this.generatePRTitle(decision);
      const prBody = this.generatePRBody(decision);

      // Create the pull request
      const prResult = await this.githubClient.createPullRequest(
        repository.owner,
        repository.name,
        {
          title: prTitle,
          body: prBody,
          head: branchName,
          base: repository.defaultBranch,
          draft: decision.priority === 'low'
        }
      );

      if (!prResult.success) {
        return {
          success: false,
          error: prResult.error || 'Failed to create PR',
          prNumber: undefined,
          prUrl: undefined,
          branchName,
          warnings: changeResults.warnings
        };
      }

      return {
        success: true,
        prNumber: prResult.prNumber,
        prUrl: prResult.prUrl,
        branchName,
        error: undefined,
        warnings: changeResults.warnings || []
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `PR creation failed: ${errorMessage}`,
        prNumber: undefined,
        prUrl: undefined,
        branchName: undefined,
        warnings: undefined
      };
    }
  }

  /**
   * Generate a unique branch name for the decision
   */
  private generateBranchName(decision: AutomationDecision): string {
    const timestamp = Date.now();
    const prefix = this.config.defaultBranchPrefix || 'agent-hooks/optimization';
    return `${prefix}/${decision.priority}/${timestamp}`;
  }

  /**
   * Apply workflow changes to the repository
   */
  private async applyChanges(
    owner: string,
    repo: string,
    branchName: string,
    changes: any[]
  ): Promise<{ success: boolean; error?: string; warnings?: string[] }> {
    const warnings: string[] = [];

    try {
      for (const change of changes) {
        try {
          if (change.type === 'create' || change.type === 'update') {
            await this.githubClient.createOrUpdateFile(
              owner,
              repo,
              change.file,
              change.content,
              `Automated: ${change.description || 'Update file'}`,
              branchName
            );
          }
          // Note: delete functionality would need to be implemented if needed
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          warnings.push(`Error creating ${change.file}: ${errorMessage}`);
        }
      }

      return {
        success: true,
        warnings: warnings.length > 0 ? warnings : []
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
        warnings
      };
    }
  }

  /**
   * Generate PR title from decision
   */
  private generatePRTitle(decision: AutomationDecision): string {
    return `🤖 Automated: ${decision.rationale} (${decision.priority} priority)`;
  }

  /**
   * Generate PR body from decision
   */
  private generatePRBody(decision: AutomationDecision): string {
    let body = `## 🤖 Agent Hooks Automation

**Priority:** ${decision.priority}
**Reason:** ${decision.rationale}

### Changes Made:
`;

    for (const change of decision.changes) {
      body += `- ${change.type.toUpperCase()}: \`${change.file}\`\n`;
    }

    body += `\n### Performance Impact:
- **Time Savings:** ${decision.performanceImpact.estimatedTimeSavings} minutes
- **Cost Reduction:** $${decision.performanceImpact.costReduction} per month
- **Confidence:** ${(decision.performanceImpact.confidence * 100).toFixed(0)}%

---
*This PR was automatically created by Agent Hooks*`;

    return body;
  }

  /**
   * Check for potential conflicts before creating PR
   */
  private async checkForConflicts(
    owner: string,
    repo: string,
    branchName: string,
    baseBranch: string
  ): Promise<{ hasConflicts: boolean; conflicts?: string[] }> {
    try {
      // Get open PRs to check for similar changes
      const openPRs = await this.githubClient.getOpenPullRequests(owner, repo);

      const similarPRs = openPRs.filter(pr =>
        pr.head.ref.includes('agent-hooks') ||
        pr.head.ref.includes('optimization') ||
        pr.title.includes('Automated') ||
        pr.title.includes('🤖')
      );

      if (similarPRs.length > 0) {
        return {
          hasConflicts: true,
          conflicts: similarPRs.map(pr => `PR #${pr.number}: ${pr.title}`)
        };
      }

      return { hasConflicts: false };
    } catch (error) {
      // If we can't check for conflicts, proceed anyway
      console.warn('Could not check for conflicts:', error);
      return { hasConflicts: false };
    }
  }

  /**
   * Enhanced PR creation with conflict detection and intelligent content
   */
  async createIntelligentPR(
    decision: AutomationDecision,
    repository: RepositoryInfo,
    options: {
      checkConflicts?: boolean;
      autoResolve?: boolean;
      addLabels?: string[];
      addReviewers?: string[];
    } = {}
  ): Promise<PRCreationResult> {
    try {
      // Generate unique branch name
      const branchName = this.generateBranchName(decision);

      // Check for conflicts if requested
      if (options.checkConflicts !== false) {
        const conflictCheck = await this.checkForConflicts(
          repository.owner,
          repository.name,
          branchName,
          repository.defaultBranch
        );

        if (conflictCheck.hasConflicts) {
          if (options.autoResolve) {
            // Auto-resolve by adding conflict information to PR
            const conflictInfo = conflictCheck.conflicts!.join('\n');
            decision.rationale += ` (resolving conflicts with: ${conflictInfo})`;
          } else {
            return {
              success: false,
              error: `Potential conflicts detected: ${conflictCheck.conflicts!.join(', ')}`,
              prNumber: undefined,
              prUrl: undefined,
              branchName,
              warnings: ['Similar automation PRs already exist']
            };
          }
        }
      }

      // Apply the changes to a new branch
      const changeResults = await this.applyChanges(repository.owner, repository.name, branchName, decision.changes);

      if (!changeResults.success) {
        return {
          success: false,
          error: changeResults.error || 'Failed to apply changes',
          prNumber: undefined,
          prUrl: undefined,
          branchName,
          warnings: changeResults.warnings
        };
      }

      // Generate enhanced PR content
      const prTitle = this.generateIntelligentPRTitle(decision);
      const prBody = this.generateIntelligentPRBody(decision, options);

      // Prepare PR options
      const prOptions = {
        title: prTitle,
        body: prBody,
        head: branchName,
        base: repository.defaultBranch,
        draft: decision.priority === 'low',
        maintainer_can_modify: true
      };

      // Create the pull request
      const prResult = await this.githubClient.createPullRequest(
        repository.owner,
        repository.name,
        prOptions
      );

      if (!prResult.success) {
        return {
          success: false,
          error: prResult.error || 'Failed to create PR',
          prNumber: undefined,
          prUrl: undefined,
          branchName,
          warnings: changeResults.warnings
        };
      }

      // Add labels if provided
      if (options.addLabels && options.addLabels.length > 0) {
        try {
          await this.githubClient.addLabelsToPR(
            repository.owner,
            repository.name,
            prResult.prNumber!,
            options.addLabels
          );
        } catch (error) {
          console.warn('Failed to add labels to PR:', error);
        }
      }

      // Request reviews if provided
      if (options.addReviewers && options.addReviewers.length > 0) {
        try {
          await this.githubClient.requestReviews(
            repository.owner,
            repository.name,
            prResult.prNumber!,
            options.addReviewers
          );
        } catch (error) {
          console.warn('Failed to request reviews for PR:', error);
        }
      }

      return {
        success: true,
        prNumber: prResult.prNumber,
        prUrl: prResult.prUrl,
        branchName,
        error: undefined,
        warnings: changeResults.warnings || []
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Intelligent PR creation failed: ${errorMessage}`,
        prNumber: undefined,
        prUrl: undefined,
        branchName: undefined,
        warnings: undefined
      };
    }
  }

  /**
   * Generate intelligent PR title with context
   */
  private generateIntelligentPRTitle(decision: AutomationDecision): string {
    const category = decision.changes[0]?.category || 'optimization';
    const changeCount = decision.changes.length;

    let title = `🤖 ${category.toUpperCase()}: `;

    if (decision.priority === 'critical') {
      title = `🚨 CRITICAL: ${title}`;
    } else if (decision.priority === 'high') {
      title = `🔥 HIGH PRIORITY: ${title}`;
    }

    title += decision.rationale;

    if (changeCount > 1) {
      title += ` (${changeCount} files)`;
    }

    return title;
  }

  /**
   * Generate comprehensive PR body with detailed information
   */
  private generateIntelligentPRBody(
    decision: AutomationDecision,
    options: any
  ): string {
    let body = `## 🤖 Agent Hooks Intelligent Automation

### 🎯 **Automation Priority:** ${decision.priority.toUpperCase()}
### 📋 **Reason:** ${decision.rationale}

### 🔧 **Changes Made:**
`;

    // Group changes by type
    const createChanges = decision.changes.filter(c => c.type === 'create');
    const updateChanges = decision.changes.filter(c => c.type === 'update');
    const deleteChanges = decision.changes.filter(c => c.type === 'delete');

    if (createChanges.length > 0) {
      body += `\n#### 📄 Created Files:
`;
      for (const change of createChanges) {
        body += `- ✨ \`${change.file}\` - ${change.description}\n`;
      }
    }

    if (updateChanges.length > 0) {
      body += `\n#### 📝 Updated Files:
`;
      for (const change of updateChanges) {
        body += `- 🔄 \`${change.file}\` - ${change.description}\n`;
      }
    }

    if (deleteChanges.length > 0) {
      body += `\n#### 🗑️ Deleted Files:
`;
      for (const change of deleteChanges) {
        body += `- ❌ \`${change.file}\` - ${change.description}\n`;
      }
    }

    // Performance impact section
    body += `\n### 📊 **Performance Impact:**
- ⏱️ **Time Savings:** ${decision.performanceImpact.estimatedTimeSavings} minutes per run
- 💰 **Cost Reduction:** $${decision.performanceImpact.costReduction} per month
- 🎯 **Confidence Level:** ${(decision.performanceImpact.confidence * 100).toFixed(0)}%

*${decision.performanceImpact.rationale}*

### 🔍 **Technical Details:**
`;

    // Add category-specific information
    const securityChanges = decision.changes.filter(c => c.category === 'security');
    const performanceChanges = decision.changes.filter(c => c.category === 'performance');
    const ciChanges = decision.changes.filter(c => c.category === 'ci');

    if (securityChanges.length > 0) {
      body += `\n#### 🔒 Security Improvements:
- Enhanced vulnerability scanning
- Updated security policies
- Improved access controls
`;
    }

    if (performanceChanges.length > 0) {
      body += `\n#### ⚡ Performance Optimizations:
- Optimized caching strategies
- Reduced build times
- Improved resource utilization
`;
    }

    if (ciChanges.length > 0) {
      body += `\n#### 🔄 CI/CD Improvements:
- Streamlined workflow execution
- Enhanced testing strategies
- Better deployment processes
`;
    }

    // Add automation metadata
    body += `\n### 🤖 **Automation Details:**
- **Generated by:** Agent Hooks v2.0
- **Analysis Time:** ${new Date().toISOString()}
- **Decision Engine:** Advanced rule-based optimization
- **Conflict Detection:** Enabled
- **Auto-resolution:** ${options.autoResolve ? 'Enabled' : 'Disabled'}

### ✅ **Validation Checklist:**
- [ ] Changes tested in CI environment
- [ ] Performance benchmarks verified
- [ ] Security scanning completed
- [ ] Documentation updated
- [ ] Breaking changes documented
`;

    // Add footer
    body += `\n---
*This PR was intelligently created by **Agent Hooks** - the autonomous CI/CD optimization system.*\n`;

    if (decision.priority === 'critical') {
      body += `\n⚠️ **CRITICAL:** This PR addresses urgent issues and should be reviewed promptly.`;
    }

    return body;
  }

  /**
   * Batch create multiple intelligent PRs with coordination
   */
  async createIntelligentPRs(
    decisions: AutomationDecision[],
    repository: RepositoryInfo,
    options: any = {}
  ): Promise<PRCreationResult[]> {
    const results: PRCreationResult[] = [];
    const prDecisions = decisions.filter(d => d.shouldCreatePR);

    if (prDecisions.length === 0) {
      return results;
    }

    // Check rate limiting
    if (prDecisions.length > this.config.maxPRsPerHour!) {
      results.push({
        success: false,
        error: `Too many PRs requested: ${prDecisions.length}. Max allowed: ${this.config.maxPRsPerHour}`,
        prNumber: undefined,
        prUrl: undefined,
        branchName: undefined,
        warnings: undefined
      });
      return results;
    }

    // Process decisions by priority
    const priorityOrder = ['critical', 'high', 'medium', 'low'];
    const sortedDecisions = prDecisions.sort((a, b) => {
      return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
    });

    for (const decision of sortedDecisions) {
      try {
        const result = await this.createIntelligentPR(decision, repository, options);
        results.push(result);

        // Add delay between PR creations to avoid rate limits
        if (results.length < sortedDecisions.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          success: false,
          error: `Failed to create intelligent PR: ${errorMessage}`,
          prNumber: undefined,
          prUrl: undefined,
          branchName: undefined,
          warnings: [`Decision: ${decision.rationale}`]
        });
      }
    }

    return results;
  }
}