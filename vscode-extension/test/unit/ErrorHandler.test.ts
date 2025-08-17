/**
 * Error Handler Tests
 * 
 * Comprehensive tests for error handling scenarios and user feedback
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { ErrorHandler, ErrorContext, ErrorRecovery } from '../../src/core/ErrorHandler';
import { ExtensionConfiguration } from '../../src/core/types';

suite('ErrorHandler Tests', () => {
  let errorHandler: ErrorHandler;
  let mockContext: vscode.ExtensionContext;
  let mockConfiguration: ExtensionConfiguration;
  let sandbox: sinon.SinonSandbox;

  setup(() => {
    sandbox = sinon.createSandbox();
    
    mockContext = {
      subscriptions: [],
      workspaceState: {
        get: sandbox.stub(),
        update: sandbox.stub()
      } as any,
      globalState: {
        get: sandbox.stub(),
        update: sandbox.stub()
      } as any,
      extensionPath: '/test/path',
      extension: {
        packageJSON: { version: '1.0.0' }
      }
    } as any;

    mockConfiguration = {
      debugMode: true,
      notificationLevel: 'all',
      enableFeedbackRequests: true
    } as ExtensionConfiguration;

    // Mock VS Code APIs
    sandbox.stub(vscode.window, 'createOutputChannel').returns({
      appendLine: sandbox.stub(),
      show: sandbox.stub(),
      dispose: sandbox.stub()
    } as any);

    sandbox.stub(vscode.window, 'createStatusBarItem').returns({
      text: '',
      tooltip: '',
      command: '',
      show: sandbox.stub(),
      hide: sandbox.stub(),
      dispose: sandbox.stub()
    } as any);

    errorHandler = new ErrorHandler(mockContext, mockConfiguration);
  });

  teardown(() => {
    sandbox.restore();
    errorHandler.dispose();
  });

  suite('Error Handling', () => {
    test('should handle basic error with context', async () => {
      const error = new Error('Test error');
      const context: ErrorContext = {
        component: 'test-component',
        operation: 'test-operation'
      };

      sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);

      const report = await errorHandler.handleError(error, context, false);

      assert.strictEqual(report.message, 'Test error');
      assert.strictEqual(report.context.component, 'test-component');
      assert.strictEqual(report.context.operation, 'test-operation');
      assert.strictEqual(report.level, 'error');
      assert.strictEqual(report.resolved, false);
    });

    test('should handle string error', async () => {
      const errorMessage = 'String error message';
      const context: ErrorContext = {
        component: 'parser',
        operation: 'file-read'
      };

      const report = await errorHandler.handleError(errorMessage, context, false);

      assert.strictEqual(report.message, errorMessage);
      assert.strictEqual(report.originalError, undefined);
    });

    test('should generate user-friendly error messages', async () => {
      const error = new Error('ENOENT: no such file or directory');
      const context: ErrorContext = {
        component: 'file-system',
        operation: 'read-file'
      };

      const report = await errorHandler.handleError(error, context, false);

      assert.ok(report.userMessage.includes('File or folder not found'));
      assert.ok(report.userMessage.includes('read-file'));
    });

    test('should match error patterns', async () => {
      const error = new Error('ENOENT: no such file or directory, open \'package.json\'');
      const context: ErrorContext = {
        component: 'parser',
        operation: 'parse-project'
      };

      const report = await errorHandler.handleError(error, context, false);

      assert.ok(report.userMessage.includes('Package.json file not found'));
      assert.ok(report.recoveryOptions.length > 0);
      assert.ok(report.recoveryOptions.some(option => 
        option.suggestion.includes('Create a package.json file')
      ));
    });

    test('should provide recovery options', async () => {
      const error = new Error('Failed to parse YAML');
      const context: ErrorContext = {
        component: 'yaml-generator',
        operation: 'yaml-generation'
      };

      const report = await errorHandler.handleError(error, context, false);

      assert.ok(report.recoveryOptions.length > 0);
      assert.ok(report.recoveryOptions.some(option => 
        option.suggestion.includes('Validate YAML syntax')
      ));
    });
  });

  suite('Warning Handling', () => {
    test('should handle warnings with appropriate level', async () => {
      const message = 'This is a warning message';
      const context: ErrorContext = {
        component: 'validator',
        operation: 'validation'
      };

      sandbox.stub(vscode.window, 'showWarningMessage').resolves(undefined);

      const report = await errorHandler.handleWarning(message, context, false);

      assert.strictEqual(report.level, 'warning');
      assert.strictEqual(report.message, message);
    });

    test('should show warning to user when requested', async () => {
      const showWarningStub = sandbox.stub(vscode.window, 'showWarningMessage').resolves(undefined);
      
      const message = 'Warning message';
      const context: ErrorContext = {
        component: 'test',
        operation: 'test'
      };

      await errorHandler.handleWarning(message, context, true);

      assert.ok(showWarningStub.calledOnce);
    });
  });

  suite('Info Handling', () => {
    test('should handle info messages', async () => {
      const message = 'Information message';
      const context: ErrorContext = {
        component: 'info-component',
        operation: 'info-operation'
      };

      const report = await errorHandler.handleInfo(message, context, false);

      assert.strictEqual(report.level, 'info');
      assert.strictEqual(report.message, message);
      assert.strictEqual(report.resolved, true);
    });
  });

  suite('Automatic Recovery', () => {
    test('should attempt automatic recovery for recoverable errors', async () => {
      const error = new Error('Network timeout');
      const context: ErrorContext = {
        component: 'network',
        operation: 'api-call'
      };

      const report = await errorHandler.handleError(error, context, false);
      
      // Find automatic recovery option
      const automaticRecovery = report.recoveryOptions.find(option => option.automatic);
      assert.ok(automaticRecovery, 'Should have automatic recovery option');

      // Mock successful recovery
      sandbox.stub(errorHandler as any, 'executeRecoveryAction').resolves(true);

      const success = await errorHandler.attemptRecovery(report.id, 0);
      assert.strictEqual(success, true);
    });

    test('should handle recovery failure gracefully', async () => {
      const error = new Error('Test error');
      const context: ErrorContext = {
        component: 'test',
        operation: 'test'
      };

      const report = await errorHandler.handleError(error, context, false);

      // Mock failed recovery
      sandbox.stub(errorHandler as any, 'executeRecoveryAction').resolves(false);

      const success = await errorHandler.attemptRecovery(report.id, 0);
      assert.strictEqual(success, false);
    });
  });

  suite('Error Statistics', () => {
    test('should provide error statistics', async () => {
      // Generate some test errors
      await errorHandler.handleError(new Error('Error 1'), { component: 'comp1', operation: 'op1' }, false);
      await errorHandler.handleError(new Error('Error 2'), { component: 'comp2', operation: 'op2' }, false);
      await errorHandler.handleWarning('Warning 1', { component: 'comp1', operation: 'op3' }, false);

      const stats = errorHandler.getErrorStatistics();

      assert.strictEqual(stats.total, 3);
      assert.strictEqual(stats.unresolved, 2); // Errors are unresolved by default
      assert.strictEqual(stats.byLevel.error, 2);
      assert.strictEqual(stats.byLevel.warning, 1);
      assert.ok(stats.byComponent['comp1'] >= 1);
      assert.ok(stats.byComponent['comp2'] >= 1);
    });

    test('should group errors by component', async () => {
      await errorHandler.handleError(new Error('Error 1'), { component: 'parser', operation: 'parse' }, false);
      await errorHandler.handleError(new Error('Error 2'), { component: 'parser', operation: 'validate' }, false);
      await errorHandler.handleError(new Error('Error 3'), { component: 'generator', operation: 'generate' }, false);

      const stats = errorHandler.getErrorStatistics();

      assert.strictEqual(stats.byComponent['parser'], 2);
      assert.strictEqual(stats.byComponent['generator'], 1);
    });

    test('should identify common errors', async () => {
      const commonError = 'This is a common error message';
      
      // Generate multiple instances of the same error
      for (let i = 0; i < 3; i++) {
        await errorHandler.handleError(
          new Error(commonError), 
          { component: 'test', operation: 'test' }, 
          false
        );
      }

      const stats = errorHandler.getErrorStatistics();
      const commonErrors = stats.commonErrors;

      assert.ok(commonErrors.length > 0);
      assert.ok(commonErrors[0].count >= 3);
      assert.ok(commonErrors[0].message.includes(commonError.substring(0, 50)));
    });
  });

  suite('Error Export and Cleanup', () => {
    test('should export error reports', async () => {
      await errorHandler.handleError(new Error('Test error'), { component: 'test', operation: 'test' }, false);

      const exportData = await errorHandler.exportErrorReports();
      const parsed = JSON.parse(exportData);

      assert.ok(parsed.timestamp);
      assert.ok(parsed.version);
      assert.ok(parsed.statistics);
      assert.ok(Array.isArray(parsed.reports));
      assert.strictEqual(parsed.reports.length, 1);
    });

    test('should clear old resolved errors', async () => {
      // Create an old resolved error
      const report = await errorHandler.handleError(
        new Error('Old error'), 
        { component: 'test', operation: 'test' }, 
        false
      );
      
      // Mark as resolved
      (errorHandler as any).errorReports.get(report.id).resolved = true;
      (errorHandler as any).errorReports.get(report.id).timestamp = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);

      const cleared = errorHandler.clearOldErrors(7);
      assert.strictEqual(cleared, 1);
    });
  });

  suite('User Interaction', () => {
    test('should show error details to user', async () => {
      const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves('Show Details');
      const createWebviewStub = sandbox.stub(vscode.window, 'createWebviewPanel').returns({
        webview: {
          html: '',
          onDidReceiveMessage: sandbox.stub()
        },
        dispose: sandbox.stub()
      } as any);

      const error = new Error('Test error for details');
      const context: ErrorContext = {
        component: 'test',
        operation: 'test'
      };

      await errorHandler.handleError(error, context, true);

      assert.ok(showErrorStub.calledOnce);
      // Note: createWebviewPanel would be called when 'Show Details' is selected
    });

    test('should handle recovery action selection', async () => {
      const executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand').resolves();
      sandbox.stub(vscode.window, 'showErrorMessage').resolves('Create a package.json file');

      const error = new Error('ENOENT: no such file or directory, open \'package.json\'');
      const context: ErrorContext = {
        component: 'parser',
        operation: 'parse-project'
      };

      await errorHandler.handleError(error, context, true);

      // The recovery action should be executed
      // Note: This would require more complex mocking to fully test
    });
  });

  suite('Error Patterns', () => {
    test('should recognize YAML syntax errors', async () => {
      const error = new Error('Failed to parse YAML syntax error');
      const context: ErrorContext = {
        component: 'yaml-parser',
        operation: 'parse-yaml'
      };

      const report = await errorHandler.handleError(error, context, false);

      assert.ok(report.userMessage.includes('Invalid YAML syntax'));
      assert.ok(report.recoveryOptions.some(option => 
        option.suggestion.includes('Validate YAML syntax')
      ));
    });

    test('should recognize permission errors', async () => {
      const error = new Error('Permission denied EACCES');
      const context: ErrorContext = {
        component: 'file-system',
        operation: 'write-file'
      };

      const report = await errorHandler.handleError(error, context, false);

      assert.ok(report.userMessage.includes('Permission denied'));
      assert.ok(report.recoveryOptions.some(option => 
        option.suggestion.includes('permission')
      ));
    });

    test('should recognize network timeout errors', async () => {
      const error = new Error('Network timeout ETIMEDOUT');
      const context: ErrorContext = {
        component: 'network',
        operation: 'api-request'
      };

      const report = await errorHandler.handleError(error, context, false);

      assert.ok(report.userMessage.includes('Network timeout'));
      assert.ok(report.recoveryOptions.some(option => 
        option.suggestion.includes('Retry')
      ));
    });
  });

  suite('Status Bar Integration', () => {
    test('should update status bar with error count', async () => {
      const statusBarItem = (errorHandler as any).statusBarItem;
      const showStub = sandbox.stub(statusBarItem, 'show');
      const hideStub = sandbox.stub(statusBarItem, 'hide');

      // Initially no errors, status bar should be hidden
      assert.ok(hideStub.notCalled);

      // Add an error
      await errorHandler.handleError(new Error('Test error'), { component: 'test', operation: 'test' }, false);

      // Status bar should show error count
      assert.ok(statusBarItem.text.includes('1 error'));
      assert.ok(showStub.called);
    });

    test('should hide status bar when no unresolved errors', async () => {
      const statusBarItem = (errorHandler as any).statusBarItem;
      const hideStub = sandbox.stub(statusBarItem, 'hide');

      // Add and resolve an error
      const report = await errorHandler.handleError(new Error('Test error'), { component: 'test', operation: 'test' }, false);
      (errorHandler as any).errorReports.get(report.id).resolved = true;
      (errorHandler as any).updateStatusBar();

      assert.ok(hideStub.called);
    });
  });

  suite('Global Error Handlers', () => {
    test('should handle uncaught exceptions', (done) => {
      // This test is tricky because we need to test global error handlers
      // without actually causing uncaught exceptions in the test suite
      
      const originalHandler = process.listeners('uncaughtException');
      
      // Verify that error handler sets up global handlers
      const handlers = process.listeners('uncaughtException');
      assert.ok(handlers.length > originalHandler.length);
      
      done();
    });

    test('should handle unhandled promise rejections', (done) => {
      const originalHandler = process.listeners('unhandledRejection');
      
      // Verify that error handler sets up global handlers
      const handlers = process.listeners('unhandledRejection');
      assert.ok(handlers.length > originalHandler.length);
      
      done();
    });
  });
});