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
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const sinon = __importStar(require("sinon"));
const FileSystemManager_1 = require("../../src/core/FileSystemManager");
suite('FileSystemManager Unit Tests', () => {
    let fileSystemManager;
    let mockContext;
    let sandbox;
    setup(() => {
        sandbox = sinon.createSandbox();
        mockContext = {
            subscriptions: [],
            workspaceState: {},
            globalState: {},
            extensionUri: vscode.Uri.file('/test'),
            extensionPath: '/test',
            asAbsolutePath: (relativePath) => path.join('/test', relativePath),
            storageUri: vscode.Uri.file('/test/storage'),
            globalStorageUri: vscode.Uri.file('/test/global-storage'),
            logUri: vscode.Uri.file('/test/logs'),
            secrets: {},
            environmentVariableCollection: {},
            extension: {},
            logPath: '/test/logs'
        };
        fileSystemManager = new FileSystemManager_1.FileSystemManager(mockContext);
    });
    teardown(() => {
        sandbox.restore();
        fileSystemManager.dispose();
    });
    suite('createWorkflowFile', () => {
        test('should create workflow file successfully', async () => {
            // Arrange
            const workspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };
            const workflowFile = {
                filename: 'ci.yml',
                content: 'name: CI\non: [push]',
                type: 'ci',
                relativePath: '.github/workflows/ci.yml'
            };
            // Mock file system operations
            sandbox.stub(fs, 'access').resolves();
            sandbox.stub(fs, 'writeFile').resolves();
            sandbox.stub(vscode.window, 'showInformationMessage');
            // Act
            await fileSystemManager.createWorkflowFile(workspaceFolder, workflowFile);
            // Assert
            assert(fs.writeFile.calledOnce);
            assert(vscode.window.showInformationMessage.calledWith('Workflow file created: ci.yml'));
        });
        test('should create directory if it does not exist', async () => {
            // Arrange
            const workspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };
            const workflowFile = {
                filename: 'ci.yml',
                content: 'name: CI\non: [push]',
                type: 'ci',
                relativePath: '.github/workflows/ci.yml'
            };
            // Mock directory doesn't exist
            const accessStub = sandbox.stub(fs, 'access');
            accessStub.rejects({ code: 'ENOENT' });
            const mkdirStub = sandbox.stub(fs, 'mkdir').resolves();
            sandbox.stub(fs, 'writeFile').resolves();
            sandbox.stub(vscode.window, 'showInformationMessage');
            // Act
            await fileSystemManager.createWorkflowFile(workspaceFolder, workflowFile);
            // Assert
            assert(mkdirStub.calledOnce);
            assert(mkdirStub.calledWith(path.join('/test/workspace', '.github', 'workflows'), { recursive: true }));
        });
        test('should handle file conflicts', async () => {
            // Arrange
            const workspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };
            const workflowFile = {
                filename: 'ci.yml',
                content: 'name: CI\non: [push]',
                type: 'ci',
                relativePath: '.github/workflows/ci.yml'
            };
            // Mock file exists with different content
            sandbox.stub(fs, 'access').resolves();
            sandbox.stub(fs, 'readFile').resolves('existing content');
            sandbox.stub(vscode.window, 'showWarningMessage').resolves('Overwrite');
            sandbox.stub(fs, 'writeFile').resolves();
            sandbox.stub(vscode.window, 'showInformationMessage');
            // Act
            await fileSystemManager.createWorkflowFile(workspaceFolder, workflowFile);
            // Assert
            assert(vscode.window.showWarningMessage.calledOnce);
            assert(fs.writeFile.calledOnce);
        });
        test('should throw error when user cancels conflict resolution', async () => {
            // Arrange
            const workspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };
            const workflowFile = {
                filename: 'ci.yml',
                content: 'name: CI\non: [push]',
                type: 'ci',
                relativePath: '.github/workflows/ci.yml'
            };
            // Mock file exists and user cancels
            sandbox.stub(fs, 'access').resolves();
            sandbox.stub(fs, 'readFile').resolves('existing content');
            sandbox.stub(vscode.window, 'showWarningMessage').resolves('Cancel');
            // Act & Assert
            await assert.rejects(() => fileSystemManager.createWorkflowFile(workspaceFolder, workflowFile), FileSystemManager_1.FileSystemError);
        });
    });
    suite('detectFileConflict', () => {
        test('should return null when file does not exist', async () => {
            // Arrange
            const filePath = '/test/workflow.yml';
            const newContent = 'name: CI';
            sandbox.stub(fs, 'readFile').rejects({ code: 'ENOENT' });
            // Act
            const result = await fileSystemManager.detectFileConflict(filePath, newContent);
            // Assert
            assert.strictEqual(result, null);
        });
        test('should return null when content is identical', async () => {
            // Arrange
            const filePath = '/test/workflow.yml';
            const content = 'name: CI';
            sandbox.stub(fs, 'readFile').resolves(content);
            // Act
            const result = await fileSystemManager.detectFileConflict(filePath, content);
            // Assert
            assert.strictEqual(result, null);
        });
        test('should return conflict when content differs', async () => {
            // Arrange
            const filePath = '/test/workflow.yml';
            const existingContent = 'name: Old CI';
            const newContent = 'name: New CI';
            sandbox.stub(fs, 'readFile').resolves(existingContent);
            // Act
            const result = await fileSystemManager.detectFileConflict(filePath, newContent);
            // Assert
            assert.notStrictEqual(result, null);
            assert.strictEqual(result.filePath, filePath);
            assert.strictEqual(result.existingContent, existingContent);
            assert.strictEqual(result.newContent, newContent);
            assert.strictEqual(result.conflictType, 'overwrite');
        });
    });
    suite('createBackup', () => {
        test('should create backup successfully', async () => {
            // Arrange
            const filePath = '/test/workflow.yml';
            sandbox.stub(fs, 'copyFile').resolves();
            sandbox.stub(vscode.window, 'showInformationMessage');
            // Act
            const result = await fileSystemManager.createBackup(filePath);
            // Assert
            assert.strictEqual(result.originalPath, filePath);
            assert(result.backupPath.includes('.backup.'));
            assert(result.timestamp instanceof Date);
            assert(fs.copyFile.calledOnce);
            assert(vscode.window.showInformationMessage.calledOnce);
        });
        test('should throw error when backup fails', async () => {
            // Arrange
            const filePath = '/test/workflow.yml';
            sandbox.stub(fs, 'copyFile').rejects(new Error('Permission denied'));
            // Act & Assert
            await assert.rejects(() => fileSystemManager.createBackup(filePath), FileSystemManager_1.FileSystemError);
        });
    });
    suite('setupFileWatchers', () => {
        test('should create file watchers for README and workflows', () => {
            // Arrange
            const workspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };
            const mockWatcher = {
                onDidCreate: sandbox.stub(),
                onDidChange: sandbox.stub(),
                onDidDelete: sandbox.stub(),
                dispose: sandbox.stub()
            };
            sandbox.stub(vscode.workspace, 'createFileSystemWatcher').returns(mockWatcher);
            // Act
            fileSystemManager.setupFileWatchers(workspaceFolder);
            // Assert
            assert(vscode.workspace.createFileSystemWatcher.calledTwice);
            assert(mockWatcher.onDidCreate.calledTwice);
            assert(mockWatcher.onDidChange.calledTwice);
            assert(mockWatcher.onDidDelete.calledTwice);
        });
    });
    suite('getBackups', () => {
        test('should return empty map initially', () => {
            // Act
            const backups = fileSystemManager.getBackups();
            // Assert
            assert.strictEqual(backups.size, 0);
        });
        test('should return backups after creating them', async () => {
            // Arrange
            const filePath = '/test/workflow.yml';
            sandbox.stub(fs, 'copyFile').resolves();
            sandbox.stub(vscode.window, 'showInformationMessage');
            // Act
            await fileSystemManager.createBackup(filePath);
            const backups = fileSystemManager.getBackups();
            // Assert
            assert.strictEqual(backups.size, 1);
            assert(backups.has(filePath));
        });
    });
    suite('dispose', () => {
        test('should clean up watchers and backups', () => {
            // Arrange
            const mockWatcher = {
                onDidCreate: sandbox.stub(),
                onDidChange: sandbox.stub(),
                onDidDelete: sandbox.stub(),
                dispose: sandbox.stub()
            };
            sandbox.stub(vscode.workspace, 'createFileSystemWatcher').returns(mockWatcher);
            const workspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };
            fileSystemManager.setupFileWatchers(workspaceFolder);
            // Act
            fileSystemManager.dispose();
            // Assert
            assert(mockWatcher.dispose.calledTwice);
            assert.strictEqual(fileSystemManager.getBackups().size, 0);
        });
    });
});
//# sourceMappingURL=FileSystemManager.unit.test.js.map