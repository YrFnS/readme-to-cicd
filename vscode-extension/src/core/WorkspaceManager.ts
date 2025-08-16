import * as vscode from 'vscode';
import * as path from 'path';
import { SettingsManager } from './SettingsManager';

/**
 * Interface for README file information
 */
export interface ReadmeFileInfo {
  uri: vscode.Uri;
  workspaceFolder: vscode.WorkspaceFolder;
  relativePath: string;
  exists: boolean;
}

/**
 * Manages workspace folders and README file discovery
 */
export class WorkspaceManager {
  private workspaceFolders: vscode.WorkspaceFolder[] = [];
  private readmeFiles: ReadmeFileInfo[] = [];
  private workspaceChangeListener: vscode.Disposable | undefined;

  constructor(
    private context: vscode.ExtensionContext,
    _settingsManager: SettingsManager
  ) {}

  /**
   * Initialize workspace detection and README discovery
   */
  async initialize(): Promise<void> {
    console.log('Initializing workspace manager...');

    // Discover initial workspace folders
    await this.discoverWorkspaceFolders();

    // Discover README files in all workspace folders
    await this.discoverReadmeFiles();

    // Setup workspace change listener
    this.setupWorkspaceChangeListener();

    console.log(`Workspace manager initialized with ${this.workspaceFolders.length} folders and ${this.readmeFiles.length} README files`);
  }

  /**
   * Dispose of resources
   */
  async dispose(): Promise<void> {
    if (this.workspaceChangeListener) {
      this.workspaceChangeListener.dispose();
      this.workspaceChangeListener = undefined;
    }
  }

  /**
   * Discover all workspace folders
   */
  private async discoverWorkspaceFolders(): Promise<void> {
    this.workspaceFolders = [...(vscode.workspace.workspaceFolders || [])];
    
    if (this.workspaceFolders.length === 0) {
      console.log('No workspace folders found');
    } else {
      console.log(`Found ${this.workspaceFolders.length} workspace folders:`);
      this.workspaceFolders.forEach(folder => {
        console.log(`  - ${folder.name}: ${folder.uri.fsPath}`);
      });
    }
  }

  /**
   * Discover README files in all workspace folders
   */
  private async discoverReadmeFiles(): Promise<void> {
    this.readmeFiles = [];

    for (const workspaceFolder of this.workspaceFolders) {
      try {
        const readmeFiles = await this.findReadmeFilesInFolder(workspaceFolder);
        this.readmeFiles.push(...readmeFiles);
      } catch (error) {
        console.error(`Error discovering README files in ${workspaceFolder.name}:`, error);
      }
    }

    console.log(`Discovered ${this.readmeFiles.length} README files`);
    this.readmeFiles.forEach(readme => {
      console.log(`  - ${readme.relativePath} (${readme.exists ? 'exists' : 'missing'})`);
    });
  }

  /**
   * Find README files in a specific workspace folder
   */
  private async findReadmeFilesInFolder(workspaceFolder: vscode.WorkspaceFolder): Promise<ReadmeFileInfo[]> {
    const readmeFiles: ReadmeFileInfo[] = [];
    const readmePatterns = ['README.md', 'readme.md', 'Readme.md', 'README.MD'];

    for (const pattern of readmePatterns) {
      try {
        const files = await vscode.workspace.findFiles(
          new vscode.RelativePattern(workspaceFolder, pattern),
          null,
          10 // Limit to 10 files per pattern
        );

        for (const fileUri of files) {
          const relativePath = path.relative(workspaceFolder.uri.fsPath, fileUri.fsPath);
          const exists = await this.checkFileExists(fileUri);

          readmeFiles.push({
            uri: fileUri,
            workspaceFolder,
            relativePath,
            exists
          });
        }
      } catch (error) {
        console.error(`Error searching for ${pattern} in ${workspaceFolder.name}:`, error);
      }
    }

    return readmeFiles;
  }

  /**
   * Check if a file exists
   */
  private async checkFileExists(uri: vscode.Uri): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(uri);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Setup workspace change listener
   */
  private setupWorkspaceChangeListener(): void {
    this.workspaceChangeListener = vscode.workspace.onDidChangeWorkspaceFolders(async (event) => {
      console.log('Workspace folders changed');
      
      // Re-discover workspace folders and README files
      await this.discoverWorkspaceFolders();
      await this.discoverReadmeFiles();

      // Notify about changes
      if (event.added.length > 0) {
        console.log(`Added ${event.added.length} workspace folders`);
      }
      if (event.removed.length > 0) {
        console.log(`Removed ${event.removed.length} workspace folders`);
      }
    });

    this.context.subscriptions.push(this.workspaceChangeListener);
  }

  /**
   * Get all workspace folders
   */
  getWorkspaceFolders(): vscode.WorkspaceFolder[] {
    return [...this.workspaceFolders];
  }

  /**
   * Get all discovered README files
   */
  getReadmeFiles(): ReadmeFileInfo[] {
    return [...this.readmeFiles];
  }

  /**
   * Get README files for a specific workspace folder
   */
  getReadmeFilesForWorkspace(workspaceFolder: vscode.WorkspaceFolder): ReadmeFileInfo[] {
    return this.readmeFiles.filter(readme => readme.workspaceFolder === workspaceFolder);
  }

  /**
   * Get the primary README file for a workspace folder (first one found)
   */
  getPrimaryReadmeFile(workspaceFolder: vscode.WorkspaceFolder): ReadmeFileInfo | undefined {
    const readmeFiles = this.getReadmeFilesForWorkspace(workspaceFolder);
    return readmeFiles.find(readme => readme.exists) || readmeFiles[0];
  }

  /**
   * Check if any workspace has README files
   */
  hasReadmeFiles(): boolean {
    return this.readmeFiles.length > 0;
  }

  /**
   * Check if a specific workspace has README files
   */
  workspaceHasReadmeFiles(workspaceFolder: vscode.WorkspaceFolder): boolean {
    return this.getReadmeFilesForWorkspace(workspaceFolder).length > 0;
  }

  /**
   * Refresh README file discovery
   */
  async refreshReadmeDiscovery(): Promise<void> {
    console.log('Refreshing README file discovery...');
    await this.discoverReadmeFiles();
  }

  /**
   * Get the active workspace folder (from active editor or first folder)
   */
  getActiveWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
    // Try to get workspace folder from active editor
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(activeEditor.document.uri);
      if (workspaceFolder) {
        return workspaceFolder;
      }
    }

    // Fallback to first workspace folder
    return this.workspaceFolders[0];
  }
}