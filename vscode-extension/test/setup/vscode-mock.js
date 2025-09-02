/**
 * VSCode API Mock Setup (CommonJS version)
 * 
 * Provides comprehensive mocking for VSCode API to enable proper testing
 * of extension components without requiring the actual VSCode environment.
 */

const sinon = require('sinon');

/**
 * Create comprehensive VSCode API mock
 */
function createVSCodeMock() {
  const mockCommands = {
    // Command registration and execution tracking
    _registeredCommands: new Map(),
    _registrationHistory: [],
    _executionHistory: [],
    
    registerCommand: function(command, callback) {
      // Store registered commands for testing
      this._registeredCommands.set(command, callback);
      
      // Track registration history for testing
      const registration = {
        command,
        timestamp: Date.now(),
        disposed: false,
        type: 'command'
      };
      this._registrationHistory.push(registration);
      
      return { 
        dispose: () => {
          this._registeredCommands.delete(command);
          // Mark as disposed in history
          registration.disposed = true;
          registration.disposedAt = Date.now();
        }
      };
    },
    
    registerTextEditorCommand: function(command, callback) {
      // Similar to registerCommand but for text editor commands
      this._registeredCommands.set(command, callback);
      
      const registration = {
        command,
        type: 'textEditor',
        timestamp: Date.now(),
        disposed: false
      };
      this._registrationHistory.push(registration);
      
      return { 
        dispose: () => {
          this._registeredCommands.delete(command);
          registration.disposed = true;
          registration.disposedAt = Date.now();
        }
      };
    },
    
    executeCommand: async function(command, ...args) {
      const executionStart = Date.now();
      
      try {
        let result;
        
        // Handle built-in VSCode commands
        switch (command) {
          case 'vscode.open':
            result = { opened: true, uri: args[0] };
            break;
          case 'setContext':
            result = { context: args[0], value: args[1] };
            break;
          case 'revealInExplorer':
            result = { revealed: true, uri: args[0] };
            break;
          case 'workbench.action.files.newUntitledFile':
            result = { created: true, type: 'untitled' };
            break;
          case 'workbench.action.showCommands':
            result = { commandPalette: 'opened' };
            break;
          case 'workbench.action.quickOpen':
            result = { quickOpen: 'opened' };
            break;
          default:
            // Check if it's a registered command
            const registeredCallback = this._registeredCommands.get(command);
            if (registeredCallback) {
              result = await registeredCallback(...args);
            } else {
              // Command not found - simulate VSCode behavior
              throw new Error(`Command '${command}' not found`);
            }
        }
        
        // Record successful execution
        this._executionHistory.push({
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
        this._executionHistory.push({
          command,
          args,
          error: error.message,
          success: false,
          executionTime: Date.now() - executionStart,
          timestamp: executionStart
        });
        throw error;
      }
    },
    
    getCommands: async function(filterInternal = false) {
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
      
      const registeredCommands = Array.from(this._registeredCommands.keys());
      const allCommands = [...builtInCommands, ...registeredCommands];
      
      // Filter internal commands if requested (like real VSCode)
      if (filterInternal) {
        return allCommands.filter(cmd => !cmd.startsWith('_'));
      }
      
      return allCommands;
    },
    
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
    
    isCommandRegistered: function(command) {
      return this._registeredCommands.has(command);
    },
    
    getCommandExecutionCount: function(command) {
      return this._executionHistory.filter(entry => entry.command === command).length;
    },
    
    simulateCommandPaletteExecution: async function(command, ...args) {
      // Simulate command execution from command palette
      try {
        const result = await this.executeCommand(command, ...args);
        return { success: true, result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  };

  const mockWindow = {
    _mockConfig: {},
    _messageHistory: [],
    _interactionHistory: [],
    
    showInformationMessage: async function(message, ...items) {
      const mockConfig = this._mockConfig || {};
      
      // Handle options object as first parameter
      let options = {};
      let actionItems = [];
      
      if (items.length > 0) {
        if (typeof items[0] === 'object' && items[0] !== null && !Array.isArray(items[0]) && typeof items[0] !== 'string') {
          options = items[0];
          actionItems = items.slice(1);
        } else {
          actionItems = items;
        }
      }
      
      // Store message for test verification
      this._messageHistory.push({
        type: 'information',
        message,
        items: actionItems,
        options,
        timestamp: Date.now()
      });
      
      // Handle modal behavior
      if (options.modal) {
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
    
    showWarningMessage: async function(message, ...items) {
      const mockConfig = this._mockConfig || {};
      
      let options = {};
      let actionItems = [];
      
      if (items.length > 0) {
        if (typeof items[0] === 'object' && items[0] !== null && !Array.isArray(items[0]) && typeof items[0] !== 'string') {
          options = items[0];
          actionItems = items.slice(1);
        } else {
          actionItems = items;
        }
      }
      
      this._messageHistory.push({
        type: 'warning',
        message,
        items: actionItems,
        options,
        timestamp: Date.now()
      });
      
      if (options.modal) {
        return mockConfig.modalResponse || (actionItems.length > 0 ? actionItems[0] : 'OK');
      }
      
      if (mockConfig.simulateCancel) {
        return undefined;
      }
      
      if (mockConfig.warningResponse !== undefined) {
        return mockConfig.warningResponse;
      }
      
      return actionItems.length > 0 ? actionItems[0] : undefined;
    },
    
    showErrorMessage: async function(message, ...items) {
      const mockConfig = this._mockConfig || {};
      
      let options = {};
      let actionItems = [];
      
      if (items.length > 0) {
        if (typeof items[0] === 'object' && items[0] !== null && !Array.isArray(items[0]) && typeof items[0] !== 'string') {
          options = items[0];
          actionItems = items.slice(1);
        } else {
          actionItems = items;
        }
      }
      
      this._messageHistory.push({
        type: 'error',
        message,
        items: actionItems,
        options,
        timestamp: Date.now()
      });
      
      if (options.modal) {
        return mockConfig.modalResponse || (actionItems.length > 0 ? actionItems[0] : 'OK');
      }
      
      if (mockConfig.simulateCancel) {
        return undefined;
      }
      
      if (mockConfig.errorResponse !== undefined) {
        return mockConfig.errorResponse;
      }
      
      return actionItems.length > 0 ? actionItems[0] : undefined;
    },
    
    showQuickPick: async function(items, options) {
      const mockConfig = this._mockConfig || {};
      
      // Store interaction for test verification
      this._interactionHistory.push({
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
      if (options && options.canPickMany) {
        const selectedItems = Array.isArray(items) && items.length > 0 ? [items[0]] : [];
        return selectedItems;
      }
      
      // Handle cancellation
      if (mockConfig.simulateCancel) {
        return undefined;
      }
      
      // Default behavior: return first item
      if (Array.isArray(items) && items.length > 0) {
        return items[0];
      }
      return undefined;
    },
    
    showInputBox: async function(options) {
      const mockConfig = this._mockConfig || {};
      
      // Store interaction for test verification
      this._interactionHistory.push({
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
      if (options && options.validateInput && mockConfig.inputValidationError) {
        return undefined;
      }
      
      // Return configured value, prompt value, or default
      return mockConfig.inputValue || (options && options.value) || (options && options.prompt) || 'mock-input';
    },
    
    // Configuration methods for tests
    setMockConfig: function(config) {
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
    }
  };

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
    
    getConfiguration: function(section) {
      const configs = {
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
        get: function(key, defaultValue) {
          return config[key] !== undefined ? config[key] : defaultValue;
        },
        has: function(key) {
          return config[key] !== undefined;
        },
        inspect: function() {
          return {
            key: section,
            defaultValue: undefined,
            globalValue: undefined,
            workspaceValue: config,
            workspaceFolderValue: undefined
          };
        },
        update: async function() {
          return Promise.resolve();
        }
      };
    },
    
    findFiles: async function(include) {
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
    },
    
    fs: {
      readFile: async function(uri) {
        const path = uri.fsPath || uri.path;
        if (path && path.includes('README')) {
          return Buffer.from('# Mock README\n\nThis is a mock README file for testing.\n\n## Installation\n\n```bash\nnpm install\n```\n\n## Testing\n\n```bash\nnpm test\n```');
        }
        if (path && path.includes('.github/workflows')) {
          return Buffer.from('name: CI\non:\n  push:\n    branches: [main]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4');
        }
        return Buffer.from('mock content');
      }
    }
  };

  return {
    workspace: mockWorkspace,
    window: mockWindow,
    commands: mockCommands,
    Uri: {
      file: function(path) {
        return {
          fsPath: path,
          scheme: 'file',
          path: path,
          toString: () => `file://${path}`
        };
      }
    },
    version: '1.74.0',
    env: {
      appName: 'Visual Studio Code',
      appRoot: '/mock/vscode',
      language: 'en'
    }
  };
}

/**
 * Setup VSCode mock in global scope
 */
function setupVSCodeMock() {
  const vscode = createVSCodeMock();
  
  // Mock the vscode module
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  
  Module.prototype.require = function(id) {
    if (id === 'vscode') {
      return vscode;
    }
    return originalRequire.apply(this, arguments);
  };
  
  return vscode;
}

/**
 * Cleanup VSCode mock
 */
function cleanupVSCodeMock() {
  const Module = require('module');
  // Restore original require if it exists
  if (Module.prototype.require) {
    delete Module.prototype.require;
  }
  if (typeof sinon !== 'undefined' && sinon.restore) {
    sinon.restore();
  }
}

/**
 * Create mock extension context
 */
function createMockExtensionContext() {
  return {
    subscriptions: [],
    workspaceState: {
      get: function(key, defaultValue) {
        return defaultValue;
      },
      update: async function() {
        return Promise.resolve();
      }
    },
    globalState: {
      get: function(key, defaultValue) {
        return defaultValue;
      },
      update: async function() {
        return Promise.resolve();
      }
    },
    extensionPath: '/mock/extension',
    extensionUri: {
      fsPath: '/mock/extension',
      scheme: 'file',
      path: '/mock/extension'
    },
    storageUri: {
      fsPath: '/mock/storage',
      scheme: 'file',
      path: '/mock/storage'
    },
    globalStorageUri: {
      fsPath: '/mock/global-storage',
      scheme: 'file',
      path: '/mock/global-storage'
    },
    logUri: {
      fsPath: '/mock/logs',
      scheme: 'file',
      path: '/mock/logs'
    }
  };
}

module.exports = {
  createVSCodeMock,
  setupVSCodeMock,
  cleanupVSCodeMock,
  createMockExtensionContext
};