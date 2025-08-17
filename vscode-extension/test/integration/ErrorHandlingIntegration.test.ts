/**
 * Error Handling Integration Tests
 * 
 * Integration tests for comprehensive error handling and user feedback system
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { ErrorHandler } from '../../src/core/ErrorHandler';
import { NotificationService } from '../../src/core/NotificationService';
import { LoggingService } from '../../src/core/LoggingService';
import { ProgressManager } from '../../src/core/ProgressManager';
import { ExtensionConfiguration } from '../../src/core/types';

suite('Error Handling Integration Tests', () => {
  let errorHandler: ErrorHandler;
  let notificationService: NotificationService;
  let loggingService: LoggingService;
  let progressManager: ProgressManager;
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
        get: sandbox.stub().returns([]),
        update: sandbox.stub().resolves()
      } as any,
      globalStorageUri: {
        fsPath: '/test/storage'
      },
      extensionPath: '/test/path',
      extension: {
        packageJSON: { version: '1.0.0' }
      }
    } as any;

    mockConfiguration = {
      debugMode: true,
      notificationLevel: 'all',
      enableFeedbackRequests: true,
      logLevel: 'debug',
      enableFileLogging: false
    } as ExtensionConfiguration;

    // Mock VS Code APIs
    sandbox.stub(vscode.window, 'createOutputChannel').returns({
      appendLine: sandbox.stub(),
      clear: sandbox.stub(),
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

    // Initialize services
    errorHandler = new ErrorHandler(mockContext, mockConfiguration);
    notificationService = new NotificationService(mockContext, mockConfiguration);
    loggingService = new LoggingService(mockContext, mockConfiguration);
    progressManager = new ProgressManager(mockContext, mockConfiguration);
  });

  teardown(() => {
    sandbox.restore();
    errorHandler.dispose();
    notificationService.dispose();
    loggingService.dispose();
    progressManager.dispose();
  });

  suite('Error to Notification Integration', () => {
    test('should show notification when error is handled', async () => {
      const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);

      await errorHandler.handleError(
        new Error('Integration test error'),
        { component: 'integration', operation: 'test' },
        true
      );

      assert.ok(showErrorStub.calledOnce);
    });

    test('should provide recovery actions in notifications', async () => {
      const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves('Retry');
      const executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand').resolves();

      await errorHandler.handleError(
        new Error('Network timeout ETIMEDOUT'),
        { component: 'network', operation: 'api-call' },
        true
      );

      assert.ok(showErrorStub.calledOnce);
      // The recovery action would be executed if user selects it
    });
  });

  suite('Error to Logging Integration', () => {
    test('should log errors when handled', async () => {
      const error = new Error('Logged error');
      const context = { component: 'test', operation: 'logging-test' };

      await errorHandler.handleError(error, context, false);

      const logs = loggingService.getLogs();
      const errorLogs = logs.filter(log => log.message.includes('Logged error'));
      
      assert.ok(errorLogs.length > 0);
    });

    test('should correlate error handling with operation logging', async () => {
      const correlationId = loggingService.startOperation('test-operation', 'integration');

      await errorHandler.handleError(
        new Error('Correlated error'),
        { 
          component: 'integration', 
          operation: 'test-operation',
          additionalData: { correlationId }
        },
        false
      );

      loggingService.endOperation(correlationId, 'test-operation', 'integration', false, 100);

      const operationLogs = loggingService.getOperationLogs(correlationId);
      assert.ok(operationLogs.length >= 2); // start and end logs
    });
  });

  suite('Progress to Error Integration', () => {
    test('should handle errors during progress operations', async () => {
      const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);

      try {
        await progressManager.withProgress(
          {
            title: 'Failing Operation',
            location: vscode.ProgressLocation.Notification,
            showNotification: true
          },
          async (progress) => {
            progress.report({ message: 'Starting...' });
            throw new Error('Operation failed during progress');
          }
        );
        assert.fail('Should have thrown');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.ok(showErrorStub.calledOnce);
      }
    });

    test('should show progress completion notifications', async () => {
      const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);

      await progressManager.withProgress(
        {
          title: 'Successful Operation',
          location: vscode.ProgressLocation.Notification,
          showNotification: true
        },
        async (progress) => {
          progress.report({ message: 'Working...' });
          return 'success';
        }
      );

      assert.ok(showInfoStub.calledOnce);
    });
  });

  suite('Comprehensive Error Scenario', () => {
    test('should handle complex error scenario with all services', async () => {
      const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves('Show Details');
      const createWebviewStub = sandbox.stub(vscode.window, 'createWebviewPanel').returns({
        webview: {
          html: '',
          onDidReceiveMessage: sandbox.stub()
        },
        dispose: sandbox.stub()
      } as any);

      // Start an operation with logging
      const correlationId = loggingService.startOperation('complex-operation', 'integration');

      try {
        // Simulate a complex operation that fails
        await progressManager.withProgress(
          {
            title: 'Complex Operation',
            location: vscode.ProgressLocation.Notification,
            showInStatusBar: true
          },
          async (progress) => {
            progress.report({ message: 'Step 1: Parsing...' });
            
            // Log some steps
            loggingService.info('Parsing started', {
              component: 'integration',
              operation: 'complex-operation',
              correlationId
            });

            progress.report({ message: 'Step 2: Processing...' });
            
            // Simulate an error
            const error = new Error('ENOENT: package.json not found');
            
            // Handle the error
            await errorHandler.handleError(error, {
              component: 'integration',
              operation: 'complex-operation',
              additionalData: { correlationId }
            }, true);

            throw error;
          }
        );
        assert.fail('Should have thrown');
      } catch (error) {
        // End the operation with failure
        loggingService.endOperation(correlationId, 'complex-operation', 'integration', false, 500);
      }

      // Verify all services were involved
      assert.ok(showErrorStub.calledOnce);
      
      const logs = loggingService.getLogs();
      const operationLogs = logs.filter(log => log.correlationId === correlationId);
      assert.ok(operationLogs.length >= 2); // At least start and end

      const errorStats = errorHandler.getErrorStatistics();
      assert.ok(errorStats.total > 0);
    });
  });

  suite('User Feedback Integration', () => {
    test('should request feedback after significant operations', async () => {
      const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage')
        .onFirstCall().resolves(undefined) // Progress completion
        .onSecondCall().resolves('Good'); // Feedback request

      // Simulate a long operation
      await progressManager.withProgress(
        {
          title: 'Long Operation',
          location: vscode.ProgressLocation.Notification,
          showNotification: true
        },
        async (progress) => {
          progress.report({ message: 'Working...' });
          // Simulate work
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'success';
        }
      );

      // Request feedback
      await notificationService.requestOperationFeedback('Long Operation', true, 6000);

      assert.strictEqual(showInfoStub.callCount, 2);
      const feedbackCall = showInfoStub.getCall(1);
      assert.ok(feedbackCall.args[0].includes('How was your experience'));
    });

    test('should handle poor feedback with additional input', async () => {
      const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves('Poor');
      const showInputStub = sandbox.stub(vscode.window, 'showInputBox').resolves('Too slow');

      await notificationService.requestOperationFeedback('Slow Operation', true, 8000);

      assert.ok(showInfoStub.calledOnce);
      assert.ok(showInputStub.calledOnce);
    });
  });

  suite('Error Recovery Integration', () => {
    test('should attempt automatic recovery and log results', async () => {
      const error = new Error('Network timeout ETIMEDOUT');
      const context = { component: 'network', operation: 'api-call' };

      const report = await errorHandler.handleError(error, context, false);
      
      // Mock successful recovery
      sandbox.stub(errorHandler as any, 'executeRecoveryAction').resolves(true);

      const success = await errorHandler.attemptRecovery(report.id, 0);
      assert.strictEqual(success, true);

      // Check that recovery was logged
      const logs = loggingService.getLogs();
      const recoveryLogs = logs.filter(log => log.message.includes('Automatic recovery successful'));
      assert.ok(recoveryLogs.length > 0);
    });

    test('should handle recovery failure gracefully', async () => {
      const error = new Error('Unrecoverable error');
      const context = { component: 'test', operation: 'recovery-test' };

      const report = await errorHandler.handleError(error, context, false);
      
      // Mock failed recovery
      sandbox.stub(errorHandler as any, 'executeRecoveryAction').resolves(false);

      const success = await errorHandler.attemptRecovery(report.id, 0);
      assert.strictEqual(success, false);

      // Error should remain unresolved
      const stats = errorHandler.getErrorStatistics();
      assert.ok(stats.unresolved > 0);
    });
  });

  suite('Status Bar Integration', () => {
    test('should coordinate status bar updates across services', async () => {
      const errorStatusBar = (errorHandler as any).statusBarItem;
      const progressStatusBar = (progressManager as any).statusBarItem;
      const notificationStatusBar = (notificationService as any).statusBarItem;

      const errorShowStub = sandbox.stub(errorStatusBar, 'show');
      const progressShowStub = sandbox.stub(progressStatusBar, 'show');
      const notificationShowStub = sandbox.stub(notificationStatusBar, 'show');

      // Generate an error
      await errorHandler.handleError(
        new Error('Status bar error'),
        { component: 'status', operation: 'test' },
        false
      );

      // Show a notification in status bar
      await notificationService.showInfo('Status bar notification', [], { showInStatusBar: true });

      // Show progress in status bar
      progressManager.showStatusBarProgress('Status bar progress', 50);

      // All services should have updated their status bar items
      assert.ok(errorShowStub.called);
      assert.ok(notificationShowStub.called);
      assert.ok(progressShowStub.called);
    });
  });

  suite('Export and Debugging Integration', () => {
    test('should create comprehensive debug package', async () => {
      // Generate some activity across all services
      const correlationId = loggingService.startOperation('debug-test', 'integration');
      
      await errorHandler.handleError(
        new Error('Debug test error'),
        { component: 'integration', operation: 'debug-test', additionalData: { correlationId } },
        false
      );

      await notificationService.showWarning('Debug test warning');

      loggingService.endOperation(correlationId, 'debug-test', 'integration', false, 200);

      // Export data from all services
      const errorExport = await errorHandler.exportErrorReports();
      const loggingExport = await loggingService.exportLogs();
      const notificationExport = await notificationService.exportNotificationHistory();
      const debugPackage = await loggingService.createDebugPackage();

      // Verify all exports contain relevant data
      const errorData = JSON.parse(errorExport);
      const loggingData = JSON.parse(loggingExport);
      const notificationData = JSON.parse(notificationExport);
      const debugData = JSON.parse(debugPackage);

      assert.ok(errorData.reports.length > 0);
      assert.ok(loggingData.logs.length > 0);
      assert.ok(notificationData.notifications.length > 0);
      assert.ok(debugData.recentLogs.length > 0);

      // Verify correlation
      const correlatedLogs = loggingData.logs.filter((log: any) => log.correlationId === correlationId);
      assert.ok(correlatedLogs.length > 0);
    });
  });

  suite('Performance and Memory Management', () => {
    test('should handle high volume of errors without memory leaks', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Generate many errors
      for (let i = 0; i < 1000; i++) {
        await errorHandler.handleError(
          new Error(`Bulk error ${i}`),
          { component: 'bulk', operation: 'memory-test' },
          false
        );

        if (i % 100 === 0) {
          // Trigger cleanup
          errorHandler.clearOldErrors(0);
          loggingService.clearLogs(0);
          await notificationService.clearNotificationHistory(0);
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      assert.ok(memoryIncrease < 50 * 1024 * 1024, `Memory increase too high: ${memoryIncrease} bytes`);

      // Services should have limited the number of stored items
      const errorStats = errorHandler.getErrorStatistics();
      const loggingStats = loggingService.getStatistics();
      const notificationStats = notificationService.getNotificationStatistics();

      assert.ok(errorStats.total <= 1000);
      assert.ok(loggingStats.totalLogs <= 10000);
      assert.ok(notificationStats.total <= 1000);
    });
  });

  suite('Configuration Integration', () => {
    test('should respect configuration changes across all services', async () => {
      // Change configuration to disable notifications
      mockConfiguration.notificationLevel = 'none';
      mockConfiguration.logLevel = 'error';
      mockConfiguration.enableFeedbackRequests = false;

      const newErrorHandler = new ErrorHandler(mockContext, mockConfiguration);
      const newNotificationService = new NotificationService(mockContext, mockConfiguration);
      const newLoggingService = new LoggingService(mockContext, mockConfiguration);

      const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);
      const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);

      // These should not show notifications
      await newNotificationService.showInfo('Should not show');
      await newErrorHandler.handleError(
        new Error('Should not show notification'),
        { component: 'config', operation: 'test' },
        true
      );

      // This should not log (below error level)
      newLoggingService.info('Should not log', { component: 'config' });

      // This should not request feedback
      await newNotificationService.requestOperationFeedback('Test', true, 6000);

      assert.ok(showErrorStub.notCalled);
      assert.ok(showInfoStub.notCalled);

      const logs = newLoggingService.getLogs();
      const infoLogs = logs.filter(log => log.message === 'Should not log');
      assert.strictEqual(infoLogs.length, 0);

      newErrorHandler.dispose();
      newNotificationService.dispose();
      newLoggingService.dispose();
    });
  });
});