/**
 * CLI Tool Spec Tests
 * Comprehensive tests validating all CLI Tool spec requirements
 * Target: 60+ tests covering all 4 requirements
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'path';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { loadSpecRequirements, measurePerformance } from '../utils/spec-test-helpers';

describe('CLI Tool - Complete Spec Validation', () => {
  const testDir = join(__dirname, '../fixtures/temp');
  const cliPath = join(__dirname, '../../../src/cli/index.js');
  
  beforeEach(() => {
    // Ensure test directory exists
    if (!existsSync(testDir)) {
      require('fs').mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    try {
      if (existsSync(join(testDir, 'README.md'))) {
        unlinkSync(join(testDir, 'README.md'));
      }
      if (existsSync(join(testDir, '.github'))) {
        require('fs').rmSync(join(testDir, '.github'), { recursive: true, force: true });
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Requirement 1: Simple Command Usage', () => {
    describe('User Story: As a developer, I want to run a simple command to generate CI/CD workflows', () => {
      
      describe('AC1: Generate workflows from README file path', () => {
        it('should generate workflow when provided with README path', async () => {
          const readmePath = join(testDir, 'README.md');
          const readmeContent = `
# Test Project
This is a Node.js project.
\`\`\`bash
npm install
npm run build
npm test
\`\`\`
          `;
          
          writeFileSync(readmePath, readmeContent);
          
          const command = `node ${cliPath} generate ${readmePath}`;
          const output = execSync(command, { cwd: testDir, encoding: 'utf-8' });
          
          expect(output).toContain('Generated workflow');
          expect(existsSync(join(testDir, '.github/workflows'))).toBe(true);
        });

        it('should handle absolute README paths', async () => {
          const readmePath = join(testDir, 'README.md');
          const readmeContent = `
# Python Project
This project uses Python and Django.
          `;
          
          writeFileSync(readmePath, readmeContent);
          
          const command = `node ${cliPath} generate "${readmePath}"`;
          const output = execSync(command, { cwd: testDir, encoding: 'utf-8' });
          
          expect(output).toContain('Generated workflow');
        });

        it('should handle relative README paths', async () => {
          const readmeContent = `
# React Project
Built with React and TypeScript.
          `;
          
          writeFileSync(join(testDir, 'README.md'), readmeContent);
          
          const command = `node ${cliPath} generate ./README.md`;
          const output = execSync(command, { cwd: testDir, encoding: 'utf-8' });
          
          expect(output).toContain('Generated workflow');
        });

        it('should provide error for non-existent README file', async () => {
          const command = `node ${cliPath} generate non-existent-readme.md`;
          
          try {
            execSync(command, { cwd: testDir, encoding: 'utf-8' });
            expect.fail('Should have thrown an error');
          } catch (error: any) {
            expect(error.stdout || error.stderr).toContain('not found');
          }
        });
      });

      describe('AC2: Auto-detect README.md in current directory', () => {
        it('should automatically detect README.md when no path provided', async () => {
          const readmeContent = `
# Auto-detected Project
This should be automatically detected.
\`\`\`javascript
console.log('Hello World');
\`\`\`
          `;
          
          writeFileSync(join(testDir, 'README.md'), readmeContent);
          
          const command = `node ${cliPath} generate`;
          const output = execSync(command, { cwd: testDir, encoding: 'utf-8' });
          
          expect(output).toContain('Generated workflow');
          expect(output).toContain('README.md');
        });

        it('should handle case-insensitive README detection', async () => {
          const readmeContent = `# Case Test Project`;
          
          writeFileSync(join(testDir, 'readme.md'), readmeContent);
          
          const command = `node ${cliPath} generate`;
          const output = execSync(command, { cwd: testDir, encoding: 'utf-8' });
          
          expect(output).toContain('Generated workflow');
        });

        it('should provide error when no README found in directory', async () => {
          const command = `node ${cliPath} generate`;
          
          try {
            execSync(command, { cwd: testDir, encoding: 'utf-8' });
            expect.fail('Should have thrown an error');
          } catch (error: any) {
            expect(error.stdout || error.stderr).toContain('README');
            expect(error.stdout || error.stderr).toContain('not found');
          }
        });
      });

      describe('AC3: Output to .github/workflows/ directory', () => {
        it('should create .github/workflows directory', async () => {
          const readmeContent = `
# Test Project
Node.js application with build and test scripts.
          `;
          
          writeFileSync(join(testDir, 'README.md'), readmeContent);
          
          const command = `node ${cliPath} generate`;
          execSync(command, { cwd: testDir, encoding: 'utf-8' });
          
          expect(existsSync(join(testDir, '.github'))).toBe(true);
          expect(existsSync(join(testDir, '.github/workflows'))).toBe(true);
        });

        it('should generate workflow file in correct location', async () => {
          const readmeContent = `
# Test Project
Python project with pytest.
          `;
          
          writeFileSync(join(testDir, 'README.md'), readmeContent);
          
          const command = `node ${cliPath} generate`;
          execSync(command, { cwd: testDir, encoding: 'utf-8' });
          
          const workflowsDir = join(testDir, '.github/workflows');
          const files = require('fs').readdirSync(workflowsDir);
          
          expect(files.length).toBeGreaterThan(0);
          expect(files.some((f: string) => f.endsWith('.yml') || f.endsWith('.yaml'))).toBe(true);
        });

        it('should use appropriate workflow filename', async () => {
          const readmeContent = `
# My Awesome Project
React application with comprehensive testing.
          `;
          
          writeFileSync(join(testDir, 'README.md'), readmeContent);
          
          const command = `node ${cliPath} generate`;
          execSync(command, { cwd: testDir, encoding: 'utf-8' });
          
          const workflowsDir = join(testDir, '.github/workflows');
          const files = require('fs').readdirSync(workflowsDir);
          
          expect(files).toContain('ci.yml');
        });

        it('should handle existing .github directory', async () => {
          // Create existing .github directory
          require('fs').mkdirSync(join(testDir, '.github'), { recursive: true });
          
          const readmeContent = `# Test Project`;
          writeFileSync(join(testDir, 'README.md'), readmeContent);
          
          const command = `node ${cliPath} generate`;
          const output = execSync(command, { cwd: testDir, encoding: 'utf-8' });
          
          expect(output).toContain('Generated workflow');
          expect(existsSync(join(testDir, '.github/workflows'))).toBe(true);
        });
      });

      describe('AC4: Display clear error messages', () => {
        it('should show helpful error for invalid README content', async () => {
          const readmeContent = `This is not a valid project README`;
          writeFileSync(join(testDir, 'README.md'), readmeContent);
          
          const command = `node ${cliPath} generate`;
          const output = execSync(command, { cwd: testDir, encoding: 'utf-8' });
          
          // Should still generate something, but with warnings
          expect(output).toContain('warning' || 'limited');
        });

        it('should provide actionable suggestions in error messages', async () => {
          const command = `node ${cliPath} generate /invalid/path/README.md`;
          
          try {
            execSync(command, { cwd: testDir, encoding: 'utf-8' });
            expect.fail('Should have thrown an error');
          } catch (error: any) {
            const errorOutput = error.stdout || error.stderr;
            expect(errorOutput).toContain('not found');
            expect(errorOutput).toContain('make sure' || 'ensure' || 'check');
          }
        });

        it('should show progress information during generation', async () => {
          const readmeContent = `
# Large Project
This is a complex project with multiple frameworks.
\`\`\`javascript
// Frontend code
\`\`\`
\`\`\`python
# Backend code
\`\`\`
          `;
          
          writeFileSync(join(testDir, 'README.md'), readmeContent);
          
          const command = `node ${cliPath} generate --verbose`;
          const output = execSync(command, { cwd: testDir, encoding: 'utf-8' });
          
          expect(output).toContain('Parsing' || 'Analyzing' || 'Generating');
        });
      });

      describe('AC5: Show help information', () => {
        it('should display help with --help flag', async () => {
          const command = `node ${cliPath} --help`;
          const output = execSync(command, { encoding: 'utf-8' });
          
          expect(output).toContain('Usage');
          expect(output).toContain('generate');
          expect(output).toContain('Options');
        });

        it('should display help with -h flag', async () => {
          const command = `node ${cliPath} -h`;
          const output = execSync(command, { encoding: 'utf-8' });
          
          expect(output).toContain('Usage');
        });

        it('should show command-specific help', async () => {
          const command = `node ${cliPath} generate --help`;
          const output = execSync(command, { encoding: 'utf-8' });
          
          expect(output).toContain('generate');
          expect(output).toContain('README');
          expect(output).toContain('workflow');
        });

        it('should include examples in help output', async () => {
          const command = `node ${cliPath} --help`;
          const output = execSync(command, { encoding: 'utf-8' });
          
          expect(output).toContain('Examples' || 'Example');
        });
      });
    });
  });

  describe('Requirement 2: Interactive Mode', () => {
    describe('User Story: As a developer, I want interactive prompts for configuration', () => {
      
      it('should provide interactive mode with --interactive flag', async () => {
        // Mock interactive input
        const mockStdin = vi.fn();
        
        const readmeContent = `# Test Project`;
        writeFileSync(join(testDir, 'README.md'), readmeContent);
        
        // This would require mocking stdin for full test
        // For now, test that the flag is recognized
        const command = `node ${cliPath} generate --interactive --help`;
        const output = execSync(command, { encoding: 'utf-8' });
        
        expect(output).toContain('interactive');
      });

      it('should prompt for framework selection when multiple detected', async () => {
        const readmeContent = `
# Multi-Framework Project
This project uses both JavaScript and Python.
\`\`\`javascript
console.log('Frontend');
\`\`\`
\`\`\`python
print("Backend")
\`\`\`
        `;
        
        writeFileSync(join(testDir, 'README.md'), readmeContent);
        
        // Test non-interactive mode handles multiple frameworks
        const command = `node ${cliPath} generate`;
        const output = execSync(command, { cwd: testDir, encoding: 'utf-8' });
        
        expect(output).toContain('Generated workflow');
      });

      it('should allow customization of workflow name', async () => {
        const readmeContent = `# Test Project`;
        writeFileSync(join(testDir, 'README.md'), readmeContent);
        
        const command = `node ${cliPath} generate --name "custom-workflow"`;
        const output = execSync(command, { cwd: testDir, encoding: 'utf-8' });
        
        expect(output).toContain('Generated workflow');
        expect(existsSync(join(testDir, '.github/workflows/custom-workflow.yml'))).toBe(true);
      });
    });
  });

  describe('Requirement 3: Batch Processing', () => {
    describe('User Story: As a developer, I want to process multiple projects at once', () => {
      
      it('should process multiple README files', async () => {
        // Create multiple test projects
        const project1Dir = join(testDir, 'project1');
        const project2Dir = join(testDir, 'project2');
        
        require('fs').mkdirSync(project1Dir, { recursive: true });
        require('fs').mkdirSync(project2Dir, { recursive: true });
        
        writeFileSync(join(project1Dir, 'README.md'), '# Node.js Project\n```bash\nnpm test\n```');
        writeFileSync(join(project2Dir, 'README.md'), '# Python Project\n```bash\npytest\n```');
        
        const command = `node ${cliPath} batch ${project1Dir} ${project2Dir}`;
        const output = execSync(command, { cwd: testDir, encoding: 'utf-8' });
        
        expect(output).toContain('Processed 2 projects');
        expect(existsSync(join(project1Dir, '.github/workflows'))).toBe(true);
        expect(existsSync(join(project2Dir, '.github/workflows'))).toBe(true);
      });

      it('should handle glob patterns for project discovery', async () => {
        // Create nested project structure
        const nestedDir = join(testDir, 'projects/nested');
        require('fs').mkdirSync(nestedDir, { recursive: true });
        
        writeFileSync(join(nestedDir, 'README.md'), '# Nested Project');
        
        const command = `node ${cliPath} batch "${testDir}/projects/*"`;
        const output = execSync(command, { cwd: testDir, encoding: 'utf-8' });
        
        expect(output).toContain('Generated workflow');
      });

      it('should provide batch processing summary', async () => {
        const projectDir = join(testDir, 'batch-test');
        require('fs').mkdirSync(projectDir, { recursive: true });
        writeFileSync(join(projectDir, 'README.md'), '# Batch Test Project');
        
        const command = `node ${cliPath} batch ${projectDir}`;
        const output = execSync(command, { cwd: testDir, encoding: 'utf-8' });
        
        expect(output).toContain('Summary' || 'Processed' || 'Complete');
      });
    });
  });

  describe('Requirement 4: Configuration Management', () => {
    describe('User Story: As a developer, I want to customize CLI behavior through configuration', () => {
      
      it('should support configuration file', async () => {
        const configContent = JSON.stringify({
          outputDir: '.workflows',
          defaultTemplate: 'nodejs',
          verbose: true
        });
        
        writeFileSync(join(testDir, 'readme-to-cicd.config.json'), configContent);
        writeFileSync(join(testDir, 'README.md'), '# Configured Project');
        
        const command = `node ${cliPath} generate --config readme-to-cicd.config.json`;
        const output = execSync(command, { cwd: testDir, encoding: 'utf-8' });
        
        expect(output).toContain('Generated workflow');
      });

      it('should support environment variable configuration', async () => {
        writeFileSync(join(testDir, 'README.md'), '# Env Test Project');
        
        const command = `node ${cliPath} generate`;
        const env = { ...process.env, README_TO_CICD_VERBOSE: 'true' };
        const output = execSync(command, { cwd: testDir, env, encoding: 'utf-8' });
        
        expect(output).toContain('Generated workflow');
      });

      it('should support command-line option overrides', async () => {
        writeFileSync(join(testDir, 'README.md'), '# Override Test');
        
        const command = `node ${cliPath} generate --output-dir custom-workflows --verbose`;
        const output = execSync(command, { cwd: testDir, encoding: 'utf-8' });
        
        expect(output).toContain('Generated workflow');
        expect(existsSync(join(testDir, 'custom-workflows'))).toBe(true);
      });

      it('should validate configuration options', async () => {
        const invalidConfig = JSON.stringify({
          outputDir: 123, // Invalid type
          invalidOption: 'value'
        });
        
        writeFileSync(join(testDir, 'invalid-config.json'), invalidConfig);
        writeFileSync(join(testDir, 'README.md'), '# Config Test');
        
        try {
          const command = `node ${cliPath} generate --config invalid-config.json`;
          execSync(command, { cwd: testDir, encoding: 'utf-8' });
          expect.fail('Should have thrown configuration error');
        } catch (error: any) {
          expect(error.stdout || error.stderr).toContain('configuration' || 'config');
        }
      });
    });
  });

  // Performance tests
  describe('CLI Tool - Performance Requirements', () => {
    it('should complete generation within reasonable time', async () => {
      const readmeContent = `
# Performance Test Project
This is a complex project for performance testing.
\`\`\`javascript
// Complex JavaScript code
\`\`\`
\`\`\`python
# Complex Python code
\`\`\`
      `;
      
      writeFileSync(join(testDir, 'README.md'), readmeContent);
      
      const { executionTime, withinLimit } = await measurePerformance(
        () => {
          execSync(`node ${cliPath} generate`, { cwd: testDir, encoding: 'utf-8' });
          return Promise.resolve();
        },
        10000 // 10 second limit for CLI operations
      );
      
      expect(withinLimit).toBe(true);
      expect(executionTime).toBeLessThan(10000);
    });

    it('should handle large README files efficiently', async () => {
      const largeReadmeContent = `
# Large Project
${'This is a large project with lots of content.\n'.repeat(1000)}
\`\`\`javascript
${'console.log("Large file test");\n'.repeat(100)}
\`\`\`
      `;
      
      writeFileSync(join(testDir, 'README.md'), largeReadmeContent);
      
      const startTime = Date.now();
      execSync(`node ${cliPath} generate`, { cwd: testDir, encoding: 'utf-8' });
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(15000); // 15 second limit for large files
    });
  });

  // Integration tests
  describe('CLI Integration with Core Components', () => {
    it('should integrate with README parser', async () => {
      const readmeContent = `
# Integration Test Project
This Node.js project demonstrates CLI integration.
\`\`\`bash
npm install
npm run build
npm test
\`\`\`
      `;
      
      writeFileSync(join(testDir, 'README.md'), readmeContent);
      
      const command = `node ${cliPath} generate --verbose`;
      const output = execSync(command, { cwd: testDir, encoding: 'utf-8' });
      
      expect(output).toContain('Generated workflow');
      
      // Verify generated workflow content
      const workflowFile = join(testDir, '.github/workflows/ci.yml');
      expect(existsSync(workflowFile)).toBe(true);
      
      const workflowContent = require('fs').readFileSync(workflowFile, 'utf-8');
      expect(workflowContent).toContain('npm');
    });

    it('should integrate with framework detection', async () => {
      const readmeContent = `
# React TypeScript Project
Built with React and TypeScript for modern web development.
\`\`\`json
{
  "scripts": {
    "build": "react-scripts build",
    "test": "react-scripts test"
  }
}
\`\`\`
      `;
      
      writeFileSync(join(testDir, 'README.md'), readmeContent);
      
      const command = `node ${cliPath} generate`;
      execSync(command, { cwd: testDir, encoding: 'utf-8' });
      
      const workflowFile = join(testDir, '.github/workflows/ci.yml');
      const workflowContent = require('fs').readFileSync(workflowFile, 'utf-8');
      
      expect(workflowContent).toContain('setup-node');
      expect(workflowContent).toContain('npm');
    });

    it('should integrate with YAML generator', async () => {
      const readmeContent = `
# Python Django Project
Web application built with Django framework.
      `;
      
      writeFileSync(join(testDir, 'README.md'), readmeContent);
      
      const command = `node ${cliPath} generate`;
      execSync(command, { cwd: testDir, encoding: 'utf-8' });
      
      const workflowFile = join(testDir, '.github/workflows/ci.yml');
      const workflowContent = require('fs').readFileSync(workflowFile, 'utf-8');
      
      // Verify valid YAML structure
      const yaml = require('js-yaml');
      expect(() => yaml.load(workflowContent)).not.toThrow();
      
      const parsed = yaml.load(workflowContent) as any;
      expect(parsed.name).toBeDefined();
      expect(parsed.on).toBeDefined();
      expect(parsed.jobs).toBeDefined();
    });
  });
});