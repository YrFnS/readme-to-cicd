import * as vscode from 'vscode';
import * as path from 'path';
import { ProcessExecutor } from './ProcessExecutor';
import { ProcessExecutionResult, GitIntegrationSettings, ErrorCategory } from './types';

/**
 * Custom error class for Git operations
 */
export class GitError extends Error {
  constructor(
    message: string,
    public readonly category: ErrorCategory,
    public readonly gitCommand?: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'GitError';
  }
}

/**
 * Interface for Git repository status
 */
export interface GitRepositoryStatus {
  isRepository: boolean;
  currentBranch: string;
  hasUncommittedChanges: boolean;
  stagedFiles: string[];
  unstagedFiles: string[];
  untrackedFiles: string[];
  conflictedFiles: string[];
  remoteBranches: string[];
  localBranches: string[];
}

/**
 * Interface for Git commit information
 */
export interface GitCommitInfo {
  hash: string;
  message: string;
  author: string;
  date: Date;
  files: string[];
}

/**
 * Interface for merge conflict information
 */
export interface MergeConflict {
  filePath: string;
  conflictType: 'content' | 'add-add' | 'delete-modify' | 'modify-delete';
  ourVersion?: string;
  theirVersion?: string;
  baseVersion?: string;
}

/**
 * Interface for branch information
 */
export interface BranchInfo {
  name: string;
  isRemote: boolean;
  isCurrent: boolean;
  lastCommit: string;
  upstream?: string;
}

/**
 * Interface for staging suggestions
 */
export interface StagingSuggestion {
  filePath: string;
  action: 'stage' | 'unstage' | 'ignore';
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * GitIntegration service handles all Git operations for the VS Code extension
 * including repository detection, change management, and source control integration
 */
export class GitIntegration {
  private readonly processExecutor: ProcessExecutor;
  private readonly context: vscode.ExtensionContext;
  private repositoryCache: Map<string, GitRepositoryStatus> = new Map();
  private readonly refreshInterval = 30000; // 30 seconds
  private refreshTimer?: NodeJS.Timeout;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.processExecutor = new ProcessExecutor();
  }

  /**
   * Initialize the Git integration service
   */
  async initialize(): Promise<void> {
    try {
      // Check if Git is available
      await this.checkGitAvailability();
      
      // Start periodic refresh of repository status
      this.startPeriodicRefresh();
      
      console.log('Git integration service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Git integration:', error);
      throw new GitError(
        'Git integration initialization failed',
        'configuration',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check if Git is available in the system
   */
  async checkGitAvailability(): Promise<boolean> {
    try {
      const result = await this.processExecutor.executeCommand({
        command: 'git',
        args: ['--version'],
        timeout: 5000
      });
      
      return result.success && result.stdout.includes('git version');
    } catch (error) {
      throw new GitError(
        'Git is not available in the system PATH',
        'configuration',
        'git --version'
      );
    }
  }

  /**
   * Detect Git repository status for a workspace folder
   */
  async detectRepositoryStatus(workspaceFolder: vscode.WorkspaceFolder): Promise<GitRepositoryStatus> {
    const workspacePath = workspaceFolder.uri.fsPath;
    
    try {
      // Check if it's a Git repository
      const isRepoResult = await this.processExecutor.executeCommand({
        command: 'git',
        args: ['rev-parse', '--is-inside-work-tree'],
        cwd: workspacePath,
        timeout: 5000
      });

      if (!isRepoResult.success) {
        return {
          isRepository: false,
          currentBranch: '',
          hasUncommittedChanges: false,
          stagedFiles: [],
          unstagedFiles: [],
          untrackedFiles: [],
          conflictedFiles: [],
          remoteBranches: [],
          localBranches: []
        };
      }

      // Get current branch
      const branchResult = await this.processExecutor.executeCommand({
        command: 'git',
        args: ['branch', '--show-current'],
        cwd: workspacePath,
        timeout: 5000
      });

      const currentBranch = branchResult.success ? branchResult.stdout.trim() : 'unknown';

      // Get repository status
      const statusResult = await this.processExecutor.executeCommand({
        command: 'git',
        args: ['status', '--porcelain'],
        cwd: workspacePath,
        timeout: 10000
      });

      const { stagedFiles, unstagedFiles, untrackedFiles, conflictedFiles } = 
        this.parseGitStatus(statusResult.stdout);

      // Get branches
      const { localBranches, remoteBranches } = await this.getBranches(workspacePath);

      const status: GitRepositoryStatus = {
        isRepository: true,
        currentBranch,
        hasUncommittedChanges: stagedFiles.length > 0 || unstagedFiles.length > 0 || untrackedFiles.length > 0,
        stagedFiles,
        unstagedFiles,
        untrackedFiles,
        conflictedFiles,
        remoteBranches,
        localBranches
      };

      // Cache the status
      this.repositoryCache.set(workspacePath, status);
      
      return status;
    } catch (error) {
      throw new GitError(
        `Failed to detect repository status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'git-integration',
        'git status',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Generate automatic staging suggestions for workflow files
   */
  async generateStagingSuggestions(
    workspaceFolder: vscode.WorkspaceFolder,
    workflowFiles: string[]
  ): Promise<StagingSuggestion[]> {
    const suggestions: StagingSuggestion[] = [];
    const status = await this.detectRepositoryStatus(workspaceFolder);

    if (!status.isRepository) {
      return suggestions;
    }

    // Suggest staging workflow files
    for (const workflowFile of workflowFiles) {
      const relativePath = path.relative(workspaceFolder.uri.fsPath, workflowFile);
      
      if (status.unstagedFiles.includes(relativePath)) {
        suggestions.push({
          filePath: relativePath,
          action: 'stage',
          reason: 'Generated workflow file should be committed',
          priority: 'high'
        });
      } else if (status.untrackedFiles.includes(relativePath)) {
        suggestions.push({
          filePath: relativePath,
          action: 'stage',
          reason: 'New workflow file should be tracked',
          priority: 'high'
        });
      }
    }

    // Suggest staging README.md if it was modified
    const readmePath = 'README.md';
    if (status.unstagedFiles.includes(readmePath)) {
      suggestions.push({
        filePath: readmePath,
        action: 'stage',
        reason: 'README.md changes may have triggered workflow generation',
        priority: 'medium'
      });
    }

    return suggestions;
  }

  /**
   * Generate appropriate commit messages for workflow updates
   */
  generateCommitMessage(
    workflowFiles: string[],
    detectedFrameworks: string[] = [],
    isUpdate: boolean = false
  ): string {
    const action = isUpdate ? 'Update' : 'Add';
    const workflowCount = workflowFiles.length;
    
    if (workflowCount === 1) {
      const workflowName = path.basename(workflowFiles[0], path.extname(workflowFiles[0]));
      return `${action} ${workflowName} workflow`;
    } else if (workflowCount > 1) {
      const baseMessage = `${action} ${workflowCount} CI/CD workflows`;
      
      if (detectedFrameworks.length > 0) {
        const frameworkList = detectedFrameworks.slice(0, 3).join(', ');
        const moreFrameworks = detectedFrameworks.length > 3 ? ` and ${detectedFrameworks.length - 3} more` : '';
        return `${baseMessage} for ${frameworkList}${moreFrameworks}`;
      }
      
      return baseMessage;
    }

    return `${action} CI/CD workflows`;
  }

  /**
   * Stage files for commit
   */
  async stageFiles(workspaceFolder: vscode.WorkspaceFolder, filePaths: string[]): Promise<void> {
    const workspacePath = workspaceFolder.uri.fsPath;
    
    try {
      for (const filePath of filePaths) {
        const result = await this.processExecutor.executeCommand({
          command: 'git',
          args: ['add', filePath],
          cwd: workspacePath,
          timeout: 10000
        });

        if (!result.success) {
          throw new GitError(
            `Failed to stage file ${filePath}: ${result.stderr}`,
            'git-integration',
            `git add ${filePath}`
          );
        }
      }

      // Refresh repository status
      await this.detectRepositoryStatus(workspaceFolder);
      
      vscode.window.showInformationMessage(
        `Staged ${filePaths.length} file(s) for commit`
      );
    } catch (error) {
      throw new GitError(
        `Failed to stage files: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'git-integration',
        'git add',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Create a commit with the specified message
   */
  async createCommit(
    workspaceFolder: vscode.WorkspaceFolder,
    message: string,
    filePaths?: string[]
  ): Promise<GitCommitInfo> {
    const workspacePath = workspaceFolder.uri.fsPath;
    
    try {
      // Stage specific files if provided
      if (filePaths && filePaths.length > 0) {
        await this.stageFiles(workspaceFolder, filePaths);
      }

      // Create the commit
      const commitResult = await this.processExecutor.executeCommand({
        command: 'git',
        args: ['commit', '-m', message],
        cwd: workspacePath,
        timeout: 15000
      });

      if (!commitResult.success) {
        throw new GitError(
          `Failed to create commit: ${commitResult.stderr}`,
          'git-integration',
          `git commit -m "${message}"`
        );
      }

      // Get commit information
      const commitInfo = await this.getLatestCommit(workspaceFolder);
      
      vscode.window.showInformationMessage(
        `Created commit: ${commitInfo.hash.substring(0, 8)} - ${message}`
      );

      return commitInfo;
    } catch (error) {
      throw new GitError(
        `Failed to create commit: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'git-integration',
        'git commit',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Create a new branch for workflow changes
   */
  async createWorkflowBranch(
    workspaceFolder: vscode.WorkspaceFolder,
    baseBranchName?: string
  ): Promise<string> {
    const workspacePath = workspaceFolder.uri.fsPath;
    const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '');
    const branchName = `feature/update-workflows-${timestamp}`;
    
    try {
      // Create and checkout new branch
      const createResult = await this.processExecutor.executeCommand({
        command: 'git',
        args: ['checkout', '-b', branchName, baseBranchName || 'HEAD'],
        cwd: workspacePath,
        timeout: 10000
      });

      if (!createResult.success) {
        throw new GitError(
          `Failed to create branch ${branchName}: ${createResult.stderr}`,
          'git-integration',
          `git checkout -b ${branchName}`
        );
      }

      vscode.window.showInformationMessage(
        `Created and switched to branch: ${branchName}`
      );

      return branchName;
    } catch (error) {
      throw new GitError(
        `Failed to create workflow branch: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'git-integration',
        'git checkout -b',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Detect merge conflicts in workflow files
   */
  async detectMergeConflicts(workspaceFolder: vscode.WorkspaceFolder): Promise<MergeConflict[]> {
    const conflicts: MergeConflict[] = [];
    const status = await this.detectRepositoryStatus(workspaceFolder);

    if (!status.isRepository || status.conflictedFiles.length === 0) {
      return conflicts;
    }

    const workspacePath = workspaceFolder.uri.fsPath;

    for (const conflictedFile of status.conflictedFiles) {
      try {
        const filePath = path.join(workspacePath, conflictedFile);
        const content = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
        const contentStr = Buffer.from(content).toString('utf8');

        // Check for conflict markers
        if (contentStr.includes('<<<<<<<') && contentStr.includes('>>>>>>>')) {
          conflicts.push({
            filePath: conflictedFile,
            conflictType: 'content'
          });
        }
      } catch (error) {
        console.error(`Failed to read conflicted file ${conflictedFile}:`, error);
      }
    }

    return conflicts;
  }

  /**
   * Provide merge conflict resolution assistance
   */
  async provideMergeConflictResolution(
    workspaceFolder: vscode.WorkspaceFolder,
    conflict: MergeConflict
  ): Promise<void> {
    const filePath = path.join(workspaceFolder.uri.fsPath, conflict.filePath);
    const uri = vscode.Uri.file(filePath);

    // Open the conflicted file in the editor
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);

    // Show conflict resolution options
    const action = await vscode.window.showWarningMessage(
      `Merge conflict detected in ${path.basename(conflict.filePath)}`,
      'Open Merge Editor',
      'Accept Current',
      'Accept Incoming',
      'Resolve Manually'
    );

    switch (action) {
      case 'Open Merge Editor':
        await vscode.commands.executeCommand('merge-conflict.accept.current');
        break;
      case 'Accept Current':
        await this.resolveConflict(workspaceFolder, conflict.filePath, 'current');
        break;
      case 'Accept Incoming':
        await this.resolveConflict(workspaceFolder, conflict.filePath, 'incoming');
        break;
      case 'Resolve Manually':
        vscode.window.showInformationMessage(
          'Please resolve the conflict manually and then stage the file.'
        );
        break;
    }
  }

  /**
   * Get the latest commit information
   */
  private async getLatestCommit(workspaceFolder: vscode.WorkspaceFolder): Promise<GitCommitInfo> {
    const workspacePath = workspaceFolder.uri.fsPath;
    
    const result = await this.processExecutor.executeCommand({
      command: 'git',
      args: ['log', '-1', '--pretty=format:%H|%s|%an|%ad|%D', '--date=iso'],
      cwd: workspacePath,
      timeout: 5000
    });

    if (!result.success) {
      throw new GitError('Failed to get latest commit information', 'git-integration', 'git log');
    }

    const [hash, message, author, dateStr] = result.stdout.trim().split('|');
    
    return {
      hash,
      message,
      author,
      date: new Date(dateStr),
      files: [] // Would need additional call to get files
    };
  }

  /**
   * Get local and remote branches
   */
  private async getBranches(workspacePath: string): Promise<{ localBranches: string[], remoteBranches: string[] }> {
    const localResult = await this.processExecutor.executeCommand({
      command: 'git',
      args: ['branch', '--format=%(refname:short)'],
      cwd: workspacePath,
      timeout: 5000
    });

    const remoteResult = await this.processExecutor.executeCommand({
      command: 'git',
      args: ['branch', '-r', '--format=%(refname:short)'],
      cwd: workspacePath,
      timeout: 5000
    });

    const localBranches = localResult.success ? 
      localResult.stdout.trim().split('\n').filter(b => b.trim()) : [];
    const remoteBranches = remoteResult.success ? 
      remoteResult.stdout.trim().split('\n').filter(b => b.trim()) : [];

    return { localBranches, remoteBranches };
  }

  /**
   * Parse Git status output
   */
  private parseGitStatus(statusOutput: string): {
    stagedFiles: string[],
    unstagedFiles: string[],
    untrackedFiles: string[],
    conflictedFiles: string[]
  } {
    const stagedFiles: string[] = [];
    const unstagedFiles: string[] = [];
    const untrackedFiles: string[] = [];
    const conflictedFiles: string[] = [];

    const lines = statusOutput.trim().split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      if (line.length < 3) continue;
      
      const indexStatus = line[0];
      const workTreeStatus = line[1];
      const fileName = line.substring(3);

      // Conflicted files
      if (indexStatus === 'U' || workTreeStatus === 'U' || 
          (indexStatus === 'A' && workTreeStatus === 'A') ||
          (indexStatus === 'D' && workTreeStatus === 'D')) {
        conflictedFiles.push(fileName);
        continue;
      }

      // Staged files
      if (indexStatus !== ' ' && indexStatus !== '?') {
        stagedFiles.push(fileName);
      }

      // Unstaged files
      if (workTreeStatus !== ' ' && workTreeStatus !== '?') {
        unstagedFiles.push(fileName);
      }

      // Untracked files
      if (indexStatus === '?' && workTreeStatus === '?') {
        untrackedFiles.push(fileName);
      }
    }

    return { stagedFiles, unstagedFiles, untrackedFiles, conflictedFiles };
  }

  /**
   * Resolve a merge conflict automatically
   */
  private async resolveConflict(
    workspaceFolder: vscode.WorkspaceFolder,
    filePath: string,
    resolution: 'current' | 'incoming'
  ): Promise<void> {
    const workspacePath = workspaceFolder.uri.fsPath;
    const option = resolution === 'current' ? '--ours' : '--theirs';
    
    const result = await this.processExecutor.executeCommand({
      command: 'git',
      args: ['checkout', option, filePath],
      cwd: workspacePath,
      timeout: 10000
    });

    if (result.success) {
      await this.stageFiles(workspaceFolder, [filePath]);
      vscode.window.showInformationMessage(
        `Resolved conflict in ${path.basename(filePath)} using ${resolution} version`
      );
    } else {
      throw new GitError(
        `Failed to resolve conflict: ${result.stderr}`,
        'git-integration',
        `git checkout ${option} ${filePath}`
      );
    }
  }

  /**
   * Start periodic refresh of repository status
   */
  private startPeriodicRefresh(): void {
    this.refreshTimer = setInterval(async () => {
      try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
          for (const folder of workspaceFolders) {
            await this.detectRepositoryStatus(folder);
          }
        }
      } catch (error) {
        console.error('Error during periodic repository refresh:', error);
      }
    }, this.refreshInterval);
  }

  /**
   * Get cached repository status
   */
  getCachedRepositoryStatus(workspaceFolder: vscode.WorkspaceFolder): GitRepositoryStatus | undefined {
    return this.repositoryCache.get(workspaceFolder.uri.fsPath);
  }

  /**
   * Clear repository cache
   */
  clearCache(): void {
    this.repositoryCache.clear();
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
    this.repositoryCache.clear();
    this.processExecutor.dispose();
  }
}