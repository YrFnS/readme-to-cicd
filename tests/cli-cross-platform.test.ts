/**
 * CLI Cross-Platform Tests
 * 
 * Tests CLI behavior across different platforms and environments:
 * - Windows, macOS, Linux compatibility
 * - CI/CD environment detection and adaptation
 * - Path handling and file system operations
 * - Shell command compatibility
 * - Environment variable handling
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CLIApplication } from '../src/cli/lib/cli-application';
import { CIEnvironment } from '../src/cli/lib/ci-environment';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('CLI Cross-Platform Tests', () => {
  let cliApp: CLIApplication;
  let ciEnvironment: CIEnvironment;
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cli-cross-platform-'));
    originalEnv = { ...process.env };
    
    cliApp = new CLIApplication();
    ciEnvironment = new CIEnvironment();
  });

  afterEach(async () => {
    // Restore original environment
    process.env = originalEnv;
    
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Platform-Specific Path Handling', () => {
    it('should handle Windows path separators correctly', async () => {
      const projectDir = path.join(tempDir, 'windows-paths');
      await fs.mkdir(projectDir, { recursive: true });

      await fs.writeFile(path.join(projectDir, 'README.md'), '# Windows Path Test\n\n## Build\n```bash\nnpm run build\n```');

      // Test with Windows-style paths
      const windowsStylePath = projectDir.replace(/\//g, '\\');
      
      const result = await cliApp.execute([
        'generate',
        '--project-dir', windowsStylePath,
        '--dry-run'
      ]);

      expect(result.success).toBe(true);
      expect(result.errors.filter(e => e.message.includes('path')).length).toBe(0);
    });

    it('should handle Unix path separators correctly', async () => {
      const projectDir = path.join(tempDir, 'unix-paths');
      await fs.mkdir(projectDir, { recursive: true });

      await fs.writeFile(path.join(projectDir, 'README.md'), '# Unix Path Test\n\n## Build\n```bash\nnpm run build\n```');

      // Test with Unix-style paths
      const unixStylePath = projectDir.replace(/\\/g, '/');
      
      const result = await cliApp.execute([
        'generate',
        '--project-dir', unixStylePath,
        '--dry-run'
      ]);

      expect(result.success).toBe(true);
      expect(result.errors.filter(e => e.message.includes('path')).length).toBe(0);
    });

    it('should resolve relative paths correctly across platforms', async () => {
      const projectDir = path.join(tempDir, 'relative-paths');
      await fs.mkdir(projectDir, { recursive: true });

      await fs.writeFile(path.join(projectDir, 'README.md'), '# Relative Path Test\n\n## Build\n```bash\nnpm run build\n```');

      // Change to project directory and use relative paths
      const originalCwd = process.cwd();
      
      try {
        process.chdir(projectDir);
        
        const result = await cliApp.execute([
          'generate',
          '--readme-path', './README.md',
          '--output-dir', './.github/workflows',
          '--dry-run'
        ]);

        expect(result.success).toBe(true);
        
      } finally {
        process.chdir(originalCwd);
      }
    });
  });  de
scribe('CI/CD Environment Detection and Adaptation', () => {
    const ciEnvironments = [
      {
        name: 'GitHub Actions',
        env: { GITHUB_ACTIONS: 'true', CI: 'true', RUNNER_OS: 'Linux' },
        expectedBehavior: {
          nonInteractive: true,
          outputFormat: 'json',
          exitCodes: true
        }
      },
      {
        name: 'GitLab CI',
        env: { GITLAB_CI: 'true', CI: 'true' },
        expectedBehavior: {
          nonInteractive: true,
          outputFormat: 'json',
          exitCodes: true
        }
      },
      {
        name: 'Jenkins',
        env: { JENKINS_URL: 'http://jenkins.local', BUILD_NUMBER: '123' },
        expectedBehavior: {
          nonInteractive: true,
          outputFormat: 'json',
          exitCodes: true
        }
      },
      {
        name: 'Azure DevOps',
        env: { TF_BUILD: 'True', AGENT_OS: 'Linux' },
        expectedBehavior: {
          nonInteractive: true,
          outputFormat: 'json',
          exitCodes: true
        }
      },
      {
        name: 'CircleCI',
        env: { CIRCLECI: 'true', CI: 'true' },
        expectedBehavior: {
          nonInteractive: true,
          outputFormat: 'json',
          exitCodes: true
        }
      }
    ];

    ciEnvironments.forEach(ciEnv => {
      it(`should detect and adapt to ${ciEnv.name} environment`, async () => {
        // Set CI environment variables
        Object.assign(process.env, ciEnv.env);

        const projectDir = path.join(tempDir, `ci-${ciEnv.name.toLowerCase().replace(/\s+/g, '-')}`);
        await fs.mkdir(projectDir, { recursive: true });
        
        await fs.writeFile(path.join(projectDir, 'README.md'), `# ${ciEnv.name} Test\n\n## Build\n\`\`\`bash\nnpm run build\n\`\`\``);

        const result = await cliApp.execute([
          'generate',
          '--project-dir', projectDir,
          '--dry-run'
        ]);

        expect(result.success).toBe(true);
        
        // Verify CI-specific adaptations
        if (ciEnv.expectedBehavior.nonInteractive) {
          expect(result.summary.interactiveMode).toBe(false);
        }
        
        if (ciEnv.expectedBehavior.outputFormat) {
          expect(result.summary.outputFormat).toBe(ciEnv.expectedBehavior.outputFormat);
        }
        
        if (ciEnv.expectedBehavior.exitCodes) {
          expect(result.exitCode).toBeDefined();
          expect(typeof result.exitCode).toBe('number');
        }
      });
    });

    it('should provide machine-readable output in CI environments', async () => {
      process.env.CI = 'true';
      process.env.GITHUB_ACTIONS = 'true';

      const projectDir = path.join(tempDir, 'machine-readable');
      await fs.mkdir(projectDir, { recursive: true });
      
      await fs.writeFile(path.join(projectDir, 'README.md'), '# Machine Readable Test\n\n## Build\n```bash\nnpm run build\n```');

      const result = await cliApp.execute([
        'generate',
        '--project-dir', projectDir,
        '--output-format', 'json',
        '--dry-run'
      ]);

      expect(result.success).toBe(true);
      expect(result.machineReadableOutput).toBeDefined();
      
      // Verify JSON structure
      const jsonOutput = result.machineReadableOutput;
      expect(jsonOutput.version).toBeDefined();
      expect(jsonOutput.timestamp).toBeDefined();
      expect(jsonOutput.result).toBeDefined();
      expect(jsonOutput.summary).toBeDefined();
    });

    it('should handle CI environment variables for configuration', async () => {
      process.env.CI = 'true';
      process.env.README_TO_CICD_OUTPUT_DIR = '.github/workflows';
      process.env.README_TO_CICD_WORKFLOW_TYPES = 'ci,cd';
      process.env.README_TO_CICD_VERBOSE = 'true';

      const projectDir = path.join(tempDir, 'ci-env-vars');
      await fs.mkdir(projectDir, { recursive: true });
      
      await fs.writeFile(path.join(projectDir, 'README.md'), '# CI Env Vars Test\n\n## Build\n```bash\nnpm run build\n```');

      const result = await cliApp.execute([
        'generate',
        '--project-dir', projectDir,
        '--dry-run'
      ]);

      expect(result.success).toBe(true);
      expect(result.summary.configSource).toContain('environment');
      expect(result.summary.resolvedConfig.outputDirectory).toBe('.github/workflows');
      expect(result.summary.resolvedConfig.workflowTypes).toEqual(['ci', 'cd']);
    });
  });

  describe('Shell Command Compatibility', () => {
    it('should handle platform-specific npm commands', async () => {
      const projectDir = path.join(tempDir, 'npm-commands');
      await fs.mkdir(projectDir, { recursive: true });

      const readmeWithNpmCommands = `# NPM Commands Test

## Installation
\`\`\`bash
npm install
\`\`\`

## Windows Installation
\`\`\`cmd
npm.cmd install
\`\`\`

## Build
\`\`\`bash
npm run build
\`\`\`

## Windows Build
\`\`\`cmd
npm.cmd run build
\`\`\`
`;

      await fs.writeFile(path.join(projectDir, 'README.md'), readmeWithNpmCommands);

      const result = await cliApp.execute([
        'generate',
        '--project-dir', projectDir,
        '--platform', 'windows',
        '--dry-run'
      ]);

      expect(result.success).toBe(true);
      
      // Should adapt commands for Windows
      const adaptedCommands = result.summary.adaptedCommands || [];
      expect(adaptedCommands.some(cmd => cmd.includes('npm.cmd'))).toBe(true);
    });

    it('should handle PowerShell vs Bash command differences', async () => {
      const projectDir = path.join(tempDir, 'shell-differences');
      await fs.mkdir(projectDir, { recursive: true });

      const readmeWithShellCommands = `# Shell Commands Test

## Bash Commands
\`\`\`bash
ls -la
grep "pattern" file.txt
find . -name "*.js"
\`\`\`

## PowerShell Commands
\`\`\`powershell
Get-ChildItem
Select-String "pattern" file.txt
Get-ChildItem -Recurse -Filter "*.js"
\`\`\`

## CMD Commands
\`\`\`cmd
dir
findstr "pattern" file.txt
\`\`\`
`;

      await fs.writeFile(path.join(projectDir, 'README.md'), readmeWithShellCommands);

      // Test Windows adaptation
      const windowsResult = await cliApp.execute([
        'generate',
        '--project-dir', projectDir,
        '--platform', 'windows',
        '--dry-run'
      ]);

      expect(windowsResult.success).toBe(true);
      
      // Test Unix adaptation
      const unixResult = await cliApp.execute([
        'generate',
        '--project-dir', projectDir,
        '--platform', 'linux',
        '--dry-run'
      ]);

      expect(unixResult.success).toBe(true);
    });

    it('should handle path separators in commands', async () => {
      const projectDir = path.join(tempDir, 'path-separators');
      await fs.mkdir(projectDir, { recursive: true });

      const readmeWithPaths = `# Path Separators Test

## Build
\`\`\`bash
./scripts/build.sh
\`\`\`

## Windows Build
\`\`\`cmd
.\\scripts\\build.bat
\`\`\`

## Copy Files
\`\`\`bash
cp src/file.js dist/file.js
\`\`\`

## Windows Copy
\`\`\`cmd
copy src\\file.js dist\\file.js
\`\`\`
`;

      await fs.writeFile(path.join(projectDir, 'README.md'), readmeWithPaths);

      const result = await cliApp.execute([
        'generate',
        '--project-dir', projectDir,
        '--dry-run'
      ]);

      expect(result.success).toBe(true);
      
      // Should normalize paths for target platform
      const normalizedCommands = result.summary.normalizedCommands || [];
      expect(normalizedCommands.length).toBeGreaterThan(0);
    });
  });

  describe('File System Operations', () => {
    it('should handle different line ending formats', async () => {
      const projectDir = path.join(tempDir, 'line-endings');
      await fs.mkdir(projectDir, { recursive: true });

      const baseContent = '# Line Endings Test\n\n## Build\n```bash\nnpm run build\n```';
      
      const formats = [
        { name: 'LF', content: baseContent },
        { name: 'CRLF', content: baseContent.replace(/\n/g, '\r\n') },
        { name: 'CR', content: baseContent.replace(/\n/g, '\r') }
      ];

      for (const format of formats) {
        await fs.writeFile(path.join(projectDir, 'README.md'), format.content, 'binary');

        const result = await cliApp.execute([
          'generate',
          '--project-dir', projectDir,
          '--dry-run'
        ]);

        expect(result.success).toBe(true);
        expect(result.errors.filter(e => e.message.includes('line ending')).length).toBe(0);
      }
    });

    it('should handle file permissions correctly', async () => {
      const projectDir = path.join(tempDir, 'permissions');
      await fs.mkdir(projectDir, { recursive: true });

      await fs.writeFile(path.join(projectDir, 'README.md'), '# Permissions Test\n\n## Build\n```bash\nnpm run build\n```');

      // Test with read-only output directory
      const readOnlyDir = path.join(projectDir, 'readonly-output');
      await fs.mkdir(readOnlyDir, { recursive: true });

      if (process.platform !== 'win32') {
        try {
          await fs.chmod(readOnlyDir, 0o444); // Read-only

          const result = await cliApp.execute([
            'generate',
            '--project-dir', projectDir,
            '--output-dir', readOnlyDir
          ]);

          // Should handle permission error gracefully
          if (!result.success) {
            expect(result.errors.some(e => e.message.toLowerCase().includes('permission'))).toBe(true);
            expect(result.suggestions.some(s => s.toLowerCase().includes('permission'))).toBe(true);
          }

        } finally {
          // Restore permissions for cleanup
          try {
            await fs.chmod(readOnlyDir, 0o755);
          } catch {
            // Ignore errors during cleanup
          }
        }
      }
    });

    it('should handle case-sensitive vs case-insensitive file systems', async () => {
      const projectDir = path.join(tempDir, 'case-sensitivity');
      await fs.mkdir(projectDir, { recursive: true });

      // Create files with different cases
      await fs.writeFile(path.join(projectDir, 'README.md'), '# Case Test');
      await fs.writeFile(path.join(projectDir, 'readme.md'), '# Lowercase readme');

      const result = await cliApp.execute([
        'generate',
        '--project-dir', projectDir,
        '--dry-run'
      ]);

      expect(result.success).toBe(true);
      
      // Should handle case sensitivity appropriately for the platform
      if (process.platform === 'win32' || process.platform === 'darwin') {
        // Case-insensitive file systems - should detect conflict
        expect(result.warnings.some(w => w.message.includes('case'))).toBe(true);
      }
    });
  });

  describe('Environment Variable Handling', () => {
    it('should expand environment variables in configuration', async () => {
      const projectDir = path.join(tempDir, 'env-expansion');
      await fs.mkdir(projectDir, { recursive: true });

      // Set test environment variables
      process.env.TEST_OUTPUT_DIR = 'custom-workflows';
      process.env.TEST_PROJECT_NAME = 'env-test-project';
      process.env.TEST_TEMPLATE_PATH = '/custom/templates';

      const configWithEnvVars = {
        defaults: {
          outputDirectory: '${TEST_OUTPUT_DIR}',
          projectName: '${TEST_PROJECT_NAME}'
        },
        templates: {
          customPath: '${TEST_TEMPLATE_PATH}'
        }
      };

      await fs.writeFile(
        path.join(projectDir, '.readme-to-cicd.json'),
        JSON.stringify(configWithEnvVars, null, 2)
      );

      await fs.writeFile(path.join(projectDir, 'README.md'), '# Env Expansion Test\n\n## Build\n```bash\nnpm run build\n```');

      const result = await cliApp.execute([
        'generate',
        '--project-dir', projectDir,
        '--dry-run'
      ]);

      expect(result.success).toBe(true);
      
      // Should expand environment variables
      expect(result.summary.resolvedConfig.outputDirectory).toBe('custom-workflows');
      expect(result.summary.resolvedConfig.projectName).toBe('env-test-project');
    });

    it('should handle missing environment variables gracefully', async () => {
      const projectDir = path.join(tempDir, 'missing-env-vars');
      await fs.mkdir(projectDir, { recursive: true });

      const configWithMissingEnvVars = {
        defaults: {
          outputDirectory: '${MISSING_VAR}',
          fallbackDirectory: '.github/workflows'
        }
      };

      await fs.writeFile(
        path.join(projectDir, '.readme-to-cicd.json'),
        JSON.stringify(configWithMissingEnvVars, null, 2)
      );

      await fs.writeFile(path.join(projectDir, 'README.md'), '# Missing Env Vars Test\n\n## Build\n```bash\nnpm run build\n```');

      const result = await cliApp.execute([
        'generate',
        '--project-dir', projectDir,
        '--dry-run'
      ]);

      // Should handle missing variables gracefully
      expect(result.warnings.some(w => w.message.includes('environment variable'))).toBe(true);
      
      // Should use fallback or default values
      expect(result.summary.resolvedConfig.outputDirectory).toBeDefined();
    });

    it('should respect platform-specific environment variable formats', async () => {
      const projectDir = path.join(tempDir, 'platform-env-formats');
      await fs.mkdir(projectDir, { recursive: true });

      // Test different environment variable formats
      const formats = [
        { platform: 'unix', format: '${VAR_NAME}' },
        { platform: 'windows', format: '%VAR_NAME%' },
        { platform: 'powershell', format: '$env:VAR_NAME' }
      ];

      process.env.TEST_VAR = 'test-value';

      for (const format of formats) {
        const config = {
          defaults: {
            testValue: format.format.replace('VAR_NAME', 'TEST_VAR')
          }
        };

        await fs.writeFile(
          path.join(projectDir, `.readme-to-cicd-${format.platform}.json`),
          JSON.stringify(config, null, 2)
        );

        const result = await cliApp.execute([
          'generate',
          '--project-dir', projectDir,
          '--config', path.join(projectDir, `.readme-to-cicd-${format.platform}.json`),
          '--platform', format.platform,
          '--dry-run'
        ]);

        expect(result.success).toBe(true);
        
        // Should expand variables according to platform format
        if (format.platform === 'unix' || format.platform === 'windows') {
          expect(result.summary.resolvedConfig.testValue).toBe('test-value');
        }
      }
    });
  });

  describe('Platform-Specific Installation and Setup', () => {
    it('should provide platform-appropriate installation instructions', async () => {
      const platforms = [
        { name: 'win32', expectedInstructions: ['npm.cmd', 'PowerShell', 'Windows'] },
        { name: 'darwin', expectedInstructions: ['brew', 'macOS', 'Terminal'] },
        { name: 'linux', expectedInstructions: ['apt', 'yum', 'Linux', 'bash'] }
      ];

      for (const platform of platforms) {
        const result = await cliApp.execute([
          'help',
          'install',
          '--platform', platform.name
        ]);

        expect(result.success).toBe(true);
        expect(result.helpText).toBeDefined();

        // Should include platform-specific instructions
        const helpText = result.helpText.toLowerCase();
        const hasExpectedInstructions = platform.expectedInstructions.some(instruction =>
          helpText.includes(instruction.toLowerCase())
        );
        
        expect(hasExpectedInstructions).toBe(true);
      }
    });

    it('should detect and report system requirements', async () => {
      const result = await cliApp.execute(['doctor']);

      expect(result.success).toBe(true);
      expect(result.systemCheck).toBeDefined();

      // Should check Node.js version
      expect(result.systemCheck.nodeVersion).toBeDefined();
      expect(result.systemCheck.nodeVersion.supported).toBeDefined();

      // Should check npm availability
      expect(result.systemCheck.npmAvailable).toBeDefined();

      // Should check platform compatibility
      expect(result.systemCheck.platform).toBe(process.platform);
      expect(result.systemCheck.platformSupported).toBe(true);

      // Should check file system permissions
      expect(result.systemCheck.fileSystemAccess).toBeDefined();
    });
  });
});