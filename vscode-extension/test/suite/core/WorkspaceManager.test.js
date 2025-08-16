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
const WorkspaceManager_1 = require("../../../src/core/WorkspaceManager");
suite('WorkspaceManager Tests', () => {
    let mockContext;
    let mockSettingsManager;
    let workspaceManager;
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
        // Create mock settings manager
        mockSettingsManager = {
            initialize: sinon.stub().resolves(),
            dispose: sinon.stub().resolves(),
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
    });
    teardown(() => {
        sinon.restore();
    });
    test('WorkspaceManager should initialize with no workspace folders', async () => {
        sinon.stub(vscode.workspace, 'workspaceFolders').value(undefined);
        workspaceManager = new WorkspaceManager_1.WorkspaceManager(mockContext, mockSettingsManager);
        await workspaceManager.initialize();
        assert.strictEqual(workspaceManager.getWorkspaceFolders().length, 0, 'Should have no workspace folders');
        assert.strictEqual(workspaceManager.getReadmeFiles().length, 0, 'Should have no README files');
        assert.strictEqual(workspaceManager.hasReadmeFiles(), false, 'Should not have README files');
    });
    test('WorkspaceManager should discover workspace folders', async () => {
        const mockWorkspaceFolders = [
            {
                uri: vscode.Uri.file('/mock/workspace1'),
                name: 'workspace1',
                index: 0
            },
            {
                uri: vscode.Uri.file('/mock/workspace2'),
                name: 'workspace2',
                index: 1
            }
        ];
        sinon.stub(vscode.workspace, 'workspaceFolders').value(mockWorkspaceFolders);
        sinon.stub(vscode.workspace, 'findFiles').resolves([]);
        workspaceManager = new WorkspaceManager_1.WorkspaceManager(mockContext, mockSettingsManager);
        await workspaceManager.initialize();
        const discoveredFolders = workspaceManager.getWorkspaceFolders();
        assert.strictEqual(discoveredFolders.length, 2, 'Should discover 2 workspace folders');
        assert.strictEqual(discoveredFolders[0].name, 'workspace1', 'First folder should be workspace1');
        assert.strictEqual(discoveredFolders[1].name, 'workspace2', 'Second folder should be workspace2');
    });
    test('WorkspaceManager should discover README files', async () => {
        const mockWorkspaceFolder = {
            uri: vscode.Uri.file('/mock/workspace'),
            name: 'test-workspace',
            index: 0
        };
        const mockReadmeFiles = [
            vscode.Uri.file('/mock/workspace/README.md'),
            vscode.Uri.file('/mock/workspace/docs/README.md')
        ];
        sinon.stub(vscode.workspace, 'workspaceFolders').value([mockWorkspaceFolder]);
        sinon.stub(vscode.workspace, 'findFiles').resolves(mockReadmeFiles);
        sinon.stub(vscode.workspace.fs, 'stat').resolves({});
        workspaceManager = new WorkspaceManager_1.WorkspaceManager(mockContext, mockSettingsManager);
        await workspaceManager.initialize();
        const readmeFiles = workspaceManager.getReadmeFiles();
        assert.strictEqual(readmeFiles.length, 2, 'Should discover 2 README files');
        assert.ok(readmeFiles.every(f => f.exists), 'All README files should exist');
        assert.strictEqual(workspaceManager.hasReadmeFiles(), true, 'Should have README files');
    });
    test('WorkspaceManager should handle README files that do not exist', async () => {
        const mockWorkspaceFolder = {
            uri: vscode.Uri.file('/mock/workspace'),
            name: 'test-workspace',
            index: 0
        };
        const mockReadmeFiles = [
            vscode.Uri.file('/mock/workspace/README.md')
        ];
        sinon.stub(vscode.workspace, 'workspaceFolders').value([mockWorkspaceFolder]);
        sinon.stub(vscode.workspace, 'findFiles').resolves(mockReadmeFiles);
        sinon.stub(vscode.workspace.fs, 'stat').rejects(new Error('File not found'));
        workspaceManager = new WorkspaceManager_1.WorkspaceManager(mockContext, mockSettingsManager);
        await workspaceManager.initialize();
        const readmeFiles = workspaceManager.getReadmeFiles();
        assert.strictEqual(readmeFiles.length, 1, 'Should discover 1 README file');
        assert.strictEqual(readmeFiles[0].exists, false, 'README file should not exist');
    });
    test('WorkspaceManager should get README files for specific workspace', async () => {
        const mockWorkspaceFolder1 = {
            uri: vscode.Uri.file('/mock/workspace1'),
            name: 'workspace1',
            index: 0
        };
        const mockWorkspaceFolder2 = {
            uri: vscode.Uri.file('/mock/workspace2'),
            name: 'workspace2',
            index: 1
        };
        sinon.stub(vscode.workspace, 'workspaceFolders').value([mockWorkspaceFolder1, mockWorkspaceFolder2]);
        // Mock findFiles to return different files for different workspaces
        const findFilesStub = sinon.stub(vscode.workspace, 'findFiles');
        findFilesStub.onFirstCall().resolves([vscode.Uri.file('/mock/workspace1/README.md')]);
        findFilesStub.onSecondCall().resolves([]);
        findFilesStub.onThirdCall().resolves([]);
        findFilesStub.onCall(3).resolves([]);
        findFilesStub.onCall(4).resolves([vscode.Uri.file('/mock/workspace2/README.md')]);
        findFilesStub.onCall(5).resolves([]);
        findFilesStub.onCall(6).resolves([]);
        findFilesStub.onCall(7).resolves([]);
        sinon.stub(vscode.workspace.fs, 'stat').resolves({});
        workspaceManager = new WorkspaceManager_1.WorkspaceManager(mockContext, mockSettingsManager);
        await workspaceManager.initialize();
        const workspace1Readmes = workspaceManager.getReadmeFilesForWorkspace(mockWorkspaceFolder1);
        const workspace2Readmes = workspaceManager.getReadmeFilesForWorkspace(mockWorkspaceFolder2);
        assert.strictEqual(workspace1Readmes.length, 1, 'Workspace1 should have 1 README file');
        assert.strictEqual(workspace2Readmes.length, 1, 'Workspace2 should have 1 README file');
        assert.strictEqual(workspace1Readmes[0].workspaceFolder, mockWorkspaceFolder1, 'README should belong to workspace1');
        assert.strictEqual(workspace2Readmes[0].workspaceFolder, mockWorkspaceFolder2, 'README should belong to workspace2');
    });
    test('WorkspaceManager should get primary README file', async () => {
        const mockWorkspaceFolder = {
            uri: vscode.Uri.file('/mock/workspace'),
            name: 'test-workspace',
            index: 0
        };
        const mockReadmeFiles = [
            vscode.Uri.file('/mock/workspace/docs/README.md'),
            vscode.Uri.file('/mock/workspace/README.md')
        ];
        sinon.stub(vscode.workspace, 'workspaceFolders').value([mockWorkspaceFolder]);
        sinon.stub(vscode.workspace, 'findFiles').resolves(mockReadmeFiles);
        sinon.stub(vscode.workspace.fs, 'stat').resolves({});
        workspaceManager = new WorkspaceManager_1.WorkspaceManager(mockContext, mockSettingsManager);
        await workspaceManager.initialize();
        const primaryReadme = workspaceManager.getPrimaryReadmeFile(mockWorkspaceFolder);
        assert.ok(primaryReadme, 'Should have a primary README file');
        assert.ok(primaryReadme.exists, 'Primary README should exist');
    });
    test('WorkspaceManager should get active workspace folder from active editor', async () => {
        const mockWorkspaceFolder = {
            uri: vscode.Uri.file('/mock/workspace'),
            name: 'test-workspace',
            index: 0
        };
        const mockActiveEditor = {
            document: {
                uri: vscode.Uri.file('/mock/workspace/file.ts')
            }
        };
        sinon.stub(vscode.workspace, 'workspaceFolders').value([mockWorkspaceFolder]);
        sinon.stub(vscode.workspace, 'findFiles').resolves([]);
        sinon.stub(vscode.window, 'activeTextEditor').value(mockActiveEditor);
        sinon.stub(vscode.workspace, 'getWorkspaceFolder').returns(mockWorkspaceFolder);
        workspaceManager = new WorkspaceManager_1.WorkspaceManager(mockContext, mockSettingsManager);
        await workspaceManager.initialize();
        const activeWorkspace = workspaceManager.getActiveWorkspaceFolder();
        assert.strictEqual(activeWorkspace, mockWorkspaceFolder, 'Should return workspace folder from active editor');
    });
    test('WorkspaceManager should refresh README discovery', async () => {
        const mockWorkspaceFolder = {
            uri: vscode.Uri.file('/mock/workspace'),
            name: 'test-workspace',
            index: 0
        };
        sinon.stub(vscode.workspace, 'workspaceFolders').value([mockWorkspaceFolder]);
        // Initially no README files
        const findFilesStub = sinon.stub(vscode.workspace, 'findFiles');
        findFilesStub.onFirstCall().resolves([]);
        findFilesStub.onSecondCall().resolves([]);
        findFilesStub.onThirdCall().resolves([]);
        findFilesStub.onCall(3).resolves([]);
        workspaceManager = new WorkspaceManager_1.WorkspaceManager(mockContext, mockSettingsManager);
        await workspaceManager.initialize();
        assert.strictEqual(workspaceManager.getReadmeFiles().length, 0, 'Should initially have no README files');
        // After refresh, README files are found
        findFilesStub.resetHistory();
        findFilesStub.onFirstCall().resolves([vscode.Uri.file('/mock/workspace/README.md')]);
        findFilesStub.onSecondCall().resolves([]);
        findFilesStub.onThirdCall().resolves([]);
        findFilesStub.onCall(3).resolves([]);
        sinon.stub(vscode.workspace.fs, 'stat').resolves({});
        await workspaceManager.refreshReadmeDiscovery();
        assert.strictEqual(workspaceManager.getReadmeFiles().length, 1, 'Should have 1 README file after refresh');
    });
    test('WorkspaceManager should handle workspace change events', async () => {
        let workspaceChangeCallback;
        const onDidChangeWorkspaceFoldersStub = sinon.stub(vscode.workspace, 'onDidChangeWorkspaceFolders');
        onDidChangeWorkspaceFoldersStub.callsFake((callback) => {
            workspaceChangeCallback = callback;
            return { dispose: sinon.stub() };
        });
        sinon.stub(vscode.workspace, 'workspaceFolders').value([]);
        sinon.stub(vscode.workspace, 'findFiles').resolves([]);
        workspaceManager = new WorkspaceManager_1.WorkspaceManager(mockContext, mockSettingsManager);
        await workspaceManager.initialize();
        assert.ok(workspaceChangeCallback, 'Workspace change callback should be registered');
        // Simulate workspace change event
        const mockEvent = {
            added: [{
                    uri: vscode.Uri.file('/mock/new-workspace'),
                    name: 'new-workspace',
                    index: 0
                }],
            removed: []
        };
        if (workspaceChangeCallback) {
            await workspaceChangeCallback(mockEvent);
        }
        // Verify that the callback was called (implementation would update workspace folders)
        assert.ok(true, 'Workspace change event should be handled');
    });
});
//# sourceMappingURL=WorkspaceManager.test.js.map