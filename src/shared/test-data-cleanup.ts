/**
 * Test Data Cleanup - Comprehensive test data and temporary file cleanup utilities
 * 
 * Provides automatic cleanup of test-generated data, temporary files, and test artifacts
 * to prevent disk space issues and ensure clean test environments.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

export interface TestDataCleanupConfig {
  /** Enable automatic cleanup after each test */
  autoCleanupEnabled: boolean;
  /** Directories to clean up */
  cleanupDirectories: string[];
  /** File patterns to clean up */
  cleanupPatterns: string[];
  /** Maximum age of files to keep (in milliseconds) */
  maxFileAge: number;
  /** Enable verbose logging */
  verboseLogging: boolean;
  /** Dry run mode - log what would be cleaned but don't actually delete */
  dryRun: boolean;
}

export interface CleanupResult {
  /** Number of files deleted */
  filesDeleted: number;
  /** Number of directories deleted */
  directoriesDeleted: number;
  /** Total bytes freed */
  bytesFreed: number;
  /** List of cleaned up paths */
  cleanedPaths: string[];
  /** List of errors encountered */
  errors: Array<{ path: string; error: string }>;
  /** Cleanup duration in milliseconds */
  duration: number;
}

export interface TestDataTracker {
  /** Track a temporary file for cleanup */
  trackFile(filePath: string): void;
  /** Track a temporary directory for cleanup */
  trackDirectory(dirPath: string): void;
  /** Get all tracked paths */
  getTrackedPaths(): string[];
  /** Clear tracking without cleanup */
  clearTracking(): void;
}

/**
 * Test Data Cleanup Manager - Handles cleanup of test-generated data and temporary files
 */
export class TestDataCleanupManager {
  private static instance: TestDataCleanupManager;
  private config: TestDataCleanupConfig;
  private trackedPaths: Set<string> = new Set();
  private cleanupHistory: CleanupResult[] = [];

  private constructor(config?: Partial<TestDataCleanupConfig>) {
    this.config = {
      autoCleanupEnabled: true,
      cleanupDirectories: [
        './test-output',
        './temp',
        './tmp',
        './test-temp',
        './test-validation-output',
        './temp-templates',
        './test-fixtures-temp',
        './debug-output'
      ],
      cleanupPatterns: [
        '**/*.tmp',
        '**/*.temp',
        '**/test-*.json',
        '**/debug-*.js',
        '**/temp-*.md',
        '**/.test-*',
        '**/mock-*',
        '**/sample-output-*',
        '**/generated-test-*'
      ],
      maxFileAge: 24 * 60 * 60 * 1000, // 24 hours
      verboseLogging: process.env.TEST_CLEANUP_VERBOSE === 'true',
      dryRun: process.env.TEST_CLEANUP_DRY_RUN === 'true',
      ...config
    };
  }

  /**
   * Get singleton instance of TestDataCleanupManager
   */
  static getInstance(config?: Partial<TestDataCleanupConfig>): TestDataCleanupManager {
    if (!TestDataCleanupManager.instance) {
      TestDataCleanupManager.instance = new TestDataCleanupManager(config);
    } else if (config) {
      // Allow configuration updates on existing instance
      TestDataCleanupManager.instance.updateConfig(config);
    }
    return TestDataCleanupManager.instance;
  }

  /**
   * Reset singleton instance (for testing)
   */
  static resetInstance(): void {
    TestDataCleanupManager.instance = undefined as any;
  }

  /**
   * Track a file or directory for cleanup
   */
  trackPath(filePath: string): void {
    const absolutePath = path.resolve(filePath);
    this.trackedPaths.add(absolutePath);
    
    if (this.config.verboseLogging) {
      console.log(`📝 Tracking for cleanup: ${absolutePath}`);
    }
  }

  /**
   * Track multiple paths for cleanup
   */
  trackPaths(paths: string[]): void {
    paths.forEach(p => this.trackPath(p));
  }

  /**
   * Get all tracked paths
   */
  getTrackedPaths(): string[] {
    return Array.from(this.trackedPaths);
  }

  /**
   * Clear tracking without cleanup
   */
  clearTracking(): void {
    this.trackedPaths.clear();
  }

  /**
   * Perform comprehensive test data cleanup
   */
  async cleanupTestData(): Promise<CleanupResult> {
    const startTime = Date.now();
    const result: CleanupResult = {
      filesDeleted: 0,
      directoriesDeleted: 0,
      bytesFreed: 0,
      cleanedPaths: [],
      errors: [],
      duration: 0
    };

    if (this.config.verboseLogging) {
      console.log('🧹 Starting test data cleanup...');
    }

    try {
      // Clean up tracked paths first
      await this.cleanupTrackedPaths(result);
      
      // Clean up configured directories
      await this.cleanupConfiguredDirectories(result);
      
      // Clean up files matching patterns
      await this.cleanupByPatterns(result);
      
      // Clean up old files
      await this.cleanupOldFiles(result);
      
      result.duration = Date.now() - startTime;
      
      // Store cleanup history
      this.cleanupHistory.push(result);
      
      // Keep only last 10 cleanup results
      if (this.cleanupHistory.length > 10) {
        this.cleanupHistory = this.cleanupHistory.slice(-10);
      }
      
      if (this.config.verboseLogging) {
        this.logCleanupResult(result);
      }
      
    } catch (error) {
      result.errors.push({
        path: 'cleanup-process',
        error: error instanceof Error ? error.message : String(error)
      });
      
      console.error('❌ Test data cleanup failed:', error);
    }

    return result;
  }

  /**
   * Clean up tracked paths
   */
  private async cleanupTrackedPaths(result: CleanupResult): Promise<void> {
    for (const trackedPath of this.trackedPaths) {
      try {
        await this.cleanupPath(trackedPath, result);
      } catch (error) {
        result.errors.push({
          path: trackedPath,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    // Clear tracked paths after cleanup
    this.trackedPaths.clear();
  }

  /**
   * Clean up configured directories
   */
  private async cleanupConfiguredDirectories(result: CleanupResult): Promise<void> {
    for (const dir of this.config.cleanupDirectories) {
      try {
        const absoluteDir = path.resolve(dir);
        if (existsSync(absoluteDir)) {
          await this.cleanupDirectory(absoluteDir, result);
        }
      } catch (error) {
        result.errors.push({
          path: dir,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * Clean up files matching patterns
   */
  private async cleanupByPatterns(result: CleanupResult): Promise<void> {
    // This is a simplified pattern matching - in a real implementation,
    // you might want to use a library like glob for more sophisticated pattern matching
    const workspaceRoot = process.cwd();
    
    for (const pattern of this.config.cleanupPatterns) {
      try {
        await this.cleanupByPattern(workspaceRoot, pattern, result);
      } catch (error) {
        result.errors.push({
          path: pattern,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * Clean up old files based on age
   */
  private async cleanupOldFiles(result: CleanupResult): Promise<void> {
    const cutoffTime = Date.now() - this.config.maxFileAge;
    
    // Check common temporary directories for old files
    const tempDirs = ['./temp', './tmp', './test-output'];
    
    for (const tempDir of tempDirs) {
      try {
        const absoluteDir = path.resolve(tempDir);
        if (existsSync(absoluteDir)) {
          await this.cleanupOldFilesInDirectory(absoluteDir, cutoffTime, result);
        }
      } catch (error) {
        result.errors.push({
          path: tempDir,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * Clean up a specific path (file or directory)
   */
  private async cleanupPath(targetPath: string, result: CleanupResult): Promise<void> {
    if (!existsSync(targetPath)) {
      return;
    }

    const stats = await fs.stat(targetPath);
    
    if (stats.isDirectory()) {
      await this.cleanupDirectory(targetPath, result);
    } else {
      await this.cleanupFile(targetPath, result);
    }
  }

  /**
   * Clean up a directory and its contents
   */
  private async cleanupDirectory(dirPath: string, result: CleanupResult): Promise<void> {
    if (this.config.verboseLogging) {
      console.log(`🗂️  Cleaning directory: ${dirPath}`);
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      // Clean up contents first
      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          await this.cleanupDirectory(entryPath, result);
        } else {
          await this.cleanupFile(entryPath, result);
        }
      }
      
      // Remove the directory if it's empty
      const remainingEntries = await fs.readdir(dirPath);
      if (remainingEntries.length === 0) {
        if (!this.config.dryRun) {
          await fs.rmdir(dirPath);
        }
        
        result.directoriesDeleted++;
        result.cleanedPaths.push(dirPath);
        
        if (this.config.verboseLogging) {
          console.log(`🗑️  Removed directory: ${dirPath}`);
        }
      }
      
    } catch (error) {
      result.errors.push({
        path: dirPath,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Clean up a single file
   */
  private async cleanupFile(filePath: string, result: CleanupResult): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      
      if (!this.config.dryRun) {
        await fs.unlink(filePath);
      }
      
      result.filesDeleted++;
      result.bytesFreed += stats.size;
      result.cleanedPaths.push(filePath);
      
      if (this.config.verboseLogging) {
        console.log(`🗑️  Removed file: ${filePath} (${this.formatBytes(stats.size)})`);
      }
      
    } catch (error) {
      result.errors.push({
        path: filePath,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Clean up files matching a pattern in a directory
   */
  private async cleanupByPattern(baseDir: string, pattern: string, result: CleanupResult): Promise<void> {
    // Simplified pattern matching - convert glob-like patterns to regex
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\./g, '\\.');
    
    const regex = new RegExp(regexPattern);
    
    await this.cleanupByRegex(baseDir, regex, result);
  }

  /**
   * Clean up files matching a regex pattern
   */
  private async cleanupByRegex(baseDir: string, regex: RegExp, result: CleanupResult): Promise<void> {
    if (!existsSync(baseDir)) {
      return;
    }

    try {
      const entries = await fs.readdir(baseDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const entryPath = path.join(baseDir, entry.name);
        const relativePath = path.relative(process.cwd(), entryPath);
        
        if (entry.isDirectory()) {
          // Recursively search subdirectories
          await this.cleanupByRegex(entryPath, regex, result);
        } else if (regex.test(relativePath)) {
          await this.cleanupFile(entryPath, result);
        }
      }
    } catch (error) {
      result.errors.push({
        path: baseDir,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Clean up old files in a directory
   */
  private async cleanupOldFilesInDirectory(dirPath: string, cutoffTime: number, result: CleanupResult): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          await this.cleanupOldFilesInDirectory(entryPath, cutoffTime, result);
        } else {
          const stats = await fs.stat(entryPath);
          if (stats.mtime.getTime() < cutoffTime) {
            await this.cleanupFile(entryPath, result);
          }
        }
      }
    } catch (error) {
      result.errors.push({
        path: dirPath,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Log cleanup result
   */
  private logCleanupResult(result: CleanupResult): void {
    console.log('\n📊 Test Data Cleanup Report');
    console.log(`Files deleted: ${result.filesDeleted}`);
    console.log(`Directories deleted: ${result.directoriesDeleted}`);
    console.log(`Bytes freed: ${this.formatBytes(result.bytesFreed)}`);
    console.log(`Duration: ${result.duration}ms`);
    
    if (result.errors.length > 0) {
      console.log(`Errors: ${result.errors.length}`);
      result.errors.forEach(error => {
        console.log(`  ❌ ${error.path}: ${error.error}`);
      });
    }
    
    if (this.config.dryRun) {
      console.log('🔍 DRY RUN - No files were actually deleted');
    }
  }

  /**
   * Get cleanup history
   */
  getCleanupHistory(): CleanupResult[] {
    return [...this.cleanupHistory];
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<TestDataCleanupConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): TestDataCleanupConfig {
    return { ...this.config };
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  /**
   * Reset manager state (for testing)
   */
  reset(): void {
    this.trackedPaths.clear();
    this.cleanupHistory = [];
  }
}

/**
 * Test Data Tracker - Simple interface for tracking test data for cleanup
 */
export class TestDataTracker implements TestDataTracker {
  private cleanupManager: TestDataCleanupManager;

  constructor(cleanupManager?: TestDataCleanupManager) {
    this.cleanupManager = cleanupManager || TestDataCleanupManager.getInstance();
  }

  /**
   * Track a temporary file for cleanup
   */
  trackFile(filePath: string): void {
    this.cleanupManager.trackPath(filePath);
  }

  /**
   * Track a temporary directory for cleanup
   */
  trackDirectory(dirPath: string): void {
    this.cleanupManager.trackPath(dirPath);
  }

  /**
   * Get all tracked paths
   */
  getTrackedPaths(): string[] {
    return this.cleanupManager.getTrackedPaths();
  }

  /**
   * Clear tracking without cleanup
   */
  clearTracking(): void {
    this.cleanupManager.clearTracking();
  }
}

// Convenience functions
export const getTestDataCleanupManager = (config?: Partial<TestDataCleanupConfig>): TestDataCleanupManager => 
  TestDataCleanupManager.getInstance(config);

export const createTestDataTracker = (cleanupManager?: TestDataCleanupManager): TestDataTracker => 
  new TestDataTracker(cleanupManager);

export const cleanupTestData = async (): Promise<CleanupResult> => {
  const manager = TestDataCleanupManager.getInstance();
  return await manager.cleanupTestData();
};

export const trackTestFile = (filePath: string): void => {
  const manager = TestDataCleanupManager.getInstance();
  manager.trackPath(filePath);
};

export const trackTestDirectory = (dirPath: string): void => {
  const manager = TestDataCleanupManager.getInstance();
  manager.trackPath(dirPath);
};