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
    const gitConfig: any = {
      autoCommit: this.environmentVariables.README_TO_CICD_AUTO_COMMIT === 'true',
      commitMessage: this.environmentVariables.README_TO_CICD_COMMIT_MESSAGE || 'feat: update CI/CD workflows',
      createPR: this.environmentVariables.README_TO_CICD_CREATE_PR === 'true'
    };
    
    if (this.environmentVariables.README_TO_CICD_BRANCH_NAME) {
      gitConfig.branchName = this.environmentVariables.README_TO_CICD_BRANCH_NAME;
    }
    
    config.git = gitConfig;

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
   * Helper to create CI environment info with proper optional property handling
   */
  private createCIEnvironmentInfo(
    provider: CIProvider,
    isCI: boolean,
    buildId?: string,
    branchName?: string,
    commitSha?: string,
    pullRequestNumber?: string
  ): CIEnvironmentInfo {
    const info: any = {
      provider,
      isCI,
      environmentVariables: this.filterCIVariables(this.environmentVariables)
    };
    
    if (buildId) info.buildId = buildId;
    if (branchName) info.branchName = branchName;
    if (commitSha) info.commitSha = commitSha;
    if (pullRequestNumber) info.pullRequestNumber = pullRequestNumber;
    
    return info;
  }

  /**
   * Detects the CI/CD environment and provider
   */
  private detectEnvironment(): CIEnvironmentInfo {
    const env = this.environmentVariables;
    
    // GitHub Actions
    if (env.GITHUB_ACTIONS === 'true') {
      return this.createCIEnvironmentInfo(
        'github',
        true,
        env.GITHUB_RUN_ID,
        env.GITHUB_REF_NAME,
        env.GITHUB_SHA,
        env.GITHUB_EVENT_NAME === 'pull_request' ? 
          env.GITHUB_EVENT_PATH?.match(/"number":\s*(\d+)/)?.[1] : undefined
      );
    }

    // GitLab CI
    if (env.GITLAB_CI === 'true') {
      return this.createCIEnvironmentInfo(
        'gitlab',
        true,
        env.CI_PIPELINE_ID,
        env.CI_COMMIT_REF_NAME,
        env.CI_COMMIT_SHA,
        env.CI_MERGE_REQUEST_IID
      );
    }

    // Jenkins
    if (env.JENKINS_URL || env.BUILD_NUMBER) {
      return this.createCIEnvironmentInfo(
        'jenkins',
        true,
        env.BUILD_NUMBER,
        env.GIT_BRANCH || env.BRANCH_NAME,
        env.GIT_COMMIT
      );
    }

    // Azure DevOps
    if (env.TF_BUILD === 'True' || env.AZURE_PIPELINES === 'true') {
      return this.createCIEnvironmentInfo(
        'azure',
        true,
        env.BUILD_BUILDID,
        env.BUILD_SOURCEBRANCH?.replace('refs/heads/', ''),
        env.BUILD_SOURCEVERSION,
        env.SYSTEM_PULLREQUEST_PULLREQUESTNUMBER
      );
    }

    // CircleCI
    if (env.CIRCLECI === 'true') {
      return this.createCIEnvironmentInfo(
        'circleci',
        true,
        env.CIRCLE_BUILD_NUM,
        env.CIRCLE_BRANCH,
        env.CIRCLE_SHA1,
        env.CIRCLE_PR_NUMBER
      );
    }

    // Travis CI
    if (env.TRAVIS === 'true') {
      return this.createCIEnvironmentInfo(
        'travis',
        true,
        env.TRAVIS_BUILD_NUMBER,
        env.TRAVIS_BRANCH,
        env.TRAVIS_COMMIT,
        env.TRAVIS_PULL_REQUEST !== 'false' ? env.TRAVIS_PULL_REQUEST : undefined
      );
    }

    // Bitbucket Pipelines
    if (env.BITBUCKET_BUILD_NUMBER) {
      return this.createCIEnvironmentInfo(
        'bitbucket',
        true,
        env.BITBUCKET_BUILD_NUMBER,
        env.BITBUCKET_BRANCH,
        env.BITBUCKET_COMMIT,
        env.BITBUCKET_PR_ID
      );
    }

    // Generic CI detection
    const genericCIIndicators = ['CI', 'CONTINUOUS_INTEGRATION', 'BUILD_NUMBER'];
    const isGenericCI = genericCIIndicators.some(indicator => 
      env[indicator] === 'true' || env[indicator] === '1'
    );

    return this.createCIEnvironmentInfo('unknown', isGenericCI);
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