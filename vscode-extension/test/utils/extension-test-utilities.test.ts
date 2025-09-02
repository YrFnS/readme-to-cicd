/**
 * Extension Test Utilities Tests
 * 
 * Tests for the VSCode extension test utilities to ensure they work correctly
 * and provide reliable testing infrastructure for the README-to-CICD extension.
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import { 
  ExtensionTestContext,
  ExtensionTestSuite,
  ExtensionTestUtils,
  withExtensionTestContext,
  mockReadmeContent,
  mockWorkflowContent
} from './extension-test-utilities';
import { 
  CommandTestHelper,
  ReadmeToCICDCommandScenarios,
  CommandTestUtils
} from './command-test-utilities';
import { 
  WebviewTestHelper,
  ReadmeToCICDWebviewScenarios,
  WebviewTestUtils
} from './webview-test-utilities';
import { WindowMockHelper, WindowMockScenarios } from './window-mock-utils';

suite('Extension Test Utilities Tests', () => {
  let sandbox: sinon.SinonSandbox;

  setup(() => {
    sandbox = sinon.createSandbox();
  });

  teardown(() => {
    sandbox.restore();
  });

  suite('ExtensionTestContext', () => {
    test('should initialize with default configuration', async () => {
      const context = new ExtensionTestContext();
      
      assert.ok(context.config.enableVSCodeMock, 'Should enable VSCode mock by default');
      assert.ok(context.config.enableFileSystemMock, 'Should enable file system mock by default');
      assert.ok(context.config.enableWindowMock, 'Should enable window mock by default');
      assert.ok(context.config.simulateUserInteraction, 'Should simulate user interaction by default');
    });

    test('should setup and cleanup properly', async () => {
      const context = new ExtensionTestContext();
      
      await context.setup();
      
      assert.ok(context.vscode, 'Should have VSCode mock');
      assert.ok(context.mockContext, 'Should have mock context');
      assert.ok(context.windowHelper, 'Should have window helper');
      assert.ok(context.sandbox, 'Should have sandbox');
      
      // Test cleanup
      context.cleanup();
      
      assert.ok(context.sandbox.restore.called, 'Should restore sandbox');
    });

    test('should register and execute commands', async () => {
      const context = new ExtensionTestContext();
      await context.setup();
      
      const mockCallback = sinon.stub().resolves({ success: true });
      const disposable = context.registerCommand('test.command', mockCallback);
      
      assert.ok(disposable, 'Should return disposable');
      assert.ok(context.registeredCommands.has('test.command'), 'Should track registered command');
      
      const result = await context.executeCommand('test.command', 'arg1', 'arg2');
      
      assert.ok(mockCallback.calledWith('arg1', 'arg2'), 'Should call command with arguments');
      assert.deepStrictEqual(result, { success: true }, 'Should return command result');
      
      context.cleanup();
    });

    test('should simulate file operations', async () => {
      const context = new ExtensionTestContext();
      await context.setup();
      
      const uri = context.vscode.Uri.file('/test/file.txt');
      const content = Buffer.from('test content');
      
      // Test write operation
      await context.simulateFileOperation('write', uri, content);
      assert.ok(context.vscode.workspace.fs.writeFile.calledWith(uri, content), 'Should write file');
      
      // Test read operation
      const readResult = await context.simulateFileOperation('read', uri);
      assert.ok(Buffer.isBuffer(readResult), 'Should return buffer from read');
      
      context.cleanup();
    });

    test('should create mock documents', async () => {
      const context = new ExtensionTestContext();
      await context.setup();
      
      const document = await context.createMockDocument('# Test README', 'markdown');
      
      assert.ok(document, 'Should create document');
      assert.strictEqual(document.languageId, 'markdown', 'Should have correct language ID');
      assert.strictEqual(document.getText(), '# Test README', 'Should have correct content');
      
      context.cleanup();
    });

    test('should simulate extension activation', async () => {
      const context = new ExtensionTestContext();
      await context.setup();
      
      const result = await context.simulateExtensionActivation();
      
      assert.ok(result.activated, 'Should activate successfully');
      assert.strictEqual(result.commands, 5, 'Should register 5 commands');
      
      const stats = context.getTestStats();
      assert.strictEqual(stats.registeredCommands, 5, 'Should track registered commands');
      assert.strictEqual(stats.registeredProviders, 1, 'Should register tree provider');
      
      context.cleanup();
    });

    test('should handle user interactions', async () => {
      const context = new ExtensionTestContext();
      await context.setup();
      
      context.simulateUserInteraction('information', 'OK');
      context.simulateUserInteraction('quickPick', 'Option 1');
      
      const interactions = [
        { type: 'information' as const, messagePattern: 'test message' },
        { type: 'quickPick' as const }
      ];
      
      // Simulate showing messages
      await context.vscode.window.showInformationMessage('test message');
      await context.vscode.window.showQuickPick(['Option 1', 'Option 2']);
      
      const verified = context.verifyUserInteractions(interactions);
      assert.ok(verified, 'Should verify user interactions');
      
      context.cleanup();
    });
  });

  suite('ExtensionTestSuite', () => {
    test('should provide complete test suite functionality', async () => {
      const suite = new ExtensionTestSuite();
      
      const context = await suite.setup();
      assert.ok(context, 'Should return test context');
      
      const activationResult = await suite.testActivation();
      assert.ok(activationResult.success, 'Should test activation successfully');
      assert.ok(activationResult.commandsRegistered > 0, 'Should register commands');
      
      suite.teardown();
    });

    test('should test command execution', async () => {
      const suite = new ExtensionTestSuite();
      const context = await suite.setup();
      
      // Register a test command
      context.registerCommand('test.command', async () => ({ result: 'success' }));
      
      const result = await suite.testCommandExecution('test.command');
      assert.ok(result.success, 'Should execute command successfully');
      assert.deepStrictEqual(result.result, { result: 'success' }, 'Should return command result');
      
      suite.teardown();
    });

    test('should test user interaction flows', async () => {
      const suite = new ExtensionTestSuite();
      const context = await suite.setup();
      
      const interactions = [
        { type: 'information' as const, response: 'OK' },
        { type: 'inputBox' as const, response: 'user input' }
      ];
      
      const testFunction = async () => {
        await context.vscode.window.showInformationMessage('Test message');
        await context.vscode.window.showInputBox({ prompt: 'Enter value' });
      };
      
      const result = await suite.testUserInteractionFlow(interactions, testFunction);
      assert.ok(result.success, 'Should test interaction flow successfully');
      assert.ok(result.interactionsVerified, 'Should verify interactions');
      
      suite.teardown();
    });

    test('should test file operations', async () => {
      const suite = new ExtensionTestSuite();
      await suite.setup();
      
      const operations = [
        { operation: 'write' as const, path: '/test/file.txt', content: 'test content' },
        { operation: 'read' as const, path: '/test/file.txt' }
      ];
      
      const result = await suite.testFileOperations(operations);
      assert.ok(result.success, 'Should test file operations successfully');
      assert.strictEqual(result.results.length, 2, 'Should return results for all operations');
      
      suite.teardown();
    });
  });

  suite('ExtensionTestUtils', () => {
    test('should create README-to-CICD specific test suite', () => {
      const suite = ExtensionTestUtils.createReadmeToCICDTestSuite();
      const context = suite.getContext();
      
      assert.ok(context.config.mockReadmeContent?.includes('Node.js'), 'Should use Node.js README content');
      assert.ok(context.config.mockWorkflowFiles?.['ci.yml'], 'Should include CI workflow');
      assert.ok(context.config.extensionConfig?.['readme-to-cicd'], 'Should have extension config');
    });

    test('should create minimal test context', async () => {
      const context = ExtensionTestUtils.createMinimalTestContext();
      await context.setup();
      
      assert.ok(context.config.enableVSCodeMock, 'Should enable VSCode mock');
      assert.ok(!context.config.enableFileSystemMock, 'Should not enable file system mock');
      assert.ok(!context.config.enableWindowMock, 'Should not enable window mock');
      
      context.cleanup();
    });

    test('should create integration test context', async () => {
      const context = ExtensionTestUtils.createIntegrationTestContext();
      await context.setup();
      
      assert.ok(context.config.enableVSCodeMock, 'Should enable VSCode mock');
      assert.ok(context.config.enableFileSystemMock, 'Should enable file system mock');
      assert.ok(context.config.enableWindowMock, 'Should enable window mock');
      assert.ok(context.config.simulateUserInteraction, 'Should simulate user interaction');
      
      context.cleanup();
    });

    test('should verify extension requirements', async () => {
      const context = ExtensionTestUtils.createIntegrationTestContext();
      await context.setup();
      
      const requirements = await ExtensionTestUtils.verifyExtensionRequirements(context);
      
      assert.ok(requirements.activationSuccessful, 'Should activate successfully');
      assert.ok(requirements.commandsRegistered.length > 0, 'Should register commands');
      assert.ok(requirements.configurationValid, 'Should have valid configuration');
      assert.ok(requirements.fileSystemAccessible, 'Should have file system access');
      
      context.cleanup();
    });
  });

  suite('CommandTestHelper', () => {
    test('should register and test mock commands', async () => {
      const context = new ExtensionTestContext();
      await context.setup();
      
      const helper = new CommandTestHelper(context);
      const mockImpl = CommandTestUtils.createMockCommandImplementation('success');
      
      helper.registerMockCommand('test.command', mockImpl.implementation);
      
      const result = await helper.testCommand({
        commandId: 'test.command',
        expectedArgs: ['arg1', 'arg2']
      });
      
      assert.ok(result.success, 'Should execute command successfully');
      assert.ok(result.executionTime !== undefined, 'Should track execution time');
      
      const calls = mockImpl.getCalls();
      assert.strictEqual(calls.length, 1, 'Should track command calls');
      assert.deepStrictEqual(calls[0].args, ['arg1', 'arg2'], 'Should pass correct arguments');
      
      context.cleanup();
    });

    test('should test command performance', async () => {
      const context = new ExtensionTestContext();
      await context.setup();
      
      const helper = new CommandTestHelper(context);
      const mockImpl = CommandTestUtils.createMockCommandImplementation('async');
      
      helper.registerMockCommand('test.performance', mockImpl.implementation);
      
      const performance = await helper.testCommandPerformance('test.performance', 3, 1000);
      
      assert.ok(performance.averageTime > 0, 'Should measure average time');
      assert.ok(performance.minTime > 0, 'Should measure min time');
      assert.ok(performance.maxTime > 0, 'Should measure max time');
      assert.strictEqual(performance.results.length, 3, 'Should run specified iterations');
      assert.ok(performance.allWithinLimit, 'Should be within time limit');
      
      context.cleanup();
    });

    test('should test command error handling', async () => {
      const context = new ExtensionTestContext();
      await context.setup();
      
      const helper = new CommandTestHelper(context);
      const mockImpl = CommandTestUtils.createMockCommandImplementation('error');
      
      helper.registerMockCommand('test.error', mockImpl.implementation);
      
      const errorScenarios = [
        {
          name: 'mock-error',
          setup: () => {}, // No additional setup needed
          expectedError: 'Mock command error'
        }
      ];
      
      const results = await helper.testCommandErrorHandling('test.error', errorScenarios);
      
      assert.ok(results['mock-error'], 'Should test error scenario');
      assert.ok(results['mock-error'].success, 'Should handle expected error correctly');
      assert.ok(results['mock-error'].error?.message.includes('Mock command error'), 'Should have expected error message');
      
      context.cleanup();
    });

    test('should verify command execution history', async () => {
      const context = new ExtensionTestContext();
      await context.setup();
      
      const helper = new CommandTestHelper(context);
      const mockImpl = CommandTestUtils.createMockCommandImplementation('success');
      
      helper.registerMockCommand('test.history', mockImpl.implementation);
      
      await helper.testCommand({ commandId: 'test.history', expectedArgs: ['arg1'] });
      await helper.testCommand({ commandId: 'test.history', expectedArgs: ['arg2'] });
      
      const history = helper.getExecutionHistory();
      assert.strictEqual(history.length, 2, 'Should track execution history');
      
      const verified = helper.verifyCommandExecuted('test.history', ['arg1']);
      assert.ok(verified, 'Should verify command execution with specific args');
      
      const count = helper.getCommandExecutionCount('test.history');
      assert.strictEqual(count, 2, 'Should count command executions');
      
      context.cleanup();
    });
  });

  suite('WebviewTestHelper', () => {
    test('should create and manage webview panels', async () => {
      const context = new ExtensionTestContext();
      await context.setup();
      
      const helper = new WebviewTestHelper(context);
      
      const panel = helper.createWebviewPanel({
        viewType: 'test.webview',
        title: 'Test Webview',
        initialHtml: '<h1>Test</h1>',
        enableMessageHandling: true
      });
      
      assert.ok(panel, 'Should create webview panel');
      assert.strictEqual(panel.viewType, 'test.webview', 'Should have correct view type');
      assert.strictEqual(panel.title, 'Test Webview', 'Should have correct title');
      
      const retrieved = helper.getWebviewPanel('test.webview');
      assert.strictEqual(retrieved, panel, 'Should retrieve created panel');
      
      context.cleanup();
    });

    test('should handle webview messages', async () => {
      const context = new ExtensionTestContext();
      await context.setup();
      
      const helper = new WebviewTestHelper(context);
      
      const panel = helper.createWebviewPanel({
        viewType: 'test.messages',
        title: 'Message Test',
        enableMessageHandling: true
      });
      
      // Test sending message to webview
      await helper.sendMessageToWebview('test.messages', {
        command: 'test',
        data: { value: 'hello' }
      });
      
      // Test simulating message from webview
      helper.simulateWebviewMessage('test.messages', {
        command: 'response',
        data: { result: 'received' }
      });
      
      const history = helper.getMessageHistory('test.messages');
      assert.strictEqual(history.length, 2, 'Should track message history');
      
      const sentVerified = helper.verifyMessage('test.messages', 'sent', 'test', { value: 'hello' });
      assert.ok(sentVerified, 'Should verify sent message');
      
      const receivedVerified = helper.verifyMessage('test.messages', 'received', 'response', { result: 'received' });
      assert.ok(receivedVerified, 'Should verify received message');
      
      context.cleanup();
    });

    test('should test message flow', async () => {
      const context = new ExtensionTestContext();
      await context.setup();
      
      const helper = new WebviewTestHelper(context);
      
      helper.createWebviewPanel({
        viewType: 'test.flow',
        title: 'Flow Test',
        enableMessageHandling: true
      });
      
      const messagesToSend = [
        { command: 'init', data: { mode: 'test' } }
      ];
      
      const expectedResponses = [
        { command: 'ready', data: { status: 'initialized' } }
      ];
      
      const result = await helper.testMessageFlow('test.flow', messagesToSend, expectedResponses);
      
      assert.ok(result.success, 'Should test message flow successfully');
      assert.strictEqual(result.sentMessages.length, 1, 'Should send messages');
      assert.strictEqual(result.receivedMessages.length, 1, 'Should receive responses');
      
      context.cleanup();
    });

    test('should test HTML content', async () => {
      const context = new ExtensionTestContext();
      await context.setup();
      
      const helper = new WebviewTestHelper(context);
      
      helper.createWebviewPanel({
        viewType: 'test.html',
        title: 'HTML Test',
        initialHtml: '<div id="container"><h1>Test Title</h1></div>'
      });
      
      const hasContainer = helper.testWebviewHtml('test.html', 'id="container"');
      assert.ok(hasContainer, 'Should find container element');
      
      const hasTitle = helper.testWebviewHtml('test.html', /Test Title/);
      assert.ok(hasTitle, 'Should find title text');
      
      context.cleanup();
    });
  });

  suite('WindowMockHelper', () => {
    test('should configure and verify window interactions', async () => {
      const context = new ExtensionTestContext();
      await context.setup();
      
      const helper = new WindowMockHelper(context.vscode);
      
      // Configure responses
      helper.configure({
        informationResponse: 'Confirmed',
        quickPickResponse: 'Selected Option'
      });
      
      // Simulate interactions
      const infoResult = await context.vscode.window.showInformationMessage('Test message', 'Confirmed', 'Cancel');
      assert.strictEqual(infoResult, 'Confirmed', 'Should return configured response');
      
      const pickResult = await context.vscode.window.showQuickPick(['Selected Option', 'Other Option']);
      assert.strictEqual(pickResult, 'Selected Option', 'Should return configured pick response');
      
      // Verify interactions
      const messageVerified = helper.verifyMessageShown('information', 'Test message');
      assert.ok(messageVerified, 'Should verify message was shown');
      
      const pickVerified = helper.verifyQuickPickShown();
      assert.ok(pickVerified, 'Should verify quick pick was shown');
      
      context.cleanup();
    });

    test('should use predefined scenarios', async () => {
      const context = new ExtensionTestContext();
      await context.setup();
      
      const helper = new WindowMockHelper(context.vscode);
      
      // Use confirm all scenario
      helper.useScenario(WindowMockScenarios.confirmAll());
      
      const result = await context.vscode.window.showInformationMessage('Confirm action?', 'Yes', 'No');
      assert.strictEqual(result, 'OK', 'Should use confirm all scenario');
      
      // Use cancel all scenario
      helper.useScenario(WindowMockScenarios.cancelAll());
      
      const cancelResult = await context.vscode.window.showInputBox({ prompt: 'Enter value' });
      assert.strictEqual(cancelResult, undefined, 'Should use cancel all scenario');
      
      context.cleanup();
    });
  });

  suite('Integration Tests', () => {
    test('should work together for complete extension testing', async () => {
      const suite = ExtensionTestUtils.createReadmeToCICDTestSuite();
      const context = await suite.setup();
      
      // Test activation
      const activationResult = await suite.testActivation();
      assert.ok(activationResult.success, 'Should activate extension');
      
      // Test command execution
      const commandResult = await suite.testCommandExecution('readme-to-cicd.generate');
      assert.ok(commandResult.success, 'Should execute generate command');
      
      // Test user interaction flow
      const interactions = [
        { type: 'quickPick' as const, response: ['ci', 'cd'] },
        { type: 'inputBox' as const, response: 'test-workflow' }
      ];
      
      const interactionResult = await suite.testUserInteractionFlow(interactions, async () => {
        await context.vscode.window.showQuickPick(['ci', 'cd', 'release']);
        await context.vscode.window.showInputBox({ prompt: 'Workflow name' });
      });
      
      assert.ok(interactionResult.success, 'Should handle user interactions');
      assert.ok(interactionResult.interactionsVerified, 'Should verify interactions');
      
      // Test file operations
      const fileOperations = [
        { operation: 'write' as const, path: '/.github/workflows/ci.yml', content: mockWorkflowContent.ci },
        { operation: 'read' as const, path: '/README.md' }
      ];
      
      const fileResult = await suite.testFileOperations(fileOperations);
      assert.ok(fileResult.success, 'Should handle file operations');
      
      suite.teardown();
    });

    test('should support decorator pattern', async () => {
      @withExtensionTestContext({
        mockReadmeContent: mockReadmeContent.nodejs,
        simulateUserInteraction: true
      })
      async function testWithDecorator(context: ExtensionTestContext) {
        assert.ok(context.vscode, 'Should have VSCode mock');
        assert.ok(context.mockContext, 'Should have mock context');
        
        const result = await context.simulateExtensionActivation();
        assert.ok(result.activated, 'Should activate extension');
        
        return { success: true };
      }
      
      const result = await testWithDecorator();
      assert.ok(result.success, 'Should work with decorator');
    });
  });
});