/**
 * VSCode Window API Mock Configuration Tests
 * 
 * Tests for the enhanced window API mock configuration that provides
 * sophisticated behavior simulation for different test scenarios.
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import { setupVSCodeMock, cleanupVSCodeMock } from '../setup/vscode-mock';

suite('VSCode Window API Mock Configuration Tests', () => {
  let vscode: any;

  setup(() => {
    setupVSCodeMock();
    vscode = require('vscode');
  });

  teardown(() => {
    cleanupVSCodeMock();
  });

  suite('Message Display Configuration', () => {
    test('should configure information message responses', async () => {
      // Configure mock to return specific response
      vscode.window.setMockConfig({
        informationResponse: 'Custom Response'
      });

      const result = await vscode.window.showInformationMessage(
        'Test message',
        'Option 1',
        'Option 2'
      );

      assert.strictEqual(result, 'Custom Response');
    });

    test('should configure warning message responses', async () => {
      vscode.window.setMockConfig({
        warningResponse: 'Warning Acknowledged'
      });

      const result = await vscode.window.showWarningMessage(
        'Warning message',
        'Ignore',
        'Fix'
      );

      assert.strictEqual(result, 'Warning Acknowledged');
    });

    test('should configure error message responses', async () => {
      vscode.window.setMockConfig({
        errorResponse: 'Error Handled'
      });

      const result = await vscode.window.showErrorMessage(
        'Error message',
        'Retry',
        'Cancel'
      );

      assert.strictEqual(result, 'Error Handled');
    });

    test('should handle modal message configuration', async () => {
      vscode.window.setMockConfig({
        modalResponse: 'Modal Confirmed'
      });

      const result = await vscode.window.showInformationMessage(
        'Modal message',
        { modal: true },
        'OK',
        'Cancel'
      );

      assert.strictEqual(result, 'Modal Confirmed');
    });

    test('should track message history', async () => {
      await vscode.window.showInformationMessage('Info 1', 'OK');
      await vscode.window.showWarningMessage('Warning 1', 'Ignore');
      await vscode.window.showErrorMessage('Error 1', 'Retry');

      const history = vscode.window.getMessageHistory();
      
      assert.strictEqual(history.length, 3);
      assert.strictEqual(history[0].type, 'information');
      assert.strictEqual(history[0].message, 'Info 1');
      assert.strictEqual(history[1].type, 'warning');
      assert.strictEqual(history[1].message, 'Warning 1');
      assert.strictEqual(history[2].type, 'error');
      assert.strictEqual(history[2].message, 'Error 1');
    });
  });

  suite('Quick Pick Configuration', () => {
    test('should configure quick pick responses', async () => {
      const items = ['Option 1', 'Option 2', 'Option 3'];
      
      vscode.window.setMockConfig({
        quickPickResponse: 'Option 2'
      });

      const result = await vscode.window.showQuickPick(items);
      
      assert.strictEqual(result, 'Option 2');
    });

    test('should handle multi-select quick pick', async () => {
      const items = ['Item 1', 'Item 2', 'Item 3'];
      
      vscode.window.setMockConfig({
        quickPickResponse: ['Item 1', 'Item 3']
      });

      const result = await vscode.window.showQuickPick(items, {
        canPickMany: true
      });
      
      assert.deepStrictEqual(result, ['Item 1', 'Item 3']);
    });

    test('should simulate quick pick cancellation', async () => {
      const items = ['Option 1', 'Option 2'];
      
      vscode.window.simulateCancel(true);

      const result = await vscode.window.showQuickPick(items);
      
      assert.strictEqual(result, undefined);
    });

    test('should track quick pick interactions', async () => {
      const items = ['Test 1', 'Test 2'];
      const options = { placeHolder: 'Select an option' };
      
      await vscode.window.showQuickPick(items, options);

      const history = vscode.window.getInteractionHistory();
      
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].type, 'quickPick');
      assert.deepStrictEqual(history[0].items, items);
      assert.deepStrictEqual(history[0].options, options);
    });
  });

  suite('Input Box Configuration', () => {
    test('should configure input box responses', async () => {
      vscode.window.setMockConfig({
        inputBoxResponse: 'Custom Input'
      });

      const result = await vscode.window.showInputBox({
        prompt: 'Enter value'
      });
      
      assert.strictEqual(result, 'Custom Input');
    });

    test('should simulate input box cancellation', async () => {
      vscode.window.simulateCancel(true);

      const result = await vscode.window.showInputBox({
        prompt: 'Enter value'
      });
      
      assert.strictEqual(result, undefined);
    });

    test('should handle input validation simulation', async () => {
      vscode.window.setMockConfig({
        inputValidationError: true
      });

      const result = await vscode.window.showInputBox({
        prompt: 'Enter valid value',
        validateInput: (value: string) => {
          return value.length < 3 ? 'Too short' : null;
        }
      });
      
      assert.strictEqual(result, undefined);
    });

    test('should track input box interactions', async () => {
      const options = {
        prompt: 'Enter name',
        placeHolder: 'Your name here'
      };
      
      await vscode.window.showInputBox(options);

      const history = vscode.window.getInteractionHistory();
      
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].type, 'inputBox');
      assert.deepStrictEqual(history[0].options, options);
    });
  });

  suite('User Response Simulation', () => {
    test('should simulate different user responses', async () => {
      // Test information message response
      vscode.window.simulateUserResponse('information', 'Yes');
      let result = await vscode.window.showInformationMessage('Confirm?', 'Yes', 'No');
      assert.strictEqual(result, 'Yes');

      // Test warning message response
      vscode.window.simulateUserResponse('warning', 'Proceed');
      result = await vscode.window.showWarningMessage('Continue?', 'Proceed', 'Cancel');
      assert.strictEqual(result, 'Proceed');

      // Test error message response
      vscode.window.simulateUserResponse('error', 'Retry');
      result = await vscode.window.showErrorMessage('Failed!', 'Retry', 'Abort');
      assert.strictEqual(result, 'Retry');
    });

    test('should simulate modal dialog responses', async () => {
      vscode.window.simulateUserResponse('modal', 'Confirmed');

      const result = await vscode.window.showInformationMessage(
        'Important message',
        { modal: true },
        'Confirmed',
        'Cancelled'
      );
      
      assert.strictEqual(result, 'Confirmed');
    });
  });

  suite('Mock Configuration Management', () => {
    test('should reset mock configuration', () => {
      // Set some configuration
      vscode.window.setMockConfig({
        informationResponse: 'Test',
        warningResponse: 'Warning'
      });

      // Add some history
      vscode.window.showInformationMessage('Test message');

      // Reset configuration
      vscode.window.resetMockConfig();

      const config = vscode.window.getMockConfig();
      const messageHistory = vscode.window.getMessageHistory();
      const interactionHistory = vscode.window.getInteractionHistory();

      assert.deepStrictEqual(config, {});
      assert.strictEqual(messageHistory.length, 0);
      assert.strictEqual(interactionHistory.length, 0);
    });

    test('should merge mock configuration', () => {
      vscode.window.setMockConfig({
        informationResponse: 'Info',
        warningResponse: 'Warning'
      });

      vscode.window.setMockConfig({
        errorResponse: 'Error',
        informationResponse: 'Updated Info' // Should override
      });

      const config = vscode.window.getMockConfig();

      assert.strictEqual(config.informationResponse, 'Updated Info');
      assert.strictEqual(config.warningResponse, 'Warning');
      assert.strictEqual(config.errorResponse, 'Error');
    });

    test('should get current mock configuration', () => {
      const testConfig = {
        informationResponse: 'Test Info',
        quickPickResponse: 'Selected Option',
        simulateCancel: false
      };

      vscode.window.setMockConfig(testConfig);
      const retrievedConfig = vscode.window.getMockConfig();

      assert.deepStrictEqual(retrievedConfig, testConfig);
    });
  });

  suite('Advanced Window API Methods', () => {
    test('should mock workspace folder picker', async () => {
      const result = await vscode.window.showWorkspaceFolderPick();
      
      assert.ok(result);
      assert.strictEqual(result.name, 'mock-workspace');
      assert.strictEqual(result.uri.fsPath, '/mock/workspace');
    });

    test('should simulate workspace folder picker cancellation', async () => {
      vscode.window.simulateCancel(true);
      
      const result = await vscode.window.showWorkspaceFolderPick();
      
      assert.strictEqual(result, undefined);
    });

    test('should create input box with full API', () => {
      const inputBox = vscode.window.createInputBox();
      
      assert.ok(inputBox);
      assert.ok(typeof inputBox.show === 'function');
      assert.ok(typeof inputBox.hide === 'function');
      assert.ok(typeof inputBox.dispose === 'function');
      assert.ok(typeof inputBox.onDidChangeValue === 'function');
      assert.ok(typeof inputBox.onDidAccept === 'function');
    });

    test('should create quick pick with full API', () => {
      const quickPick = vscode.window.createQuickPick();
      
      assert.ok(quickPick);
      assert.ok(Array.isArray(quickPick.items));
      assert.ok(typeof quickPick.show === 'function');
      assert.ok(typeof quickPick.hide === 'function');
      assert.ok(typeof quickPick.dispose === 'function');
      assert.ok(typeof quickPick.onDidChangeSelection === 'function');
    });
  });

  suite('Real-World Extension Scenarios', () => {
    test('should handle workflow generation confirmation', async () => {
      // Simulate user confirming workflow generation
      vscode.window.simulateUserResponse('information', 'Generate');

      const result = await vscode.window.showInformationMessage(
        'Generate CI/CD workflows for detected frameworks?',
        'Generate',
        'Cancel'
      );

      assert.strictEqual(result, 'Generate');

      // Verify message was tracked
      const history = vscode.window.getMessageHistory();
      assert.strictEqual(history.length, 1);
      assert.ok(history[0].message.includes('Generate CI/CD workflows'));
    });

    test('should handle error recovery options', async () => {
      // Simulate user choosing to retry after error
      vscode.window.simulateUserResponse('error', 'Retry');

      const result = await vscode.window.showErrorMessage(
        'Failed to generate workflow. Check your README file.',
        'Retry',
        'Open README',
        'Cancel'
      );

      assert.strictEqual(result, 'Retry');
    });

    test('should handle framework selection', async () => {
      const frameworks = [
        { label: 'Node.js', description: 'JavaScript runtime' },
        { label: 'Python', description: 'Python interpreter' },
        { label: 'Java', description: 'Java runtime' }
      ];

      vscode.window.setMockConfig({
        quickPickResponse: frameworks[0]
      });

      const result = await vscode.window.showQuickPick(frameworks, {
        placeHolder: 'Select framework to configure'
      });

      assert.deepStrictEqual(result, frameworks[0]);
    });

    test('should handle workflow name input', async () => {
      vscode.window.setMockConfig({
        inputBoxResponse: 'custom-workflow'
      });

      const result = await vscode.window.showInputBox({
        prompt: 'Enter workflow name',
        placeHolder: 'e.g., ci, deploy, test',
        validateInput: (value: string) => {
          return value.match(/^[a-z0-9-]+$/) ? null : 'Invalid workflow name';
        }
      });

      assert.strictEqual(result, 'custom-workflow');
    });
  });

  suite('Integration with Extension Components', () => {
    test('should support notification service testing', async () => {
      // Test success notification
      vscode.window.simulateUserResponse('information', 'View Workflows');
      
      let result = await vscode.window.showInformationMessage(
        'Successfully generated 3 workflows in 2.5s',
        'View Workflows',
        'Close'
      );
      
      assert.strictEqual(result, 'View Workflows');

      // Test warning notification
      vscode.window.simulateUserResponse('warning', 'Continue Anyway');
      
      result = await vscode.window.showWarningMessage(
        'Some frameworks could not be detected with high confidence',
        'Continue Anyway',
        'Review Detection'
      );
      
      assert.strictEqual(result, 'Continue Anyway');
    });

    test('should support progress reporting testing', async () => {
      let progressReports: any[] = [];
      
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Generating workflows',
          cancellable: true
        },
        async (progress, token) => {
          progress.report({ increment: 25, message: 'Analyzing README...' });
          progressReports.push({ increment: 25, message: 'Analyzing README...' });
          
          progress.report({ increment: 50, message: 'Detecting frameworks...' });
          progressReports.push({ increment: 50, message: 'Detecting frameworks...' });
          
          progress.report({ increment: 100, message: 'Generating YAML...' });
          progressReports.push({ increment: 100, message: 'Generating YAML...' });
          
          return 'Workflows generated successfully';
        }
      );

      assert.strictEqual(result, 'Workflows generated successfully');
      assert.strictEqual(progressReports.length, 3);
    });
  });
});