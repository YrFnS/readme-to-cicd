/**
 * Basic Extension Tests
 * 
 * Simplified tests focusing on core VSCode extension functionality
 * with proper mocking and minimal dependencies.
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import { setupVSCodeMock, cleanupVSCodeMock, createMockExtensionContext } from '../setup/vscode-mock';

suite('Basic Extension Tests', () => {
  let mockContext: any;
  let sandbox: sinon.SinonSandbox;

  setup(() => {
    sandbox = sinon.createSandbox();
    setupVSCodeMock();
    mockContext = createMockExtensionContext();
  });

  teardown(() => {
    cleanupVSCodeMock();
    sandbox.restore();
  });

  test('Extension context should be properly mocked', () => {
    assert.ok(mockContext, 'Mock context should exist');
    assert.ok(Array.isArray(mockContext.subscriptions), 'Subscriptions should be an array');
    assert.ok(mockContext.workspaceState, 'Workspace state should exist');
    assert.ok(mockContext.globalState, 'Global state should exist');
    assert.strictEqual(typeof mockContext.extensionPath, 'string', 'Extension path should be a string');
  });

  test('VSCode API should be properly mocked', () => {
    const vscode = require('vscode');
    
    assert.ok(vscode.workspace, 'Workspace API should be available');
    assert.ok(vscode.window, 'Window API should be available');
    assert.ok(vscode.commands, 'Commands API should be available');
    assert.ok(vscode.Uri, 'Uri API should be available');
  });

  test('Mock workspace should provide expected functionality', () => {
    const vscode = require('vscode');
    
    // Test configuration
    const config = vscode.workspace.getConfiguration('test');
    assert.ok(config, 'Configuration should be available');
    assert.strictEqual(typeof config.get, 'function', 'Config.get should be a function');
    
    // Test file system watcher
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.md');
    assert.ok(watcher, 'File system watcher should be created');
    assert.strictEqual(typeof watcher.onDidCreate, 'function', 'Watcher should have onDidCreate');
    assert.strictEqual(typeof watcher.dispose, 'function', 'Watcher should have dispose');
  });

  test('Mock window should provide expected functionality', () => {
    const vscode = require('vscode');
    
    // Test message functions
    assert.strictEqual(typeof vscode.window.showInformationMessage, 'function', 'showInformationMessage should be a function');
    assert.strictEqual(typeof vscode.window.showErrorMessage, 'function', 'showErrorMessage should be a function');
    assert.strictEqual(typeof vscode.window.showWarningMessage, 'function', 'showWarningMessage should be a function');
    
    // Test webview creation
    const panel = vscode.window.createWebviewPanel('test', 'Test Panel', 1, {});
    assert.ok(panel, 'Webview panel should be created');
    assert.ok(panel.webview, 'Panel should have webview');
    assert.strictEqual(typeof panel.webview.postMessage, 'function', 'Webview should have postMessage');
  });

  test('Mock commands should provide expected functionality', () => {
    const vscode = require('vscode');
    
    assert.strictEqual(typeof vscode.commands.registerCommand, 'function', 'registerCommand should be a function');
    assert.strictEqual(typeof vscode.commands.executeCommand, 'function', 'executeCommand should be a function');
    
    // Test command registration
    const disposable = vscode.commands.registerCommand('test.command', () => {});
    assert.ok(disposable, 'Command registration should return disposable');
    assert.strictEqual(typeof disposable.dispose, 'function', 'Disposable should have dispose method');
  });

  test('Mock Uri should provide expected functionality', () => {
    const vscode = require('vscode');
    
    const uri = vscode.Uri.file('/test/path');
    assert.ok(uri, 'Uri should be created');
    assert.strictEqual(uri.scheme, 'file', 'Uri should have correct scheme');
    assert.strictEqual(uri.fsPath, '/test/path', 'Uri should have correct fsPath');
    assert.strictEqual(typeof uri.toString, 'function', 'Uri should have toString method');
  });

  test('Extension context state management should work', async () => {
    const testKey = 'test-key';
    const testValue = { data: 'test-data' };
    
    // Test workspace state
    mockContext.workspaceState.get.withArgs(testKey).returns(testValue);
    const workspaceValue = mockContext.workspaceState.get(testKey);
    assert.deepStrictEqual(workspaceValue, testValue, 'Workspace state should return expected value');
    
    // Test global state
    mockContext.globalState.get.withArgs(testKey).returns(testValue);
    const globalValue = mockContext.globalState.get(testKey);
    assert.deepStrictEqual(globalValue, testValue, 'Global state should return expected value');
    
    // Test state updates
    await mockContext.workspaceState.update(testKey, testValue);
    assert.ok(mockContext.workspaceState.update.calledWith(testKey, testValue), 'Workspace state update should be called');
    
    await mockContext.globalState.update(testKey, testValue);
    assert.ok(mockContext.globalState.update.calledWith(testKey, testValue), 'Global state update should be called');
  });

  test('Extension path utilities should work', () => {
    const relativePath = 'resources/icon.png';
    const absolutePath = mockContext.asAbsolutePath(relativePath);
    
    assert.strictEqual(typeof absolutePath, 'string', 'Absolute path should be a string');
    assert.ok(absolutePath.includes(relativePath), 'Absolute path should contain relative path');
  });

  test('Mock progress reporting should work', async () => {
    const vscode = require('vscode');
    
    let progressReported = false;
    const result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        title: 'Test Progress'
      },
      async (progress: any) => {
        progress.report({ message: 'Testing...', increment: 50 });
        progressReported = true;
        return 'completed';
      }
    );
    
    assert.strictEqual(result, 'completed', 'Progress task should return expected result');
    assert.strictEqual(progressReported, true, 'Progress should be reported');
  });

  test('Mock file operations should work', async () => {
    const vscode = require('vscode');
    
    const testUri = vscode.Uri.file('/test/file.txt');
    const testContent = Buffer.from('test content');
    
    // Test file write
    await vscode.workspace.fs.writeFile(testUri, testContent);
    assert.ok(vscode.workspace.fs.writeFile.calledWith(testUri, testContent), 'File write should be called');
    
    // Test file read
    vscode.workspace.fs.readFile.withArgs(testUri).resolves(testContent);
    const readContent = await vscode.workspace.fs.readFile(testUri);
    assert.deepStrictEqual(readContent, testContent, 'File read should return expected content');
  });

  test('Error handling in mocks should work', async () => {
    const vscode = require('vscode');
    
    // Test error message display
    const errorMessage = 'Test error message';
    vscode.window.showErrorMessage.withArgs(errorMessage).resolves('OK');
    
    const result = await vscode.window.showErrorMessage(errorMessage);
    assert.strictEqual(result, 'OK', 'Error message should return expected result');
    assert.ok(vscode.window.showErrorMessage.calledWith(errorMessage), 'Error message should be called with correct message');
  });
});