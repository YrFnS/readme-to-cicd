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
const SettingsManager_1 = require("../../../src/core/SettingsManager");
suite('SettingsManager Tests', () => {
    let mockContext;
    let settingsManager;
    let mockWorkspaceState;
    let mockGlobalState;
    setup(() => {
        // Create mock workspace and global state
        mockWorkspaceState = {
            get: sinon.stub(),
            update: sinon.stub().resolves()
        };
        mockGlobalState = {
            get: sinon.stub(),
            update: sinon.stub().resolves()
        };
        // Create mock extension context
        mockContext = {
            subscriptions: [],
            workspaceState: mockWorkspaceState,
            globalState: mockGlobalState,
            extensionPath: '/mock/extension/path'
        };
    });
    teardown(() => {
        sinon.restore();
    });
    test('SettingsManager should initialize with default configuration', async () => {
        const mockConfig = {
            get: sinon.stub().callsFake((key, defaultValue) => defaultValue),
            has: sinon.stub().returns(true),
            inspect: sinon.stub().returns({}),
            update: sinon.stub().resolves()
        };
        sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfig);
        sinon.stub(vscode.workspace, 'onDidChangeConfiguration').returns({ dispose: sinon.stub() });
        settingsManager = new SettingsManager_1.SettingsManager(mockContext);
        await settingsManager.initialize();
        const workspaceConfig = settingsManager.getWorkspaceConfiguration();
        const userConfig = settingsManager.getUserConfiguration();
        assert.strictEqual(workspaceConfig.defaultOutputDirectory, '.github/workflows', 'Should have default output directory');
        assert.strictEqual(workspaceConfig.enableAutoGeneration, false, 'Should have auto-generation disabled by default');
        assert.deepStrictEqual(workspaceConfig.preferredWorkflowTypes, ['ci'], 'Should have default workflow types');
        assert.strictEqual(userConfig.showPreviewByDefault, true, 'Should show preview by default');
        assert.strictEqual(userConfig.notificationLevel, 'all', 'Should have all notifications by default');
    });
    test('SettingsManager should load custom configuration values', async () => {
        const mockConfig = {
            get: sinon.stub().callsFake((key, defaultValue) => {
                switch (key) {
                    case 'defaultOutputDirectory': return '.custom/workflows';
                    case 'enableAutoGeneration': return true;
                    case 'preferredWorkflowTypes': return ['ci', 'cd'];
                    case 'showPreviewByDefault': return false;
                    case 'notificationLevel': return 'errors';
                    default: return defaultValue;
                }
            }),
            has: sinon.stub().returns(true),
            inspect: sinon.stub().returns({}),
            update: sinon.stub().resolves()
        };
        sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfig);
        sinon.stub(vscode.workspace, 'onDidChangeConfiguration').returns({ dispose: sinon.stub() });
        settingsManager = new SettingsManager_1.SettingsManager(mockContext);
        await settingsManager.initialize();
        const workspaceConfig = settingsManager.getWorkspaceConfiguration();
        const userConfig = settingsManager.getUserConfiguration();
        assert.strictEqual(workspaceConfig.defaultOutputDirectory, '.custom/workflows', 'Should use custom output directory');
        assert.strictEqual(workspaceConfig.enableAutoGeneration, true, 'Should have auto-generation enabled');
        assert.deepStrictEqual(workspaceConfig.preferredWorkflowTypes, ['ci', 'cd'], 'Should use custom workflow types');
        assert.strictEqual(userConfig.showPreviewByDefault, false, 'Should not show preview by default');
        assert.strictEqual(userConfig.notificationLevel, 'errors', 'Should show only error notifications');
    });
    test('SettingsManager should handle configuration changes', async () => {
        let configChangeCallback;
        const mockConfig = {
            get: sinon.stub().callsFake((key, defaultValue) => defaultValue),
            has: sinon.stub().returns(true),
            inspect: sinon.stub().returns({}),
            update: sinon.stub().resolves()
        };
        sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfig);
        const onDidChangeConfigurationStub = sinon.stub(vscode.workspace, 'onDidChangeConfiguration');
        onDidChangeConfigurationStub.callsFake((callback) => {
            configChangeCallback = callback;
            return { dispose: sinon.stub() };
        });
        settingsManager = new SettingsManager_1.SettingsManager(mockContext);
        await settingsManager.initialize();
        assert.ok(configChangeCallback, 'Configuration change callback should be registered');
        // Simulate configuration change
        const mockEvent = {
            affectsConfiguration: sinon.stub().returns(true)
        };
        if (configChangeCallback) {
            await configChangeCallback(mockEvent);
        }
        assert.ok(mockEvent.affectsConfiguration.calledWith('readme-to-cicd'), 'Should check if extension configuration changed');
    });
    test('SettingsManager should update workspace configuration', async () => {
        const mockConfig = {
            get: sinon.stub().callsFake((key, defaultValue) => defaultValue),
            has: sinon.stub().returns(true),
            inspect: sinon.stub().returns({}),
            update: sinon.stub().resolves()
        };
        sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfig);
        sinon.stub(vscode.workspace, 'onDidChangeConfiguration').returns({ dispose: sinon.stub() });
        settingsManager = new SettingsManager_1.SettingsManager(mockContext);
        await settingsManager.initialize();
        await settingsManager.updateWorkspaceConfiguration({
            defaultOutputDirectory: '.custom/workflows',
            enableAutoGeneration: true
        });
        assert.ok(mockConfig.update.calledWith('defaultOutputDirectory', '.custom/workflows', vscode.ConfigurationTarget.Workspace));
        assert.ok(mockConfig.update.calledWith('enableAutoGeneration', true, vscode.ConfigurationTarget.Workspace));
    });
    test('SettingsManager should update user configuration', async () => {
        const mockConfig = {
            get: sinon.stub().callsFake((key, defaultValue) => defaultValue),
            has: sinon.stub().returns(true),
            inspect: sinon.stub().returns({}),
            update: sinon.stub().resolves()
        };
        sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfig);
        sinon.stub(vscode.workspace, 'onDidChangeConfiguration').returns({ dispose: sinon.stub() });
        settingsManager = new SettingsManager_1.SettingsManager(mockContext);
        await settingsManager.initialize();
        await settingsManager.updateUserConfiguration({
            showPreviewByDefault: false,
            notificationLevel: 'errors'
        });
        assert.ok(mockConfig.update.calledWith('showPreviewByDefault', false, vscode.ConfigurationTarget.Global));
        assert.ok(mockConfig.update.calledWith('notificationLevel', 'errors', vscode.ConfigurationTarget.Global));
    });
    test('SettingsManager should manage extension state', async () => {
        const mockConfig = {
            get: sinon.stub().callsFake((key, defaultValue) => defaultValue),
            has: sinon.stub().returns(true),
            inspect: sinon.stub().returns({}),
            update: sinon.stub().resolves()
        };
        sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfig);
        sinon.stub(vscode.workspace, 'onDidChangeConfiguration').returns({ dispose: sinon.stub() });
        // Mock workspace state
        mockWorkspaceState.get.withArgs('extensionState').returns({
            recentWorkflows: ['workflow1.yml'],
            userPreferences: { theme: 'dark' }
        });
        settingsManager = new SettingsManager_1.SettingsManager(mockContext);
        await settingsManager.initialize();
        const state = settingsManager.getExtensionState();
        assert.deepStrictEqual(state.recentWorkflows, ['workflow1.yml'], 'Should return recent workflows');
        assert.deepStrictEqual(state.userPreferences, { theme: 'dark' }, 'Should return user preferences');
        // Update state
        await settingsManager.updateExtensionState({
            lastGenerationTime: 123456789
        });
        assert.ok(mockWorkspaceState.update.calledWith('extensionState'), 'Should update workspace state');
    });
    test('SettingsManager should manage global state', async () => {
        const mockConfig = {
            get: sinon.stub().callsFake((key, defaultValue) => defaultValue),
            has: sinon.stub().returns(true),
            inspect: sinon.stub().returns({}),
            update: sinon.stub().resolves()
        };
        sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfig);
        sinon.stub(vscode.workspace, 'onDidChangeConfiguration').returns({ dispose: sinon.stub() });
        // Mock global state
        mockGlobalState.get.withArgs('globalState').returns({
            firstRun: false,
            totalGenerations: 5
        });
        settingsManager = new SettingsManager_1.SettingsManager(mockContext);
        await settingsManager.initialize();
        const globalState = settingsManager.getGlobalState();
        assert.strictEqual(globalState.firstRun, false, 'Should return global state');
        assert.strictEqual(globalState.totalGenerations, 5, 'Should return global state values');
        // Update global state
        await settingsManager.updateGlobalState('totalGenerations', 6);
        assert.ok(mockGlobalState.update.calledWith('globalState'), 'Should update global state');
    });
    test('SettingsManager should add recent workflows', async () => {
        const mockConfig = {
            get: sinon.stub().callsFake((key, defaultValue) => defaultValue),
            has: sinon.stub().returns(true),
            inspect: sinon.stub().returns({}),
            update: sinon.stub().resolves()
        };
        sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfig);
        sinon.stub(vscode.workspace, 'onDidChangeConfiguration').returns({ dispose: sinon.stub() });
        // Mock initial state with existing workflows
        mockWorkspaceState.get.withArgs('extensionState').returns({
            recentWorkflows: ['workflow1.yml', 'workflow2.yml'],
            userPreferences: {}
        });
        settingsManager = new SettingsManager_1.SettingsManager(mockContext);
        await settingsManager.initialize();
        await settingsManager.addRecentWorkflow('workflow3.yml');
        // Should update state with new workflow at the beginning
        const updateCall = mockWorkspaceState.update.getCall(0);
        const updatedState = updateCall.args[1];
        assert.deepStrictEqual(updatedState.recentWorkflows, ['workflow3.yml', 'workflow1.yml', 'workflow2.yml'], 'Should add new workflow to beginning');
        assert.ok(updatedState.lastGenerationTime, 'Should set last generation time');
    });
    test('SettingsManager should provide convenience methods', async () => {
        const mockConfig = {
            get: sinon.stub().callsFake((key, defaultValue) => {
                switch (key) {
                    case 'enableAutoGeneration': return true;
                    case 'showPreviewByDefault': return false;
                    case 'enableInlineValidation': return true;
                    case 'notificationLevel': return 'errors';
                    default: return defaultValue;
                }
            }),
            has: sinon.stub().returns(true),
            inspect: sinon.stub().returns({}),
            update: sinon.stub().resolves()
        };
        sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfig);
        sinon.stub(vscode.workspace, 'onDidChangeConfiguration').returns({ dispose: sinon.stub() });
        settingsManager = new SettingsManager_1.SettingsManager(mockContext);
        await settingsManager.initialize();
        assert.strictEqual(settingsManager.isAutoGenerationEnabled(), true, 'Should return auto-generation status');
        assert.strictEqual(settingsManager.shouldShowPreviewByDefault(), false, 'Should return preview preference');
        assert.strictEqual(settingsManager.isInlineValidationEnabled(), true, 'Should return validation status');
        assert.strictEqual(settingsManager.getNotificationLevel(), 'errors', 'Should return notification level');
    });
    test('SettingsManager should clear state', async () => {
        const mockConfig = {
            get: sinon.stub().callsFake((key, defaultValue) => defaultValue),
            has: sinon.stub().returns(true),
            inspect: sinon.stub().returns({}),
            update: sinon.stub().resolves()
        };
        sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfig);
        sinon.stub(vscode.workspace, 'onDidChangeConfiguration').returns({ dispose: sinon.stub() });
        settingsManager = new SettingsManager_1.SettingsManager(mockContext);
        await settingsManager.initialize();
        await settingsManager.clearWorkspaceState();
        assert.ok(mockWorkspaceState.update.calledWith('extensionState', undefined), 'Should clear workspace state');
        await settingsManager.clearGlobalState();
        assert.ok(mockGlobalState.update.calledWith('globalState', undefined), 'Should clear global state');
    });
});
//# sourceMappingURL=SettingsManager.test.js.map