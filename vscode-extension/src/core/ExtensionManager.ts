import * as vscode from 'vscode';
import { CommandManager } from './CommandManager';
import { WorkspaceManager } from './WorkspaceManager';
import { SettingsManager } from './SettingsManager';
import { FileWatcherManager } from './FileWatcherManager';
import { CLIIntegration } from './CLIIntegration';

/**
 * Main extension manager that coordinates all extension components
 * Handles activation, deactivation, and lifecycle management
 */
export class ExtensionManager {
  private commandManager: CommandManager;
  private workspaceManager: WorkspaceManager;
  private settingsManager: SettingsManager;
  private fileWatcherManager: FileWatcherManager;
  private cliIntegration: CLIIntegration;
  private isActivated: boolean = false;

  constructor(private context: vscode.ExtensionContext) {
    // Initialize managers
    this.settingsManager = new SettingsManager(context);
    this.workspaceManager = new WorkspaceManager(context, this.settingsManager);
    this.cliIntegration = new CLIIntegration({
      enableLogging: true,
      timeout: 60000,
      workingDirectory: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
    });
    this.commandManager = new CommandManager(context, this.workspaceManager, this.settingsManager);
    this.fileWatcherManager = new FileWatcherManager(context, this.workspaceManager);
  }

  /**
   * Activate the extension and all its components
   */
  async activate(): Promise<void> {
    if (this.isActivated) {
      console.warn('Extension is already activated');
      return;
    }

    try {
      console.log('Initializing extension components...');

      // Initialize settings first
      await this.settingsManager.initialize();

      // Initialize workspace detection
      await this.workspaceManager.initialize();

      // Register commands
      await this.commandManager.initialize();

      // Setup file watchers
      await this.fileWatcherManager.initialize();

      // Mark as activated
      this.isActivated = true;

      // Show activation status
      const workspaceFolders = this.workspaceManager.getWorkspaceFolders();
      const readmeFiles = this.workspaceManager.getReadmeFiles();
      
      console.log(`Extension activated with ${workspaceFolders.length} workspace folders and ${readmeFiles.length} README files`);
      
      // Show status bar message if README files are found
      if (readmeFiles.length > 0) {
        vscode.window.setStatusBarMessage(
          `$(gear) README to CI/CD: ${readmeFiles.length} README file(s) detected`,
          3000
        );
      }

    } catch (error) {
      console.error('Failed to activate extension components:', error);
      throw new Error(`Extension activation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deactivate the extension and cleanup resources
   */
  async deactivate(): Promise<void> {
    if (!this.isActivated) {
      return;
    }

    try {
      console.log('Deactivating extension components...');

      // Cleanup in reverse order
      await this.fileWatcherManager.dispose();
      await this.commandManager.dispose();
      this.cliIntegration.dispose();
      await this.workspaceManager.dispose();
      await this.settingsManager.dispose();

      this.isActivated = false;
      console.log('Extension components deactivated successfully');

    } catch (error) {
      console.error('Error during extension deactivation:', error);
      // Don't throw during deactivation to avoid blocking VS Code shutdown
    }
  }

  /**
   * Get the extension context
   */
  getContext(): vscode.ExtensionContext {
    return this.context;
  }

  /**
   * Check if the extension is activated
   */
  isExtensionActivated(): boolean {
    return this.isActivated;
  }

  /**
   * Get the workspace manager
   */
  getWorkspaceManager(): WorkspaceManager {
    return this.workspaceManager;
  }

  /**
   * Get the settings manager
   */
  getSettingsManager(): SettingsManager {
    return this.settingsManager;
  }

  /**
   * Get the command manager
   */
  getCommandManager(): CommandManager {
    return this.commandManager;
  }

  /**
   * Get the file watcher manager
   */
  getFileWatcherManager(): FileWatcherManager {
    return this.fileWatcherManager;
  }

  /**
   * Get the CLI integration service
   */
  getCLIIntegration(): CLIIntegration {
    return this.cliIntegration;
  }
}