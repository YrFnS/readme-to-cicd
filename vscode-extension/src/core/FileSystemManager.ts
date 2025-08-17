import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { WorkflowFile, ErrorCategory } from './types';

/**
 * Custom error class for file system operations
 */
export class FileSystemError extends Error {
  constructor(
    message: string,
    public readonly category: ErrorCategory,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'FileSystemError';
  }
}

/**
 * Interface for file conflict information
 */
export interface FileConflict {
  filePath: string;
  existingContent: string;
  newContent: string;
  conflictType: 'overwrite' | 'merge' | 'backup';
}

/**
 * Interface for backup information
 */
export interface BackupInfo {
  originalPath: string;
  backupPath: string;
  timestamp: Date;
}

/**
 * Interface for file watcher configuration
 */
export interface FileWatcherConfig {
  patterns: string[];
  ignoreCreateEvents?: boolean;
  ignoreChangeEvents?: boolean;
  ignoreDeleteEvents?: boolean;
}

/**
 * FileSystemManager handles all file system operations for the VS Code extension
 * including workflow file creation, conflict detection, and file watching
 */
export class FileSystemManager {
  private readonly context: vscode.ExtensionContext;
  private readonly watchers: Map<string, vscode.FileSystemWatcher> = new Map();
  private readonly backups: Map<string, BackupInfo> = new Map();

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Creates a workflow file with proper directory structure
   */
  async createWorkflowFile(
    workspaceFolder: vscode.WorkspaceFolder,
    workflowFile: WorkflowFile
  ): Promise<void> {
    try {
      const workflowsDir = path.join(workspaceFolder.uri.fsPath, '.github', 'workflows');
      const filePath = path.join(workflowsDir, workflowFile.filename);

      // Ensure .github/workflows directory exists
      await this.ensureDirectoryExists(workflowsDir);

      // Check for conflicts
      const conflict = await this.detectFileConflict(filePath, workflowFile.content);
      if (conflict) {
        await this.handleFileConflict(conflict);
      }

      // Write the workflow file
      await fs.writeFile(filePath, workflowFile.content, 'utf8');
      
      // Show success message
      vscode.window.showInformationMessage(
        `Workflow file created: ${workflowFile.filename}`
      );
    } catch (error) {
      throw new FileSystemError(
        `Failed to create workflow file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'file-system',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Read workflow file content
   */
  async readWorkflowFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      throw new FileSystemError(
        `Failed to read workflow file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'file-system',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Write workflow file content
   */
  async writeWorkflowFile(filePath: string, content: string): Promise<void> {
    try {
      // Ensure directory exists
      const directory = path.dirname(filePath);
      await this.ensureDirectoryExists(directory);
      
      await fs.writeFile(filePath, content, 'utf8');
    } catch (error) {
      throw new FileSystemError(
        `Failed to write workflow file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'file-system',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * List workflow files in directory
   */
  async listWorkflowFiles(directory: string): Promise<string[]> {
    try {
      const workflowsDir = path.join(directory, '.github', 'workflows');
      const files = await fs.readdir(workflowsDir);
      return files.filter(file => file.endsWith('.yml') || file.endsWith('.yaml'));
    } catch (error) {
      // Directory might not exist, return empty array
      return [];
    }
  }

  /**
   * Detects conflicts when creating or updating workflow files
   */
  async detectFileConflict(filePath: string, newContent: string): Promise<FileConflict | null> {
    try {
      const existingContent = await fs.readFile(filePath, 'utf8');
      
      if (existingContent === newContent) {
        return null; // No conflict, content is identical
      }

      return {
        filePath,
        existingContent,
        newContent,
        conflictType: 'overwrite' // Default to overwrite, can be changed by user
      };
    } catch (error) {
      // File doesn't exist, no conflict
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Handles file conflicts by showing user options
   */
  async handleFileConflict(conflict: FileConflict): Promise<void> {
    const fileName = path.basename(conflict.filePath);
    const action = await vscode.window.showWarningMessage(
      `Workflow file "${fileName}" already exists. What would you like to do?`,
      'Overwrite',
      'Create Backup',
      'Cancel'
    );

    switch (action) {
      case 'Overwrite':
        // Continue with overwrite
        break;
      case 'Create Backup':
        await this.createBackup(conflict.filePath);
        break;
      case 'Cancel':
        throw new FileSystemError('Operation cancelled by user', 'user-input');
      default:
        throw new FileSystemError('Operation cancelled by user', 'user-input');
    }
  }

  /**
   * Creates a backup of an existing file
   */
  async createBackup(filePath: string): Promise<BackupInfo> {
    try {
      const timestamp = new Date();
      const backupPath = this.generateBackupPath(filePath, timestamp);
      
      await fs.copyFile(filePath, backupPath);
      
      const backupInfo: BackupInfo = {
        originalPath: filePath,
        backupPath,
        timestamp
      };
      
      this.backups.set(filePath, backupInfo);
      
      vscode.window.showInformationMessage(
        `Backup created: ${path.basename(backupPath)}`
      );
      
      return backupInfo;
    } catch (error) {
      throw new FileSystemError(
        `Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'file-system',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Sets up file watchers for README.md and workflow files
   */
  setupFileWatchers(workspaceFolder: vscode.WorkspaceFolder): void {
    const watcherConfigs: Array<{ pattern: string; config: FileWatcherConfig }> = [
      {
        pattern: path.join(workspaceFolder.uri.fsPath, 'README.md'),
        config: { patterns: ['README.md'] }
      },
      {
        pattern: path.join(workspaceFolder.uri.fsPath, '.github/workflows/*.{yml,yaml}'),
        config: { patterns: ['.github/workflows/*.yml', '.github/workflows/*.yaml'] }
      }
    ];

    for (const { pattern, config } of watcherConfigs) {
      this.createFileWatcher(pattern, config);
    }
  }

  /**
   * Creates a file watcher for the specified pattern
   */
  private createFileWatcher(pattern: string, config: FileWatcherConfig): void {
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);
    
    if (!config.ignoreCreateEvents) {
      watcher.onDidCreate(uri => this.handleFileCreate(uri));
    }
    
    if (!config.ignoreChangeEvents) {
      watcher.onDidChange(uri => this.handleFileChange(uri));
    }
    
    if (!config.ignoreDeleteEvents) {
      watcher.onDidDelete(uri => this.handleFileDelete(uri));
    }

    this.watchers.set(pattern, watcher);
    this.context.subscriptions.push(watcher);
  }

  /**
   * Handles file creation events
   */
  private async handleFileCreate(uri: vscode.Uri): Promise<void> {
    const fileName = path.basename(uri.fsPath);
    console.log(`File created: ${fileName}`);
    
    // Trigger workflow regeneration if README.md was created
    if (fileName === 'README.md') {
      vscode.commands.executeCommand('readme-to-cicd.refreshWorkflows');
    }
  }

  /**
   * Handles file change events
   */
  private async handleFileChange(uri: vscode.Uri): Promise<void> {
    const fileName = path.basename(uri.fsPath);
    console.log(`File changed: ${fileName}`);
    
    // Trigger workflow regeneration if README.md was changed
    if (fileName === 'README.md') {
      vscode.commands.executeCommand('readme-to-cicd.refreshWorkflows');
    }
  }

  /**
   * Handles file deletion events
   */
  private async handleFileDelete(uri: vscode.Uri): Promise<void> {
    const fileName = path.basename(uri.fsPath);
    console.log(`File deleted: ${fileName}`);
    
    // Clean up any associated backups
    this.backups.delete(uri.fsPath);
  }

  /**
   * Ensures a directory exists, creating it if necessary
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        await fs.mkdir(dirPath, { recursive: true });
      } else {
        throw error;
      }
    }
  }

  /**
   * Generates a backup file path with timestamp
   */
  private generateBackupPath(originalPath: string, timestamp: Date): string {
    const dir = path.dirname(originalPath);
    const ext = path.extname(originalPath);
    const name = path.basename(originalPath, ext);
    const timestampStr = timestamp.toISOString().replace(/[:.]/g, '-');
    
    return path.join(dir, `${name}.backup.${timestampStr}${ext}`);
  }

  /**
   * Gets all backup information
   */
  getBackups(): Map<string, BackupInfo> {
    return new Map(this.backups);
  }

  /**
   * Cleans up resources when the extension is deactivated
   */
  dispose(): void {
    for (const watcher of this.watchers.values()) {
      watcher.dispose();
    }
    this.watchers.clear();
    this.backups.clear();
  }
}
  