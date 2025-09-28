/**
 * Command Parser Implementation
 * 
 * Handles command-line argument parsing using commander.js with comprehensive
 * validation, error handling, and help system as specified in the design.
 */

import { Command, Option, CommanderError } from 'commander';
import { CLIOptions, WorkflowType, CLIError } from './types';
import { HelpSystem, HelpRequest } from './help-system';

export class CommandParser {
  private program: Command;
  private parsedOptions: CLIOptions | null = null;
  private helpSystem: HelpSystem;

  constructor() {
    this.program = new Command();
    this.helpSystem = new HelpSystem();
    this.setupProgram();
  }

  /**
   * Parse command-line arguments into CLIOptions
   */
  parseArguments(args: string[]): CLIOptions {
    try {
      // Reset parsed options
      this.parsedOptions = null;
      
      // Check if this is a help command before parsing
      const isHelpCommand = args.includes('--help') || args.includes('-h') || 
                           args.includes('help') || args.length <= 2;
      
      // Configure commander to not exit on errors
      this.program.exitOverride((err) => {
        // Special handling for help commands - don't treat them as errors
        if (err.code === 'commander.helpDisplayed' || err.message.includes('outputHelp')) {
          // Create a successful help result
          this.parsedOptions = {
            command: 'help',
            dryRun: false,
            verbose: false,
            debug: false,
            quiet: false,
            interactive: false,
            ci: false
          };
          return; // Don't throw for help
        }
        throw new CommanderError(err.exitCode, err.code, err.message);
      });
      
      // Parse arguments - this will trigger action handlers
      this.program.parse(args);
      
      // Handle case where help was displayed but no options were set
      if (!this.parsedOptions && isHelpCommand) {
        this.parsedOptions = {
          command: 'help',
          dryRun: false,
          verbose: false,
          debug: false,
          quiet: false,
          interactive: false,
          ci: false
        };
      }
      
      // Return the parsed options set by action handlers
      if (!this.parsedOptions) {
        throw new Error('No command was executed');
      }
      
      return this.parsedOptions;
    } catch (error) {
      if (error instanceof CommanderError) {
        throw this.createParseErrorWithSuggestions(new Error(error.message), args);
      }
      throw this.createParseErrorWithSuggestions(error as Error, args);
    }
  }

  /**
   * Get comprehensive help for a command or error
   */
  async getHelp(request: HelpRequest): Promise<string> {
    const helpResponse = await this.helpSystem.getHelp(request);
    return this.helpSystem.formatHelp(helpResponse);
  }

  /**
   * Get help for command errors with suggestions
   */
  getErrorHelp(error: CLIError, command?: string): string {
    const helpResponse = this.helpSystem.getErrorHelp(error, command);
    return this.helpSystem.formatHelp(helpResponse);
  }

  /**
   * Get the configured commander program
   */
  getProgram(): Command {
    return this.program;
  }

  /**
   * Setup the main program configuration
   */
  private setupProgram(): void {
    this.program
      .name('readme-to-cicd')
      .description('Automatically generate optimized GitHub Actions CI/CD workflows from README files')
      .version('1.0.0')
      .helpOption('-h, --help', 'Display help for command')
      .addHelpText('after', this.getUsageExamples());

    this.setupGlobalOptions();
    this.setupCommands();
  }

  /**
   * Setup global options available to all commands
   */
  private setupGlobalOptions(): void {
    this.program
      .addOption(new Option('-v, --verbose', 'Enable verbose output with detailed processing information'))
      .addOption(new Option('-d, --debug', 'Enable debug output with internal processing steps'))
      .addOption(new Option('-q, --quiet', 'Suppress all non-essential output'))
      .addOption(new Option('-c, --config <path>', 'Load configuration from specified file'))
      .addOption(new Option('-i, --interactive', 'Enable interactive mode with prompts'))
      .addOption(new Option('--ci', 'Optimize output for CI/CD environments with machine-readable formats'));
  }

  /**
   * Setup all CLI commands
   */
  private setupCommands(): void {
    this.setupGenerateCommand();
    this.setupValidateCommand();
    this.setupInitCommand();
    this.setupExportCommand();
    this.setupImportCommand();
    this.setupReadmeCommands();
    this.setupStatusCommand(); // Phase 4: Add status command
  }

  /**
   * Setup the main generate command with all options
   */
  private setupGenerateCommand(): void {
    const generateCommand = this.program
      .command('generate [readme-path]')
      .description('Generate CI/CD workflows from README file or multiple projects')
      .argument('[readme-path]', 'Path to README file or directory (defaults to ./README.md)')
      .addOption(new Option('-o, --output-dir <dir>', 'Output directory for generated workflows')
        .default('.github/workflows'))
      .addOption(new Option('-w, --workflow-type <types...>', 'Workflow types to generate')
        .choices(['ci', 'cd', 'release'])
        .default(['ci', 'cd']))
      .addOption(new Option('-f, --framework <frameworks...>', 'Override automatic framework detection'))
      .addOption(new Option('--dry-run', 'Show what would be generated without creating files')
        .default(false))
      
      // Phase 3: Enhanced CLI options for better control
      .addOption(new Option('--timeout <seconds>', 'Set custom timeout for detection and generation')
        .argParser(parseInt)
        .default(15))
      .addOption(new Option('--use-fallback', 'Skip complex detection, use simple generator')
        .default(false))
      .addOption(new Option('--no-progress', 'Disable progress indicators')
        .default(false))
      .addOption(new Option('--debug-detection', 'Enable detailed detection logging')
        .default(false))
      
      // Batch processing options
      .addOption(new Option('--directories <dirs...>', 'Process multiple directories (enables batch mode)'))
      .addOption(new Option('-r, --recursive', 'Recursively scan subdirectories for projects')
        .default(false))
      .addOption(new Option('-p, --parallel', 'Process multiple projects in parallel')
        .default(false))
      .addOption(new Option('--max-concurrency <num>', 'Maximum number of parallel processes')
        .argParser(parseInt)
        .default(4))
      .addOption(new Option('--continue-on-error', 'Continue processing other projects when one fails')
        .default(true))
      .addOption(new Option('--project-pattern <pattern>', 'Regex pattern to filter project names'))
      .addOption(new Option('--exclude-patterns <patterns...>', 'Patterns to exclude directories from scanning'))
      
      .addHelpText('after', this.getGenerateExamples());

    generateCommand.action((readmePath, options, command) => {
      const globalOptions = this.program.opts();
      const commandOptions = generateCommand.opts();
      this.parsedOptions = this.buildCLIOptions('generate', {
        ...globalOptions,
        ...commandOptions,
        readmePath
      });
    });
  }

  /**
   * Setup the validate command
   */
  private setupValidateCommand(): void {
    const validateCommand = this.program
      .command('validate [workflow-path]')
      .description('Validate existing workflows and suggest improvements')
      .argument('[workflow-path]', 'Path to workflow file or directory (defaults to .github/workflows)')
      .addOption(new Option('--update', 'Update workflows with suggested improvements')
        .default(false))
      .addHelpText('after', this.getValidateExamples());

    validateCommand.action((workflowPath, options, command) => {
      const globalOptions = this.program.opts();
      const commandOptions = validateCommand.opts();
      this.parsedOptions = this.buildCLIOptions('validate', {
        ...globalOptions,
        ...commandOptions,
        workflowPath
      });
    });
  }

  /**
   * Setup the init command
   */
  private setupInitCommand(): void {
    const initCommand = this.program
      .command('init')
      .description('Initialize configuration file and project setup')
      .addOption(new Option('--template <type>', 'Configuration template type')
        .choices(['basic', 'enterprise', 'team'])
        .default('basic'))
      .addHelpText('after', this.getInitExamples());

    initCommand.action((options, command) => {
      const globalOptions = this.program.opts();
      const commandOptions = initCommand.opts();
      this.parsedOptions = this.buildCLIOptions('init', {
        ...globalOptions,
        ...commandOptions
      });
    });
  }

  /**
   * Setup the export command
   */
  private setupExportCommand(): void {
    const exportCommand = this.program
      .command('export')
      .description('Export configuration and templates to portable package')
      .addOption(new Option('-o, --output <file>', 'Output file for exported configuration')
        .default('readme-to-cicd-config.json'))
      .addHelpText('after', this.getExportExamples());

    exportCommand.action((options, command) => {
      const globalOptions = this.program.opts();
      const commandOptions = exportCommand.opts();
      this.parsedOptions = this.buildCLIOptions('export', {
        ...globalOptions,
        ...commandOptions
      });
    });
  }

  /**
   * Setup the import command
   */
  private setupImportCommand(): void {
    const importCommand = this.program
      .command('import <config-file>')
      .description('Import configuration from exported package')
      .addOption(new Option('--merge', 'Merge with existing configuration instead of replacing')
        .default(false))
      .addHelpText('after', this.getImportExamples());

    importCommand.action((configFile, options, command) => {
      const globalOptions = this.program.opts();
      const commandOptions = importCommand.opts();
      this.parsedOptions = this.buildCLIOptions('import', {
        ...globalOptions,
        ...commandOptions,
        configFile
      });
    });
  }

  /**
   * Build CLIOptions from parsed command and options
   */
  private buildCLIOptions(command: string, options: any): CLIOptions {
    // Validate command
    const validCommands = ['generate', 'validate', 'init', 'export', 'import', 'parse', 'analyze', 'readme-validate', 'status'];
    if (!validCommands.includes(command)) {
      throw new Error(`Invalid command: ${command}. Valid commands are: ${validCommands.join(', ')}`);
    }

    // Validate workflow types if provided
    if (options.workflowType) {
      this.validateWorkflowTypes(options.workflowType);
    }

    // Validate mutually exclusive options
    this.validateMutuallyExclusiveOptions(options);

    // Validate batch processing options
    this.validateBatchProcessingOptions(options);

    return {
      command: command as CLIOptions['command'],
      readmePath: options.readmePath,
      outputDir: options.outputDir,
      workflowType: options.workflowType as WorkflowType[],
      framework: options.framework,
      dryRun: Boolean(options.dryRun),
      interactive: Boolean(options.interactive),
      verbose: Boolean(options.verbose),
      debug: Boolean(options.debug),
      quiet: Boolean(options.quiet),
      config: options.config,
      ci: Boolean(options.ci),
      
      // Export/Import specific options
      output: options.output,
      configFile: options.configFile,
      merge: Boolean(options.merge),
      
      // Init specific options
      template: options.template,
      
      // Batch processing options
      directories: options.directories,
      recursive: Boolean(options.recursive),
      parallel: Boolean(options.parallel),
      maxConcurrency: options.maxConcurrency,
      continueOnError: Boolean(options.continueOnError),
      projectPattern: options.projectPattern,
      excludePatterns: options.excludePatterns,
      
      // README command specific options
      format: options.format,
      includeMetadata: Boolean(options.includeMetadata),
      includeConfidence: Boolean(options.includeConfidence),
      includeRecommendations: Boolean(options.includeRecommendations),
      includeDiagnostics: Boolean(options.includeDiagnostics),
      
      // Phase 3: Enhanced CLI options
      timeout: options.timeout,
      useFallback: Boolean(options.useFallback),
      noProgress: Boolean(options.noProgress),
      debugDetection: Boolean(options.debugDetection)
    };
  }

  /**
   * Validate workflow types
   */
  private validateWorkflowTypes(workflowTypes: string[]): void {
    const validTypes: WorkflowType[] = ['ci', 'cd', 'release'];
    const invalidTypes = workflowTypes.filter(type => !validTypes.includes(type as WorkflowType));
    
    if (invalidTypes.length > 0) {
      throw new Error(`Invalid workflow types: ${invalidTypes.join(', ')}. Valid types are: ${validTypes.join(', ')}`);
    }
  }

  /**
   * Validate mutually exclusive options
   */
  private validateMutuallyExclusiveOptions(options: any): void {
    // Verbose and quiet are mutually exclusive
    if (options.verbose && options.quiet) {
      throw new Error('Options --verbose and --quiet are mutually exclusive');
    }

    // Debug implies verbose, so quiet conflicts with debug
    if (options.debug && options.quiet) {
      throw new Error('Options --debug and --quiet are mutually exclusive');
    }
  }

  /**
   * Validate batch processing options
   */
  private validateBatchProcessingOptions(options: any): void {
    // Validate max concurrency
    if (options.maxConcurrency !== undefined) {
      const concurrency = parseInt(options.maxConcurrency);
      if (isNaN(concurrency) || concurrency < 1 || concurrency > 32) {
        throw new Error('Max concurrency must be a number between 1 and 32');
      }
    }

    // Validate project pattern is valid regex
    if (options.projectPattern) {
      try {
        new RegExp(options.projectPattern);
      } catch (error) {
        throw new Error(`Invalid project pattern regex: ${options.projectPattern}`);
      }
    }

    // Interactive mode conflicts with parallel processing
    if (options.interactive && options.parallel) {
      throw new Error('Interactive mode cannot be used with parallel processing');
    }

    // Warn if parallel is used without directories
    if (options.parallel && !options.directories) {
      // This is not an error, but parallel won't have effect with single project
      // We'll let the CLI handle this gracefully
    }
  }

  /**
   * Create a standardized parse error with command suggestions
   */
  private createParseErrorWithSuggestions(error: Error, args: string[]): CLIError {
    let message = error.message;
    let suggestions: string[] = [];
    let errorCode = 'PARSE_ERROR';
    
    // Handle specific commander error types with enhanced suggestions
    if (message.includes('unknown command')) {
      const commandMatch = message.match(/unknown command '([^']+)'/);
      if (commandMatch) {
        const unknownCommand = commandMatch[1];
        message = `Invalid command: ${unknownCommand}`;
        errorCode = 'UNKNOWN_COMMAND';
        
        // Get command suggestions from help system
        const commandSuggestions = unknownCommand ? 
          this.helpSystem['commandSuggestionEngine'].suggestCommands(unknownCommand) : [];
        suggestions = [
          ...commandSuggestions.map(cmd => `Did you mean: readme-to-cicd ${cmd}?`),
          'Run "readme-to-cicd --help" to see all available commands',
          'Check command spelling and syntax'
        ];
      }
    } else if (message.includes('argument') && message.includes('invalid')) {
      const typeMatch = message.match(/option.*'([^']+)'.*argument '([^']+)' is invalid/);
      if (typeMatch && typeMatch[1] && typeMatch[1].includes('workflow-type')) {
        message = `Invalid workflow types: ${typeMatch[2]}. Valid types are: ci, cd, release`;
        suggestions = [
          'Use: --workflow-type ci',
          'Use: --workflow-type ci cd',
          'Use: --workflow-type ci cd release',
          'Run "readme-to-cicd generate --help" for more options'
        ];
      }
    } else if (message.includes('unknown option')) {
      const optionMatch = message.match(/unknown option '([^']+)'/);
      if (optionMatch) {
        const unknownOption = optionMatch[1];
        
        // Try to suggest similar options
        const currentCommand = this.extractCommandFromArgs(args);
        if (currentCommand && unknownOption) {
          const optionSuggestions = this.helpSystem['commandSuggestionEngine'].suggestOptions(currentCommand, unknownOption);
          suggestions = [
            ...optionSuggestions.map(opt => `Did you mean: ${opt}?`),
            `Run "readme-to-cicd ${currentCommand} --help" for available options`
          ];
        }
      }
    }
    
    // Default suggestions if none were generated
    if (suggestions.length === 0) {
      suggestions = [
        'Check command syntax with --help',
        'Verify all required arguments are provided',
        'Ensure option values are valid'
      ];
    }
    
    return {
      code: errorCode,
      message,
      category: 'user-input',
      severity: 'error',
      suggestions,
      context: { originalError: error.message, args }
    };
  }

  /**
   * Get comprehensive usage examples
   */
  private getUsageExamples(): string {
    return `
Examples:
  $ readme-to-cicd generate                    # Generate workflows from ./README.md
  $ readme-to-cicd generate --interactive      # Use interactive mode with prompts
  $ readme-to-cicd generate --dry-run          # Preview what would be generated
  $ readme-to-cicd validate                    # Validate existing workflows
  $ readme-to-cicd init                        # Create configuration file

For more help on specific commands, use:
  $ readme-to-cicd <command> --help
`;
  }

  /**
   * Get generate command examples
   */
  private getGenerateExamples(): string {
    return `
Examples:
  Single Project:
    $ readme-to-cicd generate                                    # Basic generation
    $ readme-to-cicd generate ./docs/README.md                  # Specific README file
    $ readme-to-cicd generate -o ./workflows                    # Custom output directory
    $ readme-to-cicd generate -w ci cd                          # Specific workflow types
    $ readme-to-cicd generate -f nodejs react                   # Override framework detection
    $ readme-to-cicd generate --dry-run --verbose               # Preview with details
    $ readme-to-cicd generate --interactive                     # Interactive mode
    $ readme-to-cicd generate --config ./custom-config.json    # Custom configuration

  Batch Processing:
    $ readme-to-cicd generate --directories ./projects ./apps   # Process multiple directories
    $ readme-to-cicd generate --directories . --recursive       # Recursively find all projects
    $ readme-to-cicd generate --directories . -r --parallel     # Parallel processing
    $ readme-to-cicd generate --directories . -r -p --max-concurrency 8  # Custom concurrency
    $ readme-to-cicd generate --directories . --project-pattern "api-.*" # Filter by pattern
    $ readme-to-cicd generate --directories . --exclude-patterns "test*" "temp*"  # Exclude patterns
    $ readme-to-cicd generate --directories . -r --continue-on-error=false  # Stop on first error
`;
  }

  /**
   * Get validate command examples
   */
  private getValidateExamples(): string {
    return `
Examples:
  $ readme-to-cicd validate                           # Validate all workflows
  $ readme-to-cicd validate .github/workflows/ci.yml # Validate specific file
  $ readme-to-cicd validate --update                 # Apply suggested improvements
`;
  }

  /**
   * Get init command examples
   */
  private getInitExamples(): string {
    return `
Examples:
  $ readme-to-cicd init                      # Create basic configuration
  $ readme-to-cicd init --template team      # Create team configuration
  $ readme-to-cicd init --template enterprise # Create enterprise configuration
`;
  }

  /**
   * Get export command examples
   */
  private getExportExamples(): string {
    return `
Examples:
  $ readme-to-cicd export                              # Export to default file
  $ readme-to-cicd export -o team-config.json         # Export to specific file
`;
  }

  /**
   * Get import command examples
   */
  private getImportExamples(): string {
    return `
Examples:
  $ readme-to-cicd import team-config.json             # Import configuration
  $ readme-to-cicd import config.json --merge          # Merge with existing config
`;
  }

  /**
   * Setup README-specific commands
   */
  private setupReadmeCommands(): void {
    // Parse command - basic README parsing
    const parseCommand = this.program
      .command('parse [readme-path]')
      .description('Parse README file and extract project information')
      .argument('[readme-path]', 'Path to README file (defaults to ./README.md)')
      .addOption(new Option('--format <format>', 'Output format')
        .choices(['json', 'yaml', 'text'])
        .default('text'))
      .addOption(new Option('--include-metadata', 'Include processing metadata in output')
        .default(false))
      .addOption(new Option('--include-confidence', 'Include confidence scores in output')
        .default(false))
      .addHelpText('after', this.getParseExamples());

    parseCommand.action((readmePath, options, command) => {
      const globalOptions = this.program.opts();
      const commandOptions = parseCommand.opts();
      this.parsedOptions = this.buildCLIOptions('parse', {
        ...globalOptions,
        ...commandOptions,
        readmePath
      });
    });

    // Analyze command - detailed README analysis
    const analyzeCommand = this.program
      .command('analyze [readme-path]')
      .description('Perform detailed analysis of README file with recommendations')
      .argument('[readme-path]', 'Path to README file (defaults to ./README.md)')
      .addOption(new Option('--format <format>', 'Output format')
        .choices(['json', 'yaml', 'text'])
        .default('json'))
      .addOption(new Option('--include-recommendations', 'Include improvement recommendations')
        .default(true))
      .addOption(new Option('--include-diagnostics', 'Include diagnostic information')
        .default(true))
      .addHelpText('after', this.getAnalyzeExamples());

    analyzeCommand.action((readmePath, options, command) => {
      const globalOptions = this.program.opts();
      const commandOptions = analyzeCommand.opts();
      this.parsedOptions = this.buildCLIOptions('analyze', {
        ...globalOptions,
        ...commandOptions,
        readmePath
      });
    });

    // README validate command - validation only
    const readmeValidateCommand = this.program
      .command('readme-validate [readme-path]')
      .description('Validate README file structure and content quality')
      .argument('[readme-path]', 'Path to README file (defaults to ./README.md)')
      .addHelpText('after', this.getReadmeValidateExamples());

    readmeValidateCommand.action((readmePath, options, command) => {
      const globalOptions = this.program.opts();
      const commandOptions = readmeValidateCommand.opts();
      this.parsedOptions = this.buildCLIOptions('readme-validate', {
        ...globalOptions,
        ...commandOptions,
        readmePath
      });
    });
  }

  /**
   * Setup the status command (Phase 4)
   */
  private setupStatusCommand(): void {
    const statusCommand = this.program
      .command('status')
      .description('Show system status, performance metrics, and usage statistics')
      .addOption(new Option('--telemetry', 'Show detailed telemetry data')
        .default(false))
      .addOption(new Option('--performance', 'Show performance insights')
        .default(false))
      .addOption(new Option('--export', 'Export telemetry data for analysis')
        .default(false))
      .addHelpText('after', this.getStatusExamples());

    statusCommand.action((options, command) => {
      const globalOptions = this.program.opts();
      const commandOptions = statusCommand.opts();
      this.parsedOptions = this.buildCLIOptions('status', {
        ...globalOptions,
        ...commandOptions
      });
    });
  }

  /**
   * Extract command from arguments array
   */
  private extractCommandFromArgs(args: string[]): string | null {
    // Skip program name and find first non-option argument
    for (let i = 2; i < args.length; i++) {
      const arg = args[i];
      if (arg && !arg.startsWith('-') && !arg.startsWith('--')) {
        return arg;
      }
    }
    return null;
  }

  /**
   * Get parse command examples
   */
  private getParseExamples(): string {
    return `
Examples:
  $ readme-to-cicd parse                           # Parse ./README.md with text output
  $ readme-to-cicd parse ./docs/README.md         # Parse specific README file
  $ readme-to-cicd parse --format json            # Output as JSON
  $ readme-to-cicd parse --format yaml            # Output as YAML
  $ readme-to-cicd parse --include-confidence     # Include confidence scores
  $ readme-to-cicd parse --include-metadata       # Include processing metadata
`;
  }

  /**
   * Get analyze command examples
   */
  private getAnalyzeExamples(): string {
    return `
Examples:
  $ readme-to-cicd analyze                         # Detailed analysis with recommendations
  $ readme-to-cicd analyze ./README.md            # Analyze specific README file
  $ readme-to-cicd analyze --format text          # Human-readable analysis report
  $ readme-to-cicd analyze --no-recommendations   # Skip recommendations
  $ readme-to-cicd analyze --no-diagnostics       # Skip diagnostic information
`;
  }

  /**
   * Get readme-validate command examples
   */
  private getReadmeValidateExamples(): string {
    return `
Examples:
  $ readme-to-cicd readme-validate                 # Validate ./README.md
  $ readme-to-cicd readme-validate ./docs/README.md # Validate specific file
  $ readme-to-cicd readme-validate --verbose       # Detailed validation output
`;
  }

  /**
   * Get status command examples (Phase 4)
   */
  private getStatusExamples(): string {
    return `
Examples:
  $ readme-to-cicd status                           # Basic system status
  $ readme-to-cicd status --performance             # Show performance insights
  $ readme-to-cicd status --telemetry               # Show detailed telemetry
  $ readme-to-cicd status --export                  # Export data for analysis
`;
  }

  /**
   * Create a standardized parse error (legacy method for compatibility)
   */
  private createParseError(error: Error): CLIError {
    return this.createParseErrorWithSuggestions(error, []);
  }
}