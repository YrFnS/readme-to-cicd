/**
 * Test Global Setup
 * 
 * Sets up global test environment with proper mocking and configuration
 * to handle VSCode extension testing requirements.
 */

import { setupVSCodeMock, createMockAJV } from './vscode-mock';

// Setup global test environment
export function setupTestGlobals(): void {
  // Setup VSCode API mocks
  setupVSCodeMock();
  
  // Mock AJV for validation tests
  const mockAJV = createMockAJV();
  (global as any).Ajv = () => mockAJV;
  
  // Mock common Node.js modules that might be missing in test environment
  const mockFS = {
    readFileSync: () => '{}',
    writeFileSync: () => {},
    existsSync: () => true,
    mkdirSync: () => {},
    readdirSync: () => [],
    statSync: () => ({ isDirectory: () => false, isFile: () => true })
  };
  
  const mockPath = {
    join: (...args: string[]) => args.join('/'),
    resolve: (...args: string[]) => '/' + args.join('/'),
    dirname: (p: string) => p.split('/').slice(0, -1).join('/'),
    basename: (p: string) => p.split('/').pop() || '',
    extname: (p: string) => {
      const parts = p.split('.');
      return parts.length > 1 ? '.' + parts.pop() : '';
    }
  };
  
  // Mock require for modules that might not be available
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  
  Module.prototype.require = function(id: string) {
    switch (id) {
      case 'fs':
        return mockFS;
      case 'path':
        return mockPath;
      case 'ajv':
        return () => mockAJV;
      case 'ajv-formats':
        return { addFormats: () => {} };
      default:
        try {
          return originalRequire.apply(this, arguments);
        } catch (error) {
          // Return empty mock for missing modules
          console.warn(`Mocking missing module: ${id}`);
          return {};
        }
    }
  };
  
  // Setup console methods for testing
  if (!global.console) {
    (global as any).console = {
      log: () => {},
      warn: () => {},
      error: () => {},
      info: () => {},
      debug: () => {}
    };
  }
  
  // Setup process object for testing
  if (!global.process) {
    (global as any).process = {
      platform: 'test',
      arch: 'x64',
      version: 'v16.0.0',
      memoryUsage: () => ({ rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 }),
      env: {},
      cwd: () => '/test',
      exit: () => {}
    };
  }
}

// Cleanup test globals
export function cleanupTestGlobals(): void {
  // Restore original require
  const Module = require('module');
  delete Module.prototype.require;
  
  // Clean up global mocks
  delete (global as any).Ajv;
  delete (global as any).acquireVsCodeApi;
}