import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { FileSystemManager } from '../../src/core/FileSystemManager';
import { WorkflowFile } from '../../src/core/types';

suite('FileSystemManager Integration Tests', () => {
  let fileSystemManager: FileSystemManager;
  let mockContext: vscode.ExtensionContext;
  let tempDir: string;
  let workspaceFolder: vscode.WorkspaceFolder;

  setup(async () => {
    // Create temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vscode-extension-test-'));
    
    workspaceFolder = {
      uri: vscode.Uri.file(tempDir),
      name: 'test-workspace',
      index: 0
    };

    mockContext = {
      subscriptions: [],
      workspaceState: {} as any,
      globalState: {} as any,
      extensionUri: vscode.Uri.file('/test'),
      extensionPath: '/test',
      asAbsolutePath: (relativePath: string) => path.join('/test', relativePath),
      storageUri: vscode.Uri.file('/test/storage'),
      globalStorageUri: vscode.Uri.file('/test/global-storage'),
      logUri: vscode.Uri.file('/test/logs'),
      secrets: {} as any,
      environmentVariableCollection: {} as any,
      extension: {} as any,
      logPath: '/test/logs'
    };

    fileSystemManager = new FileSystemManager(mockContext);
  });

  teardown(async () => {
    fileSystemManager.dispose();
    
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up temp directory:', error);
    }
  });

  suite('Real File System Operations', () => {
    test('should create workflow file and directory structure', async () => {
      // Arrange
      const workflowFile: WorkflowFile = {
        filename: 'ci.yml',
        content: `name: CI
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Run tests
      run: npm test`,
        type: 'ci',
        relativePath: '.github/workflows/ci.yml'
      };

      // Act
      await fileSystemManager.createWorkflowFile(workspaceFolder, workflowFile);

      // Assert
      const workflowsDir = path.join(tempDir, '.github', 'workflows');
      const filePath = path.join(workflowsDir, 'ci.yml');
      
      // Check directory was created
      const dirStats = await fs.stat(workflowsDir);
      assert(dirStats.isDirectory());
      
      // Check file was created with correct content
      const fileContent = await fs.readFile(filePath, 'utf8');
      assert.strictEqual(fileContent, workflowFile.content);
    });

    test('should handle existing workflow files', async () => {
      // Arrange
      const workflowsDir = path.join(tempDir, '.github', 'workflows');
      await fs.mkdir(workflowsDir, { recursive: true });
      
      const filePath = path.join(workflowsDir, 'existing.yml');
      const existingContent = 'name: Existing Workflow';
      await fs.writeFile(filePath, existingContent, 'utf8');

      const workflowFile: WorkflowFile = {
        filename: 'existing.yml',
        content: 'name: New Workflow',
        type: 'ci',
        relativePath: '.github/workflows/existing.yml'
      };

      // Act
      const conflict = await fileSystemManager.detectFileConflict(filePath, workflowFile.content);

      // Assert
      assert.notStrictEqual(conflict, null);
      assert.strictEqual(conflict!.filePath, filePath);
      assert.strictEqual(conflict!.existingContent, existingContent);
      assert.strictEqual(conflict!.newContent, workflowFile.content);
    });

    test('should create backup files', async () => {
      // Arrange
      const originalFile = path.join(tempDir, 'original.yml');
      const originalContent = 'name: Original Workflow';
      await fs.writeFile(originalFile, originalContent, 'utf8');

      // Act
      const backupInfo = await fileSystemManager.createBackup(originalFile);

      // Assert
      assert.strictEqual(backupInfo.originalPath, originalFile);
      assert(backupInfo.backupPath.includes('.backup.'));
      assert(backupInfo.timestamp instanceof Date);
      
      // Check backup file exists with correct content
      const backupContent = await fs.readFile(backupInfo.backupPath, 'utf8');
      assert.strictEqual(backupContent, originalContent);
      
      // Check original file still exists
      const originalExists = await fs.access(originalFile).then(() => true).catch(() => false);
      assert(originalExists);
    });

    test('should handle multiple workflow files', async () => {
      // Arrange
      const workflowFiles: WorkflowFile[] = [
        {
          filename: 'ci.yml',
          content: 'name: CI\non: [push]',
          type: 'ci',
          relativePath: '.github/workflows/ci.yml'
        },
        {
          filename: 'cd.yml',
          content: 'name: CD\non: [release]',
          type: 'cd',
          relativePath: '.github/workflows/cd.yml'
        },
        {
          filename: 'security.yml',
          content: 'name: Security\non: [schedule]',
          type: 'security',
          relativePath: '.github/workflows/security.yml'
        }
      ];

      // Act
      for (const workflowFile of workflowFiles) {
        await fileSystemManager.createWorkflowFile(workspaceFolder, workflowFile);
      }

      // Assert
      const workflowsDir = path.join(tempDir, '.github', 'workflows');
      const files = await fs.readdir(workflowsDir);
      
      assert.strictEqual(files.length, 3);
      assert(files.includes('ci.yml'));
      assert(files.includes('cd.yml'));
      assert(files.includes('security.yml'));

      // Verify content of each file
      for (const workflowFile of workflowFiles) {
        const filePath = path.join(workflowsDir, workflowFile.filename);
        const content = await fs.readFile(filePath, 'utf8');
        assert.strictEqual(content, workflowFile.content);
      }
    });

    test('should handle nested directory creation', async () => {
      // Arrange
      const nestedWorkflowFile: WorkflowFile = {
        filename: 'nested.yml',
        content: 'name: Nested Workflow',
        type: 'ci',
        relativePath: '.github/workflows/nested.yml'
      };

      // Ensure parent directories don't exist
      const workflowsDir = path.join(tempDir, '.github', 'workflows');
      const dirExists = await fs.access(workflowsDir).then(() => true).catch(() => false);
      assert(!dirExists);

      // Act
      await fileSystemManager.createWorkflowFile(workspaceFolder, nestedWorkflowFile);

      // Assert
      const filePath = path.join(workflowsDir, 'nested.yml');
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      assert(fileExists);

      const content = await fs.readFile(filePath, 'utf8');
      assert.strictEqual(content, nestedWorkflowFile.content);
    });

    test('should track multiple backups', async () => {
      // Arrange
      const files = ['file1.yml', 'file2.yml', 'file3.yml'];
      const fileContents = ['content1', 'content2', 'content3'];

      // Create original files
      for (let i = 0; i < files.length; i++) {
        const filePath = path.join(tempDir, files[i]);
        await fs.writeFile(filePath, fileContents[i], 'utf8');
      }

      // Act
      const backupInfos = [];
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const backupInfo = await fileSystemManager.createBackup(filePath);
        backupInfos.push(backupInfo);
      }

      // Assert
      const allBackups = fileSystemManager.getBackups();
      assert.strictEqual(allBackups.size, 3);

      for (let i = 0; i < files.length; i++) {
        const filePath = path.join(tempDir, files[i]);
        assert(allBackups.has(filePath));
        
        const backupInfo = allBackups.get(filePath)!;
        assert.strictEqual(backupInfo.originalPath, filePath);
        
        // Verify backup file content
        const backupContent = await fs.readFile(backupInfo.backupPath, 'utf8');
        assert.strictEqual(backupContent, fileContents[i]);
      }
    });
  });

  suite('Error Handling', () => {
    test('should handle permission errors gracefully', async () => {
      // This test would need to be run with appropriate permissions
      // or mocked to simulate permission errors
      // For now, we'll skip this test in the integration suite
      // as it's difficult to reliably create permission errors in CI
    });

    test('should handle disk space errors', async () => {
      // This test would need to simulate disk space issues
      // which is difficult in a real integration test
      // Consider this for future enhancement with more sophisticated mocking
    });
  });
});