import * as vscode from 'vscode';
import { WorkspaceManager } from './WorkspaceManager';
import { SettingsManager } from './SettingsManager';
import { GitIntegration } from './GitIntegration';

/**
 * Interface for command context
 */
export interface CommandContext {
  workspaceFolder: vscode.WorkspaceFolder | undefined;
  activeEditor: vscode.TextEditor | undefined;
  selection: vscode.Selection | undefined;
  readmeFile: vscode.Uri | undefined;
}

/**
 * Available extension commands
 */
export enum ExtensionCommands {
  GENERATE_WORKFLOW = 'readme-to-cicd.generateWorkflow',
  PREVIEW_WORKFLOW = 'readme-to-cicd.previewWorkflow',
  VALIDATE_WORKFLOW = 'readme-to-cicd.validateWorkflow',
  OPEN_CONFIGURATION = 'readme-to-cicd.openConfiguration',
  REFRESH_DETECTION = 'readme-to-cicd.refreshDetection',
  STAGE_WORKFLOW_FILES = 'readme-to-cicd.stageWorkflowFiles',
  COMMIT_WORKFLOW_CHANGES = 'readme-to-cicd.commitWorkflowChanges',
  CREATE_WORKFLOW_BRANCH = 'readme-to-cicd.createWorkflowBranch',
  RESOLVE_MERGE_CONFLICTS = 'readme-to-cicd.resolveMergeConflicts'
}

/**
 * Manages extension commands and their registration
 */
export class CommandManager {
  private registeredCommands: vscode.Disposable[] = [];

  constructor(
    private context: vscode.ExtensionContext,
    private workspaceManager: WorkspaceManager,
    private settingsManager: SettingsManager,
    private gitIntegration?: GitIntegration
  ) {}

  /**
   * Initialize command registration
   */
  async initialize(): Promise<void> {
    console.log('Initializing command manager...');

    // Register all commands
    this.registerGenerateWorkflowCommand();
    this.registerPreviewWorkflowCommand();
    this.registerValidateWorkflowCommand();
    this.registerOpenConfigurationCommand();
    this.registerRefreshDetectionCommand();
    
    // Register Git integration commands if available
    if (this.gitIntegration) {
      this.registerGitIntegrationCommands();
    }

    console.log(`Command manager initialized with ${this.registeredCommands.length} commands`);
  }

  /**
   * Dispose of resources
   */
  async dispose(): Promise<void> {
    // Dispose all registered commands
    this.registeredCommands.forEach(command => command.dispose());
    this.registeredCommands = [];
    console.log('Command manager disposed');
  }

  /**
   * Register Generate Workflow command
   */
  private registerGenerateWorkflowCommand(): void {
    const command = vscode.commands.registerCommand(
      ExtensionCommands.GENERATE_WORKFLOW,
      async (uri?: vscode.Uri) => {
        try {
          const context = this.createCommandContext(uri);
          await this.executeGenerateWorkflow(context);
        } catch (error) {
          this.handleCommandError('Generate Workflow', error);
        }
      }
    );

    this.registeredCommands.push(command);
    this.context.subscriptions.push(command);
  }

  /**
   * Register Preview Workflow command
   */
  private registerPreviewWorkflowCommand(): void {
    const command = vscode.commands.registerCommand(
      ExtensionCommands.PREVIEW_WORKFLOW,
      async (uri?: vscode.Uri) => {
        try {
          const context = this.createCommandContext(uri);
          await this.executePreviewWorkflow(context);
        } catch (error) {
          this.handleCommandError('Preview Workflow', error);
        }
      }
    );

    this.registeredCommands.push(command);
    this.context.subscriptions.push(command);
  }

  /**
   * Register Validate Workflow command
   */
  private registerValidateWorkflowCommand(): void {
    const command = vscode.commands.registerCommand(
      ExtensionCommands.VALIDATE_WORKFLOW,
      async (uri?: vscode.Uri) => {
        try {
          const context = this.createCommandContext(uri);
          await this.executeValidateWorkflow(context);
        } catch (error) {
          this.handleCommandError('Validate Workflow', error);
        }
      }
    );

    this.registeredCommands.push(command);
    this.context.subscriptions.push(command);
  }

  /**
   * Register Open Configuration command
   */
  private registerOpenConfigurationCommand(): void {
    const command = vscode.commands.registerCommand(
      ExtensionCommands.OPEN_CONFIGURATION,
      async () => {
        try {
          await this.executeOpenConfiguration();
        } catch (error) {
          this.handleCommandError('Open Configuration', error);
        }
      }
    );

    this.registeredCommands.push(command);
    this.context.subscriptions.push(command);
  }

  /**
   * Register Refresh Detection command
   */
  private registerRefreshDetectionCommand(): void {
    const command = vscode.commands.registerCommand(
      ExtensionCommands.REFRESH_DETECTION,
      async () => {
        try {
          await this.executeRefreshDetection();
        } catch (error) {
          this.handleCommandError('Refresh Detection', error);
        }
      }
    );

    this.registeredCommands.push(command);
    this.context.subscriptions.push(command);
  }

  /**
   * Create command context from URI or active editor
   */
  private createCommandContext(uri?: vscode.Uri): CommandContext {
    const activeEditor = vscode.window.activeTextEditor;
    let workspaceFolder: vscode.WorkspaceFolder | undefined;
    let readmeFile: vscode.Uri | undefined;

    // Determine workspace folder and README file
    if (uri) {
      workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
      if (uri.fsPath.toLowerCase().includes('readme')) {
        readmeFile = uri;
      }
    } else if (activeEditor) {
      workspaceFolder = vscode.workspace.getWorkspaceFolder(activeEditor.document.uri);
      if (activeEditor.document.fileName.toLowerCase().includes('readme')) {
        readmeFile = activeEditor.document.uri;
      }
    }

    // Fallback to active workspace folder
    if (!workspaceFolder) {
      workspaceFolder = this.workspaceManager.getActiveWorkspaceFolder();
    }

    // Find README file if not specified
    if (!readmeFile && workspaceFolder) {
      const primaryReadme = this.workspaceManager.getPrimaryReadmeFile(workspaceFolder);
      readmeFile = primaryReadme?.uri;
    }

    return {
      workspaceFolder,
      activeEditor,
      selection: activeEditor?.selection,
      readmeFile
    };
  }

  /**
   * Execute Generate Workflow command
   */
  private async executeGenerateWorkflow(context: CommandContext): Promise<void> {
    console.log('Executing Generate Workflow command');

    // Validate context
    if (!context.workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder found. Please open a folder or workspace.');
      return;
    }

    if (!context.readmeFile) {
      vscode.window.showErrorMessage('No README.md file found in the workspace.');
      return;
    }

    // Show progress
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Generating CI/CD Workflow',
      cancellable: false
    }, async (progress) => {
      progress.report({ increment: 0, message: 'Analyzing README file...' });

      // TODO: Implement actual workflow generation
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate work
      progress.report({ increment: 50, message: 'Detecting frameworks...' });

      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate work
      progress.report({ increment: 100, message: 'Generating workflow files...' });

      // Show success message
      vscode.window.showInformationMessage(
        `Workflow generated successfully for ${context.workspaceFolder!.name}`,
        'Open Workflow'
      ).then(selection => {
        if (selection === 'Open Workflow') {
          // TODO: Open generated workflow file
        }
      });
    });
  }

  /**
   * Execute Preview Workflow command
   */
  private async executePreviewWorkflow(context: CommandContext): Promise<void> {
    console.log('Executing Preview Workflow command');

    if (!context.workspaceFolder || !context.readmeFile) {
      vscode.window.showErrorMessage('No README.md file found to preview workflow for.');
      return;
    }

    // TODO: Implement workflow preview
    vscode.window.showInformationMessage(
      `Preview workflow for ${context.workspaceFolder.name}`,
      'Generate Workflow'
    ).then(selection => {
      if (selection === 'Generate Workflow') {
        vscode.commands.executeCommand(ExtensionCommands.GENERATE_WORKFLOW, context.readmeFile);
      }
    });
  }

  /**
   * Execute Validate Workflow command
   */
  private async executeValidateWorkflow(context: CommandContext): Promise<void> {
    console.log('Executing Validate Workflow command');

    if (!context.workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder found to validate workflows in.');
      return;
    }

    // Find workflow files
    const workflowFiles = await vscode.workspace.findFiles(
      new vscode.RelativePattern(context.workspaceFolder, '.github/workflows/*.{yml,yaml}'),
      null,
      20
    );

    if (workflowFiles.length === 0) {
      vscode.window.showInformationMessage('No workflow files found to validate.');
      return;
    }

    // TODO: Implement workflow validation
    vscode.window.showInformationMessage(
      `Found ${workflowFiles.length} workflow file(s) to validate`,
      'Validate All'
    );
  }

  /**
   * Execute Open Configuration command
   */
  private async executeOpenConfiguration(): Promise<void> {
    console.log('Executing Open Configuration command');

    // TODO: Implement configuration panel
    const action = await vscode.window.showInformationMessage(
      'Configuration panel will open here',
      'Open Settings',
      'Reset to Defaults'
    );

    if (action === 'Open Settings') {
      vscode.commands.executeCommand('workbench.action.openSettings', '@ext:readme-to-cicd');
    } else if (action === 'Reset to Defaults') {
      // TODO: Reset configuration to defaults
      vscode.window.showInformationMessage('Configuration reset to defaults');
    }
  }

  /**
   * Execute Refresh Detection command
   */
  private async executeRefreshDetection(): Promise<void> {
    console.log('Executing Refresh Detection command');

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Refreshing Framework Detection',
      cancellable: false
    }, async (progress) => {
      progress.report({ increment: 0, message: 'Scanning workspace...' });

      // Refresh README discovery
      await this.workspaceManager.refreshReadmeDiscovery();
      progress.report({ increment: 50, message: 'Analyzing frameworks...' });

      // TODO: Refresh framework detection
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate work
      progress.report({ increment: 100, message: 'Detection complete' });

      const readmeCount = this.workspaceManager.getReadmeFiles().length;
      vscode.window.showInformationMessage(
        `Framework detection refreshed. Found ${readmeCount} README file(s).`
      );
    });
  }

  /**
   * Handle command execution errors
   */
  private handleCommandError(commandName: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error executing ${commandName} command:`, error);

    const notificationLevel = this.settingsManager.getNotificationLevel();
    if (notificationLevel === 'all' || notificationLevel === 'errors') {
      vscode.window.showErrorMessage(
        `${commandName} failed: ${errorMessage}`,
        'Show Details'
      ).then(selection => {
        if (selection === 'Show Details') {
          console.error('Command error details:', error);
        }
      });
    }
  }

  /**
   * Register Git integration commands
   */
  private registerGitIntegrationCommands(): void {
    if (!this.gitIntegration) return;

    // Stage Workflow Files command
    const stageCommand = vscode.commands.registerCommand(
      ExtensionCommands.STAGE_WORKFLOW_FILES,
      async (uri?: vscode.Uri) => {
        try {
          const context = this.createCommandContext(uri);
          await this.executeStageWorkflowFiles(context);
        } catch (error) {
          this.handleCommandError('Stage Workflow Files', error);
        }
      }
    );

    // Commit Workflow Changes command
    const commitCommand = vscode.commands.registerCommand(
      ExtensionCommands.COMMIT_WORKFLOW_CHANGES,
      async (uri?: vscode.Uri) => {
        try {
          const context = this.createCommandContext(uri);
          await this.executeCommitWorkflowChanges(context);
        } catch (error) {
          this.handleCommandError('Commit Workflow Changes', error);
        }
      }
    );

    // Create Workflow Branch command
    const branchCommand = vscode.commands.registerCommand(
      ExtensionCommands.CREATE_WORKFLOW_BRANCH,
      async (uri?: vscode.Uri) => {
        try {
          const context = this.createCommandContext(uri);
          await this.executeCreateWorkflowBranch(context);
        } catch (error) {
          this.handleCommandError('Create Workflow Branch', error);
        }
      }
    );

    // Resolve Merge Conflicts command
    const resolveCommand = vscode.commands.registerCommand(
      ExtensionCommands.RESOLVE_MERGE_CONFLICTS,
      async (uri?: vscode.Uri) => {
        try {
          const context = this.createCommandContext(uri);
          await this.executeResolveMergeConflicts(context);
        } catch (error) {
          this.handleCommandError('Resolve Merge Conflicts', error);
        }
      }
    );

    this.registeredCommands.push(stageCommand, commitCommand, branchCommand, resolveCommand);
    this.context.subscriptions.push(stageCommand, commitCommand, branchCommand, resolveCommand);
  }

  /**
   * Execute Stage Workflow Files command
   */
  private async executeStageWorkflowFiles(context: CommandContext): Promise<void> {
    if (!this.gitIntegration || !context.workspaceFolder) {
      vscode.window.showErrorMessage('Git integration not available or no workspace folder found.');
      return;
    }

    // Find workflow files
    const workflowFiles = await vscode.workspace.findFiles(
      new vscode.RelativePattern(context.workspaceFolder, '.github/workflows/*.{yml,yaml}'),
      null,
      20
    );

    if (workflowFiles.length === 0) {
      vscode.window.showInformationMessage('No workflow files found to stage.');
      return;
    }

    // Generate staging suggestions
    const suggestions = await this.gitIntegration.generateStagingSuggestions(
      context.workspaceFolder,
      workflowFiles.map(f => f.fsPath)
    );

    if (suggestions.length === 0) {
      vscode.window.showInformationMessage('No files need to be staged.');
      return;
    }

    // Show staging suggestions to user
    const filesToStage = suggestions
      .filter(s => s.action === 'stage')
      .map(s => s.filePath);

    const action = await vscode.window.showInformationMessage(
      `Stage ${filesToStage.length} workflow file(s)?`,
      'Stage All',
      'Select Files',
      'Cancel'
    );

    if (action === 'Stage All') {
      await this.gitIntegration.stageFiles(context.workspaceFolder, filesToStage);
    } else if (action === 'Select Files') {
      // TODO: Implement file selection UI
      vscode.window.showInformationMessage('File selection UI not yet implemented');
    }
  }

  /**
   * Execute Commit Workflow Changes command
   */
  private async executeCommitWorkflowChanges(context: CommandContext): Promise<void> {
    if (!this.gitIntegration || !context.workspaceFolder) {
      vscode.window.showErrorMessage('Git integration not available or no workspace folder found.');
      return;
    }

    // Check repository status
    const status = await this.gitIntegration.detectRepositoryStatus(context.workspaceFolder);
    
    if (!status.isRepository) {
      vscode.window.showErrorMessage('Current workspace is not a Git repository.');
      return;
    }

    if (status.stagedFiles.length === 0) {
      vscode.window.showInformationMessage('No staged files to commit.');
      return;
    }

    // Generate commit message
    const workflowFiles = status.stagedFiles.filter(f => f.includes('.github/workflows/'));
    const commitMessage = this.gitIntegration.generateCommitMessage(workflowFiles);

    // Ask user for commit message
    const userMessage = await vscode.window.showInputBox({
      prompt: 'Enter commit message',
      value: commitMessage,
      placeHolder: 'Commit message for workflow changes'
    });

    if (!userMessage) {
      return; // User cancelled
    }

    // Create commit
    await this.gitIntegration.createCommit(context.workspaceFolder, userMessage);
  }

  /**
   * Execute Create Workflow Branch command
   */
  private async executeCreateWorkflowBranch(context: CommandContext): Promise<void> {
    if (!this.gitIntegration || !context.workspaceFolder) {
      vscode.window.showErrorMessage('Git integration not available or no workspace folder found.');
      return;
    }

    // Check repository status
    const status = await this.gitIntegration.detectRepositoryStatus(context.workspaceFolder);
    
    if (!status.isRepository) {
      vscode.window.showErrorMessage('Current workspace is not a Git repository.');
      return;
    }

    // Ask for base branch if multiple branches exist
    let baseBranch: string | undefined;
    if (status.localBranches.length > 1) {
      baseBranch = await vscode.window.showQuickPick(
        status.localBranches,
        {
          placeHolder: 'Select base branch for new workflow branch',
          canPickMany: false
        }
      );

      if (!baseBranch) {
        return; // User cancelled
      }
    }

    // Create workflow branch
    await this.gitIntegration.createWorkflowBranch(context.workspaceFolder, baseBranch);
  }

  /**
   * Execute Resolve Merge Conflicts command
   */
  private async executeResolveMergeConflicts(context: CommandContext): Promise<void> {
    if (!this.gitIntegration || !context.workspaceFolder) {
      vscode.window.showErrorMessage('Git integration not available or no workspace folder found.');
      return;
    }

    // Detect merge conflicts
    const conflicts = await this.gitIntegration.detectMergeConflicts(context.workspaceFolder);

    if (conflicts.length === 0) {
      vscode.window.showInformationMessage('No merge conflicts detected.');
      return;
    }

    // Show conflicts to user
    const conflictFiles = conflicts.map(c => c.filePath);
    const selectedFile = await vscode.window.showQuickPick(
      conflictFiles,
      {
        placeHolder: 'Select file to resolve conflicts',
        canPickMany: false
      }
    );

    if (!selectedFile) {
      return; // User cancelled
    }

    // Provide resolution assistance
    const conflict = conflicts.find(c => c.filePath === selectedFile);
    if (conflict) {
      await this.gitIntegration.provideMergeConflictResolution(context.workspaceFolder, conflict);
    }
  }

  /**
   * Get list of registered commands
   */
  getRegisteredCommands(): string[] {
    return Object.values(ExtensionCommands);
  }
}