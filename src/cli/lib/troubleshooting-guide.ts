/**
 * Troubleshooting Guide
 * 
 * Provides troubleshooting information, FAQ answers, and solutions
 * for common issues encountered when using the CLI tool.
 */

import { CLIError } from './types';

export interface TroubleshootingEntry {
  id: string;
  title: string;
  description: string;
  category: 'error' | 'configuration' | 'workflow' | 'framework' | 'general';
  severity: 'critical' | 'high' | 'medium' | 'low';
  symptoms: string[];
  solutions: TroubleshootingSolution[];
  relatedErrors?: string[];
  tags: string[];
}

export interface TroubleshootingSolution {
  title: string;
  steps: string[];
  command?: string;
  note?: string;
  learnMoreUrl?: string;
}

export interface TroubleshootingLink {
  title: string;
  description: string;
  url?: string;
  section?: string;
}

export class TroubleshootingGuide {
  private troubleshootingEntries: TroubleshootingEntry[];

  constructor() {
    this.troubleshootingEntries = this.initializeTroubleshootingEntries();
  }

  /**
   * Get troubleshooting information for a specific error
   */
  getTroubleshootingForError(error: CLIError): TroubleshootingLink[] {
    const links: TroubleshootingLink[] = [];

    // Find entries that match the error code or category
    const matchingEntries = this.troubleshootingEntries.filter(entry => 
      entry.relatedErrors?.includes(error.code) ||
      entry.category === this.mapErrorCategoryToTroubleshooting(error.category) ||
      entry.symptoms.some(symptom => 
        error.message.toLowerCase().includes(symptom.toLowerCase())
      )
    );

    // Convert entries to links
    for (const entry of matchingEntries.slice(0, 3)) { // Limit to 3 most relevant
      links.push({
        title: entry.title,
        description: entry.description,
        section: `troubleshooting-${entry.id}`
      });
    }

    // Add general troubleshooting if no specific matches found
    if (links.length === 0) {
      links.push({
        title: 'General Troubleshooting',
        description: 'Common solutions for CLI issues',
        section: 'troubleshooting-general'
      });
    }

    return links;
  }

  /**
   * Get troubleshooting information for a specific command
   */
  getTroubleshootingForCommand(command: string): TroubleshootingLink[] {
    const links: TroubleshootingLink[] = [];

    // Find entries related to the command
    const commandEntries = this.troubleshootingEntries.filter(entry =>
      entry.tags.includes(command) ||
      entry.title.toLowerCase().includes(command.toLowerCase())
    );

    for (const entry of commandEntries.slice(0, 2)) {
      links.push({
        title: entry.title,
        description: entry.description,
        section: `troubleshooting-${entry.id}`
      });
    }

    return links;
  }

  /**
   * Get FAQ entries
   */
  getFAQEntries(): TroubleshootingEntry[] {
    return this.troubleshootingEntries.filter(entry => 
      entry.category === 'general' && entry.severity === 'low'
    );
  }

  /**
   * Search troubleshooting entries by keyword
   */
  searchTroubleshooting(query: string): TroubleshootingEntry[] {
    const normalizedQuery = query.toLowerCase();
    
    return this.troubleshootingEntries.filter(entry =>
      entry.title.toLowerCase().includes(normalizedQuery) ||
      entry.description.toLowerCase().includes(normalizedQuery) ||
      entry.tags.some(tag => tag.toLowerCase().includes(normalizedQuery)) ||
      entry.symptoms.some(symptom => symptom.toLowerCase().includes(normalizedQuery))
    );
  }

  /**
   * Get troubleshooting entry by ID
   */
  getTroubleshootingEntry(id: string): TroubleshootingEntry | undefined {
    return this.troubleshootingEntries.find(entry => entry.id === id);
  }

  /**
   * Initialize all troubleshooting entries
   */
  private initializeTroubleshootingEntries(): TroubleshootingEntry[] {
    return [
      // Command and parsing errors
      {
        id: 'unknown-command',
        title: 'Unknown Command Error',
        description: 'The command you entered is not recognized by the CLI',
        category: 'error',
        severity: 'medium',
        symptoms: ['unknown command', 'command not found', 'invalid command'],
        solutions: [
          {
            title: 'Check available commands',
            steps: [
              'Run "readme-to-cicd --help" to see all available commands',
              'Verify the command spelling and syntax',
              'Use command suggestions if provided'
            ],
            command: 'readme-to-cicd --help'
          },
          {
            title: 'Use command suggestions',
            steps: [
              'Look at the suggested commands in the error message',
              'Try the closest matching command',
              'Use tab completion if available in your shell'
            ]
          }
        ],
        relatedErrors: ['UNKNOWN_COMMAND', 'PARSE_ERROR'],
        tags: ['command', 'parsing', 'help']
      },

      // Configuration errors
      {
        id: 'config-file-not-found',
        title: 'Configuration File Not Found',
        description: 'The specified configuration file could not be found or accessed',
        category: 'configuration',
        severity: 'medium',
        symptoms: ['config file not found', 'cannot read config', 'ENOENT'],
        solutions: [
          {
            title: 'Create configuration file',
            steps: [
              'Run "readme-to-cicd init" to create a new configuration file',
              'Verify the file path is correct',
              'Check file permissions'
            ],
            command: 'readme-to-cicd init'
          },
          {
            title: 'Use default configuration',
            steps: [
              'Remove the --config option to use default settings',
              'Run the command without specifying a configuration file'
            ]
          }
        ],
        relatedErrors: ['CONFIG_NOT_FOUND', 'FILE_ACCESS_ERROR'],
        tags: ['configuration', 'init', 'file']
      },

      {
        id: 'invalid-config-format',
        title: 'Invalid Configuration Format',
        description: 'The configuration file contains invalid JSON or YAML syntax',
        category: 'configuration',
        severity: 'high',
        symptoms: ['invalid JSON', 'syntax error', 'parse error', 'malformed config'],
        solutions: [
          {
            title: 'Validate configuration syntax',
            steps: [
              'Check JSON/YAML syntax using an online validator',
              'Ensure all brackets and quotes are properly closed',
              'Remove any trailing commas in JSON files'
            ],
            learnMoreUrl: 'https://jsonlint.com/'
          },
          {
            title: 'Recreate configuration',
            steps: [
              'Backup your current configuration',
              'Run "readme-to-cicd init" to create a new valid configuration',
              'Manually add your custom settings to the new file'
            ],
            command: 'readme-to-cicd init'
          }
        ],
        relatedErrors: ['CONFIG_PARSE_ERROR', 'INVALID_JSON'],
        tags: ['configuration', 'json', 'yaml', 'syntax']
      },

      // Framework detection issues
      {
        id: 'no-frameworks-detected',
        title: 'No Frameworks Detected',
        description: 'The tool could not automatically detect any frameworks in your project',
        category: 'framework',
        severity: 'medium',
        symptoms: ['no frameworks found', 'empty detection result', 'no workflows generated'],
        solutions: [
          {
            title: 'Manually specify frameworks',
            steps: [
              'Use the --framework option to specify your frameworks',
              'List all relevant frameworks for your project',
              'Check the supported frameworks list'
            ],
            command: 'readme-to-cicd generate --framework nodejs react',
            note: 'Replace "nodejs react" with your actual frameworks'
          },
          {
            title: 'Improve README content',
            steps: [
              'Add clear technology descriptions to your README',
              'Include installation and build instructions',
              'Mention specific frameworks and tools used'
            ]
          },
          {
            title: 'Use interactive mode',
            steps: [
              'Run with --interactive flag for guided framework selection',
              'Review and confirm detected frameworks',
              'Add missing frameworks manually'
            ],
            command: 'readme-to-cicd generate --interactive'
          }
        ],
        relatedErrors: ['NO_FRAMEWORKS_DETECTED', 'DETECTION_FAILED'],
        tags: ['framework', 'detection', 'readme', 'interactive']
      },

      // File system errors
      {
        id: 'permission-denied',
        title: 'Permission Denied Error',
        description: 'The tool does not have permission to read or write files',
        category: 'error',
        severity: 'high',
        symptoms: ['permission denied', 'EACCES', 'access denied', 'cannot write'],
        solutions: [
          {
            title: 'Check file permissions',
            steps: [
              'Verify you have read/write permissions for the target directory',
              'Check if the output directory exists and is writable',
              'Ensure you own the files or have appropriate permissions'
            ]
          },
          {
            title: 'Use different output directory',
            steps: [
              'Specify a different output directory with --output-dir',
              'Choose a directory where you have write permissions',
              'Create the directory first if it doesn\'t exist'
            ],
            command: 'readme-to-cicd generate --output-dir ./my-workflows'
          },
          {
            title: 'Run with appropriate permissions',
            steps: [
              'On Unix systems, check if you need to use sudo (not recommended)',
              'Ensure you\'re running from the correct user account',
              'Check directory ownership and permissions'
            ]
          }
        ],
        relatedErrors: ['PERMISSION_DENIED', 'EACCES', 'FILE_ACCESS_ERROR'],
        tags: ['permissions', 'file-system', 'access']
      },

      // Workflow generation issues
      {
        id: 'workflow-generation-failed',
        title: 'Workflow Generation Failed',
        description: 'The tool failed to generate workflow files',
        category: 'workflow',
        severity: 'high',
        symptoms: ['generation failed', 'template error', 'workflow creation failed'],
        solutions: [
          {
            title: 'Use dry-run to diagnose',
            steps: [
              'Run with --dry-run to see what would be generated',
              'Check for any error messages in the dry-run output',
              'Verify the detected frameworks are correct'
            ],
            command: 'readme-to-cicd generate --dry-run --verbose'
          },
          {
            title: 'Check template configuration',
            steps: [
              'Verify custom templates are valid if using them',
              'Reset to default templates if custom ones are causing issues',
              'Check template syntax and required variables'
            ]
          },
          {
            title: 'Simplify generation',
            steps: [
              'Try generating only CI workflows first',
              'Use basic configuration without custom templates',
              'Generate workflows one type at a time'
            ],
            command: 'readme-to-cicd generate --workflow-type ci'
          }
        ],
        relatedErrors: ['GENERATION_FAILED', 'TEMPLATE_ERROR'],
        tags: ['workflow', 'generation', 'template']
      },

      // Git integration issues
      {
        id: 'git-not-initialized',
        title: 'Git Repository Not Initialized',
        description: 'The project is not in a Git repository, which may limit some features',
        category: 'workflow',
        severity: 'low',
        symptoms: ['not a git repository', 'git not found', 'no git repo'],
        solutions: [
          {
            title: 'Initialize Git repository',
            steps: [
              'Run "git init" in your project directory',
              'Add and commit your initial files',
              'Set up remote repository if needed'
            ],
            command: 'git init'
          },
          {
            title: 'Continue without Git',
            steps: [
              'The tool will still generate workflows',
              'Git-specific features will be disabled',
              'You can add Git integration later'
            ]
          }
        ],
        relatedErrors: ['GIT_NOT_FOUND', 'NOT_GIT_REPO'],
        tags: ['git', 'repository', 'version-control']
      },

      // Performance and timeout issues
      {
        id: 'operation-timeout',
        title: 'Operation Timeout',
        description: 'The operation took too long and was cancelled',
        category: 'error',
        severity: 'medium',
        symptoms: ['timeout', 'operation cancelled', 'took too long'],
        solutions: [
          {
            title: 'Reduce project complexity',
            steps: [
              'Try processing smaller projects or directories',
              'Use --exclude-patterns to skip large directories',
              'Process projects individually instead of in batch'
            ]
          },
          {
            title: 'Increase timeout settings',
            steps: [
              'Check if timeout settings can be configured',
              'Use --verbose to see where the timeout occurs',
              'Try the operation again as it might be a temporary issue'
            ]
          }
        ],
        relatedErrors: ['TIMEOUT_ERROR', 'OPERATION_CANCELLED'],
        tags: ['timeout', 'performance', 'batch']
      },

      // General FAQ entries
      {
        id: 'supported-frameworks',
        title: 'What frameworks are supported?',
        description: 'List of frameworks and technologies that can be automatically detected',
        category: 'general',
        severity: 'low',
        symptoms: ['supported frameworks', 'what frameworks', 'technology support'],
        solutions: [
          {
            title: 'Supported frameworks include',
            steps: [
              'Node.js (npm, yarn, pnpm)',
              'React, Vue.js, Angular',
              'Python (pip, poetry, pipenv)',
              'Java (Maven, Gradle)',
              'Go modules',
              'Docker and containerized applications',
              'TypeScript, JavaScript',
              'Testing frameworks (Jest, Mocha, PyTest)',
              'And many more...'
            ],
            note: 'New frameworks are added regularly'
          }
        ],
        tags: ['frameworks', 'support', 'faq', 'detection']
      },

      {
        id: 'workflow-customization',
        title: 'How to customize generated workflows?',
        description: 'Methods for customizing and extending generated workflows',
        category: 'general',
        severity: 'low',
        symptoms: ['customize workflows', 'modify workflows', 'workflow options'],
        solutions: [
          {
            title: 'Use configuration files',
            steps: [
              'Create a configuration file with "readme-to-cicd init"',
              'Specify custom templates and organization policies',
              'Set default workflow types and options'
            ],
            command: 'readme-to-cicd init'
          },
          {
            title: 'Use command-line options',
            steps: [
              'Specify workflow types with --workflow-type',
              'Override framework detection with --framework',
              'Use --interactive mode for guided customization'
            ]
          },
          {
            title: 'Modify generated workflows',
            steps: [
              'Generated workflows can be edited after creation',
              'Add custom steps and actions as needed',
              'Use validate command to check modifications'
            ]
          }
        ],
        tags: ['customization', 'configuration', 'workflows', 'faq']
      }
    ];
  }

  /**
   * Map CLI error category to troubleshooting category
   */
  private mapErrorCategoryToTroubleshooting(errorCategory: string): TroubleshootingEntry['category'] {
    switch (errorCategory) {
      case 'user-input':
        return 'error';
      case 'configuration':
        return 'configuration';
      case 'processing':
        return 'workflow';
      case 'file-system':
        return 'error';
      case 'git-integration':
        return 'workflow';
      default:
        return 'general';
    }
  }
}