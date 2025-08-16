/**
 * Comprehensive CLI Tool Test Suite
 * 
 * This test suite implements task 18 requirements:
 * - End-to-end test scenarios covering all CLI workflows
 * - Integration tests with real project structures and configurations
 * - User experience testing with various input scenarios
 * - Performance and load testing for batch operations
 * - Regression tests to prevent CLI behavior changes
 * - Cross-platform testing (Windows, macOS, Linux, CI/CD)
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { CLIApplication } from '../src/cli/lib/cli-application';
import { BatchProcessor } from '../src/cli/lib/batch-processor';
import { CIEnvironment } from '../src/cli/lib/ci-environment';
import { PerformanceMonitor } from '../src/cli/lib/performance-monitor';

describe('Comprehensive CLI Tool Test Suite', () => {
  let tempDir: string;
  let cliApp: CLIApplication;
  let batchProcessor: BatchProcessor;
  let ciEnvironment: CIEnvironment;
  let performanceMonitor: PerformanceMonitor;

  beforeAll(async () => {
    // Initialize CLI components for testing
    cliApp = new CLIApplication();
    batchProcessor = new BatchProcessor();
    ciEnvironment = new CIEnvironment();
    performanceMonitor = new PerformanceMonitor();
  });

  beforeEach(async () => {
    // Create temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cli-test-'));
  });

  afterEach(async () => {
    // Cleanup temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('End-to-End CLI Workflows', () => {
    it('should execute complete generate workflow successfully', async () => {
      // Create test project structure
      const projectDir = path.join(tempDir, 'test-project');
      await fs.mkdir(projectDir, { recursive: true });
      
      const readmeContent = `# Test Project

This is a Node.js project with TypeScript.

## Installation

\`\`\`bash
npm install
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`

## Test

\`\`\`bash
npm test
\`\`\`
`;

      await fs.writeFile(path.join(projectDir, 'README.md'), readmeContent);
      await fs.writeFile(path.join(projectDir, 'package.json'), JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        scripts: {
          build: 'tsc',
          test: 'jest'
        }
      }, null, 2));

      // Execute CLI generate command
      const result = await cliApp.execute([
        'generate',
        '--readme-path', path.join(projectDir, 'README.md'),
        '--output-dir', path.join(projectDir, '.github', 'workflows'),
        '--workflow-type', 'ci',
        '--dry-run'
      ]);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.generatedFiles).toBeDefined();
    });

    it('should execute validate workflow with existing workflows', async () => {
      // Create test project with existing workflow
      const projectDir = path.join(tempDir, 'validate-project');
      const workflowDir = path.join(projectDir, '.github', 'workflows');
      await fs.mkdir(workflowDir, { recursive: true });

      const existingWorkflow = `name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
`;

      await fs.writeFile(path.join(workflowDir, 'ci.yml'), existingWorkflow);

      // Execute CLI validate command
      const result = await cliApp.execute([
        'validate',
        '--workflow-path', path.join(workflowDir, 'ci.yml')
      ]);

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
    });

    it('should execute init workflow to create configuration', async () => {
      const projectDir = path.join(tempDir, 'init-project');
      await fs.mkdir(projectDir, { recursive: true });

      // Execute CLI init command
      const result = await cliApp.execute([
        'init',
        '--project-dir', projectDir,
        '--non-interactive'
      ]);

      expect(result.success).toBe(true);
      
      // Verify configuration file was created
      const configPath = path.join(projectDir, '.readme-to-cicd.json');
      const configExists = await fs.access(configPath).then(() => true).catch(() => false);
      expect(configExists).toBe(true);
    });

    it('should execute export/import workflow for configuration sharing', async () => {
      const sourceDir = path.join(tempDir, 'source-project');
      const targetDir = path.join(tempDir, 'target-project');
      await fs.mkdir(sourceDir, { recursive: true });
      await fs.mkdir(targetDir, { recursive: true });

      // Create source configuration
      const sourceConfig = {
        defaults: {
          outputDirectory: '.github/workflows',
          workflowTypes: ['ci', 'cd'],
          includeComments: true
        },
        templates: {
          customTemplates: './custom-templates'
        }
      };

      await fs.writeFile(
        path.join(sourceDir, '.readme-to-cicd.json'),
        JSON.stringify(sourceConfig, null, 2)
      );

      // Export configuration
      const exportResult = await cliApp.execute([
        'export',
        '--config', path.join(sourceDir, '.readme-to-cicd.json'),
        '--output', path.join(tempDir, 'exported-config.json')
      ]);

      expect(exportResult.success).toBe(true);

      // Import configuration
      const importResult = await cliApp.execute([
        'import',
        '--config', path.join(tempDir, 'exported-config.json'),
        '--target-dir', targetDir
      ]);

      expect(importResult.success).toBe(true);
      
      // Verify imported configuration
      const importedConfigPath = path.join(targetDir, '.readme-to-cicd.json');
      const importedConfigExists = await fs.access(importedConfigPath).then(() => true).catch(() => false);
      expect(importedConfigExists).toBe(true);
    });
  });

  describe('Integration Tests with Real Project Structures', () => {
    const projectTemplates = [
      {
        name: 'React TypeScript Project',
        files: {
          'README.md': `# React TypeScript App

A modern React application built with TypeScript.

## Installation

\`\`\`bash
npm install
\`\`\`

## Development

\`\`\`bash
npm start
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`

## Test

\`\`\`bash
npm test
\`\`\`
`,
          'package.json': JSON.stringify({
            name: 'react-typescript-app',
            version: '1.0.0',
            dependencies: {
              'react': '^18.0.0',
              'react-dom': '^18.0.0',
              'typescript': '^4.9.0'
            },
            scripts: {
              start: 'react-scripts start',
              build: 'react-scripts build',
              test: 'react-scripts test'
            }
          }, null, 2),
          'tsconfig.json': JSON.stringify({
            compilerOptions: {
              target: 'es5',
              lib: ['dom', 'dom.iterable', 'es6'],
              allowJs: true,
              skipLibCheck: true,
              esModuleInterop: true,
              allowSyntheticDefaultImports: true,
              strict: true,
              forceConsistentCasingInFileNames: true,
              moduleResolution: 'node',
              resolveJsonModule: true,
              isolatedModules: true,
              noEmit: true,
              jsx: 'react-jsx'
            },
            include: ['src']
          }, null, 2)
        }
      },
      {
        name: 'Python FastAPI Project',
        files: {
          'README.md': `# FastAPI Application

A modern Python web API built with FastAPI.

## Installation

\`\`\`bash
pip install -r requirements.txt
\`\`\`

## Development

\`\`\`bash
uvicorn main:app --reload
\`\`\`

## Test

\`\`\`bash
pytest
\`\`\`

## Docker

\`\`\`bash
docker build -t fastapi-app .
docker run -p 8000:8000 fastapi-app
\`\`\`
`,
          'requirements.txt': `fastapi==0.104.1
uvicorn[standard]==0.24.0
pytest==7.4.3
httpx==0.25.2
`,
          'pyproject.toml': `[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "fastapi-app"
version = "1.0.0"
description = "A FastAPI application"
dependencies = [
    "fastapi>=0.104.0",
    "uvicorn[standard]>=0.24.0"
]
`,
          'Dockerfile': `FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
`
        }
      },
      {
        name: 'Go Microservice Project',
        files: {
          'README.md': `# Go Microservice

A microservice built with Go and Gin framework.

## Installation

\`\`\`bash
go mod download
\`\`\`

## Build

\`\`\`bash
go build -o bin/app ./cmd/server
\`\`\`

## Test

\`\`\`bash
go test ./...
\`\`\`

## Run

\`\`\`bash
go run ./cmd/server
\`\`\`

## Docker

\`\`\`bash
docker build -t go-microservice .
docker run -p 8080:8080 go-microservice
\`\`\`
`,
          'go.mod': `module github.com/example/go-microservice

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/stretchr/testify v1.8.4
)
`,
          'Dockerfile': `FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o bin/app ./cmd/server

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/

COPY --from=builder /app/bin/app .

CMD ["./app"]
`
        }
      }
    ];

    projectTemplates.forEach(template => {
      it(`should handle ${template.name} project structure correctly`, async () => {
        const projectDir = path.join(tempDir, template.name.toLowerCase().replace(/\s+/g, '-'));
        await fs.mkdir(projectDir, { recursive: true });

        // Create project files
        for (const [filename, content] of Object.entries(template.files)) {
          const filePath = path.join(projectDir, filename);
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, content);
        }

        // Execute CLI generate command
        const result = await cliApp.execute([
          'generate',
          '--project-dir', projectDir,
          '--workflow-type', 'ci,cd',
          '--dry-run',
          '--verbose'
        ]);

        expect(result.success).toBe(true);
        expect(result.generatedFiles).toBeDefined();
        expect(result.generatedFiles.length).toBeGreaterThan(0);
        
        // Verify framework detection worked
        expect(result.summary).toBeDefined();
        expect(result.summary.detectedFrameworks).toBeDefined();
        expect(result.summary.detectedFrameworks.length).toBeGreaterThan(0);
      });
    });

    it('should handle monorepo project structures', async () => {
      const monorepoDir = path.join(tempDir, 'monorepo');
      await fs.mkdir(monorepoDir, { recursive: true });

      // Create monorepo structure
      const packages = ['frontend', 'backend', 'shared'];
      
      for (const pkg of packages) {
        const pkgDir = path.join(monorepoDir, 'packages', pkg);
        await fs.mkdir(pkgDir, { recursive: true });
        
        await fs.writeFile(path.join(pkgDir, 'README.md'), `# ${pkg.charAt(0).toUpperCase() + pkg.slice(1)}

This is the ${pkg} package.

## Build

\`\`\`bash
npm run build
\`\`\`

## Test

\`\`\`bash
npm test
\`\`\`
`);

        await fs.writeFile(path.join(pkgDir, 'package.json'), JSON.stringify({
          name: `@monorepo/${pkg}`,
          version: '1.0.0',
          scripts: {
            build: 'tsc',
            test: 'jest'
          }
        }, null, 2));
      }

      // Root package.json
      await fs.writeFile(path.join(monorepoDir, 'package.json'), JSON.stringify({
        name: 'monorepo',
        version: '1.0.0',
        workspaces: ['packages/*'],
        scripts: {
          'build:all': 'npm run build --workspaces',
          'test:all': 'npm run test --workspaces'
        }
      }, null, 2));

      // Execute batch processing
      const result = await cliApp.execute([
        'generate',
        '--project-dir', monorepoDir,
        '--recursive',
        '--workflow-type', 'ci',
        '--dry-run'
      ]);

      expect(result.success).toBe(true);
      expect(result.summary.processedProjects).toBeGreaterThan(1);
    });
  });

  describe('User Experience Testing with Various Input Scenarios', () => {
    it('should handle interactive mode gracefully', async () => {
      const projectDir = path.join(tempDir, 'interactive-project');
      await fs.mkdir(projectDir, { recursive: true });

      const readmeContent = `# Ambiguous Project

This project could be multiple things.

## Commands

\`\`\`bash
npm install
pip install -r requirements.txt
go mod download
\`\`\`
`;

      await fs.writeFile(path.join(projectDir, 'README.md'), readmeContent);

      // Test interactive mode with simulated user input
      const result = await cliApp.execute([
        'generate',
        '--project-dir', projectDir,
        '--interactive',
        '--dry-run'
      ], {
        simulateUserInput: [
          'y', // Confirm Node.js detection
          'n', // Decline Python detection
          'n', // Decline Go detection
          'ci,cd', // Select workflow types
          'y' // Confirm generation
        ]
      });

      expect(result.success).toBe(true);
      expect(result.userInteractions).toBeDefined();
      expect(result.userInteractions.length).toBeGreaterThan(0);
    });

    it('should provide helpful error messages for invalid inputs', async () => {
      const invalidScenarios = [
        {
          name: 'Non-existent README file',
          args: ['generate', '--readme-path', '/non/existent/file.md'],
          expectedError: 'README file not found'
        },
        {
          name: 'Invalid workflow type',
          args: ['generate', '--workflow-type', 'invalid-type'],
          expectedError: 'Invalid workflow type'
        },
        {
          name: 'Invalid output directory',
          args: ['generate', '--output-dir', '/invalid/path/with/no/permissions'],
          expectedError: 'Cannot write to output directory'
        },
        {
          name: 'Malformed configuration file',
          args: ['generate', '--config', path.join(tempDir, 'invalid-config.json')],
          expectedError: 'Invalid configuration'
        }
      ];

      // Create malformed config file
      await fs.writeFile(path.join(tempDir, 'invalid-config.json'), '{ invalid json }');

      for (const scenario of invalidScenarios) {
        const result = await cliApp.execute(scenario.args);
        
        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors.length).toBeGreaterThan(0);
        
        const errorMessage = result.errors[0].message.toLowerCase();
        expect(errorMessage).toContain(scenario.expectedError.toLowerCase());
        
        // Should provide suggestions
        expect(result.suggestions).toBeDefined();
        expect(result.suggestions.length).toBeGreaterThan(0);
      }
    });

    it('should handle edge cases in README content', async () => {
      const edgeCases = [
        {
          name: 'Empty README',
          content: '',
          expectSuccess: true,
          expectWarnings: true
        },
        {
          name: 'README with only title',
          content: '# Project Title',
          expectSuccess: true,
          expectWarnings: true
        },
        {
          name: 'README with malformed code blocks',
          content: `# Project

\`\`\`
npm install
\`\`\`bash
npm test
\`\`\`
`,
          expectSuccess: true,
          expectWarnings: false
        },
        {
          name: 'README with mixed languages',
          content: `# Multi-Language Project

## Python Setup
\`\`\`python
pip install -r requirements.txt
\`\`\`

## Node.js Setup
\`\`\`javascript
npm install
\`\`\`

## Go Setup
\`\`\`go
go mod download
\`\`\`
`,
          expectSuccess: true,
          expectWarnings: false
        },
        {
          name: 'README with special characters and Unicode',
          content: `# Проект с Unicode 🚀

This project uses special characters: àáâãäåæçèéêë

## Installation

\`\`\`bash
npm install --save-dev @types/node
\`\`\`
`,
          expectSuccess: true,
          expectWarnings: false
        }
      ];

      for (const edgeCase of edgeCases) {
        const projectDir = path.join(tempDir, `edge-case-${edgeCase.name.toLowerCase().replace(/\s+/g, '-')}`);
        await fs.mkdir(projectDir, { recursive: true });
        await fs.writeFile(path.join(projectDir, 'README.md'), edgeCase.content);

        const result = await cliApp.execute([
          'generate',
          '--project-dir', projectDir,
          '--dry-run',
          '--quiet'
        ]);

        if (edgeCase.expectSuccess) {
          expect(result.success).toBe(true);
        }

        if (edgeCase.expectWarnings) {
          expect(result.warnings).toBeDefined();
          expect(result.warnings.length).toBeGreaterThan(0);
        }
      }
    });

    it('should provide contextual help based on project state', async () => {
      const projectDir = path.join(tempDir, 'help-context-project');
      await fs.mkdir(projectDir, { recursive: true });

      // Test help in different contexts
      const helpScenarios = [
        {
          name: 'Help in empty directory',
          setup: async () => {
            // Empty directory
          },
          expectedSuggestions: ['init', 'create README']
        },
        {
          name: 'Help with README but no workflows',
          setup: async () => {
            await fs.writeFile(path.join(projectDir, 'README.md'), '# Test Project');
          },
          expectedSuggestions: ['generate', 'workflow types']
        },
        {
          name: 'Help with existing workflows',
          setup: async () => {
            const workflowDir = path.join(projectDir, '.github', 'workflows');
            await fs.mkdir(workflowDir, { recursive: true });
            await fs.writeFile(path.join(workflowDir, 'ci.yml'), 'name: CI\non: [push]');
          },
          expectedSuggestions: ['validate', 'update']
        }
      ];

      for (const scenario of helpScenarios) {
        await scenario.setup();

        const result = await cliApp.execute([
          'help',
          '--context', projectDir
        ]);

        expect(result.success).toBe(true);
        expect(result.contextualHelp).toBeDefined();
        
        for (const suggestion of scenario.expectedSuggestions) {
          expect(result.contextualHelp.suggestions.some(s => 
            s.toLowerCase().includes(suggestion.toLowerCase())
          )).toBe(true);
        }
      }
    });

    it('should handle command typos and provide suggestions', async () => {
      const typoScenarios = [
        { input: 'generat', expected: 'generate' },
        { input: 'validat', expected: 'validate' },
        { input: 'initi', expected: 'init' },
        { input: 'exprt', expected: 'export' },
        { input: 'imprt', expected: 'import' }
      ];

      for (const scenario of typoScenarios) {
        const result = await cliApp.execute([scenario.input]);

        expect(result.success).toBe(false);
        expect(result.suggestions).toBeDefined();
        expect(result.suggestions.some(s => 
          s.toLowerCase().includes(scenario.expected)
        )).toBe(true);
      }
    });
  });

  describe('Performance and Load Testing for Batch Operations', () => {
    it('should handle batch processing of multiple projects efficiently', async () => {
      const batchDir = path.join(tempDir, 'batch-projects');
      await fs.mkdir(batchDir, { recursive: true });

      // Create multiple test projects
      const projectCount = 10;
      const projects = [];

      for (let i = 0; i < projectCount; i++) {
        const projectDir = path.join(batchDir, `project-${i}`);
        await fs.mkdir(projectDir, { recursive: true });

        const readmeContent = `# Project ${i}

This is test project number ${i}.

## Installation

\`\`\`bash
npm install
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`

## Test

\`\`\`bash
npm test
\`\`\`
`;

        await fs.writeFile(path.join(projectDir, 'README.md'), readmeContent);
        await fs.writeFile(path.join(projectDir, 'package.json'), JSON.stringify({
          name: `project-${i}`,
          version: '1.0.0',
          scripts: {
            build: 'tsc',
            test: 'jest'
          }
        }, null, 2));

        projects.push(projectDir);
      }

      // Measure batch processing performance
      const startTime = performance.now();
      
      const result = await cliApp.execute([
        'generate',
        '--batch',
        '--input-dirs', projects.join(','),
        '--parallel',
        '--concurrency', '3',
        '--dry-run'
      ]);

      const duration = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.summary.processedProjects).toBe(projectCount);
      expect(duration).toBeLessThan(10000); // Should complete in under 10 seconds
      
      // Verify parallel processing was used
      expect(result.summary.parallelProcessing).toBe(true);
      expect(result.summary.concurrency).toBe(3);
    });

    it('should handle memory efficiently during large batch operations', async () => {
      const largeBatchDir = path.join(tempDir, 'large-batch');
      await fs.mkdir(largeBatchDir, { recursive: true });

      // Create projects with larger README files
      const projectCount = 20;
      const largeReadmeContent = `# Large Project

${'This is a large README file with lots of content. '.repeat(1000)}

## Installation

\`\`\`bash
npm install
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`

## Test

\`\`\`bash
npm test
\`\`\`

## Documentation

${'Additional documentation content. '.repeat(500)}
`;

      for (let i = 0; i < projectCount; i++) {
        const projectDir = path.join(largeBatchDir, `large-project-${i}`);
        await fs.mkdir(projectDir, { recursive: true });
        await fs.writeFile(path.join(projectDir, 'README.md'), largeReadmeContent);
      }

      // Monitor memory usage during batch processing
      const initialMemory = process.memoryUsage();
      
      const result = await cliApp.execute([
        'generate',
        '--project-dir', largeBatchDir,
        '--recursive',
        '--memory-limit', '256MB',
        '--dry-run'
      ]);

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(result.success).toBe(true);
      expect(memoryIncrease).toBeLessThan(256 * 1024 * 1024); // Should stay under 256MB increase
      
      // Verify memory optimization was used
      expect(result.summary.memoryOptimization).toBe(true);
    });

    it('should provide progress feedback during long operations', async () => {
      const progressDir = path.join(tempDir, 'progress-test');
      await fs.mkdir(progressDir, { recursive: true });

      // Create multiple projects to ensure operation takes some time
      for (let i = 0; i < 15; i++) {
        const projectDir = path.join(progressDir, `progress-project-${i}`);
        await fs.mkdir(projectDir, { recursive: true });
        await fs.writeFile(path.join(projectDir, 'README.md'), `# Progress Project ${i}\n\nTest project for progress tracking.`);
      }

      const progressUpdates: string[] = [];
      
      const result = await cliApp.execute([
        'generate',
        '--project-dir', progressDir,
        '--recursive',
        '--verbose',
        '--dry-run'
      ], {
        onProgress: (message: string) => {
          progressUpdates.push(message);
        }
      });

      expect(result.success).toBe(true);
      expect(progressUpdates.length).toBeGreaterThan(0);
      
      // Verify progress messages are meaningful
      expect(progressUpdates.some(msg => msg.includes('Processing'))).toBe(true);
      expect(progressUpdates.some(msg => msg.includes('Complete'))).toBe(true);
    });

    it('should handle concurrent operations safely', async () => {
      const concurrentDir = path.join(tempDir, 'concurrent-test');
      await fs.mkdir(concurrentDir, { recursive: true });

      // Create test project
      await fs.writeFile(path.join(concurrentDir, 'README.md'), '# Concurrent Test\n\nTest project for concurrent operations.');

      // Execute multiple CLI operations concurrently
      const operations = [
        cliApp.execute(['generate', '--project-dir', concurrentDir, '--dry-run']),
        cliApp.execute(['validate', '--project-dir', concurrentDir]),
        cliApp.execute(['generate', '--project-dir', concurrentDir, '--workflow-type', 'cd', '--dry-run'])
      ];

      const results = await Promise.all(operations);

      // All operations should complete successfully
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // No race conditions or conflicts should occur
      expect(results.every(r => r.errors.length === 0)).toBe(true);
    });
  });

  describe('Regression Tests to Prevent CLI Behavior Changes', () => {
    const regressionTestCases = [
      {
        name: 'Basic Node.js project generation',
        input: {
          readme: `# Node.js Project

## Installation
\`\`\`bash
npm install
\`\`\`

## Build
\`\`\`bash
npm run build
\`\`\`
`,
          packageJson: {
            name: 'test-project',
            scripts: { build: 'tsc', test: 'jest' }
          }
        },
        expectedOutput: {
          workflowCount: 1,
          hasNodeSetup: true,
          hasNpmInstall: true,
          hasBuildStep: true
        }
      },
      {
        name: 'Python project with Docker',
        input: {
          readme: `# Python API

## Installation
\`\`\`bash
pip install -r requirements.txt
\`\`\`

## Docker
\`\`\`bash
docker build -t api .
\`\`\`
`,
          requirements: 'fastapi==0.104.1\nuvicorn==0.24.0',
          dockerfile: 'FROM python:3.11\nCOPY . .\nRUN pip install -r requirements.txt'
        },
        expectedOutput: {
          workflowCount: 1,
          hasPythonSetup: true,
          hasDockerBuild: true,
          hasPipInstall: true
        }
      }
    ];

    regressionTestCases.forEach(testCase => {
      it(`should maintain consistent behavior for ${testCase.name}`, async () => {
        const projectDir = path.join(tempDir, testCase.name.toLowerCase().replace(/\s+/g, '-'));
        await fs.mkdir(projectDir, { recursive: true });

        // Create project files
        await fs.writeFile(path.join(projectDir, 'README.md'), testCase.input.readme);
        
        if (testCase.input.packageJson) {
          await fs.writeFile(
            path.join(projectDir, 'package.json'),
            JSON.stringify(testCase.input.packageJson, null, 2)
          );
        }
        
        if (testCase.input.requirements) {
          await fs.writeFile(path.join(projectDir, 'requirements.txt'), testCase.input.requirements);
        }
        
        if (testCase.input.dockerfile) {
          await fs.writeFile(path.join(projectDir, 'Dockerfile'), testCase.input.dockerfile);
        }

        // Execute CLI and capture detailed output
        const result = await cliApp.execute([
          'generate',
          '--project-dir', projectDir,
          '--dry-run',
          '--verbose'
        ]);

        expect(result.success).toBe(true);
        
        // Verify expected output characteristics
        expect(result.generatedFiles.length).toBe(testCase.expectedOutput.workflowCount);
        
        if (testCase.expectedOutput.hasNodeSetup) {
          expect(result.summary.detectedFrameworks.some(f => f.includes('Node.js'))).toBe(true);
        }
        
        if (testCase.expectedOutput.hasPythonSetup) {
          expect(result.summary.detectedFrameworks.some(f => f.includes('Python'))).toBe(true);
        }
        
        if (testCase.expectedOutput.hasDockerBuild) {
          expect(result.summary.features.includes('Docker')).toBe(true);
        }

        // Store result for comparison in future runs
        const regressionData = {
          testCase: testCase.name,
          timestamp: new Date().toISOString(),
          result: {
            success: result.success,
            generatedFiles: result.generatedFiles.length,
            detectedFrameworks: result.summary.detectedFrameworks,
            features: result.summary.features,
            warnings: result.warnings.length,
            errors: result.errors.length
          }
        };

        // In a real implementation, this would be stored and compared
        console.log(`Regression baseline for ${testCase.name}:`, regressionData);
      });
    });

    it('should maintain consistent command-line interface', async () => {
      // Test that all expected commands and options are available
      const helpResult = await cliApp.execute(['--help']);
      
      expect(helpResult.success).toBe(true);
      expect(helpResult.helpText).toBeDefined();
      
      const expectedCommands = ['generate', 'validate', 'init', 'export', 'import'];
      const expectedOptions = ['--help', '--version', '--verbose', '--quiet', '--dry-run'];
      
      for (const command of expectedCommands) {
        expect(helpResult.helpText.includes(command)).toBe(true);
      }
      
      for (const option of expectedOptions) {
        expect(helpResult.helpText.includes(option)).toBe(true);
      }
    });

    it('should maintain backward compatibility with configuration files', async () => {
      const configVersions = [
        {
          version: '1.0',
          config: {
            defaults: {
              outputDirectory: '.github/workflows',
              workflowTypes: ['ci']
            }
          }
        },
        {
          version: '1.1',
          config: {
            defaults: {
              outputDirectory: '.github/workflows',
              workflowTypes: ['ci', 'cd'],
              includeComments: true
            },
            templates: {
              customTemplates: './templates'
            }
          }
        }
      ];

      for (const configVersion of configVersions) {
        const configPath = path.join(tempDir, `config-v${configVersion.version}.json`);
        await fs.writeFile(configPath, JSON.stringify(configVersion.config, null, 2));

        const result = await cliApp.execute([
          'generate',
          '--config', configPath,
          '--dry-run'
        ]);

        // Should handle all config versions without errors
        expect(result.success).toBe(true);
        expect(result.errors.filter(e => e.message.includes('configuration')).length).toBe(0);
      }
    });
  });

  describe('Cross-Platform Testing (Windows, macOS, Linux, CI/CD)', () => {
    it('should handle platform-specific path separators correctly', async () => {
      const projectDir = path.join(tempDir, 'cross-platform-test');
      await fs.mkdir(projectDir, { recursive: true });

      const readmeContent = `# Cross-Platform Project

## Installation

\`\`\`bash
npm install
\`\`\`
`;

      await fs.writeFile(path.join(projectDir, 'README.md'), readmeContent);

      // Test with different path formats
      const pathFormats = [
        path.join(projectDir, 'README.md'), // Native format
        projectDir.replace(/\\/g, '/') + '/README.md', // Unix format
        projectDir.replace(/\//g, '\\') + '\\README.md' // Windows format
      ];

      for (const pathFormat of pathFormats) {
        const result = await cliApp.execute([
          'generate',
          '--readme-path', pathFormat,
          '--dry-run'
        ]);

        expect(result.success).toBe(true);
      }
    });

    it('should detect and adapt to CI/CD environments', async () => {
      const ciEnvironments = [
        { name: 'GitHub Actions', env: { GITHUB_ACTIONS: 'true', CI: 'true' } },
        { name: 'GitLab CI', env: { GITLAB_CI: 'true', CI: 'true' } },
        { name: 'Jenkins', env: { JENKINS_URL: 'http://jenkins.local', CI: 'true' } },
        { name: 'Azure DevOps', env: { TF_BUILD: 'True', CI: 'true' } },
        { name: 'CircleCI', env: { CIRCLECI: 'true', CI: 'true' } }
      ];

      for (const ciEnv of ciEnvironments) {
        // Temporarily set environment variables
        const originalEnv = { ...process.env };
        Object.assign(process.env, ciEnv.env);

        try {
          const projectDir = path.join(tempDir, `ci-test-${ciEnv.name.toLowerCase().replace(/\s+/g, '-')}`);
          await fs.mkdir(projectDir, { recursive: true });
          await fs.writeFile(path.join(projectDir, 'README.md'), '# CI Test Project\n\n## Build\n```bash\nnpm run build\n```');

          const result = await cliApp.execute([
            'generate',
            '--project-dir', projectDir,
            '--dry-run'
          ]);

          expect(result.success).toBe(true);
          
          // Should automatically use non-interactive mode in CI
          expect(result.summary.interactiveMode).toBe(false);
          
          // Should provide machine-readable output
          expect(result.summary.outputFormat).toBe('json');
          
          // Should use appropriate exit codes
          expect(result.exitCode).toBe(0);

        } finally {
          // Restore original environment
          process.env = originalEnv;
        }
      }
    });
  });

  describe('Cross-Platform Testing (Windows, macOS, Linux, CI/CD)', () => {
    it('should handle platform-specific path separators correctly', async () => {
      const projectDir = path.join(tempDir, 'cross-platform-test');
      await fs.mkdir(projectDir, { recursive: true });

      const readmeContent = `# Cross-Platform Project

## Installation

\`\`\`bash
npm install
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`
`;

      await fs.writeFile(path.join(projectDir, 'README.md'), readmeContent);

      // Test with different path formats
      const pathFormats = [
        path.join(projectDir, 'README.md'), // Native format
        projectDir.replace(/\\/g, '/') + '/README.md', // Unix-style
        projectDir.replace(/\//g, '\\') + '\\README.md' // Windows-style
      ];

      for (const pathFormat of pathFormats) {
        const result = await cliApp.execute([
          'generate',
          '--readme-path', pathFormat,
          '--dry-run'
        ]);

        expect(result.success).toBe(true);
        expect(result.errors.filter(e => e.message.includes('path')).length).toBe(0);
      }
    });

    it('should detect and adapt to CI/CD environments', async () => {
      const ciEnvironments = [
        { name: 'GitHub Actions', env: { GITHUB_ACTIONS: 'true', CI: 'true' } },
        { name: 'GitLab CI', env: { GITLAB_CI: 'true', CI: 'true' } },
        { name: 'Jenkins', env: { JENKINS_URL: 'http://jenkins.local', CI: 'true' } },
        { name: 'Azure DevOps', env: { TF_BUILD: 'True', CI: 'true' } },
        { name: 'CircleCI', env: { CIRCLECI: 'true', CI: 'true' } }
      ];

      for (const ciEnv of ciEnvironments) {
        // Temporarily set environment variables
        const originalEnv = { ...process.env };
        Object.assign(process.env, ciEnv.env);

        try {
          const projectDir = path.join(tempDir, `ci-test-${ciEnv.name.toLowerCase().replace(/\s+/g, '-')}`);
          await fs.mkdir(projectDir, { recursive: true });
          await fs.writeFile(path.join(projectDir, 'README.md'), '# CI Test Project\n\n## Build\n```bash\nnpm run build\n```');

          const result = await cliApp.execute([
            'generate',
            '--project-dir', projectDir,
            '--dry-run'
          ]);

          expect(result.success).toBe(true);
          
          // Should automatically use non-interactive mode in CI
          expect(result.summary.interactiveMode).toBe(false);
          
          // Should provide machine-readable output
          expect(result.summary.outputFormat).toBe('json');
          
          // Should use appropriate exit codes
          expect(result.exitCode).toBe(0);

        } finally {
          // Restore original environment
          process.env = originalEnv;
        }
      }
    });

    it('should handle platform-specific shell commands correctly', async () => {
      const projectDir = path.join(tempDir, 'shell-commands-test');
      await fs.mkdir(projectDir, { recursive: true });

      const platformCommands = {
        windows: `# Windows Project

## Build (Windows)
\`\`\`cmd
npm.cmd install
npm.cmd run build
\`\`\`

## PowerShell
\`\`\`powershell
Get-ChildItem
\`\`\`
`,
        unix: `# Unix Project

## Build (Unix)
\`\`\`bash
npm install
npm run build
\`\`\`

## Shell
\`\`\`sh
ls -la
\`\`\`
`
      };

      for (const [platform, content] of Object.entries(platformCommands)) {
        await fs.writeFile(path.join(projectDir, 'README.md'), content);

        const result = await cliApp.execute([
          'generate',
          '--project-dir', projectDir,
          '--platform', platform,
          '--dry-run'
        ]);

        expect(result.success).toBe(true);
        
        // Should adapt commands for target platform
        if (platform === 'windows') {
          expect(result.summary.adaptedCommands.some(cmd => cmd.includes('npm.cmd'))).toBe(true);
        } else {
          expect(result.summary.adaptedCommands.some(cmd => cmd.includes('npm install'))).toBe(true);
        }
      }
    });

    it('should handle different line ending formats', async () => {
      const projectDir = path.join(tempDir, 'line-endings-test');
      await fs.mkdir(projectDir, { recursive: true });

      const baseContent = '# Line Endings Test\n\n## Build\n```bash\nnpm run build\n```';
      
      const lineEndingFormats = [
        { name: 'LF (Unix)', content: baseContent },
        { name: 'CRLF (Windows)', content: baseContent.replace(/\n/g, '\r\n') },
        { name: 'CR (Classic Mac)', content: baseContent.replace(/\n/g, '\r') }
      ];

      for (const format of lineEndingFormats) {
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

    it('should handle file system permissions correctly', async () => {
      const permissionsDir = path.join(tempDir, 'permissions-test');
      await fs.mkdir(permissionsDir, { recursive: true });

      await fs.writeFile(path.join(permissionsDir, 'README.md'), '# Permissions Test\n\n## Build\n```bash\nnpm run build\n```');

      // Test with read-only directory (simulate permission issues)
      const readOnlyDir = path.join(permissionsDir, 'readonly');
      await fs.mkdir(readOnlyDir, { recursive: true });

      try {
        // Make directory read-only (platform-specific)
        if (process.platform !== 'win32') {
          await fs.chmod(readOnlyDir, 0o444);
        }

        const result = await cliApp.execute([
          'generate',
          '--project-dir', permissionsDir,
          '--output-dir', readOnlyDir,
          '--dry-run'
        ]);

        // Should handle permission issues gracefully
        if (!result.success) {
          expect(result.errors.some(e => e.message.includes('permission'))).toBe(true);
          expect(result.suggestions.some(s => s.includes('permission'))).toBe(true);
        }

      } finally {
        // Restore permissions for cleanup
        if (process.platform !== 'win32') {
          try {
            await fs.chmod(readOnlyDir, 0o755);
          } catch {
            // Ignore errors during cleanup
          }
        }
      }
    });

    it('should provide platform-appropriate installation instructions', async () => {
      const platforms = ['win32', 'darwin', 'linux'];

      for (const platform of platforms) {
        const result = await cliApp.execute([
          'help',
          'install',
          '--platform', platform
        ]);

        expect(result.success).toBe(true);
        expect(result.helpText).toBeDefined();

        // Should provide platform-specific instructions
        if (platform === 'win32') {
          expect(result.helpText.includes('npm.cmd') || result.helpText.includes('PowerShell')).toBe(true);
        } else if (platform === 'darwin') {
          expect(result.helpText.includes('brew') || result.helpText.includes('macOS')).toBe(true);
        } else {
          expect(result.helpText.includes('apt') || result.helpText.includes('yum') || result.helpText.includes('Linux')).toBe(true);
        }
      }
    });

    it('should handle environment variable expansion correctly', async () => {
      const projectDir = path.join(tempDir, 'env-vars-test');
      await fs.mkdir(projectDir, { recursive: true });

      // Set test environment variables
      const testEnvVars = {
        TEST_VAR: 'test-value',
        PROJECT_NAME: 'env-test-project',
        BUILD_DIR: 'dist'
      };

      const originalEnv = { ...process.env };
      Object.assign(process.env, testEnvVars);

      try {
        const configContent = {
          defaults: {
            outputDirectory: '${BUILD_DIR}/workflows',
            projectName: '${PROJECT_NAME}'
          },
          templates: {
            customPath: '${TEST_VAR}/templates'
          }
        };

        await fs.writeFile(
          path.join(projectDir, '.readme-to-cicd.json'),
          JSON.stringify(configContent, null, 2)
        );

        await fs.writeFile(path.join(projectDir, 'README.md'), '# ${PROJECT_NAME}\n\n## Build\n```bash\nnpm run build\n```');

        const result = await cliApp.execute([
          'generate',
          '--project-dir', projectDir,
          '--dry-run'
        ]);

        expect(result.success).toBe(true);
        
        // Should expand environment variables
        expect(result.summary.resolvedConfig.outputDirectory).toBe('dist/workflows');
        expect(result.summary.resolvedConfig.projectName).toBe('env-test-project');

      } finally {
        // Restore original environment
        process.env = originalEnv;
      }
    });
  });

  describe('Comprehensive Integration and Validation', () => {
    it('should validate complete CLI workflow end-to-end', async () => {
      const workflowDir = path.join(tempDir, 'complete-workflow');
      await fs.mkdir(workflowDir, { recursive: true });

      // Step 1: Initialize project
      let result = await cliApp.execute([
        'init',
        '--project-dir', workflowDir,
        '--non-interactive'
      ]);
      expect(result.success).toBe(true);

      // Step 2: Create README
      const readmeContent = `# Complete Workflow Test

A comprehensive test of the CLI workflow.

## Installation

\`\`\`bash
npm install
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`

## Test

\`\`\`bash
npm test
\`\`\`

## Deploy

\`\`\`bash
npm run deploy
\`\`\`
`;

      await fs.writeFile(path.join(workflowDir, 'README.md'), readmeContent);
      await fs.writeFile(path.join(workflowDir, 'package.json'), JSON.stringify({
        name: 'complete-workflow-test',
        version: '1.0.0',
        scripts: {
          build: 'tsc',
          test: 'jest',
          deploy: 'gh-pages -d dist'
        }
      }, null, 2));

      // Step 3: Generate workflows
      result = await cliApp.execute([
        'generate',
        '--project-dir', workflowDir,
        '--workflow-type', 'ci,cd,release',
        '--verbose'
      ]);
      expect(result.success).toBe(true);
      expect(result.generatedFiles.length).toBeGreaterThan(0);

      // Step 4: Validate generated workflows
      result = await cliApp.execute([
        'validate',
        '--project-dir', workflowDir,
        '--strict'
      ]);
      expect(result.success).toBe(true);

      // Step 5: Export configuration
      const exportPath = path.join(tempDir, 'exported-config.json');
      result = await cliApp.execute([
        'export',
        '--project-dir', workflowDir,
        '--output', exportPath
      ]);
      expect(result.success).toBe(true);

      // Verify exported configuration exists
      const exportExists = await fs.access(exportPath).then(() => true).catch(() => false);
      expect(exportExists).toBe(true);

      // Step 6: Import configuration to new project
      const importDir = path.join(tempDir, 'import-test');
      await fs.mkdir(importDir, { recursive: true });

      result = await cliApp.execute([
        'import',
        '--config', exportPath,
        '--target-dir', importDir
      ]);
      expect(result.success).toBe(true);

      // Verify complete workflow
      const finalValidation = await cliApp.execute([
        'validate',
        '--project-dir', importDir
      ]);
      expect(finalValidation.success).toBe(true);
    });

    it('should maintain performance benchmarks across all operations', async () => {
      const benchmarkDir = path.join(tempDir, 'benchmark-test');
      await fs.mkdir(benchmarkDir, { recursive: true });

      const operations = [
        {
          name: 'init',
          command: ['init', '--project-dir', benchmarkDir, '--non-interactive'],
          maxTime: 2000 // 2 seconds
        },
        {
          name: 'generate',
          command: ['generate', '--project-dir', benchmarkDir, '--dry-run'],
          maxTime: 5000, // 5 seconds
          setup: async () => {
            await fs.writeFile(path.join(benchmarkDir, 'README.md'), '# Benchmark Test\n\n## Build\n```bash\nnpm run build\n```');
          }
        },
        {
          name: 'validate',
          command: ['validate', '--project-dir', benchmarkDir],
          maxTime: 3000, // 3 seconds
          setup: async () => {
            const workflowDir = path.join(benchmarkDir, '.github', 'workflows');
            await fs.mkdir(workflowDir, { recursive: true });
            await fs.writeFile(path.join(workflowDir, 'ci.yml'), 'name: CI\non: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3');
          }
        }
      ];

      const benchmarkResults = [];

      for (const operation of operations) {
        if (operation.setup) {
          await operation.setup();
        }

        const startTime = performance.now();
        const result = await cliApp.execute(operation.command);
        const duration = performance.now() - startTime;

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(operation.maxTime);

        benchmarkResults.push({
          operation: operation.name,
          duration,
          maxTime: operation.maxTime,
          success: result.success
        });
      }

      // Log benchmark results
      console.log('CLI Performance Benchmarks:', benchmarkResults);

      // Verify all operations met performance requirements
      expect(benchmarkResults.every(r => r.success && r.duration < r.maxTime)).toBe(true);
    });

    it('should handle stress testing with rapid successive operations', async () => {
      const stressDir = path.join(tempDir, 'stress-test');
      await fs.mkdir(stressDir, { recursive: true });

      await fs.writeFile(path.join(stressDir, 'README.md'), '# Stress Test\n\n## Build\n```bash\nnpm run build\n```');

      // Execute rapid successive operations
      const operations = [];
      for (let i = 0; i < 10; i++) {
        operations.push(
          cliApp.execute([
            'generate',
            '--project-dir', stressDir,
            '--dry-run',
            '--quiet'
          ])
        );
      }

      const results = await Promise.all(operations);

      // All operations should succeed
      expect(results.every(r => r.success)).toBe(true);

      // No memory leaks or resource conflicts
      expect(results.every(r => r.errors.length === 0)).toBe(true);
    });

    it('should provide comprehensive error reporting and diagnostics', async () => {
      const diagnosticsDir = path.join(tempDir, 'diagnostics-test');
      await fs.mkdir(diagnosticsDir, { recursive: true });

      // Create problematic scenarios
      const problemScenarios = [
        {
          name: 'Invalid README syntax',
          setup: async () => {
            await fs.writeFile(path.join(diagnosticsDir, 'README.md'), '# Invalid\n```\nunclosed code block');
          }
        },
        {
          name: 'Conflicting package files',
          setup: async () => {
            await fs.writeFile(path.join(diagnosticsDir, 'README.md'), '# Conflict Test');
            await fs.writeFile(path.join(diagnosticsDir, 'package.json'), '{ invalid json }');
            await fs.writeFile(path.join(diagnosticsDir, 'requirements.txt'), 'flask==2.0.0');
          }
        }
      ];

      for (const scenario of problemScenarios) {
        await scenario.setup();

        const result = await cliApp.execute([
          'generate',
          '--project-dir', diagnosticsDir,
          '--diagnostics',
          '--dry-run'
        ]);

        // Should provide detailed diagnostics even on failure
        expect(result.diagnostics).toBeDefined();
        expect(result.diagnostics.issues).toBeDefined();
        expect(result.diagnostics.suggestions).toBeDefined();
        expect(result.diagnostics.systemInfo).toBeDefined();

        // Should include helpful context
        expect(result.diagnostics.systemInfo.platform).toBe(process.platform);
        expect(result.diagnostics.systemInfo.nodeVersion).toBeDefined();
        expect(result.diagnostics.systemInfo.cliVersion).toBeDefined();
      }
    });
  });
});