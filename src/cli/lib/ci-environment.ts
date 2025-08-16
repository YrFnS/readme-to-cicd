/**
 * CI/CD Environment Detection and Integration
 * 
 * Provides automatic detection of CI/CD environments and configures
 * the CLI tool for optimal operation in automated environments.
 */

import { 
  CIEnvironment, 
  CIProvider, 
  CIEnvironmentInfo, 
  CLIConfig, 
  MachineReadableOutput,
  CLIResult,
  CLIOptions,
  CIExitCodes
} from './types';

export class CIEnvironmentDetector implements CIEnvironment {
  private environmentInfo: CIEnvironmentInfo;
  private environmentVariables: Record<string, string>;

  constructor() {
    this.environmentVariables = process.env as Record<string, string>;
    this.environmentInfo = this.detectEnvironment();
  }

  /**
   * Detects if the current environment is a CI/CD system
   */
  isCI(): boolean {
    return this.environmentInfo.isCI;
  }

  /**
   * Gets the detected CI provider
   */
  getCIProvider(): CIProvider {
    return this.environmentInfo.provider;
  }

  /**
   * Gets CI-related environment variables
   */
  getEnvironmentVariables(): Record<string, string> {
    return this.filterCIVariables(this.environmentVariables);
  }

  /**
   * Determines if non-interactive mode should be used
   */
  shouldUseNonInteractiveMode(): boolean {
    // Always use non-interactive mode in CI environments
    if (this.isCI()) {
      return true;
    }

    // Check for explicit non-interactive indicators
    const nonInteractiveVars = [
      'CI',
      'CONTINUOUS_INTEGRATION',
      'NON_INTERACTIVE',
      'AUTOMATED_BUILD'
    ];

    return nonInteractiveVars.some(varName => 
      this.environmentVariables[varName] === 'true' || 
      this.environmentVariables[varName] === '1'
    );
  }

  /**
   * Loads configuration from CI environment variables
   */
  loadConfigurationFromEnvironment(): Partial<CLIConfig> {
    const config: Partial<CLIConfig> = {};

    // Load output configuration from environment
    if (this.environmentVariables.README_TO_CICD_OUTPUT_DIR) {
      config.output = {
        ...config.output,
        format: 'yaml',
        indentation: 2,
        includeMetadata: true,
        backupExisting: false
      };
    }

    // Load default settings from environment
    const workflowTypes = this.environmentVariables.README_TO_CICD_WORKFLOW_TYPES;
    if (workflowTypes) {
      config.defaults = {
        outputDirectory: this.environmentVariables.README_TO_CICD_OUTPUT_DIR || '.github/workflows',
        workflowTypes: workflowTypes.split(',') as any[],
        includeComments: this.environmentVariables.README_TO_CICD_INCLUDE_COMMENTS !== 'false',
        optimizationLevel: (this.environmentVariables.README_TO_CICD_OPTIMIZATION_LEVEL as any) || 'standard'
      };
    }

    // Load Git configuration for CI
    config.git = {
      autoCommit: this.environmentVariables.README_TO_CICD_AUTO_COMMIT === 'true',
      commitMessage: this.environmentVariables.README_TO_CICD_COMMIT_MESSAGE || 'feat: update CI/CD workflows',
      createPR: this.environmentVariables.README_TO_CICD_CREATE_PR === 'true',
      branchName: this.environmentVariables.README_TO_CICD_BRANCH_NAME
    };

    // Load organization policies from environment
    if (this.environmentVariables.README_TO_CICD_REQUIRED_SECURITY_SCANS) {
      config.organization = {
        requiredSecurityScans: this.environmentVariables.README_TO_CICD_REQUIRED_SECURITY_SCANS === 'true',
        mandatorySteps: this.environmentVariables.README_TO_CICD_MANDATORY_STEPS?.split(',') || [],
        allowedActions: this.environmentVariables.README_TO_CICD_ALLOWED_ACTIONS?.split(',') || [],
        enforceBranchProtection: this.environmentVariables.README_TO_CICD_ENFORCE_BRANCH_PROTECTION === 'true',
        requireCodeReview: this.environmentVariables.README_TO_CICD_REQUIRE_CODE_REVIEW === 'true'
      };
    }

    return config;
  }

  /**
   * Gets comprehensive environment information
   */
  getEnvironmentInfo(): CIEnvironmentInfo {
    return { ...this.environmentInfo };
  }

  /**
   * Detects the CI/CD environment and provider
   */
  private detectEnvironment(): CIEnvironmentInfo {
    const env = this.environmentVariables;
    
    // GitHub Actions
    if (env.GITHUB_ACTIONS === 'true') {
      return {
        provider: 'github',
        isCI: true,
        buildId: env.GITHUB_RUN_ID,
        branchName: env.GITHUB_REF_NAME,
        commitSha: env.GITHUB_SHA,
        pullRequestNumber: env.GITHUB_EVENT_NAME === 'pull_request' ? 
          env.GITHUB_EVENT_PATH?.match(/"number":\s*(\d+)/)?.[1] : undefined,
        environmentVariables: this.filterCIVariables(env)
      };
    }

    // GitLab CI
    if (env.GITLAB_CI === 'true') {
      return {
        provider: 'gitlab',
        isCI: true,
        buildId: env.CI_PIPELINE_ID,
        branchName: env.CI_COMMIT_REF_NAME,
        commitSha: env.CI_COMMIT_SHA,
        pullRequestNumber: env.CI_MERGE_REQUEST_IID,
        environmentVariables: this.filterCIVariables(env)
      };
    }

    // Jenkins
    if (env.JENKINS_URL || env.BUILD_NUMBER) {
      return {
        provider: 'jenkins',
        isCI: true,
        buildId: env.BUILD_NUMBER,
        branchName: env.GIT_BRANCH || env.BRANCH_NAME,
        commitSha: env.GIT_COMMIT,
        environmentVariables: this.filterCIVariables(env)
      };
    }

    // Azure DevOps
    if (env.TF_BUILD === 'True' || env.AZURE_PIPELINES === 'true') {
      return {
        provider: 'azure',
        isCI: true,
        buildId: env.BUILD_BUILDID,
        branchName: env.BUILD_SOURCEBRANCH?.replace('refs/heads/', ''),
        commitSha: env.BUILD_SOURCEVERSION,
        pullRequestNumber: env.SYSTEM_PULLREQUEST_PULLREQUESTNUMBER,
        environmentVariables: this.filterCIVariables(env)
      };
    }

    // CircleCI
    if (env.CIRCLECI === 'true') {
      return {
        provider: 'circleci',
        isCI: true,
        buildId: env.CIRCLE_BUILD_NUM,
        branchName: env.CIRCLE_BRANCH,
        commitSha: env.CIRCLE_SHA1,
        pullRequestNumber: env.CIRCLE_PR_NUMBER,
        environmentVariables: this.filterCIVariables(env)
      };
    }

    // Travis CI
    if (env.TRAVIS === 'true') {
      return {
        provider: 'travis',
        isCI: true,
        buildId: env.TRAVIS_BUILD_NUMBER,
        branchName: env.TRAVIS_BRANCH,
        commitSha: env.TRAVIS_COMMIT,
        pullRequestNumber: env.TRAVIS_PULL_REQUEST !== 'false' ? env.TRAVIS_PULL_REQUEST : undefined,
        environmentVariables: this.filterCIVariables(env)
      };
    }

    // Bitbucket Pipelines
    if (env.BITBUCKET_BUILD_NUMBER) {
      return {
        provider: 'bitbucket',
        isCI: true,
        buildId: env.BITBUCKET_BUILD_NUMBER,
        branchName: env.BITBUCKET_BRANCH,
        commitSha: env.BITBUCKET_COMMIT,
        pullRequestNumber: env.BITBUCKET_PR_ID,
        environmentVariables: this.filterCIVariables(env)
      };
    }

    // Generic CI detection
    const genericCIIndicators = ['CI', 'CONTINUOUS_INTEGRATION', 'BUILD_NUMBER'];
    const isGenericCI = genericCIIndicators.some(indicator => 
      env[indicator] === 'true' || env[indicator] === '1'
    );

    return {
      provider: isGenericCI ? 'unknown' : 'unknown',
      isCI: isGenericCI,
      environmentVariables: isGenericCI ? this.filterCIVariables(env) : {}
    };
  }

  /**
   * Filters environment variables to include only CI-related ones
   */
  private filterCIVariables(env: Record<string, string>): Record<string, string> {
    const ciPrefixes = [
      'CI_', 'GITHUB_', 'GITLAB_', 'JENKINS_', 'BUILD_', 'TRAVIS_', 
      'CIRCLE_', 'BITBUCKET_', 'AZURE_', 'TF_', 'SYSTEM_',
      'README_TO_CICD_'
    ];

    const ciVariables: Record<string, string> = {};
    
    Object.entries(env).forEach(([key, value]) => {
      if (ciPrefixes.some(prefix => key.startsWith(prefix)) || 
          ['CI', 'CONTINUOUS_INTEGRATION'].includes(key)) {
        ciVariables[key] = value;
      }
    });

    return ciVariables;
  }
}

/**
 * Machine-readable output formatter for CI/CD environments
 */
export class MachineOutputFormatter {
  private ciEnvironment: CIEnvironmentDetector;

  constructor(ciEnvironment: CIEnvironmentDetector) {
    this.ciEnvironment = ciEnvironment;
  }

  /**
   * Formats CLI result as machine-readable output
   */
  formatOutput(
    result: CLIResult, 
    options: CLIOptions, 
    format: 'json' | 'xml' = 'json'
  ): MachineReadableOutput {
    const output: MachineReadableOutput = {
      format,
      result,
      metadata: {
        version: this.getVersion(),
        timestamp: new Date().toISOString(),
        environment: this.ciEnvironment.getEnvironmentInfo(),
        executionContext: {
          command: options.command,
          options,
          workingDirectory: process.cwd()
        }
      }
    };

    return output;
  }

  /**
   * Converts machine-readable output to string format
   */
  stringify(output: MachineReadableOutput): string {
    if (output.format === 'json') {
      return JSON.stringify(output, null, 2);
    } else if (output.format === 'xml') {
      return this.toXML(output);
    }
    
    throw new Error(`Unsupported output format: ${output.format}`);
  }

  /**
   * Converts output to XML format
   */
  private toXML(output: MachineReadableOutput): string {
    const escapeXML = (str: string): string => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    const objectToXML = (obj: any, indent = 0): string => {
      const spaces = '  '.repeat(indent);
      let xml = '';

      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          xml += `${spaces}<item index="${index}">\n`;
          xml += objectToXML(item, indent + 1);
          xml += `${spaces}</item>\n`;
        });
      } else if (typeof obj === 'object' && obj !== null) {
        Object.entries(obj).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            xml += `${spaces}<${key}>\n`;
            xml += objectToXML(value, indent + 1);
            xml += `${spaces}</${key}>\n`;
          } else {
            xml += `${spaces}<${key}>${escapeXML(String(value))}</${key}>\n`;
          }
        });
      } else {
        xml += `${spaces}${escapeXML(String(obj))}\n`;
      }

      return xml;
    };

    return `<?xml version="1.0" encoding="UTF-8"?>\n<readme-to-cicd-result>\n${objectToXML(output, 1)}</readme-to-cicd-result>`;
  }

  /**
   * Gets the application version
   */
  private getVersion(): string {
    try {
      // In a real implementation, this would read from package.json
      return '1.0.0';
    } catch {
      return 'unknown';
    }
  }
}

/**
 * Exit code manager for CI/CD environments
 */
export class CIExitCodeManager {
  static readonly EXIT_CODES: CIExitCodes = {
    SUCCESS: 0,
    GENERAL_ERROR: 1,
    CONFIGURATION_ERROR: 2,
    PROCESSING_ERROR: 3,
    FILE_SYSTEM_ERROR: 4,
    GIT_ERROR: 5,
    VALIDATION_ERROR: 6,
    TIMEOUT_ERROR: 7
  };

  /**
   * Determines appropriate exit code based on CLI result
   */
  static getExitCode(result: CLIResult): number {
    if (result.success) {
      return this.EXIT_CODES.SUCCESS;
    }

    // Determine exit code based on error categories
    const errorCategories = result.errors.map(error => error.category);
    
    if (errorCategories.includes('configuration')) {
      return this.EXIT_CODES.CONFIGURATION_ERROR;
    }
    
    if (errorCategories.includes('processing')) {
      return this.EXIT_CODES.PROCESSING_ERROR;
    }
    
    if (errorCategories.includes('file-system')) {
      return this.EXIT_CODES.FILE_SYSTEM_ERROR;
    }
    
    if (errorCategories.includes('git-integration')) {
      return this.EXIT_CODES.GIT_ERROR;
    }

    // Default to general error
    return this.EXIT_CODES.GENERAL_ERROR;
  }

  /**
   * Exits the process with appropriate code
   */
  static exit(result: CLIResult): never {
    const exitCode = this.getExitCode(result);
    process.exit(exitCode);
  }

  /**
   * Gets human-readable description of exit code
   */
  static getExitCodeDescription(code: number): string {
    const descriptions: Record<number, string> = {
      [this.EXIT_CODES.SUCCESS]: 'Success',
      [this.EXIT_CODES.GENERAL_ERROR]: 'General error',
      [this.EXIT_CODES.CONFIGURATION_ERROR]: 'Configuration error',
      [this.EXIT_CODES.PROCESSING_ERROR]: 'Processing error',
      [this.EXIT_CODES.FILE_SYSTEM_ERROR]: 'File system error',
      [this.EXIT_CODES.GIT_ERROR]: 'Git integration error',
      [this.EXIT_CODES.VALIDATION_ERROR]: 'Validation error',
      [this.EXIT_CODES.TIMEOUT_ERROR]: 'Timeout error'
    };

    return descriptions[code] || 'Unknown error';
  }
}