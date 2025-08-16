/**
 * InitCommand Integration Tests
 * 
 * Tests for complete initialization workflows and setup scenarios.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { InitCommand } from '../../../src/cli/lib/init-command';
import { Logger } from '../../../src/cli/lib/logger';
import { ErrorHandler } from '../../../src/cli/lib/error-handler';

describe('InitCommand Integration Tests', () => {
  let initCommand: InitCommand;
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Create test directory
    testDir = path.join(__dirname, '../../temp', `init-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    
    // Change to test directory
    originalCwd = process.cwd();
    process.chdir(testDir);

    // Create logger and error handler
    const logger = new Logger();
    logger.setLevel('error'); // Reduce noise in tests
    
    const errorHandler = new ErrorHandler();
    
    // Create InitCommand instance
    initCommand = new InitCommand(logger, errorHandler);
  });

  afterEach(async () => {
    // Restore original directory
    process.chdir(originalCwd);
    
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('basic template initialization', () => {
    it('should create configuration file with basic template', async () => {
      const result = await initCommand.execute({
        template: 'basic',
        interactive: false
      });

      expect(result.success).toBe(true);
      expect(result.generatedFiles).toContain('.readme-to-cicd.json');

      // Verify config file exists and has correct content
      const configExists = await fs.access('.readme-to-cicd.json').then(() => true).catch(() => false);
      expect(configExists).toBe(true);

      const configContent = await fs.readFile('.readme-to-cicd.json', 'utf-8');
      const config = JSON.parse(configContent);

      expect(config.defaults.outputDirectory).toBe('.github/workflows');
      expect(config.defaults.workflowTypes).toContain('ci');
      expect(config.defaults.workflowTypes).toContain('cd');
      expect(config.defaults.optimizationLevel).toBe('standard');
    });

    it('should not overwrite existing configuration without permission', async () => {
      // Create existing config
      await fs.writeFile('.readme-to-cicd.json', '{"existing": true}', 'utf-8');

      const result = await initCommand.execute({
        template: 'basic',
        interactive: false,
        overwrite: false
      });

      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('Configuration file already exists');

      // Verify original config is unchanged
      const configContent = await fs.readFile('.readme-to-cicd.json', 'utf-8');
      const config = JSON.parse(configContent);
      expect(config.existing).toBe(true);
    });
  });

  describe('team template initialization', () => {
    it('should create team configuration with required directories', async () => {
      const result = await initCommand.execute({
        template: 'team',
        interactive: false
      });

      expect(result.success).toBe(true);
      expect(result.generatedFiles).toContain('.readme-to-cicd.json');

      // Verify config file has team-specific settings
      const configContent = await fs.readFile('.readme-to-cicd.json', 'utf-8');
      const config = JSON.parse(configContent);

      expect(config.organization.requiredSecurityScans).toBe(true);
      expect(config.organization.mandatorySteps).toContain('security-scan');
      expect(config.templates.customTemplates).toBe('./ci-templates');

      // Verify ci-templates directory was created
      const templatesDir = await fs.access('./ci-templates').then(() => true).catch(() => false);
      expect(templatesDir).toBe(true);

      // Verify README was created in templates directory
      const readmeExists = await fs.access('./ci-templates/README.md').then(() => true).catch(() => false);
      expect(readmeExists).toBe(true);
    });
  });

  describe('enterprise template initialization', () => {
    it('should create enterprise configuration with security directories', async () => {
      const result = await initCommand.execute({
        template: 'enterprise',
        interactive: false
      });

      expect(result.success).toBe(true);
      expect(result.generatedFiles).toContain('.readme-to-cicd.json');

      // Verify config file has enterprise-specific settings
      const configContent = await fs.readFile('.readme-to-cicd.json', 'utf-8');
      const config = JSON.parse(configContent);

      expect(config.organization.enforceBranchProtection).toBe(true);
      expect(config.organization.requireCodeReview).toBe(true);
      expect(config.organization.mandatorySteps).toContain('compliance-check');
      expect(config.git.createPR).toBe(true);

      // Verify security and compliance directories were created
      const securityDir = await fs.access('./security-policies').then(() => true).catch(() => false);
      expect(securityDir).toBe(true);

      const complianceDir = await fs.access('./compliance-templates').then(() => true).catch(() => false);
      expect(complianceDir).toBe(true);
    });
  });

  describe('project analysis integration', () => {
    it('should detect Node.js project and customize configuration', async () => {
      // Create package.json
      const packageJson = {
        name: 'test-project',
        main: 'index.js',
        dependencies: {
          'react': '^18.0.0',
          'typescript': '^4.9.0'
        }
      };
      await fs.writeFile('package.json', JSON.stringify(packageJson, null, 2), 'utf-8');

      const result = await initCommand.execute({
        template: 'basic',
        interactive: false
      });

      expect(result.success).toBe(true);

      // Verify config was customized based on detected frameworks
      const configContent = await fs.readFile('.readme-to-cicd.json', 'utf-8');
      const config = JSON.parse(configContent);

      // TypeScript projects should include security workflows
      expect(config.defaults.workflowTypes).toContain('security');
    });

    it('should detect library project and exclude CD workflows', async () => {
      // Create library package.json (no main field)
      const packageJson = {
        name: 'test-library',
        version: '1.0.0',
        // No main field indicates library
      };
      await fs.writeFile('package.json', JSON.stringify(packageJson, null, 2), 'utf-8');

      const result = await initCommand.execute({
        template: 'basic',
        interactive: false
      });

      expect(result.success).toBe(true);

      // Verify CD workflow is excluded for libraries
      const configContent = await fs.readFile('.readme-to-cicd.json', 'utf-8');
      const config = JSON.parse(configContent);

      expect(config.defaults.workflowTypes).not.toContain('cd');
    });

    it('should detect Git repository and existing workflows', async () => {
      // Create .git directory
      await fs.mkdir('.git', { recursive: true });
      await fs.writeFile('.git/config', '[core]\n\trepositoryformatversion = 0', 'utf-8');

      // Create existing workflows
      await fs.mkdir('.github/workflows', { recursive: true });
      await fs.writeFile('.github/workflows/existing.yml', 'name: existing', 'utf-8');

      const result = await initCommand.execute({
        template: 'basic',
        interactive: false
      });

      expect(result.success).toBe(true);

      // Verify backup is enabled for existing workflows
      const configContent = await fs.readFile('.readme-to-cicd.json', 'utf-8');
      const config = JSON.parse(configContent);

      expect(config.output.backupExisting).toBe(true);
    });

    it('should detect multiple programming languages', async () => {
      // Create files for different languages
      await fs.writeFile('index.ts', 'console.log("TypeScript");', 'utf-8');
      await fs.writeFile('main.py', 'print("Python")', 'utf-8');
      await fs.writeFile('app.go', 'package main', 'utf-8');

      const result = await initCommand.execute({
        template: 'basic',
        interactive: false
      });

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Multiple languages detected - ensure all are documented in README');
    });
  });

  describe('custom output path', () => {
    it('should create configuration at custom path', async () => {
      const customPath = './config/readme-to-cicd.json';
      
      const result = await initCommand.execute({
        template: 'basic',
        interactive: false,
        outputPath: customPath
      });

      expect(result.success).toBe(true);
      expect(result.generatedFiles).toContain(customPath);

      // Verify config file exists at custom path
      const configExists = await fs.access(customPath).then(() => true).catch(() => false);
      expect(configExists).toBe(true);
    });
  });

  describe('error scenarios', () => {
    it('should handle permission errors gracefully', async () => {
      // Create a directory with restricted permissions (if possible)
      const restrictedDir = './restricted';
      await fs.mkdir(restrictedDir, { recursive: true });
      
      try {
        // Try to make directory read-only (may not work on all systems)
        await fs.chmod(restrictedDir, 0o444);
        
        const result = await initCommand.execute({
          template: 'basic',
          interactive: false,
          outputPath: './restricted/.readme-to-cicd.json'
        });

        // Should handle the error gracefully
        expect(result.success).toBe(false);
        expect(result.errors).toHaveLength(1);
      } finally {
        // Restore permissions for cleanup
        try {
          await fs.chmod(restrictedDir, 0o755);
        } catch {
          // Ignore cleanup errors
        }
      }
    });

    it('should handle invalid template names', async () => {
      const result = await initCommand.execute({
        template: 'invalid' as any,
        interactive: false
      });

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('template file installation', () => {
    it('should create README files in template directories', async () => {
      const result = await initCommand.execute({
        template: 'team',
        interactive: false
      });

      expect(result.success).toBe(true);

      // Verify README was created with appropriate content
      const readmeContent = await fs.readFile('./ci-templates/README.md', 'utf-8');
      expect(readmeContent).toContain('ci-templates');
      expect(readmeContent).toContain('Team template');
      expect(readmeContent).toContain('custom CI/CD workflow templates');
    });

    it('should create multiple directories for enterprise template', async () => {
      const result = await initCommand.execute({
        template: 'enterprise',
        interactive: false
      });

      expect(result.success).toBe(true);

      // Verify both directories were created with READMEs
      const securityReadme = await fs.readFile('./security-policies/README.md', 'utf-8');
      expect(securityReadme).toContain('security-policies');
      expect(securityReadme).toContain('security policies and compliance');

      const complianceReadme = await fs.readFile('./compliance-templates/README.md', 'utf-8');
      expect(complianceReadme).toContain('compliance-templates');
      expect(complianceReadme).toContain('compliance and audit-related');
    });
  });
});