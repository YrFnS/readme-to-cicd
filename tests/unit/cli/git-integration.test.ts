import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GitIntegration } from '../../../src/cli/lib/git-integration';
import { Logger } from '../../../src/cli/lib/logger';

describe('GitIntegration', () => {
  let gitIntegration: GitIntegration;
  let mockLogger: Logger;
  let executeGitCommandSpy: any;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as any;

    gitIntegration = new GitIntegration(mockLogger, '/test/directory');
    
    // Mock the private executeGitCommand method
    executeGitCommandSpy = vi.spyOn(gitIntegration as any, 'executeGitCommand');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isGitRepository', () => {
    it('should return true when in a Git repository', async () => {
      executeGitCommandSpy.mockResolvedValue({ stdout: '.git', stderr: '' });

      const result = await gitIntegration.isGitRepository();
      
      expect(result).toBe(true);
      expect(executeGitCommandSpy).toHaveBeenCalledWith('rev-parse --git-dir');
    });

    it('should return false when not in a Git repository', async () => {
      executeGitCommandSpy.mockRejectedValue(new Error('Not a git repository'));

      const result = await gitIntegration.isGitRepository();
      
      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith('Not a Git repository', {
        error: 'Not a git repository'
      });
    });
  });

  describe('getRepositoryStatus', () => {
    it('should return comprehensive repository status', async () => {
      executeGitCommandSpy.mockImplementation((command: string) => {
        if (command.includes('rev-parse --git-dir')) {
          return Promise.resolve({ stdout: '.git', stderr: '' });
        } else if (command.includes('status --porcelain')) {
          return Promise.resolve({ stdout: 'M  file1.txt\n?? file2.txt\n', stderr: '' });
        } else if (command.includes('branch --show-current')) {
          return Promise.resolve({ stdout: 'main\n', stderr: '' });
        } else if (command.includes('remote -v')) {
          return Promise.resolve({ stdout: 'origin\tgit@github.com:user/repo.git\n', stderr: '' });
        }
        return Promise.reject(new Error('Unknown command'));
      });

      const status = await gitIntegration.getRepositoryStatus();

      expect(status.isRepository).toBe(true);
      expect(status.hasChanges).toBe(true);
      expect(status.currentBranch).toBe('main');
      expect(status.hasRemote).toBe(true);
      expect(status.changedFiles).toHaveLength(2);
      expect(status.changedFiles[0].file).toBe('file1.txt');
      expect(status.changedFiles[0].status).toBe('modified (staged)');
      expect(status.changedFiles[1].file).toBe('file2.txt');
      expect(status.changedFiles[1].status).toBe('untracked');
      expect(status.isClean).toBe(false);
    });

    it('should throw error when not in Git repository', async () => {
      executeGitCommandSpy.mockRejectedValue(new Error('Not a git repository'));

      await expect(gitIntegration.getRepositoryStatus()).rejects.toThrow('Current directory is not a Git repository');
    });
  });

  describe('createCommit', () => {
    it('should create commit with descriptive message', async () => {
      const files = ['.github/workflows/ci.yml', '.github/workflows/cd.yml'];
      const config = { autoCommit: true, commitMessage: '', createPR: false };
      const workflowTypes = ['ci', 'cd'];

      executeGitCommandSpy.mockImplementation((command: string) => {
        if (command.includes('rev-parse --git-dir')) {
          return Promise.resolve({ stdout: '.git', stderr: '' });
        } else if (command.includes('add')) {
          return Promise.resolve({ stdout: '', stderr: '' });
        } else if (command.includes('commit -m')) {
          return Promise.resolve({ stdout: '[main abc123] feat: add 2 automated CI/CD workflows (ci, cd)', stderr: '' });
        } else if (command.includes('rev-parse HEAD')) {
          return Promise.resolve({ stdout: 'abc123def456', stderr: '' });
        }
        return Promise.reject(new Error('Unknown command'));
      });

      const result = await gitIntegration.createCommit(files, config, workflowTypes);

      expect(result.success).toBe(true);
      expect(result.commitHash).toBe('abc123def456');
      expect(result.message).toBe('feat: add 2 automated CI/CD workflows (ci, cd)');
      expect(result.filesCommitted).toEqual(files);
    });

    it('should use custom commit message when provided', async () => {
      const files = ['.github/workflows/ci.yml'];
      const config = { 
        autoCommit: true, 
        commitMessage: 'chore: update CI workflow', 
        createPR: false 
      };

      executeGitCommandSpy.mockImplementation((command: string) => {
        if (command.includes('rev-parse --git-dir')) {
          return Promise.resolve({ stdout: '.git', stderr: '' });
        } else if (command.includes('add')) {
          return Promise.resolve({ stdout: '', stderr: '' });
        } else if (command.includes('commit -m')) {
          expect(command).toContain('chore: update CI workflow');
          return Promise.resolve({ stdout: '[main abc123] chore: update CI workflow', stderr: '' });
        } else if (command.includes('rev-parse HEAD')) {
          return Promise.resolve({ stdout: 'abc123def456', stderr: '' });
        }
        return Promise.reject(new Error('Unknown command'));
      });

      const result = await gitIntegration.createCommit(files, config);
      expect(result.message).toBe('chore: update CI workflow');
    });

    it('should throw error when not in Git repository', async () => {
      executeGitCommandSpy.mockRejectedValue(new Error('Not a git repository'));

      const files = ['.github/workflows/ci.yml'];
      const config = { autoCommit: true, commitMessage: '', createPR: false };

      await expect(gitIntegration.createCommit(files, config)).rejects.toThrow('Cannot commit: not in a Git repository');
    });
  });

  describe('showWorkflowDiff', () => {
    it('should show diff for modified files', async () => {
      const files = ['.github/workflows/ci.yml'];

      executeGitCommandSpy.mockImplementation((command: string) => {
        if (command.includes('rev-parse --git-dir')) {
          return Promise.resolve({ stdout: '.git', stderr: '' });
        } else if (command.includes('diff HEAD')) {
          return Promise.resolve({ 
            stdout: '@@ -1,3 +1,4 @@\n name: CI\n+on: [push]\n jobs:\n   test:', 
            stderr: '' 
          });
        } else if (command.includes('diff --numstat')) {
          return Promise.resolve({ stdout: '1\t0\t.github/workflows/ci.yml', stderr: '' });
        } else if (command.includes('status --porcelain')) {
          return Promise.resolve({ stdout: 'M  .github/workflows/ci.yml', stderr: '' });
        }
        return Promise.reject(new Error('Unknown command'));
      });

      const result = await gitIntegration.showWorkflowDiff(files);

      expect(result.hasDiff).toBe(true);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].file).toBe('.github/workflows/ci.yml');
      expect(result.files[0].stats.additions).toBe(1);
      expect(result.files[0].stats.deletions).toBe(0);
      expect(result.summary).toContain('1 file changed');
    });

    it('should return no diff when not in Git repository', async () => {
      executeGitCommandSpy.mockRejectedValue(new Error('Not a git repository'));

      const result = await gitIntegration.showWorkflowDiff(['.github/workflows/ci.yml']);

      expect(result.hasDiff).toBe(false);
      expect(result.summary).toBe('Not in a Git repository - cannot show diff');
    });
  });

  describe('checkBranchProtection', () => {
    it('should detect protected branch patterns', async () => {
      executeGitCommandSpy.mockImplementation((command: string) => {
        if (command.includes('rev-parse --git-dir')) {
          return Promise.resolve({ stdout: '.git', stderr: '' });
        } else if (command.includes('status --porcelain')) {
          return Promise.resolve({ stdout: '', stderr: '' });
        } else if (command.includes('branch --show-current')) {
          return Promise.resolve({ stdout: 'main\n', stderr: '' });
        } else if (command.includes('remote -v')) {
          return Promise.resolve({ stdout: 'origin\tgit@github.com:user/repo.git\n', stderr: '' });
        }
        return Promise.reject(new Error('Unknown command'));
      });

      const result = await gitIntegration.checkBranchProtection();

      expect(result.hasProtection).toBe(true);
      expect(result.currentBranch).toBe('main');
      expect(result.warnings).toContain('Currently on potentially protected branch: main');
      expect(result.recommendations).toContain('Consider creating a feature branch for workflow changes');
    });

    it('should return no protection when not in Git repository', async () => {
      executeGitCommandSpy.mockRejectedValue(new Error('Not a git repository'));

      const result = await gitIntegration.checkBranchProtection();

      expect(result.hasProtection).toBe(false);
      expect(result.warnings).toEqual([]);
      expect(result.recommendations).toEqual([]);
    });
  });

  describe('displayDiff', () => {
    it('should display formatted diff output', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const diffResult = {
        hasDiff: true,
        files: [{
          file: '.github/workflows/ci.yml',
          diff: '+name: CI\n+on: [push]\n jobs:',
          stats: { additions: 2, deletions: 0, changes: 2 },
          status: 'modified'
        }],
        summary: '1 file changed, 2 insertions(+), 0 deletions(-)'
      };

      gitIntegration.displayDiff(diffResult);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📋 Workflow Changes:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📄 .github/workflows/ci.yml'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1 file changed, 2 insertions(+), 0 deletions(-)'));
      
      consoleSpy.mockRestore();
    });

    it('should display no changes message when no diff', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const diffResult = {
        hasDiff: false,
        files: [],
        summary: ''
      };

      gitIntegration.displayDiff(diffResult);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No changes to display'));
      
      consoleSpy.mockRestore();
    });
  });

  describe('displayBranchProtectionWarnings', () => {
    it('should display warnings and recommendations', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const protection = {
        hasProtection: true,
        currentBranch: 'main',
        warnings: ['Currently on protected branch: main'],
        recommendations: ['Create a feature branch for changes']
      };

      gitIntegration.displayBranchProtectionWarnings(protection);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('⚠️  Branch Protection Warnings:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Currently on protected branch: main'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('💡 Recommendations:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Create a feature branch for changes'));
      
      consoleSpy.mockRestore();
    });

    it('should not display anything when no warnings', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const protection = {
        hasProtection: false,
        warnings: [],
        recommendations: []
      };

      gitIntegration.displayBranchProtectionWarnings(protection);

      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should create appropriate error for different scenarios', async () => {
      executeGitCommandSpy.mockRejectedValue(new Error('Not a git repository'));

      try {
        await gitIntegration.getRepositoryStatus();
      } catch (error: any) {
        expect(error.code).toBe('NOT_GIT_REPOSITORY');
        expect(error.category).toBe('git-integration');
        expect(error.suggestions).toContain('Initialize a Git repository with: git init');
      }
    });
  });
});