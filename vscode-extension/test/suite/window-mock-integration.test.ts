/**
 * Window Mock Integration Tests
 * 
 * Integration tests demonstrating the enhanced window API mock configuration
 * working with realistic extension scenarios.
 */

import * as assert from 'assert';
import { setupVSCodeMock, cleanupVSCodeMock } from '../setup/vscode-mock';
import { 
  WindowMockScenarios, 
  WindowMockHelper, 
  WindowMockTestUtils,
  createWindowMockHelper,
  withWindowMock
} from '../utils/window-mock-utils';

suite('Window Mock Integration Tests', () => {
  let vscode: any;
  let mockHelper: WindowMockHelper;

  setup(() => {
    setupVSCodeMock();
    vscode = require('vscode');
    mockHelper = createWindowMockHelper(vscode);
  });

  teardown(() => {
    mockHelper.reset();
    cleanupVSCodeMock();
  });

  suite('Workflow Generation Scenarios', () => {
    test('should handle complete workflow generation flow', async () => {
      // Configure mock for workflow generation scenario
      mockHelper.useScenario(WindowMockScenarios.workflowGeneration({
        confirmGeneration: true,
        selectedFrameworks: ['Node.js', 'React'],
        workflowName: 'ci-cd-pipeline',
        outputDirectory: '/mock/workspace/.github/workflows'
      }));

      // Simulate workflow generation process
      
      // 1. Confirm generation
      const confirmResult = await vscode.window.showInformationMessage(
        'Generate CI/CD workflows for detected frameworks?',
        'Generate',
        'Cancel'
      );
      assert.strictEqual(confirmResult, 'Generate');

      // 2. Select frameworks
      const frameworkItems = [
        { label: 'Node.js', description: 'JavaScript runtime' },
        { label: 'React', description: 'Frontend framework' },
        { label: 'Python', description: 'Python interpreter' }
      ];
      
      const selectedFrameworks = await vscode.window.showQuickPick(frameworkItems, {
        canPickMany: true,
        placeHolder: 'Select frameworks to include'
      });
      assert.deepStrictEqual(selectedFrameworks, ['Node.js', 'React']);

      // 3. Enter workflow name
      const workflowName = await vscode.window.showInputBox({
        prompt: 'Enter workflow name',
        placeHolder: 'e.g., ci, deploy, test'
      });
      assert.strictEqual(workflowName, 'ci-cd-pipeline');

      // Verify interactions were tracked
      assert.ok(mockHelper.verifyMessageShown('information', 'Generate CI/CD workflows'));
      assert.ok(mockHelper.verifyQuickPickShown(frameworkItems));
      assert.ok(mockHelper.verifyInputBoxShown('Enter workflow name'));
    });

    test('should handle workflow generation cancellation', async () => {
      mockHelper.useScenario(WindowMockScenarios.cancelAll());

      const result = await vscode.window.showInformationMessage(
        'Generate CI/CD workflows?',
        'Generate',
        'Cancel'
      );

      assert.strictEqual(result, undefined);
      assert.strictEqual(mockHelper.countMessages('information'), 1);
    });

    test('should handle framework detection with warnings', async () => {
      mockHelper.configure({
        warningResponse: 'Continue Anyway',
        quickPickResponse: [
          { label: 'Node.js', confidence: 0.95 },
          { label: 'React', confidence: 0.75 }
        ]
      });

      // Show warning about low confidence detection
      const warningResult = await vscode.window.showWarningMessage(
        'Some frameworks detected with low confidence. Continue?',
        'Continue Anyway',
        'Review Detection'
      );
      assert.strictEqual(warningResult, 'Continue Anyway');

      // Select frameworks despite warning
      const frameworks = await vscode.window.showQuickPick([
        { label: 'Node.js', confidence: 0.95 },
        { label: 'React', confidence: 0.75 }
      ], {
        canPickMany: true
      });

      assert.ok(frameworks);
      assert.ok(mockHelper.verifyMessageShown('warning', 'low confidence'));
    });
  });

  suite('Error Handling Scenarios', () => {
    test('should handle generation errors with retry', async () => {
      mockHelper.useScenario(WindowMockScenarios.errorRecovery(2));

      // First error - user retries
      let result = await vscode.window.showErrorMessage(
        'Failed to generate workflow: Invalid README format',
        'Retry',
        'Open README',
        'Cancel'
      );
      assert.strictEqual(result, 'Retry');

      // Second error - user retries again
      result = await vscode.window.showErrorMessage(
        'Failed to generate workflow: Missing dependencies',
        'Retry',
        'Install Dependencies',
        'Cancel'
      );
      assert.strictEqual(result, 'Retry');

      // Third error - user cancels
      result = await vscode.window.showErrorMessage(
        'Failed to generate workflow: Network error',
        'Retry',
        'Cancel'
      );
      assert.strictEqual(result, 'Cancel');

      assert.strictEqual(mockHelper.countMessages('error'), 3);
    });

    test('should handle validation errors with details', async () => {
      mockHelper.configure({ errorResponse: 'View Details' });
      const result = await vscode.window.showErrorMessage(
        'Workflow validation failed: 3 errors found',
        'View Details',
        'Ignore',
        'Fix Automatically'
      );

      assert.strictEqual(result, 'View Details');
      assert.ok(mockHelper.verifyMessageShown('error', 'validation failed'));
    });
  });

  suite('User Input Validation', () => {
    test('should handle valid workflow name input', async () => {
      mockHelper.useScenario(WindowMockScenarios.validInput({
        'workflow name': 'valid-workflow-name',
        'output directory': '.github/workflows',
        'commit message': 'Add CI/CD workflows'
      }));

      const workflowName = await vscode.window.showInputBox({
        prompt: 'Enter workflow name',
        validateInput: (value: string) => {
          return value.match(/^[a-z0-9-]+$/) ? null : 'Invalid name format';
        }
      });

      const outputDir = await vscode.window.showInputBox({
        prompt: 'Enter output directory',
        value: '.github/workflows'
      });

      const commitMessage = await vscode.window.showInputBox({
        prompt: 'Enter commit message',
        placeHolder: 'Add CI/CD workflows'
      });

      assert.strictEqual(workflowName, 'valid-workflow-name');
      assert.strictEqual(outputDir, '.github/workflows');
      assert.strictEqual(commitMessage, 'Add CI/CD workflows');
    });

    test('should handle input validation errors', async () => {
      mockHelper.configure({
        inputValidationError: true,
        inputBoxResponse: undefined
      });

      const result = await vscode.window.showInputBox({
        prompt: 'Enter valid workflow name',
        validateInput: (value: string) => {
          return value.length < 3 ? 'Name too short' : null;
        }
      });

      assert.strictEqual(result, undefined);
    });
  });

  suite('Progress and Status Updates', () => {
    test('should handle progress reporting with user interaction', async () => {
      mockHelper.configure({
        informationResponse: 'View Results'
      });

      let progressSteps: string[] = [];

      const result = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Generating Workflows',
        cancellable: true
      }, async (progress, token) => {
        // Step 1: Analyze README
        progress.report({ increment: 20, message: 'Analyzing README file...' });
        progressSteps.push('Analyzing README file...');
        
        // Step 2: Detect frameworks
        progress.report({ increment: 40, message: 'Detecting frameworks...' });
        progressSteps.push('Detecting frameworks...');
        
        // Step 3: Generate templates
        progress.report({ increment: 70, message: 'Generating workflow templates...' });
        progressSteps.push('Generating workflow templates...');
        
        // Step 4: Write files
        progress.report({ increment: 100, message: 'Writing workflow files...' });
        progressSteps.push('Writing workflow files...');
        
        return {
          success: true,
          filesGenerated: 3,
          duration: 2500
        };
      });

      // Show completion message
      const completionResult = await vscode.window.showInformationMessage(
        `Successfully generated ${result.filesGenerated} workflows in ${result.duration}ms`,
        'View Results',
        'Close'
      );

      assert.strictEqual(completionResult, 'View Results');
      assert.strictEqual(progressSteps.length, 4);
      assert.ok(progressSteps.includes('Analyzing README file...'));
      assert.ok(progressSteps.includes('Writing workflow files...'));
    });
  });

  suite('Notification Service Integration', () => {
    test('should test notification service with mock configuration', async () => {
      mockHelper.configureForNotificationTesting();

      // Simulate notification service calls
      await WindowMockTestUtils.testInformationMessage(
        vscode,
        async () => {
          await vscode.window.showInformationMessage(
            'Workflow generation completed successfully',
            'OK'
          );
        },
        'generation completed',
        'OK'
      );

      await WindowMockTestUtils.testErrorMessage(
        vscode,
        async () => {
          await vscode.window.showErrorMessage(
            'Failed to parse README file',
            'Retry'
          );
        },
        /Failed to parse/,
        'Understood'
      );

      // Verify notification history
      const messageHistory = mockHelper.getMessageHistory();
      assert.strictEqual(messageHistory.length, 2);
      assert.strictEqual(messageHistory[0].type, 'information');
      assert.strictEqual(messageHistory[1].type, 'error');
    });
  });

  suite('Command Execution Integration', () => {
    test('should test command execution with user prompts', async () => {
      mockHelper.configureForCommandTesting();

      // Simulate command that requires user input
      const shouldProceed = await vscode.window.showInformationMessage(
        'This will overwrite existing workflows. Continue?',
        'Execute',
        'Cancel'
      );

      if (shouldProceed === 'Execute') {
        const targetFramework = await vscode.window.showQuickPick([
          'Node.js',
          'Python',
          'Java'
        ], {
          placeHolder: 'Select target framework'
        });

        const customParameter = await vscode.window.showInputBox({
          prompt: 'Enter custom parameter (optional)'
        });

        assert.strictEqual(targetFramework, 'Option 1'); // Mock returns first item
        assert.strictEqual(customParameter, 'command-parameter');
      }

      assert.strictEqual(shouldProceed, 'Execute');
    });
  });

  suite('File Operation Integration', () => {
    test('should test file operations with dialogs', async () => {
      mockHelper.configureForFileOperationTesting();

      // Test save dialog
      const saveLocation = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file('/mock/workspace/.github/workflows/ci.yml'),
        filters: {
          'YAML files': ['yml', 'yaml'],
          'All files': ['*']
        }
      });

      assert.ok(saveLocation);
      assert.ok(saveLocation.fsPath.includes('.yml'));

      // Test open dialog
      const openFiles = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: {
          'Markdown files': ['md'],
          'All files': ['*']
        }
      });

      assert.ok(openFiles);
      assert.strictEqual(openFiles.length, 1);
      assert.ok(openFiles[0].fsPath.includes('README.md'));

      // Test overwrite confirmation
      const overwriteResult = await vscode.window.showWarningMessage(
        'File already exists. Overwrite?',
        'Overwrite',
        'Cancel'
      );

      assert.strictEqual(overwriteResult, 'Overwrite');
    });
  });

  suite('Complex User Flows', () => {
    test('should handle multi-step configuration wizard', async () => {
      // Step 1: Welcome and confirmation
      mockHelper.simulateUserFlow([
        { type: 'information', response: 'Start Configuration' },
        { type: 'quickPick', response: 'Advanced' },
        { type: 'inputBox', response: 'my-project' },
        { type: 'quickPick', response: ['Node.js', 'TypeScript'] },
        { type: 'information', response: 'Generate' }
      ]);

      // Welcome
      let result = await vscode.window.showInformationMessage(
        'Welcome to README-to-CICD configuration wizard',
        'Start Configuration',
        'Cancel'
      );
      assert.strictEqual(result, 'Start Configuration');

      // Configuration level
      result = await vscode.window.showQuickPick([
        'Basic',
        'Advanced',
        'Expert'
      ], {
        placeHolder: 'Select configuration level'
      });
      assert.strictEqual(result, 'Advanced');

      // Project name
      result = await vscode.window.showInputBox({
        prompt: 'Enter project name',
        placeHolder: 'my-awesome-project'
      });
      assert.strictEqual(result, 'my-project');

      // Framework selection
      result = await vscode.window.showQuickPick([
        'Node.js',
        'TypeScript',
        'React',
        'Vue.js'
      ], {
        canPickMany: true,
        placeHolder: 'Select frameworks'
      });
      assert.deepStrictEqual(result, ['Node.js', 'TypeScript']);

      // Final confirmation
      result = await vscode.window.showInformationMessage(
        'Configuration complete. Generate workflows?',
        'Generate',
        'Review',
        'Cancel'
      );
      assert.strictEqual(result, 'Generate');

      // Verify all interactions were tracked
      const messageHistory = mockHelper.getMessageHistory();
      const interactionHistory = mockHelper.getInteractionHistory();
      
      assert.strictEqual(messageHistory.length, 2); // Welcome + confirmation
      assert.strictEqual(interactionHistory.length, 3); // 2 quick picks + 1 input box
    });
  });
});