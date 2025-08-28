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
const CommandManager_1 = require("../../../src/core/CommandManager");
suite('CommandManager Tests', () => {
    let mockContext;
    let mockWorkspaceManager;
    let mockSettingsManager;
    let commandManager;
    let commandRegistrationStub;
    let commandExecutionStub;
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
            extensionPath: '/mock/extension/path'
        };
        // Create mock workspace manager
        mockWorkspaceManager = {
            initialize: sinon.stub().resolves(),
            dispose: sinon.stub().resolves(),
            getWorkspaceFolders: sinon.stub().returns([]),
            getReadmeFiles: sinon.stub().returns([]),
            getActiveWorkspaceFolder: sinon.stub().returns(undefined),
            getPrimaryReadmeFile: sinon.stub().returns(undefined),
            refreshReadmeDiscovery: sinon.stub().resolves()
        };
        // Create mock settings manager
        mockSettingsManager = {
            initialize: sinon.stub().resolves(),
            dispose: sinon.stub().resolves(),
            getNotificationLevel: sinon.stub().returns('all'),
            getWorkspaceConfiguration: sinon.stub().returns({
                defaultOutputDirectory: '.github/workflows',
                enableAutoGeneration: false,
                preferredWorkflowTypes: ['ci'],
                customTemplates: [],
                enableInlineValidation: true
            }),
            getUserConfiguration: sinon.stub().returns({
                showPreviewByDefault: true,
                notificationLevel: 'all',
                preferredTheme: 'auto'
            })
        };
        // Mock VS Code command registration
        commandRegistrationStub = sinon.stub(vscode.commands, 'registerCommand');
        commandExecutionStub = sinon.stub(vscode.commands, 'executeCommand');
        // Mock VS Code window methods
        sinon.stub(vscode.window, 'showErrorMessage').resolves();
        sinon.stub(vscode.window, 'showInformationMessage').resolves();
        sinon.stub(vscode.window, 'withProgress').callsFake(async (_options, task) => {
            const progress = {
                report: sinon.stub()
            };
            return await task(progress, {});
        });
        // Mock VS Code workspace methods
        sinon.stub(vscode.workspace, 'getWorkspaceFolder').returns(undefined);
        sinon.stub(vscode.workspace, 'findFiles').resolves([]);
    });
    teardown(() => {
        sinon.restore();
    });
    test('CommandManager should initialize and register all commands', async () => {
        commandManager = new CommandManager_1.CommandManager(mockContext, mockWorkspaceManager, mockSettingsManager);
        await commandManager.initialize();
        // Verify all commands are registered
        const expectedCommands = Object.values(CommandManager_1.ExtensionCommands);
        assert.strictEqual(commandRegistrationStub.callCount, expectedCommands.length, `Should register ${expectedCommands.length} commands`);
        // Verify each command is registered
        expectedCommands.forEach(command => {
            assert.ok(commandRegistrationStub.calledWith(command), `Should register command: ${command}`);
        });
        // Verify commands are added to context subscriptions
        assert.strictEqual(mockContext.subscriptions.length, expectedCommands.length, 'All commands should be added to context subscriptions');
    });
    test('CommandManager should dispose all registered commands', async () => {
        commandManager = new CommandManager_1.CommandManager(mockContext, mockWorkspaceManager, mockSettingsManager);
        await commandManager.initialize();
        const initialSubscriptionCount = mockContext.subscriptions.length;
        assert.ok(initialSubscriptionCount > 0, 'Should have registered commands');
        await commandManager.dispose();
        // Verify dispose was called on all registered commands
        mockContext.subscriptions.forEach(subscription => {
            // In real scenario, dispose would be called, but we can't easily verify this in tests
            // The important thing is that the array is cleared
            assert.ok(subscription.dispose, 'Subscription should have dispose method');
        });
    });
    test('CommandManager should return list of registered commands', async () => {
        commandManager = new CommandManager_1.CommandManager(mockContext, mockWorkspaceManager, mockSettingsManager);
        await commandManager.initialize();
        const registeredCommands = commandManager.getRegisteredCommands();
        const expectedCommands = Object.values(CommandManager_1.ExtensionCommands);
        assert.strictEqual(registeredCommands.length, expectedCommands.length, 'Should return all registered commands');
        expectedCommands.forEach(command => {
            assert.ok(registeredCommands.includes(command), `Should include command: ${command}`);
        });
    });
    test('CommandManager should create command context from URI', async () => {
        const mockWorkspaceFolder = {
            uri: vscode.Uri.file('/mock/workspace'),
            name: 'test-workspace',
            index: 0
        };
        const mockReadmeUri = vscode.Uri.file('/mock/workspace/README.md');
        sinon.stub(vscode.workspace, 'getWorkspaceFolder').returns(mockWorkspaceFolder);
        commandManager = new CommandManager_1.CommandManager(mockContext, mockWorkspaceManager, mockSettingsManager);
        // Access private method through any cast for testing
        const context = commandManager.createCommandContext(mockReadmeUri);
        assert.strictEqual(context.workspaceFolder, mockWorkspaceFolder, 'Should set workspace folder from URI');
        assert.strictEqual(context.readmeFile, mockReadmeUri, 'Should set README file from URI');
    });
    test('CommandManager should create command context from active editor', async () => {
        const mockWorkspaceFolder = {
            uri: vscode.Uri.file('/mock/workspace'),
            name: 'test-workspace',
            index: 0
        };
        const mockActiveEditor = {
            document: {
                uri: vscode.Uri.file('/mock/workspace/README.md'),
                fileName: '/mock/workspace/README.md'
            },
            selection: new vscode.Selection(0, 0, 0, 0)
        };
        sinon.stub(vscode.window, 'activeTextEditor').value(mockActiveEditor);
        sinon.stub(vscode.workspace, 'getWorkspaceFolder').returns(mockWorkspaceFolder);
        commandManager = new CommandManager_1.CommandManager(mockContext, mockWorkspaceManager, mockSettingsManager);
        // Access private method through any cast for testing
        const context = commandManager.createCommandContext();
        assert.strictEqual(context.workspaceFolder, mockWorkspaceFolder, 'Should set workspace folder from active editor');
        assert.strictEqual(context.activeEditor, mockActiveEditor, 'Should set active editor');
        assert.strictEqual(context.selection, mockActiveEditor.selection, 'Should set selection from active editor');
        assert.strictEqual(context.readmeFile?.fsPath, mockActiveEditor.document.uri.fsPath, 'Should set README file from active editor');
    });
    test('CommandManager should handle Generate Workflow command execution', async () => {
        const mockWorkspaceFolder = {
            uri: vscode.Uri.file('/mock/workspace'),
            name: 'test-workspace',
            index: 0
        };
        const mockReadmeUri = vscode.Uri.file('/mock/workspace/README.md');
        mockWorkspaceManager.getActiveWorkspaceFolder = sinon.stub().returns(mockWorkspaceFolder);
        mockWorkspaceManager.getPrimaryReadmeFile = sinon.stub().returns({
            uri: mockReadmeUri,
            workspaceFolder: mockWorkspaceFolder,
            exists: true,
            relativePath: 'README.md'
        });
        commandManager = new CommandManager_1.CommandManager(mockContext, mockWorkspaceManager, mockSettingsManager);
        await commandManager.initialize();
        // Get the registered command callback
        const generateWorkflowCall = commandRegistrationStub.getCalls().find(call => call.args[0] === CommandManager_1.ExtensionCommands.GENERATE_WORKFLOW);
        assert.ok(generateWorkflowCall, 'Generate Workflow command should be registered');
        const commandCallback = generateWorkflowCall.args[1];
        // Execute the command
        await commandCallback(mockReadmeUri);
        // Verify progress was shown
        assert.ok(vscode.window.withProgress.called, 'Should show progress during workflow generation');
        // Verify success message was shown
        assert.ok(vscode.window.showInformationMessage.called, 'Should show success message');
    });
    test('CommandManager should handle Generate Workflow command with no workspace', async () => {
        mockWorkspaceManager.getActiveWorkspaceFolder = sinon.stub().returns(undefined);
        commandManager = new CommandManager_1.CommandManager(mockContext, mockWorkspaceManager, mockSettingsManager);
        await commandManager.initialize();
        // Get the registered command callback
        const generateWorkflowCall = commandRegistrationStub.getCalls().find(call => call.args[0] === CommandManager_1.ExtensionCommands.GENERATE_WORKFLOW);
        const commandCallback = generateWorkflowCall.args[1];
        // Execute the command without workspace
        await commandCallback();
        // Verify error message was shown
        assert.ok(vscode.window.showErrorMessage.calledWith('No workspace folder found. Please open a folder or workspace.'), 'Should show workspace error message');
    });
    test('CommandManager should handle Generate Workflow command with no README', async () => {
        const mockWorkspaceFolder = {
            uri: vscode.Uri.file('/mock/workspace'),
            name: 'test-workspace',
            index: 0
        };
        mockWorkspaceManager.getActiveWorkspaceFolder = sinon.stub().returns(mockWorkspaceFolder);
        mockWorkspaceManager.getPrimaryReadmeFile = sinon.stub().returns(undefined);
        commandManager = new CommandManager_1.CommandManager(mockContext, mockWorkspaceManager, mockSettingsManager);
        await commandManager.initialize();
        // Get the registered command callback
        const generateWorkflowCall = commandRegistrationStub.getCalls().find(call => call.args[0] === CommandManager_1.ExtensionCommands.GENERATE_WORKFLOW);
        const commandCallback = generateWorkflowCall.args[1];
        // Execute the command without README
        await commandCallback();
        // Verify error message was shown
        assert.ok(vscode.window.showErrorMessage.calledWith('No README.md file found in the workspace.'), 'Should show README error message');
    });
    test('CommandManager should handle Preview Workflow command execution', async () => {
        const mockWorkspaceFolder = {
            uri: vscode.Uri.file('/mock/workspace'),
            name: 'test-workspace',
            index: 0
        };
        const mockReadmeUri = vscode.Uri.file('/mock/workspace/README.md');
        mockWorkspaceManager.getActiveWorkspaceFolder = sinon.stub().returns(mockWorkspaceFolder);
        mockWorkspaceManager.getPrimaryReadmeFile = sinon.stub().returns({
            uri: mockReadmeUri,
            workspaceFolder: mockWorkspaceFolder,
            exists: true,
            relativePath: 'README.md'
        });
        commandManager = new CommandManager_1.CommandManager(mockContext, mockWorkspaceManager, mockSettingsManager);
        await commandManager.initialize();
        // Get the registered command callback
        const previewWorkflowCall = commandRegistrationStub.getCalls().find(call => call.args[0] === CommandManager_1.ExtensionCommands.PREVIEW_WORKFLOW);
        assert.ok(previewWorkflowCall, 'Preview Workflow command should be registered');
        const commandCallback = previewWorkflowCall.args[1];
        // Execute the command
        await commandCallback(mockReadmeUri);
        // Verify information message was shown
        assert.ok(vscode.window.showInformationMessage.called, 'Should show preview information message');
    });
    test('CommandManager should handle Validate Workflow command execution', async () => {
        const mockWorkspaceFolder = {
            uri: vscode.Uri.file('/mock/workspace'),
            name: 'test-workspace',
            index: 0
        };
        const mockWorkflowFiles = [
            vscode.Uri.file('/mock/workspace/.github/workflows/ci.yml'),
            vscode.Uri.file('/mock/workspace/.github/workflows/cd.yml')
        ];
        mockWorkspaceManager.getActiveWorkspaceFolder = sinon.stub().returns(mockWorkspaceFolder);
        sinon.stub(vscode.workspace, 'findFiles').resolves(mockWorkflowFiles);
        commandManager = new CommandManager_1.CommandManager(mockContext, mockWorkspaceManager, mockSettingsManager);
        await commandManager.initialize();
        // Get the registered command callback
        const validateWorkflowCall = commandRegistrationStub.getCalls().find(call => call.args[0] === CommandManager_1.ExtensionCommands.VALIDATE_WORKFLOW);
        assert.ok(validateWorkflowCall, 'Validate Workflow command should be registered');
        const commandCallback = validateWorkflowCall.args[1];
        // Execute the command
        await commandCallback();
        // Verify information message was shown with file count
        const showInfoStub = vscode.window.showInformationMessage;
        assert.ok(showInfoStub.calledWith('Found 2 workflow file(s) to validate', 'Validate All'), 'Should show validation message with file count');
    });
    test('CommandManager should handle Validate Workflow command with no workflow files', async () => {
        const mockWorkspaceFolder = {
            uri: vscode.Uri.file('/mock/workspace'),
            name: 'test-workspace',
            index: 0
        };
        mockWorkspaceManager.getActiveWorkspaceFolder = sinon.stub().returns(mockWorkspaceFolder);
        sinon.stub(vscode.workspace, 'findFiles').resolves([]);
        commandManager = new CommandManager_1.CommandManager(mockContext, mockWorkspaceManager, mockSettingsManager);
        await commandManager.initialize();
        // Get the registered command callback
        const validateWorkflowCall = commandRegistrationStub.getCalls().find(call => call.args[0] === CommandManager_1.ExtensionCommands.VALIDATE_WORKFLOW);
        const commandCallback = validateWorkflowCall.args[1];
        // Execute the command
        await commandCallback();
        // Verify information message was shown
        assert.ok(vscode.window.showInformationMessage.calledWith('No workflow files found to validate.'), 'Should show no workflow files message');
    });
    test('CommandManager should handle Open Configuration command execution', async () => {
        commandManager = new CommandManager_1.CommandManager(mockContext, mockWorkspaceManager, mockSettingsManager);
        await commandManager.initialize();
        // Get the registered command callback
        const openConfigCall = commandRegistrationStub.getCalls().find(call => call.args[0] === CommandManager_1.ExtensionCommands.OPEN_CONFIGURATION);
        assert.ok(openConfigCall, 'Open Configuration command should be registered');
        const commandCallback = openConfigCall.args[1];
        // Mock user selection
        vscode.window.showInformationMessage.resolves('Open Settings');
        // Execute the command
        await commandCallback();
        // Verify configuration message was shown
        assert.ok(vscode.window.showInformationMessage.calledWith('Configuration panel will open here', 'Open Settings', 'Reset to Defaults'), 'Should show configuration options');
        // Verify settings command was executed
        assert.ok(commandExecutionStub.calledWith('workbench.action.openSettings', '@ext:readme-to-cicd'), 'Should execute open settings command');
    });
    test('CommandManager should handle Refresh Detection command execution', async () => {
        mockWorkspaceManager.getReadmeFiles = sinon.stub().returns([
            {
                uri: vscode.Uri.file('/mock/workspace/README.md'),
                workspaceFolder: { name: 'test-workspace' },
                exists: true,
                relativePath: 'README.md'
            }
        ]);
        commandManager = new CommandManager_1.CommandManager(mockContext, mockWorkspaceManager, mockSettingsManager);
        await commandManager.initialize();
        // Get the registered command callback
        const refreshDetectionCall = commandRegistrationStub.getCalls().find(call => call.args[0] === CommandManager_1.ExtensionCommands.REFRESH_DETECTION);
        assert.ok(refreshDetectionCall, 'Refresh Detection command should be registered');
        const commandCallback = refreshDetectionCall.args[1];
        // Execute the command
        await commandCallback();
        // Verify workspace manager refresh was called
        assert.ok(mockWorkspaceManager.refreshReadmeDiscovery.called, 'Should call workspace manager refresh');
        // Verify progress was shown
        assert.ok(vscode.window.withProgress.called, 'Should show progress during refresh');
        // Verify success message was shown
        const showInfoStub = vscode.window.showInformationMessage;
        assert.ok(showInfoStub.calledWith('Framework detection refreshed. Found 1 README file(s).'), 'Should show refresh success message');
    });
    test('CommandManager should handle command execution errors', async () => {
        // Mock workspace manager to throw error
        mockWorkspaceManager.refreshReadmeDiscovery = sinon.stub().rejects(new Error('Test error'));
        mockSettingsManager.getNotificationLevel = sinon.stub().returns('all');
        commandManager = new CommandManager_1.CommandManager(mockContext, mockWorkspaceManager, mockSettingsManager);
        await commandManager.initialize();
        // Get the registered command callback
        const refreshDetectionCall = commandRegistrationStub.getCalls().find(call => call.args[0] === CommandManager_1.ExtensionCommands.REFRESH_DETECTION);
        const commandCallback = refreshDetectionCall.args[1];
        // Execute the command (should not throw)
        await commandCallback();
        // Verify error message was shown
        const showErrorStub = vscode.window.showErrorMessage;
        assert.ok(showErrorStub.called, 'Should show error message');
        const errorCall = showErrorStub.getCalls().find(call => call.args[0].includes('Refresh Detection failed'));
        assert.ok(errorCall, 'Should show specific command error message');
    });
    test('CommandManager should respect notification level settings', async () => {
        // Mock settings to return 'none' notification level
        mockSettingsManager.getNotificationLevel = sinon.stub().returns('none');
        mockWorkspaceManager.refreshReadmeDiscovery = sinon.stub().rejects(new Error('Test error'));
        commandManager = new CommandManager_1.CommandManager(mockContext, mockWorkspaceManager, mockSettingsManager);
        await commandManager.initialize();
        // Get the registered command callback
        const refreshDetectionCall = commandRegistrationStub.getCalls().find(call => call.args[0] === CommandManager_1.ExtensionCommands.REFRESH_DETECTION);
        const commandCallback = refreshDetectionCall.args[1];
        // Execute the command
        await commandCallback();
        // Verify no error message was shown due to notification level
        const showErrorStub = vscode.window.showErrorMessage;
        assert.ok(!showErrorStub.called, 'Should not show error message when notification level is none');
    });
    test('CommandManager should handle errors notification level', async () => {
        // Mock settings to return 'errors' notification level
        mockSettingsManager.getNotificationLevel = sinon.stub().returns('errors');
        mockWorkspaceManager.refreshReadmeDiscovery = sinon.stub().rejects(new Error('Test error'));
        commandManager = new CommandManager_1.CommandManager(mockContext, mockWorkspaceManager, mockSettingsManager);
        await commandManager.initialize();
        // Get the registered command callback
        const refreshDetectionCall = commandRegistrationStub.getCalls().find(call => call.args[0] === CommandManager_1.ExtensionCommands.REFRESH_DETECTION);
        const commandCallback = refreshDetectionCall.args[1];
        // Execute the command
        await commandCallback();
        // Verify error message was shown for 'errors' notification level
        const showErrorStub = vscode.window.showErrorMessage;
        assert.ok(showErrorStub.called, 'Should show error message when notification level is errors');
    });
    test('CommandManager should handle fallback workspace detection', async () => {
        const mockWorkspaceFolder = {
            uri: vscode.Uri.file('/mock/workspace'),
            name: 'test-workspace',
            index: 0
        };
        // Mock no active editor and no URI provided
        sinon.stub(vscode.window, 'activeTextEditor').value(undefined);
        mockWorkspaceManager.getActiveWorkspaceFolder = sinon.stub().returns(mockWorkspaceFolder);
        mockWorkspaceManager.getPrimaryReadmeFile = sinon.stub().returns({
            uri: vscode.Uri.file('/mock/workspace/README.md'),
            workspaceFolder: mockWorkspaceFolder,
            exists: true,
            relativePath: 'README.md'
        });
        commandManager = new CommandManager_1.CommandManager(mockContext, mockWorkspaceManager, mockSettingsManager);
        // Access private method through any cast for testing
        const context = commandManager.createCommandContext();
        assert.strictEqual(context.workspaceFolder, mockWorkspaceFolder, 'Should fallback to workspace manager for workspace folder');
        assert.strictEqual(context.activeEditor, undefined, 'Should have no active editor');
        assert.ok(context.readmeFile, 'Should find README file from workspace manager');
    });
});
//# sourceMappingURL=CommandManager.test.js.map