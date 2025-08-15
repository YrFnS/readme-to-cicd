/**
 * Configuration Management System
 * 
 * Provides comprehensive configuration loading, validation, and merging capabilities
 * using cosmiconfig for flexible configuration file discovery and loading.
 * Supports multiple configuration levels (user, project, organization) and formats.
 */

import { cosmiconfigSync } from 'cosmiconfig';
import { CosmiconfigResult } from 'cosmiconfig/dist/types';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { CLIConfig, ConfigurationSource, ConfigValidationResult } from './types';
import { DEFAULT_CONFIG } from './default-config';
import { validateConfiguration } from './validation';

export class ConfigurationManager {
  private readonly moduleName = 'readme-to-cicd';
  private readonly explorer = cosmiconfigSync(this.moduleName, {
    searchPlaces: [
      'package.json',
      `.${this.moduleName}.json`,
      `.${this.moduleName}.yaml`,
      `.${this.moduleName}.yml`,
      `.${this.moduleName}.js`,
      `.${this.moduleName}.config.js`,
      `${this.moduleName}.config.json`,
      `${this.moduleName}.config.yaml`,
      `${this.moduleName}.config.yml`
    ],
    packageProp: this.moduleName
  });

  /**
   * Loads and merges configuration from multiple sources
   */
  async loadConfiguration(configPath?: string): Promise<CLIConfig> {
    const sources = await this.discoverConfigurationSources(configPath);
    const mergedConfig = this.mergeConfigurations(sources);
    
    // Validate the final merged configuration
    const validation = validateConfiguration(mergedConfig);
    if (!validation.isValid) {
      throw new ConfigurationError(
        'Configuration validation failed',
        validation.errors.map(e => e.message).join('; ')
      );
    }

    return mergedConfig;
  }

  /**
   * Discovers all available configuration sources in priority order
   */
  private async discoverConfigurationSources(explicitPath?: string): Promise<ConfigurationSource[]> {
    const sources: ConfigurationSource[] = [];

    // 1. Explicit config file (highest priority)
    if (explicitPath) {
      const explicitSource = await this.loadConfigurationFile(explicitPath);
      if (explicitSource) {
        sources.push({
          path: explicitPath,
          type: 'project',
          format: this.detectFormat(explicitPath),
          priority: 1,
          ...explicitSource
        });
      }
    }

    // 2. Project-level configuration
    const projectConfig = this.explorer.search();
    if (projectConfig) {
      sources.push({
        path: projectConfig.filepath,
        type: 'project',
        format: this.detectFormat(projectConfig.filepath),
        priority: 2,
        config: projectConfig.config
      });
    }

    // 3. User-level configuration
    const userConfigPath = path.join(os.homedir(), `.${this.moduleName}.json`);
    const userConfig = await this.loadConfigurationFile(userConfigPath);
    if (userConfig) {
      sources.push({
        path: userConfigPath,
        type: 'user',
        format: 'json',
        priority: 3,
        config: userConfig.config
      });
    }

    // 4. Organization-level configuration (if specified in project config)
    const orgConfigPath = this.getOrganizationConfigPath(sources);
    if (orgConfigPath) {
      const orgConfig = await this.loadConfigurationFile(orgConfigPath);
      if (orgConfig) {
        sources.push({
          path: orgConfigPath,
          type: 'organization',
          format: this.detectFormat(orgConfigPath),
          priority: 4,
          config: orgConfig.config
        });
      }
    }

    return sources.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Loads a specific configuration file
   */
  private async loadConfigurationFile(filePath: string): Promise<{ config: any } | null> {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const result = this.explorer.load(filePath);
      return result;
    } catch (error) {
      throw new ConfigurationError(
        `Failed to load configuration from ${filePath}`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Merges configurations from multiple sources with proper precedence
   */
  private mergeConfigurations(sources: (ConfigurationSource & { config?: any })[]): CLIConfig {
    let mergedConfig = { ...DEFAULT_CONFIG };

    // Apply configurations in reverse priority order (lowest to highest)
    for (const source of sources.reverse()) {
      if (source.config) {
        mergedConfig = this.deepMerge(mergedConfig, source.config);
      }
    }

    return mergedConfig;
  }

  /**
   * Deep merges two configuration objects
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (this.isObject(source[key]) && this.isObject(target[key])) {
          result[key] = this.deepMerge(target[key], source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  /**
   * Checks if a value is a plain object
   */
  private isObject(value: any): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * Detects configuration file format from file extension
   */
  private detectFormat(filePath: string): 'json' | 'yaml' | 'js' | 'package.json' {
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath);

    if (basename === 'package.json') {
      return 'package.json';
    }

    switch (ext) {
      case '.yaml':
      case '.yml':
        return 'yaml';
      case '.js':
        return 'js';
      case '.json':
      default:
        return 'json';
    }
  }

  /**
   * Gets organization configuration path from project configuration
   */
  private getOrganizationConfigPath(sources: (ConfigurationSource & { config?: any })[]): string | null {
    for (const source of sources) {
      if (source.config?.organization?.configPath) {
        return source.config.organization.configPath;
      }
    }
    return null;
  }

  /**
   * Validates a configuration object
   */
  validateConfig(config: unknown): ConfigValidationResult {
    return validateConfiguration(config);
  }

  /**
   * Creates a sample configuration file
   */
  async createSampleConfig(outputPath: string = `.${this.moduleName}.json`): Promise<void> {
    const sampleConfig = {
      defaults: {
        outputDirectory: '.github/workflows',
        workflowTypes: ['ci', 'cd'],
        includeComments: true,
        optimizationLevel: 'standard'
      },
      templates: {
        customTemplates: './templates',
        organizationTemplates: '@company/cicd-templates'
      },
      organization: {
        requiredSecurityScans: true,
        mandatorySteps: ['security-scan', 'dependency-check'],
        allowedActions: ['actions/*', '@company/*']
      },
      output: {
        format: 'yaml',
        indentation: 2,
        includeMetadata: true,
        backupExisting: true
      },
      git: {
        autoCommit: false,
        commitMessage: 'feat: add automated CI/CD workflows',
        createPR: false
      },
      ui: {
        colorOutput: true,
        progressIndicators: true,
        verboseLogging: false,
        interactivePrompts: true
      }
    };

    try {
      await fs.promises.writeFile(
        outputPath,
        JSON.stringify(sampleConfig, null, 2),
        'utf8'
      );
    } catch (error) {
      throw new ConfigurationError(
        `Failed to create sample configuration at ${outputPath}`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Gets the default configuration
   */
  getDefaultConfig(): CLIConfig {
    return { ...DEFAULT_CONFIG };
  }

  /**
   * Resolves configuration file paths relative to the config file location
   */
  resolveConfigPaths(config: CLIConfig, configFilePath: string): CLIConfig {
    const configDir = path.dirname(configFilePath);
    const resolvedConfig = { ...config };

    // Resolve template paths
    if (resolvedConfig.templates.customTemplates) {
      resolvedConfig.templates.customTemplates = path.resolve(
        configDir,
        resolvedConfig.templates.customTemplates
      );
    }

    // Resolve output directory
    if (!path.isAbsolute(resolvedConfig.defaults.outputDirectory)) {
      resolvedConfig.defaults.outputDirectory = path.resolve(
        configDir,
        resolvedConfig.defaults.outputDirectory
      );
    }

    return resolvedConfig;
  }
}

/**
 * Custom error class for configuration-related errors
 */
export class ConfigurationError extends Error {
  constructor(
    message: string,
    public readonly details?: string,
    public readonly configPath?: string
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

// Export singleton instance
export const configurationManager = new ConfigurationManager();