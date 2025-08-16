import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ErrorHandler } from '../../../src/cli/lib/error-handler';
import { Logger } from '../../../src/cli/lib/logger';
import { CLIApplication } from '../../../src/cli/lib/cli-application';

describe('Error Handling Integration', () => {
  let errorHandler: ErrorHandler;
  let cliApplication: CLIApplication;
  let mockLogger: Logger;
  let consoleErrorSpy: any;

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

    errorHandler = new ErrorHandler(mockLogger);
    cliApplication = new CLIApplication(mockLogger, errorHandler);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('CLI Application Error Integration', () => {
    it('should handle invalid command arguments gracefully', async () => {
      const args = ['generate', '--invalid-flag', 'value'];
      
      const result = await cliApplication.run(args);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      // The CLI parser error will be categorized as processing since it's an internal error
      expect(result.errors[0].category).toBe('processing');
      expect(result.errors[0].suggestions.length).toBeGreaterThan(0);
    });

    it('should provide recovery suggestions for configuration errors', async () => {
      // Simulate a configuration file error
      const configError = new Error('Invalid JSON in configuration file');
      const context = { configPath: '.readme-to-cicd.json' };
      
      const result = errorHandler.handleCLIError(configError, context);
      
      // Should be caught by the INVALID_JSON pattern
      expect(result.errors[0].code).toBe('INVALID_JSON');
      expect(result.errors[0].category).toBe('configuration');
      expect(result.errors[0].suggestions).toContain('Check JSON syntax for missing commas or brackets');
    });

    it('should handle file system errors with appropriate suggestions', async () => {
      const fsError = new Error('ENOENT: no such file or directory, open \'README.md\'');
      fsError.name = 'ENOENT';
      
      const result = errorHandler.handleCLIError(fsError);
      
      // Should be caught by the README_NOT_FOUND pattern
      expect(result.errors[0].code).toBe('README_NOT_FOUND');
      expect(result.errors[0].category).toBe('file-system');
      expect(result.errors[0].suggestions).toContain('Create a README.md file in your project root');
      expect(result.errors[0].context.filePath).toBe('README.md');
    });

    it('should attempt error recovery for recoverable errors', async () => {
      const recoverableError = new Error('Configuration file not found');
      const context = { configPath: '.readme-to-cicd.json' };
      
      const recoveryResult = await errorHandler.handleRecoverableError(recoverableError, context);
      
      expect(recoveryResult.strategy).toBe('config-recovery');
      expect(recoveryResult.attemptedStrategies).toContain('config-recovery');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Recoverable error occurred, attempting recovery',
        expect.any(Object)
      );
    });

    it('should preserve context across error handling chain', async () => {
      const error = new Error('Processing failed');
      const context = {
        command: 'generate',
        filePath: '/test/README.md',
        gitRepository: '/test',
        currentBranch: 'main'
      };
      
      const result = errorHandler.handleCLIError(error, context);
      
      expect(result.errors[0].context).toMatchObject({
        command: 'generate',
        filePath: '/test/README.md',
        gitRepository: '/test',
        currentBranch: 'main',
        nodeVersion: process.version,
        platform: process.platform
      });
      expect(result.errors[0].context.timestamp).toBeDefined();
    });

    it('should categorize Git errors correctly with suggestions', async () => {
      const gitError = new Error('fatal: not a git repository (or any of the parent directories): .git');
      
      const result = errorHandler.handleCLIError(gitError);
      
      expect(result.errors[0].code).toBe('GIT_ERROR');
      expect(result.errors[0].category).toBe('git-integration');
      expect(result.errors[0].suggestions).toContain('Ensure you are in a Git repository');
      expect(result.errors[0].suggestions).toContain('Check if Git is installed and accessible');
    });

    it('should handle parsing errors with line number extraction', async () => {
      const parseError = new Error('Unexpected token } in JSON at position 45, line 12');
      const context = { filePath: 'package.json' };
      
      const result = errorHandler.handleCLIError(parseError, context);
      
      expect(result.errors[0].code).toBe('PARSING_ERROR');
      expect(result.errors[0].category).toBe('processing');
      expect(result.errors[0].context.filePath).toBe('package.json');
      expect(result.errors[0].context.lineNumber).toBe(12);
      expect(result.errors[0].suggestions).toContain('Check the file syntax and formatting');
    });

    it('should provide typo suggestions for common mistakes', async () => {
      const typoError = new Error('ENOENT: no such file or directory, open \'readm.md\'');
      typoError.name = 'ENOENT';
      
      const result = errorHandler.handleCLIError(typoError);
      
      expect(result.errors[0].suggestions.some(s => s.includes('readme'))).toBe(true);
    });

    it('should handle permission errors with appropriate guidance', async () => {
      const permError = new Error('EACCES: permission denied, open \'/restricted/config.json\'');
      permError.name = 'EACCES';
      
      const result = errorHandler.handleCLIError(permError);
      
      expect(result.errors[0].code).toBe('PERMISSION_DENIED');
      expect(result.errors[0].category).toBe('file-system');
      expect(result.errors[0].suggestions).toContain('Check file permissions and ensure you have read/write access');
      expect(result.errors[0].context.filePath).toBe('/restricted/config.json');
    });

    it('should display errors with proper formatting and colors', async () => {
      const error = new Error('Test formatting error');
      
      errorHandler.handleCLIError(error);
      
      // Verify console.error was called with formatted output
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('ERROR:'),
        'Test formatting error'
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Code:')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Suggestions:')
      );
    });

    it('should handle fatal errors without crashing', async () => {
      const fatalError = new Error('Critical system failure');
      
      expect(() => {
        errorHandler.handleFatalError(fatalError);
      }).not.toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Fatal Error:'),
        'Critical system failure'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Fatal error occurred',
        expect.any(Object)
      );
    });

    it('should redact sensitive information in debug mode', async () => {
      const originalDebug = process.env.DEBUG;
      process.env.DEBUG = 'true';
      
      const error = new Error('Sensitive data error');
      const context = {
        password: 'secret123',
        apiKey: 'key123',
        token: 'token123',
        normalField: 'normalValue'
      };
      
      errorHandler.handleCLIError(error, context);
      
      // Should redact sensitive fields
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[REDACTED]')
      );
      
      process.env.DEBUG = originalDebug;
    });

    it('should provide different suggestions based on error context', async () => {
      // Test with command context
      const error1 = new Error('Unknown error');
      const context1 = { command: 'generate' };
      const result1 = errorHandler.handleCLIError(error1, context1);
      
      expect(result1.errors[0].suggestions.some(s => s.includes('readme-to-cicd generate --help'))).toBe(true);
      
      // Test without command context
      const error2 = new Error('Unknown error');
      const result2 = errorHandler.handleCLIError(error2);
      
      expect(result2.errors[0].suggestions).toContain('Try running with --debug flag for more information');
    });

    it('should handle batch processing errors appropriately', async () => {
      // Simulate a batch processing scenario with mixed results
      const errors = [
        new Error('ENOENT: no such file or directory, open \'package.json\''),
        new Error('EACCES: permission denied, open \'/restricted/file.txt\''),
        new Error('Invalid JSON syntax in configuration')
      ];
      
      // Set error names for proper categorization
      errors[0].name = 'ENOENT';
      errors[1].name = 'EACCES';
      
      const results = errors.map(error => errorHandler.handleCLIError(error));
      
      // Each error should be properly categorized
      expect(results[0].errors[0].suggestions).toContain('Run npm init to create a package.json file');
      expect(results[1].errors[0].suggestions).toContain('Check file permissions and ensure you have read/write access');
      expect(results[2].errors[0].suggestions).toContain('Check JSON syntax for missing commas or brackets');
      
      // All should have proper context preservation
      results.forEach(result => {
        expect(result.errors[0].context.timestamp).toBeDefined();
        expect(result.errors[0].context.nodeVersion).toBe(process.version);
      });
    });
  });

  describe('Error Recovery Integration', () => {
    it('should chain recovery attempts for complex errors', async () => {
      const complexError = new Error('Multiple configuration issues detected');
      const context = { 
        configPath: '.readme-to-cicd.json',
        command: 'generate'
      };
      
      const recoveryResult = await errorHandler.handleRecoverableError(complexError, context);
      
      expect(recoveryResult.attemptedStrategies.length).toBeGreaterThan(0);
      expect(recoveryResult.strategy).toBeDefined();
    });

    it('should provide fallback options when primary recovery fails', async () => {
      const criticalError = new Error('Critical configuration error that cannot be recovered');
      const context = { configPath: '.readme-to-cicd.json' };
      
      const recoveryResult = await errorHandler.handleRecoverableError(criticalError, context);
      
      // Even if recovery fails, should provide guidance
      expect(recoveryResult.attemptedStrategies).toContain('config-recovery');
    });
  });

  describe('Error Suggestion Engine Integration', () => {
    it('should provide framework-specific suggestions', async () => {
      const frameworkError = new Error('ENOENT: no such file or directory, open \'package.json\'');
      frameworkError.name = 'ENOENT';
      
      const result = errorHandler.handleCLIError(frameworkError);
      
      expect(result.errors[0].code).toBe('PACKAGE_JSON_NOT_FOUND');
      expect(result.errors[0].suggestions).toContain('Run npm init to create a package.json file');
      expect(result.errors[0].suggestions).toContain('Ensure you are in a Node.js project directory');
    });

    it('should adapt suggestions based on file extensions', async () => {
      const yamlError = new Error('ENOENT: no such file or directory, open \'config.yaml\'');
      yamlError.name = 'ENOENT';
      
      const result = errorHandler.handleCLIError(yamlError);
      
      expect(result.errors[0].context.filePath).toBe('config.yaml');
      expect(result.errors[0].suggestions).toContain('Verify the file path is correct and the file exists');
    });

    it('should provide command-specific help suggestions', async () => {
      const commandError = new Error('Invalid workflow type specified');
      const context = { command: 'validate' };
      
      const result = errorHandler.handleCLIError(commandError, context);
      
      expect(result.errors[0].suggestions.some(s => s.includes('readme-to-cicd validate --help'))).toBe(true);
    });
  });
});