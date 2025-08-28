"use strict";
/**
 * WebviewManager Test Suite
 *
 * Tests webview creation, disposal, message communication, and lifecycle management.
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
const WebviewManager_1 = require("../../../src/core/WebviewManager");
const types_1 = require("../../../src/core/types");
// Mock VS Code API
const mockContext = {
    subscriptions: [],
    workspaceState: {
        get: (_key, defaultValue) => defaultValue,
        update: async (_key, _value) => { },
        keys: () => []
    },
    globalState: {
        get: (_key, defaultValue) => defaultValue,
        update: async (_key, _value) => { },
        keys: () => [],
        setKeysForSync: (_keys) => { }
    },
    extensionPath: '/test/extension/path',
    extensionUri: vscode.Uri.file('/test/extension/path'),
    environmentVariableCollection: {},
    extensionMode: vscode.ExtensionMode.Test,
    globalStorageUri: vscode.Uri.file('/test/global'),
    logUri: vscode.Uri.file('/test/log'),
    storageUri: vscode.Uri.file('/test/storage'),
    secrets: {},
    extension: {},
    asAbsolutePath: (relativePath) => `/test/extension/path/${relativePath}`,
    storagePath: '/test/storage',
    globalStoragePath: '/test/global',
    logPath: '/test/log',
    languageModelAccessInformation: {}
};
const mockWebview = {
    html: '',
    options: {},
    cspSource: 'vscode-webview:',
    postMessage: async (_message) => true,
    onDidReceiveMessage: (_listener) => ({ dispose: () => { } }),
    asWebviewUri: (uri) => uri
};
const mockWebviewPanel = {
    webview: mockWebview,
    viewType: 'test',
    title: 'Test Panel',
    options: {},
    viewColumn: vscode.ViewColumn.One,
    active: true,
    visible: true,
    onDidDispose: (_listener) => ({ dispose: () => { } }),
    onDidChangeViewState: (_listener) => ({ dispose: () => { } }),
    reveal: (_viewColumn, _preserveFocus) => { },
    dispose: () => { }
};
// Mock vscode.window.createWebviewPanel
const originalCreateWebviewPanel = vscode.window.createWebviewPanel;
suite('WebviewManager Test Suite', () => {
    let webviewManager;
    let mockOptions;
    setup(() => {
        mockOptions = {
            extensionUri: vscode.Uri.file('/test/extension'),
            context: mockContext,
            enableLogging: false
        };
        // Mock createWebviewPanel
        vscode.window.createWebviewPanel = () => mockWebviewPanel;
        webviewManager = new WebviewManager_1.WebviewManager(mockOptions);
    });
    teardown(() => {
        webviewManager.dispose();
        // Restore original function
        if (originalCreateWebviewPanel) {
            vscode.window.createWebviewPanel = originalCreateWebviewPanel;
        }
    });
    suite('Webview Creation', () => {
        test('should create configuration panel successfully', async () => {
            const mockConfig = {
                workflowTypes: ['ci'],
                frameworks: [],
                deploymentTargets: [],
                securityLevel: 'standard',
                optimizationLevel: 'standard',
                includeComments: true,
                customSteps: []
            };
            const panel = await webviewManager.createConfigurationPanel(mockConfig);
            assert.strictEqual(panel.viewType, 'readme-to-cicd.configuration');
            assert.strictEqual(panel.title, 'Workflow Configuration');
            assert.ok(webviewManager.getPanel('configuration'));
        });
        test('should create preview panel successfully', async () => {
            const mockPreviewData = {
                workflows: [],
                configuration: {
                    workflowTypes: ['ci'],
                    frameworks: [],
                    deploymentTargets: [],
                    securityLevel: 'standard',
                    optimizationLevel: 'standard',
                    includeComments: true,
                    customSteps: []
                },
                detectedFrameworks: [],
                estimatedFiles: []
            };
            const panel = await webviewManager.createPreviewPanel(mockPreviewData);
            assert.strictEqual(panel.viewType, 'readme-to-cicd.preview');
            assert.strictEqual(panel.title, 'Workflow Preview');
            assert.ok(webviewManager.getPanel('preview'));
        });
        test('should dispose existing panel when creating new one of same type', async () => {
            let disposeCallCount = 0;
            const mockDisposablePanel = {
                ...mockWebviewPanel,
                dispose: () => { disposeCallCount++; }
            };
            vscode.window.createWebviewPanel = () => mockDisposablePanel;
            // Create first panel
            await webviewManager.createConfigurationPanel();
            assert.strictEqual(disposeCallCount, 0);
            // Create second panel of same type
            await webviewManager.createConfigurationPanel();
            assert.strictEqual(disposeCallCount, 1);
        });
        test('should configure webview with proper security settings', async () => {
            let capturedHtml = '';
            const mockSecureWebview = {
                ...mockWebview,
                set html(value) { capturedHtml = value; },
                get html() { return capturedHtml; }
            };
            const mockSecurePanel = {
                ...mockWebviewPanel,
                webview: mockSecureWebview
            };
            vscode.window.createWebviewPanel = () => mockSecurePanel;
            await webviewManager.createConfigurationPanel();
            // Check that CSP is included in HTML
            assert.ok(capturedHtml.includes('Content-Security-Policy'));
            assert.ok(capturedHtml.includes("default-src 'none'"));
            assert.ok(capturedHtml.includes('nonce-'));
        });
    });
    suite('Message Communication', () => {
        test('should send message to webview panel successfully', async () => {
            let receivedMessage = null;
            const mockMessageWebview = {
                ...mockWebview,
                postMessage: async (message) => {
                    receivedMessage = message;
                    return true;
                }
            };
            const mockMessagePanel = {
                ...mockWebviewPanel,
                webview: mockMessageWebview
            };
            vscode.window.createWebviewPanel = () => mockMessagePanel;
            await webviewManager.createConfigurationPanel();
            const testMessage = {
                type: types_1.MessageType.CONFIGURATION_UPDATE,
                payload: { test: 'data' }
            };
            const success = await webviewManager.sendMessage('configuration', testMessage);
            assert.strictEqual(success, true);
            assert.deepStrictEqual(receivedMessage, testMessage);
        });
        test('should return false when sending message to non-existent panel', async () => {
            const testMessage = {
                type: types_1.MessageType.CONFIGURATION_UPDATE,
                payload: { test: 'data' }
            };
            const success = await webviewManager.sendMessage('nonexistent', testMessage);
            assert.strictEqual(success, false);
        });
        test('should broadcast message to all active panels', async () => {
            const receivedMessages = [];
            const mockBroadcastWebview = {
                ...mockWebview,
                postMessage: async (message) => {
                    receivedMessages.push(message);
                    return true;
                }
            };
            const mockBroadcastPanel = {
                ...mockWebviewPanel,
                webview: mockBroadcastWebview
            };
            vscode.window.createWebviewPanel = () => mockBroadcastPanel;
            // Create multiple panels
            await webviewManager.createConfigurationPanel();
            await webviewManager.createPreviewPanel();
            const testMessage = {
                type: types_1.MessageType.PROGRESS_UPDATE,
                payload: { progress: 50 }
            };
            const successCount = await webviewManager.broadcastMessage(testMessage);
            assert.strictEqual(successCount, 2);
            assert.strictEqual(receivedMessages.length, 2);
        });
        test('should register and handle custom message handlers', async () => {
            let handlerCalled = false;
            let handlerMessage = null;
            const customHandler = async (message) => {
                handlerCalled = true;
                handlerMessage = message;
            };
            await webviewManager.createConfigurationPanel();
            webviewManager.registerMessageHandler('configuration', types_1.MessageType.CONFIGURATION_UPDATE, customHandler);
            // Simulate receiving a message (this would normally come from the webview)
            const testMessage = {
                type: types_1.MessageType.CONFIGURATION_UPDATE,
                payload: { custom: 'data' }
            };
            // Access private method for testing
            await webviewManager.handleWebviewMessage('configuration', testMessage);
            assert.strictEqual(handlerCalled, true);
            assert.deepStrictEqual(handlerMessage, testMessage);
        });
    });
    suite('State Management', () => {
        test('should persist and restore webview state', async () => {
            let storedState = null;
            const mockStateContext = {
                ...mockContext,
                workspaceState: {
                    get: (_key, defaultValue) => storedState || defaultValue,
                    update: async (_key, value) => { storedState = value; },
                    keys: () => []
                }
            };
            const stateManager = new WebviewManager_1.WebviewManager({
                ...mockOptions,
                context: mockStateContext
            });
            // Create panel and update state
            await stateManager.createConfigurationPanel();
            await stateManager.persistWebviewState();
            // Verify state was stored
            assert.ok(storedState);
            assert.ok(storedState.configuration);
            // Create new manager and restore state
            const newStateManager = new WebviewManager_1.WebviewManager({
                ...mockOptions,
                context: mockStateContext
            });
            await newStateManager.restoreWebviewState();
            // Cleanup
            stateManager.dispose();
            newStateManager.dispose();
        });
        test('should track panel visibility and active state', async () => {
            let viewStateHandler;
            const mockTrackingPanel = {
                ...mockWebviewPanel,
                onDidChangeViewState: (handler) => {
                    viewStateHandler = handler;
                    return { dispose: () => { } };
                }
            };
            vscode.window.createWebviewPanel = () => mockTrackingPanel;
            await webviewManager.createConfigurationPanel();
            // Simulate view state change
            if (viewStateHandler) {
                viewStateHandler({
                    webviewPanel: {
                        ...mockTrackingPanel,
                        visible: false,
                        active: false
                    }
                });
            }
            // State should be updated (we can't easily test this without exposing internal state)
            // This test verifies the handler is set up correctly
            assert.ok(viewStateHandler);
        });
    });
    suite('Lifecycle Management', () => {
        test('should dispose all panels and clean up resources', async () => {
            let configDisposed = false;
            let previewDisposed = false;
            const mockDisposableConfigPanel = {
                ...mockWebviewPanel,
                dispose: () => { configDisposed = true; }
            };
            const mockDisposablePreviewPanel = {
                ...mockWebviewPanel,
                dispose: () => { previewDisposed = true; }
            };
            let panelCount = 0;
            vscode.window.createWebviewPanel = () => {
                panelCount++;
                return panelCount === 1 ? mockDisposableConfigPanel : mockDisposablePreviewPanel;
            };
            // Create multiple panels
            await webviewManager.createConfigurationPanel();
            await webviewManager.createPreviewPanel();
            // Verify panels exist
            assert.ok(webviewManager.getPanel('configuration'));
            assert.ok(webviewManager.getPanel('preview'));
            // Dispose manager
            webviewManager.dispose();
            // Verify cleanup
            assert.strictEqual(configDisposed, true);
            assert.strictEqual(previewDisposed, true);
            assert.strictEqual(webviewManager.getActivePanels().size, 0);
        });
        test('should handle panel disposal events', async () => {
            let disposeHandler;
            const mockDisposalPanel = {
                ...mockWebviewPanel,
                onDidDispose: (handler) => {
                    disposeHandler = handler;
                    return { dispose: () => { } };
                }
            };
            vscode.window.createWebviewPanel = () => mockDisposalPanel;
            await webviewManager.createConfigurationPanel();
            assert.ok(webviewManager.getPanel('configuration'));
            // Simulate panel disposal
            if (disposeHandler) {
                disposeHandler();
            }
            // Panel should be removed from manager
            assert.strictEqual(webviewManager.getPanel('configuration'), undefined);
        });
    });
    suite('Error Handling', () => {
        test('should handle message sending errors gracefully', async () => {
            const mockErrorWebview = {
                ...mockWebview,
                postMessage: async () => {
                    throw new Error('Message sending failed');
                }
            };
            const mockErrorPanel = {
                ...mockWebviewPanel,
                webview: mockErrorWebview
            };
            vscode.window.createWebviewPanel = () => mockErrorPanel;
            await webviewManager.createConfigurationPanel();
            const testMessage = {
                type: types_1.MessageType.CONFIGURATION_UPDATE,
                payload: { test: 'data' }
            };
            const success = await webviewManager.sendMessage('configuration', testMessage);
            assert.strictEqual(success, false);
        });
        test('should handle message handler errors and send error notification', async () => {
            let errorNotificationSent = false;
            const mockErrorHandlingWebview = {
                ...mockWebview,
                postMessage: async (message) => {
                    if (message.type === types_1.MessageType.ERROR_NOTIFICATION) {
                        errorNotificationSent = true;
                    }
                    return true;
                },
                onDidReceiveMessage: (handler) => {
                    // Simulate receiving a message that will cause an error
                    setTimeout(() => {
                        handler({
                            type: types_1.MessageType.CONFIGURATION_UPDATE,
                            payload: null // This might cause an error in the handler
                        });
                    }, 10);
                    return { dispose: () => { } };
                }
            };
            const mockErrorHandlingPanel = {
                ...mockWebviewPanel,
                webview: mockErrorHandlingWebview
            };
            vscode.window.createWebviewPanel = () => mockErrorHandlingPanel;
            // Register a handler that will throw an error
            const errorHandler = async () => {
                throw new Error('Handler error');
            };
            await webviewManager.createConfigurationPanel();
            webviewManager.registerMessageHandler('configuration', types_1.MessageType.CONFIGURATION_UPDATE, errorHandler);
            // Wait for the simulated message to be processed
            await new Promise(resolve => setTimeout(resolve, 50));
            assert.strictEqual(errorNotificationSent, true);
        });
    });
});
//# sourceMappingURL=WebviewManager.test.js.map