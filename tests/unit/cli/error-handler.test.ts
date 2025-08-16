import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ErrorHandler } from '../../../src/cli/lib/error-handler';
import { Logger } from '../../../src/cli/lib/logger';
import { CLIError, ErrorCategory } from '../../../src/cli/lib/types';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let mockLogger: Logger;
  let consoleErrorSpy: any;
  let processExitSpy: any;

  beforeEach(() => {
    // Mock logger
    mockLogger = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      setLevel: vi.fn()
    } as any;

    // Mock console.error to capture output
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock process.exit to prevent actual exit during tests
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    errorHandler = new ErrorHandler(mockLogger);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Error Categorization', () => {
    it('should categorize file not found errors correctly', () => {
      const error = new Error('ENOENT: no such file or directory, open \'/path/to/file.txt\'');
      error.name = 'ENOENT';

      const result = errorHandler.handleCLIError(error);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('FILE_NOT_FOUND');
      expect(result.errors[0].category).toBe('file-system');
      expect(result.errors[0].severity).toBe('error');
      expect(result.errors[0].suggestions).toContain('Verify the file path is correct and the file exists');
    });

    it('should categorize permission errors correctly', () => {
      const error = new Error('EACCES: permission denied, open \'/restricted/file.txt\'');
      error.name = 'EACCES';

      const result = errorHandler.handleCLIError(error);

      expect(result.errors[0].code).toBe('PERMISSION_DENIED');
      expect(result.errors[0].category).toBe('file-system');
      expect(result.errors[0].suggestions).toContain('Check file permissions and ensure you have read/write access');
    });

    it('should categorize configuration errors correctly', () => {
      const error = new Error('Invalid configuration: missing required field');

      const result = errorHandler.handleCLIError(error, { configPath: '.readme-to-cicd.json' });

      expect(result.errors[0].code).toBe('CONFIGURATION_ERROR');
      expect(result.errors[0].category).toBe('configuration');
      expect(result.errors[0].suggestions).toContain('Check your configuration file syntax (JSON/YAML)');
    });

    it('should categorize Git errors correctly', () => {
      const error = new Error('fatal: not a git repository');

      const result = errorHandler.handleCLIError(error);

      expect(result.errors[0].code).toBe('GIT_ERROR');
      expect(result.errors[0].category).toBe('git-integration');
      expect(result.errors[0].suggestions).toContain('Ensure you are in a Git repository');
    });

    it('should categorize parsing errors correctly', () => {
      const error = new Error('Unexpected token } in JSON at position 45');

      const result = errorHandler.handleCLIError(error, { filePath: 'config.json' });

      expect(result.errors[0].code).toBe('PARSING_ERROR');
      expect(result.errors[0].category).toBe('processing');
      expect(result.errors[0].suggestions).toContain('Check the file syntax and formatting');
    });
  });

  describe('Error Pattern Matching', () => {
    it('should match package.json not found pattern', () => {
      const error = new Error('ENOENT: no such file or directory, open \'package.json\'');

      const result = errorHandler.handleCLIError(error);

      expect(result.errors[0].code).toBe('PACKAGE_JSON_NOT_FOUND');
      expect(result.errors[0].suggestions).toContain('Run npm init to create a package.json file');
    });

    it('should match README not found pattern', () => {
      const error = new Error('ENOENT: no such file or directory, open \'README.md\'');

      const result = errorHandler.handleCLIError(error);

      expect(result.errors[0].code).toBe('README_NOT_FOUND');
      expect(result.errors[0].suggestions).toContain('Create a README.md file in your project root');
    });

    it('should match invalid JSON pattern', () => {
      const error = new Error('Invalid JSON syntax at line 5');

      const result = errorHandler.handleCLIError(error);

      expect(result.errors[0].code).toBe('INVALID_JSON');
      expect(result.errors[0].suggestions).toContain('Check JSON syntax for missing commas or brackets');
    });

    it('should match YAML parse error pattern', () => {
      const error = new Error('YAML parse error: bad indentation');

      const result = errorHandler.handleCLIError(error);

      expect(result.errors[0].code).toBe('INVALID_YAML');
      expect(result.errors[0].suggestions).toContain('Check YAML indentation (use spaces, not tabs)');
    });

    it('should match command not found pattern', () => {
      const error = new Error('spawn git ENOENT');

      const result = errorHandler.handleCLIError(error);

      expect(result.errors[0].code).toBe('COMMAND_NOT_FOUND');
      expect(result.errors[0].suggestions).toContain('Ensure the required command is installed');
    });
  });

  describe('Suggestion Engine', () => {
    it('should generate typo suggestions for file names', () => {
      const error = new Error('ENOENT: no such file or directory, open \'readm.md\'');
      error.name = 'ENOENT';

      const result = errorHandler.handleCLIError(error);

      expect(result.errors[0].suggestions.some(s => s.includes('readme'))).toBe(true);
    });

    it('should provide extension-specific suggestions', () => {
      const error = new Error('ENOENT: no such file or directory, open \'config.json\'');
      error.name = 'ENOENT';

      const result = errorHandler.handleCLIError(error);

      expect(result.errors[0].suggestions).toContain('Check for package.json or configuration files');
    });

    it('should provide context-specific suggestions', () => {
      const error = new Error('Unknown error occurred');

      const result = errorHandler.handleCLIError(error, { command: 'generate' });

      expect(result.errors[0].suggestions.some(s => s.includes('readme-to-cicd generate --help'))).toBe(true);
    });

    it('should provide common mistake suggestions', () => {
      const error = new Error('command not found: readme-to-cicd');

      const result = errorHandler.handleCLIError(error);

      expect(result.errors[0].suggestions).toContain('Ensure the CLI tool is properly installed');
      expect(result.errors[0].suggestions).toContain('Try running npm install -g readme-to-cicd');
    });
  });

  describe('Context Preservation', () => {
    it('should preserve error context with timestamp', () => {
      const error = new Error('Test error');
      const context = { filePath: '/test/file.txt', command: 'generate' };

      const result = errorHandler.handleCLIError(error, context);

      expect(result.errors[0].context).toMatchObject({
        errorName: 'Error',
        errorMessage: 'Test error',
        filePath: '/test/file.txt',
        command: 'generate',
        nodeVersion: process.version,
        platform: process.platform,
        workingDirectory: process.cwd()
      });
      expect(result.errors[0].context.timestamp).toBeDefined();
    });

    it('should include stack trace in context', () => {
      const error = new Error('Test error with stack');

      const result = errorHandler.handleCLIError(error);

      expect(result.errors[0].context.stack).toBeDefined();
      expect(typeof result.errors[0].context.stack).toBe('string');
    });

    it('should preserve additional context fields', () => {
      const error = new Error('Test error');
      const context = {
        gitRepository: '/path/to/repo',
        currentBranch: 'main',
        fileSize: 1024
      };

      const result = errorHandler.handleCLIError(error, context);

      expect(result.errors[0].context).toMatchObject(context);
    });
  });

  describe('Error Recovery', () => {
    it('should attempt recovery for recoverable errors', async () => {
      const error = new Error('Configuration file not found');
      const context = { configPath: '.readme-to-cicd.json' };

      const recoveryResult = await errorHandler.handleRecoverableError(error, context);

      expect(recoveryResult.strategy).toBe('config-recovery');
      expect(recoveryResult.attemptedStrategies).toContain('config-recovery');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Recoverable error occurred, attempting recovery',
        expect.any(Object)
      );
    });

    it('should try fallback options when primary recovery fails', async () => {
      const error = new Error('Critical processing error');
      const context = { command: 'generate' };

      const recoveryResult = await errorHandler.handleRecoverableError(error, context);

      expect(recoveryResult.attemptedStrategies.length).toBeGreaterThan(1);
    });

    it('should log recovery success', async () => {
      const error = new Error('Non-critical user input error');
      
      const recoveryResult = await errorHandler.handleRecoverableError(error);

      if (recoveryResult.recovered) {
        expect(mockLogger.info).toHaveBeenCalledWith(
          'Error recovery successful',
          expect.objectContaining({
            strategy: expect.any(String),
            fallbackUsed: expect.any(Boolean)
          })
        );
      }
    });

    it('should log recovery failure', async () => {
      const error = new Error('Fatal processing error');
      error.name = 'FATAL_PROCESSING_ERROR';
      
      const recoveryResult = await errorHandler.handleRecoverableError(error);

      if (!recoveryResult.recovered) {
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Error recovery failed',
          expect.objectContaining({
            error: expect.any(Object),
            attemptedStrategies: expect.any(Array)
          })
        );
      }
    });
  });

  describe('Fatal Error Handling', () => {
    it('should handle fatal errors without throwing', () => {
      const error = new Error('Fatal system error');

      expect(() => {
        errorHandler.handleFatalError(error);
      }).not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Fatal Error:'),
        'Fatal system error'
      );
    });

    it('should display recovery options for fatal errors', () => {
      const error = new Error('Configuration is critically malformed');
      const context = { configPath: '.readme-to-cicd.json' };

      errorHandler.handleFatalError(error, context);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Recovery Options:'),
      );
    });

    it('should log fatal errors', () => {
      const error = new Error('Fatal error');

      errorHandler.handleFatalError(error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Fatal error occurred',
        expect.objectContaining({
          error: expect.any(Object)
        })
      );
    });
  });

  describe('Error Display', () => {
    it('should display error with proper formatting', () => {
      const error = new Error('Test display error');

      errorHandler.handleCLIError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('ERROR:'),
        'Test display error'
      );
    });

    it('should display suggestions with numbering', () => {
      const error = new Error('ENOENT: file not found');
      error.name = 'ENOENT';

      errorHandler.handleCLIError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Suggestions:')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('1.')
      );
    });

    it('should display error code and category', () => {
      const error = new Error('ENOENT: file not found');
      error.name = 'ENOENT';

      errorHandler.handleCLIError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Code:'),
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Category:')
      );
    });

    it('should display debug information when DEBUG is set', () => {
      const originalDebug = process.env.DEBUG;
      process.env.DEBUG = 'true';

      const error = new Error('Debug test error');
      const context = { testField: 'testValue' };

      errorHandler.handleCLIError(error, context);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Debug Information:')
      );

      process.env.DEBUG = originalDebug;
    });

    it('should redact sensitive information in debug output', () => {
      const originalDebug = process.env.DEBUG;
      process.env.DEBUG = 'true';

      const error = new Error('Sensitive data test');
      const context = { 
        password: 'secret123',
        token: 'abc123',
        normalField: 'normalValue'
      };

      errorHandler.handleCLIError(error, context);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[REDACTED]')
      );

      process.env.DEBUG = originalDebug;
    });
  });

  describe('Utility Functions', () => {
    it('should extract file paths from error messages', () => {
      const testCases = [
        { message: 'ENOENT: no such file or directory, open \'/path/to/file.txt\'', expected: '/path/to/file.txt' },
        { message: 'cannot read file: "/another/path/file.json"', expected: '/another/path/file.json' },
        { message: 'file not found: config.yaml', expected: 'config.yaml' }
      ];

      testCases.forEach(({ message, expected }) => {
        const error = new Error(message);
        const result = errorHandler.handleCLIError(error);
        expect(result.errors[0].context.filePath, `Failed for message: "${message}"`).toBe(expected);
      });
    });

    it('should extract line numbers from error messages', () => {
      const error = new Error('Syntax error at line 42');
      const context = { filePath: 'test.json' };

      const result = errorHandler.handleCLIError(error, context);

      expect(result.errors[0].context.lineNumber).toBe(42);
    });

    it('should detect configuration file formats', () => {
      const testCases = [
        { path: 'config.json', expected: 'json' },
        { path: 'config.yaml', expected: 'yaml' },
        { path: 'config.yml', expected: 'yaml' },
        { path: 'config.js', expected: 'javascript' },
        { path: 'config.ts', expected: 'typescript' }
      ];

      testCases.forEach(({ path, expected }) => {
        const error = new Error('Configuration error');
        const context = { configPath: path };

        const result = errorHandler.handleCLIError(error, context);

        expect(result.errors[0].context.configFormat).toBe(expected);
      });
    });

    it('should calculate Levenshtein distance correctly', () => {
      // Test the typo suggestion functionality indirectly
      const error = new Error('ENOENT: no such file or directory, open \'readm.md\'');
      error.name = 'ENOENT';

      const result = errorHandler.handleCLIError(error);

      // Should suggest 'readme' as it's close to 'readm'
      expect(result.errors[0].suggestions.some(s => s.includes('readme'))).toBe(true);
    });
  });

  describe('Integration with CLI Result', () => {
    it('should return properly formatted CLI result', () => {
      const error = new Error('Integration test error');

      const result = errorHandler.handleCLIError(error);

      expect(result).toMatchObject({
        success: false,
        generatedFiles: [],
        errors: expect.arrayContaining([
          expect.objectContaining({
            code: expect.any(String),
            message: expect.any(String),
            category: expect.any(String),
            severity: expect.any(String),
            suggestions: expect.any(Array),
            context: expect.any(Object)
          })
        ]),
        warnings: expect.any(Array),
        summary: expect.objectContaining({
          totalTime: 0,
          filesGenerated: 0,
          workflowsCreated: 0,
          frameworksDetected: expect.any(Array),
          optimizationsApplied: 0,
          executionTime: 0,
          filesProcessed: 0,
          workflowsGenerated: 0
        })
      });
    });

    it('should include recovery warnings in result', () => {
      const error = new Error('Recoverable configuration error');
      const context = { configPath: '.readme-to-cicd.json' };

      const result = errorHandler.handleCLIError(error, context);

      // Recovery warnings should be included
      expect(result.warnings).toBeDefined();
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });
});