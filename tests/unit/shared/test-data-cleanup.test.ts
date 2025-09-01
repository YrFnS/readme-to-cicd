/**
 * Unit tests for Test Data Cleanup functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import {
  TestDataCleanupManager,
  TestDataTracker,
  getTestDataCleanupManager,
  createTestDataTracker,
  cleanupTestData,
  trackTestFile,
  trackTestDirectory,
  type TestDataCleanupConfig,
  type CleanupResult
} from '../../../src/shared/test-data-cleanup.js';

// Mock file system operations
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs') as any;
  return {
    ...actual,
    existsSync: vi.fn()
  };
});

vi.mock('fs/promises', async () => {
  const actual = await vi.importActual('fs/promises') as any;
  return {
    ...actual,
    readdir: vi.fn(),
    stat: vi.fn(),
    unlink: vi.fn(),
    rmdir: vi.fn()
  };
});

describe('TestDataCleanupManager', () => {
  let cleanupManager: TestDataCleanupManager;
  let mockExistsSync: any;
  let mockReaddir: any;
  let mockStat: any;
  let mockUnlink: any;
  let mockRmdir: any;

  beforeEach(() => {
    // Reset singleton instance
    TestDataCleanupManager.resetInstance();
    
    // Setup mocks
    mockExistsSync = vi.mocked(existsSync);
    mockReaddir = vi.mocked(fs.readdir);
    mockStat = vi.mocked(fs.stat);
    mockUnlink = vi.mocked(fs.unlink);
    mockRmdir = vi.mocked(fs.rmdir);
    
    // Clear all mocks
    vi.clearAllMocks();
    
    // Default mock implementations
    mockExistsSync.mockReturnValue(false);
    mockReaddir.mockResolvedValue([]);
    mockStat.mockResolvedValue({
      isDirectory: () => false,
      isFile: () => true,
      size: 1024,
      mtime: new Date()
    } as any);
    mockUnlink.mockResolvedValue(undefined);
    mockRmdir.mockResolvedValue(undefined);
    
    cleanupManager = TestDataCleanupManager.getInstance();
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanupManager.reset();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = TestDataCleanupManager.getInstance();
      const instance2 = TestDataCleanupManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should accept configuration on first call', () => {
      // Reset to ensure clean state
      TestDataCleanupManager.resetInstance();
      
      const config: Partial<TestDataCleanupConfig> = {
        autoCleanupEnabled: false,
        verboseLogging: true
      };
      
      const instance = TestDataCleanupManager.getInstance(config);
      const actualConfig = instance.getConfig();
      
      expect(actualConfig.autoCleanupEnabled).toBe(false);
      expect(actualConfig.verboseLogging).toBe(true);
    });
  });

  describe('trackPath', () => {
    it('should track file paths for cleanup', () => {
      const testFile = '/test/file.tmp';
      
      cleanupManager.trackPath(testFile);
      const trackedPaths = cleanupManager.getTrackedPaths();
      
      expect(trackedPaths).toContain(path.resolve(testFile));
    });

    it('should track multiple paths', () => {
      const paths = ['/test/file1.tmp', '/test/file2.tmp', '/test/dir'];
      
      cleanupManager.trackPaths(paths);
      const trackedPaths = cleanupManager.getTrackedPaths();
      
      paths.forEach(p => {
        expect(trackedPaths).toContain(path.resolve(p));
      });
    });

    it('should not duplicate tracked paths', () => {
      const testFile = '/test/file.tmp';
      
      cleanupManager.trackPath(testFile);
      cleanupManager.trackPath(testFile);
      
      const trackedPaths = cleanupManager.getTrackedPaths();
      const resolvedPath = path.resolve(testFile);
      const occurrences = trackedPaths.filter(p => p === resolvedPath).length;
      
      expect(occurrences).toBe(1);
    });
  });

  describe('clearTracking', () => {
    it('should clear all tracked paths', () => {
      cleanupManager.trackPath('/test/file1.tmp');
      cleanupManager.trackPath('/test/file2.tmp');
      
      expect(cleanupManager.getTrackedPaths()).toHaveLength(2);
      
      cleanupManager.clearTracking();
      
      expect(cleanupManager.getTrackedPaths()).toHaveLength(0);
    });
  });

  describe('cleanupTestData', () => {
    it('should return cleanup result with zero counts when no files exist', async () => {
      mockExistsSync.mockReturnValue(false);
      
      const result = await cleanupManager.cleanupTestData();
      
      expect(result).toMatchObject({
        filesDeleted: 0,
        directoriesDeleted: 0,
        bytesFreed: 0,
        cleanedPaths: [],
        errors: []
      });
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should clean up tracked files', async () => {
      const testFile = '/test/file.tmp';
      const resolvedPath = path.resolve(testFile);
      
      cleanupManager.trackPath(testFile);
      
      // Verify the path is tracked
      expect(cleanupManager.getTrackedPaths()).toContain(resolvedPath);
      
      // Mock existsSync to return true for our test file
      mockExistsSync.mockReturnValue(true);
      
      mockStat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
        size: 2048,
        mtime: new Date()
      } as any);
      
      const result = await cleanupManager.cleanupTestData();
      
      expect(result.filesDeleted).toBe(1);
      expect(result.bytesFreed).toBe(2048);
      expect(result.cleanedPaths).toContain(resolvedPath);
      expect(mockUnlink).toHaveBeenCalledWith(resolvedPath);
    });

    it('should clean up directories recursively', async () => {
      const testDir = '/test/dir';
      const testFile = path.join(testDir, 'file.tmp');
      const resolvedDir = path.resolve(testDir);
      const resolvedFile = path.resolve(testFile);
      
      cleanupManager.trackPath(testDir);
      
      mockExistsSync.mockImplementation((checkPath: string) => 
        checkPath === resolvedDir || checkPath === resolvedFile
      );
      
      mockStat.mockImplementation(async (statPath: string) => {
        if (statPath === resolvedDir) {
          return {
            isDirectory: () => true,
            isFile: () => false,
            size: 0,
            mtime: new Date()
          } as any;
        } else {
          return {
            isDirectory: () => false,
            isFile: () => true,
            size: 1024,
            mtime: new Date()
          } as any;
        }
      });
      
      // First call returns the file, second call returns empty (after file is deleted)
      mockReaddir.mockResolvedValueOnce([{ name: 'file.tmp', isDirectory: () => false, isFile: () => true }] as any)
                 .mockResolvedValueOnce([]);
      
      const result = await cleanupManager.cleanupTestData();
      
      expect(result.filesDeleted).toBe(1);
      expect(result.directoriesDeleted).toBe(1);
      expect(mockUnlink).toHaveBeenCalledWith(resolvedFile);
      expect(mockRmdir).toHaveBeenCalledWith(resolvedDir);
    });

    it('should handle cleanup errors gracefully', async () => {
      const testFile = '/test/file.tmp';
      const resolvedPath = path.resolve(testFile);
      
      cleanupManager.trackPath(testFile);
      
      mockExistsSync.mockImplementation((checkPath: string) => 
        checkPath === resolvedPath
      );
      
      mockStat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
        size: 1024,
        mtime: new Date()
      } as any);
      
      mockUnlink.mockRejectedValue(new Error('Permission denied'));
      
      const result = await cleanupManager.cleanupTestData();
      
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        path: resolvedPath,
        error: 'Permission denied'
      });
    });

    it('should respect dry run mode', async () => {
      cleanupManager.updateConfig({ dryRun: true });
      
      const testFile = '/test/file.tmp';
      const resolvedPath = path.resolve(testFile);
      
      cleanupManager.trackPath(testFile);
      
      mockExistsSync.mockImplementation((checkPath: string) => 
        checkPath === resolvedPath
      );
      
      mockStat.mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
        size: 1024,
        mtime: new Date()
      } as any);
      
      const result = await cleanupManager.cleanupTestData();
      
      expect(result.filesDeleted).toBe(1);
      expect(result.bytesFreed).toBe(1024);
      expect(mockUnlink).not.toHaveBeenCalled();
    });

    it('should clean up old files based on age', async () => {
      cleanupManager.updateConfig({ 
        maxFileAge: 60 * 60 * 1000, // 1 hour
        cleanupDirectories: ['./temp']
      });
      
      const tempDir = path.resolve('./temp');
      const oldFile = path.join(tempDir, 'old-file.tmp');
      const newFile = path.join(tempDir, 'new-file.tmp');
      
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago (older than maxFileAge)
      const now = new Date();
      
      mockExistsSync.mockImplementation((checkPath: string) => 
        checkPath === tempDir || checkPath === oldFile || checkPath === newFile
      );
      
      mockStat.mockImplementation(async (statPath: string) => {
        if (statPath === tempDir) {
          return { isDirectory: () => true, isFile: () => false } as any;
        } else if (statPath === oldFile) {
          return { 
            isDirectory: () => false, 
            isFile: () => true, 
            size: 1024, 
            mtime: twoHoursAgo 
          } as any;
        } else {
          return { 
            isDirectory: () => false, 
            isFile: () => true, 
            size: 1024, 
            mtime: now 
          } as any;
        }
      });
      
      mockReaddir.mockResolvedValue([
        { name: 'old-file.tmp', isDirectory: () => false, isFile: () => true },
        { name: 'new-file.tmp', isDirectory: () => false, isFile: () => true }
      ] as any);
      
      const result = await cleanupManager.cleanupTestData();
      
      expect(mockUnlink).toHaveBeenCalledWith(oldFile);
      expect(mockUnlink).not.toHaveBeenCalledWith(newFile);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const newConfig = {
        verboseLogging: true,
        dryRun: true,
        maxFileAge: 30 * 60 * 1000 // 30 minutes
      };
      
      cleanupManager.updateConfig(newConfig);
      const config = cleanupManager.getConfig();
      
      expect(config.verboseLogging).toBe(true);
      expect(config.dryRun).toBe(true);
      expect(config.maxFileAge).toBe(30 * 60 * 1000);
    });
  });

  describe('getCleanupHistory', () => {
    it('should track cleanup history', async () => {
      mockExistsSync.mockReturnValue(false);
      
      await cleanupManager.cleanupTestData();
      await cleanupManager.cleanupTestData();
      
      const history = cleanupManager.getCleanupHistory();
      
      expect(history).toHaveLength(2);
      history.forEach(result => {
        expect(result).toHaveProperty('filesDeleted');
        expect(result).toHaveProperty('duration');
      });
    });

    it('should limit history to 10 entries', async () => {
      mockExistsSync.mockReturnValue(false);
      
      // Run 15 cleanup operations
      for (let i = 0; i < 15; i++) {
        await cleanupManager.cleanupTestData();
      }
      
      const history = cleanupManager.getCleanupHistory();
      
      expect(history).toHaveLength(10);
    });
  });
});

describe('TestDataTracker', () => {
  let tracker: TestDataTracker;
  let cleanupManager: TestDataCleanupManager;

  beforeEach(() => {
    TestDataCleanupManager.resetInstance();
    cleanupManager = TestDataCleanupManager.getInstance();
    tracker = createTestDataTracker(cleanupManager);
  });

  afterEach(() => {
    cleanupManager.reset();
  });

  describe('trackFile', () => {
    it('should track files for cleanup', () => {
      const testFile = '/test/file.tmp';
      
      tracker.trackFile(testFile);
      
      const trackedPaths = tracker.getTrackedPaths();
      expect(trackedPaths).toContain(path.resolve(testFile));
    });
  });

  describe('trackDirectory', () => {
    it('should track directories for cleanup', () => {
      const testDir = '/test/dir';
      
      tracker.trackDirectory(testDir);
      
      const trackedPaths = tracker.getTrackedPaths();
      expect(trackedPaths).toContain(path.resolve(testDir));
    });
  });

  describe('clearTracking', () => {
    it('should clear tracked paths', () => {
      tracker.trackFile('/test/file1.tmp');
      tracker.trackFile('/test/file2.tmp');
      
      expect(tracker.getTrackedPaths()).toHaveLength(2);
      
      tracker.clearTracking();
      
      expect(tracker.getTrackedPaths()).toHaveLength(0);
    });
  });
});

describe('Convenience Functions', () => {
  beforeEach(() => {
    TestDataCleanupManager.resetInstance();
    vi.mocked(existsSync).mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getTestDataCleanupManager', () => {
    it('should return cleanup manager instance', () => {
      const manager = getTestDataCleanupManager();
      
      expect(manager).toBeInstanceOf(TestDataCleanupManager);
    });

    it('should accept configuration', () => {
      const config = { verboseLogging: true };
      const manager = getTestDataCleanupManager(config);
      
      expect(manager.getConfig().verboseLogging).toBe(true);
    });
  });

  describe('createTestDataTracker', () => {
    it('should create test data tracker', () => {
      const tracker = createTestDataTracker();
      
      expect(tracker).toBeInstanceOf(TestDataTracker);
    });
  });

  describe('cleanupTestData', () => {
    it('should perform cleanup using default manager', async () => {
      const result = await cleanupTestData();
      
      expect(result).toHaveProperty('filesDeleted');
      expect(result).toHaveProperty('duration');
    });
  });

  describe('trackTestFile', () => {
    it('should track file using default manager', () => {
      const testFile = '/test/file.tmp';
      
      trackTestFile(testFile);
      
      const manager = getTestDataCleanupManager();
      const trackedPaths = manager.getTrackedPaths();
      
      expect(trackedPaths).toContain(path.resolve(testFile));
    });
  });

  describe('trackTestDirectory', () => {
    it('should track directory using default manager', () => {
      const testDir = '/test/dir';
      
      trackTestDirectory(testDir);
      
      const manager = getTestDataCleanupManager();
      const trackedPaths = manager.getTrackedPaths();
      
      expect(trackedPaths).toContain(path.resolve(testDir));
    });
  });
});

describe('Pattern Matching', () => {
  let cleanupManager: TestDataCleanupManager;

  beforeEach(() => {
    TestDataCleanupManager.resetInstance();
    cleanupManager = TestDataCleanupManager.getInstance({
      cleanupPatterns: ['**/*.tmp', '**/test-*.json']
    });
  });

  afterEach(() => {
    cleanupManager.reset();
    vi.clearAllMocks();
  });

  it('should match files by patterns during cleanup', async () => {
    const workspaceRoot = process.cwd();
    const projectDir = path.join(workspaceRoot, 'project');
    const tmpFile = path.join(projectDir, 'file.tmp');
    const testJsonFile = path.join(projectDir, 'test-data.json');
    const normalFile = path.join(projectDir, 'normal-file.txt');
    
    vi.mocked(existsSync).mockImplementation((checkPath: string) => 
      checkPath === workspaceRoot || checkPath === projectDir ||
      checkPath === tmpFile || checkPath === testJsonFile || checkPath === normalFile
    );
    
    vi.mocked(fs.stat).mockImplementation(async (statPath: string) => {
      if (statPath === workspaceRoot || statPath === projectDir) {
        return { isDirectory: () => true, isFile: () => false } as any;
      } else {
        return {
          isDirectory: () => false,
          isFile: () => true,
          size: 1024,
          mtime: new Date()
        } as any;
      }
    });
    
    vi.mocked(fs.readdir).mockImplementation(async (dirPath: string) => {
      if (dirPath === workspaceRoot) {
        return [{ name: 'project', isDirectory: () => true, isFile: () => false }] as any;
      } else if (dirPath === projectDir) {
        return [
          { name: 'file.tmp', isDirectory: () => false, isFile: () => true },
          { name: 'test-data.json', isDirectory: () => false, isFile: () => true },
          { name: 'normal-file.txt', isDirectory: () => false, isFile: () => true }
        ] as any;
      }
      return [];
    });
    
    const result = await cleanupManager.cleanupTestData();
    
    // Should clean up .tmp and test-*.json files, but not normal-file.txt
    expect(vi.mocked(fs.unlink)).toHaveBeenCalledWith(tmpFile);
    expect(vi.mocked(fs.unlink)).toHaveBeenCalledWith(testJsonFile);
    expect(vi.mocked(fs.unlink)).not.toHaveBeenCalledWith(normalFile);
  });
});