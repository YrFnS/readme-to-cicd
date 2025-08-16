import { describe, it, expect, beforeEach } from 'vitest';
import { CLIApplication } from '../../../src/cli/lib/cli-application';
import { Logger } from '../../../src/cli/lib/logger';
import { ErrorHandler } from '../../../src/cli/lib/error-handler';

describe('CLIApplication', () => {
  let cliApp: CLIApplication;
  let logger: Logger;
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    logger = new Logger('error'); // Suppress logs during tests
    errorHandler = new ErrorHandler(logger);
    cliApp = new CLIApplication(logger, errorHandler);
  });

  describe('parseArguments', () => {
    it('should return default options for generate command', () => {
      const options = cliApp.parseArguments(['node', 'cli.js', 'generate']);
      
      expect(options).toEqual({
        command: 'generate',
        readmePath: undefined,
        outputDir: '.github/workflows',
        workflowType: ['ci', 'cd'],
        framework: undefined,
        dryRun: false,
        interactive: false,
        verbose: false,
        debug: false,
        quiet: false,
        config: undefined
      });
    });
  });

  describe('run', () => {
    it('should return error result when README file does not exist', async () => {
      // Test with a non-existent README file path as positional argument
      const result = await cliApp.run(['node', 'cli.js', 'generate', 'non-existent-readme.md']);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('README file not found');
    });

    it('should execute init command successfully', async () => {
      // Test init command execution
      const result = await cliApp.run(['node', 'cli.js', 'init', '--template', 'basic']);
      
      expect(result.success).toBe(true);
      expect(result.generatedFiles).toContain('.readme-to-cicd.json');
    });
  });
});