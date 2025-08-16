import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { CLIError, CLIResult, ErrorCategory } from './types';
import { Logger } from './logger';

/**
 * Comprehensive Error Handler for CLI Tool
 * 
 * Implements categorized error handling with user-friendly messages,
 * actionable suggestions, error recovery strategies, and context preservation
 * as specified in the design document and task requirements.
 */
export class ErrorHandler {
  private readonly commonMistakes: Map<string, string[]>;
  private readonly recoveryStrategies: Map<ErrorCategory, RecoveryStrategy>;
  private readonly errorPatterns: Map<RegExp, ErrorClassification>;

  constructor(private readonly logger: Logger) {
    this.commonMistakes = this.initializeCommonMistakes();
    this.recoveryStrategies = this.initializeRecoveryStrategies();
    this.errorPatterns = this.initializeErrorPatterns();
  }

  /**
   * Handle CLI execution errors and return appropriate result
   */
  handleCLIError(error: Error, context?: ErrorContext): CLIResult {
    const cliError = this.categorizeError(error, context);
    this.logger.error('CLI error occurred', { error: cliError });

    // Display user-friendly error message
    this.displayError(cliError);

    // Attempt error recovery if possible
    const recoveryResult = this.attemptRecovery(cliError, context);

    return {
      success: false,
      generatedFiles: [],
      errors: [cliError],
      warnings: recoveryResult.warnings,
      summary: {
        totalTime: 0,
        filesGenerated: 0,
        workflowsCreated: 0,
        frameworksDetected: [],
        optimizationsApplied: 0,
        executionTime: 0,
        filesProcessed: 0,
        workflowsGenerated: 0
      }
    };
  }

  /**
   * Handle fatal errors that should terminate the application
   */
  handleFatalError(error: Error, context?: ErrorContext): void {
    const cliError = this.categorizeError(error, context);
    this.logger.error('Fatal error occurred', { error: cliError });
    
    console.error(chalk.red.bold('✗ Fatal Error:'), cliError.message);
    
    if (cliError.suggestions.length > 0) {
      console.error(chalk.yellow('\nSuggestions:'));
      cliError.suggestions.forEach(suggestion => {
        console.error(chalk.yellow(`  • ${suggestion}`));
      });
    }

    // Show recovery options for fatal errors
    const recovery = this.recoveryStrategies.get(cliError.category);
    if (recovery && recovery.fatalErrorOptions.length > 0) {
      console.error(chalk.cyan('\nRecovery Options:'));
      recovery.fatalErrorOptions.forEach(option => {
        console.error(chalk.cyan(`  • ${option}`));
      });
    }
  }

  /**
   * Handle recoverable errors with fallback options
   */
  async handleRecoverableError(error: Error, context?: ErrorContext): Promise<RecoveryResult> {
    const cliError = this.categorizeError(error, context);
    this.logger.warn('Recoverable error occurred, attempting recovery', { error: cliError });

    const recoveryResult = this.attemptRecovery(cliError, context);
    
    if (recoveryResult.recovered) {
      this.logger.info('Error recovery successful', { 
        strategy: recoveryResult.strategy,
        fallbackUsed: recoveryResult.fallbackUsed 
      });
    } else {
      this.logger.error('Error recovery failed', { 
        error: cliError,
        attemptedStrategies: recoveryResult.attemptedStrategies 
      });
    }

    return recoveryResult;
  }

  /**
   * Categorize errors into appropriate types with comprehensive suggestions
   */
  private categorizeError(error: Error, context?: ErrorContext): CLIError {
    // Check for specific error patterns first
    for (const [pattern, classification] of this.errorPatterns) {
      if (pattern.test(error.message)) {
        return this.createCLIError(error, classification, context);
      }
    }

    // Check for common Node.js errors
    if (error.name === 'ENOENT' || error.message.includes('ENOENT')) {
      return this.createFileNotFoundError(error, context);
    }

    if (error.name === 'EACCES' || error.message.includes('EACCES')) {
      return this.createPermissionError(error, context);
    }

    if (error.name === 'ENOTDIR' || error.message.includes('ENOTDIR')) {
      return this.createDirectoryError(error, context);
    }

    // Check for parsing errors (before configuration to catch JSON/YAML parsing)
    if (error.message.includes('parse') || 
        error.message.includes('syntax') || 
        error.message.includes('Unexpected token') ||
        error.message.includes('JSON') ||
        error.message.includes('YAML')) {
      return this.createParsingError(error, context);
    }

    // Check for configuration errors
    if (error.message.toLowerCase().includes('config') || 
        error.message.toLowerCase().includes('configuration') ||
        (context && context.configPath)) {
      return this.createConfigurationError(error, context);
    }

    // Check for Git-related errors
    if (error.message.includes('git') || error.message.includes('repository')) {
      return this.createGitError(error, context);
    }

    // Default categorization with enhanced suggestions
    return this.createGenericError(error, context);
  }

  /**
   * Create CLI error for file not found scenarios
   */
  private createFileNotFoundError(error: Error, context?: ErrorContext): CLIError {
    const filePath = this.extractFilePathFromError(error.message);
    const suggestions = this.generateFileNotFoundSuggestions(filePath, context);

    return {
      code: 'FILE_NOT_FOUND',
      message: `File not found: ${filePath || 'unknown file'}`,
      category: 'file-system',
      severity: 'error',
      suggestions,
      context: {
        ...this.preserveContext(error, context),
        filePath,
        workingDirectory: process.cwd()
      }
    };
  }

  /**
   * Create CLI error for permission issues
   */
  private createPermissionError(error: Error, context?: ErrorContext): CLIError {
    const filePath = this.extractFilePathFromError(error.message);
    
    return {
      code: 'PERMISSION_DENIED',
      message: `Permission denied accessing: ${filePath || 'file/directory'}`,
      category: 'file-system',
      severity: 'error',
      suggestions: [
        'Check file permissions and ensure you have read/write access',
        'Try running with elevated privileges if necessary',
        'Verify the file is not locked by another process',
        'Check if the parent directory exists and is writable'
      ],
      context: {
        ...this.preserveContext(error, context),
        filePath,
        userId: process.getuid?.(),
        groupId: process.getgid?.()
      }
    };
  }

  /**
   * Create CLI error for directory-related issues
   */
  private createDirectoryError(error: Error, context?: ErrorContext): CLIError {
    const dirPath = this.extractFilePathFromError(error.message);
    
    return {
      code: 'DIRECTORY_ERROR',
      message: `Directory operation failed: ${dirPath || 'unknown directory'}`,
      category: 'file-system',
      severity: 'error',
      suggestions: [
        'Verify the directory path exists',
        'Check if the path points to a file instead of a directory',
        'Ensure parent directories exist',
        'Try creating the directory structure first'
      ],
      context: {
        ...this.preserveContext(error, context),
        directoryPath: dirPath,
        workingDirectory: process.cwd()
      }
    };
  }

  /**
   * Create CLI error for configuration issues
   */
  private createConfigurationError(error: Error, context?: ErrorContext): CLIError {
    const filePath = context?.filePath || this.extractFilePathFromError(error.message);
    const configPath = context?.configPath || filePath;
    const lineNumber = this.extractLineNumberFromError(error.message);
    
    return {
      code: 'CONFIGURATION_ERROR',
      message: `Configuration error: ${error.message}`,
      category: 'configuration',
      severity: 'error',
      suggestions: [
        'Check your configuration file syntax (JSON/YAML)',
        'Verify all required configuration fields are present',
        'Run with --init to create a sample configuration',
        'Use --config to specify a different configuration file',
        'Validate configuration against the schema'
      ],
      context: {
        ...this.preserveContext(error, context),
        filePath,
        lineNumber,
        configPath,
        configFormat: this.detectConfigFormat(configPath)
      }
    };
  }

  /**
   * Create CLI error for Git-related issues
   */
  private createGitError(error: Error, context?: ErrorContext): CLIError {
    const filePath = context?.filePath || this.extractFilePathFromError(error.message);
    const lineNumber = this.extractLineNumberFromError(error.message);
    
    return {
      code: 'GIT_ERROR',
      message: `Git operation failed: ${error.message}`,
      category: 'git-integration',
      severity: 'error',
      suggestions: [
        'Ensure you are in a Git repository',
        'Check if Git is installed and accessible',
        'Verify you have proper Git credentials configured',
        'Try running git status to check repository state',
        'Check for uncommitted changes or conflicts'
      ],
      context: {
        ...this.preserveContext(error, context),
        filePath,
        lineNumber,
        gitRepository: context?.gitRepository,
        currentBranch: context?.currentBranch
      }
    };
  }

  /**
   * Create CLI error for parsing issues
   */
  private createParsingError(error: Error, context?: ErrorContext): CLIError {
    const filePath = context?.filePath || this.extractFilePathFromError(error.message);
    const lineNumber = this.extractLineNumberFromError(error.message);
    
    return {
      code: 'PARSING_ERROR',
      message: `Parsing failed: ${error.message}`,
      category: 'processing',
      severity: 'error',
      suggestions: [
        'Check the file syntax and formatting',
        'Verify the file is not corrupted or truncated',
        'Try validating the file with an external tool',
        'Check for unsupported characters or encoding issues',
        ...(lineNumber ? [`Review content around line ${lineNumber}`] : [])
      ],
      context: {
        ...this.preserveContext(error, context),
        filePath,
        lineNumber,
        fileSize: context?.fileSize
      }
    };
  }

  /**
   * Create generic CLI error with enhanced suggestions
   */
  private createGenericError(error: Error, context?: ErrorContext): CLIError {
    const suggestions = this.generateGenericSuggestions(error, context);
    const filePath = context?.filePath || this.extractFilePathFromError(error.message);
    const lineNumber = this.extractLineNumberFromError(error.message);
    
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      category: 'processing',
      severity: 'error',
      suggestions,
      context: {
        ...this.preserveContext(error, context),
        filePath,
        lineNumber
      }
    };
  }

  /**
   * Create CLI error from classification
   */
  private createCLIError(error: Error, classification: ErrorClassification, context?: ErrorContext): CLIError {
    const filePath = context?.filePath || this.extractFilePathFromError(error.message);
    const lineNumber = this.extractLineNumberFromError(error.message);
    
    return {
      code: classification.code,
      message: classification.messageTemplate.replace('{error}', error.message),
      category: classification.category,
      severity: classification.severity,
      suggestions: classification.suggestions,
      context: {
        ...this.preserveContext(error, context),
        filePath,
        lineNumber
      }
    };
  }

  /**
   * Attempt error recovery based on error category
   */
  private attemptRecovery(error: CLIError, context?: ErrorContext): RecoveryResult {
    const strategy = this.recoveryStrategies.get(error.category);
    
    if (!strategy) {
      return {
        recovered: false,
        strategy: 'none',
        warnings: [],
        attemptedStrategies: [],
        fallbackUsed: false
      };
    }

    const result: RecoveryResult = {
      recovered: false,
      strategy: strategy.name,
      warnings: [],
      attemptedStrategies: [strategy.name],
      fallbackUsed: false
    };

    try {
      // Attempt primary recovery strategy
      if (strategy.canRecover(error, context)) {
        const recoverySuccess = strategy.recover(error, context);
        
        if (recoverySuccess) {
          result.recovered = true;
          result.warnings.push(`Recovered from ${error.category} error using ${strategy.name} strategy`);
        } else if (strategy.fallbackOptions.length > 0) {
          // Try fallback options
          for (const fallback of strategy.fallbackOptions) {
            result.attemptedStrategies.push(fallback);
            
            if (this.tryFallbackRecovery(error, fallback, context)) {
              result.recovered = true;
              result.fallbackUsed = true;
              result.warnings.push(`Recovered using fallback strategy: ${fallback}`);
              break;
            }
          }
        }
      }
    } catch (recoveryError) {
      this.logger.error('Recovery attempt failed', { 
        originalError: error,
        recoveryError: recoveryError as Error 
      });
      result.warnings.push(`Recovery attempt failed: ${(recoveryError as Error).message}`);
    }

    return result;
  }

  /**
   * Try fallback recovery strategy
   */
  private tryFallbackRecovery(error: CLIError, fallback: string, context?: ErrorContext): boolean {
    // Implementation would depend on specific fallback strategies
    // This is a placeholder for the actual recovery logic
    this.logger.debug('Attempting fallback recovery', { fallback, error: error.code });
    
    switch (fallback) {
      case 'use-defaults':
        return true; // Assume we can always fall back to defaults
      case 'skip-optional':
        return error.severity !== 'error'; // Can skip warnings and info
      case 'retry-with-timeout':
        return error.category !== 'file-system'; // Don't retry file system errors
      default:
        return false;
    }
  }

  /**
   * Display user-friendly error messages with enhanced styling
   */
  private displayError(error: CLIError): void {
    // Error header with icon and severity
    const severityIcon = this.getSeverityIcon(error.severity);
    const severityColor = this.getSeverityColor(error.severity);
    
    console.error(severityColor(`${severityIcon} ${error.severity.toUpperCase()}:`), error.message);
    
    // Error code and category
    console.error(chalk.gray(`Code: ${error.code} | Category: ${error.category}`));
    
    // Suggestions section
    if (error.suggestions.length > 0) {
      console.error(chalk.yellow('\n💡 Suggestions:'));
      error.suggestions.forEach((suggestion, index) => {
        console.error(chalk.yellow(`  ${index + 1}. ${suggestion}`));
      });
    }

    // Context information in debug mode
    if (error.context && (process.env.DEBUG || process.env.NODE_ENV === 'development')) {
      console.error(chalk.gray('\n🔍 Debug Information:'));
      this.displayContext(error.context);
    }

    // Recovery information if available
    const recovery = this.recoveryStrategies.get(error.category);
    if (recovery && recovery.userGuidance.length > 0) {
      console.error(chalk.cyan('\n🔧 Recovery Options:'));
      recovery.userGuidance.forEach((guidance, index) => {
        console.error(chalk.cyan(`  ${index + 1}. ${guidance}`));
      });
    }
  }

  /**
   * Display context information in a readable format
   */
  private displayContext(context: any): void {
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'credential'];
    
    for (const [key, value] of Object.entries(context)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        console.error(chalk.gray(`  ${key}: [REDACTED]`));
      } else if (typeof value === 'object' && value !== null) {
        console.error(chalk.gray(`  ${key}: ${JSON.stringify(value, null, 2)}`));
      } else {
        console.error(chalk.gray(`  ${key}: ${value}`));
      }
    }
  }

  /**
   * Get severity icon for display
   */
  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'error': return '✗';
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
      default: return '•';
    }
  }

  /**
   * Get severity color function
   */
  private getSeverityColor(severity: string): typeof chalk.red {
    switch (severity) {
      case 'error': return chalk.red.bold;
      case 'warning': return chalk.yellow.bold;
      case 'info': return chalk.blue.bold;
      default: return chalk.gray;
    }
  }

  /**
   * Generate suggestions for file not found errors
   */
  private generateFileNotFoundSuggestions(filePath?: string, context?: ErrorContext): string[] {
    const suggestions = [
      'Verify the file path is correct and the file exists',
      'Check if you are in the correct directory',
      'Ensure the file has not been moved or deleted'
    ];

    if (filePath) {
      const ext = path.extname(filePath).toLowerCase();
      const basename = path.basename(filePath, ext);
      
      // Add extension-specific suggestions
      if (ext === '.md') {
        suggestions.push('Try looking for README.md, readme.md, or Readme.md');
      } else if (ext === '.json') {
        suggestions.push('Check for package.json or configuration files');
      }
      
      // Add typo suggestions
      const typoSuggestions = this.generateTypoSuggestions(basename);
      suggestions.push(...typoSuggestions);
    }

    return suggestions;
  }

  /**
   * Generate generic suggestions based on error and context
   */
  private generateGenericSuggestions(error: Error, context?: ErrorContext): string[] {
    const suggestions = [
      'Try running with --debug flag for more information',
      'Check that all required dependencies are installed',
      'Verify your input files are accessible and properly formatted'
    ];

    // Add context-specific suggestions
    if (context?.command) {
      suggestions.push(`Try running 'readme-to-cicd ${context.command} --help' for usage information`);
    }

    // Add common mistake suggestions
    const errorText = error.message.toLowerCase();
    for (const [mistake, mistakeSuggestions] of this.commonMistakes) {
      if (errorText.includes(mistake)) {
        suggestions.push(...mistakeSuggestions);
        break;
      }
    }

    return suggestions;
  }

  /**
   * Generate typo suggestions for file names
   */
  private generateTypoSuggestions(filename: string): string[] {
    const suggestions: string[] = [];
    const commonFiles = ['readme', 'package', 'config', 'tsconfig', 'eslint'];
    
    for (const common of commonFiles) {
      if (this.calculateLevenshteinDistance(filename.toLowerCase(), common) <= 2) {
        suggestions.push(`Did you mean '${common}'?`);
      }
    }
    
    return suggestions;
  }

  /**
   * Calculate Levenshtein distance for typo detection
   */
  private calculateLevenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(0));
    
    for (let i = 0; i <= str1.length; i++) matrix[0]![i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j]![0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j]![i] = Math.min(
          matrix[j]![i - 1]! + 1,
          matrix[j - 1]![i]! + 1,
          matrix[j - 1]![i - 1]! + indicator
        );
      }
    }
    
    return matrix[str2.length]![str1.length]!;
  }

  /**
   * Preserve error context for debugging
   */
  private preserveContext(error: Error, context?: ErrorContext): any {
    return {
      timestamp: new Date().toISOString(),
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
      nodeVersion: process.version,
      platform: process.platform,
      workingDirectory: process.cwd(),
      ...context
    };
  }

  /**
   * Extract file path from error message
   */
  private extractFilePathFromError(message: string): string | undefined {
    const pathPatterns = [
      // ENOENT patterns
      /ENOENT.*?open\s+['"]([^'"]+)['"]?/i,
      /no such file or directory.*?open\s+['"]([^'"]+)['"]?/i,
      
      // Quoted file paths
      /'([^']+)'/,
      /"([^"]+)"/,
      
      // Cannot read/write patterns
      /cannot\s+(?:read|write|open|access)\s+file:\s*['"]?([^'":\s]+)['"]?/i,
      /cannot\s+(?:read|write|open|access)\s+['"]?([^'":\s]+)['"]?/i,
      
      // File not found patterns
      /file not found:\s*['"]?([^'":\s]+)['"]?/i,
      
      // Generic file/path/directory patterns
      /(?:file|path|directory):\s*['"]?([^'":\s]+)['"]?/i,
      
      // File extensions (last resort)
      /([a-zA-Z0-9_./\\-]+\.[a-zA-Z0-9]+)/
    ];
    
    for (const pattern of pathPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        // Clean up the extracted path
        let filePath = match[1].trim();
        
        // Remove trailing punctuation
        filePath = filePath.replace(/[,;.!?]+$/, '');
        
        // Accept if it has path separators or file extensions
        if (filePath.length > 0 && (filePath.includes('/') || filePath.includes('\\') || filePath.includes('.'))) {
          return filePath;
        }
      }
    }
    
    return undefined;
  }

  /**
   * Extract line number from error message
   */
  private extractLineNumberFromError(message: string): number | undefined {
    const linePatterns = [
      /line\s+(\d+)/i,
      /at\s+line\s+(\d+)/i,
      /:(\d+):\d+/,
      /position\s+(\d+)/i,
      /\((\d+):\d+\)/
    ];
    
    for (const pattern of linePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const lineNum = parseInt(match[1], 10);
        if (!isNaN(lineNum)) {
          return lineNum;
        }
      }
    }
    
    return undefined;
  }

  /**
   * Detect configuration file format
   */
  private detectConfigFormat(configPath?: string): string | undefined {
    if (!configPath) return undefined;
    
    const ext = path.extname(configPath).toLowerCase();
    switch (ext) {
      case '.json': return 'json';
      case '.yaml':
      case '.yml': return 'yaml';
      case '.js': return 'javascript';
      case '.ts': return 'typescript';
      default: return 'unknown';
    }
  }

  /**
   * Initialize common mistakes and their suggestions
   */
  private initializeCommonMistakes(): Map<string, string[]> {
    return new Map([
      ['command not found', [
        'Ensure the CLI tool is properly installed',
        'Check if the command is in your PATH',
        'Try running npm install -g readme-to-cicd'
      ]],
      ['permission denied', [
        'Check file permissions',
        'Try running with sudo (if appropriate)',
        'Ensure you own the file or directory'
      ]],
      ['module not found', [
        'Run npm install to install dependencies',
        'Check if the module name is correct',
        'Verify your Node.js version compatibility'
      ]],
      ['syntax error', [
        'Check file syntax and formatting',
        'Validate JSON/YAML structure',
        'Look for missing commas or brackets'
      ]],
      ['timeout', [
        'Check your network connection',
        'Try increasing timeout values',
        'Verify external services are accessible'
      ]]
    ]);
  }

  /**
   * Initialize recovery strategies for each error category
   */
  private initializeRecoveryStrategies(): Map<ErrorCategory, RecoveryStrategy> {
    return new Map([
      ['user-input', {
        name: 'input-validation',
        canRecover: (error) => error.severity !== 'error',
        recover: () => true,
        fallbackOptions: ['use-defaults', 'prompt-user'],
        fatalErrorOptions: ['Check command syntax', 'Run with --help for usage'],
        userGuidance: ['Verify your command arguments', 'Use --help for syntax help']
      }],
      ['configuration', {
        name: 'config-recovery',
        canRecover: (error) => !error.message.includes('critical'),
        recover: () => true,
        fallbackOptions: ['use-defaults', 'create-sample-config'],
        fatalErrorOptions: ['Run --init to create configuration', 'Check configuration syntax'],
        userGuidance: ['Use --init to create a sample configuration', 'Validate configuration syntax']
      }],
      ['processing', {
        name: 'processing-recovery',
        canRecover: (error) => error.code !== 'FATAL_PROCESSING_ERROR',
        recover: () => false, // Most processing errors can't be automatically recovered
        fallbackOptions: ['skip-optional', 'use-fallback-parser'],
        fatalErrorOptions: ['Check input file format', 'Try with different input'],
        userGuidance: ['Verify input file format', 'Try processing a simpler file first']
      }],
      ['file-system', {
        name: 'filesystem-recovery',
        canRecover: (error) => error.code === 'FILE_NOT_FOUND',
        recover: () => false, // File system errors usually require user intervention
        fallbackOptions: ['create-missing-directories', 'use-temp-directory'],
        fatalErrorOptions: ['Check file permissions', 'Verify disk space'],
        userGuidance: ['Check file paths and permissions', 'Ensure sufficient disk space']
      }],
      ['git-integration', {
        name: 'git-recovery',
        canRecover: (error) => !error.message.includes('not a git repository'),
        recover: () => false, // Git errors usually require manual intervention
        fallbackOptions: ['skip-git-operations', 'init-git-repo'],
        fatalErrorOptions: ['Initialize Git repository', 'Check Git configuration'],
        userGuidance: ['Ensure you are in a Git repository', 'Check Git configuration']
      }]
    ]);
  }

  /**
   * Initialize error patterns for classification
   */
  private initializeErrorPatterns(): Map<RegExp, ErrorClassification> {
    return new Map([
      [/ENOENT.*package\.json/i, {
        code: 'PACKAGE_JSON_NOT_FOUND',
        category: 'file-system',
        severity: 'error',
        messageTemplate: 'package.json not found: {error}',
        suggestions: [
          'Ensure you are in a Node.js project directory',
          'Run npm init to create a package.json file',
          'Check if the file was moved or deleted'
        ]
      }],
      [/ENOENT.*README/i, {
        code: 'README_NOT_FOUND',
        category: 'file-system',
        severity: 'error',
        messageTemplate: 'README file not found: {error}',
        suggestions: [
          'Create a README.md file in your project root',
          'Check if the README file has a different name or extension',
          'Specify the README path with --readme-path option'
        ]
      }],
      [/Invalid JSON/i, {
        code: 'INVALID_JSON',
        category: 'configuration',
        severity: 'error',
        messageTemplate: 'Invalid JSON configuration: {error}',
        suggestions: [
          'Check JSON syntax for missing commas or brackets',
          'Use a JSON validator to check your configuration',
          'Ensure all strings are properly quoted'
        ]
      }],
      [/YAML.*parse.*error/i, {
        code: 'INVALID_YAML',
        category: 'configuration',
        severity: 'error',
        messageTemplate: 'Invalid YAML configuration: {error}',
        suggestions: [
          'Check YAML indentation (use spaces, not tabs)',
          'Ensure proper YAML syntax',
          'Use a YAML validator to check your configuration'
        ]
      }],
      [/spawn.*ENOENT/i, {
        code: 'COMMAND_NOT_FOUND',
        category: 'user-input',
        severity: 'error',
        messageTemplate: 'Command not found: {error}',
        suggestions: [
          'Ensure the required command is installed',
          'Check if the command is in your PATH',
          'Install missing dependencies'
        ]
      }]
    ]);
  }
}

// Supporting interfaces and types
interface ErrorContext {
  command?: string;
  filePath?: string;
  configPath?: string;
  gitRepository?: string;
  currentBranch?: string;
  fileSize?: number;
  [key: string]: any;
}

interface RecoveryStrategy {
  name: string;
  canRecover: (error: CLIError, context?: ErrorContext) => boolean;
  recover: (error: CLIError, context?: ErrorContext) => boolean;
  fallbackOptions: string[];
  fatalErrorOptions: string[];
  userGuidance: string[];
}

interface RecoveryResult {
  recovered: boolean;
  strategy: string;
  warnings: string[];
  attemptedStrategies: string[];
  fallbackUsed: boolean;
}

interface ErrorClassification {
  code: string;
  category: ErrorCategory;
  severity: 'error' | 'warning' | 'info';
  messageTemplate: string;
  suggestions: string[];
}