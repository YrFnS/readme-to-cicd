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
const CommandManager_1 = require("../../src/core/CommandManager");
const WorkspaceManager_1 = require("../../src/core/WorkspaceManager");
const SettingsManager_1 = require("../../src/core/SettingsManager");
const GitIntegration_1 = require("../../src/core/GitIntegration");
suite('Git Integration Commands Unit Tests', () => {
    let commandManager;
    let mockContext;
    let workspaceManagerStub;
    let settingsManagerStub;
    let gitIntegrationStub;
    let workspaceFolder;
    setup(() => {
        // Create mock context
        mockContext = {
            subscriptions: [],
            workspaceState: {},
            globalState: {},
            extensionPath: '/test/path',
            storagePath: '/test/storage',
            globalStoragePath: '/test/global-storage',
            logPath: '/test/log'
        };
        // Create mock workspace folder
        workspaceFolder = {
            uri: vscode.Uri.file('/test/workspace'),
            name: 'test-workspace',
            index: 0
        };
        // Create stubs
        workspaceManagerStub = sinon.createStubInstance(WorkspaceManager_1.WorkspaceManager);
        settingsManagerStub = sinon.createStubInstance(SettingsManager_1.SettingsManager);
        gitIntegrationStub = sinon.createStubInstance(GitIntegration_1.GitIntegration);
        // Setup default stub behaviors
        workspaceManagerStub.getActiveWorkspaceFolder.returns(workspaceFolder);
        settingsManagerStub.getNotificationLevel.returns('all');
        // Create CommandManager with Git integration
        commandManager = new CommandManager_1.CommandManager(mockContext, workspaceManagerStub, settingsManagerStub, gitIntegrationStub);
    });
    teardown(() => {
        sinon.restore();
    });
    suite('Stage Workflow Files Command', () => {
        test('should stage workflow files when suggestions are available', async () => {
            // Arrange
            const workflowFiles = [
                vscode.Uri.file('/test/workspace/.github/workflows/ci.yml'),
                vscode.Uri.file('/test/workspace/.github/workflows/deploy.yml')
            ];
            const suggestions = [
                {
                    filePath: '.github/workflows/ci.yml',
                    action: 'stage',
                    reason: 'Generated workflow file should be committed',
                    priority: 'high'
                },
                {
                    filePath: '.github/workflows/deploy.yml',
                    action: 'stage',
                    reason: 'Generated workflow file should be committed',
                    priority: 'high'
                }
            ];
            // Stub VS Code APIs
            const findFilesStub = sinon.stub(vscode.workspace, 'findFiles').resolves(workflowFiles);
            const showInformationMessageStub = sinon.stub(vscode.window, 'showInformationMessage').resolves('Stage All');
            // Stub Git integration methods
            gitIntegrationStub.generateStagingSuggestions.resolves(suggestions);
            gitIntegrationStub.stageFiles.resolves();
            // Act
            await vscode.commands.executeCommand(CommandManager_1.ExtensionCommands.STAGE_WORKFLOW_FILES);
            // Assert
            assert.ok(gitIntegrationStub.generateStagingSuggestions.calledOnce);
            assert.ok(gitIntegrationStub.stageFiles.calledOnce);
            assert.ok(showInformationMessageStub.calledWith('Stage 2 workflow file(s)?'));
            // Cleanup
            findFilesStub.restore();
            showInformationMessageStub.restore();
        });
        test('should show message when no workflow files found', async () => {
            // Arrange
            const findFilesStub = sinon.stub(vscode.workspace, 'findFiles').resolves([]);
            const showInformationMessageStub = sinon.stub(vscode.window, 'showInformationMessage');
            // Act
            await vscode.commands.executeCommand(CommandManager_1.ExtensionCommands.STAGE_WORKFLOW_FILES);
            // Assert
            assert.ok(showInformationMessageStub.calledWith('No workflow files found to stage.'));
            assert.ok(gitIntegrationStub.generateStagingSuggestions.notCalled);
            // Cleanup
            findFilesStub.restore();
            showInformationMessageStub.restore();
        });
        test('should show message when no files need staging', async () => {
            // Arrange
            const workflowFiles = [vscode.Uri.file('/test/workspace/.github/workflows/ci.yml')];
            const findFilesStub = sinon.stub(vscode.workspace, 'findFiles').resolves(workflowFiles);
            const showInformationMessageStub = sinon.stub(vscode.window, 'showInformationMessage');
            gitIntegrationStub.generateStagingSuggestions.resolves([]);
            // Act
            await vscode.commands.executeCommand(CommandManager_1.ExtensionCommands.STAGE_WORKFLOW_FILES);
            // Assert
            assert.ok(showInformationMessageStub.calledWith('No files need to be staged.'));
            assert.ok(gitIntegrationStub.stageFiles.notCalled);
            // Cleanup
            findFilesStub.restore();
            showInformationMessageStub.restore();
        });
    });
    suite('Commit Workflow Changes Command', () => {
        test('should commit staged workflow files', async () => {
            // Arrange
            const mockStatus = {
                isRepository: true,
                currentBranch: 'main',
                hasUncommittedChanges: true,
                stagedFiles: ['.github/workflows/ci.yml', 'README.md'],
                unstagedFiles: [],
                untrackedFiles: [],
                conflictedFiles: [],
                remoteBranches: [],
                localBranches: []
            };
            const showInputBoxStub = sinon.stub(vscode.window, 'showInputBox').resolves('Add CI workflow');
            gitIntegrationStub.detectRepositoryStatus.resolves(mockStatus);
            gitIntegrationStub.generateCommitMessage.returns('Add ci workflow');
            gitIntegrationStub.createCommit.resolves({
                hash: 'abc123',
                message: 'Add CI workflow',
                author: 'Test User',
                date: new Date(),
                files: []
            });
            // Act
            await vscode.commands.executeCommand(CommandManager_1.ExtensionCommands.COMMIT_WORKFLOW_CHANGES);
            // Assert
            assert.ok(gitIntegrationStub.detectRepositoryStatus.calledOnce);
            assert.ok(gitIntegrationStub.generateCommitMessage.calledWith(['.github/workflows/ci.yml']));
            assert.ok(gitIntegrationStub.createCommit.calledWith(workspaceFolder, 'Add CI workflow'));
            assert.ok(showInputBoxStub.calledOnce);
            // Cleanup
            showInputBoxStub.restore();
        });
        test('should show error for non-Git repository', async () => {
            // Arrange
            const mockStatus = {
                isRepository: false,
                currentBranch: '',
                hasUncommittedChanges: false,
                stagedFiles: [],
                unstagedFiles: [],
                untrackedFiles: [],
                conflictedFiles: [],
                remoteBranches: [],
                localBranches: []
            };
            const showErrorMessageStub = sinon.stub(vscode.window, 'showErrorMessage');
            gitIntegrationStub.detectRepositoryStatus.resolves(mockStatus);
            // Act
            await vscode.commands.executeCommand(CommandManager_1.ExtensionCommands.COMMIT_WORKFLOW_CHANGES);
            // Assert
            assert.ok(showErrorMessageStub.calledWith('Current workspace is not a Git repository.'));
            assert.ok(gitIntegrationStub.createCommit.notCalled);
            // Cleanup
            showErrorMessageStub.restore();
        });
        test('should show message when no staged files', async () => {
            // Arrange
            const mockStatus = {
                isRepository: true,
                currentBranch: 'main',
                hasUncommittedChanges: false,
                stagedFiles: [],
                unstagedFiles: [],
                untrackedFiles: [],
                conflictedFiles: [],
                remoteBranches: [],
                localBranches: []
            };
            const showInformationMessageStub = sinon.stub(vscode.window, 'showInformationMessage');
            gitIntegrationStub.detectRepositoryStatus.resolves(mockStatus);
            // Act
            await vscode.commands.executeCommand(CommandManager_1.ExtensionCommands.COMMIT_WORKFLOW_CHANGES);
            // Assert
            assert.ok(showInformationMessageStub.calledWith('No staged files to commit.'));
            assert.ok(gitIntegrationStub.createCommit.notCalled);
            // Cleanup
            showInformationMessageStub.restore();
        });
    });
    suite('Create Workflow Branch Command', () => {
        test('should create workflow branch with single local branch', async () => {
            // Arrange
            const mockStatus = {
                isRepository: true,
                currentBranch: 'main',
                hasUncommittedChanges: false,
                stagedFiles: [],
                unstagedFiles: [],
                untrackedFiles: [],
                conflictedFiles: [],
                remoteBranches: [],
                localBranches: ['main']
            };
            gitIntegrationStub.detectRepositoryStatus.resolves(mockStatus);
            gitIntegrationStub.createWorkflowBranch.resolves('feature/update-workflows-2024-01-15T10-30-00');
            // Act
            await vscode.commands.executeCommand(CommandManager_1.ExtensionCommands.CREATE_WORKFLOW_BRANCH);
            // Assert
            assert.ok(gitIntegrationStub.detectRepositoryStatus.calledOnce);
            assert.ok(gitIntegrationStub.createWorkflowBranch.calledWith(workspaceFolder, undefined));
        });
        test('should prompt for base branch with multiple local branches', async () => {
            // Arrange
            const mockStatus = {
                isRepository: true,
                currentBranch: 'main',
                hasUncommittedChanges: false,
                stagedFiles: [],
                unstagedFiles: [],
                untrackedFiles: [],
                conflictedFiles: [],
                remoteBranches: [],
                localBranches: ['main', 'develop', 'feature/test']
            };
            const showQuickPickStub = sinon.stub(vscode.window, 'showQuickPick').resolves('develop');
            gitIntegrationStub.detectRepositoryStatus.resolves(mockStatus);
            gitIntegrationStub.createWorkflowBranch.resolves('feature/update-workflows-2024-01-15T10-30-00');
            // Act
            await vscode.commands.executeCommand(CommandManager_1.ExtensionCommands.CREATE_WORKFLOW_BRANCH);
            // Assert
            assert.ok(showQuickPickStub.calledWith(['main', 'develop', 'feature/test']));
            assert.ok(gitIntegrationStub.createWorkflowBranch.calledWith(workspaceFolder, 'develop'));
            // Cleanup
            showQuickPickStub.restore();
        });
        test('should show error for non-Git repository', async () => {
            // Arrange
            const mockStatus = {
                isRepository: false,
                currentBranch: '',
                hasUncommittedChanges: false,
                stagedFiles: [],
                unstagedFiles: [],
                untrackedFiles: [],
                conflictedFiles: [],
                remoteBranches: [],
                localBranches: []
            };
            const showErrorMessageStub = sinon.stub(vscode.window, 'showErrorMessage');
            gitIntegrationStub.detectRepositoryStatus.resolves(mockStatus);
            // Act
            await vscode.commands.executeCommand(CommandManager_1.ExtensionCommands.CREATE_WORKFLOW_BRANCH);
            // Assert
            assert.ok(showErrorMessageStub.calledWith('Current workspace is not a Git repository.'));
            assert.ok(gitIntegrationStub.createWorkflowBranch.notCalled);
            // Cleanup
            showErrorMessageStub.restore();
        });
    });
    suite('Resolve Merge Conflicts Command', () => {
        test('should resolve merge conflicts when conflicts exist', async () => {
            // Arrange
            const conflicts = [
                {
                    filePath: '.github/workflows/ci.yml',
                    conflictType: 'content'
                },
                {
                    filePath: '.github/workflows/deploy.yml',
                    conflictType: 'content'
                }
            ];
            const showQuickPickStub = sinon.stub(vscode.window, 'showQuickPick').resolves('.github/workflows/ci.yml');
            gitIntegrationStub.detectMergeConflicts.resolves(conflicts);
            gitIntegrationStub.provideMergeConflictResolution.resolves();
            // Act
            await vscode.commands.executeCommand(CommandManager_1.ExtensionCommands.RESOLVE_MERGE_CONFLICTS);
            // Assert
            assert.ok(gitIntegrationStub.detectMergeConflicts.calledOnce);
            assert.ok(showQuickPickStub.calledWith(['.github/workflows/ci.yml', '.github/workflows/deploy.yml']));
            assert.ok(gitIntegrationStub.provideMergeConflictResolution.calledWith(workspaceFolder, conflicts[0]));
            // Cleanup
            showQuickPickStub.restore();
        });
        test('should show message when no conflicts detected', async () => {
            // Arrange
            const showInformationMessageStub = sinon.stub(vscode.window, 'showInformationMessage');
            gitIntegrationStub.detectMergeConflicts.resolves([]);
            // Act
            await vscode.commands.executeCommand(CommandManager_1.ExtensionCommands.RESOLVE_MERGE_CONFLICTS);
            // Assert
            assert.ok(showInformationMessageStub.calledWith('No merge conflicts detected.'));
            assert.ok(gitIntegrationStub.provideMergeConflictResolution.notCalled);
            // Cleanup
            showInformationMessageStub.restore();
        });
    });
    suite('Error Handling', () => {
        test('should handle Git integration not available', async () => {
            // Arrange
            const commandManagerWithoutGit = new CommandManager_1.CommandManager(mockContext, workspaceManagerStub, settingsManagerStub
            // No Git integration
            );
            const showErrorMessageStub = sinon.stub(vscode.window, 'showErrorMessage');
            // Act
            await vscode.commands.executeCommand(CommandManager_1.ExtensionCommands.STAGE_WORKFLOW_FILES);
            // Assert
            assert.ok(showErrorMessageStub.calledWith('Git integration not available or no workspace folder found.'));
            // Cleanup
            showErrorMessageStub.restore();
        });
        test('should handle command execution errors', async () => {
            // Arrange
            const error = new Error('Git command failed');
            const showErrorMessageStub = sinon.stub(vscode.window, 'showErrorMessage').resolves('Show Details');
            gitIntegrationStub.detectRepositoryStatus.rejects(error);
            // Act
            await vscode.commands.executeCommand(CommandManager_1.ExtensionCommands.COMMIT_WORKFLOW_CHANGES);
            // Assert
            assert.ok(showErrorMessageStub.calledWith('Commit Workflow Changes failed: Git command failed'));
            // Cleanup
            showErrorMessageStub.restore();
        });
    });
});
//# sourceMappingURL=GitIntegrationCommands.unit.test.js.map