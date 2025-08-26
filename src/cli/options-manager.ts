/**
 * Options Manager Implementation
 * 
 * Handles updating and persisting CLI configuration options with proper validation
 * and merge logic for option updates.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { CLIOptions } from './lib/types';

export interface OptionsManagerConfig {
  configPath?: string;
  createBackup?: boolean;
  validateOptions?: boolean;
}

export class OptionsManagerError extends Error {
  constructor(message: string, public readonly operation: string, public readonly cause?: Error) {
    super(`OptionsManager ${operation} failed: ${message}`);
    this.name = 'OptionsManagerError';
  }
}

export class OptionsManager {
  private options: Partial<CLIOptions> = {};
  private configPath: string;
  private config: OptionsManagerConfig;

  constructor(config: OptionsManagerConfig = {}) {
    this.config = {
      configPath: config.configPath || '.readme-to-cicd.json',
      createBackup: config.createBackup ?? true,
      validateOptions: config.validateOptions ?? true,
      ...config
    };
    
    this.configPath = path.resolve(this.config.configPath!);
  }

  /**
   * Updates CLI options with new values and persists changes
   * @param newOptions Partial options to update
   */
  async updateOptions(newOptions: Partial<CLIOptions>): Promise<void> {
    if (!newOptions || typeof newOptions !== 'object') {
      throw new OptionsManagerError('Invalid options provided', 'validation');
    }

    try {
      // Load existing options if they exist
      await this.loadExistingOptions();

      // Validate new options if validation is enabled
      if (this.config.validateOptions) {
        this.validateOptions(newOptions);
      }

      // Merge options
      const mergedOptions = this.mergeOptions(this.options, newOptions);

      // Create backup if enabled
      if (this.config.createBackup) {
        await this.createBackup();
      }

      // Update internal options
      this.options = mergedOptions;

      // Persist options to configuration file
      await this.persistOptions();

    } catch (error) {
      if (error instanceof OptionsManagerError) {
        throw error;
      }
      throw new OptionsManagerError(
        `Failed to update options: ${error instanceof Error ? error.message : String(error)}`,
        'update',
        error as Error
      );
    }
  }

  /**
   * Gets the current options
   * @returns Current CLI options
   */
  getOptions(): Partial<CLIOptions> {
    return { ...this.options };
  }

  /**
   * Loads options from the configuration file
   * @returns Current CLI options
   */
  async loadOptions(): Promise<Partial<CLIOptions>> {
    await this.loadExistingOptions();
    return this.getOptions();
  }

  /**
   * Resets options to default values
   */
  async resetOptions(): Promise<void> {
    try {
      // Create backup if enabled
      if (this.config.createBackup) {
        await this.createBackup();
      }

      // Reset to default options
      this.options = this.getDefaultOptions();

      // Persist the reset options
      await this.persistOptions();

    } catch (error) {
      throw new OptionsManagerError(
        `Failed to reset options: ${error instanceof Error ? error.message : String(error)}`,
        'reset',
        error as Error
      );
    }
  }

  /**
   * Loads existing options from the configuration file
   */
  private async loadExistingOptions(): Promise<void> {
    try {
      await fs.access(this.configPath);
      const configContent = await fs.readFile(this.configPath, 'utf8');
      
      if (configContent.trim()) {
        const parsedOptions = JSON.parse(configContent);
        if (typeof parsedOptions === 'object' && parsedOptions !== null) {
          this.options = parsedOptions;
        } else {
          this.options = this.getDefaultOptions();
        }
      } else {
        this.options = this.getDefaultOptions();
      }
    } catch (error) {
      // File doesn't exist or is invalid, start with defaults
      this.options = this.getDefaultOptions();
    }
  }

  /**
   * Validates the provided options
   * @param options Options to validate
   */
  private validateOptions(options: Partial<CLIOptions>): void {
    // Validate command if provided
    if (options.command) {
      const validCommands = ['generate', 'validate', 'init', 'export', 'import'];
      if (!validCommands.includes(options.command)) {
        throw new OptionsManagerError(
          `Invalid command: ${options.command}. Valid commands: ${validCommands.join(', ')}`,
          'validation'
        );
      }
    }

    // Validate template if provided
    if (options.template) {
      const validTemplates = ['basic', 'enterprise', 'team'];
      if (!validTemplates.includes(options.template)) {
        throw new OptionsManagerError(
          `Invalid template: ${options.template}. Valid templates: ${validTemplates.join(', ')}`,
          'validation'
        );
      }
    }

    // Validate boolean options
    const booleanOptions = ['dryRun', 'interactive', 'verbose', 'debug', 'quiet', 'ci', 'merge', 'recursive', 'parallel'];
    for (const option of booleanOptions) {
      if (options[option] !== undefined && typeof options[option] !== 'boolean') {
        throw new OptionsManagerError(
          `Option ${option} must be a boolean, got ${typeof options[option]}`,
          'validation'
        );
      }
    }

    // Validate string options
    const stringOptions = ['readmePath', 'outputDir', 'config', 'output', 'configFile'];
    for (const option of stringOptions) {
      if (options[option] !== undefined && typeof options[option] !== 'string') {
        throw new OptionsManagerError(
          `Option ${option} must be a string, got ${typeof options[option]}`,
          'validation'
        );
      }
    }

    // Validate array options
    const arrayOptions = ['workflowType', 'framework', 'directories'];
    for (const option of arrayOptions) {
      if (options[option] !== undefined && !Array.isArray(options[option])) {
        throw new OptionsManagerError(
          `Option ${option} must be an array, got ${typeof options[option]}`,
          'validation'
        );
      }
    }
  }

  /**
   * Merges existing options with new options
   * @param existing Existing options
   * @param newOptions New options to merge
   * @returns Merged options
   */
  private mergeOptions(existing: Partial<CLIOptions>, newOptions: Partial<CLIOptions>): Partial<CLIOptions> {
    const merged = { ...existing };

    for (const [key, value] of Object.entries(newOptions)) {
      if (value !== undefined) {
        // Special handling for array options - replace rather than merge
        if (Array.isArray(value)) {
          merged[key] = [...value];
        } else {
          merged[key] = value;
        }
      }
    }

    return merged;
  }

  /**
   * Persists options to the configuration file
   */
  private async persistOptions(): Promise<void> {
    try {
      // Ensure the directory exists
      const configDir = path.dirname(this.configPath);
      await fs.mkdir(configDir, { recursive: true });

      // Write the configuration file
      const configContent = JSON.stringify(this.options, null, 2);
      await fs.writeFile(this.configPath, configContent, 'utf8');

    } catch (error) {
      throw new OptionsManagerError(
        `Failed to persist options to ${this.configPath}: ${error instanceof Error ? error.message : String(error)}`,
        'persist',
        error as Error
      );
    }
  }

  /**
   * Creates a backup of the current configuration file
   */
  private async createBackup(): Promise<void> {
    try {
      await fs.access(this.configPath);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${this.configPath}.backup.${timestamp}`;
      
      await fs.copyFile(this.configPath, backupPath);
    } catch (error) {
      // Backup creation is not critical, log but don't throw
      console.warn(`Failed to create backup: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Gets default CLI options
   * @returns Default options
   */
  private getDefaultOptions(): Partial<CLIOptions> {
    return {
      dryRun: false,
      interactive: false,
      verbose: false,
      debug: false,
      quiet: false,
      ci: false,
      merge: false,
      recursive: false,
      parallel: false,
      template: 'basic'
    };
  }
}

/**
 * Convenience function to update CLI options
 * @param options Options to update
 * @param config Optional configuration for the options manager
 */
export async function updateOptions(
  options: Partial<CLIOptions>, 
  config?: OptionsManagerConfig
): Promise<void> {
  const manager = new OptionsManager(config);
  await manager.updateOptions(options);
}