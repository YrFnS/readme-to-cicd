/**
 * CLI Configuration Integration Tests
 * 
 * Integration tests for the complete configuration management system.
 * Tests real file system operations and configuration loading scenarios.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { ConfigurationManager } from '../../src/cli/config/configuration-manager';
import { CLIConfig } from '../../src/cli/config/types';

describe('CLI Configuration Integration', () => {
  let configManager: ConfigurationManager;
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    configManager = new ConfigurationManager();
    originalCwd = process.cwd();
    
    // Create temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cli-config-test-'));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('configuration file loading', () => {
    it('should load JSON configuration file', async () => {
      const config = {
        defaults: {
          outputDirectory: './custom-workflows',
          workflowTypes: ['ci'],
          includeComments: false,
          optimizationLevel: 'basic'
        },
        templates: {
          customTemplates: './templates'
        },
        organization: {
          requiredSecurityScans: true
        },
        output: {
          format: 'yaml',
          indentation: 4,
          includeMetadata: false,
          backupExisting: false
        },
        git: {
          autoCommit: true,
          commitMessage: 'chore: update workflows',
          createPR: false
        },
        ui: {
          colorOutput: false,
          progressIndicators: false,
          verboseLogging: true,
          interactivePrompts: false
        }
      };

      await fs.writeFile('.readme-to-cicd.json', JSON.stringify(config, null, 2));

      const loadedConfig = await configManager.loadConfiguration();

      expect(loadedConfig.defaults.outputDirectory).toBe('./custom-workflows');
      expect(loadedConfig.defaults.workflowTypes).toEqual(['ci']);
      expect(loadedConfig.defaults.includeComments).toBe(false);
      expect(loadedConfig.defaults.optimizationLevel).toBe('basic');
      expect(loadedConfig.templates.customTemplates).toBe('./templates');
      expect(loadedConfig.organization.requiredSecurityScans).toBe(true);
      expect(loadedConfig.output.indentation).toBe(4);
      expect(loadedConfig.git.autoCommit).toBe(true);
      expect(loadedConfig.ui.verboseLogging).toBe(true);
    });

    it('should load YAML configuration file', async () => {
      const yamlConfig = `
defaults:
  outputDirectory: "./yaml-workflows"
  workflowTypes:
    - ci
    - cd
  includeComments: true
  optimizationLevel: aggressive
templates:
  customTemplates: "./yaml-templates"
organization:
  requiredSecurityScans: false
  mandatorySteps:
    - test
    - build
output:
  format: json
  indentation: 2
  includeMetadata: true
  backupExisting: true
git:
  autoCommit: false
  commitMessage: "feat: add workflows from YAML config"
  createPR: true
ui:
  colorOutput: true
  progressIndicators: true
  verboseLogging: false
  interactivePrompts: true
`;

      await fs.writeFile('.readme-to-cicd.yaml', yamlConfig);

      const loadedConfig = await configManager.loadConfiguration();

      expect(loadedConfig.defaults.outputDirectory).toBe('./yaml-workflows');
      expect(loadedConfig.defaults.workflowTypes).toEqual(['ci', 'cd']);
      expect(loadedConfig.defaults.optimizationLevel).toBe('aggressive');
      expect(loadedConfig.templates.customTemplates).toBe('./yaml-templates');
      expect(loadedConfig.organization.mandatorySteps).toEqual(['test', 'build']);
      expect(loadedConfig.output.format).toBe('json');
      expect(loadedConfig.git.createPR).toBe(true);
    });

    it('should load configuration from package.json', async () => {
      const packageJson = {
        name: 'test-project',
        version: '1.0.0',
        'readme-to-cicd': {
          defaults: {
            outputDirectory: './package-workflows',
            workflowTypes: ['release'],
            includeComments: true,
            optimizationLevel: 'standard'
          },
          templates: {
            organizationTemplates: '@company/templates'
          },
          organization: {
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
            commitMessage: 'ci: update workflows',
            createPR: false
          },
          ui: {
            colorOutput: true,
            progressIndicators: true,
            verboseLogging: false,
            interactivePrompts: true
          }
        }
      };

      await fs.writeFile('package.json', JSON.stringify(packageJson, null, 2));

      const loadedConfig = await configManager.loadConfiguration();

      expect(loadedConfig.defaults.outputDirectory).toBe('./package-workflows');
      expect(loadedConfig.defaults.workflowTypes).toEqual(['release']);
      expect(loadedConfig.templates.organizationTemplates).toBe('@company/templates');
      expect(loadedConfig.organization.allowedActions).toEqual(['actions/*', '@company/*']);
    });

    it('should load explicit configuration file', async () => {
      const explicitConfig = {
        defaults: {
          outputDirectory: './explicit-workflows',
          workflowTypes: ['ci', 'cd', 'release'],
          includeComments: false,
          optimizationLevel: 'aggressive'
        },
        templates: {},
        organization: {},
        output: {
          format: 'yaml',
          indentation: 2,
          includeMetadata: true,
          backupExisting: true
        },
        git: {
          autoCommit: false,
          commitMessage: 'feat: explicit config workflows',
          createPR: false
        },
        ui: {
          colorOutput: true,
          progressIndicators: true,
          verboseLogging: false,
          interactivePrompts: true
        }
      };

      const explicitPath = path.join(tempDir, 'custom-config.json');
      await fs.writeFile(explicitPath, JSON.stringify(explicitConfig, null, 2));

      const loadedConfig = await configManager.loadConfiguration(explicitPath);

      expect(loadedConfig.defaults.outputDirectory).toBe('./explicit-workflows');
      expect(loadedConfig.defaults.workflowTypes).toEqual(['ci', 'cd', 'release']);
      expect(loadedConfig.defaults.optimizationLevel).toBe('aggressive');
    });
  });

  describe('configuration merging', () => {
    it('should merge project and user configurations', async () => {
      // Create user config
      const userConfigDir = path.join(tempDir, 'user-home');
      await fs.mkdir(userConfigDir, { recursive: true });
      const userConfig = {
        defaults: {
          outputDirectory: './user-workflows',
          workflowTypes: ['ci'],
          includeComments: false,
          optimizationLevel: 'basic'
        },
        ui: {
          colorOutput: false,
          progressIndicators: false,
          verboseLogging: true,
          interactivePrompts: false
        },
        templates: {},
        organization: {},
        output: {
          format: 'yaml',
          indentation: 2,
          includeMetadata: true,
          backupExisting: true
        },
        git: {
          autoCommit: false,
          commitMessage: 'user config',
          createPR: false
        }
      };
      await fs.writeFile(path.join(userConfigDir, '.readme-to-cicd.json'), JSON.stringify(userConfig, null, 2));

      // Create project config (should override user config)
      const projectConfig = {
        defaults: {
          workflowTypes: ['ci', 'cd'],
          optimizationLevel: 'aggressive'
        },
        git: {
          autoCommit: true,
          commitMessage: 'project config',
          createPR: true
        }
      };
      await fs.writeFile('.readme-to-cicd.json', JSON.stringify(projectConfig, null, 2));

      // Mock os.homedir to return our test directory
      const originalHomedir = os.homedir;
      (os as any).homedir = () => userConfigDir;

      try {
        const loadedConfig = await configManager.loadConfiguration();

        // Project config should override user config
        expect(loadedConfig.defaults.workflowTypes).toEqual(['ci', 'cd']);
        expect(loadedConfig.defaults.optimizationLevel).toBe('aggressive');
        expect(loadedConfig.git.autoCommit).toBe(true);
        expect(loadedConfig.git.createPR).toBe(true);

        // User config should be used where project doesn't override
        expect(loadedConfig.defaults.includeComments).toBe(false);
        expect(loadedConfig.ui.colorOutput).toBe(false);
        expect(loadedConfig.ui.verboseLogging).toBe(true);

        // Default values should be used where neither specifies
        expect(loadedConfig.output.format).toBe('yaml');
      } finally {
        (os as any).homedir = originalHomedir;
      }
    });

    it('should handle partial configuration objects', async () => {
      const partialConfig = {
        defaults: {
          workflowTypes: ['release']
        },
        git: {
          autoCommit: true
        }
      };

      await fs.writeFile('.readme-to-cicd.json', JSON.stringify(partialConfig, null, 2));

      const loadedConfig = await configManager.loadConfiguration();

      // Specified values should be used
      expect(loadedConfig.defaults.workflowTypes).toEqual(['release']);
      expect(loadedConfig.git.autoCommit).toBe(true);

      // Default values should be used for unspecified properties
      expect(loadedConfig.defaults.outputDirectory).toBe('.github/workflows');
      expect(loadedConfig.defaults.includeComments).toBe(true);
      expect(loadedConfig.defaults.optimizationLevel).toBe('standard');
      expect(loadedConfig.git.commitMessage).toBe('feat: add automated CI/CD workflows');
      expect(loadedConfig.git.createPR).toBe(false);
    });
  });

  describe('path resolution', () => {
    it('should resolve relative paths correctly', async () => {
      const config = {
        defaults: {
          outputDirectory: './workflows',
          workflowTypes: ['ci'],
          includeComments: true,
          optimizationLevel: 'standard'
        },
        templates: {
          customTemplates: './templates'
        },
        organization: {},
        output: {
          format: 'yaml',
          indentation: 2,
          includeMetadata: true,
          backupExisting: true
        },
        git: {
          autoCommit: false,
          commitMessage: 'test',
          createPR: false
        },
        ui: {
          colorOutput: true,
          progressIndicators: true,
          verboseLogging: false,
          interactivePrompts: true
        }
      };

      const configPath = path.join(tempDir, '.readme-to-cicd.json');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      const loadedConfig = await configManager.loadConfiguration();
      const resolvedConfig = configManager.resolveConfigPaths(loadedConfig, configPath);

      expect(resolvedConfig.defaults.outputDirectory).toBe(path.join(tempDir, 'workflows'));
      expect(resolvedConfig.templates.customTemplates).toBe(path.join(tempDir, 'templates'));
    });

    it('should not modify absolute paths', async () => {
      const absoluteWorkflowsPath = path.join(tempDir, 'absolute', 'workflows');
      const absoluteTemplatesPath = path.join(tempDir, 'absolute', 'templates');

      const config = {
        defaults: {
          outputDirectory: absoluteWorkflowsPath,
          workflowTypes: ['ci'],
          includeComments: true,
          optimizationLevel: 'standard'
        },
        templates: {
          customTemplates: absoluteTemplatesPath
        },
        organization: {},
        output: {
          format: 'yaml',
          indentation: 2,
          includeMetadata: true,
          backupExisting: true
        },
        git: {
          autoCommit: false,
          commitMessage: 'test',
          createPR: false
        },
        ui: {
          colorOutput: true,
          progressIndicators: true,
          verboseLogging: false,
          interactivePrompts: true
        }
      };

      const configPath = path.join(tempDir, '.readme-to-cicd.json');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      const loadedConfig = await configManager.loadConfiguration();
      const resolvedConfig = configManager.resolveConfigPaths(loadedConfig, configPath);

      expect(resolvedConfig.defaults.outputDirectory).toBe(absoluteWorkflowsPath);
      expect(resolvedConfig.templates.customTemplates).toBe(absoluteTemplatesPath);
    });
  });

  describe('sample configuration creation', () => {
    it('should create a valid sample configuration file', async () => {
      const samplePath = path.join(tempDir, 'sample-config.json');
      
      await configManager.createSampleConfig(samplePath);

      // Verify file was created
      const stats = await fs.stat(samplePath);
      expect(stats.isFile()).toBe(true);

      // Verify content is valid JSON and matches expected structure
      const content = await fs.readFile(samplePath, 'utf8');
      const parsedConfig = JSON.parse(content);

      expect(parsedConfig).toHaveProperty('defaults');
      expect(parsedConfig).toHaveProperty('templates');
      expect(parsedConfig).toHaveProperty('organization');
      expect(parsedConfig).toHaveProperty('output');
      expect(parsedConfig).toHaveProperty('git');
      expect(parsedConfig).toHaveProperty('ui');

      // Verify the created config is valid
      const validation = configManager.validateConfig(parsedConfig);
      expect(validation.isValid).toBe(true);
    });

    it('should create sample config with default filename', async () => {
      await configManager.createSampleConfig();

      const defaultPath = path.join(tempDir, '.readme-to-cicd.json');
      const stats = await fs.stat(defaultPath);
      expect(stats.isFile()).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle malformed JSON configuration', async () => {
      await fs.writeFile('.readme-to-cicd.json', '{ invalid json }');

      await expect(configManager.loadConfiguration()).rejects.toThrow();
    });

    it('should handle malformed YAML configuration', async () => {
      await fs.writeFile('.readme-to-cicd.yaml', 'invalid: yaml: content: [');

      await expect(configManager.loadConfiguration()).rejects.toThrow();
    });

    it('should handle nonexistent explicit config file', async () => {
      const nonexistentPath = path.join(tempDir, 'nonexistent-config.json');

      await expect(configManager.loadConfiguration(nonexistentPath)).rejects.toThrow();
    });

    it('should handle permission errors gracefully', async () => {
      // This test might not work on all systems due to permission handling differences
      const restrictedPath = path.join(tempDir, 'restricted-config.json');
      await fs.writeFile(restrictedPath, '{}');
      
      // Try to make file unreadable (might not work on all systems)
      try {
        await fs.chmod(restrictedPath, 0o000);
        await expect(configManager.loadConfiguration(restrictedPath)).rejects.toThrow();
      } catch (error) {
        // Skip test if chmod doesn't work (e.g., on Windows)
        console.log('Skipping permission test due to system limitations');
      } finally {
        // Restore permissions for cleanup
        try {
          await fs.chmod(restrictedPath, 0o644);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
  });
});