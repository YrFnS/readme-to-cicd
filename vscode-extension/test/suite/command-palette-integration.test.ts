/**
 * Command Palette Integration Tests
 * 
 * Tests for VSCode command palette integration mocking,
 * including command discovery, execution, and user interaction.
 */

import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import * as sinon from 'sinon';
import { setupVSCodeMock, cleanupVSCodeMock, createMockExtensionContext } from '../setup/vscode-mock';

describe('Command Palette Integration Tests', () => {
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

  describe('Command Discovery', () => {
    it('should discover extension commands in command palette', async () => {
      // Register README-to-CICD extension commands
      const extensionCommands = [
        {
          id: 'readme-to-cicd.generate',
          title: 'README to CI/CD: Generate Workflows',
          callback: sinon.stub().resolves({ generated: true })
        },
        {
          id: 'readme-to-cicd.validate',
          title: 'README to CI/CD: Validate Workflows',
          callback: sinon.stub().resolves({ valid: true })
        },
        {
          id: 'readme-to-cicd.preview',
          title: 'README to CI/CD: Preview Workflows',
          callback: sinon.stub().resolves({ preview: 'workflow content' })
        }
      ];

      // Register commands
      const disposables = extensionCommands.map(cmd => 
        vscode.commands.registerCommand(cmd.id, cmd.callback)
      );

      // Get all available commands (simulating command palette)
      const allCommands = await vscode.commands.getCommands();

      // Verify extension commands are discoverable
      extensionCommands.forEach(cmd => {
        expect(allCommands.includes(cmd.id).toBeTruthy(), `Command ${cmd.id} should be discoverable`);
      });

      // Verify built-in commands are also available
      expect(allCommands.includes('vscode.open').toBeTruthy());
      expect(allCommands.includes('workbench.action.showCommands').toBeTruthy());

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
        vscode.commands.registerCommand(cmd.id, sinon.stub());
      });

      // Get commands with filtering
      const publicCommands = await vscode.commands.getCommands(true);
      
      // Verify filtering works (no internal commands)
      const internalCommands = publicCommands.filter((cmd: string) => cmd.startsWith('_'));
      expect(internalCommands.length).toBe(0);

      // Verify extension commands are included
      commands.forEach(cmd => {
        expect(publicCommands.includes(cmd.id).toBeTruthy());
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
      
      const commandCallback = sinon.stub().resolves(expectedResult);
      
      // Register command
      vscode.commands.registerCommand(commandId, commandCallback);
      
      // Simulate command palette execution with arguments
      const result = await vscode.commands.simulateCommandPaletteExecution(
        commandId, 
        ...expectedArgs
      );
      
      // Verify execution
      expect(result.success).toBe(true);
      expect(result.result).toEqual(expectedResult);
      
      // Verify callback was called with correct arguments
      expect(commandCallback.calledOnce).toBeTruthy();
      expect(commandCallback.firstCall.args).toEqual(expectedArgs);
    });

    it('should handle command palette execution with user interaction', async () => {
      const commandId = 'readme-to-cicd.generate';
      
      const commandCallback = sinon.stub().callsFake(async () => {
        // Simulate command that requires user input
        const workflowTypes = await vscode.window.showQuickPick(
          ['ci', 'cd', 'both'],
          { placeHolder: 'Select workflow types to generate' }
        );
        
        if (!workflowTypes) {
          throw new Error('User cancelled workflow generation');
        }
        
        return { workflowTypes, generated: true };
      });
      
      // Register command
      vscode.commands.registerCommand(commandId, commandCallback);
      
      // Configure mock user response
      vscode.window.setMockConfig({ quickPickResponse: 'both' });
      
      // Execute command from palette
      const result = await vscode.commands.simulateCommandPaletteExecution(commandId);
      
      // Verify result
      expect(result.success).toBe(true);
      expect(result.result).toEqual({ workflowTypes: 'both', generated: true });
    });

    it('should handle command palette execution errors gracefully', async () => {
      const commandId = 'readme-to-cicd.validate';
      const expectedError = 'No README file found in workspace';
      
      const commandCallback = sinon.stub().rejects(new Error(expectedError));
      
      // Register command
      vscode.commands.registerCommand(commandId, commandCallback);
      
      // Execute command from palette
      const result = await vscode.commands.simulateCommandPaletteExecution(commandId);
      
      // Verify error handling
      expect(result.success).toBe(false);
      expect(result.error).toBe(expectedError);
      
      // Verify error is tracked in execution history
      const executionHistory = vscode.commands.getExecutionHistory();
      const execution = executionHistory.find((entry: any) => entry.command === commandId);
      expect(execution).toBeTruthy();
      expect(execution.success).toBe(false);
      expect(execution.error).toBe(expectedError);
    });
  });

  describe('Command Palette UI Integration', () => {
    it('should simulate command palette opening', async () => {
      // Execute command palette command
      const result = await vscode.commands.executeCommand('workbench.action.showCommands');
      
      // Verify command palette command execution
      expect(result !== undefined).toBeTruthy();
      
      // Verify execution is tracked
      const executionHistory = vscode.commands.getExecutionHistory();
      const execution = executionHistory.find((entry: any) => 
        entry.command === 'workbench.action.showCommands'
      );
      expect(execution).toBeTruthy();
      expect(execution.success).toBe(true);
    });

    it('should simulate quick open integration', async () => {
      // Execute quick open command
      const result = await vscode.commands.executeCommand('workbench.action.quickOpen');
      
      // Verify quick open command execution
      expect(result !== undefined).toBeTruthy();
      
      // Verify execution is tracked
      const executionHistory = vscode.commands.getExecutionHistory();
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
        vscode.commands.registerCommand(cmd, sinon.stub());
      });
      
      // Get all commands
      const allCommands = await vscode.commands.getCommands();
      
      // Simulate filtering by prefix (like command palette search)
      const readmeCommands = allCommands.filter((cmd: string) => 
        cmd.startsWith('readme-to-cicd.')
      );
      
      // Verify filtering works
      expect(readmeCommands.length).toBe(3);
      expect(readmeCommands.includes('readme-to-cicd.generate').toBeTruthy());
      expect(readmeCommands.includes('readme-to-cicd.validate').toBeTruthy());
      expect(readmeCommands.includes('readme-to-cicd.preview').toBeTruthy());
    });
  });

  describe('Extension Command Integration', () => {
    it('should integrate with README-to-CICD extension commands', async () => {
      // Mock extension activation with all commands
      const extensionCommands = [
        {
          id: 'readme-to-cicd.generate',
          implementation: async () => {
            // Simulate workflow generation
            const readmeContent = await vscode.workspace.fs.readFile(
              vscode.Uri.file('/mock/workspace/README.md')
            );
            
            return {
              success: true,
              workflows: ['ci.yml', 'cd.yml'],
              readmeAnalyzed: true
            };
          }
        },
        {
          id: 'readme-to-cicd.validate',
          implementation: async () => {
            // Simulate workflow validation
            const workflowFiles = await vscode.workspace.findFiles('**/.github/workflows/*.{yml,yaml}');
            
            return {
              success: true,
              validWorkflows: workflowFiles.length,
              issues: []
            };
          }
        },
        {
          id: 'readme-to-cicd.preview',
          implementation: async () => {
            // Simulate workflow preview
            return {
              success: true,
              preview: 'name: CI\non: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest'
            };
          }
        },
        {
          id: 'readme-to-cicd.init',
          implementation: async () => {
            // Simulate project initialization
            const projectName = await vscode.window.showInputBox({
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
          }
        },
        {
          id: 'readme-to-cicd.refresh',
          implementation: async () => {
            // Simulate refresh operation
            return {
              success: true,
              refreshed: true,
              timestamp: Date.now()
            };
          }
        }
      ];
      
      // Register all extension commands
      const disposables = extensionCommands.map(cmd => 
        vscode.commands.registerCommand(cmd.id, cmd.implementation)
      );
      
      // Test each command execution from command palette
      for (const cmd of extensionCommands) {
        // Configure user input for init command
        if (cmd.id === 'readme-to-cicd.init') {
          vscode.window.setMockConfig({ inputBoxResponse: 'test-project' });
        }
        
        const result = await vscode.commands.simulateCommandPaletteExecution(cmd.id);
        
        expect(result.success).toBe(true, `Command ${cmd.id} should execute successfully`);
        expect(result.result.success, `Command ${cmd.id} should return success result`).toBeTruthy();
      }
      
      // Verify all commands were executed
      extensionCommands.forEach(cmd => {
        expect(vscode.commands.getCommandExecutionCount(cmd.id)).toBe(1);
      });
      
      // Cleanup
      disposables.forEach(disposable => disposable.dispose());
    });

    it('should handle extension command dependencies', async () => {
      let workspaceInitialized = false;
      
      // Register commands with dependencies
      const initCommand = vscode.commands.registerCommand('readme-to-cicd.init', async () => {
        workspaceInitialized = true;
        return { initialized: true };
      });
      
      const generateCommand = vscode.commands.registerCommand('readme-to-cicd.generate', async () => {
        if (!workspaceInitialized) {
          throw new Error('Workspace must be initialized first. Run "README to CI/CD: Initialize" command.');
        }
        return { generated: true };
      });
      
      // Try to generate without initialization
      let result = await vscode.commands.simulateCommandPaletteExecution('readme-to-cicd.generate');
      expect(result.success).toBe(false);
      expect(result.error.includes('initialized first').toBeTruthy());
      
      // Initialize workspace
      result = await vscode.commands.simulateCommandPaletteExecution('readme-to-cicd.init');
      expect(result.success).toBe(true);
      
      // Now generate should work
      result = await vscode.commands.simulateCommandPaletteExecution('readme-to-cicd.generate');
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
      
      const commandCallback = sinon.stub().callsFake(async (index: number) => {
        // Simulate some async work
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
        return { index, completed: true };
      });
      
      // Register command
      vscode.commands.registerCommand(commandId, commandCallback);
      
      // Execute command rapidly
      const promises = Array.from({ length: executionCount }, (_, i) =>
        vscode.commands.simulateCommandPaletteExecution(commandId, i)
      );
      
      const results = await Promise.all(promises);
      
      // Verify all executions completed successfully
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.result.index).toBe(index);
      });
      
      // Verify execution count
      expect(vscode.commands.getCommandExecutionCount(commandId)).toBe(executionCount);
    });

    it('should track command execution performance', async () => {
      const commandId = 'readme-to-cicd.performance';
      
      const commandCallback = sinon.stub().callsFake(async (delay: number) => {
        await new Promise(resolve => setTimeout(resolve, delay));
        return { delay, completed: true };
      });
      
      // Register command
      vscode.commands.registerCommand(commandId, commandCallback);
      
      // Execute command with different delays
      const delays = [10, 50, 100];
      for (const delay of delays) {
        await vscode.commands.simulateCommandPaletteExecution(commandId, delay);
      }
      
      // Analyze execution performance
      const executionHistory = vscode.commands.getExecutionHistory();
      const commandExecutions = executionHistory.filter((entry: any) => entry.command === commandId);
      
      expect(commandExecutions.length).toBe(delays.length);
      
      // Verify execution times are tracked
      commandExecutions.forEach((execution: any, index: number) => {
        expect(execution.executionTime >= delays[index]).toBeTruthy();
        expect(execution.timestamp).toBeTruthy();
      });
    });
  });
});