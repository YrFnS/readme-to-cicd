/**
 * Minimal Test Setup
 *
 * This provides basic mocking for tests without complex infrastructure
 * to improve test reliability and startup time.
 */

import { vi } from 'vitest';

// Basic VS Code API mocks
vi.mock('vscode', () => {
  return {
    default: {
      workspace: {
        workspaceFolders: [{ uri: { fsPath: '/mock/workspace' }, name: 'mock-workspace' }],
        getConfiguration: vi.fn(() => ({ get: vi.fn(), update: vi.fn() })),
        onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
        onDidChangeWorkspaceFolders: vi.fn(() => ({ dispose: vi.fn() })),
        findFiles: vi.fn(() => Promise.resolve([]))
      },
      window: {
        showInformationMessage: vi.fn(() => Promise.resolve()),
        showErrorMessage: vi.fn(() => Promise.resolve()),
        createOutputChannel: vi.fn(() => ({ append: vi.fn(), appendLine: vi.fn(), show: vi.fn(), dispose: vi.fn() }))
      },
      commands: {
        registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
        executeCommand: vi.fn(() => Promise.resolve())
      }
    }
  };
});

// Basic fs mocks
vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
  readFileSync: vi.fn(() => 'mock content'),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(() => []),
  statSync: vi.fn(() => ({ isDirectory: () => false, isFile: () => true }))
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(() => Promise.resolve('mock content')),
  writeFile: vi.fn(() => Promise.resolve()),
  mkdir: vi.fn(() => Promise.resolve()),
  readdir: vi.fn(() => Promise.resolve([])),
  stat: vi.fn(() => Promise.resolve({ isDirectory: () => false, isFile: () => true }))
}));

// Mock process for path resolution
vi.mock('process', () => ({
  cwd: vi.fn(() => '/mock/workspace'),
  env: { NODE_ENV: 'test', CI: 'true', ...process.env },
  platform: process.platform,
  versions: process.versions
}));

// Basic path mocks
vi.mock('path', async () => {
  const actual = await vi.importActual('path') as any;
  return {
    join: actual.join,
    resolve: actual.resolve,
    dirname: actual.dirname,
    basename: actual.basename,
    extname: actual.extname,
    relative: actual.relative
  };
});

// Mock axios for HTTP calls
vi.mock('axios', () => ({
  create: vi.fn(() => ({
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} }))
  })),
  get: vi.fn(() => Promise.resolve({ data: {} })),
  post: vi.fn(() => Promise.resolve({ data: {} }))
}));

// Mock console to reduce noise
global.console = {
  ...console,
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
};

// Mock timers for consistent timing
vi.mock('timers', () => ({
  setTimeout: vi.fn((callback) => {
    callback();
    return 'mock-timer';
  }),
  clearTimeout: vi.fn(),
  setInterval: vi.fn(() => 'mock-interval'),
  clearInterval: vi.fn()
}));

// Mock crypto for consistent IDs
vi.mock('crypto', () => ({
  randomBytes: vi.fn(() => Buffer.from('mock-random')),
  randomUUID: vi.fn(() => 'mock-uuid-1234')
}));

console.log('✅ Minimal test setup loaded');
