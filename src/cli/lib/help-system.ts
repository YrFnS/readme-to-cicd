/**
 * Comprehensive Help and Documentation System
 * 
 * Provides detailed help text, usage examples, command suggestions,
 * contextual help, and troubleshooting guides for the CLI tool.
 */

import { Command } from 'commander';
import { CLIOptions, CLIError, FrameworkInfo } from './types';
import { CommandSuggestionEngine } from './command-suggestion-engine';
import { ContextualHelpProvider } from './contextual-help-provider';
import { TroubleshootingGuide } from './troubleshooting-guide';

export interface HelpSystemOptions {
  enableCommandSuggestions: boolean;
  enableContextualHelp: boolean;
  enableTroubleshooting: boolean;
  maxSuggestions: number;
}

export interface HelpRequest {
  command?: string;
  subcommand?: string;
  error?: CLIError;
  projectPath?: string;
  detectedFrameworks?: FrameworkInfo[];
}

export interface HelpResponse {
  title: string;
  description: string;
  usage: string[];
  examples: string[];
  options: HelpOption[];
  suggestions?: string[];
  contextualTips?: string[];
  troubleshootingLinks?: TroubleshootingLink[];
  relatedCommands?: string[];
}

export interface HelpOption {
  flag: string;
  description: string;
  type?: string;
  default?: string;
  required?: boolean;
  examples?: string[];
}

export interface TroubleshootingLink {
  title: string;
  description: string;
  url?: string;
  section?: string;
}

export class HelpSystem {
  private commandSuggestionEngine: CommandSuggestionEngine;
  private contextualHelpProvider: ContextualHelpProvider;
  private troubleshootingGuide: TroubleshootingGuide;
  private options: HelpSystemOptions;

  constructor(options: Partial<HelpSystemOptions> = {}) {
    this.options = {
      enableCommandSuggestions: true,
      enableContextualHelp: true,
      enableTroubleshooting: true,
      maxSuggestions: 5,
      ...options
    };

    this.commandSuggestionEngine = new CommandSuggestionEngine();
    this.contextualHelpProvider = new ContextualHelpProvider();
    this.troubleshootingGuide = new TroubleshootingGuide();
  }

  /**
   * Get comprehensive help for a command or error
   */
  async getHelp(request: HelpRequest): Promise<HelpResponse> {
    const baseHelp = this.getBaseHelp(request.command, request.subcommand);
    
    // Add command suggestions if command not found
    if (request.command && !this.isValidCommand(request.command)) {
      if (this.options.enableCommandSuggestions) {
        baseHelp.suggestions = this.commandSuggestionEngine.suggestCommands(request.command);
      } else {
        // Remove suggestions if disabled
        delete (baseHelp as any).suggestions;
      }
    }

    // Add contextual help based on project state
    if (this.options.enableContextualHelp && request.projectPath) {
      const contextualTips = await this.contextualHelpProvider.getContextualTips(
        request.projectPath,
        request.detectedFrameworks
      );
      baseHelp.contextualTips = contextualTips;
    }

    // Add troubleshooting information
    if (this.options.enableTroubleshooting) {
      if (request.error) {
        baseHelp.troubleshootingLinks = this.troubleshootingGuide.getTroubleshootingForError(request.error);
      } else if (request.command) {
        baseHelp.troubleshootingLinks = this.troubleshootingGuide.getTroubleshootingForCommand(request.command);
      }
    }

    return baseHelp;
  }

  /**
   * Get help for command errors with suggestions
   */
  getErrorHelp(error: CLIError, command?: string): HelpResponse {
    const errorHelp: HelpResponse = {
      title: `Error: ${error.message}`,
      description: this.getErrorDescription(error),
      usage: [],
      examples: [],
      options: [],
      suggestions: error.suggestions || []
    };

    // Add command suggestions if it's a command not found error
    if (error.code === 'UNKNOWN_COMMAND' && command) {
      errorHelp.suggestions = [
        ...(errorHelp.suggestions || []),
        ...this.commandSuggestionEngine.suggestCommands(command)
      ];
    }

    // Add troubleshooting links
    errorHelp.troubleshootingLinks = this.troubleshootingGuide.getTroubleshootingForError(error);

    return errorHelp;
  }

  /**
   * Format help response for display
   */
  formatHelp(help: HelpResponse): string {
    const sections: string[] = [];

    // Title and description
    sections.push(`${help.title}\n`);
    if (help.description) {
      sections.push(`${help.description}\n`);
    }

    // Usage
    if (help.usage.length > 0) {
      sections.push('Usage:');
      help.usage.forEach(usage => sections.push(`  ${usage}`));
      sections.push('');
    }

    // Options
    if (help.options.length > 0) {
      sections.push('Options:');
      help.options.forEach(option => {
        let optionLine = `  ${option.flag}`;
        if (option.type) optionLine += ` <${option.type}>`;
        optionLine += `  ${option.description}`;
        if (option.default) optionLine += ` (default: ${option.default})`;
        if (option.required) optionLine += ' [required]';
        sections.push(optionLine);
        
        if (option.examples && option.examples.length > 0) {
          option.examples.forEach(example => {
            sections.push(`    Example: ${example}`);
          });
        }
      });
      sections.push('');
    }

    // Examples
    if (help.examples.length > 0) {
      sections.push('Examples:');
      help.examples.forEach(example => sections.push(`  ${example}`));
      sections.push('');
    }

    // Command suggestions
    if (help.suggestions && help.suggestions.length > 0) {
      sections.push('Did you mean:');
      help.suggestions.forEach(suggestion => sections.push(`  ${suggestion}`));
      sections.push('');
    }

    // Contextual tips
    if (help.contextualTips && help.contextualTips.length > 0) {
      sections.push('Tips for your project:');
      help.contextualTips.forEach(tip => sections.push(`  • ${tip}`));
      sections.push('');
    }

    // Related commands
    if (help.relatedCommands && help.relatedCommands.length > 0) {
      sections.push('Related commands:');
      help.relatedCommands.forEach(cmd => sections.push(`  ${cmd}`));
      sections.push('');
    }

    // Troubleshooting links
    if (help.troubleshootingLinks && help.troubleshootingLinks.length > 0) {
      sections.push('Troubleshooting:');
      help.troubleshootingLinks.forEach(link => {
        sections.push(`  • ${link.title}: ${link.description}`);
        if (link.url) {
          sections.push(`    More info: ${link.url}`);
        }
      });
      sections.push('');
    }

    return sections.join('\n');
  }

  /**
   * Get base help information for a command
   */
  private getBaseHelp(command?: string, subcommand?: string): HelpResponse {
    if (!command) {
      return this.getMainHelp();
    }

    switch (command) {
      case 'generate':
        return this.getGenerateHelp(subcommand);
      case 'validate':
        return this.getValidateHelp();
      case 'init':
        return this.getInitHelp();
      case 'export':
        return this.getExportHelp();
      case 'import':
        return this.getImportHelp();
      default:
        return this.getUnknownCommandHelp(command);
    }
  }

  /**
   * Get main application help
   */
  private getMainHelp(): HelpResponse {
    return {
      title: 'readme-to-cicd - Automatically generate CI/CD workflows from README files',
      description: 'Transform your project documentation into production-ready GitHub Actions workflows with intelligent framework detection and optimization.',
      usage: [
        'readme-to-cicd <command> [options]',
        'readme-to-cicd generate [readme-path] [options]',
        'readme-to-cicd --help'
      ],
      examples: [
        'readme-to-cicd generate                    # Generate workflows from current directory',
        'readme-to-cicd generate --interactive      # Use interactive mode with prompts',
        'readme-to-cicd generate --dry-run          # Preview what would be generated',
        'readme-to-cicd validate                    # Validate existing workflows',
        'readme-to-cicd init                        # Create configuration file'
      ],
      options: [
        {
          flag: '-h, --help',
          description: 'Display help for command'
        },
        {
          flag: '-v, --verbose',
          description: 'Enable verbose output with detailed processing information'
        },
        {
          flag: '-d, --debug',
          description: 'Enable debug output with internal processing steps'
        },
        {
          flag: '-q, --quiet',
          description: 'Suppress all non-essential output'
        },
        {
          flag: '-c, --config <path>',
          description: 'Load configuration from specified file',
          type: 'path',
          examples: ['--config ./custom-config.json']
        },
        {
          flag: '-i, --interactive',
          description: 'Enable interactive mode with prompts'
        },
        {
          flag: '--ci',
          description: 'Optimize output for CI/CD environments'
        }
      ],
      relatedCommands: [
        'readme-to-cicd generate --help    # Get help for generate command',
        'readme-to-cicd validate --help    # Get help for validate command',
        'readme-to-cicd init --help        # Get help for init command'
      ]
    };
  }  /**

   * Get generate command help
   */
  private getGenerateHelp(subcommand?: string): HelpResponse {
    return {
      title: 'readme-to-cicd generate - Generate CI/CD workflows from README files',
      description: 'Analyze README files to detect frameworks and generate optimized GitHub Actions workflows. Supports single projects and batch processing.',
      usage: [
        'readme-to-cicd generate [readme-path]',
        'readme-to-cicd generate [options]',
        'readme-to-cicd generate --directories <dirs...> [options]'
      ],
      examples: [
        'readme-to-cicd generate                                    # Basic generation from current directory',
        'readme-to-cicd generate ./docs/README.md                  # Specific README file',
        'readme-to-cicd generate -o ./workflows                    # Custom output directory',
        'readme-to-cicd generate -w ci cd                          # Specific workflow types',
        'readme-to-cicd generate -f nodejs react                   # Override framework detection',
        'readme-to-cicd generate --dry-run --verbose               # Preview with details',
        'readme-to-cicd generate --interactive                     # Interactive mode with prompts',
        'readme-to-cicd generate --config ./custom-config.json    # Custom configuration',
        'readme-to-cicd generate --directories ./projects ./apps   # Process multiple directories',
        'readme-to-cicd generate --directories . --recursive       # Recursively find all projects',
        'readme-to-cicd generate --directories . -r --parallel     # Parallel processing',
        'readme-to-cicd generate --directories . -r -p --max-concurrency 8  # Custom concurrency',
        'readme-to-cicd generate --directories . --project-pattern "api-.*" # Filter by pattern',
        'readme-to-cicd generate --directories . --exclude-patterns "test*" "temp*"  # Exclude patterns'
      ],
      options: [
        {
          flag: '[readme-path]',
          description: 'Path to README file or directory',
          type: 'path',
          default: './README.md',
          examples: ['./README.md', './docs/README.md', './projects/api/']
        },
        {
          flag: '-o, --output-dir <dir>',
          description: 'Output directory for generated workflows',
          type: 'directory',
          default: '.github/workflows',
          examples: ['--output-dir ./workflows', '--output-dir ../shared-workflows']
        },
        {
          flag: '-w, --workflow-type <types...>',
          description: 'Workflow types to generate (ci, cd, release)',
          type: 'types',
          default: 'ci, cd',
          examples: ['--workflow-type ci', '--workflow-type ci cd release']
        },
        {
          flag: '-f, --framework <frameworks...>',
          description: 'Override automatic framework detection',
          type: 'frameworks',
          examples: ['--framework nodejs', '--framework react typescript']
        },
        {
          flag: '--dry-run',
          description: 'Show what would be generated without creating files',
          default: 'false'
        },
        {
          flag: '--directories <dirs...>',
          description: 'Process multiple directories (enables batch mode)',
          type: 'directories',
          examples: ['--directories ./api ./web', '--directories . --recursive']
        },
        {
          flag: '-r, --recursive',
          description: 'Recursively scan subdirectories for projects',
          default: 'false'
        },
        {
          flag: '-p, --parallel',
          description: 'Process multiple projects in parallel',
          default: 'false'
        },
        {
          flag: '--max-concurrency <num>',
          description: 'Maximum number of parallel processes',
          type: 'number',
          default: '4',
          examples: ['--max-concurrency 8', '--max-concurrency 2']
        },
        {
          flag: '--continue-on-error',
          description: 'Continue processing other projects when one fails',
          default: 'true'
        },
        {
          flag: '--project-pattern <pattern>',
          description: 'Regex pattern to filter project names',
          type: 'regex',
          examples: ['--project-pattern "api-.*"', '--project-pattern ".*-service$"']
        },
        {
          flag: '--exclude-patterns <patterns...>',
          description: 'Patterns to exclude directories from scanning',
          type: 'patterns',
          examples: ['--exclude-patterns "test*" "temp*"', '--exclude-patterns "node_modules"']
        }
      ],
      relatedCommands: [
        'readme-to-cicd validate           # Validate generated workflows',
        'readme-to-cicd init               # Create configuration file',
        'readme-to-cicd generate --help    # This help message'
      ]
    };
  }

  /**
   * Get validate command help
   */
  private getValidateHelp(): HelpResponse {
    return {
      title: 'readme-to-cicd validate - Validate existing workflows and suggest improvements',
      description: 'Analyze existing GitHub Actions workflows for syntax errors, best practices, and optimization opportunities.',
      usage: [
        'readme-to-cicd validate [workflow-path]',
        'readme-to-cicd validate [options]'
      ],
      examples: [
        'readme-to-cicd validate                           # Validate all workflows in .github/workflows',
        'readme-to-cicd validate .github/workflows/ci.yml # Validate specific workflow file',
        'readme-to-cicd validate --update                 # Apply suggested improvements',
        'readme-to-cicd validate --verbose                # Show detailed validation results'
      ],
      options: [
        {
          flag: '[workflow-path]',
          description: 'Path to workflow file or directory',
          type: 'path',
          default: '.github/workflows',
          examples: ['.github/workflows/ci.yml', './workflows/', '../shared-workflows/']
        },
        {
          flag: '--update',
          description: 'Update workflows with suggested improvements',
          default: 'false'
        }
      ],
      relatedCommands: [
        'readme-to-cicd generate           # Generate new workflows',
        'readme-to-cicd validate --help    # This help message'
      ]
    };
  }

  /**
   * Get init command help
   */
  private getInitHelp(): HelpResponse {
    return {
      title: 'readme-to-cicd init - Initialize configuration file and project setup',
      description: 'Create a configuration file with project-specific settings, templates, and organization policies.',
      usage: [
        'readme-to-cicd init',
        'readme-to-cicd init [options]'
      ],
      examples: [
        'readme-to-cicd init                      # Create basic configuration',
        'readme-to-cicd init --template team      # Create team configuration with shared settings',
        'readme-to-cicd init --template enterprise # Create enterprise configuration with policies',
        'readme-to-cicd init --interactive        # Interactive configuration setup'
      ],
      options: [
        {
          flag: '--template <type>',
          description: 'Configuration template type (basic, team, enterprise)',
          type: 'template',
          default: 'basic',
          examples: ['--template basic', '--template team', '--template enterprise']
        }
      ],
      relatedCommands: [
        'readme-to-cicd generate           # Generate workflows using configuration',
        'readme-to-cicd export             # Export configuration for sharing',
        'readme-to-cicd init --help        # This help message'
      ]
    };
  }

  /**
   * Get export command help
   */
  private getExportHelp(): HelpResponse {
    return {
      title: 'readme-to-cicd export - Export configuration and templates to portable package',
      description: 'Create a portable configuration package that includes settings, custom templates, and organization policies for sharing across projects.',
      usage: [
        'readme-to-cicd export',
        'readme-to-cicd export [options]'
      ],
      examples: [
        'readme-to-cicd export                              # Export to default file',
        'readme-to-cicd export -o team-config.json         # Export to specific file',
        'readme-to-cicd export --config ./custom.json      # Export specific configuration'
      ],
      options: [
        {
          flag: '-o, --output <file>',
          description: 'Output file for exported configuration',
          type: 'file',
          default: 'readme-to-cicd-config.json',
          examples: ['--output team-config.json', '--output ../shared/config.json']
        }
      ],
      relatedCommands: [
        'readme-to-cicd import             # Import exported configuration',
        'readme-to-cicd init               # Create new configuration',
        'readme-to-cicd export --help      # This help message'
      ]
    };
  }

  /**
   * Get import command help
   */
  private getImportHelp(): HelpResponse {
    return {
      title: 'readme-to-cicd import - Import configuration from exported package',
      description: 'Import configuration settings, templates, and policies from an exported configuration package.',
      usage: [
        'readme-to-cicd import <config-file>',
        'readme-to-cicd import <config-file> [options]'
      ],
      examples: [
        'readme-to-cicd import team-config.json             # Import configuration',
        'readme-to-cicd import config.json --merge          # Merge with existing configuration',
        'readme-to-cicd import config.json --interactive    # Interactive conflict resolution'
      ],
      options: [
        {
          flag: '<config-file>',
          description: 'Path to exported configuration file',
          type: 'file',
          required: true,
          examples: ['team-config.json', '../shared/config.json']
        },
        {
          flag: '--merge',
          description: 'Merge with existing configuration instead of replacing',
          default: 'false'
        }
      ],
      relatedCommands: [
        'readme-to-cicd export             # Export configuration for sharing',
        'readme-to-cicd init               # Create new configuration',
        'readme-to-cicd import --help      # This help message'
      ]
    };
  }

  /**
   * Get help for unknown command
   */
  private getUnknownCommandHelp(command: string): HelpResponse {
    return {
      title: `Unknown command: ${command}`,
      description: 'The command you entered is not recognized. See available commands below.',
      usage: [
        'readme-to-cicd <command> [options]',
        'readme-to-cicd --help'
      ],
      examples: [
        'readme-to-cicd generate           # Generate workflows',
        'readme-to-cicd validate           # Validate workflows',
        'readme-to-cicd init               # Initialize configuration',
        'readme-to-cicd --help             # Show help'
      ],
      options: [],
      // Don't include suggestions here - they will be added by getHelp if enabled
      suggestions: [
        'readme-to-cicd generate',
        'readme-to-cicd validate',
        'readme-to-cicd init',
        'readme-to-cicd export',
        'readme-to-cicd import'
      ]
    };
  }

  /**
   * Check if command is valid
   */
  private isValidCommand(command: string): boolean {
    const validCommands = ['generate', 'validate', 'init', 'export', 'import'];
    return validCommands.includes(command);
  }

  /**
   * Get error description based on error type
   */
  private getErrorDescription(error: CLIError): string {
    switch (error.category) {
      case 'user-input':
        return 'There was an issue with the command or options you provided. Please check the syntax and try again.';
      case 'configuration':
        return 'There was an issue with the configuration file or settings. Please verify your configuration is valid.';
      case 'processing':
        return 'An error occurred while processing your request. This may be due to invalid input or internal processing issues.';
      case 'file-system':
        return 'There was an issue accessing or writing files. Please check file permissions and available disk space.';
      case 'git-integration':
        return 'There was an issue with Git operations. Please ensure you have a valid Git repository and proper permissions.';
      default:
        return 'An unexpected error occurred. Please try again or contact support if the issue persists.';
    }
  }
}