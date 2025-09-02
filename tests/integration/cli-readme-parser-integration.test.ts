/**
 * CLI-README Parser Integration Tests
 * 
 * Tests the integration between CLI command handlers and the README parser.
 * Validates end-to-end functionality for README parsing commands.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CLIApplication } from '../../src/cli/lib/cli-application';
import { Logger } from '../../src/cli/lib/logger';
import { ErrorHandler } from '../../src/cli/lib/error-handler';
import { ReadmeCommandHandler } from '../../src/cli/lib/readme-command-handler';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('CLI-README Parser Integration', () => {
  let cliApp: CLIApplication;
  let logger: Logger;
  let errorHandler: ErrorHandler;
  let tempDir: string;
  let testReadmePath: string;

  beforeEach(async () => {
    // Create temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cli-readme-test-'));
    testReadmePath = path.join(tempDir, 'README.md');
    
    // Initialize CLI components
    logger = new Logger({ level: 'error' }); // Reduce noise in tests
    errorHandler = new ErrorHandler(logger);
    cliApp = new CLIApplication(logger, errorHandler);
    
    // Create test README file
    await createTestReadmeFile(testReadmePath);
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up temp directory:', error);
    }
  });

  describe('Parse Command Integration', () => {
    it('should parse README file through CLI application', async () => {
      const args = ['node', 'readme-to-cicd', 'parse', testReadmePath];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.filesProcessed).toBe(1);
    });

    it('should handle parse command with JSON output format', async () => {
      const args = ['node', 'readme-to-cicd', 'parse', testReadmePath, '--format', 'json'];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(true);
      expect(result.generatedFiles).toHaveLength(1);
      expect(result.generatedFiles[0]).toMatch(/\.json$/);
      
      // Verify JSON file was created and contains valid JSON
      const jsonContent = await fs.readFile(result.generatedFiles[0], 'utf8');
      const parsedJson = JSON.parse(jsonContent);
      expect(parsedJson).toHaveProperty('metadata');
      expect(parsedJson).toHaveProperty('languages');
    });

    it('should handle parse command with YAML output format', async () => {
      const args = ['node', 'readme-to-cicd', 'parse', testReadmePath, '--format', 'yaml'];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(true);
      expect(result.generatedFiles).toHaveLength(1);
      expect(result.generatedFiles[0]).toMatch(/\.yaml$/);
      
      // Verify YAML file was created
      const yamlContent = await fs.readFile(result.generatedFiles[0], 'utf8');
      expect(yamlContent).toContain('metadata:');
      expect(yamlContent).toContain('languages:');
    });

    it('should include confidence scores when requested', async () => {
      const args = ['node', 'readme-to-cicd', 'parse', testReadmePath, '--format', 'json', '--include-confidence'];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(true);
      expect(result.generatedFiles).toHaveLength(1);
      
      const jsonContent = await fs.readFile(result.generatedFiles[0], 'utf8');
      const parsedJson = JSON.parse(jsonContent);
      expect(parsedJson).toHaveProperty('confidence');
      expect(parsedJson.confidence).toHaveProperty('overall');
    });

    it('should include metadata when requested', async () => {
      const args = ['node', 'readme-to-cicd', 'parse', testReadmePath, '--format', 'json', '--include-metadata'];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(true);
      expect(result.generatedFiles).toHaveLength(1);
      
      const jsonContent = await fs.readFile(result.generatedFiles[0], 'utf8');
      const parsedJson = JSON.parse(jsonContent);
      expect(parsedJson).toHaveProperty('processingMetadata');
      expect(parsedJson.processingMetadata).toHaveProperty('timestamp');
    });
  });

  describe('Analyze Command Integration', () => {
    it('should perform detailed analysis through CLI application', async () => {
      const args = ['node', 'readme-to-cicd', 'analyze', testReadmePath];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.generatedFiles).toHaveLength(1);
      expect(result.generatedFiles[0]).toMatch(/detailed-analysis\.json$/);
    });

    it('should generate analysis report with recommendations', async () => {
      const args = ['node', 'readme-to-cicd', 'analyze', testReadmePath];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(true);
      expect(result.generatedFiles).toHaveLength(1);
      
      const reportContent = await fs.readFile(result.generatedFiles[0], 'utf8');
      const report = JSON.parse(reportContent);
      
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('details');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('diagnostics');
      
      expect(report.summary).toHaveProperty('projectName');
      expect(report.summary).toHaveProperty('analysisDate');
      expect(report.summary).toHaveProperty('overallConfidence');
    });

    it('should detect project languages and frameworks', async () => {
      const args = ['node', 'readme-to-cicd', 'analyze', testReadmePath];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(true);
      expect(result.summary.frameworksDetected).toContain('JavaScript');
    });
  });

  describe('README Validate Command Integration', () => {
    it('should validate README file through CLI application', async () => {
      const args = ['node', 'readme-to-cicd', 'readme-validate', testReadmePath];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(true);
      expect(result.summary.filesProcessed).toBe(1);
    });

    it('should provide validation warnings for incomplete README', async () => {
      // Create minimal README
      const minimalReadmePath = path.join(tempDir, 'minimal-README.md');
      await fs.writeFile(minimalReadmePath, '# Project\n\nBasic description.');
      
      const args = ['node', 'readme-to-cicd', 'readme-validate', minimalReadmePath];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('commands'))).toBe(true);
    });

    it('should fail validation for very low confidence analysis', async () => {
      // Create empty README
      const emptyReadmePath = path.join(tempDir, 'empty-README.md');
      await fs.writeFile(emptyReadmePath, '');
      
      const args = ['node', 'readme-to-cicd', 'readme-validate', emptyReadmePath];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle non-existent README file gracefully', async () => {
      const nonExistentPath = path.join(tempDir, 'non-existent.md');
      const args = ['node', 'readme-to-cicd', 'parse', nonExistentPath];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('not found');
    });

    it('should handle invalid command arguments', async () => {
      const args = ['node', 'readme-to-cicd', 'parse', testReadmePath, '--format', 'invalid'];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should provide helpful error messages for CLI parsing errors', async () => {
      const args = ['node', 'readme-to-cicd', 'invalid-command'];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Invalid command');
    });
  });

  describe('Default README Detection', () => {
    it('should find README.md in current directory when no path specified', async () => {
      // Change to temp directory and create README.md there
      const originalCwd = process.cwd();
      process.chdir(tempDir);
      
      try {
        await fs.writeFile('README.md', createTestReadmeContent());
        
        const args = ['node', 'readme-to-cicd', 'parse'];
        
        const result = await cliApp.run(args);
        
        expect(result.success).toBe(true);
        expect(result.summary.filesProcessed).toBe(1);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should try alternative README file names', async () => {
      // Change to temp directory and create readme.md (lowercase)
      const originalCwd = process.cwd();
      process.chdir(tempDir);
      
      try {
        await fs.writeFile('readme.md', createTestReadmeContent());
        
        const args = ['node', 'readme-to-cicd', 'parse'];
        
        const result = await cliApp.run(args);
        
        expect(result.success).toBe(true);
        expect(result.summary.filesProcessed).toBe(1);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('Command Line Argument Parsing', () => {
    it('should parse verbose flag correctly', async () => {
      const args = ['node', 'readme-to-cicd', 'parse', testReadmePath, '--verbose'];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(true);
      // Verbose mode should not affect success but may provide more detailed output
    });

    it('should parse debug flag correctly', async () => {
      const args = ['node', 'readme-to-cicd', 'parse', testReadmePath, '--debug'];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(true);
      // Debug mode should not affect success but may provide more detailed output
    });

    it('should handle multiple flags together', async () => {
      const args = [
        'node', 'readme-to-cicd', 'parse', testReadmePath, 
        '--format', 'json', 
        '--include-confidence', 
        '--include-metadata', 
        '--verbose'
      ];
      
      const result = await cliApp.run(args);
      
      expect(result.success).toBe(true);
      expect(result.generatedFiles).toHaveLength(1);
    });
  });
});

/**
 * Create a test README file with comprehensive content for testing
 */
async function createTestReadmeFile(filePath: string): Promise<void> {
  const content = createTestReadmeContent();
  await fs.writeFile(filePath, content, 'utf8');
}

/**
 * Generate test README content
 */
function createTestReadmeContent(): string {
  return `# Test Project

A comprehensive test project for README parsing validation.

## Description

This is a Node.js application built with TypeScript and React. It demonstrates
various features and technologies for testing the README parser.

## Installation

\`\`\`bash
npm install
yarn install
\`\`\`

## Usage

\`\`\`bash
npm start
npm run dev
npm run build
npm test
npm run lint
\`\`\`

## Development

\`\`\`bash
# Start development server
npm run dev

# Run tests
npm test
npm run test:watch
npm run test:coverage

# Build for production
npm run build
\`\`\`

## Technologies

- **Frontend**: React, TypeScript, Webpack
- **Backend**: Node.js, Express
- **Database**: PostgreSQL, Redis
- **Testing**: Jest, Cypress
- **CI/CD**: GitHub Actions

## Dependencies

- react: ^18.0.0
- typescript: ^4.9.0
- express: ^4.18.0
- jest: ^29.0.0

## Scripts

The following npm scripts are available:

- \`start\`: Start the production server
- \`dev\`: Start development server with hot reload
- \`build\`: Build for production
- \`test\`: Run test suite
- \`lint\`: Run ESLint
- \`format\`: Format code with Prettier

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
`;
}