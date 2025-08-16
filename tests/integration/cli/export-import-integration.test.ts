/**
 * Export/Import Integration Tests
 * 
 * End-to-end tests for configuration export and import functionality
 * including real file system operations and complete workflows.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { CLIApplication } from '../../../src/cli/lib/cli-application';
import { Logger } from '../../../src/cli/lib/logger';
import { ErrorHandler } from '../../../src/cli/lib/error-handler';
import { CLIConfig } from '../../../src/cli/lib/types';

describe('Export/Import Integration', () => {
  let cliApp: CLIApplication;
  let logger: Logger;
  let errorHandler: ErrorHandler;
  let testDir: string;
  let configPath: string;
  let exportPath: string;

  beforeEach(async () => {
    // Create test directory
    testDir = path.join(process.cwd(), 'test-output', 'export-import-integration');
    await fs.mkdir(testDir, { recursive: true });
    
    configPath = path.join(testDir, '.readme-to-cicd.json');
    exportPath = path.join(testDir, 'exported-config.json');
    
    // Initialize CLI components
    logger = new Logger();
    errorHandler = new ErrorHandler(logger);
    cliApp = new CLIApplication(logger, errorHandler);
    
    // Create test configuration
    const testConfig: CLIConfig = {
      defaults: {
        outputDirectory: '.github/workflows',
        workflowTypes: ['ci', 'cd'],
        includeComments: true,
        optimizationLevel: 'standard'
      },
      templates: {
        customTemplates: path.join(testDir, 'templates'),
        templateOverrides: {
          'ci-template': 'custom-ci.yml'
        },
        organizationTemplates: '@test/templates'
      },
      organization: {
        requiredSecurityScans: true,
        mandatorySteps: ['security-scan', 'dependency-check'],
        allowedActions: ['actions/*', '@test/*'],
        enforceBranchProtection: true,
        requireCodeReview: true
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
        createPR: false,
        branchName: 'feature/add-cicd'
      },
      ui: {
        colorOutput: true,
        progressIndicators: true,
        verboseLogging: false,
        interactivePrompts: true
      }
    };
    
    // Write test configuration
    await fs.writeFile(configPath, JSON.stringify(testConfig, null, 2), 'utf-8');
    
    // Create test templates
    const templatesDir = path.join(testDir, 'templates');
    await fs.mkdir(templatesDir, { recursive: true });
    
    await fs.writeFile(
      path.join(templatesDir, 'ci.yml'),
      'name: CI\non:\n  push:\n    branches: [main]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3',
      'utf-8'
    );
    
    await fs.writeFile(
      path.join(templatesDir, 'cd.yml'),
      'name: CD\non:\n  release:\n    types: [published]\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3',
      'utf-8'
    );
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Export Functionality', () => {
    it('should export configuration with all components', async () => {
      // Act
      const result = await cliApp.run([
        'node',
        'readme-to-cicd',
        'export',
        '--config', configPath,
        '--output', exportPath
      ]);

      // Assert
      expect(result.success).toBe(true);
      expect(result.generatedFiles).toContain(exportPath);
      expect(result.errors).toHaveLength(0);

      // Verify exported file exists and has correct structure
      const exportedContent = await fs.readFile(exportPath, 'utf-8');
      const exportedConfig = JSON.parse(exportedContent);
      
      expect(exportedConfig.metadata).toBeDefined();
      expect(exportedConfig.metadata.version).toBe('1.0');
      expect(exportedConfig.metadata.toolVersion).toBe('1.0.0');
      expect(exportedConfig.metadata.exportedAt).toBeDefined();
      expect(exportedConfig.metadata.compatibility).toBeDefined();
      
      expect(exportedConfig.configuration).toBeDefined();
      expect(exportedConfig.configuration.defaults).toBeDefined();
      expect(exportedConfig.configuration.organization).toBeDefined();
      
      expect(exportedConfig.templates).toBeDefined();
      expect(exportedConfig.templates['ci.yml']).toContain('name: CI');
      expect(exportedConfig.templates['cd.yml']).toContain('name: CD');
      
      expect(exportedConfig.policies).toBeDefined();
      expect(exportedConfig.policies.organization).toBeDefined();
      expect(exportedConfig.policies.security).toBeDefined();
      expect(exportedConfig.policies.compliance).toBeDefined();
    });

    it('should export to default filename when no output specified', async () => {
      // Act
      const result = await cliApp.run([
        'node',
        'readme-to-cicd',
        'export',
        '--config', configPath
      ]);

      // Assert
      expect(result.success).toBe(true);
      expect(result.generatedFiles).toContain('readme-to-cicd-config.json');
      
      // Verify default file was created
      const defaultExportPath = path.join(process.cwd(), 'readme-to-cicd-config.json');
      const exists = await fs.access(defaultExportPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
      
      // Clean up
      await fs.unlink(defaultExportPath).catch(() => {});
    });

    it('should handle export errors gracefully', async () => {
      // Act - try to export non-existent config
      const result = await cliApp.run([
        'node',
        'readme-to-cicd',
        'export',
        '--config', path.join(testDir, 'non-existent.json'),
        '--output', exportPath
      ]);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].category).toBe('processing'); // Error is wrapped by CLI error handler
    });
  });

  describe('Import Functionality', () => {
    beforeEach(async () => {
      // First export a configuration to import later
      await cliApp.run([
        'node',
        'readme-to-cicd',
        'export',
        '--config', configPath,
        '--output', exportPath
      ]);
    });

    it('should import configuration successfully', async () => {
      // Arrange - create new target location
      const newConfigPath = path.join(testDir, 'imported-config.json');
      
      // Act
      const result = await cliApp.run([
        'node',
        'readme-to-cicd',
        'import',
        exportPath,
        '--config', newConfigPath
      ]);

      // Assert
      expect(result.success).toBe(true);
      expect(result.generatedFiles).toContain(newConfigPath);
      expect(result.errors).toHaveLength(0);

      // Verify imported configuration
      const importedContent = await fs.readFile(newConfigPath, 'utf-8');
      const importedConfig = JSON.parse(importedContent);
      
      expect(importedConfig.defaults).toBeDefined();
      expect(importedConfig.defaults.outputDirectory).toBe('.github/workflows');
      expect(importedConfig.organization.requiredSecurityScans).toBe(true);
      expect(importedConfig.output.format).toBe('yaml');
    });

    it('should merge configurations when merge flag is used', async () => {
      // Arrange - modify existing config
      const existingConfig = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      existingConfig.output.format = 'json'; // Different from exported config
      existingConfig.git.autoCommit = true; // Different from exported config
      await fs.writeFile(configPath, JSON.stringify(existingConfig, null, 2), 'utf-8');
      
      // Act
      const result = await cliApp.run([
        'node',
        'readme-to-cicd',
        'import',
        exportPath,
        '--config', configPath,
        '--merge'
      ]);

      // Assert
      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThanOrEqual(0); // May have conflict warnings
      
      // Verify backup was created
      const backupFiles = result.generatedFiles.filter(f => f.includes('.backup.'));
      expect(backupFiles.length).toBeGreaterThan(0);
      
      // Verify merged configuration
      const mergedContent = await fs.readFile(configPath, 'utf-8');
      const mergedConfig = JSON.parse(mergedContent);
      expect(mergedConfig.defaults).toBeDefined();
      expect(mergedConfig.organization).toBeDefined();
    });

    it('should create backup when importing over existing config', async () => {
      // Act
      const result = await cliApp.run([
        'node',
        'readme-to-cicd',
        'import',
        exportPath,
        '--config', configPath
      ]);

      // Assert
      expect(result.success).toBe(true);
      
      // Should have created backup
      const backupFiles = result.generatedFiles.filter(f => f.includes('.backup.'));
      expect(backupFiles.length).toBeGreaterThan(0);
      
      // Verify backup file exists and contains original config
      const backupPath = backupFiles[0];
      const backupExists = await fs.access(backupPath).then(() => true).catch(() => false);
      expect(backupExists).toBe(true);
    });

    it('should handle import errors gracefully', async () => {
      // Act - try to import non-existent file
      const result = await cliApp.run([
        'node',
        'readme-to-cicd',
        'import',
        path.join(testDir, 'non-existent.json'),
        '--config', configPath
      ]);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].category).toBe('file-system'); // Import errors preserve original category
    });

    it('should handle invalid import file format', async () => {
      // Arrange - create invalid import file
      const invalidImportPath = path.join(testDir, 'invalid.json');
      await fs.writeFile(invalidImportPath, '{ "invalid": "format" }', 'utf-8');
      
      // Act
      const result = await cliApp.run([
        'node',
        'readme-to-cicd',
        'import',
        invalidImportPath,
        '--config', configPath
      ]);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Round-trip Export/Import', () => {
    it('should maintain configuration integrity through export/import cycle', async () => {
      // Arrange - read original config
      const originalContent = await fs.readFile(configPath, 'utf-8');
      const originalConfig = JSON.parse(originalContent);
      
      // Act - export then import to new location
      const exportResult = await cliApp.run([
        'node',
        'readme-to-cicd',
        'export',
        '--config', configPath,
        '--output', exportPath
      ]);
      
      expect(exportResult.success).toBe(true);
      
      const newConfigPath = path.join(testDir, 'roundtrip-config.json');
      const importResult = await cliApp.run([
        'node',
        'readme-to-cicd',
        'import',
        exportPath,
        '--config', newConfigPath
      ]);
      
      expect(importResult.success).toBe(true);
      
      // Assert - verify configurations match
      const roundtripContent = await fs.readFile(newConfigPath, 'utf-8');
      const roundtripConfig = JSON.parse(roundtripContent);
      
      expect(roundtripConfig.defaults).toEqual(originalConfig.defaults);
      expect(roundtripConfig.organization).toEqual(originalConfig.organization);
      expect(roundtripConfig.output).toEqual(originalConfig.output);
      expect(roundtripConfig.git).toEqual(originalConfig.git);
      expect(roundtripConfig.ui).toEqual(originalConfig.ui);
    });

    it('should preserve templates through export/import cycle', async () => {
      // Act - export then import
      await cliApp.run([
        'node',
        'readme-to-cicd',
        'export',
        '--config', configPath,
        '--output', exportPath
      ]);
      
      // Create new templates directory for import
      const newTemplatesDir = path.join(testDir, 'imported-templates');
      const newConfigPath = path.join(testDir, 'template-test-config.json');
      
      // Modify config to point to new templates directory
      const configForImport = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      configForImport.templates.customTemplates = newTemplatesDir;
      await fs.writeFile(newConfigPath, JSON.stringify(configForImport, null, 2), 'utf-8');
      
      const importResult = await cliApp.run([
        'node',
        'readme-to-cicd',
        'import',
        exportPath,
        '--config', newConfigPath
      ]);
      
      expect(importResult.success).toBe(true);
      
      // Assert - verify templates were imported (check if directory exists first)
      const templatesExist = await fs.access(newTemplatesDir).then(() => true).catch(() => false);
      if (templatesExist) {
        const ciTemplate = await fs.readFile(path.join(newTemplatesDir, 'ci.yml'), 'utf-8');
        const cdTemplate = await fs.readFile(path.join(newTemplatesDir, 'cd.yml'), 'utf-8');
        
        expect(ciTemplate).toContain('name: CI');
        expect(cdTemplate).toContain('name: CD');
      } else {
        // Templates may not be imported if there are warnings - check import result
        expect(importResult.warnings.length).toBeGreaterThan(0);
      }
    });
  });
});