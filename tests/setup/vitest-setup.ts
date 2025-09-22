// VS Code API Mock for Testing
// This file provides mock implementations of common VS Code APIs
// to allow tests to run outside of a live VS Code environment

import { vi } from 'vitest';

// Mock the vscode module
vi.mock('vscode', () => {
  const mockUri = {
    fsPath: '/mock/workspace',
    scheme: 'file',
    authority: '',
    path: '/mock/workspace',
    query: '',
    fragment: '',
    toString: () => 'file:///mock/workspace',
    with: () => mockUri,
    toJSON: () => ({ fsPath: '/mock/workspace' })
  };

  const mockWorkspaceFolder = {
    uri: mockUri,
    name: 'mock-workspace',
    index: 0
  };

  const mockConfiguration = {
    get: vi.fn((key: string, defaultValue?: any) => defaultValue),
    update: vi.fn(() => Promise.resolve()),
    has: vi.fn(() => false),
    inspect: vi.fn(() => ({ key: '', defaultValue: undefined, globalValue: undefined, workspaceValue: undefined, workspaceFolderValue: undefined }))
  };

  const mockOutputChannel = {
    name: 'mock-output-channel',
    append: vi.fn(),
    appendLine: vi.fn(),
    clear: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    dispose: vi.fn()
  };

  const mockWorkspace = {
    workspaceFolders: [mockWorkspaceFolder],
    getConfiguration: vi.fn(() => mockConfiguration),
    onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
    onDidChangeWorkspaceFolders: vi.fn(() => ({ dispose: vi.fn() })),
    onDidSaveTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
    onDidChangeTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
    onDidCloseTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
    onDidOpenTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
    findFiles: vi.fn(() => Promise.resolve([])),
    saveAll: vi.fn(() => Promise.resolve(true)),
    applyEdit: vi.fn(() => Promise.resolve(true))
  };

  const mockWindow = {
    showInformationMessage: vi.fn(() => Promise.resolve()),
    showWarningMessage: vi.fn(() => Promise.resolve()),
    showErrorMessage: vi.fn(() => Promise.resolve()),
    showInputBox: vi.fn(() => Promise.resolve('mock-input')),
    showQuickPick: vi.fn(() => Promise.resolve()),
    createOutputChannel: vi.fn(() => mockOutputChannel),
    activeTextEditor: undefined,
    onDidChangeActiveTextEditor: vi.fn(() => ({ dispose: vi.fn() })),
    onDidChangeVisibleTextEditors: vi.fn(() => ({ dispose: vi.fn() }))
  };

  const mockCommands = {
    registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
    executeCommand: vi.fn(() => Promise.resolve())
  };

  const mockExtensions = {
    getExtension: vi.fn(() => undefined),
    all: []
  };

  const mockEnv = {
    appName: 'Visual Studio Code',
    appRoot: '/mock/vscode',
    appHost: 'desktop',
    uriScheme: 'vscode',
    language: 'en',
    clipboard: {
      readText: vi.fn(() => Promise.resolve('')),
      writeText: vi.fn(() => Promise.resolve())
    },
    openExternal: vi.fn(() => Promise.resolve(true))
  };

  const mockPosition = {
    line: 0,
    character: 0,
    with: vi.fn(() => mockPosition),
    translate: vi.fn(() => mockPosition),
    compareTo: vi.fn(() => 0),
    isBefore: vi.fn(() => false),
    isBeforeOrEqual: vi.fn(() => false),
    isAfter: vi.fn(() => false),
    isAfterOrEqual: vi.fn(() => false),
    isEqual: vi.fn(() => false)
  };

  const mockRange = {
    start: mockPosition,
    end: mockPosition,
    with: vi.fn(() => mockRange),
    intersection: vi.fn(() => mockRange),
    union: vi.fn(() => mockRange),
    isEmpty: false,
    isSingleLine: true,
    contains: vi.fn(() => false),
    isEqual: vi.fn(() => false)
  };

  const mockTextDocument = {
    uri: mockUri,
    fileName: '/mock/workspace/file.txt',
    isUntitled: false,
    languageId: 'plaintext',
    version: 1,
    isDirty: false,
    isClosed: false,
    save: vi.fn(() => Promise.resolve(true)),
    eol: 1, // EndOfLine.LF
    lineCount: 1,
    lineAt: vi.fn(() => ({ lineNumber: 0, text: 'mock line', range: mockRange, rangeIncludingLineBreak: mockRange, firstNonWhitespaceCharacterIndex: 0, isEmptyOrWhitespace: false })),
    getText: vi.fn(() => 'mock content'),
    getWordRangeAtPosition: vi.fn(() => mockRange),
    validateRange: vi.fn(() => mockRange),
    validatePosition: vi.fn(() => mockPosition),
    offsetAt: vi.fn(() => 0),
    positionAt: vi.fn(() => mockPosition)
  };

  const mockTextEditor = {
    document: mockTextDocument,
    selection: mockRange,
    selections: [mockRange],
    visibleRanges: [mockRange],
    options: {},
    viewColumn: 1,
    edit: vi.fn(() => Promise.resolve(true)),
    insertSnippet: vi.fn(() => Promise.resolve(true)),
    setDecorations: vi.fn(),
    revealRange: vi.fn(),
    show: vi.fn(),
    hide: vi.fn()
  };

  return {
    default: {
      workspace: mockWorkspace,
      window: mockWindow,
      commands: mockCommands,
      extensions: mockExtensions,
      env: mockEnv,
      Uri: {
        file: vi.fn(() => mockUri),
        parse: vi.fn(() => mockUri),
        joinPath: vi.fn(() => mockUri)
      },
      Range: vi.fn(() => mockRange),
      Position: vi.fn(() => mockPosition),
      TextDocument: vi.fn(() => mockTextDocument),
      TextEditor: vi.fn(() => mockTextEditor),
      ConfigurationTarget: {
        Global: 1,
        Workspace: 2,
        WorkspaceFolder: 3
      },
      EndOfLine: {
        LF: 1,
        CRLF: 2
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
      ProgressLocation: {
        SourceControl: 1,
        Window: 10,
        Notification: 15
      },
      TreeItemCollapsibleState: {
        None: 0,
        Collapsed: 1,
        Expanded: 2
      }
    },
    // Export named exports for direct imports
    workspace: mockWorkspace,
    window: mockWindow,
    commands: mockCommands,
    extensions: mockExtensions,
    env: mockEnv,
    Uri: {
      file: vi.fn(() => mockUri),
      parse: vi.fn(() => mockUri),
      joinPath: vi.fn(() => mockUri)
    },
    Range: vi.fn(() => mockRange),
    Position: vi.fn(() => mockPosition),
    TextDocument: vi.fn(() => mockTextDocument),
    TextEditor: vi.fn(() => mockTextEditor),
    ConfigurationTarget: {
      Global: 1,
      Workspace: 2,
      WorkspaceFolder: 3
    },
    EndOfLine: {
      LF: 1,
      CRLF: 2
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
    ProgressLocation: {
      SourceControl: 1,
      Window: 10,
      Notification: 15
    },
    TreeItemCollapsibleState: {
      None: 0,
      Collapsed: 1,
      Expanded: 2
    }
  };
});

// Mock fs module for file system operations
vi.mock('fs', () => {
  const fileSystem = new Map<string, string>();

  return {
    existsSync: vi.fn((path: string) => fileSystem.has(path)),
    readFileSync: vi.fn((path: string) => {
      const content = fileSystem.get(path);
      if (!content) {
        throw new Error(`ENOENT: no such file or directory, open '${path}'`);
      }
      return content;
    }),
    writeFileSync: vi.fn((path: string, data: string) => {
      fileSystem.set(path, data.toString());
    }),
    mkdirSync: vi.fn(),
    unlinkSync: vi.fn((path: string) => fileSystem.delete(path)),
    promises: {
      readFile: vi.fn((path: string) => {
        const content = fileSystem.get(path);
        if (!content) {
          return Promise.reject(new Error(`ENOENT: no such file or directory, open '${path}'`));
        }
        return Promise.resolve(content);
      }),
      writeFile: vi.fn((path: string, data: string) => {
        fileSystem.set(path, data.toString());
        return Promise.resolve();
      })
    }
  };
});
