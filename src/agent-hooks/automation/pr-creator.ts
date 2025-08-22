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
}