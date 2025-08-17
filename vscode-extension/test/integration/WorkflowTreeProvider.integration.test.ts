/**
 * Integration Tests for WorkflowTreeProvider
 * 
 * Tests the tree provider integration with VS Code APIs
 * and real workspace scenarios.
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { WorkflowTreeProvider } from '../../src/providers/WorkflowTreeProvider';
import { WorkspaceManager } from '../../src/core/WorkspaceManager';
import { CLIIntegration } from '../../src/core/CLIIntegration';
import { SettingsManager } from '../../src/core/SettingsManager';

suite('WorkflowTreeProvider Integration Tests', () => {
  let treeProvider: WorkflowTreeProvider;
  let workspaceManager: WorkspaceManager;
  let cliIntegration: CLIIntegration;
  let settingsManager: SettingsManager;
  let testContext: vscode.ExtensionContext;

  suiteSetup(async () => {
    // Create test context
    testContext = {
      subscriptions: [],
      workspaceState: {} as vscode.Memento,
      globalState: {} as vscode.Memento,
      extensionPath: path.join(__dirname, '..', '..'),
      extensionUri: vscode.Uri.file(path.join(__dirname, '..', '..')),
      environmentVariableCollection: {} as vscode.EnvironmentVariableCollection,
      asAbsolutePath: (relativePath: string) => path.join(__dirname, '..', '..', relativePath),
      storageUri: vscode.Uri.file(path.join(__dirname, '..', '..', 'storage')),
      globalStorageUri: vscode.Uri.file(path.join(__dirname, '..', '..', 'global-storage')),
      logUri: vscode.Uri.file(path.join(__dirname, '..', '..', 'logs')),
      extensionMode: vscode.ExtensionMode.Test,
      secrets: {} as vscode.SecretStorage
    };

    // Initialize managers
    settingsManager = new SettingsManager(testContext);
    workspaceManager = new WorkspaceManager(testContext, settingsManager);
    cliIntegration = new CLIIntegration({
      enableLogging: false,
      timeout: 5000
    });

    await settingsManager.initialize();
    await workspaceManager.initialize();
  });

  suiteTeardown(async () => {
    if (treeProvider) {
      treeProvider.dispose();
    }
    if (workspaceManager) {
      await workspaceManager.dispose();
    }
    if (settingsManager) {
      await settingsManager.dispose();
    }
    if (cliIntegration) {
      cliIntegration.dispose();
    }
  });

  setup(() => {
    treeProvider = new WorkflowTreeProvider(
      testContext,
      workspaceManager,
      cliIntegration
    );
  });

  teardown(() => {
    if (treeProvider) {
      treeProvider.dispose();
    }
  });

  test('should create tree provider without errors', () => {
    assert.ok(treeProvider);
    assert.ok(typeof treeProvider.getTreeItem === 'function');
    assert.ok(typeof treeProvider.getChildren === 'function');
    assert.ok(typeof treeProvider.refresh === 'function');
  });

  test('should implement TreeDataProvider interface', () => {
    // Check that it implements the required interface
    const provider: vscode.TreeDataProvider<any> = treeProvider;
    assert.ok(provider);
    assert.ok(provider.getTreeItem);
    assert.ok(provider.getChildren);
    assert.ok(provider.onDidChangeTreeData);
  });

  test('should handle empty workspace gracefully', async () => {
    // This test runs in the actual VS Code environment
    // so it should handle the real workspace state
    const children = await treeProvider.getChildren();
    
    // Should return an array (even if empty)
    assert.ok(Array.isArray(children));
    
    // Each child should have required properties
    for (const child of children) {
      assert.ok(child.label);
      assert.ok(child.type);
      assert.ok(child.contextValue);
    }
  });

  test('should create valid tree items', async () => {
    const children = await treeProvider.getChildren();
    
    for (const child of children) {
      const treeItem = treeProvider.getTreeItem(child);
      
      // Verify tree item properties
      assert.ok(treeItem.label);
      assert.ok(treeItem.contextValue);
      assert.ok(typeof treeItem.collapsibleState === 'number');
      
      // If it has children, should be collapsible
      if (child.children && child.children.length > 0) {
        assert.notStrictEqual(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.None);
      }
    }
  });

  test('should fire change events on refresh', (done) => {
    let eventFired = false;
    
    const subscription = treeProvider.onDidChangeTreeData(() => {
      eventFired = true;
      subscription.dispose();
      assert.ok(eventFired);
      done();
    });

    // Trigger refresh
    treeProvider.refresh();
  });

  test('should register commands in context', () => {
    // Check that commands were registered
    const subscriptions = testContext.subscriptions;
    assert.ok(subscriptions.length > 0);
    
    // Should have registered tree view commands
    // Note: In real VS Code environment, commands are registered differently
    // This test verifies the subscription mechanism works
  });

  test('should handle CLI integration errors gracefully', async () => {
    // Create a tree provider with a failing CLI integration
    const failingCLI = new CLIIntegration({
      enableLogging: false,
      timeout: 1 // Very short timeout to force failure
    });

    const failingTreeProvider = new WorkflowTreeProvider(
      testContext,
      workspaceManager,
      failingCLI
    );

    try {
      // Should not throw even if CLI fails
      const children = await failingTreeProvider.getChildren();
      assert.ok(Array.isArray(children));
    } finally {
      failingTreeProvider.dispose();
      failingCLI.dispose();
    }
  });

  test('should create tree view successfully', () => {
    // Test that VS Code can create a tree view with our provider
    const treeView = vscode.window.createTreeView('test-tree-view', {
      treeDataProvider: treeProvider,
      showCollapseAll: true
    });

    assert.ok(treeView);
    assert.ok(treeView.visible !== undefined);
    
    // Clean up
    treeView.dispose();
  });
});