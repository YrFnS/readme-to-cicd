/**
 * CLI Methods Integration Tests
 * 
 * Integration tests for all newly exported CLI methods including:
 * - writeWorkflowFiles
 * - updateOptions  
 * - validateOutputDirectory
 * 
 * These tests verify method accessibility, proper function signatures,
 * real file system operations, and error scenario handling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  writeWorkflowFiles, 
  updateOptions, 
  validateOutputDirectory,
  WorkflowWriter,
  OptionsManager,
  DirectoryValidator,
  type WorkflowFile,
  type ValidationResult
} from '../../../src/cli/index';
import { CLIOptions } from '../../../src/cli/lib/types';

describe('CLI Methods Integration Tests', () => {
  let testDir: string;
  let testConfigPath: string;

  beforeEach(async () => {
    // Create unique test directory for each test in the project temp directory
    testDir = path.join(process.cwd(), 'temp', `cli-integration-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    testConfigPath = path.join(testDir, '.readme-to-cicd.json');
    
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
      console.warn(`Failed to clean up test directory: ${error}`);
    }
  });

  describe('Method Accessibility and Signatures', () => {
    it('should export writeWorkflowFiles function with correct signature', () => {
      expect(writeWorkflowFiles).toBeDefined();
      expect(typeof writeWorkflowFiles).toBe('function');
      expect(writeWorkflowFiles.length).toBe(2); // workflows, outputDir parameters
    });

    it('should export updateOptions function with correct signature', () => {
      expect(updateOptions).toBeDefined();
      expect(typeof updateOptions).toBe('function');
      expect(updateOptions.length).toBe(2); // options, config parameters (config is optional)
    });

    it('should export validateOutputDirectory function with correct signature', () => {
      expect(validateOutputDirectory).toBeDefined();
      expect(typeof validateOutputDirectory).toBe('function');
      expect(validateOutputDirectory.length).toBe(1); // directory parameter
    });

    it('should export WorkflowWriter class', () => {
      expect(WorkflowWriter).toBeDefined();
      expect(typeof WorkflowWriter).toBe('function'); // Constructor function
      
      const instance = new WorkflowWriter();
      expect(instance).toBeInstanceOf(WorkflowWriter);
      expect(typeof instance.writeWorkflowFiles).toBe('function');
    });

    it('should export OptionsManager class', () => {
      expect(OptionsManager).toBeDefined();
      expect(typeof OptionsManager).toBe('function'); // Constructor function
      
      const instance = new OptionsManager();
      expect(instance).toBeInstanceOf(OptionsManager);
      expect(typeof instance.updateOptions).toBe('function');
      expect(typeof instance.getOptions).toBe('function');
      expect(typeof instance.loadOptions).toBe('function');
    });

    it('should export DirectoryValidator class', () => {
      expect(DirectoryValidator).toBeDefined();
      expect(typeof DirectoryValidator).toBe('function'); // Constructor function
      
      const instance = new DirectoryValidator();
      expect(instance).toBeInstanceOf(DirectoryValidator);
      expect(typeof instance.validateOutputDirectory).toBe('function');
    });
  });

  describe('writeWorkflowFiles Integration', () => {
    it('should write workflow files to file system successfully', async () => {
      const workflows: WorkflowFile[] = [
        {
          name: 'ci.yml',
          content: 'name: CI\non: [push, pull_request]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3',
          path: '.github/workflows'
        },
        {
          name: 'deploy.yml',
          content: 'name: Deploy\non:\n  push:\n    branches: [main]\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3',
          path: '.github/workflows'
        }
      ];

      await writeWorkflowFiles(workflows, testDir);

      // Verify files were created
      const ciPath = path.join(testDir, '.github/workflows', 'ci.yml');
      const deployPath = path.join(testDir, '.github/workflows', 'deploy.yml');

      expect(await fs.access(ciPath).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(deployPath).then(() => true).catch(() => false)).toBe(true);

      // Verify file contents
      const ciContent = await fs.readFile(ciPath, 'utf8');
      const deployContent = await fs.readFile(deployPath, 'utf8');

      expect(ciContent).toBe(workflows[0].content);
      expect(deployContent).toBe(workflows[1].content);
    });

    it('should create nested directories when they do not exist', async () => {
      const workflows: WorkflowFile[] = [
        {
          name: 'config.json',
          content: '{"test": true}',
          path: 'deep/nested/config/directory'
        }
      ];

      await writeWorkflowFiles(workflows, testDir);

      const configPath = path.join(testDir, 'deep/nested/config/directory', 'config.json');
      expect(await fs.access(configPath).then(() => true).catch(() => false)).toBe(true);

      const content = await fs.readFile(configPath, 'utf8');
      expect(JSON.parse(content)).toEqual({ test: true });
    });

    it('should handle multiple workflows with different paths', async () => {
      const workflows: WorkflowFile[] = [
        {
          name: 'ci.yml',
          content: 'ci workflow',
          path: '.github/workflows'
        },
        {
          name: 'docker-compose.yml',
          content: 'version: "3.8"',
          path: 'docker'
        },
        {
          name: 'config.json',
          content: '{"env": "test"}',
          path: 'config'
        }
      ];

      await writeWorkflowFiles(workflows, testDir);

      // Verify all files exist in their respective directories
      const ciPath = path.join(testDir, '.github/workflows', 'ci.yml');
      const dockerPath = path.join(testDir, 'docker', 'docker-compose.yml');
      const configPath = path.join(testDir, 'config', 'config.json');

      expect(await fs.access(ciPath).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(dockerPath).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(configPath).then(() => true).catch(() => false)).toBe(true);
    });

    it('should throw error for invalid workflow data', async () => {
      const invalidWorkflows: WorkflowFile[] = [
        {
          name: '',
          content: 'test content',
          path: '.github/workflows'
        }
      ];

      await expect(writeWorkflowFiles(invalidWorkflows, testDir))
        .rejects.toThrow('Workflow file name is required');
    });

    it('should throw error for invalid output directory', async () => {
      const workflows: WorkflowFile[] = [
        {
          name: 'test.yml',
          content: 'test content',
          path: '.github/workflows'
        }
      ];

      await expect(writeWorkflowFiles(workflows, ''))
        .rejects.toThrow('Invalid output directory');
    });

    it('should handle permission errors gracefully', async () => {
      const workflows: WorkflowFile[] = [
        {
          name: 'test.yml',
          content: 'test content',
          path: '.github/workflows'
        }
      ];

      // Try to write to a read-only directory (simulate permission error)
      const readOnlyDir = path.join(testDir, 'readonly');
      await fs.mkdir(readOnlyDir, { recursive: true });
      
      // On Windows, we can't easily make directories read-only, so we'll mock the error
      const originalWriteFile = fs.writeFile;
      vi.spyOn(fs, 'writeFile').mockRejectedValueOnce(
        Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' })
      );

      await expect(writeWorkflowFiles(workflows, readOnlyDir))
        .rejects.toThrow('WorkflowWriter');

      // Restore original function
      vi.mocked(fs.writeFile).mockRestore();
    });
  });

  describe('updateOptions Integration', () => {
    it('should update options and persist to file system', async () => {
      const options: Partial<CLIOptions> = {
        verbose: true,
        dryRun: true,
        outputDir: testDir,
        template: 'enterprise'
      };

      await updateOptions(options, { configPath: testConfigPath });

      // Verify config file was created
      expect(await fs.access(testConfigPath).then(() => true).catch(() => false)).toBe(true);

      // Verify config file contents
      const configContent = await fs.readFile(testConfigPath, 'utf8');
      const parsedConfig = JSON.parse(configContent);

      expect(parsedConfig.verbose).toBe(true);
      expect(parsedConfig.dryRun).toBe(true);
      expect(parsedConfig.outputDir).toBe(testDir);
      expect(parsedConfig.template).toBe('enterprise');
    });

    it('should merge with existing options', async () => {
      // First, create initial config
      const initialOptions: Partial<CLIOptions> = {
        verbose: false,
        interactive: true,
        outputDir: '/initial/path'
      };

      await updateOptions(initialOptions, { configPath: testConfigPath });

      // Then update with new options
      const updateOptions2: Partial<CLIOptions> = {
        verbose: true,
        dryRun: true
      };

      await updateOptions(updateOptions2, { configPath: testConfigPath });

      // Verify merged config
      const configContent = await fs.readFile(testConfigPath, 'utf8');
      const parsedConfig = JSON.parse(configContent);

      expect(parsedConfig.verbose).toBe(true); // Updated
      expect(parsedConfig.interactive).toBe(true); // Preserved
      expect(parsedConfig.dryRun).toBe(true); // Added
      expect(parsedConfig.outputDir).toBe('/initial/path'); // Preserved
    });

    it('should create backup when enabled', async () => {
      // Create initial config
      const initialOptions: Partial<CLIOptions> = {
        verbose: false,
        template: 'basic'
      };

      await updateOptions(initialOptions, { configPath: testConfigPath });

      // Update with backup enabled
      const newOptions: Partial<CLIOptions> = {
        verbose: true
      };

      await updateOptions(newOptions, { 
        configPath: testConfigPath,
        createBackup: true 
      });

      // Verify backup file exists
      const backupFiles = await fs.readdir(testDir);
      const backupFile = backupFiles.find(file => 
        file.startsWith('.readme-to-cicd.json.backup.')
      );

      expect(backupFile).toBeDefined();

      // Verify backup content
      const backupPath = path.join(testDir, backupFile!);
      const backupContent = await fs.readFile(backupPath, 'utf8');
      const parsedBackup = JSON.parse(backupContent);

      expect(parsedBackup.verbose).toBe(false); // Original value
      expect(parsedBackup.template).toBe('basic');
    });

    it('should handle array options correctly', async () => {
      const options: Partial<CLIOptions> = {
        workflowType: ['ci', 'cd', 'deploy'],
        framework: ['nodejs', 'react', 'typescript']
      };

      await updateOptions(options, { configPath: testConfigPath });

      const configContent = await fs.readFile(testConfigPath, 'utf8');
      const parsedConfig = JSON.parse(configContent);

      expect(parsedConfig.workflowType).toEqual(['ci', 'cd', 'deploy']);
      expect(parsedConfig.framework).toEqual(['nodejs', 'react', 'typescript']);
    });

    it('should throw error for invalid options', async () => {
      await expect(updateOptions(null as any, { configPath: testConfigPath }))
        .rejects.toThrow('Invalid options provided');

      await expect(updateOptions('invalid' as any, { configPath: testConfigPath }))
        .rejects.toThrow('Invalid options provided');
    });

    it('should handle file write permission errors', async () => {
      // Create a read-only directory
      const readOnlyDir = path.join(testDir, 'readonly');
      await fs.mkdir(readOnlyDir, { recursive: true });
      const readOnlyConfigPath = path.join(readOnlyDir, 'config.json');

      // Mock permission error
      const originalWriteFile = fs.writeFile;
      vi.spyOn(fs, 'writeFile').mockRejectedValueOnce(
        Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' })
      );

      const options: Partial<CLIOptions> = { verbose: true };

      await expect(updateOptions(options, { configPath: readOnlyConfigPath }))
        .rejects.toThrow('OptionsManager');

      vi.mocked(fs.writeFile).mockRestore();
    });
  });

  describe('validateOutputDirectory Integration', () => {
    it('should validate accessible, writable, empty directory', async () => {
      const emptyDir = path.join(testDir, 'empty');
      await fs.mkdir(emptyDir, { recursive: true });

      const result: ValidationResult = await validateOutputDirectory(emptyDir);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should return warning for non-empty directory', async () => {
      const nonEmptyDir = path.join(testDir, 'nonempty');
      await fs.mkdir(nonEmptyDir, { recursive: true });
      await fs.writeFile(path.join(nonEmptyDir, 'existing-file.txt'), 'content');

      const result: ValidationResult = await validateOutputDirectory(nonEmptyDir);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('is not empty');
    });

    it('should return error for non-existent directory', async () => {
      const nonExistentDir = path.join(testDir, 'does-not-exist');

      const result: ValidationResult = await validateOutputDirectory(nonExistentDir);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('does not exist');
      expect(result.warnings).toHaveLength(0);
    });

    it('should handle relative paths correctly', async () => {
      const relativeDir = './test-relative';
      const absoluteDir = path.resolve(relativeDir);
      
      // Create the directory using absolute path
      await fs.mkdir(absoluteDir, { recursive: true });

      const result: ValidationResult = await validateOutputDirectory(relativeDir);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);

      // Clean up
      await fs.rm(absoluteDir, { recursive: true, force: true });
    });

    it('should handle directories with special characters', async () => {
      const specialDir = path.join(testDir, 'dir with spaces & symbols!');
      await fs.mkdir(specialDir, { recursive: true });

      const result: ValidationResult = await validateOutputDirectory(specialDir);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect multiple files in directory', async () => {
      const multiFileDir = path.join(testDir, 'multifile');
      await fs.mkdir(multiFileDir, { recursive: true });
      await fs.writeFile(path.join(multiFileDir, 'file1.txt'), 'content1');
      await fs.writeFile(path.join(multiFileDir, 'file2.txt'), 'content2');
      await fs.mkdir(path.join(multiFileDir, 'subdir'));

      const result: ValidationResult = await validateOutputDirectory(multiFileDir);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('is not empty');
    });
  });

  describe('Error Scenario Integration Tests', () => {
    it('should handle concurrent file operations', async () => {
      const workflows: WorkflowFile[] = Array.from({ length: 10 }, (_, i) => ({
        name: `workflow-${i}.yml`,
        content: `name: Workflow ${i}\non: push\njobs:\n  job${i}:\n    runs-on: ubuntu-latest`,
        path: '.github/workflows'
      }));

      // Execute multiple writeWorkflowFiles operations concurrently
      const promises = Array.from({ length: 5 }, () => 
        writeWorkflowFiles(workflows, testDir)
      );

      await expect(Promise.all(promises)).resolves.not.toThrow();

      // Verify all files were created
      const workflowDir = path.join(testDir, '.github/workflows');
      const files = await fs.readdir(workflowDir);
      expect(files).toHaveLength(10);
    });

    it('should handle large workflow files', async () => {
      const largeContent = 'name: Large Workflow\n' + 'step:\n'.repeat(1000);
      const workflows: WorkflowFile[] = [
        {
          name: 'large-workflow.yml',
          content: largeContent,
          path: '.github/workflows'
        }
      ];

      await writeWorkflowFiles(workflows, testDir);

      const filePath = path.join(testDir, '.github/workflows', 'large-workflow.yml');
      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toBe(largeContent);
      expect(content.length).toBeGreaterThan(5000);
    });

    it('should handle complex nested directory structures', async () => {
      const workflows: WorkflowFile[] = [
        {
          name: 'config.yml',
          content: 'config: value',
          path: 'level1/level2/level3/level4/level5'
        }
      ];

      await writeWorkflowFiles(workflows, testDir);

      const filePath = path.join(testDir, 'level1/level2/level3/level4/level5', 'config.yml');
      expect(await fs.access(filePath).then(() => true).catch(() => false)).toBe(true);
    });

    it('should handle options with undefined and null values', async () => {
      const options: Partial<CLIOptions> = {
        verbose: true,
        outputDir: undefined,
        dryRun: false,
        template: null as any
      };

      await updateOptions(options, { 
        configPath: testConfigPath,
        validateOptions: false // Disable validation to test handling
      });

      const configContent = await fs.readFile(testConfigPath, 'utf8');
      const parsedConfig = JSON.parse(configContent);

      expect(parsedConfig.verbose).toBe(true);
      expect(parsedConfig.dryRun).toBe(false);
      expect('outputDir' in parsedConfig).toBe(false); // Should not be present
      expect('template' in parsedConfig).toBe(false); // Should not be present
    });

    it('should handle validation of deeply nested directory paths', async () => {
      const deepPath = path.join(testDir, 'very/deep/nested/directory/structure/that/goes/on/and/on');
      await fs.mkdir(deepPath, { recursive: true });

      const result: ValidationResult = await validateOutputDirectory(deepPath);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Class Instance Integration', () => {
    it('should work with WorkflowWriter class instances', async () => {
      const writer = new WorkflowWriter();
      const workflows: WorkflowFile[] = [
        {
          name: 'instance-test.yml',
          content: 'name: Instance Test',
          path: '.github/workflows'
        }
      ];

      await writer.writeWorkflowFiles(workflows, testDir);

      const filePath = path.join(testDir, '.github/workflows', 'instance-test.yml');
      expect(await fs.access(filePath).then(() => true).catch(() => false)).toBe(true);
    });

    it('should work with OptionsManager class instances', async () => {
      const manager = new OptionsManager({ configPath: testConfigPath });
      const options: Partial<CLIOptions> = {
        verbose: true,
        template: 'team'
      };

      await manager.updateOptions(options);

      const loadedOptions = await manager.loadOptions();
      expect(loadedOptions.verbose).toBe(true);
      expect(loadedOptions.template).toBe('team');
    });

    it('should work with DirectoryValidator class instances', async () => {
      const validator = new DirectoryValidator();
      const testValidationDir = path.join(testDir, 'validation-test');
      await fs.mkdir(testValidationDir, { recursive: true });

      const result = await validator.validateOutputDirectory(testValidationDir);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('End-to-End Integration Scenarios', () => {
    it('should complete full workflow: validate -> update options -> write workflows', async () => {
      // Step 1: Validate directory
      const workflowDir = path.join(testDir, 'e2e-test');
      await fs.mkdir(workflowDir, { recursive: true });

      const validationResult = await validateOutputDirectory(workflowDir);
      expect(validationResult.isValid).toBe(true);

      // Step 2: Update options
      const options: Partial<CLIOptions> = {
        verbose: true,
        outputDir: workflowDir,
        template: 'enterprise',
        workflowType: ['ci', 'cd']
      };

      await updateOptions(options, { configPath: testConfigPath });

      // Step 3: Write workflows
      const workflows: WorkflowFile[] = [
        {
          name: 'ci.yml',
          content: 'name: CI\non: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest',
          path: '.github/workflows'
        },
        {
          name: 'cd.yml',
          content: 'name: CD\non:\n  push:\n    branches: [main]\njobs:\n  deploy:\n    runs-on: ubuntu-latest',
          path: '.github/workflows'
        }
      ];

      await writeWorkflowFiles(workflows, workflowDir);

      // Verify complete workflow
      const configExists = await fs.access(testConfigPath).then(() => true).catch(() => false);
      const ciExists = await fs.access(path.join(workflowDir, '.github/workflows', 'ci.yml')).then(() => true).catch(() => false);
      const cdExists = await fs.access(path.join(workflowDir, '.github/workflows', 'cd.yml')).then(() => true).catch(() => false);

      expect(configExists).toBe(true);
      expect(ciExists).toBe(true);
      expect(cdExists).toBe(true);

      // Verify config content
      const configContent = await fs.readFile(testConfigPath, 'utf8');
      const parsedConfig = JSON.parse(configContent);
      expect(parsedConfig.outputDir).toBe(workflowDir);
      expect(parsedConfig.workflowType).toEqual(['ci', 'cd']);
    });

    it('should handle error recovery in multi-step operations', async () => {
      // Create a scenario where validation passes but writing fails
      const problematicDir = path.join(testDir, 'problematic');
      await fs.mkdir(problematicDir, { recursive: true });

      // Validation should pass
      const validationResult = await validateOutputDirectory(problematicDir);
      expect(validationResult.isValid).toBe(true);

      // Options update should work
      const options: Partial<CLIOptions> = {
        outputDir: problematicDir,
        verbose: true
      };

      await updateOptions(options, { configPath: testConfigPath });

      // Workflow writing with invalid data should fail gracefully
      const invalidWorkflows: WorkflowFile[] = [
        {
          name: '', // Invalid name
          content: 'test',
          path: '.github/workflows'
        }
      ];

      await expect(writeWorkflowFiles(invalidWorkflows, problematicDir))
        .rejects.toThrow();

      // But config should still exist from successful options update
      const configExists = await fs.access(testConfigPath).then(() => true).catch(() => false);
      expect(configExists).toBe(true);
    });
  });
});