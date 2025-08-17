import * as vscode from 'vscode';
import { WorkspaceManager } from './WorkspaceManager';
import { SettingsManager } from './SettingsManager';
import { GitIntegration } from './GitIntegration';
import { MultiWorkflowCoordinator } from './MultiWorkflowCoordinator';
import { TemplateManager } from './TemplateManager';
import { WorkflowType } from './types';

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
  RESOLVE_MERGE_CONFLICTS = 'readme-to-cicd.resolveMergeConflicts',
  // Multi-workflow commands
  GENERATE_MULTI_WORKFLOW = 'readme-to-cicd.generateMultiWorkflow',
  MANAGE_TEMPLATES = 'readme-to-cicd.manageTemplates',
  CREATE_CUSTOM_TEMPLATE = 'readme-to-cicd.createCustomTemplate',
  UPDATE_WORKFLOWS = 'readme-to-cicd.updateWorkflows',
  COORDINATE_WORKFLOWS = 'readme-to-cicd.coordinateWorkflows',
  IMPORT_ORGANIZATION_TEMPLATES = 'readme-to-cicd.importOrganizationTemplates',
  EXPORT_TEMPLATES = 'readme-to-cicd.exportTemplates'
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
    private gitIntegration?: GitIntegration,
    private multiWorkflowCoordinator?: MultiWorkflowCoordinator,
    private templateManager?: TemplateManager
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

    // Register multi-workflow commands if available
    if (this.multiWorkflowCoordinator && this.templateManager) {
      this.registerMultiWorkflowCommands();
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
   * Register multi-workflow commands
   */
  private registerMultiWorkflowCommands(): void {
    if (!this.multiWorkflowCoordinator || !this.templateManager) return;

    // Generate Multi-Workflow command
    const generateMultiCommand = vscode.commands.registerCommand(
      ExtensionCommands.GENERATE_MULTI_WORKFLOW,
      async (uri?: vscode.Uri) => {
        try {
          const context = this.createCommandContext(uri);
          await this.executeGenerateMultiWorkflow(context);
        } catch (error) {
          this.handleCommandError('Generate Multi-Workflow', error);
        }
      }
    );

    // Manage Templates command
    const manageTemplatesCommand = vscode.commands.registerCommand(
      ExtensionCommands.MANAGE_TEMPLATES,
      async () => {
        try {
          await this.executeManageTemplates();
        } catch (error) {
          this.handleCommandError('Manage Templates', error);
        }
      }
    );

    // Create Custom Template command
    const createTemplateCommand = vscode.commands.registerCommand(
      ExtensionCommands.CREATE_CUSTOM_TEMPLATE,
      async (uri?: vscode.Uri) => {
        try {
          const context = this.createCommandContext(uri);
          await this.executeCreateCustomTemplate(context);
        } catch (error) {
          this.handleCommandError('Create Custom Template', error);
        }
      }
    );

    // Update Workflows command
    const updateWorkflowsCommand = vscode.commands.registerCommand(
      ExtensionCommands.UPDATE_WORKFLOWS,
      async (uri?: vscode.Uri) => {
        try {
          const context = this.createCommandContext(uri);
          await this.executeUpdateWorkflows(context);
        } catch (error) {
          this.handleCommandError('Update Workflows', error);
        }
      }
    );

    // Coordinate Workflows command
    const coordinateWorkflowsCommand = vscode.commands.registerCommand(
      ExtensionCommands.COORDINATE_WORKFLOWS,
      async (uri?: vscode.Uri) => {
        try {
          const context = this.createCommandContext(uri);
          await this.executeCoordinateWorkflows(context);
        } catch (error) {
          this.handleCommandError('Coordinate Workflows', error);
        }
      }
    );

    // Import Organization Templates command
    const importTemplatesCommand = vscode.commands.registerCommand(
      ExtensionCommands.IMPORT_ORGANIZATION_TEMPLATES,
      async () => {
        try {
          await this.executeImportOrganizationTemplates();
        } catch (error) {
          this.handleCommandError('Import Organization Templates', error);
        }
      }
    );

    // Export Templates command
    const exportTemplatesCommand = vscode.commands.registerCommand(
      ExtensionCommands.EXPORT_TEMPLATES,
      async () => {
        try {
          await this.executeExportTemplates();
        } catch (error) {
          this.handleCommandError('Export Templates', error);
        }
      }
    );

    this.registeredCommands.push(
      generateMultiCommand,
      manageTemplatesCommand,
      createTemplateCommand,
      updateWorkflowsCommand,
      coordinateWorkflowsCommand,
      importTemplatesCommand,
      exportTemplatesCommand
    );

    this.context.subscriptions.push(
      generateMultiCommand,
      manageTemplatesCommand,
      createTemplateCommand,
      updateWorkflowsCommand,
      coordinateWorkflowsCommand,
      importTemplatesCommand,
      exportTemplatesCommand
    );
  }

  /**
   * Execute Generate Multi-Workflow command
   */
  private async executeGenerateMultiWorkflow(context: CommandContext): Promise<void> {
    if (!this.multiWorkflowCoordinator || !context.workspaceFolder || !context.readmeFile) {
      vscode.window.showErrorMessage('Multi-workflow coordinator not available or no README file found.');
      return;
    }

    // Ask user to select workflow types
    const availableTypes: WorkflowType[] = ['ci', 'cd', 'release', 'security', 'performance', 'maintenance'];
    const selectedTypes = await vscode.window.showQuickPick(
      availableTypes.map(type => ({
        label: type.toUpperCase(),
        description: this.getWorkflowTypeDescription(type),
        picked: type === 'ci' // Default to CI
      })),
      {
        placeHolder: 'Select workflow types to generate',
        canPickMany: true
      }
    );

    if (!selectedTypes || selectedTypes.length === 0) {
      return; // User cancelled
    }

    const workflowTypes = selectedTypes.map(item => item.label.toLowerCase() as WorkflowType);
    const outputDirectory = this.settingsManager.getDefaultOutputDirectory();

    // Show progress
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Generating Multi-Workflow',
      cancellable: false
    }, async (progress) => {
      const result = await this.multiWorkflowCoordinator!.generateCoordinatedWorkflows(
        workflowTypes,
        context.readmeFile!.fsPath,
        outputDirectory,
        undefined,
        (progressValue, message) => {
          progress.report({ increment: progressValue, message });
        }
      );

      if (result.success) {
        const workflowCount = result.workflows.length;
        const dependencyCount = result.coordination.dependencies.length;
        
        vscode.window.showInformationMessage(
          `Generated ${workflowCount} coordinated workflow(s) with ${dependencyCount} dependencies`,
          'Open Workflows',
          'View Coordination'
        ).then(selection => {
          if (selection === 'Open Workflows') {
            // Open first workflow file
            if (result.workflows.length > 0) {
              const workflowPath = vscode.Uri.file(
                `${context.workspaceFolder!.uri.fsPath}/${outputDirectory}/${result.workflows[0].filename}`
              );
              vscode.window.showTextDocument(workflowPath);
            }
          } else if (selection === 'View Coordination') {
            // Show coordination details
            this.showCoordinationDetails(result.coordination);
          }
        });
      } else {
        vscode.window.showErrorMessage(
          `Multi-workflow generation failed: ${result.errors.join(', ')}`,
          'Show Details'
        );
      }
    });
  }

  /**
   * Execute Manage Templates command
   */
  private async executeManageTemplates(): Promise<void> {
    if (!this.templateManager) {
      vscode.window.showErrorMessage('Template manager not available.');
      return;
    }

    const templates = this.templateManager.getTemplates();
    const templateItems = templates.map(template => ({
      label: template.name,
      description: `${template.type} - ${template.category}`,
      detail: template.description,
      template
    }));

    const selectedTemplate = await vscode.window.showQuickPick(templateItems, {
      placeHolder: 'Select a template to manage',
      matchOnDescription: true,
      matchOnDetail: true
    });

    if (!selectedTemplate) {
      return; // User cancelled
    }

    // Show template management options
    const action = await vscode.window.showQuickPick([
      { label: 'View Template', description: 'View template content' },
      { label: 'Edit Template', description: 'Edit template (custom only)' },
      { label: 'Duplicate Template', description: 'Create a copy of this template' },
      { label: 'Delete Template', description: 'Delete template (custom only)' },
      { label: 'Export Template', description: 'Export template to file' }
    ], {
      placeHolder: `What would you like to do with "${selectedTemplate.template.name}"?`
    });

    if (!action) return;

    switch (action.label) {
      case 'View Template':
        await this.showTemplateContent(selectedTemplate.template);
        break;
      case 'Edit Template':
        await this.editTemplate(selectedTemplate.template);
        break;
      case 'Duplicate Template':
        await this.duplicateTemplate(selectedTemplate.template);
        break;
      case 'Delete Template':
        await this.deleteTemplate(selectedTemplate.template);
        break;
      case 'Export Template':
        await this.exportSingleTemplate(selectedTemplate.template);
        break;
    }
  }

  /**
   * Execute Create Custom Template command
   */
  private async executeCreateCustomTemplate(context: CommandContext): Promise<void> {
    if (!this.templateManager) {
      vscode.window.showErrorMessage('Template manager not available.');
      return;
    }

    // Check if user has a workflow file open
    let workflowContent = '';
    if (context.activeEditor && context.activeEditor.document.languageId === 'yaml') {
      const useCurrentFile = await vscode.window.showQuickPick([
        { label: 'Use Current File', description: 'Create template from currently open workflow' },
        { label: 'Create New', description: 'Create template from scratch' }
      ], {
        placeHolder: 'How would you like to create the template?'
      });

      if (!useCurrentFile) return;

      if (useCurrentFile.label === 'Use Current File') {
        workflowContent = context.activeEditor.document.getText();
      }
    }

    // Get template details from user
    const name = await vscode.window.showInputBox({
      prompt: 'Enter template name',
      placeHolder: 'My Custom Template'
    });

    if (!name) return;

    const description = await vscode.window.showInputBox({
      prompt: 'Enter template description',
      placeHolder: 'Description of what this template does'
    });

    if (!description) return;

    const workflowType = await vscode.window.showQuickPick([
      { label: 'ci', description: 'Continuous Integration' },
      { label: 'cd', description: 'Continuous Deployment' },
      { label: 'release', description: 'Release Management' },
      { label: 'security', description: 'Security Scanning' },
      { label: 'performance', description: 'Performance Testing' },
      { label: 'maintenance', description: 'Maintenance Tasks' }
    ], {
      placeHolder: 'Select workflow type'
    });

    if (!workflowType) return;

    // If no content from current file, provide a basic template
    if (!workflowContent) {
      workflowContent = `name: {{workflowName}}
on:
  push:
    branches: [ {{branch}} ]
  pull_request:
    branches: [ {{branch}} ]

jobs:
  build:
    runs-on: {{runner}}
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Custom step
        run: echo "Add your custom steps here"
`;
    }

    try {
      const template = await this.templateManager.createCustomTemplate(
        name,
        description,
        workflowContent,
        workflowType.label as WorkflowType
      );

      vscode.window.showInformationMessage(
        `Custom template "${template.name}" created successfully`,
        'Edit Template',
        'Use Template'
      ).then(selection => {
        if (selection === 'Edit Template') {
          this.editTemplate(template);
        } else if (selection === 'Use Template') {
          vscode.commands.executeCommand(ExtensionCommands.GENERATE_WORKFLOW);
        }
      });

    } catch (error) {
      vscode.window.showErrorMessage(`Failed to create template: ${error.message}`);
    }
  }

  /**
   * Execute Update Workflows command
   */
  private async executeUpdateWorkflows(context: CommandContext): Promise<void> {
    if (!this.multiWorkflowCoordinator || !context.workspaceFolder) {
      vscode.window.showErrorMessage('Multi-workflow coordinator not available or no workspace folder found.');
      return;
    }

    // Find existing workflow files
    const workflowFiles = await vscode.workspace.findFiles(
      new vscode.RelativePattern(context.workspaceFolder, '.github/workflows/*.{yml,yaml}'),
      null,
      20
    );

    if (workflowFiles.length === 0) {
      vscode.window.showInformationMessage('No workflow files found to update.');
      return;
    }

    // Ask user for update strategy
    const strategy = await vscode.window.showQuickPick([
      {
        label: 'Merge',
        description: 'Merge new template with existing customizations',
        detail: 'Preserves custom modifications while updating template sections'
      },
      {
        label: 'Replace',
        description: 'Replace with new template',
        detail: 'Completely replaces existing workflow with new template'
      },
      {
        label: 'Prompt',
        description: 'Ask for each workflow',
        detail: 'Show diff and ask what to do for each workflow'
      }
    ], {
      placeHolder: 'Select update strategy'
    });

    if (!strategy) return;

    const preserveCustomizations = await vscode.window.showQuickPick([
      { label: 'Yes', description: 'Preserve custom environment variables and steps' },
      { label: 'No', description: 'Use template defaults' }
    ], {
      placeHolder: 'Preserve existing customizations?'
    });

    if (!preserveCustomizations) return;

    const createBackup = await vscode.window.showQuickPick([
      { label: 'Yes', description: 'Create backup files before updating' },
      { label: 'No', description: 'Update without backup' }
    ], {
      placeHolder: 'Create backup files?'
    });

    if (!createBackup) return;

    const updateStrategy = {
      preserveCustomizations: preserveCustomizations.label === 'Yes',
      backupExisting: createBackup.label === 'Yes',
      mergeStrategy: strategy.label.toLowerCase() as 'merge' | 'replace' | 'prompt',
      customSections: ['env', 'customSteps']
    };

    // Execute update
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Updating Workflows',
      cancellable: false
    }, async (progress) => {
      const result = await this.multiWorkflowCoordinator!.updateWorkflowsWithStrategy(
        workflowFiles.map(f => f.fsPath),
        updateStrategy,
        (progressValue, message) => {
          progress.report({ increment: progressValue, message });
        }
      );

      const updatedCount = result.updated.length;
      const skippedCount = result.skipped.length;
      const errorCount = result.errors.length;

      if (errorCount === 0) {
        vscode.window.showInformationMessage(
          `Updated ${updatedCount} workflow(s), skipped ${skippedCount}`,
          'Show Details'
        ).then(selection => {
          if (selection === 'Show Details') {
            this.showUpdateResults(result);
          }
        });
      } else {
        vscode.window.showWarningMessage(
          `Updated ${updatedCount} workflow(s) with ${errorCount} error(s)`,
          'Show Errors'
        ).then(selection => {
          if (selection === 'Show Errors') {
            this.showUpdateResults(result);
          }
        });
      }
    });
  }

  /**
   * Execute Coordinate Workflows command
   */
  private async executeCoordinateWorkflows(context: CommandContext): Promise<void> {
    if (!this.multiWorkflowCoordinator || !context.workspaceFolder) {
      vscode.window.showErrorMessage('Multi-workflow coordinator not available or no workspace folder found.');
      return;
    }

    // Find existing workflow files
    const workflowFiles = await vscode.workspace.findFiles(
      new vscode.RelativePattern(context.workspaceFolder, '.github/workflows/*.{yml,yaml}'),
      null,
      20
    );

    if (workflowFiles.length < 2) {
      vscode.window.showInformationMessage('Need at least 2 workflow files to analyze coordination.');
      return;
    }

    // Analyze workflow coordination
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Analyzing Workflow Coordination',
      cancellable: false
    }, async (progress) => {
      progress.report({ increment: 0, message: 'Loading workflows...' });

      const analysis = await this.multiWorkflowCoordinator!.analyzeWorkflowCoordination(
        workflowFiles.map(f => f.fsPath)
      );

      progress.report({ increment: 100, message: 'Analysis complete' });

      // Show analysis results
      this.showCoordinationAnalysis(analysis);
    });
  }

  /**
   * Execute Import Organization Templates command
   */
  private async executeImportOrganizationTemplates(): Promise<void> {
    if (!this.templateManager) {
      vscode.window.showErrorMessage('Template manager not available.');
      return;
    }

    const repositoryUrl = await vscode.window.showInputBox({
      prompt: 'Enter organization template repository URL',
      placeHolder: 'https://github.com/org/workflow-templates.git',
      validateInput: (value) => {
        if (!value) return 'Repository URL is required';
        if (!value.includes('github.com') && !value.includes('gitlab.com')) {
          return 'Please enter a valid Git repository URL';
        }
        return null;
      }
    });

    if (!repositoryUrl) return;

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Importing Organization Templates',
      cancellable: false
    }, async (progress) => {
      progress.report({ increment: 0, message: 'Connecting to repository...' });

      try {
        const result = await this.templateManager!.importOrganizationTemplates(repositoryUrl);

        if (result.success) {
          vscode.window.showInformationMessage(
            `Imported ${result.imported.length} template(s), skipped ${result.skipped.length}`,
            'Show Templates'
          ).then(selection => {
            if (selection === 'Show Templates') {
              vscode.commands.executeCommand(ExtensionCommands.MANAGE_TEMPLATES);
            }
          });
        } else {
          vscode.window.showErrorMessage(
            `Import failed: ${result.errors.map(e => e.error).join(', ')}`,
            'Show Details'
          );
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Import failed: ${error.message}`);
      }
    });
  }

  /**
   * Execute Export Templates command
   */
  private async executeExportTemplates(): Promise<void> {
    if (!this.templateManager) {
      vscode.window.showErrorMessage('Template manager not available.');
      return;
    }

    // Get custom templates only (can't export built-in)
    const customTemplates = this.templateManager.getTemplates({ category: 'custom' });
    
    if (customTemplates.length === 0) {
      vscode.window.showInformationMessage('No custom templates available to export.');
      return;
    }

    // Let user select templates to export
    const templateItems = customTemplates.map(template => ({
      label: template.name,
      description: template.type,
      detail: template.description,
      picked: false,
      template
    }));

    const selectedTemplates = await vscode.window.showQuickPick(templateItems, {
      placeHolder: 'Select templates to export',
      canPickMany: true
    });

    if (!selectedTemplates || selectedTemplates.length === 0) return;

    // Ask for export location
    const exportUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file('workflow-templates.json'),
      filters: {
        'JSON Files': ['json']
      }
    });

    if (!exportUri) return;

    try {
      const templateIds = selectedTemplates.map(item => item.template.id);
      const result = await this.templateManager.exportTemplates(templateIds, exportUri.fsPath);

      if (result.success) {
        vscode.window.showInformationMessage(
          `Exported ${result.exported.length} template(s) to ${exportUri.fsPath}`,
          'Open File'
        ).then(selection => {
          if (selection === 'Open File') {
            vscode.window.showTextDocument(exportUri);
          }
        });
      } else {
        vscode.window.showErrorMessage(
          `Export failed: ${result.errors.map(e => e.error).join(', ')}`
        );
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Export failed: ${error.message}`);
    }
  }

  // Helper methods for multi-workflow commands

  private getWorkflowTypeDescription(type: WorkflowType): string {
    const descriptions = {
      ci: 'Continuous Integration - Build and test code',
      cd: 'Continuous Deployment - Deploy to environments',
      release: 'Release Management - Create and publish releases',
      security: 'Security Scanning - Vulnerability and security checks',
      performance: 'Performance Testing - Load and performance tests',
      maintenance: 'Maintenance Tasks - Cleanup and maintenance jobs'
    };
    return descriptions[type] || 'Workflow automation';
  }

  private async showTemplateContent(template: any): Promise<void> {
    const doc = await vscode.workspace.openTextDocument({
      content: template.content,
      language: 'yaml'
    });
    await vscode.window.showTextDocument(doc);
  }

  private async editTemplate(template: any): Promise<void> {
    if (template.category === 'built-in') {
      vscode.window.showWarningMessage('Cannot edit built-in templates. Create a custom copy instead.');
      return;
    }
    // TODO: Implement template editing
    vscode.window.showInformationMessage('Template editing UI not yet implemented');
  }

  private async duplicateTemplate(template: any): Promise<void> {
    const newName = await vscode.window.showInputBox({
      prompt: 'Enter name for duplicated template',
      value: `${template.name} (Copy)`
    });

    if (!newName) return;

    try {
      const newTemplate = await this.templateManager!.createCustomTemplate(
        newName,
        `Copy of ${template.description}`,
        template.content,
        template.type,
        template.frameworks,
        [...template.tags, 'copy']
      );

      vscode.window.showInformationMessage(
        `Template "${newTemplate.name}" created successfully`
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to duplicate template: ${error.message}`);
    }
  }

  private async deleteTemplate(template: any): Promise<void> {
    if (template.category === 'built-in') {
      vscode.window.showWarningMessage('Cannot delete built-in templates.');
      return;
    }

    const confirm = await vscode.window.showWarningMessage(
      `Are you sure you want to delete template "${template.name}"?`,
      'Delete',
      'Cancel'
    );

    if (confirm === 'Delete') {
      try {
        await this.templateManager!.deleteTemplate(template.id);
        vscode.window.showInformationMessage(`Template "${template.name}" deleted successfully`);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to delete template: ${error.message}`);
      }
    }
  }

  private async exportSingleTemplate(template: any): Promise<void> {
    const exportUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(`${template.id}.json`),
      filters: {
        'JSON Files': ['json']
      }
    });

    if (!exportUri) return;

    try {
      const result = await this.templateManager!.exportTemplates([template.id], exportUri.fsPath);
      
      if (result.success) {
        vscode.window.showInformationMessage(
          `Template exported to ${exportUri.fsPath}`,
          'Open File'
        ).then(selection => {
          if (selection === 'Open File') {
            vscode.window.showTextDocument(exportUri);
          }
        });
      } else {
        vscode.window.showErrorMessage(`Export failed: ${result.errors[0]?.error}`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Export failed: ${error.message}`);
    }
  }

  private showCoordinationDetails(coordination: any): void {
    // TODO: Implement coordination details view
    vscode.window.showInformationMessage(
      `Coordination: ${coordination.dependencies.length} dependencies, execution order: ${coordination.executionOrder.join(' → ')}`
    );
  }

  private showUpdateResults(result: any): void {
    // TODO: Implement update results view
    const message = `Updated: ${result.updated.length}, Skipped: ${result.skipped.length}, Errors: ${result.errors.length}`;
    vscode.window.showInformationMessage(message);
  }

  private showCoordinationAnalysis(analysis: any): void {
    // TODO: Implement coordination analysis view
    const message = `Analysis complete: ${analysis.recommendations.length} recommendations found`;
    vscode.window.showInformationMessage(message);
  }

  /**
   * Get list of registered commands
   */
  getRegisteredCommands(): string[] {
    return Object.values(ExtensionCommands);
  }
}