import { BaseLanguageAnalyzer } from './base';
import { LanguageDetectionResult, ProjectInfo } from '../interfaces/language-analyzer';
import { FrameworkInfo, BuildToolInfo } from '../interfaces/framework-info';
import { CIStep } from '../interfaces/ci-pipeline';
import { FileSystemScanner } from '../utils/file-scanner';
import { Evidence } from '../interfaces/evidence';

/**
 * Go framework analyzer
 */
export class GoAnalyzer extends BaseLanguageAnalyzer {
  readonly name = 'Go Analyzer';
  readonly ecosystem = 'go';
  private fileScanner = new FileSystemScanner();

  canAnalyze(projectInfo: ProjectInfo): boolean {
    // Check for Go indicators
    return projectInfo.languages.includes('Go') ||
           this.hasConfigFile(projectInfo, 'go.mod') ||
           this.hasConfigFile(projectInfo, 'go.sum') ||
           this.hasDependency(projectInfo, 'golang') ||
           this.hasCommand(projectInfo, 'go build') ||
           this.hasCommand(projectInfo, 'go test');
  }

  async analyze(projectInfo: ProjectInfo, projectPath?: string): Promise<LanguageDetectionResult> {
    const startTime = Date.now();
    const frameworks: FrameworkInfo[] = [];
    const buildTools: BuildToolInfo[] = [];
    const warnings: string[] = [];
    const filesAnalyzed: string[] = [];
    const patternsMatched: string[] = [];
    const recommendations: string[] = [];
    let hasGoMod = false;
    let hasGoSum = false;

    try {
      if (!projectPath) {
        warnings.push('No project path provided, skipping file system analysis');
        return this.createMinimalResult(startTime, warnings, recommendations);
      }

      // Check for go.mod
      hasGoMod = await this.fileScanner.fileExists(projectPath, 'go.mod');
      if (hasGoMod) {
        filesAnalyzed.push('go.mod');
        try {
          const goModContent = await this.fileScanner.readConfigFile(`${projectPath}/go.mod`);
          const goModData = this.parseGoMod(goModContent);
          
          // Extract Go version
          const goVersion = goModData.goVersion;
          
          // Detect workspace configuration
          const isWorkspace = goModData.isWorkspace;
          if (isWorkspace) {
            patternsMatched.push('workspace_configuration');
            recommendations.push('Detected Go workspace. Consider using workspace-level CI optimization for multi-module builds.');
          }

          // Detect frameworks from dependencies
          await this.detectWebFrameworks(goModData.dependencies, frameworks, patternsMatched);

          // Add Go version and workspace metadata to all frameworks
          frameworks.forEach(framework => {
            framework.metadata = {
              ...framework.metadata,
              goVersion,
              isWorkspace,
              moduleName: goModData.moduleName
            };
          });

        } catch (error) {
          warnings.push(`Failed to parse go.mod: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // Add Go as build tool
        buildTools.push({
          name: 'go',
          configFile: 'go.mod',
          commands: this.getGoCommands(projectInfo),
          confidence: 0.9
        });
      }

      // Check for go.sum for reproducible builds
      hasGoSum = await this.fileScanner.fileExists(projectPath, 'go.sum');
      if (hasGoSum) {
        filesAnalyzed.push('go.sum');
        patternsMatched.push('go_sum_present');
        recommendations.push('go.sum detected. Include this file in CI for reproducible builds.');
        
        // Update go build tool confidence
        const goBuildTool = buildTools.find(tool => tool.name === 'go');
        if (goBuildTool) {
          goBuildTool.confidence = 0.95;
        }
      }

      // Detect build constraints and tags
      await this.detectBuildConstraints(projectPath, patternsMatched, recommendations);

      // Generate recommendations
      this.generateRecommendations(frameworks, buildTools, hasGoMod, hasGoSum, recommendations);

    } catch (error) {
      warnings.push(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      recommendations.push('Unable to complete Go analysis due to errors. Ensure go.mod is present and readable.');
      return this.createMinimalResult(startTime, warnings, recommendations);
    }

    // Calculate confidence
    const confidence = this.calculateConfidence(frameworks, buildTools, hasGoMod);

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
   * Parse go.mod file content
   */
  private parseGoMod(content: string): GoModData {
    const lines = content.split('\n').map(line => line.trim());
    const data: GoModData = {
      moduleName: '',
      goVersion: '',
      dependencies: [],
      isWorkspace: false
    };

    let inRequireBlock = false;
    let inReplaceBlock = false;

    for (const line of lines) {
      // Skip comments and empty lines
      if (line.startsWith('//') || line === '') continue;

      // Module declaration
      if (line.startsWith('module ')) {
        data.moduleName = line.replace('module ', '').trim();
        continue;
      }

      // Go version
      if (line.startsWith('go ')) {
        data.goVersion = line.replace('go ', '').trim();
        continue;
      }

      // Workspace detection
      if (line.includes('use ') || line.includes('workspace')) {
        data.isWorkspace = true;
        continue;
      }

      // Require block
      if (line.startsWith('require (')) {
        inRequireBlock = true;
        continue;
      }
      if (line === ')' && inRequireBlock) {
        inRequireBlock = false;
        continue;
      }

      // Replace block
      if (line.startsWith('replace (')) {
        inReplaceBlock = true;
        continue;
      }
      if (line === ')' && inReplaceBlock) {
        inReplaceBlock = false;
        continue;
      }

      // Single require statement
      if (line.startsWith('require ') && !inRequireBlock) {
        const dep = this.parseDependencyLine(line.replace('require ', ''));
        if (dep) data.dependencies.push(dep);
        continue;
      }

      // Dependencies within require block
      if (inRequireBlock && !line.startsWith('require') && line !== ')') {
        const dep = this.parseDependencyLine(line);
        if (dep) data.dependencies.push(dep);
      }
    }

    return data;
  }

  /**
   * Parse a dependency line from go.mod
   */
  private parseDependencyLine(line: string): GoDependency | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    // Remove comments
    const splitResult = trimmed.split('//');
    const withoutComment = splitResult[0]?.trim();
    if (!withoutComment) return null;
    
    const parts = withoutComment.split(/\s+/);
    
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return {
        name: parts[0],
        version: parts[1],
        indirect: trimmed.includes('// indirect')
      };
    }

    return null;
  }

  /**
   * Detect Go web frameworks from dependencies
   */
  private async detectWebFrameworks(
    dependencies: GoDependency[],
    frameworks: FrameworkInfo[],
    patternsMatched: string[]
  ): Promise<void> {
    const frameworkPatterns = {
      'github.com/gin-gonic/gin': {
        name: 'Gin',
        type: 'web_framework' as const,
        confidence: 0.9
      },
      'github.com/labstack/echo': {
        name: 'Echo',
        type: 'web_framework' as const,
        confidence: 0.9
      },
      'github.com/gofiber/fiber': {
        name: 'Fiber',
        type: 'web_framework' as const,
        confidence: 0.9
      },
      'github.com/gorilla/mux': {
        name: 'Gorilla Mux',
        type: 'web_framework' as const,
        confidence: 0.85
      },
      'github.com/chi-middleware/chi': {
        name: 'Chi',
        type: 'web_framework' as const,
        confidence: 0.8
      },
      'github.com/go-chi/chi': {
        name: 'Chi',
        type: 'web_framework' as const,
        confidence: 0.8
      },
      'github.com/beego/beego': {
        name: 'Beego',
        type: 'web_framework' as const,
        confidence: 0.85
      },
      'github.com/revel/revel': {
        name: 'Revel',
        type: 'web_framework' as const,
        confidence: 0.8
      },
      'github.com/iris-contrib/middleware': {
        name: 'Iris',
        type: 'web_framework' as const,
        confidence: 0.8
      },
      'github.com/kataras/iris': {
        name: 'Iris',
        type: 'web_framework' as const,
        confidence: 0.8
      }
    };

    for (const dep of dependencies) {
      const pattern = frameworkPatterns[dep.name as keyof typeof frameworkPatterns];
      if (pattern) {
        patternsMatched.push(`${dep.name.split('/').pop()}_dependency`);
        
        const evidence: Evidence[] = [
          {
            type: 'dependency',
            source: 'go.mod',
            value: dep.name,
            weight: dep.indirect ? 0.6 : 0.8
          }
        ];

        frameworks.push(this.createFrameworkInfo(
          pattern.name,
          pattern.type,
          pattern.confidence,
          evidence,
          dep.version
        ));
      }
    }
  }

  /**
   * Detect build constraints and tags
   */
  private async detectBuildConstraints(
    projectPath: string,
    patternsMatched: string[],
    recommendations: string[]
  ): Promise<void> {
    try {
      const goFiles = await this.findGoFiles(projectPath);
      let hasBuildConstraints = false;

      for (const file of goFiles.slice(0, 10)) { // Limit to first 10 files for performance
        try {
          const content = await this.fileScanner.readConfigFile(file);
          if (typeof content === 'string') {
            // Check for build constraints
            if (content.includes('//go:build') || content.includes('// +build')) {
              hasBuildConstraints = true;
              patternsMatched.push('build_constraints');
              break;
            }
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }

      if (hasBuildConstraints) {
        recommendations.push('Build constraints detected. Consider using appropriate build tags in CI for different environments.');
      }
    } catch (error) {
      // Skip build constraint detection if it fails
    }
  }

  /**
   * Find Go source files in project
   */
  private async findGoFiles(projectPath: string): Promise<string[]> {
    try {
      const allFiles = await this.fileScanner.scanProjectFiles(projectPath);
      return allFiles.filter(file => file.endsWith('.go') && !file.includes('vendor/'));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get Go commands from project info
   */
  private getGoCommands(projectInfo: ProjectInfo): any[] {
    const commands = [];
    
    // Standard Go commands
    commands.push({
      name: 'build',
      command: 'go build ./...',
      description: 'Build the project',
      isPrimary: true
    });

    commands.push({
      name: 'test',
      command: 'go test ./...',
      description: 'Run tests',
      isPrimary: true
    });

    commands.push({
      name: 'mod-download',
      command: 'go mod download',
      description: 'Download dependencies',
      isPrimary: false
    });

    commands.push({
      name: 'mod-tidy',
      command: 'go mod tidy',
      description: 'Clean up dependencies',
      isPrimary: false
    });

    commands.push({
      name: 'vet',
      command: 'go vet ./...',
      description: 'Run Go vet',
      isPrimary: false
    });

    commands.push({
      name: 'fmt',
      command: 'go fmt ./...',
      description: 'Format code',
      isPrimary: false
    });

    // Check for race detection in commands
    const hasRaceDetection = [...projectInfo.buildCommands, ...projectInfo.testCommands]
      .some(cmd => cmd.includes('-race'));
    
    if (hasRaceDetection) {
      commands.push({
        name: 'test-race',
        command: 'go test -race ./...',
        description: 'Run tests with race detection',
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
    hasGoMod: boolean,
    hasGoSum: boolean,
    recommendations: string[]
  ): void {
    if (!hasGoMod) {
      recommendations.push('Add a go.mod file to define your Go module and dependencies.');
      return;
    }

    if (!hasGoSum) {
      recommendations.push('Run `go mod download` to generate go.sum for reproducible builds.');
    }

    if (frameworks.length === 0) {
      recommendations.push('No specific Go frameworks detected. Consider adding web framework dependencies to go.mod.');
    }

    if (frameworks.some(f => f.name === 'Gin')) {
      recommendations.push('Consider using Gin middleware for authentication, logging, and CORS handling.');
    }

    if (frameworks.some(f => f.name === 'Echo')) {
      recommendations.push('Echo provides built-in middleware. Consider using Echo\'s JWT and CORS middleware.');
    }

    if (frameworks.some(f => f.name === 'Fiber')) {
      recommendations.push('Fiber is Express-inspired. Consider using Fiber middleware for enhanced functionality.');
    }

    if (frameworks.some(f => f.name === 'Gorilla Mux')) {
      recommendations.push('Gorilla Mux is a powerful router. Consider adding Gorilla handlers for middleware support.');
    }

    // General Go recommendations
    recommendations.push('Add `go vet` and `go fmt` to your CI pipeline for code quality.');
    recommendations.push('Consider using `go test -race` for race condition detection.');
    recommendations.push('Use `go mod tidy` to keep dependencies clean.');
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    frameworks: FrameworkInfo[],
    buildTools: BuildToolInfo[],
    hasGoMod: boolean
  ): number {
    let confidence = 0.1; // Base confidence

    if (hasGoMod) {
      confidence += 0.4; // Strong indicator
    }

    if (buildTools.length > 0) {
      confidence += 0.3; // Build tool detected
    }

    if (frameworks.length > 0) {
      confidence += 0.2; // Frameworks detected
    }

    // Bonus for multiple frameworks (complex project)
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
    // TODO: Implement CI step generation for Go
    // This will be implemented in task 11
    return [];
  }
}

/**
 * Go module data structure
 */
interface GoModData {
  moduleName: string;
  goVersion: string;
  dependencies: GoDependency[];
  isWorkspace: boolean;
}

/**
 * Go dependency information
 */
interface GoDependency {
  name: string;
  version: string;
  indirect: boolean;
}