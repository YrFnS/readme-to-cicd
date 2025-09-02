/**
 * VSCode Extension Test Utilities
 * 
 * Comprehensive utilities for testing VSCode extensions with proper mocking,
 * setup helpers, and common test patterns for the README-to-CICD extension.
 */

import * as sinon from 'sinon';
import { 
  setupVSCodeMock, 
  cleanupVSCodeMock, 
  createMockExtensionContext 
} from '../setup/vscode-mock';
import {
  createWorkflowTreeProviderMock,
  createTooltipProviderMock,
  createGenerateWorkflowCommandMock,
  createExtensionActivationMock,
  createMockFileSystem,
  setupMockFileSystem,
  mockReadmeContent,
  mockWorkflowContent
} from '../mocks/vscode-extension-mocks';
import { WindowMockHelper, WindowMockScenarios } from './window-mock-utils';

/**
 * Test suite configuration for extension tests
 */
export interface ExtensionTestConfig {
  // Mock configuration
  enableVSCodeMock?: boolean;
  enableFileSystemMock?: boolean;
  enableWindowMock?: boolean;
  
  // Test data
  mockReadmeContent?: string;
  mockWorkspaceFolder?: string;
  mockWorkflowFiles?: Record<string, string>;
  
  // Behavior configuration
  simulateUserInteraction?: boolean;
  enableProgressReporting?: boolean;
  enableErrorSimulation?: boolean;
  
  // Extension-specific settings
  extensionConfig?: Record<string, any>;
  registeredCommands?: string[];
}

/**
 * Extension test context that provides all necessary mocks and utilities
 */
export class ExtensionTestContext {
  public vscode: any;
  public sandbox: sinon.SinonSandbox;
  public mockContext: any;
  public windowHelper!: WindowMockHelper;
  public config: ExtensionTestConfig;
  
  // Extension component mocks
  public workflowTreeMock: any;
  public tooltipMock: any;
  public commandMock: any;
  public activationMock: any;
  
  // Test state
  public registeredCommands: Map<string, Function> = new Map();
  public registeredProviders: Map<string, any> = new Map();
  public createdDisposables: any[] = [];

  constructor(config: ExtensionTestConfig = {}) {
    this.config = {
      enableVSCodeMock: true,
      enableFileSystemMock: true,
      enableWindowMock: true,
      simulateUserInteraction: true,
      enableProgressReporting: true,
      enableErrorSimulation: false,
      mockWorkspaceFolder: '/mock/workspace',
      extensionConfig: {
        'readme-to-cicd': {
          autoDetect: true,
          defaultOptimization: 'standard',
          workflowTypes: ['ci', 'cd'],
          outputDirectory: '.github/workflows'
        }
      },
      ...config
    };
    
    this.sandbox = sinon.createSandbox();
  }

  /**
   * Initialize the test context with all necessary mocks
   */
  async setup(): Promise<void> {
    if (this.config.enableVSCodeMock) {
      setupVSCodeMock();
      this.vscode = require('vscode');
    }
    
    if (this.config.enableFileSystemMock) {
      this.setupFileSystemMock();
    }
    
    if (this.config.enableWindowMock) {
      this.windowHelper = new WindowMockHelper(this.vscode);
      if (this.config.simulateUserInteraction) {
        this.windowHelper.configure(WindowMockScenarios.confirmAll());
      }
    }
    
    // Create mock extension context
    this.mockContext = createMockExtensionContext();
    
    // Setup extension component mocks
    this.workflowTreeMock = createWorkflowTreeProviderMock();
    this.tooltipMock = createTooltipProviderMock();
    this.commandMock = createGenerateWorkflowCommandMock();
    this.activationMock = createExtensionActivationMock();
    
    // Configure extension settings
    if (this.config.extensionConfig) {
      this.configureExtensionSettings(this.config.extensionConfig);
    }
  }

  /**
   * Clean up all mocks and test state
   */
  cleanup(): void {
    // Dispose all created disposables
    this.createdDisposables.forEach(disposable => {
      if (disposable && typeof disposable.dispose === 'function') {
        disposable.dispose();
      }
    });
    
    // Clear test state
    this.registeredCommands.clear();
    this.registeredProviders.clear();
    this.createdDisposables = [];
    
    // Reset window mock
    if (this.windowHelper) {
      this.windowHelper.reset();
    }
    
    // Cleanup VSCode mock
    if (this.config.enableVSCodeMock) {
      cleanupVSCodeMock();
    }
    
    // Restore sandbox
    this.sandbox.restore();
  }

  /**
   * Setup file system mock with test data
   */
  private setupFileSystemMock(): void {
    const mockFS = createMockFileSystem();
    
    // Add custom README content if provided
    if (this.config.mockReadmeContent) {
      (mockFS['/mock/workspace'] as any)['README.md'] = this.config.mockReadmeContent;
    }
    
    // Add custom workflow files if provided
    if (this.config.mockWorkflowFiles) {
      const workflowsDir = (mockFS['/mock/workspace'] as any)['.github']['workflows'];
      Object.entries(this.config.mockWorkflowFiles).forEach(([filename, content]) => {
        workflowsDir[filename] = content;
      });
    }
    
    setupMockFileSystem(this.vscode, mockFS);
  }

  /**
   * Configure extension settings for testing
   */
  private configureExtensionSettings(settings: Record<string, any>): void {
    if (!this.vscode) return;
    
    // Override getConfiguration to return test settings
    const originalGetConfig = this.vscode.workspace.getConfiguration;
    this.vscode.workspace.getConfiguration = sinon.stub().callsFake((section?: string) => {
      const config = settings[section || 'readme-to-cicd'] || {};
      
      return {
        get: sinon.stub().callsFake((key: string, defaultValue?: any) => {
          return config[key] !== undefined ? config[key] : defaultValue;
        }),
        has: sinon.stub().callsFake((key: string) => config[key] !== undefined),
        inspect: sinon.stub().returns({
          key: section,
          defaultValue: undefined,
          globalValue: undefined,
          workspaceValue: config,
          workspaceFolderValue: undefined
        }),
        update: sinon.stub().resolves()
      };
    });
  }

  /**
   * Register a command for testing
   */
  registerCommand(commandId: string, callback: Function): any {
    if (!this.vscode) {
      throw new Error('VSCode mock not initialized');
    }
    
    const disposable = this.vscode.commands.registerCommand(commandId, callback);
    this.registeredCommands.set(commandId, callback);
    this.createdDisposables.push(disposable);
    
    return disposable;
  }

  /**
   * Execute a registered command
   */
  async executeCommand(commandId: string, ...args: any[]): Promise<any> {
    if (!this.vscode) {
      throw new Error('VSCode mock not initialized');
    }
    
    return await this.vscode.commands.executeCommand(commandId, ...args);
  }

  /**
   * Register a tree data provider for testing
   */
  registerTreeDataProvider(viewId: string, provider: any): any {
    if (!this.vscode) {
      throw new Error('VSCode mock not initialized');
    }
    
    const disposable = this.vscode.window.registerTreeDataProvider(viewId, provider);
    this.registeredProviders.set(viewId, provider);
    this.createdDisposables.push(disposable);
    
    return disposable;
  }

  /**
   * Create a mock webview panel for testing
   */
  createWebviewPanel(viewType: string, title: string, options?: any): any {
    if (!this.vscode) {
      throw new Error('VSCode mock not initialized');
    }
    
    const panel = this.vscode.window.createWebviewPanel(
      viewType,
      title,
      this.vscode.ViewColumn.One,
      options
    );
    
    this.createdDisposables.push(panel);
    return panel;
  }

  /**
   * Simulate file system operations
   */
  async simulateFileOperation(operation: 'read' | 'write' | 'delete', uri: any, content?: Buffer): Promise<any> {
    if (!this.vscode) {
      throw new Error('VSCode mock not initialized');
    }
    
    switch (operation) {
      case 'read':
        return await this.vscode.workspace.fs.readFile(uri);
      case 'write':
        if (!content) {
          throw new Error('Content required for write operation');
        }
        return await this.vscode.workspace.fs.writeFile(uri, content);
      case 'delete':
        return await this.vscode.workspace.fs.delete(uri);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  /**
   * Simulate user interactions with configured responses
   */
  simulateUserInteraction(type: 'information' | 'warning' | 'error' | 'quickPick' | 'inputBox', response: any): void {
    if (!this.windowHelper) {
      throw new Error('Window mock not initialized');
    }
    
    (this.windowHelper as any).vscode.window.simulateUserResponse(type, response);
  }

  /**
   * Verify that expected user interactions occurred
   */
  verifyUserInteractions(expectedInteractions: Array<{
    type: 'information' | 'warning' | 'error' | 'quickPick' | 'inputBox';
    messagePattern?: string | RegExp;
    itemsPattern?: any;
  }>): boolean {
    if (!this.windowHelper) {
      throw new Error('Window mock not initialized');
    }
    
    const messageHistory = this.windowHelper.getMessageHistory();
    const interactionHistory = this.windowHelper.getInteractionHistory();
    
    return expectedInteractions.every(expected => {
      if (['information', 'warning', 'error'].includes(expected.type)) {
        return expected.messagePattern ? 
          this.windowHelper.verifyMessageShown(expected.type as any, expected.messagePattern) :
          messageHistory.some(msg => msg.type === expected.type);
      } else if (expected.type === 'quickPick') {
        return expected.itemsPattern ?
          this.windowHelper.verifyQuickPickShown(expected.itemsPattern) :
          this.windowHelper.verifyQuickPickShown();
      } else if (expected.type === 'inputBox') {
        return this.windowHelper.verifyInputBoxShown();
      }
      return false;
    });
  }

  /**
   * Get extension configuration for testing
   */
  getExtensionConfig(section?: string): any {
    if (!this.vscode) {
      throw new Error('VSCode mock not initialized');
    }
    
    return this.vscode.workspace.getConfiguration(section || 'readme-to-cicd');
  }

  /**
   * Update extension configuration for testing
   */
  async updateExtensionConfig(key: string, value: any, section?: string): Promise<void> {
    if (!this.vscode) {
      throw new Error('VSCode mock not initialized');
    }
    
    const config = this.vscode.workspace.getConfiguration(section || 'readme-to-cicd');
    await config.update(key, value);
  }

  /**
   * Create a mock text document for testing
   */
  async createMockDocument(content: string, languageId: string = 'markdown', uri?: any): Promise<any> {
    if (!this.vscode) {
      throw new Error('VSCode mock not initialized');
    }
    
    const documentUri = uri || this.vscode.Uri.file('/mock/test-document.md');
    
    // Override openTextDocument to return our mock content
    const originalOpenDoc = this.vscode.workspace.openTextDocument;
    this.vscode.workspace.openTextDocument = sinon.stub().callsFake(async (uriOrOptions?: any) => {
      if (uriOrOptions && uriOrOptions.fsPath === documentUri.fsPath) {
        return {
          uri: documentUri,
          fileName: documentUri.fsPath,
          languageId,
          getText: sinon.stub().returns(content),
          lineCount: content.split('\n').length,
          lineAt: sinon.stub().callsFake((line: number) => ({
            text: content.split('\n')[line] || '',
            range: { start: { line, character: 0 }, end: { line, character: 100 } },
            rangeIncludingLineBreak: { start: { line, character: 0 }, end: { line, character: 100 } },
            firstNonWhitespaceCharacterIndex: 0,
            isEmptyOrWhitespace: false
          })),
          save: sinon.stub().resolves(true),
          isDirty: false,
          isClosed: false,
          version: 1
        };
      }
      return originalOpenDoc(uriOrOptions);
    });
    
    return await this.vscode.workspace.openTextDocument(documentUri);
  }

  /**
   * Simulate extension activation for testing
   */
  async simulateExtensionActivation(): Promise<any> {
    if (!this.vscode || !this.mockContext) {
      throw new Error('Test context not properly initialized');
    }
    
    // Mock activation function
    const activate = async (context: any) => {
      // Register all extension commands
      const commands = [
        'readme-to-cicd.generate',
        'readme-to-cicd.validate',
        'readme-to-cicd.preview',
        'readme-to-cicd.init',
        'readme-to-cicd.refresh'
      ];
      
      commands.forEach(commandId => {
        const disposable = this.registerCommand(commandId, async (...args: any[]) => {
          // Mock command execution
          return { success: true, commandId, args };
        });
        context.subscriptions.push(disposable);
      });
      
      // Register tree data provider
      const treeProvider = this.workflowTreeMock.workspaceManager;
      const treeDisposable = this.registerTreeDataProvider('readme-to-cicd-sidebar', treeProvider);
      context.subscriptions.push(treeDisposable);
      
      // Create file watcher
      const watcher = this.vscode.workspace.createFileSystemWatcher('**/README.{md,txt}');
      context.subscriptions.push(watcher);
      
      return { activated: true, commands: commands.length };
    };
    
    return await activate(this.mockContext);
  }

  /**
   * Get test statistics and verification data
   */
  getTestStats(): {
    registeredCommands: number;
    registeredProviders: number;
    createdDisposables: number;
    messageHistory: any[];
    interactionHistory: any[];
  } {
    return {
      registeredCommands: this.registeredCommands.size,
      registeredProviders: this.registeredProviders.size,
      createdDisposables: this.createdDisposables.length,
      messageHistory: this.windowHelper ? this.windowHelper.getMessageHistory() : [],
      interactionHistory: this.windowHelper ? this.windowHelper.getInteractionHistory() : []
    };
  }
}

/**
 * Test suite helper for common extension testing patterns
 */
export class ExtensionTestSuite {
  private context: ExtensionTestContext;
  
  constructor(config?: ExtensionTestConfig) {
    this.context = new ExtensionTestContext(config);
  }

  /**
   * Setup method for test suites
   */
  async setup(): Promise<ExtensionTestContext> {
    await this.context.setup();
    return this.context;
  }

  /**
   * Teardown method for test suites
   */
  teardown(): void {
    this.context.cleanup();
  }

  /**
   * Test extension activation
   */
  async testActivation(): Promise<{
    success: boolean;
    commandsRegistered: number;
    providersRegistered: number;
    error?: Error;
  }> {
    try {
      const result = await this.context.simulateExtensionActivation();
      const stats = this.context.getTestStats();
      
      return {
        success: true,
        commandsRegistered: stats.registeredCommands,
        providersRegistered: stats.registeredProviders
      };
    } catch (error) {
      return {
        success: false,
        commandsRegistered: 0,
        providersRegistered: 0,
        error: error as Error
      };
    }
  }

  /**
   * Test command execution
   */
  async testCommandExecution(commandId: string, ...args: any[]): Promise<{
    success: boolean;
    result?: any;
    error?: Error;
  }> {
    try {
      const result = await this.context.executeCommand(commandId, ...args);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  /**
   * Test user interaction flow
   */
  async testUserInteractionFlow(
    interactions: Array<{
      type: 'information' | 'warning' | 'error' | 'quickPick' | 'inputBox';
      response: any;
    }>,
    testFunction: () => Promise<void>
  ): Promise<{
    success: boolean;
    interactionsVerified: boolean;
    error?: Error;
  }> {
    try {
      // Configure responses
      interactions.forEach(interaction => {
        this.context.simulateUserInteraction(interaction.type, interaction.response);
      });
      
      // Execute test function
      await testFunction();
      
      // Verify interactions occurred
      const interactionsVerified = this.context.verifyUserInteractions(
        interactions.map(i => ({ type: i.type }))
      );
      
      return { success: true, interactionsVerified };
    } catch (error) {
      return { success: false, interactionsVerified: false, error: error as Error };
    }
  }

  /**
   * Test file operations
   */
  async testFileOperations(operations: Array<{
    operation: 'read' | 'write' | 'delete';
    path: string;
    content?: string;
    expectedResult?: any;
  }>): Promise<{
    success: boolean;
    results: any[];
    error?: Error;
  }> {
    try {
      const results = [];
      
      for (const op of operations) {
        const uri = this.context.vscode.Uri.file(op.path);
        const content = op.content ? Buffer.from(op.content) : undefined;
        
        const result = await this.context.simulateFileOperation(op.operation, uri, content);
        results.push(result);
        
        if (op.expectedResult !== undefined) {
          // Verify expected result
          if (JSON.stringify(result) !== JSON.stringify(op.expectedResult)) {
            throw new Error(`Operation ${op.operation} on ${op.path} did not return expected result`);
          }
        }
      }
      
      return { success: true, results };
    } catch (error) {
      return { success: false, results: [], error: error as Error };
    }
  }

  /**
   * Get the test context for advanced testing
   */
  getContext(): ExtensionTestContext {
    return this.context;
  }
}

/**
 * Utility functions for common test scenarios
 */
export class ExtensionTestUtils {
  /**
   * Create a test suite with README-to-CICD specific configuration
   */
  static createReadmeToCICDTestSuite(overrides?: Partial<ExtensionTestConfig>): ExtensionTestSuite {
    const config: ExtensionTestConfig = {
      enableVSCodeMock: true,
      enableFileSystemMock: true,
      enableWindowMock: true,
      simulateUserInteraction: true,
      mockReadmeContent: mockReadmeContent.nodejs,
      mockWorkflowFiles: {
        'ci.yml': mockWorkflowContent.ci,
        'cd.yml': mockWorkflowContent.cd
      },
      extensionConfig: {
        'readme-to-cicd': {
          autoDetect: true,
          defaultOptimization: 'standard',
          workflowTypes: ['ci', 'cd'],
          outputDirectory: '.github/workflows',
          showStatusBar: true,
          enablePreview: true
        }
      },
      ...overrides
    };
    
    return new ExtensionTestSuite(config);
  }

  /**
   * Create a minimal test context for unit testing
   */
  static createMinimalTestContext(): ExtensionTestContext {
    return new ExtensionTestContext({
      enableVSCodeMock: true,
      enableFileSystemMock: false,
      enableWindowMock: false,
      simulateUserInteraction: false
    });
  }

  /**
   * Create a test context for integration testing
   */
  static createIntegrationTestContext(): ExtensionTestContext {
    return new ExtensionTestContext({
      enableVSCodeMock: true,
      enableFileSystemMock: true,
      enableWindowMock: true,
      simulateUserInteraction: true,
      enableProgressReporting: true,
      mockReadmeContent: mockReadmeContent.nodejs
    });
  }

  /**
   * Verify extension meets basic requirements
   */
  static async verifyExtensionRequirements(context: ExtensionTestContext): Promise<{
    activationSuccessful: boolean;
    commandsRegistered: string[];
    providersRegistered: string[];
    configurationValid: boolean;
    fileSystemAccessible: boolean;
  }> {
    // Test activation
    const activationResult = await context.simulateExtensionActivation();
    const activationSuccessful = activationResult && activationResult.activated;
    
    // Get registered commands
    const commands = await context.vscode.commands.getCommands();
    const extensionCommands = commands.filter((cmd: string) => cmd.startsWith('readme-to-cicd.'));
    
    // Get registered providers
    const providerIds = Array.from(context.registeredProviders.keys());
    
    // Test configuration
    const config = context.getExtensionConfig();
    const configurationValid = config && typeof config.get === 'function';
    
    // Test file system access
    let fileSystemAccessible = false;
    try {
      const workspaceFolders = context.vscode.workspace.workspaceFolders;
      fileSystemAccessible = workspaceFolders && workspaceFolders.length > 0;
    } catch (error) {
      fileSystemAccessible = false;
    }
    
    return {
      activationSuccessful,
      commandsRegistered: extensionCommands,
      providersRegistered: providerIds,
      configurationValid,
      fileSystemAccessible
    };
  }
}

/**
 * Decorator for test methods that automatically sets up extension test context
 */
export function withExtensionTestContext(config?: ExtensionTestConfig) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: any[]) {
      const context = new ExtensionTestContext(config);
      
      try {
        await context.setup();
        
        // Add context as first argument
        const result = await originalMethod.call(this, context, ...args);
        
        context.cleanup();
        return result;
      } catch (error) {
        context.cleanup();
        throw error;
      }
    };
    
    return descriptor;
  };
}

// Export commonly used test data
export {
  mockReadmeContent,
  mockWorkflowContent
};