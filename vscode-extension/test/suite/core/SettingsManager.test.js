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
        assert.strictEqual(globalState['firstRun'], false, 'Should return global state');
        assert.strictEqual(globalState['totalGenerations'], 5, 'Should return global state values');
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
    // Configuration Validation Tests
    suite('Configuration Validation', () => {
        test('should validate workspace configuration successfully', async () => {
            const mockConfig = {
                get: sinon.stub().callsFake((key, defaultValue) => {
                    switch (key) {
                        case 'defaultOutputDirectory': return '.github/workflows';
                        case 'preferredWorkflowTypes': return ['ci', 'cd'];
                        case 'gitIntegration': return {
                            autoCommit: false,
                            commitMessage: 'chore: update workflows',
                            createPR: false
                        };
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
            const validation = await settingsManager.validateConfiguration();
            assert.strictEqual(validation.isValid, true, 'Configuration should be valid');
            assert.strictEqual(validation.errors.length, 0, 'Should have no validation errors');
        });
        test('should detect invalid workspace configuration', async () => {
            const mockConfig = {
                get: sinon.stub().callsFake((key, defaultValue) => {
                    switch (key) {
                        case 'defaultOutputDirectory': return ''; // Invalid empty directory
                        case 'preferredWorkflowTypes': return []; // Invalid empty array
                        case 'gitIntegration': return {
                            autoCommit: true,
                            commitMessage: '', // Invalid empty commit message when autoCommit is true
                            createPR: false
                        };
                        case 'notificationLevel': return 'invalid'; // Invalid notification level
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
            const validation = await settingsManager.validateConfiguration();
            assert.strictEqual(validation.isValid, false, 'Configuration should be invalid');
            assert.ok(validation.errors.length > 0, 'Should have validation errors');
            // Check for specific errors
            const outputDirError = validation.errors.find(e => e.key === 'defaultOutputDirectory');
            assert.ok(outputDirError, 'Should have output directory error');
            const commitMessageError = validation.errors.find(e => e.key === 'gitIntegration.commitMessage');
            assert.ok(commitMessageError, 'Should have commit message error');
            const notificationError = validation.errors.find(e => e.key === 'notificationLevel');
            assert.ok(notificationError, 'Should have notification level error');
        });
        test('should validate user configuration', async () => {
            const mockConfig = {
                get: sinon.stub().callsFake((key, defaultValue) => {
                    switch (key) {
                        case 'notificationLevel': return 'invalid-level';
                        case 'preferredTheme': return 'invalid-theme';
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
            const validation = await settingsManager.validateConfiguration();
            assert.strictEqual(validation.isValid, false, 'Configuration should be invalid');
            const notificationError = validation.errors.find(e => e.key === 'notificationLevel');
            assert.ok(notificationError, 'Should have notification level error');
            const themeError = validation.errors.find(e => e.key === 'preferredTheme');
            assert.ok(themeError, 'Should have theme error');
        });
    });
    // Organization Policy Tests
    suite('Organization Policies', () => {
        test('should load organization policies from workspace configuration', async () => {
            const organizationPolicies = {
                requiredWorkflowTypes: ['ci', 'security'],
                forbiddenActions: ['dangerous-action'],
                requiredSecurityScanning: true,
                maxWorkflowComplexity: 10,
                allowCustomTemplates: false,
                enforceNamingConventions: true,
                namingPattern: '^[a-z-]+\\.yml$'
            };
            const mockConfig = {
                get: sinon.stub().callsFake((key, defaultValue) => {
                    if (key === 'organizationPolicies') {
                        return organizationPolicies;
                    }
                    return defaultValue;
                }),
                has: sinon.stub().returns(true),
                inspect: sinon.stub().returns({}),
                update: sinon.stub().resolves()
            };
            sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfig);
            sinon.stub(vscode.workspace, 'onDidChangeConfiguration').returns({ dispose: sinon.stub() });
            settingsManager = new SettingsManager_1.SettingsManager(mockContext);
            await settingsManager.initialize();
            const policies = settingsManager.getOrganizationPolicies();
            assert.ok(policies, 'Should have organization policies');
            assert.deepStrictEqual(policies.requiredWorkflowTypes, ['ci', 'security'], 'Should load required workflow types');
            assert.strictEqual(policies.allowCustomTemplates, false, 'Should load custom template policy');
            assert.strictEqual(settingsManager.hasOrganizationPolicies(), true, 'Should indicate policies are present');
        });
        test('should validate configuration against organization policies', async () => {
            const organizationPolicies = {
                requiredWorkflowTypes: ['ci', 'security'],
                forbiddenActions: [],
                requiredSecurityScanning: true,
                maxWorkflowComplexity: 10,
                allowCustomTemplates: false,
                enforceNamingConventions: false
            };
            const mockConfig = {
                get: sinon.stub().callsFake((key, defaultValue) => {
                    switch (key) {
                        case 'organizationPolicies': return organizationPolicies;
                        case 'preferredWorkflowTypes': return ['ci']; // Missing required 'security'
                        case 'customTemplates': return ['custom-template.yml']; // Not allowed by policy
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
            const validation = await settingsManager.validateConfiguration();
            assert.strictEqual(validation.isValid, false, 'Configuration should be invalid due to policy violations');
            // Check for policy violation errors
            const workflowTypeError = validation.errors.find(e => e.key === 'preferredWorkflowTypes' && e.message.includes('security'));
            assert.ok(workflowTypeError, 'Should have missing required workflow type error');
            const customTemplateError = validation.errors.find(e => e.key === 'customTemplates' && e.message.includes('prohibits'));
            assert.ok(customTemplateError, 'Should have custom template policy violation error');
        });
        test('should validate configuration changes against policies', async () => {
            const organizationPolicies = {
                requiredWorkflowTypes: ['ci'],
                forbiddenActions: [],
                requiredSecurityScanning: false,
                maxWorkflowComplexity: 10,
                allowCustomTemplates: false,
                enforceNamingConventions: false
            };
            const mockConfig = {
                get: sinon.stub().callsFake((key, defaultValue) => {
                    if (key === 'organizationPolicies') {
                        return organizationPolicies;
                    }
                    return defaultValue;
                }),
                has: sinon.stub().returns(true),
                inspect: sinon.stub().returns({}),
                update: sinon.stub().resolves()
            };
            sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfig);
            sinon.stub(vscode.workspace, 'onDidChangeConfiguration').returns({ dispose: sinon.stub() });
            settingsManager = new SettingsManager_1.SettingsManager(mockContext);
            await settingsManager.initialize();
            // Test valid change
            const validChange = await settingsManager.validateConfigurationChange('preferredWorkflowTypes', ['ci', 'cd'], 'workspace');
            assert.strictEqual(validChange.isValid, true, 'Valid change should pass validation');
            // Test invalid change (violates policy)
            const invalidChange = await settingsManager.validateConfigurationChange('customTemplates', ['custom.yml'], 'workspace');
            assert.strictEqual(invalidChange.isValid, false, 'Invalid change should fail validation');
        });
    });
    // Configuration Management Tests
    suite('Configuration Management', () => {
        test('should get validated configuration', async () => {
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
            const result = await settingsManager.getValidatedConfiguration();
            assert.ok(result.workspace, 'Should return workspace configuration');
            assert.ok(result.user, 'Should return user configuration');
            assert.ok(result.validation, 'Should return validation result');
            assert.strictEqual(typeof result.validation.isValid, 'boolean', 'Validation should have isValid property');
        });
        test('should reset configuration to defaults', async () => {
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
            await settingsManager.resetToDefaults('workspace');
            // Verify that update was called for workspace configuration keys
            assert.ok(mockConfig.update.calledWith('defaultOutputDirectory'), 'Should reset output directory');
            assert.ok(mockConfig.update.calledWith('enableAutoGeneration'), 'Should reset auto generation');
            assert.ok(mockConfig.update.calledWith('preferredWorkflowTypes'), 'Should reset workflow types');
        });
        test('should export and import configuration', async () => {
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
            // Export configuration
            const exported = settingsManager.exportConfiguration();
            assert.ok(exported.workspace, 'Should export workspace configuration');
            assert.ok(exported.user, 'Should export user configuration');
            assert.ok(exported.exportedAt, 'Should include export timestamp');
            // Import configuration
            const importData = {
                workspace: { enableAutoGeneration: true },
                user: { showPreviewByDefault: false }
            };
            const importResult = await settingsManager.importConfiguration(importData);
            assert.strictEqual(importResult.isValid, true, 'Import should be valid');
            // Verify updates were called
            assert.ok(mockConfig.update.calledWith('enableAutoGeneration', true), 'Should import workspace settings');
            assert.ok(mockConfig.update.calledWith('showPreviewByDefault', false), 'Should import user settings');
        });
        test('should handle invalid configuration import', async () => {
            const organizationPolicies = {
                requiredWorkflowTypes: ['ci'],
                forbiddenActions: [],
                requiredSecurityScanning: false,
                maxWorkflowComplexity: 10,
                allowCustomTemplates: false,
                enforceNamingConventions: false
            };
            const mockConfig = {
                get: sinon.stub().callsFake((key, defaultValue) => {
                    if (key === 'organizationPolicies') {
                        return organizationPolicies;
                    }
                    return defaultValue;
                }),
                has: sinon.stub().returns(true),
                inspect: sinon.stub().returns({}),
                update: sinon.stub().resolves()
            };
            sinon.stub(vscode.workspace, 'getConfiguration').returns(mockConfig);
            sinon.stub(vscode.workspace, 'onDidChangeConfiguration').returns({ dispose: sinon.stub() });
            settingsManager = new SettingsManager_1.SettingsManager(mockContext);
            await settingsManager.initialize();
            // Try to import configuration that violates policies
            const invalidImportData = {
                workspace: {
                    customTemplates: ['custom.yml'], // Violates policy
                    defaultOutputDirectory: '' // Invalid empty directory
                }
            };
            const importResult = await settingsManager.importConfiguration(invalidImportData);
            assert.strictEqual(importResult.isValid, false, 'Import should be invalid');
            assert.ok(importResult.errors.length > 0, 'Should have validation errors');
            // Verify no updates were made due to validation failure
            assert.ok(!mockConfig.update.calledWith('customTemplates'), 'Should not import invalid settings');
        });
    });
    // Event Handling Tests
    suite('Event Handling', () => {
        test('should emit configuration change events', async () => {
            let configChangeCallback;
            let emittedEvent = null;
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
            // Listen for configuration change events
            settingsManager.on('configurationChanged', (event) => {
                emittedEvent = event;
            });
            await settingsManager.initialize();
            // Simulate configuration change
            const mockEvent = {
                affectsConfiguration: sinon.stub().returns(true)
            };
            if (configChangeCallback) {
                await configChangeCallback(mockEvent);
            }
            assert.ok(emittedEvent, 'Should emit configuration change event');
            assert.strictEqual(emittedEvent.scope, 'workspace', 'Should indicate workspace scope');
            assert.ok(emittedEvent.timestamp, 'Should include timestamp');
        });
    });
});
//# sourceMappingURL=SettingsManager.test.js.map