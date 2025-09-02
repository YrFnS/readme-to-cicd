/**
 * Command Test Utilities
 * 
 * Specialized utilities for testing VSCode extension commands,
 * including command registration, execution, and validation.
 */

import * as sinon from 'sinon';
import { ExtensionTestContext } from './extension-test-utilities';

/**
 * Command test configuration
 */
export interface CommandTestConfig {
  commandId: string;
  expectedArgs?: any[];
  expectedResult?: any;
  shouldThrow?: boolean;
  timeout?: number;
  requiresWorkspace?: boolean;
  requiresActiveEditor?: boolean;
}

/**
 * Command execution result
 */
export interface CommandExecutionResult {
  success: boolean;
  result?: any;
  error?: Error;
  executionTime?: number;
  argsReceived?: any[];
}

/**
 * Command test helper for README-to-CICD extension
 */
export class CommandTestHelper {
  public context: ExtensionTestContext;
  private registeredCommands: Map<string, Function> = new Map();
  private executionHistory: Array<{
    commandId: string;
    args: any[];
    result: any;
    timestamp: number;
  }> = [];

  constructor(context: ExtensionTestContext) {
    this.context = context;
  }

  /**
   * Register a command with mock implementation
   */
  registerMockCommand(commandId: string, implementation: Function): any {
    const wrappedImplementation = async (...args: any[]) => {
      const startTime = Date.now();
      
      try {
        const result = await implementation(...args);
        
        this.executionHistory.push({
          commandId,
          args,
          result,
          timestamp: startTime
        });
        
        return result;
      } catch (error) {
        this.executionHistory.push({
          commandId,
          args,
          result: { error: (error as Error).message },
          timestamp: startTime
        });
        throw error;
      }
    };
    
    this.registeredCommands.set(commandId, wrappedImplementation);
    return this.context.registerCommand(commandId, wrappedImplementation);
  }

  /**
   * Test command execution with various scenarios
   */
  async testCommand(config: CommandTestConfig): Promise<CommandExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Validate prerequisites
      if (config.requiresWorkspace && !this.hasWorkspace()) {
        throw new Error('Command requires workspace but none is available');
      }
      
      if (config.requiresActiveEditor && !this.hasActiveEditor()) {
        throw new Error('Command requires active editor but none is available');
      }
      
      // Execute command
      const result = await this.context.executeCommand(
        config.commandId,
        ...(config.expectedArgs || [])
      );
      
      const executionTime = Date.now() - startTime;
      
      // Validate result if expected
      if (config.expectedResult !== undefined) {
        if (JSON.stringify(result) !== JSON.stringify(config.expectedResult)) {
          throw new Error(`Command result does not match expected result`);
        }
      }
      
      // Check if command should have thrown
      if (config.shouldThrow) {
        throw new Error('Command was expected to throw but completed successfully');
      }
      
      return {
        success: true,
        result,
        executionTime,
        argsReceived: config.expectedArgs
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // If command was expected to throw, this is success
      if (config.shouldThrow) {
        return {
          success: true,
          error: error as Error,
          executionTime,
          argsReceived: config.expectedArgs
        };
      }
      
      return {
        success: false,
        error: error as Error,
        executionTime,
        argsReceived: config.expectedArgs
      };
    }
  }

  /**
   * Test all README-to-CICD extension commands
   */
  async testAllExtensionCommands(): Promise<Record<string, CommandExecutionResult>> {
    const commands = [
      'readme-to-cicd.generate',
      'readme-to-cicd.validate',
      'readme-to-cicd.preview',
      'readme-to-cicd.init',
      'readme-to-cicd.refresh'
    ];
    
    const results: Record<string, CommandExecutionResult> = {};
    
    for (const commandId of commands) {
      results[commandId] = await this.testCommand({ commandId });
    }
    
    return results;
  }

  /**
   * Test command with user interaction
   */
  async testCommandWithUserInteraction(
    commandId: string,
    userResponses: Array<{
      type: 'information' | 'warning' | 'error' | 'quickPick' | 'inputBox';
      response: any;
    }>
  ): Promise<CommandExecutionResult> {
    // Configure user responses
    userResponses.forEach(response => {
      this.context.simulateUserInteraction(response.type, response.response);
    });
    
    return await this.testCommand({ commandId });
  }

  /**
   * Test command error handling
   */
  async testCommandErrorHandling(commandId: string, errorScenarios: Array<{
    name: string;
    setup: () => void;
    expectedError?: string;
  }>): Promise<Record<string, CommandExecutionResult>> {
    const results: Record<string, CommandExecutionResult> = {};
    
    for (const scenario of errorScenarios) {
      // Setup error scenario
      scenario.setup();
      
      const result = await this.testCommand({
        commandId,
        shouldThrow: true
      });
      
      // Verify expected error
      if (scenario.expectedError && result.error) {
        if (!result.error.message.includes(scenario.expectedError)) {
          result.success = false;
          result.error = new Error(`Expected error message to contain "${scenario.expectedError}" but got "${result.error.message}"`);
        }
      }
      
      results[scenario.name] = result;
    }
    
    return results;
  }

  /**
   * Test command performance
   */
  async testCommandPerformance(
    commandId: string,
    iterations: number = 10,
    maxExecutionTime: number = 5000
  ): Promise<{
    averageTime: number;
    minTime: number;
    maxTime: number;
    allWithinLimit: boolean;
    results: CommandExecutionResult[];
  }> {
    const results: CommandExecutionResult[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const result = await this.testCommand({ commandId });
      results.push(result);
    }
    
    const executionTimes = results
      .filter(r => r.executionTime !== undefined)
      .map(r => r.executionTime!);
    
    const averageTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
    const minTime = Math.min(...executionTimes);
    const maxTime = Math.max(...executionTimes);
    const allWithinLimit = executionTimes.every(time => time <= maxExecutionTime);
    
    return {
      averageTime,
      minTime,
      maxTime,
      allWithinLimit,
      results
    };
  }

  /**
   * Get command execution history
   */
  getExecutionHistory(): Array<{
    commandId: string;
    args: any[];
    result: any;
    timestamp: number;
  }> {
    return [...this.executionHistory];
  }

  /**
   * Clear execution history
   */
  clearExecutionHistory(): void {
    this.executionHistory = [];
  }

  /**
   * Verify command was executed with specific arguments
   */
  verifyCommandExecuted(commandId: string, expectedArgs?: any[]): boolean {
    const executions = this.executionHistory.filter(h => h.commandId === commandId);
    
    if (executions.length === 0) {
      return false;
    }
    
    if (expectedArgs) {
      return executions.some(exec => 
        JSON.stringify(exec.args) === JSON.stringify(expectedArgs)
      );
    }
    
    return true;
  }

  /**
   * Get command execution count
   */
  getCommandExecutionCount(commandId: string): number {
    return this.executionHistory.filter(h => h.commandId === commandId).length;
  }

  /**
   * Check if workspace is available
   */
  private hasWorkspace(): boolean {
    try {
      const workspaceFolders = this.context.vscode.workspace.workspaceFolders;
      return workspaceFolders && workspaceFolders.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Check if active editor is available
   */
  private hasActiveEditor(): boolean {
    try {
      return this.context.vscode.window.activeTextEditor !== null;
    } catch {
      return false;
    }
  }
}

/**
 * Predefined command test scenarios for README-to-CICD extension
 */
export class ReadmeToCICDCommandScenarios {
  /**
   * Test generate workflow command with various README types
   */
  static async testGenerateWorkflowCommand(helper: CommandTestHelper): Promise<Record<string, CommandExecutionResult>> {
    const scenarios = [
      {
        name: 'nodejs-project',
        userResponses: [
          { type: 'quickPick' as const, response: ['ci', 'cd'] },
          { type: 'inputBox' as const, response: 'nodejs-workflow' }
        ]
      },
      {
        name: 'python-project',
        userResponses: [
          { type: 'quickPick' as const, response: ['ci'] },
          { type: 'inputBox' as const, response: 'python-ci' }
        ]
      },
      {
        name: 'user-cancellation',
        userResponses: [
          { type: 'quickPick' as const, response: undefined }
        ]
      }
    ];
    
    const results: Record<string, CommandExecutionResult> = {};
    
    for (const scenario of scenarios) {
      results[scenario.name] = await helper.testCommandWithUserInteraction(
        'readme-to-cicd.generate',
        scenario.userResponses
      );
    }
    
    return results;
  }

  /**
   * Test validate workflow command
   */
  static async testValidateWorkflowCommand(helper: CommandTestHelper): Promise<CommandExecutionResult> {
    return await helper.testCommand({
      commandId: 'readme-to-cicd.validate',
      requiresWorkspace: true
    });
  }

  /**
   * Test preview workflow command
   */
  static async testPreviewWorkflowCommand(helper: CommandTestHelper): Promise<CommandExecutionResult> {
    return await helper.testCommand({
      commandId: 'readme-to-cicd.preview',
      requiresWorkspace: true
    });
  }

  /**
   * Test init command
   */
  static async testInitCommand(helper: CommandTestHelper): Promise<CommandExecutionResult> {
    return await helper.testCommandWithUserInteraction(
      'readme-to-cicd.init',
      [
        { type: 'inputBox', response: 'my-project' },
        { type: 'quickPick', response: 'Node.js' },
        { type: 'information', response: 'Create' }
      ]
    );
  }

  /**
   * Test refresh command
   */
  static async testRefreshCommand(helper: CommandTestHelper): Promise<CommandExecutionResult> {
    return await helper.testCommand({
      commandId: 'readme-to-cicd.refresh'
    });
  }

  /**
   * Test error scenarios for all commands
   */
  static async testErrorScenarios(helper: CommandTestHelper): Promise<Record<string, Record<string, CommandExecutionResult>>> {
    const commands = [
      'readme-to-cicd.generate',
      'readme-to-cicd.validate',
      'readme-to-cicd.preview'
    ];
    
    const errorScenarios = [
      {
        name: 'no-workspace',
        setup: () => {
          // Mock no workspace scenario
          helper.context.vscode.workspace.workspaceFolders = null;
        },
        expectedError: 'workspace'
      },
      {
        name: 'no-readme',
        setup: () => {
          // Mock no README files found
          helper.context.vscode.workspace.findFiles = sinon.stub().resolves([]);
        },
        expectedError: 'README'
      },
      {
        name: 'file-read-error',
        setup: () => {
          // Mock file read error
          helper.context.vscode.workspace.fs.readFile = sinon.stub().rejects(new Error('File not found'));
        },
        expectedError: 'File not found'
      }
    ];
    
    const results: Record<string, Record<string, CommandExecutionResult>> = {};
    
    for (const commandId of commands) {
      results[commandId] = await helper.testCommandErrorHandling(commandId, errorScenarios);
    }
    
    return results;
  }
}

/**
 * Command test utilities for specific testing patterns
 */
export class CommandTestUtils {
  /**
   * Create a mock command implementation that tracks calls
   */
  static createMockCommandImplementation(behavior: 'success' | 'error' | 'async' = 'success'): {
    implementation: Function;
    getCalls: () => Array<{ args: any[]; timestamp: number; result?: any; error?: Error }>;
    reset: () => void;
  } {
    const calls: Array<{ args: any[]; timestamp: number; result?: any; error?: Error }> = [];
    
    const implementation = async (...args: any[]) => {
      const timestamp = Date.now();
      
      switch (behavior) {
        case 'success':
          const result = { success: true, args };
          calls.push({ args, timestamp, result });
          return result;
          
        case 'error':
          const error = new Error('Mock command error');
          calls.push({ args, timestamp, error });
          throw error;
          
        case 'async':
          // Simulate async operation
          await new Promise(resolve => setTimeout(resolve, 100));
          const asyncResult = { success: true, args, async: true };
          calls.push({ args, timestamp, result: asyncResult });
          return asyncResult;
          
        default:
          throw new Error(`Unknown behavior: ${behavior}`);
      }
    };
    
    return {
      implementation,
      getCalls: () => [...calls],
      reset: () => calls.length = 0
    };
  }

  /**
   * Verify command registration and availability
   */
  static async verifyCommandAvailability(
    context: ExtensionTestContext,
    expectedCommands: string[]
  ): Promise<{
    allAvailable: boolean;
    availableCommands: string[];
    missingCommands: string[];
  }> {
    const availableCommands = await context.vscode.commands.getCommands();
    const extensionCommands = availableCommands.filter((cmd: string) => 
      expectedCommands.some(expected => cmd === expected)
    );
    
    const missingCommands = expectedCommands.filter(expected => 
      !extensionCommands.includes(expected)
    );
    
    return {
      allAvailable: missingCommands.length === 0,
      availableCommands: extensionCommands,
      missingCommands
    };
  }

  /**
   * Test command with timeout
   */
  static async testCommandWithTimeout(
    helper: CommandTestHelper,
    commandId: string,
    timeout: number = 5000,
    args: any[] = []
  ): Promise<CommandExecutionResult & { timedOut: boolean }> {
    return new Promise(async (resolve) => {
      let timedOut = false;
      
      const timeoutId = setTimeout(() => {
        timedOut = true;
        resolve({
          success: false,
          error: new Error(`Command ${commandId} timed out after ${timeout}ms`),
          timedOut: true
        });
      }, timeout);
      
      try {
        const result = await helper.testCommand({
          commandId,
          expectedArgs: args
        });
        
        clearTimeout(timeoutId);
        
        if (!timedOut) {
          resolve({ ...result, timedOut: false });
        }
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (!timedOut) {
          resolve({
            success: false,
            error: error as Error,
            timedOut: false
          });
        }
      }
    });
  }

  /**
   * Batch test multiple commands
   */
  static async batchTestCommands(
    helper: CommandTestHelper,
    commands: Array<{ commandId: string; args?: any[]; config?: Partial<CommandTestConfig> }>
  ): Promise<Record<string, CommandExecutionResult>> {
    const results: Record<string, CommandExecutionResult> = {};
    
    for (const command of commands) {
      const config: CommandTestConfig = {
        commandId: command.commandId,
        expectedArgs: command.args,
        ...command.config
      };
      
      results[command.commandId] = await helper.testCommand(config);
    }
    
    return results;
  }
}

// Export types and classes are already exported above with their interface declarations