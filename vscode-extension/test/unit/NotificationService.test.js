"use strict";
/**
 * Notification Service Tests
 *
 * Tests for notification system including success, warning, error states,
 * and user feedback mechanisms.
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
const NotificationService_1 = require("../../src/core/NotificationService");
suite('NotificationService Tests', () => {
    let notificationService;
    let mockContext;
    let mockConfiguration;
    let sandbox;
    setup(() => {
        sandbox = sinon.createSandbox();
        mockContext = {
            subscriptions: [],
            globalState: {
                get: sandbox.stub().returns([]),
                update: sandbox.stub().resolves()
            },
            extension: {
                packageJSON: { version: '1.0.0' }
            }
        };
        mockConfiguration = {
            notificationLevel: 'all',
            enableFeedbackRequests: true,
            debugMode: false
        };
        // Mock VS Code APIs
        sandbox.stub(vscode.window, 'createStatusBarItem').returns({
            text: '',
            tooltip: '',
            command: '',
            show: sandbox.stub(),
            hide: sandbox.stub(),
            dispose: sandbox.stub()
        });
        notificationService = new NotificationService_1.NotificationService(mockContext, mockConfiguration);
    });
    teardown(() => {
        sandbox.restore();
        notificationService.dispose();
    });
    suite('Basic Notifications', () => {
        test('should show success notification', async () => {
            const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);
            await notificationService.showSuccess('Operation completed successfully');
            assert.ok(showInfoStub.calledOnce);
            const call = showInfoStub.getCall(0);
            assert.ok(call.args[0].includes('✅'));
            assert.ok(call.args[0].includes('Operation completed successfully'));
        });
        test('should show error notification', async () => {
            const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);
            await notificationService.showError('Something went wrong');
            assert.ok(showErrorStub.calledOnce);
            assert.strictEqual(showErrorStub.getCall(0).args[0], 'Something went wrong');
        });
        test('should show warning notification', async () => {
            const showWarningStub = sandbox.stub(vscode.window, 'showWarningMessage').resolves(undefined);
            await notificationService.showWarning('This is a warning');
            assert.ok(showWarningStub.calledOnce);
            assert.strictEqual(showWarningStub.getCall(0).args[0], 'This is a warning');
        });
        test('should show info notification', async () => {
            const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);
            await notificationService.showInfo('This is information');
            assert.ok(showInfoStub.calledOnce);
            assert.strictEqual(showInfoStub.getCall(0).args[0], 'This is information');
        });
    });
    suite('Notification Actions', () => {
        test('should handle action selection', async () => {
            const executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand').resolves();
            const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves('Open File');
            await notificationService.showInfo('File created', [
                {
                    title: 'Open File',
                    command: 'vscode.open',
                    args: ['test.txt']
                }
            ]);
            assert.ok(showInfoStub.calledOnce);
            assert.ok(executeCommandStub.calledWith('vscode.open', 'test.txt'));
        });
        test('should handle callback actions', async () => {
            const callbackStub = sandbox.stub();
            const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves('Custom Action');
            await notificationService.showInfo('Test message', [
                {
                    title: 'Custom Action',
                    callback: callbackStub
                }
            ]);
            assert.ok(showInfoStub.calledOnce);
            assert.ok(callbackStub.calledOnce);
        });
        test('should handle primary actions', async () => {
            const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves('Primary');
            await notificationService.showInfo('Test message', [
                {
                    title: 'Secondary',
                    primary: false
                },
                {
                    title: 'Primary',
                    primary: true
                }
            ]);
            assert.ok(showInfoStub.calledOnce);
            const args = showInfoStub.getCall(0).args;
            assert.ok(args.includes('Primary'));
            assert.ok(args.includes('Secondary'));
        });
    });
    suite('Notification Options', () => {
        test('should handle modal notifications', async () => {
            const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);
            await notificationService.showInfo('Modal message', [], { modal: true });
            assert.ok(showInfoStub.calledOnce);
            const call = showInfoStub.getCall(0);
            assert.strictEqual(call.args[1].modal, true);
        });
        test('should handle status bar notifications', async () => {
            const statusBarItem = notificationService.statusBarItem;
            const showStub = sandbox.stub(statusBarItem, 'show');
            await notificationService.showInfo('Status bar message', [], { showInStatusBar: true });
            assert.ok(showStub.calledOnce);
            assert.ok(statusBarItem.text.includes('Status bar message'));
        });
        test('should handle timeout notifications', async () => {
            const clock = sandbox.useFakeTimers();
            const statusBarItem = notificationService.statusBarItem;
            const hideStub = sandbox.stub(statusBarItem, 'hide');
            await notificationService.showInfo('Timeout message', [], {
                showInStatusBar: true,
                timeout: 1000
            });
            // Fast-forward time
            clock.tick(1000);
            assert.ok(hideStub.calledOnce);
            clock.restore();
        });
        test('should handle persistent notifications', async () => {
            const createStatusBarStub = sandbox.stub(vscode.window, 'createStatusBarItem').returns({
                text: '',
                tooltip: '',
                command: '',
                show: sandbox.stub(),
                hide: sandbox.stub(),
                dispose: sandbox.stub()
            });
            await notificationService.showInfo('Persistent message', [], { persistent: true });
            assert.ok(createStatusBarStub.calledOnce);
        });
    });
    suite('Notification Level Filtering', () => {
        test('should respect notification level settings - none', async () => {
            mockConfiguration.notificationLevel = 'none';
            const service = new NotificationService_1.NotificationService(mockContext, mockConfiguration);
            const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);
            await service.showInfo('Should not show');
            assert.ok(showInfoStub.notCalled);
            service.dispose();
        });
        test('should respect notification level settings - errors only', async () => {
            mockConfiguration.notificationLevel = 'errors';
            const service = new NotificationService_1.NotificationService(mockContext, mockConfiguration);
            const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);
            const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);
            await service.showInfo('Should not show');
            await service.showError('Should show');
            assert.ok(showInfoStub.notCalled);
            assert.ok(showErrorStub.calledOnce);
            service.dispose();
        });
        test('should respect notification level settings - warnings and errors', async () => {
            mockConfiguration.notificationLevel = 'warnings';
            const service = new NotificationService_1.NotificationService(mockContext, mockConfiguration);
            const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);
            const showWarningStub = sandbox.stub(vscode.window, 'showWarningMessage').resolves(undefined);
            const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);
            await service.showInfo('Should not show');
            await service.showWarning('Should show');
            await service.showError('Should show');
            assert.ok(showInfoStub.notCalled);
            assert.ok(showWarningStub.calledOnce);
            assert.ok(showErrorStub.calledOnce);
            service.dispose();
        });
    });
    suite('Specialized Notifications', () => {
        test('should show workflow generation success', async () => {
            const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);
            await notificationService.showWorkflowGenerationSuccess(3, 2500, '/path/to/workflows');
            assert.ok(showInfoStub.calledOnce);
            const message = showInfoStub.getCall(0).args[0];
            assert.ok(message.includes('3 workflows'));
            assert.ok(message.includes('3s')); // 2500ms rounded to 3s
        });
        test('should show validation error with recovery options', async () => {
            const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);
            const errors = ['Syntax error on line 5', 'Missing required field'];
            await notificationService.showValidationError(errors, 'workflow.yml');
            assert.ok(showErrorStub.calledOnce);
            const message = showErrorStub.getCall(0).args[0];
            assert.ok(message.includes('2 validation errors'));
            assert.ok(message.includes('workflow.yml'));
        });
        test('should show progress completion - success', async () => {
            const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);
            await notificationService.showProgressCompletion('Generate Workflow', true, 1500);
            assert.ok(showInfoStub.calledOnce);
            const message = showInfoStub.getCall(0).args[0];
            assert.ok(message.includes('Generate Workflow completed successfully'));
        });
        test('should show progress completion - failure', async () => {
            const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);
            await notificationService.showProgressCompletion('Generate Workflow', false, 1500);
            assert.ok(showErrorStub.calledOnce);
            const message = showErrorStub.getCall(0).args[0];
            assert.ok(message.includes('Generate Workflow failed'));
        });
    });
    suite('User Feedback', () => {
        test('should request operation feedback for long operations', async () => {
            const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves('Good');
            await notificationService.requestOperationFeedback('Long Operation', true, 6000);
            assert.ok(showInfoStub.calledOnce);
            const message = showInfoStub.getCall(0).args[0];
            assert.ok(message.includes('How was your experience'));
            assert.ok(message.includes('Long Operation'));
        });
        test('should not request feedback for short operations', async () => {
            const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);
            await notificationService.requestOperationFeedback('Short Operation', true, 2000);
            assert.ok(showInfoStub.notCalled);
        });
        test('should request additional feedback for poor ratings', async () => {
            const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves('Poor');
            const showInputStub = sandbox.stub(vscode.window, 'showInputBox').resolves('Needs improvement');
            await notificationService.requestOperationFeedback('Test Operation', true, 6000);
            assert.ok(showInfoStub.calledOnce);
            assert.ok(showInputStub.calledOnce);
        });
        test('should skip feedback when disabled in configuration', async () => {
            mockConfiguration.enableFeedbackRequests = false;
            const service = new NotificationService_1.NotificationService(mockContext, mockConfiguration);
            const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);
            await service.requestOperationFeedback('Test Operation', true, 6000);
            assert.ok(showInfoStub.notCalled);
            service.dispose();
        });
    });
    suite('Notification History', () => {
        test('should track notification history', async () => {
            sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);
            sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);
            await notificationService.showInfo('Info message');
            await notificationService.showError('Error message');
            const stats = notificationService.getNotificationStatistics();
            assert.strictEqual(stats.total, 2);
            assert.strictEqual(stats.info, 1);
            assert.strictEqual(stats.errors, 1);
        });
        test('should group notifications by category', async () => {
            sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);
            await notificationService.showInfo('Message 1', [], { category: 'workflow' });
            await notificationService.showInfo('Message 2', [], { category: 'workflow' });
            await notificationService.showInfo('Message 3', [], { category: 'validation' });
            const stats = notificationService.getNotificationStatistics();
            assert.strictEqual(stats.byCategory['workflow'], 2);
            assert.strictEqual(stats.byCategory['validation'], 1);
        });
        test('should clear old notification history', async () => {
            sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);
            // Add some notifications
            await notificationService.showInfo('Old message');
            await notificationService.showInfo('Recent message');
            // Mock old timestamp
            const history = notificationService.notificationHistory;
            if (history.length > 0) {
                history[0].timestamp = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
            }
            const cleared = await notificationService.clearNotificationHistory(7);
            assert.strictEqual(cleared, 1);
        });
        test('should export notification history', async () => {
            sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);
            await notificationService.showInfo('Test message');
            const exportData = await notificationService.exportNotificationHistory();
            const parsed = JSON.parse(exportData);
            assert.ok(parsed.timestamp);
            assert.ok(parsed.version);
            assert.ok(parsed.statistics);
            assert.ok(Array.isArray(parsed.notifications));
        });
    });
    suite('Notification Summary', () => {
        test('should show notification summary', async () => {
            const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);
            // Add some test notifications first
            await notificationService.showError('Error 1');
            await notificationService.showWarning('Warning 1');
            await notificationService.showSuccess('Success 1');
            await notificationService.showNotificationSummary();
            assert.ok(showInfoStub.calledTwice); // Once for each notification, once for summary
            const summaryCall = showInfoStub.getCalls().find(call => call.args[0].includes('Notification Summary'));
            assert.ok(summaryCall);
        });
    });
    suite('Error Handling', () => {
        test('should handle notification display errors gracefully', async () => {
            const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').rejects(new Error('Display error'));
            // Should not throw
            await notificationService.showInfo('Test message');
            assert.ok(showInfoStub.calledOnce);
        });
        test('should handle action execution errors gracefully', async () => {
            const executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand').rejects(new Error('Command error'));
            const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves('Action');
            // Should not throw
            await notificationService.showInfo('Test message', [
                {
                    title: 'Action',
                    command: 'test.command'
                }
            ]);
            assert.ok(showInfoStub.calledOnce);
            assert.ok(executeCommandStub.calledOnce);
        });
    });
    suite('Status Bar Integration', () => {
        test('should show notification in status bar', async () => {
            const statusBarItem = notificationService.statusBarItem;
            const showStub = sandbox.stub(statusBarItem, 'show');
            await notificationService.showInfo('Status message', [], { showInStatusBar: true });
            assert.ok(showStub.calledOnce);
            assert.ok(statusBarItem.text.includes('Status message'));
            assert.ok(statusBarItem.tooltip.includes('Status message'));
        });
        test('should handle persistent notifications', async () => {
            const createStatusBarStub = sandbox.stub(vscode.window, 'createStatusBarItem').returns({
                text: '',
                tooltip: '',
                command: '',
                show: sandbox.stub(),
                hide: sandbox.stub(),
                dispose: sandbox.stub()
            });
            await notificationService.showInfo('Persistent message', [], { persistent: true });
            assert.ok(createStatusBarStub.calledOnce);
            const persistentNotifications = notificationService.persistentNotifications;
            assert.strictEqual(persistentNotifications.size, 1);
        });
    });
});
//# sourceMappingURL=NotificationService.test.js.map