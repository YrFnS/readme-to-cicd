import * as vscode from 'vscode';
import { WorkspaceManager } from './WorkspaceManager';

/**
 * Interface for file change event
 */
export interface FileChangeEvent {
  uri: vscode.Uri;
  type: 'created' | 'changed' | 'deleted';
  timestamp: number;
}

/**
 * Manages file system watchers for README and workflow files
 */
export class FileWatcherManager {
  private readmeWatcher: vscode.FileSystemWatcher | undefined;
  private workflowWatcher: vscode.FileSystemWatcher | undefined;
  private watchers: vscode.FileSystemWatcher[] = [];

  constructor(
    private context: vscode.ExtensionContext,
    private workspaceManager: WorkspaceManager
  ) {}

  /**
   * Initialize file watchers
   */
  async initialize(): Promise<void> {
    console.log('Initializing file watcher manager...');

    // Setup README file watcher
    this.setupReadmeWatcher();

    // Setup workflow file watcher
    this.setupWorkflowWatcher();

    console.log(`File watcher manager initialized with ${this.watchers.length} watchers`);
  }

  /**
   * Dispose of resources
   */
  async dispose(): Promise<void> {
    // Dispose all watchers
    this.watchers.forEach(watcher => watcher.dispose());
    this.watchers = [];

    this.readmeWatcher = undefined;
    this.workflowWatcher = undefined;

    console.log('File watcher manager disposed');
  }

  /**
   * Setup README file watcher
   */
  private setupReadmeWatcher(): void {
    // Watch for README files with various case patterns
    const readmePattern = '**/README.{md,MD,markdown,txt}';
    this.readmeWatcher = vscode.workspace.createFileSystemWatcher(readmePattern);

    // Handle README file creation
    this.readmeWatcher.onDidCreate(async (uri) => {
      console.log(`README file created: ${uri.fsPath}`);
      await this.handleReadmeFileChange({
        uri,
        type: 'created',
        timestamp: Date.now()
      });
    });

    // Handle README file changes
    this.readmeWatcher.onDidChange(async (uri) => {
      console.log(`README file changed: ${uri.fsPath}`);
      await this.handleReadmeFileChange({
        uri,
        type: 'changed',
        timestamp: Date.now()
      });
    });

    // Handle README file deletion
    this.readmeWatcher.onDidDelete(async (uri) => {
      console.log(`README file deleted: ${uri.fsPath}`);
      await this.handleReadmeFileChange({
        uri,
        type: 'deleted',
        timestamp: Date.now()
      });
    });

    this.watchers.push(this.readmeWatcher);
    this.context.subscriptions.push(this.readmeWatcher);
  }

  /**
   * Setup workflow file watcher
   */
  private setupWorkflowWatcher(): void {
    // Watch for GitHub Actions workflow files
    const workflowPattern = '**/.github/workflows/*.{yml,yaml}';
    this.workflowWatcher = vscode.workspace.createFileSystemWatcher(workflowPattern);

    // Handle workflow file creation
    this.workflowWatcher.onDidCreate(async (uri) => {
      console.log(`Workflow file created: ${uri.fsPath}`);
      await this.handleWorkflowFileChange({
        uri,
        type: 'created',
        timestamp: Date.now()
      });
    });

    // Handle workflow file changes
    this.workflowWatcher.onDidChange(async (uri) => {
      console.log(`Workflow file changed: ${uri.fsPath}`);
      await this.handleWorkflowFileChange({
        uri,
        type: 'changed',
        timestamp: Date.now()
      });
    });

    // Handle workflow file deletion
    this.workflowWatcher.onDidDelete(async (uri) => {
      console.log(`Workflow file deleted: ${uri.fsPath}`);
      await this.handleWorkflowFileChange({
        uri,
        type: 'deleted',
        timestamp: Date.now()
      });
    });

    this.watchers.push(this.workflowWatcher);
    this.context.subscriptions.push(this.workflowWatcher);
  }

  /**
   * Handle README file changes
   */
  private async handleReadmeFileChange(event: FileChangeEvent): Promise<void> {
    try {
      // Refresh README discovery when files change
      await this.workspaceManager.refreshReadmeDiscovery();

      // Get workspace folder for the changed file
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(event.uri);
      if (!workspaceFolder) {
        return;
      }

      // Handle different event types
      switch (event.type) {
        case 'created':
          await this.handleReadmeCreated(event, workspaceFolder);
          break;
        case 'changed':
          await this.handleReadmeChanged(event, workspaceFolder);
          break;
        case 'deleted':
          await this.handleReadmeDeleted(event, workspaceFolder);
          break;
      }
    } catch (error) {
      console.error('Error handling README file change:', error);
    }
  }

  /**
   * Handle README file creation
   */
  private async handleReadmeCreated(event: FileChangeEvent, workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
    console.log(`New README file detected in ${workspaceFolder.name}`);
    
    // Show notification
    vscode.window.showInformationMessage(
      `New README file detected in ${workspaceFolder.name}`,
      'Generate Workflow'
    ).then(selection => {
      if (selection === 'Generate Workflow') {
        vscode.commands.executeCommand('readme-to-cicd.generateWorkflow', event.uri);
      }
    });
  }

  /**
   * Handle README file changes
   */
  private async handleReadmeChanged(_event: FileChangeEvent, workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
    console.log(`README file updated in ${workspaceFolder.name}`);

    // TODO: Check if auto-generation is enabled
    // For now, just show a subtle notification
    vscode.window.setStatusBarMessage(
      `$(info) README updated in ${workspaceFolder.name}`,
      3000
    );

    // TODO: Implement auto-generation logic if enabled
    // if (this.settingsManager.isAutoGenerationEnabled()) {
    //   await this.triggerAutoGeneration(event.uri, workspaceFolder);
    // }
  }

  /**
   * Handle README file deletion
   */
  private async handleReadmeDeleted(_event: FileChangeEvent, workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
    console.log(`README file deleted from ${workspaceFolder.name}`);
    
    // Show warning notification
    vscode.window.showWarningMessage(
      `README file deleted from ${workspaceFolder.name}. Workflow generation may not be available.`
    );
  }

  /**
   * Handle workflow file changes
   */
  private async handleWorkflowFileChange(event: FileChangeEvent): Promise<void> {
    try {
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(event.uri);
      if (!workspaceFolder) {
        return;
      }

      // Handle different event types
      switch (event.type) {
        case 'created':
          await this.handleWorkflowCreated(event, workspaceFolder);
          break;
        case 'changed':
          await this.handleWorkflowChanged(event, workspaceFolder);
          break;
        case 'deleted':
          await this.handleWorkflowDeleted(event, workspaceFolder);
          break;
      }
    } catch (error) {
      console.error('Error handling workflow file change:', error);
    }
  }

  /**
   * Handle workflow file creation
   */
  private async handleWorkflowCreated(event: FileChangeEvent, _workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
    console.log(`New workflow file created: ${event.uri.fsPath}`);
    
    // Show success notification
    const fileName = event.uri.fsPath.split('/').pop() || 'workflow';
    vscode.window.showInformationMessage(
      `New workflow created: ${fileName}`,
      'Open File'
    ).then(selection => {
      if (selection === 'Open File') {
        vscode.window.showTextDocument(event.uri);
      }
    });
  }

  /**
   * Handle workflow file changes
   */
  private async handleWorkflowChanged(event: FileChangeEvent, _workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
    console.log(`Workflow file modified: ${event.uri.fsPath}`);

    // TODO: Implement workflow validation on change
    // For now, just log the change
    const fileName = event.uri.fsPath.split('/').pop() || 'workflow';
    vscode.window.setStatusBarMessage(
      `$(check) Workflow updated: ${fileName}`,
      2000
    );
  }

  /**
   * Handle workflow file deletion
   */
  private async handleWorkflowDeleted(event: FileChangeEvent, _workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
    console.log(`Workflow file deleted: ${event.uri.fsPath}`);
    
    const fileName = event.uri.fsPath.split('/').pop() || 'workflow';
    vscode.window.showWarningMessage(`Workflow deleted: ${fileName}`);
  }

  /**
   * Create additional file watcher for custom patterns
   */
  createCustomWatcher(
    pattern: string,
    onCreated?: (uri: vscode.Uri) => void,
    onChanged?: (uri: vscode.Uri) => void,
    onDeleted?: (uri: vscode.Uri) => void
  ): vscode.FileSystemWatcher {
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    if (onCreated) {
      watcher.onDidCreate(onCreated);
    }
    if (onChanged) {
      watcher.onDidChange(onChanged);
    }
    if (onDeleted) {
      watcher.onDidDelete(onDeleted);
    }

    this.watchers.push(watcher);
    this.context.subscriptions.push(watcher);

    return watcher;
  }

  /**
   * Get active watchers count
   */
  getActiveWatchersCount(): number {
    return this.watchers.length;
  }

  /**
   * Check if README watcher is active
   */
  isReadmeWatcherActive(): boolean {
    return this.readmeWatcher !== undefined;
  }

  /**
   * Check if workflow watcher is active
   */
  isWorkflowWatcherActive(): boolean {
    return this.workflowWatcher !== undefined;
  }
}