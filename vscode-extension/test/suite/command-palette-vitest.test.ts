/**
 * Command Palette Integration Tests (Vitest Compatible)
 * 
 * Tests for VSCode command palette integration mocking,
 * including command discovery, execution, and user interaction.
 */

import { describe, it, beforeEach, expect, vi } from 'vitest';

// Mock VSCode API with enhanced command palette support
const mockCommands = {
  _registeredCommands: new Map(),
  _registrationHistory: [] as any[],
  _executionHistory: [] as any[],
  
  registerCommand: function(command: string, callback: Function) {
    this._registeredCommands.set(command, callback);
    
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
        registration.disposed = true;
        registration.disposedAt = Date.now();
      }
    };
  },
  
  executeCommand: async function(command: string, ...args: any[]) {
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
        case 'workbench.action.showCommands':
          result = { commandPalette: 'opened' };
          break;
        case 'workbench.action.quickOpen':
          result = { quickOpen: 'opened' };
          break;
        default:
          const registeredCallback = this._registeredCommands.get(command);
          if (registeredCallback) {
            result = await registeredCallback(...args);
          } else {
            throw new Error(`Command '${command}' not found`);
          }
      }
      
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
      this._executionHistory.push({
        command,
        args,
        error: (error as Error).message,
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
      'workbench.action.showCommands',
      'workbench.action.quickOpen',
      'workbench.action.openSettings',
      'workbench.action.reloadWindow'
    ];
    
    const registeredCommands = Array.from(this._registeredCommands.keys());
    const allCommands = [...builtInCommands, ...registeredCommands];
    
    if (filterInternal) {
      return allCommands.filter(cmd => !cmd.startsWith('_'));
    }
    
    return allCommands;
  },
  
  simulateCommandPaletteExecution: async function(command: string, ...args: any[]) {
    try {
      const result = await this.executeCommand(command, ...args);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
  
  // Testing helper methods
  getRegisteredCommands: function() {
    return Array.from(this._registeredCommands.keys());
  },
  
  getExecutionHistory: function() {
    return [...this._executionHistory];
  },
  
  clearHistory: function() {
    this._registrationHistory = [];
    this._executionHistory = [];
  },
  
  getCommandExecutionCount: function(command: string) {
    return this._executionHistory.filter((entry: any) => entry.command === command).length;
  }
};

const mockWindow = {
  _mockConfig: {} as any,
  _messageHistory: [] as any[],
  _interactionHistory: [] as any[],
  
  showInformationMessage: async function(message: string, ...items: any[]) {
    this._messageHistory.push({
      type: 'information',
      message,
      items,
      timestamp: Date.now()
    });
    
    if (this._mockConfig.informationResponse !== undefined) {
      return this._mockConfig.informationResponse;
    }
    
    return items.length > 0 ? items[0] : 'OK';
  },
  
  showQuickPick: async function(items: any[], options?: any) {
    this._interactionHistory.push({
      type: 'quickPick',
      items,
      options,
      timestamp: Date.now()
    });
    
    if (this._mockConfig.quickPickResponse !== undefined) {
      return this._mockConfig.quickPickResponse;
    }
    
    if (options?.canPickMany) {
      return Array.isArray(items) && items.length > 0 ? [items[0]] : [];
    }
    
    if (this._mockConfig.simulateCancel) {
      return undefined;
    }
    
    return Array.isArray(items) && items.length > 0 ? items[0] : undefined;
  },
  
  showInputBox: async function(options?: any) {
    this._interactionHistory.push({
      type: 'inputBox',
      options,
      timestamp: Date.now()
    });
    
    if (this._mockConfig.inputBoxResponse !== undefined) {
      return this._mockConfig.inputBoxResponse;
    }
    
    if (this._mockConfig.simulateCancel) {
      return undefined;
    }
    
    return this._mockConfig.inputValue || (options?.value) || (options?.prompt) || 'mock-input';
  },
  
  setMockConfig: function(config: any) {
    this._mockConfig = { ...this._mockConfig, ...config };
  },
  
  resetMockConfig: function() {
    this._mockConfig = {};
    this._messageHistory = [];
    this._interactionHistory = [];
  },
  
  getInteractionHistory: function() {
    return [...this._interactionHistory];
  }
};

const mockWorkspace = {
  workspaceFolders: [{
    uri: { fsPath: '/mock/workspace' },
    name: 'mock-workspace',
    index: 0
  }],
  
  findFiles: async function(pattern: string) {
    if (pattern.includes('README')) {
      return [{
        fsPath: '/mock/workspace/README.md',
        scheme: 'file',
        path: '/mock/workspace/README.md',
        toString: () => 'file:///mock/workspace/README.md'
      }];
    }
    if (pattern.includes('.github/workflows')) {
      return [{
        fsPath: '/mock/workspace/.github/workflows/ci.yml',
        scheme: 'file',
        path: '/mock/workspace/.github/workflows/ci.yml',
        toString: () => 'file:///mock/workspace/.github/workflows/ci.yml'
      }];
    }
    return [];
  },
  
  fs: {
    readFile: async function(uri: any) {
      const path = uri.fsPath || uri.path;
      if (path?.includes('README')) {
        return Buffer.from('# Mock README\n\nThis is a mock README file for testing.\n\n## Installation\n\n```bash\nnpm install\n```\n\n## Testing\n\n```bash\nnpm test\n```');
      }
      return Buffer.from('mock content');
    }
  }
};

// Mock the vscode module
vi.mock('vscode', () => ({
  commands: mockCommands,
  window: mockWindow,
  workspace: mockWorkspace,
  Uri: {
    file: (path: string) => ({
      fsPath: path,
      scheme: 'file',
      path: path,
      toString: () => `file://${path}`
    })
  }
}));

describe('Command Palette Integration Tests', () => {
  beforeEach(() => {
    // Reset mock state
    mockCommands._registeredCommands.clear();
    mockCommands._registrationHistory = [];
    mockCommands._executionHistory = [];
    mockWindow.resetMockConfig();
  });

  describe('Command Discovery', () => {
    it('should discover extension commands in command palette', async () => {
      // Register README-to-CICD extension commands
      const extensionCommands = [
        {
          id: 'readme-to-cicd.generate',
          title: 'README to CI/CD: Generate Workflows',
          callback: vi.fn().mockResolvedValue({ generated: true })
        },
        {
          id: 'readme-to-cicd.validate',
          title: 'README to CI/CD: Validate Workflows',
          callback: vi.fn().mockResolvedValue({ valid: true })
        },
        {
          id: 'readme-to-cicd.preview',
          title: 'README to CI/CD: Preview Workflows',
          callback: vi.fn().mockResolvedValue({ preview: 'workflow content' })
        }
      ];

      // Register commands
      const disposables = extensionCommands.map(cmd => 
        mockCommands.registerCommand(cmd.id, cmd.callback)
      );

      // Get all available commands (simulating command palette)
      const allCommands = await mockCommands.getCommands();

      // Verify extension commands are discoverable
      extensionCommands.forEach(cmd => {
        expect(allCommands.includes(cmd.id)).toBe(true);
      });

      // Verify built-in commands are also available
      expect(allCommands.includes('vscode.open')).toBe(true);
      expect(allCommands.includes('workbench.action.showCommands')).toBe(true);

      // Cleanup
      disposables.forEach(disposable => disposable.dispose());
    });

    it('should filter commands based on context', async () => {
      // Register commands with different contexts
      const commands = [
        { id: 'readme-to-cicd.generate', context: 'workspace' },
        { id: 'readme-to-cicd.validate', context: 'editor' },
        { id: 'readme-to-cicd.preview', context: 'any' }
      ];

      commands.forEach(cmd => {
        mockCommands.registerCommand(cmd.id, vi.fn());
      });

      // Get commands with filtering
      const publicCommands = await mockCommands.getCommands(true);
      
      // Verify filtering works (no internal commands)
      const internalCommands = publicCommands.filter((cmd: string) => cmd.startsWith('_'));
      expect(internalCommands.length).toBe(0);

      // Verify extension commands are included
      commands.forEach(cmd => {
        expect(publicCommands.includes(cmd.id)).toBe(true);
      });
    });
  });

  describe('Command Execution from Palette', () => {
    it('should execute commands from command palette with arguments', async () => {
      const commandId = 'readme-to-cicd.generate';
      const expectedArgs = ['ci', 'cd'];
      const expectedResult = { 
        workflows: ['ci.yml', 'cd.yml'],
        success: true 
      };
      
      const commandCallback = vi.fn().mockResolvedValue(expectedResult);
      
      // Register command
      mockCommands.registerCommand(commandId, commandCallback);
      
      // Simulate command palette execution with arguments
      const result = await mockCommands.simulateCommandPaletteExecution(
        commandId, 
        ...expectedArgs
      );
      
      // Verify execution
      expect(result.success).toBe(true);
      expect(result.result).toEqual(expectedResult);
      
      // Verify callback was called with correct arguments
      expect(commandCallback).toHaveBeenCalledOnce();
      expect(commandCallback).toHaveBeenCalledWith(...expectedArgs);
    });

    it('should handle command palette execution with user interaction', async () => {
      const commandId = 'readme-to-cicd.generate';
      
      const commandCallback = vi.fn().mockImplementation(async () => {
        // Simulate command that requires user input
        const workflowTypes = await mockWindow.showQuickPick(
          ['ci', 'cd', 'both'],
          { placeHolder: 'Select workflow types to generate' }
        );
        
        if (!workflowTypes) {
          throw new Error('User cancelled workflow generation');
        }
        
        return { workflowTypes, generated: true };
      });
      
      // Register command
      mockCommands.registerCommand(commandId, commandCallback);
      
      // Configure mock user response
      mockWindow.setMockConfig({ quickPickResponse: 'both' });
      
      // Execute command from palette
      const result = await mockCommands.simulateCommandPaletteExecution(commandId);
      
      // Verify result
      expect(result.success).toBe(true);
      expect(result.result).toEqual({ workflowTypes: 'both', generated: true });
    });

    it('should handle command palette execution errors gracefully', async () => {
      const commandId = 'readme-to-cicd.validate';
      const expectedError = 'No README file found in workspace';
      
      const commandCallback = vi.fn().mockRejectedValue(new Error(expectedError));
      
      // Register command
      mockCommands.registerCommand(commandId, commandCallback);
      
      // Execute command from palette
      const result = await mockCommands.simulateCommandPaletteExecution(commandId);
      
      // Verify error handling
      expect(result.success).toBe(false);
      expect(result.error).toBe(expectedError);
      
      // Verify error is tracked in execution history
      const executionHistory = mockCommands.getExecutionHistory();
      const execution = executionHistory.find((entry: any) => entry.command === commandId);
      expect(execution).toBeTruthy();
      expect(execution.success).toBe(false);
      expect(execution.error).toBe(expectedError);
    });
  });

  describe('Command Palette UI Integration', () => {
    it('should simulate command palette opening', async () => {
      // Execute command palette command
      const result = await mockCommands.executeCommand('workbench.action.showCommands');
      
      // Verify command palette command execution
      expect(result).toEqual({ commandPalette: 'opened' });
      
      // Verify execution is tracked
      const executionHistory = mockCommands.getExecutionHistory();
      const execution = executionHistory.find((entry: any) => 
        entry.command === 'workbench.action.showCommands'
      );
      expect(execution).toBeTruthy();
      expect(execution.success).toBe(true);
    });

    it('should simulate quick open integration', async () => {
      // Execute quick open command
      const result = await mockCommands.executeCommand('workbench.action.quickOpen');
      
      // Verify quick open command execution
      expect(result).toEqual({ quickOpen: 'opened' });
      
      // Verify execution is tracked
      const executionHistory = mockCommands.getExecutionHistory();
      const execution = executionHistory.find((entry: any) => 
        entry.command === 'workbench.action.quickOpen'
      );
      expect(execution).toBeTruthy();
      expect(execution.success).toBe(true);
    });

    it('should handle command palette search and filtering', async () => {
      // Register commands with different prefixes
      const commands = [
        'readme-to-cicd.generate',
        'readme-to-cicd.validate',
        'readme-to-cicd.preview',
        'other.extension.command',
        'builtin.command'
      ];
      
      commands.forEach(cmd => {
        mockCommands.registerCommand(cmd, vi.fn());
      });
      
      // Get all commands
      const allCommands = await mockCommands.getCommands();
      
      // Simulate filtering by prefix (like command palette search)
      const readmeCommands = allCommands.filter((cmd: string) => 
        cmd.startsWith('readme-to-cicd.')
      );
      
      // Verify filtering works
      expect(readmeCommands.length).toBe(3);
      expect(readmeCommands.includes('readme-to-cicd.generate')).toBe(true);
      expect(readmeCommands.includes('readme-to-cicd.validate')).toBe(true);
      expect(readmeCommands.includes('readme-to-cicd.preview')).toBe(true);
    });
  });

  describe('Extension Command Integration', () => {
    it('should integrate with README-to-CICD extension commands', async () => {
      // Mock extension activation with all commands
      const extensionCommands = [
        {
          id: 'readme-to-cicd.generate',
          implementation: vi.fn().mockResolvedValue({
            success: true,
            workflows: ['ci.yml', 'cd.yml'],
            readmeAnalyzed: true
          })
        },
        {
          id: 'readme-to-cicd.validate',
          implementation: vi.fn().mockResolvedValue({
            success: true,
            validWorkflows: 2,
            issues: []
          })
        },
        {
          id: 'readme-to-cicd.preview',
          implementation: vi.fn().mockResolvedValue({
            success: true,
            preview: 'name: CI\non: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest'
          })
        },
        {
          id: 'readme-to-cicd.init',
          implementation: vi.fn().mockImplementation(async () => {
            // Simulate project initialization
            const projectName = await mockWindow.showInputBox({
              prompt: 'Enter project name'
            });
            
            if (!projectName) {
              throw new Error('Project name is required');
            }
            
            return {
              success: true,
              projectName,
              initialized: true
            };
          })
        },
        {
          id: 'readme-to-cicd.refresh',
          implementation: vi.fn().mockResolvedValue({
            success: true,
            refreshed: true,
            timestamp: Date.now()
          })
        }
      ];
      
      // Register all extension commands
      const disposables = extensionCommands.map(cmd => 
        mockCommands.registerCommand(cmd.id, cmd.implementation)
      );
      
      // Test each command execution from command palette
      for (const cmd of extensionCommands) {
        // Configure user input for init command
        if (cmd.id === 'readme-to-cicd.init') {
          mockWindow.setMockConfig({ inputBoxResponse: 'test-project' });
        }
        
        const result = await mockCommands.simulateCommandPaletteExecution(cmd.id);
        
        expect(result.success).toBe(true);
        expect(result.result.success).toBe(true);
      }
      
      // Verify all commands were executed
      extensionCommands.forEach(cmd => {
        expect(mockCommands.getCommandExecutionCount(cmd.id)).toBe(1);
      });
      
      // Cleanup
      disposables.forEach(disposable => disposable.dispose());
    });

    it('should handle extension command dependencies', async () => {
      let workspaceInitialized = false;
      
      // Register commands with dependencies
      const initCommand = mockCommands.registerCommand('readme-to-cicd.init', vi.fn().mockImplementation(async () => {
        workspaceInitialized = true;
        return { initialized: true };
      }));
      
      const generateCommand = mockCommands.registerCommand('readme-to-cicd.generate', vi.fn().mockImplementation(async () => {
        if (!workspaceInitialized) {
          throw new Error('Workspace must be initialized first. Run "README to CI/CD: Initialize" command.');
        }
        return { generated: true };
      }));
      
      // Try to generate without initialization
      let result = await mockCommands.simulateCommandPaletteExecution('readme-to-cicd.generate');
      expect(result.success).toBe(false);
      expect(result.error).toContain('initialized first');
      
      // Initialize workspace
      result = await mockCommands.simulateCommandPaletteExecution('readme-to-cicd.init');
      expect(result.success).toBe(true);
      
      // Now generate should work
      result = await mockCommands.simulateCommandPaletteExecution('readme-to-cicd.generate');
      expect(result.success).toBe(true);
      
      // Cleanup
      initCommand.dispose();
      generateCommand.dispose();
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle rapid command executions', async () => {
      const commandId = 'readme-to-cicd.rapid';
      const executionCount = 10;
      
      const commandCallback = vi.fn().mockImplementation(async (index: number) => {
        // Simulate some async work
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
        return { index, completed: true };
      });
      
      // Register command
      mockCommands.registerCommand(commandId, commandCallback);
      
      // Execute command rapidly
      const promises = Array.from({ length: executionCount }, (_, i) =>
        mockCommands.simulateCommandPaletteExecution(commandId, i)
      );
      
      const results = await Promise.all(promises);
      
      // Verify all executions completed successfully
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.result.index).toBe(index);
      });
      
      // Verify execution count
      expect(mockCommands.getCommandExecutionCount(commandId)).toBe(executionCount);
    });

    it('should track command execution performance', async () => {
      const commandId = 'readme-to-cicd.performance';
      
      const commandCallback = vi.fn().mockImplementation(async (delay: number) => {
        await new Promise(resolve => setTimeout(resolve, delay));
        return { delay, completed: true };
      });
      
      // Register command
      mockCommands.registerCommand(commandId, commandCallback);
      
      // Execute command with different delays
      const delays = [10, 50, 100];
      for (const delay of delays) {
        await mockCommands.simulateCommandPaletteExecution(commandId, delay);
      }
      
      // Analyze execution performance
      const executionHistory = mockCommands.getExecutionHistory();
      const commandExecutions = executionHistory.filter((entry: any) => entry.command === commandId);
      
      expect(commandExecutions.length).toBe(delays.length);
      
      // Verify execution times are tracked
      commandExecutions.forEach((execution: any, index: number) => {
        expect(execution.executionTime).toBeGreaterThanOrEqual(delays[index]);
        expect(execution.timestamp).toBeTruthy();
      });
    });
  });
});