/**
 * Configuration Export/Import System
 * 
 * Handles exporting and importing CLI configurations, templates, and policies
 * as portable packages with metadata and compatibility validation.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { CLIConfig, CLIError, FrameworkConflict, ConflictResolution } from './types';

export interface ExportableConfig {
  metadata: ConfigMetadata;
  configuration: CLIConfig;
  templates?: Record<string, string>;
  policies?: Record<string, any>;
  customFiles?: Record<string, string>;
}

export interface ConfigMetadata {
  version: string;
  exportedAt: string;
  exportedBy: string;
  toolVersion: string;
  description?: string;
  tags?: string[];
  compatibility: CompatibilityInfo;
}

export interface CompatibilityInfo {
  minToolVersion: string;
  maxToolVersion?: string;
  requiredFeatures: string[];
  supportedPlatforms: string[];
  dependencies?: Record<string, string>;
}

export interface ImportOptions {
  merge: boolean;
  overwriteExisting: boolean;
  validateCompatibility: boolean;
  backupExisting: boolean;
  conflictResolution: 'prompt' | 'keep-existing' | 'use-imported' | 'merge-smart';
}

export interface ImportResult {
  success: boolean;
  configPath: string;
  conflicts: ConfigConflict[];
  resolutions: ConflictResolution[];
  backupPath?: string;
  warnings: string[];
  errors: CLIError[];
}

export interface ConfigConflict {
  id: string;
  type: 'template-override' | 'policy-conflict' | 'setting-mismatch' | 'version-incompatible';
  path: string;
  existingValue: any;
  importedValue: any;
  description: string;
  severity: 'low' | 'medium' | 'high';
  autoResolvable: boolean;
}

export class ConfigExporter {
  private readonly toolVersion = '1.0.0';
  private readonly supportedFormats = ['json', 'yaml'];

  /**
   * Export current configuration to a portable package
   */
  async exportConfiguration(
    configPath: string,
    outputPath: string,
    options: {
      includeTemplates?: boolean;
      includePolicies?: boolean;
      includeCustomFiles?: boolean;
      description?: string;
      tags?: string[];
    } = {}
  ): Promise<ExportableConfig> {
    try {
      // Load current configuration
      const config = await this.loadConfiguration(configPath);
      
      // Create metadata
      const metadata: any = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        exportedBy: process.env.USER || process.env.USERNAME || 'unknown',
        toolVersion: this.toolVersion,
        compatibility: {
          minToolVersion: '1.0.0',
          requiredFeatures: this.extractRequiredFeatures(config),
          supportedPlatforms: ['win32', 'darwin', 'linux'],
          dependencies: await this.extractDependencies(configPath)
        }
      };
      
      // Add optional properties if they exist
      if (options.description) {
        metadata.description = options.description;
      }
      if (options.tags) {
        metadata.tags = options.tags;
      }

      // Build exportable package
      const exportableConfig: ExportableConfig = {
        metadata,
        configuration: config
      };

      // Include templates if requested
      if (options.includeTemplates && config.templates.customTemplates) {
        exportableConfig.templates = await this.loadTemplates(config.templates.customTemplates);
      }

      // Include policies if requested
      if (options.includePolicies) {
        exportableConfig.policies = await this.loadPolicies(config);
      }

      // Include custom files if requested
      if (options.includeCustomFiles) {
        exportableConfig.customFiles = await this.loadCustomFiles(configPath);
      }

      // Write to output file
      await this.writeExportFile(outputPath, exportableConfig);

      return exportableConfig;
    } catch (error) {
      throw this.createExportError(error as Error, outputPath);
    }
  }

  /**
   * Import configuration from exported package
   */
  async importConfiguration(
    importPath: string,
    targetConfigPath: string,
    options: ImportOptions
  ): Promise<ImportResult> {
    try {
      // Load and validate import package
      const importedConfig = await this.loadImportPackage(importPath);
      
      // Validate compatibility
      if (options.validateCompatibility) {
        await this.validateCompatibility(importedConfig.metadata);
      }

      // Load existing configuration if it exists
      let existingConfig: CLIConfig | null = null;
      const configExists = await this.fileExists(targetConfigPath);
      
      if (configExists) {
        existingConfig = await this.loadConfiguration(targetConfigPath);
      }

      // Detect conflicts
      const conflicts = existingConfig 
        ? await this.detectConflicts(existingConfig, importedConfig.configuration)
        : [];

      // Create backup if requested
      let backupPath: string | undefined;
      if (options.backupExisting && configExists) {
        backupPath = await this.createBackup(targetConfigPath);
      }

      // Resolve conflicts
      const resolutions = await this.resolveConflicts(conflicts, options.conflictResolution);

      // Apply configuration
      const finalConfig = options.merge && existingConfig
        ? await this.mergeConfigurations(existingConfig, importedConfig.configuration, resolutions)
        : importedConfig.configuration;

      // Write final configuration
      await this.writeConfiguration(targetConfigPath, finalConfig);

      // Import templates and policies
      const warnings: string[] = [];
      if (importedConfig.templates) {
        const templateWarnings = await this.importTemplates(importedConfig.templates, finalConfig);
        warnings.push(...templateWarnings);
      }

      if (importedConfig.policies) {
        const policyWarnings = await this.importPolicies(importedConfig.policies, finalConfig);
        warnings.push(...policyWarnings);
      }

      const result: any = {
        success: true,
        configPath: targetConfigPath,
        conflicts,
        resolutions,
        warnings,
        errors: []
      };
      
      if (backupPath) {
        result.backupPath = backupPath;
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        configPath: targetConfigPath,
        conflicts: [],
        resolutions: [],
        warnings: [],
        errors: [this.createImportError(error as Error, importPath)]
      };
    }
  }

  /**
   * Load configuration from file
   */
  private async loadConfiguration(configPath: string): Promise<CLIConfig> {
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(content) as CLIConfig;
    } catch (error) {
      throw new Error(`Failed to load configuration from ${configPath}: ${(error as Error).message}`);
    }
  }

  /**
   * Extract required features from configuration
   */
  private extractRequiredFeatures(config: CLIConfig): string[] {
    const features: string[] = [];
    
    if (config.templates.customTemplates) {
      features.push('custom-templates');
    }
    
    if (config.organization.requiredSecurityScans) {
      features.push('security-scanning');
    }
    
    if (config.git.autoCommit) {
      features.push('git-integration');
    }
    
    if (config.ui.interactivePrompts) {
      features.push('interactive-mode');
    }
    
    return features;
  }

  /**
   * Extract dependencies from configuration directory
   */
  private async extractDependencies(configPath: string): Promise<Record<string, string>> {
    const dependencies: Record<string, string> = {};
    
    try {
      const configDir = path.dirname(configPath);
      const packageJsonPath = path.join(configDir, 'package.json');
      
      if (await this.fileExists(packageJsonPath)) {
        const packageContent = await fs.readFile(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(packageContent);
        
        if (packageJson.dependencies) {
          Object.assign(dependencies, packageJson.dependencies);
        }
      }
    } catch (error) {
      // Dependencies are optional, continue without them
    }
    
    return dependencies;
  }

  /**
   * Load templates from template directory
   */
  private async loadTemplates(templatePath: string): Promise<Record<string, string>> {
    const templates: Record<string, string> = {};
    
    try {
      if (await this.fileExists(templatePath)) {
        const stats = await fs.stat(templatePath);
        
        if (stats.isDirectory()) {
          const files = await fs.readdir(templatePath, { recursive: true });
          
          for (const file of files) {
            const fullPath = path.join(templatePath, file);
            const fileStats = await fs.stat(fullPath);
            
            if (fileStats.isFile() && (file.endsWith('.yaml') || file.endsWith('.yml') || file.endsWith('.hbs'))) {
              const content = await fs.readFile(fullPath, 'utf-8');
              templates[file] = content;
            }
          }
        } else {
          // Single template file
          const content = await fs.readFile(templatePath, 'utf-8');
          templates[path.basename(templatePath)] = content;
        }
      }
    } catch (error) {
      // Templates are optional, continue without them
    }
    
    return templates;
  }

  /**
   * Load organization policies
   */
  private async loadPolicies(config: CLIConfig): Promise<Record<string, any>> {
    return {
      organization: config.organization,
      security: {
        requiredScans: config.organization.requiredSecurityScans,
        mandatorySteps: config.organization.mandatorySteps,
        allowedActions: config.organization.allowedActions
      },
      compliance: {
        branchProtection: config.organization.enforceBranchProtection,
        codeReview: config.organization.requireCodeReview
      }
    };
  }

  /**
   * Load custom files from configuration directory
   */
  private async loadCustomFiles(configPath: string): Promise<Record<string, string>> {
    const customFiles: Record<string, string> = {};
    
    try {
      const configDir = path.dirname(configPath);
      const customDir = path.join(configDir, 'custom');
      
      if (await this.fileExists(customDir)) {
        const files = await fs.readdir(customDir, { recursive: true });
        
        for (const file of files) {
          const fullPath = path.join(customDir, file);
          const fileStats = await fs.stat(fullPath);
          
          if (fileStats.isFile()) {
            const content = await fs.readFile(fullPath, 'utf-8');
            customFiles[file] = content;
          }
        }
      }
    } catch (error) {
      // Custom files are optional
    }
    
    return customFiles;
  }

  /**
   * Write export package to file
   */
  private async writeExportFile(outputPath: string, config: ExportableConfig): Promise<void> {
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });
    
    const content = JSON.stringify(config, null, 2);
    await fs.writeFile(outputPath, content, 'utf-8');
  }

  /**
   * Load import package from file
   */
  private async loadImportPackage(importPath: string): Promise<ExportableConfig> {
    try {
      const content = await fs.readFile(importPath, 'utf-8');
      const config = JSON.parse(content) as ExportableConfig;
      
      // Validate package structure
      if (!config.metadata || !config.configuration) {
        throw new Error('Invalid export package: missing required metadata or configuration');
      }
      
      return config;
    } catch (error) {
      throw new Error(`Failed to load import package from ${importPath}: ${(error as Error).message}`);
    }
  }

  /**
   * Validate compatibility of imported configuration
   */
  private async validateCompatibility(metadata: ConfigMetadata): Promise<void> {
    const compatibility = metadata.compatibility;
    
    // Check tool version compatibility
    if (this.isVersionIncompatible(this.toolVersion, compatibility.minToolVersion, compatibility.maxToolVersion)) {
      throw new Error(
        `Configuration requires tool version ${compatibility.minToolVersion}${
          compatibility.maxToolVersion ? `-${compatibility.maxToolVersion}` : '+'
        }, but current version is ${this.toolVersion}`
      );
    }
    
    // Check required features
    const unsupportedFeatures = compatibility.requiredFeatures.filter(
      feature => !this.isFeatureSupported(feature)
    );
    
    if (unsupportedFeatures.length > 0) {
      throw new Error(`Configuration requires unsupported features: ${unsupportedFeatures.join(', ')}`);
    }
    
    // Check platform compatibility
    const currentPlatform = process.platform;
    if (!compatibility.supportedPlatforms.includes(currentPlatform)) {
      throw new Error(
        `Configuration is not compatible with platform ${currentPlatform}. ` +
        `Supported platforms: ${compatibility.supportedPlatforms.join(', ')}`
      );
    }
  }

  /**
   * Detect conflicts between existing and imported configurations
   */
  private async detectConflicts(
    existing: CLIConfig,
    imported: CLIConfig
  ): Promise<ConfigConflict[]> {
    const conflicts: ConfigConflict[] = [];
    
    // Check template conflicts
    if (existing.templates.customTemplates && imported.templates.customTemplates) {
      if (existing.templates.customTemplates !== imported.templates.customTemplates) {
        conflicts.push({
          id: 'template-path-conflict',
          type: 'template-override',
          path: 'templates.customTemplates',
          existingValue: existing.templates.customTemplates,
          importedValue: imported.templates.customTemplates,
          description: 'Custom template paths differ between configurations',
          severity: 'medium',
          autoResolvable: true
        });
      }
    }
    
    // Check organization policy conflicts
    if (existing.organization.requiredSecurityScans !== imported.organization.requiredSecurityScans) {
      conflicts.push({
        id: 'security-scan-policy',
        type: 'policy-conflict',
        path: 'organization.requiredSecurityScans',
        existingValue: existing.organization.requiredSecurityScans,
        importedValue: imported.organization.requiredSecurityScans,
        description: 'Security scan requirements differ',
        severity: 'high',
        autoResolvable: false
      });
    }
    
    // Check output format conflicts
    if (existing.output.format !== imported.output.format) {
      conflicts.push({
        id: 'output-format-conflict',
        type: 'setting-mismatch',
        path: 'output.format',
        existingValue: existing.output.format,
        importedValue: imported.output.format,
        description: 'Output format preferences differ',
        severity: 'low',
        autoResolvable: true
      });
    }
    
    // Check Git configuration conflicts
    if (existing.git.autoCommit !== imported.git.autoCommit) {
      conflicts.push({
        id: 'git-autocommit-conflict',
        type: 'setting-mismatch',
        path: 'git.autoCommit',
        existingValue: existing.git.autoCommit,
        importedValue: imported.git.autoCommit,
        description: 'Git auto-commit settings differ',
        severity: 'medium',
        autoResolvable: true
      });
    }
    
    return conflicts;
  }

  /**
   * Resolve configuration conflicts
   */
  private async resolveConflicts(
    conflicts: ConfigConflict[],
    strategy: ImportOptions['conflictResolution']
  ): Promise<ConflictResolution[]> {
    const resolutions: ConflictResolution[] = [];
    
    for (const conflict of conflicts) {
      let resolution: ConflictResolution;
      
      switch (strategy) {
        case 'keep-existing':
          resolution = {
            conflictId: conflict.id,
            resolution: 'keep-all' // Keep existing value
          };
          break;
          
        case 'use-imported':
          resolution = {
            conflictId: conflict.id,
            resolution: 'select-primary' // Use imported value
          };
          break;
          
        case 'merge-smart':
          resolution = conflict.autoResolvable
            ? {
                conflictId: conflict.id,
                resolution: 'merge'
              }
            : {
                conflictId: conflict.id,
                resolution: 'keep-all' // Default to existing for non-auto-resolvable
              };
          break;
          
        case 'prompt':
        default:
          // For now, default to keeping existing values
          // In a real implementation, this would prompt the user
          resolution = {
            conflictId: conflict.id,
            resolution: 'keep-all'
          };
          break;
      }
      
      resolutions.push(resolution);
    }
    
    return resolutions;
  }

  /**
   * Merge configurations based on conflict resolutions
   */
  private async mergeConfigurations(
    existing: CLIConfig,
    imported: CLIConfig,
    resolutions: ConflictResolution[]
  ): Promise<CLIConfig> {
    // Start with existing configuration
    const merged: CLIConfig = JSON.parse(JSON.stringify(existing));
    
    // Apply resolutions
    for (const resolution of resolutions) {
      switch (resolution.resolution) {
        case 'select-primary':
          // Use imported value - apply the imported configuration selectively
          this.applyImportedValue(merged, imported, resolution.conflictId);
          break;
          
        case 'merge':
          // Smart merge - combine values where possible
          this.smartMergeValue(merged, imported, resolution.conflictId);
          break;
          
        case 'keep-all':
        default:
          // Keep existing value - no action needed
          break;
      }
    }
    
    // For non-conflicting values, use imported values
    this.mergeNonConflictingValues(merged, imported, resolutions);
    
    return merged;
  }

  /**
   * Apply imported value for specific conflict
   */
  private applyImportedValue(merged: CLIConfig, imported: CLIConfig, conflictId: string): void {
    switch (conflictId) {
      case 'template-path-conflict':
        if (imported.templates.customTemplates) {
          merged.templates.customTemplates = imported.templates.customTemplates;
        }
        break;
      case 'security-scan-policy':
        if (imported.organization.requiredSecurityScans !== undefined) {
          merged.organization.requiredSecurityScans = imported.organization.requiredSecurityScans;
        }
        break;
      case 'output-format-conflict':
        merged.output.format = imported.output.format;
        break;
      case 'git-autocommit-conflict':
        merged.git.autoCommit = imported.git.autoCommit;
        break;
    }
  }

  /**
   * Smart merge value for specific conflict
   */
  private smartMergeValue(merged: CLIConfig, imported: CLIConfig, conflictId: string): void {
    switch (conflictId) {
      case 'template-path-conflict':
        // For template paths, prefer imported if it's more specific
        if (imported.templates.customTemplates && imported.templates.customTemplates.length > (merged.templates.customTemplates?.length || 0)) {
          merged.templates.customTemplates = imported.templates.customTemplates;
        }
        break;
      case 'output-format-conflict':
        // For output format, prefer YAML as it's more readable
        merged.output.format = imported.output.format === 'yaml' ? 'yaml' : merged.output.format;
        break;
    }
  }

  /**
   * Merge non-conflicting values from imported configuration
   */
  private mergeNonConflictingValues(merged: CLIConfig, imported: CLIConfig, resolutions: ConflictResolution[]): void {
    const conflictPaths = new Set(resolutions.map(r => this.getConflictPath(r.conflictId)));
    
    // Merge defaults if not conflicting
    if (!conflictPaths.has('defaults')) {
      Object.assign(merged.defaults, imported.defaults);
    }
    
    // Merge template overrides
    if (imported.templates.templateOverrides) {
      merged.templates.templateOverrides = {
        ...merged.templates.templateOverrides,
        ...imported.templates.templateOverrides
      };
    }
    
    // Merge UI settings if not conflicting
    if (!conflictPaths.has('ui')) {
      Object.assign(merged.ui, imported.ui);
    }
  }

  /**
   * Get configuration path for conflict ID
   */
  private getConflictPath(conflictId: string): string {
    const pathMap: Record<string, string> = {
      'template-path-conflict': 'templates',
      'security-scan-policy': 'organization',
      'output-format-conflict': 'output',
      'git-autocommit-conflict': 'git'
    };
    
    return pathMap[conflictId] || '';
  }  
/**
   * Write configuration to file
   */
  private async writeConfiguration(configPath: string, config: CLIConfig): Promise<void> {
    const configDir = path.dirname(configPath);
    await fs.mkdir(configDir, { recursive: true });
    
    const content = JSON.stringify(config, null, 2);
    await fs.writeFile(configPath, content, 'utf-8');
  }

  /**
   * Import templates from exported package
   */
  private async importTemplates(
    templates: Record<string, string>,
    config: CLIConfig
  ): Promise<string[]> {
    const warnings: string[] = [];
    
    if (!config.templates.customTemplates) {
      warnings.push('No custom template directory configured, skipping template import');
      return warnings;
    }
    
    try {
      const templateDir = config.templates.customTemplates;
      await fs.mkdir(templateDir, { recursive: true });
      
      for (const [filename, content] of Object.entries(templates)) {
        const templatePath = path.join(templateDir, filename);
        const templateSubDir = path.dirname(templatePath);
        
        // Create subdirectories if needed
        if (templateSubDir !== templateDir) {
          await fs.mkdir(templateSubDir, { recursive: true });
        }
        
        // Check if file already exists
        if (await this.fileExists(templatePath)) {
          warnings.push(`Template file ${filename} already exists, skipping`);
          continue;
        }
        
        await fs.writeFile(templatePath, content, 'utf-8');
      }
    } catch (error) {
      warnings.push(`Failed to import templates: ${(error as Error).message}`);
    }
    
    return warnings;
  }

  /**
   * Import policies from exported package
   */
  private async importPolicies(
    policies: Record<string, any>,
    config: CLIConfig
  ): Promise<string[]> {
    const warnings: string[] = [];
    
    try {
      // Apply organization policies
      if (policies.organization) {
        Object.assign(config.organization, policies.organization);
      }
      
      // Apply security policies
      if (policies.security) {
        if (policies.security.requiredScans !== undefined) {
          config.organization.requiredSecurityScans = policies.security.requiredScans;
        }
        if (policies.security.mandatorySteps) {
          config.organization.mandatorySteps = policies.security.mandatorySteps;
        }
        if (policies.security.allowedActions) {
          config.organization.allowedActions = policies.security.allowedActions;
        }
      }
      
      // Apply compliance policies
      if (policies.compliance) {
        if (policies.compliance.branchProtection !== undefined) {
          config.organization.enforceBranchProtection = policies.compliance.branchProtection;
        }
        if (policies.compliance.codeReview !== undefined) {
          config.organization.requireCodeReview = policies.compliance.codeReview;
        }
      }
    } catch (error) {
      warnings.push(`Failed to import policies: ${(error as Error).message}`);
    }
    
    return warnings;
  }

  /**
   * Create backup of existing configuration
   */
  private async createBackup(configPath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${configPath}.backup.${timestamp}`;
    
    await fs.copyFile(configPath, backupPath);
    return backupPath;
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if version is incompatible
   */
  private isVersionIncompatible(
    currentVersion: string,
    minVersion: string,
    maxVersion?: string
  ): boolean {
    // Simple version comparison - in production, use a proper semver library
    const current = this.parseVersion(currentVersion);
    const min = this.parseVersion(minVersion);
    const max = maxVersion ? this.parseVersion(maxVersion) : null;
    
    if (this.compareVersions(current, min) < 0) {
      return true; // Current version is too old
    }
    
    if (max && this.compareVersions(current, max) > 0) {
      return true; // Current version is too new
    }
    
    return false;
  }

  /**
   * Parse version string into comparable format
   */
  private parseVersion(version: string): number[] {
    return version.split('.').map(part => parseInt(part, 10) || 0);
  }

  /**
   * Compare two version arrays
   */
  private compareVersions(a: number[], b: number[]): number {
    const maxLength = Math.max(a.length, b.length);
    
    for (let i = 0; i < maxLength; i++) {
      const aVal = a[i] || 0;
      const bVal = b[i] || 0;
      
      if (aVal < bVal) {return -1;}
      if (aVal > bVal) {return 1;}
    }
    
    return 0;
  }

  /**
   * Check if feature is supported
   */
  private isFeatureSupported(feature: string): boolean {
    const supportedFeatures = [
      'custom-templates',
      'security-scanning',
      'git-integration',
      'interactive-mode',
      'batch-processing',
      'workflow-validation'
    ];
    
    return supportedFeatures.includes(feature);
  }

  /**
   * Create export error
   */
  private createExportError(error: Error, outputPath: string): CLIError {
    return {
      code: 'EXPORT_ERROR',
      message: `Failed to export configuration to ${outputPath}: ${error.message}`,
      category: 'file-system',
      severity: 'error',
      suggestions: [
        'Check if output directory is writable',
        'Verify configuration file exists and is valid',
        'Ensure sufficient disk space'
      ],
      context: { outputPath, originalError: error.message }
    };
  }

  /**
   * Create import error
   */
  private createImportError(error: Error, importPath: string): CLIError {
    return {
      code: 'IMPORT_ERROR',
      message: `Failed to import configuration from ${importPath}: ${error.message}`,
      category: 'file-system',
      severity: 'error',
      suggestions: [
        'Check if import file exists and is readable',
        'Verify import file is a valid configuration package',
        'Check file format and structure'
      ],
      context: { importPath, originalError: error.message }
    };
  }
}