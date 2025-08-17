import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { GitIntegration, GitError, GitRepositoryStatus, StagingSuggestion, MergeConflict } from '../../src/core/GitIntegration';
import { ProcessExecutor } from '../../src/core/ProcessExecutor';
import { ProcessExecutionResult } from '../../src/core/types';

suite('GitIntegration Unit Tests', () => {
  let gitIntegration: GitIntegration;
  let mockContext: vscode.ExtensionContext;
  let processExecutorStub: sinon.SinonStubbedInstance<ProcessExecutor>;
  let workspaceFolder: vscode.WorkspaceFolder;

  setup(() => {
    // Create mock context
    mockContext = {
      subscriptions: [],
      workspaceState: {} as vscode.Memento,
      globalState: {} as vscode.Memento,
      extensionPath: '/test/path',
      storagePath: '/test/storage',
      globalStoragePath: '/test/global-storage',
      logPath: '/test/log'
    } as vscode.ExtensionContext;

    // Create mock workspace folder
    workspaceFolder = {
      uri: vscode.Uri.file('/test/workspace'),
      name: 'test-workspace',
      index: 0
    };

    // Create GitIntegration instance
    gitIntegration = new GitIntegration(mockContext);

    // Stub ProcessExecutor
    processExecutorStub = sinon.createStubInstance(ProcessExecutor);
    (gitIntegration as any).processExecutor = processExecutorStub;
  });

  teardown(() => {
    sinon.restore();
    gitIntegration.dispose();
  });

  suite('Initialization', () => {
    test('should initialize successfully when Git is available', async () => {
      // Arrange
      processExecutorStub.executeCommand.resolves({
        success: true,
        stdout: 'git version 2.34.1',
        stderr: '',
        exitCode: 0,
        signal: undefined,
        executionTime: 100,
        timedOut: false
      });

      // Act & Assert
      await assert.doesNotReject(async () => {
        await gitIntegration.initialize();
      });
    });

    test('should throw GitError when Git is not available', async () => {
      // Arrange
      processExecutorStub.executeCommand.rejects(new Error('Command not found'));

      // Act & Assert
      await assert.rejects(async () => {
        await gitIntegration.initialize();
      }, GitError);
    });

    test('should throw GitError when Git version check fails', async () => {
      // Arrange
      processExecutorStub.executeCommand.resolves({
        success: false,
        stdout: '',
        stderr: 'git: command not found',
        exitCode: 127,
        signal: undefined,
        executionTime: 100,
        timedOut: false
      });

      // Act & Assert
      await assert.rejects(async () => {
        await gitIntegration.initialize();
      }, GitError);
    });
  });

  suite('Repository Status Detection', () => {
    test('should detect non-Git repository correctly', async () => {
      // Arrange
      processExecutorStub.execute.resolves({
        success: false,
        stdout: '',
        stderr: 'fatal: not a git repository',
        exitCode: 128,
        signal: undefined,
        executionTime: 100,
        timedOut: false
      });

      // Act
      const status = await gitIntegration.detectRepositoryStatus(workspaceFolder);

      // Assert
      assert.strictEqual(status.isRepository, false);
      assert.strictEqual(status.currentBranch, '');
      assert.strictEqual(status.hasUncommittedChanges, false);
      assert.strictEqual(status.stagedFiles.length, 0);
      assert.strictEqual(status.unstagedFiles.length, 0);
      assert.strictEqual(status.untrackedFiles.length, 0);
    });

    test('should detect Git repository with clean status', async () => {
      // Arrange
      processExecutorStub.executeCommand
        .onFirstCall().resolves({
          success: true,
          stdout: 'true',
          stderr: '',
          exitCode: 0,
          signal: undefined,
          executionTime: 100,
          timedOut: false
        })
        .onSecondCall().resolves({
          success: true,
          stdout: 'main',
          stderr: '',
          exitCode: 0,
          signal: undefined,
          executionTime: 100,
          timedOut: false
        })
        .onThirdCall().resolves({
          success: true,
          stdout: '',
          stderr: '',
          exitCode: 0,
          signal: undefined,
          executionTime: 100,
          timedOut: false
        })
        .onCall(3).resolves({
          success: true,
          stdout: 'main\nfeature/test',
          stderr: '',
          exitCode: 0,
          signal: undefined,
          executionTime: 100,
          timedOut: false
        })
        .onCall(4).resolves({
          success: true,
          stdout: 'origin/main\norigin/develop',
          stderr: '',
          exitCode: 0,
          signal: undefined,
          executionTime: 100,
          timedOut: false
        });

      // Act
      const status = await gitIntegration.detectRepositoryStatus(workspaceFolder);

      // Assert
      assert.strictEqual(status.isRepository, true);
      assert.strictEqual(status.currentBranch, 'main');
      assert.strictEqual(status.hasUncommittedChanges, false);
      assert.strictEqual(status.stagedFiles.length, 0);
      assert.strictEqual(status.unstagedFiles.length, 0);
      assert.strictEqual(status.untrackedFiles.length, 0);
      assert.deepStrictEqual(status.localBranches, ['main', 'feature/test']);
      assert.deepStrictEqual(status.remoteBranches, ['origin/main', 'origin/develop']);
    });

    test('should detect repository with uncommitted changes', async () => {
      // Arrange
      const gitStatusOutput = `M  README.md
A  .github/workflows/ci.yml
?? new-file.txt
UU conflicted.txt`;

      processExecutorStub.execute
        .onFirstCall().resolves({
          success: true,
          stdout: 'true',
          stderr: '',
          exitCode: 0,
          signal: undefined,
          executionTime: 100,
          timedOut: false
        })
        .onSecondCall().resolves({
          success: true,
          stdout: 'feature/test',
          stderr: '',
          exitCode: 0,
          signal: undefined,
          executionTime: 100,
          timedOut: false
        })
        .onThirdCall().resolves({
          success: true,
          stdout: gitStatusOutput,
          stderr: '',
          exitCode: 0,
          signal: undefined,
          executionTime: 100,
          timedOut: false
        })
        .onCall(3).resolves({
          success: true,
          stdout: 'feature/test',
          stderr: '',
          exitCode: 0,
          signal: undefined,
          executionTime: 100,
          timedOut: false
        })
        .onCall(4).resolves({
          success: true,
          stdout: 'origin/main',
          stderr: '',
          exitCode: 0,
          signal: undefined,
          executionTime: 100,
          timedOut: false
        });

      // Act
      const status = await gitIntegration.detectRepositoryStatus(workspaceFolder);

      // Assert
      assert.strictEqual(status.isRepository, true);
      assert.strictEqual(status.currentBranch, 'feature/test');
      assert.strictEqual(status.hasUncommittedChanges, true);
      assert.deepStrictEqual(status.stagedFiles, ['.github/workflows/ci.yml']);
      assert.deepStrictEqual(status.unstagedFiles, ['README.md']);
      assert.deepStrictEqual(status.untrackedFiles, ['new-file.txt']);
      assert.deepStrictEqual(status.conflictedFiles, ['conflicted.txt']);
    });
  });

  suite('Staging Suggestions', () => {
    test('should generate staging suggestions for workflow files', async () => {
      // Arrange
      const mockStatus: GitRepositoryStatus = {
        isRepository: true,
        currentBranch: 'main',
        hasUncommittedChanges: true,
        stagedFiles: [],
        unstagedFiles: ['.github/workflows/ci.yml', 'README.md'],
        untrackedFiles: ['.github/workflows/deploy.yml'],
        conflictedFiles: [],
        remoteBranches: [],
        localBranches: []
      };

      sinon.stub(gitIntegration, 'detectRepositoryStatus').resolves(mockStatus);

      const workflowFiles = [
        '/test/workspace/.github/workflows/ci.yml',
        '/test/workspace/.github/workflows/deploy.yml'
      ];

      // Act
      const suggestions = await gitIntegration.generateStagingSuggestions(workspaceFolder, workflowFiles);

      // Assert
      assert.strictEqual(suggestions.length, 3);
      
      const ciSuggestion = suggestions.find(s => s.filePath === '.github/workflows/ci.yml');
      assert.ok(ciSuggestion);
      assert.strictEqual(ciSuggestion.action, 'stage');
      assert.strictEqual(ciSuggestion.priority, 'high');

      const deploySuggestion = suggestions.find(s => s.filePath === '.github/workflows/deploy.yml');
      assert.ok(deploySuggestion);
      assert.strictEqual(deploySuggestion.action, 'stage');
      assert.strictEqual(deploySuggestion.priority, 'high');

      const readmeSuggestion = suggestions.find(s => s.filePath === 'README.md');
      assert.ok(readmeSuggestion);
      assert.strictEqual(readmeSuggestion.action, 'stage');
      assert.strictEqual(readmeSuggestion.priority, 'medium');
    });

    test('should return empty suggestions for non-Git repository', async () => {
      // Arrange
      const mockStatus: GitRepositoryStatus = {
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

      sinon.stub(gitIntegration, 'detectRepositoryStatus').resolves(mockStatus);

      // Act
      const suggestions = await gitIntegration.generateStagingSuggestions(workspaceFolder, []);

      // Assert
      assert.strictEqual(suggestions.length, 0);
    });
  });

  suite('Commit Message Generation', () => {
    test('should generate commit message for single workflow', () => {
      // Arrange
      const workflowFiles = ['.github/workflows/ci.yml'];

      // Act
      const message = gitIntegration.generateCommitMessage(workflowFiles);

      // Assert
      assert.strictEqual(message, 'Add ci workflow');
    });

    test('should generate commit message for multiple workflows', () => {
      // Arrange
      const workflowFiles = [
        '.github/workflows/ci.yml',
        '.github/workflows/deploy.yml',
        '.github/workflows/release.yml'
      ];

      // Act
      const message = gitIntegration.generateCommitMessage(workflowFiles);

      // Assert
      assert.strictEqual(message, 'Add 3 CI/CD workflows');
    });

    test('should generate commit message with detected frameworks', () => {
      // Arrange
      const workflowFiles = [
        '.github/workflows/ci.yml',
        '.github/workflows/deploy.yml'
      ];
      const detectedFrameworks = ['Node.js', 'React', 'TypeScript'];

      // Act
      const message = gitIntegration.generateCommitMessage(workflowFiles, detectedFrameworks);

      // Assert
      assert.strictEqual(message, 'Add 2 CI/CD workflows for Node.js, React, TypeScript');
    });

    test('should generate update commit message', () => {
      // Arrange
      const workflowFiles = ['.github/workflows/ci.yml'];

      // Act
      const message = gitIntegration.generateCommitMessage(workflowFiles, [], true);

      // Assert
      assert.strictEqual(message, 'Update ci workflow');
    });

    test('should handle many frameworks with truncation', () => {
      // Arrange
      const workflowFiles = ['.github/workflows/ci.yml'];
      const detectedFrameworks = ['Node.js', 'React', 'TypeScript', 'Express', 'Jest', 'Webpack'];

      // Act
      const message = gitIntegration.generateCommitMessage(workflowFiles, detectedFrameworks);

      // Assert
      assert.strictEqual(message, 'Add ci workflow for Node.js, React, TypeScript and 3 more');
    });
  });

  suite('File Staging', () => {
    test('should stage files successfully', async () => {
      // Arrange
      const filePaths = ['.github/workflows/ci.yml', 'README.md'];
      
      processExecutorStub.execute.resolves({
        success: true,
        stdout: '',
        stderr: '',
        exitCode: 0,
        signal: undefined,
        executionTime: 100,
        timedOut: false
      });

      sinon.stub(gitIntegration, 'detectRepositoryStatus').resolves({} as GitRepositoryStatus);
      const showInformationMessageStub = sinon.stub(vscode.window, 'showInformationMessage');

      // Act
      await gitIntegration.stageFiles(workspaceFolder, filePaths);

      // Assert
      assert.strictEqual(processExecutorStub.execute.callCount, 2);
      assert.ok(showInformationMessageStub.calledWith('Staged 2 file(s) for commit'));
    });

    test('should throw GitError when staging fails', async () => {
      // Arrange
      const filePaths = ['.github/workflows/ci.yml'];
      
      processExecutorStub.execute.resolves({
        success: false,
        stdout: '',
        stderr: 'fatal: pathspec does not match any files',
        exitCode: 128,
        signal: undefined,
        executionTime: 100,
        timedOut: false
      });

      // Act & Assert
      await assert.rejects(async () => {
        await gitIntegration.stageFiles(workspaceFolder, filePaths);
      }, GitError);
    });
  });

  suite('Branch Creation', () => {
    test('should create workflow branch successfully', async () => {
      // Arrange
      processExecutorStub.execute.resolves({
        success: true,
        stdout: 'Switched to a new branch \'feature/update-workflows-2024-01-15T10\'',
        stderr: '',
        exitCode: 0,
        signal: undefined,
        executionTime: 100,
        timedOut: false
      });

      const showInformationMessageStub = sinon.stub(vscode.window, 'showInformationMessage');

      // Act
      const branchName = await gitIntegration.createWorkflowBranch(workspaceFolder);

      // Assert
      assert.ok(branchName.startsWith('feature/update-workflows-'));
      assert.ok(showInformationMessageStub.calledWith(sinon.match(/Created and switched to branch:/)));
    });

    test('should create branch from specified base branch', async () => {
      // Arrange
      processExecutorStub.execute.resolves({
        success: true,
        stdout: 'Switched to a new branch',
        stderr: '',
        exitCode: 0,
        signal: undefined,
        executionTime: 100,
        timedOut: false
      });

      sinon.stub(vscode.window, 'showInformationMessage');

      // Act
      await gitIntegration.createWorkflowBranch(workspaceFolder, 'develop');

      // Assert
      const call = processExecutorStub.execute.getCall(0);
      assert.ok(call.args[0].args.includes('develop'));
    });

    test('should throw GitError when branch creation fails', async () => {
      // Arrange
      processExecutorStub.execute.resolves({
        success: false,
        stdout: '',
        stderr: 'fatal: A branch named \'feature/test\' already exists.',
        exitCode: 128,
        signal: undefined,
        executionTime: 100,
        timedOut: false
      });

      // Act & Assert
      await assert.rejects(async () => {
        await gitIntegration.createWorkflowBranch(workspaceFolder);
      }, GitError);
    });
  });

  suite('Merge Conflict Detection', () => {
    test('should detect merge conflicts in workflow files', async () => {
      // Arrange
      const mockStatus: GitRepositoryStatus = {
        isRepository: true,
        currentBranch: 'feature/test',
        hasUncommittedChanges: true,
        stagedFiles: [],
        unstagedFiles: [],
        untrackedFiles: [],
        conflictedFiles: ['.github/workflows/ci.yml'],
        remoteBranches: [],
        localBranches: []
      };

      sinon.stub(gitIntegration, 'detectRepositoryStatus').resolves(mockStatus);

      const conflictContent = `name: CI
on: [push]
jobs:
  test:
<<<<<<< HEAD
    runs-on: ubuntu-20.04
=======
    runs-on: ubuntu-22.04
>>>>>>> feature/update
    steps:
      - uses: actions/checkout@v3`;

      const readFileStub = sinon.stub(vscode.workspace.fs, 'readFile');
      readFileStub.resolves(Buffer.from(conflictContent, 'utf8'));

      // Act
      const conflicts = await gitIntegration.detectMergeConflicts(workspaceFolder);

      // Assert
      assert.strictEqual(conflicts.length, 1);
      assert.strictEqual(conflicts[0].filePath, '.github/workflows/ci.yml');
      assert.strictEqual(conflicts[0].conflictType, 'content');
    });

    test('should return empty array for repository without conflicts', async () => {
      // Arrange
      const mockStatus: GitRepositoryStatus = {
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

      sinon.stub(gitIntegration, 'detectRepositoryStatus').resolves(mockStatus);

      // Act
      const conflicts = await gitIntegration.detectMergeConflicts(workspaceFolder);

      // Assert
      assert.strictEqual(conflicts.length, 0);
    });

    test('should return empty array for non-Git repository', async () => {
      // Arrange
      const mockStatus: GitRepositoryStatus = {
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

      sinon.stub(gitIntegration, 'detectRepositoryStatus').resolves(mockStatus);

      // Act
      const conflicts = await gitIntegration.detectMergeConflicts(workspaceFolder);

      // Assert
      assert.strictEqual(conflicts.length, 0);
    });
  });

  suite('Cache Management', () => {
    test('should cache repository status', async () => {
      // Arrange
      processExecutorStub.execute
        .onFirstCall().resolves({
          success: true,
          stdout: 'true',
          stderr: '',
          exitCode: 0,
          signal: undefined,
          executionTime: 100,
          timedOut: false
        })
        .onSecondCall().resolves({
          success: true,
          stdout: 'main',
          stderr: '',
          exitCode: 0,
          signal: undefined,
          executionTime: 100,
          timedOut: false
        })
        .onThirdCall().resolves({
          success: true,
          stdout: '',
          stderr: '',
          exitCode: 0,
          signal: undefined,
          executionTime: 100,
          timedOut: false
        })
        .onCall(3).resolves({
          success: true,
          stdout: 'main',
          stderr: '',
          exitCode: 0,
          signal: undefined,
          executionTime: 100,
          timedOut: false
        })
        .onCall(4).resolves({
          success: true,
          stdout: '',
          stderr: '',
          exitCode: 0,
          signal: undefined,
          executionTime: 100,
          timedOut: false
        });

      // Act
      await gitIntegration.detectRepositoryStatus(workspaceFolder);
      const cachedStatus = gitIntegration.getCachedRepositoryStatus(workspaceFolder);

      // Assert
      assert.ok(cachedStatus);
      assert.strictEqual(cachedStatus.isRepository, true);
      assert.strictEqual(cachedStatus.currentBranch, 'main');
    });

    test('should clear cache', async () => {
      // Arrange
      processExecutorStub.execute.resolves({
        success: true,
        stdout: 'true',
        stderr: '',
        exitCode: 0,
        signal: undefined,
        executionTime: 100,
        timedOut: false
      });

      await gitIntegration.detectRepositoryStatus(workspaceFolder);
      assert.ok(gitIntegration.getCachedRepositoryStatus(workspaceFolder));

      // Act
      gitIntegration.clearCache();

      // Assert
      assert.strictEqual(gitIntegration.getCachedRepositoryStatus(workspaceFolder), undefined);
    });
  });

  suite('Error Handling', () => {
    test('should handle Git command execution errors', async () => {
      // Arrange
      processExecutorStub.execute.rejects(new Error('Command execution failed'));

      // Act & Assert
      await assert.rejects(async () => {
        await gitIntegration.detectRepositoryStatus(workspaceFolder);
      }, GitError);
    });

    test('should handle Git command timeout', async () => {
      // Arrange
      processExecutorStub.execute.resolves({
        success: false,
        stdout: '',
        stderr: '',
        exitCode: 0,
        signal: 'SIGTERM',
        executionTime: 5000,
        timedOut: true
      });

      // Act & Assert
      await assert.rejects(async () => {
        await gitIntegration.detectRepositoryStatus(workspaceFolder);
      }, GitError);
    });
  });
});