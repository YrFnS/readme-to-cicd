import { BaseLanguageAnalyzer } from './base';
import { LanguageDetectionResult, ProjectInfo } from '../interfaces/language-analyzer';
import { FrameworkInfo, BuildToolInfo } from '../interfaces/framework-info';
import { CIStep } from '../interfaces/ci-pipeline';
import { FileSystemScanner } from '../utils/file-scanner';
import { Evidence } from '../interfaces/evidence';

/**
 * Rust framework analyzer
 */
export class RustAnalyzer extends BaseLanguageAnalyzer {
  readonly name = 'Rust Analyzer';
  readonly ecosystem = 'rust';
  private fileScanner = new FileSystemScanner();

  canAnalyze(projectInfo: ProjectInfo): boolean {
    // Check for Rust indicators
    return projectInfo.languages.includes('Rust') ||
           this.hasConfigFile(projectInfo, 'Cargo.toml') ||
           this.hasConfigFile(projectInfo, 'Cargo.lock') ||
           this.hasDependency(projectInfo, 'rust') ||
           this.hasCommand(projectInfo, 'cargo');
  }

  async analyze(projectInfo: ProjectInfo, projectPath?: string): Promise<LanguageDetectionResult> {
    const startTime = Date.now();
    const frameworks: FrameworkInfo[] = [];
    const buildTools: BuildToolInfo[] = [];
    const warnings: string[] = [];
    const filesAnalyzed: string[] = [];
    const patternsMatched: string[] = [];
    const recommendations: string[] = [];
    let hasCargoToml = false;
    let hasCargoLock = false;

    try {
      if (!projectPath) {
        warnings.push('No project path provided, skipping file system analysis');
        return this.createMinimalResult(startTime, warnings, recommendations);
      }

      // Check for Cargo.toml
      hasCargoToml = await this.fileScanner.fileExists(projectPath, 'Cargo.toml');
      if (hasCargoToml) {
        filesAnalyzed.push('Cargo.toml');
        try {
          const cargoToml = await this.fileScanner.readConfigFile(`${projectPath}/Cargo.toml`);
          
          // Extract Rust edition and version
          const rustEdition = cargoToml.package?.edition;
          const rustVersion = cargoToml.package?.['rust-version'];
          
          // Detect workspace configuration
          const isWorkspace = !!cargoToml.workspace;
          if (isWorkspace) {
            patternsMatched.push('workspace_configuration');
            recommendations.push('Detected Rust workspace. Consider using workspace-level CI optimization for multi-crate builds.');
          }

          // Detect frameworks from dependencies
          const dependencies = {
            ...cargoToml.dependencies || {},
            ...cargoToml['dev-dependencies'] || {}
          };

          // Detect web frameworks
          await this.detectWebFrameworks(dependencies, frameworks, patternsMatched);

          // Add Rust edition and version metadata to all frameworks
          frameworks.forEach(framework => {
            framework.metadata = {
              ...framework.metadata,
              rustEdition,
              rustVersion,
              isWorkspace
            };
          });

        } catch (error) {
          warnings.push(`Failed to parse Cargo.toml: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // Add Cargo as build tool
        buildTools.push({
          name: 'cargo',
          configFile: 'Cargo.toml',
          commands: this.getCargoCommands(projectInfo),
          confidence: 0.9
        });
      }

      // Check for Cargo.lock for reproducible builds
      hasCargoLock = await this.fileScanner.fileExists(projectPath, 'Cargo.lock');
      if (hasCargoLock) {
        filesAnalyzed.push('Cargo.lock');
        patternsMatched.push('cargo_lock_present');
        recommendations.push('Cargo.lock detected. Include this file in CI for reproducible builds.');
        
        // Update cargo build tool confidence
        const cargoBuildTool = buildTools.find(tool => tool.name === 'cargo');
        if (cargoBuildTool) {
          cargoBuildTool.confidence = 0.95;
        }
      }

      // Generate recommendations
      this.generateRecommendations(frameworks, buildTools, hasCargoToml, hasCargoLock, recommendations);

    } catch (error) {
      warnings.push(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      recommendations.push('Unable to complete Rust analysis due to errors. Ensure Cargo.toml is present and readable.');
      return this.createMinimalResult(startTime, warnings, recommendations);
    }

    // Calculate confidence
    const confidence = this.calculateConfidence(frameworks, buildTools, hasCargoToml);

    return {
      frameworks,
      buildTools,
      confidence,
      recommendations,
      metadata: {
        executionTime: Date.now() - startTime,
        filesAnalyzed,
        patternsMatched,
        warnings
      }
    };
  }

  /**
   * Detect Rust web frameworks from dependencies
   */
  private async detectWebFrameworks(
    dependencies: Record<string, any>,
    frameworks: FrameworkInfo[],
    patternsMatched: string[]
  ): Promise<void> {
    const frameworkPatterns = {
      'actix-web': {
        name: 'Actix Web',
        type: 'web_framework' as const,
        confidence: 0.9
      },
      'rocket': {
        name: 'Rocket',
        type: 'web_framework' as const,
        confidence: 0.9
      },
      'warp': {
        name: 'Warp',
        type: 'web_framework' as const,
        confidence: 0.85
      },
      'axum': {
        name: 'Axum',
        type: 'web_framework' as const,
        confidence: 0.9
      },
      'tide': {
        name: 'Tide',
        type: 'web_framework' as const,
        confidence: 0.8
      },
      'hyper': {
        name: 'Hyper',
        type: 'web_framework' as const,
        confidence: 0.7
      }
    };

    for (const [depName, depInfo] of Object.entries(dependencies)) {
      const pattern = frameworkPatterns[depName as keyof typeof frameworkPatterns];
      if (pattern) {
        patternsMatched.push(`${depName}_dependency`);
        
        const evidence: Evidence[] = [
          {
            type: 'dependency',
            source: 'Cargo.toml',
            value: depName,
            weight: 0.8
          }
        ];

        // Extract version if available
        let version: string | undefined;
        if (typeof depInfo === 'string') {
          version = depInfo;
        } else if (typeof depInfo === 'object' && depInfo.version) {
          version = depInfo.version;
        }

        frameworks.push(this.createFrameworkInfo(
          pattern.name,
          pattern.type,
          pattern.confidence,
          evidence,
          version
        ));
      }
    }
  }

  /**
   * Get Cargo commands from project info
   */
  private getCargoCommands(projectInfo: ProjectInfo): any[] {
    const commands = [];
    
    // Standard Cargo commands
    commands.push({
      name: 'build',
      command: 'cargo build',
      description: 'Build the project',
      isPrimary: true
    });

    commands.push({
      name: 'test',
      command: 'cargo test',
      description: 'Run tests',
      isPrimary: true
    });

    commands.push({
      name: 'check',
      command: 'cargo check',
      description: 'Check for compilation errors',
      isPrimary: false
    });

    commands.push({
      name: 'clippy',
      command: 'cargo clippy',
      description: 'Run Clippy linter',
      isPrimary: false
    });

    commands.push({
      name: 'fmt',
      command: 'cargo fmt',
      description: 'Format code',
      isPrimary: false
    });

    // Check for release builds in commands
    const hasReleaseBuild = [...projectInfo.buildCommands, ...projectInfo.testCommands]
      .some(cmd => cmd.includes('--release'));
    
    if (hasReleaseBuild) {
      commands.push({
        name: 'build-release',
        command: 'cargo build --release',
        description: 'Build optimized release version',
        isPrimary: true
      });
    }

    return commands;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    frameworks: FrameworkInfo[],
    buildTools: BuildToolInfo[],
    hasCargoToml: boolean,
    hasCargoLock: boolean,
    recommendations: string[]
  ): void {
    if (!hasCargoToml) {
      recommendations.push('Add a Cargo.toml file to define your Rust project structure and dependencies.');
      return;
    }

    if (!hasCargoLock) {
      recommendations.push('Run `cargo build` to generate Cargo.lock for reproducible builds.');
    }

    if (frameworks.length === 0) {
      recommendations.push('No specific Rust frameworks detected. Consider adding web framework dependencies to Cargo.toml.');
    }

    if (frameworks.some(f => f.name === 'Actix Web')) {
      recommendations.push('Consider using Actix Web middleware for authentication, logging, and CORS handling.');
    }

    if (frameworks.some(f => f.name === 'Rocket')) {
      recommendations.push('Ensure you have the correct Rust nightly version for Rocket compatibility.');
    }

    if (frameworks.some(f => f.name === 'Axum')) {
      recommendations.push('Consider using Tower middleware ecosystem with Axum for enhanced functionality.');
    }

    // General Rust recommendations
    recommendations.push('Add `cargo clippy` and `cargo fmt` to your CI pipeline for code quality.');
    recommendations.push('Consider using `cargo audit` for security vulnerability scanning.');
    recommendations.push('Use `cargo test --release` for performance-critical test scenarios.');
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    frameworks: FrameworkInfo[],
    buildTools: BuildToolInfo[],
    hasCargoToml: boolean
  ): number {
    let confidence = 0.1; // Base confidence

    if (hasCargoToml) {
      confidence += 0.4; // Strong indicator
    }

    if (buildTools.length > 0) {
      confidence += 0.3; // Build tool detected
    }

    if (frameworks.length > 0) {
      confidence += 0.2; // Frameworks detected
    }

    // Bonus for multiple frameworks (monorepo or complex project)
    if (frameworks.length > 1) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Create minimal result for error cases
   */
  private createMinimalResult(
    startTime: number,
    warnings: string[],
    recommendations: string[]
  ): LanguageDetectionResult {
    return {
      frameworks: [],
      buildTools: [],
      confidence: 0.1,
      recommendations,
      metadata: {
        executionTime: Date.now() - startTime,
        filesAnalyzed: [],
        patternsMatched: [],
        warnings
      }
    };
  }

  generateCISteps(frameworks: FrameworkInfo[]): CIStep[] {
    // TODO: Implement CI step generation for Rust
    // This will be implemented in task 11
    return [];
  }
}