/**
 * Version Manager
 * 
 * Manages API versions with backward compatibility,
 * deprecation management, and version lifecycle.
 */

import { EventEmitter } from 'events';
import type { APIVersion, VersionConfig } from './types';

export class VersionManager extends EventEmitter {
  private config: VersionConfig;
  private versions: Map<string, APIVersion> = new Map();

  constructor(config: VersionConfig) {
    super();
    this.config = config;
  }

  /**
   * Register a new API version
   */
  async registerVersion(version: APIVersion): Promise<void> {
    // Validate version format
    if (!this.isValidVersion(version.version)) {
      throw new Error(`Invalid version format: ${version.version}`);
    }

    // Check if version already exists
    if (this.versions.has(version.version)) {
      throw new Error(`Version already exists: ${version.version}`);
    }

    // Add to supported versions if not already there
    if (!this.config.supportedVersions.includes(version.version)) {
      this.config.supportedVersions.push(version.version);
      this.config.supportedVersions.sort(this.compareVersions.bind(this));
    }

    this.versions.set(version.version, version);
    this.emit('versionRegistered', version);
  }

  /**
   * Update an existing version
   */
  async updateVersion(versionNumber: string, updates: Partial<APIVersion>): Promise<void> {
    const version = this.versions.get(versionNumber);
    if (!version) {
      throw new Error(`Version not found: ${versionNumber}`);
    }

    const updatedVersion: APIVersion = {
      ...version,
      ...updates,
      version: versionNumber // Ensure version number doesn't change
    };

    this.versions.set(versionNumber, updatedVersion);
    this.emit('versionUpdated', updatedVersion);
  }

  /**
   * Deprecate a version
   */
  async deprecateVersion(versionNumber: string, sunsetDate?: Date): Promise<void> {
    const version = this.versions.get(versionNumber);
    if (!version) {
      throw new Error(`Version not found: ${versionNumber}`);
    }

    const now = new Date();
    const updatedVersion: APIVersion = {
      ...version,
      status: 'deprecated',
      deprecationDate: now,
      sunsetDate: sunsetDate || new Date(now.getTime() + (this.config.deprecationWarnings ? 90 : 30) * 24 * 60 * 60 * 1000)
    };

    this.versions.set(versionNumber, updatedVersion);
    this.emit('versionDeprecated', updatedVersion);
  }

  /**
   * Mark a version as sunset (end of life)
   */
  async sunsetVersion(versionNumber: string): Promise<void> {
    const version = this.versions.get(versionNumber);
    if (!version) {
      throw new Error(`Version not found: ${versionNumber}`);
    }

    const updatedVersion: APIVersion = {
      ...version,
      status: 'sunset',
      sunsetDate: new Date()
    };

    this.versions.set(versionNumber, updatedVersion);
    this.emit('versionSunset', updatedVersion);
  }

  /**
   * Remove a version completely
   */
  async removeVersion(versionNumber: string): Promise<void> {
    const version = this.versions.get(versionNumber);
    if (!version) {
      throw new Error(`Version not found: ${versionNumber}`);
    }

    // Don't allow removing the default version
    if (versionNumber === this.config.defaultVersion) {
      throw new Error('Cannot remove the default version');
    }

    this.versions.delete(versionNumber);
    
    // Remove from supported versions
    const index = this.config.supportedVersions.indexOf(versionNumber);
    if (index > -1) {
      this.config.supportedVersions.splice(index, 1);
    }

    this.emit('versionRemoved', version);
  }

  /**
   * Get a specific version
   */
  getVersion(versionNumber: string): APIVersion | undefined {
    return this.versions.get(versionNumber);
  }

  /**
   * Get all versions
   */
  getAllVersions(): APIVersion[] {
    return Array.from(this.versions.values());
  }

  /**
   * Get active versions
   */
  getActiveVersions(): APIVersion[] {
    return Array.from(this.versions.values()).filter(v => v.status === 'active');
  }

  /**
   * Get deprecated versions
   */
  getDeprecatedVersions(): APIVersion[] {
    return Array.from(this.versions.values()).filter(v => v.status === 'deprecated');
  }

  /**
   * Get sunset versions
   */
  getSunsetVersions(): APIVersion[] {
    return Array.from(this.versions.values()).filter(v => v.status === 'sunset');
  }

  /**
   * Get supported version numbers
   */
  getSupportedVersions(): string[] {
    return [...this.config.supportedVersions];
  }

  /**
   * Get the default version
   */
  getDefaultVersion(): string {
    return this.config.defaultVersion;
  }

  /**
   * Set the default version
   */
  setDefaultVersion(versionNumber: string): void {
    if (!this.versions.has(versionNumber)) {
      throw new Error(`Version not found: ${versionNumber}`);
    }

    const version = this.versions.get(versionNumber)!;
    if (version.status !== 'active') {
      throw new Error(`Cannot set non-active version as default: ${versionNumber}`);
    }

    this.config.defaultVersion = versionNumber;
    this.emit('defaultVersionChanged', versionNumber);
  }

  /**
   * Check if a version is supported
   */
  isSupported(versionNumber: string): boolean {
    return this.config.supportedVersions.includes(versionNumber);
  }

  /**
   * Check if a version is deprecated
   */
  isDeprecated(versionNumber: string): boolean {
    const version = this.versions.get(versionNumber);
    return version ? version.status === 'deprecated' || version.status === 'sunset' : false;
  }

  /**
   * Check if a version is sunset
   */
  isSunset(versionNumber: string): boolean {
    const version = this.versions.get(versionNumber);
    return version ? version.status === 'sunset' : false;
  }

  /**
   * Extract version from request
   */
  extractVersion(request: {
    headers?: Record<string, string>;
    query?: Record<string, any>;
    path?: string;
  }): string {
    let version: string | undefined;

    switch (this.config.strategy) {
      case 'header':
        version = request.headers?.[this.config.headerName || 'api-version'];
        break;
      
      case 'query':
        version = request.query?.[this.config.queryParam || 'version'];
        break;
      
      case 'path':
        if (request.path && this.config.pathPrefix) {
          const match = request.path.match(new RegExp(`^${this.config.pathPrefix}/(v\\d+(?:\\.\\d+)*)`));
          version = match?.[1];
        }
        break;
    }

    // Return default version if none specified or invalid
    if (!version || !this.isSupported(version)) {
      return this.config.defaultVersion;
    }

    return version;
  }

  /**
   * Get deprecation headers for a version
   */
  getDeprecationHeaders(versionNumber: string): Record<string, string> {
    const version = this.versions.get(versionNumber);
    const headers: Record<string, string> = {};

    if (version && version.status === 'deprecated') {
      if (this.config.deprecationWarnings) {
        headers['Deprecation'] = 'true';
        
        if (version.sunsetDate) {
          headers['Sunset'] = version.sunsetDate.toISOString();
        }
        
        // Add link to migration guide or newer version
        const newerVersions = this.getActiveVersions()
          .filter(v => this.compareVersions(v.version, versionNumber) > 0)
          .sort((a, b) => this.compareVersions(a.version, b.version));
        
        if (newerVersions.length > 0) {
          headers['Link'] = `<${this.getVersionURL(newerVersions[0].version)}>; rel="successor-version"`;
        }
      }
    }

    return headers;
  }

  /**
   * Get version compatibility info
   */
  getCompatibilityInfo(fromVersion: string, toVersion: string): {
    compatible: boolean;
    breakingChanges: string[];
    migrationRequired: boolean;
  } {
    const from = this.versions.get(fromVersion);
    const to = this.versions.get(toVersion);

    if (!from || !to) {
      return {
        compatible: false,
        breakingChanges: ['Version not found'],
        migrationRequired: true
      };
    }

    // If versions are the same, they're compatible
    if (fromVersion === toVersion) {
      return {
        compatible: true,
        breakingChanges: [],
        migrationRequired: false
      };
    }

    // Collect breaking changes between versions
    const breakingChanges: string[] = [];
    const versions = this.getVersionsBetween(fromVersion, toVersion);

    for (const version of versions) {
      breakingChanges.push(...version.breakingChanges);
    }

    return {
      compatible: breakingChanges.length === 0,
      breakingChanges,
      migrationRequired: breakingChanges.length > 0
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<VersionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }

  /**
   * Get version statistics
   */
  getVersionStats(): {
    total: number;
    active: number;
    deprecated: number;
    sunset: number;
    oldestVersion: string;
    newestVersion: string;
  } {
    const versions = Array.from(this.versions.values());
    const sortedVersions = versions.sort((a, b) => this.compareVersions(a.version, b.version));

    return {
      total: versions.length,
      active: versions.filter(v => v.status === 'active').length,
      deprecated: versions.filter(v => v.status === 'deprecated').length,
      sunset: versions.filter(v => v.status === 'sunset').length,
      oldestVersion: sortedVersions[0]?.version || '',
      newestVersion: sortedVersions[sortedVersions.length - 1]?.version || ''
    };
  }

  /**
   * Validate version format
   */
  private isValidVersion(version: string): boolean {
    // Support semantic versioning (e.g., v1.0.0, v2.1.3) and simple versioning (e.g., v1, v2)
    return /^v?\d+(\.\d+)*$/.test(version);
  }

  /**
   * Compare two version strings
   */
  private compareVersions(a: string, b: string): number {
    const aParts = a.replace(/^v/, '').split('.').map(Number);
    const bParts = b.replace(/^v/, '').split('.').map(Number);
    
    const maxLength = Math.max(aParts.length, bParts.length);
    
    for (let i = 0; i < maxLength; i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      
      if (aPart < bPart) return -1;
      if (aPart > bPart) return 1;
    }
    
    return 0;
  }

  /**
   * Get versions between two version numbers
   */
  private getVersionsBetween(fromVersion: string, toVersion: string): APIVersion[] {
    const versions = Array.from(this.versions.values());
    return versions.filter(v => {
      const comparison1 = this.compareVersions(v.version, fromVersion);
      const comparison2 = this.compareVersions(v.version, toVersion);
      return comparison1 > 0 && comparison2 <= 0;
    }).sort((a, b) => this.compareVersions(a.version, b.version));
  }

  /**
   * Get URL for a version (mock implementation)
   */
  private getVersionURL(version: string): string {
    return `/api/${version}`;
  }
}