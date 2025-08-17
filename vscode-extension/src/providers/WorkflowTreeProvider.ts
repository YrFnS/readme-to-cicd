/**
 * Workflow Tree Provider for VS Code Explorer
 * 
 * Implements VS Code's TreeDataProvider to show workflow files,
 * framework detection results, and provide hierarchical display
 * of CI/CD related information in the explorer view.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { WorkflowItem, DetectedFramework, WorkflowFile } from '../core/types';
import { ReadmeFileInfo } from '../core/WorkspaceManager';
import { WorkspaceManager } from '../core/WorkspaceManager';
import { CLIIntegration } from '../core/CLIIntegration';

export class WorkflowTreeProvider implements vscode.TreeDataProvider<WorkflowItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<WorkflowItem | undefined | null | void> = new vscode.EventEmitter<WorkflowItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<WorkflowItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private workflowFiles: WorkflowFile[] = [];
  private detectedFrameworks: DetectedFramework[] = [];
  private isLoading: boolean = false;

  constructor(
    private context: vscode.ExtensionContext,
    private workspaceManager: WorkspaceManager,
    private cliIntegration: CLIIntegration
  ) {
    // Register refresh command
    this.registerCommands();
    
    // Initial load
    this.refresh();
  }

  /**
   * Get tree item representation for VS Code
   */
  getTreeItem(element: WorkflowItem): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(element.label, element.children ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);
    
    treeItem.tooltip = element.tooltip || element.label;
    treeItem.contextValue = element.contextValue;
    treeItem.command = element.command;
    treeItem.resourceUri = element.resourceUri;
    
    // Set icons based on item type
    if (element.iconPath) {
      treeItem.iconPath = element.iconPath;
    } else {
      treeItem.iconPath = this.getIconForItemType(element.type);
    }

    return treeItem;
  }

  /**
   * Get children for tree item
   */
  async getChildren(element?: WorkflowItem): Promise<WorkflowItem[]> {
    if (!element) {
      // Root level items
      return this.getRootItems();
    }

    // Return children if they exist
    return element.children || [];
  }

  /**
   * Refresh the tree view
   */
  refresh(): void {
    this.loadWorkflowData();
    this._onDidChangeTreeData.fire();
  }

  /**
   * Get root level items for the tree
   */
  private async getRootItems(): Promise<WorkflowItem[]> {
    const items: WorkflowItem[] = [];

    if (this.isLoading) {
      items.push({
        label: 'Loading...',
        type: 'folder',
        contextValue: 'loading',
        tooltip: 'Loading workflow information',
        iconPath: new vscode.ThemeIcon('loading~spin')
      });
      return items;
    }

    // Add workflow files section
    if (this.workflowFiles.length > 0) {
      items.push({
        label: `Workflows (${this.workflowFiles.length})`,
        type: 'folder',
        contextValue: 'workflows-folder',
        tooltip: 'Generated and existing workflow files',
        iconPath: new vscode.ThemeIcon('file-code'),
        children: this.getWorkflowItems()
      });
    }

    // Add detected frameworks section
    if (this.detectedFrameworks.length > 0) {
      items.push({
        label: `Detected Frameworks (${this.detectedFrameworks.length})`,
        type: 'folder',
        contextValue: 'frameworks-folder',
        tooltip: 'Frameworks detected in the project',
        iconPath: new vscode.ThemeIcon('package'),
        children: this.getFrameworkItems()
      });
    }

    // Add README files section
    const readmeFiles = this.workspaceManager.getReadmeFiles();
    if (readmeFiles.length > 0) {
      items.push({
        label: `README Files (${readmeFiles.length})`,
        type: 'folder',
        contextValue: 'readme-folder',
        tooltip: 'README files available for workflow generation',
        iconPath: new vscode.ThemeIcon('markdown'),
        children: this.getReadmeItems(readmeFiles)
      });
    }

    // Show empty state if no items
    if (items.length === 0) {
      items.push({
        label: 'No workflows or README files found',
        type: 'folder',
        contextValue: 'empty-state',
        tooltip: 'Create a README.md file to get started',
        iconPath: new vscode.ThemeIcon('info')
      });
    }

    return items;
  }

  /**
   * Get workflow file items
   */
  private getWorkflowItems(): WorkflowItem[] {
    return this.workflowFiles.map(workflow => ({
      label: workflow.filename,
      type: 'workflow',
      contextValue: 'workflow-file',
      tooltip: `${workflow.type} workflow - ${workflow.metadata?.description || 'Generated workflow'}`,
      iconPath: new vscode.ThemeIcon('gear'),
      resourceUri: vscode.Uri.file(path.join(
        this.workspaceManager.getWorkspaceFolders()[0]?.uri.fsPath || '',
        workflow.relativePath,
        workflow.filename
      )),
      command: {
        command: 'vscode.open',
        title: 'Open Workflow',
        arguments: [vscode.Uri.file(path.join(
          this.workspaceManager.getWorkspaceFolders()[0]?.uri.fsPath || '',
          workflow.relativePath,
          workflow.filename
        ))]
      }
    }));
  }

  /**
   * Get detected framework items
   */
  private getFrameworkItems(): WorkflowItem[] {
    return this.detectedFrameworks.map(framework => ({
      label: `${framework.name}${framework.version ? ` (${framework.version})` : ''}`,
      type: 'framework',
      contextValue: 'detected-framework',
      tooltip: `${framework.type} framework - Confidence: ${Math.round(framework.confidence * 100)}%`,
      iconPath: this.getFrameworkIcon(framework.name),
      children: framework.evidence.map(evidence => ({
        label: `${evidence.type}: ${evidence.value}`,
        type: 'step',
        contextValue: 'framework-evidence',
        tooltip: `Evidence from ${evidence.source} - Confidence: ${Math.round(evidence.confidence * 100)}%`,
        iconPath: new vscode.ThemeIcon('search')
      }))
    }));
  }

  /**
   * Get README file items
   */
  private getReadmeItems(readmeFiles: ReadmeFileInfo[]): WorkflowItem[] {
    return readmeFiles.map(readme => ({
      label: path.basename(readme.uri.fsPath),
      type: 'workflow',
      contextValue: 'readme-file',
      tooltip: `README file: ${readme.uri.fsPath}`,
      iconPath: new vscode.ThemeIcon('markdown'),
      resourceUri: readme.uri,
      command: {
        command: 'vscode.open',
        title: 'Open README',
        arguments: [readme.uri]
      }
    }));
  }

  /**
   * Load workflow data from CLI integration
   */
  private async loadWorkflowData(): Promise<void> {
    this.isLoading = true;
    this._onDidChangeTreeData.fire();

    try {
      const workspaceFolders = this.workspaceManager.getWorkspaceFolders();
      if (workspaceFolders.length === 0) {
        return;
      }

      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      
      // Scan for existing workflow files
      await this.scanWorkflowFiles(workspaceRoot);
      
      // Detect frameworks from README files
      await this.detectFrameworks(workspaceRoot);

    } catch (error) {
      console.error('Failed to load workflow data:', error);
      vscode.window.showErrorMessage(`Failed to load workflow data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.isLoading = false;
      this._onDidChangeTreeData.fire();
    }
  }

  /**
   * Scan for existing workflow files in the workspace
   */
  private async scanWorkflowFiles(workspaceRoot: string): Promise<void> {
    try {
      const workflowsPath = path.join(workspaceRoot, '.github', 'workflows');
      const workflowFiles: WorkflowFile[] = [];

      // Check if workflows directory exists
      try {
        const files = await vscode.workspace.fs.readDirectory(vscode.Uri.file(workflowsPath));
        
        for (const [filename, fileType] of files) {
          if (fileType === vscode.FileType.File && (filename.endsWith('.yml') || filename.endsWith('.yaml'))) {
            const filePath = path.join(workflowsPath, filename);
            
            try {
              const content = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
              const contentStr = Buffer.from(content).toString('utf8');
              
              workflowFiles.push({
                filename,
                content: contentStr,
                type: this.inferWorkflowType(contentStr),
                relativePath: '.github/workflows',
                metadata: {
                  description: this.extractWorkflowDescription(contentStr),
                  version: '1.0.0',
                  generated: new Date(),
                  frameworks: [],
                  optimizations: []
                }
              });
            } catch (readError) {
              console.warn(`Failed to read workflow file ${filename}:`, readError);
            }
          }
        }
      } catch (dirError) {
        // Workflows directory doesn't exist, which is fine
        console.log('No .github/workflows directory found');
      }

      this.workflowFiles = workflowFiles;
    } catch (error) {
      console.error('Failed to scan workflow files:', error);
      this.workflowFiles = [];
    }
  }

  /**
   * Detect frameworks using CLI integration
   */
  private async detectFrameworks(workspaceRoot: string): Promise<void> {
    try {
      const readmeFiles = this.workspaceManager.getReadmeFiles();
      if (readmeFiles.length === 0) {
        this.detectedFrameworks = [];
        return;
      }

      // Use the first README file for detection
      const readmePath = readmeFiles[0].uri.fsPath;
      
      // Execute framework detection via CLI
      const result = await this.cliIntegration.executeFrameworkDetection({
        readmePath,
        outputDirectory: path.join(workspaceRoot, '.github', 'workflows'),
        dryRun: true
      });

      if (result.success) {
        this.detectedFrameworks = result.detectedFrameworks || [];
      } else {
        console.warn('Framework detection failed:', result.errors);
        this.detectedFrameworks = [];
      }
    } catch (error) {
      console.error('Failed to detect frameworks:', error);
      this.detectedFrameworks = [];
    }
  }

  /**
   * Register tree view commands
   */
  private registerCommands(): void {
    // Refresh command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('readme-to-cicd.workflowExplorer.refresh', () => {
        this.refresh();
      })
    );

    // Generate workflow from tree item
    this.context.subscriptions.push(
      vscode.commands.registerCommand('readme-to-cicd.workflowExplorer.generateWorkflow', (item: WorkflowItem) => {
        if (item.resourceUri) {
          vscode.commands.executeCommand('readme-to-cicd.generateWorkflow', item.resourceUri);
        }
      })
    );

    // Open file command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('readme-to-cicd.workflowExplorer.openFile', (item: WorkflowItem) => {
        if (item.resourceUri) {
          vscode.commands.executeCommand('vscode.open', item.resourceUri);
        }
      })
    );

    // Validate workflow command
    this.context.subscriptions.push(
      vscode.commands.registerCommand('readme-to-cicd.workflowExplorer.validateWorkflow', (item: WorkflowItem) => {
        if (item.resourceUri) {
          vscode.commands.executeCommand('readme-to-cicd.validateWorkflow', item.resourceUri);
        }
      })
    );
  }

  /**
   * Get icon for item type
   */
  private getIconForItemType(type: string): vscode.ThemeIcon {
    switch (type) {
      case 'workflow':
        return new vscode.ThemeIcon('gear');
      case 'framework':
        return new vscode.ThemeIcon('package');
      case 'folder':
        return new vscode.ThemeIcon('folder');
      case 'job':
        return new vscode.ThemeIcon('play');
      case 'step':
        return new vscode.ThemeIcon('chevron-right');
      default:
        return new vscode.ThemeIcon('file');
    }
  }

  /**
   * Get framework-specific icon
   */
  private getFrameworkIcon(frameworkName: string): vscode.ThemeIcon {
    const name = frameworkName.toLowerCase();
    
    if (name.includes('node') || name.includes('npm')) {
      return new vscode.ThemeIcon('symbol-event');
    } else if (name.includes('python') || name.includes('pip')) {
      return new vscode.ThemeIcon('symbol-class');
    } else if (name.includes('java') || name.includes('maven') || name.includes('gradle')) {
      return new vscode.ThemeIcon('symbol-method');
    } else if (name.includes('docker')) {
      return new vscode.ThemeIcon('symbol-container');
    } else if (name.includes('react') || name.includes('vue') || name.includes('angular')) {
      return new vscode.ThemeIcon('symbol-interface');
    }
    
    return new vscode.ThemeIcon('package');
  }

  /**
   * Infer workflow type from content
   */
  private inferWorkflowType(content: string): 'ci' | 'cd' | 'release' | 'security' | 'performance' | 'maintenance' {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('deploy') || lowerContent.includes('release')) {
      return 'cd';
    } else if (lowerContent.includes('security') || lowerContent.includes('scan')) {
      return 'security';
    } else if (lowerContent.includes('performance') || lowerContent.includes('benchmark')) {
      return 'performance';
    } else if (lowerContent.includes('maintenance') || lowerContent.includes('cleanup')) {
      return 'maintenance';
    } else if (lowerContent.includes('release') && lowerContent.includes('tag')) {
      return 'release';
    }
    
    return 'ci';
  }

  /**
   * Extract workflow description from YAML content
   */
  private extractWorkflowDescription(content: string): string {
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('name:')) {
        return trimmed.substring(5).trim().replace(/['"]/g, '');
      }
    }
    
    return 'GitHub Actions Workflow';
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}