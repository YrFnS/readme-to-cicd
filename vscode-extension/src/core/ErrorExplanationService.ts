import * as vscode from 'vscode';

/**
 * Service for explaining errors and providing actionable suggestions
 */
export class ErrorExplanationService {
  private errorPatterns: ErrorPattern[] = [];

  constructor() {
    this.initializeErrorPatterns();
  }

  /**
   * Explain an error and provide actionable suggestions
   */
  public explainError(error: any): ErrorExplanation {
    const errorMessage = this.extractErrorMessage(error);
    const errorType = this.classifyError(errorMessage);
    const pattern = this.findMatchingPattern(errorMessage, errorType);

    if (pattern) {
      return {
        title: pattern.title,
        description: pattern.description,
        suggestions: pattern.suggestions,
        severity: pattern.severity,
        category: pattern.category,
        learnMoreUrl: pattern.learnMoreUrl
      };
    }

    // Fallback for unknown errors
    return {
      title: 'Unknown Error',
      description: `An error occurred: ${errorMessage}`,
      suggestions: [
        {
          title: 'Check the error details',
          description: 'Review the full error message for more context',
          action: 'review'
        },
        {
          title: 'Search documentation',
          description: 'Look for similar issues in the GitHub Actions documentation',
          action: 'search',
          actionData: { query: errorMessage.substring(0, 50) }
        }
      ],
      severity: 'error',
      category: 'general'
    };
  }

  /**
   * Get suggestions for a specific error type
   */
  public getSuggestions(errorType: string): ErrorSuggestion[] {
    const pattern = this.errorPatterns.find(p => p.type === errorType);
    return pattern ? pattern.suggestions : [];
  }

  /**
   * Check if an error is recoverable
   */
  public isRecoverable(error: any): boolean {
    const errorMessage = this.extractErrorMessage(error);
    const recoverablePatterns = [
      /missing.*dependency/i,
      /file.*not found/i,
      /invalid.*configuration/i,
      /syntax.*error/i,
      /permission.*denied/i
    ];

    return recoverablePatterns.some(pattern => pattern.test(errorMessage));
  }

  /**
   * Extract error message from various error types
   */
  private extractErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error instanceof Error) {
      return error.message;
    }

    if (error && typeof error === 'object') {
      return error.message || error.error || error.description || JSON.stringify(error);
    }

    return 'Unknown error occurred';
  }

  /**
   * Classify error based on message content
   */
  private classifyError(errorMessage: string): string {
    const classifications: Record<string, RegExp[]> = {
      'syntax': [/syntax.*error/i, /invalid.*yaml/i, /parse.*error/i],
      'dependency': [/missing.*dependency/i, /module.*not found/i, /package.*not found/i],
      'permission': [/permission.*denied/i, /access.*denied/i, /unauthorized/i],
      'network': [/network.*error/i, /connection.*failed/i, /timeout/i],
      'configuration': [/invalid.*config/i, /missing.*config/i, /configuration.*error/i],
      'workflow': [/workflow.*error/i, /action.*failed/i, /job.*failed/i],
      'validation': [/validation.*failed/i, /invalid.*input/i, /schema.*error/i]
    };

    for (const [type, patterns] of Object.entries(classifications)) {
      if (patterns.some(pattern => pattern.test(errorMessage))) {
        return type;
      }
    }

    return 'general';
  }

  /**
   * Find matching error pattern
   */
  private findMatchingPattern(errorMessage: string, errorType: string): ErrorPattern | undefined {
    // First try to find exact pattern match
    const exactMatch = this.errorPatterns.find(pattern => 
      pattern.pattern.test(errorMessage)
    );

    if (exactMatch) {
      return exactMatch;
    }

    // Fallback to type-based match
    return this.errorPatterns.find(pattern => pattern.type === errorType);
  }

  /**
   * Initialize common error patterns and their explanations
   */
  private initializeErrorPatterns(): void {
    this.errorPatterns = [
      {
        type: 'syntax',
        pattern: /yaml.*syntax.*error/i,
        title: 'YAML Syntax Error',
        description: 'There is a syntax error in your YAML workflow file. This usually means incorrect indentation, missing colons, or invalid characters.',
        suggestions: [
          {
            title: 'Check indentation',
            description: 'YAML is sensitive to indentation. Use spaces (not tabs) and ensure consistent indentation levels.',
            action: 'fix',
            actionData: { type: 'indentation' }
          },
          {
            title: 'Validate YAML syntax',
            description: 'Use a YAML validator to check for syntax errors.',
            action: 'validate'
          },
          {
            title: 'Review YAML basics',
            description: 'Learn about YAML syntax rules and common pitfalls.',
            action: 'learn',
            actionData: { topic: 'yaml-syntax' }
          }
        ],
        severity: 'error',
        category: 'syntax',
        learnMoreUrl: 'https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions'
      },
      {
        type: 'dependency',
        pattern: /module.*not found/i,
        title: 'Missing Dependency',
        description: 'A required dependency or module is not installed or cannot be found.',
        suggestions: [
          {
            title: 'Install dependencies',
            description: 'Run npm install, pip install, or the appropriate package manager command.',
            action: 'install'
          },
          {
            title: 'Check package.json',
            description: 'Verify that the dependency is listed in your package.json or requirements file.',
            action: 'check',
            actionData: { file: 'package.json' }
          },
          {
            title: 'Update workflow',
            description: 'Add a step to install dependencies in your workflow.',
            action: 'fix',
            actionData: { type: 'add-install-step' }
          }
        ],
        severity: 'error',
        category: 'dependency'
      },
      {
        type: 'permission',
        pattern: /permission.*denied/i,
        title: 'Permission Denied',
        description: 'The workflow does not have sufficient permissions to perform the requested action.',
        suggestions: [
          {
            title: 'Check repository permissions',
            description: 'Ensure the repository has the necessary permissions enabled.',
            action: 'check',
            actionData: { type: 'permissions' }
          },
          {
            title: 'Add GITHUB_TOKEN permissions',
            description: 'Add explicit permissions to your workflow file.',
            action: 'fix',
            actionData: { type: 'add-permissions' }
          },
          {
            title: 'Review security settings',
            description: 'Check organization and repository security settings.',
            action: 'review'
          }
        ],
        severity: 'error',
        category: 'security',
        learnMoreUrl: 'https://docs.github.com/en/actions/security-guides/automatic-token-authentication'
      },
      {
        type: 'workflow',
        pattern: /action.*failed/i,
        title: 'Action Failed',
        description: 'A GitHub Action in your workflow failed to execute successfully.',
        suggestions: [
          {
            title: 'Check action logs',
            description: 'Review the detailed logs for the failed action to understand what went wrong.',
            action: 'review'
          },
          {
            title: 'Verify action inputs',
            description: 'Ensure all required inputs are provided and have correct values.',
            action: 'check',
            actionData: { type: 'inputs' }
          },
          {
            title: 'Update action version',
            description: 'Try using a different version of the action.',
            action: 'fix',
            actionData: { type: 'update-version' }
          }
        ],
        severity: 'error',
        category: 'workflow'
      },
      {
        type: 'configuration',
        pattern: /invalid.*config/i,
        title: 'Invalid Configuration',
        description: 'There is an error in your configuration that prevents the workflow from running correctly.',
        suggestions: [
          {
            title: 'Validate configuration',
            description: 'Check your configuration against the expected schema.',
            action: 'validate'
          },
          {
            title: 'Review documentation',
            description: 'Consult the documentation for the correct configuration format.',
            action: 'learn'
          },
          {
            title: 'Use configuration template',
            description: 'Start with a working template and modify as needed.',
            action: 'template'
          }
        ],
        severity: 'warning',
        category: 'configuration'
      },
      {
        type: 'network',
        pattern: /connection.*failed|timeout/i,
        title: 'Network Error',
        description: 'A network operation failed, possibly due to connectivity issues or service unavailability.',
        suggestions: [
          {
            title: 'Retry the operation',
            description: 'Network issues are often temporary. Try running the workflow again.',
            action: 'retry'
          },
          {
            title: 'Check service status',
            description: 'Verify that external services are operational.',
            action: 'check',
            actionData: { type: 'service-status' }
          },
          {
            title: 'Add retry logic',
            description: 'Implement retry logic in your workflow for network operations.',
            action: 'fix',
            actionData: { type: 'add-retry' }
          }
        ],
        severity: 'warning',
        category: 'network'
      },
      {
        type: 'validation',
        pattern: /validation.*failed|invalid.*input/i,
        title: 'Validation Failed',
        description: 'Input validation failed, indicating that provided values do not meet the expected format or constraints.',
        suggestions: [
          {
            title: 'Check input format',
            description: 'Verify that inputs match the expected format and data types.',
            action: 'check',
            actionData: { type: 'input-format' }
          },
          {
            title: 'Review constraints',
            description: 'Ensure inputs meet all specified constraints and requirements.',
            action: 'review'
          },
          {
            title: 'Use validation tools',
            description: 'Use schema validation tools to verify your inputs.',
            action: 'validate'
          }
        ],
        severity: 'error',
        category: 'validation'
      }
    ];
  }
}

/**
 * Pattern for matching and explaining errors
 */
interface ErrorPattern {
  type: string;
  pattern: RegExp;
  title: string;
  description: string;
  suggestions: ErrorSuggestion[];
  severity: 'error' | 'warning' | 'info';
  category: string;
  learnMoreUrl?: string;
}

/**
 * Complete explanation of an error
 */
export interface ErrorExplanation {
  title: string;
  description: string;
  suggestions: ErrorSuggestion[];
  severity: 'error' | 'warning' | 'info';
  category: string;
  learnMoreUrl?: string;
}

/**
 * Actionable suggestion for resolving an error
 */
export interface ErrorSuggestion {
  title: string;
  description: string;
  action: 'fix' | 'check' | 'review' | 'learn' | 'validate' | 'install' | 'retry' | 'template';
  actionData?: any;
}