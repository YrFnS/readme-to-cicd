import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RustAnalyzer } from '../../../src/detection/analyzers/rust';
import { ProjectInfo } from '../../../src/detection/interfaces/language-analyzer';
import { FileSystemScanner } from '../../../src/detection/utils/file-scanner';

// Mock the FileSystemScanner
vi.mock('../../../src/detection/utils/file-scanner');

describe('RustAnalyzer', () => {
  let analyzer: RustAnalyzer;
  let mockFileScanner: vi.Mocked<FileSystemScanner>;

  beforeEach(() => {
    analyzer = new RustAnalyzer();
    mockFileScanner = vi.mocked(FileSystemScanner.prototype);
  });

  describe('canAnalyze', () => {
    it('should return true for Rust projects', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: ['Rust'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return true when Cargo.toml is present', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: [],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['Cargo.toml'],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return true when Cargo.lock is present', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: [],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['Cargo.lock'],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return true when cargo commands are present', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: [],
        dependencies: [],
        buildCommands: ['cargo build'],
        testCommands: ['cargo test'],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return true when rust dependency is mentioned', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: [],
        dependencies: ['rust'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(true);
    });

    it('should return false for non-Rust projects', () => {
      const projectInfo: ProjectInfo = {
        name: 'test-project',
        languages: ['JavaScript'],
        dependencies: [],
        buildCommands: ['npm build'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['package.json'],
        rawContent: ''
      };

      expect(analyzer.canAnalyze(projectInfo)).toBe(false);
    });
  });

  describe('analyze', () => {
    it('should detect Actix Web framework from Cargo.toml', async () => {
      const projectInfo: ProjectInfo = {
        name: 'actix-web-app',
        languages: ['Rust'],
        dependencies: ['actix-web'],
        buildCommands: ['cargo build'],
        testCommands: ['cargo test'],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['Cargo.toml'],
        rawContent: 'An Actix Web application'
      };

      const mockCargoToml = {
        package: {
          name: 'actix-web-app',
          version: '0.1.0',
          edition: '2021'
        },
        dependencies: {
          'actix-web': '4.0'
        }
      };

      mockFileScanner.fileExists.mockImplementation((path, file) => {
        if (file === 'Cargo.toml') return Promise.resolve(true);
        if (file === 'Cargo.lock') return Promise.resolve(true);
        return Promise.resolve(false);
      });
      mockFileScanner.readConfigFile.mockResolvedValue(mockCargoToml);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks.length).toBeGreaterThanOrEqual(1);
      const actixFramework = result.frameworks.find(f => f.name === 'Actix Web');
      expect(actixFramework).toBeDefined();
      expect(actixFramework?.name).toBe('Actix Web');
      expect(actixFramework?.type).toBe('web_framework');
      expect(actixFramework?.confidence).toBeGreaterThan(0.5);
      expect(actixFramework?.metadata?.rustEdition).toBe('2021');
      expect(result.buildTools).toHaveLength(1);
      expect(result.buildTools[0].name).toBe('cargo');
    });

    it('should detect Rocket framework from Cargo.toml', async () => {
      const projectInfo: ProjectInfo = {
        name: 'rocket-api',
        languages: ['Rust'],
        dependencies: ['rocket'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['Cargo.toml'],
        rawContent: 'A Rocket web API'
      };

      const mockCargoToml = {
        package: {
          name: 'rocket-api',
          version: '0.1.0',
          edition: '2021',
          'rust-version': '1.70'
        },
        dependencies: {
          rocket: { version: '0.5.0', features: ['json'] }
        }
      };

      mockFileScanner.fileExists.mockImplementation((path, file) => {
        if (file === 'Cargo.toml') return Promise.resolve(true);
        return Promise.resolve(false);
      });
      mockFileScanner.readConfigFile.mockResolvedValue(mockCargoToml);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks.length).toBeGreaterThanOrEqual(1);
      const rocketFramework = result.frameworks.find(f => f.name === 'Rocket');
      expect(rocketFramework).toBeDefined();
      expect(rocketFramework?.name).toBe('Rocket');
      expect(rocketFramework?.type).toBe('web_framework');
      expect(rocketFramework?.metadata?.rustVersion).toBe('1.70');
      expect(result.recommendations).toContain('Ensure you have the correct Rust nightly version for Rocket compatibility.');
    });

    it('should detect Warp framework from Cargo.toml', async () => {
      const projectInfo: ProjectInfo = {
        name: 'warp-service',
        languages: ['Rust'],
        dependencies: ['warp'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['Cargo.toml'],
        rawContent: 'A Warp web service'
      };

      const mockCargoToml = {
        package: {
          name: 'warp-service',
          version: '0.1.0',
          edition: '2021'
        },
        dependencies: {
          warp: '0.3'
        }
      };

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue(mockCargoToml);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks.length).toBeGreaterThanOrEqual(1);
      const warpFramework = result.frameworks.find(f => f.name === 'Warp');
      expect(warpFramework).toBeDefined();
      expect(warpFramework?.name).toBe('Warp');
      expect(warpFramework?.type).toBe('web_framework');
    });

    it('should detect Axum framework from Cargo.toml', async () => {
      const projectInfo: ProjectInfo = {
        name: 'axum-app',
        languages: ['Rust'],
        dependencies: ['axum'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['Cargo.toml'],
        rawContent: 'An Axum web application'
      };

      const mockCargoToml = {
        package: {
          name: 'axum-app',
          version: '0.1.0',
          edition: '2021'
        },
        dependencies: {
          axum: '0.6',
          tokio: { version: '1.0', features: ['full'] }
        }
      };

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue(mockCargoToml);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks.length).toBeGreaterThanOrEqual(1);
      const axumFramework = result.frameworks.find(f => f.name === 'Axum');
      expect(axumFramework).toBeDefined();
      expect(axumFramework?.name).toBe('Axum');
      expect(axumFramework?.type).toBe('web_framework');
      expect(result.recommendations).toContain('Consider using Tower middleware ecosystem with Axum for enhanced functionality.');
    });

    it('should detect multiple frameworks in a project', async () => {
      const projectInfo: ProjectInfo = {
        name: 'multi-framework-project',
        languages: ['Rust'],
        dependencies: ['actix-web', 'warp'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['Cargo.toml'],
        rawContent: 'A project with multiple web frameworks'
      };

      const mockCargoToml = {
        package: {
          name: 'multi-framework-project',
          version: '0.1.0',
          edition: '2021'
        },
        dependencies: {
          'actix-web': '4.0',
          warp: '0.3',
          axum: '0.6'
        }
      };

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue(mockCargoToml);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks.length).toBeGreaterThanOrEqual(2);
      const frameworkNames = result.frameworks.map(f => f.name);
      expect(frameworkNames).toContain('Actix Web');
      expect(frameworkNames).toContain('Warp');
      expect(frameworkNames).toContain('Axum');
    });

    it('should detect workspace configuration', async () => {
      const projectInfo: ProjectInfo = {
        name: 'rust-workspace',
        languages: ['Rust'],
        dependencies: [],
        buildCommands: ['cargo build'],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['Cargo.toml'],
        rawContent: 'A Rust workspace project'
      };

      const mockCargoToml = {
        workspace: {
          members: ['crate1', 'crate2', 'web-service']
        },
        dependencies: {
          'actix-web': '4.0'
        }
      };

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue(mockCargoToml);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.metadata.patternsMatched).toContain('workspace_configuration');
      expect(result.recommendations).toContain('Detected Rust workspace. Consider using workspace-level CI optimization for multi-crate builds.');
      
      // Check that workspace metadata is added to frameworks
      const actixFramework = result.frameworks.find(f => f.name === 'Actix Web');
      expect(actixFramework?.metadata?.isWorkspace).toBe(true);
    });

    it('should handle Cargo.lock for reproducible builds', async () => {
      const projectInfo: ProjectInfo = {
        name: 'locked-project',
        languages: ['Rust'],
        dependencies: ['actix-web'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['Cargo.toml', 'Cargo.lock'],
        rawContent: 'A Rust project with Cargo.lock'
      };

      const mockCargoToml = {
        package: {
          name: 'locked-project',
          version: '0.1.0',
          edition: '2021'
        },
        dependencies: {
          'actix-web': '4.0'
        }
      };

      mockFileScanner.fileExists.mockImplementation((path, file) => {
        if (file === 'Cargo.toml') return Promise.resolve(true);
        if (file === 'Cargo.lock') return Promise.resolve(true);
        return Promise.resolve(false);
      });
      mockFileScanner.readConfigFile.mockResolvedValue(mockCargoToml);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.metadata.filesAnalyzed).toContain('Cargo.lock');
      expect(result.metadata.patternsMatched).toContain('cargo_lock_present');
      expect(result.recommendations).toContain('Cargo.lock detected. Include this file in CI for reproducible builds.');
      expect(result.buildTools[0].confidence).toBe(0.95); // Higher confidence with lock file
    });

    it('should extract version information from dependencies', async () => {
      const projectInfo: ProjectInfo = {
        name: 'versioned-project',
        languages: ['Rust'],
        dependencies: ['actix-web'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['Cargo.toml'],
        rawContent: 'A Rust project with versioned dependencies'
      };

      const mockCargoToml = {
        package: {
          name: 'versioned-project',
          version: '0.1.0',
          edition: '2021'
        },
        dependencies: {
          'actix-web': '4.2.1'
        }
      };

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue(mockCargoToml);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      const actixFramework = result.frameworks.find(f => f.name === 'Actix Web');
      expect(actixFramework?.version).toBe('4.2.1');
    });

    it('should handle dev-dependencies', async () => {
      const projectInfo: ProjectInfo = {
        name: 'dev-deps-project',
        languages: ['Rust'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['Cargo.toml'],
        rawContent: 'A Rust project with dev dependencies'
      };

      const mockCargoToml = {
        package: {
          name: 'dev-deps-project',
          version: '0.1.0',
          edition: '2021'
        },
        'dev-dependencies': {
          'actix-web': '4.0'
        }
      };

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue(mockCargoToml);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks.length).toBeGreaterThanOrEqual(1);
      const actixFramework = result.frameworks.find(f => f.name === 'Actix Web');
      expect(actixFramework).toBeDefined();
    });

    it('should generate appropriate cargo commands', async () => {
      const projectInfo: ProjectInfo = {
        name: 'cargo-commands-project',
        languages: ['Rust'],
        dependencies: [],
        buildCommands: ['cargo build --release'],
        testCommands: ['cargo test'],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['Cargo.toml'],
        rawContent: 'A Rust project with release builds'
      };

      const mockCargoToml = {
        package: {
          name: 'cargo-commands-project',
          version: '0.1.0',
          edition: '2021'
        }
      };

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue(mockCargoToml);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.buildTools).toHaveLength(1);
      const cargoBuildTool = result.buildTools[0];
      expect(cargoBuildTool.name).toBe('cargo');
      
      const commandNames = cargoBuildTool.commands.map((cmd: any) => cmd.name);
      expect(commandNames).toContain('build');
      expect(commandNames).toContain('test');
      expect(commandNames).toContain('check');
      expect(commandNames).toContain('clippy');
      expect(commandNames).toContain('fmt');
      expect(commandNames).toContain('build-release'); // Because --release was in build commands
    });

    it('should handle missing Cargo.toml gracefully', async () => {
      const projectInfo: ProjectInfo = {
        name: 'no-cargo-project',
        languages: ['Rust'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: 'A Rust project without Cargo.toml'
      };

      mockFileScanner.fileExists.mockResolvedValue(false);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.frameworks).toHaveLength(0);
      expect(result.buildTools).toHaveLength(0);
      expect(result.confidence).toBeLessThan(0.7);
      expect(result.recommendations).toContain(
        'Add a Cargo.toml file to define your Rust project structure and dependencies.'
      );
    });

    it('should handle Cargo.toml parsing errors', async () => {
      const projectInfo: ProjectInfo = {
        name: 'broken-project',
        languages: ['Rust'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['Cargo.toml'],
        rawContent: ''
      };

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockRejectedValue(new Error('Invalid TOML'));

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.metadata.warnings).toContain('Failed to parse Cargo.toml: Invalid TOML');
      expect(result.buildTools).toHaveLength(1); // Cargo is still detected from file existence
      expect(result.buildTools[0].name).toBe('cargo');
    });

    it('should provide appropriate recommendations', async () => {
      const projectInfo: ProjectInfo = {
        name: 'rust-project',
        languages: ['Rust'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['Cargo.toml'],
        rawContent: 'A basic Rust project'
      };

      const mockCargoToml = {
        package: {
          name: 'rust-project',
          version: '0.1.0',
          edition: '2021'
        }
      };

      mockFileScanner.fileExists.mockImplementation((path, file) => {
        if (file === 'Cargo.toml') return Promise.resolve(true);
        if (file === 'Cargo.lock') return Promise.resolve(false);
        return Promise.resolve(false);
      });
      mockFileScanner.readConfigFile.mockResolvedValue(mockCargoToml);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.recommendations).toContain('Run `cargo build` to generate Cargo.lock for reproducible builds.');
      expect(result.recommendations).toContain('No specific Rust frameworks detected. Consider adding web framework dependencies to Cargo.toml.');
      expect(result.recommendations).toContain('Add `cargo clippy` and `cargo fmt` to your CI pipeline for code quality.');
      expect(result.recommendations).toContain('Consider using `cargo audit` for security vulnerability scanning.');
      expect(result.recommendations).toContain('Use `cargo test --release` for performance-critical test scenarios.');
    });

    it('should handle analysis errors gracefully', async () => {
      const projectInfo: ProjectInfo = {
        name: 'error-project',
        languages: ['Rust'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: ''
      };

      mockFileScanner.fileExists.mockRejectedValue(new Error('File system error'));

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.confidence).toBe(0.1);
      expect(result.recommendations).toContain('Unable to complete Rust analysis due to errors. Ensure Cargo.toml is present and readable.');
      expect(result.metadata.warnings.length).toBeGreaterThan(0);
    });

    it('should handle missing project path', async () => {
      const projectInfo: ProjectInfo = {
        name: 'no-path-project',
        languages: ['Rust'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: ''
      };

      const result = await analyzer.analyze(projectInfo);

      expect(result.confidence).toBe(0.1);
      expect(result.metadata.warnings).toContain('No project path provided, skipping file system analysis');
    });
  });

  describe('confidence calculation', () => {
    it('should return high confidence for well-defined projects', async () => {
      const projectInfo: ProjectInfo = {
        name: 'well-defined-project',
        languages: ['Rust'],
        dependencies: ['actix-web'],
        buildCommands: ['cargo build'],
        testCommands: ['cargo test'],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['Cargo.toml', 'Cargo.lock'],
        rawContent: 'A well-defined Rust web application'
      };

      const mockCargoToml = {
        package: {
          name: 'well-defined-project',
          version: '0.1.0',
          edition: '2021'
        },
        dependencies: {
          'actix-web': '4.0'
        }
      };

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue(mockCargoToml);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should return low confidence for minimal projects', async () => {
      const projectInfo: ProjectInfo = {
        name: 'minimal-project',
        languages: ['Rust'],
        dependencies: [],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: [],
        rawContent: 'A minimal Rust project'
      };

      mockFileScanner.fileExists.mockResolvedValue(false);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.confidence).toBeLessThan(0.7);
    });

    it('should give bonus confidence for multiple frameworks', async () => {
      const projectInfo: ProjectInfo = {
        name: 'multi-framework-project',
        languages: ['Rust'],
        dependencies: ['actix-web', 'warp'],
        buildCommands: [],
        testCommands: [],
        installationSteps: [],
        usageExamples: [],
        configFiles: ['Cargo.toml'],
        rawContent: 'A project with multiple frameworks'
      };

      const mockCargoToml = {
        package: {
          name: 'multi-framework-project',
          version: '0.1.0',
          edition: '2021'
        },
        dependencies: {
          'actix-web': '4.0',
          warp: '0.3'
        }
      };

      mockFileScanner.fileExists.mockResolvedValue(true);
      mockFileScanner.readConfigFile.mockResolvedValue(mockCargoToml);

      const result = await analyzer.analyze(projectInfo, '/test/path');

      expect(result.confidence).toBeGreaterThan(0.9); // Should get bonus for multiple frameworks
    });
  });
});