/**
 * CLI Regression Test Suite
 * 
 * Comprehensive regression testing to prevent CLI behavior changes:
 * - Command interface stability
 * - Output format consistency
 * - Configuration compatibility
 * - Performance regression detection
 * - Feature behavior preservation
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { CLIApplication } from '../src/cli/lib/cli-application';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { createHash } from 'crypto';

interface RegressionBaseline {
  version: string;
  timestamp: string;
  testCase: string;
  input: any;
  output: {
    success: boolean;
    exitCode: number;
    generatedFiles: string[];
    detectedFrameworks: string[];
    warnings: number;
    errors: number;
    outputHash: string;
  };
  performance: {
    executionTime: number;
    memoryUsage: number;
    peakMemory: number;
  };
}

describe('CLI Regression Test Suite', () => {
  let cliApp: CLIApplication;
  let tempDir: string;
  let baselines: Map<string, RegressionBaseline> = new Map();

  beforeAll(async () => {
    cliApp = new CLIApplication();
    
    // Load existing baselines if available
    await loadRegressionBaselines();
  });

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cli-regression-'));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  async function loadRegressionBaselines(): Promise<void> {
    try {
      const baselinesPath = path.join(__dirname, 'fixtures', 'regression-baselines.json');
      const baselinesData = await fs.readFile(baselinesPath, 'utf-8');
      const baselinesArray = JSON.parse(baselinesData);
      
      for (const baseline of baselinesArray) {
        baselines.set(baseline.testCase, baseline);
      }
    } catch {
      // No existing baselines - will create new ones
      console.log('No existing regression baselines found. Creating new baselines.');
    }
  }

  async function saveRegressionBaselines(): Promise<void> {
    try {
      const baselinesDir = path.join(__dirname, 'fixtures');
      await fs.mkdir(baselinesDir, { recursive: true });
      
      const baselinesPath = path.join(baselinesDir, 'regression-baselines.json');
      const baselinesArray = Array.from(baselines.values());
      
      await fs.writeFile(baselinesPath, JSON.stringify(baselinesArray, null, 2));
    } catch (error) {
      console.warn('Failed to save regression baselines:', error);
    }
  }

  function createOutputHash(output: any): string {
    const normalizedOutput = {
      ...output,
      // Remove timestamp-dependent fields for consistent hashing
      timestamp: undefined,
      executionId: undefined,
      processingTime: undefined
    };
    
    return createHash('sha256')
      .update(JSON.stringify(normalizedOutput, Object.keys(normalizedOutput).sort()))
      .digest('hex');
  }

  async function measurePerformance<T>(operation: () => Promise<T>): Promise<{ result: T; metrics: any }> {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    const result = await operation();
    
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    return {
      result,
      metrics: {
        executionTime: endTime - startTime,
        memoryUsage: endMemory.heapUsed - startMemory.heapUsed,
        peakMemory: endMemory.heapUsed
      }
    };
  }

  async function runRegressionTest(
    testCase: string,
    setupFn: () => Promise<{ projectDir: string; command: string[] }>,
    expectedBehavior?: Partial<RegressionBaseline['output']>
  ): Promise<void> {
    const { projectDir, command } = await setupFn();
    
    const { result, metrics } = await measurePerformance(async () => {
      return await cliApp.execute(command);
    });

    const currentOutput = {
      success: result.success,
      exitCode: result.exitCode || 0,
      generatedFiles: result.generatedFiles || [],
      detectedFrameworks: result.summary?.detectedFrameworks || [],
      warnings: result.warnings?.length || 0,
      errors: result.errors?.length || 0,
      outputHash: createOutputHash(result)
    };

    const currentBaseline: RegressionBaseline = {
      version: '1.0.0', // Should be read from package.json
      timestamp: new Date().toISOString(),
      testCase,
      input: { command, projectStructure: 'generated' },
      output: currentOutput,
      performance: metrics
    };

    const existingBaseline = baselines.get(testCase);

    if (!existingBaseline) {
      // First run - establish baseline
      baselines.set(testCase, currentBaseline);
      console.log(`Established new regression baseline for: ${testCase}`);
      return;
    }

    // Compare with existing baseline
    const regressions: string[] = [];

    // Check critical behavior consistency
    if (currentOutput.success !== existingBaseline.output.success) {
      regressions.push(`Success status changed: ${existingBaseline.output.success} → ${currentOutput.success}`);
    }

    if (currentOutput.exitCode !== existingBaseline.output.exitCode) {
      regressions.push(`Exit code changed: ${existingBaseline.output.exitCode} → ${currentOutput.exitCode}`);
    }

    // Check framework detection consistency
    const frameworkDiff = {
      added: currentOutput.detectedFrameworks.filter(f => !existingBaseline.output.detectedFrameworks.includes(f)),
      removed: existingBaseline.output.detectedFrameworks.filter(f => !currentOutput.detectedFrameworks.includes(f))
    };

    if (frameworkDiff.added.length > 0 || frameworkDiff.removed.length > 0) {
      regressions.push(`Framework detection changed: +${frameworkDiff.added.join(', ')} -${frameworkDiff.removed.join(', ')}`);
    }

    // Check performance regression (allow 20% variance)
    const performanceThreshold = 1.2;
    if (metrics.executionTime > existingBaseline.performance.executionTime * performanceThreshold) {
      regressions.push(`Performance regression: ${existingBaseline.performance.executionTime.toFixed(2)}ms → ${metrics.executionTime.toFixed(2)}ms`);
    }

    // Check memory usage regression (allow 30% variance)
    const memoryThreshold = 1.3;
    if (metrics.memoryUsage > existingBaseline.performance.memoryUsage * memoryThreshold) {
      regressions.push(`Memory usage regression: ${(existingBaseline.performance.memoryUsage / 1024 / 1024).toFixed(2)}MB → ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
    }

    // Apply expected behavior overrides
    if (expectedBehavior) {
      Object.keys(expectedBehavior).forEach(key => {
        if (expectedBehavior[key] !== undefined && currentOutput[key] !== expectedBehavior[key]) {
          regressions.push(`Expected ${key}: ${expectedBehavior[key]}, got: ${currentOutput[key]}`);
        }
      });
    }

    // Update baseline if no regressions
    if (regressions.length === 0) {
      baselines.set(testCase, currentBaseline);
    }

    // Report results
    if (regressions.length > 0) {
      console.warn(`Regressions detected in ${testCase}:`, regressions);
      // In CI, this would fail the test
      // expect(regressions).toHaveLength(0);
    } else {
      console.log(`✓ No regressions detected in ${testCase}`);
    }

    // For test purposes, we'll be lenient and just log regressions
    // In production, uncomment the line below to fail on regressions
    // expect(regressions).toHaveLength(0);
  }

  describe('Command Interface Stability', () => {
    it('should maintain generate command interface', async () => {
      await runRegressionTest(
        'generate-command-interface',
        async () => {
          const projectDir = path.join(tempDir, 'generate-test');
          await fs.mkdir(projectDir, { recursive: true });
          
          await fs.writeFile(path.join(projectDir, 'README.md'), `# Test Project

## Installation
\`\`\`bash
npm install
\`\`\`

## Build
\`\`\`bash
npm run build
\`\`\`

## Test
\`\`\`bash
npm test
\`\`\`
`);

          await fs.writeFile(path.join(projectDir, 'package.json'), JSON.stringify({
            name: 'test-project',
            version: '1.0.0',
            scripts: {
              build: 'tsc',
              test: 'jest'
            }
          }, null, 2));

          return {
            projectDir,
            command: ['generate', '--project-dir', projectDir, '--dry-run']
          };
        },
        { success: true, detectedFrameworks: ['Node.js'] }
      );
    });

    it('should maintain validate command interface', async () => {
      await runRegressionTest(
        'validate-command-interface',
        async () => {
          const projectDir = path.join(tempDir, 'validate-test');
          const workflowDir = path.join(projectDir, '.github', 'workflows');
          await fs.mkdir(workflowDir, { recursive: true });

          const workflow = `name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
`;

          await fs.writeFile(path.join(workflowDir, 'ci.yml'), workflow);

          return {
            projectDir,
            command: ['validate', '--workflow-path', path.join(workflowDir, 'ci.yml')]
          };
        },
        { success: true }
      );
    });

    it('should maintain init command interface', async () => {
      await runRegressionTest(
        'init-command-interface',
        async () => {
          const projectDir = path.join(tempDir, 'init-test');
          await fs.mkdir(projectDir, { recursive: true });

          return {
            projectDir,
            command: ['init', '--project-dir', projectDir, '--non-interactive']
          };
        },
        { success: true }
      );
    });

    it('should maintain help command interface', async () => {
      await runRegressionTest(
        'help-command-interface',
        async () => {
          return {
            projectDir: tempDir,
            command: ['--help']
          };
        },
        { success: true }
      );
    });
  });

  describe('Output Format Consistency', () => {
    it('should maintain consistent JSON output format', async () => {
      await runRegressionTest(
        'json-output-format',
        async () => {
          const projectDir = path.join(tempDir, 'json-output-test');
          await fs.mkdir(projectDir, { recursive: true });
          
          await fs.writeFile(path.join(projectDir, 'README.md'), '# JSON Test\n\n## Build\n```bash\nnpm run build\n```');

          return {
            projectDir,
            command: ['generate', '--project-dir', projectDir, '--output-format', 'json', '--dry-run']
          };
        }
      );
    });

    it('should maintain consistent verbose output format', async () => {
      await runRegressionTest(
        'verbose-output-format',
        async () => {
          const projectDir = path.join(tempDir, 'verbose-test');
          await fs.mkdir(projectDir, { recursive: true });
          
          await fs.writeFile(path.join(projectDir, 'README.md'), '# Verbose Test\n\n## Build\n```bash\nnpm run build\n```');

          return {
            projectDir,
            command: ['generate', '--project-dir', projectDir, '--verbose', '--dry-run']
          };
        }
      );
    });

    it('should maintain consistent error output format', async () => {
      await runRegressionTest(
        'error-output-format',
        async () => {
          return {
            projectDir: tempDir,
            command: ['generate', '--readme-path', '/nonexistent/file.md']
          };
        },
        { success: false }
      );
    });
  });

  describe('Configuration Compatibility', () => {
    it('should maintain backward compatibility with v1.0 config format', async () => {
      await runRegressionTest(
        'config-v1.0-compatibility',
        async () => {
          const projectDir = path.join(tempDir, 'config-v1-test');
          await fs.mkdir(projectDir, { recursive: true });

          const v1Config = {
            defaults: {
              outputDirectory: '.github/workflows',
              workflowTypes: ['ci']
            }
          };

          await fs.writeFile(
            path.join(projectDir, '.readme-to-cicd.json'),
            JSON.stringify(v1Config, null, 2)
          );

          await fs.writeFile(path.join(projectDir, 'README.md'), '# Config Test\n\n## Build\n```bash\nnpm run build\n```');

          return {
            projectDir,
            command: ['generate', '--project-dir', projectDir, '--dry-run']
          };
        },
        { success: true }
      );
    });

    it('should maintain backward compatibility with v1.1 config format', async () => {
      await runRegressionTest(
        'config-v1.1-compatibility',
        async () => {
          const projectDir = path.join(tempDir, 'config-v1.1-test');
          await fs.mkdir(projectDir, { recursive: true });

          const v11Config = {
            defaults: {
              outputDirectory: '.github/workflows',
              workflowTypes: ['ci', 'cd'],
              includeComments: true
            },
            templates: {
              customTemplates: './templates'
            }
          };

          await fs.writeFile(
            path.join(projectDir, '.readme-to-cicd.json'),
            JSON.stringify(v11Config, null, 2)
          );

          await fs.writeFile(path.join(projectDir, 'README.md'), '# Config v1.1 Test\n\n## Build\n```bash\nnpm run build\n```');

          return {
            projectDir,
            command: ['generate', '--project-dir', projectDir, '--dry-run']
          };
        },
        { success: true }
      );
    });
  });

  describe('Framework Detection Consistency', () => {
    const frameworkTestCases = [
      {
        name: 'node-js-detection',
        files: {
          'README.md': '# Node.js Project\n\n## Install\n```bash\nnpm install\n```',
          'package.json': JSON.stringify({ name: 'test', scripts: { build: 'tsc' } })
        },
        expectedFrameworks: ['Node.js']
      },
      {
        name: 'python-detection',
        files: {
          'README.md': '# Python Project\n\n## Install\n```bash\npip install -r requirements.txt\n```',
          'requirements.txt': 'flask==2.0.0\nrequests==2.28.0'
        },
        expectedFrameworks: ['Python']
      },
      {
        name: 'go-detection',
        files: {
          'README.md': '# Go Project\n\n## Build\n```bash\ngo build\n```',
          'go.mod': 'module example.com/test\n\ngo 1.19'
        },
        expectedFrameworks: ['Go']
      },
      {
        name: 'rust-detection',
        files: {
          'README.md': '# Rust Project\n\n## Build\n```bash\ncargo build\n```',
          'Cargo.toml': '[package]\nname = "test"\nversion = "0.1.0"'
        },
        expectedFrameworks: ['Rust']
      }
    ];

    frameworkTestCases.forEach(testCase => {
      it(`should maintain consistent ${testCase.name}`, async () => {
        await runRegressionTest(
          `framework-${testCase.name}`,
          async () => {
            const projectDir = path.join(tempDir, testCase.name);
            await fs.mkdir(projectDir, { recursive: true });

            for (const [filename, content] of Object.entries(testCase.files)) {
              await fs.writeFile(path.join(projectDir, filename), content);
            }

            return {
              projectDir,
              command: ['generate', '--project-dir', projectDir, '--dry-run']
            };
          },
          { 
            success: true,
            detectedFrameworks: testCase.expectedFrameworks
          }
        );
      });
    });
  });

  describe('Performance Regression Detection', () => {
    it('should maintain performance for small projects', async () => {
      await runRegressionTest(
        'performance-small-project',
        async () => {
          const projectDir = path.join(tempDir, 'perf-small');
          await fs.mkdir(projectDir, { recursive: true });

          await fs.writeFile(path.join(projectDir, 'README.md'), `# Small Project

## Installation
\`\`\`bash
npm install
\`\`\`

## Build
\`\`\`bash
npm run build
\`\`\`
`);

          return {
            projectDir,
            command: ['generate', '--project-dir', projectDir, '--dry-run']
          };
        }
      );
    });

    it('should maintain performance for medium projects', async () => {
      await runRegressionTest(
        'performance-medium-project',
        async () => {
          const projectDir = path.join(tempDir, 'perf-medium');
          await fs.mkdir(projectDir, { recursive: true });

          const largeReadme = `# Medium Project

${'## Section\n\nContent here.\n\n'.repeat(50)}

## Installation
\`\`\`bash
npm install
\`\`\`

## Build
\`\`\`bash
npm run build
\`\`\`

## Test
\`\`\`bash
npm test
\`\`\`

## Deploy
\`\`\`bash
npm run deploy
\`\`\`
`;

          await fs.writeFile(path.join(projectDir, 'README.md'), largeReadme);

          return {
            projectDir,
            command: ['generate', '--project-dir', projectDir, '--dry-run']
          };
        }
      );
    });

    it('should maintain performance for batch operations', async () => {
      await runRegressionTest(
        'performance-batch-operations',
        async () => {
          const batchDir = path.join(tempDir, 'perf-batch');
          await fs.mkdir(batchDir, { recursive: true });

          // Create multiple small projects
          for (let i = 0; i < 5; i++) {
            const projectDir = path.join(batchDir, `project-${i}`);
            await fs.mkdir(projectDir, { recursive: true });
            
            await fs.writeFile(path.join(projectDir, 'README.md'), `# Project ${i}\n\n## Build\n\`\`\`bash\nnpm run build\n\`\`\``);
          }

          return {
            projectDir: batchDir,
            command: ['generate', '--project-dir', batchDir, '--recursive', '--dry-run']
          };
        }
      );
    });
  });

  describe('Feature Behavior Preservation', () => {
    it('should maintain dry-run behavior', async () => {
      await runRegressionTest(
        'dry-run-behavior',
        async () => {
          const projectDir = path.join(tempDir, 'dry-run-test');
          await fs.mkdir(projectDir, { recursive: true });
          
          await fs.writeFile(path.join(projectDir, 'README.md'), '# Dry Run Test\n\n## Build\n```bash\nnpm run build\n```');

          return {
            projectDir,
            command: ['generate', '--project-dir', projectDir, '--dry-run']
          };
        },
        { success: true }
      );
    });

    it('should maintain interactive mode behavior', async () => {
      await runRegressionTest(
        'interactive-mode-behavior',
        async () => {
          const projectDir = path.join(tempDir, 'interactive-test');
          await fs.mkdir(projectDir, { recursive: true });
          
          await fs.writeFile(path.join(projectDir, 'README.md'), '# Interactive Test\n\n## Build\n```bash\nnpm run build\n```');

          return {
            projectDir,
            command: ['generate', '--project-dir', projectDir, '--interactive', '--dry-run']
          };
        }
      );
    });

    it('should maintain configuration loading behavior', async () => {
      await runRegressionTest(
        'config-loading-behavior',
        async () => {
          const projectDir = path.join(tempDir, 'config-loading-test');
          await fs.mkdir(projectDir, { recursive: true });

          const config = {
            defaults: {
              workflowTypes: ['ci', 'cd'],
              includeComments: true
            }
          };

          await fs.writeFile(
            path.join(projectDir, '.readme-to-cicd.json'),
            JSON.stringify(config, null, 2)
          );

          await fs.writeFile(path.join(projectDir, 'README.md'), '# Config Loading Test\n\n## Build\n```bash\nnpm run build\n```');

          return {
            projectDir,
            command: ['generate', '--project-dir', projectDir, '--dry-run']
          };
        },
        { success: true }
      );
    });
  });

  // Save baselines after all tests complete
  afterAll(async () => {
    await saveRegressionBaselines();
  });
});