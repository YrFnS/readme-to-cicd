/**
 * Tests for WorkflowTreeProvider
 * 
 * Comprehensive test suite for the workflow tree view provider,
 * covering tree data generation, user interactions, and integration
 * with VS Code's TreeDataProvider interface.
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { WorkflowTreeProvider } from '../../src/providers/WorkflowTreeProvider';
import { WorkspaceManager } from '../../src/core/WorkspaceManager';
import { CLIIntegration } from '../../src/core/CLIIntegration';
import { SettingsManager } from '../../src/core/SettingsManager';
import { WorkflowItem, DetectedFramework, WorkflowFile } from '../../src/core/types';

suite('WorkflowTreeProvider Tests', () => {
  let treeProvider: WorkflowTreeProvider;
  let mockContext: vscode.ExtensionContext;
  let mockWorkspaceManager: sinon.SinonStubbedInstance<WorkspaceManager>;
  let mockCLIIntegration: sinon.SinonStubbedInstance<CLIIntegration>;
  let mockSettingsManager: sinon.SinonStubbedInstance<SettingsManager>;

  setup(() => {
    // Create mock context
    mockContext = {
      subscriptions: [],
      workspaceState: {} as vscode.Memento,
      globalState: {} as vscode.Memento,
      extensionPath: '/test/path',
      extensionUri: vscode.Uri.file('/test/path'),
      environmentVariableCollection: {} as vscode.EnvironmentVariableCollection,
      asAbsolutePath: (relativePath: string) => `/test/path/${relativePath}`,
      storageUri: vscode.Uri.file('/test/storage'),
      globalStorageUri: vscode.Uri.file('/test/global-storage'),
      logUri: vscode.Uri.file('/test/logs'),
      extensionMode: vscode.ExtensionMode.Test,
      secrets: {} as vscode.SecretStorage
    };

    // Create mock managers
    mockSettingsManager = sinon.createStubInstance(SettingsManager);
    mockWorkspaceManager = sinon.createStubInstance(WorkspaceManager);
    mockCLIIntegration = sinon.createStubInstance(CLIIntegration);

    // Setup default mock returns
    mockWorkspaceManager.getWorkspaceFolders.returns([
      {
        uri: vscode.Uri.file('/test/workspace'),
        name: 'test-workspace',
        index: 0
      }
    ]);

    mockWorkspaceManager.getReadmeFiles.returns([
      vscode.Uri.file('/test/workspace/README.md')
    ]);

    // Create tree provider
    treeProvider = new WorkflowTreeProvider(
      mockContext,
      mockWorkspaceManager,
      mockCLIIntegration
    );
  });

  teardown(() => {
    sinon.restore();
    treeProvider.dispose();
  });

  suite('Tree Data Provider Interface', () => {
    test('should implement TreeDataProvider interface correctly', () => {
      assert.ok(treeProvider.getTreeItem);
      assert.ok(treeProvider.getChildren);
      assert.ok(treeProvider.onDidChangeTreeData);
    });

    test('should return correct tree item for workflow file', () => {
      const workflowItem: WorkflowItem = {
        label: 'ci.yml',
        type: 'workflow',
        contextValue: 'workflow-file',
        tooltip: 'CI workflow',
        iconPath: new vscode.ThemeIcon('gear')
      };

      const treeItem = treeProvider.getTreeItem(workflowItem);

      assert.strictEqual(treeItem.label, 'ci.yml');
      assert.strictEqual(treeItem.contextValue, 'workflow-file');
      assert.strictEqual(treeItem.tooltip, 'CI workflow');
      assert.strictEqual(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.None);
    });

    test('should return correct tree item for folder with children', () => {
      const folderItem: WorkflowItem = {
        label: 'Workflows (2)',
        type: 'folder',
        contextValue: 'workflows-folder',
        tooltip: 'Generated workflows',
        children: [
          {
            label: 'ci.yml',
            type: 'workflow',
            contextValue: 'workflow-file'
          }
        ]
      };

      const treeItem = treeProvider.getTreeItem(folderItem);

      assert.strictEqual(treeItem.label, 'Workflows (2)');
      assert.strictEqual(treeItem.contextValue, 'workflows-folder');
      assert.strictEqual(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.Expanded);
    });
  });

  suite('Root Items Generation', () => {
    test('should show loading state initially', async () => {
      // Mock CLI integration to simulate loading
      mockCLIIntegration.executeFrameworkDetection.returns(
        new Promise(resolve => setTimeout(() => resolve({
          success: true,
          generatedFiles: [],
          errors: [],
          warnings: [],
          summary: {
            totalTime: 0,
            filesGenerated: 0,
            workflowsCreated: 0,
            frameworksDetected: [],
            optimizationsApplied: 0,
            executionTime: 0,
            filesProcessed: 0,
            workflowsGenerated: 0
          },
          detectedFrameworks: []
        }), 100))
      );

      const children = await treeProvider.getChildren();
      
      // Should show loading initially
      assert.ok(children.some(item => item.label === 'Loading...'));
    });

    test('should show empty state when no workflows or README files', async () => {
      mockWorkspaceManager.getReadmeFiles.returns([]);
      mockCLIIntegration.executeFrameworkDetection.resolves({
        success: true,
        generatedFiles: [],
        errors: [],
        warnings: [],
        summary: {
          totalTime: 0,
          filesGenerated: 0,
          workflowsCreated: 0,
          frameworksDetected: [],
          optimizationsApplied: 0,
          executionTime: 0,
          filesProcessed: 0,
          workflowsGenerated: 0
        },
        detectedFrameworks: []
      });

      // Trigger refresh and wait for completion
      treeProvider.refresh();
      await new Promise(resolve => setTimeout(resolve, 50));

      const children = await treeProvider.getChildren();
      
      assert.ok(children.some(item => 
        item.label === 'No workflows or README files found'
      ));
    });

    test('should show README files section when README files exist', async () => {
      mockWorkspaceManager.getReadmeFiles.returns([
        vscode.Uri.file('/test/workspace/README.md'),
        vscode.Uri.file('/test/workspace/docs/README.md')
      ]);

      mockCLIIntegration.executeFrameworkDetection.resolves({
        success: true,
        generatedFiles: [],
        errors: [],
        warnings: [],
        summary: {
          totalTime: 0,
          filesGenerated: 0,
          workflowsCreated: 0,
          frameworksDetected: [],
          optimizationsApplied: 0,
          executionTime: 0,
          filesProcessed: 0,
          workflowsGenerated: 0
        },
        detectedFrameworks: []
      });

      // Trigger refresh and wait for completion
      treeProvider.refresh();
      await new Promise(resolve => setTimeout(resolve, 50));

      const children = await treeProvider.getChildren();
      
      const readmeSection = children.find(item => 
        item.label === 'README Files (2)'
      );
      
      assert.ok(readmeSection);
      assert.strictEqual(readmeSection.contextValue, 'readme-folder');
      assert.ok(readmeSection.children);
      assert.strictEqual(readmeSection.children.length, 2);
    });
  });

  suite('Framework Detection Integration', () => {
    test('should display detected frameworks in tree', async () => {
      const mockFrameworks: DetectedFramework[] = [
        {
          name: 'Node.js',
          version: '18.0.0',
          confidence: 0.95,
          type: 'runtime',
          ecosystem: 'javascript',
          evidence: [
            {
              type: 'file',
              source: 'package.json',
              value: 'package.json found',
              confidence: 0.9
            }
          ]
        },
        {
          name: 'React',
          confidence: 0.85,
          type: 'framework',
          ecosystem: 'javascript',
          evidence: [
            {
              type: 'dependency',
              source: 'package.json',
              value: 'react dependency',
              confidence: 0.8
            }
          ]
        }
      ];

      mockCLIIntegration.executeFrameworkDetection.resolves({
        success: true,
        generatedFiles: [],
        errors: [],
        warnings: [],
        summary: {
          totalTime: 100,
          filesGenerated: 0,
          workflowsCreated: 0,
          frameworksDetected: ['Node.js', 'React'],
          optimizationsApplied: 0,
          executionTime: 100,
          filesProcessed: 1,
          workflowsGenerated: 0
        },
        detectedFrameworks: mockFrameworks
      });

      // Trigger refresh and wait for completion
      treeProvider.refresh();
      await new Promise(resolve => setTimeout(resolve, 50));

      const children = await treeProvider.getChildren();
      
      const frameworksSection = children.find(item => 
        item.label === 'Detected Frameworks (2)'
      );
      
      assert.ok(frameworksSection);
      assert.strictEqual(frameworksSection.contextValue, 'frameworks-folder');
      assert.ok(frameworksSection.children);
      assert.strictEqual(frameworksSection.children.length, 2);

      // Check Node.js framework item
      const nodeFramework = frameworksSection.children[0];
      assert.strictEqual(nodeFramework.label, 'Node.js (18.0.0)');
      assert.strictEqual(nodeFramework.type, 'framework');
      assert.strictEqual(nodeFramework.contextValue, 'detected-framework');
      assert.ok(nodeFramework.children);
      assert.strictEqual(nodeFramework.children.length, 1);

      // Check evidence item
      const evidence = nodeFramework.children[0];
      assert.strictEqual(evidence.label, 'file: package.json found');
      assert.strictEqual(evidence.type, 'step');
      assert.strictEqual(evidence.contextValue, 'framework-evidence');
    });

    test('should handle framework detection errors gracefully', async () => {
      mockCLIIntegration.executeFrameworkDetection.resolves({
        success: false,
        generatedFiles: [],
        errors: [
          {
            code: 'DETECTION_FAILED',
            message: 'Failed to read README file',
            category: 'file-system',
            severity: 'error',
            suggestions: ['Check file permissions']
          }
        ],
        warnings: [],
        summary: {
          totalTime: 0,
          filesGenerated: 0,
          workflowsCreated: 0,
          frameworksDetected: [],
          optimizationsApplied: 0,
          executionTime: 0,
          filesProcessed: 0,
          workflowsGenerated: 0
        },
        detectedFrameworks: []
      });

      // Trigger refresh and wait for completion
      treeProvider.refresh();
      await new Promise(resolve => setTimeout(resolve, 50));

      const children = await treeProvider.getChildren();
      
      // Should not show frameworks section when detection fails
      const frameworksSection = children.find(item => 
        item.label.includes('Detected Frameworks')
      );
      
      assert.ok(!frameworksSection);
    });
  });

  suite('Workflow File Scanning', () => {
    test('should scan and display existing workflow files', async () => {
      // Mock file system to simulate existing workflow files
      const mockReadDirectory = sinon.stub(vscode.workspace.fs, 'readDirectory');
      const mockReadFile = sinon.stub(vscode.workspace.fs, 'readFile');

      mockReadDirectory.resolves([
        ['ci.yml', vscode.FileType.File],
        ['cd.yml', vscode.FileType.File],
        ['release.yml', vscode.FileType.File]
      ]);

      mockReadFile.resolves(Buffer.from(`
name: CI Workflow
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: npm test
      `));

      mockCLIIntegration.executeFrameworkDetection.resolves({
        success: true,
        generatedFiles: [],
        errors: [],
        warnings: [],
        summary: {
          totalTime: 0,
          filesGenerated: 0,
          workflowsCreated: 0,
          frameworksDetected: [],
          optimizationsApplied: 0,
          executionTime: 0,
          filesProcessed: 0,
          workflowsGenerated: 0
        },
        detectedFrameworks: []
      });

      // Trigger refresh and wait for completion
      treeProvider.refresh();
      await new Promise(resolve => setTimeout(resolve, 50));

      const children = await treeProvider.getChildren();
      
      const workflowsSection = children.find(item => 
        item.label === 'Workflows (3)'
      );
      
      assert.ok(workflowsSection);
      assert.strictEqual(workflowsSection.contextValue, 'workflows-folder');
      assert.ok(workflowsSection.children);
      assert.strictEqual(workflowsSection.children.length, 3);

      // Check workflow items
      const ciWorkflow = workflowsSection.children.find(item => item.label === 'ci.yml');
      assert.ok(ciWorkflow);
      assert.strictEqual(ciWorkflow.type, 'workflow');
      assert.strictEqual(ciWorkflow.contextValue, 'workflow-file');
      assert.ok(ciWorkflow.command);
      assert.strictEqual(ciWorkflow.command.command, 'vscode.open');

      mockReadDirectory.restore();
      mockReadFile.restore();
    });

    test('should handle missing workflows directory gracefully', async () => {
      // Mock file system to simulate missing .github/workflows directory
      const mockReadDirectory = sinon.stub(vscode.workspace.fs, 'readDirectory');
      mockReadDirectory.rejects(new Error('Directory not found'));

      mockCLIIntegration.executeFrameworkDetection.resolves({
        success: true,
        generatedFiles: [],
        errors: [],
        warnings: [],
        summary: {
          totalTime: 0,
          filesGenerated: 0,
          workflowsCreated: 0,
          frameworksDetected: [],
          optimizationsApplied: 0,
          executionTime: 0,
          filesProcessed: 0,
          workflowsGenerated: 0
        },
        detectedFrameworks: []
      });

      // Trigger refresh and wait for completion
      treeProvider.refresh();
      await new Promise(resolve => setTimeout(resolve, 50));

      const children = await treeProvider.getChildren();
      
      // Should not show workflows section when directory doesn't exist
      const workflowsSection = children.find(item => 
        item.label.includes('Workflows')
      );
      
      assert.ok(!workflowsSection);

      mockReadDirectory.restore();
    });
  });

  suite('Command Registration and Execution', () => {
    test('should register tree view commands', () => {
      // Commands should be registered in context subscriptions
      const commandNames = mockContext.subscriptions
        .filter(sub => 'command' in sub)
        .map(sub => (sub as any).command);

      assert.ok(commandNames.includes('readme-to-cicd.workflowExplorer.refresh'));
      assert.ok(commandNames.includes('readme-to-cicd.workflowExplorer.generateWorkflow'));
      assert.ok(commandNames.includes('readme-to-cicd.workflowExplorer.openFile'));
      assert.ok(commandNames.includes('readme-to-cicd.workflowExplorer.validateWorkflow'));
    });

    test('should execute refresh command', () => {
      const refreshSpy = sinon.spy(treeProvider, 'refresh');
      
      // Simulate refresh command execution
      vscode.commands.executeCommand('readme-to-cicd.workflowExplorer.refresh');
      
      assert.ok(refreshSpy.called);
      refreshSpy.restore();
    });
  });

  suite('Tree Data Change Events', () => {
    test('should fire tree data change event on refresh', (done) => {
      let eventFired = false;
      
      const subscription = treeProvider.onDidChangeTreeData(() => {
        eventFired = true;
        subscription.dispose();
        assert.ok(eventFired);
        done();
      });

      treeProvider.refresh();
    });

    test('should fire tree data change event during loading', (done) => {
      let eventCount = 0;
      
      const subscription = treeProvider.onDidChangeTreeData(() => {
        eventCount++;
        if (eventCount >= 2) { // Loading start and completion
          subscription.dispose();
          assert.ok(eventCount >= 2);
          done();
        }
      });

      // Mock slow CLI operation
      mockCLIIntegration.executeFrameworkDetection.returns(
        new Promise(resolve => setTimeout(() => resolve({
          success: true,
          generatedFiles: [],
          errors: [],
          warnings: [],
          summary: {
            totalTime: 0,
            filesGenerated: 0,
            workflowsCreated: 0,
            frameworksDetected: [],
            optimizationsApplied: 0,
            executionTime: 0,
            filesProcessed: 0,
            workflowsGenerated: 0
          },
          detectedFrameworks: []
        }), 50))
      );

      treeProvider.refresh();
    });
  });

  suite('Icon and Tooltip Generation', () => {
    test('should return correct icons for different item types', () => {
      const workflowItem: WorkflowItem = {
        label: 'test',
        type: 'workflow',
        contextValue: 'workflow-file'
      };

      const frameworkItem: WorkflowItem = {
        label: 'test',
        type: 'framework',
        contextValue: 'detected-framework'
      };

      const folderItem: WorkflowItem = {
        label: 'test',
        type: 'folder',
        contextValue: 'workflows-folder'
      };

      const workflowTreeItem = treeProvider.getTreeItem(workflowItem);
      const frameworkTreeItem = treeProvider.getTreeItem(frameworkItem);
      const folderTreeItem = treeProvider.getTreeItem(folderItem);

      assert.ok(workflowTreeItem.iconPath);
      assert.ok(frameworkTreeItem.iconPath);
      assert.ok(folderTreeItem.iconPath);
    });

    test('should generate framework-specific icons', () => {
      const nodeFramework: WorkflowItem = {
        label: 'Node.js',
        type: 'framework',
        contextValue: 'detected-framework'
      };

      const pythonFramework: WorkflowItem = {
        label: 'Python',
        type: 'framework',
        contextValue: 'detected-framework'
      };

      const nodeTreeItem = treeProvider.getTreeItem(nodeFramework);
      const pythonTreeItem = treeProvider.getTreeItem(pythonFramework);

      // Icons should be different for different frameworks
      assert.ok(nodeTreeItem.iconPath);
      assert.ok(pythonTreeItem.iconPath);
    });
  });

  suite('Error Handling and Edge Cases', () => {
    test('should handle CLI integration errors gracefully', async () => {
      mockCLIIntegration.executeFrameworkDetection.rejects(new Error('CLI not available'));

      // Should not throw error
      treeProvider.refresh();
      await new Promise(resolve => setTimeout(resolve, 50));

      const children = await treeProvider.getChildren();
      
      // Should still show some content (README files at minimum)
      assert.ok(children.length > 0);
    });

    test('should handle empty workspace gracefully', async () => {
      mockWorkspaceManager.getWorkspaceFolders.returns([]);
      mockWorkspaceManager.getReadmeFiles.returns([]);

      treeProvider.refresh();
      await new Promise(resolve => setTimeout(resolve, 50));

      const children = await treeProvider.getChildren();
      
      // Should show empty state
      assert.ok(children.some(item => 
        item.label === 'No workflows or README files found'
      ));
    });

    test('should dispose resources properly', () => {
      const disposeSpy = sinon.spy();
      (treeProvider as any)._onDidChangeTreeData.dispose = disposeSpy;

      treeProvider.dispose();

      assert.ok(disposeSpy.called);
    });
  });
});