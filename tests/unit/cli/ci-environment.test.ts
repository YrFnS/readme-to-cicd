/**
 * CI Environment Integration Tests
 * 
 * Tests for CI/CD environment detection, configuration loading,
 * machine-readable output, and exit code management.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  CIEnvironmentDetector, 
  MachineOutputFormatter, 
  CIExitCodeManager 
} from '../../../src/cli/lib/ci-environment';
import { CLIResult, CLIOptions, CIProvider } from '../../../src/cli/lib/types';

describe('CIEnvironmentDetector', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let ciEnvironment: CIEnvironmentDetector;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // Clear environment variables
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('CI') || key.startsWith('GITHUB_') || key.startsWith('GITLAB_')) {
        delete process.env[key];
      }
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('GitHub Actions Detection', () => {
    beforeEach(() => {
      process.env.GITHUB_ACTIONS = 'true';
      process.env.GITHUB_RUN_ID = '12345';
      process.env.GITHUB_REF_NAME = 'main';
      process.env.GITHUB_SHA = 'abc123';
      ciEnvironment = new CIEnvironmentDetector();
    });

    it('should detect GitHub Actions environment', () => {
      expect(ciEnvironment.isCI()).toBe(true);
      expect(ciEnvironment.getCIProvider()).toBe('github');
    });

    it('should extract GitHub Actions environment info', () => {
      const envInfo = ciEnvironment.getEnvironmentInfo();
      expect(envInfo.provider).toBe('github');
      expect(envInfo.isCI).toBe(true);
      expect(envInfo.buildId).toBe('12345');
      expect(envInfo.branchName).toBe('main');
      expect(envInfo.commitSha).toBe('abc123');
    });

    it('should use non-interactive mode in GitHub Actions', () => {
      expect(ciEnvironment.shouldUseNonInteractiveMode()).toBe(true);
    });
  });

  describe('GitLab CI Detection', () => {
    beforeEach(() => {
      process.env.GITLAB_CI = 'true';
      process.env.CI_PIPELINE_ID = '67890';
      process.env.CI_COMMIT_REF_NAME = 'feature-branch';
      process.env.CI_COMMIT_SHA = 'def456';
      process.env.CI_MERGE_REQUEST_IID = '42';
      ciEnvironment = new CIEnvironmentDetector();
    });

    it('should detect GitLab CI environment', () => {
      expect(ciEnvironment.isCI()).toBe(true);
      expect(ciEnvironment.getCIProvider()).toBe('gitlab');
    });

    it('should extract GitLab CI environment info', () => {
      const envInfo = ciEnvironment.getEnvironmentInfo();
      expect(envInfo.provider).toBe('gitlab');
      expect(envInfo.buildId).toBe('67890');
      expect(envInfo.branchName).toBe('feature-branch');
      expect(envInfo.commitSha).toBe('def456');
      expect(envInfo.pullRequestNumber).toBe('42');
    });
  });

  describe('Jenkins Detection', () => {
    beforeEach(() => {
      process.env.JENKINS_URL = 'https://jenkins.example.com';
      process.env.BUILD_NUMBER = '100';
      process.env.GIT_BRANCH = 'origin/main';
      process.env.GIT_COMMIT = 'ghi789';
      ciEnvironment = new CIEnvironmentDetector();
    });

    it('should detect Jenkins environment', () => {
      expect(ciEnvironment.isCI()).toBe(true);
      expect(ciEnvironment.getCIProvider()).toBe('jenkins');
    });

    it('should extract Jenkins environment info', () => {
      const envInfo = ciEnvironment.getEnvironmentInfo();
      expect(envInfo.provider).toBe('jenkins');
      expect(envInfo.buildId).toBe('100');
      expect(envInfo.branchName).toBe('origin/main');
      expect(envInfo.commitSha).toBe('ghi789');
    });
  });

  describe('Azure DevOps Detection', () => {
    beforeEach(() => {
      process.env.TF_BUILD = 'True';
      process.env.BUILD_BUILDID = '200';
      process.env.BUILD_SOURCEBRANCH = 'refs/heads/develop';
      process.env.BUILD_SOURCEVERSION = 'jkl012';
      process.env.SYSTEM_PULLREQUEST_PULLREQUESTNUMBER = '15';
      ciEnvironment = new CIEnvironmentDetector();
    });

    it('should detect Azure DevOps environment', () => {
      expect(ciEnvironment.isCI()).toBe(true);
      expect(ciEnvironment.getCIProvider()).toBe('azure');
    });

    it('should extract Azure DevOps environment info', () => {
      const envInfo = ciEnvironment.getEnvironmentInfo();
      expect(envInfo.provider).toBe('azure');
      expect(envInfo.buildId).toBe('200');
      expect(envInfo.branchName).toBe('develop');
      expect(envInfo.commitSha).toBe('jkl012');
      expect(envInfo.pullRequestNumber).toBe('15');
    });
  });

  describe('CircleCI Detection', () => {
    beforeEach(() => {
      process.env.CIRCLECI = 'true';
      process.env.CIRCLE_BUILD_NUM = '300';
      process.env.CIRCLE_BRANCH = 'feature/test';
      process.env.CIRCLE_SHA1 = 'mno345';
      process.env.CIRCLE_PR_NUMBER = '25';
      ciEnvironment = new CIEnvironmentDetector();
    });

    it('should detect CircleCI environment', () => {
      expect(ciEnvironment.isCI()).toBe(true);
      expect(ciEnvironment.getCIProvider()).toBe('circleci');
    });
  });

  describe('Travis CI Detection', () => {
    beforeEach(() => {
      process.env.TRAVIS = 'true';
      process.env.TRAVIS_BUILD_NUMBER = '400';
      process.env.TRAVIS_BRANCH = 'main';
      process.env.TRAVIS_COMMIT = 'pqr678';
      process.env.TRAVIS_PULL_REQUEST = '35';
      ciEnvironment = new CIEnvironmentDetector();
    });

    it('should detect Travis CI environment', () => {
      expect(ciEnvironment.isCI()).toBe(true);
      expect(ciEnvironment.getCIProvider()).toBe('travis');
    });
  });

  describe('Bitbucket Pipelines Detection', () => {
    beforeEach(() => {
      process.env.BITBUCKET_BUILD_NUMBER = '500';
      process.env.BITBUCKET_BRANCH = 'hotfix/urgent';
      process.env.BITBUCKET_COMMIT = 'stu901';
      process.env.BITBUCKET_PR_ID = '45';
      ciEnvironment = new CIEnvironmentDetector();
    });

    it('should detect Bitbucket Pipelines environment', () => {
      expect(ciEnvironment.isCI()).toBe(true);
      expect(ciEnvironment.getCIProvider()).toBe('bitbucket');
    });
  });

  describe('Generic CI Detection', () => {
    beforeEach(() => {
      process.env.CI = 'true';
      ciEnvironment = new CIEnvironmentDetector();
    });

    it('should detect generic CI environment', () => {
      expect(ciEnvironment.isCI()).toBe(true);
      expect(ciEnvironment.getCIProvider()).toBe('unknown');
    });
  });

  describe('Non-CI Environment', () => {
    beforeEach(() => {
      ciEnvironment = new CIEnvironmentDetector();
    });

    it('should not detect CI in local environment', () => {
      expect(ciEnvironment.isCI()).toBe(false);
      expect(ciEnvironment.getCIProvider()).toBe('unknown');
    });

    it('should allow interactive mode in local environment', () => {
      expect(ciEnvironment.shouldUseNonInteractiveMode()).toBe(false);
    });
  });

  describe('Configuration Loading from Environment', () => {
    beforeEach(() => {
      process.env.README_TO_CICD_OUTPUT_DIR = '.github/workflows';
      process.env.README_TO_CICD_WORKFLOW_TYPES = 'ci,cd,release';
      process.env.README_TO_CICD_INCLUDE_COMMENTS = 'true';
      process.env.README_TO_CICD_OPTIMIZATION_LEVEL = 'aggressive';
      process.env.README_TO_CICD_AUTO_COMMIT = 'true';
      process.env.README_TO_CICD_COMMIT_MESSAGE = 'ci: update workflows';
      process.env.README_TO_CICD_REQUIRED_SECURITY_SCANS = 'true';
      process.env.README_TO_CICD_MANDATORY_STEPS = 'security-scan,dependency-check';
      ciEnvironment = new CIEnvironmentDetector();
    });

    it('should load configuration from environment variables', () => {
      const config = ciEnvironment.loadConfigurationFromEnvironment();
      
      expect(config.defaults?.outputDirectory).toBe('.github/workflows');
      expect(config.defaults?.workflowTypes).toEqual(['ci', 'cd', 'release']);
      expect(config.defaults?.includeComments).toBe(true);
      expect(config.defaults?.optimizationLevel).toBe('aggressive');
      
      expect(config.git?.autoCommit).toBe(true);
      expect(config.git?.commitMessage).toBe('ci: update workflows');
      
      expect(config.organization?.requiredSecurityScans).toBe(true);
      expect(config.organization?.mandatorySteps).toEqual(['security-scan', 'dependency-check']);
    });
  });

  describe('Environment Variable Filtering', () => {
    beforeEach(() => {
      process.env.GITHUB_ACTIONS = 'true';
      process.env.GITHUB_TOKEN = 'secret-token';
      process.env.HOME = '/home/user';
      process.env.PATH = '/usr/bin:/bin';
      process.env.README_TO_CICD_CONFIG = 'custom-config';
      ciEnvironment = new CIEnvironmentDetector();
    });

    it('should filter CI-related environment variables', () => {
      const envVars = ciEnvironment.getEnvironmentVariables();
      
      expect(envVars).toHaveProperty('GITHUB_ACTIONS');
      expect(envVars).toHaveProperty('GITHUB_TOKEN');
      expect(envVars).toHaveProperty('README_TO_CICD_CONFIG');
      expect(envVars).not.toHaveProperty('HOME');
      expect(envVars).not.toHaveProperty('PATH');
    });
  });
});

describe('MachineOutputFormatter', () => {
  let ciEnvironment: CIEnvironmentDetector;
  let formatter: MachineOutputFormatter;
  let mockResult: CLIResult;
  let mockOptions: CLIOptions;

  beforeEach(() => {
    ciEnvironment = new CIEnvironmentDetector();
    formatter = new MachineOutputFormatter(ciEnvironment);
    
    mockResult = {
      success: true,
      generatedFiles: ['workflow.yml', 'release.yml'],
      errors: [],
      warnings: ['Warning: deprecated action detected'],
      summary: {
        totalTime: 1500,
        filesGenerated: 2,
        workflowsCreated: 2,
        frameworksDetected: ['nodejs', 'docker'],
        optimizationsApplied: 3,
        executionTime: 1500,
        filesProcessed: 1,
        workflowsGenerated: 2
      }
    };

    mockOptions = {
      command: 'generate',
      dryRun: false,
      interactive: false,
      verbose: true,
      debug: false,
      quiet: false
    };
  });

  describe('JSON Output Format', () => {
    it('should format output as JSON', () => {
      const output = formatter.formatOutput(mockResult, mockOptions, 'json');
      
      expect(output.format).toBe('json');
      expect(output.result).toEqual(mockResult);
      expect(output.metadata.version).toBeDefined();
      expect(output.metadata.timestamp).toBeDefined();
      expect(output.metadata.environment).toBeDefined();
      expect(output.metadata.executionContext.command).toBe('generate');
    });

    it('should stringify JSON output correctly', () => {
      const output = formatter.formatOutput(mockResult, mockOptions, 'json');
      const stringified = formatter.stringify(output);
      
      expect(() => JSON.parse(stringified)).not.toThrow();
      const parsed = JSON.parse(stringified);
      expect(parsed.format).toBe('json');
      expect(parsed.result.success).toBe(true);
    });
  });

  describe('XML Output Format', () => {
    it('should format output as XML', () => {
      const output = formatter.formatOutput(mockResult, mockOptions, 'xml');
      
      expect(output.format).toBe('xml');
      expect(output.result).toEqual(mockResult);
    });

    it('should stringify XML output correctly', () => {
      const output = formatter.formatOutput(mockResult, mockOptions, 'xml');
      const stringified = formatter.stringify(output);
      
      expect(stringified).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(stringified).toContain('<readme-to-cicd-result>');
      expect(stringified).toContain('</readme-to-cicd-result>');
      expect(stringified).toContain('<format>xml</format>');
    });

    it('should escape XML special characters', () => {
      const resultWithSpecialChars = {
        ...mockResult,
        warnings: ['Warning: <script>alert("test")</script> & other chars']
      };
      
      const output = formatter.formatOutput(resultWithSpecialChars, mockOptions, 'xml');
      const stringified = formatter.stringify(output);
      
      expect(stringified).toContain('&lt;script&gt;');
      expect(stringified).toContain('&amp;');
      expect(stringified).not.toContain('<script>');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unsupported format', () => {
      const output = formatter.formatOutput(mockResult, mockOptions, 'json');
      output.format = 'yaml' as any;
      
      expect(() => formatter.stringify(output)).toThrow('Unsupported output format: yaml');
    });
  });
});

describe('CIExitCodeManager', () => {
  describe('Exit Code Determination', () => {
    it('should return success code for successful result', () => {
      const result: CLIResult = {
        success: true,
        generatedFiles: ['workflow.yml'],
        errors: [],
        warnings: [],
        summary: {
          totalTime: 1000,
          filesGenerated: 1,
          workflowsCreated: 1,
          frameworksDetected: ['nodejs'],
          optimizationsApplied: 0,
          executionTime: 1000,
          filesProcessed: 1,
          workflowsGenerated: 1
        }
      };

      expect(CIExitCodeManager.getExitCode(result)).toBe(0);
    });

    it('should return configuration error code for configuration errors', () => {
      const result: CLIResult = {
        success: false,
        generatedFiles: [],
        errors: [{
          code: 'CONFIG_001',
          message: 'Invalid configuration',
          category: 'configuration',
          severity: 'error',
          suggestions: []
        }],
        warnings: [],
        summary: {
          totalTime: 500,
          filesGenerated: 0,
          workflowsCreated: 0,
          frameworksDetected: [],
          optimizationsApplied: 0,
          executionTime: 500,
          filesProcessed: 0,
          workflowsGenerated: 0
        }
      };

      expect(CIExitCodeManager.getExitCode(result)).toBe(2);
    });

    it('should return processing error code for processing errors', () => {
      const result: CLIResult = {
        success: false,
        generatedFiles: [],
        errors: [{
          code: 'PROC_001',
          message: 'Processing failed',
          category: 'processing',
          severity: 'error',
          suggestions: []
        }],
        warnings: [],
        summary: {
          totalTime: 800,
          filesGenerated: 0,
          workflowsCreated: 0,
          frameworksDetected: [],
          optimizationsApplied: 0,
          executionTime: 800,
          filesProcessed: 0,
          workflowsGenerated: 0
        }
      };

      expect(CIExitCodeManager.getExitCode(result)).toBe(3);
    });

    it('should return file system error code for file system errors', () => {
      const result: CLIResult = {
        success: false,
        generatedFiles: [],
        errors: [{
          code: 'FS_001',
          message: 'File system error',
          category: 'file-system',
          severity: 'error',
          suggestions: []
        }],
        warnings: [],
        summary: {
          totalTime: 300,
          filesGenerated: 0,
          workflowsCreated: 0,
          frameworksDetected: [],
          optimizationsApplied: 0,
          executionTime: 300,
          filesProcessed: 0,
          workflowsGenerated: 0
        }
      };

      expect(CIExitCodeManager.getExitCode(result)).toBe(4);
    });

    it('should return git error code for git integration errors', () => {
      const result: CLIResult = {
        success: false,
        generatedFiles: [],
        errors: [{
          code: 'GIT_001',
          message: 'Git integration error',
          category: 'git-integration',
          severity: 'error',
          suggestions: []
        }],
        warnings: [],
        summary: {
          totalTime: 600,
          filesGenerated: 0,
          workflowsCreated: 0,
          frameworksDetected: [],
          optimizationsApplied: 0,
          executionTime: 600,
          filesProcessed: 0,
          workflowsGenerated: 0
        }
      };

      expect(CIExitCodeManager.getExitCode(result)).toBe(5);
    });

    it('should return general error code for unknown error categories', () => {
      const result: CLIResult = {
        success: false,
        generatedFiles: [],
        errors: [{
          code: 'UNK_001',
          message: 'Unknown error',
          category: 'user-input',
          severity: 'error',
          suggestions: []
        }],
        warnings: [],
        summary: {
          totalTime: 400,
          filesGenerated: 0,
          workflowsCreated: 0,
          frameworksDetected: [],
          optimizationsApplied: 0,
          executionTime: 400,
          filesProcessed: 0,
          workflowsGenerated: 0
        }
      };

      expect(CIExitCodeManager.getExitCode(result)).toBe(1);
    });
  });

  describe('Exit Code Descriptions', () => {
    it('should provide descriptions for all exit codes', () => {
      expect(CIExitCodeManager.getExitCodeDescription(0)).toBe('Success');
      expect(CIExitCodeManager.getExitCodeDescription(1)).toBe('General error');
      expect(CIExitCodeManager.getExitCodeDescription(2)).toBe('Configuration error');
      expect(CIExitCodeManager.getExitCodeDescription(3)).toBe('Processing error');
      expect(CIExitCodeManager.getExitCodeDescription(4)).toBe('File system error');
      expect(CIExitCodeManager.getExitCodeDescription(5)).toBe('Git integration error');
      expect(CIExitCodeManager.getExitCodeDescription(6)).toBe('Validation error');
      expect(CIExitCodeManager.getExitCodeDescription(7)).toBe('Timeout error');
      expect(CIExitCodeManager.getExitCodeDescription(99)).toBe('Unknown error');
    });
  });

  describe('Process Exit', () => {
    it('should exit with correct code', () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      const result: CLIResult = {
        success: true,
        generatedFiles: [],
        errors: [],
        warnings: [],
        summary: {
          totalTime: 100,
          filesGenerated: 0,
          workflowsCreated: 0,
          frameworksDetected: [],
          optimizationsApplied: 0,
          executionTime: 100,
          filesProcessed: 0,
          workflowsGenerated: 0
        }
      };

      expect(() => CIExitCodeManager.exit(result)).toThrow('process.exit called');
      expect(mockExit).toHaveBeenCalledWith(0);

      mockExit.mockRestore();
    });
  });
});

describe('CI Integration End-to-End', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should handle complete CI workflow in GitHub Actions', () => {
    // Setup GitHub Actions environment
    process.env.GITHUB_ACTIONS = 'true';
    process.env.GITHUB_RUN_ID = '12345';
    process.env.README_TO_CICD_OUTPUT_FORMAT = 'json';
    
    const ciEnvironment = new CIEnvironmentDetector();
    const formatter = new MachineOutputFormatter(ciEnvironment);
    
    // Verify CI detection
    expect(ciEnvironment.isCI()).toBe(true);
    expect(ciEnvironment.getCIProvider()).toBe('github');
    expect(ciEnvironment.shouldUseNonInteractiveMode()).toBe(true);
    
    // Test configuration loading
    const config = ciEnvironment.loadConfigurationFromEnvironment();
    expect(config).toBeDefined();
    
    // Test machine-readable output
    const mockResult: CLIResult = {
      success: true,
      generatedFiles: ['ci.yml'],
      errors: [],
      warnings: [],
      summary: {
        totalTime: 2000,
        filesGenerated: 1,
        workflowsCreated: 1,
        frameworksDetected: ['nodejs'],
        optimizationsApplied: 1,
        executionTime: 2000,
        filesProcessed: 1,
        workflowsGenerated: 1
      }
    };
    
    const mockOptions: CLIOptions = {
      command: 'generate',
      dryRun: false,
      interactive: false,
      verbose: false,
      debug: false,
      quiet: false,
      ci: true
    };
    
    const output = formatter.formatOutput(mockResult, mockOptions, 'json');
    const stringified = formatter.stringify(output);
    
    expect(stringified).toContain('"provider": "github"');
    expect(stringified).toContain('"buildId": "12345"');
    
    // Test exit code
    const exitCode = CIExitCodeManager.getExitCode(mockResult);
    expect(exitCode).toBe(0);
  });
});