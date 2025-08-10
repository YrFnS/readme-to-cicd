import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RustWorkflowGenerator } from '../../../src/generator/templates/rust-generator';
import { DetectionResult } from '../../../src/generator/interfaces';
import { TemplateManager } from '../../../src/generator/templates/template-manager';

describe('RustWorkflowGenerator', () => {
  let generator: RustWorkflowGenerator;
  let mockTemplateManager: TemplateManager;

  beforeEach(() => {
    mockTemplateManager = {
      compileTemplate: vi.fn().mockImplementation((templateName: string, data: any) => {
        // Create a more realistic mock that processes template data
        const baseTemplate = {
          name: `${data.framework} CI`,
          triggers: { push: { branches: ['main'] } },
          jobs: [{
            name: 'test',
            runsOn: 'ubuntu-latest',
            strategy: {
              matrix: {
                'rust-version': data.rustVersions || ['stable']
              }
            },
            steps: [
              { name: 'Checkout', uses: 'actions/checkout@v4' },
              { name: 'Setup Rust', uses: 'dtolnay/rust-toolchain@stable', with: { toolchain: data.toolchain } },
              { name: 'Build', run: data.buildCommand, env: data.environmentVariables },
              { name: 'Test', run: data.testCommand, env: data.environmentVariables }
            ]
          }]
        };

        // Add conditional steps based on data
        if (data.hasClippy) {
          baseTemplate.jobs[0].steps.splice(-2, 0, { name: 'Clippy', run: data.clippyCommand });
        }
        if (data.hasFmt) {
          baseTemplate.jobs[0].steps.splice(-2, 0, { name: 'Format', run: data.fmtCommand });
        }
        if (data.hasCoverage) {
          baseTemplate.jobs[0].steps.push({ name: 'Coverage', run: 'cargo install cargo-tarpaulin && cargo tarpaulin' });
        }

        return Promise.resolve({
          template: baseTemplate,
          errors: [],
          warnings: []
        });
      })
    } as any;
    
    generator = new RustWorkflowGenerator(mockTemplateManager);
  });

  describe('Basic Rust workflow generation', () => {
    it('should generate basic Rust workflow', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Rust', version: '1.70.0', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'rust', confidence: 0.8, evidence: ['Cargo.toml'], category: 'backend' }],
        packageManagers: [{ name: 'cargo', lockFile: 'Cargo.lock', confidence: 0.9 }],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'test-project',
          description: 'A test Rust project'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.filename).toBe('ci.yml');
      expect(result.content).toContain('rust-version');
      expect(result.content).toContain('cargo build');
      expect(result.metadata.detectionSummary).toContain('Rust rust project with stable toolchain');
      expect(result.metadata.optimizations).toContain('Cargo dependency caching enabled');
    });
  });

  describe('Actix Web workflow generation', () => {
    it('should generate Actix Web workflow with web-specific setup', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Rust', version: '1.70.0', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'actix-web', confidence: 0.9, evidence: ['Cargo.toml', 'src/main.rs'], category: 'backend' }],
        packageManagers: [{ name: 'cargo', lockFile: 'Cargo.lock', confidence: 0.9 }],
        testingFrameworks: [{ name: 'tokio-test', type: 'unit', confidence: 0.8 }],
        buildTools: [{ name: 'clippy', confidence: 0.8 }],
        deploymentTargets: [],
        projectMetadata: {
          name: 'actix-web-app',
          description: 'An Actix Web application'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.filename).toBe('actix-web-ci.yml');
      expect(result.content).toContain('ACTIX_TEST');
      expect(result.metadata.detectionSummary).toContain('actix-web');
      expect(result.metadata.optimizations).toContain('Clippy linting included');
    });
  });

  describe('Rocket workflow generation', () => {
    it('should generate Rocket workflow with nightly toolchain', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Rust', version: '1.70.0-nightly', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'rocket', confidence: 0.9, evidence: ['Cargo.toml', 'src/main.rs'], category: 'backend' }],
        packageManagers: [{ name: 'cargo', lockFile: 'Cargo.lock', confidence: 0.9 }],
        testingFrameworks: [{ name: 'rocket-testing', type: 'integration', confidence: 0.8 }],
        buildTools: [{ name: 'clippy', confidence: 0.8 }, { name: 'rustfmt', confidence: 0.8 }],
        deploymentTargets: [],
        projectMetadata: {
          name: 'rocket-app',
          description: 'A Rocket web application'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.filename).toBe('rocket-ci.yml');
      expect(result.content).toContain('ROCKET_ENV');
      expect(result.metadata.detectionSummary).toContain('rocket');
      expect(result.metadata.optimizations).toContain('Rustfmt formatting checks included');
    });
  });

  describe('Warp workflow generation', () => {
    it('should generate Warp workflow with async testing', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Rust', version: '1.70.0', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'warp', confidence: 0.9, evidence: ['Cargo.toml'], category: 'backend' }],
        packageManagers: [{ name: 'cargo', lockFile: 'Cargo.lock', confidence: 0.9 }],
        testingFrameworks: [{ name: 'tokio-test', type: 'unit', confidence: 0.8 }],
        buildTools: [{ name: 'clippy', confidence: 0.8 }],
        deploymentTargets: [],
        projectMetadata: {
          name: 'warp-service',
          description: 'A Warp web service'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.filename).toBe('warp-ci.yml');
      expect(result.metadata.detectionSummary).toContain('warp');
    });
  });

  describe('Axum workflow generation', () => {
    it('should generate Axum workflow with modern async patterns', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Rust', version: '1.75.0', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'axum', confidence: 0.9, evidence: ['Cargo.toml'], category: 'backend' }],
        packageManagers: [{ name: 'cargo', lockFile: 'Cargo.lock', confidence: 0.9 }],
        testingFrameworks: [{ name: 'tokio-test', type: 'unit', confidence: 0.8 }],
        buildTools: [{ name: 'clippy', confidence: 0.8 }, { name: 'rustfmt', confidence: 0.8 }],
        deploymentTargets: [],
        projectMetadata: {
          name: 'axum-api',
          description: 'An Axum API server'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.filename).toBe('axum-ci.yml');
      expect(result.metadata.detectionSummary).toContain('axum');
    });
  });

  describe('Workspace support', () => {
    it('should generate workflow with workspace support for multi-crate projects', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Rust', version: '1.70.0', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'rust', confidence: 0.8, evidence: ['Cargo.toml'], category: 'backend' }],
        packageManagers: [{ name: 'cargo', lockFile: 'Cargo.lock', confidence: 0.9 }],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'workspace-project',
          description: 'A Rust workspace project'
        }
      };

      // Mock workspace detection
      vi.spyOn(generator as any, 'detectWorkspace').mockReturnValue(true);

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.metadata.optimizations).toContain('Workspace-aware builds and testing');
      expect(result.content).toContain('--workspace');
    });
  });

  describe('Coverage reporting', () => {
    it('should include coverage reporting when coverage tools are detected', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Rust', version: '1.70.0', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'rust', confidence: 0.8, evidence: ['Cargo.toml'], category: 'backend' }],
        packageManagers: [{ name: 'cargo', lockFile: 'Cargo.lock', confidence: 0.9 }],
        testingFrameworks: [{ name: 'tarpaulin', type: 'unit', confidence: 0.8 }],
        buildTools: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'coverage-project',
          description: 'A Rust project with coverage'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.metadata.optimizations).toContain('Code coverage reporting enabled');
      expect(result.content).toContain('cargo-tarpaulin');
    });
  });

  describe('Toolchain detection', () => {
    it('should detect nightly toolchain from version string', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Rust', version: '1.70.0-nightly', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'rust', confidence: 0.8, evidence: ['Cargo.toml'], category: 'backend' }],
        packageManagers: [{ name: 'cargo', lockFile: 'Cargo.lock', confidence: 0.9 }],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'nightly-project',
          description: 'A Rust project using nightly'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.metadata.detectionSummary).toContain('nightly toolchain');
    });

    it('should detect beta toolchain from build tools', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Rust', version: '1.70.0', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'rust', confidence: 0.8, evidence: ['Cargo.toml'], category: 'backend' }],
        packageManagers: [{ name: 'cargo', lockFile: 'Cargo.lock', confidence: 0.9 }],
        testingFrameworks: [],
        buildTools: [{ name: 'rust-beta', confidence: 0.7 }],
        deploymentTargets: [],
        projectMetadata: {
          name: 'beta-project',
          description: 'A Rust project using beta'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.metadata.detectionSummary).toContain('beta toolchain');
    });
  });

  describe('Matrix strategy optimization', () => {
    it('should generate basic matrix for basic optimization level', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Rust', version: '1.70.0', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'rust', confidence: 0.8, evidence: ['Cargo.toml'], category: 'backend' }],
        packageManagers: [{ name: 'cargo', lockFile: 'Cargo.lock', confidence: 0.9 }],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'basic-project',
          description: 'A basic Rust project'
        }
      };

      const result = await generator.generateWorkflow(detectionResult, { optimizationLevel: 'basic' });

      expect(result.content).toContain('matrix');
      expect(result.metadata.optimizations).toContain('Matrix strategy for multiple Rust versions');
    });

    it('should generate aggressive matrix for aggressive optimization level', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Rust', version: '1.70.0', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'rust', confidence: 0.8, evidence: ['Cargo.toml'], category: 'backend' }],
        packageManagers: [{ name: 'cargo', lockFile: 'Cargo.lock', confidence: 0.9 }],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'aggressive-project',
          description: 'A Rust project with aggressive testing'
        }
      };

      const result = await generator.generateWorkflow(detectionResult, { optimizationLevel: 'aggressive' });

      expect(result.content).toContain('matrix');
      expect(result.metadata.optimizations).toContain('Matrix strategy for multiple Rust versions');
    });
  });

  describe('Error handling', () => {
    it('should throw error when no Rust framework is detected', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'JavaScript', version: '18', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'react', confidence: 0.9, evidence: ['package.json'], category: 'frontend' }],
        packageManagers: [{ name: 'npm', lockFile: 'package-lock.json', confidence: 0.9 }],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'non-rust-project',
          description: 'A non-Rust project'
        }
      };

      await expect(generator.generateWorkflow(detectionResult)).rejects.toThrow('No Rust framework detected');
    });

    it('should handle template compilation errors gracefully', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Rust', version: '1.70.0', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'rust', confidence: 0.8, evidence: ['Cargo.toml'], category: 'backend' }],
        packageManagers: [{ name: 'cargo', lockFile: 'Cargo.lock', confidence: 0.9 }],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'error-project',
          description: 'A project that will cause template errors'
        }
      };

      mockTemplateManager.compileTemplate = vi.fn().mockResolvedValue({
        template: {},
        errors: ['Template compilation failed'],
        warnings: []
      });

      await expect(generator.generateWorkflow(detectionResult)).rejects.toThrow('Template compilation failed');
    });
  });

  describe('Linting and formatting', () => {
    it('should include clippy and rustfmt when detected', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Rust', version: '1.70.0', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'rust', confidence: 0.8, evidence: ['Cargo.toml'], category: 'backend' }],
        packageManagers: [{ name: 'cargo', lockFile: 'Cargo.lock', confidence: 0.9 }],
        testingFrameworks: [],
        buildTools: [{ name: 'clippy', confidence: 0.8 }, { name: 'rustfmt', confidence: 0.8 }],
        deploymentTargets: [],
        projectMetadata: {
          name: 'linted-project',
          description: 'A well-linted Rust project'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.metadata.optimizations).toContain('Clippy linting included');
      expect(result.metadata.optimizations).toContain('Rustfmt formatting checks included');
      expect(result.content).toContain('cargo clippy');
      expect(result.content).toContain('cargo fmt');
    });
  });

  describe('Environment variables', () => {
    it('should set appropriate environment variables for different frameworks', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Rust', version: '1.70.0', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'rocket', confidence: 0.9, evidence: ['Cargo.toml'], category: 'backend' }],
        packageManagers: [{ name: 'cargo', lockFile: 'Cargo.lock', confidence: 0.9 }],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'rocket-env-project',
          description: 'A Rocket project with environment variables'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      expect(result.content).toContain('ROCKET_ENV');
      expect(result.content).toContain('CARGO_TERM_COLOR');
      expect(result.content).toContain('RUST_BACKTRACE');
    });
  });
});