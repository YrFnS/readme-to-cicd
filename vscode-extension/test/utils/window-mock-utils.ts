/**
 * Window Mock Utilities
 * 
 * Utility functions for configuring VSCode window API mocks in tests.
 * Provides convenient methods for setting up common test scenarios.
 */

/**
 * Configuration interface for window mock behavior
 */
export interface WindowMockConfig {
  // Message responses
  informationResponse?: string;
  warningResponse?: string;
  errorResponse?: string;
  modalResponse?: string;
  
  // Dialog responses
  quickPickResponse?: any;
  inputBoxResponse?: string;
  inputValue?: string;
  
  // Behavior flags
  simulateCancel?: boolean;
  inputValidationError?: boolean;
  
  // Custom response handlers
  customMessageHandler?: (type: string, message: string, items: string[]) => string | undefined;
  customDialogHandler?: (type: string, data: any) => any;
}

/**
 * Predefined mock configurations for common test scenarios
 */
export class WindowMockScenarios {
  /**
   * User confirms all actions (always selects first option)
   */
  static confirmAll(): WindowMockConfig {
    return {
      informationResponse: 'OK',
      warningResponse: 'Continue',
      errorResponse: 'Retry',
      modalResponse: 'Confirm',
      quickPickResponse: null, // Will use first item
      inputBoxResponse: 'confirmed-input'
    };
  }

  /**
   * User cancels all actions
   */
  static cancelAll(): WindowMockConfig {
    return {
      simulateCancel: true,
      informationResponse: undefined,
      warningResponse: undefined,
      errorResponse: undefined,
      quickPickResponse: undefined,
      inputBoxResponse: undefined
    };
  }

  /**
   * User provides specific responses for workflow generation
   */
  static workflowGeneration(options: {
    confirmGeneration?: boolean;
    selectedFrameworks?: string[];
    workflowName?: string;
    outputDirectory?: string;
  } = {}): WindowMockConfig {
    return {
      informationResponse: options.confirmGeneration !== false ? 'Generate' : 'Cancel',
      quickPickResponse: options.selectedFrameworks || ['Node.js'],
      inputBoxResponse: options.workflowName || 'ci-workflow',
      customDialogHandler: (type: string, data: any) => {
        if (type === 'saveDialog') {
          return {
            fsPath: options.outputDirectory || '/mock/workspace/.github/workflows',
            scheme: 'file',
            toString: () => `file://${options.outputDirectory || '/mock/workspace/.github/workflows'}`
          };
        }
        return null;
      }
    };
  }

  /**
   * User handles errors with retry behavior
   */
  static errorRecovery(retryCount: number = 1): WindowMockConfig {
    let currentRetry = 0;
    
    return {
      errorResponse: 'Retry',
      customMessageHandler: (type: string, message: string, items: string[]) => {
        if (type === 'error' && currentRetry < retryCount) {
          currentRetry++;
          return 'Retry';
        }
        return 'Cancel';
      }
    };
  }

  /**
   * User provides validation-compliant input
   */
  static validInput(validValues: Record<string, string>): WindowMockConfig {
    return {
      customDialogHandler: (type: string, data: any) => {
        if (type === 'inputBox' && data.options?.prompt) {
          const prompt = data.options.prompt.toLowerCase();
          for (const [key, value] of Object.entries(validValues)) {
            if (prompt.includes(key.toLowerCase())) {
              return value;
            }
          }
        }
        return 'valid-input';
      }
    };
  }

  /**
   * User provides framework-specific responses
   */
  static frameworkDetection(frameworks: string[]): WindowMockConfig {
    return {
      quickPickResponse: frameworks.map(name => ({
        label: name,
        description: `${name} framework detected`,
        picked: true
      })),
      informationResponse: 'Continue',
      warningResponse: 'Proceed Anyway'
    };
  }
}

/**
 * Window mock configuration helper
 */
export class WindowMockHelper {
  private vscode: any;

  constructor(vscode: any) {
    this.vscode = vscode;
  }

  /**
   * Apply a mock configuration
   */
  configure(config: WindowMockConfig): void {
    this.vscode.window.setMockConfig(config);
  }

  /**
   * Apply a predefined scenario
   */
  useScenario(scenario: WindowMockConfig): void {
    this.configure(scenario);
  }

  /**
   * Reset all mock configuration
   */
  reset(): void {
    this.vscode.window.resetMockConfig();
  }

  /**
   * Get message history for verification
   */
  getMessageHistory(): any[] {
    return this.vscode.window.getMessageHistory();
  }

  /**
   * Get interaction history for verification
   */
  getInteractionHistory(): any[] {
    return this.vscode.window.getInteractionHistory();
  }

  /**
   * Verify that a specific message was shown
   */
  verifyMessageShown(type: 'information' | 'warning' | 'error', messagePattern: string | RegExp): boolean {
    const history = this.getMessageHistory();
    return history.some(entry => {
      if (entry.type !== type) return false;
      
      if (typeof messagePattern === 'string') {
        return entry.message.includes(messagePattern);
      } else {
        return messagePattern.test(entry.message);
      }
    });
  }

  /**
   * Verify that a quick pick was shown with specific items
   */
  verifyQuickPickShown(expectedItems?: any[]): boolean {
    const history = this.getInteractionHistory();
    const quickPickEntries = history.filter(entry => entry.type === 'quickPick');
    
    if (quickPickEntries.length === 0) return false;
    
    if (expectedItems) {
      const lastEntry = quickPickEntries[quickPickEntries.length - 1];
      return JSON.stringify(lastEntry.items) === JSON.stringify(expectedItems);
    }
    
    return true;
  }

  /**
   * Verify that an input box was shown with specific options
   */
  verifyInputBoxShown(expectedPrompt?: string): boolean {
    const history = this.getInteractionHistory();
    const inputBoxEntries = history.filter(entry => entry.type === 'inputBox');
    
    if (inputBoxEntries.length === 0) return false;
    
    if (expectedPrompt) {
      const lastEntry = inputBoxEntries[inputBoxEntries.length - 1];
      return lastEntry.options?.prompt === expectedPrompt;
    }
    
    return true;
  }

  /**
   * Count messages of a specific type
   */
  countMessages(type?: 'information' | 'warning' | 'error'): number {
    const history = this.getMessageHistory();
    
    if (type) {
      return history.filter(entry => entry.type === type).length;
    }
    
    return history.length;
  }

  /**
   * Get the last message of a specific type
   */
  getLastMessage(type?: 'information' | 'warning' | 'error'): any {
    const history = this.getMessageHistory();
    
    if (type) {
      const filtered = history.filter(entry => entry.type === type);
      return filtered[filtered.length - 1];
    }
    
    return history[history.length - 1];
  }

  /**
   * Simulate a sequence of user interactions
   */
  simulateUserFlow(interactions: Array<{
    type: 'information' | 'warning' | 'error' | 'quickPick' | 'inputBox';
    response: any;
  }>): void {
    interactions.forEach(interaction => {
      this.vscode.window.simulateUserResponse(interaction.type, interaction.response);
    });
  }

  /**
   * Create a mock configuration for testing notification service
   */
  configureForNotificationTesting(): WindowMockConfig {
    return {
      informationResponse: 'OK',
      warningResponse: 'Acknowledged',
      errorResponse: 'Understood',
      modalResponse: 'Confirmed',
      quickPickResponse: 'Selected',
      inputBoxResponse: 'user-input'
    };
  }

  /**
   * Create a mock configuration for testing command execution
   */
  configureForCommandTesting(): WindowMockConfig {
    return {
      informationResponse: 'Execute',
      warningResponse: 'Continue',
      errorResponse: 'Retry',
      quickPickResponse: 'Option 1',
      inputBoxResponse: 'command-parameter'
    };
  }

  /**
   * Create a mock configuration for testing file operations
   */
  configureForFileOperationTesting(): WindowMockConfig {
    return {
      informationResponse: 'Save',
      warningResponse: 'Overwrite',
      errorResponse: 'Retry',
      customDialogHandler: (type: string, data: any) => {
        if (type === 'saveDialog') {
          return {
            fsPath: '/mock/save/path.yml',
            scheme: 'file',
            toString: () => 'file:///mock/save/path.yml'
          };
        }
        if (type === 'openDialog') {
          return [{
            fsPath: '/mock/open/README.md',
            scheme: 'file',
            toString: () => 'file:///mock/open/README.md'
          }];
        }
        return null;
      }
    };
  }
}

/**
 * Create a window mock helper instance
 */
export function createWindowMockHelper(vscode: any): WindowMockHelper {
  return new WindowMockHelper(vscode);
}

/**
 * Decorator for test methods that automatically sets up window mock configuration
 */
export function withWindowMock(config: WindowMockConfig) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function(...args: any[]) {
      const vscode = require('vscode');
      const helper = new WindowMockHelper(vscode);
      
      // Apply configuration
      helper.configure(config);
      
      try {
        // Execute test method
        const result = originalMethod.apply(this, args);
        
        // If it's a promise, handle cleanup after resolution
        if (result && typeof result.then === 'function') {
          return result.finally(() => helper.reset());
        }
        
        // Reset configuration for non-promise results
        helper.reset();
        return result;
      } catch (error) {
        // Reset configuration on error
        helper.reset();
        throw error;
      }
    };
    
    return descriptor;
  };
}

/**
 * Test utilities for common window API testing patterns
 */
export class WindowMockTestUtils {
  /**
   * Test that a function shows the expected information message
   */
  static async testInformationMessage(
    vscode: any,
    testFunction: () => Promise<void>,
    expectedMessage: string | RegExp,
    expectedResponse: string = 'OK'
  ): Promise<void> {
    const helper = new WindowMockHelper(vscode);
    helper.configure({ informationResponse: expectedResponse });
    
    await testFunction();
    
    const shown = helper.verifyMessageShown('information', expectedMessage);
    if (!shown) {
      throw new Error(`Expected information message matching "${expectedMessage}" was not shown`);
    }
  }

  /**
   * Test that a function shows the expected error message
   */
  static async testErrorMessage(
    vscode: any,
    testFunction: () => Promise<void>,
    expectedMessage: string | RegExp,
    expectedResponse: string = 'OK'
  ): Promise<void> {
    const helper = new WindowMockHelper(vscode);
    helper.configure({ errorResponse: expectedResponse });
    
    await testFunction();
    
    const shown = helper.verifyMessageShown('error', expectedMessage);
    if (!shown) {
      throw new Error(`Expected error message matching "${expectedMessage}" was not shown`);
    }
  }

  /**
   * Test that a function shows a quick pick with expected items
   */
  static async testQuickPick(
    vscode: any,
    testFunction: () => Promise<void>,
    expectedItems: any[],
    selectedResponse: any
  ): Promise<void> {
    const helper = new WindowMockHelper(vscode);
    helper.configure({ quickPickResponse: selectedResponse });
    
    await testFunction();
    
    const shown = helper.verifyQuickPickShown(expectedItems);
    if (!shown) {
      throw new Error(`Expected quick pick with items ${JSON.stringify(expectedItems)} was not shown`);
    }
  }
}