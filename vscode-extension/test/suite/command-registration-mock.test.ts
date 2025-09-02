/**
 * Command Registration Mock Tests
 * 
 * Tests for VSCode command registration and execution mocking,
 * including command palette integration and lifecycle management.
 */

import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import * as sinon from 'sinon';
import { setupVSCodeMock, cleanupVSCodeMock, createMockExtensionContext } from '../setup/vscode-mock';

describe('Command Registration Mock Tests', () => {
  let vscode: any;
  let context: any;

  beforeEach(() => {
    setupVSCodeMock();
    vscode = require('vscode');
    context = createMockExtensionContext();
  });

  afterEach(() => {
    cleanupVSCodeMock();
    sinon.restore();
  });

  describe('Command Registration', () => {
    it('should register commands and track registration', async () => {
      const commandId = 'test.command';
      const commandCallback = sinon.stub().resolves('test result');
      
      // Register command
      const disposable = vscode.commands.registerCommand(commandId, commandCallback);
      
      // Verify command is registered
      expect(vscode.commands.isCommandRegistered(commandId)).toBe(true);
      
      // Verify registration history
      const history = vscode.commands.getRegistrationHistory();
      const registration = history.find((entry: any) => entry.command === commandId);
      expect(registration).toBeTruthy();
      expect(registration.disposed).toBe(false);
      expect(registration.timestamp).toBeTruthy();
      
      // Verify command appears in command list
      const commands = await vscode.commands.getCommands();
      expect(commands.includes(commandId)).toBe(true);
      
      // Dispose command
      disposable.dispose();
      
      // Verify command is no longer registered
      expect(vscode.commands.isCommandRegistered(commandId)).toBe(false);
      
      // Verify disposal is tracked
      expect(registration.disposed).toBe(true);
      expect(registration.disposedAt).toBeTruthy();
    });

    it('should register text editor commands', async () => {
      const commandId = 'test.textEditorCommand';
      const commandCallback = sinon.stub().resolves('editor result');
      
      // Register text editor command
      const disposable = vscode.commands.registerTextEditorCommand(commandId, commandCallback);
      
      // Verify command is registered
      expect(vscode.commands.isCommandRegistered(commandId)).toBe(true);
      
      // Verify registration type is tracked
      const history = vscode.commands.getRegistrationHistory();
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
        const callback = sinon.stub().resolves(`result for ${commandId}`);
        const disposable = vscode.commands.registerCommand(commandId, callback);
        disposables.push(disposable);
      }
      
      // Verify all commands are registered
      for (const commandId of commands) {
        expect(vscode.commands.isCommandRegistered(commandId).toBeTruthy());
      }
      
      // Verify command count
      const registeredCommands = vscode.commands.getRegisteredCommands();
      const extensionCommands = registeredCommands.filter((cmd: string) => 
        cmd.startsWith('readme-to-cicd.')
      );
      expect(extensionCommands.length).toBe(commands.length);
      
      // Dispose all commands
      disposables.forEach(disposable => disposable.dispose());
      
      // Verify all commands are disposed
      for (const commandId of commands) {
        expect(!vscode.commands.isCommandRegistered(commandId).toBeTruthy());
      }
    });
  });

  describe('Command Execution', () => {
    it('should execute registered commands and track execution', async () => {
      const commandId = 'test.executeCommand';
      const expectedResult = { success: true, data: 'test data' };
      const commandCallback = sinon.stub().resolves(expectedResult);
      
      // Register command
      vscode.commands.registerCommand(commandId, commandCallback);
      
      // Execute command
      const result = await vscode.commands.executeCommand(commandId, 'arg1', 'arg2');
      
      // Verify result
      expect(result).toEqual(expectedResult);
      
      // Verify callback was called with correct arguments
      expect(commandCallback.calledOnce).toBeTruthy();
      expect(commandCallback.firstCall.args).toEqual(['arg1', 'arg2']);
      
      // Verify execution history
      const executionHistory = vscode.commands.getExecutionHistory();
      const execution = executionHistory.find((entry: any) => entry.command === commandId);
      expect(execution).toBeTruthy();
      expect(execution.success).toBe(true);
      expect(execution.result).toEqual(expectedResult);
      expect(execution.args).toEqual(['arg1', 'arg2']);
      expect(execution.executionTime >= 0).toBeTruthy();
      expect(execution.timestamp).toBeTruthy();
      
      // Verify execution count
      expect(vscode.commands.getCommandExecutionCount(commandId)).toBe(1);
    });

    it('should handle command execution errors', async () => {
      const commandId = 'test.errorCommand';
      const expectedError = new Error('Test command error');
      const commandCallback = sinon.stub().rejects(expectedError);
      
      // Register command
      vscode.commands.registerCommand(commandId, commandCallback);
      
      // Execute command and expect error
      try {
        await vscode.commands.executeCommand(commandId);
        throw new Error('Expected command to throw error');
      } catch (error) {
        expect((error as Error).message).toBe(expectedError.message);
      }
      
      // Verify error is tracked in execution history
      const executionHistory = vscode.commands.getExecutionHistory();
      const execution = executionHistory.find((entry: any) => entry.command === commandId);
      expect(execution).toBeTruthy();
      expect(execution.success).toBe(false);
      expect(execution.error).toBe(expectedError.message);
    });

    it('should handle unregistered command execution', async () => {
      const commandId = 'test.unregisteredCommand';
      
      // Try to execute unregistered command
      try {
        await vscode.commands.executeCommand(commandId);
        throw new Error('Expected command execution to fail');
      } catch (error) {
        expect((error as Error).toBeTruthy().message.includes('not found'));
      }
      
      // Verify failed execution is tracked
      const executionHistory = vscode.commands.getExecutionHistory();
      const execution = executionHistory.find((entry: any) => entry.command === commandId);
      expect(execution).toBeTruthy();
      expect(execution.success).toBe(false);
    });

    it('should execute built-in VSCode commands', async () => {
      // Test built-in command execution
      const result = await vscode.commands.executeCommand('setContext', 'test.context', true);
      expect(result !== undefined).toBeTruthy();
      
      // Verify execution is tracked
      const executionHistory = vscode.commands.getExecutionHistory();
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
      const commandCallback = sinon.stub().resolves(expectedResult);
      
      // Register command
      vscode.commands.registerCommand(commandId, commandCallback);
      
      // Simulate command palette execution
      const result = await vscode.commands.simulateCommandPaletteExecution(commandId);
      
      // Verify result
      expect(result.success).toBe(true);
      expect(result.result).toEqual(expectedResult);
      
      // Verify command was executed
      expect(commandCallback.calledOnce).toBeTruthy();
    });

    it('should handle command palette execution errors', async () => {
      const commandId = 'readme-to-cicd.invalid';
      
      // Simulate command palette execution of unregistered command
      const result = await vscode.commands.simulateCommandPaletteExecution(commandId);
      
      // Verify error handling
      expect(result.success).toBe(false);
      expect(result.error.includes('not found').toBeTruthy());
    });

    it('should list available commands for command palette', async () => {
      // Register extension commands
      const extensionCommands = [
        'readme-to-cicd.generate',
        'readme-to-cicd.validate',
        'readme-to-cicd.preview'
      ];
      
      for (const commandId of extensionCommands) {
        vscode.commands.registerCommand(commandId, sinon.stub());
      }
      
      // Get all commands (including built-in)
      const allCommands = await vscode.commands.getCommands();
      
      // Verify extension commands are included
      for (const commandId of extensionCommands) {
        expect(allCommands.includes(commandId).toBeTruthy());
      }
      
      // Verify built-in commands are included
      expect(allCommands.includes('vscode.open').toBeTruthy());
      expect(allCommands.includes('setContext').toBeTruthy());
      
      // Test filtering internal commands
      const publicCommands = await vscode.commands.getCommands(true);
      expect(Array.isArray(publicCommands).toBeTruthy());
    });
  });

  describe('Command Lifecycle Management', () => {
    it('should track command registration and disposal lifecycle', async () => {
      const commandId = 'test.lifecycleCommand';
      const commandCallback = sinon.stub().resolves('lifecycle result');
      
      // Clear history for clean test
      vscode.commands.clearHistory();
      
      // Register command
      const disposable = vscode.commands.registerCommand(commandId, commandCallback);
      
      // Execute command multiple times
      await vscode.commands.executeCommand(commandId);
      await vscode.commands.executeCommand(commandId);
      await vscode.commands.executeCommand(commandId);
      
      // Verify execution count
      expect(vscode.commands.getCommandExecutionCount(commandId)).toBe(3);
      
      // Verify registration history
      const registrationHistory = vscode.commands.getRegistrationHistory();
      expect(registrationHistory.length).toBe(1);
      expect(registrationHistory[0].command).toBe(commandId);
      expect(registrationHistory[0].disposed).toBe(false);
      
      // Verify execution history
      const executionHistory = vscode.commands.getExecutionHistory();
      const commandExecutions = executionHistory.filter((entry: any) => entry.command === commandId);
      expect(commandExecutions.length).toBe(3);
      
      // Dispose command
      disposable.dispose();
      
      // Verify disposal is tracked
      expect(registrationHistory[0].disposed).toBe(true);
      expect(registrationHistory[0].disposedAt).toBeTruthy();
      
      // Verify command is no longer registered
      expect(!vscode.commands.isCommandRegistered(commandId).toBeTruthy());
    });

    it('should handle extension activation command registration', async () => {
      // Simulate extension activation with multiple command registrations
      const commands = [
        { id: 'readme-to-cicd.generate', callback: sinon.stub().resolves({ type: 'generate' }) },
        { id: 'readme-to-cicd.validate', callback: sinon.stub().resolves({ type: 'validate' }) },
        { id: 'readme-to-cicd.preview', callback: sinon.stub().resolves({ type: 'preview' }) },
        { id: 'readme-to-cicd.init', callback: sinon.stub().resolves({ type: 'init' }) },
        { id: 'readme-to-cicd.refresh', callback: sinon.stub().resolves({ type: 'refresh' }) }
      ];
      
      // Register all commands (simulating extension activation)
      const disposables = commands.map(cmd => 
        vscode.commands.registerCommand(cmd.id, cmd.callback)
      );
      
      // Add disposables to context (simulating real extension)
      disposables.forEach(disposable => context.subscriptions.push(disposable));
      
      // Verify all commands are registered
      const registeredCommands = vscode.commands.getRegisteredCommands();
      commands.forEach(cmd => {
        expect(registeredCommands.includes(cmd.id).toBeTruthy());
      });
      
      // Test command execution
      for (const cmd of commands) {
        const result = await vscode.commands.executeCommand(cmd.id);
        expect(result).toEqual({ type: cmd.id.split('.')[1] });
      }
      
      // Simulate extension deactivation
      context.subscriptions.forEach((disposable: any) => disposable.dispose());
      
      // Verify all commands are disposed
      commands.forEach(cmd => {
        expect(!vscode.commands.isCommandRegistered(cmd.id).toBeTruthy());
      });
    });
  });

  describe('Mock Configuration and Testing Utilities', () => {
    it('should provide testing utilities for command validation', () => {
      // Test utility methods exist
      expect(typeof vscode.commands.getRegisteredCommands === 'function').toBeTruthy();
      expect(typeof vscode.commands.getRegistrationHistory === 'function').toBeTruthy();
      expect(typeof vscode.commands.getExecutionHistory === 'function').toBeTruthy();
      expect(typeof vscode.commands.clearHistory === 'function').toBeTruthy();
      expect(typeof vscode.commands.isCommandRegistered === 'function').toBeTruthy();
      expect(typeof vscode.commands.getCommandExecutionCount === 'function').toBeTruthy();
      expect(typeof vscode.commands.simulateCommandPaletteExecution === 'function').toBeTruthy();
    });

    it('should clear history for clean testing', () => {
      // Register and execute a command
      const commandId = 'test.clearHistoryCommand';
      vscode.commands.registerCommand(commandId, sinon.stub());
      vscode.commands.executeCommand(commandId);
      
      // Verify history exists
      expect(vscode.commands.getRegistrationHistory().toBeTruthy().length > 0);
      expect(vscode.commands.getExecutionHistory().toBeTruthy().length > 0);
      
      // Clear history
      vscode.commands.clearHistory();
      
      // Verify history is cleared
      expect(vscode.commands.getRegistrationHistory().length).toBe(0);
      expect(vscode.commands.getExecutionHistory().length).toBe(0);
    });

    it('should handle concurrent command executions', async () => {
      const commandId = 'test.concurrentCommand';
      const commandCallback = sinon.stub().callsFake(async (delay: number) => {
        await new Promise(resolve => setTimeout(resolve, delay));
        return `completed after ${delay}ms`;
      });
      
      // Register command
      vscode.commands.registerCommand(commandId, commandCallback);
      
      // Execute commands concurrently
      const promises = [
        vscode.commands.executeCommand(commandId, 10),
        vscode.commands.executeCommand(commandId, 20),
        vscode.commands.executeCommand(commandId, 5)
      ];
      
      const results = await Promise.all(promises);
      
      // Verify all executions completed
      expect(results.length).toBe(3);
      expect(vscode.commands.getCommandExecutionCount(commandId)).toBe(3);
      
      // Verify execution history tracks all executions
      const executionHistory = vscode.commands.getExecutionHistory();
      const commandExecutions = executionHistory.filter((entry: any) => entry.command === commandId);
      expect(commandExecutions.length).toBe(3);
      
      // Verify all executions were successful
      commandExecutions.forEach((execution: any) => {
        expect(execution.success).toBe(true);
        expect(execution.executionTime >= 0).toBeTruthy();
      });
    });
  });
});