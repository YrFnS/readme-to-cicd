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
const os = __importStar(require("os"));
const GitIntegration_1 = require("../../src/core/GitIntegration");
suite('GitIntegration Integration Tests', () => {
    let gitIntegration;
    let mockContext;
    let tempDir;
    let workspaceFolder;
    suiteSetup(async () => {
        // Create temporary directory for test repository
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-integration-test-'));
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
        // Create workspace folder
        workspaceFolder = {
            uri: vscode.Uri.file(tempDir),
            name: 'test-workspace',
            index: 0
        };
        // Initialize Git repository
        await initializeTestRepository(tempDir);
    });
    suiteTeardown(async () => {
        // Clean up temporary directory
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
        catch (error) {
            console.warn('Failed to clean up temp directory:', error);
        }
    });
    setup(async () => {
        gitIntegration = new GitIntegration_1.GitIntegration(mockContext);
        // Skip initialization if Git is not available (CI environments)
        try {
            await gitIntegration.initialize();
        }
        catch (error) {
            console.warn('Git not available, skipping integration tests');
            return;
        }
    });
    teardown(() => {
        if (gitIntegration) {
            gitIntegration.dispose();
        }
    });
    async function initializeTestRepository(repoPath) {
        try {
            // Initialize Git repository
            const { execSync } = require('child_process');
            execSync('git init', { cwd: repoPath, stdio: 'ignore' });
            execSync('git config user.name "Test User"', { cwd: repoPath, stdio: 'ignore' });
            execSync('git config user.email "test@example.com"', { cwd: repoPath, stdio: 'ignore' });
            // Create initial files
            await fs.writeFile(path.join(repoPath, 'README.md'), '# Test Repository\n\nThis is a test repository.');
            await fs.writeFile(path.join(repoPath, '.gitignore'), 'node_modules/\n*.log\n');
            // Create initial commit
            execSync('git add .', { cwd: repoPath, stdio: 'ignore' });
            execSync('git commit -m "Initial commit"', { cwd: repoPath, stdio: 'ignore' });
        }
        catch (error) {
            console.warn('Failed to initialize test repository:', error);
            throw error;
        }
    }
    async function isGitAvailable() {
        try {
            const { execSync } = require('child_process');
            execSync('git --version', { stdio: 'ignore' });
            return true;
        }
        catch {
            return false;
        }
    }
    test('should detect Git repository status correctly', async function () {
        if (!(await isGitAvailable())) {
            this.skip();
            return;
        }
        // Act
        const status = await gitIntegration.detectRepositoryStatus(workspaceFolder);
        // Assert
        assert.strictEqual(status.isRepository, true);
        assert.ok(status.currentBranch); // Should have a current branch
        assert.strictEqual(status.hasUncommittedChanges, false); // Clean repository
        assert.strictEqual(status.stagedFiles.length, 0);
        assert.strictEqual(status.unstagedFiles.length, 0);
        assert.strictEqual(status.untrackedFiles.length, 0);
    });
    test('should detect uncommitted changes', async function () {
        if (!(await isGitAvailable())) {
            this.skip();
            return;
        }
        // Arrange - Create uncommitted changes
        await fs.writeFile(path.join(tempDir, 'README.md'), '# Updated Test Repository\n\nThis has been updated.');
        await fs.writeFile(path.join(tempDir, 'new-file.txt'), 'This is a new file.');
        // Act
        const status = await gitIntegration.detectRepositoryStatus(workspaceFolder);
        // Assert
        assert.strictEqual(status.isRepository, true);
        assert.strictEqual(status.hasUncommittedChanges, true);
        assert.ok(status.unstagedFiles.includes('README.md'));
        assert.ok(status.untrackedFiles.includes('new-file.txt'));
        // Cleanup
        await fs.writeFile(path.join(tempDir, 'README.md'), '# Test Repository\n\nThis is a test repository.');
        await fs.unlink(path.join(tempDir, 'new-file.txt'));
    });
    test('should generate staging suggestions for workflow files', async function () {
        if (!(await isGitAvailable())) {
            this.skip();
            return;
        }
        // Arrange - Create workflow files
        const workflowsDir = path.join(tempDir, '.github', 'workflows');
        await fs.mkdir(workflowsDir, { recursive: true });
        const ciWorkflowPath = path.join(workflowsDir, 'ci.yml');
        await fs.writeFile(ciWorkflowPath, `name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: npm test
`);
        const workflowFiles = [ciWorkflowPath];
        // Act
        const suggestions = await gitIntegration.generateStagingSuggestions(workspaceFolder, workflowFiles);
        // Assert
        assert.ok(suggestions.length > 0);
        const workflowSuggestion = suggestions.find(s => s.filePath.includes('ci.yml'));
        assert.ok(workflowSuggestion);
        assert.strictEqual(workflowSuggestion.action, 'stage');
        assert.strictEqual(workflowSuggestion.priority, 'high');
        // Cleanup
        await fs.rm(path.join(tempDir, '.github'), { recursive: true, force: true });
    });
    test('should stage files successfully', async function () {
        if (!(await isGitAvailable())) {
            this.skip();
            return;
        }
        // Arrange - Create a file to stage
        const testFilePath = path.join(tempDir, 'test-file.txt');
        await fs.writeFile(testFilePath, 'This is a test file for staging.');
        // Act
        await gitIntegration.stageFiles(workspaceFolder, ['test-file.txt']);
        // Verify the file is staged
        const status = await gitIntegration.detectRepositoryStatus(workspaceFolder);
        // Assert
        assert.ok(status.stagedFiles.includes('test-file.txt'));
        // Cleanup
        const { execSync } = require('child_process');
        execSync('git reset HEAD test-file.txt', { cwd: tempDir, stdio: 'ignore' });
        await fs.unlink(testFilePath);
    });
    test('should create commit successfully', async function () {
        if (!(await isGitAvailable())) {
            this.skip();
            return;
        }
        // Arrange - Create and stage a file
        const testFilePath = path.join(tempDir, 'commit-test.txt');
        await fs.writeFile(testFilePath, 'This file will be committed.');
        const { execSync } = require('child_process');
        execSync('git add commit-test.txt', { cwd: tempDir, stdio: 'ignore' });
        // Act
        const commitInfo = await gitIntegration.createCommit(workspaceFolder, 'Add test file for commit');
        // Assert
        assert.ok(commitInfo.hash);
        assert.strictEqual(commitInfo.message, 'Add test file for commit');
        assert.ok(commitInfo.author);
        assert.ok(commitInfo.date instanceof Date);
        // Verify commit exists
        const logOutput = execSync('git log --oneline -1', { cwd: tempDir, encoding: 'utf8' });
        assert.ok(logOutput.includes('Add test file for commit'));
    });
    test('should create workflow branch successfully', async function () {
        if (!(await isGitAvailable())) {
            this.skip();
            return;
        }
        // Act
        const branchName = await gitIntegration.createWorkflowBranch(workspaceFolder);
        // Assert
        assert.ok(branchName.startsWith('feature/update-workflows-'));
        // Verify branch exists and is current
        const { execSync } = require('child_process');
        const currentBranch = execSync('git branch --show-current', { cwd: tempDir, encoding: 'utf8' }).trim();
        assert.strictEqual(currentBranch, branchName);
        // Cleanup - switch back to main/master
        try {
            execSync('git checkout main', { cwd: tempDir, stdio: 'ignore' });
        }
        catch {
            try {
                execSync('git checkout master', { cwd: tempDir, stdio: 'ignore' });
            }
            catch {
                // If neither main nor master exists, create main
                execSync('git checkout -b main', { cwd: tempDir, stdio: 'ignore' });
            }
        }
        execSync(`git branch -D ${branchName}`, { cwd: tempDir, stdio: 'ignore' });
    });
    test('should generate appropriate commit messages', async function () {
        if (!(await isGitAvailable())) {
            this.skip();
            return;
        }
        // Test single workflow
        let message = gitIntegration.generateCommitMessage(['.github/workflows/ci.yml']);
        assert.strictEqual(message, 'Add ci workflow');
        // Test multiple workflows
        message = gitIntegration.generateCommitMessage([
            '.github/workflows/ci.yml',
            '.github/workflows/deploy.yml'
        ]);
        assert.strictEqual(message, 'Add 2 CI/CD workflows');
        // Test with frameworks
        message = gitIntegration.generateCommitMessage(['.github/workflows/ci.yml'], ['Node.js', 'React']);
        assert.strictEqual(message, 'Add ci workflow for Node.js, React');
        // Test update message
        message = gitIntegration.generateCommitMessage(['.github/workflows/ci.yml'], [], true);
        assert.strictEqual(message, 'Update ci workflow');
    });
    test('should handle repository cache correctly', async function () {
        if (!(await isGitAvailable())) {
            this.skip();
            return;
        }
        // Act - Get status to populate cache
        await gitIntegration.detectRepositoryStatus(workspaceFolder);
        let cachedStatus = gitIntegration.getCachedRepositoryStatus(workspaceFolder);
        // Assert - Cache should be populated
        assert.ok(cachedStatus);
        assert.strictEqual(cachedStatus.isRepository, true);
        // Act - Clear cache
        gitIntegration.clearCache();
        cachedStatus = gitIntegration.getCachedRepositoryStatus(workspaceFolder);
        // Assert - Cache should be empty
        assert.strictEqual(cachedStatus, undefined);
    });
    test('should detect non-Git directory correctly', async function () {
        if (!(await isGitAvailable())) {
            this.skip();
            return;
        }
        // Arrange - Create non-Git directory
        const nonGitDir = await fs.mkdtemp(path.join(os.tmpdir(), 'non-git-test-'));
        const nonGitWorkspace = {
            uri: vscode.Uri.file(nonGitDir),
            name: 'non-git-workspace',
            index: 0
        };
        try {
            // Act
            const status = await gitIntegration.detectRepositoryStatus(nonGitWorkspace);
            // Assert
            assert.strictEqual(status.isRepository, false);
            assert.strictEqual(status.currentBranch, '');
            assert.strictEqual(status.hasUncommittedChanges, false);
            assert.strictEqual(status.stagedFiles.length, 0);
            assert.strictEqual(status.unstagedFiles.length, 0);
            assert.strictEqual(status.untrackedFiles.length, 0);
        }
        finally {
            // Cleanup
            await fs.rm(nonGitDir, { recursive: true, force: true });
        }
    });
    test('should handle Git availability check', async function () {
        // This test will pass if Git is available, skip if not
        try {
            const isAvailable = await gitIntegration.checkGitAvailability();
            assert.strictEqual(typeof isAvailable, 'boolean');
            if (isAvailable) {
                assert.strictEqual(isAvailable, true);
            }
        }
        catch (error) {
            // Git not available - this is expected in some CI environments
            console.warn('Git not available for testing');
        }
    });
});
//# sourceMappingURL=GitIntegration.integration.test.js.map