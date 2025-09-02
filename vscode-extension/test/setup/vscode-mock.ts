/**
 * VSCode API Mock Setup
 * 
 * Provides comprehensive mocking for VSCode API to enable proper testing
 * of extension components without requiring the actual VSCode environment.
 * 
 * This implementation covers all major VSCode APIs used by the extension:
 * - Workspace API (file operations, configuration, watchers)
 * - Window API (messages, dialogs, webviews, progress)
 * - Commands API (registration, execution)
 * - Tree Data Provider API
 * - Extension Context and lifecycle
 * - File System API
 * - Uri utilities
 */

import * as sinon from 'sinon';

// Mock VSCode API types and interfaces
export interface MockVSCodeAPI {
  workspace: any;
  window: any;
  commands: any;
  languages: any;
  debug: any;
  tasks: any;
  extensions: any;
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
  ViewColumn: any;
  FileType: any;
  DiagnosticSeverity: any;
  CompletionItemKind: any;
  ThemeIcon: any;
  version: string;
  env: any;
}

/**
 * Create comprehensive VSCode API mock
 * Covers all VSCode APIs used by the README-to-CICD extension
 */
export function createVSCodeMock(): MockVSCodeAPI {
  const mockWorkspace = {
    workspaceFolders: [
      {
        uri: { 
          fsPath: '/mock/workspace',
          scheme: 'file',
          path: '/mock/workspace',
          toString: () => 'file:///mock/workspace'
        },
        name: 'mock-workspace',
        index: 0
      }
    ],
    getConfiguration: sinon.stub().callsFake((section?: string) => {
      const configs: Record<string, any> = {
        'readme-to-cicd': {
          autoDetect: true,
          defaultOptimization: 'standard',
          workflowTypes: ['ci', 'cd'],
          outputDirectory: '.github/workflows',
          showStatusBar: true,
          enablePreview: true,
          autoCommit: false,
          commitMessage: 'Add CI/CD workflows generated from README'
        }
      };
      
      const config = configs[section || 'readme-to-cicd'] || {};
      
      return {
        get: sinon.stub().callsFake((key: string, defaultValue?: any) => {
          return config[key] !== undefined ? config[key] : defaultValue;
        }),
        has: sinon.stub().callsFake((key: string) => config[key] !== undefined),
        inspect: sinon.stub().returns({
          key: section,
          defaultValue: undefined,
          globalValue: undefined,
          workspaceValue: config,
          workspaceFolderValue: undefined
        }),
        update: sinon.stub().resolves()
      };
    }),
    createFileSystemWatcher: sinon.stub().returns({
      onDidCreate: sinon.stub().returns({ dispose: sinon.stub() }),
      onDidChange: sinon.stub().returns({ dispose: sinon.stub() }),
      onDidDelete: sinon.stub().returns({ dispose: sinon.stub() }),
      dispose: sinon.stub()
    }),
    findFiles: sinon.stub().callsFake(async (include: string) => {
      // Mock README files for testing
      if (include.includes('README')) {
        return [
          {
            fsPath: '/mock/workspace/README.md',
            scheme: 'file',
            path: '/mock/workspace/README.md',
            toString: () => 'file:///mock/workspace/README.md'
          }
        ];
      }
      // Mock workflow files
      if (include.includes('.github/workflows')) {
        return [
          {
            fsPath: '/mock/workspace/.github/workflows/ci.yml',
            scheme: 'file',
            path: '/mock/workspace/.github/workflows/ci.yml',
            toString: () => 'file:///mock/workspace/.github/workflows/ci.yml'
          }
        ];
      }
      return [];
    }),
    openTextDocument: sinon.stub().callsFake(async (uri?: any) => {
      const mockUri = uri || { fsPath: '/mock/path' };
      const isReadme = mockUri.fsPath?.includes('README');
      const isWorkflow = mockUri.fsPath?.includes('.github/workflows');
      
      let content = '# Mock README\n\nThis is a mock README file for testing.';
      let languageId = 'markdown';
      
      if (isWorkflow) {
        content = 'name: CI\non:\n  push:\n    branches: [main]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4';
        languageId = 'yaml';
      }
      
      return {
        uri: mockUri,
        fileName: mockUri.fsPath || 'mock.md',
        languageId,
        getText: sinon.stub().returns(content),
        lineCount: content.split('\n').length,
        lineAt: sinon.stub().callsFake((line: number) => ({
          text: content.split('\n')[line] || '',
          range: { start: { line, character: 0 }, end: { line, character: 100 } },
          rangeIncludingLineBreak: { start: { line, character: 0 }, end: { line, character: 100 } },
          firstNonWhitespaceCharacterIndex: 0,
          isEmptyOrWhitespace: false
        })),
        getWordRangeAtPosition: sinon.stub().returns({
          start: { line: 0, character: 0 },
          end: { line: 0, character: 5 }
        }),
        save: sinon.stub().resolves(true),
        isDirty: false,
        isClosed: false,
        version: 1
      };
    }),
    asRelativePath: sinon.stub().callsFake((pathOrUri: any) => {
      const path = typeof pathOrUri === 'string' ? pathOrUri : pathOrUri.fsPath;
      return path.replace('/mock/workspace/', '');
    }),
    fs: {
      writeFile: sinon.stub().resolves(),
      readFile: sinon.stub().callsFake(async (uri: any) => {
        const path = uri.fsPath || uri.path;
        if (path?.includes('README')) {
          return Buffer.from('# Mock README\n\nThis is a mock README file for testing.\n\n## Installation\n\n```bash\nnpm install\n```\n\n## Testing\n\n```bash\nnpm test\n```');
        }
        if (path?.includes('.github/workflows')) {
          return Buffer.from('name: CI\non:\n  push:\n    branches: [main]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4');
        }
        return Buffer.from('mock content');
      }),
      readDirectory: sinon.stub().callsFake(async (uri: any) => {
        const path = uri.fsPath || uri.path;
        if (path?.includes('.github/workflows')) {
          return [
            ['ci.yml', 1], // FileType.File = 1
            ['cd.yml', 1]
          ];
        }
        return [];
      }),
      delete: sinon.stub().resolves(),
      stat: sinon.stub().resolves({ 
        type: 1, // FileType.File
        ctime: Date.now(), 
        mtime: Date.now(), 
        size: 100 
      }),
      createDirectory: sinon.stub().resolves(),
      copy: sinon.stub().resolves(),
      rename: sinon.stub().resolves()
    },
    onDidChangeConfiguration: sinon.stub().returns({ dispose: sinon.stub() }),
    onDidChangeWorkspaceFolders: sinon.stub().returns({ dispose: sinon.stub() }),
    onDidChangeTextDocument: sinon.stub().returns({ dispose: sinon.stub() }),
    onDidSaveTextDocument: sinon.stub().returns({ dispose: sinon.stub() }),
    onDidOpenTextDocument: sinon.stub().returns({ dispose: sinon.stub() }),
    onDidCloseTextDocument: sinon.stub().returns({ dispose: sinon.stub() }),
    textDocuments: [],
    name: 'Mock Workspace',
    getWorkspaceFolder: sinon.stub().returns({
      uri: { fsPath: '/mock/workspace' },
      name: 'mock-workspace',
      index: 0
    })
  };

  const mockWindow = {
    showInformationMessage: async function(message: string, ...items: any[]) {
      // Enhanced mock with configurable behavior
      const mockConfig = (this as any)._mockConfig || {};
      console.log('DEBUG: showInformationMessage called with config:', mockConfig);
      
      // Handle options object as first parameter
      let options: any = {};
      let actionItems: string[] = [];
      
      if (items.length > 0) {
        // Check if first item is options object
        if (typeof items[0] === 'object' && items[0] !== null && !Array.isArray(items[0]) && typeof items[0] !== 'string') {
          options = items[0];
          actionItems = items.slice(1);
        } else {
          actionItems = items as string[];
        }
      }
      
      // Store message for test verification
      if (!(this as any)._messageHistory) (this as any)._messageHistory = [];
      (this as any)._messageHistory.push({
        type: 'information',
        message,
        items: actionItems,
        options,
        timestamp: Date.now()
      });
      
      // Handle modal behavior
      if (options.modal) {
        // Modal messages require user interaction
        return mockConfig.modalResponse || (actionItems.length > 0 ? actionItems[0] : 'OK');
      }
      
      // Handle cancellation simulation
      if (mockConfig.simulateCancel) {
        return undefined;
      }
      
      // Handle configured responses
      if (mockConfig.informationResponse !== undefined) {
        return mockConfig.informationResponse;
      }
      
      // Default behavior: return first item or 'OK' if no items
      return actionItems.length > 0 ? actionItems[0] : 'OK';
    },
    
    showWarningMessage: async function(message: string, ...items: any[]) {
      const mockConfig = (this as any)._mockConfig || {};
      
      let options: any = {};
      let actionItems: string[] = [];
      
      if (items.length > 0) {
        if (typeof items[0] === 'object' && items[0] !== null && !Array.isArray(items[0]) && typeof items[0] !== 'string') {
          options = items[0];
          actionItems = items.slice(1);
        } else {
          actionItems = items as string[];
        }
      }
      
      if (!(this as any)._messageHistory) (this as any)._messageHistory = [];
      (this as any)._messageHistory.push({
        type: 'warning',
        message,
        items: actionItems,
        options,
        timestamp: Date.now()
      });
      
      if (options.modal) {
        return mockConfig.modalResponse || (actionItems.length > 0 ? actionItems[0] : 'OK');
      }
      
      // Handle cancellation simulation
      if (mockConfig.simulateCancel) {
        return undefined;
      }
      
      if (mockConfig.warningResponse !== undefined) {
        return mockConfig.warningResponse;
      }
      
      return actionItems.length > 0 ? actionItems[0] : undefined;
    },
    
    showErrorMessage: async function(message: string, ...items: any[]) {
      const mockConfig = (this as any)._mockConfig || {};
      
      let options: any = {};
      let actionItems: string[] = [];
      
      if (items.length > 0) {
        if (typeof items[0] === 'object' && items[0] !== null && !Array.isArray(items[0]) && typeof items[0] !== 'string') {
          options = items[0];
          actionItems = items.slice(1);
        } else {
          actionItems = items as string[];
        }
      }
      
      if (!(this as any)._messageHistory) (this as any)._messageHistory = [];
      (this as any)._messageHistory.push({
        type: 'error',
        message,
        items: actionItems,
        options,
        timestamp: Date.now()
      });
      
      if (options.modal) {
        return mockConfig.modalResponse || (actionItems.length > 0 ? actionItems[0] : 'OK');
      }
      
      // Handle cancellation simulation
      if (mockConfig.simulateCancel) {
        return undefined;
      }
      
      if (mockConfig.errorResponse !== undefined) {
        return mockConfig.errorResponse;
      }
      
      return actionItems.length > 0 ? actionItems[0] : undefined;
    },
    showQuickPick: sinon.stub().callsFake(async (items: any[], options?: any) => {
      const mockConfig = (mockWindow as any)._mockConfig || {};
      
      // Store interaction for test verification
      if (!mockWindow._interactionHistory) mockWindow._interactionHistory = [];
      mockWindow._interactionHistory.push({
        type: 'quickPick',
        items,
        options,
        timestamp: Date.now()
      });
      
      // Handle configured response
      if (mockConfig.quickPickResponse !== undefined) {
        return mockConfig.quickPickResponse;
      }
      
      // Handle multi-select
      if (options?.canPickMany) {
        const selectedItems = Array.isArray(items) && items.length > 0 ? [items[0]] : [];
        return selectedItems;
      }
      
      // Handle cancellation
      if (mockConfig.simulateCancel) {
        return undefined;
      }
      
      // Default behavior: return first item
      if (Array.isArray(items) && items.length > 0) {
        const firstItem = items[0];
        return typeof firstItem === 'string' ? firstItem : firstItem;
      }
      return undefined;
    }),
    
    showInputBox: sinon.stub().callsFake(async (options?: any) => {
      const mockConfig = (mockWindow as any)._mockConfig || {};
      
      // Store interaction for test verification
      if (!mockWindow._interactionHistory) mockWindow._interactionHistory = [];
      mockWindow._interactionHistory.push({
        type: 'inputBox',
        options,
        timestamp: Date.now()
      });
      
      // Handle configured response
      if (mockConfig.inputBoxResponse !== undefined) {
        return mockConfig.inputBoxResponse;
      }
      
      // Handle cancellation
      if (mockConfig.simulateCancel) {
        return undefined;
      }
      
      // Handle validation
      if (options?.validateInput && mockConfig.inputValidationError) {
        // Simulate validation error
        return undefined;
      }
      
      // Return configured value, prompt value, or default
      return mockConfig.inputValue || options?.value || options?.prompt || 'mock-input';
    }),
    showSaveDialog: sinon.stub().resolves({ 
      fsPath: '/mock/save/path',
      scheme: 'file',
      path: '/mock/save/path',
      toString: () => 'file:///mock/save/path'
    }),
    showOpenDialog: sinon.stub().resolves([{ 
      fsPath: '/mock/open/path',
      scheme: 'file',
      path: '/mock/open/path',
      toString: () => 'file:///mock/open/path'
    }]),
    showTextDocument: sinon.stub().callsFake(async (document: any, column?: any) => {
      return {
        document: typeof document === 'object' ? document : await mockWorkspace.openTextDocument(document),
        selection: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        visibleRanges: [{ start: { line: 0, character: 0 }, end: { line: 10, character: 0 } }],
        viewColumn: column || 1,
        edit: sinon.stub().resolves(true),
        insertSnippet: sinon.stub().resolves(true),
        setDecorations: sinon.stub(),
        revealRange: sinon.stub(),
        show: sinon.stub(),
        hide: sinon.stub()
      };
    }),
    createStatusBarItem: sinon.stub().callsFake((alignment?: any, priority?: number) => {
      return {
        alignment: alignment || 1,
        priority: priority || 0,
        text: '',
        tooltip: '',
        command: '',
        color: undefined,
        backgroundColor: undefined,
        show: sinon.stub(),
        hide: sinon.stub(),
        dispose: sinon.stub()
      };
    }),
    createWebviewPanel: sinon.stub().callsFake((viewType: string, title: string, showOptions: any, options?: any) => {
      const panel = {
        webview: {
          html: '',
          options: options || {},
          postMessage: sinon.stub().resolves(true),
          onDidReceiveMessage: sinon.stub().returns({ dispose: sinon.stub() }),
          asWebviewUri: sinon.stub().callsFake((uri: any) => ({
            scheme: 'vscode-webview',
            authority: 'mock-authority',
            path: uri.path,
            toString: () => `vscode-webview://mock-authority${uri.path}`
          })),
          cspSource: 'vscode-webview:'
        },
        viewType,
        title,
        iconPath: undefined,
        reveal: sinon.stub(),
        dispose: sinon.stub(),
        onDidDispose: sinon.stub().returns({ dispose: sinon.stub() }),
        onDidChangeViewState: sinon.stub().returns({ dispose: sinon.stub() }),
        visible: true,
        active: true,
        viewColumn: showOptions.viewColumn || 1
      };
      return panel;
    }),
    registerTreeDataProvider: sinon.stub().callsFake((viewId: string, treeDataProvider: any) => {
      return { dispose: sinon.stub() };
    }),
    createTreeView: sinon.stub().callsFake((viewId: string, options: any) => {
      return {
        title: options.treeDataProvider?.title || viewId,
        description: undefined,
        message: undefined,
        reveal: sinon.stub().resolves(),
        dispose: sinon.stub(),
        onDidChangeSelection: sinon.stub().returns({ dispose: sinon.stub() }),
        onDidChangeVisibility: sinon.stub().returns({ dispose: sinon.stub() }),
        onDidCollapseElement: sinon.stub().returns({ dispose: sinon.stub() }),
        onDidExpandElement: sinon.stub().returns({ dispose: sinon.stub() }),
        selection: [],
        visible: true
      };
    }),
    withProgress: sinon.stub().callsFake(async (options: any, task: Function) => {
      const progress = {
        report: sinon.stub()
      };
      const token = { 
        isCancellationRequested: false,
        onCancellationRequested: sinon.stub().returns({ dispose: sinon.stub() })
      };
      return await task(progress, token);
    }),
    createOutputChannel: sinon.stub().returns({
      name: 'Mock Output',
      append: sinon.stub(),
      appendLine: sinon.stub(),
      clear: sinon.stub(),
      show: sinon.stub(),
      hide: sinon.stub(),
      dispose: sinon.stub()
    }),
    createTerminal: sinon.stub().returns({
      name: 'Mock Terminal',
      processId: Promise.resolve(1234),
      creationOptions: {},
      exitStatus: undefined,
      sendText: sinon.stub(),
      show: sinon.stub(),
      hide: sinon.stub(),
      dispose: sinon.stub()
    }),
    activeTextEditor: null,
    visibleTextEditors: [],
    terminals: [],
    onDidChangeActiveTextEditor: sinon.stub().returns({ dispose: sinon.stub() }),
    onDidChangeVisibleTextEditors: sinon.stub().returns({ dispose: sinon.stub() }),
    onDidChangeTextEditorSelection: sinon.stub().returns({ dispose: sinon.stub() }),
    onDidChangeTextEditorVisibleRanges: sinon.stub().returns({ dispose: sinon.stub() }),
    onDidChangeTextEditorOptions: sinon.stub().returns({ dispose: sinon.stub() }),
    onDidChangeTextEditorViewColumn: sinon.stub().returns({ dispose: sinon.stub() }),
    onDidOpenTerminal: sinon.stub().returns({ dispose: sinon.stub() }),
    onDidCloseTerminal: sinon.stub().returns({ dispose: sinon.stub() }),
    state: {
      focused: true
    },
    tabGroups: {
      all: [],
      activeTabGroup: null,
      onDidChangeTabGroups: sinon.stub().returns({ dispose: sinon.stub() }),
      onDidChangeTabs: sinon.stub().returns({ dispose: sinon.stub() })
    },
    
    // Enhanced mock configuration methods
    _mockConfig: {},
    _messageHistory: [],
    _interactionHistory: [],
    
    // Configuration methods for tests
    setMockConfig: function(config: any) {
      this._mockConfig = { ...this._mockConfig, ...config };
    },
    
    resetMockConfig: function() {
      this._mockConfig = {};
      this._messageHistory = [];
      this._interactionHistory = [];
    },
    
    getMockConfig: function() {
      return { ...this._mockConfig };
    },
    
    getMessageHistory: function() {
      return [...this._messageHistory];
    },
    
    getInteractionHistory: function() {
      return [...this._interactionHistory];
    },
    
    // Simulate user responses for different scenarios
    simulateUserResponse: function(type: string, response: any) {
      switch (type) {
        case 'information':
          this._mockConfig.informationResponse = response;
          break;
        case 'warning':
          this._mockConfig.warningResponse = response;
          break;
        case 'error':
          this._mockConfig.errorResponse = response;
          break;
        case 'quickPick':
          this._mockConfig.quickPickResponse = response;
          break;
        case 'inputBox':
          this._mockConfig.inputBoxResponse = response;
          break;
        case 'modal':
          this._mockConfig.modalResponse = response;
          break;
      }
    },
    
    // Simulate user cancellation
    simulateCancel: function(enable: boolean = true) {
      this._mockConfig.simulateCancel = enable;
    },
    
    // Additional window API methods for comprehensive coverage
    showWorkspaceFolderPick: sinon.stub().callsFake(async (options?: any) => {
      const mockConfig = (mockWindow as any)._mockConfig || {};
      
      if (mockConfig.simulateCancel) {
        return undefined;
      }
      
      return {
        uri: { fsPath: '/mock/workspace' },
        name: 'mock-workspace',
        index: 0
      };
    }),
    
    createInputBox: sinon.stub().callsFake(() => {
      return {
        value: '',
        placeholder: '',
        password: false,
        buttons: [],
        prompt: '',
        validationMessage: '',
        title: '',
        step: undefined,
        totalSteps: undefined,
        enabled: true,
        busy: false,
        ignoreFocusOut: false,
        show: sinon.stub(),
        hide: sinon.stub(),
        dispose: sinon.stub(),
        onDidChangeValue: sinon.stub().returns({ dispose: sinon.stub() }),
        onDidAccept: sinon.stub().returns({ dispose: sinon.stub() }),
        onDidHide: sinon.stub().returns({ dispose: sinon.stub() }),
        onDidTriggerButton: sinon.stub().returns({ dispose: sinon.stub() })
      };
    }),
    
    createQuickPick: sinon.stub().callsFake(() => {
      return {
        items: [],
        canSelectMany: false,
        matchOnDescription: false,
        matchOnDetail: false,
        keepScrollPosition: false,
        activeItems: [],
        selectedItems: [],
        buttons: [],
        title: '',
        step: undefined,
        totalSteps: undefined,
        enabled: true,
        busy: false,
        ignoreFocusOut: false,
        value: '',
        placeholder: '',
        show: sinon.stub(),
        hide: sinon.stub(),
        dispose: sinon.stub(),
        onDidChangeValue: sinon.stub().returns({ dispose: sinon.stub() }),
        onDidChangeActive: sinon.stub().returns({ dispose: sinon.stub() }),
        onDidChangeSelection: sinon.stub().returns({ dispose: sinon.stub() }),
        onDidAccept: sinon.stub().returns({ dispose: sinon.stub() }),
        onDidHide: sinon.stub().returns({ dispose: sinon.stub() }),
        onDidTriggerButton: sinon.stub().returns({ dispose: sinon.stub() }),
        onDidTriggerItemButton: sinon.stub().returns({ dispose: sinon.stub() })
      };
    })
  };

  const mockCommands = {
    registerCommand: sinon.stub().callsFake((command: string, callback: Function) => {
      // Store registered commands for testing
      mockCommands._registeredCommands = mockCommands._registeredCommands || new Map();
      mockCommands._registeredCommands.set(command, callback);
      
      // Track registration history for testing
      mockCommands._registrationHistory = mockCommands._registrationHistory || [];
      mockCommands._registrationHistory.push({
        command,
        timestamp: Date.now(),
        disposed: false
      });
      
      return { 
        dispose: sinon.stub().callsFake(() => {
          mockCommands._registeredCommands?.delete(command);
          // Mark as disposed in history
          const historyEntry = mockCommands._registrationHistory?.find(
            (entry: any) => entry.command === command && !entry.disposed
          );
          if (historyEntry) {
            historyEntry.disposed = true;
            historyEntry.disposedAt = Date.now();
          }
        })
      };
    }),
    executeCommand: sinon.stub().callsFake(async (command: string, ...args: any[]) => {
      // Track execution history for testing
      mockCommands._executionHistory = mockCommands._executionHistory || [];
      const executionStart = Date.now();
      
      try {
        let result;
        
        // Handle built-in VSCode commands
        switch (command) {
          case 'vscode.open':
            result = await mockWindow.showTextDocument(args[0]);
            break;
          case 'setContext':
            result = Promise.resolve();
            break;
          case 'revealInExplorer':
            result = Promise.resolve();
            break;
          case 'workbench.action.files.newUntitledFile':
            result = await mockWorkspace.openTextDocument();
            break;
          case 'workbench.action.showCommands':
            // Simulate command palette opening
            result = Promise.resolve();
            break;
          case 'workbench.action.quickOpen':
            // Simulate quick open
            result = Promise.resolve();
            break;
          default:
            // Check if it's a registered command
            const registeredCallback = mockCommands._registeredCommands?.get(command);
            if (registeredCallback) {
              result = await registeredCallback(...args);
            } else {
              // Command not found - simulate VSCode behavior
              throw new Error(`Command '${command}' not found`);
            }
        }
        
        // Record successful execution
        mockCommands._executionHistory.push({
          command,
          args,
          result,
          success: true,
          executionTime: Date.now() - executionStart,
          timestamp: executionStart
        });
        
        return result;
        
      } catch (error) {
        // Record failed execution
        mockCommands._executionHistory.push({
          command,
          args,
          error: (error as Error).message,
          success: false,
          executionTime: Date.now() - executionStart,
          timestamp: executionStart
        });
        throw error;
      }
    }),
    getCommands: sinon.stub().callsFake(async (filterInternal?: boolean) => {
      const builtInCommands = [
        'vscode.open',
        'setContext',
        'revealInExplorer',
        'workbench.action.files.newUntitledFile',
        'workbench.action.showCommands',
        'workbench.action.quickOpen',
        'workbench.action.openSettings',
        'workbench.action.reloadWindow'
      ];
      
      const registeredCommands = Array.from(mockCommands._registeredCommands?.keys() || []);
      const allCommands = [...builtInCommands, ...registeredCommands];
      
      // Filter internal commands if requested (like real VSCode)
      if (filterInternal) {
        return allCommands.filter(cmd => !cmd.startsWith('_'));
      }
      
      return allCommands;
    }),
    registerTextEditorCommand: sinon.stub().callsFake((command: string, callback: Function) => {
      // Similar to registerCommand but for text editor commands
      mockCommands._registeredCommands = mockCommands._registeredCommands || new Map();
      mockCommands._registeredCommands.set(command, callback);
      
      mockCommands._registrationHistory = mockCommands._registrationHistory || [];
      mockCommands._registrationHistory.push({
        command,
        type: 'textEditor',
        timestamp: Date.now(),
        disposed: false
      });
      
      return { 
        dispose: sinon.stub().callsFake(() => {
          mockCommands._registeredCommands?.delete(command);
          const historyEntry = mockCommands._registrationHistory?.find(
            (entry: any) => entry.command === command && !entry.disposed
          );
          if (historyEntry) {
            historyEntry.disposed = true;
            historyEntry.disposedAt = Date.now();
          }
        })
      };
    }),
    
    // Enhanced testing utilities
    _registeredCommands: new Map(),
    _registrationHistory: [],
    _executionHistory: [],
    
    // Testing helper methods
    getRegisteredCommands: function() {
      return Array.from(this._registeredCommands.keys());
    },
    
    getRegistrationHistory: function() {
      return [...this._registrationHistory];
    },
    
    getExecutionHistory: function() {
      return [...this._executionHistory];
    },
    
    clearHistory: function() {
      this._registrationHistory = [];
      this._executionHistory = [];
    },
    
    isCommandRegistered: function(command: string) {
      return this._registeredCommands.has(command);
    },
    
    getCommandExecutionCount: function(command: string) {
      return this._executionHistory.filter((entry: any) => entry.command === command).length;
    },
    
    simulateCommandPaletteExecution: async function(command: string, ...args: any[]) {
      // Simulate command execution from command palette
      try {
        const result = await this.executeCommand(command, ...args);
        return { success: true, result };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }
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

  // Additional VSCode API mocks
  const mockLanguages = {
    registerHoverProvider: sinon.stub().returns({ dispose: sinon.stub() }),
    registerCompletionItemProvider: sinon.stub().returns({ dispose: sinon.stub() }),
    registerCodeActionsProvider: sinon.stub().returns({ dispose: sinon.stub() }),
    registerDefinitionProvider: sinon.stub().returns({ dispose: sinon.stub() }),
    registerDocumentFormattingEditProvider: sinon.stub().returns({ dispose: sinon.stub() }),
    createDiagnosticCollection: sinon.stub().returns({
      name: 'mock-diagnostics',
      set: sinon.stub(),
      delete: sinon.stub(),
      clear: sinon.stub(),
      forEach: sinon.stub(),
      get: sinon.stub().returns([]),
      has: sinon.stub().returns(false),
      dispose: sinon.stub()
    }),
    getDiagnostics: sinon.stub().returns([]),
    onDidChangeDiagnostics: sinon.stub().returns({ dispose: sinon.stub() })
  };

  const mockDebug = {
    registerDebugConfigurationProvider: sinon.stub().returns({ dispose: sinon.stub() }),
    registerDebugAdapterDescriptorFactory: sinon.stub().returns({ dispose: sinon.stub() }),
    startDebugging: sinon.stub().resolves(true),
    addBreakpoints: sinon.stub(),
    removeBreakpoints: sinon.stub(),
    activeDebugSession: null,
    activeDebugConsole: {
      append: sinon.stub(),
      appendLine: sinon.stub()
    },
    breakpoints: [],
    onDidChangeActiveDebugSession: sinon.stub().returns({ dispose: sinon.stub() }),
    onDidStartDebugSession: sinon.stub().returns({ dispose: sinon.stub() }),
    onDidTerminateDebugSession: sinon.stub().returns({ dispose: sinon.stub() })
  };

  const mockTasks = {
    registerTaskProvider: sinon.stub().returns({ dispose: sinon.stub() }),
    fetchTasks: sinon.stub().resolves([]),
    executeTask: sinon.stub().resolves({
      task: {},
      terminate: sinon.stub()
    }),
    onDidStartTask: sinon.stub().returns({ dispose: sinon.stub() }),
    onDidEndTask: sinon.stub().returns({ dispose: sinon.stub() }),
    onDidStartTaskProcess: sinon.stub().returns({ dispose: sinon.stub() }),
    onDidEndTaskProcess: sinon.stub().returns({ dispose: sinon.stub() })
  };

  const mockExtensions = {
    all: [],
    getExtension: sinon.stub().returns(undefined),
    onDidChange: sinon.stub().returns({ dispose: sinon.stub() })
  };

  // File system types
  const FileType = {
    Unknown: 0,
    File: 1,
    Directory: 2,
    SymbolicLink: 64
  };

  // Diagnostic severity
  const DiagnosticSeverity = {
    Error: 0,
    Warning: 1,
    Information: 2,
    Hint: 3
  };

  // Completion item kinds
  const CompletionItemKind = {
    Text: 0,
    Method: 1,
    Function: 2,
    Constructor: 3,
    Field: 4,
    Variable: 5,
    Class: 6,
    Interface: 7,
    Module: 8,
    Property: 9,
    Unit: 10,
    Value: 11,
    Enum: 12,
    Keyword: 13,
    Snippet: 14,
    Color: 15,
    File: 16,
    Reference: 17,
    Folder: 18,
    EnumMember: 19,
    Constant: 20,
    Struct: 21,
    Event: 22,
    Operator: 23,
    TypeParameter: 24
  };

  // Theme icons
  const ThemeIcon = sinon.stub().callsFake((id: string, color?: any) => ({
    id,
    color
  }));

  // Add static properties to ThemeIcon
  (ThemeIcon as any).File = { id: 'file' };
  (ThemeIcon as any).Folder = { id: 'folder' };

  return {
    workspace: mockWorkspace,
    window: mockWindow,
    commands: mockCommands,
    languages: mockLanguages,
    debug: mockDebug,
    tasks: mockTasks,
    extensions: mockExtensions,
    Uri: mockUri,
    Range: mockRange,
    Position: mockPosition,
    Selection: sinon.stub().callsFake((start: any, end: any) => ({
      start,
      end,
      anchor: start,
      active: end,
      isEmpty: start.line === end.line && start.character === end.character,
      isSingleLine: start.line === end.line,
      isReversed: false
    })),
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
    ViewColumn: {
      Active: -1,
      Beside: -2,
      One: 1,
      Two: 2,
      Three: 3,
      Four: 4,
      Five: 5,
      Six: 6,
      Seven: 7,
      Eight: 8,
      Nine: 9
    },
    FileType,
    DiagnosticSeverity,
    CompletionItemKind,
    ThemeIcon,
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