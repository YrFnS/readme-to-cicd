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

  const mockOutputChannel = {
    name: 'mock-output-channel',
    append: vi.fn(),
    appendLine: vi.fn(),
    clear: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    dispose: vi.fn()
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

// Mock other common dependencies that might cause issues - but allow real access to templates
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs') as any;
  // Track file system state
  const fileSystem: Map<string, string> = new Map();

  const mockFs = {
    existsSync: vi.fn((path: string) => {
      // Allow real file access for templates
      if (path.includes('templates/') || path.includes('templates\\')) {
        return actual.existsSync(path);
      }
      return fileSystem.has(path);
    }),
    readFileSync: vi.fn((path: string, encoding?: string) => {
      // Allow real file access for templates
      if (path.includes('templates/') || path.includes('templates\\')) {
        return actual.readFileSync(path, encoding || 'utf-8');
      }
      const content = fileSystem.get(path);
      if (!content) {
        throw new Error(`ENOENT: no such file or directory, open '${path}'`);
      }
      return content;
    }),
    writeFileSync: vi.fn((path: string, data: string) => {
      fileSystem.set(path, data.toString());
    }),
    mkdirSync: vi.fn((path: string) => {
      // Mock directory creation
    }),
    mkdtempSync: vi.fn((prefix: string) => `${prefix}mock-temp-dir`),
    readdirSync: vi.fn((path: string, options?: any) => {
      if (options?.withFileTypes) {
        const entries: any[] = [];
        for (const [filePath, content] of fileSystem.entries()) {
          if (filePath.startsWith(path + '/') || filePath === path) {
            const relativePath = filePath.startsWith(path + '/') ? filePath.substring(path.length + 1) : filePath;
            if (!relativePath.includes('/')) {
              // Create Dirent-like object for files
              entries.push({
                name: relativePath,
                isDirectory: () => false,
                isFile: () => true,
                isBlockDevice: () => false,
                isCharacterDevice: () => false,
                isSymbolicLink: () => false,
                isFIFO: () => false,
                isSocket: () => false
              });
            }
          }
        }
        return entries;
      } else {
        const entries: any[] = [];
        for (const [filePath, content] of fileSystem.entries()) {
          if (filePath.startsWith(path + '/') || filePath === path) {
            const relativePath = filePath.startsWith(path + '/') ? filePath.substring(path.length + 1) : filePath;
            if (!relativePath.includes('/')) {
              entries.push(relativePath);
            }
          }
        }
        return entries;
      }
    }),
    statSync: vi.fn((path: string) => {
      const isFile = fileSystem.has(path);
      return {
        isDirectory: () => !isFile,
        isFile: () => isFile,
        size: isFile ? fileSystem.get(path)?.length || 0 : 0,
        mtime: new Date(),
        birthtime: new Date()
      };
    }),
    unlinkSync: vi.fn((path: string) => {
      fileSystem.delete(path);
    }),
    rmdirSync: vi.fn(),
    copyFileSync: vi.fn(),
    chmodSync: vi.fn()
  };

  const mockPromises = {
    exists: vi.fn((path: string) => {
      // Allow real file access for templates
      if (path.includes('templates/') || path.includes('templates\\')) {
        return actual.promises.access(path).then(() => true).catch(() => false);
      }
      return Promise.resolve(fileSystem.has(path));
    }),
    readFile: vi.fn((path: string, encoding?: string) => {
      // Allow real file access for templates
      if (path.includes('templates/') || path.includes('templates\\')) {
        return actual.promises.readFile(path, encoding || 'utf-8');
      }
      const content = fileSystem.get(path);
      if (!content) {
        return Promise.reject(new Error(`ENOENT: no such file or directory, open '${path}'`));
      }
      return Promise.resolve(content);
    }),
    writeFile: vi.fn((path: string, data: string) => {
      fileSystem.set(path, data.toString());
      return Promise.resolve();
    }),
    mkdir: vi.fn(() => Promise.resolve()),
    readdir: vi.fn((path: string, options?: any) => {
      if (options?.withFileTypes) {
        const entries: any[] = [];
        for (const [filePath, content] of fileSystem.entries()) {
          if (filePath.startsWith(path + '/') || filePath === path) {
            const relativePath = filePath.startsWith(path + '/') ? filePath.substring(path.length + 1) : filePath;
            if (!relativePath.includes('/')) {
              // Create Dirent-like object for files
              entries.push({
                name: relativePath,
                isDirectory: () => false,
                isFile: () => true,
                isBlockDevice: () => false,
                isCharacterDevice: () => false,
                isSymbolicLink: () => false,
                isFIFO: () => false,
                isSocket: () => false
              });
            }
          }
        }
        return Promise.resolve(entries);
      } else {
        const entries: any[] = [];
        for (const [filePath, content] of fileSystem.entries()) {
          if (filePath.startsWith(path + '/') || filePath === path) {
            const relativePath = filePath.startsWith(path + '/') ? filePath.substring(path.length + 1) : filePath;
            if (!relativePath.includes('/')) {
              entries.push(relativePath);
            }
          }
        }
        return Promise.resolve(entries);
      }
    }),
    stat: vi.fn((path: string) => {
      const isFile = fileSystem.has(path);
      return Promise.resolve({
        isDirectory: () => !isFile,
        isFile: () => isFile,
        size: isFile ? fileSystem.get(path)?.length || 0 : 0,
        mtime: new Date(),
        birthtime: new Date()
      });
    }),
    realpath: vi.fn((path: string) => Promise.resolve(path)),
    unlink: vi.fn((path: string) => {
      fileSystem.delete(path);
      return Promise.resolve();
    }),
    rmdir: vi.fn(() => Promise.resolve()),
    copyFile: vi.fn(() => Promise.resolve()),
    chmod: vi.fn(() => Promise.resolve()),
    access: vi.fn((path: string) => {
      // Allow real file access for templates
      if (path.includes('templates/') || path.includes('templates\\')) {
        return actual.promises.access(path);
      }
      if (fileSystem.has(path)) {
        return Promise.resolve();
      }
      return Promise.reject(new Error(`ENOENT: no such file or directory, access '${path}'`));
    })
  };

  return {
    default: mockFs,
    promises: mockPromises,
    // Export named exports for direct imports
    existsSync: mockFs.existsSync,
    readFileSync: mockFs.readFileSync,
    writeFileSync: mockFs.writeFileSync,
    mkdirSync: mockFs.mkdirSync,
    mkdtempSync: mockFs.mkdtempSync,
    readdirSync: mockFs.readdirSync,
    statSync: mockFs.statSync,
    unlinkSync: mockFs.unlinkSync,
    rmdirSync: mockFs.rmdirSync,
    copyFileSync: mockFs.copyFileSync,
    chmodSync: mockFs.chmodSync
  };
});


// Mock Kong Gateway API client
vi.mock('kong-admin-api-client', () => {
  const mockService = {
    id: 'service-123',
    name: 'mock-service',
    url: 'http://mock-api:8080',
    created_at: Date.now()
  };

  const mockRoute = {
    id: 'route-123',
    service: { id: mockService.id },
    paths: ['/api/v1'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    created_at: Date.now()
  };

  const mockConsumer = {
    id: 'consumer-123',
    username: 'test-user',
    custom_id: 'test-user-123',
    created_at: Date.now()
  };

  const mockPlugin = {
    id: 'plugin-123',
    name: 'cors',
    service: { id: mockService.id },
    config: {
      origins: ['*'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true
    },
    created_at: Date.now()
  };

  return {
    default: {
      services: {
        create: vi.fn(() => Promise.resolve(mockService)),
        get: vi.fn(() => Promise.resolve(mockService)),
        list: vi.fn(() => Promise.resolve({ data: [mockService] })),
        update: vi.fn(() => Promise.resolve(mockService)),
        delete: vi.fn(() => Promise.resolve())
      },
      routes: {
        create: vi.fn(() => Promise.resolve(mockRoute)),
        get: vi.fn(() => Promise.resolve(mockRoute)),
        list: vi.fn(() => Promise.resolve({ data: [mockRoute] })),
        update: vi.fn(() => Promise.resolve(mockRoute)),
        delete: vi.fn(() => Promise.resolve())
      },
      consumers: {
        create: vi.fn(() => Promise.resolve(mockConsumer)),
        get: vi.fn(() => Promise.resolve(mockConsumer)),
        list: vi.fn(() => Promise.resolve({ data: [mockConsumer] })),
        update: vi.fn(() => Promise.resolve(mockConsumer)),
        delete: vi.fn(() => Promise.resolve())
      },
      plugins: {
        create: vi.fn(() => Promise.resolve(mockPlugin)),
        get: vi.fn(() => Promise.resolve(mockPlugin)),
        list: vi.fn(() => Promise.resolve({ data: [mockPlugin] })),
        update: vi.fn(() => Promise.resolve(mockPlugin)),
        delete: vi.fn(() => Promise.resolve())
      },
      certificates: {
        create: vi.fn(() => Promise.resolve({ id: 'cert-123', cert: 'mock-cert', key: 'mock-key' })),
        get: vi.fn(() => Promise.resolve({ id: 'cert-123', cert: 'mock-cert', key: 'mock-key' })),
        list: vi.fn(() => Promise.resolve({ data: [{ id: 'cert-123', cert: 'mock-cert', key: 'mock-key' }] })),
        update: vi.fn(() => Promise.resolve({ id: 'cert-123', cert: 'mock-cert', key: 'mock-key' })),
        delete: vi.fn(() => Promise.resolve())
      }
    }
  };
});

// Mock axios for Kong Gateway HTTP calls
vi.mock('axios', () => {
  const mockResponse = {
    data: {
      services: [],
      routes: [],
      consumers: [],
      plugins: [],
      certificates: []
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {}
  };

  return {
    default: {
      create: vi.fn(() => ({
        get: vi.fn(() => Promise.resolve(mockResponse)),
        post: vi.fn(() => Promise.resolve(mockResponse)),
        put: vi.fn(() => Promise.resolve(mockResponse)),
        delete: vi.fn(() => Promise.resolve(mockResponse)),
        patch: vi.fn(() => Promise.resolve(mockResponse))
      })),
      get: vi.fn(() => Promise.resolve(mockResponse)),
      post: vi.fn(() => Promise.resolve(mockResponse)),
      put: vi.fn(() => Promise.resolve(mockResponse)),
      delete: vi.fn(() => Promise.resolve(mockResponse)),
      patch: vi.fn(() => Promise.resolve(mockResponse))
    }
  };
});

// Mock process object for path resolution
vi.mock('process', () => ({
  default: {
    cwd: vi.fn(() => '/mock/workspace'),
    env: {
      NODE_ENV: 'test',
      CI: 'true',
      ...process.env
    },
    platform: process.platform,
    versions: process.versions,
    argv: ['node', 'test'],
    exit: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    emit: vi.fn(),
    removeListener: vi.fn(),
    removeAllListeners: vi.fn()
  }
}));

// Enhanced path mocks - support both named and default imports but allow real path operations
vi.mock('path', async () => {
  const actual = await vi.importActual('path') as any;
  
  const mockPath = {
    join: actual.join,
    resolve: actual.resolve,
    dirname: actual.dirname,
    basename: actual.basename,
    extname: actual.extname,
    relative: actual.relative,
    normalize: actual.normalize,
    isAbsolute: actual.isAbsolute,
    sep: actual.sep,
    delimiter: actual.delimiter
  };

  return {
    default: mockPath,
    // Export named exports for direct imports
    join: mockPath.join,
    resolve: mockPath.resolve,
    dirname: mockPath.dirname,
    basename: mockPath.basename,
    extname: mockPath.extname,
    relative: mockPath.relative,
    normalize: mockPath.normalize,
    isAbsolute: mockPath.isAbsolute,
    sep: mockPath.sep,
    delimiter: mockPath.delimiter
  };
});

// Mock fs.realpath for symlink resolution - but allow real access to templates
vi.mock('fs/promises', async () => {
  const actual = await vi.importActual('fs/promises') as any;
  
  return {
    default: {
      existsSync: vi.fn(() => true),
      readFileSync: vi.fn(() => 'mock file content'),
      writeFileSync: vi.fn(),
      mkdirSync: vi.fn(),
      mkdtempSync: vi.fn((prefix: string) => `${prefix}mock-temp-dir`),
      readdir: vi.fn(() => Promise.resolve(['file1.txt', 'file2.js'])),
      readFile: vi.fn((path: string) => {
        // Allow real file access for templates
        if (path.includes('templates/') || path.includes('templates\\')) {
          return actual.readFile(path, 'utf-8');
        }
        return Promise.resolve('mock file content');
      }),
      writeFile: vi.fn(() => Promise.resolve()),
      mkdir: vi.fn(() => Promise.resolve()),
      stat: vi.fn(() => Promise.resolve({
        isDirectory: () => true,
        isFile: () => false,
        size: 0,
        mtime: new Date(),
        birthtime: new Date()
      })),
      realpath: vi.fn((path: string) => Promise.resolve(path)),
      unlink: vi.fn(() => Promise.resolve()),
      rmdir: vi.fn(() => Promise.resolve()),
      copyFile: vi.fn(() => Promise.resolve()),
      chmod: vi.fn(() => Promise.resolve()),
      access: vi.fn((path: string) => {
        // Allow real file access for templates
        if (path.includes('templates/') || path.includes('templates\\')) {
          return actual.access(path);
        }
        return Promise.resolve();
      })
    },
    // Export named exports for direct imports
    mkdir: vi.fn(() => Promise.resolve()),
    readFile: vi.fn((path: string) => {
      // Allow real file access for templates
      if (path.includes('templates/') || path.includes('templates\\')) {
        return actual.readFile(path, 'utf-8');
      }
      return Promise.resolve('mock file content');
    }),
    writeFile: vi.fn(() => Promise.resolve()),
    stat: vi.fn(() => Promise.resolve({
      isDirectory: () => true,
      isFile: () => false,
      size: 0,
      mtime: new Date(),
      birthtime: new Date()
    })),
    realpath: vi.fn((path: string) => Promise.resolve(path)),
    unlink: vi.fn(() => Promise.resolve()),
    rmdir: vi.fn(() => Promise.resolve()),
    copyFile: vi.fn(() => Promise.resolve()),
    chmod: vi.fn(() => Promise.resolve()),
    access: vi.fn((path: string) => {
      // Allow real file access for templates
      if (path.includes('templates/') || path.includes('templates\\')) {
        return actual.access(path);
      }
      return Promise.resolve();
    }),
    readdir: vi.fn(() => Promise.resolve(['file1.txt', 'file2.js']))
  };
});


// Mock performance monitor
vi.mock('../../src/cli/lib/performance-monitor', () => ({
  PerformanceMonitor: vi.fn().mockImplementation(() => ({
    startTimer: vi.fn(() => 'mock-timer-id'),
    endTimer: vi.fn(),
    timeFunction: vi.fn(async (name, fn) => fn()),
    getMetrics: vi.fn(() => ({})),
    reset: vi.fn()
  }))
}));

// Mock memory optimizer
vi.mock('../../src/cli/lib/memory-optimizer', () => ({
  MemoryOptimizer: vi.fn().mockImplementation(() => ({
    monitorMemory: vi.fn(() => Promise.resolve()),
    triggerGCIfNeeded: vi.fn(() => Promise.resolve()),
    optimizeBatchProcessing: vi.fn(() => ({ currentBatchSize: 4, memoryPressure: 'low' })),
    getMemoryStats: vi.fn(() => ({ heapUsed: 50 * 1024 * 1024, heapTotal: 100 * 1024 * 1024 }))
  }))
}));

// Mock cache manager
vi.mock('../../src/cli/lib/cache-manager', () => ({
  CacheManager: vi.fn().mockImplementation(() => ({
    get: vi.fn(() => undefined),
    set: vi.fn(() => true),
    delete: vi.fn(() => true),
    clear: vi.fn(),
    size: vi.fn(() => 0)
  }))
}));

// Mock lazy loader
vi.mock('../../src/cli/lib/lazy-loader', () => ({
  CLILazyLoader: vi.fn().mockImplementation(() => ({
    getReadmeParser: vi.fn(() => Promise.resolve(vi.fn())),
    getFrameworkDetector: vi.fn(() => Promise.resolve(vi.fn())),
    getYamlGenerator: vi.fn(() => Promise.resolve(vi.fn()))
  }))
}));

// Mock output handler
vi.mock('../../src/cli/lib/output-handler', () => ({
  OutputHandler: vi.fn().mockImplementation(() => ({
    updateOptions: vi.fn(),
    writeWorkflowFiles: vi.fn(() => Promise.resolve({
      success: true,
      filesCreated: 1,
      filesUpdated: 0,
      filesSkipped: 0,
      backupsCreated: 0,
      generatedFiles: ['/mock/output/workflow.yml'],
      errors: [],
      warnings: []
    }))
  }))
}));

// Mock error handler
vi.mock('../../src/cli/lib/error-handler', () => ({
  ErrorHandler: vi.fn().mockImplementation(() => ({
    handleError: vi.fn(),
    logError: vi.fn(),
    createError: vi.fn((code, message) => ({ code, message, category: 'processing', severity: 'error' }))
  }))
}));

// Mock logger
vi.mock('../../src/cli/lib/logger', () => ({
  Logger: vi.fn().mockImplementation(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn()
  }))
}));

// Mock Promise.allSettled for better batch processing test support
const originalAllSettled = Promise.allSettled;
Promise.allSettled = vi.fn((promises) => {
  return originalAllSettled.call(Promise, promises).then(results => {
    // Ensure all results have the expected structure
    return results.map(result => {
      if (result.status === 'fulfilled') {
        return { status: 'fulfilled', value: result.value };
      } else {
        return { status: 'rejected', reason: result.reason };
      }
    });
  });
});

// Mock Promise.all for sequential fallback in tests
const originalAll = Promise.all;
Promise.all = vi.fn((promises) => {
  return originalAll.call(Promise, promises);
});

// Enhanced timer mocks for timeout testing
vi.mock('timers', () => ({
  setTimeout: vi.fn((callback, delay) => {
    if (delay === 0) {
      // Immediate execution for test scenarios
      callback();
    }
    return 'mock-timer';
  }),
  clearTimeout: vi.fn(),
  setInterval: vi.fn(() => 'mock-interval'),
  clearInterval: vi.fn()
}));

// Mock crypto for random ID generation in tests
vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn(() => Buffer.from('mock-random-bytes')),
    randomUUID: vi.fn(() => 'mock-uuid-1234')
  }
}));

// Mock os for platform-specific path handling
vi.mock('os', () => ({
  default: {
    tmpdir: vi.fn(() => '/mock/tmp'),
    platform: vi.fn(() => 'linux'),
    homedir: vi.fn(() => '/mock/home'),
    hostname: vi.fn(() => 'mock-host'),
    type: vi.fn(() => 'Linux'),
    release: vi.fn(() => '5.0.0'),
    arch: vi.fn(() => 'x64'),
    cpus: vi.fn(() => [{ model: 'Mock CPU', speed: 2800 }]),
    totalmem: vi.fn(() => 8 * 1024 * 1024 * 1024), // 8GB
    freemem: vi.fn(() => 4 * 1024 * 1024 * 1024), // 4GB
    userInfo: vi.fn(() => ({ username: 'mockuser', homedir: '/mock/home' }))
  }
}));

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
};

// Mock ajv-formats package for YAML validation
vi.mock('ajv-formats', () => {
  const mockAddFormats = vi.fn((ajv: any) => {
    // Mock format validators
    ajv.addFormat('uri', () => true);
    ajv.addFormat('email', () => true);
    ajv.addFormat('date', () => true);
    ajv.addFormat('date-time', () => true);
    ajv.addFormat('ipv4', () => true);
    ajv.addFormat('ipv6', () => true);
    ajv.addFormat('hostname', () => true);
    ajv.addFormat('uuid', () => true);
  });

  return {
    default: mockAddFormats,
    addFormats: mockAddFormats
  };
});