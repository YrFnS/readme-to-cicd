/**
 * VSCode API Mock Tests
 * 
 * Comprehensive tests for VSCode API mocking functionality to ensure
 * all extension components can be properly tested without VSCode environment.
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import { 
  setupVSCodeMock, 
  cleanupVSCodeMock, 
  createMockExtensionContext,
  createMockWebviewAPI 
} from '../setup/vscode-mock';

suite('VSCode API Mock Tests', () => {
  let sandbox: sinon.SinonSandbox;

  setup(() => {
    sandbox = sinon.createSandbox();
    setupVSCodeMock();
  });

  teardown(() => {
    cleanupVSCodeMock();
    sandbox.restore();
  });

  suite('Workspace API Mock', () => {
    test('should provide workspace folders', () => {
      const vscode = require('vscode');
      
      assert.ok(vscode.workspace.workspaceFolders, 'Workspace folders should exist');
      assert.strictEqual(vscode.workspace.workspaceFolders.length, 1, 'Should have one workspace folder');
      assert.strictEqual(vscode.workspace.workspaceFolders[0].name, 'mock-workspace', 'Should have correct workspace name');
    });

    test('should provide configuration with extension settings', () => {
      const vscode = require('vscode');
      
      const config = vscode.workspace.getConfiguration('readme-to-cicd');
      assert.ok(config, 'Configuration should exist');
      
      // Test default configuration values
      assert.strictEqual(config.get('autoDetect'), true, 'autoDetect should be true');
      assert.strictEqual(config.get('defaultOptimization'), 'standard', 'defaultOptimization should be standard');
      assert.deepStrictEqual(config.get('workflowTypes'), ['ci', 'cd'], 'workflowTypes should be ci and cd');
      assert.strictEqual(config.get('outputDirectory'), '.github/workflows', 'outputDirectory should be .github/workflows');
    });

    test('should find README files', async () => {
      const vscode = require('vscode');
      
      const readmeFiles = await vscode.workspace.findFiles('**/README.{md,txt}');
      assert.ok(Array.isArray(readmeFiles), 'Should return array of files');
      assert.strictEqual(readmeFiles.length, 1, 'Should find one README file');
      assert.ok(readmeFiles[0].fsPath.includes('README.md'), 'Should find README.md file');
    });

    test('should find workflow files', async () => {
      const vscode = require('vscode');
      
      const workflowFiles = await vscode.workspace.findFiles('**/.github/workflows/*.{yml,yaml}');
      assert.ok(Array.isArray(workflowFiles), 'Should return array of files');
      assert.strictEqual(workflowFiles.length, 1, 'Should find one workflow file');
      assert.ok(workflowFiles[0].fsPath.includes('ci.yml'), 'Should find ci.yml file');
    });

    test('should open text documents', async () => {
      const vscode = require('vscode');
      
      const document = await vscode.workspace.openTextDocument();
      assert.ok(document, 'Document should be created');
      assert.strictEqual(document.languageId, 'markdown', 'Should be markdown document');
      assert.ok(document.getText().includes('Mock README'), 'Should contain mock content');
    });

    test('should provide file system operations', async () => {
      const vscode = require('vscode');
      
      const uri = vscode.Uri.file('/test/file.txt');
      const content = Buffer.from('test content');
      
      // Test write
      await vscode.workspace.fs.writeFile(uri, content);
      assert.ok(vscode.workspace.fs.writeFile.calledWith(uri, content), 'writeFile should be called');
      
      // Test read
      const readContent = await vscode.workspace.fs.readFile(uri);
      assert.ok(Buffer.isBuffer(readContent), 'Should return buffer');
      
      // Test stat
      const stat = await vscode.workspace.fs.stat(uri);
      assert.ok(stat, 'Stat should return file info');
      assert.strictEqual(stat.type, 1, 'Should be file type');
    });

    test('should create file system watchers', () => {
      const vscode = require('vscode');
      
      const watcher = vscode.workspace.createFileSystemWatcher('**/*.md');
      assert.ok(watcher, 'Watcher should be created');
      assert.strictEqual(typeof watcher.onDidCreate, 'function', 'Should have onDidCreate');
      assert.strictEqual(typeof watcher.onDidChange, 'function', 'Should have onDidChange');
      assert.strictEqual(typeof watcher.onDidDelete, 'function', 'Should have onDidDelete');
      assert.strictEqual(typeof watcher.dispose, 'function', 'Should have dispose');
    });
  });

  suite('Window API Mock', () => {
    test('should show information messages', async () => {
      const vscode = require('vscode');
      
      const result = await vscode.window.showInformationMessage('Test message', 'Option 1', 'Option 2');
      assert.strictEqual(result, 'Option 1', 'Should return first option');
      
      const simpleResult = await vscode.window.showInformationMessage('Simple message');
      assert.strictEqual(simpleResult, 'OK', 'Should return OK for simple message');
    });

    test('should show quick pick dialogs', async () => {
      const vscode = require('vscode');
      
      const items = ['Item 1', 'Item 2', 'Item 3'];
      const result = await vscode.window.showQuickPick(items);
      assert.strictEqual(result, 'Item 1', 'Should return first item');
      
      const objectItems = [
        { label: 'Option 1', value: 'opt1' },
        { label: 'Option 2', value: 'opt2' }
      ];
      const objectResult = await vscode.window.showQuickPick(objectItems);
      assert.deepStrictEqual(objectResult, objectItems[0], 'Should return first object item');
    });

    test('should show input boxes', async () => {
      const vscode = require('vscode');
      
      const result = await vscode.window.showInputBox({ prompt: 'Enter value' });
      assert.strictEqual(result, 'mock-input', 'Should return mock input');
      
      const resultWithValue = await vscode.window.showInputBox({ value: 'default-value' });
      assert.strictEqual(resultWithValue, 'default-value', 'Should return provided default value');
    });

    test('should create status bar items', () => {
      const vscode = require('vscode');
      
      const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
      assert.ok(statusBarItem, 'Status bar item should be created');
      assert.strictEqual(statusBarItem.alignment, 1, 'Should have correct alignment');
      assert.strictEqual(statusBarItem.priority, 100, 'Should have correct priority');
      assert.strictEqual(typeof statusBarItem.show, 'function', 'Should have show method');
      assert.strictEqual(typeof statusBarItem.hide, 'function', 'Should have hide method');
    });

    test('should create webview panels', () => {
      const vscode = require('vscode');
      
      const panel = vscode.window.createWebviewPanel(
        'testView',
        'Test Panel',
        vscode.ViewColumn.One,
        { enableScripts: true }
      );
      
      assert.ok(panel, 'Panel should be created');
      assert.strictEqual(panel.viewType, 'testView', 'Should have correct view type');
      assert.strictEqual(panel.title, 'Test Panel', 'Should have correct title');
      assert.ok(panel.webview, 'Should have webview');
      assert.strictEqual(typeof panel.webview.postMessage, 'function', 'Webview should have postMessage');
    });

    test('should register tree data providers', () => {
      const vscode = require('vscode');
      
      const mockProvider = {
        getTreeItem: sinon.stub(),
        getChildren: sinon.stub()
      };
      
      const disposable = vscode.window.registerTreeDataProvider('testTree', mockProvider);
      assert.ok(disposable, 'Should return disposable');
      assert.strictEqual(typeof disposable.dispose, 'function', 'Should have dispose method');
    });

    test('should create tree views', () => {
      const vscode = require('vscode');
      
      const mockProvider = {
        getTreeItem: sinon.stub(),
        getChildren: sinon.stub()
      };
      
      const treeView = vscode.window.createTreeView('testTree', {
        treeDataProvider: mockProvider
      });
      
      assert.ok(treeView, 'Tree view should be created');
      assert.strictEqual(typeof treeView.reveal, 'function', 'Should have reveal method');
      assert.strictEqual(typeof treeView.dispose, 'function', 'Should have dispose method');
    });

    test('should handle progress operations', async () => {
      const vscode = require('vscode');
      
      let progressReported = false;
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Test Progress',
          cancellable: true
        },
        async (progress: any, token: any) => {
          progress.report({ message: 'Working...', increment: 50 });
          progressReported = true;
          assert.strictEqual(token.isCancellationRequested, false, 'Should not be cancelled');
          return 'completed';
        }
      );
      
      assert.strictEqual(result, 'completed', 'Should return task result');
      assert.strictEqual(progressReported, true, 'Progress should be reported');
    });

    test('should show text documents', async () => {
      const vscode = require('vscode');
      
      const document = await vscode.workspace.openTextDocument();
      const editor = await vscode.window.showTextDocument(document);
      
      assert.ok(editor, 'Editor should be created');
      assert.ok(editor.document, 'Editor should have document');
      assert.strictEqual(editor.viewColumn, 1, 'Should have correct view column');
    });
  });

  suite('Commands API Mock', () => {
    test('should register commands', () => {
      const vscode = require('vscode');
      
      const commandCallback = sinon.stub();
      const disposable = vscode.commands.registerCommand('test.command', commandCallback);
      
      assert.ok(disposable, 'Should return disposable');
      assert.strictEqual(typeof disposable.dispose, 'function', 'Should have dispose method');
      
      // Verify command is registered
      assert.ok(vscode.commands._registeredCommands.has('test.command'), 'Command should be registered');
    });

    test('should execute registered commands', async () => {
      const vscode = require('vscode');
      
      const commandCallback = sinon.stub().resolves('command result');
      vscode.commands.registerCommand('test.execute', commandCallback);
      
      const result = await vscode.commands.executeCommand('test.execute', 'arg1', 'arg2');
      
      assert.strictEqual(result, 'command result', 'Should return command result');
      assert.ok(commandCallback.calledWith('arg1', 'arg2'), 'Command should be called with arguments');
    });

    test('should execute built-in commands', async () => {
      const vscode = require('vscode');
      
      // Test vscode.open command
      const uri = vscode.Uri.file('/test/file.txt');
      const result = await vscode.commands.executeCommand('vscode.open', uri);
      assert.ok(result, 'vscode.open should return result');
      
      // Test setContext command
      await vscode.commands.executeCommand('setContext', 'testContext', true);
      // Should not throw
    });

    test('should get available commands', async () => {
      const vscode = require('vscode');
      
      const commands = await vscode.commands.getCommands();
      assert.ok(Array.isArray(commands), 'Should return array of commands');
      assert.ok(commands.includes('readme-to-cicd.generate'), 'Should include extension commands');
      assert.ok(commands.includes('vscode.open'), 'Should include built-in commands');
    });

    test('should dispose commands', () => {
      const vscode = require('vscode');
      
      const disposable = vscode.commands.registerCommand('test.dispose', () => {});
      assert.ok(vscode.commands._registeredCommands.has('test.dispose'), 'Command should be registered');
      
      disposable.dispose();
      assert.ok(!vscode.commands._registeredCommands.has('test.dispose'), 'Command should be unregistered');
    });
  });

  suite('Uri API Mock', () => {
    test('should create file URIs', () => {
      const vscode = require('vscode');
      
      const uri = vscode.Uri.file('/test/path/file.txt');
      assert.ok(uri, 'URI should be created');
      assert.strictEqual(uri.scheme, 'file', 'Should have file scheme');
      assert.strictEqual(uri.fsPath, '/test/path/file.txt', 'Should have correct fsPath');
      assert.strictEqual(uri.path, '/test/path/file.txt', 'Should have correct path');
      assert.ok(uri.toString().includes('file://'), 'toString should include file scheme');
    });

    test('should parse URIs', () => {
      const vscode = require('vscode');
      
      const uri = vscode.Uri.parse('https://example.com/path');
      assert.ok(uri, 'URI should be parsed');
      assert.strictEqual(uri.scheme, 'https', 'Should have correct scheme');
      assert.strictEqual(uri.path, '/path', 'Should have correct path');
    });
  });

  suite('Range and Position API Mock', () => {
    test('should create positions', () => {
      const vscode = require('vscode');
      
      const position = new vscode.Position(5, 10);
      assert.ok(position, 'Position should be created');
      assert.strictEqual(position.line, 5, 'Should have correct line');
      assert.strictEqual(position.character, 10, 'Should have correct character');
    });

    test('should create ranges', () => {
      const vscode = require('vscode');
      
      const range = new vscode.Range(1, 2, 3, 4);
      assert.ok(range, 'Range should be created');
      assert.strictEqual(range.start.line, 1, 'Should have correct start line');
      assert.strictEqual(range.start.character, 2, 'Should have correct start character');
      assert.strictEqual(range.end.line, 3, 'Should have correct end line');
      assert.strictEqual(range.end.character, 4, 'Should have correct end character');
    });

    test('should create selections', () => {
      const vscode = require('vscode');
      
      const start = new vscode.Position(1, 2);
      const end = new vscode.Position(3, 4);
      const selection = new vscode.Selection(start, end);
      
      assert.ok(selection, 'Selection should be created');
      assert.deepStrictEqual(selection.start, start, 'Should have correct start');
      assert.deepStrictEqual(selection.end, end, 'Should have correct end');
      assert.deepStrictEqual(selection.anchor, start, 'Should have correct anchor');
      assert.deepStrictEqual(selection.active, end, 'Should have correct active');
    });
  });

  suite('Extension Context Mock', () => {
    test('should provide extension context', () => {
      const context = createMockExtensionContext();
      
      assert.ok(context, 'Context should be created');
      assert.ok(Array.isArray(context.subscriptions), 'Should have subscriptions array');
      assert.ok(context.workspaceState, 'Should have workspace state');
      assert.ok(context.globalState, 'Should have global state');
      assert.strictEqual(typeof context.extensionPath, 'string', 'Should have extension path');
      assert.ok(context.extensionUri, 'Should have extension URI');
    });

    test('should handle state operations', async () => {
      const context = createMockExtensionContext();
      
      // Test workspace state
      context.workspaceState.get.withArgs('testKey').returns('testValue');
      const workspaceValue = context.workspaceState.get('testKey');
      assert.strictEqual(workspaceValue, 'testValue', 'Should return workspace state value');
      
      await context.workspaceState.update('testKey', 'newValue');
      assert.ok(context.workspaceState.update.calledWith('testKey', 'newValue'), 'Should update workspace state');
      
      // Test global state
      context.globalState.get.withArgs('globalKey').returns('globalValue');
      const globalValue = context.globalState.get('globalKey');
      assert.strictEqual(globalValue, 'globalValue', 'Should return global state value');
      
      await context.globalState.update('globalKey', 'newGlobalValue');
      assert.ok(context.globalState.update.calledWith('globalKey', 'newGlobalValue'), 'Should update global state');
    });

    test('should provide path utilities', () => {
      const context = createMockExtensionContext();
      
      const absolutePath = context.asAbsolutePath('resources/icon.png');
      assert.strictEqual(typeof absolutePath, 'string', 'Should return string');
      assert.ok(absolutePath.includes('resources/icon.png'), 'Should include relative path');
    });

    test('should provide storage URIs', () => {
      const context = createMockExtensionContext();
      
      assert.ok(context.storageUri, 'Should have storage URI');
      assert.ok(context.globalStorageUri, 'Should have global storage URI');
      assert.ok(context.logUri, 'Should have log URI');
    });

    test('should provide secrets API', async () => {
      const context = createMockExtensionContext();
      
      await context.secrets.store('testSecret', 'secretValue');
      assert.ok(context.secrets.store.calledWith('testSecret', 'secretValue'), 'Should store secret');
      
      const secret = await context.secrets.get('testSecret');
      // Should not throw and return undefined by default
      assert.strictEqual(secret, undefined, 'Should return undefined for mock secret');
    });
  });

  suite('Webview API Mock', () => {
    test('should provide webview API', () => {
      const webviewAPI = createMockWebviewAPI();
      
      assert.ok(webviewAPI, 'Webview API should be created');
      assert.strictEqual(typeof webviewAPI.postMessage, 'function', 'Should have postMessage');
      assert.strictEqual(typeof webviewAPI.setState, 'function', 'Should have setState');
      assert.strictEqual(typeof webviewAPI.getState, 'function', 'Should have getState');
    });

    test('should handle webview state', () => {
      const webviewAPI = createMockWebviewAPI();
      
      const state = webviewAPI.getState();
      assert.deepStrictEqual(state, {}, 'Should return empty state by default');
      
      webviewAPI.setState({ key: 'value' });
      assert.ok(webviewAPI.setState.calledWith({ key: 'value' }), 'Should set state');
    });
  });

  suite('Language Features Mock', () => {
    test('should register hover providers', () => {
      const vscode = require('vscode');
      
      const hoverProvider = {
        provideHover: sinon.stub()
      };
      
      const disposable = vscode.languages.registerHoverProvider('yaml', hoverProvider);
      assert.ok(disposable, 'Should return disposable');
      assert.strictEqual(typeof disposable.dispose, 'function', 'Should have dispose method');
    });

    test('should create diagnostic collections', () => {
      const vscode = require('vscode');
      
      const diagnostics = vscode.languages.createDiagnosticCollection('test');
      assert.ok(diagnostics, 'Should create diagnostic collection');
      assert.strictEqual(diagnostics.name, 'mock-diagnostics', 'Should have correct name');
      assert.strictEqual(typeof diagnostics.set, 'function', 'Should have set method');
      assert.strictEqual(typeof diagnostics.clear, 'function', 'Should have clear method');
    });
  });

  suite('Constants and Enums Mock', () => {
    test('should provide configuration targets', () => {
      const vscode = require('vscode');
      
      assert.strictEqual(vscode.ConfigurationTarget.Global, 1, 'Global should be 1');
      assert.strictEqual(vscode.ConfigurationTarget.Workspace, 2, 'Workspace should be 2');
      assert.strictEqual(vscode.ConfigurationTarget.WorkspaceFolder, 3, 'WorkspaceFolder should be 3');
    });

    test('should provide progress locations', () => {
      const vscode = require('vscode');
      
      assert.strictEqual(vscode.ProgressLocation.SourceControl, 1, 'SourceControl should be 1');
      assert.strictEqual(vscode.ProgressLocation.Window, 10, 'Window should be 10');
      assert.strictEqual(vscode.ProgressLocation.Notification, 15, 'Notification should be 15');
    });

    test('should provide tree item states', () => {
      const vscode = require('vscode');
      
      assert.strictEqual(vscode.TreeItemCollapsibleState.None, 0, 'None should be 0');
      assert.strictEqual(vscode.TreeItemCollapsibleState.Collapsed, 1, 'Collapsed should be 1');
      assert.strictEqual(vscode.TreeItemCollapsibleState.Expanded, 2, 'Expanded should be 2');
    });

    test('should provide file types', () => {
      const vscode = require('vscode');
      
      assert.strictEqual(vscode.FileType.Unknown, 0, 'Unknown should be 0');
      assert.strictEqual(vscode.FileType.File, 1, 'File should be 1');
      assert.strictEqual(vscode.FileType.Directory, 2, 'Directory should be 2');
    });

    test('should provide theme icons', () => {
      const vscode = require('vscode');
      
      const icon = new vscode.ThemeIcon('gear');
      assert.ok(icon, 'Should create theme icon');
      assert.strictEqual(icon.id, 'gear', 'Should have correct id');
      
      const colorIcon = new vscode.ThemeIcon('error', { id: 'errorForeground' });
      assert.strictEqual(colorIcon.id, 'error', 'Should have correct id');
      assert.ok(colorIcon.color, 'Should have color');
    });
  });
});