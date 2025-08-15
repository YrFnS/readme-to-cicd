/**
 * Configuration Manager Tests
 * 
 * Comprehensive test suite for the configuration management system.
 * Tests loading, validation, merging, and error handling scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigurationManager, ConfigurationError } from '../../../src/cli/config/configuration-manager';
import { CLIConfig } from '../../../src/cli/config/types';
import { DEFAULT_CONFIG } from '../../../src/cli/config/default-config';

// Mock file system operations
vi.mock('fs');
vi.mock('fs/promises');

const mockFs = vi.mocked(fs);
const mockFsPromises = vi.mocked(fs.promises);

describe('ConfigurationManager', () => {
  let configManager: ConfigurationManager;
  let tempDir: string;

  beforeEach(() => {
    configManager = new ConfigurationManager();
    tempDir = '/tmp/test-config';
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadConfiguration', () => {
    it('should return default configuration when no config files exist', async () => {
      // Mock no config files found
      mockFs.existsSync.mockReturnValue(false);
      
      const config = await configManager.loadConfiguration();
      
      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it('should load and validate project configuration', async () => {
      const projectConfig = {
        defaults: {
          outputDirectory: './workflows',
          workflowTypes: ['ci'],
          includeComments: false,
          optimizationLevel: 'basic'
        }
      };

      // Mock project config file exists
      mockFs.existsSync.mockImplementation((filePath) => {
        return filePath.toString().includes('.readme-to-cicd.json');
      });

      // Mock cosmiconfig search result
      vi.spyOn(configManager['explorer'], 'search').mockReturnValue({
        config: projectConfig,
        filepath: path.join(process.cwd(), '.readme-to-cicd.json'),
        isEmpty: false
      });

      const config = await configManager.loadConfiguration();
      
      expect(config.defaults.outputDirectory).toBe('./workflows');
      expect(config.defaults.workflowTypes).toEqual(['ci']);
      expect(config.defaults.includeComments).toBe(false);
      expect(config.defaults.optimizationLevel).toBe('basic');
    });

    it('should load explicit configuration file', async () => {
      const explicitConfig = {
        defaults: {
          outputDirectory: './custom-workflows',
          workflowTypes: ['cd'],
          includeComments: true,
          optimizationLevel: 'aggressive'
        }
      };

      const configPath = '/path/to/custom-config.json';
      
      mockFs.existsSync.mockReturnValue(true);
      vi.spyOn(configManager['explorer'], 'load').mockReturnValue({
        config: explicitConfig,
        filepath: configPath,
        isEmpty: false
      });

      const config = await configManager.loadConfiguration(configPath);
      
      expect(config.defaults.outputDirectory).toBe('./custom-workflows');
      expect(config.defaults.workflowTypes).toEqual(['cd']);
      expect(config.defaults.optimizationLevel).toBe('aggressive');
    });

    it('should merge multiple configuration sources with correct precedence', async () => {
      const userConfig = {
        defaults: {
          outputDirectory: './user-workflows',
          includeComments: false
        },
        ui: {
          colorOutput: false
        }
      };

      const projectConfig = {
        defaults: {
          workflowTypes: ['ci', 'release'],
          optimizationLevel: 'aggressive'
        },
        git: {
          autoCommit: true
        }
      };

      // Mock user config
      const userConfigPath = path.join(os.homedir(), '.readme-to-cicd.json');
      mockFs.existsSync.mockImplementation((filePath) => {
        return filePath.toString() === userConfigPath || 
               filePath.toString().includes('.readme-to-cicd.json');
      });

      vi.spyOn(configManager['explorer'], 'load').mockImplementation((filePath) => {
        if (filePath === userConfigPath) {
          return { config: userConfig, filepath: userConfigPath, isEmpty: false };
        }
        return null;
      });

      vi.spyOn(configManager['explorer'], 'search').mockReturnValue({
        config: projectConfig,
        filepath: path.join(process.cwd(), '.readme-to-cicd.json'),
        isEmpty: false
      });

      const config = await configManager.loadConfiguration();
      
      // Project config should override user config
      expect(config.defaults.workflowTypes).toEqual(['ci', 'release']);
      expect(config.defaults.optimizationLevel).toBe('aggressive');
      expect(config.git.autoCommit).toBe(true);
      
      // User config should be used where project config doesn't override
      expect(config.ui.colorOutput).toBe(false);
      
      // Default values should be used where neither user nor project config specify
      expect(config.output.format).toBe('yaml');
    });

    it('should throw ConfigurationError for invalid configuration', async () => {
      const invalidConfig = {
        defaults: {
          outputDirectory: '', // Invalid: empty string
          workflowTypes: ['invalid-type'], // Invalid: not in enum
          includeComments: 'not-boolean', // Invalid: wrong type
          optimizationLevel: 'invalid-level' // Invalid: not in enum
        }
      };

      mockFs.existsSync.mockReturnValue(true);
      vi.spyOn(configManager['explorer'], 'search').mockReturnValue({
        config: invalidConfig,
        filepath: '.readme-to-cicd.json',
        isEmpty: false
      });

      await expect(configManager.loadConfiguration()).rejects.toThrow(ConfigurationError);
    });

    it('should handle file loading errors gracefully', async () => {
      const configPath = '/path/to/nonexistent-config.json';
      
      vi.spyOn(configManager['explorer'], 'load').mockImplementation(() => {
        throw new Error('File not found');
      });

      await expect(configManager.loadConfiguration(configPath)).rejects.toThrow(ConfigurationError);
    });
  });

  describe('validateConfig', () => {
    it('should validate correct configuration', () => {
      const validConfig: CLIConfig = {
        ...DEFAULT_CONFIG,
        defaults: {
          ...DEFAULT_CONFIG.defaults,
          workflowTypes: ['ci', 'cd']
        }
      };

      const result = configManager.validateConfig(validConfig);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required properties', () => {
      const invalidConfig = {
        defaults: {
          // Missing required properties
          includeComments: true
        },
        templates: {},
        organization: {},
        output: { format: 'yaml', indentation: 2, includeMetadata: true, backupExisting: true },
        git: { autoCommit: false, commitMessage: 'test', createPR: false },
        ui: { colorOutput: true, progressIndicators: true, verboseLogging: false, interactivePrompts: true }
      };

      const result = configManager.validateConfig(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.message.includes('outputDirectory'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('workflowTypes'))).toBe(true);
    });

    it('should detect invalid enum values', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        defaults: {
          ...DEFAULT_CONFIG.defaults,
          workflowTypes: ['invalid-type'],
          optimizationLevel: 'invalid-level'
        }
      };

      const result = configManager.validateConfig(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('invalid-type'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('invalid-level'))).toBe(true);
    });

    it('should detect type mismatches', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        defaults: {
          ...DEFAULT_CONFIG.defaults,
          includeComments: 'not-boolean',
          workflowTypes: 'not-array'
        }
      };

      const result = configManager.validateConfig(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('boolean'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('array'))).toBe(true);
    });

    it('should provide helpful suggestions for common errors', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        defaults: {
          ...DEFAULT_CONFIG.defaults,
          workflowTypes: ['invalid-type']
        }
      };

      const result = configManager.validateConfig(invalidConfig);
      
      const workflowTypeError = result.errors.find(e => e.message.includes('invalid-type'));
      expect(workflowTypeError?.suggestion).toContain('ci, cd, release');
    });
  });

  describe('createSampleConfig', () => {
    it('should create a sample configuration file', async () => {
      const outputPath = './sample-config.json';
      
      mockFsPromises.writeFile.mockResolvedValue(undefined);

      await configManager.createSampleConfig(outputPath);
      
      expect(mockFsPromises.writeFile).toHaveBeenCalledWith(
        outputPath,
        expect.stringContaining('"outputDirectory"'),
        'utf8'
      );
    });

    it('should handle file writing errors', async () => {
      const outputPath = './invalid/path/config.json';
      
      mockFsPromises.writeFile.mockRejectedValue(new Error('Directory does not exist'));

      await expect(configManager.createSampleConfig(outputPath)).rejects.toThrow(ConfigurationError);
    });
  });

  describe('getDefaultConfig', () => {
    it('should return a copy of the default configuration', () => {
      const defaultConfig = configManager.getDefaultConfig();
      
      expect(defaultConfig).toEqual(DEFAULT_CONFIG);
      expect(defaultConfig).not.toBe(DEFAULT_CONFIG); // Should be a copy
    });
  });

  describe('resolveConfigPaths', () => {
    it('should resolve relative paths in configuration', () => {
      const config: CLIConfig = {
        ...DEFAULT_CONFIG,
        defaults: {
          ...DEFAULT_CONFIG.defaults,
          outputDirectory: './workflows'
        },
        templates: {
          ...DEFAULT_CONFIG.templates,
          customTemplates: './templates'
        }
      };

      const configFilePath = '/project/root/.readme-to-cicd.json';
      const resolvedConfig = configManager.resolveConfigPaths(config, configFilePath);
      
      expect(resolvedConfig.defaults.outputDirectory).toBe('/project/root/workflows');
      expect(resolvedConfig.templates.customTemplates).toBe('/project/root/templates');
    });

    it('should not modify absolute paths', () => {
      const config: CLIConfig = {
        ...DEFAULT_CONFIG,
        defaults: {
          ...DEFAULT_CONFIG.defaults,
          outputDirectory: '/absolute/path/workflows'
        },
        templates: {
          ...DEFAULT_CONFIG.templates,
          customTemplates: '/absolute/path/templates'
        }
      };

      const configFilePath = '/project/root/.readme-to-cicd.json';
      const resolvedConfig = configManager.resolveConfigPaths(config, configFilePath);
      
      expect(resolvedConfig.defaults.outputDirectory).toBe('/absolute/path/workflows');
      expect(resolvedConfig.templates.customTemplates).toBe('/absolute/path/templates');
    });
  });

  describe('format detection', () => {
    it('should detect JSON format', () => {
      const format = configManager['detectFormat']('/path/to/config.json');
      expect(format).toBe('json');
    });

    it('should detect YAML format', () => {
      expect(configManager['detectFormat']('/path/to/config.yaml')).toBe('yaml');
      expect(configManager['detectFormat']('/path/to/config.yml')).toBe('yaml');
    });

    it('should detect JavaScript format', () => {
      const format = configManager['detectFormat']('/path/to/config.js');
      expect(format).toBe('js');
    });

    it('should detect package.json format', () => {
      const format = configManager['detectFormat']('/path/to/package.json');
      expect(format).toBe('package.json');
    });
  });

  describe('deep merge functionality', () => {
    it('should merge nested objects correctly', () => {
      const target = {
        defaults: {
          outputDirectory: './workflows',
          workflowTypes: ['ci']
        },
        ui: {
          colorOutput: true,
          progressIndicators: true
        }
      };

      const source = {
        defaults: {
          workflowTypes: ['ci', 'cd'],
          includeComments: false
        },
        ui: {
          colorOutput: false
        },
        git: {
          autoCommit: true
        }
      };

      const result = configManager['deepMerge'](target, source);
      
      expect(result.defaults.outputDirectory).toBe('./workflows');
      expect(result.defaults.workflowTypes).toEqual(['ci', 'cd']);
      expect(result.defaults.includeComments).toBe(false);
      expect(result.ui.colorOutput).toBe(false);
      expect(result.ui.progressIndicators).toBe(true);
      expect(result.git.autoCommit).toBe(true);
    });

    it('should handle array replacement correctly', () => {
      const target = { workflowTypes: ['ci'] };
      const source = { workflowTypes: ['cd', 'release'] };
      
      const result = configManager['deepMerge'](target, source);
      
      expect(result.workflowTypes).toEqual(['cd', 'release']);
    });
  });
});