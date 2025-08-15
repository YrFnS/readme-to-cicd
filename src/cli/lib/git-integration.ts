import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { CLIError, GitConfig } from './types';
import { Logger } from './logger';

const execAsync = promisify(exec);

/**
 * Git Integration System for CLI Tool
 * 
 * Provides comprehensive Git operations including repository detection,
 * status checking, automatic commits, diff display, and branch protection
 * detection as specified in requirements 7.1-7.5.
 */
export class GitIntegration {
  constructor(
    private readonly logger: Logger,
    private readonly workingDirectory: string = process.cwd()
  ) {}

  /**
   * Detect if the current directory is within a Git repository
   * Requirement 7.1: WHEN generating workflows THEN the system SHALL detect if the project is in a Git repository
   */
  async isGitRepository(): Promise<boolean> {
    try {
      await this.executeGitCommand('rev-parse --git-dir');
      return true;
    } catch (error) {
      this.logger.debug('Not a Git repository', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * Get comprehensive Git repository status
   * Requirement 7.1: Repository detection and status checking
   */
  async getRepositoryStatus(): Promise<GitRepositoryStatus> {
    if (!await this.isGitRepository()) {
      throw this.createGitError('NOT_GIT_REPOSITORY', 'Current directory is not a Git repository');
    }

    try {
      const [statusOutput, branchOutput, remoteOutput] = await Promise.all([
        this.executeGitCommand('status --porcelain'),
        this.executeGitCommand('branch --show-current'),
        this.executeGitCommand('remote -v').catch(() => ({ stdout: '', stderr: '' }))
      ]);

      const hasChanges = statusOutput.stdout.trim().length > 0;
      const currentBranch = branchOutput.stdout.trim();
      const hasRemote = remoteOutput.stdout.trim().length > 0;

      return {
        isRepository: true,
        hasChanges,
        currentBranch,
        hasRemote,
        changedFiles: this.parseStatusOutput(statusOutput.stdout),
        isClean: !hasChanges
      };
    } catch (error) {
      throw this.createGitError('STATUS_CHECK_FAILED', 'Failed to check repository status', error as Error);
    }
  }

  /**
   * Create automatic commit with descriptive message for generated workflows
   * Requirement 7.2: WHEN Git is detected THEN the system SHALL offer to commit generated workflows automatically
   * Requirement 7.3: WHEN I use --git-commit flag THEN the system SHALL create commits with descriptive messages
   */
  async createCommit(
    files: string[],
    config: GitConfig,
    workflowTypes: string[] = []
  ): Promise<CommitResult> {
    if (!await this.isGitRepository()) {
      throw this.createGitError('NOT_GIT_REPOSITORY', 'Cannot commit: not in a Git repository');
    }

    try {
      // Stage the specified files
      for (const file of files) {
        await this.executeGitCommand(`add "${file}"`);
      }

      // Generate descriptive commit message
      const commitMessage = this.generateCommitMessage(files, workflowTypes, config.commitMessage);
      
      // Create the commit
      const commitOutput = await this.executeGitCommand(`commit -m "${commitMessage}"`);
      
      this.logger.info('Git commit created successfully', { 
        files, 
        message: commitMessage,
        output: commitOutput.stdout 
      });

      return {
        success: true,
        commitHash: await this.getLatestCommitHash(),
        message: commitMessage,
        filesCommitted: files
      };
    } catch (error) {
      throw this.createGitError('COMMIT_FAILED', 'Failed to create Git commit', error as Error);
    }
  }

  /**
   * Display diff for workflow changes and updates
   * Requirement 7.4: WHEN workflows are updated THEN the system SHALL show diffs of changes made
   */
  async showWorkflowDiff(files: string[]): Promise<DiffResult> {
    if (!await this.isGitRepository()) {
      return {
        hasDiff: false,
        files: [],
        summary: 'Not in a Git repository - cannot show diff'
      };
    }

    try {
      const diffResults: FileDiff[] = [];
      
      for (const file of files) {
        try {
          // Check if file exists in Git index
          const diffOutput = await this.executeGitCommand(`diff HEAD -- "${file}"`);
          
          if (diffOutput.stdout.trim()) {
            const stats = await this.getFileStats(file);
            diffResults.push({
              file,
              diff: diffOutput.stdout,
              stats,
              status: await this.getFileStatus(file)
            });
          }
        } catch (error) {
          // File might be new (not in Git index)
          const statusOutput = await this.executeGitCommand(`status --porcelain -- "${file}"`).catch(() => null);
          if (statusOutput?.stdout.includes('??')) {
            diffResults.push({
              file,
              diff: `New file: ${file}`,
              stats: { additions: 0, deletions: 0, changes: 0 },
              status: 'new'
            });
          }
        }
      }

      return {
        hasDiff: diffResults.length > 0,
        files: diffResults,
        summary: this.generateDiffSummary(diffResults)
      };
    } catch (error) {
      throw this.createGitError('DIFF_FAILED', 'Failed to generate diff', error as Error);
    }
  }  /*
*
   * Detect branch protection and warn about potential conflicts
   * Requirement 7.5: WHEN branch protection exists THEN the system SHALL warn about potential conflicts with generated workflows
   */
  async checkBranchProtection(): Promise<BranchProtectionStatus> {
    if (!await this.isGitRepository()) {
      return {
        hasProtection: false,
        warnings: [],
        recommendations: []
      };
    }

    try {
      const status = await this.getRepositoryStatus();
      const warnings: string[] = [];
      const recommendations: string[] = [];

      // Check if we're on a protected branch (common patterns)
      const protectedBranches = ['main', 'master', 'develop', 'production'];
      const isProtectedBranch = protectedBranches.includes(status.currentBranch.toLowerCase());

      if (isProtectedBranch) {
        warnings.push(`Currently on potentially protected branch: ${status.currentBranch}`);
        recommendations.push('Consider creating a feature branch for workflow changes');
        recommendations.push('Use pull requests to merge workflow changes to protected branches');
      }

      // Check for uncommitted changes
      if (status.hasChanges) {
        warnings.push('Repository has uncommitted changes');
        recommendations.push('Commit or stash changes before generating workflows');
      }

      // Check for remote repository
      if (!status.hasRemote) {
        warnings.push('No remote repository configured');
        recommendations.push('Add a remote repository to enable collaboration');
      }

      // Try to detect GitHub branch protection (requires GitHub CLI or API)
      const githubProtection = await this.detectGitHubBranchProtection(status.currentBranch);
      if (githubProtection.hasProtection) {
        warnings.push(...githubProtection.warnings);
        recommendations.push(...githubProtection.recommendations);
      }

      return {
        hasProtection: isProtectedBranch || githubProtection.hasProtection,
        currentBranch: status.currentBranch,
        warnings,
        recommendations
      };
    } catch (error) {
      this.logger.warn('Failed to check branch protection', { error: (error as Error).message });
      return {
        hasProtection: false,
        warnings: ['Could not determine branch protection status'],
        recommendations: ['Manually verify branch protection settings']
      };
    }
  }

  /**
   * Display formatted diff output to console
   */
  displayDiff(diffResult: DiffResult): void {
    if (!diffResult.hasDiff) {
      console.log(chalk.gray('No changes to display'));
      return;
    }

    console.log(chalk.bold('\n📋 Workflow Changes:'));
    console.log(chalk.gray('─'.repeat(50)));

    diffResult.files.forEach(fileDiff => {
      console.log(chalk.cyan(`\n📄 ${fileDiff.file}`));
      console.log(chalk.gray(`Status: ${fileDiff.status}`));
      
      if (fileDiff.stats.additions > 0 || fileDiff.stats.deletions > 0) {
        console.log(chalk.green(`+${fileDiff.stats.additions} `) + chalk.red(`-${fileDiff.stats.deletions}`));
      }

      // Show abbreviated diff for readability
      const diffLines = fileDiff.diff.split('\n').slice(0, 10);
      diffLines.forEach(line => {
        if (line.startsWith('+')) {
          console.log(chalk.green(line));
        } else if (line.startsWith('-')) {
          console.log(chalk.red(line));
        } else if (line.startsWith('@@')) {
          console.log(chalk.cyan(line));
        } else {
          console.log(chalk.gray(line));
        }
      });

      if (fileDiff.diff.split('\n').length > 10) {
        console.log(chalk.gray('... (diff truncated)'));
      }
    });

    console.log(chalk.bold(`\n${diffResult.summary}`));
  }  /**

   * Display branch protection warnings and recommendations
   */
  displayBranchProtectionWarnings(protection: BranchProtectionStatus): void {
    if (protection.warnings.length === 0) {
      return;
    }

    console.log(chalk.yellow.bold('\n⚠️  Branch Protection Warnings:'));
    protection.warnings.forEach(warning => {
      console.log(chalk.yellow(`  • ${warning}`));
    });

    if (protection.recommendations.length > 0) {
      console.log(chalk.blue.bold('\n💡 Recommendations:'));
      protection.recommendations.forEach(recommendation => {
        console.log(chalk.blue(`  • ${recommendation}`));
      });
    }
  }

  // Private helper methods

  /**
   * Execute Git command with proper error handling
   */
  private async executeGitCommand(command: string): Promise<{ stdout: string; stderr: string }> {
    try {
      const result = await execAsync(`git ${command}`, { 
        cwd: this.workingDirectory,
        timeout: 10000 // 10 second timeout
      });
      return result;
    } catch (error: any) {
      this.logger.debug('Git command failed', { command, error: error.message });
      throw error;
    }
  }

  /**
   * Parse Git status output into structured format
   */
  private parseStatusOutput(statusOutput: string): ChangedFile[] {
    const lines = statusOutput.trim().split('\n').filter(line => line.trim());
    return lines.map(line => {
      const status = line.substring(0, 2);
      const file = line.substring(3);
      return {
        file,
        status: this.interpretStatusCode(status),
        staged: status[0] !== ' ' && status[0] !== '?',
        unstaged: status[1] !== ' ' && status[1] !== '?'
      };
    });
  }

  /**
   * Interpret Git status codes
   */
  private interpretStatusCode(code: string): string {
    const statusMap: Record<string, string> = {
      'M ': 'modified (staged)',
      ' M': 'modified (unstaged)',
      'MM': 'modified (staged and unstaged)',
      'A ': 'added',
      'D ': 'deleted',
      'R ': 'renamed',
      'C ': 'copied',
      '??': 'untracked'
    };
    return statusMap[code] || 'unknown';
  }  /**

   * Generate descriptive commit message for workflow changes
   */
  private generateCommitMessage(
    files: string[],
    workflowTypes: string[],
    customMessage?: string
  ): string {
    if (customMessage && customMessage.trim()) {
      return customMessage;
    }

    const workflowTypeText = workflowTypes.length > 0 
      ? ` (${workflowTypes.join(', ')})` 
      : '';
    
    if (files.length === 1) {
      return `feat: add automated CI/CD workflow${workflowTypeText}`;
    } else {
      return `feat: add ${files.length} automated CI/CD workflows${workflowTypeText}`;
    }
  }

  /**
   * Get latest commit hash
   */
  private async getLatestCommitHash(): Promise<string> {
    const result = await this.executeGitCommand('rev-parse HEAD');
    return result.stdout.trim();
  }

  /**
   * Get file statistics for diff display
   */
  private async getFileStats(file: string): Promise<FileStats> {
    try {
      const result = await this.executeGitCommand(`diff --numstat HEAD -- "${file}"`);
      const stats = result.stdout.trim().split('\t');
      
      if (stats.length >= 2) {
        return {
          additions: parseInt(stats[0]) || 0,
          deletions: parseInt(stats[1]) || 0,
          changes: (parseInt(stats[0]) || 0) + (parseInt(stats[1]) || 0)
        };
      }
    } catch (error) {
      // File might be new or not in Git
    }
    
    return { additions: 0, deletions: 0, changes: 0 };
  }

  /**
   * Get file status (new, modified, deleted, etc.)
   */
  private async getFileStatus(file: string): Promise<string> {
    try {
      const result = await this.executeGitCommand(`status --porcelain -- "${file}"`);
      const statusLine = result.stdout.trim();
      
      if (statusLine) {
        const statusCode = statusLine.substring(0, 2);
        return this.interpretStatusCode(statusCode);
      }
      
      return 'unchanged';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Generate summary of diff results
   */
  private generateDiffSummary(diffs: FileDiff[]): string {
    const totalAdditions = diffs.reduce((sum, diff) => sum + diff.stats.additions, 0);
    const totalDeletions = diffs.reduce((sum, diff) => sum + diff.stats.deletions, 0);
    const fileCount = diffs.length;

    return `${fileCount} file${fileCount !== 1 ? 's' : ''} changed, ${totalAdditions} insertion${totalAdditions !== 1 ? 's' : ''}(+), ${totalDeletions} deletion${totalDeletions !== 1 ? 's' : ''}(-)`;
  }  /*
*
   * Detect GitHub branch protection (requires GitHub CLI or API access)
   */
  private async detectGitHubBranchProtection(branch: string): Promise<GitHubProtectionResult> {
    try {
      // Try to use GitHub CLI if available
      const result = await execAsync(`gh api repos/:owner/:repo/branches/${branch}/protection`, {
        cwd: this.workingDirectory,
        timeout: 5000
      });

      if (result.stdout.trim()) {
        const protection = JSON.parse(result.stdout);
        return {
          hasProtection: true,
          warnings: [
            `Branch '${branch}' has GitHub branch protection enabled`,
            'Direct pushes to this branch may be restricted'
          ],
          recommendations: [
            'Create a pull request for workflow changes',
            'Ensure required status checks are configured for new workflows'
          ]
        };
      }
    } catch (error) {
      // GitHub CLI not available or not authenticated - this is expected
      this.logger.debug('GitHub CLI not available for branch protection check', { 
        error: (error as Error).message 
      });
    }

    return {
      hasProtection: false,
      warnings: [],
      recommendations: []
    };
  }

  /**
   * Create standardized Git integration error
   */
  private createGitError(code: string, message: string, originalError?: Error): CLIError {
    const suggestions: string[] = [];

    switch (code) {
      case 'NOT_GIT_REPOSITORY':
        suggestions.push('Initialize a Git repository with: git init');
        suggestions.push('Clone an existing repository');
        break;
      case 'COMMIT_FAILED':
        suggestions.push('Check that files are properly staged');
        suggestions.push('Verify Git user configuration: git config user.name and user.email');
        suggestions.push('Ensure you have write permissions to the repository');
        break;
      case 'STATUS_CHECK_FAILED':
        suggestions.push('Verify Git is installed and accessible');
        suggestions.push('Check repository permissions');
        break;
      case 'DIFF_FAILED':
        suggestions.push('Ensure files exist and are accessible');
        suggestions.push('Check Git repository integrity');
        break;
      default:
        suggestions.push('Try running with --debug flag for more information');
        suggestions.push('Verify Git is properly installed and configured');
    }

    return {
      code,
      message,
      category: 'git-integration',
      severity: 'error',
      suggestions,
      context: originalError ? {
        originalMessage: originalError.message,
        stack: originalError.stack
      } : undefined
    };
  }
}

// Type definitions for Git integration

export interface GitRepositoryStatus {
  isRepository: boolean;
  hasChanges: boolean;
  currentBranch: string;
  hasRemote: boolean;
  changedFiles: ChangedFile[];
  isClean: boolean;
}

export interface ChangedFile {
  file: string;
  status: string;
  staged: boolean;
  unstaged: boolean;
}

export interface CommitResult {
  success: boolean;
  commitHash: string;
  message: string;
  filesCommitted: string[];
}

export interface DiffResult {
  hasDiff: boolean;
  files: FileDiff[];
  summary: string;
}

export interface FileDiff {
  file: string;
  diff: string;
  stats: FileStats;
  status: string;
}

export interface FileStats {
  additions: number;
  deletions: number;
  changes: number;
}

export interface BranchProtectionStatus {
  hasProtection: boolean;
  currentBranch?: string;
  warnings: string[];
  recommendations: string[];
}

interface GitHubProtectionResult {
  hasProtection: boolean;
  warnings: string[];
  recommendations: string[];
}