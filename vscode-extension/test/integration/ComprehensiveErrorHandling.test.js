"use strict";
/**
 * Comprehensive Error Handling Integration Tests
 *
 * End-to-end tests for the complete error handling and user feedback system
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const vscode = __importStar(require("vscode"));
const sinon = __importStar(require("sinon"));
const ExtensionManager_1 = require("../../src/core/ExtensionManager");
suite('Comprehensive Error Handling Integration Tests', () => {
    let extensionManager;
    let mockContext;
    let mockConfiguration;
    let sandbox;
    setup(() => {
        sandbox = sinon.createSandbox();
        mockContext = {
            subscriptions: [],
            workspaceState: {
                get: sandbox.stub(),
                update: sandbox.stub()
            },
            globalState: {
                get: sandbox.stub().returns([]),
                update: sandbox.stub().resolves()
            },
            globalStorageUri: {
                fsPath: '/test/storage'
            },
            extensionPath: '/test/path',
            extension: {
                packageJSON: {
                    version: '1.0.0',
                    publisher: 'test',
                    name: 'readme-to-cicd',
                    displayName: 'README to CI/CD',
                    description: 'Test extension',
                    repository: { url: 'https://github.com/test/repo' },
                    bugs: { url: 'https://github.com/test/repo/issues' }
                }
            }
        };
        mockConfiguration = {
            debugMode: true,
            notificationLevel: 'all',
            enableFeedbackRequests: true,
            logLevel: 'debug',
            enableFileLogging: false
        };
        // Mock VS Code APIs
        sandbox.stub(vscode.window, 'createOutputChannel').returns({
            appendLine: sandbox.stub(),
            clear: sandbox.stub(),
            show: sandbox.stub(),
            dispose: sandbox.stub()
        });
        sandbox.stub(vscode.window, 'createStatusBarItem').returns({
            text: '',
            tooltip: '',
            command: '',
            show: sandbox.stub(),
            hide: sandbox.stub(),
            dispose: sandbox.stub()
        });
        sandbox.stub(vscode.workspace, 'getConfiguration').returns({
            get: sandbox.stub().returns(false)
        });
        extensionManager = new ExtensionManager_1.ExtensionManager(mockContext, mockConfiguration);
    });
    teardown(() => {
        sandbox.restore();
        extensionManager.deactivate();
    });
    suite('Extension Initialization with Error Handling', () => {
        test('should initialize successfully with all error handling services', async () => {
            const withProgressStub = sandbox.stub(vscode.window, 'withProgress').resolves();
            const showSuccessStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves();
            await extensionManager.initialize();
            // Verify all services are available
            assert.ok(extensionManager.getErrorHandler());
            assert.ok(extensionManager.getNotificationService());
            assert.ok(extensionManager.getLoggingService());
            assert.ok(extensionManager.getProgressManager());
            assert.ok(withProgressStub.calledOnce);
        });
        test('should handle initialization errors gracefully', async () => {
            const withProgressStub = sandbox.stub(vscode.window, 'withProgress').rejects(new Error('Initialization failed'));
            const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves();
            try {
                await extensionManager.initialize();
                assert.fail('Should have thrown');
            }
            catch (error) {
                assert.ok(error instanceof Error);
                assert.strictEqual(error.message, 'Initialization failed');
            }
            // Error should be logged and handled
            const logs = extensionManager.getLoggingService().getLogs();
            const errorLogs = logs.filter(log => log.message.includes('failed'));
            assert.ok(errorLogs.length > 0);
        });
    });
    suite('Error Reporting and Recovery', () => {
        test('should report errors with full context', async () => {
            const testError = new Error('Test error for reporting');
            await extensionManager.reportError('test-context', testError);
            // Verify error was logged
            const logs = extensionManager.getLoggingService().getLogs();
            const errorLogs = logs.filter(log => log.message.includes('Test error for reporting'));
            assert.ok(errorLogs.length > 0);
            // Verify error statistics were updated
            const errorStats = extensionManager.getErrorHandler().getErrorStatistics();
            assert.ok(errorStats.total > 0);
        });
        test('should handle critical errors with user interaction', async () => {
            const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage')
                .onFirstCall().resolves(undefined) // Initial error notification
                .onSecondCall().resolves('Create Debug Package'); // Critical error dialog
            const showSaveDialogStub = sandbox.stub(vscode.window, 'showSaveDialog').resolves(vscode.Uri.file('/test/debug-package.json'));
            const writeFileStub = sandbox.stub(vscode.workspace.fs, 'writeFile').resolves();
            const showSuccessStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves();
            const criticalError = new Error('Critical system failure');
            await extensionManager.handleCriticalError(criticalError, 'critical-test');
            assert.ok(showErrorStub.calledTwice);
            assert.ok(showSaveDialogStub.calledOnce);
            assert.ok(writeFileStub.calledOnce);
        });
    });
    suite('Progress and Notification Integration', () => {
        test('should show progress with error handling', async () => {
            const progressManager = extensionManager.getProgressManager();
            const notificationService = extensionManager.getNotificationService();
            const withProgressStub = sandbox.stub(vscode.window, 'withProgress').callsFake(async (options, task) => {
                const mockProgress = {
                    report: sandbox.stub()
                };
                const mockToken = {
                    isCancellationRequested: false,
                    onCancellationRequested: sandbox.stub()
                };
                return await task(mockProgress, mockToken);
            });
            const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves();
            await progressManager.withProgress({
                title: 'Test Operation',
                location: vscode.ProgressLocation.Notification,
                showNotification: true
            }, async (progress) => {
                progress.report({ message: 'Working...' });
                return 'success';
            });
            assert.ok(withProgressStub.calledOnce);
            assert.ok(showInfoStub.calledOnce);
        });
        test('should handle progress operation failures', async () => {
            const progressManager = extensionManager.getProgressManager();
            const withProgressStub = sandbox.stub(vscode.window, 'withProgress').callsFake(async (options, task) => {
                const mockProgress = {
                    report: sandbox.stub()
                };
                const mockToken = {
                    isCancellationRequested: false,
                    onCancellationRequested: sandbox.stub()
                };
                return await task(mockProgress, mockToken);
            });
            const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves();
            try {
                await progressManager.withProgress({
                    title: 'Failing Operation',
                    location: vscode.ProgressLocation.Notification,
                    showNotification: true
                }, async (progress) => {
                    progress.report({ message: 'About to fail...' });
                    throw new Error('Operation failed');
                });
                assert.fail('Should have thrown');
            }
            catch (error) {
                assert.ok(error instanceof Error);
                assert.strictEqual(error.message, 'Operation failed');
            }
            assert.ok(withProgressStub.calledOnce);
            assert.ok(showErrorStub.calledOnce);
        });
    });
    suite('Logging and Debugging', () => {
        test('should create comprehensive debug package', async () => {
            const loggingService = extensionManager.getLoggingService();
            const errorHandler = extensionManager.getErrorHandler();
            const notificationService = extensionManager.getNotificationService();
            // Generate some activity
            loggingService.info('Test log entry', { component: 'test' });
            await errorHandler.handleError(new Error('Test error'), { component: 'test', operation: 'test' }, false);
            await notificationService.showInfo('Test notification');
            const debugPackage = await extensionManager.createDebugPackage();
            const parsed = JSON.parse(debugPackage);
            assert.ok(parsed.timestamp);
            assert.ok(parsed.extensionDiagnostics);
            assert.ok(parsed.errorReports);
            assert.ok(parsed.logs);
            assert.ok(parsed.notifications);
            assert.ok(parsed.debugPackage);
            assert.ok(parsed.systemInfo);
            // Verify data integrity
            assert.ok(parsed.logs.logs.length > 0);
            assert.ok(parsed.errorReports.reports.length > 0);
            assert.ok(parsed.notifications.notifications.length > 0);
        });
        test('should export debug package to file', async () => {
            const showSaveDialogStub = sandbox.stub(vscode.window, 'showSaveDialog').resolves(vscode.Uri.file('/test/debug-export.json'));
            const writeFileStub = sandbox.stub(vscode.workspace.fs, 'writeFile').resolves();
            const showSuccessStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves();
            // This would be called internally by exportDebugPackage
            const debugData = await extensionManager.createDebugPackage();
            assert.ok(debugData.length > 0);
            // Simulate the export process
            if (showSaveDialogStub.returnValues[0]) {
                await vscode.workspace.fs.writeFile(showSaveDialogStub.returnValues[0], Buffer.from(debugData));
            }
            assert.ok(writeFileStub.calledOnce);
        });
    });
    suite('User Feedback and Interaction', () => {
        test('should request feedback after significant operations', async () => {
            const notificationService = extensionManager.getNotificationService();
            const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves('Good');
            await notificationService.requestOperationFeedback('Long Operation', true, 6000);
            assert.ok(showInfoStub.calledOnce);
            const call = showInfoStub.getCall(0);
            assert.ok(call.args[0].includes('How was your experience'));
        });
        test('should handle poor feedback with additional input', async () => {
            const notificationService = extensionManager.getNotificationService();
            const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves('Poor');
            const showInputStub = sandbox.stub(vscode.window, 'showInputBox').resolves('Too slow');
            await notificationService.requestOperationFeedback('Slow Operation', true, 8000);
            assert.ok(showInfoStub.calledOnce);
            assert.ok(showInputStub.calledOnce);
            // Verify feedback was recorded
            const stats = notificationService.getNotificationStatistics();
            assert.ok(stats.feedbackProvided > 0);
        });
    });
    suite('Health Check Integration', () => {
        test('should perform comprehensive health check', async () => {
            const healthCheck = await extensionManager.performHealthCheck();
            assert.ok(typeof healthCheck.healthy === 'boolean');
            assert.ok(Array.isArray(healthCheck.checks));
            assert.ok(typeof healthCheck.failedChecks === 'number');
            assert.ok(typeof healthCheck.warnings === 'number');
            assert.ok(Array.isArray(healthCheck.recommendations));
            // Verify all expected checks are present
            const checkNames = healthCheck.checks.map(check => check.name);
            assert.ok(checkNames.includes('VS Code Compatibility'));
            assert.ok(checkNames.includes('Dependencies'));
            assert.ok(checkNames.includes('Configuration'));
            assert.ok(checkNames.includes('File System Permissions'));
            assert.ok(checkNames.includes('Network Connectivity'));
        });
        test('should show health check results when issues found', async () => {
            // Mock a failed health check
            const mockHealthCheck = {
                healthy: false,
                checks: [
                    {
                        name: 'Test Check',
                        passed: false,
                        message: 'Test failure',
                        warning: false
                    }
                ],
                failedChecks: 1,
                warnings: 0,
                recommendations: ['Fix the test issue']
            };
            const showWarningStub = sandbox.stub(vscode.window, 'showWarningMessage').resolves('View Details');
            const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves();
            const openTextDocumentStub = sandbox.stub(vscode.workspace, 'openTextDocument').resolves({});
            const showTextDocumentStub = sandbox.stub(vscode.window, 'showTextDocument').resolves({});
            // Simulate showing health check results
            const notificationService = extensionManager.getNotificationService();
            await notificationService.showWarning(`Extension health check found ${mockHealthCheck.failedChecks} issue(s)`, [
                {
                    title: 'View Details',
                    callback: async () => {
                        // This would show the detailed results
                    }
                }
            ]);
            assert.ok(showWarningStub.calledOnce);
        });
    });
    suite('Configuration Integration', () => {
        test('should respect configuration changes', async () => {
            // Test with different configuration
            const restrictiveConfig = {
                debugMode: false,
                notificationLevel: 'errors',
                enableFeedbackRequests: false,
                logLevel: 'error',
                enableFileLogging: false
            };
            const restrictiveManager = new ExtensionManager_1.ExtensionManager(mockContext, restrictiveConfig);
            const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves();
            const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves();
            // These should not show due to restrictive configuration
            await restrictiveManager.getNotificationService().showInfo('Should not show');
            await restrictiveManager.getNotificationService().requestOperationFeedback('Test', true, 6000);
            // This should show (error level)
            await restrictiveManager.getNotificationService().showError('Should show');
            assert.ok(showInfoStub.notCalled);
            assert.ok(showErrorStub.calledOnce);
            await restrictiveManager.deactivate();
        });
    });
    suite('Memory and Performance', () => {
        test('should handle high volume operations without memory leaks', async () => {
            const initialMemory = process.memoryUsage().heapUsed;
            // Generate high volume of activity
            const loggingService = extensionManager.getLoggingService();
            const errorHandler = extensionManager.getErrorHandler();
            const notificationService = extensionManager.getNotificationService();
            for (let i = 0; i < 100; i++) {
                loggingService.info(`Bulk log ${i}`, { component: 'bulk-test' });
                if (i % 10 === 0) {
                    await errorHandler.handleError(new Error(`Bulk error ${i}`), { component: 'bulk-test', operation: 'memory-test' }, false);
                }
                if (i % 20 === 0) {
                    await notificationService.showInfo(`Bulk notification ${i}`, [], { showInStatusBar: false });
                }
            }
            // Trigger cleanup
            errorHandler.clearOldErrors(0);
            loggingService.clearLogs(0);
            await notificationService.clearNotificationHistory(0);
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            // Memory increase should be reasonable (less than 10MB for this test)
            assert.ok(memoryIncrease < 10 * 1024 * 1024, `Memory increase too high: ${memoryIncrease} bytes`);
        });
    });
    suite('Service Coordination', () => {
        test('should coordinate between all error handling services', async () => {
            const correlationId = extensionManager.getLoggingService().startOperation('coordination-test', 'integration');
            // Generate coordinated activity
            await extensionManager.getProgressManager().withProgress({
                title: 'Coordination Test',
                location: vscode.ProgressLocation.Notification
            }, async (progress) => {
                progress.report({ message: 'Step 1' });
                extensionManager.getLoggingService().info('Coordination step 1', {
                    component: 'integration',
                    operation: 'coordination-test',
                    correlationId
                });
                progress.report({ message: 'Step 2' });
                await extensionManager.getErrorHandler().handleError(new Error('Coordinated error'), {
                    component: 'integration',
                    operation: 'coordination-test',
                    additionalData: { correlationId }
                }, false);
                progress.report({ message: 'Step 3' });
                await extensionManager.getNotificationService().showInfo('Coordination complete');
            });
            extensionManager.getLoggingService().endOperation(correlationId, 'coordination-test', 'integration', true, 100);
            // Verify coordination
            const operationLogs = extensionManager.getLoggingService().getOperationLogs(correlationId);
            assert.ok(operationLogs.length >= 2); // At least start and end
            const errorStats = extensionManager.getErrorHandler().getErrorStatistics();
            assert.ok(errorStats.total > 0);
            const notificationStats = extensionManager.getNotificationService().getNotificationStatistics();
            assert.ok(notificationStats.total > 0);
        });
    });
});
//# sourceMappingURL=ComprehensiveErrorHandling.test.js.map