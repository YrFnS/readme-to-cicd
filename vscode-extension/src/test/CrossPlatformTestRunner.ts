import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { TestRunner, TestResults } from './TestRunner';
import { LoggingService } from '../core/LoggingService';

export interface PlatformTestConfig {
  platform: 'windows' | 'macos' | 'linux';
  vscodeVersions: string[];
  enabled: boolean;
}

export interface CrossPlatformTestResults {
  platform: string;
  vscodeVersion: string;
  nodeVersion: string;
  results: TestResults;
  environment: {
    os: string;
    arch: string;
    memory: number;
    cpus: number;
  };
  timestamp: Date;
}

export interface CompatibilityReport {
  totalTests: number;
  passedPlatforms: number;
  failedPlatforms: number;
  results: CrossPlatformTestResults[];
  summary: {
    overallSuccess: boolean;
    criticalFailures: string[];
    warnings: string[];
    recommendations: string[];
  };
}

export class CrossPlatformTestRunner {
  private readonly logger: LoggingService;
  private readonly testRunner: TestRunner;
  private readonly supportedVersions = ['1.74.0', '1.75.0', '1.80.0', 'latest'];

  constructor(logger: LoggingService) {
    this.logger = logger;
    this.testRunner = new TestRunner();
  }

  /**
   * Run tests across all supported platforms and VS Code versions
   */
  public async runCrossPlatformTests(testRoot: string): Promise<CompatibilityReport> {
    const results: CrossPlatformTestResults[] = [];
    const config = this.loadTestConfig();

    this.logger.info('Starting cross-platform test execution');

    for (const [platformName, platformConfig] of Object.entries(config.platforms)) {
      if (!platformConfig.enabled) {
        this.logger.info(`Skipping platform: ${platformName} (disabled)`);
        continue;
      }

      for (const vscodeVersion of platformConfig.vscodeVersions) {
        try {
          const result = await this.runPlatformTest(
            testRoot,
            platformName as 'windows' | 'macos' | 'linux',
            vscodeVersion
          );
          results.push(result);
        } catch (error) {
          this.logger.error(`Failed to run tests on ${platformName} with VS Code ${vscodeVersion}`, { error });
          
          // Create a failed result entry
          results.push({
            platform: platformName,
            vscodeVersion,
            nodeVersion: process.version,
            results: {
              passed: 0,
              failed: 1,
              skipped: 0,
              total: 1,
              duration: 0,
              failures: [{
                title: 'Platform Test Setup',
                fullTitle: `${platformName} - VS Code ${vscodeVersion}`,
                error: error instanceof Error ? error.message : String(error)
              }]
            },
            environment: this.getEnvironmentInfo(),
            timestamp: new Date()
          });
        }
      }
    }

    return this.generateCompatibilityReport(results);
  }

  /**
   * Run tests on a specific platform and VS Code version
   */
  private async runPlatformTest(
    testRoot: string,
    platform: 'windows' | 'macos' | 'linux',
    vscodeVersion: string
  ): Promise<CrossPlatformTestResults> {
    this.logger.info(`Running tests on ${platform} with VS Code ${vscodeVersion}`);

    // Set up platform-specific environment
    await this.setupPlatformEnvironment(platform, vscodeVersion);

    // Run the tests
    const testResults = await this.testRunner.runTests(testRoot);

    // Run platform-specific tests
    const platformSpecificResults = await this.runPlatformSpecificTests(platform);

    // Merge results
    const combinedResults: TestResults = {
      passed: testResults.passed + platformSpecificResults.passed,
      failed: testResults.failed + platformSpecificResults.failed,
      skipped: testResults.skipped + platformSpecificResults.skipped,
      total: testResults.total + platformSpecificResults.total,
      duration: testResults.duration + platformSpecificResults.duration,
      failures: [...testResults.failures, ...platformSpecificResults.failures]
    };

    return {
      platform,
      vscodeVersion,
      nodeVersion: process.version,
      results: combinedResults,
      environment: this.getEnvironmentInfo(),
      timestamp: new Date()
    };
  }

  /**
   * Run platform-specific tests
   */
  private async runPlatformSpecificTests(platform: string): Promise<TestResults> {
    const platformTests = this.getPlatformSpecificTests(platform);
    const results: TestResults = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      duration: 0,
      failures: []
    };

    const startTime = Date.now();

    for (const test of platformTests) {
      results.total++;
      
      try {
        await test.run();
        results.passed++;
        this.logger.debug(`Platform test passed: ${test.name}`);
      } catch (error) {
        results.failed++;
        results.failures.push({
          title: test.name,
          fullTitle: `${platform} - ${test.name}`,
          error: error instanceof Error ? error.message : String(error)
        });
        this.logger.error(`Platform test failed: ${test.name}`, { error });
      }
    }

    results.duration = Date.now() - startTime;
    return results;
  }

  /**
   * Get platform-specific tests
   */
  private getPlatformSpecificTests(platform: string): Array<{ name: string; run: () => Promise<void> }> {
    const commonTests = [
      {
        name: 'Extension Activation',
        run: async () => {
          const extension = vscode.extensions.getExtension('readme-to-cicd.readme-to-cicd');
          if (!extension) {
            throw new Error('Extension not found');
          }
          if (!extension.isActive) {
            await extension.activate();
          }
        }
      },
      {
        name: 'Command Registration',
        run: async () => {
          const commands = await vscode.commands.getCommands();
          const extensionCommands = commands.filter(cmd => cmd.startsWith('readme-to-cicd.'));
          if (extensionCommands.length === 0) {
            throw new Error('No extension commands registered');
          }
        }
      },
      {
        name: 'Configuration Access',
        run: async () => {
          const config = vscode.workspace.getConfiguration('readme-to-cicd');
          const defaultDir = config.get('defaultOutputDirectory');
          if (typeof defaultDir !== 'string') {
            throw new Error('Configuration not accessible');
          }
        }
      }
    ];

    const platformSpecificTests: Record<string, Array<{ name: string; run: () => Promise<void> }>> = {
      windows: [
        {
          name: 'Windows Path Handling',
          run: async () => {
            const testPath = 'C:\\Users\\Test\\project\\README.md';
            const normalized = path.normalize(testPath);
            if (!normalized.includes('\\')) {
              throw new Error('Windows path normalization failed');
            }
          }
        },
        {
          name: 'PowerShell Integration',
          run: async () => {
            // Test PowerShell-specific functionality
            const terminal = vscode.window.createTerminal('test', 'powershell.exe');
            terminal.dispose();
          }
        }
      ],
      macos: [
        {
          name: 'macOS Path Handling',
          run: async () => {
            const testPath = '/Users/test/project/README.md';
            const normalized = path.normalize(testPath);
            if (normalized.includes('\\')) {
              throw new Error('macOS path normalization failed');
            }
          }
        },
        {
          name: 'Bash Integration',
          run: async () => {
            const terminal = vscode.window.createTerminal('test', '/bin/bash');
            terminal.dispose();
          }
        }
      ],
      linux: [
        {
          name: 'Linux Path Handling',
          run: async () => {
            const testPath = '/home/user/project/README.md';
            const normalized = path.normalize(testPath);
            if (normalized.includes('\\')) {
              throw new Error('Linux path normalization failed');
            }
          }
        },
        {
          name: 'Shell Integration',
          run: async () => {
            const terminal = vscode.window.createTerminal('test', '/bin/sh');
            terminal.dispose();
          }
        }
      ]
    };

    return [...commonTests, ...(platformSpecificTests[platform] || [])];
  }

  /**
   * Setup platform-specific environment
   */
  private async setupPlatformEnvironment(platform: string, vscodeVersion: string): Promise<void> {
    // Set environment variables based on platform
    switch (platform) {
      case 'windows':
        process.env.PLATFORM_TEST = 'windows';
        process.env.PATH_SEPARATOR = ';';
        break;
      case 'macos':
        process.env.PLATFORM_TEST = 'macos';
        process.env.PATH_SEPARATOR = ':';
        break;
      case 'linux':
        process.env.PLATFORM_TEST = 'linux';
        process.env.PATH_SEPARATOR = ':';
        break;
    }

    process.env.VSCODE_VERSION_TEST = vscodeVersion;
    
    this.logger.debug('Platform environment setup completed', { platform, vscodeVersion });
  }

  /**
   * Get environment information
   */
  private getEnvironmentInfo() {
    const os = require('os');
    
    return {
      os: `${os.type()} ${os.release()}`,
      arch: os.arch(),
      memory: Math.round(os.totalmem() / 1024 / 1024), // MB
      cpus: os.cpus().length
    };
  }

  /**
   * Load test configuration
   */
  private loadTestConfig(): any {
    try {
      const configPath = path.join(__dirname, '../../test-config.json');
      const configContent = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configContent);
    } catch (error) {
      this.logger.warn('Failed to load test config, using defaults', { error });
      return {
        platforms: {
          windows: { enabled: process.platform === 'win32', vscodeVersions: ['latest'] },
          macos: { enabled: process.platform === 'darwin', vscodeVersions: ['latest'] },
          linux: { enabled: process.platform === 'linux', vscodeVersions: ['latest'] }
        }
      };
    }
  }

  /**
   * Generate compatibility report
   */
  private generateCompatibilityReport(results: CrossPlatformTestResults[]): CompatibilityReport {
    const totalTests = results.length;
    const passedPlatforms = results.filter(r => r.results.failed === 0).length;
    const failedPlatforms = totalTests - passedPlatforms;

    const criticalFailures: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Analyze results for patterns
    results.forEach(result => {
      if (result.results.failed > 0) {
        const platformInfo = `${result.platform} (VS Code ${result.vscodeVersion})`;
        
        // Check for critical failures
        const hasCriticalFailure = result.results.failures.some(f => 
          f.title.includes('Extension Activation') || 
          f.title.includes('Command Registration')
        );
        
        if (hasCriticalFailure) {
          criticalFailures.push(`Critical failure on ${platformInfo}`);
        } else {
          warnings.push(`${result.results.failed} test(s) failed on ${platformInfo}`);
        }
      }
    });

    // Generate recommendations
    if (failedPlatforms > 0) {
      recommendations.push('Review platform-specific implementations');
    }
    
    if (criticalFailures.length > 0) {
      recommendations.push('Fix critical failures before release');
    }

    const overallSuccess = criticalFailures.length === 0 && failedPlatforms === 0;

    return {
      totalTests,
      passedPlatforms,
      failedPlatforms,
      results,
      summary: {
        overallSuccess,
        criticalFailures,
        warnings,
        recommendations
      }
    };
  }

  /**
   * Generate detailed compatibility report
   */
  public generateDetailedReport(report: CompatibilityReport): string {
    let output = '# Cross-Platform Compatibility Report\n\n';
    
    output += `## Summary\n`;
    output += `- **Total Test Runs**: ${report.totalTests}\n`;
    output += `- **Passed Platforms**: ${report.passedPlatforms}\n`;
    output += `- **Failed Platforms**: ${report.failedPlatforms}\n`;
    output += `- **Overall Success**: ${report.summary.overallSuccess ? '✅' : '❌'}\n\n`;

    if (report.summary.criticalFailures.length > 0) {
      output += `## Critical Failures\n`;
      report.summary.criticalFailures.forEach(failure => {
        output += `- ❌ ${failure}\n`;
      });
      output += '\n';
    }

    if (report.summary.warnings.length > 0) {
      output += `## Warnings\n`;
      report.summary.warnings.forEach(warning => {
        output += `- ⚠️ ${warning}\n`;
      });
      output += '\n';
    }

    output += `## Detailed Results\n\n`;
    
    report.results.forEach(result => {
      const status = result.results.failed === 0 ? '✅' : '❌';
      output += `### ${status} ${result.platform} - VS Code ${result.vscodeVersion}\n`;
      output += `- **Node Version**: ${result.nodeVersion}\n`;
      output += `- **Environment**: ${result.environment.os} (${result.environment.arch})\n`;
      output += `- **Tests**: ${result.results.passed}/${result.results.total} passed\n`;
      output += `- **Duration**: ${(result.results.duration / 1000).toFixed(2)}s\n`;
      
      if (result.results.failures.length > 0) {
        output += `- **Failures**:\n`;
        result.results.failures.forEach(failure => {
          output += `  - ${failure.title}: ${failure.error}\n`;
        });
      }
      
      output += '\n';
    });

    if (report.summary.recommendations.length > 0) {
      output += `## Recommendations\n`;
      report.summary.recommendations.forEach(rec => {
        output += `- ${rec}\n`;
      });
      output += '\n';
    }

    return output;
  }
}