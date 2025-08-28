/**
 * VSCode API Mock Setup
 * 
 * Provides comprehensive mocking for VSCode API to enable proper testing
 * of extension components without requiring the actual VSCode environment.
 */

import * as sinon from 'sinon';

// Mock VSCode API types and interfaces
export interface MockVSCodeAPI {
  workspace: any;
  window: any;
  commands: any;
  Uri: any;
  Range: any;
  Position: any;
  Selection: any;
  TextDocument: any;
  TextEditor: any;
  ExtensionContext: any;
  ConfigurationTarget: any;
  ProgressLocation: any;
  TreeItemCollapsibleState: any;
  StatusBarAlignment: any;
  version: string;
  env: any;
}

/**
 * Create comprehensive VSCode API mock
 */
export function createVSCodeMock(): MockVSCodeAPI {
  const mockWorkspace = {
    workspaceFolders: [],
    getConfiguration: sinon.stub().returns({
      get: sinon.stub().returns('default-value'),
      has: sinon.stub().returns(true),
      inspect: sinon.stub().returns({}),
      update: sinon.stub().resolves()
    }),
    createFileSystemWatcher: sinon.stub().returns({
      onDidCreate: sinon.stub(),
      onDidChange: sinon.stub(),
      onDidDelete: sinon.stub(),
      dispose: sinon.stub()
    }),
    findFiles: sinon.stub().resolves([]),
    openTextDocument: sinon.stub().resolves({
      uri: { fsPath: '/mock/path' },
      fileName: 'mock.md',
      languageId: 'markdown',
      getText: sinon.stub().returns('# Mock README'),
      lineCount: 1
    }),
    fs: {
      writeFile: sinon.stub().resolves(),
      readFile: sinon.stub().resolves(Buffer.from('mock content')),
      delete: sinon.stub().resolves(),
      stat: sinon.stub().resolves({ type: 1, ctime: Date.now(), mtime: Date.now(), size: 100 })
    },
    onDidChangeConfiguration: sinon.stub(),
    onDidChangeWorkspaceFolders: sinon.stub(),
    onDidChangeTextDocument: sinon.stub(),
    onDidSaveTextDocument: sinon.stub()
  };

  const mockWindow = {
    showInformationMessage: sinon.stub().resolves('OK'),
    showWarningMessage: sinon.stub().resolves('OK'),
    showErrorMessage: sinon.stub().resolves('OK'),
    showQuickPick: sinon.stub().resolves('option1'),
    showInputBox: sinon.stub().resolves('user input'),
    showSaveDialog: sinon.stub().resolves({ fsPath: '/mock/save/path' }),
    showOpenDialog: sinon.stub().resolves([{ fsPath: '/mock/open/path' }]),
    showTextDocument: sinon.stub().resolves({
      document: mockWorkspace.openTextDocument(),
      selection: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }
    }),
    createStatusBarItem: sinon.stub().returns({
      text: '',
      tooltip: '',
      command: '',
      show: sinon.stub(),
      hide: sinon.stub(),
      dispose: sinon.stub()
    }),
    createWebviewPanel: sinon.stub().returns({
      webview: {
        html: '',
        postMessage: sinon.stub().resolves(),
        onDidReceiveMessage: sinon.stub(),
        asWebviewUri: sinon.stub().returns({ toString: () => 'mock://uri' }),
        cspSource: 'mock-csp'
      },
      title: 'Mock Panel',
      reveal: sinon.stub(),
      dispose: sinon.stub(),
      onDidDispose: sinon.stub(),
      onDidChangeViewState: sinon.stub(),
      visible: true,
      active: true,
      viewColumn: 1
    }),
    registerTreeDataProvider: sinon.stub().returns({ dispose: sinon.stub() }),
    createTreeView: sinon.stub().returns({
      reveal: sinon.stub(),
      dispose: sinon.stub(),
      onDidChangeSelection: sinon.stub(),
      onDidChangeVisibility: sinon.stub()
    }),
    withProgress: sinon.stub().callsFake(async (options, task) => {
      const progress = {
        report: sinon.stub()
      };
      return await task(progress, { isCancellationRequested: false });
    }),
    activeTextEditor: null,
    visibleTextEditors: [],
    onDidChangeActiveTextEditor: sinon.stub(),
    onDidChangeVisibleTextEditors: sinon.stub(),
    onDidChangeTextEditorSelection: sinon.stub(),
    onDidChangeTextEditorVisibleRanges: sinon.stub()
  };

  const mockCommands = {
    registerCommand: sinon.stub().returns({ dispose: sinon.stub() }),
    executeCommand: sinon.stub().resolves(),
    getCommands: sinon.stub().resolves(['mock.command1', 'mock.command2'])
  };

  const mockUri = {
    file: sinon.stub().callsFake((path: string) => ({
      scheme: 'file',
      fsPath: path,
      path: path,
      toString: () => `file://${path}`,
      with: sinon.stub().returnsThis(),
      toJSON: () => ({ scheme: 'file', path })
    })),
    parse: sinon.stub().callsFake((uri: string) => ({
      scheme: uri.split(':')[0],
      path: uri.split('://')[1] || '',
      toString: () => uri
    }))
  };

  const mockRange = sinon.stub().callsFake((startLine: number, startChar: number, endLine: number, endChar: number) => ({
    start: { line: startLine, character: startChar },
    end: { line: endLine, character: endChar },
    isEmpty: startLine === endLine && startChar === endChar,
    isSingleLine: startLine === endLine,
    contains: sinon.stub().returns(false),
    intersection: sinon.stub().returns(null),
    union: sinon.stub().returnsThis(),
    with: sinon.stub().returnsThis()
  }));

  const mockPosition = sinon.stub().callsFake((line: number, character: number) => ({
    line,
    character,
    isBefore: sinon.stub().returns(false),
    isBeforeOrEqual: sinon.stub().returns(false),
    isAfter: sinon.stub().returns(false),
    isAfterOrEqual: sinon.stub().returns(false),
    isEqual: sinon.stub().returns(false),
    compareTo: sinon.stub().returns(0),
    translate: sinon.stub().returnsThis(),
    with: sinon.stub().returnsThis()
  }));

  const mockEnv = {
    openExternal: sinon.stub().resolves(true),
    clipboard: {
      readText: sinon.stub().resolves('mock clipboard text'),
      writeText: sinon.stub().resolves()
    },
    machineId: 'mock-machine-id',
    sessionId: 'mock-session-id',
    language: 'en',
    shell: '/bin/bash'
  };

  return {
    workspace: mockWorkspace,
    window: mockWindow,
    commands: mockCommands,
    Uri: mockUri,
    Range: mockRange,
    Position: mockPosition,
    Selection: sinon.stub(),
    TextDocument: sinon.stub(),
    TextEditor: sinon.stub(),
    ExtensionContext: sinon.stub(),
    ConfigurationTarget: {
      Global: 1,
      Workspace: 2,
      WorkspaceFolder: 3
    },
    ProgressLocation: {
      SourceControl: 1,
      Window: 10,
      Notification: 15
    },
    TreeItemCollapsibleState: {
      None: 0,
      Collapsed: 1,
      Expanded: 2
    },
    StatusBarAlignment: {
      Left: 1,
      Right: 2
    },
    version: '1.74.0',
    env: mockEnv
  };
}

/**
 * Create mock extension context
 */
export function createMockExtensionContext(): any {
  return {
    subscriptions: [],
    workspaceState: {
      get: sinon.stub().returns({}),
      update: sinon.stub().resolves(),
      keys: sinon.stub().returns([])
    },
    globalState: {
      get: sinon.stub().returns({}),
      update: sinon.stub().resolves(),
      keys: sinon.stub().returns([])
    },
    extensionPath: '/mock/extension/path',
    extensionUri: {
      scheme: 'file',
      fsPath: '/mock/extension/path',
      path: '/mock/extension/path',
      toString: () => 'file:///mock/extension/path'
    },
    environmentVariableCollection: {
      persistent: true,
      replace: sinon.stub(),
      append: sinon.stub(),
      prepend: sinon.stub(),
      get: sinon.stub().returns(undefined),
      forEach: sinon.stub(),
      delete: sinon.stub(),
      clear: sinon.stub()
    },
    asAbsolutePath: sinon.stub().callsFake((relativePath: string) => `/mock/extension/path/${relativePath}`),
    storageUri: {
      scheme: 'file',
      fsPath: '/mock/storage',
      path: '/mock/storage',
      toString: () => 'file:///mock/storage'
    },
    globalStorageUri: {
      scheme: 'file',
      fsPath: '/mock/global-storage',
      path: '/mock/global-storage',
      toString: () => 'file:///mock/global-storage'
    },
    logUri: {
      scheme: 'file',
      fsPath: '/mock/log',
      path: '/mock/log',
      toString: () => 'file:///mock/log'
    },
    secrets: {
      get: sinon.stub().resolves(undefined),
      store: sinon.stub().resolves(),
      delete: sinon.stub().resolves(),
      onDidChange: sinon.stub()
    },
    extension: {
      id: 'mock.extension',
      extensionPath: '/mock/extension/path',
      isActive: true,
      packageJSON: {
        name: 'readme-to-cicd',
        displayName: 'README to CICD',
        version: '1.0.0',
        publisher: 'readme-to-cicd',
        description: 'Generate CI/CD workflows from README files',
        engines: { vscode: '^1.74.0' },
        repository: { url: 'https://github.com/test/readme-to-cicd' },
        bugs: { url: 'https://github.com/test/readme-to-cicd/issues' }
      },
      exports: undefined,
      activate: sinon.stub().resolves(),
      extensionKind: 1
    }
  };
}

/**
 * Create mock webview API for webview tests
 */
export function createMockWebviewAPI(): any {
  return {
    postMessage: sinon.stub(),
    setState: sinon.stub(),
    getState: sinon.stub().returns({}),
    onDidReceiveMessage: sinon.stub()
  };
}

/**
 * Setup global VSCode mock for tests
 */
export function setupVSCodeMock(): void {
  const vscode = createVSCodeMock();
  
  // Mock the vscode module
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  
  Module.prototype.require = function(this: any, id: string) {
    if (id === 'vscode') {
      return vscode;
    }
    return originalRequire.apply(this, arguments);
  };
}

/**
 * Cleanup VSCode mock after tests
 */
export function cleanupVSCodeMock(): void {
  const Module = require('module');
  // Restore original require if it exists
  if (Module.prototype.require) {
    delete Module.prototype.require;
  }
  sinon.restore();
}

/**
 * Create mock AJV validator to fix validation issues
 */
export function createMockAJV(): any {
  return {
    compile: sinon.stub().returns((data: any) => true),
    validate: sinon.stub().returns(true),
    addFormat: sinon.stub(),
    addKeyword: sinon.stub(),
    addSchema: sinon.stub(),
    getSchema: sinon.stub().returns({
      validate: sinon.stub().returns(true)
    }),
    errors: null
  };
}