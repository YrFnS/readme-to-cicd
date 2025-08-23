/**
 * Configuration Version Manager Implementation
 * 
 * Provides configuration versioning, history tracking, and rollback capabilities
 * with support for both full configuration snapshots and individual key changes.
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import {
  Configuration,
  ConfigValue,
  ConfigurationVersion,
  ConfigurationHistory
} from '../types/configuration-types.js';

export interface VersionManagerOptions {
  storageType: 'file' | 'database';
  basePath?: string;
  maxVersions?: number;
  compressionEnabled?: boolean;
  encryptionEnabled?: boolean;
}

export class ConfigurationVersionManager {
  private options: VersionManagerOptions;
  private basePath: string;
  private versionCache: Map<string, ConfigurationVersion>;

  constructor(options: VersionManagerOptions) {
    this.options = {
      maxVersions: 50,
      compressionEnabled: false,
      encryptionEnabled: false,
      ...options
    };
    this.basePath = options.basePath || './config/versions';
    this.versionCache = new Map();
  }

  /**
   * Create a snapshot of a specific configuration key
   */
  async createSnapshot(
    key: string,
    value: ConfigValue,
    environment?: string,
    description?: string
  ): Promise<string> {
    const version = this.generateVersionId();
    const timestamp = new Date();
    const author = this.getCurrentUser();

    // Create minimal configuration object for the key
    const partialConfig: Partial<Configuration> = {};
    this.setValueAtPath(partialConfig, key, value);

    const configVersion: ConfigurationVersion = {
      version,
      timestamp,
      author,
      description: description || `Snapshot of ${key}`,
      configuration: partialConfig as Configuration,
      checksum: this.calculateChecksum(partialConfig)
    };

    await this.storeVersion(configVersion, environment, key);
    
    // Clean up old versions if needed
    await this.cleanupOldVersions(environment, key);

    return version;
  }

  /**
   * Create a full configuration snapshot
   */
  async createFullSnapshot(
    configuration: Configuration,
    description?: string,
    environment?: string
  ): Promise<string> {
    const version = this.generateVersionId();
    const timestamp = new Date();
    const author = this.getCurrentUser();

    const configVersion: ConfigurationVersion = {
      version,
      timestamp,
      author,
      description: description || 'Full configuration snapshot',
      configuration,
      checksum: this.calculateChecksum(configuration)
    };

    await this.storeVersion(configVersion, environment);
    
    // Clean up old versions if needed
    await this.cleanupOldVersions(environment);

    return version;
  }

  /**
   * Get configuration version by version ID
   */
  async getVersion(versionId: string, environment?: string): Promise<ConfigurationVersion | null> {
    const cacheKey = this.getCacheKey(versionId, environment);
    
    // Check cache first
    if (this.versionCache.has(cacheKey)) {
      return this.versionCache.get(cacheKey)!;
    }

    try {
      const version = await this.loadVersion(versionId, environment);
      
      // Cache the version
      this.versionCache.set(cacheKey, version);
      
      return version;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get configuration history
   */
  async getHistory(key?: string, environment?: string): Promise<ConfigurationHistory> {
    const versions = await this.loadAllVersions(environment, key);
    
    // Sort by timestamp (newest first)
    versions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const currentVersion = versions.length > 0 ? versions[0].version : '';

    return {
      versions,
      currentVersion
    };
  }

  /**
   * Compare two configuration versions
   */
  async compareVersions(
    version1: string,
    version2: string,
    environment?: string
  ): Promise<ConfigurationDiff> {
    const [v1, v2] = await Promise.all([
      this.getVersion(version1, environment),
      this.getVersion(version2, environment)
    ]);

    if (!v1 || !v2) {
      throw new Error('One or both versions not found');
    }

    return this.calculateDiff(v1.configuration, v2.configuration);
  }

  /**
   * Get versions within a date range
   */
  async getVersionsByDateRange(
    startDate: Date,
    endDate: Date,
    environment?: string,
    key?: string
  ): Promise<ConfigurationVersion[]> {
    const allVersions = await this.loadAllVersions(environment, key);
    
    return allVersions.filter(version => 
      version.timestamp >= startDate && version.timestamp <= endDate
    );
  }

  /**
   * Delete a specific version
   */
  async deleteVersion(versionId: string, environment?: string): Promise<void> {
    const filePath = this.getVersionFilePath(versionId, environment);
    
    try {
      await fs.unlink(filePath);
      
      // Remove from cache
      const cacheKey = this.getCacheKey(versionId, environment);
      this.versionCache.delete(cacheKey);
      
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw new Error(`Failed to delete version ${versionId}: ${error.message}`);
      }
    }
  }

  /**
   * Prune old versions beyond the maximum limit
   */
  async pruneVersions(environment?: string, key?: string): Promise<number> {
    const versions = await this.loadAllVersions(environment, key);
    
    if (versions.length <= this.options.maxVersions!) {
      return 0;
    }

    // Sort by timestamp (oldest first for deletion)
    versions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const versionsToDelete = versions.slice(0, versions.length - this.options.maxVersions!);
    let deletedCount = 0;

    for (const version of versionsToDelete) {
      try {
        await this.deleteVersion(version.version, environment);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete version ${version.version}:`, error);
      }
    }

    return deletedCount;
  }

  /**
   * Verify version integrity
   */
  async verifyVersion(versionId: string, environment?: string): Promise<boolean> {
    const version = await this.getVersion(versionId, environment);
    if (!version) {
      return false;
    }

    const calculatedChecksum = this.calculateChecksum(version.configuration);
    return calculatedChecksum === version.checksum;
  }

  /**
   * Export versions to a backup file
   */
  async exportVersions(
    filePath: string,
    environment?: string,
    key?: string
  ): Promise<void> {
    const versions = await this.loadAllVersions(environment, key);
    
    const exportData = {
      exportDate: new Date().toISOString(),
      environment: environment || 'all',
      key: key || 'all',
      versions
    };

    const data = JSON.stringify(exportData, null, 2);
    await fs.writeFile(filePath, data, 'utf-8');
  }

  /**
   * Import versions from a backup file
   */
  async importVersions(filePath: string): Promise<number> {
    const data = await fs.readFile(filePath, 'utf-8');
    const importData = JSON.parse(data);
    
    let importedCount = 0;
    
    for (const version of importData.versions) {
      try {
        await this.storeVersion(version, importData.environment);
        importedCount++;
      } catch (error) {
        console.error(`Failed to import version ${version.version}:`, error);
      }
    }

    return importedCount;
  }

  private async storeVersion(
    version: ConfigurationVersion,
    environment?: string,
    key?: string
  ): Promise<void> {
    const filePath = this.getVersionFilePath(version.version, environment, key);
    const dirPath = dirname(filePath);
    
    // Ensure directory exists
    await fs.mkdir(dirPath, { recursive: true });
    
    let data = JSON.stringify(version, null, 2);
    
    // Apply compression if enabled
    if (this.options.compressionEnabled) {
      data = await this.compressData(data);
    }
    
    // Apply encryption if enabled
    if (this.options.encryptionEnabled) {
      data = await this.encryptData(data);
    }
    
    await fs.writeFile(filePath, data, 'utf-8');
  }

  private async loadVersion(
    versionId: string,
    environment?: string,
    key?: string
  ): Promise<ConfigurationVersion> {
    const filePath = this.getVersionFilePath(versionId, environment, key);
    let data = await fs.readFile(filePath, 'utf-8');
    
    // Apply decryption if enabled
    if (this.options.encryptionEnabled) {
      data = await this.decryptData(data);
    }
    
    // Apply decompression if enabled
    if (this.options.compressionEnabled) {
      data = await this.decompressData(data);
    }
    
    const version = JSON.parse(data) as ConfigurationVersion;
    
    // Convert timestamp string back to Date object
    version.timestamp = new Date(version.timestamp);
    
    return version;
  }

  private async loadAllVersions(
    environment?: string,
    key?: string
  ): Promise<ConfigurationVersion[]> {
    const dirPath = this.getVersionDirectoryPath(environment, key);
    
    try {
      const files = await fs.readdir(dirPath);
      const versionFiles = files.filter(file => file.endsWith('.json'));
      
      const versions: ConfigurationVersion[] = [];
      
      for (const file of versionFiles) {
        try {
          const versionId = file.replace('.json', '');
          const version = await this.loadVersion(versionId, environment, key);
          versions.push(version);
        } catch (error) {
          console.error(`Failed to load version from file ${file}:`, error);
        }
      }
      
      return versions;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  private async cleanupOldVersions(environment?: string, key?: string): Promise<void> {
    if (!this.options.maxVersions) {
      return;
    }

    await this.pruneVersions(environment, key);
  }

  private getVersionFilePath(versionId: string, environment?: string, key?: string): string {
    const dirPath = this.getVersionDirectoryPath(environment, key);
    return join(dirPath, `${versionId}.json`);
  }

  private getVersionDirectoryPath(environment?: string, key?: string): string {
    let path = this.basePath;
    
    if (environment) {
      path = join(path, environment);
    }
    
    if (key) {
      // Replace dots with slashes for nested directory structure
      const keyPath = key.replace(/\./g, '/');
      path = join(path, 'keys', keyPath);
    } else {
      path = join(path, 'full');
    }
    
    return path;
  }

  private getCacheKey(versionId: string, environment?: string): string {
    return `${versionId}:${environment || 'default'}`;
  }

  private generateVersionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `v${timestamp}-${random}`;
  }

  private calculateChecksum(data: any): string {
    const jsonString = JSON.stringify(data, Object.keys(data).sort());
    return createHash('sha256').update(jsonString).digest('hex');
  }

  private getCurrentUser(): string {
    // In a real implementation, this would get the current user from the authentication context
    return process.env.USER || process.env.USERNAME || 'system';
  }

  private setValueAtPath(obj: any, path: string, value: ConfigValue): void {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
  }

  private calculateDiff(config1: Configuration, config2: Configuration): ConfigurationDiff {
    const diff: ConfigurationDiff = {
      added: [],
      modified: [],
      removed: []
    };

    const keys1 = this.getAllKeys(config1);
    const keys2 = this.getAllKeys(config2);

    // Find added keys
    for (const key of keys2) {
      if (!keys1.includes(key)) {
        diff.added.push({
          key,
          value: this.getValueAtPath(config2, key)
        });
      }
    }

    // Find removed keys
    for (const key of keys1) {
      if (!keys2.includes(key)) {
        diff.removed.push({
          key,
          value: this.getValueAtPath(config1, key)
        });
      }
    }

    // Find modified keys
    for (const key of keys1) {
      if (keys2.includes(key)) {
        const value1 = this.getValueAtPath(config1, key);
        const value2 = this.getValueAtPath(config2, key);
        
        if (JSON.stringify(value1) !== JSON.stringify(value2)) {
          diff.modified.push({
            key,
            oldValue: value1,
            newValue: value2
          });
        }
      }
    }

    return diff;
  }

  private getAllKeys(obj: any, prefix = ''): string[] {
    const keys: string[] = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        keys.push(...this.getAllKeys(value, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    
    return keys;
  }

  private getValueAtPath(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  private async compressData(data: string): Promise<string> {
    // Placeholder for compression implementation
    // In a real implementation, you would use a compression library like zlib
    return data;
  }

  private async decompressData(data: string): Promise<string> {
    // Placeholder for decompression implementation
    return data;
  }

  private async encryptData(data: string): Promise<string> {
    // Placeholder for encryption implementation
    // In a real implementation, you would use proper encryption
    return data;
  }

  private async decryptData(data: string): Promise<string> {
    // Placeholder for decryption implementation
    return data;
  }
}

export interface ConfigurationDiff {
  added: Array<{ key: string; value: ConfigValue }>;
  modified: Array<{ key: string; oldValue: ConfigValue; newValue: ConfigValue }>;
  removed: Array<{ key: string; value: ConfigValue }>;
}