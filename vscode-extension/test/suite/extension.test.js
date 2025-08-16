"use strict";
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
suite('Extension Activation and Lifecycle Tests', () => {
    let mockContext;
    let extensionManager;
    setup(() => {
        // Create mock extension context
        mockContext = {
            subscriptions: [],
            workspaceState: {
                get: sinon.stub().returns({}),
                update: sinon.stub().resolves()
            },
            globalState: {
                get: sinon.stub().returns({}),
                update: sinon.stub().resolves()
            },
            extensionPath: '/mock/extension/path',
            extensionUri: vscode.Uri.file('/mock/extension/path'),
            environmentVariableCollection: {},
            asAbsolutePath: sinon.stub().returns('/mock/path'),
            storageUri: vscode.Uri.file('/mock/storage'),
            globalStorageUri: vscode.Uri.file('/mock/global-storage'),
            logUri: vscode.Uri.file('/mock/log'),
            secrets: {},
            extension: {}
        };
    });
    teardown(() => {
        sinon.restore();
    });
    test('ExtensionManager should initialize successfully', async () => {
        extensionManager = new ExtensionManager_1.ExtensionManager(mockContext);
        assert.ok(extensionManager, 'ExtensionManager should be created');
        assert.strictEqual(extensionManager.isExtensionActivated(), false, 'Extension should not be activated initially');
    });
    test('ExtensionManager should activate all components', async () => {
        extensionManager = new ExtensionManager_1.ExtensionManager(mockContext);
        // Mock workspace folders
        const mockWorkspaceFolders = [
            {
                uri: vscode.Uri.file('/mock/workspace'),
                name: 'test-workspace',
                index: 0
            }
        ];
        sinon.stub(vscode.workspace, 'workspaceFolders').value(mockWorkspaceFolders);
        // Mock configuration
        const mockConfig = {
            get: sinon.stub().returns('default-value'),
            has: sinon.stub().returns(true),
            inspect: sinon.stub().returns({}),
            update: sinon.stub().resolves()
        };
        sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfig);
        // Mock file system watcher
        const mockWatcher = {
            onDidCreate: sinon.stub(),
            onDidChange: sinon.stub(),
            onDidDelete: sinon.stub(),
            dispose: sinon.stub()
        };
        sinon.stub(vscode.workspace, 'createFileSystemWatcher').returns(mockWatcher);
        // Mock findFiles
        sinon.stub(vscode.workspace, 'findFiles').resolves([]);
        await extensionManager.activate();
        assert.strictEqual(extensionManager.isExtensionActivated(), true, 'Extension should be activated');
        assert.ok(extensionManager.getWorkspaceManager(), 'WorkspaceManager should be available');
        assert.ok(extensionManager.getSettingsManager(), 'SettingsManager should be available');
        assert.ok(extensionManager.getCommandManager(), 'CommandManager should be available');
        assert.ok(extensionManager.getFileWatcherManager(), 'FileWatcherManager should be available');
    });
    test('ExtensionManager should handle activation errors gracefully', async () => {
        extensionManager = new ExtensionManager_1.ExtensionManager(mockContext);
        // Mock an error during workspace initialization
        sinon.stub(vscode.workspace, 'workspaceFolders').value(null);
        sinon.stub(vscode.workspace, 'getConfiguration').throws(new Error('Configuration error'));
        try {
            await extensionManager.activate();
            assert.fail('Should have thrown an error');
        }
        catch (error) {
            assert.ok(error instanceof Error, 'Should throw an Error');
            assert.ok(error.message.includes('Extension activation failed'), 'Should include activation failure message');
        }
        assert.strictEqual(extensionManager.isExtensionActivated(), false, 'Extension should not be activated after error');
    });
    test('ExtensionManager should deactivate successfully', async () => {
        extensionManager = new ExtensionManager_1.ExtensionManager(mockContext);
        // Mock successful activation first
        const mockWorkspaceFolders = [
            {
                uri: vscode.Uri.file('/mock/workspace'),
                name: 'test-workspace',
                index: 0
            }
        ];
        sinon.stub(vscode.workspace, 'workspaceFolders').value(mockWorkspaceFolders);
        const mockConfig = {
            get: sinon.stub().returns('default-value'),
            has: sinon.stub().returns(true),
            inspect: sinon.stub().returns({}),
            update: sinon.stub().resolves()
        };
        sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfig);
        const mockWatcher = {
            onDidCreate: sinon.stub(),
            onDidChange: sinon.stub(),
            onDidDelete: sinon.stub(),
            dispose: sinon.stub()
        };
        sinon.stub(vscode.workspace, 'createFileSystemWatcher').returns(mockWatcher);
        sinon.stub(vscode.workspace, 'findFiles').resolves([]);
        await extensionManager.activate();
        assert.strictEqual(extensionManager.isExtensionActivated(), true, 'Extension should be activated');
        // Test deactivation
        await extensionManager.deactivate();
        assert.strictEqual(extensionManager.isExtensionActivated(), false, 'Extension should be deactivated');
    });
    test('ExtensionManager should handle deactivation errors gracefully', async () => {
        extensionManager = new ExtensionManager_1.ExtensionManager(mockContext);
        // Mock successful activation
        const mockWorkspaceFolders = [
            {
                uri: vscode.Uri.file('/mock/workspace'),
                name: 'test-workspace',
                index: 0
            }
        ];
        sinon.stub(vscode.workspace, 'workspaceFolders').value(mockWorkspaceFolders);
        const mockConfig = {
            get: sinon.stub().returns('default-value'),
            has: sinon.stub().returns(true),
            inspect: sinon.stub().returns({}),
            update: sinon.stub().resolves()
        };
        sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfig);
        const mockWatcher = {
            onDidCreate: sinon.stub(),
            onDidChange: sinon.stub(),
            onDidDelete: sinon.stub(),
            dispose: sinon.stub().throws(new Error('Dispose error'))
        };
        sinon.stub(vscode.workspace, 'createFileSystemWatcher').returns(mockWatcher);
        sinon.stub(vscode.workspace, 'findFiles').resolves([]);
        await extensionManager.activate();
        // Deactivation should not throw even if components fail to dispose
        await extensionManager.deactivate();
        assert.strictEqual(extensionManager.isExtensionActivated(), false, 'Extension should be deactivated despite errors');
    });
    test('ExtensionManager should prevent double activation', async () => {
        extensionManager = new ExtensionManager_1.ExtensionManager(mockContext);
        // Mock workspace and configuration
        const mockWorkspaceFolders = [
            {
                uri: vscode.Uri.file('/mock/workspace'),
                name: 'test-workspace',
                index: 0
            }
        ];
        sinon.stub(vscode.workspace, 'workspaceFolders').value(mockWorkspaceFolders);
        const mockConfig = {
            get: sinon.stub().returns('default-value'),
            has: sinon.stub().returns(true),
            inspect: sinon.stub().returns({}),
            update: sinon.stub().resolves()
        };
        sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfig);
        const mockWatcher = {
            onDidCreate: sinon.stub(),
            onDidChange: sinon.stub(),
            onDidDelete: sinon.stub(),
            dispose: sinon.stub()
        };
        sinon.stub(vscode.workspace, 'createFileSystemWatcher').returns(mockWatcher);
        sinon.stub(vscode.workspace, 'findFiles').resolves([]);
        // First activation
        await extensionManager.activate();
        assert.strictEqual(extensionManager.isExtensionActivated(), true, 'Extension should be activated');
        // Second activation should not throw but should warn
        const consoleSpy = sinon.spy(console, 'warn');
        await extensionManager.activate();
        assert.strictEqual(extensionManager.isExtensionActivated(), true, 'Extension should still be activated');
        assert.ok(consoleSpy.calledWith('Extension is already activated'), 'Should warn about double activation');
    });
    test('ExtensionManager should handle deactivation when not activated', async () => {
        extensionManager = new ExtensionManager_1.ExtensionManager(mockContext);
        // Deactivate without activating first
        await extensionManager.deactivate();
        // Should not throw and should remain not activated
        assert.strictEqual(extensionManager.isExtensionActivated(), false, 'Extension should remain not activated');
    });
});
//# sourceMappingURL=extension.test.js.map