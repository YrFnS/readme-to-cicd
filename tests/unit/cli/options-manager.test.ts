/**
 * Unit Tests for OptionsManager
 * 
 * Tests the options management functionality including options persistence,
 * validation, merge logic, and error handling for configuration operations.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { OptionsManager, OptionsManagerError, updateOptions, type OptionsManagerConfig } from '../../../src/cli/options-manager';
import { CLIOptions } from '../../../src/cli/lib/types';

// Mock fs module
vi.mock('fs/promises');

describe('OptionsManager', () => {
  let optionsManager: OptionsManager;
  let mockFs: any;
  const testConfigPath = '.test-readme-to-cicd.json';

  beforeEach(() => {
    mockFs = vi.mocked(fs);
    vi.clearAllMocks();
    
    // Mock console.warn to avoid noise in tests
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create OptionsManager with default config', () => {
      optionsManager = new OptionsManager();
      expect(optionsManager).toBeInstanceOf(OptionsManager);
    });

    it('should create OptionsManager with custom config', () => {
      const config: OptionsManagerConfig = {
        configPath: testConfigPath,
        createBackup: false,
        validateOptions: false
      };
      
      optionsManager = new OptionsManager(config);
      expect(optionsManager).toBeInstanceOf(OptionsManager);
    });
  });

  describe('updateOptions', () => {
    beforeEach(() => {
      optionsManager = new OptionsManager({ configPath: testConfigPath });
    });

    it('should update options successfully with new values', async () => {
      const newOptions: Partial<CLIOptions> = {
        verbose: true,
        dryRun: true,
        outputDir: '/test/output'
      };

      // Mock file operations
      mockFs.access.mockRejectedValueOnce(new Error('File not found')); // No existing config
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await optionsManager.updateOptions(newOptions);

      // Verify file was written with merged options
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.resolve(testConfigPath),
        expect.stringContaining('"verbose": true'),
        'utf8'
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.resolve(testConfigPath),
        expect.stringContaining('"dryRun": true'),
        'utf8'
      );
    });

    it('should merge with existing options', async () => {
      const existingOptions = {
        verbose: false,
        interactive: true,
        outputDir: '/existing/output'
      };
      
      const newOptions: Partial<CLIOptions> = {
        verbose: true,
        dryRun: true
      };

      // Mock existing config file
      mockFs.access.mockResolvedValueOnce(undefined);
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(existingOptions));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await optionsManager.updateOptions(newOptions);

      const writtenContent = mockFs.writeFile.mock.calls[0][1];
      const parsedContent = JSON.parse(writtenContent);

      expect(parsedContent.verbose).toBe(true); // Updated
      expect(parsedContent.interactive).toBe(true); // Preserved
      expect(parsedContent.dryRun).toBe(true); // Added
      expect(parsedContent.outputDir).toBe('/existing/output'); // Preserved
    });

    it('should create backup when enabled', async () => {
      optionsManager = new OptionsManager({ 
        configPath: testConfigPath, 
        createBackup: true 
      });

      const newOptions: Partial<CLIOptions> = { verbose: true };

      // Mock existing config file
      mockFs.access
        .mockResolvedValueOnce(undefined) // loadExistingOptions
        .mockResolvedValueOnce(undefined); // createBackup
      mockFs.readFile.mockResolvedValueOnce('{"existing": true}');
      mockFs.copyFile.mockResolvedValue(undefined);
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await optionsManager.updateOptions(newOptions);

      expect(mockFs.copyFile).toHaveBeenCalledWith(
        path.resolve(testConfigPath),
        expect.stringMatching(/\.test-readme-to-cicd\.json\.backup\./)
      );
    });

    it('should skip backup when disabled', async () => {
      optionsManager = new OptionsManager({ 
        configPath: testConfigPath, 
        createBackup: false 
      });

      const newOptions: Partial<CLIOptions> = { verbose: true };

      mockFs.access.mockRejectedValueOnce(new Error('File not found'));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await optionsManager.updateOptions(newOptions);

      expect(mockFs.copyFile).not.toHaveBeenCalled();
    });

    it('should throw error for invalid options input', async () => {
      await expect(optionsManager.updateOptions(null as any))
        .rejects.toThrow(OptionsManagerError);
      
      await expect(optionsManager.updateOptions('invalid' as any))
        .rejects.toThrow('Invalid options provided');
    });

    it('should handle file write errors gracefully', async () => {
      const newOptions: Partial<CLIOptions> = { verbose: true };

      mockFs.access.mockRejectedValueOnce(new Error('File not found'));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockRejectedValue(new Error('Permission denied'));

      await expect(optionsManager.updateOptions(newOptions))
        .rejects.toThrow(OptionsManagerError);
    });
  });

  describe('validation', () => {
    beforeEach(() => {
      optionsManager = new OptionsManager({ 
        configPath: testConfigPath,
        validateOptions: true 
      });
    });

    it('should validate command options', async () => {
      const invalidOptions: Partial<CLIOptions> = {
        command: 'invalid-command' as any
      };

      await expect(optionsManager.updateOptions(invalidOptions))
        .rejects.toThrow('Invalid command: invalid-command');
    });

    it('should validate template options', async () => {
      const invalidOptions: Partial<CLIOptions> = {
        template: 'invalid-template' as any
      };

      await expect(optionsManager.updateOptions(invalidOptions))
        .rejects.toThrow('Invalid template: invalid-template');
    });

    it('should validate boolean options', async () => {
      const invalidOptions = {
        verbose: 'not-boolean' as any
      };

      await expect(optionsManager.updateOptions(invalidOptions))
        .rejects.toThrow('Option verbose must be a boolean');
    });

    it('should validate string options', async () => {
      const invalidOptions = {
        outputDir: 123 as any
      };

      await expect(optionsManager.updateOptions(invalidOptions))
        .rejects.toThrow('Option outputDir must be a string');
    });

    it('should validate array options', async () => {
      const invalidOptions = {
        workflowType: 'not-array' as any
      };

      await expect(optionsManager.updateOptions(invalidOptions))
        .rejects.toThrow('Option workflowType must be an array');
    });

    it('should accept valid options', async () => {
      const validOptions: Partial<CLIOptions> = {
        command: 'generate',
        template: 'enterprise',
        verbose: true,
        outputDir: '/valid/path',
        workflowType: ['ci', 'cd'],
        framework: ['nodejs', 'react']
      };

      mockFs.access.mockRejectedValueOnce(new Error('File not found'));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await expect(optionsManager.updateOptions(validOptions))
        .resolves.not.toThrow();
    });

    it('should skip validation when disabled', async () => {
      optionsManager = new OptionsManager({ 
        configPath: testConfigPath,
        validateOptions: false 
      });

      const invalidOptions: Partial<CLIOptions> = {
        command: 'invalid-command' as any
      };

      mockFs.access.mockRejectedValueOnce(new Error('File not found'));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await expect(optionsManager.updateOptions(invalidOptions))
        .resolves.not.toThrow();
    });
  });

  describe('getOptions', () => {
    beforeEach(() => {
      optionsManager = new OptionsManager({ configPath: testConfigPath });
    });

    it('should return current options', async () => {
      const newOptions: Partial<CLIOptions> = {
        verbose: true,
        outputDir: '/test/output'
      };

      mockFs.access.mockRejectedValueOnce(new Error('File not found'));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await optionsManager.updateOptions(newOptions);
      const currentOptions = optionsManager.getOptions();

      expect(currentOptions.verbose).toBe(true);
      expect(currentOptions.outputDir).toBe('/test/output');
    });

    it('should return copy of options to prevent external modification', async () => {
      const newOptions: Partial<CLIOptions> = { verbose: true };

      mockFs.access.mockRejectedValueOnce(new Error('File not found'));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await optionsManager.updateOptions(newOptions);
      const options1 = optionsManager.getOptions();
      const options2 = optionsManager.getOptions();

      expect(options1).not.toBe(options2); // Different objects
      expect(options1).toEqual(options2); // Same content
    });
  });

  describe('loadOptions', () => {
    beforeEach(() => {
      optionsManager = new OptionsManager({ configPath: testConfigPath });
    });

    it('should load options from existing config file', async () => {
      const existingOptions = {
        verbose: true,
        interactive: false,
        outputDir: '/existing/path'
      };

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(existingOptions));

      const loadedOptions = await optionsManager.loadOptions();

      expect(loadedOptions.verbose).toBe(true);
      expect(loadedOptions.interactive).toBe(false);
      expect(loadedOptions.outputDir).toBe('/existing/path');
    });

    it('should return default options when config file does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));

      const loadedOptions = await optionsManager.loadOptions();

      expect(loadedOptions.dryRun).toBe(false);
      expect(loadedOptions.verbose).toBe(false);
      expect(loadedOptions.template).toBe('basic');
    });

    it('should handle invalid JSON in config file', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue('invalid json');

      const loadedOptions = await optionsManager.loadOptions();

      // Should fall back to defaults
      expect(loadedOptions.dryRun).toBe(false);
      expect(loadedOptions.verbose).toBe(false);
    });

    it('should handle empty config file', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue('');

      const loadedOptions = await optionsManager.loadOptions();

      // Should fall back to defaults
      expect(loadedOptions.dryRun).toBe(false);
      expect(loadedOptions.verbose).toBe(false);
    });
  });

  describe('resetOptions', () => {
    beforeEach(() => {
      optionsManager = new OptionsManager({ configPath: testConfigPath });
    });

    it('should reset options to defaults', async () => {
      // First set some options
      const customOptions: Partial<CLIOptions> = {
        verbose: true,
        dryRun: true,
        outputDir: '/custom/path'
      };

      mockFs.access.mockRejectedValue(new Error('File not found'));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await optionsManager.updateOptions(customOptions);

      // Then reset
      await optionsManager.resetOptions();

      const resetOptions = optionsManager.getOptions();
      expect(resetOptions.verbose).toBe(false);
      expect(resetOptions.dryRun).toBe(false);
      expect(resetOptions.template).toBe('basic');
      expect(resetOptions.outputDir).toBeUndefined();
    });

    it('should create backup before reset when enabled', async () => {
      optionsManager = new OptionsManager({ 
        configPath: testConfigPath, 
        createBackup: true 
      });

      mockFs.access.mockResolvedValue(undefined);
      mockFs.copyFile.mockResolvedValue(undefined);
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await optionsManager.resetOptions();

      expect(mockFs.copyFile).toHaveBeenCalled();
    });
  });

  describe('array option handling', () => {
    beforeEach(() => {
      optionsManager = new OptionsManager({ configPath: testConfigPath });
    });

    it('should replace array options instead of merging', async () => {
      const existingOptions = {
        workflowType: ['ci'],
        framework: ['nodejs', 'react']
      };

      const newOptions: Partial<CLIOptions> = {
        workflowType: ['cd', 'deploy'],
        framework: ['python']
      };

      mockFs.access.mockResolvedValueOnce(undefined);
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(existingOptions));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await optionsManager.updateOptions(newOptions);

      const updatedOptions = optionsManager.getOptions();
      expect(updatedOptions.workflowType).toEqual(['cd', 'deploy']);
      expect(updatedOptions.framework).toEqual(['python']);
    });

    it('should handle empty arrays', async () => {
      const newOptions: Partial<CLIOptions> = {
        workflowType: [],
        framework: []
      };

      mockFs.access.mockRejectedValueOnce(new Error('File not found'));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await optionsManager.updateOptions(newOptions);

      const updatedOptions = optionsManager.getOptions();
      expect(updatedOptions.workflowType).toEqual([]);
      expect(updatedOptions.framework).toEqual([]);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      optionsManager = new OptionsManager({ configPath: testConfigPath });
    });

    it('should create OptionsManagerError with proper properties', () => {
      const originalError = new Error('Original error');
      const managerError = new OptionsManagerError('Test message', 'test-operation', originalError);

      expect(managerError.name).toBe('OptionsManagerError');
      expect(managerError.message).toBe('OptionsManager test-operation failed: Test message');
      expect(managerError.operation).toBe('test-operation');
      expect(managerError.cause).toBe(originalError);
    });

    it('should create OptionsManagerError without cause', () => {
      const managerError = new OptionsManagerError('Test message', 'test-operation');

      expect(managerError.name).toBe('OptionsManagerError');
      expect(managerError.message).toBe('OptionsManager test-operation failed: Test message');
      expect(managerError.operation).toBe('test-operation');
      expect(managerError.cause).toBeUndefined();
    });

    it('should handle backup creation failures gracefully', async () => {
      optionsManager = new OptionsManager({ 
        configPath: testConfigPath, 
        createBackup: true 
      });

      const newOptions: Partial<CLIOptions> = { verbose: true };

      mockFs.access
        .mockRejectedValueOnce(new Error('File not found')) // loadExistingOptions
        .mockResolvedValueOnce(undefined); // createBackup check
      mockFs.copyFile.mockRejectedValue(new Error('Backup failed'));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      // Should not throw, just warn
      await expect(optionsManager.updateOptions(newOptions))
        .resolves.not.toThrow();

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create backup')
      );
    });
  });

  describe('edge cases', () => {
    it('should handle undefined values in options', async () => {
      optionsManager = new OptionsManager({ configPath: testConfigPath });

      const optionsWithUndefined: Partial<CLIOptions> = {
        verbose: true,
        outputDir: undefined,
        dryRun: false
      };

      mockFs.access.mockRejectedValueOnce(new Error('File not found'));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await optionsManager.updateOptions(optionsWithUndefined);

      const updatedOptions = optionsManager.getOptions();
      expect(updatedOptions.verbose).toBe(true);
      expect(updatedOptions.dryRun).toBe(false);
      expect('outputDir' in updatedOptions).toBe(false); // Should not be set
    });

    it('should handle nested directory creation', async () => {
      const deepConfigPath = 'deep/nested/config/.readme-to-cicd.json';
      optionsManager = new OptionsManager({ configPath: deepConfigPath });

      const newOptions: Partial<CLIOptions> = { verbose: true };

      mockFs.access.mockRejectedValueOnce(new Error('File not found'));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await optionsManager.updateOptions(newOptions);

      expect(mockFs.mkdir).toHaveBeenCalledWith(
        path.dirname(path.resolve(deepConfigPath)),
        { recursive: true }
      );
    });
  });
});

describe('updateOptions convenience function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call OptionsManager.updateOptions with default config', async () => {
    const options: Partial<CLIOptions> = { verbose: true };

    const mockFs = vi.mocked(fs);
    mockFs.access.mockRejectedValueOnce(new Error('File not found'));
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);

    await updateOptions(options);

    expect(mockFs.writeFile).toHaveBeenCalledWith(
      path.resolve('.readme-to-cicd.json'),
      expect.stringContaining('"verbose": true'),
      'utf8'
    );
  });

  it('should call OptionsManager.updateOptions with custom config', async () => {
    const options: Partial<CLIOptions> = { verbose: true };
    const config: OptionsManagerConfig = { 
      configPath: 'custom-config.json',
      createBackup: false 
    };

    const mockFs = vi.mocked(fs);
    mockFs.access.mockRejectedValueOnce(new Error('File not found'));
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);

    await updateOptions(options, config);

    expect(mockFs.writeFile).toHaveBeenCalledWith(
      path.resolve('custom-config.json'),
      expect.stringContaining('"verbose": true'),
      'utf8'
    );
    expect(mockFs.copyFile).not.toHaveBeenCalled(); // Backup disabled
  });
});