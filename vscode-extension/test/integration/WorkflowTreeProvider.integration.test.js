"use strict";
/**
 * Integration Tests for WorkflowTreeProvider
 *
 * Tests the tree provider integration with VS Code APIs
 * and real workspace scenarios.
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
const path = __importStar(require("path"));
const WorkflowTreeProvider_1 = require("../../src/providers/WorkflowTreeProvider");
const WorkspaceManager_1 = require("../../src/core/WorkspaceManager");
const CLIIntegration_1 = require("../../src/core/CLIIntegration");
const SettingsManager_1 = require("../../src/core/SettingsManager");
suite('WorkflowTreeProvider Integration Tests', () => {
    let treeProvider;
    let workspaceManager;
    let cliIntegration;
    let settingsManager;
    let testContext;
    suiteSetup(async () => {
        // Create test context
        testContext = {
            subscriptions: [],
            workspaceState: {},
            globalState: {},
            extensionPath: path.join(__dirname, '..', '..'),
            extensionUri: vscode.Uri.file(path.join(__dirname, '..', '..')),
            environmentVariableCollection: {},
            asAbsolutePath: (relativePath) => path.join(__dirname, '..', '..', relativePath),
            storageUri: vscode.Uri.file(path.join(__dirname, '..', '..', 'storage')),
            globalStorageUri: vscode.Uri.file(path.join(__dirname, '..', '..', 'global-storage')),
            logUri: vscode.Uri.file(path.join(__dirname, '..', '..', 'logs')),
            extensionMode: vscode.ExtensionMode.Test,
            secrets: {}
        };
        // Initialize managers
        settingsManager = new SettingsManager_1.SettingsManager(testContext);
        workspaceManager = new WorkspaceManager_1.WorkspaceManager(testContext, settingsManager);
        cliIntegration = new CLIIntegration_1.CLIIntegration({
            enableLogging: false,
            timeout: 5000
        });
        await settingsManager.initialize();
        await workspaceManager.initialize();
    });
    suiteTeardown(async () => {
        if (treeProvider) {
            treeProvider.dispose();
        }
        if (workspaceManager) {
            await workspaceManager.dispose();
        }
        if (settingsManager) {
            await settingsManager.dispose();
        }
        if (cliIntegration) {
            cliIntegration.dispose();
        }
    });
    setup(() => {
        treeProvider = new WorkflowTreeProvider_1.WorkflowTreeProvider(testContext, workspaceManager, cliIntegration);
    });
    teardown(() => {
        if (treeProvider) {
            treeProvider.dispose();
        }
    });
    test('should create tree provider without errors', () => {
        assert.ok(treeProvider);
        assert.ok(typeof treeProvider.getTreeItem === 'function');
        assert.ok(typeof treeProvider.getChildren === 'function');
        assert.ok(typeof treeProvider.refresh === 'function');
    });
    test('should implement TreeDataProvider interface', () => {
        // Check that it implements the required interface
        const provider = treeProvider;
        assert.ok(provider);
        assert.ok(provider.getTreeItem);
        assert.ok(provider.getChildren);
        assert.ok(provider.onDidChangeTreeData);
    });
    test('should handle empty workspace gracefully', async () => {
        // This test runs in the actual VS Code environment
        // so it should handle the real workspace state
        const children = await treeProvider.getChildren();
        // Should return an array (even if empty)
        assert.ok(Array.isArray(children));
        // Each child should have required properties
        for (const child of children) {
            assert.ok(child.label);
            assert.ok(child.type);
            assert.ok(child.contextValue);
        }
    });
    test('should create valid tree items', async () => {
        const children = await treeProvider.getChildren();
        for (const child of children) {
            const treeItem = treeProvider.getTreeItem(child);
            // Verify tree item properties
            assert.ok(treeItem.label);
            assert.ok(treeItem.contextValue);
            assert.ok(typeof treeItem.collapsibleState === 'number');
            // If it has children, should be collapsible
            if (child.children && child.children.length > 0) {
                assert.notStrictEqual(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.None);
            }
        }
    });
    test('should fire change events on refresh', (done) => {
        let eventFired = false;
        const subscription = treeProvider.onDidChangeTreeData(() => {
            eventFired = true;
            subscription.dispose();
            assert.ok(eventFired);
            done();
        });
        // Trigger refresh
        treeProvider.refresh();
    });
    test('should register commands in context', () => {
        // Check that commands were registered
        const subscriptions = testContext.subscriptions;
        assert.ok(subscriptions.length > 0);
        // Should have registered tree view commands
        // Note: In real VS Code environment, commands are registered differently
        // This test verifies the subscription mechanism works
    });
    test('should handle CLI integration errors gracefully', async () => {
        // Create a tree provider with a failing CLI integration
        const failingCLI = new CLIIntegration_1.CLIIntegration({
            enableLogging: false,
            timeout: 1 // Very short timeout to force failure
        });
        const failingTreeProvider = new WorkflowTreeProvider_1.WorkflowTreeProvider(testContext, workspaceManager, failingCLI);
        try {
            // Should not throw even if CLI fails
            const children = await failingTreeProvider.getChildren();
            assert.ok(Array.isArray(children));
        }
        finally {
            failingTreeProvider.dispose();
            failingCLI.dispose();
        }
    });
    test('should create tree view successfully', () => {
        // Test that VS Code can create a tree view with our provider
        const treeView = vscode.window.createTreeView('test-tree-view', {
            treeDataProvider: treeProvider,
            showCollapseAll: true
        });
        assert.ok(treeView);
        assert.ok(treeView.visible !== undefined);
        // Clean up
        treeView.dispose();
    });
});
//# sourceMappingURL=WorkflowTreeProvider.integration.test.js.map