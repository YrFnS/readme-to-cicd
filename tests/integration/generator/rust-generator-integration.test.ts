import { describe, it, expect, beforeEach } from 'vitest';
import { RustWorkflowGenerator } from '../../../src/generator/templates/rust-generator';
import { TemplateManager } from '../../../src/generator/templates/template-manager';
import { DetectionResult } from '../../../src/generator/interfaces';
import * as path from 'path';
import * as yaml from 'yaml';

describe('RustWorkflowGenerator Integration Tests', () => {
  let generator: RustWorkflowGenerator;
  let templateManager: TemplateManager;

  beforeEach(() => {
    templateManager = new TemplateManager({
      baseTemplatesPath: path.join(__dirname, '../../../templates/frameworks'),
      cacheEnabled: false,
      reloadOnChange: false
    });
    
    generator = new RustWorkflowGenerator(templateManager);
  });

  describe('Real template compilation', () => {
    it('should compile basic Rust template successfully', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Rust', version: '1.70.0', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'rust', confidence: 0.8, evidence: ['Cargo.toml'], category: 'backend' }],
        packageManagers: [{ name: 'cargo', lockFile: 'Cargo.lock', confidence: 0.9 }],
        testingFrameworks: [],
        buildTools: [{ name: 'clippy', confidence: 0.8 }, { name: 'rustfmt', confidence: 0.8 }],
        deploymentTargets: [],
        projectMetadata: {
          name: 'rust-integration-test',
          description: 'Integration test for Rust workflow generation'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      // Validate YAML structure
      const parsedYaml = yaml.parse(result.content);
      expect(parsedYaml.name).toContain('Rust CI');
      expect(parsedYaml.on.push.branches).toContain('main');
      expect(parsedYaml.jobs.test).toBeDefined();
      expect(parsedYaml.jobs.test.strategy.matrix['rust-version']).toBeDefined();

      // Validate Rust-specific steps
      const steps = parsedYaml.jobs.test.steps;
      expect(steps.some((step: any) => step.uses === 'actions/checkout@v4')).toBe(true);
      expect(steps.some((step: any) => step.uses === 'dtolnay/rust-toolchain@stable')).toBe(true);
      expect(steps.some((step: any) => step.uses === 'actions/cache@v4')).toBe(true);
      expect(steps.some((step: any) => step.run?.includes('cargo build'))).toBe(true);
      expect(steps.some((step: any) => step.run?.includes('cargo test'))).toBe(true);
    });

    it('should compile Actix Web template with web-specific features', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Rust', version: '1.70.0', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'actix-web', confidence: 0.9, evidence: ['Cargo.toml', 'src/main.rs'], category: 'backend' }],
        packageManagers: [{ name: 'cargo', lockFile: 'Cargo.lock', confidence: 0.9 }],
        testingFrameworks: [{ name: 'tokio-test', type: 'unit', confidence: 0.8 }],
        buildTools: [{ name: 'clippy', confidence: 0.8 }],
        deploymentTargets: [],
        projectMetadata: {
          name: 'actix-integration-test',
          description: 'Integration test for Actix Web workflow generation'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      // Validate YAML structure
      const parsedYaml = yaml.parse(result.content);
      expect(parsedYaml.name).toContain('Actix Web CI');
      
      // Check for Actix-specific environment variables
      const steps = parsedYaml.jobs.test.steps;
      const buildStep = steps.find((step: any) => step.run?.includes('cargo build'));
      expect(buildStep?.env?.ACTIX_TEST).toBe('true');
    });

    it('should compile Rocket template with nightly toolchain support', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Rust', version: '1.70.0-nightly', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'rocket', confidence: 0.9, evidence: ['Cargo.toml'], category: 'backend' }],
        packageManagers: [{ name: 'cargo', lockFile: 'Cargo.lock', confidence: 0.9 }],
        testingFrameworks: [{ name: 'rocket-testing', type: 'integration', confidence: 0.8 }],
        buildTools: [{ name: 'clippy', confidence: 0.8 }, { name: 'rustfmt', confidence: 0.8 }],
        deploymentTargets: [],
        projectMetadata: {
          name: 'rocket-integration-test',
          description: 'Integration test for Rocket workflow generation'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      // Validate YAML structure
      const parsedYaml = yaml.parse(result.content);
      expect(parsedYaml.name).toContain('Rocket CI');
      
      // Check for Rocket-specific environment variables
      const steps = parsedYaml.jobs.test.steps;
      const testStep = steps.find((step: any) => step.run?.includes('cargo test'));
      expect(testStep?.env?.ROCKET_ENV).toBe('testing');
    });
  });

  describe('Workspace project handling', () => {
    it('should handle workspace projects with multiple crates', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Rust', version: '1.70.0', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'rust', confidence: 0.8, evidence: ['Cargo.toml'], category: 'backend' }],
        packageManagers: [{ name: 'cargo', lockFile: 'Cargo.lock', confidence: 0.9 }],
        testingFrameworks: [],
        buildTools: [{ name: 'clippy', confidence: 0.8 }],
        deploymentTargets: [],
        projectMetadata: {
          name: 'workspace-integration-test',
          description: 'Integration test for workspace projects'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      // Validate that workspace flags are included in commands
      const parsedYaml = yaml.parse(result.content);
      const steps = parsedYaml.jobs.test.steps;
      
      // Check for workspace-aware commands
      const buildStep = steps.find((step: any) => step.run?.includes('cargo build'));
      const testStep = steps.find((step: any) => step.run?.includes('cargo test'));
      
      expect(buildStep?.run).toBeDefined();
      expect(testStep?.run).toBeDefined();
    });
  });

  describe('Coverage integration', () => {
    it('should integrate coverage tools when detected', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Rust', version: '1.70.0', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'rust', confidence: 0.8, evidence: ['Cargo.toml'], category: 'backend' }],
        packageManagers: [{ name: 'cargo', lockFile: 'Cargo.lock', confidence: 0.9 }],
        testingFrameworks: [{ name: 'tarpaulin', type: 'unit', confidence: 0.8 }],
        buildTools: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'coverage-integration-test',
          description: 'Integration test for coverage reporting'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      // Validate coverage steps
      const parsedYaml = yaml.parse(result.content);
      const steps = parsedYaml.jobs.test.steps;
      
      const coverageStep = steps.find((step: any) => step.run?.includes('cargo-tarpaulin'));
      expect(coverageStep).toBeDefined();
      
      const uploadStep = steps.find((step: any) => step.uses === 'codecov/codecov-action@v4');
      expect(uploadStep).toBeDefined();
    });
  });

  describe('Matrix strategy validation', () => {
    it('should generate valid matrix strategies for different optimization levels', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Rust', version: '1.70.0', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'rust', confidence: 0.8, evidence: ['Cargo.toml'], category: 'backend' }],
        packageManagers: [{ name: 'cargo', lockFile: 'Cargo.lock', confidence: 0.9 }],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'matrix-integration-test',
          description: 'Integration test for matrix strategies'
        }
      };

      // Test basic optimization
      const basicResult = await generator.generateWorkflow(detectionResult, { optimizationLevel: 'basic' });
      const basicYaml = yaml.parse(basicResult.content);
      expect(basicYaml.jobs.test.strategy.matrix['rust-version']).toHaveLength(1);

      // Test aggressive optimization
      const aggressiveResult = await generator.generateWorkflow(detectionResult, { optimizationLevel: 'aggressive' });
      const aggressiveYaml = yaml.parse(aggressiveResult.content);
      expect(aggressiveYaml.jobs.test.strategy.matrix['rust-version'].length).toBeGreaterThan(1);
    });
  });

  describe('Caching strategy validation', () => {
    it('should include proper caching strategies for Cargo', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Rust', version: '1.70.0', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'rust', confidence: 0.8, evidence: ['Cargo.toml'], category: 'backend' }],
        packageManagers: [{ name: 'cargo', lockFile: 'Cargo.lock', confidence: 0.9 }],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'caching-integration-test',
          description: 'Integration test for caching strategies'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      // Validate caching steps
      const parsedYaml = yaml.parse(result.content);
      const steps = parsedYaml.jobs.test.steps;
      
      const cacheSteps = steps.filter((step: any) => step.uses === 'actions/cache@v4');
      expect(cacheSteps.length).toBeGreaterThanOrEqual(2); // Registry and target caches
      
      // Check cache paths
      const registryCache = cacheSteps.find((step: any) => 
        step.with.path.includes('~/.cargo/registry')
      );
      expect(registryCache).toBeDefined();
      
      const targetCache = cacheSteps.find((step: any) => 
        step.with.path.includes('target/')
      );
      expect(targetCache).toBeDefined();
    });
  });

  describe('Linting and formatting integration', () => {
    it('should integrate clippy and rustfmt properly', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Rust', version: '1.70.0', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'rust', confidence: 0.8, evidence: ['Cargo.toml'], category: 'backend' }],
        packageManagers: [{ name: 'cargo', lockFile: 'Cargo.lock', confidence: 0.9 }],
        testingFrameworks: [],
        buildTools: [{ name: 'clippy', confidence: 0.8 }, { name: 'rustfmt', confidence: 0.8 }],
        deploymentTargets: [],
        projectMetadata: {
          name: 'linting-integration-test',
          description: 'Integration test for linting and formatting'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);

      // Validate linting steps
      const parsedYaml = yaml.parse(result.content);
      const steps = parsedYaml.jobs.test.steps;
      
      const fmtStep = steps.find((step: any) => step.run?.includes('cargo fmt'));
      expect(fmtStep).toBeDefined();
      expect(fmtStep.run).toContain('--check');
      
      const clippyStep = steps.find((step: any) => step.run?.includes('cargo clippy'));
      expect(clippyStep).toBeDefined();
      expect(clippyStep.run).toContain('-- -D warnings');
    });
  });

  describe('Environment variable handling', () => {
    it('should set framework-specific environment variables', async () => {
      const frameworks = [
        { name: 'actix-web', expectedEnv: 'ACTIX_TEST' },
        { name: 'rocket', expectedEnv: 'ROCKET_ENV' }
      ];

      for (const framework of frameworks) {
        const detectionResult: DetectionResult = {
          languages: [{ name: 'Rust', version: '1.70.0', confidence: 0.9, primary: true }],
          frameworks: [{ name: framework.name, confidence: 0.9, evidence: ['Cargo.toml'], category: 'backend' }],
          packageManagers: [{ name: 'cargo', lockFile: 'Cargo.lock', confidence: 0.9 }],
          testingFrameworks: [],
          buildTools: [],
          deploymentTargets: [],
          projectMetadata: {
            name: `${framework.name}-env-test`,
            description: `Environment test for ${framework.name}`
          }
        };

        const result = await generator.generateWorkflow(detectionResult);
        const parsedYaml = yaml.parse(result.content);
        const steps = parsedYaml.jobs.test.steps;
        
        // Check that framework-specific environment variables are set
        const envSteps = steps.filter((step: any) => step.env && step.env[framework.expectedEnv]);
        expect(envSteps.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Error handling and validation', () => {
    it('should handle missing templates gracefully', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Rust', version: '1.70.0', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'unknown-rust-framework', confidence: 0.9, evidence: ['Cargo.toml'], category: 'backend' }],
        packageManagers: [{ name: 'cargo', lockFile: 'Cargo.lock', confidence: 0.9 }],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'unknown-framework-test',
          description: 'Test for unknown framework handling'
        }
      };

      // Should fall back to basic rust template
      const result = await generator.generateWorkflow(detectionResult);
      expect(result.filename).toBe('ci.yml');
      expect(result.content).toContain('Rust CI');
    });

    it('should validate generated YAML syntax', async () => {
      const detectionResult: DetectionResult = {
        languages: [{ name: 'Rust', version: '1.70.0', confidence: 0.9, primary: true }],
        frameworks: [{ name: 'rust', confidence: 0.8, evidence: ['Cargo.toml'], category: 'backend' }],
        packageManagers: [{ name: 'cargo', lockFile: 'Cargo.lock', confidence: 0.9 }],
        testingFrameworks: [],
        buildTools: [],
        deploymentTargets: [],
        projectMetadata: {
          name: 'yaml-validation-test',
          description: 'Test for YAML validation'
        }
      };

      const result = await generator.generateWorkflow(detectionResult);
      
      // Should not throw when parsing the generated YAML
      expect(() => yaml.parse(result.content)).not.toThrow();
      
      // Validate required GitHub Actions workflow structure
      const parsedYaml = yaml.parse(result.content);
      expect(parsedYaml.name).toBeDefined();
      expect(parsedYaml.on).toBeDefined();
      expect(parsedYaml.jobs).toBeDefined();
      expect(Object.keys(parsedYaml.jobs).length).toBeGreaterThan(0);
    });
  });
});