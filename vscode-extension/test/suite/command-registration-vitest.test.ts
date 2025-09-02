/**
 * Command Registration Mock Tests (Vitest Compatible)
 * 
 * Tests for VSCode command registration and execution mocking,
 * including command palette integration and lifecycle management.
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';

// Mock VSCode API
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
  
  registerTextEditorCommand: function(command: string, callback: Function) {
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
      'workbench.action.quickOpen'
    ];
    
    const registeredCommands = Array.from(this._registeredCommands.keys());
    const allCommands = [...builtInCommands, ...registeredCommands];
    
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
  
  isCommandRegistered: function(command: string) {
    return this._registeredCommands.has(command);
  },
  
  getCommandExecutionCount: function(command: string) {
    return this._executionHistory.filter((entry: any) => entry.command === command).length;
  },
  
  simulateCommandPaletteExecution: async function(command: string, ...args: any[]) {
    try {
      const result = await this.executeCommand(command, ...args);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
};

const mockWindow = {
  _mockConfig: {} as any,
  _messageHistory: [] as any[],
  
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
  
  setMockConfig: function(config: any) {
    this._mockConfig = { ...this._mockConfig, ...config };
  },
  
  resetMockConfig: function() {
    this._mockConfig = {};
    this._messageHistory = [];
  },
  
  getMessageHistory: function() {
    return [...this._messageHistory];
  }
};

// Mock the vscode module
vi.mock('vscode', () => ({
  commands: mockCommands,
  window: mockWindow,
  workspace: {
    workspaceFolders: [{
      uri: { fsPath: '/mock/workspace' },
      name: 'mock-workspace',
      index: 0
    }]
  },
  Uri: {
    file: (path: string) => ({
      fsPath: path,
      scheme: 'file',
      path: path,
      toString: () => `file://${path}`
    })
  }
}));

describe('Command Registration Mock Tests', () => {
  beforeEach(() => {
    // Reset mock state
    mockCommands._registeredCommands.clear();
    mockCommands._registrationHistory = [];
    mockCommands._executionHistory = [];
    mockWindow.resetMockConfig();
  });

  describe('Command Registration', () => {
    it('should register commands and track registration', async () => {
      const commandId = 'test.command';
      const commandCallback = vi.fn().mockResolvedValue('test result');
      
      // Register command
      const disposable = mockCommands.registerCommand(commandId, commandCallback);
      
      // Verify command is registered
      expect(mockCommands.isCommandRegistered(commandId)).toBe(true);
      
      // Verify registration history
      const history = mockCommands.getRegistrationHistory();
      const registration = history.find((entry: any) => entry.command === commandId);
      expect(registration).toBeTruthy();
      expect(registration.disposed).toBe(false);
      expect(registration.timestamp).toBeTruthy();
      
      // Verify command appears in command list
      const commands = await mockCommands.getCommands();
      expect(commands.includes(commandId)).toBe(true);
      
      // Dispose command
      disposable.dispose();
      
      // Verify command is no longer registered
      expect(mockCommands.isCommandRegistered(commandId)).toBe(false);
      
      // Verify disposal is tracked
      expect(registration.disposed).toBe(true);
      expect(registration.disposedAt).toBeTruthy();
    });

    it('should register text editor commands', async () => {
      const commandId = 'test.textEditorCommand';
      const commandCallback = vi.fn().mockResolvedValue('editor result');
      
      // Register text editor command
      const disposable = mockCommands.registerTextEditorCommand(commandId, commandCallback);
      
      // Verify command is registered
      expect(mockCommands.isCommandRegistered(commandId)).toBe(true);
      
      // Verify registration type is tracked
      const history = mockCommands.getRegistrationHistory();
      const registration = history.find((entry: any) => entry.command === commandId);
      expect(registration.type).toBe('textEditor');
      
      disposable.dispose();
    });

    it('should handle multiple command registrations', async () => {
      const commands = [
        'readme-to-cicd.generate',
        'readme-to-cicd.validate',
        'readme-to-cicd.preview',
        'readme-to-cicd.init',
        'readme-to-cicd.refresh'
      ];
      
      const disposables: any[] = [];
      
      // Register multiple commands
      for (const commandId of commands) {
        const callback = vi.fn().mockResolvedValue(`result for ${commandId}`);
        const disposable = mockCommands.registerCommand(commandId, callback);
        disposables.push(disposable);
      }
      
      // Verify all commands are registered
      for (const commandId of commands) {
        expect(mockCommands.isCommandRegistered(commandId)).toBe(true);
      }
      
      // Verify command count
      const registeredCommands = mockCommands.getRegisteredCommands();
      const extensionCommands = registeredCommands.filter((cmd: string) => 
        cmd.startsWith('readme-to-cicd.')
      );
      expect(extensionCommands.length).toBe(commands.length);
      
      // Dispose all commands
      disposables.forEach(disposable => disposable.dispose());
      
      // Verify all commands are disposed
      for (const commandId of commands) {
        expect(mockCommands.isCommandRegistered(commandId)).toBe(false);
      }
    });
  });

  describe('Command Execution', () => {
    it('should execute registered commands and track execution', async () => {
      const commandId = 'test.executeCommand';
      const expectedResult = { success: true, data: 'test data' };
      const commandCallback = vi.fn().mockResolvedValue(expectedResult);
      
      // Register command
      mockCommands.registerCommand(commandId, commandCallback);
      
      // Execute command
      const result = await mockCommands.executeCommand(commandId, 'arg1', 'arg2');
      
      // Verify result
      expect(result).toEqual(expectedResult);
      
      // Verify callback was called with correct arguments
      expect(commandCallback).toHaveBeenCalledOnce();
      expect(commandCallback).toHaveBeenCalledWith('arg1', 'arg2');
      
      // Verify execution history
      const executionHistory = mockCommands.getExecutionHistory();
      const execution = executionHistory.find((entry: any) => entry.command === commandId);
      expect(execution).toBeTruthy();
      expect(execution.success).toBe(true);
      expect(execution.result).toEqual(expectedResult);
      expect(execution.args).toEqual(['arg1', 'arg2']);
      expect(execution.executionTime).toBeGreaterThanOrEqual(0);
      expect(execution.timestamp).toBeTruthy();
      
      // Verify execution count
      expect(mockCommands.getCommandExecutionCount(commandId)).toBe(1);
    });

    it('should handle command execution errors', async () => {
      const commandId = 'test.errorCommand';
      const expectedError = new Error('Test command error');
      const commandCallback = vi.fn().mockRejectedValue(expectedError);
      
      // Register command
      mockCommands.registerCommand(commandId, commandCallback);
      
      // Execute command and expect error
      await expect(mockCommands.executeCommand(commandId)).rejects.toThrow('Test command error');
      
      // Verify error is tracked in execution history
      const executionHistory = mockCommands.getExecutionHistory();
      const execution = executionHistory.find((entry: any) => entry.command === commandId);
      expect(execution).toBeTruthy();
      expect(execution.success).toBe(false);
      expect(execution.error).toBe(expectedError.message);
    });

    it('should handle unregistered command execution', async () => {
      const commandId = 'test.unregisteredCommand';
      
      // Try to execute unregistered command
      await expect(mockCommands.executeCommand(commandId)).rejects.toThrow('not found');
      
      // Verify failed execution is tracked
      const executionHistory = mockCommands.getExecutionHistory();
      const execution = executionHistory.find((entry: any) => entry.command === commandId);
      expect(execution).toBeTruthy();
      expect(execution.success).toBe(false);
    });

    it('should execute built-in VSCode commands', async () => {
      // Test built-in command execution
      const result = await mockCommands.executeCommand('setContext', 'test.context', true);
      expect(result).toEqual({ context: 'test.context', value: true });
      
      // Verify execution is tracked
      const executionHistory = mockCommands.getExecutionHistory();
      const execution = executionHistory.find((entry: any) => entry.command === 'setContext');
      expect(execution).toBeTruthy();
      expect(execution.success).toBe(true);
      expect(execution.args).toEqual(['test.context', true]);
    });
  });

  describe('Command Palette Integration', () => {
    it('should simulate command palette execution', async () => {
      const commandId = 'readme-to-cicd.generate';
      const expectedResult = { workflows: ['ci.yml', 'cd.yml'] };
      const commandCallback = vi.fn().mockResolvedValue(expectedResult);
      
      // Register command
      mockCommands.registerCommand(commandId, commandCallback);
      
      // Simulate command palette execution
      const result = await mockCommands.simulateCommandPaletteExecution(commandId);
      
      // Verify result
      expect(result.success).toBe(true);
      expect(result.result).toEqual(expectedResult);
      
      // Verify command was executed
      expect(commandCallback).toHaveBeenCalledOnce();
    });

    it('should handle command palette execution errors', async () => {
      const commandId = 'readme-to-cicd.invalid';
      
      // Simulate command palette execution of unregistered command
      const result = await mockCommands.simulateCommandPaletteExecution(commandId);
      
      // Verify error handling
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should list available commands for command palette', async () => {
      // Register extension commands
      const extensionCommands = [
        'readme-to-cicd.generate',
        'readme-to-cicd.validate',
        'readme-to-cicd.preview'
      ];
      
      for (const commandId of extensionCommands) {
        mockCommands.registerCommand(commandId, vi.fn());
      }
      
      // Get all commands (including built-in)
      const allCommands = await mockCommands.getCommands();
      
      // Verify extension commands are included
      for (const commandId of extensionCommands) {
        expect(allCommands.includes(commandId)).toBe(true);
      }
      
      // Verify built-in commands are included
      expect(allCommands.includes('vscode.open')).toBe(true);
      expect(allCommands.includes('setContext')).toBe(true);
      
      // Test filtering internal commands
      const publicCommands = await mockCommands.getCommands(true);
      expect(Array.isArray(publicCommands)).toBe(true);
    });
  });

  describe('Command Lifecycle Management', () => {
    it('should track command registration and disposal lifecycle', async () => {
      const commandId = 'test.lifecycleCommand';
      const commandCallback = vi.fn().mockResolvedValue('lifecycle result');
      
      // Clear history for clean test
      mockCommands.clearHistory();
      
      // Register command
      const disposable = mockCommands.registerCommand(commandId, commandCallback);
      
      // Execute command multiple times
      await mockCommands.executeCommand(commandId);
      await mockCommands.executeCommand(commandId);
      await mockCommands.executeCommand(commandId);
      
      // Verify execution count
      expect(mockCommands.getCommandExecutionCount(commandId)).toBe(3);
      
      // Verify registration history
      const registrationHistory = mockCommands.getRegistrationHistory();
      expect(registrationHistory.length).toBe(1);
      expect(registrationHistory[0].command).toBe(commandId);
      expect(registrationHistory[0].disposed).toBe(false);
      
      // Verify execution history
      const executionHistory = mockCommands.getExecutionHistory();
      const commandExecutions = executionHistory.filter((entry: any) => entry.command === commandId);
      expect(commandExecutions.length).toBe(3);
      
      // Dispose command
      disposable.dispose();
      
      // Verify disposal is tracked
      expect(registrationHistory[0].disposed).toBe(true);
      expect(registrationHistory[0].disposedAt).toBeTruthy();
      
      // Verify command is no longer registered
      expect(mockCommands.isCommandRegistered(commandId)).toBe(false);
    });

    it('should handle extension activation command registration', async () => {
      // Simulate extension activation with multiple command registrations
      const commands = [
        { id: 'readme-to-cicd.generate', callback: vi.fn().mockResolvedValue({ type: 'generate' }) },
        { id: 'readme-to-cicd.validate', callback: vi.fn().mockResolvedValue({ type: 'validate' }) },
        { id: 'readme-to-cicd.preview', callback: vi.fn().mockResolvedValue({ type: 'preview' }) },
        { id: 'readme-to-cicd.init', callback: vi.fn().mockResolvedValue({ type: 'init' }) },
        { id: 'readme-to-cicd.refresh', callback: vi.fn().mockResolvedValue({ type: 'refresh' }) }
      ];
      
      // Register all commands (simulating extension activation)
      const disposables = commands.map(cmd => 
        mockCommands.registerCommand(cmd.id, cmd.callback)
      );
      
      // Verify all commands are registered
      const registeredCommands = mockCommands.getRegisteredCommands();
      commands.forEach(cmd => {
        expect(registeredCommands.includes(cmd.id)).toBe(true);
      });
      
      // Test command execution
      for (const cmd of commands) {
        const result = await mockCommands.executeCommand(cmd.id);
        expect(result).toEqual({ type: cmd.id.split('.')[1] });
      }
      
      // Simulate extension deactivation
      disposables.forEach(disposable => disposable.dispose());
      
      // Verify all commands are disposed
      commands.forEach(cmd => {
        expect(mockCommands.isCommandRegistered(cmd.id)).toBe(false);
      });
    });
  });

  describe('Mock Configuration and Testing Utilities', () => {
    it('should provide testing utilities for command validation', () => {
      // Test utility methods exist
      expect(typeof mockCommands.getRegisteredCommands).toBe('function');
      expect(typeof mockCommands.getRegistrationHistory).toBe('function');
      expect(typeof mockCommands.getExecutionHistory).toBe('function');
      expect(typeof mockCommands.clearHistory).toBe('function');
      expect(typeof mockCommands.isCommandRegistered).toBe('function');
      expect(typeof mockCommands.getCommandExecutionCount).toBe('function');
      expect(typeof mockCommands.simulateCommandPaletteExecution).toBe('function');
    });

    it('should clear history for clean testing', async () => {
      // Register and execute a command
      const commandId = 'test.clearHistoryCommand';
      mockCommands.registerCommand(commandId, vi.fn());
      await mockCommands.executeCommand(commandId);
      
      // Verify history exists
      expect(mockCommands.getRegistrationHistory().length).toBeGreaterThan(0);
      expect(mockCommands.getExecutionHistory().length).toBeGreaterThan(0);
      
      // Clear history
      mockCommands.clearHistory();
      
      // Verify history is cleared
      expect(mockCommands.getRegistrationHistory().length).toBe(0);
      expect(mockCommands.getExecutionHistory().length).toBe(0);
    });

    it('should handle concurrent command executions', async () => {
      const commandId = 'test.concurrentCommand';
      const commandCallback = vi.fn().mockImplementation(async (delay: number) => {
        await new Promise(resolve => setTimeout(resolve, delay));
        return `completed after ${delay}ms`;
      });
      
      // Register command
      mockCommands.registerCommand(commandId, commandCallback);
      
      // Execute commands concurrently
      const promises = [
        mockCommands.executeCommand(commandId, 10),
        mockCommands.executeCommand(commandId, 20),
        mockCommands.executeCommand(commandId, 5)
      ];
      
      const results = await Promise.all(promises);
      
      // Verify all executions completed
      expect(results.length).toBe(3);
      expect(mockCommands.getCommandExecutionCount(commandId)).toBe(3);
      
      // Verify execution history tracks all executions
      const executionHistory = mockCommands.getExecutionHistory();
      const commandExecutions = executionHistory.filter((entry: any) => entry.command === commandId);
      expect(commandExecutions.length).toBe(3);
      
      // Verify all executions were successful
      commandExecutions.forEach((execution: any) => {
        expect(execution.success).toBe(true);
        expect(execution.executionTime).toBeGreaterThanOrEqual(0);
      });
    });
  });
});